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
  initRevenueCat: (userId?: string) => Promise<void>;
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
      await supabase
        .from('users')
        .update({
          is_pro: true,
          pro_activated_at: new Date().toISOString(),
          revenuecat_customer_id: info.originalAppUserId
        })
        .eq('id', user.id);
      void syncRoleCache(true);
    } else {
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

  const initRevenueCat = useCallback(async (uid?: string) => {
    try {
      console.log('=== INIT REVENUECAT ===');
      if (!Capacitor.isNativePlatform()) {
        setLoading(false);
        return;
      }

      await RevenueCatService.configure(uid || user?.id);
      await refreshSubscription();
    } catch (err) {
      console.error('RevenueCat init failed (Non-blocking):', err);
      setLoading(false);
    }
  }, [user?.id, refreshSubscription]);

  // Secondary setup (listeners only)
  useEffect(() => {
    let listener: string | null = null;
    let appStateListener: any = null;

    const setupListeners = async () => {
      if (Capacitor.isNativePlatform()) {
        listener = await Purchases.addCustomerInfoUpdateListener((info) => {
          updateStateFromInfo(info);
        });

        appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            refreshSubscription();
          }
        });
      }
    };

    setupListeners();

    return () => {
      if (listener) {
        Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: listener });
      }
      if (appStateListener) appStateListener.remove();
    };
  }, [refreshSubscription, updateStateFromInfo]);

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
      presentPaywall,
      initRevenueCat
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
