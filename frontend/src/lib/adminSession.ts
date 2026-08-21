// src/lib/adminSession.ts
//
// Session hardening for the admin-only website.
//
// **What this is and is not.** The real security boundary is server-side:
// Supabase RLS decides what any token may read or write, `isAdminHubUser`
// gates the route, and the `admin-tips` edge function re-checks admin rights
// on its own. Everything here runs in the browser, so a determined attacker
// with devtools can clear it.
//
// It is still worth having. It stops the two things that actually happen to a
// live admin panel: someone walking past an unlocked laptop, and someone
// sitting there guessing a 4-digit PIN. Supabase applies its own auth rate
// limiting on top, which is the part that cannot be cleared from devtools.

const ATTEMPTS_KEY = 'sh_admin_login_attempts';
const LOCK_UNTIL_KEY = 'sh_admin_lock_until';
const LAST_SEEN_KEY = 'sh_admin_last_seen';

/** Wrong passwords allowed before the form locks. */
export const MAX_ATTEMPTS = 3;

/** How long the form stays locked once [MAX_ATTEMPTS] is hit. */
export const LOCKOUT_MS = 5 * 60 * 1000;

/** Idle time after which an admin session is discarded. */
export const IDLE_TIMEOUT_MS = 20 * 60 * 1000;

/** Show a warning this long before the idle timeout fires. */
export const IDLE_WARNING_MS = 60 * 1000;

const readInt = (key: string): number => {
  try {
    return Number(window.localStorage.getItem(key)) || 0;
  } catch {
    // Private mode, or storage disabled. Treat as "nothing recorded" rather
    // than throwing — a broken lockout must never block a legitimate login.
    return 0;
  }
};

const write = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

const remove = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export interface LockState {
  locked: boolean;
  /** Milliseconds until the lock lifts. Zero when not locked. */
  msRemaining: number;
  /** Attempts left before locking. Zero while locked. */
  attemptsRemaining: number;
}

export function getLockState(now = Date.now()): LockState {
  const lockUntil = readInt(LOCK_UNTIL_KEY);

  if (lockUntil > now) {
    return { locked: true, msRemaining: lockUntil - now, attemptsRemaining: 0 };
  }

  // An expired lock clears itself along with the attempt count, so the next
  // window starts clean rather than locking again on the first mistake.
  if (lockUntil !== 0) {
    remove(LOCK_UNTIL_KEY);
    remove(ATTEMPTS_KEY);
    return { locked: false, msRemaining: 0, attemptsRemaining: MAX_ATTEMPTS };
  }

  const used = readInt(ATTEMPTS_KEY);
  return {
    locked: false,
    msRemaining: 0,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - used),
  };
}

/** Records a wrong password and locks the form once the limit is reached. */
export function recordFailedAttempt(now = Date.now()): LockState {
  const used = readInt(ATTEMPTS_KEY) + 1;
  write(ATTEMPTS_KEY, String(used));

  if (used >= MAX_ATTEMPTS) {
    write(LOCK_UNTIL_KEY, String(now + LOCKOUT_MS));
    return { locked: true, msRemaining: LOCKOUT_MS, attemptsRemaining: 0 };
  }

  return {
    locked: false,
    msRemaining: 0,
    attemptsRemaining: MAX_ATTEMPTS - used,
  };
}

/** Called after a successful sign-in. */
export function clearFailedAttempts() {
  remove(ATTEMPTS_KEY);
  remove(LOCK_UNTIL_KEY);
}

/** Human-readable countdown, e.g. "4:38". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ idle --- */

export function markActivity(now = Date.now()) {
  write(LAST_SEEN_KEY, String(now));
}

/**
 * Milliseconds of idle time remaining, or 0 if the session has expired.
 *
 * Stored rather than held in memory so that closing the tab and returning an
 * hour later still expires — an in-memory timer would restart at zero and
 * silently extend the session.
 */
export function idleRemaining(now = Date.now()): number {
  const last = readInt(LAST_SEEN_KEY);
  if (!last) {
    // First call of a session: start the clock now.
    markActivity(now);
    return IDLE_TIMEOUT_MS;
  }
  return Math.max(0, last + IDLE_TIMEOUT_MS - now);
}

export function clearActivity() {
  remove(LAST_SEEN_KEY);
}
