import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/migration/legacy_source.dart';
import 'package:stayhardy/src/migration/migration_service.dart';

/// An in-memory stand-in for the legacy Supabase tables.
///
/// Deliberately implements real keyset paging rather than returning everything
/// at once, so the resume and cursor logic is genuinely exercised.
class FakeLegacySource implements LegacySource {
  FakeLegacySource(this.data);

  final Map<LegacyTable, List<Map<String, dynamic>>> data;

  /// Throw on the Nth call to [page] to simulate a mid-migration failure.
  int? failOnPageCall;
  int pageCalls = 0;

  @override
  Future<int> count(LegacyTable table) async => (data[table] ?? const []).length;

  @override
  Future<List<Map<String, dynamic>>> page(
    LegacyTable table, {
    String? afterCursor,
    String? afterId,
    int limit = 500,
  }) async {
    pageCalls++;
    if (failOnPageCall != null && pageCalls == failOnPageCall) {
      throw StateError('network died');
    }

    final rows = [...(data[table] ?? const <Map<String, dynamic>>[])]..sort((a, b) {
        final c = (a[table.cursorColumn] ?? '')
            .toString()
            .compareTo((b[table.cursorColumn] ?? '').toString());
        return c != 0
            ? c
            : (a['id'] ?? '').toString().compareTo((b['id'] ?? '').toString());
      });

    final after = afterCursor == null
        ? rows
        : rows.where((r) {
            final c = (r[table.cursorColumn] ?? '').toString();
            if (c != afterCursor) return c.compareTo(afterCursor) > 0;
            return (r['id'] ?? '').toString().compareTo(afterId ?? '') > 0;
          }).toList();

    return after.take(limit).toList();
  }
}

void main() {
  late AppDatabase db;

  setUp(() => db = AppDatabase.forTesting(NativeDatabase.memory()));
  tearDown(() async => db.close());

  Map<LegacyTable, List<Map<String, dynamic>>> sampleData({int logDays = 5}) {
    return {
      LegacyTable.routines: [
        {
          'id': 'r-1',
          'title': 'Meditate',
          'days': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          'category': 'Mindset',
          'created_at': '2025-03-02T04:00:00.000Z',
        },
        {
          'id': 'r-2',
          'title': 'Gym',
          'days': ['Mon', 'Wed', 'Fri'],
          'created_at': '2025-03-03T04:00:00.000Z',
        },
      ],
      LegacyTable.routineLogs: [
        for (var i = 0; i < logDays; i++)
          {
            'id': 'l-$i',
            'routine_id': 'r-1',
            'completed_at':
                '2025-06-${(i + 1).toString().padLeft(2, '0')}',
            'created_at':
                '2025-06-${(i + 1).toString().padLeft(2, '0')}T19:00:00.000Z',
          },
      ],
      LegacyTable.goals: [
        {
          'id': 'g-1',
          'name': 'Half marathon',
          'status': 'pending',
          'createdAt': '2026-01-05T09:00:00.000Z',
        },
      ],
      LegacyTable.tasks: [
        {
          'id': 't-1',
          'title': 'Call bank',
          'status': 'completed',
          'priority': 'High',
          'createdAt': '2026-02-01T09:00:00.000Z',
        },
      ],
      LegacyTable.userBadges: [
        {'badge_key': 'streak_7', 'earned_at': '2025-04-01T00:00:00.000Z'},
      ],
    };
  }

  MigrationService serviceFor(FakeLegacySource src, {int pageSize = 500}) =>
      MigrationService(
        db: db,
        source: src,
        authUserId: 'user-1',
        pageSize: pageSize,
      );

  Future<int> countRows(String table) async {
    final r =
        await db.customSelect('SELECT COUNT(*) AS c FROM $table').getSingle();
    return r.read<int>('c');
  }

  test('imports every entity and reconciles counts', () async {
    final src = FakeLegacySource(sampleData());
    final result = await serviceFor(src).run();

    expect(result.state, MigrationState.completed,
        reason: 'lastError: ${result.lastError}');
    expect(result.countsReconcile, isTrue);

    expect(await countRows('habits'), 2);
    expect(await countRows('habit_logs'), 5);
    expect(await countRows('goals'), 1);
    expect(await countRows('tasks'), 1);
    expect(await countRows('badges'), 1);
  });

  test('logs attach to the habit that owns them', () async {
    final src = FakeLegacySource(sampleData());
    await serviceFor(src).run();

    final habit = await (db.select(db.habits)
          ..where((h) => h.remoteId.equals('r-1')))
        .getSingle();
    final logs = await (db.select(db.habitLogs)
          ..where((l) => l.habitId.equals(habit.id)))
        .get();

    expect(logs, hasLength(5));
    expect(logs.map((l) => l.logDate), contains('2025-06-01'));
  });

  test('running twice does not duplicate anything', () async {
    final src = FakeLegacySource(sampleData());
    await serviceFor(src).run();

    // Second call short-circuits on the completed marker.
    await serviceFor(src).run();
    expect(await countRows('habits'), 2);
    expect(await countRows('habit_logs'), 5);
  });

  test('re-importing after the marker is cleared still does not duplicate',
      () async {
    // The real idempotency guarantee: remoteId is unique and writes upsert, so
    // a forced re-run over the same source converges rather than doubling.
    final src = FakeLegacySource(sampleData());
    await serviceFor(src).run();

    await db.customStatement(
        "DELETE FROM app_meta WHERE key = '$kMigrationMetaKey'");
    await serviceFor(src).run();

    expect(await countRows('habits'), 2);
    expect(await countRows('habit_logs'), 5);
    expect(await countRows('goals'), 1);
  });

  test('resumes from the exact page boundary after a failure', () async {
    final data = sampleData(logDays: 25);
    final src = FakeLegacySource(data)..failOnPageCall = 3;

    final first = await serviceFor(src, pageSize: 10).run();
    expect(first.state, MigrationState.failed);
    expect(first.lastError, contains('network died'));

    // Routines completed; logs are partially in.
    final partial = await countRows('habit_logs');
    expect(partial, greaterThan(0));
    expect(partial, lessThan(25));

    // Retry with the network restored.
    src.failOnPageCall = null;
    final second = await serviceFor(src, pageSize: 10).run();

    expect(second.state, MigrationState.completed);
    expect(await countRows('habit_logs'), 25);
    expect(await countRows('habits'), 2, reason: 'no re-import duplicates');
  });

  test('an orphaned log is skipped without stalling the migration', () async {
    final data = sampleData();
    data[LegacyTable.routineLogs] = [
      ...data[LegacyTable.routineLogs]!,
      {
        'id': 'l-orphan',
        'routine_id': 'routine-that-was-deleted',
        'completed_at': '2025-07-01',
      },
    ];

    final result = await serviceFor(FakeLegacySource(data)).run();

    expect(result.state, MigrationState.completed);
    expect(await countRows('habit_logs'), 5, reason: 'orphan not written');
  });

  test('a duplicate habit-day collapses instead of failing', () async {
    final data = sampleData();
    data[LegacyTable.routineLogs] = [
      {
        'id': 'l-a',
        'routine_id': 'r-1',
        'completed_at': '2025-06-01',
        'created_at': '2025-06-01T19:00:00.000Z',
      },
      {
        'id': 'l-b',
        'routine_id': 'r-1',
        'completed_at': '2025-06-01',
        'created_at': '2025-06-01T21:00:00.000Z',
      },
    ];

    final result = await serviceFor(FakeLegacySource(data)).run();
    expect(result.state, MigrationState.completed);
    expect(await countRows('habit_logs'), 1);
  });

  test('an empty account completes rather than hanging', () async {
    final result = await serviceFor(FakeLegacySource({})).run();
    expect(result.state, MigrationState.completed);
    expect(result.totalImported, 0);
    expect(await countRows('habits'), 0);
  });

  test('progress is persisted so a cold start can resume', () async {
    final src = FakeLegacySource(sampleData());
    await serviceFor(src).run();

    // A brand new service instance reads the marker written by the last one.
    final reloaded = await serviceFor(FakeLegacySource({})).load();
    expect(reloaded.state, MigrationState.completed);
    expect(reloaded.authUserId, 'user-1');
    expect(reloaded.of(LegacyTable.routines).imported, 2);
  });

  test('a corrupt marker does not wedge the migration permanently', () async {
    await db.into(db.appMeta).insertOnConflictUpdate(
          const MetaEntry(key: kMigrationMetaKey, value: '{not json'),
        );

    final result = await serviceFor(FakeLegacySource(sampleData())).run();
    expect(result.state, MigrationState.completed);
    expect(await countRows('habits'), 2);
  });

  test('progress fraction moves and ends at 1', () async {
    final src = FakeLegacySource(sampleData(logDays: 20));
    final seen = <double>[];
    final result =
        await serviceFor(src, pageSize: 5).run(onProgress: (p) => seen.add(p.fraction));

    expect(result.state, MigrationState.completed);
    expect(seen.where((f) => f > 0 && f < 1), isNotEmpty,
        reason: 'the UI needs intermediate values to animate');
    expect(seen.last, 1.0);
  });
}
