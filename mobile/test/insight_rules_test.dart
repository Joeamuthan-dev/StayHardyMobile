import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/domain/civil_date.dart';
import 'package:stayhardy/src/domain/consistency_trend.dart';
import 'package:stayhardy/src/domain/insight_rules.dart';

/// An insight engine fails in two directions, and the second is worse.
///
/// Saying too little is a dull screen. Saying something confident and unearned —
/// "Tuesday is your weakest day" from two Tuesdays — makes the user stop
/// believing the rest of the app. Most of these tests assert **silence**.
void main() {
  final weekEnd = CivilDate(2026, 8, 14);
  final weekStart = weekEnd.addDays(-6);

  HabitWeek habit({
    String id = 'h1',
    String title = 'Read 20 pages',
    int scheduled = 7,
    int completed = 7,
    int scheduledPrev = 7,
    int completedPrev = 7,
    int currentStreak = 0,
    int ageDays = 120,
    int bestWeekBefore = 0,
    int? daysSinceLastCompletion = 0,
  }) =>
      HabitWeek(
        id: id,
        title: title,
        scheduled: scheduled,
        completed: completed,
        scheduledPrev: scheduledPrev,
        completedPrev: completedPrev,
        currentStreak: currentStreak,
        ageDays: ageDays,
        bestWeekBefore: bestWeekBefore,
        daysSinceLastCompletion: daysSinceLastCompletion,
      );

  ReviewInput input({
    List<HabitWeek> habits = const [],
    List<GoalWeek> goals = const [],
    List<int>? weekdayScheduled,
    List<int>? weekdayCompleted,
    List<int>? dayScheduled,
    List<int>? dayCompleted,
    List<int>? weekRates,
    int weeksOfHistory = 12,
    int scheduled = 7,
    int completed = 7,
    int? checkIns,
    int scheduledPrev = 7,
    int completedPrev = 7,
    int focusMinutes = 0,
    int focusMinutesPrev = 0,
  }) =>
      ReviewInput(
        weekStart: weekStart,
        weekEnd: weekEnd,
        habits: habits,
        goals: goals,
        weekdayScheduled: weekdayScheduled ?? List<int>.filled(7, 0),
        weekdayCompleted: weekdayCompleted ?? List<int>.filled(7, 0),
        dayScheduled: dayScheduled ?? List<int>.filled(7, 1),
        dayCompleted: dayCompleted ?? List<int>.filled(7, 1),
        weekRates: weekRates ?? List<int>.filled(12, 0),
        weeksOfHistory: weeksOfHistory,
        scheduled: scheduled,
        checkIns: checkIns ?? completed,
        completed: completed,
        scheduledPrev: scheduledPrev,
        completedPrev: completedPrev,
        focusMinutes: focusMinutes,
        focusMinutesPrev: focusMinutesPrev,
        tasksCompleted: 0,
        tasksCompletedPrev: 0,
      );

  Set<InsightKind> kindsOf(ReviewInput i) =>
      InsightEngine.generate(i).map((e) => e.kind).toSet();

  group('evidence guards', () {
    test('a brand-new habit is never called dormant', () {
      // Created three days ago and not done yet. Technically "nothing logged",
      // but calling it abandoned would greet a new user by telling them they
      // have already failed.
      final k = kindsOf(input(habits: [
        habit(ageDays: 3, daysSinceLastCompletion: null, scheduled: 3,
            completed: 0, scheduledPrev: 0, completedPrev: 0),
      ], scheduled: 3, completed: 0, scheduledPrev: 0, completedPrev: 0));
      expect(k, isNot(contains(InsightKind.dormant)));
    });

    test('a habit never completed but long-established is dormant', () {
      final k = kindsOf(input(habits: [
        habit(ageDays: 60, daysSinceLastCompletion: null, scheduled: 7,
            completed: 0, scheduledPrev: 7, completedPrev: 0),
      ]));
      expect(k, contains(InsightKind.dormant));
    });

    test('a rate change on one or two scheduled days is noise, not a trend',
        () {
      // 1 of 2 -> 2 of 2 is a 50-point jump on nothing.
      final k = kindsOf(input(habits: [
        habit(scheduled: 2, completed: 2, scheduledPrev: 2, completedPrev: 1),
      ]));
      expect(k, isNot(contains(InsightKind.improving)));
    });

    test('a small rate change is not reported even with enough data', () {
      // 5/7 -> 6/7 is real but not material; reporting it every week trains the
      // user to ignore the screen.
      final k = kindsOf(input(habits: [
        habit(scheduled: 7, completed: 6, scheduledPrev: 7, completedPrev: 5),
      ]));
      expect(k, isNot(contains(InsightKind.improving)));
      expect(k, isNot(contains(InsightKind.slipping)));
    });

    test('weekday patterns stay silent under four weeks of history', () {
      final scheduled = List<int>.filled(7, 8);
      final completed = List<int>.filled(7, 7)..[2] = 1; // dire Tuesdays
      final k = kindsOf(input(
        weeksOfHistory: 3,
        weekdayScheduled: scheduled,
        weekdayCompleted: completed,
      ));
      expect(k, isNot(contains(InsightKind.weakWeekday)));
    });

    test('weekday patterns need samples on the weekday itself', () {
      // Twelve weeks of history, but almost nothing is ever scheduled — so
      // there is still nothing to say about any particular day.
      final scheduled = List<int>.filled(7, 1);
      final completed = List<int>.filled(7, 0);
      final k = kindsOf(input(
        weeksOfHistory: 12,
        weekdayScheduled: scheduled,
        weekdayCompleted: completed,
      ));
      expect(k, isNot(contains(InsightKind.weakWeekday)));
    });

    test('a weak weekday is named once it is earned', () {
      final scheduled = List<int>.filled(7, 10);
      final completed = List<int>.filled(7, 9)..[2] = 2;
      final found = InsightEngine.generate(input(
        weeksOfHistory: 12,
        weekdayScheduled: scheduled,
        weekdayCompleted: completed,
      ));
      final weak =
          found.firstWhere((i) => i.kind == InsightKind.weakWeekday);
      expect(weak.headline, contains('Tuesday'));
      expect(weak.detail, contains('20%'));
    });

    test('a two-day streak is not worth interrupting anyone about', () {
      final k = kindsOf(input(habits: [
        habit(currentStreak: 2, daysSinceLastCompletion: 3),
      ]));
      expect(k, isNot(contains(InsightKind.streakAtRisk)));
    });

    test('a real streak going cold is the top-ranked thing said', () {
      final found = InsightEngine.generate(input(
        habits: [
          habit(id: 'a', currentStreak: 40, daysSinceLastCompletion: 2),
          habit(id: 'b', title: 'Meditate', scheduled: 7, completed: 7,
              scheduledPrev: 7, completedPrev: 7),
        ],
      ));
      expect(found.first.kind, InsightKind.streakAtRisk);
      expect(found.first.action, isNotNull);
    });

    test('a goal with no deadline can never be behind', () {
      final k = kindsOf(input(goals: [
        const GoalWeek(
          id: 'g',
          name: 'Learn guitar',
          progress: 2,
          linkedHabits: 1,
          milestonesTotal: 3,
        ),
      ]));
      expect(k, isNot(contains(InsightKind.goalBehind)));
    });

    test('a goal trailing its own clock is flagged', () {
      final found = InsightEngine.generate(input(goals: [
        const GoalWeek(
          id: 'g',
          name: 'Run a half marathon',
          progress: 20,
          linkedHabits: 1,
          milestonesTotal: 3,
          elapsedFraction: 0.8,
          daysRemaining: 20,
        ),
      ]));
      final behind = found.firstWhere((i) => i.kind == InsightKind.goalBehind);
      expect(behind.detail, contains('20%'));
      expect(behind.detail, contains('80%'));
      expect(behind.detail, contains('20 days left'));
    });

    test('a goal slightly behind is left alone', () {
      final k = kindsOf(input(goals: [
        const GoalWeek(
          id: 'g',
          name: 'Run a half marathon',
          progress: 45,
          linkedHabits: 1,
          milestonesTotal: 3,
          elapsedFraction: 0.55,
        ),
      ]));
      expect(k, isNot(contains(InsightKind.goalBehind)));
    });

    test('a quiet week produces nothing rather than filler', () {
      expect(InsightEngine.generate(input(weeksOfHistory: 1)), isEmpty);
    });
  });

  group('selection', () {
    test('never more than the cap, however much is wrong', () {
      final many = [
        for (var i = 0; i < 12; i++)
          habit(
            id: 'h$i',
            title: 'Habit $i',
            scheduled: 7,
            completed: 1,
            scheduledPrev: 7,
            completedPrev: 7,
          ),
      ];
      final found = InsightEngine.generate(input(habits: many));
      expect(found.length, InsightRules.maxShown);
    });

    test('one habit cannot fill the review by tripping three rules', () {
      // Slipping, dormant, and a streak at risk all at once.
      final found = InsightEngine.generate(input(habits: [
        habit(
          scheduled: 7,
          completed: 0,
          scheduledPrev: 7,
          completedPrev: 7,
          currentStreak: 30,
          daysSinceLastCompletion: 20,
        ),
      ]));
      expect(found.where((i) => i.habitId == 'h1').length, 1);
    });

    test('a win survives even when risks outrank it', () {
      // Six habits collapsing plus one perfect. Risks all outweigh the win, so
      // a plain top-N would show nothing but failure — and that review gets
      // closed and never opened again.
      final habits = [
        for (var i = 0; i < 6; i++)
          habit(
            id: 'bad$i',
            title: 'Bad $i',
            scheduled: 7,
            completed: 0,
            scheduledPrev: 7,
            completedPrev: 7,
            currentStreak: 20 + i,
            daysSinceLastCompletion: 5,
          ),
        habit(id: 'good', title: 'Meditate', scheduled: 7, completed: 7,
            scheduledPrev: 7, completedPrev: 7),
      ];
      final found = InsightEngine.generate(input(habits: habits));
      expect(found.length, InsightRules.maxShown);
      expect(found.any((i) => i.tone == InsightTone.win), isTrue);
    });

    test('ranking puts the most actionable first', () {
      final found = InsightEngine.generate(input(habits: [
        habit(id: 'a', title: 'Dormant', ageDays: 90,
            daysSinceLastCompletion: 30, scheduled: 7, completed: 0,
            scheduledPrev: 7, completedPrev: 0),
        habit(id: 'b', title: 'Streak', currentStreak: 25,
            daysSinceLastCompletion: 3),
      ]));
      expect(found.first.kind, InsightKind.streakAtRisk);
    });
  });

  group('wins', () {
    test('a perfect week is called out', () {
      final found = InsightEngine.generate(input(habits: [habit()]));
      final win = found.firstWhere((i) => i.kind == InsightKind.perfectWeek);
      expect(win.tone, InsightTone.win);
      expect(win.detail, contains('All 7'));
    });

    test('"best week yet" needs a previous best to beat', () {
      // First week ever is not a record — everything is a record.
      final k = kindsOf(input(habits: [
        habit(scheduled: 7, completed: 7, bestWeekBefore: 0),
      ]));
      expect(k, isNot(contains(InsightKind.newBest)));
    });

    test('beating the previous best is a record', () {
      final found = InsightEngine.generate(input(habits: [
        habit(scheduled: 7, completed: 7, bestWeekBefore: 5),
      ]));
      expect(found.first.kind, InsightKind.newBest);
    });

    test('focus is only reported once there is enough of it', () {
      expect(
        kindsOf(input(focusMinutes: 25, focusMinutesPrev: 0)),
        isNot(contains(InsightKind.focusUp)),
      );
      expect(
        kindsOf(input(focusMinutes: 120, focusMinutesPrev: 20)),
        contains(InsightKind.focusUp),
      );
    });
  });

  group('overload', () {
    test('a heavy week half-done is called structural', () {
      final k = kindsOf(input(scheduled: 30, completed: 10));
      expect(k, contains(InsightKind.overloaded));
    });

    test('a light week half-done is just a couple of missed days', () {
      final k = kindsOf(input(scheduled: 6, completed: 2));
      expect(k, isNot(contains(InsightKind.overloaded)));
    });
  });

  group('the review week strip', () {
    test('a strong day is the same line the curve calls Locked In', () {
      // Two copies of a threshold is how "7 / 7 strong days" ends up printed
      // under five amber dots.
      expect(ReviewInput.strongDayFloor, ConsistencyZone.lockedIn.floor);
    });

    test('counts only days that had something due', () {
      final i = input(
        dayScheduled: const [2, 2, 0, 0, 4, 4, 1],
        dayCompleted: const [2, 1, 0, 0, 4, 1, 1],
      );
      // Kept: day0 (100%), day4 (100%), day6 (100%). Day1 is 50%, day5 is 25%.
      expect(i.strongDays, 3);
      expect(i.trackedDays, 5);
    });

    test('a week of rest days is neither strong nor a failure', () {
      final i = input(
        dayScheduled: const [0, 0, 0, 0, 0, 0, 0],
        dayCompleted: const [0, 0, 0, 0, 0, 0, 0],
      );
      expect(i.strongDays, 0);
      expect(i.trackedDays, 0);
    });

    test('float noise cannot demote a genuine 80% day', () {
      final i = input(
        dayScheduled: const [10, 0, 0, 0, 0, 0, 0],
        dayCompleted: const [8, 0, 0, 0, 0, 0, 0],
      );
      expect(i.strongDays, 1);
    });

    test('check-ins are the user\'s work, not the rate\'s numerator', () {
      // Tick a habit on a day it was not due and it is still a check-in you
      // made; it just does not belong in a percentage. Reporting the rate's
      // numerator under the word "Check-ins" under-counts real work.
      final i = input(completed: 30, checkIns: 34);
      expect(i.checkIns, 34);
      expect(i.completed, 30);
      expect(i.checkIns, greaterThanOrEqualTo(i.completed));
    });

    test('best week ignores a window with nothing in it', () {
      expect(input(weekRates: const [0, 0, 0]).bestWeekRate, isNull);
      expect(input(weekRates: const [40, 88, 69]).bestWeekRate, 88);
      // A single week has nothing to be "best" against.
      expect(input(weekRates: const [72]).bestWeekRate, isNull);
    });
  });
}
