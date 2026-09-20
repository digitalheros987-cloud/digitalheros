'use server';

import { createClient } from '@/lib/supabase/server';
import { scoreFormSchema } from '@/lib/validations/score';
import { getScoreCount, getOldestScore, MAX_SCORES } from '@/lib/services/scores';
import { revalidatePath } from 'next/cache';

/**
 * Server Action: Add a new score for the authenticated user.
 *
 * Enforces the 5-score cap defined by the PRD:
 * "Only the latest 5 scores are retained; new scores automatically replace the oldest."
 * When already at 5 scores, the oldest score (by date_played ASC) is deleted first.
 */
export async function addScore(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to add a score.' };
  }

  // Validate input
  const raw = {
    score_value: formData.get('score_value') as string,
    date_played: formData.get('date_played') as string,
  };

  const result = scoreFormSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { score_value, date_played } = result.data;

  // Enforce the 5-score cap: auto-delete oldest if at the limit
  const { count, error: countError } = await getScoreCount(supabase, user.id);
  if (countError) {
    return { error: 'Failed to check score count.' };
  }

  if (count >= MAX_SCORES) {
    const { data: oldest, error: oldestError } = await getOldestScore(supabase, user.id);
    if (oldestError || !oldest) {
      return { error: 'Failed to find oldest score for replacement.' };
    }

    const { error: deleteError } = await supabase
      .from('scores')
      .delete()
      .eq('id', oldest.id)
      .eq('user_id', user.id); // RLS + explicit ownership check

    if (deleteError) {
      return { error: 'Failed to remove oldest score.' };
    }
  }

  // Insert the new score
  const { error: insertError } = await supabase.from('scores').insert({
    user_id: user.id,
    score_value,
    date_played,
  });

  if (insertError) {
    // Handle the unique constraint violation for duplicate dates
    if (insertError.code === '23505') {
      return { error: 'You already have a score for this date. Please edit the existing entry instead.' };
    }
    return { error: insertError.message };
  }

  revalidatePath('/scores');
  return { success: true };
}

/**
 * Server Action: Update an existing score owned by the authenticated user.
 */
export async function updateScore(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to update a score.' };
  }

  const scoreId = formData.get('id') as string;
  if (!scoreId) {
    return { error: 'Score ID is required.' };
  }

  // Validate input
  const raw = {
    score_value: formData.get('score_value') as string,
    date_played: formData.get('date_played') as string,
  };

  const result = scoreFormSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { score_value, date_played } = result.data;

  // Update with explicit ownership check (RLS also enforces this)
  const { error: updateError } = await supabase
    .from('scores')
    .update({ score_value, date_played })
    .eq('id', scoreId)
    .eq('user_id', user.id);

  if (updateError) {
    if (updateError.code === '23505') {
      return { error: 'You already have a score for this date.' };
    }
    return { error: updateError.message };
  }

  revalidatePath('/scores');
  return { success: true };
}

/**
 * Server Action: Delete a score owned by the authenticated user.
 */
export async function deleteScore(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to delete a score.' };
  }

  const scoreId = formData.get('id') as string;
  if (!scoreId) {
    return { error: 'Score ID is required.' };
  }

  // Delete with explicit ownership check (RLS also enforces this)
  const { error: deleteError } = await supabase
    .from('scores')
    .delete()
    .eq('id', scoreId)
    .eq('user_id', user.id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath('/scores');
  return { success: true };
}
