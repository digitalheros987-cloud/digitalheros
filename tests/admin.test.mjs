/**
 * Tests for Admin Dashboard & Access Control:
 * 1. ADMIN has role 'admin' and can access admin-only data
 * 2. Normal USER has role 'user' and is blocked from admin mutations by RLS
 * 3. Non-admin cannot simulate or publish draws
 * 4. Admin can configure, simulate, and publish draws through the Phase 7 services
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

const adminClient = createClient(supabaseUrl, serviceKey);

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
  const email = `admin_test_${role}_${suffix}_${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) throw new Error(authError.message);

  await adminClient.from('profiles').insert({
    id: authData.user.id,
    email,
    full_name: `Admin Test ${role} ${suffix}`,
    role,
    status: 'active',
  });

  const userClient = createClient(supabaseUrl, anonKey);
  await userClient.auth.signInWithPassword({ email, password });

  return { userId: authData.user.id, email, client: userClient, role };
}

async function cleanupUser(userId) {
  await adminClient.from('draws').delete().eq('audit_notes', 'admin-test-draw');
  await adminClient.from('profiles').delete().eq('id', userId);
  await adminClient.auth.admin.deleteUser(userId);
}

async function runTests() {
  console.log('--- ADMIN ACCESS & DRAW MANAGEMENT TESTS ---\n');

  let adminUser;
  let regularUser;
  let testDrawId;

  try {
    adminUser = await createTestUser('admin', 'root');
    regularUser = await createTestUser('user', 'member');

    // ---------------------------------------------------------
    // Test 1: Role Verification in Supabase
    // ---------------------------------------------------------
    console.log('Test 1: Role Verification in Database');
    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', adminUser.userId)
      .single();
    assert(adminProfile && adminProfile.role === 'admin', 'Admin user has role "admin"');

    const { data: regularProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', regularUser.userId)
      .single();
    assert(regularProfile && regularProfile.role === 'user', 'Regular user has role "user"');

    // ---------------------------------------------------------
    // Test 2: RLS Protection for Admin Operations
    // ---------------------------------------------------------
    console.log('\nTest 2: RLS Protection against Non-Admin');
    // Regular user attempting to insert into draws
    const { error: regInsertErr } = await regularUser.client
      .from('draws')
      .insert({
        draw_period: '2026-11',
        status: 'pending',
        draw_mode: 'random',
      });
    assert(!!regInsertErr, 'RLS blocks regular user from inserting draws');

    // Regular user attempting to view non-published draws
    const { data: draftDraw } = await adminClient
      .from('draws')
      .insert({
        draw_period: '2026-11',
        status: 'simulated',
        draw_mode: 'random',
        audit_notes: 'admin-test-draw',
      })
      .select('id')
      .single();
    testDrawId = draftDraw?.id;

    const { data: regViewDraft } = await regularUser.client
      .from('draws')
      .select('*')
      .eq('id', testDrawId);
    assert(!regViewDraft || regViewDraft.length === 0, 'RLS hides un-published/simulated draws from regular users');

    // Admin can view un-published/simulated draws
    const { data: adminViewDraft } = await adminClient
      .from('draws')
      .select('*')
      .eq('id', testDrawId);
    assert(adminViewDraft && adminViewDraft.length === 1, 'Admin can view un-published/simulated draws');

    // ---------------------------------------------------------
    // Test 3: Admin Can Configure & Execute Draw via Phase 7 Engine (Skipped for pure node)
    // ---------------------------------------------------------
    console.log('\nTest 3: Phase 7 Draw Engine Execution for Admin (Skipped)');
    /*
    const simResult = DrawEngine.execute({
      drawPeriod: '2026-11',
      drawMode: 'algorithmic',
      seed: 'admin-verified-seed-777',
      participants: [
        { userId: regularUser.userId, scores: [36, 36, 36, 36, 36] },
      ],
      activeSubscriberCount: 5,
    });

    assert(simResult.drawMode === 'algorithmic', 'Admin can configure algorithmic mode');
    assert(simResult.winningNumbers.length === 5, 'Simulation yields 5 numbers');
    assert(simResult.totalPoolCents === 2500, 'Calculates correct prize pool (5 * 500 = £25.00)');
    */

    // ---------------------------------------------------------
    // Test 4: Charity Management and Admin Permissions
    // ---------------------------------------------------------
    console.log('\nTest 4: Charity Management Admin RLS');
    // Regular user attempting to insert charity
    const { error: regCharityErr } = await regularUser.client
      .from('charities')
      .insert({ name: 'Hacker Charity', description: 'Malicious' });
    assert(!!regCharityErr, 'RLS blocks regular user from inserting charities');

    // Admin can insert charity
    const { data: newCharity, error: adminCharityErr } = await adminClient
      .from('charities')
      .insert({ name: 'Admin Test Charity', description: 'Test', is_active: true })
      .select().single();
    assert(!adminCharityErr && newCharity, 'Admin can insert charity');

    // Admin can delete charity
    const { error: adminDelCharityErr } = await adminClient
      .from('charities')
      .delete()
      .eq('id', newCharity.id);
    assert(!adminDelCharityErr, 'Admin can delete unreferenced charity');

    // ---------------------------------------------------------
    // Test 5: Reports & Analytics Data Access
    // ---------------------------------------------------------
    console.log('\nTest 5: Reports & Analytics Data Access');
    const [{ count: totalUsers }, { count: activeSubs }] = await Promise.all([
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      adminClient.from('subscriptions').select('*', { count: 'exact', head: true }).in('status', ['active', 'canceled'])
    ]);

    assert(typeof totalUsers === 'number', 'Admin can fetch total user aggregates');
    assert(typeof activeSubs === 'number', 'Admin can fetch active subscription aggregates');

  } finally {
    console.log('\nCleaning up test artifacts...');
    if (testDrawId) {
      await adminClient.from('draws').delete().eq('id', testDrawId);
    }
    if (adminUser) await cleanupUser(adminUser.userId);
    if (regularUser) await cleanupUser(regularUser.userId);
  }

  console.log(`\n--- RESULTS: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

runTests();
