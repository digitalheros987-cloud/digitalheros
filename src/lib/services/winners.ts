import { SupabaseClient } from '@supabase/supabase-js';

export type WinnerVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface WinnerAuditRecord {
  id: string;
  draw_id: string;
  user_id: string;
  match_tier: number;
  match_count: number;
  prize_amount_cents: number;
  verification_status: WinnerVerificationStatus;
  status: string;
  scores_snapshot: number[] | null;
  winning_numbers_snapshot: number[] | null;
  verified_at: string | null;
  verified_by: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  draw?: {
    id: string;
    draw_period: string;
    draw_mode: 'random' | 'algorithmic';
    execution_timestamp: string | null;
    total_pool_cents: number;
    jackpot_amount_cents: number;
  } | null;
}

/**
 * Retrieves winners for a specific draw (Admin Dashboard).
 */
export async function getWinnersForDraw(
  supabase: SupabaseClient,
  drawId: string,
  statusFilter?: WinnerVerificationStatus
): Promise<{ data: WinnerAuditRecord[] | null; error: Error | null }> {
  let query = supabase
    .from('winners')
    .select(`
      *,
      user:profiles!winners_user_id_fkey(id, email, full_name),
      draw:draws!winners_draw_id_fkey(id, draw_period, draw_mode, execution_timestamp, total_pool_cents, jackpot_amount_cents)
    `)
    .eq('draw_id', drawId);

  if (statusFilter) {
    query = query.eq('verification_status', statusFilter);
  }

  const { data, error } = await query.order('match_tier', { ascending: false });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as unknown as WinnerAuditRecord[], error: null };
}

/**
 * Retrieves all platform winners with optional verification status filter (Admin Dashboard).
 */
export async function getAllWinners(
  supabase: SupabaseClient,
  statusFilter?: WinnerVerificationStatus
): Promise<{ data: WinnerAuditRecord[] | null; error: Error | null }> {
  let query = supabase
    .from('winners')
    .select(`
      *,
      user:profiles!winners_user_id_fkey(id, email, full_name),
      draw:draws!winners_draw_id_fkey(id, draw_period, draw_mode, execution_timestamp, total_pool_cents, jackpot_amount_cents)
    `);

  if (statusFilter) {
    query = query.eq('verification_status', statusFilter);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as unknown as WinnerAuditRecord[], error: null };
}

/**
 * Retrieves all winning records for a specific authenticated user (User Dashboard).
 * Enforced by RLS (user can only read their own winners).
 */
export async function getUserWinnings(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: WinnerAuditRecord[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('winners')
    .select(`
      *,
      draw:draws!winners_draw_id_fkey(id, draw_period, draw_mode, execution_timestamp, total_pool_cents, jackpot_amount_cents)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as unknown as WinnerAuditRecord[], error: null };
}

/**
 * Retrieves a single winner record by ID with full audit history.
 */
export async function getWinnerById(
  supabase: SupabaseClient,
  winnerId: string
): Promise<{ data: WinnerAuditRecord | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('winners')
    .select(`
      *,
      user:profiles!winners_user_id_fkey(id, email, full_name),
      draw:draws!winners_draw_id_fkey(id, draw_period, draw_mode, execution_timestamp, total_pool_cents, jackpot_amount_cents)
    `)
    .eq('id', winnerId)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as unknown as WinnerAuditRecord, error: null };
}
