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
  offerings: { monthly: PurchasesPackage | null, yearly: PurchasesPackage | null, lifetime: PurchasesPackage | null } | null;
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
  const [offerings, setOfferings] = useState<{ monthly: PurchasesPackage | null, yearly: PurchasesPackage | null, lifetime: PurchasesPackage | null } | null>(null);
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
            // FIX: Use correct DB column name is_pro in profile cache
            profile.is_pro = isProValue;
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
            // FIX: Use correct DB column name is_pro in full profile cache
            fullProfile.is_pro = isProValue;
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
      const entitlement = info.entitlements.active[ENTITLEMENT_ID];
      const productId = entitlement?.productIdentifier ?? '';
      const expiresAt = entitlement?.expirationDate ?? null;

      // Detect plan from product identifier
      const plan = productId.toLowerCase().includes('lifetime')
        ? 'lifetime'
        : productId.toLowerCase().includes('year') || productId.toLowerCase().includes('annual')
        ? 'yearly'
        : 'monthly';

      const status = plan === 'lifetime' ? 'lifetime' : 'active';

      const { error } = await supabase
        .from('users')
        .update({
          is_pro: true,
          pro_purchase_date: new Date().toISOString(),
          subscription_plan: plan,
          pro_expires_at: expiresAt,
          subscription_status: status,
        })
        .eq('id', user.id);
      if (error) {
        console.error('[SubscriptionContext] Failed to sync is_pro=true to Supabase:', error);
      } else {
        console.log(`[SubscriptionContext] is_pro=true plan=${plan} expires=${expiresAt} written to Supabase`);
      }
      void syncRoleCache(true);
    } else {
      const { error } = await supabase
        .from('users')
        .update({
          is_pro: false,
          subscription_status: 'expired',
        })
        .eq('id', user.id);
      if (error) {
        console.error('[SubscriptionContext] Failed to sync is_pro=false to Supabase:', error);
      }
      void syncRoleCache(false);
    }
  }, [user]);

  const updateStateFromInfo = useCallback((info: CustomerInfo | null) => {
    // FIX: DB is_pro is the source of truth — RC entitlement can additionally grant pro
    const dbIsPro = user?.isPro === true;

    if (!info) {
      // FIX: No RC info — fall back to DB value only
      setIsPro(dbIsPro);
      setCustomerInfo(null);
      return;
    }

    const rcActive = !!info.entitlements.active[ENTITLEMENT_ID];
    // Check if this user ever had an RC subscription (active or expired)
    const rcEverSubscribed = !!info.entitlements.all[ENTITLEMENT_ID];

    // If RC has a subscription record: RC is authoritative (handles expiry correctly)
    // If RC has NO record at all: user may be manually admin-granted — respect DB value
    const isProFinal = rcActive || (!rcEverSubscribed && dbIsPro);

    setIsPro(isProFinal);
    void syncRoleCache(isProFinal);
    setCustomerInfo(info);

    // Only sync DB when RC has a subscription record — don't overwrite manual admin grants
    if (rcEverSubscribed) {
      syncToSupabase(info).catch(() => { });
    }
  }, [syncToSupabase, user?.isPro]);

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
          yearly: offering.annual || null,
          lifetime: offering.lifetime || null,
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

  const saveRcPaymentToSupabase = useCallback(async (productIdentifier: string, priceInr: number) => {
    if (!user?.id || priceInr <= 0) return;
    const pid = productIdentifier.toLowerCase();
    const plan = pid.includes('lifetime') ? 'lifetime'
      : pid.includes('year') || pid.includes('annual') ? 'yearly'
      : 'monthly';
    const { error } = await supabase.from('users').update({
      payment_amount: Math.round(priceInr),
      payment_id: `rc_${productIdentifier}`,
      subscription_plan: plan,
    }).eq('id', user.id);
    if (error) console.error('[SubscriptionContext] Failed to save RC payment amount:', error);
  }, [user?.id]);

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    const info = await RevenueCatService.purchasePackage(pkg);
    const active = !!info?.entitlements.active[ENTITLEMENT_ID];
    // Save payment details so admin revenue tab shows real amounts
    if (active && pkg.product.price > 0) {
      void saveRcPaymentToSupabase(pkg.product.identifier, pkg.product.price);
    }
    updateStateFromInfo(info);
    return active;
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
    // If purchase happened via RC native paywall, save payment amount using loaded offerings
    if (info) {
      const active = !!info.entitlements.active[ENTITLEMENT_ID];
      if (active) {
        const activeSubs = (info.activeSubscriptions ?? []) as string[];
        const monthlyPkg = offerings?.monthly;
        const yearlyPkg = offerings?.yearly;
        const lifetimePkg = offerings?.lifetime;
        const matchedPkg =
          (monthlyPkg && activeSubs.includes(monthlyPkg.product.identifier) ? monthlyPkg : null) ??
          (yearlyPkg && activeSubs.includes(yearlyPkg.product.identifier) ? yearlyPkg : null) ??
          (lifetimePkg && activeSubs.includes(lifetimePkg.product.identifier) ? lifetimePkg : null);
        if (matchedPkg && matchedPkg.product.price > 0) {
          void saveRcPaymentToSupabase(matchedPkg.product.identifier, matchedPkg.product.price);
        }
      }
    }
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
