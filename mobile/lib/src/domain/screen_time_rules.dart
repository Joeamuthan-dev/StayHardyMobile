/// Turning raw usage numbers into something worth showing.
///
/// The whole feature has one honest purpose: letting someone see whether the
/// hours they cannot account for line up with the days they miss their habits.
/// It is **not** a scold. Two rules keep it on that side of the line:
///
/// * **No goals, no limits, no red.** Screen time here is context for habit
///   data, not a target to beat. An app that tells you off for using your phone
///   is one you delete.
/// * **Correlation is only claimed with evidence.** "Your worst days are your
///   highest screen-time days" from four days of data is astrology. The guard
///   is the same one the insight engine uses.
library;

import 'civil_date.dart';

/// How an app is treated in the summary.
///
/// The user classifies; the app never guesses. A default list of "distracting"
/// apps would call someone's livelihood a distraction — the same app is doom
/// scrolling for one person and their job for another.
enum ScreenTimeClass { neutral, distracting, productive }

/// One app's day.
class AppUsage {
  const AppUsage({
    required this.packageName,
    required this.foregroundMs,
    required this.launchCount,
    this.appLabel,
  });

  final String packageName;
  final int foregroundMs;
  final int launchCount;

  /// Null when package visibility hides the app; the UI falls back to the
  /// package name rather than inventing one.
  final String? appLabel;

  int get minutes => foregroundMs ~/ 60000;

  /// What to show. Never blank, never "Unknown".
  String get displayName => appLabel ?? packageName;
}

/// A day of screen time.
///
/// Named `ScreenDay` rather than `ScreenTimeDay` because Drift already owns
/// that name for the `screen_time_daily` row. Two types with one name in the
/// same feature is a rename waiting to go wrong.
class ScreenDay {
  const ScreenDay({
    required this.date,
    required this.totalMs,
    required this.unlockCount,
    required this.apps,
    this.isPartial = false,
  });

  final CivilDate date;
  final int totalMs;
  final int unlockCount;

  /// Longest first.
  final List<AppUsage> apps;

  /// True for today, which is still accumulating.
  final bool isPartial;

  int get minutes => totalMs ~/ 60000;

  static ScreenDay empty(CivilDate date) => ScreenDay(
        date: date,
        totalMs: 0,
        unlockCount: 0,
        apps: const [],
      );
}

/// A day's screen time set against that day's habit completion.
class ScreenTimeVsHabits {
  const ScreenTimeVsHabits({
    required this.date,
    required this.minutes,
    required this.habitRate,
  });

  final CivilDate date;
  final int minutes;

  /// 0..1, or null on a day with nothing scheduled — which is not a zero.
  final double? habitRate;
}

abstract final class ScreenTimeRules {
  /// Days retained at per-app detail before collapsing to daily totals.
  static const appDetailRetentionDays = 90;

  /// Days needed before any correlation is claimed.
  static const minDaysForCorrelation = 14;

  /// Minutes between the good-day and bad-day averages before the difference is
  /// worth stating rather than being noise.
  static const materialGapMinutes = 30;

  /// A day counts as "kept" at or above this completion rate.
  static const goodDayRate = 0.8;

  /// Aggregate a list of apps into a day.
  ///
  /// The total is the **sum of per-app foreground time**, not a separately
  /// reported figure: two numbers for the same thing drift, and the one the
  /// user can check by adding up the list has to be the one shown.
  static ScreenDay fold(
    CivilDate date,
    List<AppUsage> apps, {
    required int unlockCount,
    bool isPartial = false,
  }) {
    final sorted = [...apps]
      ..sort((a, b) => b.foregroundMs.compareTo(a.foregroundMs));
    var total = 0;
    for (final a in sorted) {
      total += a.foregroundMs;
    }
    return ScreenDay(
      date: date,
      totalMs: total,
      unlockCount: unlockCount,
      apps: sorted,
      isPartial: isPartial,
    );
  }

  /// The difference in average screen time between days habits were kept and
  /// days they were not — or null when there is not enough to say.
  ///
  /// Returns positive minutes when bad days have MORE screen time, which is the
  /// direction people expect. Deliberately returns null rather than zero when
  /// the evidence is thin: "no difference" and "we cannot tell yet" are
  /// different statements, and only one of them is honest here.
  static ScreenTimeCorrelation? correlate(List<ScreenTimeVsHabits> days) {
    final usable = days.where((d) => d.habitRate != null).toList();
    if (usable.length < minDaysForCorrelation) return null;

    var goodMinutes = 0, goodDays = 0;
    var badMinutes = 0, badDays = 0;
    for (final d in usable) {
      if (d.habitRate! >= goodDayRate) {
        goodMinutes += d.minutes;
        goodDays++;
      } else {
        badMinutes += d.minutes;
        badDays++;
      }
    }

    // A user who kept every day, or missed every day, has no contrast to
    // measure. Reporting one side against nothing would be meaningless.
    if (goodDays < 3 || badDays < 3) return null;

    final goodAvg = goodMinutes ~/ goodDays;
    final badAvg = badMinutes ~/ badDays;
    if ((badAvg - goodAvg).abs() < materialGapMinutes) return null;

    return ScreenTimeCorrelation(
      keptDayAverage: goodAvg,
      missedDayAverage: badAvg,
      sampleDays: usable.length,
    );
  }

  /// '3h 41m' / '48m'.
  static String formatDuration(int minutes) {
    if (minutes <= 0) return '0m';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h == 0) return '${m}m';
    if (m == 0) return '${h}h';
    return '${h}h ${m}m';
  }
}

class ScreenTimeCorrelation {
  const ScreenTimeCorrelation({
    required this.keptDayAverage,
    required this.missedDayAverage,
    required this.sampleDays,
  });

  /// Average minutes on days habits were kept.
  final int keptDayAverage;

  /// Average minutes on days they were not.
  final int missedDayAverage;

  final int sampleDays;

  /// Minutes more on missed days. Negative if the pattern runs the other way,
  /// which happens and must not be hidden.
  int get gap => missedDayAverage - keptDayAverage;

  bool get moreOnMissedDays => gap > 0;
}
