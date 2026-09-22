import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getCurrentSubscription } from '@/lib/services/subscriptions';
import { getUserScores } from '@/lib/services/scores';
import { getUserCharitySelection, getActiveCharities } from '@/lib/services/charities';

import { SubscriptionManager } from '@/components/subscriptions/SubscriptionManager';
import { ScoreForm } from '@/components/scores/ScoreForm';
import { ScoreList } from '@/components/scores/ScoreList';
import { CharityList } from '@/components/charities/CharityList';
import { formatFullDate } from '@/lib/utils/date';

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  const targetUserId = params.id;

  // Fetch target user's details using Admin client to bypass RLS restrictions
  const [
    { data: targetProfile },
    { data: subscription },
    { data: scores },
    { data: charities },
    { data: currentSelection }
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', targetUserId).single(),
    getCurrentSubscription(admin, targetUserId),
    getUserScores(admin, targetUserId),
    getActiveCharities(admin),
    getUserCharitySelection(admin, targetUserId),
  ]);

  if (!targetProfile) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>User not found.</p>
        <Link href="/admin/users" className="text-blue-600 hover:underline mt-4 inline-block">← Back to Users</Link>
      </div>
    );
  }

  const isSubActive = subscription?.status === 'active';
  const selectedCharity = currentSelection?.charity?.name || 'None Selected';
  const charityPercent = currentSelection?.contribution_percentage || 10;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/users" className="text-slate-500 hover:text-slate-800 font-medium text-sm">
          ← Back to Users
        </Link>
      </div>
      
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Manage User: {targetProfile.full_name}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {targetProfile.email} • Role: <span className="uppercase font-semibold">{targetProfile.role}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Subscription & Charity */}
        <div className="space-y-8">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">Subscription Status</h2>
            </div>
            <div className="p-6">
              <SubscriptionManager subscription={subscription} isActive={isSubActive} targetUserId={targetUserId} />
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">Charity Selection (Read-Only)</h2>
            </div>
            <div className="p-6">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-semibold text-purple-900">Supporting: {selectedCharity}</p>
                <p className="text-xs text-purple-700 mt-1">Contribution: {charityPercent}%</p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Scores */}
        <div className="space-y-8">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">Golf Scores</h2>
            </div>
            <div className="p-6 space-y-6">
              <ScoreForm targetUserId={targetUserId} />
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">User&apos;s Recorded Scores</h3>
                <ScoreList scores={scores ?? []} targetUserId={targetUserId} />
              </div>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
