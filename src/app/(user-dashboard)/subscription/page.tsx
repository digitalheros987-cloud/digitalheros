import { createClient } from '@/lib/supabase/server';
import { getCurrentSubscription, isSubscriptionActive } from '@/lib/services/subscriptions';
import { SubscriptionManager } from '@/components/subscriptions/SubscriptionManager';
import { logout } from '@/actions/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SubscriptionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: subscription } = await getCurrentSubscription(supabase, user.id);
  const { active } = await isSubscriptionActive(supabase, user.id);

  return (
    <div className="flex flex-col space-y-6 max-w-3xl w-full p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Subscription</h1>
        <div className="flex gap-2">
          <Link href="/dashboard" className="px-4 py-2 bg-gray-200 text-black rounded hover:bg-gray-300">
            Profile
          </Link>
          <form action={logout}>
            <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Log Out
            </button>
          </form>
        </div>
      </div>

      <SubscriptionManager
        subscription={subscription}
        isActive={active}
      />
    </div>
  );
}
