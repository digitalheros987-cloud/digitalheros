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

    <div className="flex flex-col max-w-7xl w-full mx-auto p-4 md:p-8 pt-12">
      <div className="flex flex-col gap-4 pb-8 mb-12 border-b-4 border-brand-text">
        <h1 className="font-display font-black text-5xl md:text-7xl uppercase tracking-tighter text-brand-text">
          ADMIN CONSOLE
        </h1>
        <p className="text-xl font-medium text-brand-muted border-l-4 border-brand-text pl-4">
          High-level overview, platform metrics, and control panels.
        </p>
      </div>

      {/* DASHBOARD SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-2 border-brand-text bg-white mb-16 divide-y-2 lg:divide-y-0 lg:divide-x-2 sm:divide-x-2 divide-brand-text">

        {/* Users */}
        <div className="p-6 flex flex-col justify-between bg-white hover:bg-brand-bg transition-colors group">
          <span className="text-xs uppercase font-bold tracking-widest text-brand-muted mb-2">Total Users</span>
          <span className="font-display font-black text-6xl uppercase tracking-tighter text-brand-text mb-6">
            {totalUsers || 0}
          </span>
          <Link href="/admin/users" className="text-sm font-bold uppercase tracking-widest text-brand-primary group-hover:text-brand-accent transition-colors border-t-2 border-brand-text pt-4 flex items-center justify-between">
            Manage Users <span>→</span>
          </Link>
        </div>

        {/* Subscriptions */}
        <div className="p-6 flex flex-col justify-between bg-brand-primary text-white hover:bg-brand-primaryHover transition-colors group">
          <span className="text-xs uppercase font-bold tracking-widest text-white/80 mb-2">Active Subs</span>
          <span className="font-display font-black text-6xl uppercase tracking-tighter text-white mb-6">
            {activeSubs || 0}
          </span>
          <p className="text-sm font-bold text-white/80 border-t-2 border-white/20 pt-4">Currently active or prepaid</p>
        </div>

        {/* Prize Pool */}
        <div className="p-6 flex flex-col justify-between bg-white hover:bg-brand-bg transition-colors group">
          <span className="text-xs uppercase font-bold tracking-widest text-brand-muted mb-2">Prize Pool Created</span>
          <span className="font-display font-black text-5xl uppercase tracking-tighter text-brand-accent mb-6 truncate">
            £{(totalPrizePoolCents / 100).toFixed(2)}
          </span>
          <Link href="/admin/draws" className="text-sm font-bold uppercase tracking-widest text-brand-primary group-hover:text-brand-accent transition-colors border-t-2 border-brand-text pt-4 flex items-center justify-between">
            Draw Engine <span>→</span>
          </Link>
        </div>

        {/* Charity */}
        <div className="p-6 flex flex-col justify-between bg-brand-text text-brand-bg hover:bg-black transition-colors group">
          <span className="text-xs uppercase font-bold tracking-widest text-brand-bg/60 mb-2">Charity Pledges</span>
          <div>
            <span className="font-display font-black text-6xl uppercase tracking-tighter text-brand-bg">
              {totalCharityContributions}
            </span>
            <span className="text-xl font-bold text-brand-muted ml-2">active</span>
          </div>
          <Link href="/admin/charities" className="text-sm font-bold uppercase tracking-widest text-brand-bg hover:text-brand-accent transition-colors border-t-2 border-brand-bg/20 pt-4 mt-6 flex items-center justify-between">
            Manage Charities <span>→</span>
          </Link>
        </div>

        {/* Draws */}
        <div className="p-6 flex flex-col justify-between bg-white hover:bg-brand-bg transition-colors group">
          <span className="text-xs uppercase font-bold tracking-widest text-brand-muted mb-2">Official Draws</span>
          <span className="font-display font-black text-6xl uppercase tracking-tighter text-brand-text mb-6">
            {publishedDraws?.length || 0}
          </span>
          <p className="text-sm font-bold text-brand-muted border-t-2 border-brand-text pt-4">Historically published draws</p>
        </div>

        {/* Winners */}
        <div className="p-6 flex flex-col justify-between bg-brand-bg hover:bg-brand-primary hover:text-white transition-colors group">
          <span className="text-xs uppercase font-bold tracking-widest text-brand-muted group-hover:text-white/80 mb-2">Total Winners</span>
          <span className="font-display font-black text-6xl uppercase tracking-tighter text-brand-accent group-hover:text-white mb-6">
            {winners?.length || 0}
          </span>
          <Link href="/admin/winners" className="text-sm font-bold uppercase tracking-widest text-brand-primary group-hover:text-white transition-colors border-t-2 border-brand-text group-hover:border-white/20 pt-4 flex items-center justify-between">
            Review Payouts <span>→</span>
          </Link>
        </div>

      </div>

      {/* RECENT REPORTS/ANALYTICS */}
      <section className="flex flex-col border-t-2 border-brand-text pt-6">
        <div className="mb-6">
          <h2 className="font-display font-black text-3xl uppercase tracking-tighter">Latest Draw Audit</h2>
        </div>
        <div className="border-2 border-brand-text bg-white">
          {publishedDraws && publishedDraws.length > 0 ? (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 gap-4">
              <div>
                <p className="font-display font-black text-3xl uppercase tracking-tighter">{publishedDraws[0].draw_period}</p>
                <p className="font-bold text-brand-muted uppercase tracking-widest text-sm mt-1">Executed: {formatFullDate(publishedDraws[0].execution_timestamp || publishedDraws[0].created_at)}</p>
              </div>
              <div className="sm:text-right">
                <p className="font-display font-black text-2xl uppercase tracking-tighter text-brand-primary">£{(publishedDraws[0].total_pool_cents / 100).toFixed(2)}</p>
                <p className="font-bold text-brand-muted uppercase tracking-widest text-sm mt-1">Mode: {publishedDraws[0].draw_mode}</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-brand-bg">
              <span className="font-bold uppercase tracking-widest text-brand-muted">No draws executed yet.</span>
            </div>
          )}

          <div className="p-4 border-t-2 border-brand-text bg-brand-bg">
            <Link href="/admin/draws" className="text-sm font-bold uppercase tracking-widest text-brand-primary hover:text-brand-accent transition-colors flex items-center gap-2">
              View all draws and run simulations →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
