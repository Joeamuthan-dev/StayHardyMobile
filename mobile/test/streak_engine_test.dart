import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/enums.dart';
import 'package:stayhardy/src/domain/civil_date.dart';
import 'package:stayhardy/src/domain/schedule.dart';
import 'package:stayhardy/src/domain/streak_engine.dart';

/// Builds day-periods from a compact string, newest last.
/// '1' satisfied, '0' unsatisfied, 'F' frozen.
List<PeriodOutcome> daysFrom(String pattern, {required CivilDate endingOn}) {
  final out = <PeriodOutcome>[];
  for (var i = 0; i < pattern.length; i++) {
    final d = endingOn.addDays(-(pattern.length - 1 - i));
    final c = pattern[i];
    out.add(PeriodOutcome(
      key: 'D-${d.iso}',
      start: d,
      end: d,
      required: 1,
      completed: c == '1' ? 1 : 0,
      frozen: c == 'F',
    ));
  }
  return out;
}

void main() {
  // A Friday, chosen so week boundaries are exercised in both directions.
  final today = CivilDate(2026, 8, 14);

  group('CivilDate', () {
    test('dow is Sunday-indexed, not Dart weekday', () {
      expect(CivilDate(2026, 8, 16).dow, 0, reason: 'Sunday');
      expect(CivilDate(2026, 8, 17).dow, 1, reason: 'Monday');
      expect(CivilDate(2026, 8, 14).dow, 5, reason: 'Friday');
    });

    test('survives a DST transition without shifting the date', () {
      // US DST ends 2026-11-01. Adding a day across it must land on the 2nd,
      // not the 1st again — the failure mode of offset arithmetic.
      final oct31 = CivilDate(2026, 10, 31);
      expect(oct31.addDays(1).iso, '2026-11-01');
      expect(oct31.addDays(2).iso, '2026-11-02');
      expect(CivilDate(2026, 3, 7).addDays(1).iso, '2026-03-08');
    });

    test('handles leap day and month/year rollover', () {
      expect(CivilDate(2028, 2, 28).addDays(1).iso, '2028-02-29');
      expect(CivilDate(2028, 2, 29).addDays(1).iso, '2028-03-01');
      expect(CivilDate(2026, 12, 31).addDays(1).iso, '2027-01-01');
      expect(CivilDate(2026, 2, 28).addDays(1).iso, '2026-03-01');
    });

    test('parses a full timestamp by truncating to the date', () {
      expect(CivilDate.parse('2026-08-14T18:30:00.000Z').iso, '2026-08-14');
      expect(CivilDate.parse('2026-08-14').iso, '2026-08-14');
    });

    test('startOfWeek respects the configured week start', () {
      expect(today.startOfWeek(1).iso, '2026-08-10', reason: 'Monday start');
      expect(today.startOfWeek(0).iso, '2026-08-09', reason: 'Sunday start');
    });
  });

  group('HabitSchedule.isDueOn', () {
    test('weekdays honours the bitmask', () {
      // Mon | Wed | Fri
      const mask = (1 << 1) | (1 << 3) | (1 << 5);
      const s = HabitSchedule(kind: ScheduleKind.weekdays, weekdayMask: mask);
      expect(s.isDueOn(CivilDate(2026, 8, 14)), isTrue, reason: 'Friday');
      expect(s.isDueOn(CivilDate(2026, 8, 15)), isFalse, reason: 'Saturday');
      expect(s.isDueOn(CivilDate(2026, 8, 17)), isTrue, reason: 'Monday');
    });

    test('timesPerPeriod is never "due" on a given day', () {
      const s = HabitSchedule(
        kind: ScheduleKind.timesPerPeriod,
        targetPerPeriod: 3,
      );
      expect(s.isDueOn(today), isFalse);
    });

    test('everyNDays counts from the anchor', () {
      final s = HabitSchedule(
        kind: ScheduleKind.everyNDays,
        intervalDays: 3,
        anchorDate: CivilDate(2026, 8, 10),
      );
      expect(s.isDueOn(CivilDate(2026, 8, 10)), isTrue);
      expect(s.isDueOn(CivilDate(2026, 8, 12)), isFalse);
      expect(s.isDueOn(CivilDate(2026, 8, 13)), isTrue);
      expect(s.isDueOn(CivilDate(2026, 8, 9)), isFalse,
          reason: 'before the anchor');
    });
  });

  group('HabitSchedule.periodsBetween', () {
    test('a weekly quota yields one period per week, not per day', () {
      const s = HabitSchedule(
        kind: ScheduleKind.timesPerPeriod,
        targetPerPeriod: 3,
      );
      final periods = s.periodsBetween(CivilDate(2026, 8, 1), today);
      expect(periods.every((p) => p.required == 3), isTrue);
      expect(periods.length, 3, reason: 'weeks of Aug 3, 10 — plus Jul 27');
      expect(periods.last.key, 'W-2026-08-10');
      // Ordered oldest-first, which is what StreakEngine expects.
      expect(periods.first.start.isBefore(periods.last.start), isTrue);
    });

    test('rest days produce no period at all', () {
      const mask = (1 << 1) | (1 << 3) | (1 << 5); // Mon/Wed/Fri
      const s = HabitSchedule(kind: ScheduleKind.weekdays, weekdayMask: mask);
      final periods = s.periodsBetween(CivilDate(2026, 8, 10), today);
      expect(periods.map((p) => p.start.iso).toList(),
          ['2026-08-10', '2026-08-12', '2026-08-14']);
    });

    test('the cap keeps the most recent periods, not the oldest', () {
      const s = HabitSchedule(kind: ScheduleKind.daily);
      final periods = s.periodsBetween(
        CivilDate(2020, 1, 1),
        today,
        maxPeriods: 5,
      );
      expect(periods.length, 5);
      expect(periods.last.start.iso, today.iso,
          reason: 'a truncated backfill must not strand the current streak');
    });
  });

  group('StreakEngine', () {
    test('counts consecutive satisfied periods', () {
      final r = StreakEngine.compute(
        daysFrom('0011111', endingOn: today),
        today: today,
      );
      expect(r.current, 5);
      expect(r.longest, 5);
    });

    test('an unfinished today does not break the streak', () {
      // Yesterday done, today not yet. The day is not over.
      final r = StreakEngine.compute(
        daysFrom('11110', endingOn: today),
        today: today,
      );
      expect(r.current, 4);
    });

    test('a missed day that has ended does break it', () {
      final r = StreakEngine.compute(
        daysFrom('11101', endingOn: today),
        today: today,
      );
      expect(r.current, 1, reason: 'only today survives the break');
      expect(r.longest, 3);
    });

    test('a freeze preserves the streak across a missed day', () {
      final withFreeze = StreakEngine.compute(
        daysFrom('111F11', endingOn: today),
        today: today,
      );
      final withoutFreeze = StreakEngine.compute(
        daysFrom('111011', endingOn: today),
        today: today,
      );
      expect(withFreeze.current, 6);
      expect(withoutFreeze.current, 2);
    });

    test('longest is not dragged down by an unfinished today', () {
      final r = StreakEngine.compute(
        daysFrom('1111110', endingOn: today),
        today: today,
      );
      expect(r.current, 6);
      expect(r.longest, 6);
    });

    test('a partially completed quota period is not satisfied', () {
      final week = CivilDate(2026, 8, 3);
      final r = StreakEngine.compute(
        [
          PeriodOutcome(
            key: 'W-${week.iso}',
            start: week,
            end: week.addDays(6),
            required: 3,
            completed: 2,
          ),
        ],
        today: today,
      );
      expect(r.current, 0, reason: '2 of 3 is a miss once the week has closed');
    });

    test('empty history is zero, not a crash', () {
      final r = StreakEngine.compute([], today: today);
      expect(r.current, 0);
      expect(r.longest, 0);
      expect(r.lastSatisfiedKey, isNull);
    });
  });

  group('OverallStreak', () {
    DayOutcome day(int offset, int scheduled, int completed) => DayOutcome(
          date: today.addDays(offset),
          scheduled: scheduled,
          completed: completed,
        );

    test('a rest day neither breaks nor extends', () {
      final r = OverallStreak.compute(
        [
          day(-4, 2, 2),
          day(-3, 0, 0), // nothing scheduled
          day(-2, 2, 1),
          day(-1, 3, 3),
          day(0, 2, 1),
        ],
        today: today,
      );
      expect(r.current, 4, reason: 'the rest day is skipped, not counted');
    });

    test('completing an unscheduled habit does not save the day', () {
      // 2 habits due, none of them completed. This is the loophole that made
      // the old badge streak diverge from the displayed one.
      final r = OverallStreak.compute(
        [day(-2, 2, 2), day(-1, 2, 0), day(0, 1, 1)],
        today: today,
      );
      expect(r.current, 1);
    });

    test('an incomplete today is still open', () {
      final r = OverallStreak.compute(
        [day(-2, 2, 2), day(-1, 2, 2), day(0, 2, 0)],
        today: today,
      );
      expect(r.current, 2);
    });
  });
}
