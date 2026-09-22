import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  // Fetch all users with basic info
  // Since we don't have a direct relation from auth.users, we use the `profiles` table
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          User Management
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          View all registered users and manage their accounts.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profiles?.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-900">{p.full_name || 'N/A'}</td>
                <td className="py-3 px-4 text-slate-600">{p.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                    {p.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    href={`/admin/users/${p.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium text-xs px-3 py-1.5 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                  >
                    Manage User
                  </Link>
                </td>
              </tr>
            ))}
            {(!profiles || profiles.length === 0) && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500 italic">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
