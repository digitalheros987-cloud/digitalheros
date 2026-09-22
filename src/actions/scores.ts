'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { scoreFormSchema } from '@/lib/validations/score';
import { getScoreCount, getOldestScore, MAX_SCORES } from '@/lib/services/scores';
import { revalidatePath } from 'next/cache';

async function getAuthAndClient(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, targetUserId: null, client: supabase };
  }

  let targetUserId = user.id;
  let client = supabase;

  const passedUserId = formData.get('targetUserId') as string;
  if (passedUserId && passedUserId !== user.id) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'admin') {
      targetUserId = passedUserId;
      client = createAdminClient();
    } else {
      return { user: null, targetUserId: null, client: supabase, error: 'Forbidden: Admin access required.' };
    }
  }

  return { user, targetUserId, client };
}

/**
 * Server Action: Add a new score.
 */
export async function addScore(formData: FormData) {
  const { user, targetUserId, client, error: authError } = await getAuthAndClient(formData);
  if (authError) return { error: authError };
  if (!user || !targetUserId) return { error: 'You must be logged in.' };

  const raw = {
    score_value: formData.get('score_value') as string,
    date_played: formData.get('date_played') as string,
  };

  const result = scoreFormSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { score_value, date_played } = result.data;

  const { count, error: countError } = await getScoreCount(client, targetUserId);
  if (countError) return { error: 'Failed to check score count.' };

  if (count >= MAX_SCORES) {
    const { data: oldest, error: oldestError } = await getOldestScore(client, targetUserId);
    if (oldestError || !oldest) return { error: 'Failed to find oldest score for replacement.' };

    const { error: deleteError } = await client
      .from('scores')
      .delete()
      .eq('id', oldest.id)
      .eq('user_id', targetUserId);

    if (deleteError) return { error: 'Failed to remove oldest score.' };
  }

  const { error: insertError } = await client.from('scores').insert({
    user_id: targetUserId,
    score_value,
    date_played,
  });

  if (insertError) {
    if (insertError.code === '23505') return { error: 'A score for this date already exists.' };
    return { error: insertError.message };
  }

  revalidatePath('/scores');
  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Server Action: Update an existing score.
 */
export async function updateScore(formData: FormData) {
  const { user, targetUserId, client, error: authError } = await getAuthAndClient(formData);
  if (authError) return { error: authError };
  if (!user || !targetUserId) return { error: 'You must be logged in.' };

  const scoreId = formData.get('id') as string;
  if (!scoreId) return { error: 'Score ID is required.' };

  const raw = {
    score_value: formData.get('score_value') as string,
    date_played: formData.get('date_played') as string,
  };

  const result = scoreFormSchema.safeParse(raw);
  if (!result.success) return { error: result.error.errors[0].message };

  const { score_value, date_played } = result.data;

  const { error: updateError } = await client
    .from('scores')
    .update({ score_value, date_played })
    .eq('id', scoreId)
    .eq('user_id', targetUserId);

  if (updateError) {
    if (updateError.code === '23505') return { error: 'A score for this date already exists.' };
    return { error: updateError.message };
  }

  revalidatePath('/scores');
  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Server Action: Delete a score.
 */
export async function deleteScore(formData: FormData) {
  const { user, targetUserId, client, error: authError } = await getAuthAndClient(formData);
  if (authError) return { error: authError };
  if (!user || !targetUserId) return { error: 'You must be logged in.' };

  const scoreId = formData.get('id') as string;
  if (!scoreId) return { error: 'Score ID is required.' };

  const { error: deleteError } = await client
    .from('scores')
    .delete()
    .eq('id', scoreId)
    .eq('user_id', targetUserId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath('/scores');
  return { success: true };
}
