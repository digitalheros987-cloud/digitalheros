'use client';

import { useState } from 'react';
import { WinnerAuditRecord, WinnerVerificationStatus } from '@/lib/services/winners';
import { DrawRecord } from '@/lib/services/draws';
import { verifyWinnerAction } from '@/actions/winners';

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

  // Summary counts
  const totalCount = winners.length;
  const pendingCount = winners.filter((w) => w.verification_status === 'pending').length;
  const verifiedCount = winners.filter((w) => w.verification_status === 'verified').length;
  const rejectedCount = winners.filter((w) => w.verification_status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm font-medium border ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            className={`px-3 py-1 rounded transition-colors ${
              statusFilter === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded transition-colors ${
              statusFilter === 'pending' ? 'bg-white shadow text-amber-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('verified')}
            className={`px-3 py-1 rounded transition-colors ${
              statusFilter === 'verified' ? 'bg-white shadow text-green-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Verified ({verifiedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1 rounded transition-colors ${
              statusFilter === 'rejected' ? 'bg-white shadow text-red-700' : 'text-slate-600 hover:text-slate-900'
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
                  <th className="py-3 px-4">Matched Numbers</th>
                  <th className="py-3 px-4">Prize Tier</th>
                  <th className="py-3 px-4">Prize Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWinners.map((winner) => {
                  const isLoading = actionLoadingId === winner.id;
                  const winningSet = new Set(winner.winning_numbers_snapshot || []);

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
                          {winner.match_count} of 5 matched
                        </span>
                      </td>

                      {/* Matched Numbers Snapshot */}
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap items-center">
                          {winner.scores_snapshot && winner.scores_snapshot.length > 0 ? (
                            winner.scores_snapshot.map((score, i) => {
                              const isMatch = winningSet.has(score);
                              return (
                                <span
                                  key={i}
                                  className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold ${
                                    isMatch
                                      ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-500'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                  title={isMatch ? `Matched winning number ${score}` : `Unmatched score ${score}`}
                                >
                                  {score}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-slate-400">Snapshot N/A</span>
                          )}
                        </div>
                      </td>

                      {/* Prize Tier */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">Tier {winner.match_tier}</span>
                        <span className="text-xs text-slate-500 block">
                          {winner.match_tier === 5 ? 'Jackpot (40%)' : winner.match_tier === 4 ? '4-Match (35%)' : '3-Match (25%)'}
                        </span>
                      </td>

                      {/* Prize Amount */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-green-700">
                        £{(winner.prize_amount_cents / 100).toFixed(2)}
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
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(winner.verified_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Action Controls */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {winner.verification_status === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleStatusChange(winner.id, 'verified')}
                                className="px-2.5 py-1 bg-green-700 hover:bg-green-800 text-white rounded text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
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

                          {winner.verification_status === 'verified' && (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleStatusChange(winner.id, 'pending')}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-semibold disabled:opacity-50 transition-colors"
                              title="Reset verification status back to pending"
                            >
                              {isLoading ? '...' : 'Unverify'}
                            </button>
                          )}

                          {winner.verification_status === 'rejected' && (
                            <>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleStatusChange(winner.id, 'verified')}
                                className="px-2.5 py-1 bg-green-700 hover:bg-green-800 text-white rounded text-xs font-semibold disabled:opacity-50 transition-colors"
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
    </div>
  );
}
