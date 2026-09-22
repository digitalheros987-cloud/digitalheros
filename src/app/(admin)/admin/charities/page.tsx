import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminCharityTable } from '@/components/admin/AdminCharityTable';
import { Charity } from '@/lib/services/charities';

export default async function AdminCharitiesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  // Fetch all charities (including inactive ones for admin view)
  const { data: charities } = await supabase
    .from('charities')
    .select('*')
    .order('name', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Charity Management
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage the charities available for users to select.
        </p>
      </div>

      <AdminCharityTable charities={(charities as Charity[]) || []} />
    </div>
  );
}
