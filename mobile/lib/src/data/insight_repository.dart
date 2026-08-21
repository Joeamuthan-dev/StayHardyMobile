import 'package:drift/drift.dart';

import '../domain/civil_date.dart';
import '../domain/insight_rules.dart';
import '../domain/streak_engine.dart';
import 'database.dart';
import 'enums.dart';
import 'goal_repository.dart';
import 'habit_repository.dart';

/// A finished review: the numbers, and what the engine made of them.
class WeeklyReview {
  const WeeklyReview({required this.input, required this.insights});

  final ReviewInput input;
  final List<Insight> insights;

  bool get hasEnoughData => input.scheduled > 0 || input.completed > 0;
}

/// Gathers a week of evidence and hands it to [InsightEngine].
///
/// All the judgement lives in the engine; this file only counts things. Keeping
/// the split strict is what lets every rule and threshold be tested against
/// hand-built numbers instead of against a database fixture.
class InsightRepository {
  InsightRepository(this._db, this._habits, this._goals);

  final AppDatabase _db;
  final HabitRepository _habits;
  final GoalRepository _goals;

  /// Weeks of history examined for weekday patterns. An exact multiple of 7 so
  /// the last bucket lines up precisely with the reviewed week.
  static const windowWeeks = 12;

  Stream<WeeklyReview> watch() {
    return _db
        .watchTables(
          'weekly_review',
          {
            _db.habits,
            _db.habitLogs,
            _db.goals,
            _db.goalMilestones,
            _db.goalLinks,
            _db.tasks,
            _db.focusSessions,
          },
        )
        .asyncMap((_) => load());
  }

  Future<WeeklyReview> load({CivilDate? on}) async {
    final input = await buildInput(on: on);
    return WeeklyReview(
      input: input,
      insights: InsightEngine.generate(input),
    );
  }

  Future<ReviewInput> buildInput({CivilDate? on}) async {
    final today = on ?? CivilDate.today();

    // The review ends YESTERDAY, never today.
    //
    // Today is still in progress: a habit scheduled for this afternoon has not
    // been missed, and counting it as one would make every review opened in the
    // morning read as a collapse. This is the same rule the streak engine
    // applies to open periods, for the same reason.
    final weekEnd = today.addDays(-1);
    final weekStart = weekEnd.addDays(-6);
    final windowStart = weekEnd.addDays(-(windowWeeks * 7 - 1));

    final habits = await (_db.select(_db.habits)
          ..where((h) => h.deletedAt.isNull() & h.archivedAt.isNull()))
        .get();

    final logRows = await _db.customSelect(
      'SELECT habit_id, log_date FROM habit_logs '
      'WHERE deleted_at IS NULL AND log_date >= ?1 AND log_date <= ?2',
      variables: [
        Variable<String>(windowStart.iso),
        Variable<String>(weekEnd.iso),
      ],
    ).get();

    final logsByHabit = <String, Set<String>>{};
    for (final r in logRows) {
      (logsByHabit[r.read<String>('habit_id')] ??= <String>{})
          .add(r.read<String>('log_date'));
    }

    // Last completion can predate the window, so it is asked for separately
    // rather than inferred from the logs above — otherwise a habit dormant for
    // six months would look identical to one dormant for twelve weeks.
    final lastRows = await _db.customSelect(
      'SELECT habit_id, MAX(log_date) AS last_date FROM habit_logs '
      'WHERE deleted_at IS NULL GROUP BY habit_id',
    ).get();
    final lastByHabit = {
      for (final r in lastRows)
        r.read<String>('habit_id'): r.read<String>('last_date'),
    };

    final weekdayScheduled = List<int>.filled(7, 0);
    final weekdayCompleted = List<int>.filled(7, 0);
    final habitWeeks = <HabitWeek>[];

    // The week's rate is accumulated under the same rule the consistency
    // curve and the Stats headline use, and deliberately NOT from the per-habit
    // buckets below.
    //
    // Those buckets count a completion whether or not the habit was due, which
    // a flexible "3x a week" habit breaks: it is never `isDueOn` any given day,
    // so its check-ins landed in the numerator with nothing of their own in the
    // denominator and quietly paid down the daily habits' quota. The buckets
    // stay as they are because the per-habit insight claims are built on them;
    // only the headline percentage moves onto the honest rule.
    final rateScheduled = List<int>.filled(windowWeeks, 0);
    final rateCompleted = List<int>.filled(windowWeeks, 0);
    final dayScheduled = List<int>.filled(7, 0);
    final dayCompleted = List<int>.filled(7, 0);
    var checkIns = 0;

    var oldestStart = weekEnd;

    for (final habit in habits) {
      final schedule = _habits.scheduleOf(habit);
      final start = CivilDate.parse(habit.startDate);
      if (start.isBefore(oldestStart)) oldestStart = start;

      final done = logsByHabit[habit.id] ?? const <String>{};

      // Bucket 0 is the oldest week, bucket windowWeeks-1 is the reviewed week.
      final bucketScheduled = List<int>.filled(windowWeeks, 0);
      final bucketCompleted = List<int>.filled(windowWeeks, 0);

      for (var d = windowStart; d.isAtOrBefore(weekEnd); d = d.addDays(1)) {
        // A habit was not scheduled before it existed. Counting those days
        // would make every habit look like it started by failing.
        if (start.isAfter(d)) continue;

        final bucket = windowStart.daysUntil(d) ~/ 7;
        final isDue = schedule.isDueOn(d);
        final isDone = done.contains(d.iso);

        if (isDue) {
          bucketScheduled[bucket]++;
          weekdayScheduled[d.dow]++;
          if (isDone) weekdayCompleted[d.dow]++;
        }
        if (isDone) bucketCompleted[bucket]++;

        // The honest rate: a flexible habit owes the week rather than the day,
        // so it counts only on the days it is actually kept.
        final flexible = schedule.kind == ScheduleKind.timesPerPeriod;
        var countsScheduled = false;
        var countsCompleted = false;
        if (flexible) {
          countsScheduled = countsCompleted = isDone;
        } else if (isDue) {
          countsScheduled = true;
          countsCompleted = isDone;
        }
        if (countsScheduled) rateScheduled[bucket]++;
        if (countsCompleted) rateCompleted[bucket]++;
        if (isDone && d.isAtOrAfter(weekStart)) checkIns++;

        if (d.isAtOrAfter(weekStart)) {
          final slot = weekStart.daysUntil(d);
          if (slot >= 0 && slot < 7) {
            if (countsScheduled) dayScheduled[slot]++;
            if (countsCompleted) dayCompleted[slot]++;
          }
        }
      }

      final thisWeek = windowWeeks - 1;
      final prevWeek = windowWeeks - 2;


      var bestBefore = 0;
      for (var i = 0; i < thisWeek; i++) {
        if (bucketCompleted[i] > bestBefore) bestBefore = bucketCompleted[i];
      }

      final lastIso = lastByHabit[habit.id];

      habitWeeks.add(HabitWeek(
        id: habit.id,
        title: habit.title,
        scheduled: bucketScheduled[thisWeek],
        completed: bucketCompleted[thisWeek],
        scheduledPrev: bucketScheduled[prevWeek],
        completedPrev: bucketCompleted[prevWeek],
        currentStreak: await _streakOf(habit, today),
        ageDays: start.daysUntil(today),
        bestWeekBefore: bestBefore,
        daysSinceLastCompletion:
            lastIso == null ? null : CivilDate.parse(lastIso).daysUntil(today),
      ));
    }

    // History is bounded by the oldest habit, not by the window: four weeks of
    // window over a habit created on Tuesday is not four weeks of evidence.
    final weeksOfHistory =
        ((oldestStart.daysUntil(weekEnd) + 1) / 7).floor().clamp(0, windowWeeks);

    final focus = await _focusMinutes(weekStart, weekEnd);
    final focusPrev =
        await _focusMinutes(weekStart.addDays(-7), weekStart.addDays(-1));

    return ReviewInput(
      weekStart: weekStart,
      weekEnd: weekEnd,
      habits: habitWeeks,
      goals: await _goalWeeks(today),
      weekdayScheduled: weekdayScheduled,
      weekdayCompleted: weekdayCompleted,
      dayScheduled: dayScheduled,
      dayCompleted: dayCompleted,
      weekRates: [
        for (var i = 0; i < windowWeeks; i++)
          rateScheduled[i] == 0
              ? 0
              : ((rateCompleted[i] / rateScheduled[i]) * 100)
                  .round()
                  .clamp(0, 100),
      ],
      weeksOfHistory: weeksOfHistory,
      scheduled: rateScheduled[windowWeeks - 1],
      completed: rateCompleted[windowWeeks - 1],
      checkIns: checkIns,
      scheduledPrev: rateScheduled[windowWeeks - 2],
      completedPrev: rateCompleted[windowWeeks - 2],
      focusMinutes: focus,
      focusMinutesPrev: focusPrev,
      tasksCompleted: await _tasksCompleted(weekStart, weekEnd),
      tasksCompletedPrev:
          await _tasksCompleted(weekStart.addDays(-7), weekStart.addDays(-1)),
    );
  }

  Future<int> _streakOf(Habit habit, CivilDate today) async {
    final outcomes = await _habits.outcomesFor(habit, on: today);
    if (outcomes.isEmpty) return 0;
    return StreakEngine.compute(outcomes, today: today).current;
  }

  Future<List<GoalWeek>> _goalWeeks(CivilDate today) async {
    final views = await _goals.loadGoals(on: today);
    final out = <GoalWeek>[];

    for (final v in views) {
      if (v.isComplete) continue;

      final targetRaw = v.goal.targetDate;
      double? elapsed;
      if (targetRaw != null) {
        final created = CivilDate.today(
          DateTime.fromMillisecondsSinceEpoch(v.goal.createdAt),
        );
        final target = CivilDate.parse(targetRaw);
        final span = created.daysUntil(target);
        // A goal due today or already overdue has used all of its time; a goal
        // with a target date before it was created is nonsense data and is
        // treated as having no window rather than dividing by zero.
        if (span > 0) {
          elapsed = (created.daysUntil(today) / span).clamp(0.0, 1.0);
        } else if (span == 0) {
          elapsed = 1;
        }
      }

      out.add(GoalWeek(
        id: v.goal.id,
        name: v.goal.name,
        progress: v.progress,
        linkedHabits: v.linkedHabits,
        milestonesTotal: v.milestonesTotal,
        elapsedFraction: elapsed,
        daysRemaining: v.daysRemaining,
      ));
    }
    return out;
  }

  Future<int> _focusMinutes(CivilDate from, CivilDate to) async {
    final row = await _db.customSelect(
      'SELECT COALESCE(SUM(actual_seconds), 0) AS s FROM focus_sessions '
      'WHERE deleted_at IS NULL AND ended_at IS NOT NULL '
      'AND local_date >= ?1 AND local_date <= ?2',
      variables: [Variable<String>(from.iso), Variable<String>(to.iso)],
    ).getSingle();
    return row.read<int>('s') ~/ 60;
  }

  /// Tasks finished inside a date range.
  ///
  /// Bucketed in Dart from `completed_at`, which is an instant: converting it
  /// to a civil date in SQL would need a timezone SQLite does not have, and
  /// would silently shift every task near midnight into the wrong week.
  Future<int> _tasksCompleted(CivilDate from, CivilDate to) async {
    final rows = await _db.customSelect(
      'SELECT completed_at FROM tasks '
      'WHERE deleted_at IS NULL AND completed_at IS NOT NULL '
      'AND status = ${TaskStatus.completed.value}',
    ).get();

    var n = 0;
    for (final r in rows) {
      final at = r.read<int>('completed_at');
      final day =
          CivilDate.today(DateTime.fromMillisecondsSinceEpoch(at));
      if (day.isAtOrAfter(from) && day.isAtOrBefore(to)) n++;
    }
    return n;
  }
}
