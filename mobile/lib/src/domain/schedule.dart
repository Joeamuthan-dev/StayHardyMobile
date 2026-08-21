import '../data/enums.dart';
import 'civil_date.dart';

/// One evaluation window for a habit.
///
/// Day-scheduled habits produce one period per *due day* with [required] 1.
/// A "3x per week" habit produces one period per *week* with [required] 3.
/// Everything downstream — streaks, freezes, rollups — reads only this shape,
/// which is why there is a single streak algorithm rather than one per schedule.
class SchedulePeriod {
  const SchedulePeriod({
    required this.key,
    required this.start,
    required this.end,
    required this.required,
  });

  /// Stable, sortable identifier. Encodes the granularity so day/week/month
  /// periods can never collide: 'D-2026-08-14', 'W-2026-08-10', 'M-2026-08'.
  ///
  /// Weeks are keyed by their start date rather than an ISO week number
  /// precisely because the week start is user-configurable — an ISO 'YYYY-Www'
  /// key silently means Monday, and would be wrong for anyone on a Sunday week.
  final String key;

  final CivilDate start;
  final CivilDate end;
  final int required;

  bool contains(CivilDate d) => d.isAtOrAfter(start) && d.isAtOrBefore(end);

  /// A period is sealed once it is entirely in the past.
  bool isSealedOn(CivilDate today) => end.isBefore(today);
}

/// The scheduling rule for a habit, decoupled from the database row so it can
/// be evaluated and tested on its own.
class HabitSchedule {
  const HabitSchedule({
    required this.kind,
    this.weekdayMask = 127,
    this.targetPerPeriod,
    this.periodKind = PeriodKind.week,
    this.intervalDays,
    this.anchorDate,
    this.weekStartDow = 1,
  });

  final ScheduleKind kind;
  final int weekdayMask;
  final int? targetPerPeriod;
  final PeriodKind periodKind;
  final int? intervalDays;
  final CivilDate? anchorDate;
  final int weekStartDow;

  /// Whether this habit is due on [d].
  ///
  /// Always false for [ScheduleKind.timesPerPeriod] — a flexible habit has no
  /// due days, only a quota. Callers asking "is it due today?" for a flexible
  /// habit are asking the wrong question; ask [periodFor] and compare the
  /// period's completion count against [SchedulePeriod.required].
  bool isDueOn(CivilDate d) {
    switch (kind) {
      case ScheduleKind.daily:
        return true;
      case ScheduleKind.weekdays:
        return weekdayMask & d.dowBit != 0;
      case ScheduleKind.timesPerPeriod:
        return false;
      case ScheduleKind.everyNDays:
        final n = intervalDays ?? 1;
        final anchor = anchorDate;
        if (anchor == null || n <= 0) return false;
        if (d.isBefore(anchor)) return false;
        return anchor.daysUntil(d) % n == 0;
    }
  }

  /// The period containing [d], or null if [d] falls outside any evaluated
  /// window (a non-due day for a day-scheduled habit).
  SchedulePeriod? periodFor(CivilDate d) {
    switch (kind) {
      case ScheduleKind.daily:
      case ScheduleKind.weekdays:
      case ScheduleKind.everyNDays:
        if (!isDueOn(d)) return null;
        return SchedulePeriod(
          key: 'D-${d.iso}',
          start: d,
          end: d,
          required: 1,
        );
      case ScheduleKind.timesPerPeriod:
        final target = targetPerPeriod ?? 1;
        if (periodKind == PeriodKind.week) {
          final start = d.startOfWeek(weekStartDow);
          return SchedulePeriod(
            key: 'W-${start.iso}',
            start: start,
            end: start.addDays(6),
            required: target,
          );
        }
        final start = d.startOfMonth();
        return SchedulePeriod(
          key: 'M-${start.year}-${start.month.toString().padLeft(2, '0')}',
          start: start,
          end: d.endOfMonth(),
          required: target,
        );
    }
  }

  /// Every period between [from] and [to] inclusive, oldest first.
  ///
  /// Capped at [maxPeriods] walking backwards from [to]. A user with years of
  /// history does not need every period materialized to render a streak, and an
  /// uncapped backfill on first launch is a visible hang.
  List<SchedulePeriod> periodsBetween(
    CivilDate from,
    CivilDate to, {
    int maxPeriods = 400,
  }) {
    if (to.isBefore(from)) return const [];

    final out = <SchedulePeriod>[];
    final seen = <String>{};

    // Walk backwards so the cap keeps the most RECENT periods — those are what
    // a streak depends on. Capping from the front would strand the current
    // streak beyond the horizon.
    var cursor = to;
    while (cursor.isAtOrAfter(from) && out.length < maxPeriods) {
      final period = periodFor(cursor);
      if (period != null && seen.add(period.key)) {
        out.add(period);
        // Jump straight to the day before this period starts; for weekly and
        // monthly periods that skips up to 30 redundant evaluations.
        cursor = period.start.addDays(-1);
      } else {
        cursor = cursor.addDays(-1);
      }
    }

    return out.reversed.toList(growable: false);
  }
}
