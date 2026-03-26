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
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

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
  initBiometric: () => Promise<boolean>;
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
    if (next) {
      localStorage.setItem('user', JSON.stringify(next));
    } else {
      localStorage.removeItem('user');
    }
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
      const updated = { ...prev, ...metadata } as AuthUser;
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
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
      localStorage.setItem('user', JSON.stringify(merged));
      void saveUserProfileCache(merged);
      return merged;
    });
    return isPro;
  }, [user?.id]);

  const initBiometric = useCallback(async () => {
    try {
      console.log('=== INIT BIOMETRICS CHALLENGE ===');
      if (loginJustHappened.current || !isNative) return true;

      let isSecureLoginEnabled = false;
      try {
        const { value } = await SecureStoragePlugin.get({ key: 'secure_login_enabled' }).catch(() => ({ value: null }));
        isSecureLoginEnabled = value === 'true';
        if (!isSecureLoginEnabled) {
          const prefValue = await storage.get('save_login_enabled').catch(() => null);
          isSecureLoginEnabled = prefValue === 'true';
        }
      } catch (e) {
        console.warn('Biometric toggle check failed (Graceful fallback):', e);
        isSecureLoginEnabled = false;
      }

      if (!isSecureLoginEnabled) return true;

      let savedEmail = '';
      let savedPin = '';
      try {
        const [e, p] = await Promise.all([
          SecureStoragePlugin.get({ key: 'saved_email' }).then(r => r.value).catch(() => null),
          SecureStoragePlugin.get({ key: 'saved_pin' }).then(r => r.value).catch(() => null)
        ]);
        savedEmail = e || '';
        savedPin = p || '';

        if (!savedEmail || !savedPin) {
          const [pe, pp] = await Promise.all([
            storage.get('saved_email').catch(() => null),
            storage.get('saved_pin').catch(() => null)
          ]);
          savedEmail = savedEmail || pe || '';
          savedPin = savedPin || pp || '';
        }
      } catch (e) {
        console.warn('SecureStorage retrieval failed (Graceful fallback):', e);
      }

      if (savedEmail && savedPin) {
        const result = await NativeBiometric.isAvailable();
        if (result.isAvailable) {
          try {
            await NativeBiometric.verifyIdentity({
              reason: 'Unlock Stay Hardy',
              title: 'Authentication Required',
              subtitle: 'Use Biometrics to Enter Vault',
              description: 'Verify your identity to continue to your dashboard.',
            });
            
            const { data: userData, error: dbError } = await supabase
              .from('users')
              .select('*')
              .ilike('email', savedEmail)
              .eq('pin', savedPin)
              .single();

            if (!dbError && userData) {
              // Critical Fix: Use PIN + Suffix to satisfy Supabase 6-character rule and match system standard
              const { error: authError } = await supabase.auth.signInWithPassword({
                email: savedEmail.toLowerCase(),
                password: savedPin + '_secure_pin'
              });
              if (!authError) {
                const merged: AuthUser = {
                  id: userData.id,
                  name: userData.name || '',
                  email: savedEmail.toLowerCase(),
                  isPro: userData.is_pro === true,
                  role: userData.role || 'user',
                  avatarUrl: userData.avatar_url || '',
                  proPurchaseDate: userData.pro_purchase_date ?? null,
                  paymentId: userData.payment_id ?? null,
                  paymentAmount: userData.payment_amount ?? null,
                };
                persistUser(merged);
                return true;
              }
            }
          } catch (e) {
            console.warn('Biometric verify failed:', e);
            return false;
          }
        }
      }
      return true;
    } catch (err) {
      console.error('Biometric init error:', err);
      return true;
    }
  }, [persistUser]);

  const initAuth = useCallback(async () => {
    try {
      console.log('=== INIT SUPABASE SESSION ===');
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      
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
    console.log('Logging out...');
    await storage.remove('save_login_enabled').catch(() => {});
    await storage.remove('saved_email').catch(() => {});
    await storage.remove('saved_pin').catch(() => {});

    if (isNative) {
      await RevenueCatService.logOut().catch(() => {});
      await supabase.auth.signOut({ scope: 'local' });
    } else {
      await supabase.auth.signOut({ scope: 'global' });
    }
    await flushPendingListCacheWrites();
    await clearAllCache();
    loginJustHappened.current = false;
    persistUser(null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
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
        initBiometric
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
