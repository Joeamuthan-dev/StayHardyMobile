import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/calendar_repository.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/enums.dart';
import 'package:stayhardy/src/data/habit_repository.dart';
import 'package:stayhardy/src/domain/civil_date.dart';

/// Retroactive check-ins must be marked as such.
///
/// `habit_logs.backfilled` is not decoration: `ChallengeService.tallyFor`
/// refuses to count a backfilled log, which is the only thing stopping someone
/// from filling in a month of history the night before a paid cohort settles.
/// Every path that can write a log for a day other than today has to set it.
void main() {
  late AppDatabase db;
  late HabitRepository habits;

  setUp(() async {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    habits = HabitRepository(db);
    await db.into(db.habits).insert(HabitsCompanion.insert(
          id: 'h',
          title: 'Run',
          startDate: '2020-01-01',
          scheduleKind: Value(ScheduleKind.daily.value),
          createdAt: 1,
          updatedAt: 1,
        ));
  });

  tearDown(() async => db.close());

  Future<HabitLog> logFor(CivilDate day) async {
    return (db.select(db.habitLogs)
          ..where((l) => l.logDate.equals(day.iso)))
        .getSingle();
  }

  group('toggle', () {
    test('today is not a backfill', () async {
      await habits.toggle('h');
      expect((await logFor(CivilDate.today())).backfilled, isFalse);
    });

    test('an explicit today is not a backfill either', () async {
      final today = CivilDate.today();
      await habits.toggle('h', on: today);
      expect((await logFor(today)).backfilled, isFalse);
    });

    test('a past day IS marked as a backfill', () async {
      // The bug this test exists for: `toggle` took an `on:` date and called
      // `toggleOn` without the flag, so a past day was recorded as though it
      // had been ticked on the day itself.
      final yesterday = CivilDate.today().addDays(-1);
      await habits.toggle('h', on: yesterday);
      expect((await logFor(yesterday)).backfilled, isTrue,
          reason: 'the challenge engine must be able to reject this');
    });

    test('toggling a past day off still removes it', () async {
      final past = CivilDate.today().addDays(-3);
      await habits.toggle('h', on: past);
      await habits.toggle('h', on: past);
      expect(
        await (db.select(db.habitLogs)
              ..where((l) => l.logDate.equals(past.iso)))
            .getSingleOrNull(),
        isNull,
      );
    });
  });

  group('the calendar', () {
    test('marks a past day as a backfill', () async {
      final repo = CalendarRepository(db, habits);
      final past = CivilDate.today().addDays(-2);
      await repo.setDone('h', past, done: true);
      expect((await logFor(past)).backfilled, isTrue);
    });

    test('does not mark today as one', () async {
      final repo = CalendarRepository(db, habits);
      final today = CivilDate.today();
      await repo.setDone('h', today, done: true);
      expect((await logFor(today)).backfilled, isFalse);
    });

    test('refuses to tick a day that has not happened', () async {
      final repo = CalendarRepository(db, habits);
      final tomorrow = CivilDate.today().addDays(1);
      expect(await repo.setDone('h', tomorrow, done: true), isFalse);
      expect(
        await (db.select(db.habitLogs)
              ..where((l) => l.logDate.equals(tomorrow.iso)))
            .getSingleOrNull(),
        isNull,
      );
    });
  });

  group('every write path agrees', () {
    test('no path can create a past log that claims to be same-day', () async {
      // The guarantee, stated once. If a third write path is ever added, this
      // is the test that should fail.
      final past = CivilDate.today().addDays(-5);

      await habits.toggle('h', on: past);
      expect((await logFor(past)).backfilled, isTrue);
      await habits.toggle('h', on: past);

      await CalendarRepository(db, habits).setDone('h', past, done: true);
      expect((await logFor(past)).backfilled, isTrue);
    });
  });
}
