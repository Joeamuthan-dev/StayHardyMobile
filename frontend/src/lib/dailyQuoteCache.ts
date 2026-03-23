import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from './cacheKeys';
import { getStaleCache, saveToCache } from './cacheManager';

export type DailyQuoteBody = {
  quote_text: string;
  quote_author: string;
  quote_date: string;
};

function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns today's quote from cache if quote_date matches today; otherwise calls factory, persists, and returns.
 */
export async function getOrCreateDailyQuote(factory: () => { text: string; author?: string }): Promise<string> {
  const today = todayLocalDate();
  const stale = await getStaleCache<DailyQuoteBody>(CACHE_KEYS.daily_quote);
  if (stale && stale.quote_date === today && stale.quote_text) {
    return stale.quote_author ? `${stale.quote_text} — ${stale.quote_author}` : stale.quote_text;
  }
  const f = factory();
  const body: DailyQuoteBody = {
    quote_text: f.text,
    quote_author: f.author ?? '',
    quote_date: today,
  };
  await saveToCache(CACHE_KEYS.daily_quote, body, CACHE_EXPIRY_MINUTES.daily_quote);
  return body.quote_author ? `${body.quote_text} — ${body.quote_author}` : body.quote_text;
}
