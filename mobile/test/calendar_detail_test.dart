import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/calendar_repository.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/enums.dart';
import 'package:stayhardy/src/data/habit_repository.dart';
import 'package:stayhardy/src/data/task_repository.dart';
import 'package:stayhardy/src/domain/civil_date.dart';

/// The calendar is the only place history can be *changed*, so most of these
/// are about what it refuses to change.
void main() {
  late AppDatabase db;
  late HabitRepository habits;
  late CalendarRepository calendar;

  // A Saturday, mid-month.
  final today = CivilDate(2026, 8, 15);

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    habits = HabitRepository(db);
    calendar = CalendarRepository(db, habits);
  });

  tearDown(() async => db.close());

  Future<void> addHabit(
    String id, {
    String startDate = '2026-01-01',
    int? archivedAt,
    ScheduleKind kind = ScheduleKind.daily,
    int mask = 127,
  }) {
    return db.into(db.habits).insert(HabitsCompanion.insert(
          id: id,
          title: 'Habit $id',
          startDate: startDate,
          scheduleKind: Value(kind.value),
          weekdayMask: Value(mask),
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

  CalendarDay dayOf(List<CalendarDay> days, CivilDate d) =>
      days.firstWhere((x) => x.date.iso == d.iso);

  group('the month grid', () {
    test('covers the whole month, first to last', () async {
      await addHabit('h');
      final days = await calendar.loadMonth(today, on: today);

      expect(days.length, 31);
      expect(days.first.date.iso, '2026-08-01');
      expect(days.last.date.iso, '2026-08-31');
    });

    test('future days are never shown as missed', () async {
      await addHabit('h');
      final days = await calendar.loadMonth(today, on: today);

      final tomorrow = dayOf(days, today.addDays(1));
      expect(tomorrow.scheduled, 0);
      expect(tomorrow.isRestDay, isTrue,
          reason: 'a day that has not happened cannot have been missed');
    });

    test('a rest day is neither a win nor a loss', () async {
      // Weekdays only. Sunday 2026-08-16 is not scheduled.
      await addHabit('h', kind: ScheduleKind.weekdays, mask: 0x3E);
      final days = await calendar.loadMonth(today, on: today);

      final sunday = dayOf(days, CivilDate(2026, 8, 9));
      expect(sunday.isRestDay, isTrue);
      expect(sunday.rate, isNull,
          reason: 'null, not zero — nothing was due to be missed');
    });

    test('days before a habit existed are not counted against it', () async {
      await addHabit('h', startDate: '2026-08-10');
      final days = await calendar.loadMonth(today, on: today);

      expect(dayOf(days, CivilDate(2026, 8, 5)).scheduled, 0);
      expect(dayOf(days, CivilDate(2026, 8, 12)).scheduled, 1);
    });

    test('an archived habit still counts on the days it was live', () async {
      // Archived on the 10th. Dropping it entirely would make the user's whole
      // history quietly improve the moment they archive something.
      final archivedAt = DateTime(2026, 8, 10).millisecondsSinceEpoch;
      await addHabit('h', archivedAt: archivedAt);

      final days = await calendar.loadMonth(today, on: today);
      expect(dayOf(days, CivilDate(2026, 8, 5)).scheduled, 1);
      expect(dayOf(days, CivilDate(2026, 8, 14)).scheduled, 0);
    });

    test('completion and freezes are both reflected', () async {
      await addHabit('h');
      await log('h', CivilDate(2026, 8, 3));
      await db.into(db.habitFreezes).insert(HabitFreezesCompanion.insert(
            id: 'f1',
            habitId: 'h',
            freezeDate: '2026-08-04',
            createdAt: 1,
            updatedAt: 1,
          ));

      final days = await calendar.loadMonth(today, on: today);
      expect(dayOf(days, CivilDate(2026, 8, 3)).isComplete, isTrue);
      expect(dayOf(days, CivilDate(2026, 8, 4)).frozen, 1);
      expect(dayOf(days, CivilDate(2026, 8, 4)).isComplete, isFalse);
    });
  });

  group('backfilling', () {
    test('a forgotten day can be ticked off later', () async {
      await addHabit('h');
      final tuesday = CivilDate(2026, 8, 11);

      final ok = await calendar.setDone('h', tuesday, done: true, on: today);
      expect(ok, isTrue);

      final row = await db.select(db.habitLogs).getSingle();
      expect(row.logDate, tuesday.iso);
      // Flagged, so it stays distinguishable from a check-in made on the day —
      // which is what lets a paid challenge reject retroactive completions
      // later without a schema change then.
      expect(row.backfilled, isTrue);
    });

    test('ticking today is not marked as a backfill', () async {
      await addHabit('h');
      await calendar.setDone('h', today, done: true, on: today);

      expect((await db.select(db.habitLogs).getSingle()).backfilled, isFalse);
    });

    test('a future day is refused outright', () async {
      await addHabit('h');
      final ok = await calendar.setDone(
        'h',
        today.addDays(1),
        done: true,
        on: today,
      );

      expect(ok, isFalse);
      expect(await db.select(db.habitLogs).get(), isEmpty);
    });

    test('un-ticking removes the day', () async {
      await addHabit('h');
      final day = CivilDate(2026, 8, 11);
      await calendar.setDone('h', day, done: true, on: today);
      await calendar.setDone('h', day, done: false, on: today);

      expect(await db.select(db.habitLogs).get(), isEmpty);
    });

    test('ticking twice does not duplicate the day', () async {
      // The UNIQUE (habit_id, log_date) constraint is the real guard; this
      // asserts it converges instead of throwing, since the calendar and the
      // habit list can both be looking at the same day.
      await addHabit('h');
      final day = CivilDate(2026, 8, 11);
      await calendar.setDone('h', day, done: true, on: today);
      await calendar.setDone('h', day, done: true, on: today);

      expect((await db.select(db.habitLogs).get()).length, 1);
    });
  });

  group('the day sheet', () {
    test('lists only what was actually due', () async {
      await addHabit('daily');
      // Mon–Fri. The 15th is a Saturday.
      await addHabit('weekdays', kind: ScheduleKind.weekdays, mask: 0x3E);

      final entries = await calendar.entriesFor(today);
      expect(entries.map((e) => e.habit.id), ['daily']);
    });

    test('marks a frozen habit as frozen, not as done', () async {
      await addHabit('h');
      await db.into(db.habitFreezes).insert(HabitFreezesCompanion.insert(
            id: 'f1',
            habitId: 'h',
            freezeDate: today.iso,
            createdAt: 1,
            updatedAt: 1,
          ));

      final entry = (await calendar.entriesFor(today)).single;
      expect(entry.frozen, isTrue);
      expect(entry.done, isFalse);
    });
  });

  group('habit detail', () {
    test('rates ignore the open period', () async {
      await addHabit('h', startDate: today.addDays(-9).iso);
      // Nine sealed days, all done. Today deliberately left undone.
      for (var i = 1; i <= 9; i++) {
        await log('h', today.addDays(-i));
      }

      final detail = await habits.detailFor('h', on: today);
      // 100%, not 90% — today has not been missed, it has not happened yet.
      expect(detail.allTimeRate, 100);
      expect(detail.recentRate, 100);
      expect(detail.totalCompletions, 9);
    });

    test('carries first and last check-in, and the freeze count', () async {
      await addHabit('h');
      await log('h', CivilDate(2026, 8, 1));
      await log('h', CivilDate(2026, 8, 12));
      await db.into(db.habitFreezes).insert(HabitFreezesCompanion.insert(
            id: 'f1',
            habitId: 'h',
            freezeDate: '2026-08-05',
            createdAt: 1,
            updatedAt: 1,
          ));

      final detail = await habits.detailFor('h', on: today);
      expect(detail.firstLogDate, '2026-08-01');
      expect(detail.lastLogDate, '2026-08-12');
      expect(detail.freezesUsed, 1);
      expect(detail.hasHistory, isTrue);
    });

    test('a habit with no history reports zeroes, not nulls', () async {
      await addHabit('h');
      final detail = await habits.detailFor('h', on: today);

      expect(detail.totalCompletions, 0);
      expect(detail.currentStreak, 0);
      expect(detail.firstLogDate, isNull);
      expect(detail.hasHistory, isFalse);
    });
  });

  group('subtask counts', () {
    test('are grouped per parent, done and total', () async {
      Future<void> task(String id, {String? parent, bool done = false}) {
        return db.into(db.tasks).insert(TasksCompanion.insert(
              id: id,
              title: id,
              parentTaskId: Value(parent),
              status: Value(
                  done ? TaskStatus.completed.value : TaskStatus.pending.value),
              createdAt: 1,
              updatedAt: 1,
            ));
      }

      await task('parent');
      await task('a', parent: 'parent', done: true);
      await task('b', parent: 'parent', done: true);
      await task('c', parent: 'parent');
      await task('unrelated');

      final counts = await TaskRepository(db).subtaskCounts();

      expect(counts['parent'], (2, 3));
      expect(counts.containsKey('unrelated'), isFalse);
    });
  });
}
