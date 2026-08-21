// src/lib/bridgeToNativeStorage.ts
//
// ONE-TIME BRIDGE FOR THE FLUTTER REBUILD.
//
// A handful of durable user-state keys are written to raw WebView `localStorage`
// rather than through `utils/storage` (which routes to Capacitor Preferences on
// native). WebView localStorage lives in the app's WebView data directory and is
// NOT readable by the native Flutter app that will replace this WebView build.
//
// The most important of these is `routine_order_{userId}` — the drag-to-reorder
// habit ordering. Without this bridge every user's habit order silently resets
// on upgrade.
//
// This module copies those keys into Capacitor Preferences, which persists in the
// `CapacitorStorage` SharedPreferences file (each key stored under a `_cap_`
// prefix) and IS readable from Flutter.
//
// Safety contract — this runs in production on live users:
//   * native-only, no-op on web
//   * runs once, guarded by BRIDGE_MARKER_KEY
//   * never throws; every failure path is swallowed and logged
//   * additive only — nothing is read back, mutated, or deleted
//   * deferred off the boot path so it cannot affect startup
//
// Safe to delete once the Flutter build has fully rolled out.

import { isNative } from '../utils/platform';
import { logger } from './logger';

/** Bumped if the bridge ever needs to re-run with a different key set. */
const BRIDGE_MARKER_KEY = 'v2_bridge_completed_at';

/** Prefix for keys that are per-user and must be discovered by scan. */
const ROUTINE_ORDER_PREFIX = 'routine_order_';

/**
 * Index key listing which Supabase session keys were carried over, so the
 * Flutter app can find them without having to guess the project ref.
 */
const SESSION_INDEX_KEY = 'v2_session_keys';

/**
 * Durable user state worth carrying into the native rebuild.
 *
 * Deliberately excluded: `ps_score_*`, `cached_is_pro`, `cached_profile_fast_*`
 * (all recomputed or re-fetched, and RevenueCat/Supabase are authoritative for
 * Pro), and `last_*_reset_date` (internal bookkeeping with no meaning in the
 * new schema). Remembered PINs are excluded on purpose — copying a plaintext
 * credential into a second store is not something this bridge should do.
 */
const EXACT_KEYS = [
  'theme',
  'language',
  'sidebarHidden',
  'sh_notif_last_seen',
  'cached_user_id',
] as const;

/**
 * Copy WebView-only localStorage state into Capacitor Preferences so the native
 * rebuild can read it. Idempotent, native-only, and never throws.
 */
export async function bridgeToNativeStorage(): Promise<void> {
  if (!isNative) return;

  try {
    // Deliberately NOT using `utils/storage` here. That wrapper silently falls
    // back to localStorage when Preferences throws, which would let us write the
    // "completed" marker to localStorage while bridging nothing to native — and
    // the bridge would then never retry. This must talk to Preferences directly
    // so a Preferences failure propagates to the catch below.
    const { Preferences } = await import('@capacitor/preferences');

    const { value: alreadyRan } = await Preferences.get({ key: BRIDGE_MARKER_KEY });
    if (alreadyRan) return;

    const keys = [...EXACT_KEYS, ...scanLocalKeys(ROUTINE_ORDER_PREFIX)];
    let copied = 0;

    for (const key of keys) {
      const value = safeReadLocal(key);
      if (value !== null) {
        await Preferences.set({ key, value });
        copied++;
      }
    }

    const sessionKeys = await copySupabaseSession(Preferences);

    await Preferences.set({ key: BRIDGE_MARKER_KEY, value: new Date().toISOString() });
    logger.log(`[bridge] copied ${copied} key(s), ${sessionKeys.length} session key(s)`);
  } catch (e) {
    // Never let this affect the running app. The marker is written last, so any
    // failure leaves it unset and the next cold start retries cleanly.
    logger.error('[bridge] failed, will retry next launch:', e);
  }
}

/**
 * Carry the Supabase session across the Capacitor -> Flutter boundary.
 *
 * Sessions currently live in `capacitor-secure-storage-plugin`, which encrypts
 * with its own Android Keystore alias. Flutter's `flutter_secure_storage` uses a
 * different keyset and cannot read it, so without this every existing user is
 * signed out by the upgrade — and their only recovery is a 4-digit PIN set months
 * ago, over an email some of them never confirmed.
 *
 * The session is copied into Capacitor Preferences (app-private SharedPreferences)
 * because that is the one store both runtimes can read. `android:allowBackup` is
 * set to "false" in the same release so these tokens can never be swept into
 * Google's Auto Backup.
 *
 * The Flutter app MUST delete these entries immediately after recovering the
 * session, so the tokens sit in unencrypted storage only until first launch.
 *
 * Returns the list of keys copied.
 */
async function copySupabaseSession(
  Preferences: typeof import('@capacitor/preferences').Preferences,
): Promise<string[]> {
  const copied: string[] = [];
  try {
    const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
    const { value: allKeys } = await SecureStoragePlugin.keys();

    // Default Supabase storage key is `sb-<project-ref>-auth-token`; no custom
    // storageKey is configured, so match the family rather than hardcoding a ref.
    for (const key of allKeys.filter((k) => k.startsWith('sb-'))) {
      let value: string;
      try {
        ({ value } = await SecureStoragePlugin.get({ key }));
      } catch {
        continue; // key vanished or failed to decrypt; nothing to carry
      }
      if (!looksLikeSession(value)) continue;
      await Preferences.set({ key, value });
      copied.push(key);
    }

    if (copied.length > 0) {
      await Preferences.set({ key: SESSION_INDEX_KEY, value: JSON.stringify(copied) });
    }
  } catch (e) {
    // A missing session is normal (logged-out user) and must not fail the bridge.
    logger.log('[bridge] no session carried over:', e);
  }
  return copied;
}

/** Cheap sanity check so we never carry junk or a half-written value. */
function looksLikeSession(value: string): boolean {
  if (!value) return false;
  try {
    const parsed: unknown = JSON.parse(value);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { refresh_token?: unknown }).refresh_token === 'string'
    );
  } catch {
    return false;
  }
}

function safeReadLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function scanLocalKeys(prefix: string): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
  } catch {
    // localStorage can throw in restricted WebView states; nothing to copy.
  }
  return keys;
}
