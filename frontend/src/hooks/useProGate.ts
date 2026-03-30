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

// Column name for user_id differs per table
const USER_ID_COLUMN: Record<GatedResource, string> = {
  tasks:  'userId',   // tasks table uses camelCase
  goals:  'userId',   // goals table uses camelCase
  habits: 'user_id',  // routines table uses snake_case
};

// Completed status values per resource — exclude these from the active count
const COMPLETED_STATUSES: Partial<Record<GatedResource, string[]>> = {
  tasks: ['completed'],
  goals: ['completed', 'done', 'achieved'],
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
   * - Basic: counts active (non-completed) rows,
   *   calls onAllowed if under limit, opens gate modal if at/over limit.
   */
  const checkAndGate = useCallback(
    async (resource: GatedResource, onAllowed: () => void) => {
      if (isProUser) {
        onAllowed();
        return;
      }

      let query = supabase
        .from(SUPABASE_TABLE[resource])
        .select('id', { count: 'exact', head: true })
        .eq(USER_ID_COLUMN[resource], user?.id ?? '');

      // Exclude completed items so finishing a task/goal frees up a slot
      const completedStatuses = COMPLETED_STATUSES[resource];
      if (completedStatuses) {
        query = query.not('status', 'in', `(${completedStatuses.join(',')})`);
      }

      const { count } = await query;

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
