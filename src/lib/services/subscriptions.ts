import { SupabaseClient } from '@supabase/supabase-js';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';
export type PlanType = 'monthly' | 'yearly';
export type ProviderType = 'stripe' | 'simulated';

export interface Subscription {
  id: string;
  user_id: string;
  provider: ProviderType;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  status: SubscriptionStatus;
  plan: PlanType;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

/**
 * Retrieves the current subscription for a user.
 * Prioritizes 'active' subscriptions, then 'canceled', falling back to the most recent.
 */
export async function getCurrentSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: Subscription | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('status', { ascending: true }) // 'active' comes before 'canceled' alphabetically
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Subscription | null, error: null };
}

/**
 * Checks if a user has a currently active subscription.
 */
export async function isSubscriptionActive(
  supabase: SupabaseClient,
  userId: string
): Promise<{ active: boolean; error: Error | null }> {
  const { data, error } = await getCurrentSubscription(supabase, userId);
  
  if (error) {
    return { active: false, error };
  }

  if (!data) {
    return { active: false, error: null };
  }

  // Treat 'active' as active. If 'canceled' but current_period_end is in the future,
  // they still have access until the end of the billing period.
  if (data.status === 'active') {
    return { active: true, error: null };
  }

  if (data.status === 'canceled') {
    const end = new Date(data.current_period_end);
    if (end > new Date()) {
      return { active: true, error: null };
    }
  }

  return { active: false, error: null };
}
