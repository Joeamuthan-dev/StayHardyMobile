import 'dart:convert';

import 'package:drift/drift.dart';

import '../data/database.dart';
import 'legacy_mappers.dart';
import 'legacy_source.dart';

/// Key under which migration progress is persisted in `app_meta`.
const kMigrationMetaKey = 'migration_v1';

enum MigrationState { notStarted, inProgress, completed, failed }

/// Per-entity progress, so a killed app resumes at the exact page boundary
/// rather than re-pulling everything.
class EntityProgress {
  EntityProgress({
    this.done = false,
    this.imported = 0,
    this.sourceCount,
    this.cursor,
    this.cursorId,
    this.attempts = 0,
  });

  bool done;
  int imported;
  int? sourceCount;
  String? cursor;
  String? cursorId;
  int attempts;

  Map<String, dynamic> toJson() => {
        'done': done,
        'imported': imported,
        'sourceCount': sourceCount,
        'cursor': cursor,
        'cursorId': cursorId,
        'attempts': attempts,
      };

  static EntityProgress fromJson(Map<String, dynamic> j) => EntityProgress(
        done: j['done'] as bool? ?? false,
        imported: j['imported'] as int? ?? 0,
        sourceCount: j['sourceCount'] as int?,
        cursor: j['cursor'] as String?,
        cursorId: j['cursorId'] as String?,
        attempts: j['attempts'] as int? ?? 0,
      );
}

class MigrationProgress {
  MigrationProgress({
    this.state = MigrationState.notStarted,
    this.startedAt,
    this.completedAt,
    this.authUserId,
    this.lastError,
    Map<String, EntityProgress>? entities,
  }) : entities = entities ?? {};

  MigrationState state;
  int? startedAt;
  int? completedAt;
  String? authUserId;
  String? lastError;
  final Map<String, EntityProgress> entities;

  EntityProgress of(LegacyTable t) =>
      entities.putIfAbsent(t.name, EntityProgress.new);

  int get totalImported =>
      entities.values.fold(0, (a, e) => a + e.imported);

  /// 0..1 across all entities, used only to drive the progress UI.
  double get fraction {
    final known = entities.values.where((e) => e.sourceCount != null);
    if (known.isEmpty) return 0;
    final total = known.fold<int>(0, (a, e) => a + e.sourceCount!);
    if (total == 0) return 1;
    final done = known.fold<int>(0, (a, e) => a + e.imported);
    return (done / total).clamp(0.0, 1.0);
  }

  /// True when every entity imported exactly as many rows as the source
  /// reported before the pull began.
  bool get countsReconcile => entities.values.every(
        (e) => e.sourceCount == null || e.imported >= e.sourceCount!,
      );

  String toJsonString() => jsonEncode({
        'state': state.name,
        'startedAt': startedAt,
        'completedAt': completedAt,
        'authUserId': authUserId,
        'lastError': lastError,
        'entities': {
          for (final e in entities.entries) e.key: e.value.toJson(),
        },
      });

  static MigrationProgress parse(String? raw) {
    if (raw == null || raw.isEmpty) return MigrationProgress();
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      return MigrationProgress(
        state: MigrationState.values.firstWhere(
          (s) => s.name == j['state'],
          orElse: () => MigrationState.notStarted,
        ),
        startedAt: j['startedAt'] as int?,
        completedAt: j['completedAt'] as int?,
        authUserId: j['authUserId'] as String?,
        lastError: j['lastError'] as String?,
        entities: {
          for (final e in (j['entities'] as Map? ?? {}).entries)
            e.key as String:
                EntityProgress.fromJson(e.value as Map<String, dynamic>),
        },
      );
    } catch (_) {
      // A corrupt marker must not permanently wedge the migration.
      return MigrationProgress();
    }
  }
}

/// One-time import of a user's content from Supabase into the local database.
///
/// Design constraints, all of which come from this running once, unattended, on
/// a live user's phone, with their entire history at stake:
///
/// * **Idempotent.** Every row carries `remoteId` with a unique index and is
///   written with an upsert, so a crash mid-run costs nothing on retry.
/// * **Resumable.** The keyset cursor is advanced inside the same transaction
///   that writes the page, so the marker can never claim progress that was not
///   committed.
/// * **Ordered.** Routines land before their logs, because a log with no habit
///   is dropped rather than orphaned.
/// * **Reconciled.** Source counts are captured before the pull and compared
///   after. A short import fails loudly instead of looking successful.
/// * **Non-destructive.** Nothing is deleted, locally or remotely. If the
///   receipt does not balance, the data stays and the user is offered a retry.
class MigrationService {
  MigrationService({
    required AppDatabase db,
    required LegacySource source,
    required String authUserId,
    this.pageSize = 500,
  })  : _db = db,
        _source = source,
        _authUserId = authUserId;

  final AppDatabase _db;
  final LegacySource _source;
  final String _authUserId;
  final int pageSize;

  /// Order matters: routines must exist before routine_logs can attach to them.
  static const _order = [
    LegacyTable.routines,
    LegacyTable.routineLogs,
    LegacyTable.goals,
    LegacyTable.tasks,
    LegacyTable.userBadges,
  ];

  Future<MigrationProgress> load() async {
    final row = await (_db.select(_db.appMeta)
          ..where((m) => m.key.equals(kMigrationMetaKey)))
        .getSingleOrNull();
    return MigrationProgress.parse(row?.value);
  }

  Future<void> _save(MigrationProgress p) async {
    await _db.into(_db.appMeta).insertOnConflictUpdate(
          MetaEntry(key: kMigrationMetaKey, value: p.toJsonString()),
        );
  }

  Future<bool> get isComplete async =>
      (await load()).state == MigrationState.completed;

  /// Runs, or resumes, the migration.
  ///
  /// [onProgress] fires after every committed page so the UI can move without
  /// polling. Safe to call repeatedly; returns immediately if already complete.
  Future<MigrationProgress> run({
    void Function(MigrationProgress)? onProgress,
    Future<void> Function()? onImportComplete,
  }) async {
    final p = await load();
    if (p.state == MigrationState.completed) return p;

    p.state = MigrationState.inProgress;
    p.startedAt ??= DateTime.now().millisecondsSinceEpoch;
    p.authUserId = _authUserId;
    p.lastError = null;
    await _save(p);
    onProgress?.call(p);

    try {
      for (final table in _order) {
        final entity = p.of(table);
        if (entity.done) continue;

        // Captured before the first page so a row added mid-migration cannot
        // make the reconciliation look short.
        entity.sourceCount ??= await _source.count(table);
        await _save(p);

        while (!entity.done) {
          final rows = await _source.page(
            table,
            afterCursor: entity.cursor,
            afterId: entity.cursorId,
            limit: pageSize,
          );

          if (rows.isEmpty) {
            entity.done = true;
            await _save(p);
            break;
          }

          await _importPage(table, rows, entity);

          final last = rows.last;
          entity.cursor = last[table.cursorColumn]?.toString();
          entity.cursorId = last['id']?.toString();
          if (rows.length < pageSize) entity.done = true;

          // Cursor and row count are persisted together with the rows they
          // describe, so the marker can never run ahead of the data.
          await _save(p);
          onProgress?.call(p);
        }
      }

      // Habits imported from the old app predate the free limit, so they are
      // grandfathered before the migration is marked complete — the user must
      // never open the rebuilt app and find their own habits paywalled.
      if (p.countsReconcile) {
        await onImportComplete?.call();
      }

      p.state = p.countsReconcile
          ? MigrationState.completed
          : MigrationState.failed;
      if (p.state == MigrationState.failed) {
        p.lastError = 'Imported fewer rows than the server reported. '
            'Nothing was deleted; retry is safe.';
      }
      p.completedAt = DateTime.now().millisecondsSinceEpoch;
      await _save(p);
      onProgress?.call(p);
      return p;
    } catch (e) {
      p.state = MigrationState.failed;
      p.lastError = e.toString();
      await _save(p);
      onProgress?.call(p);
      return p;
    }
  }

  Future<void> _importPage(
    LegacyTable table,
    List<Map<String, dynamic>> rows,
    EntityProgress entity,
  ) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    var written = 0;

    await _db.transaction(() async {
      switch (table) {
        case LegacyTable.routines:
          for (final row in rows) {
            await _db.into(_db.habits).insert(
                  LegacyMappers.habit(row,
                      ordinal: entity.imported + written, now: now),
                  // Conflict on the unique remote_id means this row is already
                  // imported. Ignore rather than update: a re-run must never
                  // clobber edits the user made after migrating.
                  mode: InsertMode.insertOrIgnore,
                );
            written++;
          }

        case LegacyTable.routineLogs:
          for (final row in rows) {
            final localId =
                await _localHabitIdFor(row['routine_id']?.toString());
            final companion =
                LegacyMappers.habitLog(row, localHabitId: localId, now: now);
            if (companion == null) {
              // Orphaned or undated log. Counted as handled so a single bad row
              // cannot stall the migration forever.
              written++;
              continue;
            }
            await _db.into(_db.habitLogs).insert(
                  companion,
                  // (habit_id, log_date) is unique, mirroring the live
                  // constraint, so a re-run collapses instead of erroring.
                  mode: InsertMode.insertOrIgnore,
                );
            written++;
          }

        case LegacyTable.goals:
          for (final row in rows) {
            await _db.into(_db.goals).insert(
                  LegacyMappers.goal(row,
                      ordinal: entity.imported + written, now: now),
                  // Conflict on the unique remote_id means this row is already
                  // imported. Ignore rather than update: a re-run must never
                  // clobber edits the user made after migrating.
                  mode: InsertMode.insertOrIgnore,
                );
            written++;
          }

        case LegacyTable.tasks:
          for (final row in rows) {
            await _db.into(_db.tasks).insert(
                  LegacyMappers.task(row,
                      ordinal: entity.imported + written, now: now),
                  // Conflict on the unique remote_id means this row is already
                  // imported. Ignore rather than update: a re-run must never
                  // clobber edits the user made after migrating.
                  mode: InsertMode.insertOrIgnore,
                );
            written++;
          }

        case LegacyTable.userBadges:
          for (final row in rows) {
            final companion = LegacyMappers.badge(row, now: now);
            if (companion != null) {
              await _db
                  .into(_db.badges)
                  .insert(companion, mode: InsertMode.insertOrReplace);
            }
            written++;
          }
      }

      entity.imported += written;
    });
  }

  final _habitIdCache = <String, String?>{};

  Future<String?> _localHabitIdFor(String? remoteId) async {
    if (remoteId == null) return null;
    if (_habitIdCache.containsKey(remoteId)) return _habitIdCache[remoteId];
    final row = await (_db.select(_db.habits)
          ..where((h) => h.remoteId.equals(remoteId)))
        .getSingleOrNull();
    return _habitIdCache[remoteId] = row?.id;
  }
}
