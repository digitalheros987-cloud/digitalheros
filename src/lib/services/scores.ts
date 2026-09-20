import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Maximum number of scores a user can have at any time.
 * Defined by the PRD: "Only the latest 5 scores are retained."
 */
export const MAX_SCORES = 5;

export interface Score {
  id: string;
  user_id: string;
  score_value: number;
  date_played: string;
  created_at: string;
}

/**
 * Retrieves a user's latest five scores, ordered deterministically
 * by date_played DESC, then created_at DESC as a tiebreaker.
 *
 * This is the canonical function consumed by the draw engine.
 * Do not duplicate this query elsewhere.
 */
export async function getLatestFiveScores(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: Score[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .order('date_played', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Score[], error: null };
}

/**
 * Retrieves all of a user's scores (up to the max of 5),
 * ordered by date_played DESC, created_at DESC.
 *
 * Since the PRD enforces a hard limit of 5, this is equivalent
 * to getLatestFiveScores but named differently for semantic clarity
 * in the UI layer.
 */
export async function getUserScores(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: Score[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .order('date_played', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Score[], error: null };
}

/**
 * Returns the count of scores for a user.
 * Used to enforce the 5-score cap before inserting.
 */
export async function getScoreCount(
  supabase: SupabaseClient,
  userId: string
): Promise<{ count: number; error: Error | null }> {
  const { count, error } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    return { count: 0, error: new Error(error.message) };
  }

  return { count: count ?? 0, error: null };
}

/**
 * Returns the oldest score for a user (by date_played ASC, created_at ASC).
 * Used when we need to auto-delete the oldest to make room for a new score.
 */
export async function getOldestScore(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: Score | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .order('date_played', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Score, error: null };
}
