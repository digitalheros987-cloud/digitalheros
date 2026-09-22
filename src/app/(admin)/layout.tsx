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
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen w-full bg-brand-bg flex flex-col text-brand-text">
      {/* Distinct Dedicated Admin Navigation Bar */}
      <header className="bg-brand-text text-brand-bg border-b-4 border-brand-text">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-display font-black text-2xl uppercase tracking-tighter text-brand-bg">
              Digital Heroes
            </span>
            <span className="bg-brand-primary text-white border-2 border-brand-primary text-xs uppercase px-3 py-1 font-bold tracking-widest">
              Admin Portal
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm font-bold uppercase tracking-widest">
            <Link href="/admin" className="text-brand-bg hover:text-brand-accent transition-colors">Overview</Link>
            <Link href="/admin/users" className="text-brand-bg hover:text-brand-accent transition-colors">Users</Link>
            <Link href="/admin/draws" className="text-brand-bg hover:text-brand-accent transition-colors">Draws</Link>
            <Link href="/admin/charities" className="text-brand-bg hover:text-brand-accent transition-colors">Charities</Link>
            <Link href="/admin/winners" className="text-brand-bg hover:text-brand-accent transition-colors">Winners</Link>
            <span className="text-brand-muted hidden md:inline">|</span>
            <span className="text-xs text-brand-bg/50 hidden md:inline">
              {profile.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-accent text-white text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-brand-text transition-colors border-2 border-brand-accent hover:border-brand-text"
              >
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </header>

      {/* Admin Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
