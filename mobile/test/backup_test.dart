import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/backup/backup_container.dart';
import 'package:stayhardy/src/backup/backup_service.dart';
import 'package:stayhardy/src/data/database.dart';

void main() {
  late AppDatabase db;
  late BackupService service;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    service = BackupService(db);
  });

  tearDown(() async => db.close());

  Future<void> addHabit(String id, {String title = 'Read', int at = 1000}) {
    return db.into(db.habits).insert(HabitsCompanion.insert(
          id: id,
          title: title,
          startDate: '2026-01-01',
          createdAt: at,
          updatedAt: at,
        ));
  }

  Future<void> addLog(String id, String habitId, String date) {
    return db.into(db.habitLogs).insert(HabitLogsCompanion.insert(
          id: id,
          habitId: habitId,
          logDate: date,
          loggedAt: 1000,
          createdAt: 1000,
          updatedAt: 1000,
        ));
  }

  Future<int> count(String table) async =>
      (await db.customSelect('SELECT COUNT(*) AS c FROM $table').getSingle())
          .read<int>('c');

  group('container', () {
    test('round-trips a header and rows', () async {
      await addHabit('h1');
      await addLog('l1', 'h1', '2026-08-01');

      final bytes = await service.createSnapshot(kind: 'manual');
      final header = BackupContainer.decodeHeader(bytes);

      expect(header.formatVersion, BackupHeader.currentFormat);
      expect(header.kind, 'manual');
      expect(header.counts['habits'], 1);
      expect(header.counts['habit_logs'], 1);
      expect(header.firstLogDate, '2026-08-01');

      final rows = BackupContainer.decodeRows(bytes);
      expect(rows.where((r) => r['_t'] == 'habits'), hasLength(1));
    });

    test('the header is readable without decompressing the payload', () async {
      // This is what makes restore-with-preview instant.
      for (var i = 0; i < 200; i++) {
        await addHabit('h$i', at: 1000 + i);
      }
      final bytes = await service.createSnapshot();
      expect(BackupContainer.decodeHeader(bytes).counts['habits'], 200);
    });

    test('rejects a file that is not a backup', () {
      expect(() => BackupContainer.decodeHeader([1, 2, 3, 4, 5]),
          throwsA(isA<CorruptBackupException>()));
    });

    test('rejects a truncated header', () {
      final bytes = [...'SHBK'.codeUnits, ...'{"v":1'.codeUnits];
      expect(() => BackupContainer.decodeHeader(bytes),
          throwsA(isA<CorruptBackupException>()));
    });

    test('rejects a corrupt payload rather than importing garbage', () async {
      await addHabit('h1');
      final bytes = await service.createSnapshot();
      // Mangle the compressed section.
      final broken = [...bytes.take(bytes.length - 12), 9, 9, 9, 9];
      expect(() => BackupContainer.decodeRows(broken),
          throwsA(isA<CorruptBackupException>()));
    });

    test('an empty database produces a valid backup', () async {
      final bytes = await service.createSnapshot();
      expect(BackupContainer.decodeHeader(bytes).totalRows, 0);
      expect(BackupContainer.decodeRows(bytes), isEmpty);
    });
  });

  group('restore', () {
    test('brings back everything after a wipe', () async {
      await addHabit('h1', title: 'Meditate');
      await addLog('l1', 'h1', '2026-08-01');
      await addLog('l2', 'h1', '2026-08-02');
      final bytes = await service.createSnapshot();

      await db.customStatement('DELETE FROM habit_logs');
      await db.customStatement('DELETE FROM habits');
      expect(await count('habits'), 0);

      await service.restore(bytes);
      expect(await count('habits'), 1);
      expect(await count('habit_logs'), 2);

      final habit = await (db.select(db.habits)
            ..where((h) => h.id.equals('h1')))
          .getSingle();
      expect(habit.title, 'Meditate');
    });

    test('merge keeps local rows the backup never saw', () async {
      await addHabit('h1');
      final bytes = await service.createSnapshot();

      await addHabit('h2', title: 'Added later');
      await service.restore(bytes);

      expect(await count('habits'), 2,
          reason: 'merge is non-destructive by definition');
    });

    test('replace discards local rows the backup does not contain', () async {
      await addHabit('h1');
      final bytes = await service.createSnapshot();

      await addHabit('h2', title: 'Added later');
      await service.restore(bytes, replace: true);

      expect(await count('habits'), 1);
    });

    test('a newer local edit survives an older backup', () async {
      await addHabit('h1', title: 'Original', at: 1000);
      final bytes = await service.createSnapshot();

      await (db.update(db.habits)..where((h) => h.id.equals('h1')))
          .write(const HabitsCompanion(
        title: Value('Renamed since'),
        updatedAt: Value(9999),
      ));

      await service.restore(bytes);
      final habit = await (db.select(db.habits)
            ..where((h) => h.id.equals('h1')))
          .getSingle();
      expect(habit.title, 'Renamed since',
          reason: 'last writer wins on updated_at');
    });

    test('a newer backup overwrites a stale local row', () async {
      await addHabit('h1', title: 'Newer', at: 5000);
      final bytes = await service.createSnapshot();

      await (db.update(db.habits)..where((h) => h.id.equals('h1')))
          .write(const HabitsCompanion(
        title: Value('Stale'),
        updatedAt: Value(100),
      ));

      await service.restore(bytes);
      final habit = await (db.select(db.habits)
            ..where((h) => h.id.equals('h1')))
          .getSingle();
      expect(habit.title, 'Newer');
    });

    test('a deletion wins a tie rather than resurrecting the row', () async {
      await addHabit('h1', at: 1000);
      await (db.update(db.habits)..where((h) => h.id.equals('h1')))
          .write(const HabitsCompanion(deletedAt: Value(1000)));
      final bytes = await service.createSnapshot();

      // Local has the same updated_at but is not deleted — the classic zombie.
      await (db.update(db.habits)..where((h) => h.id.equals('h1')))
          .write(const HabitsCompanion(deletedAt: Value.absent()));
      await db.customStatement(
          'UPDATE habits SET deleted_at = NULL WHERE id = ?', ['h1']);

      await service.restore(bytes);
      final habit = await (db.select(db.habits)
            ..where((h) => h.id.equals('h1')))
          .getSingle();
      expect(habit.deletedAt, isNotNull,
          reason: 'a delete made elsewhere must not be undone by a restore');
    });
  });

  group('habit_logs merge is a union, not last-writer-wins', () {
    test('restoring an OLD backup never erases recent check-ins', () async {
      // The bug this rule exists to prevent: restore an old backup, lose your
      // streak. A missing log is an absence of evidence, not a denial.
      await addHabit('h1');
      await addLog('old', 'h1', '2026-08-01');
      final oldBackup = await service.createSnapshot();

      await addLog('recent1', 'h1', '2026-08-20');
      await addLog('recent2', 'h1', '2026-08-21');
      expect(await count('habit_logs'), 3);

      await service.restore(oldBackup);

      expect(await count('habit_logs'), 3,
          reason: 'the two newer check-ins must survive the restore');
    });

    test('adds check-ins the local device is missing', () async {
      await addHabit('h1');
      await addLog('a', 'h1', '2026-08-01');
      await addLog('b', 'h1', '2026-08-02');
      final backup = await service.createSnapshot();

      await db.customStatement("DELETE FROM habit_logs WHERE id = 'b'");
      expect(await count('habit_logs'), 1);

      await service.restore(backup);
      expect(await count('habit_logs'), 2);
    });

    test('an explicit un-check still propagates', () async {
      // Un-checking writes a tombstone, which must beat a live local row —
      // otherwise a deliberate correction bounces back on every restore.
      await addHabit('h1');
      await addLog('a', 'h1', '2026-08-01');
      await db.customStatement(
          'UPDATE habit_logs SET deleted_at = 5000 WHERE id = ?', ['a']);
      final backup = await service.createSnapshot();

      await db.customStatement(
          'UPDATE habit_logs SET deleted_at = NULL WHERE id = ?', ['a']);

      await service.restore(backup);
      final log = await (db.select(db.habitLogs)
            ..where((l) => l.id.equals('a')))
          .getSingle();
      expect(log.deletedAt, isNotNull);
    });
  });

  group('derived data', () {
    test('is not carried in the payload', () async {
      expect(BackupService.backedUpTables, isNot(contains('daily_rollups')));
      expect(BackupService.backedUpTables,
          isNot(contains('habit_period_status')));
      expect(
          BackupService.backedUpTables, isNot(contains('habit_streak_state')));
    });

    test('is cleared on restore so no cache outlives its rows', () async {
      await addHabit('h1');
      final bytes = await service.createSnapshot();

      await db.into(db.dailyRollups).insert(DailyRollupsCompanion.insert(
            localDate: '2026-08-01',
            computedAt: 1000,
          ));
      expect(await count('daily_rollups'), 1);

      await service.restore(bytes);
      expect(await count('daily_rollups'), 0);
    });
  });

  group('screen time never leaves the device', () {
    test('is not in the backup table list', () {
      // The prominent disclosure the user accepts before granting usage access
      // says this data is never uploaded. A Drive backup is exactly it being
      // uploaded, so this is a promise the code has to keep, not a preference.
      for (final table in BackupService.excludedFromBackup) {
        expect(BackupService.backedUpTables, isNot(contains(table)));
      }
      expect(BackupService.excludedFromBackup,
          containsAll(['screen_time_daily', 'screen_time_app_daily']));
    });

    test('a snapshot contains no screen-time rows even when data exists',
        () async {
      await db.customStatement(
        "INSERT INTO screen_time_daily (local_date, total_foreground_ms, "
        "unlock_count, collected_at, is_partial) "
        "VALUES ('2026-08-14', 12600000, 88, 1, 0)",
      );
      await db.customStatement(
        "INSERT INTO screen_time_app_daily (local_date, package_name, "
        "app_label, foreground_ms, launch_count, category) "
        "VALUES ('2026-08-14', 'com.example.social', 'Social', 5400000, 22, 0)",
      );

      final bytes = await service.createSnapshot();
      final rows = BackupContainer.decodeRows(bytes);

      expect(rows.any((r) => '${r['_t']}'.startsWith('screen_time')), isFalse);
      // And nothing about it leaks through the header counts either.
      final header = BackupContainer.decodeHeader(bytes);
      expect(header.counts.keys.any((k) => k.startsWith('screen_time')),
          isFalse);
    });

    test('an older backup carrying screen-time rows does not restore them',
        () async {
      // Builds before this exclusion put the rows in the payload. Restoring one
      // must not put usage data back on a device that never collected it.
      final legacy = BackupContainer.encode(
        BackupHeader(
          formatVersion: BackupHeader.currentFormat,
          schemaVersion: 2,
          appVersion: '2.0.0',
          createdAt: 1,
          deviceId: 'old',
          deviceLabel: 'Old phone',
          kind: 'auto',
          counts: const {'screen_time_daily': 1},
        ),
        [
          {
            '_t': 'screen_time_daily',
            'local_date': '2026-08-14',
            'total_foreground_ms': 12600000,
            'unlock_count': 88,
            'collected_at': 1,
            'is_partial': 0,
          },
        ],
      );

      await service.restore(legacy);
      expect(await count('screen_time_daily'), 0);
    });
  });
}
