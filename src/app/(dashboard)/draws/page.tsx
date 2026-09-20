import { createClient } from '@/lib/supabase/server';
import { isUserEligibleForDraw } from '@/lib/services/eligibility';
import { getPublishedDraws, getPublishedDrawDetails, getUserDrawWinnings } from '@/lib/services/draws';
import { getScoreCount } from '@/lib/services/scores';
import { isSubscriptionActive } from '@/lib/services/subscriptions';
import { DrawCard } from '@/components/draws/DrawCard';
import { logout } from '@/actions/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DrawsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Eligibility status
  const { eligible, reason } = await isUserEligibleForDraw(supabase, user.id);
  const { active: subActive } = await isSubscriptionActive(supabase, user.id);
  const { count: scoreCount } = await getScoreCount(supabase, user.id);

  // 2. Published draws
  const { data: draws } = await getPublishedDraws(supabase);

  // Fetch full details for each published draw
  const detailedDraws = [];
  if (draws) {
    for (const d of draws) {
      const { data: details } = await getPublishedDrawDetails(supabase, d.id);
      if (details) {
        const { data: winnings } = await getUserDrawWinnings(supabase, user.id, d.id);
        detailedDraws.push({ details, winnings });
      }
    }
  }

  return (
    <div className="flex flex-col space-y-8 max-w-4xl w-full p-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Monthly Draws</h1>
          <p className="text-gray-600 text-sm mt-1">
            Participate in monthly draws powered by your Stableford scores and subscription.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/winnings" className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-sm rounded hover:bg-amber-400">
            🏆 My Winnings
          </Link>
          <Link href="/profile" className="px-4 py-2 bg-gray-200 text-black text-sm rounded hover:bg-gray-300">
            Profile
          </Link>
          <form action={logout}>
            <button type="submit" className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">
              Log Out
            </button>
          </form>
        </div>
      </div>

      {/* Participation / Eligibility Status Banner */}
      <div className={`p-6 rounded-lg border shadow-sm ${eligible ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{eligible ? '✅' : '⚠️'}</span>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {eligible ? 'You are eligible for upcoming monthly draws!' : 'Draw Eligibility Incomplete'}
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {eligible
                ? 'Your active subscription and 5 Stableford scores automatically enter you into every monthly draw.'
                : reason || 'Complete the checklist below to qualify for upcoming draws.'}
            </p>
          </div>
        </div>

        {/* Requirements Checklist */}
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span>{subActive ? '✓' : '✗'}</span>
            <span className={subActive ? 'text-green-800 font-medium' : 'text-amber-800'}>
              Active Subscription ({subActive ? 'Active' : 'Inactive'})
            </span>
            {!subActive && (
              <Link href="/subscription" className="text-xs underline text-blue-600 ml-auto">
                Subscribe
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>{scoreCount >= 5 ? '✓' : '✗'}</span>
            <span className={scoreCount >= 5 ? 'text-green-800 font-medium' : 'text-amber-800'}>
              5 Stableford Scores ({scoreCount}/5 entered)
            </span>
            {scoreCount < 5 && (
              <Link href="/scores" className="text-xs underline text-blue-600 ml-auto">
                Add Scores
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Published Draws Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Past Published Draws</h2>
        {detailedDraws.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-lg border text-gray-500">
            No official draws have been published yet. Check back after the next scheduled monthly draw!
          </div>
        ) : (
          <div className="space-y-6">
            {detailedDraws.map(({ details, winnings }) => (
              <DrawCard key={details.id} draw={details} userWinnings={winnings} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
