'use client';

import { useState, useRef } from 'react';
import { WinnerAuditRecord } from '@/lib/services/winners';
import { uploadWinnerProofAction, getOwnProofSignedUrlAction } from '@/actions/winners';
import { formatFullDate, formatShortDate } from '@/lib/utils/date';
import Link from 'next/link';

interface UserWinningsListProps {
  winnings: WinnerAuditRecord[];
}

export function UserWinningsList({ winnings }: UserWinningsListProps) {
  const totalWonCents = winnings.reduce((sum, w) => sum + w.prize_amount_cents, 0);
  const totalPaidCents = winnings
    .filter((w) => w.payment_status === 'paid')
    .reduce((sum, w) => sum + w.prize_amount_cents, 0);
  const pendingProofCount = winnings.filter((w) => w.status === 'pending_proof' || w.status === 'rejected').length;
  const pendingReviewCount = winnings.filter((w) => w.status === 'reviewing').length;

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Total Won
          </span>
          <p className="text-2xl font-extrabold font-mono text-green-700 mt-1">
            £{(totalWonCents / 100).toFixed(2)}
          </p>
          <span className="text-xs text-slate-400 mt-0.5 block">
            Across {winnings.length} winning draw(s)
          </span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-green-200 shadow-sm bg-green-50/40">
          <span className="text-xs uppercase tracking-wider font-semibold text-green-700">
            Paid Out
          </span>
          <p className="text-2xl font-extrabold font-mono text-green-900 mt-1">
            £{(totalPaidCents / 100).toFixed(2)}
          </p>
          <span className="text-xs text-green-700/80 mt-0.5 block">
            Completed payouts
          </span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-amber-200 shadow-sm bg-amber-50/40">
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-700">
            Proof Required
          </span>
          <p className="text-2xl font-extrabold text-amber-900 mt-1">
            {pendingProofCount}
          </p>
          <span className="text-xs text-amber-700/80 mt-0.5 block">
            Upload golf scorecard screenshot
          </span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-blue-200 shadow-sm bg-blue-50/40">
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-700">
            Under Review
          </span>
          <p className="text-2xl font-extrabold text-blue-900 mt-1">
            {pendingReviewCount}
          </p>
          <span className="text-xs text-blue-700/80 mt-0.5 block">
            Awaiting admin verification
          </span>
        </div>
      </div>

      {/* Winnings Detail List */}
      {winnings.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-10 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-2xl">
            ⛳
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Winnings Yet</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mt-1">
              You haven&apos;t won a prize tier in any published draws yet. Every active subscriber with 5 recorded Stableford scores is automatically entered into each monthly draw!
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/scores"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-sm font-semibold transition-colors"
            >
              Manage My Scores
            </Link>
            <Link
              href="/draws"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-sm font-semibold transition-colors"
            >
              View Draw Results
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Your Prize History</h2>
          <div className="space-y-4">
            {winnings.map((winning) => (
              <WinningCard key={winning.id} winning={winning} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual Winning Card (extracted for local state management)
// ---------------------------------------------------------------------------

function WinningCard({ winning }: { winning: WinnerAuditRecord }) {
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const winningSet = new Set(winning.winning_numbers_snapshot || []);
  const formattedDate = winning.draw?.execution_timestamp
    ? formatFullDate(winning.draw.execution_timestamp)
    : winning.draw?.draw_period || 'Past Draw';

  const canUploadProof = winning.status === 'pending_proof' || winning.status === 'rejected';

  async function handleProofUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('winnerId', winning.id);

    setUploadState('uploading');
    setUploadError(null);

    const result = await uploadWinnerProofAction(formData);

    if (result.success) {
      setUploadState('success');
      // Clear the file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setUploadState('error');
      setUploadError(result.error || 'Upload failed.');
    }
  }

  async function handleViewProof() {
    setLoadingProof(true);
    const result = await getOwnProofSignedUrlAction({ winnerId: winning.id });
    if (result.success && result.url) {
      setProofUrl(result.url);
    }
    setLoadingProof(false);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4 hover:border-slate-300 transition-colors">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Monthly Draw · {winning.draw?.draw_period}
          </span>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            🎉 Tier {winning.match_tier} Match Winner
          </h3>
          <p className="text-xs text-slate-500" suppressHydrationWarning>
            Executed on {formattedDate} ({winning.draw?.draw_mode} mode)
          </p>
        </div>

        <div className="sm:text-right">
          <span className="text-xs text-slate-500 block">Calculated Prize</span>
          <span className="text-2xl font-extrabold font-mono text-green-700">
            £{(winning.prize_amount_cents / 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Status Badges Row */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 rounded-lg p-3 text-sm">
        {/* Verification Status */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Verification:</span>
          {winning.verification_status === 'verified' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
              ✓ Verified
            </span>
          )}
          {winning.verification_status === 'pending' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              ⏳ Pending
            </span>
          )}
          {winning.verification_status === 'rejected' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
              ✗ Rejected
            </span>
          )}
          {winning.verified_at && (
            <span className="text-xs text-slate-400" suppressHydrationWarning>
              {formatShortDate(winning.verified_at)}
            </span>
          )}
        </div>

        {/* Payment Status */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Payment:</span>
          {winning.payment_status === 'paid' ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
              ✅ Paid
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              💰 Pending
            </span>
          )}
          {winning.paid_at && (
            <span className="text-xs text-slate-400" suppressHydrationWarning>
              {formatShortDate(winning.paid_at)}
            </span>
          )}
        </div>
      </div>

      {/* Proof Upload / Status Section */}
      {canUploadProof && (
        <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-amber-900">
              📸 {winning.status === 'rejected' ? 'Resubmit Proof' : 'Upload Score Proof'}
            </span>
            {winning.status === 'rejected' && (
              <span className="text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Previous submission was rejected
              </span>
            )}
          </div>
          {winning.admin_notes && winning.status === 'rejected' && (
            <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded p-2">
              <strong>Admin note:</strong> {winning.admin_notes}
            </p>
          )}
          <p className="text-xs text-amber-800">
            Upload a screenshot from your golf platform showing your Stableford scores. Accepted formats: PNG, JPEG, WebP. Max size: 5 MB.
          </p>
          <form onSubmit={handleProofUpload} className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              name="proof"
              accept="image/png,image/jpeg,image/webp"
              required
              className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-amber-200 file:text-amber-900 hover:file:bg-amber-300 file:cursor-pointer"
            />
            <button
              type="submit"
              disabled={uploadState === 'uploading'}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
            >
              {uploadState === 'uploading' ? 'Uploading...' : 'Submit Proof'}
            </button>
          </form>
          {uploadState === 'success' && (
            <p className="text-xs text-green-700 font-medium bg-green-50 border border-green-200 rounded p-2">
              ✓ Proof uploaded successfully! Your submission is now under review.
            </p>
          )}
          {uploadState === 'error' && uploadError && (
            <p className="text-xs text-red-700 font-medium bg-red-50 border border-red-200 rounded p-2">
              ✗ {uploadError}
            </p>
          )}
        </div>
      )}

      {/* Show proof status when proof was uploaded (reviewing / approved) */}
      {winning.proof_url && !canUploadProof && (
        <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-900">
              📋 Proof Submitted
            </span>
            {winning.proof_uploaded_at && (
              <span className="text-xs text-blue-600" suppressHydrationWarning>
                Uploaded {formatShortDate(winning.proof_uploaded_at)}
              </span>
            )}
          </div>
          {winning.status === 'reviewing' && (
            <p className="text-xs text-blue-800">Your proof is currently under administrator review.</p>
          )}
          {(winning.status === 'approved' || winning.status === 'paid') && (
            <p className="text-xs text-green-800">✓ Your proof has been approved.</p>
          )}
          {/* View proof button */}
          <button
            type="button"
            onClick={handleViewProof}
            disabled={loadingProof}
            className="text-xs text-blue-700 underline hover:text-blue-900 disabled:opacity-50"
          >
            {loadingProof ? 'Loading...' : 'View uploaded proof'}
          </button>
          {proofUrl && (
            <div className="mt-2">
              <img
                src={proofUrl}
                alt="Uploaded proof screenshot"
                className="max-w-xs max-h-48 rounded border border-blue-200 shadow-sm"
              />
            </div>
          )}
        </div>
      )}

      {/* Numbers & Match Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Golfer's Snapshot Scores */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
            Your Entered Scores ({winning.match_count} matched)
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {winning.scores_snapshot && winning.scores_snapshot.length > 0 ? (
              winning.scores_snapshot.map((score, i) => {
                const isMatch = winningSet.has(score);
                return (
                  <span
                    key={i}
                    className={`w-8 h-8 rounded font-mono font-bold text-xs flex items-center justify-center shadow-sm ${isMatch
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-500 font-extrabold'
                        : 'bg-slate-100 text-slate-700'
                      }`}
                    title={isMatch ? `Matched winning number ${score}` : `Score ${score}`}
                  >
                    {score}
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-slate-400">Scores snapshot archived</span>
            )}
          </div>
        </div>

        {/* Winning Numbers Drawn */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
            Official Winning Numbers
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {winning.winning_numbers_snapshot && winning.winning_numbers_snapshot.length > 0 ? (
              winning.winning_numbers_snapshot.map((num, i) => (
                <span
                  key={i}
                  className="w-8 h-8 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shadow"
                >
                  {num}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">Winning numbers archived</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
