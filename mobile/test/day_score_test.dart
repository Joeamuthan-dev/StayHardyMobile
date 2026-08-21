import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/domain/day_score.dart';

/// The number on the dashboard.
///
/// A score people see every day has to be checkable by counting, and it has to
/// refuse to judge a day it has no evidence about.
void main() {
  group('the productivity score', () {
    test('is the plain fraction of obligations met', () {
      const s = DayScore(
        habitsDue: 4,
        habitsDone: 2,
        tasksDue: 4,
        tasksDone: 2,
      );
      expect(s.percent, 50);
      expect(s.summary, '4 of 8 done');
    });

    test('weights nothing — one obligation is one obligation', () {
      // Four habits done and no tasks scores the same as four tasks done and
      // no habits. A blend would need a defensible reason for 60/40 and there
      // is not one.
      const habitsOnly =
          DayScore(habitsDue: 4, habitsDone: 3, tasksDue: 0, tasksDone: 0);
      const tasksOnly =
          DayScore(habitsDue: 0, habitsDone: 0, tasksDue: 4, tasksDone: 3);
      expect(habitsOnly.percent, tasksOnly.percent);
    });

    test('a day with nothing due has no score, not a zero', () {
      const s = DayScore.empty;
      expect(s.percent, isNull,
          reason: 'a rest day greeted with a red 0% is a dashboard people close');
      expect(s.summary, 'Nothing scheduled today');
      expect(s.fraction, 0);
    });

    test('reports completion', () {
      const s = DayScore(habitsDue: 2, habitsDone: 2, tasksDue: 1, tasksDone: 1);
      expect(s.isComplete, isTrue);
      expect(s.percent, 100);
      expect(s.summary, 'Everything done');
    });

    test('an empty day is not complete', () {
      expect(DayScore.empty.isComplete, isFalse);
    });

    test('never exceeds 100 or drops below 0', () {
      // Reachable: tasks completed today that were not counted as due.
      const s = DayScore(habitsDue: 1, habitsDone: 5, tasksDue: 0, tasksDone: 0);
      expect(s.percent, 100);
    });

    test('outstanding counts never go negative', () {
      const s = DayScore(habitsDue: 1, habitsDone: 3, tasksDue: 0, tasksDone: 2);
      expect(s.habitsLeft, 0);
      expect(s.tasksLeft, 0);
    });
  });

  group('the screen-time deduction', () {
    // A day where every obligation was met, so the deduction is the only
    // thing that can move the number.
    const perfect =
        DayScore(habitsDue: 4, habitsDone: 4, tasksDue: 0, tasksDone: 0);

    DayScore withLeisure(int? minutes) => DayScore(
          habitsDue: perfect.habitsDue,
          habitsDone: perfect.habitsDone,
          tasksDue: 0,
          tasksDone: 0,
          leisureMinutes: minutes,
        );

    test('unknown screen time deducts nothing', () {
      // The single most important rule. Screen time is opt-in and off for most
      // people; if this deducted, granting usage access would drop everybody's
      // score the moment they trusted the app with more.
      expect(withLeisure(null).penalty, 0);
      expect(withLeisure(null).percent, 100);
      expect(withLeisure(null).hasPenalty, isFalse);
      expect(withLeisure(null).penaltyLabel, isNull);
    });

    test('null is not the same as zero leisure', () {
      expect(withLeisure(null).penalty, withLeisure(0).penalty);
      // Both deduct nothing, but for different reasons — and only one of them
      // is a measurement.
      expect(withLeisure(null).leisureMinutes, isNull);
      expect(withLeisure(0).leisureMinutes, 0);
    });

    test('the free allowance costs nothing', () {
      expect(withLeisure(DayScore.freeLeisureMinutes).penalty, 0);
      expect(withLeisure(DayScore.freeLeisureMinutes - 1).penalty, 0);
    });

    test('deducts past the allowance, in proportion', () {
      // Half way up the ramp is half the maximum.
      final half = withLeisure(
        DayScore.freeLeisureMinutes + DayScore.fullPenaltyAfterMinutes ~/ 2,
      );
      expect(half.penalty, closeTo(DayScore.maxScreenPenalty / 2, 1));
    });

    test('is capped however extreme the day', () {
      expect(withLeisure(10000).penalty, DayScore.maxScreenPenalty);
      expect(withLeisure(10000).percent,
          100 - DayScore.maxScreenPenalty);
    });

    test('can subtract but never add', () {
      // A day of pure productivity apps must not push you past the work you
      // actually promised to do.
      const half =
          DayScore(habitsDue: 4, habitsDone: 2, tasksDue: 0, tasksDone: 0);
      final spotless = DayScore(
        habitsDue: 4,
        habitsDone: 2,
        tasksDue: 0,
        tasksDone: 0,
        leisureMinutes: 0,
      );
      expect(spotless.percent, half.percent);
      expect(spotless.percent! <= 50, isTrue);
    });

    test('never drives the score below zero', () {
      final s = DayScore(
        habitsDue: 10,
        habitsDone: 0,
        tasksDue: 0,
        tasksDone: 0,
        leisureMinutes: 100000,
      );
      expect(s.percent, 0);
    });

    test('a rest day still has no score, heavy phone use or not', () {
      final s = DayScore(
        habitsDue: 0,
        habitsDone: 0,
        tasksDue: 0,
        tasksDone: 0,
        leisureMinutes: 600,
      );
      expect(s.percent, isNull,
          reason: 'there is no score to deduct from on a day off');
    });

    test('screen time cannot take "everything done" away', () {
      final s = withLeisure(600);
      expect(s.isComplete, isTrue,
          reason: 'they did every single thing they set out to do');
      expect(s.percent! < 100, isTrue, reason: 'but the number still reflects it');
      expect(s.summary.contains('before screen time'), isTrue);
    });

    test('the deduction is stated, never silent', () {
      final s = withLeisure(300);
      expect(s.penaltyLabel, isNotNull);
      expect(s.penaltyLabel!.contains('${s.penalty}'), isTrue);
      expect(s.penaltyLabel!.contains('5h'), isTrue,
          reason: 'it has to say how much time, or it cannot be argued with');
    });

    test('base stays visible underneath', () {
      final s = withLeisure(600);
      expect(s.basePercent, 100);
      expect(s.percent, 100 - DayScore.maxScreenPenalty);
    });
  });
}
