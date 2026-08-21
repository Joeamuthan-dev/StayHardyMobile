/// Local schema. This database is the source of truth — Supabase holds auth,
/// subscription, and challenge coordination only, and never habit content.
///
/// Two conventions run through every table:
///
/// **Civil dates are TEXT `YYYY-MM-DD`, timestamps are INTEGER epoch millis.**
/// A check-in belongs to a calendar day in the user's own timezone, not to an
/// instant — storing it as a timestamp forces offset arithmetic that breaks
/// across DST and around midnight. This also matches the legacy
/// `routine_logs.completed_at` format exactly, so migration is a straight copy.
/// The two roles are never mixed.
///
/// **Deletes are soft.** `deletedAt` tombstones let Drive-backup merge tell
/// "deleted on another device" apart from "not yet created here". Without them,
/// restoring an older backup resurrects deleted habits. Tombstones older than
/// 180 days are purged by a maintenance job.
library;

import 'package:drift/drift.dart';

/// Columns every user-owned, backup-carried row shares.
mixin _Auditable on Table {
  TextColumn get id => text()();

  /// Legacy Supabase row id, for one-time migration idempotency. Null for rows
  /// created in this app.
  TextColumn get remoteId => text().nullable().unique()();

  IntColumn get createdAt => integer()();
  IntColumn get updatedAt => integer()();
  IntColumn get deletedAt => integer().nullable()();

  /// Set when the row changes; cleared after a successful backup. Decides
  /// *whether* to back up, never *what* — backups are full snapshots.
  BoolColumn get dirty => boolean().withDefault(const Constant(true))();
}

@DataClassName('Habit')
class Habits extends Table with _Auditable {
  TextColumn get title => text().withLength(min: 1, max: 200)();
  TextColumn get note => text().nullable()();

  /// Category *name* only. Color and icon are resolved at render time from
  /// HabitCategories — the legacy schema denormalized them onto each row, which
  /// meant a palette change never reached existing habits.
  TextColumn get category => text().withDefault(const Constant('General'))();

  /// [HabitType]
  IntColumn get habitType => integer().withDefault(const Constant(0))();

  /// Target per occurrence for quantity/duration habits. Null for binary.
  RealColumn get targetValue => real().nullable()();
  TextColumn get unit => text().nullable()();

  /// 0 = at least [targetValue] (build), 1 = at most (limit / negative habits).
  IntColumn get targetDirection => integer().withDefault(const Constant(0))();

  /// [ScheduleKind]
  IntColumn get scheduleKind => integer().withDefault(const Constant(0))();

  /// 7-bit mask, bit 0 = Sunday .. bit 6 = Saturday. 127 = every day.
  ///
  /// Replaces the legacy `days text[]`. A bitmask makes "which habits are due
  /// today" an indexed SQL predicate instead of per-row filtering in Dart,
  /// which is what makes the old Stats page slow.
  IntColumn get weekdayMask => integer().withDefault(const Constant(127))();

  /// For [ScheduleKind.timesPerPeriod].
  IntColumn get targetPerPeriod => integer().nullable()();

  /// [PeriodKind]
  IntColumn get periodKind => integer().withDefault(const Constant(0))();

  /// For [ScheduleKind.everyNDays].
  IntColumn get intervalDays => integer().nullable()();
  TextColumn get anchorDate => text().nullable()();

  /// Snapshotted at creation so changing the global week-start preference does
  /// not silently redraw historical week boundaries and rewrite streaks.
  IntColumn get weekStartDow => integer().withDefault(const Constant(1))();

  TextColumn get reminderTime => text().nullable()(); // 'HH:mm'
  IntColumn get reminderDaysMask => integer().withDefault(const Constant(0))();

  IntColumn get sortIndex => integer().withDefault(const Constant(0))();

  /// Routine Player membership. A habit belongs to at most one stack.
  TextColumn get stackId => text().nullable()();
  IntColumn get stackPosition => integer().nullable()();

  TextColumn get startDate => text()(); // 'YYYY-MM-DD'
  TextColumn get endDate => text().nullable()();

  /// Archived habits keep their history and streak records but leave the
  /// active list. Preferred over deletion everywhere in the UI.
  IntColumn get archivedAt => integer().nullable()();

  /// Exempt from the 7-habit free cap.
  ///
  /// Set during migration for habits beyond the 7th on a free account. Existing
  /// users keep everything they already had; nothing is ever hidden or locked.
  /// The flag is never re-granted once the habit is deleted.
  BoolColumn get grandfathered => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('HabitLog')
class HabitLogs extends Table with _Auditable {
  TextColumn get habitId => text().references(Habits, #id)();

  /// Local civil date, 'YYYY-MM-DD'.
  TextColumn get logDate => text()();

  /// 1 for binary; the count or minutes otherwise. Quantity habits mutate this
  /// rather than appending rows, so a habit-day stays a single indexed lookup.
  RealColumn get value => real().withDefault(const Constant(1))();

  /// [LogStatus]
  IntColumn get status => integer().withDefault(const Constant(0))();

  TextColumn get note => text().nullable()();
  IntColumn get mood => integer().nullable()();

  /// When the tap actually happened, epoch millis.
  IntColumn get loggedAt => integer()();

  /// [LogSource]
  IntColumn get source => integer().withDefault(const Constant(0))();

  /// Logged into an already-closed period. Allowed (people forget), but
  /// flagged — and rejected outright for paid-challenge habits.
  BoolColumn get backfilled => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};

  /// Mirrors the live Supabase constraint on (routine_id, completed_at), so
  /// duplicate logs collapse on import instead of erroring.
  @override
  List<String> get customConstraints => ['UNIQUE (habit_id, log_date)'];
}

/// A day a broken streak was forgiven.
///
/// Freezes are materialized rows, never inferred at read time. That is what
/// makes them un-farmable: a grant only ever happens at forward-moving rollover,
/// so editing history cannot manufacture one retroactively.
@DataClassName('HabitFreeze')
class HabitFreezes extends Table with _Auditable {
  TextColumn get habitId => text().references(Habits, #id)();
  TextColumn get freezeDate => text()();

  /// [FreezeSource]
  IntColumn get source => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<String> get customConstraints => ['UNIQUE (habit_id, freeze_date)'];
}

/// One row per habit per active period. The keystone of the streak engine.
///
/// Every schedule kind reduces to this table: day-based habits get one row per
/// due day with `required = 1`; a "3× per week" habit gets one row per week with
/// `required = 3`. The streak engine then has exactly ONE algorithm — walk back
/// through periods counting consecutive `satisfied`. Without this, flexible
/// schedules need their own streak logic and the implementations drift apart,
/// which is precisely what happened in the app being replaced (three streak
/// functions, three different answers).
///
/// Derived data: excluded from backups and rebuilt on restore.
@DataClassName('HabitPeriod')
class HabitPeriodStatus extends Table {
  TextColumn get habitId => text().references(Habits, #id)();

  /// 'YYYY-MM-DD' for day periods, 'YYYY-Www' for weeks, 'YYYY-MM' for months.
  TextColumn get periodKey => text()();

  TextColumn get periodStart => text()();
  TextColumn get periodEnd => text()();

  IntColumn get required => integer().withDefault(const Constant(1))();
  IntColumn get completed => integer().withDefault(const Constant(0))();
  BoolColumn get frozen => boolean().withDefault(const Constant(false))();

  /// completed + frozen >= required
  BoolColumn get satisfied => boolean().withDefault(const Constant(false))();

  /// True once the period has ended. A sealed period no longer changes on its
  /// own; only an explicit backfill touches it.
  BoolColumn get sealed => boolean().withDefault(const Constant(false))();

  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {habitId, periodKey};
}

/// Denormalized streak per habit, so the home screen never recomputes.
/// Derived data: excluded from backups.
@DataClassName('HabitStreak')
class HabitStreakState extends Table {
  TextColumn get habitId => text().references(Habits, #id)();
  IntColumn get currentStreak => integer().withDefault(const Constant(0))();
  IntColumn get longestStreak => integer().withDefault(const Constant(0))();
  TextColumn get lastSatisfiedPeriod => text().nullable()();
  IntColumn get freezeBalance => integer().withDefault(const Constant(0))();
  IntColumn get freezesEarnedTotal => integer().withDefault(const Constant(0))();
  IntColumn get totalCompletions => integer().withDefault(const Constant(0))();
  TextColumn get firstLogDate => text().nullable()();

  /// Last period fully evaluated, so recompute can resume rather than restart.
  TextColumn get computedThrough => text().nullable()();
  IntColumn get computedAt => integer()();

  @override
  Set<Column> get primaryKey => {habitId};
}

/// An ordered chain of habits run as one guided sequence — the Routine Player.
@DataClassName('RoutineStack')
class RoutineStacks extends Table with _Auditable {
  TextColumn get name => text()();
  TextColumn get startTime => text().nullable()(); // 'HH:mm'
  IntColumn get sortIndex => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('Task')
class Tasks extends Table with _Auditable {
  TextColumn get title => text().withLength(min: 1, max: 500)();
  TextColumn get description => text().nullable()();

  /// [TaskStatus]
  IntColumn get status => integer().withDefault(const Constant(0))();

  /// [TaskPriority]
  IntColumn get priority => integer().withDefault(const Constant(1))();

  TextColumn get category => text().nullable()();
  TextColumn get dueDate => text().nullable()(); // 'YYYY-MM-DD'
  TextColumn get dueTime => text().nullable()(); // 'HH:mm'
  IntColumn get remindAt => integer().nullable()();
  IntColumn get completedAt => integer().nullable()();

  IntColumn get estimateMinutes => integer().nullable()();
  IntColumn get actualMinutes => integer().nullable()();

  /// Subtasks. Depth is capped at one level in the repository layer — nested
  /// trees are a UI trap at this screen size.
  TextColumn get parentTaskId => text().nullable()();

  TextColumn get goalId => text().nullable()();

  /// RRULE subset; null for one-off tasks.
  TextColumn get recurrenceRule => text().nullable()();
  TextColumn get recurrenceParentId => text().nullable()();

  /// Local file path, never a remote URL — images are pulled down during
  /// migration so the app keeps working with no network.
  TextColumn get imagePath => text().nullable()();

  IntColumn get sortIndex => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('Goal')
class Goals extends Table with _Auditable {
  TextColumn get name => text().withLength(min: 1, max: 300)();
  TextColumn get description => text().nullable()();

  /// The "why". Surfaced when a goal is at risk.
  TextColumn get whyNote => text().nullable()();

  TextColumn get targetDate => text().nullable()(); // 'YYYY-MM-DD'

  /// [GoalStatus]
  IntColumn get status => integer().withDefault(const Constant(0))();

  TextColumn get quote => text().nullable()();
  TextColumn get coverImagePath => text().nullable()();

  /// [GoalProgressMode]
  IntColumn get progressMode => integer().withDefault(const Constant(1))();

  /// Only consulted when [progressMode] is manual.
  IntColumn get manualProgress => integer().withDefault(const Constant(0))();

  IntColumn get completedAt => integer().nullable()();
  IntColumn get sortIndex => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('GoalMilestone')
class GoalMilestones extends Table with _Auditable {
  TextColumn get goalId => text().references(Goals, #id)();
  TextColumn get title => text()();
  TextColumn get targetDate => text().nullable()();
  BoolColumn get done => boolean().withDefault(const Constant(false))();
  IntColumn get doneAt => integer().nullable()();
  IntColumn get sortIndex => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}

/// Links a goal to the habits and tasks that actually move it.
///
/// Polymorphic on purpose: goal progress becomes one weighted SUM instead of a
/// UNION across two near-identical tables. The trade-off is no FK on
/// [entityId]; orphans are swept in the same maintenance job as tombstones.
@DataClassName('GoalLink')
class GoalLinks extends Table with _Auditable {
  TextColumn get goalId => text().references(Goals, #id)();

  /// [LinkedEntity]
  IntColumn get entityType => integer()();
  TextColumn get entityId => text()();

  RealColumn get weight => real().withDefault(const Constant(1))();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<String> get customConstraints => [
        'UNIQUE (goal_id, entity_type, entity_id)',
      ];
}

@DataClassName('FocusSession')
class FocusSessions extends Table with _Auditable {
  IntColumn get startedAt => integer()();
  IntColumn get endedAt => integer().nullable()();
  IntColumn get plannedSeconds => integer()();

  /// Focus time actually accrued, excluding pauses. Advanced only when a run
  /// span closes, so it is always a settled number rather than a live estimate.
  IntColumn get actualSeconds => integer().withDefault(const Constant(0))();

  /// Start of the current running span, or null while paused.
  ///
  /// This is what makes the timer wall-clock based rather than tick-based. A
  /// `Timer.periodic` counter stops advancing the moment Android freezes the
  /// process, so a 25-minute session spent with the screen off would be
  /// credited as seconds — which is precisely the case a focus timer exists to
  /// measure. Elapsed is always `actualSeconds + (now - resumedAt)`.
  IntColumn get resumedAt => integer().nullable()();

  IntColumn get interruptions => integer().withDefault(const Constant(0))();
  BoolColumn get completed => boolean().withDefault(const Constant(false))();

  TextColumn get habitId => text().nullable()();
  TextColumn get taskId => text().nullable()();
  TextColumn get goalId => text().nullable()();

  /// A free-text "what for", when the block is for something that is neither
  /// a goal nor a habit. Exactly one of label/goalId/habitId/taskId is set.
  TextColumn get label => text().nullable()();

  /// Denormalized so daily rollups don't have to convert timestamps.
  TextColumn get localDate => text()();

  @override
  Set<Column> get primaryKey => {id};
}

/// One mood entry per calendar day.
///
/// Deliberately **one row per day, not per moment**. A mood tracker that lets
/// you log six times a day produces a chart nobody can read and a prompt nobody
/// answers; one honest reading, at a time the user chose, is the thing that
/// actually gets filled in. Logging again on the same day overwrites.
///
/// The score is 1–5 rather than free text so it can be averaged, trended and
/// set against habit completion. The note is optional and never required —
/// making people write something is how a daily prompt becomes a chore.
@DataClassName('MoodLog')
class MoodLogs extends Table with _Auditable {
  /// 'YYYY-MM-DD' in the user's own timezone. Unique — see the class note.
  TextColumn get logDate => text()();

  /// 1 (terrible) to 5 (excellent). Constrained in the repository rather than
  /// by a CHECK, matching how `habit_logs.value` is handled.
  IntColumn get score => integer()();

  /// Optional one-liner. Null is the normal case.
  TextColumn get note => text().nullable()();

  /// When it was actually recorded, as opposed to which day it describes.
  /// A mood logged at 11pm for today and one backfilled tomorrow morning are
  /// different things, and only this column can tell them apart.
  IntColumn get loggedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};

  @override
  List<Set<Column>> get uniqueKeys => [
        {logDate},
      ];
}

/// Daily screen-time summary. Android only, Pro only, and it never leaves the
/// device — see the prominent-disclosure requirement before requesting usage
/// access.
@DataClassName('ScreenTimeDay')
class ScreenTimeDaily extends Table {
  TextColumn get localDate => text()();
  IntColumn get totalForegroundMs => integer().withDefault(const Constant(0))();
  IntColumn get unlockCount => integer().withDefault(const Constant(0))();
  IntColumn get firstUnlockAt => integer().nullable()();

  /// Top 5 apps as JSON, so the summary renders without touching the detail
  /// table once that has been pruned.
  TextColumn get topAppsJson => text().nullable()();

  IntColumn get collectedAt => integer()();

  /// True for today's row until the day rolls over.
  BoolColumn get isPartial => boolean().withDefault(const Constant(true))();

  @override
  Set<Column> get primaryKey => {localDate};
}

/// Per-app detail. Retained 90 days, then collapsed into [ScreenTimeDaily].
@DataClassName('ScreenTimeApp')
class ScreenTimeAppDaily extends Table {
  TextColumn get localDate => text()();
  TextColumn get packageName => text()();
  TextColumn get appLabel => text().nullable()();
  IntColumn get foregroundMs => integer().withDefault(const Constant(0))();
  IntColumn get launchCount => integer().withDefault(const Constant(0))();

  /// [AppCategory]
  IntColumn get category => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {localDate, packageName};
}

@DataClassName('Badge')
class Badges extends Table {
  /// Ladder keys are preserved verbatim from the Capacitor build
  /// (streak_7 .. streak_300) so migrated `user_badges` rows map 1:1.
  TextColumn get key => text()();
  IntColumn get earnedAt => integer()();

  /// Migrated badges are marked shown, otherwise a long-time user is greeted by
  /// nine celebration popups at once on first launch.
  BoolColumn get popupShown => boolean().withDefault(const Constant(false))();

  BoolColumn get dirty => boolean().withDefault(const Constant(true))();

  @override
  Set<Column> get primaryKey => {key};
}

/// Precomputed per-day totals. Makes a 52-week heatmap a 364-row primary-key
/// range scan instead of an aggregation over every log ever written.
/// Derived data: excluded from backups.
@DataClassName('DailyRollup')
class DailyRollups extends Table {
  TextColumn get localDate => text()();
  IntColumn get habitsScheduled => integer().withDefault(const Constant(0))();
  IntColumn get habitsCompleted => integer().withDefault(const Constant(0))();
  IntColumn get habitsFrozen => integer().withDefault(const Constant(0))();
  IntColumn get tasksDue => integer().withDefault(const Constant(0))();
  IntColumn get tasksCompleted => integer().withDefault(const Constant(0))();
  IntColumn get focusMinutes => integer().withDefault(const Constant(0))();
  IntColumn get screenMinutes => integer().withDefault(const Constant(0))();

  /// 0..100 discipline score.
  IntColumn get score => integer().withDefault(const Constant(0))();

  /// 0..4 heatmap bucket, precomputed so painting never does math.
  IntColumn get intensity => integer().withDefault(const Constant(0))();

  IntColumn get computedAt => integer()();

  @override
  Set<Column> get primaryKey => {localDate};
}

/// Key/value user settings, typed accessors live in the repository layer.
@DataClassName('Setting')
class Settings extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {key};
}

/// Internal bookkeeping: schema version, device id, migration state.
/// Never backed up, never user-visible.
///
/// Named `AppMeta` rather than `Meta` — the bare name collides with
/// `package:meta`'s `Meta` annotation, which drift's analyzer resolves first and
/// then rejects as "not understood".
@DataClassName('MetaEntry')
class AppMeta extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column> get primaryKey => {key};
}
