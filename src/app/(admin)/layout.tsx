import Link from 'next/link';
import { logout } from '@/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  if (!profile || profile.role !== 'admin') {
    redirect('/profile');
  }

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col text-slate-900">
      {/* Distinct Dedicated Admin Navigation Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="font-extrabold text-xl tracking-tight text-white">
              Digital Heroes
            </span>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs uppercase px-2.5 py-0.5 rounded-full font-bold tracking-wider">
              Admin Portal
            </span>
          </div>

          <nav className="flex items-center space-x-4 text-sm">
            <Link
              href="/admin"
              className="text-white font-medium hover:text-amber-300 transition-colors"
            >
              Draw Engine
            </Link>
            <Link
              href="/profile"
              className="text-slate-300 hover:text-white transition-colors"
            >
              User Profile View
            </Link>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              {profile.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </header>

      {/* Admin Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
