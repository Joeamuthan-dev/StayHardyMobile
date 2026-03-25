import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { supabase } from '../supabase';
import { clearAllCache } from '../lib/cacheManager';
import { saveUserProfileCache } from '../lib/userProfileCache';
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
  setCurrentUser: (user: AuthUser | null) => void;
  markLoginComplete: () => void;
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
      .select(
        'name, role, avatar_url, is_pro, pro_purchase_date, payment_id, payment_amount'
      )
      .eq('id', targetId)
      .single();
      
    if (error || !dbData) return false;
    const isPro = Boolean((dbData as { is_pro?: boolean }).is_pro);
    setUser((prev) => {
      if (!prev || prev.id !== targetId) return prev;
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

    const initAuth = async () => {
      console.log('=== INIT AUTH ===');
      setLoading(true);
      if (loginJustHappened.current) {
        console.log('Login just done - skip');
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        console.log('=== INIT APP START (Checking Saved Login) ===');
        const r1 = await Preferences.get({ key: 'save_login_enabled' });
        const r2 = await Preferences.get({ key: 'saved_email' });
        const r3 = await Preferences.get({ key: 'saved_pin' });

        console.log('save_login_enabled:', r1.value);
        console.log('saved_email:', r2.value);
        console.log('saved_pin exists:', !!r3.value);
        console.log('saved_pin length:', r3.value?.length);

        if (r1.value === 'true' && r2.value && r3.value) {
          console.log('All credentials found — querying DB with email:', r2.value);

          // DIRECT DB QUERY — no Supabase auth:
          const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('id, name, email, pin, role, is_pro, avatar_url, status, pro_purchase_date, payment_id, payment_amount')
            .ilike('email', r2.value)
            .eq('pin', r3.value)
            .single();

          console.log('DB query result:', JSON.stringify(userData));
          console.log('DB query error:', JSON.stringify(dbError));

          if (!dbError && userData) {
            console.log('AUTO LOGIN SUCCESS ✅:', userData.email);
            
            // 🔥 CRITICAL FIX: The app's auto-login bypassed Supabase Auth!
            // Without a valid session, the client is 'anon' and all Storage RLS uploads fail.
            // We must silently sign in to ensure the Supabase client gets a valid JWT.
            const { error: authError } = await supabase.auth.signInWithPassword({
              email: r2.value,
              password: r2.value // The app's unique schema uses email as the Supabase Auth password
            });
            if (authError) {
              console.error('Silent Supabase login failed:', authError.message);
            } else {
              console.log('Supabase session silently restored for RLS permissions');
            }

            const merged: AuthUser = {
              id: userData.id,
              name: (userData as any).name || '',
              email: r2.value.toLowerCase(),
              isPro: (userData as any).is_pro === true,
              role: (userData as any).role || 'user',
              avatarUrl: (userData as any).avatar_url || '',
              proPurchaseDate: (userData as any).pro_purchase_date ?? null,
              paymentId: (userData as any).payment_id ?? null,
              paymentAmount: (userData as any).payment_amount ?? null,
            };
            
            persistUser(merged);
            setLoading(false);
            return;
          } else {
            console.log('AUTO LOGIN FAILED ❌ DB query failed OR error');
            // Clear bad saved data:
            await Preferences.remove({ key: 'save_login_enabled' });
            await Preferences.remove({ key: 'saved_email' });
            await Preferences.remove({ key: 'saved_pin' });
          }
        } else {
          console.log('Missing credentials in Storage: enabled=', r1.value, 'email=', r2.value, 'pin=', !!r3.value);
        }
      } catch (err: any) {
        console.error('Auto login error:', err);
      }

      try {
        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (cancelled) return;
        console.log('Existing session:', !!session?.user);
        if (!session?.user?.id) {
          persistUser(null);
          return;
        }
        let dbData: {
          name?: string;
          role?: string | null;
          avatar_url?: string | null;
          is_pro?: boolean;
          pro_purchase_date?: string | null;
          payment_id?: string | null;
          payment_amount?: number | null;
        } | null = null;
        try {
          const { data } = await supabase
            .from('users')
            .select('name, role, avatar_url, is_pro, pro_purchase_date, payment_id, payment_amount')
            .eq('id', session.user.id)
            .single();
          dbData = data;
        } catch {
          dbData = null;
        }

        if (dbData) {
          const baseData = buildUserFromAuthUser(session.user as SupabaseAuthUser);
          const merged: AuthUser = {
            ...baseData,
            name: (dbData as { name?: string }).name || '',
            email: (session.user.email || '').toLowerCase(),
            isPro: (dbData as { is_pro?: boolean }).is_pro === true,
            role: (dbData as { role?: string }).role || 'user',
            avatarUrl: dbData.avatar_url || baseData.avatarUrl,
            proPurchaseDate: (dbData as { pro_purchase_date?: string | null }).pro_purchase_date ?? null,
            paymentId: (dbData as { payment_id?: string | null }).payment_id ?? null,
            paymentAmount: (dbData as { payment_amount?: number | null }).payment_amount ?? null,
          };
          persistUser(merged);
          void saveUserProfileCache(merged);
          console.log('Restored session ✅', merged.email);
        } else {
          console.log('No user in DB');
          persistUser(null);
        }
      } catch (e) {
        console.error('Init error:', e);
        if (!cancelled) persistUser(null);
      } finally {
        if (!cancelled) {
          console.log('=== INIT DONE ===');
          setLoading(false);
        }
      }
    };

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('Auth event:', event);
      if (event === 'SIGNED_OUT') {
        loginJustHappened.current = false;
        persistUser(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [persistUser]);

  const logout = async () => {
    console.log('Logging out — clearing saved login...');
    // Clear ALL saved login data:
    await Preferences.remove({ key: 'save_login_enabled' });
    await Preferences.remove({ key: 'saved_email' });
    await Preferences.remove({ key: 'saved_pin' });

    if (Capacitor.isNativePlatform()) {
      await supabase.auth.signOut({ scope: 'local' });
    } else {
      await supabase.auth.signOut({ scope: 'global' });
    }
    await flushPendingListCacheWrites();
    await clearAllCache();
    loginJustHappened.current = false;
    persistUser(null);
  };

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
