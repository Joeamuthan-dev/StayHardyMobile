import { storage } from '../utils/storage';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiryMs: number;
  version: string;
}

const CACHE_VERSION = 'v1';
const DAILY_RESET_KEY = 'last_cache_reset';

export const CACHE_KEYS = {
  APP_SETTINGS: 'app_settings',
  ANNOUNCEMENTS_LIST: 'announcements_list',
  USER_PROFILE: 'user_profile',
  TASKS_LIST: 'tasks_list',
  GOALS_LIST: 'goals_list',
  ROUTINES_LIST: 'routines_list',
  TODAY_ROUTINES: 'today_routines',
  USER_STATS: 'user_stats',
  HOME_STATS: 'home_stats',
  HOME_TASKS: 'home_tasks',
  GOALS_DUE_SOON: 'goals_due_soon',
  HISTORY_TASKS: 'history_tasks',
  HISTORY_GOALS: 'history_goals',
  DAILY_QUOTE: 'daily_quote',
  PRODUCTIVITY_SCORE: 'productivity_score',
  ROUTINE_LOGS_LIST: 'routine_logs_list',
  SYNC_QUEUE: 'sync_queue',
} as const;

export const CACHE_EXPIRY = {
  APP_SETTINGS: 30,
  ANNOUNCEMENTS_LIST: 30,
  USER_PROFILE: 1440,
  TASKS_LIST: 30,
  GOALS_LIST: 60,
  ROUTINES_LIST: 30,
  TODAY_ROUTINES: 720,
  USER_STATS: 60,
  HOME_STATS: 30,
  HOME_TASKS: 15,
  GOALS_DUE_SOON: 60,
  HISTORY_TASKS: 120,
  HISTORY_GOALS: 120,
  DAILY_QUOTE: 1440,
  PRODUCTIVITY_SCORE: 30,
} as const;

export const CacheManager = {
  set: async <T>(key: string, data: T, expiryMinutes: number): Promise<void> => {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiryMs: expiryMinutes * 60 * 1000,
        version: CACHE_VERSION,
      };
      await storage.set(key, JSON.stringify(item));
    } catch (e) {
      console.warn('Cache set failed:', e);
    }
  },
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const value = await storage.get(key);
      if (!value) return null;
      const item = JSON.parse(value) as CacheItem<T>;
      if (item.version !== CACHE_VERSION) {
        await storage.remove(key);
        return null;
      }
      if (Date.now() - item.timestamp > item.expiryMs) {
        await storage.remove(key);
        return null;
      }
      return item.data;
    } catch {
      return null;
    }
  },
  isValid: async (key: string): Promise<boolean> => {
    const data = await CacheManager.get(key);
    return data !== null;
  },
  invalidate: async (key: string): Promise<void> => {
    try {
      await storage.remove(key);
    } catch {
      // no-op
    }
  },
  invalidateMany: async (keys: string[]): Promise<void> => {
    for (const key of keys) {
      try {
        await storage.remove(key);
      } catch {
        // no-op
      }
    }
  },
  clearAll: async (): Promise<void> => {
    await CacheManager.invalidateMany(Object.values(CACHE_KEYS));
  },
  checkDailyReset: async (): Promise<void> => {
    try {
      const lastReset = await storage.get(DAILY_RESET_KEY);
      const today = new Date().toDateString();
      if (lastReset !== today) {
        console.log('Daily cache reset ✅');
        await CacheManager.clearAll();
        await storage.set(DAILY_RESET_KEY, today);
      }
    } catch (e) {
      console.warn('Daily cache reset failed:', e);
    }
  },
};

