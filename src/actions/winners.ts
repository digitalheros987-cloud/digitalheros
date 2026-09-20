'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { WinnerVerificationStatus } from '@/lib/services/winners';

/**
 * Ensures the authenticated user has the 'admin' role.
 */
async function verifyAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized: You must be logged in.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw new Error('Forbidden: Only administrators can perform winner verification.');
  }

  return user;
}

export interface VerifyWinnerInput {
  winnerId: string;
  status: WinnerVerificationStatus;
  adminNotes?: string;
}

/**
 * Server Action: Mark a winner as verified, rejected, or pending.
 * Admin-only with complete server-side authorization and audit logging.
 */
export async function verifyWinnerAction(input: VerifyWinnerInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const adminUser = await verifyAdmin();
    const adminSupabase = createAdminClient();

    const { winnerId, status, adminNotes } = input;

    if (!winnerId || typeof winnerId !== 'string') {
      return { success: false, error: 'Invalid winner ID provided.' };
    }

    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return { success: false, error: `Invalid verification status: ${status}` };
    }

    // 1. Fetch existing winner record
    const { data: existing, error: fetchErr } = await adminSupabase
      .from('winners')
      .select('*')
      .eq('id', winnerId)
      .single();

    if (fetchErr || !existing) {
      return { success: false, error: 'Winner record not found.' };
    }

    // 2. Map verification status to winner_status enum
    let mappedWinnerStatus: 'pending_proof' | 'approved' | 'rejected' = 'pending_proof';
    let verifiedAt: string | null = null;
    let verifiedBy: string | null = null;

    if (status === 'verified') {
      mappedWinnerStatus = 'approved';
      verifiedAt = new Date().toISOString();
      verifiedBy = adminUser.id;
    } else if (status === 'rejected') {
      mappedWinnerStatus = 'rejected';
      verifiedAt = new Date().toISOString();
      verifiedBy = adminUser.id;
    } else {
      mappedWinnerStatus = 'pending_proof';
      verifiedAt = null;
      verifiedBy = null;
    }

    // 3. Update winners record
    const { error: updateErr } = await adminSupabase
      .from('winners')
      .update({
        verification_status: status,
        status: mappedWinnerStatus,
        verified_at: verifiedAt,
        verified_by: verifiedBy,
        admin_notes: adminNotes !== undefined ? adminNotes : existing.admin_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', winnerId);

    if (updateErr) {
      return { success: false, error: `Failed to update winner verification: ${updateErr.message}` };
    }

    // 4. Sync winner_verifications table for PRD schema compliance
    const { data: existingVerif } = await adminSupabase
      .from('winner_verifications')
      .select('id')
      .eq('winner_id', winnerId)
      .maybeSingle();

    const verificationTableStatus = status === 'verified' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';

    if (existingVerif) {
      await adminSupabase
        .from('winner_verifications')
        .update({
          status: verificationTableStatus,
          verified_by: verifiedBy,
          verified_at: verifiedAt,
          admin_notes: adminNotes !== undefined ? adminNotes : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingVerif.id);
    } else {
      await adminSupabase
        .from('winner_verifications')
        .insert({
          winner_id: winnerId,
          proof_url: 'internal_verification',
          status: verificationTableStatus,
          verified_by: verifiedBy,
          verified_at: verifiedAt,
          admin_notes: adminNotes !== undefined ? adminNotes : null,
        });
    }

    // 5. Create immutable audit log
    await adminSupabase.from('audit_logs').insert({
      actor_id: adminUser.id,
      action: `winner_${status}`,
      entity_type: 'winners',
      entity_id: winnerId,
      details: {
        winner_id: winnerId,
        user_id: existing.user_id,
        draw_id: existing.draw_id,
        match_tier: existing.match_tier,
        prize_amount_cents: existing.prize_amount_cents,
        previous_status: existing.verification_status,
        new_status: status,
        admin_notes: adminNotes ?? null,
      },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/winners');
    revalidatePath('/draws');
    revalidatePath('/winnings');

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
