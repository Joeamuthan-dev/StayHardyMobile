import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'src/data/dev_seed.dart';
import 'src/data/auth_service.dart';
import 'src/data/providers.dart';
import 'package:flutter_displaymode/flutter_displaymode.dart';

import 'src/features/auth/set_new_pin_screen.dart';
import 'src/features/boot/boot_gate.dart';
import 'src/features/community/updates_screen.dart';
import 'src/data/notification_service.dart';
import 'src/features/mood/mood_check_in.dart';
import 'src/theme/aura_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await AuthService.initialize();

  final container = ProviderContainer();

  // Adopt the session the Capacitor build left behind, before anything reads
  // the auth state. Existing users must not be signed out by the upgrade.
  final auth = container.read(authServiceProvider);
  await auth.recoverLegacySession();
  container.read(authUserIdProvider.notifier).state = auth.currentUserId;
  // Keep the gate honest for the whole run: a sign-out or a server-side
  // revocation flips authUserIdProvider, and BootGate returns to the login
  // screen without needing a restart.
  String? lastUserId = auth.currentUserId;
  auth.userIdChanges.listen((id) {
    container.read(authUserIdProvider.notifier).state = id;
    // Re-key billing and re-resolve Pro whenever the *identity* changes.
    // Guarded on a real change because this stream also fires on every token
    // refresh, and re-identifying on those would hammer RevenueCat all day.
    if (id != lastUserId) {
      lastUserId = id;
      if (id != null) {
        unawaited(() async {
          await container.read(subscriptionServiceProvider).identify(id);
          await container.read(isProProvider.notifier).refresh();
        }());
      }
    }
  });
  // A reset email's link, opened with the app, lands here: straight to the
  // set-new-PIN screen. The website stays out of it.
  auth.passwordRecovery.listen((_) {
    // Fetched inside the callback, so the lint's async-gap concern does not
    // apply: this context is read at event time, not captured across one.
    final recoveryContext = appNavigatorKey.currentContext;
    if (recoveryContext != null && recoveryContext.mounted) {
      SetNewPinScreen.open(recoveryContext);
    }
  });

  // Ask Android for the panel's fastest mode. Many devices pin Flutter to
  // 60Hz by default; a habit app that scrolls at half the screen's refresh
  // reads as cheap on hardware the user paid for. Best-effort — a device
  // that refuses just stays where it was.
  try {
    await FlutterDisplayMode.setHighRefreshRate();
  } catch (e) {
    debugPrint('[boot] high refresh unavailable: $e');
  }
  // Development only, and only into a completely empty database. Removed once
  // the real Supabase migration lands.
  if (kDebugMode) {
    await seedDevData(container.read(databaseProvider));
  }

  // Configured WITH the recovered account id. Anonymous configuration was the
  // bug that would have cost every existing subscriber their Pro: RevenueCat
  // keys entitlements to the Supabase uuid (`appUserID` in the Capacitor
  // build), and an anonymous SDK never attaches them.
  await container
      .read(subscriptionServiceProvider)
      .configure(appUserId: auth.currentUserId);

  // Now that billing knows who this is, ask the server and the store again.
  // The notifier's constructor ran before any of this and could only see the
  // device's cached flag — which is false on every fresh install, including
  // an existing Pro user's first launch of 2.0.
  unawaited(() async {
    await container.read(isProProvider.notifier).refresh();
    final changed = await applyProBackupDefault(
      container.read(settingsRepositoryProvider),
      container.read(isProProvider),
    );
    if (changed) container.invalidate(autoBackupEnabledProvider);
  }());

  // Routes notification taps. The mood prompt's whole promise is "tap this and
  // record how you feel" — landing the user on Home instead breaks it.
  NotificationService.onNotificationTap = (payload) {
    if (payload == NotificationService.moodPayload) {
      final context = appNavigatorKey.currentContext;
      if (context != null) MoodCheckIn.open(context);
    }
    if (payload == NotificationService.circleNewsPayload) {
      final context = appNavigatorKey.currentContext;
      if (context != null) UpdatesScreen.open(context);
    }
  };

  startWidgetSync(container);
  startReminderSync(container);
  startStreakMaintenance(container);
  startFocusRecovery(container);

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const StayHardyApp(),
    ),
  );
}

/// Global navigator, so a notification tap can push a screen from outside the
/// widget tree — the tap handler fires with no BuildContext of its own.
final appNavigatorKey = GlobalKey<NavigatorState>();

class StayHardyApp extends ConsumerWidget {
  const StayHardyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      navigatorKey: appNavigatorKey,
      title: 'StayHardy',
      debugShowCheckedModeBanner: false,
      theme: AuraTheme.light(),
      darkTheme: AuraTheme.dark(),
      // Dark is the intended default; light is a first-class alternative, not an
      // afterthought. System preference decides until the user overrides it in
      // Settings, which persists the choice to the settings table.
      themeMode: ref.watch(themeModeProvider),
      // The design leans on oversized numerals; past ~1.3x they collide with
      // their labels. Clamped rather than ignored so accessibility settings
      // still take effect.
      builder: (context, child) => MediaQuery.withClampedTextScaling(
        minScaleFactor: 0.9,
        maxScaleFactor: 1.3,
        child: child ?? const SizedBox.shrink(),
      ),
      home: const BootGate(),
    );
  }
}
