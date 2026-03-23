import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

/** Opens HTTPS URLs in the system browser (native) or a new tab (web). No-op for empty or "#" placeholders. */
export async function openExternalUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#') return;
  try {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: trimmed });
    } else {
      window.open(trimmed, '_blank', 'noopener,noreferrer');
    }
  } catch {
    window.open(trimmed, '_blank', 'noopener,noreferrer');
  }
}
