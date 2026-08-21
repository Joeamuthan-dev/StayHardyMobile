import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../auth/login_screen.dart';
import 'boot_splash.dart';
import '../onboarding/onboarding_screen.dart';
import '../shell/app_shell.dart';

/// Decides what the user sees on launch.
///
/// The ordering is deliberate and is the whole reason this exists as one place
/// rather than as scattered checks:
///
/// 1. **Signed out** → login. Absolute — there is no way into the app without
///    an account. The old "no backend configured → local-only" bypass is gone:
///    it existed for credential-less dev builds, and then a plain Android
///    Studio Run produced exactly such a build and walked straight past
///    sign-in. Config now has compiled-in defaults instead.
/// 2. **New to this device** → onboarding.
/// 3. **Otherwise** → the app.
///
/// Restoring history from the old app is opt-in, from Settings.
class BootGate extends ConsumerStatefulWidget {
  const BootGate({super.key});

  @override
  ConsumerState<BootGate> createState() => _BootGateState();
}

class _BootGateState extends ConsumerState<BootGate> {
  /// The splash holds for one beat on every cold start. The decision below
  /// resolves in milliseconds, which meant the splash never actually
  /// appeared — and a brand moment that only exists in theory isn't one.
  bool _splashDone = false;

  @override
  void initState() {
    super.initState();
    Future<void>.delayed(const Duration(milliseconds: 1100), () {
      if (mounted) setState(() => _splashDone = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_splashDone) return const BootSplash();

    // Signed out — nothing else can be decided until there is an identity.
    if (ref.watch(authUserIdProvider) == null) return const LoginScreen();

    // Migration is deliberately NOT a gate.
    //
    // Existing users start fresh and restore their history only if they choose
    // to, from Settings. Blocking every upgrade on a network pull — to import
    // data most people will never look at — trades a guaranteed cost (a slow,
    // failure-prone first launch for all 274 users) against an optional benefit.
    // The engine still exists and is fully tested; it is just user-initiated now.
    return ref.watch(onboardingCompleteProvider).when(
      loading: () => const BootSplash(),
      error: (_, _) => const AppShell(),
      data: (done) => done ? const AppShell() : const OnboardingScreen(),
    );
  }
}
