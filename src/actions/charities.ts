'use server';

import { createClient } from '@/lib/supabase/server';
import { charitySelectionFormSchema } from '@/lib/validations/charity';
import { revalidatePath } from 'next/cache';

/**
 * Server Action: Select or update the user's charity and contribution percentage.
 *
 * Uses upsert because user_charity_selections has a UNIQUE constraint on user_id.
 * - If the user has no selection, a new row is inserted.
 * - If the user already has a selection, it is updated.
 *
 * Security:
 * - Validates authentication
 * - Validates the charity exists and is active
 * - Sets user_id from the authenticated session (never from client input)
 * - RLS also enforces ownership
 */
export async function selectCharity(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to select a charity.' };
  }

  // Validate input
  const raw = {
    charity_id: formData.get('charity_id') as string,
    contribution_percentage: formData.get('contribution_percentage') as string,
  };

  const result = charitySelectionFormSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { charity_id, contribution_percentage } = result.data;

  // Verify the charity exists and is active (server-side check, not relying on frontend)
  const { data: charity, error: charityError } = await supabase
    .from('charities')
    .select('id, is_active')
    .eq('id', charity_id)
    .single();

  if (charityError || !charity) {
    return { error: 'The selected charity does not exist.' };
  }

  if (!charity.is_active) {
    return { error: 'The selected charity is not currently active.' };
  }

  // Check if the user already has a selection
  const { data: existing } = await supabase
    .from('user_charity_selections')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    // Update existing selection
    const { error: updateError } = await supabase
      .from('user_charity_selections')
      .update({
        charity_id,
        contribution_percentage,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      return { error: updateError.message };
    }
  } else {
    // Insert new selection
    const { error: insertError } = await supabase
      .from('user_charity_selections')
      .insert({
        user_id: user.id,
        charity_id,
        contribution_percentage,
      });

    if (insertError) {
      return { error: insertError.message };
    }
  }

  revalidatePath('/charities');
  return { success: true };
}
