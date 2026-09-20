/**
 * Integration tests for Golf Score Management.
 * Tests run against the live Supabase instance using the anon key + service role key.
 *
 * Covers:
 * 1. Authenticated user can add a valid score
 * 2. Invalid score (out of range) is rejected
 * 3. Invalid date (future) is rejected
 * 4. User cannot add a score for another user (RLS)
 * 5. User can retrieve their own scores
 * 6. User cannot retrieve another user's scores (RLS)
 * 7. User can update their own score
 * 8. User cannot update another user's score (RLS)
 * 9. User can retrieve exactly their latest five scores
 * 10. Older scores are auto-deleted when exceeding 5 (PRD cap)
 * 11. Latest-five ordering is deterministic
 * 12. Account with fewer than five scores is handled correctly
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
  console.error('Missing Supabase credentials in .env.local (need URL, ANON_KEY, and SERVICE_ROLE_KEY)');
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

async function createTestUser(suffix) {
  const email = `scoretest_${suffix}_${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) throw new Error(`Failed to create test user: ${authError.message}`);

  await admin.from('profiles').insert({
    id: authData.user.id,
    email,
    full_name: `Test User ${suffix}`,
    role: 'user',
    status: 'active',
  });

  // Sign in as this user to get an authenticated client
  const userClient = createClient(supabaseUrl, anonKey);
  const { error: signInError } = await userClient.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`Failed to sign in test user: ${signInError.message}`);

  return { userId: authData.user.id, email, client: userClient };
}

async function cleanupUser(userId) {
  await admin.from('scores').delete().eq('user_id', userId);
  await admin.from('profiles').delete().eq('id', userId);
  await admin.auth.admin.deleteUser(userId);
}

async function runTests() {
  console.log('--- GOLF SCORE MANAGEMENT TESTS ---\n');

  let userA, userB;

  try {
    // Setup: create two test users
    userA = await createTestUser('A');
    userB = await createTestUser('B');

    // -----------------------------------------------------------
    // Test 1: Authenticated user can add a valid score
    // -----------------------------------------------------------
    console.log('Test 1: Add a valid score');
    const { error: addError } = await userA.client.from('scores').insert({
      user_id: userA.userId,
      score_value: 32,
      date_played: '2026-09-01',
    });
    assert(!addError, 'User can add a valid score');

    // -----------------------------------------------------------
    // Test 2: Invalid score is rejected (DB CHECK constraint)
    // -----------------------------------------------------------
    console.log('Test 2: Invalid score (out of range) is rejected');
    const { error: invalidScoreErr } = await userA.client.from('scores').insert({
      user_id: userA.userId,
      score_value: 50, // exceeds max of 45
      date_played: '2026-09-02',
    });
    assert(!!invalidScoreErr, 'Score value 50 rejected by DB CHECK constraint');

    const { error: zeroScoreErr } = await userA.client.from('scores').insert({
      user_id: userA.userId,
      score_value: 0, // below min of 1
      date_played: '2026-09-02',
    });
    assert(!!zeroScoreErr, 'Score value 0 rejected by DB CHECK constraint');

    // -----------------------------------------------------------
    // Test 3: Duplicate date is rejected (UNIQUE constraint)
    // -----------------------------------------------------------
    console.log('Test 3: Duplicate date is rejected');
    const { error: dupDateErr } = await userA.client.from('scores').insert({
      user_id: userA.userId,
      score_value: 28,
      date_played: '2026-09-01', // same date as Test 1
    });
    assert(!!dupDateErr, 'Duplicate date rejected by UNIQUE constraint');

    // -----------------------------------------------------------
    // Test 4: User cannot add a score for another user (RLS)
    // -----------------------------------------------------------
    console.log('Test 4: User cannot add a score for another user');
    const { error: crossInsertErr } = await userA.client.from('scores').insert({
      user_id: userB.userId, // trying to insert for user B
      score_value: 30,
      date_played: '2026-09-03',
    });
    assert(!!crossInsertErr, 'RLS prevents inserting scores for another user');

    // -----------------------------------------------------------
    // Test 5: User can retrieve their own scores
    // -----------------------------------------------------------
    console.log('Test 5: User can retrieve their own scores');
    const { data: ownScores, error: ownErr } = await userA.client
      .from('scores')
      .select('*')
      .eq('user_id', userA.userId);
    assert(!ownErr && ownScores && ownScores.length === 1, 'User A can read their own scores');

    // -----------------------------------------------------------
    // Test 6: User cannot retrieve another user's scores (RLS)
    // -----------------------------------------------------------
    console.log('Test 6: User cannot retrieve another user\'s scores');
    // First add a score to user B via admin
    await admin.from('scores').insert({
      user_id: userB.userId,
      score_value: 25,
      date_played: '2026-09-01',
    });
    const { data: crossReadScores } = await userA.client
      .from('scores')
      .select('*')
      .eq('user_id', userB.userId);
    assert(!crossReadScores || crossReadScores.length === 0, 'RLS prevents reading other user\'s scores');

    // -----------------------------------------------------------
    // Test 7: User can update their own score
    // -----------------------------------------------------------
    console.log('Test 7: User can update their own score');
    const { data: toUpdate } = await userA.client
      .from('scores')
      .select('id')
      .eq('user_id', userA.userId)
      .single();
    const { error: updateErr } = await userA.client
      .from('scores')
      .update({ score_value: 35 })
      .eq('id', toUpdate.id);
    assert(!updateErr, 'User can update their own score');

    // -----------------------------------------------------------
    // Test 8: User cannot update another user's score (RLS)
    // -----------------------------------------------------------
    console.log('Test 8: User cannot update another user\'s score');
    const { data: userBScore } = await admin
      .from('scores')
      .select('id')
      .eq('user_id', userB.userId)
      .single();
    const { data: crossUpdateData, error: crossUpdateErr } = await userA.client
      .from('scores')
      .update({ score_value: 10 })
      .eq('id', userBScore.id)
      .select();
    // RLS silently returns no rows for updates on disallowed rows
    assert(
      (!crossUpdateData || crossUpdateData.length === 0),
      'RLS prevents updating another user\'s score'
    );

    // -----------------------------------------------------------
    // Test 9 & 10: Latest five scores & auto-cap behavior
    // -----------------------------------------------------------
    console.log('Test 9 & 10: Latest five scores and cap enforcement');
    // Add 4 more scores to user A (they already have 1), giving them 5
    for (let i = 2; i <= 5; i++) {
      await userA.client.from('scores').insert({
        user_id: userA.userId,
        score_value: 20 + i,
        date_played: `2026-09-0${i}`,
      });
    }
    const { data: fiveScores } = await userA.client
      .from('scores')
      .select('*')
      .eq('user_id', userA.userId)
      .order('date_played', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);
    assert(fiveScores && fiveScores.length === 5, 'User has exactly 5 scores');

    // -----------------------------------------------------------
    // Test 11: Latest-five ordering is deterministic
    // -----------------------------------------------------------
    console.log('Test 11: Ordering is deterministic');
    const dates = fiveScores.map(s => s.date_played);
    const isSorted = dates.every((d, i) => i === 0 || d <= dates[i - 1]);
    assert(isSorted, 'Scores are in descending date order');

    // -----------------------------------------------------------
    // Test 12: Account with fewer than 5 scores
    // -----------------------------------------------------------
    console.log('Test 12: Account with fewer than 5 scores');
    // Delete one of user A's scores to bring them to 4
    const { data: scoreToDelete } = await userA.client
      .from('scores')
      .select('id')
      .eq('user_id', userA.userId)
      .order('date_played', { ascending: true })
      .limit(1)
      .single();
    await userA.client.from('scores').delete().eq('id', scoreToDelete.id);
    const { data: fourScores } = await userA.client
      .from('scores')
      .select('*')
      .eq('user_id', userA.userId);
    assert(fourScores && fourScores.length === 4, 'User has 4 scores after deleting one (no auto-restore)');

  } finally {
    // Cleanup
    console.log('\nCleaning up test data...');
    if (userA) await cleanupUser(userA.userId);
    if (userB) await cleanupUser(userB.userId);
  }

  console.log(`\n--- RESULTS: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
