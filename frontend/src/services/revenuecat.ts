// src/services/revenuecat.ts
import { Purchases, type CustomerInfo, type PurchasesPackage, type PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';
import { Capacitor } from '@capacitor/core';

const LOGTAG = '[RevenueCat]';

/**
 * Service to manage RevenueCat (In-App Purchases) lifecycle.
 * Hardened with initialization guards and silent failure triggers.
 */
export class RevenueCatService {
  private static isConfigured = false;

  /**
   * Initialize RevenueCat SDK
   */
  static async configure(userId?: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    if (this.isConfigured) {
      console.log(`${LOGTAG} Already configured.`);
      return;
    }

    try {
      const appleKey = import.meta.env.VITE_REVENUECAT_IOS_KEY;
      const googleKey = import.meta.env.VITE_REVENUECAT_ANDROID_KEY;

      if (!appleKey && !googleKey) {
        console.warn(`${LOGTAG} API Keys missing from environment. Subscription logic will be bypassed.`);
        return;
      }

      const apiKey = Capacitor.getPlatform() === 'ios' ? appleKey : googleKey;

      if (!apiKey) {
        console.warn(`${LOGTAG} API Key for platform ${Capacitor.getPlatform()} is not defined.`);
        return;
      }

      await Purchases.configure({
        apiKey,
        appUserID: userId,
      });

      this.isConfigured = true;
      console.log(`${LOGTAG} App configured successfully ${userId ? `for user: ${userId}` : ''}`);
    } catch (e) {
      // CRITICAL: Catch and continue. Do not allow RevenueCat failures to block the Splash Screen removal.
      console.error(`${LOGTAG} Configuration failed (Non-blocking):`, e);
    }
  }

  /**
   * Get current customer info
   */
  static async getCustomerInfo(): Promise<CustomerInfo | null> {
    if (!Capacitor.isNativePlatform() || !this.isConfigured) return null;
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (e) {
      console.error(`${LOGTAG} Failed to get customer info:`, e);
      return null;
    }
  }

  /**
   * Get all available offerings
   */
  static async getOfferings(): Promise<PurchasesOffering | null> {
    if (!Capacitor.isNativePlatform() || !this.isConfigured) return null;
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (e) {
        console.error(`${LOGTAG} Failed to fetch offerings:`, e);
        return null;
    }
  }

  /**
   * Purchase a package
   */
  static async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
    if (!Capacitor.isNativePlatform() || !this.isConfigured) return null;
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      return customerInfo;
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error(`${LOGTAG} Purchase failed:`, e);
      }
      return null;
    }
  }

  /**
   * Restore purchases
   */
  static async restorePurchases(): Promise<CustomerInfo | null> {
    if (!Capacitor.isNativePlatform() || !this.isConfigured) return null;
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      return customerInfo;
    } catch (e) {
      console.error(`${LOGTAG} Restore failed:`, e);
      return null;
    }
  }

  /**
   * Log out from RevenueCat
   */
  static async logOut(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.isConfigured) return;
    try {
      await Purchases.logOut();
    } catch (e) {
      console.error(`${LOGTAG} LogOut failed:`, e);
    }
  }

  /**
   * Present the RevenueCat Customer Center
   */
  static async presentCustomerCenter(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.isConfigured) return;
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (e) {
      console.error(`${LOGTAG} Customer Center failed:`, e);
    }
  }

  /**
   * Present the RevenueCat Paywall
   */
  static async presentPaywall(): Promise<CustomerInfo | null> {
    if (!Capacitor.isNativePlatform() || !this.isConfigured) return null;
    try {
      const { result } = await RevenueCatUI.presentPaywall();
      if (result === 'PURCHASED' || result === 'RESTORED') {
        return await this.getCustomerInfo();
      }
      return null;
    } catch (e) {
      console.error(`${LOGTAG} Paywall failed:`, e);
      return null;
    }
  }
}
