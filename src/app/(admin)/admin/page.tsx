import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getPublishedDraws } from '@/lib/services/draws';
import { getAllWinners } from '@/lib/services/winners';
import { formatFullDate } from '@/lib/utils/date';
import Link from 'next/link';

export default async function AdminOverviewPage() {
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
    redirect('/dashboard');
  }

  // 1. Gather Users and Subscriptions Info
  const [{ count: totalUsers }, { count: activeSubs }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true })
      .in('status', ['active', 'canceled'])
      .gt('current_period_end', new Date().toISOString())
  ]);

  // 2. Gather Draws and Winners
  const [{ data: publishedDraws }, { data: winners }] = await Promise.all([
    getPublishedDraws(supabase),
    getAllWinners(supabase),
  ]);

  // 3. Gather Charity Info
  // Since we take 10% from the subscription fee (default assumed £10) for the prize pool, wait...
  // PRD §5.5 says: "Charity pool: Represents remaining funds after the prize pool is generated".
  // Actually, we calculate the total prize pool in draws. 
  // Let's sum the total_pool_cents across all published draws.
  const totalPrizePoolCents = publishedDraws?.reduce((sum, d) => sum + d.total_pool_cents, 0) || 0;
  
  // Total charity contributions isn't stored distinctly in draws. The PRD says "minimum 10%... User may voluntarily increase".
  // Let's pull the actual charity selections to calculate average contribution, or we can just calculate 
  // the exact sum if we have subscription payments. We don't have real payments. 
  // Let's sum the requested contribution percentages from user_charity_selection.
  const { data: charitySelections } = await supabase.from('user_charity_selections').select('contribution_percentage');
  const totalCharityContributions = charitySelections?.length || 0;
  const avgCharityPercent = charitySelections && charitySelections.length > 0 
    ? (charitySelections.reduce((sum, c) => sum + c.contribution_percentage, 0) / charitySelections.length) 
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Admin Dashboard
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          High-level overview, platform metrics, and reports.
        </p>
      </div>

      {/* DASHBOARD SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Users */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Users</h3>
          <span className="text-4xl font-extrabold text-blue-900">{totalUsers || 0}</span>
          <Link href="/admin/users" className="mt-auto pt-4 text-sm font-medium text-blue-600 hover:underline">
            Manage Users →
          </Link>
        </div>

        {/* Subscriptions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Active Subscriptions</h3>
          <span className="text-4xl font-extrabold text-emerald-700">{activeSubs || 0}</span>
          <p className="text-xs text-slate-500 mt-2">Currently active or prepaid simulated subscriptions.</p>
        </div>

        {/* Prize Pool */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Prize Pool Created</h3>
          <span className="text-4xl font-extrabold text-amber-600">£{(totalPrizePoolCents / 100).toFixed(2)}</span>
          <Link href="/admin/draws" className="mt-auto pt-4 text-sm font-medium text-amber-600 hover:underline">
            Go to Draw Engine →
          </Link>
        </div>

        {/* Charity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Charity Insights</h3>
          <span className="text-3xl font-bold text-purple-900">{totalCharityContributions} <span className="text-lg font-medium text-slate-500">active pledges</span></span>
          <p className="text-sm text-purple-700 mt-1">Avg Contribution: {avgCharityPercent.toFixed(1)}%</p>
          <Link href="/admin/charities" className="mt-auto pt-4 text-sm font-medium text-purple-600 hover:underline">
            Manage Charities →
          </Link>
        </div>

        {/* Draws */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Official Draws</h3>
          <span className="text-4xl font-extrabold text-indigo-900">{publishedDraws?.length || 0}</span>
          <span className="text-sm text-slate-500 mt-2">Historically published draws.</span>
        </div>

        {/* Winners */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Winners</h3>
          <span className="text-4xl font-extrabold text-rose-700">{winners?.length || 0}</span>
          <Link href="/admin/winners" className="mt-auto pt-4 text-sm font-medium text-rose-600 hover:underline">
            Review Proofs & Payouts →
          </Link>
        </div>

      </div>

      {/* RECENT REPORTS/ANALYTICS */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4 mb-4">Latest Draw Audit Report</h2>
        {publishedDraws && publishedDraws.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded border border-slate-200">
              <div>
                <p className="text-sm font-bold text-slate-800">Draw Period: {publishedDraws[0].draw_period}</p>
                <p className="text-xs text-slate-500">Executed: {formatFullDate(publishedDraws[0].execution_timestamp || publishedDraws[0].created_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">Pool: £{(publishedDraws[0].total_pool_cents / 100).toFixed(2)}</p>
                <p className="text-xs text-slate-500">Mode: {publishedDraws[0].draw_mode}</p>
              </div>
            </div>
            <Link href="/admin/draws" className="inline-block text-sm font-medium text-blue-600 hover:underline">
              View all draws and run simulations →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No draws have been executed yet.</p>
        )}
      </section>
    </div>
  );
}
