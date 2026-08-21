import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/enums.dart';
import 'package:stayhardy/src/data/habit_repository.dart';
import 'package:stayhardy/src/data/stats_repository.dart';
import 'package:stayhardy/src/domain/civil_date.dart';
import 'package:stayhardy/src/domain/consistency_trend.dart';

/// The headline percentage and the curve underneath it must be the same claim.
///
/// They are computed by two different repositories from two different queries,
/// and for a while they disagreed: a flexible "3x a week" habit is never due on
/// any particular day, so its check-in landed in the rate's numerator with
/// nothing of its own in the denominator — paying down the *daily* habits'
/// quota. The card showed 73% above a curve whose own data said 71%.
///
/// These tests exist so that can never be true again.
void main() {
  late AppDatabase db;
  late HabitRepository habits;
  late StatsRepository stats;

  final today = CivilDate.today();

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    habits = HabitRepository(db);
    stats = StatsRepository(db, habits);
  });

  tearDown(() async => db.close());

  Future<void> addHabit(
    String id, {
    ScheduleKind kind = ScheduleKind.daily,
    int mask = 127,
    int? perPeriod,
    int startedDaysAgo = 200,
  }) {
    return db.into(db.habits).insert(HabitsCompanion.insert(
          id: id,
          title: 'Habit $id',
          startDate: today.addDays(-startedDaysAgo).iso,
          scheduleKind: Value(kind.value),
          weekdayMask: Value(mask),
          targetPerPeriod: Value(perPeriod),
          createdAt: 1,
          updatedAt: 1,
        ));
  }

  Future<void> log(String habitId, int daysAgo) {
    final day = today.addDays(-daysAgo);
    return db.into(db.habitLogs).insert(HabitLogsCompanion.insert(
          id: '$habitId-${day.iso}',
          habitId: habitId,
          logDate: day.iso,
          loggedAt: 1,
          createdAt: 1,
          updatedAt: 1,
        ));
  }

  /// The rate the curve implies, straight from the tallies it is drawn with.
  Future<int> curveRate(int days) async {
    final tallies = await habits.recentDays(days: days);
    final scheduled = tallies.fold<int>(0, (a, t) => a + t.scheduled);
    final completed = tallies.fold<int>(0, (a, t) => a + t.completed);
    return scheduled == 0 ? 0 : ((completed / scheduled) * 100).round();
  }

  Future<int> headline(StatsRange range) async =>
      (await stats.load(range)).habitRate;

  test('headline and curve agree with only daily habits', () async {
    await addHabit('a');
    await addHabit('b');
    for (var i = 1; i < 30; i += 2) {
      await log('a', i);
    }
    for (var i = 1; i < 30; i += 3) {
      await log('b', i);
    }
    expect(await headline(StatsRange.days30), await curveRate(30));
  });

  test('a flexible habit cannot pay down a daily habit\'s quota', () async {
    // The exact shape that broke it: two daily habits mostly missed, and a
    // 3x-a-week habit reliably kept. The kept flexible days must not make the
    // daily misses look like hits.
    await addHabit('daily1');
    await addHabit('daily2');
    await addHabit(
      'flex',
      kind: ScheduleKind.timesPerPeriod,
      perPeriod: 3,
    );

    for (var i = 1; i <= 28; i++) {
      if (i % 3 == 0) await log('flex', i);
      if (i % 7 == 0) await log('daily1', i);
    }

    expect(await headline(StatsRange.days30), await curveRate(30));
  });

  test('agreement holds at every range the app offers', () async {
    await addHabit('a');
    await addHabit('b', kind: ScheduleKind.weekdays, mask: 62);
    await addHabit('c', kind: ScheduleKind.timesPerPeriod, perPeriod: 2);

    for (var i = 1; i <= 120; i++) {
      if (i % 2 == 0) await log('a', i);
      if (i % 5 == 0) await log('b', i);
      if (i % 4 == 0) await log('c', i);
    }

    for (final r in StatsRange.values) {
      expect(await headline(r), await curveRate(r.days),
          reason: 'ranges must not each invent their own definition: ${r.label}');
    }
  });

  test('a day off-schedule does not inflate the rate above 100', () async {
    // A weekdays habit logged on a Sunday used to land in the numerator with
    // no denominator behind it.
    await addHabit('weekday', kind: ScheduleKind.weekdays, mask: 62);
    for (var i = 0; i <= 29; i++) {
      await log('weekday', i);
    }
    final rate = await headline(StatsRange.days30);
    expect(rate, lessThanOrEqualTo(100));
    expect(rate, await curveRate(30));
  });

  test('the trend built from those tallies reports the same current band',
      () async {
    await addHabit('a');
    for (var i = 1; i <= 30; i++) {
      await log('a', i);
    }
    final trend = ConsistencyTrend.from(await habits.recentDays(days: 30));
    expect(trend.zone, ConsistencyZone.lockedIn);
    expect(await headline(StatsRange.days30), greaterThanOrEqualTo(80));
  });
}
