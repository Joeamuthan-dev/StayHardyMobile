import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { CacheManager, CACHE_EXPIRY, CACHE_KEYS } from '../lib/smartCacheManager';

export interface AppSettings {
  pro_price: number;
  pro_original_price: number;
  updated_at?: string | null;
  updated_by?: string | null;
}

const DEFAULT_SETTINGS: AppSettings = {
  pro_price: 99,
  pro_original_price: 499,
  updated_at: null,
  updated_by: null,
};

export const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFromDB = useCallback(async (): Promise<AppSettings | null> => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value, updated_at, updated_by');

    if (error || !data) return null;

    const settingsMap: Record<string, string> = {};
    let updatedAt: string | null = null;
    let updatedBy: string | null = null;
    for (const item of data) {
      settingsMap[String(item.key)] = String(item.value ?? '');
      if (!updatedAt && item.updated_at) updatedAt = String(item.updated_at);
      if (!updatedBy && item.updated_by) updatedBy = String(item.updated_by);
      if (String(item.key) === 'pro_price') {
        if (item.updated_at) updatedAt = String(item.updated_at);
        if (item.updated_by) updatedBy = String(item.updated_by);
      }
    }

    const parsed: AppSettings = {
      pro_price: Number.parseInt(settingsMap.pro_price || '99', 10),
      pro_original_price: Number.parseInt(settingsMap.pro_original_price || '499', 10),
      updated_at: updatedAt,
      updated_by: updatedBy,
    };

    await CacheManager.set(CACHE_KEYS.APP_SETTINGS, parsed, CACHE_EXPIRY.APP_SETTINGS);
    return parsed;
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const cached = await CacheManager.get<AppSettings>(CACHE_KEYS.APP_SETTINGS);
      if (cached) {
        setSettings(cached);
        setIsLoading(false);
        void fetchFromDB().then((fresh) => {
          if (fresh) setSettings(fresh);
        });
        return;
      }

      const fresh = await fetchFromDB();
      if (fresh) setSettings(fresh);
    } catch (e) {
      console.error('Load settings error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromDB]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return { settings, isLoading, loadSettings };
};

