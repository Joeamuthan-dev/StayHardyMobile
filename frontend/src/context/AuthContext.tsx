import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

  const updateUserMetadata = (metadata: Record<string, unknown>) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...metadata } as AuthUser;
    });
  };

  const refreshUserProfile = useCallback(async (): Promise<boolean> => {
    let targetId = user?.id;
    const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (session?.user?.id) {
      targetId = session.user.id;
    }

    if (!targetId) return false;

    const { data: dbData, error } = await supabase
      .from('users')
      .select('name, role, avatar_url, is_pro, pro_purchase_date, payment_id, payment_amount')
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
        .select('name, role, avatar_url, is_pro, pro_purchase_date, payment_id, payment_amount')
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

  const logout = async () => {
    try {
      console.log('Logging out...');
      // 1. Supabase signout
      if (isNative) {
        await RevenueCatService.logOut().catch(() => {});
        await supabase.auth.signOut({ scope: 'local' });
      } else {
        await supabase.auth.signOut({ scope: 'global' });
      }

      const clearRoleCache = async () => {
        try {
          const userId = localStorage.getItem('cached_user_id') || '';

          // Clear localStorage keys
          localStorage.removeItem('cached_is_pro');
          localStorage.removeItem('cached_user_id');
          if (userId) {
            localStorage.removeItem('cached_profile_fast_' + userId);
            localStorage.removeItem('ps_score_' + userId);
            localStorage.removeItem('ps_score_ts_' + userId);
          }

          // Clear Preferences keys
          if (userId) {
            await storage.remove('cached_user_profile_' + userId);
            await storage.remove('cached_user_role_' + userId);
          }
        } catch (err) {
          console.warn('[Auth] Cache clear failed:', err);
        }
      };

      void clearRoleCache();

      // 2. Clear Preferences
      await storage.remove('user_session');
      await storage.remove('pending_verification_email');
      await storage.remove('save_login_enabled').catch(() => {});
      await storage.remove('saved_email').catch(() => {});
      await storage.remove('saved_pin').catch(() => {});

      try {
        const { Preferences } =
          await import('@capacitor/preferences');
        // Clear all app preferences
        await Preferences.clear();
      } catch (e) {
        console.warn('[Auth] Preferences clear failed:', e);
      }

      // 3. Reset user state
      await flushPendingListCacheWrites();
      await clearAllCache();
      loginJustHappened.current = false;
      persistUser(null);

      // 4. Navigate to login
      // This may already be handled by the caller
      // but add as safety:
      window.location.hash = '/login';

    } catch (err: any) {
      console.error('[Auth] Logout error:', err?.message);
      // Force redirect regardless
      window.location.hash = '/login';
    }
  };

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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        setCurrentUser,
        markLoginComplete,
        updateUserMetadata,
        refreshUserProfile,
        initAuth,
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
