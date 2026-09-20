import { createClient } from '@/lib/supabase/server';
import { getActiveCharities, getUserCharitySelection } from '@/lib/services/charities';
import { CharityList } from '@/components/charities/CharityList';
import { logout } from '@/actions/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CharitiesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: charities } = await getActiveCharities(supabase);
  const { data: currentSelection } = await getUserCharitySelection(supabase, user.id);

  return (
    <div className="flex flex-col space-y-6 max-w-2xl w-full p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Select Your Charity</h1>
        <div className="flex gap-2">
          <Link href="/profile" className="px-4 py-2 bg-gray-200 text-black rounded hover:bg-gray-300">
            Profile
          </Link>
          <form action={logout}>
            <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Log Out
            </button>
          </form>
        </div>
      </div>

      <p className="text-gray-600">
        Choose a charity to support. A minimum of 10% of your subscription contribution goes to your selected charity.
      </p>

      <div className="bg-white rounded-lg shadow p-6">
        <CharityList
          charities={charities ?? []}
          currentSelection={currentSelection}
        />
      </div>
    </div>
  );
}
