import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/goal_repository.dart';
import 'package:stayhardy/src/data/habit_repository.dart';
import 'package:stayhardy/src/data/insight_repository.dart';
import 'package:stayhardy/src/domain/civil_date.dart';

/// The gathering half of the review: what gets counted, and into which week.
void main() {
  late AppDatabase db;
  late InsightRepository insights;

  // A Saturday. The review therefore covers Sat 8 Aug – Fri 14 Aug, and the
  // week before it is Sat 1 Aug – Fri 7 Aug.
  final today = CivilDate(2026, 8, 15);
  final weekEnd = today.addDays(-1);
  final weekStart = weekEnd.addDays(-6);

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    final habits = HabitRepository(db);
    insights = InsightRepository(db, habits, GoalRepository(db));
  });

  tearDown(() async => db.close());

  Future<void> addHabit(
    String id, {
    String title = 'Read',
    String startDate = '2026-01-01',
    int? archivedAt,
  }) {
    return db.into(db.habits).insert(HabitsCompanion.insert(
          id: id,
          title: title,
          startDate: startDate,
          archivedAt: Value(archivedAt),
          createdAt: 1,
          updatedAt: 1,
        ));
  }

  Future<void> log(String habitId, CivilDate day) {
    return db.into(db.habitLogs).insert(HabitLogsCompanion.insert(
          id: '$habitId-${day.iso}',
          habitId: habitId,
          logDate: day.iso,
          loggedAt: 1,
          createdAt: 1,
          updatedAt: 1,
        ));
  }

  test('the reviewed week ends yesterday, never today', () async {
    await addHabit('h');
    // Every day of the week done, and today deliberately left undone.
    for (var d = weekStart; d.isAtOrBefore(weekEnd); d = d.addDays(1)) {
      await log('h', d);
    }

    final input = await insights.buildInput(on: today);

    expect(input.weekStart.iso, weekStart.iso);
    expect(input.weekEnd.iso, weekEnd.iso);
    // 7, not 8. Today is still in progress: a habit due this afternoon has not
    // been missed, and counting it would make every morning review read as a
    // collapse.
    expect(input.scheduled, 7);
    expect(input.completed, 7);
    expect(input.rate, 100);
  });

  test('the previous week is the seven days before that', () async {
    await addHabit('h');
    for (var d = weekStart; d.isAtOrBefore(weekEnd); d = d.addDays(1)) {
      await log('h', d);
    }
    // Three of the seven days before.
    for (var i = 1; i <= 3; i++) {
      await log('h', weekStart.addDays(-i));
    }

    final input = await insights.buildInput(on: today);
    expect(input.scheduledPrev, 7);
    expect(input.completedPrev, 3);
    expect(input.ratePrev, 43);
  });

  test('a habit is not scheduled before it existed', () async {
    // Created on the Wednesday of the reviewed week.
    await addHabit('h', startDate: weekStart.addDays(4).iso);
    await log('h', weekStart.addDays(4));

    final input = await insights.buildInput(on: today);
    // Three days scheduled (Wed–Fri), not seven. Counting the days before it
    // existed would make every new habit start by failing.
    expect(input.scheduled, 3);
    expect(input.completed, 1);
  });

  test('"best week before" excludes the week being reviewed', () async {
    await addHabit('h');
    // A strong week a month back.
    final old = weekStart.addDays(-28);
    for (var i = 0; i < 6; i++) {
      await log('h', old.addDays(i));
    }
    // And a perfect week now.
    for (var d = weekStart; d.isAtOrBefore(weekEnd); d = d.addDays(1)) {
      await log('h', d);
    }

    final input = await insights.buildInput(on: today);
    final h = input.habits.single;
    expect(h.completed, 7);
    expect(h.bestWeekBefore, 6);
  });

  test('dormancy is measured from the real last log, not the window edge',
      () async {
    await addHabit('h');
    // Six months ago — well outside the twelve-week evidence window.
    await log('h', today.addDays(-180));

    final input = await insights.buildInput(on: today);
    expect(input.habits.single.daysSinceLastCompletion, 180);
  });

  test('a habit never completed reports null rather than a fake age', () async {
    await addHabit('h');
    final input = await insights.buildInput(on: today);
    expect(input.habits.single.daysSinceLastCompletion, isNull);
    expect(input.habits.single.ageDays, greaterThan(200));
  });

  test('archived habits are left out of the review', () async {
    await addHabit('live');
    await addHabit('gone', archivedAt: 1);

    final input = await insights.buildInput(on: today);
    expect(input.habits.map((h) => h.id), ['live']);
  });

  test('focus minutes land in the week they were worked', () async {
    await addHabit('h');
    Future<void> session(CivilDate day, int seconds) {
      return db.into(db.focusSessions).insert(FocusSessionsCompanion.insert(
            id: 'f-${day.iso}',
            startedAt: 1,
            endedAt: const Value(2),
            plannedSeconds: seconds,
            actualSeconds: Value(seconds),
            localDate: day.iso,
            createdAt: 1,
            updatedAt: 1,
          ));
    }

    await session(weekStart.addDays(1), 25 * 60);
    await session(weekEnd, 20 * 60);
    await session(weekStart.addDays(-2), 60 * 60); // previous week

    final input = await insights.buildInput(on: today);
    expect(input.focusMinutes, 45);
    expect(input.focusMinutesPrev, 60);
  });

  test('an unfinished focus session is not counted', () async {
    await addHabit('h');
    await db.into(db.focusSessions).insert(FocusSessionsCompanion.insert(
          id: 'running',
          startedAt: 1,
          plannedSeconds: 1500,
          actualSeconds: const Value(600),
          localDate: weekEnd.iso,
          createdAt: 1,
          updatedAt: 1,
        ));

    final input = await insights.buildInput(on: today);
    expect(input.focusMinutes, 0);
  });

  test('history is bounded by the oldest habit, not by the window', () async {
    // Created ten days ago: one full week of evidence, nowhere near enough for
    // a weekday pattern.
    await addHabit('h', startDate: today.addDays(-10).iso);
    final input = await insights.buildInput(on: today);
    expect(input.weeksOfHistory, 1);
  });

  test('a goal with a target date carries how much of its time is gone',
      () async {
    await db.into(db.goals).insert(GoalsCompanion.insert(
          id: 'g',
          name: 'Run a half marathon',
          targetDate: Value(today.addDays(25).iso),
          // Created 75 days ago, so 75 of 100 days are gone.
          createdAt: DateTime(2026, 6, 1).millisecondsSinceEpoch,
          updatedAt: 1,
        ));

    final input = await insights.buildInput(on: today);
    final g = input.goals.single;
    expect(g.elapsedFraction, isNotNull);
    expect((g.elapsedFraction! * 100).round(), 75);
    expect(g.daysRemaining, 25);
  });

  test('a goal whose target date predates it does not divide by zero',
      () async {
    await db.into(db.goals).insert(GoalsCompanion.insert(
          id: 'g',
          name: 'Bad data',
          targetDate: Value(today.addDays(-400).iso),
          createdAt: DateTime(2026, 6, 1).millisecondsSinceEpoch,
          updatedAt: 1,
        ));

    final input = await insights.buildInput(on: today);
    expect(input.goals.single.elapsedFraction, isNull);
  });

  test('the whole review runs end to end on real rows', () async {
    await addHabit('h', title: 'Meditate');
    for (var d = weekStart; d.isAtOrBefore(weekEnd); d = d.addDays(1)) {
      await log('h', d);
    }

    final review = await insights.load(on: today);
    expect(review.hasEnoughData, isTrue);
    expect(review.insights, isNotEmpty);
    expect(review.insights.first.headline, contains('Meditate'));
  });
}
