'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PlanType, getCurrentSubscription } from '@/lib/services/subscriptions';
import { revalidatePath } from 'next/cache';

async function getAuthAndTarget(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { user: null, targetUserId: null };

  let targetUserId = user.id;
  const passedUserId = formData.get('targetUserId') as string;

  if (passedUserId && passedUserId !== user.id) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'admin') {
      targetUserId = passedUserId;
    } else {
      return { user: null, targetUserId: null, error: 'Forbidden' };
    }
  }
  return { user, targetUserId };
}

/**
 * Server Action: Start a simulated subscription.
 */
export async function createSimulatedSubscription(formData: FormData) {
  const admin = createAdminClient();
  const { user, targetUserId, error: authErr } = await getAuthAndTarget(formData);
  
  if (authErr) return { error: authErr };
  if (!user || !targetUserId) return { error: 'You must be logged in to subscribe.' };

  const plan = formData.get('plan') as PlanType;
  if (plan !== 'monthly' && plan !== 'yearly') return { error: 'Invalid plan selected.' };

  const { data: current } = await getCurrentSubscription(admin, targetUserId);

  if (current && current.status === 'active') {
    return { error: 'User already has an active subscription.' };
  }

  const now = new Date();
  const endDate = new Date();
  if (plan === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
  else endDate.setFullYear(endDate.getFullYear() + 1);

  const { error: insertError } = await admin
    .from('subscriptions')
    .insert({
      user_id: targetUserId,
      provider: 'simulated',
      provider_customer_id: `sim_cus_${targetUserId.replace(/-/g, '')}`,
      provider_subscription_id: `sim_sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: 'active',
      plan: plan,
      current_period_start: now.toISOString(),
      current_period_end: endDate.toISOString(),
    });

  if (insertError) return { error: `Failed to simulate subscription: ${insertError.message}` };

  revalidatePath('/subscription');
  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Server Action: Cancel a simulated subscription.
 */
export async function cancelSimulatedSubscription(formData: FormData) {
  const admin = createAdminClient();
  const { user, targetUserId, error: authErr } = await getAuthAndTarget(formData);
  
  if (authErr) return { error: authErr };
  if (!user || !targetUserId) return { error: 'You must be logged in to manage subscriptions.' };

  const subId = formData.get('subscription_id') as string;
  if (!subId) return { error: 'Missing subscription ID.' };

  const { error: updateError } = await admin
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('id', subId)
    .eq('user_id', targetUserId)
    .eq('provider', 'simulated');

  if (updateError) return { error: updateError.message };

  revalidatePath('/subscription');
  revalidatePath('/admin/users');
  return { success: true };
}
