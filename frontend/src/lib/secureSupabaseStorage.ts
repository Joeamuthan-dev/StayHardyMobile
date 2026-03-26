import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Capacitor } from '@capacitor/core';

/** 
 * Custom storage adapter for Supabase that uses iOS Keychain / Android Keystore.
 * Falls back to localStorage on web.
 */
/** 
 * Bulletproof storage adapter for Supabase that uses iOS Keychain / Android Keystore.
 * Intercepts native exceptions (e.g. "Item not found" on fresh installs) to prevent JS crashes.
 */
export const secureSupabaseStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (!Capacitor.isNativePlatform()) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    try {
      // SecureStoragePlugin throws a breaking Java Exception if key search fails on fresh installs.
      // We intercept here and return null to signify a clean slate (logged out).
      const { value } = await SecureStoragePlugin.get({ key });
      return value;
    } catch (err) {
      console.warn('Supabase Storage Adapter: Local key not found or error. Returning null.', err);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (!Capacitor.isNativePlatform()) {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStoragePlugin.set({ key, value });
    } catch (err) {
      console.error('Supabase Storage Adapter: Failed to setItem.', err);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (!Capacitor.isNativePlatform()) {
        localStorage.removeItem(key);
        return;
      }
      await SecureStoragePlugin.remove({ key });
    } catch (err) {
      console.error('Supabase Storage Adapter: Failed to removeItem.', err);
    }
  },
};
