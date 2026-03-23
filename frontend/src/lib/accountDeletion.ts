import { Preferences } from '@capacitor/preferences';
import { supabase } from '../supabase';
import { clearAllCache } from './cacheManager';

const GOODBYE_TOAST_KEY = 'stayhardy_account_deleted_toast';

export function setAccountDeletedToastFlag(): void {
  try {
    sessionStorage.setItem(GOODBYE_TOAST_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function consumeAccountDeletedToastFlag(): boolean {
  try {
    if (sessionStorage.getItem(GOODBYE_TOAST_KEY) !== '1') return false;
    sessionStorage.removeItem(GOODBYE_TOAST_KEY);
    return true;
  } catch {
    return false;
  }
}

export async function invokeDeleteUserAccount(opts: {
  targetUserId?: string;
  reason?: string;
}): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id ?? '';

  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
    'delete-user',
    {
      body: {
        target_user_id: opts.targetUserId,
        user_id: opts.targetUserId ?? uid,
        reason: opts.reason ?? (opts.targetUserId ? 'admin_delete' : 'user_requested'),
      },
    },
  );

  if (error) throw new Error(error.message || 'delete-user failed');
  const errMsg =
    data && typeof data === 'object' && 'error' in data ? (data as { error?: string }).error : undefined;
  if (errMsg) throw new Error(errMsg);
}

/**
 * Wipe local caches and device storage after server-side account removal.
 * Call after successful delete-user Edge Function + before signOut.
 */
export async function wipeLocalDataAfterAccountDeletion(userId: string): Promise<void> {
  await clearAllCache();

  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith('reminders_')) sessionStorage.removeItem(k);
    }
    sessionStorage.removeItem('stayhardy_sess_started');
  } catch {
    /* ignore */
  }

  const prefix = `stayhardy_`;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(prefix) || k === 'user' || k === 'remembered_email' || k === 'remembered_pin')) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }

  try {
    localStorage.removeItem(`routine_order_${userId}`);
  } catch {
    /* ignore */
  }

  try {
    await Preferences.clear();
  } catch {
    /* ignore */
  }
}
