import { createClient } from '@/lib/supabase/server';
import { logout } from '@/actions/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex flex-col space-y-6 max-w-2xl w-full p-8 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold">User Profile</h1>
        <div className="flex gap-2">
          <Link href="/scores" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
            My Scores
          </Link>
          <Link href="/charities" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
            Charity
          </Link>
          <Link href="/subscription" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
            Subscription
          </Link>
          <Link href="/draws" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
            Draws
          </Link>
          <Link href="/winnings" className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded hover:bg-amber-400">
            🏆 Winnings
          </Link>
          <form action={logout}>
            <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Log Out
            </button>
          </form>
        </div>
      </div>

      {profile?.role === 'admin' && (
        <div className="bg-slate-900 text-white p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow border border-slate-800">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-amber-400">
              Administrative Access
            </span>
            <p className="text-sm font-medium text-slate-200">
              You are signed in as an administrator. Manage monthly draws and system settings in the Admin Console.
            </p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded shadow transition-colors text-center shrink-0"
          >
            Open Admin Console →
          </Link>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-500 font-semibold">Full Name</label>
          <p className="text-lg">{profile?.full_name || 'N/A'}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500 font-semibold">Email</label>
          <p className="text-lg">{profile?.email || user.email}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500 font-semibold">Role</label>
          <p className="text-lg capitalize">{profile?.role || 'user'}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500 font-semibold">Status</label>
          <p className="text-lg capitalize">{profile?.status || 'active'}</p>
        </div>
      </div>
    </div>
  );
}
