'use client';

import { PublishedDrawDetails } from '@/lib/services/draws';

interface DrawCardProps {
  draw: PublishedDrawDetails;
  userWinnings?: {
    match_tier: number;
    prize_amount_cents: number;
    status: string;
  } | null;
}

export function DrawCard({ draw, userWinnings }: DrawCardProps) {
  const formattedDate = draw.execution_timestamp
    ? new Date(draw.execution_timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : draw.draw_period;

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-3 gap-2">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-gray-500">
            Monthly Draw · {draw.draw_period}
          </span>
          <h3 className="text-xl font-bold">Draw Results ({draw.draw_mode})</h3>
          <p className="text-sm text-gray-500">Executed on {formattedDate}</p>
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
        <div className="p-4 bg-green-50 border border-green-300 rounded-lg text-green-900">
          <div className="font-bold flex items-center gap-2">
            <span>🎉</span> Congratulations! You won Tier {userWinnings.match_tier}!
          </div>
          <div className="text-sm mt-1">
            Prize amount: <strong>£{(userWinnings.prize_amount_cents / 100).toFixed(2)}</strong> (Status: {userWinnings.status})
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
          {draw.prize_tiers.map((tier) => (
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
                  <span className="text-green-600 font-medium">Claimed</span>
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
          ))}
        </div>
      </div>
    </div>
  );
}
