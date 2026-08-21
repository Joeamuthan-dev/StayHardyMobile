/// Enums stored as integers in Drift.
///
/// Values are explicit and MUST NOT be reordered — they are persisted on disk
/// and travel inside Google Drive backups. Append only.
library;

/// What "doing" a habit means.
enum HabitType {
  /// Done or not. Every habit migrated from the Capacitor build is this.
  binary(0),

  /// A count toward a target — 8 glasses, 30 pages.
  quantity(1),

  /// Minutes toward a target — read 30 min.
  duration(2),

  /// An abstention. Success is *not* doing it; the streak counts days clean.
  negative(3);

  const HabitType(this.value);
  final int value;

  static HabitType fromValue(int v) =>
      HabitType.values.firstWhere((e) => e.value == v, orElse: () => binary);
}

/// How a habit recurs.
///
/// [timesPerPeriod] is the odd one out and drives the whole period model: a
/// "3× per week" habit has no due *days*, so asking "was it done today?" is
/// meaningless. Its streak counts satisfied weeks, not days.
enum ScheduleKind {
  daily(0),
  weekdays(1),
  timesPerPeriod(2),
  everyNDays(3);

  const ScheduleKind(this.value);
  final int value;

  static ScheduleKind fromValue(int v) =>
      ScheduleKind.values.firstWhere((e) => e.value == v, orElse: () => daily);
}

/// The unit a [ScheduleKind.timesPerPeriod] habit is measured over.
enum PeriodKind {
  week(0),
  month(1);

  const PeriodKind(this.value);
  final int value;

  static PeriodKind fromValue(int v) =>
      PeriodKind.values.firstWhere((e) => e.value == v, orElse: () => week);
}

/// Outcome recorded against a single habit-day.
enum LogStatus {
  done(0),

  /// Logged a value but fell short of the target (quantity/duration only).
  partial(1),

  /// Deliberately skipped. Distinct from "no row": an explicit skip is a
  /// decision, an absent row is silence.
  skipped(2),

  /// A [HabitType.negative] habit was broken on this day.
  failed(3);

  const LogStatus(this.value);
  final int value;

  static LogStatus fromValue(int v) =>
      LogStatus.values.firstWhere((e) => e.value == v, orElse: () => done);
}

/// Where a check-in came from. Used for anti-cheat signals in the paid
/// challenge and for "how do people actually log?" analytics.
enum LogSource {
  manual(0),
  widget(1),
  notification(2),

  /// Written by the one-time Supabase import.
  migration(3),

  /// Written by a Google Drive restore.
  restore(4);

  const LogSource(this.value);
  final int value;

  static LogSource fromValue(int v) =>
      LogSource.values.firstWhere((e) => e.value == v, orElse: () => manual);
}

/// Why a streak freeze was granted.
enum FreezeSource {
  /// Earned by consecutive satisfied periods.
  earned(0),
  purchased(1),
  proGrant(2),

  /// Applied by hand from Settings.
  manual(3);

  const FreezeSource(this.value);
  final int value;

  static FreezeSource fromValue(int v) =>
      FreezeSource.values.firstWhere((e) => e.value == v, orElse: () => earned);
}

enum TaskStatus {
  pending(0),
  completed(1),
  cancelled(2);

  const TaskStatus(this.value);
  final int value;

  static TaskStatus fromValue(int v) =>
      TaskStatus.values.firstWhere((e) => e.value == v, orElse: () => pending);
}

enum TaskPriority {
  low(0),
  medium(1),
  high(2);

  const TaskPriority(this.value);
  final int value;

  /// Maps the legacy free-text priority. The Capacitor build wrote 'High' /
  /// 'Medium' / 'Low' but nothing constrained it, so unknown values land on
  /// [medium] rather than throwing during migration.
  static TaskPriority fromLegacy(String? s) => switch (s?.toLowerCase()) {
        'high' => high,
        'low' => low,
        _ => medium,
      };

  static TaskPriority fromValue(int v) =>
      TaskPriority.values.firstWhere((e) => e.value == v, orElse: () => medium);
}

enum GoalStatus {
  active(0),
  completed(1),
  abandoned(2);

  const GoalStatus(this.value);
  final int value;

  /// The legacy `goals.status` column holds at least three spellings for
  /// "done" — the old Goals page tolerated all of them, so production data
  /// contains all of them.
  static GoalStatus fromLegacy(String? s) => switch (s?.toLowerCase()) {
        'completed' || 'done' || 'achieved' => completed,
        'abandoned' => abandoned,
        _ => active,
      };

  static GoalStatus fromValue(int v) =>
      GoalStatus.values.firstWhere((e) => e.value == v, orElse: () => active);
}

/// What a goal's progress is derived from.
enum GoalProgressMode {
  /// User drags a slider.
  manual(0),

  /// Ratio of completed milestones.
  milestones(1),

  /// Weighted contribution of linked habits and tasks. This is the mode that
  /// fixes the old app's permanently-zero goal progress: `goals.progress` was
  /// read by the score calculation but written by nothing.
  linked(2);

  const GoalProgressMode(this.value);
  final int value;

  static GoalProgressMode fromValue(int v) => GoalProgressMode.values
      .firstWhere((e) => e.value == v, orElse: () => milestones);
}

/// What a goal is linked to. Kept polymorphic so a third linkable type costs
/// nothing later.
enum LinkedEntity {
  habit(0),
  task(1);

  const LinkedEntity(this.value);
  final int value;

  static LinkedEntity fromValue(int v) =>
      LinkedEntity.values.firstWhere((e) => e.value == v, orElse: () => habit);
}

/// User classification of an app for screen-time insights.
enum AppCategory {
  neutral(0),
  distracting(1),
  productive(2);

  const AppCategory(this.value);
  final int value;

  static AppCategory fromValue(int v) =>
      AppCategory.values.firstWhere((e) => e.value == v, orElse: () => neutral);
}
