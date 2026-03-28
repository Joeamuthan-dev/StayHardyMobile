import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Purchases, type CustomerInfo, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { RevenueCatService } from '../services/revenuecat';
import { storage } from '../utils/storage';
import { useAuth } from './AuthContext';
import { useLoading } from './LoadingContext';
import { supabase } from '../supabase';

const ENTITLEMENT_ID = 'StayHardy Pro';

interface SubscriptionContextType {
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  offerings: { monthly: PurchasesPackage | null, yearly: PurchasesPackage | null } | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  presentCustomerCenter: () => Promise<void>;
  presentPaywall: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { setLoading: setGlobalLoading } = useLoading();
  const [isPro, setIsPro] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('cached_is_pro');
      return cached === 'true';
    } catch {
      return false;
    }
  });
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<{ monthly: PurchasesPackage | null, yearly: PurchasesPackage | null } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync all role cache keys immediately
  const syncRoleCache = async (isProValue: boolean) => {
    try {
      const userId = localStorage.getItem('cached_user_id') || '';

      // 1. Fast boolean cache (read by SubscriptionContext init)
      localStorage.setItem('cached_is_pro', String(isProValue));

      // 2. Full profile cache update (read by SideMenu + BottomNav)
      if (userId) {
        const profileRaw = localStorage.getItem('cached_profile_fast_' + userId);
        if (profileRaw) {
          try {
            const profile = JSON.parse(profileRaw);
            profile.pro_member = isProValue;
            profile.role = isProValue ? 'pro' : 'user';
            profile.cached_at = Date.now();
            localStorage.setItem('cached_profile_fast_' + userId, JSON.stringify(profile));
          } catch (_) { }
        }

        // 3. Preferences cache (read by Phase 1 mount logic)
        await storage.set('cached_user_role_' + userId, isProValue ? 'pro' : 'basic');

        // 4. Full profile in Preferences
        const fullProfileRaw = await storage.get('cached_user_profile_' + userId);
        if (fullProfileRaw) {
          try {
            const fullProfile = JSON.parse(fullProfileRaw);
            fullProfile.pro_member = isProValue;
            fullProfile.role = isProValue ? 'pro' : 'user';
            fullProfile.cached_at = Date.now();
            await storage.set('cached_user_profile_' + userId, JSON.stringify(fullProfile));
          } catch (_) { }
        }
      }
    } catch (err) {
      console.warn('[SubscriptionContext] cache sync failed:', err);
    }
  };

  const syncToSupabase = useCallback(async (info: CustomerInfo) => {
    if (!user?.id) return;
    const active = !!info.entitlements.active[ENTITLEMENT_ID];

    if (active) {
      const { error } = await supabase
        .from('users')
        .update({
          is_pro: true,
          pro_purchase_date: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) {
        console.error('[SubscriptionContext] Failed to sync is_pro=true to Supabase:', error);
      } else {
        console.log('[SubscriptionContext] is_pro=true + pro_purchase_date written to Supabase successfully');
      }
      void syncRoleCache(true);
    } else {
      const { error } = await supabase
        .from('users')
        .update({
          is_pro: false,
        })
        .eq('id', user.id);
      if (error) {
        console.error('[SubscriptionContext] Failed to sync is_pro=false to Supabase:', error);
      }
      void syncRoleCache(false);
    }
  }, [user]);

  const updateStateFromInfo = useCallback((info: CustomerInfo | null) => {
    if (!info) {
      setIsPro(false);
      setCustomerInfo(null);
      return;
    }
    const active = !!info.entitlements.active[ENTITLEMENT_ID];
    setIsPro(active);
    void syncRoleCache(active);
    setCustomerInfo(info);
    if (active) {
      syncToSupabase(info).catch(() => { });
    }
  }, [syncToSupabase]);

  const refreshSubscription = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    setLoading(true);
    setGlobalLoading(true);
    try {
      const info = await RevenueCatService.getCustomerInfo();
      updateStateFromInfo(info);

      const offering = await RevenueCatService.getOfferings();
      if (offering) {
        setOfferings({
          monthly: offering.monthly || null,
          yearly: offering.annual || null
        });
      }
    } catch (e) {
      console.error('Subscription refresh failed:', e);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [updateStateFromInfo, setGlobalLoading]);

  const [rcReady, setRcReady] = useState(false);

  // STEP 1: Configure RC first — nothing else runs until done
  useEffect(() => {
    if (!user?.id) {
      setRcReady(false);
      return;
    }

    let cancelled = false;

    const initRC = async () => {
      try {
        console.log('=== STAGE 1: CONFIGURE REVENUECAT ===');
        await RevenueCatService.configure(user.id);
        if (!cancelled) {
          setRcReady(true); // Signal that RC is ready
        }
      } catch (e) {
        console.warn('[Sub] RC configure failed:', e);
      }
    };

    initRC();

    return () => { cancelled = true; };
  }, [user?.id]);

  // STEP 2: Setup listeners and fetch data AFTER rcReady
  useEffect(() => {
    if (!rcReady || !user?.id) return;

    let listenerHandle: any = null;
    let appStateListener: any = null;

    const setupRC = async () => {
      try {
        console.log('=== STAGE 2: SETUP REVENUECAT DATA ===');
        if (!Capacitor.isNativePlatform()) {
          setLoading(false);
          return;
        }

        // Add listener first
        const listenerId = await Purchases.addCustomerInfoUpdateListener(
          async (info) => {
            updateStateFromInfo(info);
          }
        );
        listenerHandle = listenerId;

        // Add App State listener to refresh on foreground
        appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive && RevenueCatService.isConfigured) {
            refreshSubscription();
          }
        });

        // Then fetch current data
        await refreshSubscription();

      } catch (e) {
        console.warn('[Sub] RC setup failed:', e);
      } finally {
        setLoading(false);
      }
    };

    setupRC();

    // Cleanup: only remove if SDK is still configured
    return () => {
      if (RevenueCatService.isConfigured) {
        if (listenerHandle) {
          try {
            Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: listenerHandle });
          } catch (e) { }
        }
        if (appStateListener) {
          try { appStateListener.remove(); } catch (e) { }
        }
      }
    };
  }, [rcReady, user?.id, refreshSubscription, updateStateFromInfo]);

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    const info = await RevenueCatService.purchasePackage(pkg);
    updateStateFromInfo(info);
    return !!info?.entitlements.active[ENTITLEMENT_ID];
  };

  const restorePurchases = async (): Promise<boolean> => {
    const info = await RevenueCatService.restorePurchases();
    updateStateFromInfo(info);
    return !!info?.entitlements.active[ENTITLEMENT_ID];
  };

  const presentCustomerCenter = async () => {
    await RevenueCatService.presentCustomerCenter();
  };

  const presentPaywall = async () => {
    const info = await RevenueCatService.presentPaywall();
    updateStateFromInfo(info);
  };

  return (
    <SubscriptionContext.Provider value={{
      isPro,
      customerInfo,
      offerings,
      loading,
      refreshSubscription,
      purchasePackage,
      restorePurchases,
      presentCustomerCenter,
      presentPaywall
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
