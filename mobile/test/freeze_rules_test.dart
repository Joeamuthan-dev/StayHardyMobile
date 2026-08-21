import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/domain/civil_date.dart';
import 'package:stayhardy/src/domain/freeze_rules.dart';
import 'package:stayhardy/src/domain/streak_engine.dart';

/// A freeze is a streak the app decided to forgive. That makes it the one piece
/// of this app worth cheating for, so these tests are mostly about what the
/// planner REFUSES to do.
void main() {
  final today = CivilDate(2026, 8, 15); // a Saturday

  /// Daily periods ending on [today], oldest first.
  ///
  /// [pattern] is read newest-last: 'x' completed, '.' missed, 'f' frozen.
  List<PeriodOutcome> daily(String pattern) {
    final start = today.addDays(-(pattern.length - 1));
    return [
      for (var i = 0; i < pattern.length; i++)
        () {
          final d = start.addDays(i);
          return PeriodOutcome(
            key: 'D-${d.iso}',
            start: d,
            end: d,
            required: 1,
            completed: pattern[i] == 'x' ? 1 : 0,
            frozen: pattern[i] == 'f',
          );
        }(),
    ];
  }

  String x(int n) => 'x' * n;

  group('earning', () {
    test('no freeze before the threshold', () {
      final plan = FreezePlanner.plan(
        // 9 sealed completions plus an open day.
        periods: daily('${x(9)}x'),
        today: today,
        balance: 0,
        earnedTotal: 0,
      );
      expect(plan.earned, 0);
      expect(plan.balance, 0);
    });

    test('one freeze per ten completed periods', () {
      final plan = FreezePlanner.plan(
        periods: daily('${x(20)}x'),
        today: today,
        balance: 0,
        earnedTotal: 0,
      );
      expect(plan.earned, 2);
      expect(plan.balance, 2);
      expect(plan.earnedTotal, 2);
    });

    test('the balance is capped, and the cap is not a leak', () {
      final plan = FreezePlanner.plan(
        periods: daily('${x(60)}x'),
        today: today,
        balance: 0,
        earnedTotal: 0,
      );
      expect(plan.earned, 6);
      // Six earned, two held. Returning after a long absence must not unlock a
      // week of automatic forgiveness.
      expect(plan.balance, FreezeRules.maxBalance);
    });

    test('entitlement is a ratchet — recounting history grants nothing', () {
      final periods = daily('${x(20)}x');
      final first = FreezePlanner.plan(
        periods: periods,
        today: today,
        balance: 0,
        earnedTotal: 0,
      );
      // Same history, second run. This is the reinstall / restore case.
      final second = FreezePlanner.plan(
        periods: periods,
        today: today,
        balance: first.balance,
        earnedTotal: first.earnedTotal,
      );
      expect(second.earned, 0);
      expect(second.balance, first.balance);
    });

    test('a frozen period does not pay for the next freeze', () {
      // 9 real completions + 1 frozen day would be 10 satisfied periods, but
      // only 9 were worked. Freezes must never bootstrap themselves.
      final plan = FreezePlanner.plan(
        periods: daily('${x(9)}fx'),
        today: today,
        balance: 0,
        earnedTotal: 0,
      );
      expect(plan.earned, 0);
    });

    test('an open period is not counted until it closes', () {
      // 10 completions, but the last is today and could still be undone.
      final plan = FreezePlanner.plan(
        periods: daily(x(10)),
        today: today,
        balance: 0,
        earnedTotal: 0,
      );
      expect(plan.earned, 0);
    });
  });

  group('spending', () {
    test('a missed day since the last run is covered', () {
      final plan = FreezePlanner.plan(
        periods: daily('${x(9)}.x'),
        today: today,
        balance: 1,
        earnedTotal: 1,
        lastRunDate: today.addDays(-1),
      );
      expect(plan.repairs, [today.addDays(-1).iso]);
      expect(plan.balance, 0);
    });

    test('two consecutive misses are both covered when affordable', () {
      final plan = FreezePlanner.plan(
        periods: daily('${x(9)}..x'),
        today: today,
        balance: 2,
        earnedTotal: 2,
        lastRunDate: today.addDays(-2),
      );
      expect(plan.repairs.length, 2);
      expect(plan.balance, 0);
    });

    test('spending stops at the balance, oldest first', () {
      final plan = FreezePlanner.plan(
        periods: daily('${x(9)}..x'),
        today: today,
        balance: 1,
        earnedTotal: 1,
        lastRunDate: today.addDays(-2),
      );
      expect(plan.repairs, [today.addDays(-2).iso]);
      expect(plan.balance, 0);
    });

    test('today is never repaired — the day is not over', () {
      final plan = FreezePlanner.plan(
        periods: daily('${x(9)}.'),
        today: today,
        balance: 2,
        earnedTotal: 2,
        lastRunDate: today.addDays(-1),
      );
      expect(plan.repairs, isEmpty);
      expect(plan.balance, 2);
    });

    test('a period already walked past on an earlier run stays closed', () {
      // The gap is 3 days ago; the last run was 2 days ago, so that day was
      // already observed as broken. Reopening it would let a user farm freezes
      // by rewinding the clock.
      final plan = FreezePlanner.plan(
        periods: daily('${x(9)}.xxx'),
        today: today,
        balance: 2,
        earnedTotal: 2,
        lastRunDate: today.addDays(-2),
      );
      expect(plan.repairs, isEmpty);
    });

    test('nothing older than the repair window is forgiven', () {
      // A gap 10 days ago, and the app has not been opened since before it.
      final pattern = '${x(20)}.${x(9)}';
      final plan = FreezePlanner.plan(
        periods: daily(pattern),
        today: today,
        balance: 2,
        earnedTotal: 2,
        lastRunDate: today.addDays(-30),
      );
      expect(plan.repairs, isEmpty);
    });

    test('a freeze is not spent when there is no streak to protect', () {
      // Never completed anything. Repairing here would show a streak of 1 to
      // someone who has done nothing.
      final plan = FreezePlanner.plan(
        periods: daily('...x'),
        today: today,
        balance: 2,
        earnedTotal: 2,
        lastRunDate: today.addDays(-3),
      );
      expect(plan.repairs, isEmpty);
      expect(plan.balance, 2);
    });

    test('the first run ever repairs nothing', () {
      // A fresh install carrying imported history. Those days did not pass
      // while this app was watching, so none of them are ours to forgive.
      final plan = FreezePlanner.plan(
        periods: daily('${x(20)}.x'),
        today: today,
        balance: 0,
        earnedTotal: 0,
      );
      expect(plan.repairs, isEmpty);
      // It still earns, so a long-standing user starts with a bank.
      expect(plan.balance, FreezeRules.maxBalance);
    });

    test('an already-frozen period is never frozen twice', () {
      final plan = FreezePlanner.plan(
        periods: daily('${x(9)}fx'),
        today: today,
        balance: 2,
        earnedTotal: 2,
        lastRunDate: today.addDays(-1),
      );
      expect(plan.repairs, isEmpty);
      expect(plan.balance, 2);
    });
  });

  group('effect on the streak', () {
    test('a repaired gap keeps the streak running', () {
      final periods = daily('${x(9)}.x');
      final before = StreakEngine.compute(periods, today: today);
      expect(before.current, 1); // broken by the gap

      final plan = FreezePlanner.plan(
        periods: periods,
        today: today,
        balance: 1,
        earnedTotal: 1,
        lastRunDate: today.addDays(-1),
      );

      final repaired = plan.repairs.toSet();
      final after = StreakEngine.compute(
        [
          for (final p in periods)
            if (repaired.contains(p.start.iso))
              PeriodOutcome(
                key: p.key,
                start: p.start,
                end: p.end,
                required: p.required,
                completed: p.completed,
                frozen: true,
              )
            else
              p,
        ],
        today: today,
      );
      expect(after.current, 11);
    });
  });

  group('weekly habits', () {
    test('a freeze is keyed to the week, not to a day inside it', () {
      // Three 3x-per-week periods: two satisfied, then one missed entirely.
      final weeks = <PeriodOutcome>[];
      for (var i = 3; i >= 1; i--) {
        final start = today.addDays(-7 * i).startOfWeek(1);
        weeks.add(PeriodOutcome(
          key: 'W-${start.iso}',
          start: start,
          end: start.addDays(6),
          required: 3,
          completed: i == 1 ? 0 : 3,
        ));
      }

      final plan = FreezePlanner.plan(
        periods: weeks,
        today: today,
        balance: 1,
        earnedTotal: 1,
        lastRunDate: today.addDays(-8),
      );

      expect(plan.repairs, [weeks.last.start.iso]);
    });
  });
}
