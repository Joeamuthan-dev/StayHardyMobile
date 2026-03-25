import { Purchases, type CustomerInfo, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase';

const LOGTAG = '[RevenueCat]';

export class RevenueCatService {
  private static isConfigured = false;

  /**
   * Initialize RevenueCat SDK
   * @param userId Supabase user ID
   */
  static async configure(userId: string) {
    if (!Capacitor.isNativePlatform()) return;
    if (this.isConfigured) return;

    try {
      const appleKey = import.meta.env.VITE_REVENUECAT_IOS_KEY || 'REPLACE_WITH_IOS_KEY';
      const googleKey = import.meta.env.VITE_REVENUECAT_ANDROID_KEY || 'REPLACE_WITH_ANDROID_KEY';

      const apiKey = Capacitor.getPlatform() === 'ios' ? appleKey : googleKey;

      if (!apiKey || apiKey.includes('REPLACE_WITH')) {
        console.warn(`${LOGTAG} API Key is missing or default. Skipping configuration.`);
        return;
      }

      await Purchases.configure({
        apiKey,
        appUserID: userId,
      });

      this.isConfigured = true;
      console.log(`${LOGTAG} Configured for user: ${userId}`);
    } catch (e) {
      console.error(`${LOGTAG} Configuration failed:`, e);
    }
  }

  /**
   * Check if user has active PRO entitlement
   */
  static async checkEntitlement(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      return !!customerInfo.entitlements.active['pro'];
    } catch (e) {
      console.error(`${LOGTAG} Failed to check entitlement:`, e);
      return false;
    }
  }

  /**
   * Fetch current offerings and return the lifetime package if available
   */
  static async getLifetimePackage(): Promise<PurchasesPackage | null> {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
        // Look for stayhardy_pro_lifetime specifically or just return the first available for now
        const lifetime = offerings.current.availablePackages.find(
          (pkg) => pkg.identifier === '$rc_lifetime' || pkg.product.identifier === 'stayhardy_pro_lifetime'
        );
        return lifetime || offerings.current.availablePackages[0];
      }
    } catch (e) {
      console.error(`${LOGTAG} Failed to fetch offerings:`, e);
    }
    return null;
  }

  /**
   * Perform purchase of a package
   */
  static async purchase(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
    if (!Capacitor.isNativePlatform()) return null;
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
  static async restorePurchases(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      return !!customerInfo.entitlements.active['pro'];
    } catch (e) {
      console.error(`${LOGTAG} Restore failed:`, e);
      return false;
    }
  }

  /**
   * Sync Pro status from RevenueCat to Supabase
   */
  static async syncProStatus(userId: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || !userId) return false;

    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active['pro'];

      if (entitlement && entitlement.isActive) {
        // Update users table
        const { error: userError } = await supabase
          .from('users')
          .update({
            is_pro: true,
            pro_activated_at: entitlement.latestPurchaseDate,
            revenuecat_customer_id: customerInfo.originalAppUserId
          })
          .eq('id', userId);

        if (userError) {
          console.error(`${LOGTAG} Failed to update user record:`, userError);
        }

        // Find the transaction for this entitlement
        // For non-subscription (lifetime), it should be in nonSubscriptionTransactions
        const transaction = customerInfo.nonSubscriptionTransactions.find(
          t => t.productIdentifier === entitlement.productIdentifier
        );
        
        const transactionId = transaction?.transactionIdentifier || `rc_${entitlement.productIdentifier}_${userId}`;
        
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('transaction_id', transactionId)
          .maybeSingle();

        if (!existingPayment) {
          await supabase.from('payments').insert([{
            user_id: userId,
            product_id: entitlement.productIdentifier,
            amount: 0, 
            currency: 'UNK',
            platform: Capacitor.getPlatform(),
            transaction_id: transactionId,
            revenuecat_customer_id: customerInfo.originalAppUserId,
            purchase_date: entitlement.latestPurchaseDate,
            status: 'completed'
          }]);
        }
        return true;
      }
    } catch (e) {
      console.error(`${LOGTAG} Sync failed:`, e);
    }
    return false;
  }

  /**
   * Logout from RevenueCat
   */
  static async logOut() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Purchases.logOut();
      this.isConfigured = false;
    } catch (e) {
      console.error(`${LOGTAG} Logout failed:`, e);
    }
  }
}
