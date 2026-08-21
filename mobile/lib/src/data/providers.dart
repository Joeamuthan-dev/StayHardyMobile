import 'dart:async';

import 'package:drift/drift.dart' show Variable;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/civil_date.dart';
import '../domain/day_score.dart';
import '../domain/digital_wellbeing.dart';
import '../domain/coach_engine.dart';
import '../domain/challenge_rules.dart';
import '../domain/focus_rules.dart';
import 'database.dart';
import 'calendar_repository.dart';
import 'challenge_service.dart';
import 'community_service.dart';
import 'focus_repository.dart';
import 'freeze_service.dart';
import 'goal_repository.dart';
import 'habit_repository.dart';
import 'insight_repository.dart';
import 'screen_time_service.dart';
import 'settings_repository.dart';
import 'stats_repository.dart';
import 'mood_repository.dart';
import 'wellbeing_repository.dart';
import '../backup/backup_coordinator.dart';
import '../backup/backup_service.dart';
import '../config/app_config.dart';
import '../migration/legacy_source.dart';
import '../migration/migration_service.dart';
import 'task_repository.dart';
import 'notification_service.dart';
import 'achievement_service.dart';
import 'auth_service.dart';
import 'subscription_service.dart';
import 'widget_service.dart';

/// Single database instance for the app's lifetime.
final databaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});

final habitRepositoryProvider = Provider<HabitRepository>((ref) {
  return HabitRepository(ref.watch(databaseProvider));
});

/// Today's habits, kept live by Drift's table-change stream.
final todayHabitsProvider = StreamProvider<List<HabitToday>>((ref) {
  return ref.watch(habitRepositoryProvider).watchToday();
});

/// Every active habit in the user's own order — the whole library, not just
/// what is due today. Backs the reorder screen.
final activeHabitsProvider = StreamProvider<List<Habit>>((ref) {
  return ref.watch(habitRepositoryProvider).watchActiveHabits();
});

/// One habit's detail. Family-keyed, so opening a second habit does not
/// invalidate the first.
final habitDetailProvider =
    FutureProvider.family<HabitDetail, String>((ref, habitId) {
  // Watched so a check-off from the detail screen — or anywhere else —
  // recomputes it.
  ref.watch(todayHabitsProvider);
  return ref.watch(habitRepositoryProvider).detailFor(habitId);
});

/// Today's phone use, bucketed. Null until there is something to say.
///
/// Separate from [wellbeingProvider], which covers the whole 90-day window —
/// the day score needs *today* alone.
///
/// Returns null rather than an empty breakdown in three cases, and the
/// difference matters: null means "no adjustment", an empty breakdown would
/// mean "zero leisure", and rewarding someone for a permission they never
/// granted is as wrong as punishing them for it.
final todayUsageProvider = FutureProvider<UsageBreakdown?>((ref) async {
  final usage = await ref.watch(screenTimeProvider.future);
  if (!usage.granted) return null;

  final overrides = await ref.watch(wellbeingRepositoryProvider).overrides();
  final breakdown =
      DigitalWellbeing.breakdown([usage.today], overrides: overrides);

  // The same evidence floor the Focus Score uses. Below it a day's split
  // swings wildly on a single app switch, and a score must not move on noise.
  if (breakdown.discretionaryMinutes < DigitalWellbeing.minMinutesForScore) {
    return null;
  }
  return breakdown;
});

/// Today's productivity score, for the Home dashboard.
///
/// Composed from the streams that already own each number rather than counted
/// again here, so the score can never disagree with the lists it came from.
final dayScoreProvider = Provider<DayScore>((ref) {
  final habits = ref.watch(todayHabitsProvider).value ?? const [];
  final board = ref.watch(taskBoardProvider).value;

  // Overdue counts as due: it was owed, and the day it was owed on has passed.
  final tasksDue =
      (board?.today.length ?? 0) + (board?.overdue.length ?? 0);

  // `.value` is null while loading as well as when screen time is off, and
  // both mean the same thing here: no deduction yet. A score that dips a
  // second after the screen paints would be worse than one that never dips.
  final usage = ref.watch(todayUsageProvider).value;

  return DayScore(
    habitsDue: habits.length,
    habitsDone: habits.where((h) => h.isDone).length,
    tasksDue: tasksDue + (board?.completed.length ?? 0),
    tasksDone: board?.completed.length ?? 0,
    leisureMinutes: usage?.leisureMinutes,
  );
});

/// Habits completed per day over an arbitrary window, for the activity chart.
final habitActivityProvider =
    StreamProvider.family<List<DayTally>, int>((ref, days) {
  final db = ref.watch(databaseProvider);
  final repo = ref.watch(habitRepositoryProvider);
  return db
      .watchTables('habit_activity_$days', {db.habits, db.habitLogs, db.habitFreezes})
      .asyncMap((_) => repo.recentDays(days: days));
});

/// The last seven days, for the week strip on Home and Habits.
///
/// A stream on the same tables the habit list watches, so checking something
/// off refills today's ring in the same frame the row ticks.
final thisWeekProvider = StreamProvider<List<DayTally>>((ref) {
  final db = ref.watch(databaseProvider);
  final repo = ref.watch(habitRepositoryProvider);
  return db
      .watchTables('week_strip', {db.habits, db.habitLogs, db.habitFreezes})
      .asyncMap((_) => repo.recentDays());
});

final calendarRepositoryProvider = Provider<CalendarRepository>((ref) {
  return CalendarRepository(
    ref.watch(databaseProvider),
    ref.watch(habitRepositoryProvider),
  );
});

/// The month the calendar is showing. A plain state so paging is instant.
final calendarMonthProvider =
    StateProvider<CivilDate>((ref) => CivilDate.today().startOfMonth());

final calendarProvider = StreamProvider<List<CalendarDay>>((ref) {
  return ref
      .watch(calendarRepositoryProvider)
      .watchMonth(ref.watch(calendarMonthProvider));
});

final freezeServiceProvider = Provider<FreezeService>((ref) {
  return FreezeService(
    ref.watch(databaseProvider),
    ref.watch(habitRepositoryProvider),
    ref.watch(settingsRepositoryProvider),
  );
});

/// Banked freezes and recently-saved streaks.
///
/// Read back out of the database rather than carried from the rollover's return
/// value, so the surfacing survives a restart — a user who misses the toast on
/// Tuesday morning still sees on Tuesday evening that their streak was covered.
final streakProtectionProvider = StreamProvider<StreakProtection>((ref) {
  final db = ref.watch(databaseProvider);
  // Saves stay visible for three days, then stop being news.
  final since = CivilDate.today().addDays(-3).iso;

  return db
      .watchTables(
        'streak_protection',
        {db.habits, db.habitFreezes, db.habitStreakState},
      )
      .asyncMap((_) async {
    final balance = await db.customSelect(
      'SELECT COALESCE(SUM(s.freeze_balance), 0) AS b '
      'FROM habit_streak_state s JOIN habits h ON h.id = s.habit_id '
      'WHERE h.deleted_at IS NULL AND h.archived_at IS NULL',
    ).getSingle();

    final saves = await db.customSelect(
      'SELECT f.habit_id AS habit_id, f.freeze_date AS freeze_date, '
      'h.title AS title '
      'FROM habit_freezes f JOIN habits h ON h.id = f.habit_id '
      'WHERE f.deleted_at IS NULL AND h.deleted_at IS NULL '
      'AND h.archived_at IS NULL AND f.freeze_date >= ?1 '
      'ORDER BY f.freeze_date DESC LIMIT 5',
      variables: [Variable<String>(since)],
    ).get();

    return StreakProtection(
      balance: balance.read<int>('b'),
      recentSaves: [
        for (final r in saves)
          FreezeSave(
            habitId: r.read<String>('habit_id'),
            habitTitle: r.read<String>('title'),
            date: r.read<String>('freeze_date'),
          ),
      ],
    );
  });
});

final focusRepositoryProvider = Provider<FocusRepository>((ref) {
  return FocusRepository(ref.watch(databaseProvider));
});

/// The focus session in flight, or null.
///
/// Carries timestamps, not a countdown — the timer screen drives its own
/// repaint. See [FocusRepository.watchActive].
final activeFocusProvider = StreamProvider<FocusRun?>((ref) {
  return ref.watch(focusRepositoryProvider).watchActive();
});

final focusSummaryProvider = StreamProvider<FocusSummary>((ref) {
  return ref.watch(focusRepositoryProvider).watchSummary();
});

/// How many focus blocks a free user has left today.
///
/// Derived rather than stored: [FocusSummary.todaySessions] already counts
/// finished, undeleted sessions for the local date, so the allowance resets at
/// midnight on its own and cannot drift from what the history shows.
final focusQuotaProvider = Provider<FocusQuota>((ref) {
  final isPro = ref.watch(isProProvider);
  final summary = ref.watch(focusSummaryProvider).value;
  return FocusQuota(
    isPro: isPro,
    usedToday: summary?.todaySessions ?? 0,
  );
});

/// Minutes focused per day over an arbitrary window, for the Stats chart.
///
/// Family-keyed on the day count so the chart follows the range selector at the
/// top of Stats. A fixed fortnight sat under a "1Y" selection and quietly
/// ignored it, which makes the selector look broken.
final focusHistoryProvider =
    StreamProvider.family<List<int>, int>((ref, days) {
  final db = ref.watch(databaseProvider);
  final repo = ref.watch(focusRepositoryProvider);
  return db
      .watchTables('focus_history_$days', {db.focusSessions})
      .asyncMap((_) => repo.dailyMinutes(days: days));
});

final goalRepositoryProvider = Provider<GoalRepository>((ref) {
  return GoalRepository(ref.watch(databaseProvider));
});

final goalsProvider = StreamProvider<List<GoalView>>((ref) {
  return ref.watch(goalRepositoryProvider).watchGoals();
});

final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  return TaskRepository(ref.watch(databaseProvider));
});

final taskBoardProvider = StreamProvider<TaskBoard>((ref) {
  return ref.watch(taskRepositoryProvider).watchBoard();
});

final achievementServiceProvider = Provider<AchievementService>((ref) {
  return AchievementService(
    ref.watch(databaseProvider),
    ref.watch(habitRepositoryProvider),
    ref.watch(settingsRepositoryProvider),
  );
});

final achievementsProvider = StreamProvider<AchievementsView>((ref) {
  return ref.watch(achievementServiceProvider).watch();
});

final insightRepositoryProvider = Provider<InsightRepository>((ref) {
  return InsightRepository(
    ref.watch(databaseProvider),
    ref.watch(habitRepositoryProvider),
    ref.watch(goalRepositoryProvider),
  );
});

final weeklyReviewProvider = StreamProvider<WeeklyReview>((ref) {
  return ref.watch(insightRepositoryProvider).watch();
});

final challengeServiceProvider = Provider<ChallengeService>((ref) {
  return ChallengeService(
    ref.watch(databaseProvider),
    ref.watch(habitRepositoryProvider),
  );
});

/// Circles the signed-in user belongs to.
///
/// A future rather than a stream: it is a network round-trip, and nothing in
/// the local database can change the answer.
final myCirclesProvider = FutureProvider<List<Circle>>((ref) {
  ref.watch(authUserIdProvider);
  return ref.watch(challengeServiceProvider).myCircles();
});

final circleStandingsProvider =
    FutureProvider.family<List<CircleStanding>, String>((ref, cohortId) {
  return ref.watch(challengeServiceProvider).standings(cohortId);
});

/// The global StayHardy Circle board — top ten plus the caller's own row,
/// ranked by the server. Nothing here recomputes a rank.
final globalStandingsProvider = FutureProvider<List<GlobalStanding>>((ref) {
  ref.watch(authUserIdProvider);
  return ref.watch(challengeServiceProvider).globalStandings(limit: 10);
});

/// Finished months that have a snapshotted board, newest first.
final hallOfFameMonthsProvider = FutureProvider<List<String>>((ref) {
  ref.watch(authUserIdProvider);
  return ref.watch(challengeServiceProvider).hallOfFameMonths();
});

/// One finished month's board ('YYYY-MM-DD' of the month's first day).
final hallOfFameForMonthProvider =
    FutureProvider.family<List<HallOfFameEntry>, String>((ref, month) {
  ref.watch(authUserIdProvider);
  return ref.watch(challengeServiceProvider).hallOfFame(monthStart: month);
});

/// A circle's invite code — non-null only for its creator (RLS enforced).
final inviteCodeProvider =
    FutureProvider.family<String?, String>((ref, cohortId) {
  ref.watch(authUserIdProvider);
  return ref.watch(challengeServiceProvider).inviteCode(cohortId);
});

/// Whether the Pro daily Drive auto-backup is switched on.
/// The free tier's on-device daily copy.
final localAutoBackupEnabledProvider = FutureProvider<bool>((ref) {
  return ref
      .watch(settingsRepositoryProvider)
      .getBool(SettingsKeys.localAutoBackupEnabled);
});

final autoBackupEnabledProvider = FutureProvider<bool>((ref) {
  return ref
      .watch(settingsRepositoryProvider)
      .getBool(SettingsKeys.autoBackupEnabled);
});

/// Whether the one-time StayHardy Circle invitation card was dismissed.
final globalPromptDismissedProvider = FutureProvider<bool>((ref) {
  return ref
      .watch(settingsRepositoryProvider)
      .getBool(SettingsKeys.globalCirclePromptDismissed);
});

/// Today's tally, so the check-in button can show what would be sent.
final challengeTallyProvider = FutureProvider<ChallengeTally>((ref) {
  // Recomputes whenever a habit is checked off.
  ref.watch(todayHabitsProvider);
  return ref.watch(challengeServiceProvider).tallyFor(CivilDate.today());
});

final communityServiceProvider = Provider<CommunityService>((ref) {
  return CommunityService(ref.watch(settingsRepositoryProvider));
});

final announcementsProvider = FutureProvider<List<Announcement>>((ref) async {
  final all = await ref.watch(communityServiceProvider).announcements();
  // Circle-category news (the monthly champion) belongs to circle members
  // only — owner's ruling. Everyone else never sees it existed.
  final circles = await ref.watch(myCirclesProvider.future);
  final inGlobal = circles.any((c) => c.isGlobal);
  return inGlobal
      ? all
      : [for (final a in all) if (a.category != 'circle') a];
});

/// Unread announcement count, for the Settings badge.
final unreadAnnouncementsProvider = FutureProvider<int>((ref) async {
  // Depends on the list so marking them seen refreshes the badge.
  await ref.watch(announcementsProvider.future);
  return ref.watch(communityServiceProvider).unreadCount();
});

final myTicketsProvider = FutureProvider<List<FeedbackTicket>>((ref) async {
  final userId = ref.watch(authUserIdProvider);
  if (userId == null) return const [];
  return ref.watch(communityServiceProvider).myTickets(userId);
});

final backupServiceProvider = Provider<BackupService>((ref) {
  return BackupService(ref.watch(databaseProvider));
});

final backupCoordinatorProvider = Provider<BackupCoordinator>((ref) {
  return BackupCoordinator(
    ref.watch(backupServiceProvider),
    ref.watch(settingsRepositoryProvider),
  );
});

/// Drive connection state and the backups in it.
///
/// A future rather than a stream: it costs a network round trip, and nothing in
/// the local database can change the answer.
final backupStatusProvider = FutureProvider<BackupStatus>((ref) {
  return ref.watch(backupCoordinatorProvider).status();
});

final screenTimeServiceProvider = Provider<ScreenTimeService>((ref) {
  return ScreenTimeService(
    ref.watch(databaseProvider),
    ref.watch(habitRepositoryProvider),
    ref.watch(settingsRepositoryProvider),
  );
});

final screenTimeProvider = StreamProvider<ScreenTimeView>((ref) {
  return ref.watch(screenTimeServiceProvider).watch();
});

final statsRepositoryProvider = Provider<StatsRepository>((ref) {
  return StatsRepository(
    ref.watch(databaseProvider),
    ref.watch(habitRepositoryProvider),
  );
});

/// Selected range on the Stats screen.
final statsRangeProvider =
    StateProvider<StatsRange>((ref) => StatsRange.days30);

final statsProvider = StreamProvider<StatsView>((ref) {
  return ref.watch(statsRepositoryProvider).watch(ref.watch(statsRangeProvider));
});

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  return SettingsRepository(ref.watch(databaseProvider));
});

/// Theme mode, persisted to the settings table.
///
/// Starts on [ThemeMode.system] and corrects itself once the stored value
/// loads, so the first frame never blocks on a disk read.
class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier(this._repo) : super(ThemeMode.system) {
    _load();
  }

  final SettingsRepository _repo;

  Future<void> _load() async => state = await _repo.themeMode();

  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    await _repo.setThemeMode(mode);
  }
}

final themeModeProvider =
    StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier(ref.watch(settingsRepositoryProvider));
});

/// Row counts for the Settings "your data" section.
class LibraryStats {
  const LibraryStats({
    required this.habits,
    required this.logs,
    required this.tasks,
    required this.goals,
  });

  final int habits;
  final int logs;
  final int tasks;
  final int goals;
}

final libraryStatsProvider = FutureProvider<LibraryStats>((ref) async {
  final db = ref.watch(databaseProvider);

  // Table names are fixed literals rather than interpolated, so this can never
  // become a string-built query even by accident.
  Future<int> count(String sql) async {
    final r = await db.customSelect(sql).getSingle();
    return r.read<int>('c');
  }

  return LibraryStats(
    habits: await count(
        'SELECT COUNT(*) AS c FROM habits WHERE deleted_at IS NULL'),
    logs: await count(
        'SELECT COUNT(*) AS c FROM habit_logs WHERE deleted_at IS NULL'),
    tasks: await count(
        'SELECT COUNT(*) AS c FROM tasks WHERE deleted_at IS NULL'),
    goals: await count(
        'SELECT COUNT(*) AS c FROM goals WHERE deleted_at IS NULL'),
  );
});

/// Whether the user has Pro.
///
/// Backed by the settings table for now; RevenueCat becomes the authority when
/// billing lands, with the DB value kept as the fallback for admin-granted and
/// lifetime users — the same hybrid the Capacitor build used, which is why
/// nothing else reads a purchase state directly.
class IsProNotifier extends StateNotifier<bool> {
  IsProNotifier(this._repo, this._billing, this._auth) : super(false) {
    refresh();
  }

  final SettingsRepository _repo;
  final SubscriptionService _billing;
  final AuthService _auth;

  /// Ask the server and the store, then persist the answer.
  ///
  /// Three sources, in the order they are trusted:
  ///
  /// * `users.is_pro` on the server — the one place every route to Pro
  ///   converges (store subscriptions via the RevenueCat webhook, Razorpay
  ///   lifetime, admin grants). Unknown when offline, never false-by-default.
  /// * RevenueCat — authoritative about whether a *store subscription* is
  ///   currently active.
  /// * The local settings flag — a cache of the last confirmed answer, so a
  ///   launch with no connection does not demote a paying user.
  ///
  /// The local flag cannot lead: on a fresh 2.0 install it is false for
  /// everyone, which is exactly how an existing Pro user got shown as Basic.
  Future<void> refresh() async {
    final cached = await _repo.getBool(SettingsKeys.isPro);
    final server = await _auth.fetchServerIsPro();

    // Server wins when it answered; the cache only covers its silence.
    final databaseSaysPro = server ?? cached;
    final status = await _billing.resolve(databaseSaysPro: databaseSaysPro);

    // A server grant is never revoked by an expired store record. Lifetime and
    // admin-granted users have no live subscription by definition, and the
    // webhook already clears `is_pro` when a real subscription lapses.
    final isPro = status.isPro || server == true;
    state = isPro;

    // Cache only what was actually established. When both the server and the
    // store stayed silent, the previous answer stands rather than being
    // overwritten with a guess.
    final settled = server != null ||
        status.source == ProSource.revenueCatActive;
    if (settled && isPro != cached) {
      await _repo.set(SettingsKeys.isPro, isPro.toString());
    }
  }

  Future<void> setPro(bool value) async {
    state = value;
    await _repo.set(SettingsKeys.isPro, value.toString());
  }
}

/// Pro members start with Drive backup switched on — once, and only once.
///
/// Returns whether anything changed, so the caller knows to refresh the toggle.
///
/// The [SettingsKeys.autoBackupDefaulted] marker is what makes this a default
/// rather than a policy: someone who deliberately turns it off must stay off
/// through every subsequent launch, sign-in and Pro refresh.
///
/// Note this sets the *intention*. The switch still shows off until Drive is
/// actually connected, because that is the truth — what this buys is the
/// prompt to connect, in front of the people it protects.
Future<bool> applyProBackupDefault(SettingsRepository repo, bool isPro) async {
  if (!isPro) return false;
  if (await repo.getBool(SettingsKeys.autoBackupDefaulted)) return false;
  await repo.set(SettingsKeys.autoBackupDefaulted, 'true');
  await repo.set(SettingsKeys.autoBackupEnabled, 'true');
  return true;
}

final subscriptionServiceProvider = Provider<SubscriptionService>((ref) {
  return SubscriptionService();
});

final isProProvider = StateNotifierProvider<IsProNotifier, bool>((ref) {
  return IsProNotifier(
    ref.watch(settingsRepositoryProvider),
    ref.watch(subscriptionServiceProvider),
    ref.watch(authServiceProvider),
  );
});

final proPlansProvider = FutureProvider<List<ProPlan>>((ref) {
  return ref.watch(subscriptionServiceProvider).plans();
});

/// Which plan an active subscriber is on. Null for free members, and for Pro
/// that came from a database grant rather than the store.
final activePlanProvider = FutureProvider<ProDetail?>((ref) {
  // Re-resolves whenever Pro does, so a fresh purchase or restore is reflected
  // without the user having to leave and re-enter Settings.
  ref.watch(isProProvider);
  return ref.watch(subscriptionServiceProvider).activePlan();
});

/// The tip products, for Settings › Tip the developer.
final tipPlansProvider = FutureProvider<List<ProPlan>>((ref) {
  return ref.watch(subscriptionServiceProvider).tips();
});

/// Live habit-cap standing. Recomputes whenever habits change.
final habitCapProvider = StreamProvider<HabitCap>((ref) {
  final db = ref.watch(databaseProvider);
  final repo = ref.watch(habitRepositoryProvider);
  final isPro = ref.watch(isProProvider);

  return db
      .watchTables('habit_cap', {db.habits})
      .asyncMap((_) => repo.capStatus(isPro: isPro));
});

/// The signed-in Supabase user id, or null in local-only mode.
///
/// A single override point: the auth layer sets this, and everything that needs
/// an identity reads it from here rather than reaching for a Supabase client.
final authUserIdProvider = StateProvider<String?>((ref) => null);

/// Null until both a backend and a signed-in user exist.
final migrationServiceProvider = Provider<MigrationService?>((ref) {
  if (!AppConfig.hasBackend) return null;
  final userId = ref.watch(authUserIdProvider);
  if (userId == null) return null;

  return MigrationService(
    db: ref.watch(databaseProvider),
    source: ref.watch(legacySourceProvider)!,
    authUserId: userId,
  );
});

final authServiceProvider = Provider<AuthService>((ref) => AuthService());

/// Reads the legacy Supabase tables as the signed-in user. Null until both a
/// backend and a session exist.
final legacySourceProvider = Provider<LegacySource?>((ref) {
  if (!AppConfig.hasBackend) return null;
  final userId = ref.watch(authUserIdProvider);
  if (userId == null) return null;
  return SupabaseLegacySource(Supabase.instance.client, userId);
});

/// Drives [BootGate]. Reports completed in local-only mode so a build with no
/// backend never sits on the migration screen.
final migrationStatusProvider = FutureProvider<MigrationState>((ref) async {
  final service = ref.watch(migrationServiceProvider);
  if (service == null) return MigrationState.completed;
  return (await service.load()).state;
});

final widgetServiceProvider = Provider<WidgetService>((ref) {
  return WidgetService(
    ref.watch(habitRepositoryProvider),
    ref.watch(taskRepositoryProvider),
  );
});

/// Keeps the home-screen widgets in step with the database.
///
/// Wired as a listener rather than called from the repositories: a repository
/// that knows about widgets is a repository that cannot be used headlessly, and
/// a widget push must never be able to fail a check-in.
void startWidgetSync(ProviderContainer container) {
  final service = container.read(widgetServiceProvider);
  void push(Object? previous, Object? next) => unawaited(service.sync());

  container.listen(todayHabitsProvider, push, fireImmediately: true);
  container.listen(taskBoardProvider, push);
}

/// Rebuilds scheduled reminders whenever the habit set changes.
///
/// Habits are the only thing reminders depend on, so this listens to that
/// stream rather than being called from every mutation site — one place that
/// cannot be forgotten when a new edit path is added.
void startReminderSync(ProviderContainer container) {
  final service = container.read(notificationServiceProvider);
  unawaited(service.init());
  container.listen(
    todayHabitsProvider,
    (previous, next) => unawaited(service.rescheduleAll()),
    fireImmediately: true,
  );
}

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService(ref.watch(databaseProvider));
});

/// Runs the streak-freeze rollover at launch and on every resume.
///
/// Resume matters as much as launch: a phone that is never swiped away keeps
/// the process alive for weeks, and a rollover that only fired at cold start
/// would quietly stop granting freezes for exactly the users who open the app
/// most. The service itself is the guard against running twice in a day, so
/// firing on every resume is cheap and cannot double-grant.
///
/// Returns the listener's disposer. `main` discards it deliberately — the
/// listener is meant to outlive every screen and die with the process.
VoidCallback startStreakMaintenance(ProviderContainer container) {
  final service = container.read(freezeServiceProvider);
  unawaited(service.runRollover());

  final listener = AppLifecycleListener(
    onResume: () => unawaited(service.runRollover()),
  );
  return listener.dispose;
}

/// Settles focus sessions the OS killed mid-flight.
///
/// Runs once at launch, before any screen can observe a half-open session. A
/// session left open would otherwise block every later one and sit on the Home
/// screen as a timer that never ends.
void startFocusRecovery(ProviderContainer container) {
  unawaited(container.read(focusRepositoryProvider).recoverOrphans());
}

/// Live reminder health, for the Settings diagnostics row.
final reminderDiagnosticsProvider =
    FutureProvider<ReminderDiagnostics>((ref) {
  return ref.watch(notificationServiceProvider).diagnostics();
});

/// Whether first-run onboarding has been completed.
///
/// Migrated users are treated as complete: someone arriving with two years of
/// habits must not be asked to pick starter habits.
final onboardingCompleteProvider = FutureProvider<bool>((ref) async {
  final repo = ref.watch(settingsRepositoryProvider);
  if (await repo.getBool(SettingsKeys.onboardingComplete)) return true;

  final db = ref.watch(databaseProvider);
  final row = await db
      .customSelect(
          'SELECT COUNT(*) AS c FROM habits WHERE deleted_at IS NULL')
      .getSingle();
  return row.read<int>('c') > 0;
});

/// App version string, injected at build time rather than hardcoded per screen.
/// The INSTALLED build's version, read from the package itself — so it is
/// always the truth of whatever the store delivered, never a hardcode that
/// drifts. Placeholder until the async read lands, which is within the
/// first frame.
final appVersionProvider = Provider<String>((ref) {
  return ref.watch(_packageVersionProvider).value ?? '…';
});

final _packageVersionProvider = FutureProvider<String>((ref) async {
  final info = await PackageInfo.fromPlatform();
  return '${info.version} (${info.buildNumber})';
});

/// The date the UI treats as "today", so a screen can be pointed at another day
/// without the repository knowing about navigation.
final selectedDateProvider = Provider<CivilDate>((ref) => CivilDate.today());

// -----------------------------------------------------------------------------
// Mood
// -----------------------------------------------------------------------------

final moodRepositoryProvider = Provider<MoodRepository>((ref) {
  return MoodRepository(
    ref.watch(databaseProvider),
    ref.watch(habitRepositoryProvider),
  );
});

/// Whether mood tracking is switched on, and when it prompts.
///
/// A notifier rather than a bare future so Settings can flip it and every
/// screen that shows a mood prompt reacts in the same frame.
class MoodSettings {
  const MoodSettings({required this.enabled, this.reminder});

  final bool enabled;

  /// 'HH:mm', or null for enabled-but-silent.
  final String? reminder;

  static const off = MoodSettings(enabled: false);
}

class MoodSettingsNotifier extends StateNotifier<MoodSettings> {
  MoodSettingsNotifier(this._repo, this._notifications)
      : super(MoodSettings.off) {
    _load();
  }

  final SettingsRepository _repo;
  final NotificationService _notifications;

  Future<void> _load() async {
    final reminder = await _repo.getString(SettingsKeys.moodReminderTime);
    state = MoodSettings(
      enabled: await _repo.getBool(SettingsKeys.moodEnabled),
      // A cleared reminder is stored as '' — read it back as "none", not as
      // a time named empty-string.
      reminder: reminder == null || reminder.isEmpty ? null : reminder,
    );
  }

  Future<void> setEnabled(bool value) async {
    state = MoodSettings(enabled: value, reminder: state.reminder);
    await _repo.set(SettingsKeys.moodEnabled, value.toString());
    await _sync();
  }

  Future<void> setReminder(String? hhmm) async {
    state = MoodSettings(enabled: state.enabled, reminder: hhmm);
    await _repo.set(SettingsKeys.moodReminderTime, hhmm ?? '');
    await _sync();
  }

  /// Schedules or cancels the daily prompt.
  ///
  /// Cancelled whenever tracking is off *or* no time is set — a reminder that
  /// outlives the feature being switched off is the most annoying bug a
  /// notification can have.
  Future<void> _sync() async {
    if (!state.enabled || state.reminder == null || state.reminder!.isEmpty) {
      await _notifications.cancelMoodReminder();
      return;
    }
    await _notifications.scheduleMoodReminder(state.reminder!);
  }
}

final moodSettingsProvider =
    StateNotifierProvider<MoodSettingsNotifier, MoodSettings>((ref) {
  return MoodSettingsNotifier(
    ref.watch(settingsRepositoryProvider),
    ref.watch(notificationServiceProvider),
  );
});

/// Mood over the range the Stats page is showing.
///
/// A family on the range rather than a fixed window, so the card cannot
/// describe 90 days while the chips say 30 — and so the 1Y chip has a year of
/// data to draw instead of a hard 90-day ceiling.
final moodProvider = StreamProvider.family<MoodView, int>((ref, days) {
  final enabled = ref.watch(moodSettingsProvider).enabled;
  return ref
      .watch(moodRepositoryProvider)
      .watch(enabled: enabled, days: days);
});

// -----------------------------------------------------------------------------
// Digital wellbeing and the coach
// -----------------------------------------------------------------------------

final wellbeingRepositoryProvider = Provider<WellbeingRepository>((ref) {
  return WellbeingRepository(ref.watch(settingsRepositoryProvider));
});

/// The category breakdown, Focus Score and trend.
///
/// Derived from [screenTimeProvider] rather than reading the usage tables
/// again, so the Stats tab and the Screen Time screen can never disagree about
/// what today's total was.
final wellbeingProvider = FutureProvider<WellbeingView>((ref) async {
  final usage = await ref.watch(screenTimeProvider.future);
  return ref.watch(wellbeingRepositoryProvider).build(usage);
});

/// Everything the coach is allowed to look at, assembled from the repositories
/// that already own each number.
final coachSnapshotProvider = FutureProvider<CoachSnapshot>((ref) async {
  final stats = await ref.watch(statsProvider.future);
  final wellbeing = await ref.watch(wellbeingProvider.future);
  final habits = await ref.watch(todayHabitsProvider.future);

  // Tolerated failures: the coach is worth showing without a weekly review or
  // a task board, and a thrown provider here would blank the whole tab.
  final review = await ref.watch(weeklyReviewProvider.future).then<WeeklyReview?>(
        (v) => v,
        onError: (_, _) => null,
      );
  final tasks = await ref.watch(taskBoardProvider.future).then<TaskBoard?>(
        (v) => v,
        onError: (_, _) => null,
      );
  final usage = await ref.watch(screenTimeProvider.future);

  return WellbeingRepository.snapshot(
    stats: stats,
    review: review?.input,
    tasks: tasks,
    wellbeing: wellbeing,
    correlation: usage.correlation,
    habitsToday: habits.length,
    habitsDoneToday: habits.where((h) => h.isDone).length,
    today: habits,
  );
});

/// One turn in the coach conversation.
class CoachMessage {
  const CoachMessage.user(this.text)
      : reply = null,
        fromUser = true;
  const CoachMessage.coach(this.reply)
      : text = null,
        fromUser = false;

  final String? text;
  final CoachReply? reply;
  final bool fromUser;
}

/// The coach transcript.
///
/// Deliberately **not** persisted. It is derived entirely from data that is
/// already stored, so replaying it after a restart would show yesterday's
/// numbers as though they were today's — and a stale answer about your own
/// life is worse than no answer.
class CoachChat extends StateNotifier<List<CoachMessage>> {
  CoachChat() : super(const []);

  bool get isEmpty => state.isEmpty;

  void ask(CoachTopic topic, CoachSnapshot snapshot) {
    state = [
      ...state,
      CoachMessage.user(topic.prompt),
      CoachMessage.coach(CoachEngine.answer(topic, snapshot)),
    ];
  }

  void askText(String text, CoachSnapshot snapshot) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    state = [
      ...state,
      CoachMessage.user(trimmed),
      CoachMessage.coach(CoachEngine.converse(trimmed, snapshot)),
    ];
  }

  void clear() => state = const [];
}

final coachChatProvider =
    StateNotifierProvider<CoachChat, List<CoachMessage>>((ref) {
  return CoachChat();
});

// -----------------------------------------------------------------------------
// Navigation state
// -----------------------------------------------------------------------------

/// Bumped every time Home is opened.
///
/// The shell keeps every tab alive in an `IndexedStack`, so Home's widgets are
/// never rebuilt from scratch and its entrance animations would play exactly
/// once per app launch. Keying the animated pieces on this counter restarts
/// them, which is what makes the page feel alive on every visit rather than
/// only the first.
final homeRevealProvider = StateProvider<int>((ref) => 0);

/// The selected bottom-tab index.
///
/// Held in a provider rather than in `AppShell`'s State so that a card on Home
/// can send the user to the Plan tab without either screen holding a reference
/// to the other. Deep links and notification taps land here too.
final shellTabProvider = StateProvider<int>((ref) => 0);

/// The selected tab inside the Plan screen: 0 = Tasks, 1 = Goals.
final planTabProvider = StateProvider<int>((ref) => 0);

/// The selected tab inside the Stats screen: 0 = Progress, 1 = Screen time,
/// 2 = Coach.
final statsTabProvider = StateProvider<int>((ref) => 0);
