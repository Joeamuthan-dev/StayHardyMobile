import { Capacitor } from '@capacitor/core';
import { NativeBiometric, BiometricAuthError, type AvailableResult } from '@capgo/capacitor-native-biometric';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { App } from '@capacitor/app';
import { supabase } from '../supabase';

const STORAGE_KEY = 'stayhardy_biometric_session_v1';

export interface BiometricSessionPayload {
  email: string;
  userId: string;
  firstName: string;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  biometric_login_enabled: true;
}

export function isBiometricNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Push + biometric UX disabled on Android until shipped; use for Settings / Login UI gates. */
export function hidePushAndBiometricOnAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/** Strong biometry (Face ID / fingerprint) available and enrolled enough for a prompt. */
export async function getBiometricAvailability(): Promise<AvailableResult | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return await NativeBiometric.isAvailable({ useFallback: false });
  } catch {
    return null;
  }
}

export async function shouldShowBiometricToggle(): Promise<boolean> {
  const r = await getBiometricAvailability();
  if (!r) return false;
  // Android often reports face unlock as BIOMETRIC_WEAK only; AuthActivity allows strong|weak after native patch.
  if (Capacitor.getPlatform() === 'android') {
    return r.isAvailable === true;
  }
  return r.isAvailable === true && r.strongBiometryIsAvailable === true;
}

export async function openDeviceSecuritySettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const info = await App.getInfo();
    if (Capacitor.getPlatform() === 'ios') {
      window.location.href = 'app-settings:';
      return;
    }
    window.location.href = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${encodeURIComponent(info.id)};end`;
  } catch {
    window.alert('Open Settings on your device, then Security or Face ID & Passcode, and enroll a fingerprint or Face ID.');
  }
}

export function showBiometricsNotEnrolledAlert(): void {
  const go = window.confirm(
    'Biometrics Not Set Up\n\nPlease set up fingerprint or Face ID in your device Settings first, then come back to enable this.\n\nTap OK to open Settings, or Cancel to stay here.'
  );
  if (go) void openDeviceSecuritySettings();
}

export async function authenticateBiometric(reason: string, title?: string): Promise<boolean> {
  try {
    await NativeBiometric.verifyIdentity({
      reason,
      title: title ?? 'StayHardy',
      negativeButtonText: 'Cancel',
      useFallback: false,
    });
    return true;
  } catch {
    return false;
  }
}

export async function readBiometricPayload(): Promise<BiometricSessionPayload | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { value } = await SecureStoragePlugin.get({ key: STORAGE_KEY });
    if (!value) return null;
    const parsed = JSON.parse(value) as BiometricSessionPayload;
    if (
      !parsed?.email ||
      !parsed?.userId ||
      !parsed?.access_token ||
      !parsed?.refresh_token ||
      parsed.biometric_login_enabled !== true
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearBiometricSecureStorage(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SecureStoragePlugin.remove({ key: STORAGE_KEY });
  } catch {
    /* ignore */
  }
}

/** Persist session tokens for biometric re-login (tokens only — no PIN). */
export async function saveBiometricSessionPayload(payload: BiometricSessionPayload): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await SecureStoragePlugin.set({
    key: STORAGE_KEY,
    value: JSON.stringify(payload),
  });
}

function firstNameFromUser(name: string | undefined): string {
  if (!name?.trim()) return 'there';
  return name.trim().split(/\s+/)[0] ?? 'there';
}

export async function enableBiometricLoginForCurrentUser(user: { id: string; email: string; name?: string }): Promise<
  | { ok: true }
  | { ok: false; reason: 'hardware' | 'not_enrolled' | 'verify_failed' | 'no_session' | 'save_failed' | 'db_failed' }
> {
  if (!Capacitor.isNativePlatform()) return { ok: false, reason: 'hardware' };

  const avail = await NativeBiometric.isAvailable({ useFallback: false });
  const hardwareOk =
    Capacitor.getPlatform() === 'android'
      ? avail.isAvailable
      : avail.isAvailable && avail.strongBiometryIsAvailable;
  if (!hardwareOk) {
    if (avail.errorCode === BiometricAuthError.BIOMETRICS_NOT_ENROLLED) {
      return { ok: false, reason: 'not_enrolled' };
    }
    return { ok: false, reason: 'hardware' };
  }

  const verified = await authenticateBiometric(
    'Confirm your identity to enable biometric login',
    'Enable biometric login'
  );
  if (!verified) return { ok: false, reason: 'verify_failed' };

  const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
  const session = sessionData?.session;
  if (sessErr || !session?.access_token || !session.refresh_token) {
    return { ok: false, reason: 'no_session' };
  }

  const payload: BiometricSessionPayload = {
    email: user.email,
    userId: user.id,
    firstName: firstNameFromUser(user.name),
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    biometric_login_enabled: true,
  };

  try {
    await saveBiometricSessionPayload(payload);
  } catch {
    return { ok: false, reason: 'save_failed' };
  }

  const now = new Date().toISOString();
  const { error: dbErr } = await supabase
    .from('users')
    .update({
      biometric_login_enabled: true,
      biometric_enabled_at: now,
    })
    .eq('id', user.id);

  if (dbErr) {
    await clearBiometricSecureStorage();
    return { ok: false, reason: 'db_failed' };
  }

  return { ok: true };
}

export async function disableBiometricLoginForCurrentUser(userId: string): Promise<
  { ok: true } | { ok: false; reason: 'verify_failed' | 'db_failed' }
> {
  const verified = await authenticateBiometric('Confirm to disable biometric login', 'Disable biometric login');
  if (!verified) return { ok: false, reason: 'verify_failed' };

  await clearBiometricSecureStorage();

  const { error } = await supabase
    .from('users')
    .update({
      biometric_login_enabled: false,
      biometric_enabled_at: null,
    })
    .eq('id', userId);

  if (error) return { ok: false, reason: 'db_failed' };
  return { ok: true };
}

/** PIN change / security reset — no biometric prompt. */
export async function clearBiometricOnPinChange(userId: string): Promise<void> {
  await clearBiometricSecureStorage();
  await supabase
    .from('users')
    .update({
      biometric_login_enabled: false,
      biometric_enabled_at: null,
    })
    .eq('id', userId);
}

export async function loginWithBiometricSession(): Promise<
  | { ok: true }
  | { ok: false; reason: 'no_payload' | 'verify_failed' | 'session_failed' }
> {
  const payload = await readBiometricPayload();
  if (!payload) return { ok: false, reason: 'no_payload' };

  const verified = await authenticateBiometric('Log in to StayHardy', 'StayHardy');
  if (!verified) return { ok: false, reason: 'verify_failed' };

  const { data, error } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });

  if (error || !data.session) {
    await clearBiometricSecureStorage();
    return { ok: false, reason: 'session_failed' };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const s = sessionData?.session;
  if (s?.access_token && s.refresh_token) {
    await saveBiometricSessionPayload({
      ...payload,
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at,
    });
  }

  return { ok: true };
}

export function getWelcomeFirstNameFromPayload(payload: BiometricSessionPayload | null): string {
  if (!payload) return 'there';
  return payload.firstName || 'there';
}
