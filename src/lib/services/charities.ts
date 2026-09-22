import { SupabaseClient } from '@supabase/supabase-js';

export interface Charity {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_spotlight: boolean;
  image_url: string | null;
  upcoming_events?: string | null;
  golf_events?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCharitySelection {
  id: string;
  user_id: string;
  charity_id: string;
  contribution_percentage: number;
  created_at: string;
  updated_at: string;
}

/**
 * Retrieves all active charities for display.
 * RLS already filters to is_active = true for non-admin users.
 */
export async function getActiveCharities(
  supabase: SupabaseClient
): Promise<{ data: Charity[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('charities')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Charity[], error: null };
}

/**
 * Retrieves the authenticated user's current charity selection,
 * joined with the charity details.
 */
export async function getUserCharitySelection(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: (UserCharitySelection & { charity: Charity }) | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('user_charity_selections')
    .select('*, charity:charities(*)')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = "no rows returned" which is expected for new users
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as (UserCharitySelection & { charity: Charity }) | null, error: null };
}

export async function getCharityById(
  supabase: SupabaseClient,
  charityId: string
): Promise<{ data: Charity | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('charities')
    .select('*')
    .eq('id', charityId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return { data: null, error: null };
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Charity, error: null };
}

export async function getFeaturedCharity(
  supabase: SupabaseClient
): Promise<{ data: Charity | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('charities')
    .select('*')
    .eq('is_active', true)
    .eq('is_spotlight', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Charity | null, error: null };
}
