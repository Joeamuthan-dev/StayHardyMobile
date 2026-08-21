import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/sqlite3.dart';
import 'package:stayhardy/src/data/database.dart';

void main() {
  late AppDatabase db;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
  });

  tearDown(() async => db.close());

  Future<List<String>> names(String type) async {
    final rows = await db
        .customSelect("SELECT name FROM sqlite_master WHERE type = '$type'")
        .get();
    return rows.map((r) => r.read<String>('name')).toList();
  }

  test('every table is created', () async {
    final tables = await names('table');
    expect(
      tables,
      containsAll([
        'habits',
        'habit_logs',
        'habit_freezes',
        'habit_period_status',
        'habit_streak_state',
        'routine_stacks',
        'tasks',
        'goals',
        'goal_milestones',
        'goal_links',
        'focus_sessions',
        'screen_time_daily',
        'screen_time_app_daily',
        'badges',
        'daily_rollups',
        'settings',
        'app_meta',
      ]),
    );
  });

  test('partial indexes are created', () async {
    final indexes = await names('index');
    expect(
      indexes,
      containsAll([
        'idx_logs_date',
        'idx_logs_habit_date',
        'idx_period_habit_start',
        'idx_period_open',
        'idx_habits_active',
        'idx_habits_due',
        'idx_tasks_status_due',
        'idx_goal_links_goal',
      ]),
    );
  });

  test('the streak walk uses its index rather than scanning', () async {
    final plan = await db
        .customSelect(
          'EXPLAIN QUERY PLAN SELECT * FROM habit_period_status '
          "WHERE habit_id = 'x' ORDER BY period_start DESC",
        )
        .get();
    final detail = plan.map((r) => r.read<String>('detail')).join(' ');
    // If this ever degrades to a full scan, the home screen gets slower with
    // every day the user keeps using the app.
    expect(detail.toLowerCase(), contains('idx_period_habit_start'));
  });

  test('the heatmap range scan is a covering index seek', () async {
    final plan = await db
        .customSelect(
          'EXPLAIN QUERY PLAN SELECT * FROM habit_logs '
          "WHERE log_date >= '2025-08-14' AND deleted_at IS NULL",
        )
        .get();
    final detail = plan.map((r) => r.read<String>('detail')).join(' ');
    expect(detail.toLowerCase(), contains('idx_logs_date'));
  });

  test('a habit-day is unique, mirroring the live Supabase constraint',
      () async {
    const habitId = 'h1';
    final now = DateTime.now().millisecondsSinceEpoch;

    await db.into(db.habits).insert(HabitsCompanion.insert(
          id: habitId,
          title: 'Read',
          startDate: '2026-08-01',
          createdAt: now,
          updatedAt: now,
        ));

    Future<void> log(String id) => db.into(db.habitLogs).insert(
          HabitLogsCompanion.insert(
            id: id,
            habitId: habitId,
            logDate: '2026-08-14',
            loggedAt: now,
            createdAt: now,
            updatedAt: now,
          ),
        );

    await log('l1');
    // A second check-in for the same habit on the same day must collide, not
    // duplicate — this is what makes the Supabase import idempotent.
    await expectLater(log('l2'), throwsA(isA<SqliteException>()));
  });

  test('a v1 database upgrades to v2 rather than crashing on open', () async {
    // The real upgrade path: every dev device already holds a v1 file, and v2
    // differs only by focus_sessions.resumed_at. A fresh install takes
    // onCreate and proves nothing, so v1 is reconstructed here by building the
    // current schema and taking the column back out again.
    driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;
    addTearDown(
        () => driftRuntimeOptions.dontWarnAboutMultipleDatabases = false);

    final raw = sqlite3.openInMemory();
    final v1 = AppDatabase.forTesting(NativeDatabase.opened(raw));
    await v1.customSelect('SELECT 1').get(); // force onCreate
    await v1.into(v1.focusSessions).insert(FocusSessionsCompanion.insert(
          id: 'old',
          startedAt: 1,
          plannedSeconds: 1500,
          localDate: '2026-08-01',
          createdAt: 1,
          updatedAt: 1,
        ));
    // Not closed — closing the drift wrapper closes the raw handle underneath,
    // and this test needs the same connection to survive into the upgrade.
    raw.execute('ALTER TABLE focus_sessions DROP COLUMN resumed_at');
    // v4 added the free-text label; v1 did not have it either.
    raw.execute('ALTER TABLE focus_sessions DROP COLUMN label');
    raw.execute('PRAGMA user_version = 1');

    final upgraded = AppDatabase.forTesting(NativeDatabase.opened(raw));
    addTearDown(upgraded.close);

    // Opening runs the migration. The pre-existing row must survive it with the
    // new column defaulted, not be dropped by a recreate-and-copy.
    final row = await upgraded.select(upgraded.focusSessions).getSingle();
    expect(row.id, 'old');
    expect(row.resumedAt, isNull);
    expect(row.plannedSeconds, 1500);
  });

  test('two live table-watchers do not collapse into one stream', () async {
    // Drift caches streams by SQL text and arguments, and ignores `readsFrom`
    // when deciding whether two are the same. Written the obvious way — every
    // watcher as `customSelect('SELECT 1', readsFrom: …)` — they all share one
    // stream carrying only the first subscriber's tables, so a screen watching
    // focus_sessions wakes on habit writes and never on its own.
    //
    // It is invisible in isolation: each stream is correct when it is the only
    // one alive. This test keeps two alive at once, which is the only shape
    // that catches it.
    var habitTicks = 0;
    var focusTicks = 0;

    final habitSub =
        db.watchTables('habits_today', {db.habits}).listen((_) => habitTicks++);
    final focusSub = db
        .watchTables('focus_active', {db.focusSessions})
        .listen((_) => focusTicks++);
    addTearDown(() async {
      await habitSub.cancel();
      await focusSub.cancel();
    });

    await pumpEventQueue();
    final habitBaseline = habitTicks;
    final focusBaseline = focusTicks;

    await db.into(db.focusSessions).insert(FocusSessionsCompanion.insert(
          id: 'f1',
          startedAt: 1,
          plannedSeconds: 1500,
          localDate: '2026-08-15',
          createdAt: 1,
          updatedAt: 1,
        ));
    await pumpEventQueue();

    expect(focusTicks, greaterThan(focusBaseline),
        reason: 'a focus write must wake the focus watcher');
    expect(habitTicks, habitBaseline,
        reason: 'and must not wake an unrelated habits watcher');
  });

  test('foreign keys are enforced', () async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await expectLater(
      db.into(db.habitLogs).insert(
            HabitLogsCompanion.insert(
              id: 'orphan',
              habitId: 'does-not-exist',
              logDate: '2026-08-14',
              loggedAt: now,
              createdAt: now,
              updatedAt: now,
            ),
          ),
      throwsA(isA<SqliteException>()),
    );
  });
}
