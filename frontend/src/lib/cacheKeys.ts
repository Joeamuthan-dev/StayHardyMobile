/** Central keys for CacheManager — do not scatter string literals. */
export const CACHE_KEYS = {
  user_profile: 'user_profile',
  tasks_list: 'tasks_list',
  goals_list: 'goals_list',
  routines_list: 'routines_list',
  /** Routine completion logs (wide window for chart); same user_id validation as other lists */
  routine_logs_list: 'routine_logs_list',
  user_stats: 'user_stats',
  /** Cached get_productivity_score payload for home (user-scoped body in cacheManager). */
  home_stats: 'home_stats',
  daily_quote: 'daily_quote',
  app_settings: 'app_settings',
  sync_queue: 'sync_queue',
  last_sync_tasks: 'last_sync_tasks',
  last_sync_goals: 'last_sync_goals',
  last_sync_routines: 'last_sync_routines',
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

/** Default TTL in minutes per domain (app_settings: persist until changed — use null in saveToCache). */
export const CACHE_EXPIRY_MINUTES = {
  user_profile: 1440,
  tasks_list: 30,
  goals_list: 30,
  routines_list: 30,
  user_stats: 60,
  home_stats: 30,
  daily_quote: 1440,
} as const;

export const CURRENT_CACHE_VERSION = 'v1';
