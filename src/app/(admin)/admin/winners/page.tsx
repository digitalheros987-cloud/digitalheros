import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getPublishedDraws } from '@/lib/services/draws';
import { getAllWinners } from '@/lib/services/winners';
import { WinnerManagementTable } from '@/components/admin/WinnerManagementTable';
import Link from 'next/link';

export default async function AdminWinnersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/profile');
  }

  const [{ data: draws }, { data: winners }] = await Promise.all([
    getPublishedDraws(supabase),
    getAllWinners(supabase),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs font-semibold text-slate-500 hover:text-slate-900">
              ← Draw Console
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Verification Center
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            Winner Verification & Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Audit and verify prize winners for published monthly draws. Track match criteria, calculated prizes, and approval states.
          </p>
        </div>
      </div>

      {/* Main Interactive Table */}
      <section>
        <WinnerManagementTable initialWinners={winners || []} draws={draws || []} />
      </section>
    </div>
  );
}
