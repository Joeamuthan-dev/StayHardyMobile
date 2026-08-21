import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqlite3/sqlite3.dart';
import 'package:sqlite3_flutter_libs/sqlite3_flutter_libs.dart';

import 'tables.dart';

part 'database.g.dart';

@DriftDatabase(
  tables: [
    Habits,
    HabitLogs,
    HabitFreezes,
    HabitPeriodStatus,
    HabitStreakState,
    RoutineStacks,
    Tasks,
    Goals,
    GoalMilestones,
    GoalLinks,
    FocusSessions,
    MoodLogs,
    ScreenTimeDaily,
    ScreenTimeAppDaily,
    Badges,
    DailyRollups,
    Settings,
    AppMeta,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_open());

  /// For tests — an isolated in-memory database.
  AppDatabase.forTesting(super.executor);

  @override
  int get schemaVersion => 4;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) async {
          await m.createAll();
          await _createIndexes();
        },
        // v1 shipped to nobody — 2.0 is unreleased — but the upgrade path is
        // written anyway. Every dev device already holds a v1 file, and a
        // database that only works on a fresh install is a database whose
        // migrations are never exercised until the day they matter.
        onUpgrade: (m, from, to) async {
          if (from < 2) {
            await m.addColumn(focusSessions, focusSessions.resumedAt);
          }
          if (from < 3) {
            await m.createTable(moodLogs);
          }
          if (from < 4) {
            await m.addColumn(focusSessions, focusSessions.label);
          }
          await _createIndexes();
        },
        beforeOpen: (details) async {
          // Enforced per-connection, not persisted in the file.
          await customStatement('PRAGMA foreign_keys = ON');
          // WAL: readers never block the writer. The home screen reads on every
          // frame of a check-off animation while the write commits.
          await customStatement('PRAGMA journal_mode = WAL');
          // NORMAL is the right durability trade under WAL — a power loss can
          // cost the last transaction, never the database.
          await customStatement('PRAGMA synchronous = NORMAL');
          await customStatement('PRAGMA busy_timeout = 5000');
        },
      );

  /// A tick whenever any of [tables] changes, for repositories that recompute a
  /// whole view rather than run one query.
  ///
  /// **[key] must be unique across the app, and that is not cosmetic.** Drift
  /// caches and de-duplicates streams by their SQL text and arguments, and
  /// ignores `readsFrom` when deciding whether two are the same stream. Every
  /// watcher written as `customSelect('SELECT 1', readsFrom: …)` therefore
  /// collapses into a *single* stream carrying only the table set of whichever
  /// subscribed first — so a screen watching `focus_sessions` would wake on
  /// habit writes and never on its own.
  ///
  /// That bug is invisible in isolation: each stream works perfectly in a test
  /// where it is the only one. It only appears once two of them are alive at
  /// once, as a screen that is simply, quietly stale.
  ///
  /// [key] is interpolated into the SQL, so it is asserted to be a bare
  /// identifier rather than trusted.
  Stream<void> watchTables(String key, Set<ResultSetImplementation> tables) {
    assert(
      RegExp(r'^[a-z][a-z0-9_]*$').hasMatch(key),
      'Watcher key must be a bare lowercase identifier: got "$key"',
    );
    return customSelect('SELECT 1 AS $key', readsFrom: tables).watch();
  }

  /// Indexes are created by hand rather than via Drift's `indexes:` so the
  /// partial `WHERE deleted_at IS NULL` clauses can be expressed.
  ///
  /// Partial indexes matter here specifically because deletes are soft: a plain
  /// index degrades as tombstones accumulate, since every lookup still walks
  /// rows the query will discard.
  Future<void> _createIndexes() async {
    const statements = [
      // Global heatmap and "what happened on day X".
      'CREATE INDEX IF NOT EXISTS idx_logs_date ON habit_logs (log_date) '
          'WHERE deleted_at IS NULL',
      // Per-habit history. DESC matches the direction the streak walk reads.
      'CREATE INDEX IF NOT EXISTS idx_logs_habit_date ON habit_logs (habit_id, log_date DESC) '
          'WHERE deleted_at IS NULL',
      // THE streak index: a backward index scan with an early exit.
      'CREATE INDEX IF NOT EXISTS idx_period_habit_start '
          'ON habit_period_status (habit_id, period_start DESC)',
      // Rollover touches only open periods.
      'CREATE INDEX IF NOT EXISTS idx_period_open ON habit_period_status (period_end) '
          'WHERE sealed = 0',
      'CREATE INDEX IF NOT EXISTS idx_habits_active ON habits (archived_at, sort_index) '
          'WHERE deleted_at IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_habits_due ON habits (schedule_kind, weekday_mask) '
          'WHERE deleted_at IS NULL AND archived_at IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_habits_stack ON habits (stack_id, stack_position) '
          'WHERE deleted_at IS NULL AND stack_id IS NOT NULL',
      // Top-level task list, excluding subtasks.
      'CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks (status, due_date) '
          'WHERE deleted_at IS NULL AND parent_task_id IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks (parent_task_id) '
          'WHERE deleted_at IS NULL AND parent_task_id IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_tasks_goal ON tasks (goal_id) '
          'WHERE deleted_at IS NULL AND goal_id IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_goal_links_goal ON goal_links (goal_id) '
          'WHERE deleted_at IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_goal_links_entity '
          'ON goal_links (entity_type, entity_id) WHERE deleted_at IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_milestones_goal ON goal_milestones (goal_id) '
          'WHERE deleted_at IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_freezes_habit ON habit_freezes (habit_id, freeze_date) '
          'WHERE deleted_at IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_focus_date ON focus_sessions (local_date) '
          'WHERE deleted_at IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_screen_app_date ON screen_time_app_daily (local_date)',
      'CREATE INDEX IF NOT EXISTS idx_mood_date ON mood_logs (log_date DESC) '
          'WHERE deleted_at IS NULL',
    ];
    for (final s in statements) {
      await customStatement(s);
    }
  }
}

QueryExecutor _open() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'stayhardy.sqlite'));

    // Android ships wildly varying system SQLite builds — API 24 devices are on
    // 3.9, which predates several features used here. sqlite3_flutter_libs
    // bundles a known-good build so behaviour does not depend on the handset.
    await applyWorkaroundToOpenSqlite3OnOldAndroidVersions();
    sqlite3.tempDirectory = (await getTemporaryDirectory()).path;

    return NativeDatabase.createInBackground(file);
  });
}
