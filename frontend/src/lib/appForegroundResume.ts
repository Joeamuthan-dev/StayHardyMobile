import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ThankYouManager } from './thankYouManager';
import { ProSuccessManager } from './proSuccessManager';
import { scheduleRoutineReminder } from './notifications';
import { logger } from './logger';

/**
 * Runs when the app returns to foreground (single appStateChange handler).
 * No session validation or navigation — safe for screen lock / background.
 */
export async function runAppForegroundResumeTasks(): Promise<void> {
  ThankYouManager.restoreFromStorage();
  ProSuccessManager.restoreFromStorage();

  try {
    const enabled = await Preferences.get({ key: 'routine_reminder_enabled' });
    const time = await Preferences.get({ key: 'routine_reminder_time' });
    if (enabled.value !== 'true' || !time.value) return;
    const { notifications: pending } = await LocalNotifications.getPending();
    const hasReminder = pending.some((n) => n.id === 1001);
    if (!hasReminder) {
      logger.log('[AppForeground] reminder missing, rescheduling');
      await scheduleRoutineReminder(time.value);
    }
  } catch (e) {
    logger.error('[AppForeground] resume tasks error', e as { message?: unknown; code?: unknown });
  }
}
