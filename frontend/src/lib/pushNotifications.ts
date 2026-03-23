import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type ActionPerformed } from '@capacitor/push-notifications';

const LOG_PREFIX = '[StayHardy Push]';

export function pushLog(step: string, detail?: unknown) {
  if (detail !== undefined) {
    console.log(LOG_PREFIX, step, detail);
  } else {
    console.log(LOG_PREFIX, step);
  }
}

type ListenerHandle = Awaited<ReturnType<typeof PushNotifications.addListener>>;

/** Only registration listeners — do not use removeAllListeners (would drop tap/navigation listeners). */
let registrationHandle: ListenerHandle | null = null;
let registrationErrorHandle: ListenerHandle | null = null;

export async function ensurePushRegistrationListeners(
  onRegistration: (token: Token) => void,
  onRegistrationError: (err: unknown) => void
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await registrationHandle?.remove();
  await registrationErrorHandle?.remove();
  registrationHandle = null;
  registrationErrorHandle = null;

  registrationHandle = await PushNotifications.addListener('registration', (token) => {
    onRegistration(token);
  });

  registrationErrorHandle = await PushNotifications.addListener('registrationError', (err) => {
    onRegistrationError(err);
  });
}

export function isPushSupportedNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** True if OS has permanently denied notifications (user must open Settings). */
export async function isPushPermissionDenied(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const perm = await PushNotifications.checkPermissions();
  pushLog('isPushPermissionDenied: checkPermissions', perm);
  return perm.receive === 'denied';
}

export type EnablePushResult =
  | { ok: true; token: string }
  | {
      ok: false;
      reason:
        | 'not_native'
        | 'denied'
        | 'not_granted'
        | 'registration_failed'
        | 'timeout'
        | 'empty_token';
      message?: string;
    };

/**
 * Full native flow: check/request permission, register listeners, call register(), wait for FCM/APNs token.
 * Logs each step for debugging. iOS requires AppDelegate to forward device token to Capacitor.
 */
export async function enablePushNotificationsAndGetToken(
  tokenTimeoutMs = 25000
): Promise<EnablePushResult> {
  pushLog('1. enablePushNotificationsAndGetToken: start');

  if (!Capacitor.isNativePlatform()) {
    pushLog('2. abort: not a native platform');
    return { ok: false, reason: 'not_native' };
  }

  let perm = await PushNotifications.checkPermissions();
  pushLog('2. checkPermissions()', perm);

  if (perm.receive === 'denied') {
    pushLog('3. abort: permission already denied (open Settings to enable)');
    return { ok: false, reason: 'denied' };
  }

  if (perm.receive === 'prompt') {
    pushLog('3. requestPermissions() starting (must run from user tap)');
    perm = await PushNotifications.requestPermissions();
    pushLog('4. requestPermissions() result', perm);
  }

  if (perm.receive !== 'granted') {
    pushLog('5. abort: permission not granted', perm.receive);
    return { ok: false, reason: 'not_granted', message: String(perm.receive) };
  }

  pushLog('5. permission granted — registering listeners, then native register()');

  const waitForToken = (): Promise<string> =>
    new Promise((resolve, reject) => {
      void (async () => {
        try {
          await ensurePushRegistrationListeners(
            (token) => {
              const v = token?.value?.trim();
              pushLog('7. registration event received', v ? `${v.slice(0, 28)}… (len=${v.length})` : '(empty)');
              if (!v) {
                reject(new Error('EMPTY_TOKEN'));
                return;
              }
              resolve(v);
            },
            (err) => {
              const msg =
                err && typeof err === 'object' && 'error' in err
                  ? String((err as { error: string }).error)
                  : String(err);
              pushLog('7. registrationError', msg);
              reject(new Error(msg));
            }
          );

          pushLog('6. PushNotifications.register() — FCM getToken / APNs registration starts');
          await PushNotifications.register();
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      })();
    });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      pushLog('7. token wait TIMEOUT after', `${tokenTimeoutMs}ms`);
      reject(new Error('__TOKEN_TIMEOUT__'));
    }, tokenTimeoutMs);
  });

  try {
    const token = await Promise.race([waitForToken(), timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    pushLog('8. token resolved — ready to persist');
    return { ok: true, token };
  } catch (e) {
    if (timeoutId) clearTimeout(timeoutId);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === '__TOKEN_TIMEOUT__') {
      return { ok: false, reason: 'timeout' };
    }
    if (msg === 'EMPTY_TOKEN') {
      return { ok: false, reason: 'empty_token' };
    }
    return { ok: false, reason: 'registration_failed', message: msg };
  }
}

export function addPushActionListener(
  cb: (detail: ActionPerformed) => void
): Promise<ListenerHandle | void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  return PushNotifications.addListener('pushNotificationActionPerformed', cb);
}
