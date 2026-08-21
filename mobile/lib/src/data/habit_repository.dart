import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../domain/civil_date.dart';
import '../domain/schedule.dart';
import '../domain/streak_engine.dart';
import 'database.dart';
import 'enums.dart';

const _uuid = Uuid();

/// A habit joined with everything today's list needs to render one row.
/// How one day looks on a habit's seven-day trail.
///
/// [pending] exists so today is never drawn as a miss. A habit you have not got
/// to yet at 9am is not a failure, and colouring it red is the single fastest
/// way to make a tracker feel like a nag.
enum DayMark { done, missed, frozen, pending, notDue }

/// One day's scheduled-vs-completed across every habit.
class DayTally {
  const DayTally({
    required this.date,
    required this.scheduled,
    required this.completed,
  });

  final CivilDate date;
  final int scheduled;
  final int completed;
}

class HabitToday {
  const HabitToday({
    required this.habit,
    required this.isDone,
    required this.loggedValue,
    required this.streak,
    required this.periodProgress,
    required this.periodTarget,
    this.trail = const [],
  });

  final Habit habit;
  final bool isDone;

  /// Count or minutes recorded today; 1 for a completed binary habit.
  final double loggedValue;

  final int streak;

  /// For flexible habits: how many times done this period, and the quota.
  /// Both are 0 for day-scheduled habits, which have no quota.
  final int periodProgress;
  final int periodTarget;

  /// The last seven days, oldest first, ending on today.
  ///
  /// Carried on the row rather than fetched per-widget: the habits list renders
  /// one of these per habit, and a provider-per-row would turn a single screen
  /// into fourteen round trips.
  final List<DayMark> trail;

  bool get isFlexible => periodTarget > 0;

  HabitType get type => HabitType.fromValue(habit.habitType);
}

/// Everything the habit detail screen renders.
class HabitDetail {
  const HabitDetail({
    required this.habit,
    required this.currentStreak,
    required this.longestStreak,
    required this.totalCompletions,
    required this.freezesUsed,
    required this.allTimeRate,
    required this.recentRate,
    required this.outcomes,
    required this.doneDates,
    required this.frozenDates,
    this.firstLogDate,
    this.lastLogDate,
  });

  final Habit habit;
  final int currentStreak;
  final int longestStreak;
  final int totalCompletions;
  final int freezesUsed;

  /// 0..100 over every sealed period, and over the last 30 days.
  final int allTimeRate;
  final int recentRate;

  /// Oldest first. Drives the history grid.
  final List<PeriodOutcome> outcomes;

  /// 'YYYY-MM-DD' sets, for painting the grid without a lookup per cell.
  final Set<String> doneDates;
  final Set<String> frozenDates;

  /// Oldest and newest check-in, 'YYYY-MM-DD'. Null when never completed.
  final String? firstLogDate;
  final String? lastLogDate;

  bool get hasHistory => totalCompletions > 0;
}

/// A user's standing against the free habit limit.
class HabitCap {
  const HabitCap({
    required this.total,
    required this.grandfathered,
    required this.isPro,
  });

  /// Every active habit, grandfathered or not.
  final int total;

  /// Carried over from before the limit existed. Never counted, never removed.
  final int grandfathered;

  final bool isPro;

  /// Habits that count toward the limit.
  int get counted => total - grandfathered;

  int get limit => HabitRepository.freeHabitLimit;

  int get remaining =>
      isPro ? 1 << 30 : (limit - counted).clamp(0, limit);

  bool get canCreate => isPro || counted < limit;

  /// True when the user is only over the line because of habits they already
  /// had — worth saying out loud, since "you have 12 of 7" reads as a bug.
  bool get isGrandfathered => grandfathered > 0;
}

class HabitRepository {
  HabitRepository(this._db);

  final AppDatabase _db;

  HabitSchedule scheduleOf(Habit h) => HabitSchedule(
        kind: ScheduleKind.fromValue(h.scheduleKind),
        weekdayMask: h.weekdayMask,
        targetPerPeriod: h.targetPerPeriod,
        periodKind: PeriodKind.fromValue(h.periodKind),
        intervalDays: h.intervalDays,
        anchorDate:
            h.anchorDate == null ? null : CivilDate.parse(h.anchorDate!),
        weekStartDow: h.weekStartDow,
      );

  /// Active habits in the user's own order.
  Future<List<Habit>> activeHabits() {
    return (_db.select(_db.habits)
          ..where((h) => h.deletedAt.isNull() & h.archivedAt.isNull())
          ..orderBy([
            (h) => OrderingTerm.asc(h.sortIndex),
            // Ties are possible: every migrated habit that had no legacy
            // ordinal landed on 0. Without a second key the list would reshuffle
            // between builds and dragging one row would appear to move another.
            (h) => OrderingTerm.asc(h.createdAt),
          ]))
        .get();
  }

  /// Same list, kept live. Backs the reorder screen and any full-library view.
  Stream<List<Habit>> watchActiveHabits() {
    return (_db.select(_db.habits)
          ..where((h) => h.deletedAt.isNull() & h.archivedAt.isNull())
          ..orderBy([
            (h) => OrderingTerm.asc(h.sortIndex),
            (h) => OrderingTerm.asc(h.createdAt),
          ]))
        .watch();
  }

  /// Persist a user-chosen order.
  ///
  /// Rewrites every row rather than patching the moved one: sparse or duplicated
  /// sort indexes are exactly what produced the ties above, and one transaction
  /// over a handful of rows costs nothing. Ids not in [orderedIds] are left
  /// alone, so a habit created while the screen was open is not renumbered to 0
  /// and thrown to the top.
  Future<void> reorder(List<String> orderedIds) async {
    if (orderedIds.isEmpty) return;
    final now = DateTime.now().millisecondsSinceEpoch;

    await _db.transaction(() async {
      for (var i = 0; i < orderedIds.length; i++) {
        await (_db.update(_db.habits)..where((h) => h.id.equals(orderedIds[i])))
            .write(HabitsCompanion(
          sortIndex: Value(i),
          updatedAt: Value(now),
          dirty: const Value(true),
        ));
      }
    });
  }

  /// Everything due today, with completion and streak resolved.
  ///
  /// Streams so a check-off updates the list without any manual refresh —
  /// Drift re-runs this whenever `habits` or `habit_logs` changes.
  Stream<List<HabitToday>> watchToday([CivilDate? on]) {
    final today = on ?? CivilDate.today();
    // Any write to any of these tables invalidates the view.
    return _db
        .watchTables(
          'habits_today',
          {_db.habits, _db.habitLogs, _db.habitFreezes},
        )
        .asyncMap((_) => loadToday(today));
  }

  Future<List<HabitToday>> loadToday([CivilDate? on]) async {
    final today = on ?? CivilDate.today();
    final habits = await activeHabits();
    final out = <HabitToday>[];

    for (final h in habits) {
      final schedule = scheduleOf(h);
      final period = schedule.periodFor(today);
      // Not due today and not a flexible habit — it simply isn't on the list.
      if (period == null) continue;

      final logs = await logsFor(h.id);
      final byDate = {for (final l in logs) l.logDate: l};
      final todayLog = byDate[today.iso];

      final periodDone = logs
          .where((l) => period.contains(CivilDate.parse(l.logDate)))
          .length;

      // One extra indexed read per habit. `_streakFor` fetches the same set
      // inside `outcomesFor`; hoisting it out would mean threading freezes
      // through that signature for a table this small, which is not a trade
      // worth making at the seven-habit free cap.
      final freezes = await freezeDatesFor(h.id);
      final startDate = CivilDate.parse(h.startDate);

      out.add(HabitToday(
        habit: h,
        isDone: todayLog != null,
        loggedValue: todayLog?.value ?? 0,
        streak: await _streakFor(h, logs, today),
        trail: [
          for (var back = 6; back >= 0; back--)
            _markFor(
              today.addDays(-back),
              today: today,
              startDate: startDate,
              schedule: schedule,
              byDate: byDate,
              freezes: freezes,
            ),
        ],
        periodProgress: schedule.kind == ScheduleKind.timesPerPeriod
            ? periodDone
            : 0,
        periodTarget: schedule.kind == ScheduleKind.timesPerPeriod
            ? period.required
            : 0,
      ));
    }
    return out;
  }

  /// One cell of the seven-day trail.
  ///
  /// Order matters: a day before the habit existed, or not on its schedule, is
  /// [DayMark.notDue] and must never read as a miss — otherwise every habit
  /// created last Tuesday shows a week of failures on the day it is created.
  static DayMark _markFor(
    CivilDate day, {
    required CivilDate today,
    required CivilDate startDate,
    required HabitSchedule schedule,
    required Map<String, HabitLog> byDate,
    required Set<String> freezes,
  }) {
    if (day.isBefore(startDate)) return DayMark.notDue;
    if (schedule.periodFor(day) == null) return DayMark.notDue;
    if (byDate.containsKey(day.iso)) return DayMark.done;
    if (freezes.contains(day.iso)) return DayMark.frozen;
    return day.iso == today.iso ? DayMark.pending : DayMark.missed;
  }

  /// Scheduled-vs-completed for each of the last [days] days, oldest first.
  ///
  /// Walks **every active habit**, not just the ones due today, which is why
  /// this cannot be folded out of [loadToday]: that list drops a Mon–Fri habit
  /// on a Saturday, so a week strip built from it would lose that habit's whole
  /// week every weekend.
  ///
  /// Flexible (times-per-period) habits are counted as scheduled only on days
  /// they were actually completed. Their unit is the week, not the day — a
  /// three-times-a-week habit is not "missed" on the four days you did not do
  /// it, and counting it daily would show four phantom failures every week.
  Future<List<DayTally>> recentDays({int days = 7, CivilDate? on}) async {
    final today = on ?? CivilDate.today();
    final habits = await activeHabits();
    final scheduled = List<int>.filled(days, 0);
    final completed = List<int>.filled(days, 0);

    for (final h in habits) {
      final schedule = scheduleOf(h);
      final flexible = schedule.kind == ScheduleKind.timesPerPeriod;
      final startDate = CivilDate.parse(h.startDate);
      final logged = (await logsFor(h.id)).map((l) => l.logDate).toSet();

      for (var i = 0; i < days; i++) {
        final d = today.addDays(-(days - 1 - i));
        if (d.isBefore(startDate)) continue;
        if (schedule.periodFor(d) == null) continue;

        final done = logged.contains(d.iso);
        if (flexible && !done) continue;

        scheduled[i]++;
        if (done) completed[i]++;
      }
    }

    return [
      for (var i = 0; i < days; i++)
        DayTally(
          date: today.addDays(-(days - 1 - i)),
          scheduled: scheduled[i],
          completed: completed[i],
        ),
    ];
  }

  Future<List<HabitLog>> logsFor(String habitId) {
    return (_db.select(_db.habitLogs)
          ..where((l) => l.habitId.equals(habitId) & l.deletedAt.isNull()))
        .get();
  }

  /// Dates this habit has been forgiven on, keyed by period start.
  Future<Set<String>> freezeDatesFor(String habitId) async {
    final rows = await (_db.select(_db.habitFreezes)
          ..where((f) => f.habitId.equals(habitId) & f.deletedAt.isNull()))
        .get();
    return rows.map((f) => f.freezeDate).toSet();
  }

  /// Every evaluated period for [h], oldest first, with completion and freezes
  /// resolved.
  ///
  /// The single place logs and freezes are turned into the shape the streak
  /// engine reads. Both the live streak and the freeze rollover go through here
  /// so they can never disagree about what a period looks like.
  Future<List<PeriodOutcome>> outcomesFor(
    Habit h, {
    List<HabitLog>? logs,
    CivilDate? on,
  }) async {
    final today = on ?? CivilDate.today();
    final schedule = scheduleOf(h);
    final periods =
        schedule.periodsBetween(CivilDate.parse(h.startDate), today);
    if (periods.isEmpty) return const [];

    final source = logs ?? await logsFor(h.id);
    final logDates = source.map((l) => CivilDate.parse(l.logDate)).toList();
    final freezeDates = await freezeDatesFor(h.id);

    return [
      for (final p in periods)
        PeriodOutcome(
          key: p.key,
          start: p.start,
          end: p.end,
          required: p.required,
          completed: logDates.where(p.contains).length,
          frozen: freezeDates.contains(p.start.iso),
        ),
    ];
  }

  /// Streak computed live from logs and schedule.
  ///
  /// `habit_period_status` exists to make this a cached index scan once history
  /// gets long; at current data sizes the live computation is well under a
  /// frame, and computing it from source removes any chance of the cache and
  /// the truth disagreeing — which is the failure mode being replaced.
  Future<int> _streakFor(
    Habit h,
    List<HabitLog> logs,
    CivilDate today,
  ) async {
    if (logs.isEmpty) return 0;
    final outcomes = await outcomesFor(h, logs: logs, on: today);
    if (outcomes.isEmpty) return 0;
    return StreakEngine.compute(outcomes, today: today).current;
  }

  /// One habit's whole story, for its detail screen.
  Future<HabitDetail> detailFor(String habitId, {CivilDate? on}) async {
    final today = on ?? CivilDate.today();
    final habit = await byId(habitId);
    if (habit == null) throw StateError('no habit $habitId');

    final logs = await logsFor(habitId);
    final outcomes = await outcomesFor(habit, logs: logs, on: today);
    final streak = StreakEngine.compute(outcomes, today: today);

    final freezes = await (_db.select(_db.habitFreezes)
          ..where((f) => f.habitId.equals(habitId) & f.deletedAt.isNull()))
        .get();

    final dates = logs.map((l) => l.logDate).toList()..sort();

    // Rates are computed over SEALED periods only. Including the open one drags
    // every rate down every morning and back up every evening, which makes the
    // number look like it is drifting on its own.
    var sealed = 0, satisfied = 0;
    var recent = 0, recentSatisfied = 0;
    final thirtyDaysAgo = today.addDays(-30);
    for (final o in outcomes) {
      if (!o.end.isBefore(today)) continue;
      sealed++;
      if (o.satisfied) satisfied++;
      if (o.start.isAtOrAfter(thirtyDaysAgo)) {
        recent++;
        if (o.satisfied) recentSatisfied++;
      }
    }

    return HabitDetail(
      habit: habit,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      totalCompletions: logs.length,
      firstLogDate: dates.isEmpty ? null : dates.first,
      lastLogDate: dates.isEmpty ? null : dates.last,
      freezesUsed: freezes.length,
      allTimeRate: sealed == 0 ? 0 : ((satisfied / sealed) * 100).round(),
      recentRate: recent == 0 ? 0 : ((recentSatisfied / recent) * 100).round(),
      outcomes: outcomes,
      doneDates: {for (final l in logs) l.logDate},
      frozenDates: {for (final f in freezes) f.freezeDate},
    );
  }

  /// Check a habit off, or undo it.
  ///
  /// Unchecking hard-deletes rather than tombstoning: a check-in is a positive
  /// assertion the user is retracting within the same session, not a record
  /// another device needs to learn about. Tombstones are for edits that must
  /// survive a merge.
  Future<void> toggle(String habitId, {CivilDate? on, double value = 1}) async {
    final today = CivilDate.today();
    final day = on ?? today;
    final now = DateTime.now().millisecondsSinceEpoch;

    final existing = await (_db.select(_db.habitLogs)
          ..where((l) => l.habitId.equals(habitId) & l.logDate.equals(day.iso)))
        .getSingleOrNull();

    if (existing != null) {
      await (_db.delete(_db.habitLogs)..where((l) => l.id.equals(existing.id)))
          .go();
      return;
    }

    // `backfilled` must be derived here, not defaulted.
    //
    // This method takes an `on:` date and used to call `toggleOn` without the
    // flag, so any past day logged through it was recorded as though it had
    // been ticked on the day itself. Harmless while every caller passed today —
    // but `ChallengeService.tallyFor` refuses to count backfilled logs, and a
    // future "log yesterday" affordance built on `toggle` would have quietly
    // handed the challenge engine retroactive check-ins it is designed to
    // reject. `CalendarRepository.setDone` already derives it the same way.
    await toggleOn(
      habitId,
      day,
      value: value,
      now: now,
      backfilled: day.iso != today.iso,
    );
  }

  /// Record a check-in for a specific day, without the toggle semantics.
  ///
  /// Insert-or-ignore against the UNIQUE (habit_id, log_date) constraint, so
  /// two writes for the same day converge instead of throwing — the calendar
  /// and the habit list can both be looking at the same day.
  Future<void> toggleOn(
    String habitId,
    CivilDate day, {
    double value = 1,
    bool backfilled = false,
    int? now,
  }) async {
    final at = now ?? DateTime.now().millisecondsSinceEpoch;
    await _db.into(_db.habitLogs).insert(
          HabitLogsCompanion.insert(
            id: _uuid.v4(),
            habitId: habitId,
            logDate: day.iso,
            value: Value(value),
            loggedAt: at,
            backfilled: Value(backfilled),
            createdAt: at,
            updatedAt: at,
          ),
          mode: InsertMode.insertOrIgnore,
        );
  }

  Future<String> createHabit({
    required String title,
    required String category,
    required ScheduleKind kind,
    int weekdayMask = 127,
    int? targetPerPeriod,
    HabitType type = HabitType.binary,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final id = _uuid.v4();
    final maxSort = await _db
        .customSelect('SELECT COALESCE(MAX(sort_index), -1) AS m FROM habits')
        .getSingle();

    await _db.into(_db.habits).insert(
          HabitsCompanion.insert(
            id: id,
            title: title,
            category: Value(category),
            habitType: Value(type.value),
            scheduleKind: Value(kind.value),
            weekdayMask: Value(weekdayMask),
            targetPerPeriod: Value(targetPerPeriod),
            sortIndex: Value(maxSort.read<int>('m') + 1),
            startDate: CivilDate.today().iso,
            createdAt: now,
            updatedAt: now,
          ),
        );
    return id;
  }

  /// Apply an edit.
  ///
  /// Schedule changes take effect from today forward and never rewrite history:
  /// past logs stay exactly as recorded, so a user who switches a habit from
  /// daily to weekdays does not retroactively gain or lose a streak.
  Future<void> updateHabit(
    String habitId, {
    required String title,
    required String category,
    required ScheduleKind kind,
    required int weekdayMask,
    int? targetPerPeriod,
    HabitType type = HabitType.binary,
    String? reminderTime,
  }) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await (_db.update(_db.habits)..where((h) => h.id.equals(habitId))).write(
      HabitsCompanion(
        title: Value(title),
        category: Value(category),
        habitType: Value(type.value),
        scheduleKind: Value(kind.value),
        weekdayMask: Value(weekdayMask),
        targetPerPeriod: Value(targetPerPeriod),
        reminderTime: Value(reminderTime),
        reminderDaysMask: Value(
            reminderTime == null || reminderTime.isEmpty ? 0 : weekdayMask),
        updatedAt: Value(now),
        dirty: const Value(true),
      ),
    );
  }

  Future<Habit?> byId(String habitId) {
    return (_db.select(_db.habits)..where((h) => h.id.equals(habitId)))
        .getSingleOrNull();
  }

  /// Archive rather than delete — history and streak records are preserved,
  /// and the habit simply leaves the active list.
  Future<void> archive(String habitId) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await (_db.update(_db.habits)..where((h) => h.id.equals(habitId))).write(
      HabitsCompanion(archivedAt: Value(now), updatedAt: Value(now)),
    );
  }

  /// Soft delete, with its logs.
  ///
  /// [archive] is the right answer almost always — it keeps the history and the
  /// streak record, and a habit you stopped doing is still part of your story.
  /// This exists for the other case: a habit created by mistake, or a typo, that
  /// the user does not want sitting in their archive forever.
  ///
  /// The tombstone (rather than a hard row removal) is what lets a Drive restore
  /// tell "deleted on another device" apart from "not yet created here" — the
  /// same reason `TaskRepository.delete` is a soft delete. Logs are tombstoned
  /// alongside, or a restore would resurrect orphaned check-ins that no longer
  /// belong to any habit.
  Future<void> deleteHabit(String habitId) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await _db.transaction(() async {
      await (_db.update(_db.habits)..where((h) => h.id.equals(habitId))).write(
        HabitsCompanion(
          deletedAt: Value(now),
          updatedAt: Value(now),
          dirty: const Value(true),
        ),
      );
      await (_db.update(_db.habitLogs)
            ..where((l) => l.habitId.equals(habitId)))
          .write(
        HabitLogsCompanion(
          deletedAt: Value(now),
          updatedAt: Value(now),
          dirty: const Value(true),
        ),
      );
    });
  }

  /// Habits that count toward the free cap.
  static const freeHabitLimit = 7;

  /// Where a user stands against the free cap.
  ///
  /// Grandfathered habits are excluded from [counted] but included in [total],
  /// which is what makes "you have 12, keep all 12, you just can't add a 13th"
  /// expressible rather than a special case scattered through the UI.
  Future<HabitCap> capStatus({required bool isPro}) async {
    final row = await _db.customSelect(
      'SELECT '
      'COUNT(*) AS total, '
      'SUM(CASE WHEN grandfathered = 1 THEN 1 ELSE 0 END) AS grandfathered '
      'FROM habits WHERE deleted_at IS NULL AND archived_at IS NULL',
    ).getSingle();

    final total = row.read<int>('total');
    final grandfathered = row.readNullable<int>('grandfathered') ?? 0;

    return HabitCap(
      total: total,
      grandfathered: grandfathered,
      isPro: isPro,
    );
  }

  Future<bool> canCreateHabit({required bool isPro}) async =>
      (await capStatus(isPro: isPro)).canCreate;

  /// Enforces the free cap after any bulk import — owner's rule, replacing
  /// the earlier grandfathering: **free means seven, however the habits
  /// arrived.** Creation was already gated; restore (Supabase pull or a
  /// backup file) was the open side door, and someone could walk in with
  /// twelve.
  ///
  /// The first seven by creation order stay active; the rest are ARCHIVED,
  /// never deleted — no check-in history is lost, and going Pro (or archiving
  /// something else) brings them back exactly as they were.
  ///
  /// Returns how many were put away, so the restore UI can say so instead of
  /// habits silently vanishing.
  Future<int> enforceFreeCap({required bool isPro}) async {
    if (isPro) return 0;

    final habits = await (_db.select(_db.habits)
          ..where((h) => h.deletedAt.isNull() & h.archivedAt.isNull())
          ..orderBy([(h) => OrderingTerm.asc(h.createdAt)]))
        .get();

    if (habits.length <= freeHabitLimit) return 0;

    final now = DateTime.now().millisecondsSinceEpoch;
    final excess = habits.skip(freeHabitLimit).toList();

    await _db.transaction(() async {
      for (final h in excess) {
        await (_db.update(_db.habits)..where((row) => row.id.equals(h.id)))
            .write(HabitsCompanion(
          archivedAt: Value(now),
          updatedAt: Value(now),
          dirty: const Value(true),
        ));
      }
    });
    return excess.length;
  }
}
