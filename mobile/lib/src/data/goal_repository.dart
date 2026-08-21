import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../domain/civil_date.dart';
import 'database.dart';
import 'enums.dart';

const _uuid = Uuid();

/// A goal with its progress already resolved.
class GoalView {
  const GoalView({
    required this.goal,
    required this.progress,
    required this.milestonesDone,
    required this.milestonesTotal,
    required this.linkedHabits,
    required this.daysRemaining,
  });

  final Goal goal;

  /// 0..100.
  final int progress;

  final int milestonesDone;
  final int milestonesTotal;
  final int linkedHabits;

  /// Null when the goal has no target date. Negative once overdue.
  final int? daysRemaining;

  GoalStatus get status => GoalStatus.fromValue(goal.status);
  bool get isComplete => status == GoalStatus.completed;
  bool get isOverdue =>
      !isComplete && daysRemaining != null && daysRemaining! < 0;

  /// Whether the goal is behind where it should be by now.
  ///
  /// Compares progress against elapsed time rather than against a fixed
  /// threshold, so "70% done with 80% of the time gone" reads as at-risk while
  /// "70% done with 20% gone" does not.
  bool isBehind(double timeElapsedFraction) =>
      !isComplete && progress < (timeElapsedFraction * 100) - 15;
}

class GoalRepository {
  GoalRepository(this._db);

  final AppDatabase _db;

  Stream<List<GoalView>> watchGoals() {
    return _db
        .watchTables(
          'goals_view',
          {_db.goals, _db.goalMilestones, _db.goalLinks, _db.habitLogs},
        )
        .asyncMap((_) => loadGoals());
  }

  /// [on] is the date "days remaining" is measured from. It defaults to the
  /// real today, which is what every production call wants.
  ///
  /// It exists because [InsightRepository.buildInput] takes an `on` date and
  /// could not honour it: this method read the wall clock directly, so a
  /// review built for a past date still reported deadlines relative to now.
  /// Harmless in production — `on` is always today there — but it made the
  /// insight tests pass only on the day they were written.
  Future<List<GoalView>> loadGoals({CivilDate? on}) async {
    final goals = await (_db.select(_db.goals)
          ..where((g) => g.deletedAt.isNull())
          ..orderBy([
            // Active first, then by target date, then by explicit order.
            (g) => OrderingTerm.asc(g.status),
            (g) => OrderingTerm.asc(g.sortIndex),
          ]))
        .get();

    final today = on ?? CivilDate.today();
    final out = <GoalView>[];

    for (final g in goals) {
      final milestones = await (_db.select(_db.goalMilestones)
            ..where((m) => m.goalId.equals(g.id) & m.deletedAt.isNull()))
          .get();
      final links = await (_db.select(_db.goalLinks)
            ..where((l) => l.goalId.equals(g.id) & l.deletedAt.isNull()))
          .get();

      final done = milestones.where((m) => m.done).length;

      out.add(GoalView(
        goal: g,
        progress: await _progressFor(g, milestones, links),
        milestonesDone: done,
        milestonesTotal: milestones.length,
        linkedHabits: links
            .where((l) => LinkedEntity.fromValue(l.entityType) ==
                LinkedEntity.habit)
            .length,
        daysRemaining: g.targetDate == null
            ? null
            : today.daysUntil(CivilDate.parse(g.targetDate!)),
      ));
    }
    return out;
  }

  /// Goal progress, derived rather than stored.
  ///
  /// The app being replaced had a `goals.progress` column that the score
  /// calculation read but nothing ever wrote — which is why goal progress always
  /// showed zero. Here progress is computed from real work: completed
  /// milestones, or the recent completion rate of the habits linked to the goal.
  Future<int> _progressFor(
    Goal g,
    List<GoalMilestone> milestones,
    List<GoalLink> links,
  ) async {
    if (GoalStatus.fromValue(g.status) == GoalStatus.completed) return 100;

    switch (GoalProgressMode.fromValue(g.progressMode)) {
      case GoalProgressMode.manual:
        return g.manualProgress.clamp(0, 100);

      case GoalProgressMode.milestones:
        if (milestones.isEmpty) return g.manualProgress.clamp(0, 100);
        final done = milestones.where((m) => m.done).length;
        return ((done / milestones.length) * 100).round();

      case GoalProgressMode.linked:
        final habitIds = links
            .where((l) =>
                LinkedEntity.fromValue(l.entityType) == LinkedEntity.habit)
            .map((l) => l.entityId)
            .toList();
        if (habitIds.isEmpty) {
          // Nothing linked yet — fall back to milestones so the goal still
          // shows something meaningful rather than a hard zero.
          if (milestones.isEmpty) return 0;
          final done = milestones.where((m) => m.done).length;
          return ((done / milestones.length) * 100).round();
        }

        // Completion rate of linked habits over the trailing 30 days.
        final since = CivilDate.today().addDays(-30).iso;
        final placeholders = List.filled(habitIds.length, '?').join(',');
        final row = await _db.customSelect(
          'SELECT COUNT(*) AS c FROM habit_logs '
          'WHERE deleted_at IS NULL AND log_date >= ? '
          'AND habit_id IN ($placeholders)',
          variables: [
            Variable<String>(since),
            for (final id in habitIds) Variable<String>(id),
          ],
        ).getSingle();

        final logs = row.read<int>('c');
        // 30 days x each linked habit is the ceiling for a daily habit.
        final ceiling = habitIds.length * 30;
        return ((logs / ceiling) * 100).round().clamp(0, 100);
    }
  }

  /// The habit ids linked to a goal.
  Future<Set<String>> linkedHabitIds(String goalId) async {
    final rows = await (_db.select(_db.goalLinks)
          ..where((l) => l.goalId.equals(goalId) & l.deletedAt.isNull()))
        .get();
    return {
      for (final l in rows)
        if (LinkedEntity.fromValue(l.entityType) == LinkedEntity.habit)
          l.entityId,
    };
  }

  /// Replace a goal's habit links with [habitIds].
  ///
  /// Declarative rather than add/remove calls, because the editor works from a
  /// checkbox set and "make it look like this" cannot leave the two views
  /// disagreeing. Removed links are tombstoned, not deleted — the backup merge
  /// needs to tell "unlinked on another device" from "never linked here".
  Future<void> setLinkedHabits(String goalId, Set<String> habitIds) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await _db.transaction(() async {
      final existing = await (_db.select(_db.goalLinks)
            ..where((l) => l.goalId.equals(goalId)))
          .get();

      final current = <String, GoalLink>{};
      for (final l in existing) {
        if (LinkedEntity.fromValue(l.entityType) != LinkedEntity.habit) {
          continue;
        }
        current[l.entityId] = l;
      }

      for (final id in habitIds) {
        final row = current[id];
        if (row == null) {
          await _db.into(_db.goalLinks).insert(GoalLinksCompanion.insert(
                id: _uuid.v4(),
                goalId: goalId,
                entityType: LinkedEntity.habit.value,
                entityId: id,
                createdAt: now,
                updatedAt: now,
              ));
        } else if (row.deletedAt != null) {
          // Re-linked: revive the tombstone rather than minting a second row.
          await (_db.update(_db.goalLinks)..where((l) => l.id.equals(row.id)))
              .write(GoalLinksCompanion(
            deletedAt: const Value(null),
            updatedAt: Value(now),
            dirty: const Value(true),
          ));
        }
      }

      for (final entry in current.entries) {
        if (habitIds.contains(entry.key)) continue;
        if (entry.value.deletedAt != null) continue;
        await (_db.update(_db.goalLinks)
              ..where((l) => l.id.equals(entry.value.id)))
            .write(GoalLinksCompanion(
          deletedAt: Value(now),
          updatedAt: Value(now),
          dirty: const Value(true),
        ));
      }
    });
  }

  Future<String> createGoal({
    required String name,
    String? description,
    CivilDate? targetDate,
    GoalProgressMode mode = GoalProgressMode.milestones,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final id = _uuid.v4();
    await _db.into(_db.goals).insert(
          GoalsCompanion.insert(
            id: id,
            name: name,
            description: Value(description),
            targetDate: Value(targetDate?.iso),
            progressMode: Value(mode.value),
            createdAt: now,
            updatedAt: now,
          ),
        );
    return id;
  }

  Future<void> updateGoal(
    String goalId, {
    required String name,
    String? description,
    CivilDate? targetDate,
    required GoalProgressMode mode,
    int? manualProgress,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await (_db.update(_db.goals)..where((g) => g.id.equals(goalId))).write(
      GoalsCompanion(
        name: Value(name),
        description: Value(description),
        targetDate: Value(targetDate?.iso),
        progressMode: Value(mode.value),
        manualProgress: manualProgress == null
            ? const Value.absent()
            : Value(manualProgress),
        updatedAt: Value(now),
        dirty: const Value(true),
      ),
    );
  }

  Future<Goal?> byId(String goalId) {
    return (_db.select(_db.goals)..where((g) => g.id.equals(goalId)))
        .getSingleOrNull();
  }

  Future<String> addMilestone(String goalId, String title) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final id = _uuid.v4();
    final max = await _db
        .customSelect(
          'SELECT COALESCE(MAX(sort_index), -1) AS m FROM goal_milestones '
          'WHERE goal_id = ?',
          variables: [Variable<String>(goalId)],
        )
        .getSingle();
    await _db.into(_db.goalMilestones).insert(
          GoalMilestonesCompanion.insert(
            id: id,
            goalId: goalId,
            title: title,
            sortIndex: Value(max.read<int>('m') + 1),
            createdAt: now,
            updatedAt: now,
          ),
        );
    return id;
  }

  Future<void> deleteMilestone(String milestoneId) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await (_db.update(_db.goalMilestones)
          ..where((m) => m.id.equals(milestoneId)))
        .write(GoalMilestonesCompanion(
      deletedAt: Value(now),
      updatedAt: Value(now),
      dirty: const Value(true),
    ));
  }

  /// Soft delete. The tombstone lets a Drive restore tell "deleted elsewhere"
  /// apart from "not yet created here".
  Future<void> deleteGoal(String goalId) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await (_db.update(_db.goals)..where((g) => g.id.equals(goalId))).write(
      GoalsCompanion(
        deletedAt: Value(now),
        updatedAt: Value(now),
        dirty: const Value(true),
      ),
    );
  }

  Future<void> setStatus(String goalId, GoalStatus status) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await (_db.update(_db.goals)..where((g) => g.id.equals(goalId))).write(
      GoalsCompanion(
        status: Value(status.value),
        completedAt:
            Value(status == GoalStatus.completed ? now : null),
        updatedAt: Value(now),
        dirty: const Value(true),
      ),
    );
  }

  Future<List<GoalMilestone>> milestonesFor(String goalId) {
    return (_db.select(_db.goalMilestones)
          ..where((m) => m.goalId.equals(goalId) & m.deletedAt.isNull())
          ..orderBy([(m) => OrderingTerm.asc(m.sortIndex)]))
        .get();
  }

  Future<void> toggleMilestone(String milestoneId, bool done) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await (_db.update(_db.goalMilestones)
          ..where((m) => m.id.equals(milestoneId)))
        .write(
      GoalMilestonesCompanion(
        done: Value(done),
        doneAt: Value(done ? now : null),
        updatedAt: Value(now),
        dirty: const Value(true),
      ),
    );
  }
}
