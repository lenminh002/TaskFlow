import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function test() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  console.log("URL:", url);
  // Just to see if we can query tasks
  const res = await fetch(`${url}/rest/v1/tasks?select=id,status,name&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log(await res.json());
}
test();
