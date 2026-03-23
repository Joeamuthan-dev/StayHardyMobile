import { Network } from '@capacitor/network';
import { supabase } from '../supabase';
import { CACHE_KEYS } from './cacheKeys';
import { getStaleCache, saveToCache } from './cacheManager';

export type SyncEntity = 'task' | 'goal' | 'routine' | 'routine_log';

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: SyncEntity;
  data: Record<string, unknown>;
  timestamp: number;
  retry_count: number;
}

type QueueBody = { items: SyncQueueItem[] };

export const SYNC_BANNER_EVENT = 'stayhardy_sync_banner';

/** Fired when at least one queued mutation synced successfully — refresh lists from network */
export const AFTER_SYNC_FLUSH_EVENT = 'stayhardy_after_sync_flush';

function dispatchBanner(message: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_BANNER_EVENT, { detail: { message } }));
  }
}

async function loadQueue(): Promise<SyncQueueItem[]> {
  const body = await getStaleCache<QueueBody>(CACHE_KEYS.sync_queue);
  return body?.items ?? [];
}

async function saveQueue(items: SyncQueueItem[]): Promise<void> {
  await saveToCache(CACHE_KEYS.sync_queue, { items } satisfies QueueBody, null);
}

export async function enqueueSync(
  partial: Omit<SyncQueueItem, 'id' | 'retry_count'> & { id?: string },
): Promise<void> {
  const item: SyncQueueItem = {
    id: partial.id ?? crypto.randomUUID(),
    action: partial.action,
    entity: partial.entity,
    data: partial.data,
    timestamp: partial.timestamp ?? Date.now(),
    retry_count: 0,
  };
  const prev = await loadQueue();
  await saveQueue([...prev, item]);
}

export async function clearSyncQueue(): Promise<void> {
  await saveQueue([]);
}

async function processOne(item: SyncQueueItem, userId: string): Promise<boolean> {
  const { action, entity, data } = item;
  try {
    if (entity === 'task') {
      if (action === 'update') {
        const id = data.id as string;
        const patch = (data.patch as Record<string, unknown>) ?? {};
        const { error } = await supabase.from('tasks').update(patch).eq('id', id).eq('userId', userId);
        return !error;
      }
      if (action === 'delete') {
        const id = data.id as string;
        const { error } = await supabase.from('tasks').delete().eq('id', id).eq('userId', userId);
        return !error;
      }
      if (action === 'create') {
        const row = { ...(data.row as Record<string, unknown>) };
        delete row.id;
        row.userId = userId;
        const { error } = await supabase.from('tasks').insert([row]);
        return !error;
      }
    }

    if (entity === 'goal') {
      if (action === 'update') {
        const id = data.id as string;
        const patch = (data.patch as Record<string, unknown>) ?? {};
        const { error } = await supabase.from('goals').update(patch).eq('id', id).eq('userId', userId);
        return !error;
      }
      if (action === 'delete') {
        const id = data.id as string;
        const { error } = await supabase.from('goals').delete().eq('id', id).eq('userId', userId);
        return !error;
      }
      if (action === 'create') {
        const row = { ...(data.row as Record<string, unknown>) };
        delete row.id;
        row.userId = userId;
        const { error } = await supabase.from('goals').insert([row]);
        return !error;
      }
    }

    if (entity === 'routine') {
      if (action === 'delete') {
        const id = data.id as string;
        const { error } = await supabase.from('routines').delete().eq('id', id).eq('user_id', userId);
        return !error;
      }
      if (action === 'create') {
        const row = { ...(data.row as Record<string, unknown>) };
        row.user_id = userId;
        const { error } = await supabase.from('routines').insert([row]);
        return !error;
      }
      if (action === 'update') {
        const id = data.id as string;
        const patch = (data.patch as Record<string, unknown>) ?? {};
        const { error } = await supabase.from('routines').update(patch).eq('id', id).eq('user_id', userId);
        return !error;
      }
    }

    if (entity === 'routine_log') {
      if (action === 'create') {
        const { error } = await supabase.from('routine_logs').insert([
          {
            routine_id: data.routine_id as string,
            user_id: userId,
            completed_at: data.completed_at as string,
          },
        ]);
        return !error;
      }
      if (action === 'delete') {
        const { error } = await supabase
          .from('routine_logs')
          .delete()
          .eq('routine_id', data.routine_id as string)
          .eq('user_id', userId)
          .eq('completed_at', data.completed_at as string);
        return !error;
      }
    }
  } catch (e) {
    console.warn('sync queue item failed', e);
    return false;
  }
  return false;
}

/** Run queued mutations when online; drops successful items, retries others up to 3 times. */
export async function processSyncQueue(): Promise<void> {
  const net = await Network.getStatus();
  if (!net.connected) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return;

  const items = await loadQueue();
  if (items.length === 0) return;

  const remaining: SyncQueueItem[] = [];
  let hardFailures = 0;
  let successCount = 0;

  for (const item of items) {
    const ok = await processOne(item, userId);
    if (ok) {
      successCount += 1;
      continue;
    }
    const nextRetry = item.retry_count + 1;
    if (nextRetry > 3) hardFailures += 1;
    else remaining.push({ ...item, retry_count: nextRetry });
  }

  await saveQueue(remaining);
  if (hardFailures > 0) {
    dispatchBanner('Some changes could not be synced');
  }
  if (successCount > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AFTER_SYNC_FLUSH_EVENT));
  }
}

let networkListenerRegistered = false;

export function registerSyncNetworkListener(): void {
  if (networkListenerRegistered || typeof window === 'undefined') return;
  networkListenerRegistered = true;
  void Network.addListener('networkStatusChange', (status) => {
    if (status.connected) void processSyncQueue();
  });
}
