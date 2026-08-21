import 'package:drift/drift.dart';

import '../data/database.dart';
import '../domain/civil_date.dart';
import 'backup_container.dart';

/// What a restore would do, shown before anything is written.
class RestorePreview {
  const RestorePreview({
    required this.header,
    required this.added,
    required this.updated,
    required this.unchanged,
    required this.localOnly,
  });

  final BackupHeader header;

  /// Rows in the backup that do not exist locally.
  final Map<String, int> added;

  /// Rows the backup would overwrite because it holds a newer version.
  final Map<String, int> updated;

  final Map<String, int> unchanged;

  /// Local rows the backup knows nothing about. A merge keeps these; a replace
  /// discards them — which is exactly why the distinction is shown.
  final Map<String, int> localOnly;

  int get totalAdded => added.values.fold(0, (a, b) => a + b);
  int get totalUpdated => updated.values.fold(0, (a, b) => a + b);
  int get totalLocalOnly => localOnly.values.fold(0, (a, b) => a + b);
}

/// Snapshot, preview, and restore.
///
/// Tables carrying user intent are backed up. Derived tables
/// (`habit_period_status`, `habit_streak_state`, `daily_rollups`) are excluded
/// and rebuilt after a restore — backing them up would roughly triple the
/// payload and risk restoring a cache that disagrees with the rows it came from.
class BackupService {
  BackupService(this._db);

  final AppDatabase _db;

  /// Order matters on restore: parents before children, so a foreign key never
  /// points at a row that has not landed yet.
  static const backedUpTables = <String>[
    'habits',
    'habit_logs',
    'habit_freezes',
    'routine_stacks',
    'goals',
    'goal_milestones',
    'goal_links',
    'tasks',
    'focus_sessions',
    'mood_logs',
    'badges',
    'settings',
  ];

  /// Deliberately NOT backed up: `screen_time_daily`, `screen_time_app_daily`.
  ///
  /// The prominent disclosure the user accepts before granting usage access
  /// says this data never leaves their phone, and a Drive backup is exactly it
  /// leaving their phone. That promise is a Play commitment as well as a
  /// straightforward one to the user, so the exclusion belongs here rather than
  /// in a comment on the screen. Screen time is re-read from Android on a new
  /// device anyway — there is nothing to restore.
  static const excludedFromBackup = <String>[
    'screen_time_daily',
    'screen_time_app_daily',
  ];

  /// Tables merged by union rather than last-writer-wins. See [_mergeRow].
  static const _unionTables = {'habit_logs'};

  /// Tables with no `updated_at` / `deleted_at`; newest write simply wins.
  static const _simpleTables = {
    'settings',
    'badges',
  };

  static const _primaryKeys = <String, List<String>>{
    'settings': ['key'],
    'badges': ['key'],
    'screen_time_daily': ['local_date'],
    'screen_time_app_daily': ['local_date', 'package_name'],
  };

  static List<String> _keyOf(String table) => _primaryKeys[table] ?? const ['id'];

  Future<List<Map<String, dynamic>>> _dump(String table) async {
    final rows = await _db.customSelect('SELECT * FROM $table').get();
    return rows.map((r) => {'_t': table, ...r.data}).toList();
  }

  Future<List<Map<String, dynamic>>> _dumpSince(
      String table, String dateColumn, String cutoffIso) async {
    final rows = await _db.customSelect(
      'SELECT * FROM $table WHERE $dateColumn >= ?',
      variables: [Variable.withString(cutoffIso)],
    ).get();
    return rows.map((r) => {'_t': table, ...r.data}).toList();
  }

  Future<BackupHeader> _header({
    required String kind,
    required String appVersion,
    required String deviceId,
    required String deviceLabel,
    required Map<String, int> counts,
  }) async {
    final range = await _db
        .customSelect(
          'SELECT MIN(log_date) AS first, MAX(log_date) AS last '
          'FROM habit_logs WHERE deleted_at IS NULL',
        )
        .getSingleOrNull();

    return BackupHeader(
      formatVersion: BackupHeader.currentFormat,
      schemaVersion: _db.schemaVersion,
      appVersion: appVersion,
      createdAt: DateTime.now().millisecondsSinceEpoch,
      deviceId: deviceId,
      deviceLabel: deviceLabel,
      kind: kind,
      counts: counts,
      firstLogDate: range?.readNullable<String>('first'),
      lastLogDate: range?.readNullable<String>('last'),
    );
  }

  /// A full snapshot. Backups are never deltas — a delta chain has corruption
  /// modes that a full copy simply does not.
  /// Dated tables and the column that dates them, for the free tier's
  /// 30-day window. Structure tables (habits, goals, tasks, settings…) are
  /// always whole — a backup with habits but no habit definitions restores
  /// to nonsense.
  static const _datedTables = <String, String>{
    'habit_logs': 'log_date',
    'habit_freezes': 'freeze_date',
    'focus_sessions': 'local_date',
    'mood_logs': 'log_date',
  };

  Future<List<int>> createSnapshot({
    String kind = 'auto',
    String appVersion = '2.0.0',
    String deviceId = 'unknown',
    String deviceLabel = 'This device',
    int? logWindowDays,
  }) async {
    final rows = <Map<String, dynamic>>[];
    final counts = <String, int>{};

    final cutoff = logWindowDays == null
        ? null
        : CivilDate.today().addDays(-logWindowDays).iso;

    for (final table in backedUpTables) {
      final dateColumn = _datedTables[table];
      final dumped = cutoff != null && dateColumn != null
          ? await _dumpSince(table, dateColumn, cutoff)
          : await _dump(table);
      counts[table] = dumped.length;
      rows.addAll(dumped);
    }

    final header = await _header(
      kind: kind,
      appVersion: appVersion,
      deviceId: deviceId,
      deviceLabel: deviceLabel,
      counts: counts,
    );
    return BackupContainer.encode(header, rows);
  }

  /// What restoring [bytes] would change. Reads only.
  Future<RestorePreview> preview(List<int> bytes) async {
    final header = BackupContainer.decodeHeader(bytes);
    final rows = BackupContainer.decodeRows(bytes);

    final added = <String, int>{};
    final updated = <String, int>{};
    final unchanged = <String, int>{};
    final localOnly = <String, int>{};
    final seenKeys = <String, Set<String>>{};

    for (final row in rows) {
      final table = row['_t'] as String;
      final key = _rowKey(table, row);
      (seenKeys[table] ??= <String>{}).add(key);

      final local = await _findLocal(table, row);
      if (local == null) {
        added[table] = (added[table] ?? 0) + 1;
      } else if (_incomingWins(table, row, local)) {
        updated[table] = (updated[table] ?? 0) + 1;
      } else {
        unchanged[table] = (unchanged[table] ?? 0) + 1;
      }
    }

    for (final table in backedUpTables) {
      final total = (await _db
              .customSelect('SELECT COUNT(*) AS c FROM $table')
              .getSingle())
          .read<int>('c');
      final matched = (unchanged[table] ?? 0) + (updated[table] ?? 0);
      final extra = total - matched;
      if (extra > 0) localOnly[table] = extra;
    }

    return RestorePreview(
      header: header,
      added: added,
      updated: updated,
      unchanged: unchanged,
      localOnly: localOnly,
    );
  }

  /// Apply a backup.
  ///
  /// [replace] wipes local rows the backup does not contain. Merge is the
  /// default because it is the only non-destructive option; replace exists for
  /// "this device is wrong, make it match" and is gated behind an explicit
  /// confirmation in the UI.
  Future<void> restore(List<int> bytes, {bool replace = false}) async {
    final rows = BackupContainer.decodeRows(bytes);

    await _db.transaction(() async {
      if (replace) {
        // Children first so foreign keys never dangle mid-wipe.
        for (final table in backedUpTables.reversed) {
          await _db.customStatement('DELETE FROM $table');
        }
      }

      for (final table in backedUpTables) {
        for (final row in rows.where((r) => r['_t'] == table)) {
          final payload = Map<String, dynamic>.from(row)..remove('_t');
          final local = replace ? null : await _findLocal(table, row);

          if (local == null) {
            await _insert(table, payload);
          } else if (_incomingWins(table, row, local)) {
            await _update(table, payload);
          }
        }
      }
    });

    // Derived tables are rebuilt from the restored rows rather than carried in
    // the payload, so a cache can never outlive the data it described.
    //
    // One knock-on worth knowing: `habit_streak_state` also holds the freeze
    // ratchet (`freezes_earned_total`), so a restore lets the next rollover
    // re-grant entitlement. That tops the bank back up to `maxBalance` and no
    // further — it cannot accumulate, and it cannot reach past periods, because
    // spending is still gated on `last_freeze_run_date` and the repair window.
    await _db.customStatement('DELETE FROM habit_period_status');
    await _db.customStatement('DELETE FROM habit_streak_state');
    await _db.customStatement('DELETE FROM daily_rollups');
  }

  String _rowKey(String table, Map<String, dynamic> row) =>
      _keyOf(table).map((c) => '${row[c]}').join('|');

  Future<Map<String, dynamic>?> _findLocal(
    String table,
    Map<String, dynamic> row,
  ) async {
    final keys = _keyOf(table);
    final where = keys.map((c) => '$c = ?').join(' AND ');
    final result = await _db
        .customSelect(
          'SELECT * FROM $table WHERE $where LIMIT 1',
          variables: [
            for (final c in keys) Variable<String>('${row[c]}'),
          ],
        )
        .getSingleOrNull();
    return result?.data;
  }

  /// The merge rule.
  ///
  /// **`habit_logs` is a union, never last-writer-wins.** A check-in is a
  /// positive assertion; a *missing* row is an absence of evidence, not a
  /// denial. Treating it as LWW means restoring an older backup silently erases
  /// recent check-ins and destroys a streak — the single worst bug this product
  /// could ship. An explicit un-check writes a tombstone, which then wins by the
  /// tombstone rule below.
  ///
  /// Everywhere else: newer `updated_at` wins, and on a tie a tombstone beats a
  /// live row so a delete made on another device is not resurrected.
  bool _incomingWins(
    String table,
    Map<String, dynamic> incoming,
    Map<String, dynamic> local,
  ) {
    if (_unionTables.contains(table)) {
      final incomingDeleted = incoming['deleted_at'] != null;
      final localDeleted = local['deleted_at'] != null;
      // A deletion still propagates; a plain older copy never overwrites.
      if (incomingDeleted && !localDeleted) return true;
      return false;
    }

    if (_simpleTables.contains(table)) {
      final a = (incoming['updated_at'] ?? incoming['earned_at'] ?? 0) as int;
      final b = (local['updated_at'] ?? local['earned_at'] ?? 0) as int;
      return a > b;
    }

    final a = (incoming['updated_at'] ?? 0) as int;
    final b = (local['updated_at'] ?? 0) as int;
    if (a != b) return a > b;

    // Tie: a tombstone wins. Zombie rows are the most-reported multi-device bug
    // in habit apps.
    return incoming['deleted_at'] != null && local['deleted_at'] == null;
  }

  Future<void> _insert(String table, Map<String, dynamic> row) async {
    final columns = row.keys.toList();
    final placeholders = List.filled(columns.length, '?').join(',');
    await _db.customInsert(
      'INSERT OR REPLACE INTO $table (${columns.join(',')}) '
      'VALUES ($placeholders)',
      variables: [for (final c in columns) _toVariable(row[c])],
    );
  }

  Future<void> _update(String table, Map<String, dynamic> row) =>
      _insert(table, row);

  static Variable _toVariable(Object? value) => switch (value) {
        null => const Variable<String>(null),
        int v => Variable<int>(v),
        double v => Variable<double>(v),
        bool v => Variable<bool>(v),
        _ => Variable<String>(value.toString()),
      };
}
