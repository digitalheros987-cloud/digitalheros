import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserWinnings } from '@/lib/services/winners';
import { UserWinningsList } from '@/components/winnings/UserWinningsList';
import { logout } from '@/actions/auth';
import Link from 'next/link';

export default async function WinningsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch only the authenticated user's winnings (RLS enforced)
  const { data: winnings } = await getUserWinnings(supabase, user.id);

  return (
    <div className="flex flex-col space-y-8 max-w-4xl w-full p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            My Prize Winnings
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track your draw outcomes, prize pool allocations, and verification states across published monthly draws.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/draws"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded transition-colors"
          >
            Past Draws
          </Link>
          <Link
            href="/scores"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded transition-colors"
          >
            My Scores
          </Link>
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded transition-colors"
          >
            Profile
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>

      {/* Main Winnings Section */}
      <section>
        <UserWinningsList winnings={winnings || []} />
      </section>
    </div>
  );
}
