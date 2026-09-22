import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DrawAdminPanel } from '@/components/draws/DrawAdminPanel';
import { getPublishedDraws } from '@/lib/services/draws';
import { getAllWinners } from '@/lib/services/winners';
import Link from 'next/link';

export default async function AdminPage() {
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

  // Retrieve published draws and winners for admin review
  const [{ data: publishedDraws }, { data: allWinners }] = await Promise.all([
    getPublishedDraws(supabase),
    getAllWinners(supabase),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Draw Management Console
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Configure monthly parameters, simulate lottery or consistency-weighted outcomes, and publish official results.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/winners"
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow transition-colors"
          >
            🏆 Winner Verification Center →
          </Link>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            ● Remote DB Connected
          </span>
        </div>
      </div>

      {/* Main Draw Engine Panel */}
      <section>
        <DrawAdminPanel />
      </section>

      {/* Published History Section */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">
            Published Draws History
          </h2>
          <span className="text-xs text-slate-500">
            {publishedDraws?.length || 0} draw(s) published
          </span>
        </div>

        {(!publishedDraws || publishedDraws.length === 0) ? (
          <p className="text-sm text-slate-500 italic py-4">
            No official draws have been published to the platform yet. Use the simulation panel above to test and publish your first monthly draw.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Total Pool</th>
                  <th className="py-2.5 px-3">Jackpot</th>
                  <th className="py-2.5 px-3">Winners</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Executed At</th>
                  <th className="py-2.5 px-3 text-right">Audit Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {publishedDraws.map((d) => {
                  const drawWinners = allWinners?.filter((w) => w.draw_id === d.id) || [];
                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{d.draw_period}</td>
                      <td className="py-2.5 px-3 capitalize">{d.draw_mode}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-green-700">
                        £{(d.total_pool_cents / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-800">
                        £{(d.jackpot_amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        {drawWinners.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 font-bold text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded w-fit">
                              🏆 {drawWinners.length} winner{drawWinners.length > 1 ? 's' : ''}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {drawWinners.map((w) => w.user?.email || w.user?.full_name || 'Golfer').join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">0 winners</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                          {d.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">
                        {d.execution_timestamp ? new Date(d.execution_timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <Link
                          href="/admin/winners"
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          Winner Center →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

