import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../data/database.dart';
import '../data/enums.dart';
import '../domain/civil_date.dart';

/// Maps rows from the live Supabase schema into local Drift rows.
///
/// These functions are pure and deliberately explicit — there is no generic
/// camelCase↔snake_case converter anywhere in here, because the live schema
/// mixes both conventions *within a single row*: `tasks` has `userId` and
/// `createdAt` alongside `order_index` and `image_url`. Any automatic converter
/// mangles one side or the other. Forty lines of explicit mapping is cheaper
/// than the bug.
///
/// Every function tolerates missing, null, and wrongly-typed fields. The source
/// data is five years of production accumulation written by code that inserted
/// `public.users` rows fire-and-forget; assuming any field is present is how a
/// migration drops a user's history.
abstract final class LegacyMappers {
  static const _uuid = Uuid();

  /// Legacy `routines.days` uses three-letter capitalised names.
  static const _dayBits = {
    'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6,
  };

  /// Converts `['Mon','Wed','Fri']` into a 7-bit mask.
  ///
  /// An empty or absent array means "every day" rather than "never": legacy rows
  /// created before the days column was enforced have it null, and those habits
  /// were shown daily in the old app. Treating null as 0 would silently make
  /// every one of them invisible.
  static int weekdayMask(Object? days) {
    if (days is! List || days.isEmpty) return 127;
    var mask = 0;
    for (final d in days) {
      final bit = _dayBits[d.toString().trim().toLowerCase()];
      if (bit != null) mask |= 1 << bit;
    }
    return mask == 0 ? 127 : mask;
  }

  /// Epoch millis from a Postgres timestamptz string.
  static int? epochMillis(Object? value) {
    if (value == null) return null;
    if (value is int) return value;
    final parsed = DateTime.tryParse(value.toString());
    return parsed?.millisecondsSinceEpoch;
  }

  /// A civil date from a value that *should* be `YYYY-MM-DD` but may be a full
  /// timestamp — `goals.targetDate` is a text column and holds both forms.
  static String? civilDate(Object? value) {
    if (value == null) return null;
    final s = value.toString().trim();
    if (s.isEmpty) return null;
    try {
      return CivilDate.parse(s).iso;
    } catch (_) {
      final parsed = DateTime.tryParse(s);
      if (parsed == null) return null;
      return CivilDate(parsed.year, parsed.month, parsed.day).iso;
    }
  }

  /// Reads a field that may be stored under either naming convention.
  ///
  /// `public.goals` is queried with `userId` everywhere except the account-reset
  /// path, which uses `user_id` — meaning one of the two is wrong and we cannot
  /// tell which from the client. Reading both costs nothing and removes the
  /// possibility of silently importing zero goals.
  static Object? either(Map<String, dynamic> row, String a, String b) =>
      row[a] ?? row[b];

  // --- routines -> habits ---------------------------------------------------

  static HabitsCompanion habit(
    Map<String, dynamic> row, {
    required int ordinal,
    required int now,
  }) {
    final createdAt = epochMillis(row['created_at']) ?? now;
    final title = (row['title'] as String?)?.trim();
    final mask = weekdayMask(row['days']);
    final category = (row['category'] as String?)?.trim();
    final reminder = (row['time'] as String?)?.trim();

    return HabitsCompanion.insert(
      id: _uuid.v4(),
      remoteId: Value(row['id']?.toString()),
      // A habit with no title would be unusable and un-editable; give it
      // something rather than dropping the row and its whole log history.
      title: (title == null || title.isEmpty) ? 'Untitled habit' : title,
      category: Value(category == null || category.isEmpty ? 'General' : category),
      // Everything in the legacy schema is a simple done/not-done habit.
      habitType: Value(HabitType.binary.value),
      scheduleKind: Value(
        mask == 127 ? ScheduleKind.daily.value : ScheduleKind.weekdays.value,
      ),
      weekdayMask: Value(mask),
      reminderTime: Value(reminder == null || reminder.isEmpty ? null : reminder),
      reminderDaysMask: Value(reminder == null || reminder.isEmpty ? 0 : mask),
      sortIndex: Value(ordinal),
      startDate: CivilDate.parse(
        DateTime.fromMillisecondsSinceEpoch(createdAt).toIso8601String(),
      ).iso,
      createdAt: createdAt,
      updatedAt: createdAt,
      dirty: const Value(true),
    );
  }

  // --- routine_logs -> habit_logs -------------------------------------------

  /// Returns null when the row cannot be attached to a habit — an orphaned log
  /// whose routine was deleted, which the legacy cascade should have removed but
  /// which appears in exports anyway.
  static HabitLogsCompanion? habitLog(
    Map<String, dynamic> row, {
    required String? localHabitId,
    required int now,
  }) {
    if (localHabitId == null) return null;
    final date = civilDate(row['completed_at']);
    if (date == null) return null;

    return HabitLogsCompanion.insert(
      id: _uuid.v4(),
      habitId: localHabitId,
      logDate: date,
      value: const Value(1),
      status: Value(LogStatus.done.value),
      // Fall back to midday on the logged date rather than "now": a migration
      // run today must not make five-year-old check-ins look like they happened
      // this afternoon.
      loggedAt: epochMillis(row['created_at']) ??
          DateTime.parse('${date}T12:00:00Z').millisecondsSinceEpoch,
      source: Value(LogSource.migration.value),
      createdAt: epochMillis(row['created_at']) ?? now,
      updatedAt: now,
      dirty: const Value(true),
    );
  }

  // --- goals ----------------------------------------------------------------

  static GoalsCompanion goal(
    Map<String, dynamic> row, {
    required int ordinal,
    required int now,
  }) {
    final createdAt =
        epochMillis(either(row, 'createdAt', 'created_at')) ?? now;
    final status = GoalStatus.fromLegacy(row['status'] as String?);
    final name = (row['name'] as String?)?.trim();

    // `progress` was read by the old score calculation but written by nothing,
    // so it is almost always null. Carry it if present, otherwise start at zero
    // and let the user attach habits or milestones — which is what makes
    // progress mean something in the rebuild.
    final legacyProgress = (row['progress'] as num?)?.round() ?? 0;

    return GoalsCompanion.insert(
      id: _uuid.v4(),
      remoteId: Value(row['id']?.toString()),
      name: (name == null || name.isEmpty) ? 'Untitled goal' : name,
      description: Value(row['description'] as String?),
      targetDate: Value(civilDate(row['targetDate'] ?? row['target_date'])),
      status: Value(status.value),
      quote: Value(row['quote'] as String?),
      // Manual until the user links habits or adds milestones; anything else
      // would compute a confident-looking 0% for every imported goal.
      progressMode: Value(GoalProgressMode.manual.value),
      manualProgress: Value(
        status == GoalStatus.completed ? 100 : legacyProgress.clamp(0, 100),
      ),
      completedAt: Value(status == GoalStatus.completed
          ? epochMillis(either(row, 'updatedAt', 'updated_at')) ?? createdAt
          : null),
      sortIndex: Value(ordinal),
      createdAt: createdAt,
      updatedAt: epochMillis(either(row, 'updatedAt', 'updated_at')) ?? createdAt,
      dirty: const Value(true),
    );
  }

  // --- tasks ----------------------------------------------------------------

  static TasksCompanion task(
    Map<String, dynamic> row, {
    required int ordinal,
    required int now,
  }) {
    final createdAt =
        epochMillis(either(row, 'createdAt', 'created_at')) ?? now;
    final updatedAt =
        epochMillis(either(row, 'updatedAt', 'updated_at')) ?? createdAt;
    final rawStatus = (row['status'] as String?)?.toLowerCase();
    final completed = rawStatus == 'completed' || rawStatus == 'done';
    final title = (row['title'] as String?)?.trim();

    return TasksCompanion.insert(
      id: _uuid.v4(),
      remoteId: Value(row['id']?.toString()),
      title: (title == null || title.isEmpty) ? 'Untitled task' : title,
      description: Value(row['description'] as String?),
      status: Value(
        (completed ? TaskStatus.completed : TaskStatus.pending).value,
      ),
      priority: Value(TaskPriority.fromLegacy(row['priority'] as String?).value),
      category: Value(row['category'] as String?),
      completedAt: Value(completed ? updatedAt : null),
      // `order_index` was set to `tasks.length + 1` on insert and never
      // rewritten, so it is an insertion sequence rather than a user ordering.
      // Fall back to the page ordinal when absent.
      sortIndex: Value((row['order_index'] as num?)?.toInt() ?? ordinal),
      createdAt: createdAt,
      updatedAt: updatedAt,
      dirty: const Value(true),
    );
  }

  // --- user_badges ----------------------------------------------------------

  static BadgesCompanion? badge(Map<String, dynamic> row, {required int now}) {
    final key = (row['badge_key'] as String?)?.trim();
    if (key == null || key.isEmpty) return null;
    return BadgesCompanion.insert(
      key: key,
      earnedAt: epochMillis(row['earned_at']) ?? now,
      // Marked as already seen. A user who earned nine badges over two years
      // must not be greeted by nine celebration popups on first launch.
      popupShown: const Value(true),
      dirty: const Value(true),
    );
  }
}
