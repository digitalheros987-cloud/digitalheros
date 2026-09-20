'use client';

import { WinnerAuditRecord } from '@/lib/services/winners';
import Link from 'next/link';

interface UserWinningsListProps {
  winnings: WinnerAuditRecord[];
}

export function UserWinningsList({ winnings }: UserWinningsListProps) {
  const totalWonCents = winnings.reduce((sum, w) => sum + w.prize_amount_cents, 0);
  const totalVerifiedCents = winnings
    .filter((w) => w.verification_status === 'verified')
    .reduce((sum, w) => sum + w.prize_amount_cents, 0);
  const pendingCount = winnings.filter((w) => w.verification_status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            Verified Payouts
          </span>
          <p className="text-2xl font-extrabold font-mono text-green-900 mt-1">
            £{(totalVerifiedCents / 100).toFixed(2)}
          </p>
          <span className="text-xs text-green-700/80 mt-0.5 block">
            Approved & confirmed
          </span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-amber-200 shadow-sm bg-amber-50/40">
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-700">
            Pending Review
          </span>
          <p className="text-2xl font-extrabold text-amber-900 mt-1">
            {pendingCount}
          </p>
          <span className="text-xs text-amber-700/80 mt-0.5 block">
            Awaiting administrator verification
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
            {winnings.map((winning) => {
              const winningSet = new Set(winning.winning_numbers_snapshot || []);
              const formattedDate = winning.draw?.execution_timestamp
                ? new Date(winning.draw.execution_timestamp).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : winning.draw?.draw_period || 'Past Draw';

              return (
                <div
                  key={winning.id}
                  className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <div>
                      <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                        Monthly Draw · {winning.draw?.draw_period}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        🎉 Tier {winning.match_tier} Match Winner
                      </h3>
                      <p className="text-xs text-slate-500">Executed on {formattedDate} ({winning.draw?.draw_mode} mode)</p>
                    </div>

                    <div className="sm:text-right">
                      <span className="text-xs text-slate-500 block">Calculated Prize</span>
                      <span className="text-2xl font-extrabold font-mono text-green-700">
                        £{(winning.prize_amount_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Verification Status Alert */}
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Verification Status:</span>
                      {winning.verification_status === 'verified' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                          ✓ Verified
                        </span>
                      )}
                      {winning.verification_status === 'pending' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          ⏳ Pending Administrator Review
                        </span>
                      )}
                      {winning.verification_status === 'rejected' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                          ✗ Verification Rejected
                        </span>
                      )}
                    </div>
                    {winning.verified_at && (
                      <span className="text-xs text-slate-400">
                        Verified {new Date(winning.verified_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

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
                                className={`w-8 h-8 rounded font-mono font-bold text-xs flex items-center justify-center shadow-sm ${
                                  isMatch
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
            })}
          </div>
        </div>
      )}
    </div>
  );
}
