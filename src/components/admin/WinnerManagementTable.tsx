'use client';

import { useState } from 'react';
import { WinnerAuditRecord, WinnerVerificationStatus } from '@/lib/services/winners';
import { DrawRecord } from '@/lib/services/draws';
import { verifyWinnerAction, markWinnerPaidAction, getProofSignedUrlAction } from '@/actions/winners';
import { formatShortDate } from '@/lib/utils/date';

interface WinnerManagementTableProps {
  initialWinners: WinnerAuditRecord[];
  draws: DrawRecord[];
}

export function WinnerManagementTable({ initialWinners, draws }: WinnerManagementTableProps) {
  const [winners, setWinners] = useState<WinnerAuditRecord[]>(initialWinners);
  const [selectedDrawId, setSelectedDrawId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [notesModalWinner, setNotesModalWinner] = useState<WinnerAuditRecord | null>(null);
  const [adminNote, setAdminNote] = useState<string>('');
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [proofLoading, setProofLoading] = useState<string | null>(null);

  // Client-side filtering for fast interactive responsiveness
  const filteredWinners = winners.filter((w) => {
    if (selectedDrawId !== 'all' && w.draw_id !== selectedDrawId) {
      return false;
    }
    if (statusFilter !== 'all' && w.verification_status !== statusFilter) {
      return false;
    }
    return true;
  });

  async function handleStatusChange(winnerId: string, newStatus: WinnerVerificationStatus, notes?: string) {
    setActionLoadingId(winnerId);
    setFeedback(null);

    const res = await verifyWinnerAction({
      winnerId,
      status: newStatus,
      adminNotes: notes,
    });

    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || 'Failed to update verification status.' });
    } else {
      setFeedback({
        type: 'success',
        message: `Winner status successfully updated to "${newStatus}".`,
      });

      // Optimistically update local state
      setWinners((prev) =>
        prev.map((w) => {
          if (w.id === winnerId) {
            return {
              ...w,
              verification_status: newStatus,
              status: newStatus === 'verified' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'pending_proof',
              verified_at: newStatus !== 'pending' ? new Date().toISOString() : null,
              admin_notes: notes !== undefined ? notes : w.admin_notes,
            };
          }
          return w;
        })
      );
    }
    setActionLoadingId(null);
    setNotesModalWinner(null);
  }

  async function handleMarkPaid(winnerId: string) {
    setActionLoadingId(winnerId);
    setFeedback(null);

    const res = await markWinnerPaidAction({ winnerId });

    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || 'Failed to mark as paid.' });
    } else {
      setFeedback({ type: 'success', message: 'Winner payment marked as completed.' });
      setWinners((prev) =>
        prev.map((w) => {
          if (w.id === winnerId) {
            return { ...w, payment_status: 'paid' as const, status: 'paid', paid_at: new Date().toISOString() };
          }
          return w;
        })
      );
    }
    setActionLoadingId(null);
  }


  async function handleViewProof(storagePath: string) {
    setProofLoading(storagePath);
    const res = await getProofSignedUrlAction({ storagePath });
    if (res.success && res.url) {
      setProofModalUrl(res.url);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to load proof.' });
    }
    setProofLoading(null);
  }

  // Summary counts
  const totalCount = winners.length;
  const pendingCount = winners.filter((w) => w.verification_status === 'pending').length;
  const verifiedCount = winners.filter((w) => w.verification_status === 'verified').length;
  const rejectedCount = winners.filter((w) => w.verification_status === 'rejected').length;
  const paidCount = winners.filter((w) => w.payment_status === 'paid').length;

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm font-medium border ${feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
            }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Total Winners</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-amber-200 shadow-sm bg-amber-50/40">
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-700">Pending Review</span>
          <p className="text-2xl font-bold text-amber-900 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-green-200 shadow-sm bg-green-50/40">
          <span className="text-xs uppercase tracking-wider font-semibold text-green-700">Verified</span>
          <p className="text-2xl font-bold text-green-900 mt-1">{verifiedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm bg-red-50/40">
          <span className="text-xs uppercase tracking-wider font-semibold text-red-700">Rejected</span>
          <p className="text-2xl font-bold text-red-900 mt-1">{rejectedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-sm bg-emerald-50/40">
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-700">Paid</span>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{paidCount}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Draw Dropdown Filter */}
        <div className="flex items-center gap-3">
          <label htmlFor="draw-select" className="text-xs font-semibold uppercase text-slate-500 whitespace-nowrap">
            Filter Draw:
          </label>
          <select
            id="draw-select"
            value={selectedDrawId}
            onChange={(e) => setSelectedDrawId(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="all">All Published Draws ({draws.length})</option>
            {draws.map((d) => (
              <option key={d.id} value={d.id}>
                {d.draw_period} · {d.draw_mode} mode (£{(d.total_pool_cents / 100).toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded transition-colors ${statusFilter === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded transition-colors ${statusFilter === 'pending' ? 'bg-white shadow text-amber-700' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('verified')}
            className={`px-3 py-1 rounded transition-colors ${statusFilter === 'verified' ? 'bg-white shadow text-green-700' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Verified ({verifiedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1 rounded transition-colors ${statusFilter === 'rejected' ? 'bg-white shadow text-red-700' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Winner List / Table */}
      {filteredWinners.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-500">
          <p className="text-base font-medium">No winner records match the selected filters.</p>
          <p className="text-xs text-slate-400 mt-1">
            Publish official draws from the Draw Management Console to generate winner records.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50 text-xs">
                  <th className="py-3 px-4">Golfer</th>
                  <th className="py-3 px-4">Draw Period</th>
                  <th className="py-3 px-4">Match Count</th>
                  <th className="py-3 px-4">Prize</th>
                  <th className="py-3 px-4">Proof</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWinners.map((winner) => {
                  const isLoading = actionLoadingId === winner.id;

                  return (
                    <tr key={winner.id} className="hover:bg-slate-50 transition-colors">
                      {/* Golfer */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {winner.user?.full_name || 'Golfer'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {winner.user?.email || winner.user_id}
                        </div>
                      </td>

                      {/* Draw Period */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800">
                          {winner.draw?.draw_period || 'Draw'}
                        </span>
                        <span className="block text-xs text-slate-400 capitalize">
                          {winner.draw?.draw_mode || 'random'}
                        </span>
                      </td>

                      {/* Match Count */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {winner.match_count} of 5
                        </span>
                        <span className="text-xs text-slate-500 block">
                          {winner.match_tier === 5 ? 'Jackpot' : winner.match_tier === 4 ? '4-Match' : '3-Match'}
                        </span>
                      </td>

                      {/* Prize Amount */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-green-700">
                        £{(winner.prize_amount_cents / 100).toFixed(2)}
                      </td>

                      {/* Proof Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {winner.proof_url ? (
                          <button
                            type="button"
                            onClick={() => handleViewProof(winner.proof_url!)}
                            disabled={proofLoading === winner.proof_url}
                            className="text-xs text-blue-700 underline hover:text-blue-900 font-semibold disabled:opacity-50"
                          >
                            {proofLoading === winner.proof_url ? 'Loading...' : '📎 View Proof'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No proof</span>
                        )}
                        {winner.proof_uploaded_at && (
                          <div className="text-[10px] text-slate-400 mt-0.5" suppressHydrationWarning>
                            {formatShortDate(winner.proof_uploaded_at)}
                          </div>
                        )}
                      </td>

                      {/* Verification Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {winner.verification_status === 'verified' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                            ✓ Verified
                          </span>
                        )}
                        {winner.verification_status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ⏳ Pending
                          </span>
                        )}
                        {winner.verification_status === 'rejected' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            ✗ Rejected
                          </span>
                        )}
                        {winner.verified_at && (
                          <div className="text-[10px] text-slate-400 mt-0.5" suppressHydrationWarning>
                            {formatShortDate(winner.verified_at)}
                          </div>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {winner.payment_status === 'paid' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✅ Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Unpaid
                          </span>
                        )}
                        {winner.paid_at && (
                          <div className="text-[10px] text-slate-400 mt-0.5" suppressHydrationWarning>
                            {formatShortDate(winner.paid_at)}
                          </div>
                        )}
                      </td>

                      {/* Action Controls */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Verification Actions */}
                          {winner.verification_status === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={isLoading || !winner.proof_url}
                                onClick={() => handleStatusChange(winner.id, 'verified')}
                                className="px-2.5 py-1 bg-green-700 hover:bg-green-800 text-white rounded text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                title={!winner.proof_url ? 'Awaiting user proof upload' : 'Verify this winner'}
                              >
                                {isLoading ? '...' : 'Verify'}
                              </button>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => {
                                  setNotesModalWinner(winner);
                                  setAdminNote(winner.admin_notes || '');
                                }}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
                              >
                                Reject
                              </button>
                            </>
                          )}


                          {winner.verification_status === 'rejected' && (
                            <>
                              <button
                                type="button"
                                disabled={isLoading || !winner.proof_url}
                                onClick={() => handleStatusChange(winner.id, 'verified')}
                                className="px-2.5 py-1 bg-green-700 hover:bg-green-800 text-white rounded text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title={!winner.proof_url ? 'Awaiting user proof upload' : 'Verify this winner'}
                              >
                                {isLoading ? '...' : 'Verify'}
                              </button>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleStatusChange(winner.id, 'pending')}
                                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-semibold disabled:opacity-50 transition-colors"
                              >
                                {isLoading ? '...' : 'Reset'}
                              </button>
                            </>
                          )}

                          {/* Payment Actions */}
                          {winner.verification_status === 'verified' && winner.payment_status !== 'paid' && (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleMarkPaid(winner.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
                            >
                              {isLoading ? '...' : '💰 Mark Paid'}
                            </button>
                          )}


                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection / Note Modal */}
      {notesModalWinner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <h4 className="text-lg font-bold text-slate-900">
              Reject Winner Verification
            </h4>
            <p className="text-xs text-slate-600">
              Provide an audit note explaining why this winner verification for{' '}
              <strong>{notesModalWinner.user?.full_name || 'Golfer'}</strong> is being rejected.
            </p>
            <textarea
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="e.g. Golf score card screenshot did not match date or Stableford points..."
              className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNotesModalWinner(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(notesModalWinner.id, 'rejected', adminNote)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded shadow"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Image Modal */}
      {proofModalUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setProofModalUrl(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-900">Winner Proof Screenshot</h4>
              <button
                type="button"
                onClick={() => setProofModalUrl(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={proofModalUrl}
                alt="Winner proof screenshot"
                className="max-w-full max-h-[70vh] rounded border border-slate-200 shadow"
              />
            </div>
            <div className="flex justify-end gap-2">
              <a
                href={proofModalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow"
              >
                Open Full Size ↗
              </a>
              <button
                type="button"
                onClick={() => setProofModalUrl(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
