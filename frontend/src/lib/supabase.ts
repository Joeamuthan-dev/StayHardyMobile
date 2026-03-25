import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Add them to frontend/.env and run npm run build again.'
  );
}

/** Native WebView: persist auth session in Capacitor Preferences (localStorage alone is unreliable). */
const capacitorAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string): Promise<void> => {
    await Preferences.remove({ key });
  },
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      ...(Capacitor.isNativePlatform() ? { storage: capacitorAuthStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
