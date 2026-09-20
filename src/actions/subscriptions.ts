'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PlanType, getCurrentSubscription } from '@/lib/services/subscriptions';
import { revalidatePath } from 'next/cache';

/**
 * Server Action: Start a simulated subscription.
 * Represents a successful payment via the simulator.
 */
export async function createSimulatedSubscription(formData: FormData) {
  const supabase = createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to subscribe.' };
  }

  const plan = formData.get('plan') as PlanType;
  if (plan !== 'monthly' && plan !== 'yearly') {
    return { error: 'Invalid plan selected.' };
  }

  // Check if they already have an active subscription using the user's client
  const { data: current } = await getCurrentSubscription(supabase, user.id);

  if (current && current.status === 'active') {
    return { error: 'You already have an active subscription.' };
  }

  // Calculate simulated dates
  const now = new Date();
  const endDate = new Date();
  if (plan === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  // Insert simulated subscription using the Admin client to bypass RLS
  const { error: insertError } = await admin
    .from('subscriptions')
    .insert({
      user_id: user.id,
      provider: 'simulated',
      provider_customer_id: `sim_cus_${user.id.replace(/-/g, '')}`,
      provider_subscription_id: `sim_sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: 'active',
      plan: plan,
      current_period_start: now.toISOString(),
      current_period_end: endDate.toISOString(),
    });

  if (insertError) {
    return { error: `Failed to simulate subscription: ${insertError.message}` };
  }

  revalidatePath('/subscription');
  return { success: true };
}

/**
 * Server Action: Cancel a simulated subscription.
 */
export async function cancelSimulatedSubscription() {
  const supabase = createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to cancel a subscription.' };
  }

  const { data: current, error: fetchError } = await getCurrentSubscription(supabase, user.id);

  if (fetchError || !current) {
    return { error: 'No active subscription found.' };
  }

  if (current.status !== 'active') {
    return { error: 'Subscription is not currently active.' };
  }

  // Update status to canceled using Admin client
  const { error: updateError } = await admin
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('id', current.id)
    .eq('user_id', user.id); // Extra safety check

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath('/subscription');
  return { success: true };
}
