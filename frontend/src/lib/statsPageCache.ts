import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from './cacheKeys';
import { saveToCache, getStaleCache } from './cacheManager';

/** Serialized Stats page payload for instant paint + 1h TTL */
export type StatsPageSnapshot = {
  user_id: string;
  last_updated: string;
  scoreData: unknown;
  tasks: unknown[];
  routines: unknown[];
  routineLogs: unknown[];
  goals: unknown[];
  dbCategories: string[];
};

export async function persistStatsPageCache(
  userId: string,
  snap: Omit<StatsPageSnapshot, 'user_id' | 'last_updated'>,
): Promise<void> {
  const full: StatsPageSnapshot = {
    ...snap,
    user_id: userId,
    last_updated: new Date().toISOString(),
  };
  await saveToCache(CACHE_KEYS.user_stats, full, CACHE_EXPIRY_MINUTES.user_stats);
}

export async function loadStatsPageStale(userId: string): Promise<StatsPageSnapshot | null> {
  const b = await getStaleCache<StatsPageSnapshot>(CACHE_KEYS.user_stats);
  if (!b || b.user_id !== userId) return null;
  return b;
}
