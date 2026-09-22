import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import { createClient } from '@supabase/supabase-js';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: winners, error } = await supabase
    .from('winners')
    .select(`
      id, 
      status, 
      verification_status, 
      payment_status, 
      user:profiles(email)
    `);
  
  if (error) console.error(error);
  else console.log(JSON.stringify(winners, null, 2));
}

check();
