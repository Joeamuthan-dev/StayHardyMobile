import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase';
import { clearAllCache, isCacheExpired } from '../lib/cacheManager';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from '../lib/cacheKeys';
import {
  applyCachedProfileToAuthUser,
  readCachedUserProfile,
  saveUserProfileCache,
} from '../lib/userProfileCache';
import { flushPendingListCacheWrites } from '../lib/listCaches';
import { resolveUserRole } from '../config/adminOwner';

export interface AuthUser {
  id: string;
  name?: string;
  email: string;
  role?: string;
  avatarUrl?: string;
  /** Lifetime access (Stats + Routine); admins ignore this */
  isPro?: boolean;
  proPurchaseDate?: string | null;
  paymentId?: string | null;
  paymentAmount?: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateUserMetadata: (metadata: Record<string, unknown>) => void;
  /** Reload is_pro and related fields from public.users. Returns true if the user is Pro after refresh. */
  refreshUserProfile: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function buildUserFromAuthUser(authUser: SupabaseAuthUser): AuthUser {
  const meta = authUser.user_metadata || {};
  const emailFilename = `${authUser.email?.replace(/@/g, '_at_')}.jpg`;
  const { data: { publicUrl: emailBasedUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(emailFilename);

  const baseData: AuthUser = {
    id: authUser.id,
    name: (meta.name as string) || '',
    email: authUser.email || '',
    avatarUrl: (meta.avatar_url as string) || (meta.avatarUrl as string) || (meta.avatar as string) || emailBasedUrl || '',
    role: resolveUserRole(authUser.email),
    isPro: false,
  };

  if (baseData.avatarUrl && !baseData.avatarUrl.includes('?t=')) {
    baseData.avatarUrl = `${baseData.avatarUrl}?t=${Date.now()}`;
  }

  return baseData;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((next: AuthUser | null) => {
    setUser(next);
    if (next) {
      localStorage.setItem('user', JSON.stringify(next));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  const hydrateFromAuthUser = useCallback(
    async (authUser: SupabaseAuthUser) => {
      const baseData = buildUserFromAuthUser(authUser);
      const cached = await readCachedUserProfile(authUser.id);
      const mergedInitial = cached ? applyCachedProfileToAuthUser(baseData, cached) : baseData;
      persistUser(mergedInitial);

      const profileExpired = await isCacheExpired(CACHE_KEYS.user_profile, CACHE_EXPIRY_MINUTES.user_profile);
      if (!profileExpired && cached) return;

      const { data: dbData, error: dbError } = await supabase
        .from('users')
        .select('name, role, avatar_url, is_pro, pro_purchase_date, payment_id, payment_amount')
        .eq('id', authUser.id)
        .single();

      if (dbData && !dbError) {
        setUser((prev) => {
          if (!prev || prev.id !== authUser.id) return prev;
          const dbRole = (dbData as { role?: string | null }).role;
          const merged: AuthUser = {
            ...prev,
            name: (dbData as { name?: string }).name || prev.name,
            role:
              resolveUserRole(prev.email) === 'admin' || dbRole === 'admin' ? 'admin' : 'user',
            avatarUrl: (dbData as { avatar_url?: string }).avatar_url || prev.avatarUrl,
            isPro: Boolean((dbData as { is_pro?: boolean }).is_pro),
            proPurchaseDate: (dbData as { pro_purchase_date?: string | null }).pro_purchase_date ?? null,
            paymentId: (dbData as { payment_id?: string | null }).payment_id ?? null,
            paymentAmount: (dbData as { payment_amount?: number | null }).payment_amount ?? null,
          };
          localStorage.setItem('user', JSON.stringify(merged));
          void saveUserProfileCache(merged);
          return merged;
        });
      }
    },
    [persistUser],
  );

  const updateUserMetadata = (metadata: Record<string, unknown>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...metadata } as AuthUser;
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const refreshUserProfile = useCallback(async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;
    const { data: dbData, error } = await supabase
      .from('users')
      .select(
        'name, role, avatar_url, is_pro, pro_purchase_date, payment_id, payment_amount'
      )
      .eq('id', session.user.id)
      .single();
    if (error || !dbData) return false;
    const isPro = Boolean((dbData as { is_pro?: boolean }).is_pro);
    setUser((prev) => {
      if (!prev || prev.id !== session.user.id) return prev;
      const dbRole = (dbData as { role?: string | null }).role;
      const merged: AuthUser = {
        ...prev,
        name: (dbData as { name?: string }).name || prev.name,
        role:
          resolveUserRole(prev.email) === 'admin' || dbRole === 'admin' ? 'admin' : 'user',
        avatarUrl: (dbData as { avatar_url?: string }).avatar_url || prev.avatarUrl,
        isPro,
        proPurchaseDate: (dbData as { pro_purchase_date?: string | null }).pro_purchase_date ?? null,
        paymentId: (dbData as { payment_id?: string | null }).payment_id ?? null,
        paymentAmount: (dbData as { payment_amount?: number | null }).payment_amount ?? null,
      };
      localStorage.setItem('user', JSON.stringify(merged));
      void saveUserProfileCache(merged);
      return merged;
    });
    return isPro;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initSession = async () => {
      setLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error || !session?.user) {
          persistUser(null);
          return;
        }
        await hydrateFromAuthUser(session.user);
      } catch (e) {
        console.error('Auth init error:', e);
        if (!cancelled) persistUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session?.user) {
          setLoading(true);
          try {
            await hydrateFromAuthUser(session.user);
          } finally {
            setLoading(false);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        persistUser(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hydrateFromAuthUser, persistUser]);

  const logout = async () => {
    // Native: local scope avoids revoking refresh tokens so biometric re-login can restore session from Keychain.
    // Web: global sign-out clears the session completely.
    if (Capacitor.isNativePlatform()) {
      await supabase.auth.signOut({ scope: 'local' });
    } else {
      await supabase.auth.signOut({ scope: 'global' });
    }
    await flushPendingListCacheWrites();
    await clearAllCache();
    persistUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        updateUserMetadata,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
