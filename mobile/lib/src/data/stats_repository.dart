import 'package:drift/drift.dart';

import '../domain/civil_date.dart';
import '../domain/streak_engine.dart';
import 'database.dart';
import 'enums.dart';
import 'habit_repository.dart';

enum StatsRange {
  days30(30, '30D'),
  days90(90, '90D'),
  year(365, '1Y');

  const StatsRange(this.days, this.label);
  final int days;
  final String label;
}

/// Where a person's effort actually went, per category.
///
/// Habits **and** tasks, because a category someone is pouring task work into
/// while keeping no habits in it is still a category they are working on — and
/// the old version, which counted habit check-ins only, called that category
/// empty.
///
/// Carries the previous equal-length period alongside, so the card can say
/// *improving* or *slipping* rather than only *how much*. A ranked list of
/// totals tells you where you have always spent time; the delta tells you what
/// changed, which is the thing worth acting on.
class CategoryStat {
  const CategoryStat({
    required this.category,
    required this.habitCompletions,
    required this.taskCompletions,
    required this.previousTotal,
  });

  final String category;
  final int habitCompletions;
  final int taskCompletions;

  /// Habits + tasks over the immediately preceding window of the same length.
  final int previousTotal;

  int get completions => habitCompletions + taskCompletions;

  /// Percentage change against the previous window, or null when there is no
  /// baseline worth dividing by.
  ///
  /// Null rather than a number: everything is "up infinitely" from zero, and a
  /// category with two check-ins last month and eight this month is not a 300%
  /// improvement in any sense worth telling somebody about — it is a new habit.
  int? get changePercent {
    if (previousTotal < minBaseline) return null;
    return (((completions - previousTotal) / previousTotal) * 100).round();
  }

  /// Below this the previous window is too thin to divide by.
  ///
  /// Raised from 3 after seeing the result on a young account: a baseline of
  /// three produced "up 392%", which is arithmetically true and communicates
  /// nothing except that the app will print any number.
  static const minBaseline = 8;

  /// How the change should be written.
  ///
  /// Past a doubling, a percentage stops being readable — "up 392%" is worse
  /// than "4.9×" at conveying the same fact, and people can picture a multiple.
  String? get changeLabel {
    final change = changePercent;
    if (change == null) return null;
    if (change.abs() < 100) return '${change.abs()}%';
    final ratio = completions / previousTotal;
    return '${ratio.toStringAsFixed(1)}×';
  }

  /// Only called a real move past this, so noise does not read as a trend.
  static const materialChange = 15;

  bool get isImproving =>
      (changePercent ?? 0) >= materialChange;
  bool get isSlipping => (changePercent ?? 0) <= -materialChange;
}

class StatsView {
  const StatsView({
    required this.range,
    required this.days,
    required this.currentStreak,
    required this.bestStreak,
    required this.habitRate,
    required this.taskRate,
    required this.goalRate,
    required this.totalCompletions,
    required this.byCategory,
    required this.bestWeekday,
  });

  final StatsRange range;

  /// Oldest first, one entry per calendar day in the range.
  final List<DayOutcome> days;

  final int currentStreak;
  final int bestStreak;

  /// 0..100 completion rates over the range.
  final int habitRate;
  final int taskRate;
  final int goalRate;

  final int totalCompletions;
  final List<CategoryStat> byCategory;

  /// The weekday with the highest completion rate, or null with too little
  /// data to say anything honest.
  final String? bestWeekday;

  /// Heatmap bucket 0..4 for a day.
  ///
  /// Scaled against what was actually *scheduled* that day rather than against
  /// a global maximum, so a light day fully completed reads as strong — which
  /// is the truthful reading.
  int intensityOf(DayOutcome d) {
    if (d.scheduled == 0) return 0;
    final ratio = d.completed / d.scheduled;
    if (ratio <= 0) return 0;
    if (ratio < 0.34) return 1;
    if (ratio < 0.67) return 2;
    if (ratio < 1) return 3;
    return 4;
  }
}

class StatsRepository {
  StatsRepository(this._db, this._habits);

  final AppDatabase _db;
  final HabitRepository _habits;

  Stream<StatsView> watch(StatsRange range) {
    return _db
        .watchTables(
          'stats_view',
          {_db.habits, _db.habitLogs, _db.tasks, _db.goals},
        )
        .asyncMap((_) => load(range));
  }

  /// Tasks completed between two civil dates, grouped by category.
  ///
  /// `completed_at` is an epoch timestamp while the range is civil dates, so
  /// the comparison is done on a derived local date rather than by converting
  /// the range to instants — the two are different things and mixing them is
  /// how a day goes missing around midnight.
  Future<Map<String, int>> _tasksByCategory(String fromIso, String toIso) async {
    final rows = await _db.customSelect(
      "SELECT COALESCE(NULLIF(TRIM(category), ''), 'General') AS c, "
      'COUNT(*) AS n FROM tasks '
      'WHERE deleted_at IS NULL AND completed_at IS NOT NULL '
      "AND date(completed_at / 1000, 'unixepoch', 'localtime') BETWEEN ?1 AND ?2 "
      'GROUP BY c',
      variables: [Variable<String>(fromIso), Variable<String>(toIso)],
    ).get();
    return {
      for (final r in rows) r.read<String>('c'): r.read<int>('n'),
    };
  }

  /// Habit check-ins between two civil dates, grouped by the habit's category.
  Future<Map<String, int>> _habitCompletionsByCategory(
    List<Habit> habits,
    String fromIso,
    String toIso,
  ) async {
    final rows = await _db.customSelect(
      'SELECT habit_id, COUNT(*) AS n FROM habit_logs '
      'WHERE deleted_at IS NULL AND log_date BETWEEN ?1 AND ?2 '
      'GROUP BY habit_id',
      variables: [Variable<String>(fromIso), Variable<String>(toIso)],
    ).get();

    final categoryOf = {for (final h in habits) h.id: h.category};
    final out = <String, int>{};
    for (final r in rows) {
      final category = categoryOf[r.read<String>('habit_id')];
      if (category == null) continue;
      out[category] = (out[category] ?? 0) + r.read<int>('n');
    }
    return out;
  }

  /// Streaks are computed over a fixed window, never the selected range.
  ///
  /// Deriving them from the visible range makes a 90-day view report a 90-day
  /// streak — the number is then just the window size, which looks impressive
  /// and means nothing.
  static const _streakWindowDays = 400;

  Future<StatsView> load(StatsRange range) async {
    final today = CivilDate.today();
    final start = today.addDays(-(range.days - 1));
    // Pull far enough back that the streak is bounded by the user's behaviour
    // rather than by whichever chip is selected.
    final scanStart =
        today.addDays(-((range.days > _streakWindowDays ? range.days : _streakWindowDays) - 1));

    final habits = await (_db.select(_db.habits)
          ..where((h) => h.deletedAt.isNull()))
        .get();

    // One grouped query rather than a query per day. At 365 days and thousands
    // of logs this is the difference between instant and visibly slow.
    final logRows = await _db.customSelect(
      'SELECT log_date, habit_id FROM habit_logs '
      'WHERE deleted_at IS NULL AND log_date >= ?',
      variables: [Variable<String>(scanStart.iso)],
    ).get();

    final completionsByDate = <String, Set<String>>{};
    final completionsByHabit = <String, int>{};
    for (final r in logRows) {
      final date = r.read<String>('log_date');
      final habitId = r.read<String>('habit_id');
      (completionsByDate[date] ??= <String>{}).add(habitId);
      completionsByHabit[habitId] = (completionsByHabit[habitId] ?? 0) + 1;
    }

    // Scheduled-per-day is evaluated in Dart because it depends on each habit's
    // schedule rule, which SQL cannot express.
    // `allDays` spans the streak window; `days` is the visible slice.
    final allDays = <DayOutcome>[];
    final days = <DayOutcome>[];
    final weekdayScheduled = List<int>.filled(7, 0);
    final weekdayCompleted = List<int>.filled(7, 0);

    // The headline rate is accumulated separately from the streak's day
    // outcome, because the two need different rules and quietly sharing one
    // was making them disagree.
    //
    // `completed` below counts every habit checked off that day, scheduled or
    // not, because the overall streak asks only "did you keep something you
    // owed today". The rate cannot use that: a flexible "3x a week" habit is
    // never `isDueOn` any particular day, so its check-in was landing in the
    // numerator while nothing of its own was in the denominator — it paid down
    // the *daily* habits' quota. That is why the card's own curve read 71%
    // while the number above it read 73%.
    //
    // The rate now applies exactly the rule the curve is drawn with: fixed
    // habits count on the days they are due, and a flexible habit counts only
    // on the days it is actually kept. One definition, one number.
    var rateScheduledTotal = 0;
    var rateCompletedTotal = 0;

    for (var d = scanStart; d.isAtOrBefore(today); d = d.addDays(1)) {
      final doneToday = completionsByDate[d.iso];
      var scheduled = 0;
      var rateScheduled = 0;
      var rateCompleted = 0;

      for (final h in habits) {
        // A habit cannot be scheduled before it existed or after it was
        // archived; counting those days would depress every historical rate.
        if (CivilDate.parse(h.startDate).isAfter(d)) continue;
        if (h.archivedAt != null &&
            CivilDate.today(DateTime.fromMillisecondsSinceEpoch(h.archivedAt!))
                .isBefore(d)) {
          continue;
        }

        final schedule = _habits.scheduleOf(h);
        final due = schedule.isDueOn(d);
        if (due) scheduled++;

        final kept = doneToday?.contains(h.id) ?? false;
        if (schedule.kind == ScheduleKind.timesPerPeriod) {
          // Counted only when kept — a flexible habit owes the week, not the
          // day, so an untouched Tuesday is not a miss.
          if (kept) {
            rateScheduled++;
            rateCompleted++;
          }
        } else if (due) {
          rateScheduled++;
          if (kept) rateCompleted++;
        }
      }

      final completed = completionsByDate[d.iso]?.length ?? 0;
      final outcome =
          DayOutcome(date: d, scheduled: scheduled, completed: completed);
      allDays.add(outcome);

      // Rates, the heatmap, and the weekday analysis describe the selected
      // range only; the streak looks further back.
      if (d.isAtOrAfter(start)) {
        days.add(outcome);
        rateScheduledTotal += rateScheduled;
        rateCompletedTotal += rateCompleted;
        weekdayScheduled[d.dow] += scheduled;
        weekdayCompleted[d.dow] += completed;
      }
    }

    final streak = OverallStreak.compute(allDays, today: today);

    // Effort by category — habits *and* tasks, this window and the one before.
    //
    // Resolved from the habit rather than the log so a habit recategorised
    // today reclassifies its whole history consistently.
    final habitByCategory = <String, int>{};
    for (final h in habits) {
      final n = completionsByHabit[h.id] ?? 0;
      if (n == 0) continue;
      habitByCategory[h.category] = (habitByCategory[h.category] ?? 0) + n;
    }

    final prevStart = start.addDays(-range.days);
    final taskByCategory = await _tasksByCategory(start.iso, today.iso);
    final prevTasks = await _tasksByCategory(prevStart.iso, start.addDays(-1).iso);
    final prevHabits = await _habitCompletionsByCategory(
      habits,
      prevStart.iso,
      start.addDays(-1).iso,
    );

    final names = <String>{
      ...habitByCategory.keys,
      ...taskByCategory.keys,
      ...prevHabits.keys,
      ...prevTasks.keys,
    };
    final categoryStats = [
      for (final name in names)
        CategoryStat(
          category: name,
          habitCompletions: habitByCategory[name] ?? 0,
          taskCompletions: taskByCategory[name] ?? 0,
          previousTotal: (prevHabits[name] ?? 0) + (prevTasks[name] ?? 0),
        ),
    ]..sort((a, b) => b.completions.compareTo(a.completions));

    return StatsView(
      range: range,
      days: days,
      currentStreak: streak.current,
      bestStreak: streak.longest,
      habitRate: rateScheduledTotal == 0
          ? 0
          : ((rateCompletedTotal / rateScheduledTotal) * 100)
              .round()
              .clamp(0, 100),
      taskRate: await _rate(
        'SELECT COUNT(*) AS c FROM tasks WHERE deleted_at IS NULL',
        'SELECT COUNT(*) AS c FROM tasks '
            'WHERE deleted_at IS NULL AND status = ${TaskStatus.completed.value}',
      ),
      goalRate: await _rate(
        'SELECT COUNT(*) AS c FROM goals WHERE deleted_at IS NULL',
        'SELECT COUNT(*) AS c FROM goals '
            'WHERE deleted_at IS NULL AND status = ${GoalStatus.completed.value}',
      ),
      totalCompletions: logRows
          .where((r) => r.read<String>('log_date').compareTo(start.iso) >= 0)
          .length,
      byCategory: categoryStats,
      bestWeekday: _bestWeekday(weekdayScheduled, weekdayCompleted),
    );
  }

  Future<int> _rate(String totalSql, String doneSql) async {
    final total =
        (await _db.customSelect(totalSql).getSingle()).read<int>('c');
    if (total == 0) return 0;
    final done = (await _db.customSelect(doneSql).getSingle()).read<int>('c');
    return ((done / total) * 100).round().clamp(0, 100);
  }

  static String? _bestWeekday(List<int> scheduled, List<int> completed) {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday'];
    var bestIndex = -1;
    var bestRate = 0.0;
    var withData = 0;

    for (var i = 0; i < 7; i++) {
      if (scheduled[i] < 3) continue; // too little data to claim a pattern
      withData++;
      final rate = completed[i] / scheduled[i];
      if (rate > bestRate) {
        bestRate = rate;
        bestIndex = i;
      }
    }

    // Naming a "best day" from two data points is the kind of confident-sounding
    // nonsense that makes people distrust the whole screen.
    if (bestIndex < 0 || withData < 3) return null;
    return names[bestIndex];
  }
}
