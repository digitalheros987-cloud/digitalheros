import { SupabaseClient } from '@supabase/supabase-js';

export interface DrawRecord {
  id: string;
  draw_period: string;
  status: 'pending' | 'simulated' | 'published';
  execution_timestamp: string | null;
  jackpot_amount_cents: number;
  total_pool_cents: number;
  draw_mode: 'random' | 'algorithmic';
  algorithm_version: string | null;
  audit_notes: string | null;
  seed: string | null;
  created_at: string;
}

export interface PublishedDrawDetails extends DrawRecord {
  results: {
    winning_numbers: number[];
    algorithm_version: string;
    metadata: Record<string, unknown>;
  } | null;
  prize_tiers: Array<{
    match_tier: number;
    percentage_allocation: number;
    total_amount_cents: number;
    rollover_amount_cents: number;
    is_claimed: boolean;
  }>;
  winners: Array<{
    id: string;
    user_id: string;
    match_tier: number;
    match_count: number;
    prize_amount_cents: number;
    status: string;
    verification_status: 'pending' | 'verified' | 'rejected';
    scores_snapshot?: number[] | null;
    winning_numbers_snapshot?: number[] | null;
    verified_at?: string | null;
    verified_by?: string | null;
  }>;
}

/**
 * Retrieves the latest published draw to determine the rollover jackpot
 * and history for public display.
 */
export async function getLastPublishedDraw(
  supabase: SupabaseClient
): Promise<{ data: DrawRecord | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('draws')
    .select('*')
    .eq('status', 'published')
    .order('execution_timestamp', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as DrawRecord | null, error: null };
}

/**
 * Retrieves all published draws for the public / user dashboard.
 */
export async function getPublishedDraws(
  supabase: SupabaseClient
): Promise<{ data: DrawRecord[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('draws')
    .select('*')
    .eq('status', 'published')
    .order('execution_timestamp', { ascending: false });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as DrawRecord[], error: null };
}

/**
 * Retrieves full details for a published draw (including winning numbers, prize tiers, and winners).
 */
export async function getPublishedDrawDetails(
  supabase: SupabaseClient,
  drawId: string
): Promise<{ data: PublishedDrawDetails | null; error: Error | null }> {
  const { data: draw, error: drawErr } = await supabase
    .from('draws')
    .select('*')
    .eq('id', drawId)
    .eq('status', 'published')
    .single();

  if (drawErr || !draw) {
    return { data: null, error: drawErr ? new Error(drawErr.message) : new Error('Draw not found') };
  }

  const [{ data: results }, { data: tiers }, { data: winners }] = await Promise.all([
    supabase.from('draw_results').select('*').eq('draw_id', drawId).single(),
    supabase.from('prize_tiers').select('*').eq('draw_id', drawId).order('match_tier', { ascending: false }),
    supabase.from('winners').select('*').eq('draw_id', drawId),
  ]);

  return {
    data: {
      ...draw,
      results: results || null,
      prize_tiers: tiers || [],
      winners: winners || [],
    } as PublishedDrawDetails,
    error: null,
  };
}

export interface UserWinningsDetails {
  id: string;
  match_tier: number;
  match_count: number;
  prize_amount_cents: number;
  status: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  scores_snapshot?: number[] | null;
  winning_numbers_snapshot?: number[] | null;
  verified_at?: string | null;
}

/**
 * Checks if a specific user won a prize in a draw.
 */
export async function getUserDrawWinnings(
  supabase: SupabaseClient,
  userId: string,
  drawId: string
): Promise<{ data: UserWinningsDetails | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('winners')
    .select('id, match_tier, match_count, prize_amount_cents, status, verification_status, scores_snapshot, winning_numbers_snapshot, verified_at')
    .eq('draw_id', drawId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as UserWinningsDetails | null, error: null };
}
