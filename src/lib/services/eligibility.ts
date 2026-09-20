import { SupabaseClient } from '@supabase/supabase-js';
import { isSubscriptionActive } from './subscriptions';
import { getScoreCount, getLatestFiveScores } from './scores';
import { Participant } from '@/lib/draw/types';

/**
 * Checks if a specific user is eligible for the draw.
 * PRD §04, §05 & docs/ASSUMPTIONS.md:
 * - A-001: User must have exactly 5 scores recorded.
 * - A-002: User must have an active subscription (or canceled within prepaid period).
 */
export async function isUserEligibleForDraw(
  supabase: SupabaseClient,
  userId: string
): Promise<{ eligible: boolean; reason?: string; error: Error | null }> {
  // 1. Check subscription status
  const { active, error: subError } = await isSubscriptionActive(supabase, userId);

  if (subError) {
    return { eligible: false, error: subError };
  }

  if (!active) {
    return {
      eligible: false,
      reason: 'No active subscription',
      error: null,
    };
  }

  // 2. Check golf scores (must have exactly 5 scores per A-001)
  const { count, error: scoreError } = await getScoreCount(supabase, userId);
  if (scoreError) {
    return { eligible: false, error: scoreError };
  }

  if (count < 5) {
    return {
      eligible: false,
      reason: `Insufficient scores: ${count}/5 recorded`,
      error: null,
    };
  }

  return { eligible: true, error: null };
}

/**
 * Gathers all eligible participants and the total count of active subscribers
 * for running a draw simulation or execution.
 */
export async function getEligibleDrawParticipants(
  supabase: SupabaseClient
): Promise<{
  participants: Participant[];
  activeSubscriberCount: number;
  error: Error | null;
}> {
  try {
    // 1. Query all active subscriptions (or canceled with current_period_end > NOW())
    const now = new Date().toISOString();
    const { data: subs, error: subError } = await supabase
      .from('subscriptions')
      .select('user_id, status, current_period_end')
      .or(`status.eq.active,and(status.eq.canceled,current_period_end.gt.${now})`);

    if (subError) {
      return { participants: [], activeSubscriberCount: 0, error: new Error(subError.message) };
    }

    const activeUserIds = Array.from(new Set(subs?.map((s) => s.user_id) || []));
    const activeSubscriberCount = activeUserIds.length;

    if (activeSubscriberCount === 0) {
      return { participants: [], activeSubscriberCount: 0, error: null };
    }

    // 2. For each active user, retrieve their latest 5 scores
    const participants: Participant[] = [];

    for (const userId of activeUserIds) {
      const { data: scores, error: scoresErr } = await getLatestFiveScores(supabase, userId);
      if (!scoresErr && scores && scores.length === 5) {
        participants.push({
          userId,
          scores: scores.map((s) => s.score_value),
        });
      }
    }

    return {
      participants,
      activeSubscriberCount,
      error: null,
    };
  } catch (err) {
    return {
      participants: [],
      activeSubscriberCount: 0,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
