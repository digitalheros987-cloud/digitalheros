'use client';

import { PublishedDrawDetails, UserWinningsDetails } from '@/lib/services/draws';
import { formatFullDate } from '@/lib/utils/date';
import Link from 'next/link';

interface DrawCardProps {
  draw: PublishedDrawDetails;
  userWinnings?: UserWinningsDetails | null;
}

export function DrawCard({ draw, userWinnings }: DrawCardProps) {
  const formattedDate = draw.execution_timestamp
    ? formatFullDate(draw.execution_timestamp)
    : draw.draw_period;

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-3 gap-2">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-gray-500">
            Monthly Draw · {draw.draw_period}
          </span>
          <h3 className="text-xl font-bold">Draw Results ({draw.draw_mode})</h3>
          <p className="text-sm text-gray-500" suppressHydrationWarning>Executed on {formattedDate}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Total Prize Pool</div>
          <div className="text-xl font-extrabold font-mono text-green-700">
            £{(draw.total_pool_cents / 100).toFixed(2)}
          </div>
        </div>
      </div>

      {/* User Winning Alert */}
      {userWinnings && (
        <div className="p-4 bg-green-50 border border-green-300 rounded-lg text-green-950 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="font-bold flex items-center gap-2">
              <span className="text-xl">🎉</span>
              <span>Congratulations! You won Tier {userWinnings.match_tier} ({userWinnings.match_count || userWinnings.match_tier} matches)!</span>
            </div>
            <Link
              href="/winnings"
              className="text-xs font-semibold text-green-800 underline hover:text-green-950 whitespace-nowrap"
            >
              View in My Winnings →
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm pt-1 border-t border-green-200">
            <div>
              Prize Amount: <strong className="font-mono text-base font-bold text-green-900">£{(userWinnings.prize_amount_cents / 100).toFixed(2)}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-800">Verification:</span>
              {userWinnings.verification_status === 'verified' && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-200 text-green-900 border border-green-300">
                  ✓ Verified
                </span>
              )}
              {userWinnings.verification_status === 'pending' && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-200 text-amber-900 border border-amber-300">
                  ⏳ Pending Admin Review
                </span>
              )}
              {userWinnings.verification_status === 'rejected' && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-200 text-red-900 border border-red-300">
                  ✗ Rejected
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Winning Numbers */}
      {draw.results && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Winning Numbers
          </div>
          <div className="flex gap-2 flex-wrap">
            {draw.results.winning_numbers.map((num, idx) => (
              <span
                key={idx}
                className="w-10 h-10 rounded-full bg-black text-white font-bold flex items-center justify-center font-mono shadow"
              >
                {num}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Prize Tiers */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Prize Tiers
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {draw.prize_tiers.map((tier) => {
            const tierWinners = draw.winners?.filter((w) => w.match_tier === tier.match_tier) || [];
            return (
              <div
                key={tier.match_tier}
                className={`p-3 rounded border text-sm ${tier.is_claimed ? 'bg-gray-50 border-gray-200' : 'bg-amber-50 border-amber-200'
                  }`}
              >
                <div className="font-bold flex justify-between">
                  <span>{tier.match_tier}-Number Match</span>
                  <span className="text-gray-500 font-normal">{tier.percentage_allocation}%</span>
                </div>
                <div className="text-lg font-mono font-bold mt-1 text-gray-900">
                  £{(tier.total_amount_cents / 100).toFixed(2)}
                </div>
                <div className="text-xs mt-1 text-gray-600">
                  {tier.is_claimed ? (
                    <span className="text-green-600 font-medium">
                      Claimed{tierWinners.length > 0 ? ` (${tierWinners.length} winner${tierWinners.length > 1 ? 's' : ''})` : ''}
                    </span>
                  ) : tier.match_tier === 5 ? (
                    <span className="text-amber-700 font-semibold">Rolled Over ➔</span>
                  ) : (
                    <span className="text-gray-500">Unclaimed</span>
                  )}
                </div>
                {tier.rollover_amount_cents > 0 && (
                  <div className="text-xs text-purple-700 mt-0.5">
                    (Includes £{(tier.rollover_amount_cents / 100).toFixed(2)} rollover)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
