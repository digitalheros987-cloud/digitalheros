import { createClient } from '@/lib/supabase/server';
import { getActiveCharities } from '@/lib/services/charities';
import { CharityDirectory } from '@/components/charities/CharityDirectory';
import Link from 'next/link';

export default async function CharitiesPage() {
  const supabase = createClient();
  const { data: charities, error } = await getActiveCharities(supabase);
  
  // We check auth to know if we should show "Dashboard" or "Login"
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="max-w-6xl mx-auto px-4 py-16 w-full flex-1">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            Our Charity Partners
          </h1>
          <p className="text-lg text-slate-600">
            Discover the amazing causes supported by the Digital Heroes community. 
            Play golf, track your scores, and make a real difference.
          </p>
        </div>

        {error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg text-center">
            Failed to load charities. Please try again later.
          </div>
        ) : (
          <CharityDirectory initialCharities={charities || []} />
        )}
      </main>
    </div>
  );
}
