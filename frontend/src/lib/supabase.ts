import { createClient } from '@supabase/supabase-js';
import { secureSupabaseStorage } from './secureSupabaseStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Add them to frontend/.env and run npm run build again.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage: secureSupabaseStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // ← CRITICAL for Capacitor
      flowType: 'implicit',      // ← Keep this
    },
  }
);
