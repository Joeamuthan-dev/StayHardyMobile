// src/hooks/useProGate.ts
import { useState, useCallback } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

export const PRO_LIMITS = {
  tasks:  5,
  goals:  3,
  habits: 3,
} as const;

export type GatedResource = keyof typeof PRO_LIMITS;

const SUPABASE_TABLE: Record<GatedResource, string> = {
  tasks:  'tasks',
  goals:  'goals',
  habits: 'routines',
};

export function useProGate() {
  const { isPro } = useSubscription();
  const { user } = useAuth();
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
  const isProUser = isPro || isAdmin;

  const [gateOpen, setGateOpen] = useState(false);
  const [gateResource, setGateResource] = useState<GatedResource>('tasks');

  /**
   * Call before any creation action.
   * - Pro/admin: calls onAllowed immediately (no DB query).
   * - Basic: counts existing rows with a HEAD request (no data transfer),
   *   calls onAllowed if under limit, opens gate modal if at/over limit.
   */
  const checkAndGate = useCallback(
    async (resource: GatedResource, onAllowed: () => void) => {
      if (isProUser) {
        onAllowed();
        return;
      }

      const { count } = await supabase
        .from(SUPABASE_TABLE[resource])
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user?.id ?? '');

      if ((count ?? 0) < PRO_LIMITS[resource]) {
        onAllowed();
      } else {
        setGateResource(resource);
        setGateOpen(true);
      }
    },
    [isProUser, user?.id],
  );

  const closeGate = useCallback(() => setGateOpen(false), []);

  return { gateOpen, gateResource, closeGate, checkAndGate };
}
