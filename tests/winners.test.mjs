/**
 * Integration tests for Phase 8: Winner Verification, RLS, and Historical Stability.
 * Tests against live Supabase instance using anon key and service role key.
 *
 * Covers:
 * 1. Winner record creation with audit snapshots (scores, winning numbers, match count, prize amount)
 * 2. RLS: Authenticated user can view only their own winner records
 * 3. RLS: Other users cannot view another user's winner records
 * 4. RLS: Regular user cannot update winner records or mark themselves verified
 * 5. Admin can view all winner records
 * 6. Admin can mark a winner as verified (updates verification_status, status, verified_at, verified_by)
 * 7. Admin can reset/unverify a winner back to pending
 * 8. Historical stability: Modifying user's current scores does not alter the published winner record
 * 9. Cleanup of all test resources
 */

import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import { createClient } from '@supabase/supabase-js';

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
  const email = `phase8_test_${role}_${suffix}_${Date.now()}@example.com`;
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
    full_name: `Phase 8 ${role} ${suffix}`,
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
  await admin.from('winner_verifications').delete().eq('verified_by', userId);
  await admin.from('winners').delete().eq('user_id', userId);
  await admin.from('draw_entries').delete().eq('user_id', userId);
  await admin.from('profiles').delete().eq('id', userId);
  await admin.auth.admin.deleteUser(userId);
}

async function runTests() {
  console.log('--- PHASE 8: WINNER VERIFICATION & DASHBOARD INTEGRATION TESTS ---\n');

  let adminUser;
  let winnerUser;
  let otherUser;
  let testDrawId;
  let testWinnerId;

  try {
    // 1. Setup users
    adminUser = await createTestUser('admin', 'adm');
    winnerUser = await createTestUser('user', 'winner');
    otherUser = await createTestUser('user', 'other');

    const now = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 1);

    // Subscriptions
    await admin.from('subscriptions').insert([
      {
        user_id: winnerUser.userId,
        provider: 'simulated',
        status: 'active',
        plan: 'monthly',
        current_period_start: now.toISOString(),
        current_period_end: future.toISOString(),
      },
      {
        user_id: otherUser.userId,
        provider: 'simulated',
        status: 'active',
        plan: 'monthly',
        current_period_start: now.toISOString(),
        current_period_end: future.toISOString(),
      },
    ]);

    // Insert 5 scores for winnerUser: [10, 20, 30, 40, 45]
    const winnerScores = [10, 20, 30, 40, 45];
    for (let i = 0; i < 5; i++) {
      await admin.from('scores').insert({
        user_id: winnerUser.userId,
        score_value: winnerScores[i],
        date_played: `2026-07-0${i + 1}`,
      });
    }

    // Insert 5 scores for otherUser: [1, 2, 3, 4, 5]
    for (let i = 0; i < 5; i++) {
      await admin.from('scores').insert({
        user_id: otherUser.userId,
        score_value: i + 1,
        date_played: `2026-07-0${i + 1}`,
      });
    }

    // 2. Create published draw
    const { data: draw, error: drawErr } = await admin
      .from('draws')
      .insert({
        draw_period: '2026-07',
        draw_mode: 'random',
        status: 'published',
        execution_timestamp: now.toISOString(),
        jackpot_amount_cents: 20000,
        total_pool_cents: 50000,
        algorithm_version: 'v1',
        seed: 'test-winner-seed-777',
        audit_notes: 'Phase 8 test published draw',
      })
      .select('id')
      .single();

    if (drawErr || !draw) throw new Error(`Failed to create draw: ${drawErr?.message}`);
    testDrawId = draw.id;

    // Insert draw_results (winning numbers match winnerUser scores)
    await admin.from('draw_results').insert({
      draw_id: testDrawId,
      winning_numbers: [10, 20, 30, 40, 45],
      algorithm_version: 'v1',
    });

    // ---------------------------------------------------------
    // Test 1: Winner Record Creation with Snapshot & Audit Data
    // ---------------------------------------------------------
    console.log('Test 1: Winner Record Creation with Snapshot Data');
    const { data: winnerRecord, error: winErr } = await admin
      .from('winners')
      .insert({
        draw_id: testDrawId,
        user_id: winnerUser.userId,
        match_tier: 5,
        match_count: 5,
        prize_amount_cents: 20000,
        scores_snapshot: [10, 20, 30, 40, 45],
        winning_numbers_snapshot: [10, 20, 30, 40, 45],
        verification_status: 'pending',
        status: 'pending_proof',
      })
      .select('*')
      .single();

    assert(!winErr && winnerRecord, 'Winner record created successfully');
    testWinnerId = winnerRecord.id;

    assert(winnerRecord.match_count === 5, 'Winner record has match_count = 5');
    assert(winnerRecord.match_tier === 5, 'Winner record has match_tier = 5');
    assert(winnerRecord.prize_amount_cents === 20000, 'Winner record has prize_amount_cents = 20000');
    assert(winnerRecord.verification_status === 'pending', 'Initial verification_status is "pending"');
    assert(winnerRecord.status === 'pending_proof', 'Initial winner_status is "pending_proof"');
    assert(JSON.stringify(winnerRecord.scores_snapshot) === JSON.stringify([10, 20, 30, 40, 45]), 'Scores snapshot correctly stored');
    assert(JSON.stringify(winnerRecord.winning_numbers_snapshot) === JSON.stringify([10, 20, 30, 40, 45]), 'Winning numbers snapshot correctly stored');

    // ---------------------------------------------------------
    // Test 2: RLS - User Can View Only Their Own Winner Record
    // ---------------------------------------------------------
    console.log('\nTest 2: RLS Isolation for Winner Records');
    const { data: winnerViewOwn, error: wvoErr } = await winnerUser.client
      .from('winners')
      .select('*')
      .eq('draw_id', testDrawId);

    assert(!wvoErr && winnerViewOwn && winnerViewOwn.length === 1, 'Winner can view their own winner record');
    assert(winnerViewOwn[0].id === testWinnerId, 'Winner views exact matching record');

    // Other user cannot see winnerUser's record
    const { data: otherViewWinners, error: ovwErr } = await otherUser.client
      .from('winners')
      .select('*')
      .eq('draw_id', testDrawId);

    assert(!ovwErr && otherViewWinners && otherViewWinners.length === 0, 'RLS blocks other user from seeing winnerUser record (0 rows returned)');

    // Other user cannot see winnerUser's record by direct ID lookup
    const { data: directLookup, error: dlErr } = await otherUser.client
      .from('winners')
      .select('*')
      .eq('id', testWinnerId);

    assert(!dlErr && directLookup && directLookup.length === 0, 'RLS blocks direct ID lookup of another user winner record');

    // ---------------------------------------------------------
    // Test 3: RLS - Regular User Cannot Mutate Winner Records
    // ---------------------------------------------------------
    console.log('\nTest 3: Non-Tamperability (User Cannot Update or Verify Record)');
    const { data: userTamperData, error: userTamperErr } = await winnerUser.client
      .from('winners')
      .update({
        verification_status: 'verified',
        status: 'approved',
        prize_amount_cents: 9999999,
      })
      .eq('id', testWinnerId)
      .select();

    assert(
      (!userTamperData || userTamperData.length === 0) || userTamperErr,
      'RLS blocks regular user from updating winner record or marking themselves verified'
    );

    // Verify database value remained untouched
    const { data: verifyUntouched } = await admin
      .from('winners')
      .select('verification_status, prize_amount_cents')
      .eq('id', testWinnerId)
      .single();

    assert(
      verifyUntouched && verifyUntouched.verification_status === 'pending' && verifyUntouched.prize_amount_cents === 20000,
      'Winner record verification_status and prize amount remained completely untouched'
    );

    // ---------------------------------------------------------
    // Test 4: Admin Can View All Winners
    // ---------------------------------------------------------
    console.log('\nTest 4: Admin Authorization to View All Winners');
    const { data: adminWinners, error: awErr } = await admin
      .from('winners')
      .select('*')
      .eq('draw_id', testDrawId);

    assert(!awErr && adminWinners && adminWinners.length === 1, 'Admin can view all winners for the draw');

    // ---------------------------------------------------------
    // Test 5: Admin Winner Verification Workflow
    // ---------------------------------------------------------
    console.log('\nTest 5: Admin Verification & Status Transition');
    const verifiedAtTimestamp = new Date().toISOString();
    const { error: adminVerifyErr } = await admin
      .from('winners')
      .update({
        verification_status: 'verified',
        status: 'approved',
        verified_at: verifiedAtTimestamp,
        verified_by: adminUser.userId,
        admin_notes: 'All 5 Stableford scores verified against platform submission.',
      })
      .eq('id', testWinnerId);

    assert(!adminVerifyErr, 'Admin successfully verified winner record');

    const { data: verifiedWinner } = await admin
      .from('winners')
      .select('*')
      .eq('id', testWinnerId)
      .single();

    assert(verifiedWinner.verification_status === 'verified', 'Verification status updated to "verified"');
    assert(verifiedWinner.status === 'approved', 'Winner status updated to "approved"');
    assert(verifiedWinner.verified_by === adminUser.userId, 'Audit trail records verified_by admin ID');
    assert(verifiedWinner.admin_notes.includes('verified against platform'), 'Admin notes recorded');

    // ---------------------------------------------------------
    // Test 6: Admin Unverify / Reset Workflow
    // ---------------------------------------------------------
    console.log('\nTest 6: Admin Unverify / Reset to Pending');
    const { error: adminResetErr } = await admin
      .from('winners')
      .update({
        verification_status: 'pending',
        status: 'pending_proof',
        verified_at: null,
        verified_by: null,
      })
      .eq('id', testWinnerId);

    assert(!adminResetErr, 'Admin can reset winner status back to pending');

    const { data: resetWinner } = await admin
      .from('winners')
      .select('verification_status, status, verified_by')
      .eq('id', testWinnerId)
      .single();

    assert(resetWinner.verification_status === 'pending', 'Status reverted to "pending"');
    assert(resetWinner.status === 'pending_proof', 'Winner status reverted to "pending_proof"');
    assert(resetWinner.verified_by === null, 'verified_by cleared on reset');

    // ---------------------------------------------------------
    // Test 7: Historical Stability Under User Data Mutations
    // ---------------------------------------------------------
    console.log('\nTest 7: Historical Integrity & Score Mutation Isolation');
    // User deletes a score and adds new erratic score post-draw
    await admin.from('scores').delete().eq('user_id', winnerUser.userId).eq('score_value', 10);
    await admin.from('scores').insert({
      user_id: winnerUser.userId,
      score_value: 2, // totally different score
      date_played: '2026-09-15',
    });

    // Verify the historical winner record is NOT affected
    const { data: frozenWinner } = await admin
      .from('winners')
      .select('*')
      .eq('id', testWinnerId)
      .single();

    assert(
      JSON.stringify(frozenWinner.scores_snapshot) === JSON.stringify([10, 20, 30, 40, 45]),
      'Historical winner scores snapshot remains [10, 20, 30, 40, 45] despite score mutation'
    );
    assert(frozenWinner.match_count === 5, 'Historical match_count remains 5');
    assert(frozenWinner.prize_amount_cents === 20000, 'Historical prize amount remains £200.00');

  } finally {
    console.log('\nCleaning up Phase 8 test artifacts...');
    if (testWinnerId) {
      await admin.from('winner_verifications').delete().eq('winner_id', testWinnerId);
      await admin.from('winners').delete().eq('id', testWinnerId);
    }
    if (testDrawId) {
      await admin.from('draw_results').delete().eq('draw_id', testDrawId);
      await admin.from('draws').delete().eq('id', testDrawId);
    }
    if (adminUser) await cleanupUser(adminUser.userId);
    if (winnerUser) await cleanupUser(winnerUser.userId);
    if (otherUser) await cleanupUser(otherUser.userId);
  }

  console.log(`\n--- RESULTS: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

runTests();
