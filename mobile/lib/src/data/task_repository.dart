import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../domain/civil_date.dart';
import 'database.dart';
import 'enums.dart';

const _uuid = Uuid();

/// Tasks grouped the way the planner reads them.
///
/// Grouping happens here rather than in the widget so the rules — what counts as
/// overdue, where an undated task belongs — live in one testable place instead
/// of being re-derived in every list that shows tasks.
class TaskBoard {
  const TaskBoard({
    required this.overdue,
    required this.today,
    required this.upcoming,
    required this.someday,
    required this.completed,
    this.subtaskCounts = const {},
  });

  final List<Task> overdue;
  final List<Task> today;
  final List<Task> upcoming;

  /// No due date. Intentionally not called "inbox" — these are real tasks the
  /// user simply hasn't scheduled.
  final List<Task> someday;

  /// Completed today only. Older completions live in history, not the planner.
  final List<Task> completed;

  /// Parent task id -> (done, total). Absent for tasks with no steps.
  final Map<String, (int done, int total)> subtaskCounts;

  /// '2 of 5', or null when a task has no steps.
  String? subtaskLabel(String taskId) {
    final counts = subtaskCounts[taskId];
    if (counts == null || counts.$2 == 0) return null;
    return '${counts.$1} of ${counts.$2}';
  }

  int get openCount =>
      overdue.length + today.length + upcoming.length + someday.length;

  bool get isEmpty => openCount == 0 && completed.isEmpty;
}

class TaskRepository {
  TaskRepository(this._db);

  final AppDatabase _db;

  Stream<TaskBoard> watchBoard() {
    return _db
        .watchTables('task_board', {_db.tasks})
        .asyncMap((_) => loadBoard());
  }

  Future<TaskBoard> loadBoard() async {
    final counts = await subtaskCounts();
    final rows = await (_db.select(_db.tasks)
          ..where((t) => t.deletedAt.isNull() & t.parentTaskId.isNull())
          ..orderBy([
            (t) => OrderingTerm.asc(t.dueDate),
            (t) => OrderingTerm.desc(t.priority),
            (t) => OrderingTerm.asc(t.sortIndex),
          ]))
        .get();

    final today = CivilDate.today();
    final todayIso = today.iso;

    final overdue = <Task>[];
    final due = <Task>[];
    final upcoming = <Task>[];
    final someday = <Task>[];
    final completed = <Task>[];

    for (final t in rows) {
      if (TaskStatus.fromValue(t.status) == TaskStatus.completed) {
        // Only today's completions; the planner is about the present.
        if (t.completedAt != null &&
            CivilDate.today(
                  DateTime.fromMillisecondsSinceEpoch(t.completedAt!),
                ).iso ==
                todayIso) {
          completed.add(t);
        }
        continue;
      }
      if (TaskStatus.fromValue(t.status) == TaskStatus.cancelled) continue;

      final d = t.dueDate;
      if (d == null) {
        someday.add(t);
      } else if (d.compareTo(todayIso) < 0) {
        overdue.add(t);
      } else if (d == todayIso) {
        due.add(t);
      } else {
        upcoming.add(t);
      }
    }

    return TaskBoard(
      overdue: overdue,
      today: due,
      upcoming: upcoming,
      someday: someday,
      completed: completed,
      subtaskCounts: counts,
    );
  }

  /// Subtask progress for every parent, as (done, total).
  ///
  /// One grouped query rather than a `subtasksOf` per row: the planner renders
  /// dozens of tasks and a query each would make the list visibly slower with
  /// every task the user adds.
  Future<Map<String, (int done, int total)>> subtaskCounts() async {
    final rows = await _db.customSelect(
      'SELECT parent_task_id AS parent, '
      'COUNT(*) AS total, '
      'SUM(CASE WHEN status = ${TaskStatus.completed.value} THEN 1 ELSE 0 END) '
      'AS done '
      'FROM tasks WHERE deleted_at IS NULL AND parent_task_id IS NOT NULL '
      'GROUP BY parent_task_id',
    ).get();

    return {
      for (final r in rows)
        r.read<String>('parent'): (
          r.read<int>('done'),
          r.read<int>('total'),
        ),
    };
  }

  Future<List<Task>> subtasksOf(String taskId) {
    return (_db.select(_db.tasks)
          ..where((t) => t.parentTaskId.equals(taskId) & t.deletedAt.isNull())
          ..orderBy([(t) => OrderingTerm.asc(t.sortIndex)]))
        .get();
  }

  Future<void> toggle(String taskId) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final task = await (_db.select(_db.tasks)..where((t) => t.id.equals(taskId)))
        .getSingleOrNull();
    if (task == null) return;

    final wasDone = TaskStatus.fromValue(task.status) == TaskStatus.completed;
    await (_db.update(_db.tasks)..where((t) => t.id.equals(taskId))).write(
      TasksCompanion(
        status: Value(
          (wasDone ? TaskStatus.pending : TaskStatus.completed).value,
        ),
        completedAt: Value(wasDone ? null : now),
        updatedAt: Value(now),
        dirty: const Value(true),
      ),
    );
  }

  Future<String> create({
    required String title,
    String? description,
    TaskPriority priority = TaskPriority.medium,
    CivilDate? dueDate,
    String? category,
    String? goalId,
    String? parentTaskId,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final id = _uuid.v4();
    final maxSort = await _db
        .customSelect('SELECT COALESCE(MAX(sort_index), -1) AS m FROM tasks')
        .getSingle();

    await _db.into(_db.tasks).insert(
          TasksCompanion.insert(
            id: id,
            title: title,
            description: Value(description),
            priority: Value(priority.value),
            dueDate: Value(dueDate?.iso),
            category: Value(category),
            goalId: Value(goalId),
            parentTaskId: Value(parentTaskId),
            sortIndex: Value(maxSort.read<int>('m') + 1),
            createdAt: now,
            updatedAt: now,
          ),
        );
    return id;
  }

  Future<void> update(
    String taskId, {
    required String title,
    String? description,
    required TaskPriority priority,
    CivilDate? dueDate,
    String? category,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await (_db.update(_db.tasks)..where((t) => t.id.equals(taskId))).write(
      TasksCompanion(
        title: Value(title),
        description: Value(description),
        priority: Value(priority.value),
        dueDate: Value(dueDate?.iso),
        category: Value(category),
        updatedAt: Value(now),
        dirty: const Value(true),
      ),
    );
  }

  /// Soft delete. The tombstone is what lets a Drive restore tell "deleted on
  /// another device" apart from "not yet created here".
  Future<void> delete(String taskId) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await (_db.update(_db.tasks)..where((t) => t.id.equals(taskId))).write(
      TasksCompanion(
        deletedAt: Value(now),
        updatedAt: Value(now),
        dirty: const Value(true),
      ),
    );
  }
}
