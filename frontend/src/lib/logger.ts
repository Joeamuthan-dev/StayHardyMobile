/** Minimal logger for native resume / notification paths (no dependency on console-only stripping). */
export const logger = {
  log: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.log(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
