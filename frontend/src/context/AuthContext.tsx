import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { isNative } from '../utils/platform';
import { storage } from '../utils/storage';
import { supabase } from '../supabase';
import { clearAllCache } from '../lib/cacheManager';
import { saveUserProfileCache } from '../lib/userProfileCache';
import { flushPendingListCacheWrites } from '../lib/listCaches';
import { resolveUserRole } from '../config/adminOwner';
import { RevenueCatService } from '../services/revenuecat';

export interface AuthUser {
  id: string;
  name?: string;
  email: string;
  role?: string;
  avatarUrl?: string;
  isPro?: boolean;
  proPurchaseDate?: string | null;
  paymentId?: string | null;
  paymentAmount?: number | null;
  currentStreak?: number;
  bestStreak?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  setCurrentUser: (user: AuthUser | null) => void;
  markLoginComplete: () => void;
  updateUserMetadata: (metadata: Record<string, unknown>) => void;
  refreshUserProfile: () => Promise<boolean>;
  initAuth: () => Promise<void>;
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
    status: 'online',
    role: resolveUserRole(authUser.email),
    isPro: false,
  } as any;

  if (baseData.avatarUrl && !baseData.avatarUrl.includes('?t=')) {
    baseData.avatarUrl = `${baseData.avatarUrl}?t=${Date.now()}`;
  }

  return baseData;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const loginJustHappened = useRef(false);

  const persistUser = useCallback((next: AuthUser | null) => {
    setUser(next);
  }, []);

  const markLoginComplete = useCallback(() => {
    loginJustHappened.current = true;
  }, []);

  const setCurrentUser = useCallback(
    (next: AuthUser | null) => {
      loginJustHappened.current = Boolean(next?.id);
      persistUser(next);
    },
    [persistUser]
  );

  const updateUserMetadata = useCallback((metadata: Record<string, unknown>) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...metadata } as AuthUser;
    });
  }, []);

  const refreshUserProfile = useCallback(async (): Promise<boolean> => {
    let targetId = user?.id;
    const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (session?.user?.id) {
      targetId = session.user.id;
    }

    if (!targetId) return false;

    const { data: dbData, error } = await supabase
      .from('users')
      .select('name, role, avatar_url, is_pro, pro_purchase_date, payment_id, payment_amount, current_streak, best_streak')
      .eq('id', targetId)
      .single();

    if (error || !dbData) return false;
    const isPro = Boolean((dbData as any).is_pro);
    setUser((prev) => {
      if (!prev || prev.id !== targetId) return prev;
      const dbRole = (dbData as any).role;
      const merged: AuthUser = {
        ...prev,
        name: (dbData as any).name || prev.name,
        role: resolveUserRole(prev.email) === 'admin' || dbRole === 'admin' ? 'admin' : 'user',
        avatarUrl: (dbData as any).avatar_url || prev.avatarUrl,
        isPro,
        proPurchaseDate: (dbData as any).pro_purchase_date ?? null,
        paymentId: (dbData as any).payment_id ?? null,
        paymentAmount: (dbData as any).payment_amount ?? null,
        currentStreak: (dbData as any).current_streak ?? 0,
        bestStreak: (dbData as any).best_streak ?? 0,
      };
      void saveUserProfileCache(merged);
      return merged;
    });
    return isPro;
  }, [user?.id]);


  const initAuth = useCallback(async () => {
    try {
      console.log('=== INIT SUPABASE SESSION ===');
      setLoading(true);

      // Fix for boot hang: 5s max wait for session
      const getSessionWithTimeout = async () => {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout')), 5000)
        );
        return Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]) as Promise<{ data: { session: any } }>;
      };

      const { data: { session } } = await getSessionWithTimeout().catch((err) => {
        console.warn('[Auth] Session fetch failed or timed out:', err);
        return { data: { session: null } };
      });
      
      if (!session?.user?.id) {
        persistUser(null);
        return;
      }

      const { data: dbData } = await supabase
        .from('users')
        .select('name, role, avatar_url, is_pro, pro_purchase_date, payment_id, payment_amount, current_streak, best_streak')
        .eq('id', session.user.id)
        .single();

      if (dbData) {
        const baseData = buildUserFromAuthUser(session.user as SupabaseAuthUser);
        const merged: AuthUser = {
          ...baseData,
          name: (dbData as any).name || '',
          email: (session.user.email || '').toLowerCase(),
          isPro: (dbData as any).is_pro === true,
          role: (dbData as any).role || 'user',
          avatarUrl: dbData.avatar_url || baseData.avatarUrl,
          proPurchaseDate: (dbData as any).pro_purchase_date ?? null,
          paymentId: (dbData as any).payment_id ?? null,
          paymentAmount: (dbData as any).payment_amount ?? null,
          currentStreak: (dbData as any).current_streak ?? 0,
          bestStreak: (dbData as any).best_streak ?? 0,
        };
        persistUser(merged);
        void saveUserProfileCache(merged);
      } else {
        persistUser(null);
      }
    } catch (e) {
      console.error('Init Auth failed:', e);
      persistUser(null);
    } finally {
      setLoading(false);
    }
  }, [persistUser]);

  const logout = useCallback(async () => {
    // 1. Instant UI response — clear user state and navigate immediately
    loginJustHappened.current = false;
    persistUser(null);
    window.location.hash = '/login';

    // 2. Clean up everything in the background — user already sees login screen
    const userId = localStorage.getItem('cached_user_id') || '';

    // Sync localStorage clears (instant, no await needed)
    localStorage.removeItem('cached_is_pro');
    localStorage.removeItem('cached_user_id');
    if (userId) {
      localStorage.removeItem('cached_profile_fast_' + userId);
      localStorage.removeItem('ps_score_' + userId);
      localStorage.removeItem('ps_score_ts_' + userId);
    }

    // Fire all async cleanup in parallel — don't block anything
    void Promise.allSettled([
      isNative
        ? RevenueCatService.logOut().catch(() => {})
        : Promise.resolve(),
      isNative
        ? supabase.auth.signOut({ scope: 'local' })
        : supabase.auth.signOut({ scope: 'global' }),
      storage.remove('user_session'),
      storage.remove('pending_verification_email'),
      storage.remove('save_login_enabled'),
      storage.remove('saved_email'),
      storage.remove('saved_pin'),
      userId ? storage.remove('cached_user_profile_' + userId) : Promise.resolve(),
      userId ? storage.remove('cached_user_role_' + userId) : Promise.resolve(),
      import('@capacitor/preferences').then(({ Preferences }) => Preferences.clear()).catch(() => {}),
      flushPendingListCacheWrites(),
      clearAllCache(),
    ]);
  }, [persistUser]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        // Clear all UI cache — user is logged out
        try {
          const userId = localStorage.getItem('cached_user_id') || '';
          localStorage.removeItem('cached_is_pro');
          localStorage.removeItem('cached_user_id');
          if (userId) {
            localStorage.removeItem('cached_profile_fast_' + userId);
            localStorage.removeItem('ps_score_' + userId);
            localStorage.removeItem('ps_score_ts_' + userId);
          }
          await storage.remove('user_session');
          if (userId) {
            await storage.remove('cached_user_profile_' + userId);
            await storage.remove('cached_user_role_' + userId);
          }
        } catch (err) {
          console.warn('[Auth] Cache clear on signout failed:', err);
        }
        loginJustHappened.current = false;
        persistUser(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [persistUser]);

  const contextValue = useMemo(() => ({
    user,
    loading,
    logout,
    setCurrentUser,
    markLoginComplete,
    updateUserMetadata,
    refreshUserProfile,
    initAuth,
  }), [user, loading, logout, setCurrentUser, markLoginComplete, updateUserMetadata, refreshUserProfile, initAuth]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
