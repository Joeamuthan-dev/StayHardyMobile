import type { AuthUser } from '../context/AuthContext';
import { resolveUserRole } from '../config/adminOwner';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from './cacheKeys';
import { saveToCache, getStaleCache } from './cacheManager';

export type CachedUserProfile = {
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar_url: string;
  push_notifications_enabled?: boolean;
  pro_member: boolean;
  theme?: string;
  timezone?: string;
  role?: string;
  pro_purchase_date?: string | null;
  payment_id?: string | null;
  payment_amount?: number | null;
};

type AuthLike = {
  id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  role?: string;
  isPro?: boolean;
  proPurchaseDate?: string | null;
  paymentId?: string | null;
  paymentAmount?: number | null;
};

export async function saveUserProfileCache(
  user: AuthLike,
  extras?: Partial<
    Pick<CachedUserProfile, 'push_notifications_enabled' | 'theme' | 'timezone'>
  >,
): Promise<void> {
  const body: CachedUserProfile = {
    user_id: user.id,
    user_name: user.name ?? '',
    user_email: user.email,
    user_avatar_url: user.avatarUrl ?? '',
    pro_member: Boolean(user.isPro),
    role: user.role,
    pro_purchase_date: user.proPurchaseDate ?? null,
    payment_id: user.paymentId ?? null,
    payment_amount: user.paymentAmount ?? null,
    ...extras,
  };
  await saveToCache(CACHE_KEYS.user_profile, body, CACHE_EXPIRY_MINUTES.user_profile);
}

/** Cached row for this user, or null (wrong user / missing). */
export async function readCachedUserProfile(userId: string): Promise<CachedUserProfile | null> {
  const c = await getStaleCache<CachedUserProfile>(CACHE_KEYS.user_profile);
  if (!c || c.user_id !== userId) return null;
  return c;
}

/** Merge native user_profile cache onto session-derived user for instant Pro UI and labels */
export function applyCachedProfileToAuthUser(base: AuthUser, cached: CachedUserProfile): AuthUser {
  const email = cached.user_email || base.email;
  return {
    ...base,
    name: cached.user_name || base.name,
    email,
    avatarUrl: cached.user_avatar_url || base.avatarUrl,
    role: resolveUserRole(email),
    isPro: Boolean(cached.pro_member),
    proPurchaseDate: cached.pro_purchase_date ?? base.proPurchaseDate ?? null,
    paymentId: cached.payment_id ?? base.paymentId ?? null,
    paymentAmount: cached.payment_amount ?? base.paymentAmount ?? null,
  };
}
