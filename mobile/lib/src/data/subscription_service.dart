import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import '../config/app_config.dart';

/// A purchasable plan, flattened out of RevenueCat's offering model.
class ProPlan {
  const ProPlan({
    required this.package,
    required this.title,
    required this.price,
    required this.period,
    this.badge,
    this.savingsNote,
  });

  final Package package;
  final String title;

  /// Localised, currency-correct string straight from the store. Never
  /// hand-formatted — a hardcoded "₹99" is wrong the moment anyone outside
  /// India opens the app.
  final String price;

  final String period;
  final String? badge;
  final String? savingsNote;
}

/// Why a Pro check came back the way it did. Useful when a user insists they
/// paid and the app disagrees.
enum ProSource { revenueCatActive, revenueCatExpired, databaseGrant, none }

class ProStatus {
  const ProStatus({required this.isPro, required this.source});

  final bool isPro;
  final ProSource source;

  static const none = ProStatus(isPro: false, source: ProSource.none);
}

/// The plan a Pro member is actually on, for display.
///
/// "Pro" alone is not an answer to "what am I paying for?" — a member who
/// bought a year needs to see that, and when it renews.
class ProDetail {
  const ProDetail({
    required this.label,
    required this.source,
    this.renewsOn,
    this.willRenew = false,
  });

  /// 'Monthly', 'Yearly', 'Lifetime', or 'Pro' when the store cannot say.
  final String label;
  final ProSource source;

  /// Null for lifetime, and for grants that came from the database.
  final DateTime? renewsOn;

  /// False once someone cancels — the difference between "renews on" and
  /// "ends on", which is the single most important date to get right.
  final bool willRenew;

  bool get isLifetime => renewsOn == null;
}

/// What a restore actually established, so the UI can say something true.
enum RestoreOutcome {
  /// A purchase was found and Pro is now active on this device.
  restored,

  /// Already Pro before the restore ran — nothing needed doing.
  alreadyActive,

  /// This account has bought before, but the subscription has lapsed.
  expired,

  /// No purchase has ever been made on this Google account.
  nothingFound,

  /// Billing is unavailable (no keys, or the store could not be reached).
  unavailable,
}

extension RestoreOutcomeMessage on RestoreOutcome {
  String get message => switch (this) {
        RestoreOutcome.restored =>
          'Purchase restored. Pro is active on this device.',
        RestoreOutcome.alreadyActive =>
          'Your purchase is already verified. Pro is active.',
        RestoreOutcome.expired =>
          'Your subscription has expired. Subscribe again to get Pro back.',
        RestoreOutcome.nothingFound =>
          "Nothing to restore — you're on the free plan. If you paid with "
              'another Google account, switch to it in the Play Store first.',
        RestoreOutcome.unavailable =>
          'Could not reach the Play Store. Check your connection and try again.',
      };
}

/// RevenueCat wrapper.
///
/// Degrades to "no billing" when [AppConfig.hasBilling] is false, so a build
/// without keys still runs — the paywall simply reports that purchasing is
/// unavailable instead of crashing on launch.
class SubscriptionService {
  bool _configured = false;

  Future<void> configure({String? appUserId}) async {
    if (!AppConfig.hasBilling || _configured) return;
    try {
      await Purchases.setLogLevel(LogLevel.warn);
      await Purchases.configure(
        // The app user id MUST be the Supabase uuid, matching the Capacitor
        // build's `Purchases.configure({appUserID: userId})`. Anything else and
        // existing subscribers look like new anonymous users and lose Pro.
        PurchasesConfiguration(AppConfig.revenueCatAndroidKey)
          ..appUserID = appUserId,
      );
      _configured = true;
    } catch (e) {
      debugPrint('[billing] configure failed: $e');
    }
  }

  /// Re-identify after sign-in, so purchases follow the account rather than the
  /// device.
  Future<void> identify(String appUserId) async {
    if (!AppConfig.hasBilling) return;
    try {
      await configure(appUserId: appUserId);
      await Purchases.logIn(appUserId);
    } catch (e) {
      debugPrint('[billing] logIn failed: $e');
    }
  }

  /// Resolve Pro status.
  ///
  /// Ports the hybrid rule from the Capacitor build exactly, because changing it
  /// would silently strip Pro from admin-granted and lifetime users:
  ///
  /// * RevenueCat reports the entitlement active → Pro.
  /// * RevenueCat holds *some* record but it is not active → NOT Pro. The store
  ///   is authoritative about expiry; the database is not.
  /// * RevenueCat holds no record at all → fall back to the database flag. This
  ///   is how manually-granted and web-purchased lifetime users work.
  Future<ProStatus> resolve({required bool databaseSaysPro}) async {
    if (!AppConfig.hasBilling) {
      return ProStatus(
        isPro: databaseSaysPro,
        source: databaseSaysPro ? ProSource.databaseGrant : ProSource.none,
      );
    }

    try {
      final info = await Purchases.getCustomerInfo();
      final active =
          info.entitlements.active.containsKey(AppConfig.proEntitlementId);
      final everSubscribed =
          info.entitlements.all.containsKey(AppConfig.proEntitlementId);

      if (active) {
        return const ProStatus(
            isPro: true, source: ProSource.revenueCatActive);
      }
      if (everSubscribed) {
        return const ProStatus(
            isPro: false, source: ProSource.revenueCatExpired);
      }
      return ProStatus(
        isPro: databaseSaysPro,
        source: databaseSaysPro ? ProSource.databaseGrant : ProSource.none,
      );
    } catch (e) {
      debugPrint('[billing] resolve failed: $e');
      // A network failure must never revoke Pro from someone who has it.
      return ProStatus(
        isPro: databaseSaysPro,
        source: databaseSaysPro ? ProSource.databaseGrant : ProSource.none,
      );
    }
  }

  /// Which plan is live right now, or null when the store has nothing active.
  ///
  /// Returns null rather than guessing: a member whose Pro comes from a
  /// database grant has no store record to describe, and inventing "Monthly"
  /// for them would be worse than saying nothing.
  Future<ProDetail?> activePlan() async {
    if (!AppConfig.hasBilling) return null;
    try {
      final info = await Purchases.getCustomerInfo();
      final entitlement = info.entitlements.active[AppConfig.proEntitlementId];
      if (entitlement == null) return null;

      final expiry = entitlement.expirationDate;
      final renewsOn = expiry == null ? null : DateTime.tryParse(expiry);

      // The product id is the only reliable period signal — RevenueCat's
      // `periodType` distinguishes trial from normal, not month from year.
      final id = entitlement.productIdentifier.toLowerCase();
      final label = renewsOn == null
          ? 'Lifetime'
          : id.contains('year') || id.contains('annual')
              ? 'Yearly'
              : id.contains('month')
                  ? 'Monthly'
                  : 'Pro';

      return ProDetail(
        label: label,
        source: ProSource.revenueCatActive,
        renewsOn: renewsOn,
        willRenew: entitlement.willRenew,
      );
    } catch (e) {
      debugPrint('[billing] activePlan failed: $e');
      return null;
    }
  }

  /// Available plans, annual first. Empty when billing is unconfigured.
  Future<List<ProPlan>> plans() async {
    if (!AppConfig.hasBilling) return const [];
    try {
      final offerings = await Purchases.getOfferings();
      final current = offerings.current;
      if (current == null) return const [];

      final out = <ProPlan>[];
      for (final package in current.availablePackages) {
        final product = package.storeProduct;
        final isAnnual = package.packageType == PackageType.annual;
        final isLifetime = package.packageType == PackageType.lifetime;
        final isMonthly = package.packageType == PackageType.monthly;

        // The offering also carries the tip products ("Just Tea", "Caffeine
        // Boost"…). They are gratitude, not plans — they surface in Settings
        // via [tips], never on the paywall, where they read as pricing chaos.
        if (!isAnnual && !isLifetime && !isMonthly) continue;

        out.add(ProPlan(
          package: package,
          title: switch (package.packageType) {
            PackageType.annual => 'Yearly',
            PackageType.monthly => 'Monthly',
            PackageType.lifetime => 'Lifetime',
            _ => product.title,
          },
          price: product.priceString,
          period: switch (package.packageType) {
            PackageType.annual => 'per year',
            PackageType.monthly => 'per month',
            PackageType.lifetime => 'one payment',
            _ => '',
          },
          badge: isAnnual ? 'BEST VALUE' : (isLifetime ? 'FOREVER' : null),
        ));
      }

      // Annual first — it is the plan worth defaulting to, and burying it under
      // monthly is how subscription apps train people to churn.
      out.sort((a, b) {
        int rank(ProPlan p) => switch (p.package.packageType) {
              PackageType.annual => 0,
              PackageType.lifetime => 1,
              PackageType.monthly => 2,
              _ => 3,
            };
        return rank(a).compareTo(rank(b));
      });
      return out;
    } catch (e) {
      debugPrint('[billing] offerings failed: $e');
      return const [];
    }
  }

  /// The tip products — one-time thank-yous, straight from the old app.
  ///
  /// Never grant anything: the entitlement check ignores them entirely, which
  /// is the same "tips can never grant Pro" rule the web build enforced
  /// server-side. Titles arrive suffixed with the store listing name
  /// ("Just Tea (StayHardy: Build Better Habits)") — trimmed for display.
  Future<List<ProPlan>> tips() async {
    if (!AppConfig.hasBilling) return const [];
    try {
      final offerings = await Purchases.getOfferings();
      final current = offerings.current;
      if (current == null) return const [];

      final out = <ProPlan>[];
      for (final package in current.availablePackages) {
        final type = package.packageType;
        if (type == PackageType.annual ||
            type == PackageType.monthly ||
            type == PackageType.lifetime) {
          continue;
        }
        final product = package.storeProduct;
        final title = product.title.replaceAll(RegExp(r'\s*\(.*\)\s*$'), '');
        out.add(ProPlan(
          package: package,
          title: title.isEmpty ? product.title : title,
          price: product.priceString,
          period: 'one time',
          badge: null,
        ));
      }
      out.sort((a, b) => a.price.compareTo(b.price));
      return out;
    } catch (e) {
      debugPrint('[billing] tip offerings failed: $e');
      return const [];
    }
  }

  /// Returns null on success, or a user-facing message on failure.
  Future<String?> purchase(Package package) async {
    if (!AppConfig.hasBilling) return 'Purchasing is unavailable right now.';
    try {
      final result = await Purchases.purchase(PurchaseParams.package(package));
      // SDK 10 wraps the result: it returns a PurchaseResult carrying the
      // CustomerInfo rather than being it.
      final active = result.customerInfo.entitlements.active
          .containsKey(AppConfig.proEntitlementId);
      return active ? null : 'The purchase did not complete.';
    } on PlatformException catch (e) {
      final code = PurchasesErrorHelper.getErrorCode(e);
      // A deliberate cancel is not an error and must not raise an alarm.
      if (code == PurchasesErrorCode.purchaseCancelledError) return null;
      return switch (code) {
        PurchasesErrorCode.purchaseNotAllowedError =>
          'Purchases are not allowed on this device.',
        PurchasesErrorCode.paymentPendingError =>
          'Your payment is pending. Pro unlocks once it clears.',
        PurchasesErrorCode.networkError =>
          'No connection. Check your network and try again.',
        PurchasesErrorCode.productAlreadyPurchasedError =>
          "You already own this — try Restore purchases.",
        _ => 'Something went wrong with the purchase.',
      };
    } catch (e) {
      debugPrint('[billing] purchase failed: $e');
      return 'Something went wrong with the purchase.';
    }
  }

  /// Restore, and report what was actually established.
  ///
  /// "Found something / found nothing" is too coarse to answer the question the
  /// user is really asking. Someone who never paid, someone whose subscription
  /// lapsed, and someone who is already Pro all need different sentences — and
  /// telling a lapsed subscriber "nothing found" sends them hunting for a
  /// billing bug that does not exist.
  Future<RestoreOutcome> restoreDetailed({required bool wasProBefore}) async {
    if (!AppConfig.hasBilling) return RestoreOutcome.unavailable;
    try {
      final info = await Purchases.restorePurchases();
      final id = AppConfig.proEntitlementId;

      if (info.entitlements.active.containsKey(id)) {
        return wasProBefore
            ? RestoreOutcome.alreadyActive
            : RestoreOutcome.restored;
      }
      // Known to the store but not active: a real purchase that has lapsed.
      if (info.entitlements.all.containsKey(id)) return RestoreOutcome.expired;
      return RestoreOutcome.nothingFound;
    } catch (e) {
      debugPrint('[billing] restore failed: $e');
      return RestoreOutcome.unavailable;
    }
  }

  /// Opens the Play Store subscription page for this app.
  ///
  /// Play-billed subscriptions **cannot** be cancelled from inside the app —
  /// Google owns that flow, and there is no billing API for it. Deep-linking to
  /// the managed-subscriptions screen is both the supported route and what
  /// Play's policy expects an app to provide.
  static Uri manageSubscriptionUri({String? productId}) {
    const pkg = 'com.stayhardy.app';
    return productId == null
        ? Uri.parse('https://play.google.com/store/account/subscriptions?package=$pkg')
        : Uri.parse(
            'https://play.google.com/store/account/subscriptions?sku=$productId&package=$pkg');
  }

  /// Returns true when the restore actually found an entitlement.
  ///
  /// The old app reported success on any completed call, which is why users saw
  /// "restored" and still had nothing.
  Future<bool> restore() async {
    if (!AppConfig.hasBilling) return false;
    try {
      final info = await Purchases.restorePurchases();
      return info.entitlements.active
          .containsKey(AppConfig.proEntitlementId);
    } catch (e) {
      debugPrint('[billing] restore failed: $e');
      return false;
    }
  }
}
