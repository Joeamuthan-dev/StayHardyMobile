import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

/** True when the device reports a network connection (native); web assumes online unless Network says otherwise). */
export async function isOnline(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  }
  try {
    const s = await Network.getStatus();
    return s.connected;
  } catch {
    return true;
  }
}
