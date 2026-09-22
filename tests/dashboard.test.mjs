import { createClient } from '@supabase/supabase-js';
import assert from 'assert';

/**
 * Node-based integration tests for Phase 11 Dashboard.
 * These tests verify the server actions and database logic.
 * Usage: node --experimental-vm-modules tests/dashboard.test.mjs
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables.');
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runTests() {
  console.log('Running Dashboard Integration Tests...');

  // 1. Verify User exists
  const { data: users, error: uErr } = await adminClient.auth.admin.listUsers();
  assert(!uErr && users.users.length > 0, 'Could not fetch users');
  const user = users.users.find(u => u.email === 'beenu2040@gmail.com');
  assert(user, 'Test user beenu2040@gmail.com not found');

  // 2. Test User Dashboard Data Retrieval (same logic as the Dashboard server component)
  // Scores
  const { data: scores } = await adminClient
    .from('scores')
    .select('*')
    .eq('user_id', user.id)
    .order('date_played', { ascending: false });
  
  assert(Array.isArray(scores), 'Scores retrieved successfully');

  // Subscription
  const { data: sub } = await adminClient
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('status', { ascending: true })
    .limit(1)
    .single();

  // Winnings
  const { data: winnings } = await adminClient
    .from('winners')
    .select('*')
    .eq('user_id', user.id);
  
  assert(Array.isArray(winnings), 'Winnings retrieved successfully');

  // Empty state test: Random invalid user ID
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const { data: noScores } = await adminClient.from('scores').select('*').eq('user_id', fakeId);
  const { data: noSub } = await adminClient.from('subscriptions').select('*').eq('user_id', fakeId).single();
  const { data: noWinnings } = await adminClient.from('winners').select('*').eq('user_id', fakeId);

  assert(noScores?.length === 0, 'Empty state scores working');
  assert(!noSub, 'Empty state subscription working');
  assert(noWinnings?.length === 0, 'Empty state winnings working');

  console.log('✅ All Dashboard Integration tests passed!');
}

runTests().catch(console.error);
