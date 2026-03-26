import type { AuthUser } from '../context/AuthContext';
import { isAdminProfileUser } from '../config/adminOwner';

/** Stats + Routine require lifetime access for normal users. Admins always have access. */
export function canAccessStatsAndRoutine(user: AuthUser | null): boolean {
  if (!user) return false;
  if (isAdminProfileUser(user)) return true;
  return Boolean(user.isPro);
}

export function shouldShowLifetimeUpsell(user: AuthUser | null): boolean {
  if (!user) return false;
  if (isAdminProfileUser(user)) return false;
  return !user.isPro;
}
