import { Preferences } from '@capacitor/preferences';
import { CACHE_KEYS, CURRENT_CACHE_VERSION, type CacheKey } from './cacheKeys';

const TS_SUFFIX = '_timestamp';

type CacheEnvelope<T> = {
  cache_version: string;
  /** Minutes until stale; null = never expire by time */
  expiryMinutes: number | null;
  body: T;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw) as unknown;
}

function isEnvelope(parsed: unknown): parsed is CacheEnvelope<unknown> {
  if (!isPlainObject(parsed)) return false;
  if (typeof parsed.cache_version !== 'string' || !('body' in parsed)) return false;
  if (
    'expiryMinutes' in parsed &&
    parsed.expiryMinutes != null &&
    typeof parsed.expiryMinutes !== 'number'
  ) {
    return false;
  }
  return true;
}

/** Wrap payload for disk; always includes cache_version. */
function wrap<T>(body: T, expiryMinutes: number | null): string {
  const envelope: CacheEnvelope<T> = {
    cache_version: CURRENT_CACHE_VERSION,
    expiryMinutes,
    body,
  };
  return JSON.stringify(envelope);
}

/**
 * Save JSON to native preferences with a companion timestamp key.
 * @param expiryMinutes null = entry does not expire by age (app_settings).
 */
export async function saveToCache<T>(key: string, data: T, expiryMinutes: number | null): Promise<void> {
  await Preferences.set({ key, value: wrap(data, expiryMinutes) });
  await Preferences.set({ key: `${key}${TS_SUFFIX}`, value: String(Date.now()) });
}

export async function getFromCache<T>(key: string): Promise<T | null> {
  const { value } = await Preferences.get({ key });
  if (!value) return null;
  let parsed: unknown;
  try {
    parsed = parseJson(value);
  } catch {
    await clearCache(key);
    return null;
  }
  if (!isEnvelope(parsed) || parsed.cache_version !== CURRENT_CACHE_VERSION) {
    await clearCache(key);
    return null;
  }
  const tsRaw = await Preferences.get({ key: `${key}${TS_SUFFIX}` });
  const savedAt = tsRaw.value ? Number(tsRaw.value) : 0;
  const ageMin = savedAt ? (Date.now() - savedAt) / 60_000 : Infinity;
  const exp = parsed.expiryMinutes ?? null;
  if (exp != null && exp > 0 && ageMin > exp) return null;
  return parsed.body as T;
}

/**
 * Same validation as getFromCache but returns data even when TTL elapsed (Part 5: instant UI).
 * Still returns null if missing, corrupt, or wrong cache_version.
 */
export async function getStaleCache<T>(key: string): Promise<T | null> {
  const { value } = await Preferences.get({ key });
  if (!value) return null;
  let parsed: unknown;
  try {
    parsed = parseJson(value);
  } catch {
    await clearCache(key);
    return null;
  }
  if (!isEnvelope(parsed) || parsed.cache_version !== CURRENT_CACHE_VERSION) {
    await clearCache(key);
    return null;
  }
  return parsed.body as T;
}

export async function clearCache(key: string): Promise<void> {
  await Preferences.remove({ key });
  await Preferences.remove({ key: `${key}${TS_SUFFIX}` });
}

/** Logout: wipe user data caches; keep app_settings (theme, language, onboarding, etc.). */
export async function clearAllCache(): Promise<void> {
  const keysToRemove: string[] = [
    CACHE_KEYS.user_profile,
    CACHE_KEYS.tasks_list,
    CACHE_KEYS.goals_list,
    CACHE_KEYS.routines_list,
    CACHE_KEYS.routine_logs_list,
    CACHE_KEYS.user_stats,
    CACHE_KEYS.home_stats,
    CACHE_KEYS.daily_quote,
    CACHE_KEYS.sync_queue,
    CACHE_KEYS.last_sync_tasks,
    CACHE_KEYS.last_sync_goals,
    CACHE_KEYS.last_sync_routines,
  ];
  for (const k of keysToRemove) {
    await clearCache(k);
  }
}

export async function isCacheExpired(key: string, expiryMinutes: number): Promise<boolean> {
  if (expiryMinutes <= 0) return false;
  const age = await getCacheAge(key);
  if (age === null) return true;
  return age > expiryMinutes;
}

/** Minutes since save, or null if no timestamp. */
export async function getCacheAge(key: string): Promise<number | null> {
  const tsRaw = await Preferences.get({ key: `${key}${TS_SUFFIX}` });
  if (!tsRaw.value) return null;
  const savedAt = Number(tsRaw.value);
  if (!Number.isFinite(savedAt)) return null;
  return (Date.now() - savedAt) / 60_000;
}

export async function setLastSync(which: 'tasks' | 'goals' | 'routines'): Promise<void> {
  const map = {
    tasks: CACHE_KEYS.last_sync_tasks,
    goals: CACHE_KEYS.last_sync_goals,
    routines: CACHE_KEYS.last_sync_routines,
  } as const;
  await Preferences.set({ key: map[which], value: new Date().toISOString() });
}

export async function getLastSyncIso(which: 'tasks' | 'goals' | 'routines'): Promise<string | null> {
  const map = {
    tasks: CACHE_KEYS.last_sync_tasks,
    goals: CACHE_KEYS.last_sync_goals,
    routines: CACHE_KEYS.last_sync_routines,
  } as const;
  const { value } = await Preferences.get({ key: map[which] });
  return value ?? null;
}

/** Typed helpers (optional) */
export async function saveAppSettings<T extends Record<string, unknown>>(data: T): Promise<void> {
  return saveToCache(CACHE_KEYS.app_settings as string, data, null);
}

export async function getAppSettings<T>(): Promise<T | null> {
  return getStaleCache<T>(CACHE_KEYS.app_settings);
}

export async function mergeAppSettings(partial: Record<string, unknown>): Promise<void> {
  const prev = (await getStaleCache<Record<string, unknown>>(CACHE_KEYS.app_settings)) ?? {};
  await saveAppSettings({ ...prev, ...partial });
}

export async function invalidateUserStatsCache(): Promise<void> {
  await clearCache(CACHE_KEYS.user_stats);
  await clearCache(CACHE_KEYS.home_stats);
}

/** Single entry point: re-exports for "never use Preferences directly in UI" rule */
export const CacheManager = {
  saveToCache,
  getFromCache,
  getStaleCache,
  clearCache,
  clearAllCache,
  isCacheExpired,
  getCacheAge,
  setLastSync,
  getLastSyncIso,
  saveAppSettings,
  getAppSettings,
  mergeAppSettings,
  invalidateUserStatsCache,
};

export type { CacheKey };
