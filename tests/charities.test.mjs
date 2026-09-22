import { createClient } from '@supabase/supabase-js';
import assert from 'assert';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  throw new Error('Missing Supabase environment variables.');
}

// Using anon key to test public RLS access
const publicClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runTests() {
  console.log('Running Public Charity Directory Integration Tests...');

  // 1. Fetch all active charities (RLS should allow reading is_active=true)
  const { data: charities, error: listError } = await publicClient
    .from('charities')
    .select('*')
    .eq('is_active', true);
  
  assert(!listError, 'Public user can query charities without error');
  assert(charities.length > 0, 'Found active charities (dummy data exists)');

  // 2. Fetch featured charity
  const { data: featured, error: featuredError } = await publicClient
    .from('charities')
    .select('*')
    .eq('is_active', true)
    .eq('is_spotlight', true)
    .limit(1)
    .single();

  assert(!featuredError || featuredError.code === 'PGRST116', 'Public user can query featured charity');
  if (featured) {
    assert(featured.is_spotlight === true, 'Featured charity is indeed a spotlight');
  }

  // 3. Fetch charity by ID
  const testCharityId = charities[0].id;
  const { data: charityById, error: idError } = await publicClient
    .from('charities')
    .select('*')
    .eq('id', testCharityId)
    .single();

  assert(!idError, 'Public user can fetch a charity by ID');
  assert(charityById.id === testCharityId, 'Fetched correct charity');

  // 4. Test RLS protection (Cannot insert)
  const { error: insertError } = await publicClient
    .from('charities')
    .insert({ name: 'Hacker', description: 'Hack', is_active: true });
  
  assert(!!insertError, 'RLS correctly blocks anonymous users from inserting charities');

  console.log('✅ All Public Charity Integration tests passed!');
}

runTests().catch(console.error);
