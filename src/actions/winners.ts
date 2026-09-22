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

    // 1b. Enforce proof upload before verification
    if (status === 'verified' && !existing.proof_url) {
      return { success: false, error: 'Cannot verify winner: User has not uploaded proof documentation yet.' };
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

// ---------------------------------------------------------------------------
// Proof Upload Constants
// ---------------------------------------------------------------------------
const ALLOWED_PROOF_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (see Assumption A-019)
const PROOF_BUCKET = 'winner-proofs';

/**
 * Ensures the winner-proofs storage bucket exists, creating it if needed.
 * Supabase Storage buckets cannot be created via SQL migrations, so we
 * lazily initialize here using the service-role admin client.
 */
async function ensureProofBucket(adminSupabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await adminSupabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === PROOF_BUCKET);
  if (!exists) {
    await adminSupabase.storage.createBucket(PROOF_BUCKET, {
      public: false, // Private: only admins + uploader can view via signed URLs
      fileSizeLimit: MAX_PROOF_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_PROOF_TYPES,
    });
  }
}

/**
 * Server Action: Upload proof screenshot for a winner record.
 *
 * Authorization: Only the authenticated winner (owner of the record) can upload.
 * Only allowed when winner status is 'pending_proof' or 'rejected' (Assumption A-020).
 */
export async function uploadWinnerProofAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // 1. Authenticate
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: You must be logged in.' };
    }

    // 2. Extract and validate inputs
    const winnerId = formData.get('winnerId') as string;
    const file = formData.get('proof') as File | null;

    if (!winnerId || typeof winnerId !== 'string') {
      return { success: false, error: 'Missing winner ID.' };
    }
    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: 'No file provided. Please select a screenshot to upload.' };
    }
    if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
      return { success: false, error: `Invalid file type "${file.type}". Accepted: PNG, JPEG, WebP.` };
    }
    if (file.size > MAX_PROOF_SIZE_BYTES) {
      return { success: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 5 MB.` };
    }

    // 3. Fetch the winner record and verify ownership + uploadable status
    const adminSupabase = createAdminClient();
    const { data: winner, error: fetchErr } = await adminSupabase
      .from('winners')
      .select('*')
      .eq('id', winnerId)
      .single();

    if (fetchErr || !winner) {
      return { success: false, error: 'Winner record not found.' };
    }
    if (winner.user_id !== user.id) {
      return { success: false, error: 'Forbidden: You can only upload proof for your own winning record.' };
    }
    // Only allow upload when pending proof or after rejection (re-upload)
    if (!['pending_proof', 'rejected'].includes(winner.status)) {
      return { success: false, error: `Proof upload not allowed in current status: "${winner.status}". Only pending or rejected records accept uploads.` };
    }

    // 4. Ensure the storage bucket exists
    await ensureProofBucket(adminSupabase);

    // 5. Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop() || 'png';
    const storagePath = `${winnerId}/${Date.now()}.${fileExt}`;

    const { error: uploadErr } = await adminSupabase.storage
      .from(PROOF_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true, // Overwrite previous proof for same winner
      });

    if (uploadErr) {
      return { success: false, error: `Upload failed: ${uploadErr.message}` };
    }

    const now = new Date().toISOString();

    // 6. Update the winners record with proof URL and transition to 'reviewing'
    const { error: updateErr } = await adminSupabase
      .from('winners')
      .update({
        proof_url: storagePath,
        proof_uploaded_at: now,
        status: 'reviewing',
        // Reset verification status to pending when re-uploading after rejection
        verification_status: 'pending',
        updated_at: now,
      })
      .eq('id', winnerId);

    if (updateErr) {
      return { success: false, error: `Failed to update winner record: ${updateErr.message}` };
    }

    // 7. Sync winner_verifications table for schema compliance
    const { data: existingVerif } = await adminSupabase
      .from('winner_verifications')
      .select('id')
      .eq('winner_id', winnerId)
      .maybeSingle();

    if (existingVerif) {
      await adminSupabase
        .from('winner_verifications')
        .update({
          proof_url: storagePath,
          status: 'pending',
          verified_by: null,
          verified_at: null,
          admin_notes: null,
          updated_at: now,
        })
        .eq('id', existingVerif.id);
    } else {
      await adminSupabase
        .from('winner_verifications')
        .insert({
          winner_id: winnerId,
          proof_url: storagePath,
          status: 'pending',
        });
    }

    // 8. Audit log
    await adminSupabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'winner_proof_uploaded',
      entity_type: 'winners',
      entity_id: winnerId,
      details: {
        winner_id: winnerId,
        draw_id: winner.draw_id,
        storage_path: storagePath,
        file_type: file.type,
        file_size_bytes: file.size,
      },
    });

    revalidatePath('/winnings');
    revalidatePath('/admin/winners');

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Server Action: Mark a verified winner's payout as completed.
 * Admin-only. Does NOT process actual bank transfers (see Assumption A-018).
 * Prerequisite: winner must be verified before payment can be marked.
 */
export async function markWinnerPaidAction(input: { winnerId: string }): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const adminUser = await verifyAdmin();
    const adminSupabase = createAdminClient();

    const { winnerId } = input;
    if (!winnerId || typeof winnerId !== 'string') {
      return { success: false, error: 'Invalid winner ID.' };
    }

    // Fetch winner record
    const { data: winner, error: fetchErr } = await adminSupabase
      .from('winners')
      .select('*')
      .eq('id', winnerId)
      .single();

    if (fetchErr || !winner) {
      return { success: false, error: 'Winner record not found.' };
    }

    // Must be verified before marking as paid
    if (winner.verification_status !== 'verified') {
      return { success: false, error: `Cannot mark as paid: winner verification status is "${winner.verification_status}". Must be "verified" first.` };
    }

    if (winner.payment_status === 'paid') {
      return { success: false, error: 'Winner is already marked as paid.' };
    }

    const now = new Date().toISOString();

    const { error: updateErr } = await adminSupabase
      .from('winners')
      .update({
        payment_status: 'paid',
        status: 'paid',
        paid_at: now,
        paid_by: adminUser.id,
        updated_at: now,
      })
      .eq('id', winnerId);

    if (updateErr) {
      return { success: false, error: `Failed to update payment status: ${updateErr.message}` };
    }

    // Audit log
    await adminSupabase.from('audit_logs').insert({
      actor_id: adminUser.id,
      action: 'winner_marked_paid',
      entity_type: 'winners',
      entity_id: winnerId,
      details: {
        winner_id: winnerId,
        user_id: winner.user_id,
        draw_id: winner.draw_id,
        prize_amount_cents: winner.prize_amount_cents,
      },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/winners');
    revalidatePath('/winnings');

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Server Action: Reverse a winner's payment status back to unpaid.
 * Admin-only. Used for correcting accidental "Mark as Paid" actions.
 */
export async function markWinnerUnpaidAction(input: { winnerId: string }): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const adminUser = await verifyAdmin();
    const adminSupabase = createAdminClient();

    const { winnerId } = input;
    if (!winnerId || typeof winnerId !== 'string') {
      return { success: false, error: 'Invalid winner ID.' };
    }

    const { data: winner, error: fetchErr } = await adminSupabase
      .from('winners')
      .select('*')
      .eq('id', winnerId)
      .single();

    if (fetchErr || !winner) {
      return { success: false, error: 'Winner record not found.' };
    }

    if (winner.payment_status !== 'paid') {
      return { success: false, error: 'Winner is not currently marked as paid.' };
    }

    const now = new Date().toISOString();

    const { error: updateErr } = await adminSupabase
      .from('winners')
      .update({
        payment_status: 'unpaid',
        status: 'approved', // Revert to approved (verified but unpaid)
        paid_at: null,
        paid_by: null,
        updated_at: now,
      })
      .eq('id', winnerId);

    if (updateErr) {
      return { success: false, error: `Failed to revert payment status: ${updateErr.message}` };
    }

    // Audit log
    await adminSupabase.from('audit_logs').insert({
      actor_id: adminUser.id,
      action: 'winner_marked_unpaid',
      entity_type: 'winners',
      entity_id: winnerId,
      details: {
        winner_id: winnerId,
        user_id: winner.user_id,
        draw_id: winner.draw_id,
        prize_amount_cents: winner.prize_amount_cents,
        previous_paid_at: winner.paid_at,
      },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/winners');
    revalidatePath('/winnings');

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Server Action: Generate a signed URL for viewing a winner's proof screenshot.
 * Admin-only. Returns a temporary signed URL (valid for 5 minutes).
 */
export async function getProofSignedUrlAction(input: { storagePath: string }): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    await verifyAdmin();
    const adminSupabase = createAdminClient();

    const { storagePath } = input;
    if (!storagePath || typeof storagePath !== 'string') {
      return { success: false, error: 'Invalid storage path.' };
    }

    const { data, error } = await adminSupabase.storage
      .from(PROOF_BUCKET)
      .createSignedUrl(storagePath, 300); // 5 minutes

    if (error || !data?.signedUrl) {
      return { success: false, error: `Failed to generate signed URL: ${error?.message || 'Unknown error'}` };
    }

    return { success: true, url: data.signedUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Server Action: Generate a signed URL for a user to view their own uploaded proof.
 * User-only (must own the winner record).
 */
export async function getOwnProofSignedUrlAction(input: { winnerId: string }): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const adminSupabase = createAdminClient();
    const { data: winner } = await adminSupabase
      .from('winners')
      .select('proof_url, user_id')
      .eq('id', input.winnerId)
      .single();

    if (!winner || winner.user_id !== user.id) {
      return { success: false, error: 'Not found or not authorized.' };
    }

    if (!winner.proof_url) {
      return { success: false, error: 'No proof uploaded yet.' };
    }

    const { data, error } = await adminSupabase.storage
      .from(PROOF_BUCKET)
      .createSignedUrl(winner.proof_url, 300);

    if (error || !data?.signedUrl) {
      return { success: false, error: `Failed to generate URL: ${error?.message || 'Unknown error'}` };
    }

    return { success: true, url: data.signedUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
