import { createClient } from '@/lib/supabase/server';
import { getUserScores } from '@/lib/services/scores';
import { ScoreForm } from '@/components/scores/ScoreForm';
import { ScoreList } from '@/components/scores/ScoreList';
import { logout } from '@/actions/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ScoresPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: scores } = await getUserScores(supabase, user.id);

  return (
    <div className="flex flex-col space-y-6 max-w-2xl w-full p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Scores</h1>
        <div className="flex gap-2">
          <Link href="/profile" className="px-4 py-2 bg-gray-200 text-black rounded hover:bg-gray-300">
            Profile
          </Link>
          <form action={logout}>
            <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Log Out
            </button>
          </form>
        </div>
      </div>

      {/* Add Score Form */}
      <ScoreForm />

      {/* Scores Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Your Stableford Scores</h2>
        <ScoreList scores={scores ?? []} />
      </div>
    </div>
  );
}
