import { isNative } from './platform';

export const storage = {
  get: async (key: string): Promise<string | null> => {
    if (isNative) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { value } = await Preferences.get({ key });
        return value;
      } catch (e) {
        console.warn('Storage get failed, falling back:', e);
      }
    }
    return localStorage.getItem(key);
  },

  set: async (key: string, value: string): Promise<void> => {
    if (isNative) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({ key, value });
        return;
      } catch (e) {
        console.warn('Storage set failed, falling back:', e);
      }
    }
    localStorage.setItem(key, value);
  },

  remove: async (key: string): Promise<void> => {
    if (isNative) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key });
        return;
      } catch (e) {
        console.warn('Storage remove failed, falling back:', e);
      }
    }
    localStorage.removeItem(key);
  },

  clear: async (): Promise<void> => {
    if (isNative) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.clear();
        return;
      } catch (e) {
        console.warn('Storage clear failed, falling back:', e);
      }
    }
    localStorage.clear();
  }
};