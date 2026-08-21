import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/enums.dart';
import 'package:stayhardy/src/data/habit_repository.dart';
import 'package:stayhardy/src/domain/civil_date.dart';

/// The seven-day trail and the week strip.
///
/// Both exist to show *which* days were kept, so the tests are about the days
/// they must refuse to mark as failures: days before the habit existed, days it
/// was never scheduled, and today.
void main() {
  late AppDatabase db;
  late HabitRepository repo;

  // A Saturday.
  final today = CivilDate(2026, 8, 15);

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    repo = HabitRepository(db);
  });

  tearDown(() async => db.close());

  Future<void> addHabit(
    String id, {
    ScheduleKind kind = ScheduleKind.daily,
    int mask = 127,
    String startDate = '2026-01-01',
    int? perPeriod,
  }) {
    return db.into(db.habits).insert(HabitsCompanion.insert(
          id: id,
          title: 'Habit $id',
          startDate: startDate,
          scheduleKind: Value(kind.value),
          weekdayMask: Value(mask),
          targetPerPeriod: Value(perPeriod),
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

  Future<HabitToday> only() async {
    final list = await repo.loadToday(today);
    expect(list, hasLength(1));
    return list.single;
  }

  group('a habit\'s seven-day trail', () {
    test('is seven days, oldest first, ending today', () async {
      await addHabit('a');
      final t = await only();
      expect(t.trail, hasLength(7));
      expect(t.trail.last, DayMark.pending, reason: 'today, not yet done');
    });

    test('marks the days that were completed', () async {
      await addHabit('a');
      await log('a', today.addDays(-3));
      await log('a', today.addDays(-1));

      final t = await only();
      expect(t.trail[3], DayMark.done);
      expect(t.trail[5], DayMark.done);
      expect(t.trail[4], DayMark.missed);
    });

    test('today is pending, never a miss', () async {
      // The single most important rule here. A habit you have not got to at
      // 9am is not a failure, and painting it red is how a tracker starts
      // feeling like a nag.
      await addHabit('a');
      final t = await only();
      expect(t.trail.last, DayMark.pending);
      expect(t.trail.last, isNot(DayMark.missed));
    });

    test('today is done once it is checked off', () async {
      await addHabit('a');
      await log('a', today);
      final t = await only();
      expect(t.trail.last, DayMark.done);
    });

    test('days before the habit existed are not misses', () async {
      // Otherwise every habit shows a week of failures on the day it is made.
      await addHabit('a', startDate: today.addDays(-2).iso);
      final t = await only();
      expect(t.trail.take(4), everyElement(DayMark.notDue));
      expect(t.trail[4], DayMark.missed);
    });

    test('days the habit was not scheduled are not misses', () async {
      // Mon–Sat, so the habit is due today (Saturday the 15th) and therefore
      // appears in today's list at all. The Sunday seven days back is the day
      // that must not read as a failure.
      await addHabit('w', kind: ScheduleKind.weekdays, mask: 0x7E);
      final t = await only();
      expect(t.trail.first, DayMark.notDue, reason: 'Sunday, not scheduled');
      expect(t.trail[2], DayMark.missed, reason: 'Tuesday, scheduled and missed');
      expect(t.trail.last, DayMark.pending, reason: 'today');
    });

    test('a frozen day reads as frozen, not as done or missed', () async {
      await addHabit('a');
      await db.into(db.habitFreezes).insert(HabitFreezesCompanion.insert(
            id: 'f1',
            habitId: 'a',
            freezeDate: today.addDays(-2).iso,
            createdAt: 1,
            updatedAt: 1,
          ));

      final t = await only();
      expect(t.trail[4], DayMark.frozen);
    });
  });

  group('the week strip', () {
    test('counts scheduled and completed per day', () async {
      await addHabit('a');
      await addHabit('b');
      await log('a', today.addDays(-1));

      final week = await repo.recentDays(on: today);
      expect(week, hasLength(7));
      expect(week[5].scheduled, 2);
      expect(week[5].completed, 1);
    });

    test('includes habits that are not due today', () async {
      // The reason this cannot be folded out of `loadToday`: that list drops a
      // Mon–Fri habit on a Saturday, so a strip built from it would lose the
      // habit's whole week every weekend.
      await addHabit('w', kind: ScheduleKind.weekdays, mask: 0x3E);
      expect(await repo.loadToday(today), isEmpty, reason: 'Saturday');

      final week = await repo.recentDays(on: today);
      expect(week[2].scheduled, 1, reason: 'Tuesday is still counted');
    });

    test('never schedules a habit before it existed', () async {
      await addHabit('a', startDate: today.addDays(-1).iso);
      final week = await repo.recentDays(on: today);
      expect(week.first.scheduled, 0);
      expect(week.last.scheduled, 1);
    });

    test('a flexible habit is never counted as a miss', () async {
      // Three-times-a-week is not "missed" on the four days you did not do it.
      // Counting it daily would show four phantom failures every week.
      await addHabit('f',
          kind: ScheduleKind.timesPerPeriod, perPeriod: 3);
      await log('f', today.addDays(-2));

      final week = await repo.recentDays(on: today);
      expect(week[4].scheduled, 1);
      expect(week[4].completed, 1);
      for (var i = 0; i < 7; i++) {
        if (i == 4) continue;
        expect(week[i].scheduled, 0,
            reason: 'day $i must not demand a flexible habit');
      }
    });
  });
}
