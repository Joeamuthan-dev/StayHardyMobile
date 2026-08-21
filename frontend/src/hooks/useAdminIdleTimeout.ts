// src/hooks/useAdminIdleTimeout.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
  clearActivity,
  idleRemaining,
  markActivity,
} from '../lib/adminSession';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * Signs an idle admin out after [IDLE_TIMEOUT_MS].
 *
 * Activity is throttled to one write every 15s: this fires on every keystroke
 * and scroll, and a localStorage write per event would be wasteful on a page
 * that already re-renders charts.
 *
 * Returns `msLeft` while inside the warning window so the UI can offer a
 * "stay signed in" prompt rather than dumping the admin out mid-sentence.
 */
export function useAdminIdleTimeout(enabled: boolean, onTimeout: () => void) {
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const lastWrite = useRef(0);
  const firedRef = useRef(false);

  // Held in a ref so the effect below does not re-subscribe every render just
  // because the caller passed a new closure.
  const timeoutRef = useRef(onTimeout);
  timeoutRef.current = onTimeout;

  const extend = useCallback(() => {
    markActivity();
    lastWrite.current = Date.now();
    setMsLeft(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setMsLeft(null);
      return;
    }

    firedRef.current = false;
    markActivity();
    lastWrite.current = Date.now();

    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite.current < 15_000) return;
      lastWrite.current = now;
      markActivity(now);
      setMsLeft((prev) => (prev === null ? prev : null));
    };

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }

    const tick = window.setInterval(() => {
      const left = idleRemaining();

      if (left <= 0) {
        if (firedRef.current) return;
        firedRef.current = true;
        clearActivity();
        timeoutRef.current();
        return;
      }

      setMsLeft(left <= IDLE_WARNING_MS ? left : null);
    }, 1000);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
      window.clearInterval(tick);
    };
  }, [enabled]);

  return { msLeft, extend, totalMs: IDLE_TIMEOUT_MS };
}
