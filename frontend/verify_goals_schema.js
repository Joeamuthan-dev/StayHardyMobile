import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data, error } = await supabase.from('goals').select('*').limit(3);
  console.log('--- GOALS TABLE SCHEMA & SAMPLE ---');
  if (error) console.error('Error:', error);
  else console.log(JSON.stringify(data, null, 2));
}
inspect();
