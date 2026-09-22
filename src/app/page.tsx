import { createClient } from '@/lib/supabase/server';
import { getFeaturedCharity } from '@/lib/services/charities';
import { HomeContent } from '@/components/home/HomeContent';

export default async function Home() {
  const supabase = createClient();
  const { data: featured } = await getFeaturedCharity(supabase);

  return <HomeContent featured={featured} />;
}
