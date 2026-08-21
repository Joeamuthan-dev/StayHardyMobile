import 'package:drift/drift.dart';

import '../domain/badge_catalogue.dart';
import '../domain/civil_date.dart';
import '../domain/streak_engine.dart';
import 'database.dart';
import 'enums.dart';
import 'habit_repository.dart';
import 'settings_repository.dart';

/// A badge the user holds.
class EarnedBadge {
  const EarnedBadge({
    required this.def,
    required this.earnedAt,
    required this.popupShown,
  });

  final BadgeDef def;
  final int earnedAt;
  final bool popupShown;
}

/// Everything the achievements screen renders.
class AchievementsView {
  const AchievementsView({
    required this.stats,
    required this.earned,
    required this.xp,
    required this.unshown,
    this.nextUp,
  });

  final AchievementStats stats;

  /// Newest first.
  final List<EarnedBadge> earned;

  final int xp;

  /// Earned but never celebrated. Drives the popup.
  final List<EarnedBadge> unshown;

  final BadgeDef? nextUp;

  int get level => Xp.levelFor(xp);
  double get levelProgress => Xp.progressIn(xp);
  int get xpToNext => Xp.toNextLevel(xp);

  Set<String> get earnedKeys => {for (final b in earned) b.def.key};

  static const empty = AchievementsView(
    stats: AchievementStats.zero,
    earned: [],
    xp: 0,
    unshown: [],
  );
}

/// Awards badges and keeps the XP ratchet.
///
/// The only writer of `badges` outside the one-time Supabase import.
class AchievementService {
  AchievementService(this._db, this._habits, this._settings);

  final AppDatabase _db;
  final HabitRepository _habits;
  final SettingsRepository _settings;

  /// Streak history is walked over the same fixed window the Stats screen uses,
  /// so the badge ladder and the number on screen can never disagree.
  static const _streakWindowDays = 400;

  Stream<AchievementsView> watch() {
    return _db
        .watchTables(
          'achievements',
          {_db.badges, _db.habitLogs, _db.habits, _db.tasks, _db.goals,
            _db.focusSessions},
        )
        .asyncMap((_) => load());
  }

  Future<AchievementsView> load() async {
    final stats = await computeStats();
    final rows = await _db.select(_db.badges).get();

    final earned = <EarnedBadge>[];
    for (final row in rows) {
      final def = BadgeCatalogue.byKey(row.key);
      // A key we no longer ship — from a future version, or a hand-inserted
      // row. Kept in the database (never revoke) but not rendered, since there
      // is no honest name or artwork for it.
      if (def == null) continue;
      earned.add(EarnedBadge(
        def: def,
        earnedAt: row.earnedAt,
        popupShown: row.popupShown,
      ));
    }
    earned.sort((a, b) => b.earnedAt.compareTo(a.earnedAt));

    final held = {for (final b in earned) b.def.key};
    final xp = await _ratchetXp(stats, held.length);

    return AchievementsView(
      stats: stats,
      earned: earned,
      xp: xp,
      unshown: earned.where((b) => !b.popupShown).toList(),
      nextUp: BadgeEngine.nextUp(stats, held),
    );
  }

  /// Award anything newly qualified for. Safe to call as often as you like.
  ///
  /// Returns the badges awarded by *this* call, already marked shown or not
  /// according to whether this was the first evaluation on the device.
  Future<List<BadgeDef>> evaluate() async {
    final stats = await computeStats();
    final existing = await _db.select(_db.badges).get();
    final held = {for (final row in existing) row.key};

    final fresh = BadgeEngine.newlyEarned(stats, held);
    if (fresh.isEmpty) {
      await _settings.set(SettingsKeys.badgesEvaluated, 'true');
      return const [];
    }

    // On the very first evaluation — a fresh install, or the first launch after
    // importing years of history — everything qualifies at once. Marking those
    // shown is the same call the Supabase import makes: nobody wants nine
    // celebration popups stacked up on their first launch.
    final firstRun = !await _settings.getBool(SettingsKeys.badgesEvaluated);
    final now = DateTime.now().millisecondsSinceEpoch;

    await _db.transaction(() async {
      for (final def in fresh) {
        await _db.into(_db.badges).insert(
              BadgesCompanion.insert(
                key: def.key,
                earnedAt: now,
                popupShown: Value(firstRun),
              ),
              mode: InsertMode.insertOrIgnore,
            );
      }
    });

    await _settings.set(SettingsKeys.badgesEvaluated, 'true');
    return firstRun ? const [] : fresh;
  }

  /// Mark badges as celebrated so the popup does not return.
  Future<void> markShown(Iterable<String> keys) async {
    if (keys.isEmpty) return;
    await _db.transaction(() async {
      for (final key in keys) {
        await (_db.update(_db.badges)..where((b) => b.key.equals(key)))
            .write(const BadgesCompanion(popupShown: Value(true)));
      }
    });
  }

  /// XP, derived then ratcheted.
  ///
  /// The stored value is a high-water mark. Deleting a habit, un-checking a
  /// box, or restoring an older backup all reduce the derived figure; none of
  /// them may reduce the level the user has already been shown.
  Future<int> _ratchetXp(AchievementStats stats, int badgeCount) async {
    final derived = Xp.forStats(stats, badgesEarned: badgeCount);
    final stored = await _settings.getInt(SettingsKeys.xpHighWater) ?? 0;
    if (derived <= stored) return stored;
    await _settings.set(SettingsKeys.xpHighWater, derived.toString());
    return derived;
  }

  /// The lifetime numbers every badge is judged against.
  Future<AchievementStats> computeStats({CivilDate? on}) async {
    final today = on ?? CivilDate.today();
    final scanStart = today.addDays(-(_streakWindowDays - 1));

    final habits = await (_db.select(_db.habits)
          ..where((h) => h.deletedAt.isNull()))
        .get();

    final logRows = await _db.customSelect(
      'SELECT log_date, habit_id FROM habit_logs WHERE deleted_at IS NULL '
      'AND log_date >= ?1',
      variables: [Variable<String>(scanStart.iso)],
    ).get();

    final byDate = <String, int>{};
    // Which habits, not just how many. A perfect-week badge cannot be decided
    // from a bare count: a flexible "3x a week" habit is never `isDueOn` any
    // given day, so its check-in was landing in the numerator with nothing of
    // its own in the denominator and paying down the *daily* habits' quota —
    // which could hand out a perfect week nobody actually had.
    final keptByDate = <String, Set<String>>{};
    for (final r in logRows) {
      final d = r.read<String>('log_date');
      byDate[d] = (byDate[d] ?? 0) + 1;
      (keptByDate[d] ??= <String>{}).add(r.read<String>('habit_id'));
    }

    // Scheduled-per-day has to be evaluated in Dart: it depends on each habit's
    // own schedule rule, which SQL cannot express.
    final days = <DayOutcome>[];
    var perfectWeeks = 0;
    var weekScheduled = 0;
    var weekCompleted = 0;
    var weekDays = 0;

    for (var d = scanStart; d.isAtOrBefore(today); d = d.addDays(1)) {
      final kept = keptByDate[d.iso];
      var scheduled = 0;
      var rateScheduled = 0;
      var rateCompleted = 0;

      for (final h in habits) {
        if (CivilDate.parse(h.startDate).isAfter(d)) continue;
        if (h.archivedAt != null &&
            CivilDate.today(DateTime.fromMillisecondsSinceEpoch(h.archivedAt!))
                .isBefore(d)) {
          continue;
        }

        final schedule = _habits.scheduleOf(h);
        final due = schedule.isDueOn(d);
        if (due) scheduled++;

        // A flexible habit owes the week, not the day, so it counts only on
        // the days it is actually kept.
        final done = kept?.contains(h.id) ?? false;
        if (schedule.kind == ScheduleKind.timesPerPeriod) {
          if (done) {
            rateScheduled++;
            rateCompleted++;
          }
        } else if (due) {
          rateScheduled++;
          if (done) rateCompleted++;
        }
      }

      final completed = byDate[d.iso] ?? 0;
      // The day outcome keeps its own meaning — the streak asks only whether
      // anything owed was kept — while the week rate uses the honest rule.
      days.add(DayOutcome(date: d, scheduled: scheduled, completed: completed));

      weekScheduled += rateScheduled;
      weekCompleted += rateCompleted;
      weekDays++;
      if (weekDays == 7) {
        // A week with nothing scheduled is not a perfect week — it is an empty
        // one, and counting it would hand the badge to someone who deleted
        // every habit.
        if (weekScheduled > 0 && weekCompleted >= weekScheduled) perfectWeeks++;
        weekScheduled = 0;
        weekCompleted = 0;
        weekDays = 0;
      }
    }

    final streak = OverallStreak.compute(days, today: today);

    final focusRow = await _db.customSelect(
      'SELECT COALESCE(SUM(actual_seconds), 0) AS s FROM focus_sessions '
      'WHERE deleted_at IS NULL AND ended_at IS NOT NULL',
    ).getSingle();

    final tasksRow = await _db.customSelect(
      'SELECT COUNT(*) AS c FROM tasks WHERE deleted_at IS NULL '
      'AND status = ${TaskStatus.completed.value}',
    ).getSingle();

    final goalsRow = await _db.customSelect(
      'SELECT COUNT(*) AS c FROM goals WHERE deleted_at IS NULL '
      'AND status = ${GoalStatus.completed.value}',
    ).getSingle();

    // Lifetime check-ins are counted without the window: the volume badges are
    // about everything the user has ever done, and a 400-day window would make
    // a two-year user's total quietly shrink each morning.
    final totalRow = await _db.customSelect(
      'SELECT COUNT(*) AS c FROM habit_logs WHERE deleted_at IS NULL',
    ).getSingle();

    return AchievementStats(
      // The *best* streak, not the current one: a badge is a record of
      // something that happened, and breaking a streak cannot un-happen it.
      bestStreak: streak.longest,
      totalCheckIns: totalRow.read<int>('c'),
      focusMinutes: focusRow.read<int>('s') ~/ 60,
      perfectWeeks: perfectWeeks,
      tasksCompleted: tasksRow.read<int>('c'),
      goalsCompleted: goalsRow.read<int>('c'),
    );
  }
}
