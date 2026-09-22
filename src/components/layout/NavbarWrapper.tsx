import { createClient } from '@/lib/supabase/server';
import { Navbar } from './Navbar';

export async function NavbarWrapper() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    isAdmin = data?.role === 'admin';
  }

  return <Navbar isLoggedIn={!!user} isAdmin={isAdmin} />;
}
