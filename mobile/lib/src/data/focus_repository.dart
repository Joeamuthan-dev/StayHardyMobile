import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../domain/civil_date.dart';
import '../domain/focus_rules.dart';
import 'database.dart';

const _uuid = Uuid();

/// Focus totals for a screen.
class FocusSummary {
  const FocusSummary({
    required this.todayMinutes,
    required this.todaySessions,
    required this.weekMinutes,
    required this.bestDayMinutes,
  });

  final int todayMinutes;
  final int todaySessions;
  final int weekMinutes;
  final int bestDayMinutes;

  static const empty = FocusSummary(
    todayMinutes: 0,
    todaySessions: 0,
    weekMinutes: 0,
    bestDayMinutes: 0,
  );
}

/// Focus sessions: start, pause, finish, and the recovery of sessions the OS
/// killed mid-flight.
///
/// Every mutation writes the timestamps the session is derived from and nothing
/// else — there is no in-memory timer state that could disagree with the row.
/// That is what lets the screen be rebuilt, the process be killed, or the app be
/// reinstalled without the session changing meaning.
class FocusRepository {
  FocusRepository(this._db);

  final AppDatabase _db;

  /// The session currently in flight, if any.
  Future<FocusRun?> activeRun() async {
    final row = await (_db.select(_db.focusSessions)
          ..where((s) => s.endedAt.isNull() & s.deletedAt.isNull())
          ..orderBy([(s) => OrderingTerm.desc(s.startedAt)])
          ..limit(1))
        .getSingleOrNull();
    if (row == null) return null;

    String? goalName;
    if (row.goalId != null) {
      final goal = await (_db.select(_db.goals)
            ..where((g) => g.id.equals(row.goalId!)))
          .getSingleOrNull();
      goalName = goal?.name;
    }

    String? habitName;
    if (row.habitId != null) {
      final habit = await (_db.select(_db.habits)
            ..where((h) => h.id.equals(row.habitId!)))
          .getSingleOrNull();
      habitName = habit?.title;
    }

    return FocusRun(
      id: row.id,
      startedAt: row.startedAt,
      plannedSeconds: row.plannedSeconds,
      accruedSeconds: row.actualSeconds,
      resumedAt: row.resumedAt,
      interruptions: row.interruptions,
      goalId: row.goalId,
      habitId: row.habitId,
      taskId: row.taskId,
      goalName: goalName,
      habitName: habitName,
      label: row.label,
    );
  }

  /// Live view of the active session. Emits on any write to `focus_sessions`.
  ///
  /// Note this stream carries session *identity and timestamps*, not a ticking
  /// clock — the screen drives its own repaint. A stream that emitted once a
  /// second would rebuild the whole subtree 1,500 times per session for no
  /// reason, and still be wrong the moment the process was frozen.
  Stream<FocusRun?> watchActive() {
    return _db
        .watchTables('focus_active', {_db.focusSessions, _db.goals})
        .asyncMap((_) => activeRun());
  }

  /// Begin a session. Any session left open is closed first, so there is never
  /// more than one in flight.
  ///
  /// "Left open" includes a session that is *still legitimately running* — not
  /// only stale ones. Recovery alone is not enough: a double-tapped start, or a
  /// second entry point firing before the stream has caught up, would otherwise
  /// leave the first session open underneath the new one. It would look fine,
  /// because the newest row wins, and then the abandoned one would be
  /// auto-completed at the next launch and credited as focus the user never
  /// did. Inflating the only number this feature reports is the one failure it
  /// cannot have.
  Future<FocusRun> start({
    required int plannedSeconds,
    String? goalId,
    String? habitId,
    String? taskId,
    String? label,
    int? nowMs,
  }) async {
    final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
    await recoverOrphans(nowMs: now);
    await _closeAnyRunning(now);

    final id = _uuid.v4();
    await _db.into(_db.focusSessions).insert(
          FocusSessionsCompanion.insert(
            id: id,
            startedAt: now,
            plannedSeconds: plannedSeconds,
            resumedAt: Value(now),
            goalId: Value(goalId),
            habitId: Value(habitId),
            taskId: Value(taskId),
            label: Value(label),
            localDate: CivilDate.today(
              DateTime.fromMillisecondsSinceEpoch(now),
            ).iso,
            createdAt: now,
            updatedAt: now,
          ),
        );

    return (await activeRun())!;
  }

  /// Bank the open span and stop the clock.
  ///
  /// A pause counts as an interruption. The number is the honest one to show
  /// later — "you finished, but you stopped four times" is the useful feedback,
  /// and hiding it would make the session look cleaner than it was.
  Future<void> pause(String sessionId, {int? nowMs}) async {
    final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
    final row = await _byId(sessionId);
    if (row == null || row.endedAt != null || row.resumedAt == null) return;

    await (_db.update(_db.focusSessions)..where((s) => s.id.equals(sessionId)))
        .write(FocusSessionsCompanion(
      actualSeconds: Value(_accrue(row, now)),
      resumedAt: const Value(null),
      interruptions: Value(row.interruptions + 1),
      updatedAt: Value(now),
      dirty: const Value(true),
    ));
  }

  Future<void> resume(String sessionId, {int? nowMs}) async {
    final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
    final row = await _byId(sessionId);
    if (row == null || row.endedAt != null || row.resumedAt != null) return;

    await (_db.update(_db.focusSessions)..where((s) => s.id.equals(sessionId)))
        .write(FocusSessionsCompanion(
      resumedAt: Value(now),
      updatedAt: Value(now),
      dirty: const Value(true),
    ));
  }

  /// End the session, crediting whatever was accrued.
  ///
  /// [completed] is a fact, not a choice: it records whether the planned
  /// duration was actually reached. Stopping at 24 of 25 minutes still banks 24
  /// minutes of real work — the time is not thrown away — but it is not counted
  /// as a completed session.
  Future<void> finish(String sessionId, {int? nowMs}) async {
    final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
    final row = await _byId(sessionId);
    if (row == null || row.endedAt != null) return;

    final accrued = _accrue(row, now);
    await (_db.update(_db.focusSessions)..where((s) => s.id.equals(sessionId)))
        .write(FocusSessionsCompanion(
      actualSeconds: Value(accrued),
      resumedAt: const Value(null),
      endedAt: Value(now),
      completed: Value(accrued >= row.plannedSeconds),
      updatedAt: Value(now),
      dirty: const Value(true),
    ));
  }

  /// Throw the session away.
  ///
  /// Hard delete rather than a tombstone: an abandoned session is not a record
  /// the user wants preserved and propagated to their other devices. Keeping it
  /// would mean the focus history is mostly a list of things they gave up on.
  Future<void> abandon(String sessionId) async {
    await (_db.delete(_db.focusSessions)..where((s) => s.id.equals(sessionId)))
        .go();
  }

  /// Settle any session left open by a process that died.
  ///
  /// Called before starting a new one and at launch. Without this, a killed
  /// session stays open forever and every later session collides with it.
  Future<int> recoverOrphans({int? nowMs}) async {
    final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
    final open = await (_db.select(_db.focusSessions)
          ..where((s) => s.endedAt.isNull() & s.deletedAt.isNull()))
        .get();

    var settled = 0;
    for (final row in open) {
      final decision = FocusRecovering.decide(
        wallElapsedMs: now - row.startedAt,
        plannedSeconds: row.plannedSeconds,
        wasPaused: row.resumedAt == null,
      );

      switch (decision) {
        case FocusRecovery.resume:
          break;
        case FocusRecovery.discard:
          await abandon(row.id);
          settled++;
        case FocusRecovery.complete:
          final endedAt = row.startedAt + row.plannedSeconds * 1000;
          await (_db.update(_db.focusSessions)
                ..where((s) => s.id.equals(row.id)))
              .write(FocusSessionsCompanion(
            actualSeconds: Value(row.plannedSeconds),
            resumedAt: const Value(null),
            endedAt: Value(endedAt),
            completed: const Value(true),
            updatedAt: Value(now),
            dirty: const Value(true),
          ));
          settled++;
      }
    }
    return settled;
  }

  Stream<FocusSummary> watchSummary() {
    return _db
        .watchTables('focus_summary', {_db.focusSessions})
        .asyncMap((_) => summary());
  }

  /// Minutes focused per day for the last [days] days, oldest first.
  ///
  /// One grouped query rather than a query per day — the same shape
  /// `StatsRepository` uses, for the same reason.
  Future<List<int>> dailyMinutes({int days = 14, CivilDate? on}) async {
    final today = on ?? CivilDate.today();
    final start = today.addDays(-(days - 1));

    final rows = await _db.customSelect(
      'SELECT local_date, COALESCE(SUM(actual_seconds), 0) AS s '
      'FROM focus_sessions '
      'WHERE deleted_at IS NULL AND ended_at IS NOT NULL AND local_date >= ?1 '
      'GROUP BY local_date',
      variables: [Variable<String>(start.iso)],
    ).get();

    final byDate = {
      for (final r in rows) r.read<String>('local_date'): r.read<int>('s'),
    };

    return [
      for (var i = 0; i < days; i++)
        (byDate[start.addDays(i).iso] ?? 0) ~/ 60,
    ];
  }

  Future<FocusSummary> summary({CivilDate? on}) async {
    final today = on ?? CivilDate.today();
    // Rolling 7 days including today, not the calendar week — "this week" on a
    // Monday morning would otherwise read as near-zero and look broken.
    final weekStart = today.addDays(-6).iso;

    // Only ended sessions count. A session still running has not been earned
    // yet, and counting it would make the total tick upward as you watch.
    final row = await _db.customSelect(
      'SELECT '
      "COALESCE(SUM(CASE WHEN local_date = ?1 THEN actual_seconds END), 0) AS today_s, "
      "COALESCE(SUM(CASE WHEN local_date = ?1 THEN 1 END), 0) AS today_n, "
      'COALESCE(SUM(actual_seconds), 0) AS week_s '
      'FROM focus_sessions '
      'WHERE deleted_at IS NULL AND ended_at IS NOT NULL AND local_date >= ?2',
      variables: [Variable<String>(today.iso), Variable<String>(weekStart)],
    ).getSingle();

    final best = await _db.customSelect(
      'SELECT COALESCE(MAX(day_s), 0) AS best_s FROM ('
      'SELECT SUM(actual_seconds) AS day_s FROM focus_sessions '
      'WHERE deleted_at IS NULL AND ended_at IS NOT NULL '
      'GROUP BY local_date)',
    ).getSingle();

    return FocusSummary(
      todayMinutes: row.read<int>('today_s') ~/ 60,
      todaySessions: row.read<int>('today_n'),
      weekMinutes: row.read<int>('week_s') ~/ 60,
      bestDayMinutes: best.read<int>('best_s') ~/ 60,
    );
  }

  /// Minutes of focus per goal over the trailing [days], newest work included.
  /// Drives "where did the time actually go".
  Future<List<({String goalId, String name, int minutes})>> byGoal({
    int days = 30,
  }) async {
    final since = CivilDate.today().addDays(-(days - 1)).iso;
    final rows = await _db.customSelect(
      'SELECT g.id AS id, g.name AS name, '
      'SUM(f.actual_seconds) AS s '
      'FROM focus_sessions f JOIN goals g ON g.id = f.goal_id '
      'WHERE f.deleted_at IS NULL AND f.ended_at IS NOT NULL '
      'AND g.deleted_at IS NULL AND f.local_date >= ?1 '
      'GROUP BY g.id ORDER BY s DESC LIMIT 5',
      variables: [Variable<String>(since)],
    ).get();

    return [
      for (final r in rows)
        (
          goalId: r.read<String>('id'),
          name: r.read<String>('name'),
          minutes: r.read<int>('s') ~/ 60,
        ),
    ];
  }

  /// Close whatever is still in flight so a new session starts alone.
  ///
  /// Real work is banked; a session too short to be work is discarded, which is
  /// what makes a double-tapped start leave exactly one row rather than two.
  Future<void> _closeAnyRunning(int now) async {
    final open = await (_db.select(_db.focusSessions)
          ..where((s) => s.endedAt.isNull() & s.deletedAt.isNull()))
        .get();

    for (final row in open) {
      if (_accrue(row, now) < focusMinimumBankedSeconds) {
        await abandon(row.id);
      } else {
        await finish(row.id, nowMs: now);
      }
    }
  }

  Future<FocusSession?> _byId(String id) {
    return (_db.select(_db.focusSessions)..where((s) => s.id.equals(id)))
        .getSingleOrNull();
  }

  /// Accrued seconds if the open span were closed at [nowMs].
  static int _accrue(FocusSession row, int nowMs) {
    final open = row.resumedAt;
    if (open == null) return row.actualSeconds;
    final live = ((nowMs - open) / 1000).floor();
    return row.actualSeconds + (live < 0 ? 0 : live);
  }
}
