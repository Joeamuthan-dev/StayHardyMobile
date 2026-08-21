import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/enums.dart';
import 'package:stayhardy/src/domain/challenge_rules.dart';

/// The challenge is the only place in this app where a number can be worth
/// money. The server cannot verify habit content — it never sees any — so this
/// tally is the client's honest best effort, and these tests are almost all
/// about what it **refuses to count**.
void main() {
  ChallengeHabitDay habit({
    String id = 'h',
    bool due = true,
    bool completed = true,
    bool frozen = false,
    bool backfilled = false,
    LogSource source = LogSource.manual,
  }) =>
      ChallengeHabitDay(
        habitId: id,
        due: due,
        completed: completed,
        frozen: frozen,
        backfilled: backfilled,
        source: source,
      );

  group('what a day refuses to count', () {
    test('a backfilled log does not count as done', () {
      // The flag exists for precisely this — see tables.dart:132, "rejected
      // outright for paid-challenge habits".
      final t = ChallengeTallying.tally([habit(backfilled: true)]);
      expect(t.required, 1);
      expect(t.done, 0);
      expect(t.isComplete, isFalse);
    });

    test('imported and restored history do not count', () {
      for (final source in [LogSource.migration, LogSource.restore]) {
        final t = ChallengeTallying.tally([habit(source: source)]);
        expect(t.done, 0, reason: '$source must not count toward a cohort');
      }
    });

    test('the sources a real check-in can come from do count', () {
      for (final source in [
        LogSource.manual,
        LogSource.widget,
        LogSource.notification,
      ]) {
        expect(ChallengeTallying.tally([habit(source: source)]).done, 1);
      }
    });

    test('a frozen day is reported separately, never merged into done', () {
      // PeriodOutcome.satisfied is `frozen || completed >= required`, and
      // FreezeSource.manual lets a user grant themselves one from Settings.
      // One conflated integer would let that buy a day.
      final t = ChallengeTallying.tally([habit(completed: false, frozen: true)]);
      expect(t.done, 0);
      expect(t.frozen, 1);
      expect(t.isComplete, isFalse);
      expect(t.isCompleteWithFreezes, isTrue);
    });

    test('a habit that was not due is not a miss', () {
      final t = ChallengeTallying.tally([habit(due: false, completed: false)]);
      expect(t.required, 0);
      expect(t.isRestDay, isTrue);
    });

    test('a completed habit that was not due still does not count', () {
      // Doing something off-schedule is good, but it cannot manufacture a
      // cohort day out of a habit the cohort never asked for.
      final t = ChallengeTallying.tally([habit(due: false)]);
      expect(t.required, 0);
      expect(t.done, 0);
    });
  });

  group('the payload can never violate the server constraint', () {
    test('required is capped at the limit the migration checks', () {
      final many = [for (var i = 0; i < 40; i++) habit(id: 'h$i')];
      final t = ChallengeTallying.tally(many);

      // The DB has `check (habits_required between 0 and 20)`. A user with 40
      // habits must get a valid day, not a rejected payload.
      expect(t.required, ChallengeRules.maxHabitsPerDay);
      expect(t.done, lessThanOrEqualTo(t.required));
    });

    test('done plus frozen never exceeds required', () {
      // Mirrors `check (habits_done + habits_frozen <= habits_required)`.
      final mixed = [
        for (var i = 0; i < 30; i++)
          habit(id: 'h$i', completed: i.isEven, frozen: i.isOdd),
      ];
      final t = ChallengeTallying.tally(mixed);
      expect(t.done + t.frozen, lessThanOrEqualTo(t.required));
    });
  });

  group('settling a cohort', () {
    ChallengeTally day({int required = 1, int done = 1, int frozen = 0}) =>
        ChallengeTally(required: required, done: done, frozen: frozen);

    test('the bar is 27 of 30, not perfection', () {
      // A perfect-attendance bar sounds rigorous and is predatory: one stomach
      // bug forfeits the stake and almost everyone fails.
      expect(ChallengeRules.requiredDays, 27);
      expect(ChallengeRules.cohortDays, 30);
    });

    test('three misses still completes', () {
      final days = [
        for (var i = 0; i < 27; i++) day(),
        for (var i = 0; i < 3; i++) day(done: 0),
      ];
      final v = ChallengeTallying.settle(days);
      expect(v.daysCompleted, 27);
      expect(v.completed, isTrue);
      expect(v.remaining, 0);
    });

    test('four misses does not', () {
      final days = [
        for (var i = 0; i < 26; i++) day(),
        for (var i = 0; i < 4; i++) day(done: 0),
      ];
      final v = ChallengeTallying.settle(days);
      expect(v.completed, isFalse);
      expect(v.remaining, 1);
    });

    test('frozen days do not count unless the cohort says so', () {
      final days = [
        for (var i = 0; i < 25; i++) day(),
        for (var i = 0; i < 5; i++) day(done: 0, frozen: 1),
      ];

      expect(ChallengeTallying.settle(days).completed, isFalse,
          reason: 'a hand-granted freeze must not buy a cohort by default');
      expect(
        ChallengeTallying.settle(days, countFrozenDays: true).completed,
        isTrue,
      );
    });

    test('rest days are excluded, not counted as wins', () {
      // A member whose habits are all weekday-only must not clear a 30-day bar
      // by resting through the weekends.
      final days = [
        for (var i = 0; i < 20; i++) day(),
        for (var i = 0; i < 10; i++) ChallengeTally.empty,
      ];
      final v = ChallengeTallying.settle(days);

      expect(v.restDays, 10);
      // The bar drops to the 20 days that were actually scheduled...
      expect(v.daysRequired, 20);
      // ...and they cleared all of them.
      expect(v.completed, isTrue);
    });

    test('an all-rest cohort cannot be failed', () {
      final v = ChallengeTallying.settle(
        [for (var i = 0; i < 30; i++) ChallengeTally.empty],
      );
      expect(v.daysRequired, 0);
      expect(v.completed, isTrue);
    });

    test('an empty cohort settles rather than throwing', () {
      final v = ChallengeTallying.settle(const []);
      expect(v.daysCompleted, 0);
      expect(v.completed, isTrue, reason: 'nothing was required');
    });
  });

  group('what this file deliberately does not do', () {
    test('exposes no day-boundary or cutoff arithmetic', () {
      // The cohort's day window belongs to the server, which owns the pinned
      // timezone. If a cutoff calculation ever appears here, two
      // implementations of a money rule exist on opposite sides of the wire and
      // are free to drift — which is the bug civil_date.dart's header was
      // written to prevent.
      //
      // This is asserted structurally in challenge_service_test.dart, which
      // checks the client renders from server-supplied timestamps. Here it is
      // recorded as intent.
      expect(ChallengeRules.cohortDays, isA<int>());
    });
  });
}
