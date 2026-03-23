import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from './cacheKeys';
import { saveToCache, getStaleCache } from './cacheManager';

export type IdBody<T> = { user_id: string; items: T[] };

const DEBOUNCE_MS = 500;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingRunners = new Map<string, () => Promise<void>>();

function scheduleDebounced(key: string, run: () => Promise<void>) {
  pendingRunners.set(key, run);
  const prev = debounceTimers.get(key);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => {
    debounceTimers.delete(key);
    const fn = pendingRunners.get(key);
    pendingRunners.delete(key);
    void fn?.();
  }, DEBOUNCE_MS);
  debounceTimers.set(key, t);
}

/** Flush debounced list writes before logout or cache clear so nothing is lost. */
export async function flushPendingListCacheWrites(): Promise<void> {
  for (const timer of debounceTimers.values()) clearTimeout(timer);
  debounceTimers.clear();
  const runners = [...pendingRunners.values()];
  pendingRunners.clear();
  for (const fn of runners) {
    await fn();
  }
}

export function persistTasksList<T>(userId: string, tasks: T[]): void {
  const key = `${CACHE_KEYS.tasks_list}:${userId}`;
  scheduleDebounced(key, async () => {
    await saveToCache(
      CACHE_KEYS.tasks_list,
      { user_id: userId, items: tasks } satisfies IdBody<T>,
      CACHE_EXPIRY_MINUTES.tasks_list,
    );
  });
}

export async function loadTasksListStale<T>(userId: string): Promise<T[] | null> {
  const b = await getStaleCache<IdBody<T>>(CACHE_KEYS.tasks_list);
  if (!b || b.user_id !== userId) return null;
  return b.items;
}

export function persistGoalsList<T>(userId: string, goals: T[]): void {
  const key = `${CACHE_KEYS.goals_list}:${userId}`;
  scheduleDebounced(key, async () => {
    await saveToCache(
      CACHE_KEYS.goals_list,
      { user_id: userId, items: goals } satisfies IdBody<T>,
      CACHE_EXPIRY_MINUTES.goals_list,
    );
  });
}

export async function loadGoalsListStale<T>(userId: string): Promise<T[] | null> {
  const b = await getStaleCache<IdBody<T>>(CACHE_KEYS.goals_list);
  if (!b || b.user_id !== userId) return null;
  return b.items;
}

/** Raw routine rows as returned by Supabase (no computed completed flags). */
export function persistRoutinesRaw<T>(userId: string, routines: T[]): void {
  const key = `${CACHE_KEYS.routines_list}:${userId}`;
  scheduleDebounced(key, async () => {
    await saveToCache(
      CACHE_KEYS.routines_list,
      { user_id: userId, items: routines } satisfies IdBody<T>,
      CACHE_EXPIRY_MINUTES.routines_list,
    );
  });
}

export async function loadRoutinesRawStale<T>(userId: string): Promise<T[] | null> {
  const b = await getStaleCache<IdBody<T>>(CACHE_KEYS.routines_list);
  if (!b || b.user_id !== userId) return null;
  return b.items;
}

export function persistRoutineLogsList<T>(userId: string, logs: T[]): void {
  const key = `${CACHE_KEYS.routine_logs_list}:${userId}`;
  scheduleDebounced(key, async () => {
    await saveToCache(
      CACHE_KEYS.routine_logs_list,
      { user_id: userId, items: logs } satisfies IdBody<T>,
      CACHE_EXPIRY_MINUTES.routines_list,
    );
  });
}

export async function loadRoutineLogsListStale<T>(userId: string): Promise<T[] | null> {
  const b = await getStaleCache<IdBody<T>>(CACHE_KEYS.routine_logs_list);
  if (!b || b.user_id !== userId) return null;
  return b.items;
}
