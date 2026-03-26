/**
 * Local cache for "Support the app" automatic bottom-sheet triggers.
 * Key: shown_count, last_shown_date, first_open, never after payment.
 */

export const SUPPORT_POPUP_STORAGE_KEY = 'stayhardy_support_popup_v1';

export type SupportPopupCache = {
  firstOpenAt: string;
  lastShownAt: string | null;
  shownCount: number;
  neverShowAgain: boolean;
  /** Successful tip payment — never show automatic support promo */
  tipsPaid?: boolean;
};

function readCache(): SupportPopupCache | null {
  try {
    const raw = localStorage.getItem(SUPPORT_POPUP_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as SupportPopupCache;
    if (!p.firstOpenAt || typeof p.shownCount !== 'number') return null;
    return p;
  } catch {
    return null;
  }
}

function writeCache(p: SupportPopupCache) {
  localStorage.setItem(SUPPORT_POPUP_STORAGE_KEY, JSON.stringify(p));
}

/** Call once on app load (e.g. home). */
export function ensureFirstOpenDate(): void {
  const cur = readCache();
  if (cur?.firstOpenAt) return;
  writeCache({
    firstOpenAt: new Date().toISOString(),
    lastShownAt: null,
    shownCount: 0,
    neverShowAgain: false,
    tipsPaid: false,
  });
}

export function getSupportPopupCache(): SupportPopupCache | null {
  return readCache();
}

function calendarDaysBetween(a: Date, b: Date): number {
  const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const end = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((end - start) / 86400000);
}

export function markSupportPopupShown(): void {
  const cur =
    readCache() ??
    ({
      firstOpenAt: new Date().toISOString(),
      lastShownAt: null,
      shownCount: 0,
      neverShowAgain: false,
    } satisfies SupportPopupCache);
  writeCache({
    ...cur,
    lastShownAt: new Date().toISOString(),
    shownCount: cur.shownCount + 1,
  });
}

/** After successful support payment — never show promo again. */
export function markSupportPaymentCompleted(): void {
  const cur = readCache();
  if (!cur) {
    writeCache({
      firstOpenAt: new Date().toISOString(),
      lastShownAt: null,
      shownCount: 0,
      neverShowAgain: true,
      tipsPaid: true,
    });
    return;
  }
  writeCache({ ...cur, neverShowAgain: true, tipsPaid: true });
}

export type SupportTriggerContext = {
  tasksCompletedToday: number;
  routineStreak: number;
  goalCount: number;
};

/**
 * Automatic sheet: OR triggers, 14-day cooldown, no first 3 calendar days, never if paid.
 */
export function shouldShowAutomaticSupportPopup(ctx: SupportTriggerContext): boolean {
  const c = readCache();
  if (!c || c.neverShowAgain || c.tipsPaid) return false;

  const now = new Date();
  const first = new Date(c.firstOpenAt);
  const daysSinceFirst = calendarDaysBetween(first, now);
  if (daysSinceFirst < 3) return false;

  if (c.lastShownAt) {
    const last = new Date(c.lastShownAt);
    if (calendarDaysBetween(last, now) < 14) return false;
  }

  const tasksOk = ctx.tasksCompletedToday >= 3;
  const streakOk = ctx.routineStreak >= 7;
  const usageOk = daysSinceFirst >= 7;
  const goalsOk = ctx.goalCount >= 5;

  return tasksOk || streakOk || usageOk || goalsOk;
}

/** `updatedAt` same local calendar day as today. */
export function isCompletedTaskToday(updatedAt: string | undefined): boolean {
  if (!updatedAt) return false;
  const d = new Date(updatedAt);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}
