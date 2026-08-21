import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../domain/app_categories.dart';
import '../domain/coach_engine.dart';
import '../domain/digital_wellbeing.dart';
import '../domain/insight_rules.dart';
import '../domain/screen_time_rules.dart';
import 'screen_time_service.dart';
import 'habit_repository.dart';
import 'settings_repository.dart';
import 'stats_repository.dart';
import 'task_repository.dart';

/// Everything the Insight tab of Stats renders.
class WellbeingView {
  const WellbeingView({
    required this.granted,
    required this.breakdown,
    required this.score,
    required this.daily,
    required this.trend,
    required this.overrides,
    required this.uncategorised,
  });

  final bool granted;
  final UsageBreakdown breakdown;
  final FocusScore score;

  /// Oldest first, one per day. Days below the evidence floor carry a null
  /// score and are drawn as gaps.
  final List<DailyScore> daily;

  /// Change against the first half of the period, or null when unknowable.
  final int? trend;

  /// package → category id, as set by the user.
  final Map<String, String> overrides;

  /// Apps the taxonomy guessed at, biggest first — what the "is this right?"
  /// prompt offers to fix.
  final List<AppUsage> uncategorised;

  static const empty = WellbeingView(
    granted: false,
    breakdown: UsageBreakdown.empty,
    score: FocusScore.unknown,
    daily: [],
    trend: null,
    overrides: {},
    uncategorised: [],
  );
}

/// Assembles the wellbeing view and the coach's snapshot.
///
/// Deliberately a thin composer over things that already exist —
/// [ScreenTimeService] owns collection, [StatsRepository] owns consistency, and
/// [InsightRepository] owns the weekly shape. Recomputing any of that here
/// would give the app two answers to the same question.
class WellbeingRepository {
  WellbeingRepository(this._settings);

  final SettingsRepository _settings;

  /// How many apps to offer for correction at once. A list of eighty guesses
  /// is not a prompt, it is a chore nobody finishes.
  static const maxCorrectionPrompts = 12;

  Future<Map<String, String>> overrides() async {
    final raw = await _settings.getString(SettingsKeys.usageOverrides);
    if (raw == null || raw.isEmpty) return const {};
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return const {};
      return {
        for (final e in decoded.entries)
          if (e.value is String) e.key.toString(): e.value as String,
      };
    } on FormatException catch (e) {
      // A corrupt blob must not take the whole screen down with it: the user
      // loses their corrections, which is recoverable, rather than the tab.
      debugPrint('[wellbeing] override blob unreadable, ignoring: $e');
      return const {};
    }
  }

  Future<void> setOverride(String packageName, String categoryId) async {
    final current = Map<String, String>.from(await overrides());
    current[packageName] = categoryId;
    await _settings.set(SettingsKeys.usageOverrides, jsonEncode(current));
  }

  Future<void> clearOverride(String packageName) async {
    final current = Map<String, String>.from(await overrides());
    current.remove(packageName);
    await _settings.set(SettingsKeys.usageOverrides, jsonEncode(current));
  }

  /// Build the view from an already-loaded screen-time view.
  ///
  /// Takes [ScreenTimeView] rather than fetching it so the Stats screen and the
  /// Screen Time screen share one read of the usage tables.
  Future<WellbeingView> build(ScreenTimeView usage) async {
    if (!usage.granted) return WellbeingView.empty;

    final map = await overrides();
    // `recent` is the historical window; today is still accumulating and is
    // included because a person looking at this at 9pm expects their day to
    // count.
    final days = <ScreenDay>[
      ...usage.recent.where((d) => !d.isPartial),
      usage.today,
    ];

    final breakdown = DigitalWellbeing.breakdown(days, overrides: map);
    final daily = DigitalWellbeing.daily(days, overrides: map);

    final guesses = <AppUsage>[];
    for (final c in breakdown.categories) {
      for (final app in c.apps) {
        if (AppTaxonomy.isGuess(app.packageName, overrides: map)) {
          guesses.add(app);
        }
      }
    }
    guesses.sort((a, b) => b.foregroundMs.compareTo(a.foregroundMs));

    return WellbeingView(
      granted: true,
      breakdown: breakdown,
      score: DigitalWellbeing.score(breakdown),
      daily: daily,
      trend: DigitalWellbeing.trend(daily),
      overrides: map,
      uncategorised: guesses.take(maxCorrectionPrompts).toList(),
    );
  }

  /// Everything the coach is allowed to see, in one value.
  static CoachSnapshot snapshot({
    required StatsView stats,
    required ReviewInput? review,
    required TaskBoard? tasks,
    required WellbeingView wellbeing,
    required ScreenTimeCorrelation? correlation,
    required int habitsToday,
    required int habitsDoneToday,
    List<HabitToday> today = const [],
  }) {
    HabitWeek? weakest, strongest;
    if (review != null) {
      for (final h in review.habits) {
        // Habits with nothing scheduled this week are not weak, they are
        // simply not due — including them would nominate a Sunday-only habit
        // as the problem every Monday.
        if (h.scheduled == 0) continue;
        final rate = h.completed / h.scheduled;
        if (weakest == null ||
            rate < (weakest.completed / weakest.scheduled)) {
          weakest = h;
        }
        if (strongest == null ||
            rate > (strongest.completed / strongest.scheduled)) {
          strongest = h;
        }
      }
    }

    var goalsBehind = 0;
    for (final g in review?.goals ?? const <GoalWeek>[]) {
      final elapsed = g.elapsedFraction;
      if (elapsed == null) continue;
      if (g.progress / 100 < elapsed - 0.1) goalsBehind++;
    }

    // Per-habit detail, so the advisor can name a specific habit and place it
    // in a routine rather than only talking in averages.
    final rateOf = <String, HabitWeek>{
      for (final h in review?.habits ?? const <HabitWeek>[]) h.title: h,
    };
    final coachHabits = [
      for (final h in today)
        CoachHabit(
          title: h.habit.title,
          category: h.habit.category,
          rate: () {
            final w = rateOf[h.habit.title];
            if (w == null || w.scheduled == 0) return 0;
            return ((w.completed / w.scheduled) * 100).round();
          }(),
          streak: h.streak,
          dueToday: true,
          doneToday: h.isDone,
          reminder: h.habit.reminderTime,
        ),
    ];

    final b = wellbeing.breakdown;
    final days = b.days == 0 ? 1 : b.days;
    final leisure = b.dominantLeisure;

    return CoachSnapshot(
      habits: coachHabits,
      leisureMinutesPerDay: b.leisureMinutes ~/ days,
      investedMinutesPerDay: b.investedMinutes ~/ days,
      topLeisureApp: leisure?.topApp?.displayName,
      topLeisureCategory: leisure?.category.label,
      habitRate: stats.habitRate,
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      habitsToday: habitsToday,
      habitsDoneToday: habitsDoneToday,
      trackedDays: stats.days.where((d) => d.scheduled > 0).length,
      bestWeekday: stats.bestWeekday,
      worstWeekday: _worstWeekday(review),
      weakestHabit: weakest == null || weakest.completed == weakest.scheduled
          ? null
          : weakest.title,
      weakestHabitRate: weakest == null || weakest.scheduled == 0
          ? 0
          : ((weakest.completed / weakest.scheduled) * 100).round(),
      strongestHabit: strongest?.title,
      overdueTasks: tasks?.overdue.length ?? 0,
      dueTodayTasks: tasks?.today.length ?? 0,
      activeGoals: review?.goals.length ?? 0,
      goalsBehind: goalsBehind,
      focusMinutesWeek: review?.focusMinutes ?? 0,
      breakdown: wellbeing.breakdown,
      focusScore: wellbeing.score,
      scoreTrend: wellbeing.trend,
      correlation: correlation,
      screenTimeGranted: wellbeing.granted,
    );
  }

  /// The weekday with the lowest completion rate, or null when no day is
  /// meaningfully worse than the rest.
  ///
  /// Uses the same "must be materially different to be worth stating" rule the
  /// rest of the insight layer holds to — naming a day that is two points below
  /// average is astrology.
  static String? _worstWeekday(ReviewInput? review) {
    if (review == null) return null;
    const names = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
      'Saturday',
    ];

    var worstIndex = -1;
    var worstRate = 2.0;
    var totalScheduled = 0, totalCompleted = 0;

    for (var i = 0; i < 7; i++) {
      final scheduled = review.weekdayScheduled[i];
      final completed = review.weekdayCompleted[i];
      totalScheduled += scheduled;
      totalCompleted += completed;
      // Three occurrences is three weeks of that weekday — below that a single
      // bad Tuesday would win.
      if (scheduled < 3) continue;
      final rate = completed / scheduled;
      if (rate < worstRate) {
        worstRate = rate;
        worstIndex = i;
      }
    }

    if (worstIndex < 0 || totalScheduled == 0) return null;
    final average = totalCompleted / totalScheduled;
    if ((average - worstRate) * 100 < CoachEngine.weekdayGapPoints) return null;
    return names[worstIndex];
  }
}
