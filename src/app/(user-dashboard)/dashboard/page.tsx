import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getCurrentSubscription } from '@/lib/services/subscriptions';
import { getUserScores } from '@/lib/services/scores';
import { getActiveCharities, getUserCharitySelection } from '@/lib/services/charities';
import { getUserWinnings } from '@/lib/services/winners';
import { getPublishedDraws } from '@/lib/services/draws';
import { MotionContainer, MotionItem } from '@/components/layout/MotionWrappers';
import { SubscriptionManager } from '@/components/subscriptions/SubscriptionManager';
import { ScoreForm } from '@/components/scores/ScoreForm';
import { ScoreList } from '@/components/scores/ScoreList';
import { CharityList } from '@/components/charities/CharityList';
import { UserWinningsList } from '@/components/winnings/UserWinningsList';
import { formatFullDate } from '@/lib/utils/date';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all necessary user data in parallel
  const [
    { data: profile },
    { data: subscription },
    { data: scores },
    { data: charities },
    { data: currentSelection },
    { data: winnings },
    { data: publishedDraws },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getCurrentSubscription(supabase, user.id),
    getUserScores(supabase, user.id),
    getActiveCharities(supabase),
    getUserCharitySelection(supabase, user.id),
    getUserWinnings(supabase, user.id),
    getPublishedDraws(supabase),
  ]);

  // Determine states
  const isSubActive = subscription?.status === 'active';
  const scoreCount = scores?.length || 0;
  const isDrawEligible = isSubActive && scoreCount >= 5;
  
  // Calculate summary metrics
  const totalPrizeCents = winnings?.reduce((sum, w) => sum + w.prize_amount_cents, 0) || 0;
  const latestScore = scoreCount > 0 ? scores![0].score_value : null;
  const selectedCharity = currentSelection?.charity?.name || 'None Selected';
  const charityPercent = currentSelection?.contribution_percentage || 10;
  
  // Find upcoming draw (currently we assume the next pending draw, or if none, we just show "Next Monthly Draw")
  const { data: pendingDraws } = await supabase
    .from('draws')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);
    
  const upcomingDraw = pendingDraws?.[0];

  return (
    <div className="flex flex-col max-w-7xl w-full mx-auto p-4 md:p-8 pt-12">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-8 mb-12 border-b-4 border-brand-text">
        <h1 className="font-display font-black text-5xl md:text-7xl uppercase tracking-tighter text-brand-text">
          DASHBOARD
        </h1>
        <p className="text-xl font-medium text-brand-muted border-l-4 border-brand-text pl-4">
          Welcome back, {profile?.full_name || 'Golfer'}. Here&apos;s your Digital Heroes performance overview.
        </p>
      </div>

      {/* 1. DASHBOARD SUMMARY KPI AREA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-2 border-brand-text bg-white mb-16 divide-y-2 lg:divide-y-0 sm:divide-x-2 divide-brand-text">
        {/* Subscription Status */}
        <div className={`p-6 flex flex-col justify-between ${isSubActive ? 'bg-white' : 'bg-brand-accent text-white'}`}>
          <span className={`text-xs uppercase font-bold tracking-widest ${isSubActive ? 'text-brand-muted' : 'text-white/80'} mb-2`}>Subscription</span>
          <span className="font-display font-black text-4xl uppercase tracking-tighter">
            {isSubActive ? 'Active' : 'Inactive'}
          </span>
          <span className={`text-sm font-bold mt-4 pt-4 border-t-2 ${isSubActive ? 'border-brand-bg text-brand-text' : 'border-white/20 text-white'}`}>
            {isSubActive ? 'Auto-renews monthly' : 'Action required'}
          </span>
        </div>

        {/* Latest Score */}
        <div className="p-6 flex flex-col justify-between bg-brand-bg">
          <span className="text-xs uppercase font-bold tracking-widest text-brand-muted mb-2">Latest Score</span>
          <span className="font-display font-black text-4xl uppercase tracking-tighter text-brand-text">
            {latestScore !== null ? latestScore : '--'}
          </span>
          <span className="text-sm font-bold mt-4 pt-4 border-t-2 border-brand-text text-brand-text">
            {scoreCount} / 5 required scores
          </span>
        </div>

        {/* Charity */}
        <div className="p-6 flex flex-col justify-between bg-white">
          <span className="text-xs uppercase font-bold tracking-widest text-brand-muted mb-2">Supporting</span>
          <span className="font-display font-black text-2xl uppercase tracking-tight text-brand-text line-clamp-2">
            {selectedCharity}
          </span>
          <span className="text-sm font-bold mt-4 pt-4 border-t-2 border-brand-bg text-brand-text">
            {charityPercent}% Contribution
          </span>
        </div>

        {/* Draw Status */}
        <div className={`p-6 flex flex-col justify-between ${isDrawEligible ? 'bg-brand-primary text-white' : 'bg-brand-bg'}`}>
          <span className={`text-xs uppercase font-bold tracking-widest ${isDrawEligible ? 'text-white/80' : 'text-brand-muted'} mb-2`}>Draw Status</span>
          <span className="font-display font-black text-3xl uppercase tracking-tighter">
            {isDrawEligible ? 'Eligible' : 'Ineligible'}
          </span>
          <span className={`text-sm font-bold mt-4 pt-4 border-t-2 ${isDrawEligible ? 'border-white/20 text-white' : 'border-brand-text text-brand-text'}`}>
            {isDrawEligible ? 'Ready for next draw' : 'Need more scores/sub'}
          </span>
        </div>

        {/* Winnings */}
        <div className="p-6 flex flex-col justify-between bg-brand-text text-brand-bg">
          <span className="text-xs uppercase font-bold tracking-widest text-brand-bg/60 mb-2">Total Won</span>
          <span className="font-display font-black text-4xl uppercase tracking-tighter text-brand-bg">
            £{(totalPrizeCents / 100).toFixed(2)}
          </span>
          <span className="text-sm font-bold mt-4 pt-4 border-t-2 border-brand-bg/20 text-brand-bg">
            {winnings?.length || 0} Prizes
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* LEFT COLUMN: Configuration */}
        <div className="lg:col-span-5 flex flex-col gap-12">

          {/* SUBSCRIPTION SECTION */}
          <section className="flex flex-col border-t-2 border-brand-text pt-6">
            <div className="mb-6">
              <h2 className="font-display font-black text-3xl uppercase tracking-tighter">1. Subscription</h2>
              <p className="font-medium text-brand-muted">Manage your Digital Heroes plan.</p>
            </div>
            <div>
              <SubscriptionManager subscription={subscription} isActive={isSubActive} />
            </div>
          </section>

          {/* CHARITY SECTION */}
          <section className="flex flex-col border-t-2 border-brand-text pt-6">
            <div className="mb-6">
              <h2 className="font-display font-black text-3xl uppercase tracking-tighter">2. Charity Selection</h2>
              <p className="font-medium text-brand-muted">Choose who benefits from your play.</p>
            </div>
            <div>
              <CharityList charities={charities ?? []} currentSelection={currentSelection} />
            </div>
          </section>
          
        </div>

        {/* RIGHT COLUMN: Scores & Draw Participation */}
        <div className="lg:col-span-7 flex flex-col gap-12">

          {/* GOLF SCORE SECTION */}
          <section className="flex flex-col border-t-2 border-brand-text pt-6">
            <div className="mb-6">
              <h2 className="font-display font-black text-3xl uppercase tracking-tighter">3. Golf Scores</h2>
              <p className="font-medium text-brand-muted">Maintain 5 valid scores to enter the draw.</p>
            </div>
            <div className="flex flex-col gap-12">
              <ScoreForm />
              <div className="border-2 border-brand-text p-6 bg-white">
                <h3 className="font-display font-black text-xl uppercase tracking-tighter mb-6 border-b-2 border-brand-text pb-4">Your Recent Scores</h3>
                <ScoreList scores={scores ?? []} />
              </div>
            </div>
          </section>

          {/* DRAW PARTICIPATION */}
          <section className="flex flex-col border-t-2 border-brand-text pt-6">
            <div className="mb-6">
              <h2 className="font-display font-black text-3xl uppercase tracking-tighter">4. Draw Participation</h2>
              <p className="font-medium text-brand-muted">Your eligibility and upcoming draws.</p>
            </div>
            <div className="flex flex-col gap-6">
              
              <div className={`p-6 border-2 border-brand-text ${isDrawEligible ? 'bg-brand-primary text-white' : 'bg-brand-bg text-brand-text'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 flex items-center justify-center font-display font-black text-2xl border-2 ${isDrawEligible ? 'border-white/20 bg-white/10' : 'border-brand-text bg-white'}`}>
                    {isDrawEligible ? '🎯' : '🔒'}
                  </div>
                  <div>
                    <h4 className="font-display font-black text-2xl uppercase tracking-tighter">
                      {isDrawEligible ? 'Eligible for next draw' : 'Not currently eligible'}
                    </h4>
                    <p className={`font-bold mt-1 ${isDrawEligible ? 'text-white/80' : 'text-brand-muted'}`}>
                      {isSubActive 
                        ? (scoreCount >= 5 ? 'All requirements met.' : `Need ${5 - scoreCount} more scores.`) 
                        : 'Active subscription required.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-2 border-brand-text bg-white">
                <h4 className="font-bold uppercase tracking-widest text-brand-muted mb-4">Next Official Draw</h4>
                {upcomingDraw ? (
                  <div className="flex items-end justify-between border-b-2 border-brand-text pb-4">
                    <div>
                      <p className="font-display font-black text-3xl uppercase tracking-tighter">{upcomingDraw.draw_period}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-accent uppercase tracking-widest">Est. Pool</p>
                      <p className="font-display font-black text-3xl text-brand-text">£{(upcomingDraw.total_pool_cents / 100).toFixed(2)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="font-bold text-brand-text">Check back soon for the next monthly draw.</p>
                )}
              </div>

            </div>
          </section>

          {/* WINNINGS SECTION */}
          <section className="flex flex-col border-t-2 border-brand-text pt-6">
            <div className="mb-6">
              <h2 className="font-display font-black text-3xl uppercase tracking-tighter">5. Winnings</h2>
              <p className="font-medium text-brand-muted">Prizes won from matching your numbers.</p>
            </div>
            <div>
              <UserWinningsList winnings={winnings ?? []} draws={publishedDraws ?? []} />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
