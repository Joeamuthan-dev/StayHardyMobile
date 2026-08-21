import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../boot/restore_prompt.dart';

import 'package:in_app_review/in_app_review.dart';
import 'package:in_app_update/in_app_update.dart';

import '../../data/providers.dart';
import '../../domain/civil_date.dart';
import '../../domain/review_rules.dart';
import '../../data/settings_repository.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/app_button.dart';
import '../../ui/aura_nav_bar.dart';
import '../habits/habit_finder_screen.dart';
import '../habits/habits_screen.dart';
import '../home/home_screen.dart';
import '../plan/plan_screen.dart';
import '../stats/stats_screen.dart';

/// Bottom-tab shell.
///
/// Four destinations, down from six. Tasks and Goals merged into Plan; "You"
/// became a gear in each screen's header. A navigation bar is the most valuable
/// space in a phone app and it was spending a third of itself on a settings
/// screen people open once a month.
///
/// Each tab is built fresh on selection — owner's call, reversing the earlier
/// keep-your-scroll-position IndexedStack: every page leads with its most
/// important content, so arriving mid-scroll read as "the page is cropped".
/// Fresh builds also replay each page's entrance animation, which is wanted.
/// Anything that must survive a tab switch lives in providers, not in widget
/// state, so nothing of substance is lost.
///
/// The body extends *under* the floating nav bar rather than stopping above it;
/// every scroll view pads itself by [Dimens.scrollBottomInset] so content
/// clears the bar while still passing behind it as you scroll.
class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell>
    with WidgetsBindingObserver {
  bool _promptChecked = false;

  /// Debounces circle auto-sharing while someone is checking habits off.
  Timer? _circleShare;

  static const _destinations = [
    NavDestination(
      label: 'Home',
      icon: Icons.home_outlined,
      activeIcon: Icons.home_rounded,
    ),
    NavDestination(
      label: 'Habits',
      icon: Icons.bolt_outlined,
      activeIcon: Icons.bolt_rounded,
    ),
    NavDestination(
      label: 'Plan',
      icon: Icons.checklist_outlined,
      activeIcon: Icons.checklist_rounded,
    ),
    NavDestination(
      label: 'Stats',
      icon: Icons.insights_outlined,
      activeIcon: Icons.insights_rounded,
    ),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // After the first frame, so the app is visibly up before anything is
    // offered. A modal that beats the UI onto the screen reads as an ad.
    WidgetsBinding.instance.addPostFrameCallback((_) => _afterFirstFrame());

    // Circle boards update themselves. Every habit change re-sends the day's
    // tally to every joined circle (debounced — a check-off spree is one
    // send), so "share today" is a fact, not a chore someone can forget.
    ref.listenManual(todayHabitsProvider, (previous, next) {
      if (ref.read(authUserIdProvider) == null) return;
      _circleShare?.cancel();
      _circleShare = Timer(const Duration(seconds: 6), () {
        unawaited(ref
            .read(challengeServiceProvider)
            .autoShareAll()
            .catchError((_) {}));
      });
    });
  }

  @override
  void dispose() {
    _circleShare?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Coming back from Android's Settings is a lifecycle resume, not a table
  /// write — and `screenTimeProvider` streams off table writes. Without this,
  /// someone who just granted usage access returns to a screen still claiming
  /// it is off, taps the button again, and is bounced back to Settings.
  /// Re-sample the permission the moment the app is front again, and pull the
  /// first data so the grant visibly *did* something.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    // Re-subscribes the stream, whose load() re-checks the permission.
    ref.invalidate(screenTimeProvider);
    unawaited(() async {
      final service = ref.read(screenTimeServiceProvider);
      if (await service.hasPermission()) {
        await service.collect();
      }
    }());
  }

  Future<void> _afterFirstFrame() async {
    await _maybeOfferRestore();
    // Badge popups are gone by owner decree — earned badges live quietly in
    // Settings › Badges instead of interrupting a launch.
    await _maybeEnableReminders();
    // Heal the reminder schedule on every launch. OEMs quietly drop exact
    // alarms; rescheduling from the source of truth is idempotent and cheap,
    // and it is the difference between "reminders mostly fire" and "fire".
    unawaited(ref
        .read(notificationServiceProvider)
        .rescheduleAll()
        .catchError((_) {}));
    if (mounted) await _maybeOfferDriveRestore();
    if (mounted) await _maybeOfferAutoBackup();
    await _maybeAutoBackup();
    if (mounted) await _maybeOfferFinder();
    // Launch-time catch-up: yesterday's final tally still lands if the app
    // opens inside the server's 03:00 grace window — the "I finished at 11pm
    // and never opened the board" case.
    if (ref.read(authUserIdProvider) != null) {
      unawaited(ref
          .read(challengeServiceProvider)
          .autoShareAll(includeYesterday: DateTime.now().hour < 3)
          .catchError((_) {}));
    }

    unawaited(_maybeAnnounceCircleNews());
    // At most ONE store nudge per launch, and only after every functional
    // prompt has had its turn: an update offer outranks a rating ask.
    if (mounted && !await _maybeOfferUpdate()) {
      if (mounted) await _maybeAskRating();
    }
  }

  /// The champion alert: when fresh circle-category news exists (the
  /// monthly winner post), members get one rich local notification for it.
  /// The announcements provider already filters that category to members,
  /// so any circle row that reaches us here is meant for this user.
  Future<void> _maybeAnnounceCircleNews() async {
    try {
      if (ref.read(authUserIdProvider) == null) return;
      final announcements = await ref.read(announcementsProvider.future);
      final news = announcements.where((a) => a.category == 'circle').toList();
      if (news.isEmpty) return;

      final latest = news.first;
      final settings = ref.read(settingsRepositoryProvider);
      final seen =
          await settings.getString(SettingsKeys.circleNewsLastNotified);
      if (seen == latest.id) return;

      await settings.set(SettingsKeys.circleNewsLastNotified, latest.id);
      await ref
          .read(notificationServiceProvider)
          .showCircleNews(title: latest.title, body: latest.message);
    } catch (e) {
      debugPrint('[notify] circle news check failed: $e');
    }
  }

  /// Play's update flow behind a StayHardy-styled sheet. Returns true when
  /// the sheet was shown. Silent on sideloaded builds — the Play API throws
  /// off-store, and a dev install nagging about updates would be noise.
  Future<bool> _maybeOfferUpdate() async {
    try {
      final settings = ref.read(settingsRepositoryProvider);
      final now = DateTime.now().millisecondsSinceEpoch;
      if (!ReviewRules.shouldCheckUpdate(
        lastCheckMs: await settings.getInt(SettingsKeys.updateCheckLast),
        nowMs: now,
      )) {
        return false;
      }
      await settings.set(SettingsKeys.updateCheckLast, '$now');

      final info = await InAppUpdate.checkForUpdate();
      if (info.updateAvailability != UpdateAvailability.updateAvailable) {
        return false;
      }
      if (!mounted) return false;

      final update = await showModalBottomSheet<bool>(
        context: context,
        backgroundColor: context.aura.bg,
        shape: const RoundedRectangleBorder(
          borderRadius:
              BorderRadius.vertical(top: Radius.circular(Radii.md)),
        ),
        builder: (sheet) {
          final t = sheet.aura;
          final text = Theme.of(sheet).textTheme;
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(Space.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.rocket_launch_rounded,
                          size: Dimens.iconMd, color: t.accent),
                      const SizedBox(width: Space.md),
                      Text('A new StayHardy is out',
                          style: text.titleLarge),
                    ],
                  ),
                  const SizedBox(height: Space.sm),
                  Text(
                    'Update from the Play Store and enjoy the newest '
                    'features — it only takes a moment.',
                    style:
                        text.bodyMedium?.copyWith(color: t.textSecondary),
                  ),
                  const SizedBox(height: Space.lg),
                  AppButton.primary(
                    label: 'UPDATE NOW',
                    onPressed: () => Navigator.pop(sheet, true),
                  ),
                  const SizedBox(height: Space.xs),
                  Center(
                    child: AppButton.text(
                      label: 'LATER',
                      onPressed: () => Navigator.pop(sheet, false),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
      if (update == true) {
        await InAppUpdate.performImmediateUpdate();
      }
      return true;
    } catch (e) {
      debugPrint('[update] check skipped: $e');
      return false;
    }
  }

  /// The Play rating ask, on the owner's terms: three consecutive days of
  /// opens, monthly at most, three lifetime asks. No pre-dialog — Play
  /// policy forbids gating the review prompt behind "do you like us?"
  /// questions, so the request goes straight to Google's own sheet.
  Future<void> _maybeAskRating() async {
    try {
      final settings = ref.read(settingsRepositoryProvider);
      final today = CivilDate.today();
      final streak = ReviewRules.streakAfterOpen(
        lastOpenIso: await settings.getString(SettingsKeys.lastAppOpenDate),
        yesterdayIso: today.addDays(-1).iso,
        todayIso: today.iso,
        streak: await settings.getInt(SettingsKeys.appOpenStreak) ?? 0,
      );
      await settings.set(SettingsKeys.lastAppOpenDate, today.iso);
      await settings.set(SettingsKeys.appOpenStreak, '$streak');

      final now = DateTime.now().millisecondsSinceEpoch;
      final askCount =
          await settings.getInt(SettingsKeys.ratingAskCount) ?? 0;
      if (!ReviewRules.shouldAskReview(
        streak: streak,
        lastAskedMs: await settings.getInt(SettingsKeys.ratingAskedLast),
        askCount: askCount,
        nowMs: now,
      )) {
        return;
      }

      final review = InAppReview.instance;
      if (!await review.isAvailable()) return;

      await settings.set(SettingsKeys.ratingAskedLast, '$now');
      await settings.set(SettingsKeys.ratingAskCount, '${askCount + 1}');
      await review.requestReview();
    } catch (e) {
      debugPrint('[review] ask skipped: $e');
    }
  }

  /// First launch with an empty library: open the habit finder, once.
  ///
  /// A brand-new account has no habits and no idea what to make — the finder
  /// exists for exactly that moment. Closable in one tap, stamped before
  /// showing so a crash can never turn it into a nag.
  Future<void> _maybeOfferFinder() async {
    final settings = ref.read(settingsRepositoryProvider);
    if (await settings.getBool(SettingsKeys.habitFinderOfferDone)) return;

    final habits = await ref.read(habitRepositoryProvider).activeHabits();
    if (habits.isNotEmpty) {
      // They already know what they're building; never offer.
      await settings.set(SettingsKeys.habitFinderOfferDone, 'true');
      return;
    }

    await settings.set(SettingsKeys.habitFinderOfferDone, 'true');
    if (mounted) await HabitFinderScreen.open(context);
  }

  /// Pro, fresh install, backups sitting in Drive, nothing local: offer to
  /// bring it all back — once. The subscription itself restored silently at
  /// sign-in; this is the data half of "everything back like it never left".
  Future<void> _maybeOfferDriveRestore() async {
    try {
      final settings = ref.read(settingsRepositoryProvider);
      if (await settings.getBool(SettingsKeys.driveRestoreOfferDone)) return;
      if (!ref.read(isProProvider)) return;
      if (ref.read(authUserIdProvider) == null) return;

      final habits = await ref.read(habitRepositoryProvider).activeHabits();
      if (habits.isNotEmpty) return;

      final status = await ref.read(backupStatusProvider.future);
      if (!status.driveConnected || status.backups.isEmpty) return;

      await settings.set(SettingsKeys.driveRestoreOfferDone, 'true');
      final newest = status.backups.first;
      if (!mounted) return;

      final restore = await showModalBottomSheet<bool>(
        context: context,
        backgroundColor: context.aura.bg,
        shape: const RoundedRectangleBorder(
          borderRadius:
              BorderRadius.vertical(top: Radius.circular(Radii.md)),
        ),
        builder: (sheet) {
          final t = sheet.aura;
          final text = Theme.of(sheet).textTheme;
          final at =
              DateTime.fromMillisecondsSinceEpoch(newest.createdAt);
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(Space.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Your backup is here', style: text.titleLarge),
                  const SizedBox(height: Space.sm),
                  Text(
                    'Found in your Google Drive: '
                    '${at.day}/${at.month}/${at.year}'
                    '${newest.header == null ? '' : ' · ${newest.header!.counts['habit_logs'] ?? 0} check-ins'}. '
                    'Bring it back and this phone picks up where the last '
                    'one stopped.',
                    style:
                        text.bodyMedium?.copyWith(color: t.textSecondary),
                  ),
                  const SizedBox(height: Space.lg),
                  AppButton.primary(
                    label: 'RESTORE MY DATA',
                    onPressed: () => Navigator.pop(sheet, true),
                  ),
                  const SizedBox(height: Space.xs),
                  Center(
                    child: AppButton.text(
                      label: 'START FRESH',
                      onPressed: () => Navigator.pop(sheet, false),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
      if (restore != true) return;

      final coordinator = ref.read(backupCoordinatorProvider);
      final bytes = await coordinator.downloadFromDrive(newest.fileId);
      await coordinator.restore(bytes, replace: true);
      // Mirror of the backup screen's post-restore invalidation — every
      // derived view rebuilds. Kept in sync with _invalidateEverything there.
      ref
        ..invalidate(backupStatusProvider)
        ..invalidate(todayHabitsProvider)
        ..invalidate(activeHabitsProvider)
        ..invalidate(taskBoardProvider)
        ..invalidate(goalsProvider)
        ..invalidate(statsProvider)
        ..invalidate(weeklyReviewProvider)
        ..invalidate(achievementsProvider)
        ..invalidate(habitCapProvider)
        ..invalidate(libraryStatsProvider);
    } catch (e) {
      debugPrint('[backup] drive restore offer failed: $e');
    }
  }

  /// Pro member, auto backup off, never asked: ask once.
  Future<void> _maybeOfferAutoBackup() async {
    try {
      final settings = ref.read(settingsRepositoryProvider);
      if (await settings.getBool(SettingsKeys.autoBackupOfferDone)) return;
      if (!ref.read(isProProvider)) return;
      if (ref.read(authUserIdProvider) == null) return;
      if (await settings.getBool(SettingsKeys.autoBackupEnabled)) return;

      await settings.set(SettingsKeys.autoBackupOfferDone, 'true');
      if (!mounted) return;

      final enable = await showModalBottomSheet<bool>(
        context: context,
        backgroundColor: context.aura.bg,
        shape: const RoundedRectangleBorder(
          borderRadius:
              BorderRadius.vertical(top: Radius.circular(Radii.md)),
        ),
        builder: (sheet) {
          final t = sheet.aura;
          final text = Theme.of(sheet).textTheme;
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(Space.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.add_to_drive_rounded,
                          size: Dimens.iconMd, color: t.accent),
                      const SizedBox(width: Space.md),
                      Text('Turn on auto backup?',
                          style: text.titleLarge),
                    ],
                  ),
                  const SizedBox(height: Space.sm),
                  Text(
                    'A daily copy of everything, kept in your own Google '
                    'Drive. Without it, this phone is the only place your '
                    'history exists.',
                    style:
                        text.bodyMedium?.copyWith(color: t.textSecondary),
                  ),
                  const SizedBox(height: Space.lg),
                  AppButton.primary(
                    label: 'TURN IT ON',
                    onPressed: () => Navigator.pop(sheet, true),
                  ),
                  const SizedBox(height: Space.xs),
                  Center(
                    child: AppButton.text(
                      label: 'NOT NOW',
                      onPressed: () => Navigator.pop(sheet, false),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
      if (enable != true) return;

      await settings.set(SettingsKeys.autoBackupEnabled, 'true');
      ref.invalidate(autoBackupEnabledProvider);
      final status = await ref.read(backupStatusProvider.future);
      if (!status.driveConnected) {
        await ref.read(backupCoordinatorProvider).connectDrive();
        ref.invalidate(backupStatusProvider);
      }
    } catch (e) {
      debugPrint('[backup] auto backup offer failed: $e');
    }
  }

  /// The Pro auto-backup: one silent Drive copy per day, taken at launch.
  ///
  /// Launch-time rather than a background job because the app is offline-first
  /// — there is nothing time-critical about the copy, and a WorkManager
  /// pipeline is a lot of machinery to save someone opening the app they use
  /// daily anyway. Failures are silent by design: a nag about a failed backup
  /// on every flaky-network launch would get the feature turned off.
  Future<void> _maybeAutoBackup() async {
    try {
      final settings = ref.read(settingsRepositoryProvider);
      if (!await settings.getBool(SettingsKeys.autoBackupEnabled)) return;

      final status = await ref.read(backupStatusProvider.future);
      const day = Duration(days: 1);
      final last = status.lastBackupAt;
      final now = DateTime.now().millisecondsSinceEpoch;
      if (last != null && now - last < day.inMilliseconds) return;

      // Two tiers, one switch: Pro with Drive connected gets the full copy
      // in their own Drive; everyone else gets the rolling on-device copy,
      // last 30 days of history — enough to survive a bad update or a data
      // wipe, gone with an uninstall, exactly as promised.
      if (ref.read(isProProvider) && status.driveConnected) {
        await ref.read(backupCoordinatorProvider).backupNow(kind: 'auto');
      } else {
        await ref.read(backupCoordinatorProvider).backupLocalAuto();
      }
      ref.invalidate(backupStatusProvider);
    } catch (e) {
      debugPrint('[backup] auto backup skipped: $e');
    }
  }

  /// Reminders are on by default — which on Android 13+ means asking for the
  /// permission once, here, after the launch dust has settled. Last in the
  /// sequence so the system dialog never lands on top of the restore offer.
  /// Decline is respected permanently; Settings holds the way back in.
  Future<void> _maybeEnableReminders() async {
    final settings = ref.read(settingsRepositoryProvider);
    if (await settings.getBool(SettingsKeys.notificationAskDone)) return;
    await settings.set(SettingsKeys.notificationAskDone, 'true');
    await ref.read(notificationServiceProvider).requestPermission();
  }

  Future<void> _maybeOfferRestore() async {
    if (_promptChecked) return;
    _promptChecked = true;

    final summary = await ref.read(legacyDataProbeProvider.future);
    if (!mounted || summary == null || !summary.isWorthOffering) return;
    if (!context.mounted) return;
    await RestorePrompt.open(context, summary);
  }

  @override
  Widget build(BuildContext context) {
    final index = ref.watch(shellTabProvider);

    return Scaffold(
      // False, so the nav bar can float over content that scrolls beneath it.
      extendBody: true,
      body: SafeArea(
        bottom: false,
        child: switch (index) {
          0 => const HomeScreen(),
          1 => const HabitsScreen(),
          2 => const PlanScreen(),
          _ => const StatsScreen(),
        },
      ),
      bottomNavigationBar: AuraNavBar(
        destinations: _destinations,
        index: index,
        onSelect: (i) {
          // Replays Home's entrance animations. See [homeRevealProvider].
          if (i == 0) ref.read(homeRevealProvider.notifier).state++;
          ref.read(shellTabProvider.notifier).state = i;
        },
      ),
    );
  }
}
