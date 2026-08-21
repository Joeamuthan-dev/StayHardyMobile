import 'package:drift/drift.dart' hide isNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/freeze_service.dart';
import 'package:stayhardy/src/data/habit_repository.dart';
import 'package:stayhardy/src/data/settings_repository.dart';
import 'package:stayhardy/src/domain/civil_date.dart';
import 'package:stayhardy/src/domain/freeze_rules.dart';

/// Ordering and freezes, exercised against a real SQLite file rather than the
/// pure rules — the parts that can only go wrong in the database.
void main() {
  late AppDatabase db;
  late HabitRepository habits;
  late SettingsRepository settings;
  late FreezeService freezes;

  final today = CivilDate(2026, 8, 15);

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    habits = HabitRepository(db);
    settings = SettingsRepository(db);
    freezes = FreezeService(db, habits, settings);
  });

  tearDown(() async => db.close());

  Future<void> addHabit(
    String id, {
    int sortIndex = 0,
    int createdAt = 1000,
    String startDate = '2026-01-01',
  }) {
    return db.into(db.habits).insert(HabitsCompanion.insert(
          id: id,
          title: 'Habit $id',
          startDate: startDate,
          sortIndex: Value(sortIndex),
          createdAt: createdAt,
          updatedAt: createdAt,
        ));
  }

  /// Logs [days] consecutive days ending [endingDaysAgo] days before [today].
  Future<void> log(String habitId, List<int> daysAgo) async {
    for (final d in daysAgo) {
      await db.into(db.habitLogs).insert(HabitLogsCompanion.insert(
            id: '$habitId-$d',
            habitId: habitId,
            logDate: today.addDays(-d).iso,
            loggedAt: 1,
            createdAt: 1,
            updatedAt: 1,
          ));
    }
  }

  group('reorder', () {
    test('writes a dense order and reads it back', () async {
      await addHabit('a', sortIndex: 0, createdAt: 1);
      await addHabit('b', sortIndex: 1, createdAt: 2);
      await addHabit('c', sortIndex: 2, createdAt: 3);

      await habits.reorder(['c', 'a', 'b']);

      final ordered = await habits.activeHabits();
      expect(ordered.map((h) => h.id), ['c', 'a', 'b']);
      expect(ordered.map((h) => h.sortIndex), [0, 1, 2]);
    });

    test('ties break on creation order, not at random', () async {
      // Every migrated habit with no legacy ordinal lands on sort_index 0. A
      // list that reshuffles between builds makes dragging look broken.
      await addHabit('a', createdAt: 300);
      await addHabit('b', createdAt: 100);
      await addHabit('c', createdAt: 200);

      final ordered = await habits.activeHabits();
      expect(ordered.map((h) => h.id), ['b', 'c', 'a']);
    });

    test('a habit created while the screen was open is not renumbered',
        () async {
      await addHabit('a', sortIndex: 0, createdAt: 1);
      await addHabit('b', sortIndex: 1, createdAt: 2);
      // Created after the reorder screen loaded, so it is not in the payload.
      await addHabit('late', sortIndex: 9, createdAt: 3);

      await habits.reorder(['b', 'a']);

      final ordered = await habits.activeHabits();
      expect(ordered.map((h) => h.id), ['b', 'a', 'late']);
    });

    test('reordering marks rows dirty so a backup picks the change up',
        () async {
      await addHabit('a', sortIndex: 0, createdAt: 1);
      await db.customStatement('UPDATE habits SET dirty = 0');

      await habits.reorder(['a']);

      final row = await habits.byId('a');
      expect(row!.dirty, isTrue);
    });

    test('an empty payload is a no-op, not a wipe', () async {
      await addHabit('a', sortIndex: 5, createdAt: 1);
      await habits.reorder([]);
      expect((await habits.byId('a'))!.sortIndex, 5);
    });

    test('archived habits are neither listed nor reordered', () async {
      await addHabit('a', sortIndex: 0, createdAt: 1);
      await addHabit('gone', sortIndex: 1, createdAt: 2);
      await habits.archive('gone');

      final ordered = await habits.activeHabits();
      expect(ordered.map((h) => h.id), ['a']);
    });
  });

  group('freeze rollover', () {
    test('the first run seeds a balance but forgives nothing', () async {
      await addHabit('a');
      // 20 completed days, with a gap yesterday.
      await log('a', [for (var d = 2; d <= 21; d++) d]);

      final result = await freezes.runRollover(on: today);

      expect(result.ran, isTrue);
      expect(result.saves, isEmpty);
      final state = await db.select(db.habitStreakState).getSingle();
      expect(state.freezeBalance, FreezeRules.maxBalance);
    });

    test('a second run on the same day does nothing', () async {
      await addHabit('a');
      await log('a', [for (var d = 1; d <= 20; d++) d]);

      await freezes.runRollover(on: today);
      final second = await freezes.runRollover(on: today);

      expect(second.ran, isFalse);
      expect(second.saves, isEmpty);
    });

    test('a forward day repairs a gap and records one freeze row', () async {
      await addHabit('a');
      // Complete through two days ago, then miss yesterday.
      await log('a', [for (var d = 2; d <= 21; d++) d]);

      // Yesterday's run: banks freezes, nothing to forgive yet.
      await freezes.runRollover(on: today.addDays(-1));
      // Today's run: yesterday is now sealed and unsatisfied.
      final result = await freezes.runRollover(on: today);

      expect(result.saves.length, 1);
      expect(result.saves.single.date, today.addDays(-1).iso);

      final rows = await db.select(db.habitFreezes).get();
      expect(rows.length, 1);
      expect(rows.single.freezeDate, today.addDays(-1).iso);
    });

    test('the repaired streak survives, and is cached', () async {
      await addHabit('a');
      await log('a', [for (var d = 2; d <= 21; d++) d]);

      await freezes.runRollover(on: today.addDays(-1));
      await freezes.runRollover(on: today);

      final state = await db.select(db.habitStreakState).getSingle();
      // 20 worked days plus the forgiven one.
      expect(state.currentStreak, 21);
      expect(state.freezeBalance, FreezeRules.maxBalance - 1);
    });

    test('the live streak agrees with the cached one after a repair', () async {
      await addHabit('a');
      await log('a', [for (var d = 2; d <= 21; d++) d]);

      await freezes.runRollover(on: today.addDays(-1));
      await freezes.runRollover(on: today);

      // Nothing is scheduled-out today, so the habit is on the list.
      final live = await habits.loadToday(today);
      final state = await db.select(db.habitStreakState).getSingle();
      expect(live.single.streak, state.currentStreak);
    });

    test('a clock moved backwards grants nothing and holds the watermark',
        () async {
      await addHabit('a');
      await log('a', [for (var d = 1; d <= 20; d++) d]);
      await freezes.runRollover(on: today);

      final rewound = await freezes.runRollover(on: today.addDays(-5));

      expect(rewound.ran, isFalse);
      expect(
        await settings.getString(SettingsKeys.lastFreezeRunDate),
        today.iso,
      );
    });

    test('a repaired day is never repaired again on a later run', () async {
      await addHabit('a');
      // Missed yesterday, but today is done — so tomorrow's run finds no new
      // gap and must not touch the day it already forgave.
      await log('a', [0, for (var d = 2; d <= 21; d++) d]);

      await freezes.runRollover(on: today.addDays(-1));
      await freezes.runRollover(on: today);
      await freezes.runRollover(on: today.addDays(1));

      final rows = await db.select(db.habitFreezes).get();
      expect(rows.length, 1);
      expect(rows.single.freezeDate, today.addDays(-1).iso);
    });

    test('a gap that opens after an earlier repair is repaired separately',
        () async {
      await addHabit('a');
      await log('a', [for (var d = 2; d <= 21; d++) d]);

      await freezes.runRollover(on: today.addDays(-1)); // banks 2
      await freezes.runRollover(on: today); // forgives yesterday
      await freezes.runRollover(on: today.addDays(1)); // today also missed

      final rows = await db.select(db.habitFreezes).get()
        ..sort((a, b) => a.freezeDate.compareTo(b.freezeDate));
      expect(rows.map((r) => r.freezeDate),
          [today.addDays(-1).iso, today.iso]);

      // And the bank is now empty, so a third miss breaks the streak.
      final state = await db.select(db.habitStreakState).getSingle();
      expect(state.freezeBalance, 0);
    });

    test('a habit with no history is left alone', () async {
      await addHabit('a', startDate: today.iso);
      final result = await freezes.runRollover(on: today);

      expect(result.saves, isEmpty);
      final state = await db.select(db.habitStreakState).getSingle();
      expect(state.currentStreak, 0);
      expect(state.freezeBalance, 0);
    });
  });
}
