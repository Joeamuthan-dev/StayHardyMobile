import 'civil_date.dart';

/// A period as the streak engine sees it. Mirrors a `habit_period_status` row,
/// but kept free of Drift so the rules can be tested in isolation.
class PeriodOutcome {
  const PeriodOutcome({
    required this.key,
    required this.start,
    required this.end,
    required this.required,
    required this.completed,
    this.frozen = false,
  });

  final String key;
  final CivilDate start;
  final CivilDate end;
  final int required;
  final int completed;
  final bool frozen;

  bool get satisfied => frozen || completed >= required;

  /// Still in progress. An open period can extend a streak but must never break
  /// one — the day isn't over yet.
  bool isOpen(CivilDate today) => !end.isBefore(today);
}

class StreakResult {
  const StreakResult({
    required this.current,
    required this.longest,
    required this.lastSatisfiedKey,
  });

  final int current;
  final int longest;
  final String? lastSatisfiedKey;
}

/// The single canonical streak algorithm.
///
/// The app this replaces had three implementations that disagreed — one over a
/// 365-day window counting any log, one over 400 days requiring the log to
/// belong to a habit actually scheduled that weekday, and a third that
/// preferred a server-cached value. Badges were awarded off the most lenient
/// while the habits screen displayed the strictest, so users could hold a badge
/// for a streak higher than the one shown to them.
///
/// The rules here, applied uniformly to every schedule kind:
///
/// * A period counts when it is satisfied — enough completions, or frozen.
/// * A sealed, unsatisfied period breaks the streak.
/// * An **open** period never breaks it. Not having finished today by 9am is
///   not a failure.
/// * Periods that do not exist are invisible. A Mon/Wed/Fri habit simply has no
///   period on Sunday, so rest days can neither break nor extend a streak —
///   this falls out of the data model rather than needing a special case.
abstract final class StreakEngine {
  /// [periods] must be ordered oldest-first and contain only periods that were
  /// actually scheduled.
  static StreakResult compute(
    List<PeriodOutcome> periods, {
    required CivilDate today,
  }) {
    if (periods.isEmpty) {
      return const StreakResult(current: 0, longest: 0, lastSatisfiedKey: null);
    }

    // Current streak: walk backwards from the newest period.
    var current = 0;
    String? lastSatisfiedKey;
    for (var i = periods.length - 1; i >= 0; i--) {
      final p = periods[i];
      if (p.satisfied) {
        current++;
        lastSatisfiedKey ??= p.key;
        continue;
      }
      // Unsatisfied. Only a period that has already ended breaks the run.
      if (p.isOpen(today)) continue;
      break;
    }

    // Longest streak: a forward scan over the same rules. An open, unsatisfied
    // period is skipped rather than treated as a break, so the historical
    // maximum never dips just because today isn't done yet.
    var longest = 0;
    var run = 0;
    for (final p in periods) {
      if (p.satisfied) {
        run++;
        if (run > longest) longest = run;
      } else if (!p.isOpen(today)) {
        run = 0;
      }
    }
    if (current > longest) longest = current;

    return StreakResult(
      current: current,
      longest: longest,
      lastSatisfiedKey: lastSatisfiedKey,
    );
  }
}

/// A single day as the overall-streak calculation sees it, sourced from
/// `daily_rollup`.
class DayOutcome {
  const DayOutcome({
    required this.date,
    required this.scheduled,
    required this.completed,
    this.frozen = false,
  });

  final CivilDate date;

  /// How many habits were due that day, across all habits.
  final int scheduled;

  /// How many of them were completed.
  final int completed;

  final bool frozen;

  /// Nothing was due. Neither a win nor a loss.
  bool get isRestDay => scheduled == 0;

  bool get satisfied => frozen || (scheduled > 0 && completed > 0);
}

/// The headline streak on the home screen, across all habits.
///
/// Distinct from a per-habit streak and deliberately more forgiving: a day
/// counts when at least one *scheduled* habit was completed. Requiring all of
/// them would make the number reset constantly and stop meaning anything.
///
/// Requiring the completed habit to have been scheduled that day is the strict
/// half, and is what stops a single always-on habit from carrying an unbroken
/// streak while everything else is ignored — the loophole that made the old
/// badge numbers unreliable.
abstract final class OverallStreak {
  /// [days] must be ordered oldest-first and contiguous.
  static StreakResult compute(
    List<DayOutcome> days, {
    required CivilDate today,
  }) {
    if (days.isEmpty) {
      return const StreakResult(current: 0, longest: 0, lastSatisfiedKey: null);
    }

    var current = 0;
    String? lastKey;
    for (var i = days.length - 1; i >= 0; i--) {
      final d = days[i];
      if (d.satisfied) {
        current++;
        lastKey ??= d.date.iso;
        continue;
      }
      if (d.isRestDay) continue; // nothing due — skip without breaking
      if (!d.date.isBefore(today)) continue; // today isn't over
      break;
    }

    var longest = 0;
    var run = 0;
    for (final d in days) {
      if (d.satisfied) {
        run++;
        if (run > longest) longest = run;
      } else if (!d.isRestDay && d.date.isBefore(today)) {
        run = 0;
      }
    }
    if (current > longest) longest = current;

    return StreakResult(
      current: current,
      longest: longest,
      lastSatisfiedKey: lastKey,
    );
  }
}
