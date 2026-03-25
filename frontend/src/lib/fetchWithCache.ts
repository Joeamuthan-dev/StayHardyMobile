import { CacheManager } from './smartCacheManager';

export const fetchWithCache = async <T>(
  cacheKey: string,
  expiryMinutes: number,
  fetchFn: () => Promise<T>,
  options?: {
    onCacheHit?: (data: T) => void;
    onFreshData?: (data: T) => void;
    forceRefresh?: boolean;
  },
): Promise<T | null> => {
  if (!options?.forceRefresh) {
    const cached = await CacheManager.get<T>(cacheKey);
    if (cached !== null) {
      console.log(`Cache HIT: ${cacheKey}`);
      options?.onCacheHit?.(cached);
      void fetchFn()
        .then(async (freshData) => {
          if (freshData !== null && freshData !== undefined) {
            await CacheManager.set(cacheKey, freshData, expiryMinutes);
            options?.onFreshData?.(freshData);
          }
        })
        .catch((e) => {
          console.warn('Background refresh failed:', e);
        });
      return cached;
    }
  }

  console.log(`Cache MISS: ${cacheKey}`);
  try {
    const data = await fetchFn();
    if (data !== null && data !== undefined) {
      await CacheManager.set(cacheKey, data, expiryMinutes);
    }
    return data;
  } catch (e) {
    console.error('Fetch failed:', e);
    return null;
  }
};

