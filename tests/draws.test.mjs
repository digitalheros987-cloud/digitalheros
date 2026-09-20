/**
 * Integration tests for Draw & Reward Engine against live Supabase.
 * Covers:
 * 1. Eligibility service (active sub + 5 scores vs missing scores vs inactive sub)
 * 2. Admin authorization (non-admin blocked from draw operations)
 * 3. Draw simulation (pure preview, no published records)
 * 4. Draw publishing (records draws, draw_results, draw_entries, prize_tiers, winners)
 * 5. RLS policies on draws, results, entries, and winners
 */

import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import { createClient } from '@supabase/supabase-js';
import { isUserEligibleForDraw, getEligibleDrawParticipants } from '../src/lib/services/eligibility.ts';
import { DrawEngine } from '../src/lib/draw/engine.ts';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

async function createTestUser(role = 'user', suffix = '') {
  const email = `draw_test_${role}_${suffix}_${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) throw new Error(authError.message);

  await admin.from('profiles').insert({
    id: authData.user.id,
    email,
    full_name: `Draw ${role} ${suffix}`,
    role,
    status: 'active',
  });

  const userClient = createClient(supabaseUrl, anonKey);
  await userClient.auth.signInWithPassword({ email, password });

  return { userId: authData.user.id, email, client: userClient };
}

async function cleanupUser(userId) {
  await admin.from('scores').delete().eq('user_id', userId);
  await admin.from('subscriptions').delete().eq('user_id', userId);
  await admin.from('draw_entries').delete().eq('user_id', userId);
  await admin.from('winners').delete().eq('user_id', userId);
  await admin.from('profiles').delete().eq('id', userId);
  await admin.auth.admin.deleteUser(userId);
}

async function runTests() {
  console.log('--- DRAW ENGINE INTEGRATION TESTS ---\n');

  let adminUser;
  let eligibleUser;
  let partialScoreUser;
  let inactiveSubUser;
  let testDrawId;

  try {
    // 1. Setup users
    adminUser = await createTestUser('admin', 'adm');
    eligibleUser = await createTestUser('user', 'eligible');
    partialScoreUser = await createTestUser('user', 'partial');
    inactiveSubUser = await createTestUser('user', 'nosub');

    // Setup Eligible User: active sub + 5 scores
    const now = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 1);

    await admin.from('subscriptions').insert({
      user_id: eligibleUser.userId,
      provider: 'simulated',
      status: 'active',
      plan: 'monthly',
      current_period_start: now.toISOString(),
      current_period_end: future.toISOString(),
    });

    for (let i = 1; i <= 5; i++) {
      await admin.from('scores').insert({
        user_id: eligibleUser.userId,
        score_value: 30 + i,
        date_played: `2026-08-0${i}`,
      });
    }

    // Setup Partial Score User: active sub + only 3 scores
    await admin.from('subscriptions').insert({
      user_id: partialScoreUser.userId,
      provider: 'simulated',
      status: 'active',
      plan: 'monthly',
      current_period_start: now.toISOString(),
      current_period_end: future.toISOString(),
    });

    for (let i = 1; i <= 3; i++) {
      await admin.from('scores').insert({
        user_id: partialScoreUser.userId,
        score_value: 28 + i,
        date_played: `2026-08-0${i}`,
      });
    }

    // Setup Inactive User: 5 scores but NO active sub
    for (let i = 1; i <= 5; i++) {
      await admin.from('scores').insert({
        user_id: inactiveSubUser.userId,
        score_value: 35,
        date_played: `2026-08-0${i}`,
      });
    }

    // ---------------------------------------------------------
    // Test 1: Eligibility Service Checks
    // ---------------------------------------------------------
    console.log('Test 1: Eligibility Verification');
    const elRes1 = await isUserEligibleForDraw(admin, eligibleUser.userId);
    assert(elRes1.eligible === true, 'User with active subscription and 5 scores is eligible');

    const elRes2 = await isUserEligibleForDraw(admin, partialScoreUser.userId);
    assert(elRes2.eligible === false, 'User with only 3 scores is not eligible');

    const elRes3 = await isUserEligibleForDraw(admin, inactiveSubUser.userId);
    assert(elRes3.eligible === false, 'User without active subscription is not eligible');

    // ---------------------------------------------------------
    // Test 2: Gathers Eligible Participants
    // ---------------------------------------------------------
    console.log('\nTest 2: Gather Participants Query');
    const { participants, activeSubscriberCount } = await getEligibleDrawParticipants(admin);
    assert(activeSubscriberCount >= 2, 'Active subscriber count reflects subscribed test users');
    const foundEligible = participants.some((p) => p.userId === eligibleUser.userId);
    const foundPartial = participants.some((p) => p.userId === partialScoreUser.userId);
    const foundNoSub = participants.some((p) => p.userId === inactiveSubUser.userId);

    assert(foundEligible, 'Eligible user included in draw participants snapshot');
    assert(!foundPartial, 'User with < 5 scores excluded from participants');
    assert(!foundNoSub, 'User without subscription excluded from participants');

    // ---------------------------------------------------------
    // Test 3: Simulation does not alter database
    // ---------------------------------------------------------
    console.log('\nTest 3: Draw Simulation');
    const simResult = DrawEngine.execute({
      drawPeriod: '2026-09',
      drawMode: 'random',
      seed: 'test-integ-seed-999',
      participants,
      activeSubscriberCount,
      previousRolloverCents: 0,
    });

    assert(simResult.winningNumbers.length === 5, 'Simulation produces 5 winning numbers');
    assert(simResult.totalPoolCents > 0, 'Simulation calculates non-zero prize pool');

    // Check no draw was written to DB
    const { data: dbDrawsBefore } = await admin
      .from('draws')
      .select('id')
      .eq('seed', 'test-integ-seed-999');
    assert(!dbDrawsBefore || dbDrawsBefore.length === 0, 'Simulation does not write to database');

    // ---------------------------------------------------------
    // Test 4: Official Publishing Flow
    // ---------------------------------------------------------
    console.log('\nTest 4: Official Publishing Flow');
    const { data: publishedDraw, error: pubErr } = await admin
      .from('draws')
      .insert({
        draw_period: '2026-09',
        draw_mode: simResult.drawMode,
        status: 'published',
        execution_timestamp: new Date().toISOString(),
        jackpot_amount_cents: simResult.tiers.tier5.totalAmountCents,
        total_pool_cents: simResult.totalPoolCents,
        algorithm_version: simResult.algorithmVersion,
        seed: simResult.seed,
        audit_notes: 'Integration test published draw',
      })
      .select('id')
      .single();

    assert(!pubErr && publishedDraw, 'Admin can insert published draw record');
    testDrawId = publishedDraw.id;

    // Insert results
    const { error: resErr } = await admin.from('draw_results').insert({
      draw_id: testDrawId,
      winning_numbers: simResult.winningNumbers,
      algorithm_version: simResult.algorithmVersion,
      metadata: simResult.metadata,
    });
    assert(!resErr, 'Admin can insert draw_results');

    // Insert draw_entries snapshot
    const { error: entryErr } = await admin.from('draw_entries').insert({
      draw_id: testDrawId,
      user_id: eligibleUser.userId,
      is_eligible: true,
      scores_snapshot: [31, 32, 33, 34, 35],
      consistency_metric: 1.4142,
      draw_weight: 0.4142,
    });
    assert(!entryErr, 'Admin can snapshot draw_entries');

    // Insert prize_tiers
    const { error: tierErr } = await admin.from('prize_tiers').insert([
      {
        draw_id: testDrawId,
        match_tier: 5,
        percentage_allocation: 40,
        total_amount_cents: simResult.tiers.tier5.totalAmountCents,
        rollover_amount_cents: 0,
        is_claimed: false,
      },
      {
        draw_id: testDrawId,
        match_tier: 4,
        percentage_allocation: 35,
        total_amount_cents: simResult.tiers.tier4.totalAmountCents,
        rollover_amount_cents: 0,
        is_claimed: false,
      },
      {
        draw_id: testDrawId,
        match_tier: 3,
        percentage_allocation: 25,
        total_amount_cents: simResult.tiers.tier3.totalAmountCents,
        rollover_amount_cents: 0,
        is_claimed: false,
      },
    ]);
    assert(!tierErr, 'Admin can insert prize_tiers');

    // ---------------------------------------------------------
    // Test 5: RLS Policies Verification
    // ---------------------------------------------------------
    console.log('\nTest 5: RLS Policies Verification');

    // Normal user CAN view published draw
    const { data: userViewDraw, error: uvErr } = await eligibleUser.client
      .from('draws')
      .select('*')
      .eq('id', testDrawId)
      .single();
    assert(!uvErr && userViewDraw && userViewDraw.status === 'published', 'Normal user can view published draw');

    // Normal user CAN view published draw results
    const { data: userViewResults } = await eligibleUser.client
      .from('draw_results')
      .select('*')
      .eq('draw_id', testDrawId);
    assert(userViewResults && userViewResults.length === 1, 'Normal user can view published draw_results');

    // Normal user CANNOT insert or modify draws
    const { error: userInsertDrawErr } = await eligibleUser.client
      .from('draws')
      .insert({
        draw_period: '2026-10',
        status: 'published',
      });
    assert(!!userInsertDrawErr, 'RLS blocks normal user from inserting draws');

    const { data: userUpdateDrawData } = await eligibleUser.client
      .from('draws')
      .update({ jackpot_amount_cents: 999999 })
      .eq('id', testDrawId)
      .select();
    assert(!userUpdateDrawData || userUpdateDrawData.length === 0, 'RLS blocks normal user from updating draws');

    // Normal user can only see their own draw_entries snapshot
    const { data: ownEntries } = await eligibleUser.client
      .from('draw_entries')
      .select('*')
      .eq('draw_id', testDrawId);
    assert(ownEntries && ownEntries.length === 1 && ownEntries[0].user_id === eligibleUser.userId, 'User can view own draw entries snapshot');

    const { data: otherUserEntries } = await partialScoreUser.client
      .from('draw_entries')
      .select('*')
      .eq('draw_id', testDrawId);
    assert(!otherUserEntries || otherUserEntries.length === 0, 'RLS prevents user from viewing another user entry snapshot');

  } finally {
    // Cleanup
    console.log('\nCleaning up test artifacts...');
    if (testDrawId) {
      await admin.from('draws').delete().eq('id', testDrawId);
    }
    if (adminUser) await cleanupUser(adminUser.userId);
    if (eligibleUser) await cleanupUser(eligibleUser.userId);
    if (partialScoreUser) await cleanupUser(partialScoreUser.userId);
    if (inactiveSubUser) await cleanupUser(inactiveSubUser.userId);
  }

  console.log(`\n--- RESULTS: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

runTests();
