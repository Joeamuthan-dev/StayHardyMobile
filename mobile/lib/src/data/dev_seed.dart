import 'dart:math';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../domain/civil_date.dart';
import '../domain/schedule.dart';
import 'database.dart';
import 'enums.dart';

const _uuid = Uuid();

/// Populates an empty database with plausible habits and ~4 months of history.
///
/// Development only — this exists so the UI can be judged against realistic
/// data (partial streaks, missed days, a flexible habit mid-quota) rather than
/// against an empty state. It must never run once real migration lands; it is
/// gated on the database being completely empty and is called only from a
/// debug-mode branch.
/// How much history the seed lays down.
const seedDays = 180;

Future<void> seedDevData(AppDatabase db) async {
  final existing = await db
      .customSelect('SELECT COUNT(*) AS c FROM habits')
      .getSingle();
  if (existing.read<int>('c') > 0) return;

  final today = CivilDate.today();
  // Six months, so the 1Y range chip has a real shape to draw and the store
  // screenshots show the app as it looks in the hands of someone who has
  // actually been using it, rather than on day three.
  final start = today.addDays(-seedDays);
  final now = DateTime.now().millisecondsSinceEpoch;
  // Fixed seed so the same history appears on every fresh install, which makes
  // visual regressions actually comparable between runs.
  final rng = Random(42);

  final specs = <_Spec>[
    _Spec('Morning workout', 'Fitness', ScheduleKind.weekdays,
        mask: _mask([1, 2, 3, 4, 5]), reliability: 0.86,
        reminderTime: '06:30'),
    _Spec('Read 20 pages', 'Learning', ScheduleKind.daily, reliability: 0.78),
    _Spec('Meditate', 'Mindset', ScheduleKind.daily, reliability: 0.92,
        reminderTime: '21:00'),
    _Spec('No sugar', 'Health', ScheduleKind.daily,
        reliability: 0.7, type: HabitType.negative),
    _Spec('Deep work block', 'Work', ScheduleKind.weekdays,
        mask: _mask([1, 2, 3, 4, 5]), reliability: 0.81),
    _Spec('Call family', 'Social', ScheduleKind.timesPerPeriod,
        perPeriod: 3, reliability: 0.6),
    _Spec('Long run', 'Fitness', ScheduleKind.weekdays,
        mask: _mask([6]), reliability: 0.74),
  ];

  await db.transaction(() async {
    for (var i = 0; i < specs.length; i++) {
      final s = specs[i];
      final id = _uuid.v4();

      await db.into(db.habits).insert(HabitsCompanion.insert(
            id: id,
            title: s.title,
            category: Value(s.category),
            habitType: Value(s.type.value),
            scheduleKind: Value(s.kind.value),
            weekdayMask: Value(s.mask),
            targetPerPeriod: Value(s.perPeriod),
            reminderTime: Value(s.reminderTime),
            reminderDaysMask: Value(s.reminderTime == null ? 0 : s.mask),
            sortIndex: Value(i),
            startDate: start.iso,
            createdAt: now,
            updatedAt: now,
          ));

      final schedule = HabitSchedule(
        kind: s.kind,
        weekdayMask: s.mask,
        targetPerPeriod: s.perPeriod,
      );

      for (var d = start; d.isAtOrBefore(today); d = d.addDays(1)) {
        final eligible = s.kind == ScheduleKind.timesPerPeriod
            // Flexible habits get logged on scattered days rather than every
            // day, so the quota is genuinely partial in the current period.
            ? rng.nextDouble() < 0.35
            : schedule.isDueOn(d);
        if (!eligible) continue;

        // Recent weeks are stronger, so streaks look like someone building
        // momentum rather than uniform noise.
        final recency = 1 - (d.daysUntil(today) / seedDays) * 0.25;
        if (rng.nextDouble() > s.reliability * recency) continue;

        // Leave today mostly open so the screen has something to check off.
        if (d.iso == today.iso && rng.nextDouble() < 0.55) continue;

        await db.into(db.habitLogs).insert(
              HabitLogsCompanion.insert(
                id: _uuid.v4(),
                habitId: id,
                logDate: d.iso,
                loggedAt: now,
                source: const Value(0),
                createdAt: now,
                updatedAt: now,
              ),
              mode: InsertMode.insertOrIgnore,
            );
      }
    }
  });

  await _seedGoals(db, today, now);
  await _seedTasks(db, today, now);
  await _seedMood(db, today, start, now, rng);
}

/// Four months of mood readings, derived from the history seeded above.
///
/// Deliberately correlated with how many habits were actually kept that day,
/// because the mood feature's one claim is whether better days and kept habits
/// land together — and a chart fed by pure noise would let that claim look
/// true or false at random rather than testing it.
///
/// The correlation is loose on purpose. Real moods are pushed around by things
/// a habit tracker cannot see, so a clean straight line here would be a
/// prettier chart and a worse rehearsal of the real one.
Future<void> _seedMood(
  AppDatabase db,
  CivilDate today,
  CivilDate start,
  int now,
  Random rng,
) async {
  // Off by default in the app, so the seed has to turn it on or the Stats
  // section it feeds renders nothing and the data looks broken.
  await db.into(db.settings).insertOnConflictUpdate(
        Setting(key: 'mood_enabled', value: 'true', updatedAt: now),
      );

  final rows = await db
      .customSelect(
        'SELECT log_date, COUNT(*) AS n FROM habit_logs '
        'WHERE deleted_at IS NULL GROUP BY log_date',
      )
      .get();
  final keptByDay = {
    for (final r in rows) r.read<String>('log_date'): r.read<int>('n'),
  };

  var day = 0;
  await db.transaction(() async {
    for (var d = start; d.isAtOrBefore(today); d = d.addDays(1), day++) {
      // Nobody logs their mood every single day. Skipping some is what makes
      // the gaps in the line real rather than decorative.
      if (rng.nextDouble() < 0.22) continue;

      final kept = keptByDay[d.iso] ?? 0;
      final base = switch (kept) {
        >= 6 => 4.7,
        >= 4 => 3.9,
        >= 2 => 2.8,
        _ => 1.8,
      };
      // A slow swell across the months, so the range chips show something
      // different from one another instead of the same flat band.
      final swell = 0.55 * sin(day / 26);
      // Wide enough that the scale's ends actually get used. A seed that only
      // ever produces 3s and 4s exercises the middle of the chart and leaves
      // the rendering of a genuinely bad week untested.
      final noise = (rng.nextDouble() - 0.5) * 1.9;
      final score = (base + swell + noise).round().clamp(1, 5);

      await db.into(db.moodLogs).insert(
            MoodLogsCompanion.insert(
              id: _uuid.v4(),
              logDate: d.iso,
              score: score,
              note: Value(_moodNote(score, rng)),
              loggedAt: now,
              createdAt: now,
              updatedAt: now,
            ),
            mode: InsertMode.insertOrIgnore,
          );
    }
  });
}

/// Most readings carry no note — that is the normal case, and a note on every
/// day would make the detail sheet look auto-generated, which it would be.
String? _moodNote(int score, Random rng) {
  if (rng.nextDouble() > 0.18) return null;
  return switch (score) {
    5 => 'Everything landed today.',
    4 => 'Good day. Slept well.',
    3 => 'Fine. Nothing special.',
    2 => 'Tired and behind.',
    _ => 'Rough one.',
  };
}

/// Tasks covering every planner group: overdue, today, upcoming, undated, and
/// done-today.
Future<void> _seedTasks(AppDatabase db, CivilDate today, int now) async {
  final specs = <(String, int?, TaskPriority, bool)>[
    ('Renew gym membership', -3, TaskPriority.high, false),
    ('Reply to landlord', -1, TaskPriority.medium, false),
    ('Book physio appointment', 0, TaskPriority.high, false),
    ('Order running shoes', 0, TaskPriority.low, false),
    ('Prepare Monday review', 2, TaskPriority.medium, false),
    ('File quarterly taxes', 9, TaskPriority.high, false),
    ('Read up on Drift migrations', null, TaskPriority.low, false),
    ('Plan weekend trip', null, TaskPriority.medium, false),
    ('Morning pages', 0, TaskPriority.low, true),
  ];

  await db.transaction(() async {
    for (var i = 0; i < specs.length; i++) {
      final (title, offset, priority, done) = specs[i];
      await db.into(db.tasks).insert(TasksCompanion.insert(
            id: _uuid.v4(),
            title: title,
            status: Value(
              (done ? TaskStatus.completed : TaskStatus.pending).value,
            ),
            priority: Value(priority.value),
            dueDate: Value(offset == null ? null : today.addDays(offset).iso),
            completedAt: Value(done ? now : null),
            sortIndex: Value(i),
            createdAt: now,
            updatedAt: now,
          ));
    }
  });
}

/// Goals spanning the states the screen has to handle: on track, behind,
/// overdue, and completed.
Future<void> _seedGoals(AppDatabase db, CivilDate today, int now) async {
  final habits = await db.select(db.habits).get();
  String? habitId(String title) =>
      habits.where((h) => h.title == title).firstOrNull?.id;

  final specs = <_GoalSpec>[
    _GoalSpec('Run a half marathon', 'Sub 2:00 by race day',
        today.addDays(74), GoalProgressMode.linked,
        linkHabits: ['Long run', 'Morning workout']),
    _GoalSpec('Read 24 books this year', 'Two a month, no exceptions',
        today.addDays(138), GoalProgressMode.milestones,
        milestones: ['Q1 — 6 books', 'Q2 — 12 books', 'Q3 — 18 books',
            'Q4 — 24 books'],
        milestonesDone: 2),
    _GoalSpec('Ship StayHardy 2.0', 'Native rebuild, in users hands',
        today.addDays(-6), GoalProgressMode.milestones,
        milestones: ['Design system', 'Local database', 'Migration',
            'Beta release'],
        milestonesDone: 2),
    _GoalSpec('Quit sugar for 90 days', null, today.addDays(-31),
        GoalProgressMode.linked,
        linkHabits: ['No sugar'], status: GoalStatus.completed),
  ];

  await db.transaction(() async {
    for (var i = 0; i < specs.length; i++) {
      final s = specs[i];
      final goalId = _uuid.v4();

      await db.into(db.goals).insert(GoalsCompanion.insert(
            id: goalId,
            name: s.name,
            description: Value(s.description),
            targetDate: Value(s.targetDate.iso),
            status: Value(s.status.value),
            progressMode: Value(s.mode.value),
            completedAt:
                Value(s.status == GoalStatus.completed ? now : null),
            sortIndex: Value(i),
            createdAt: now,
            updatedAt: now,
          ));

      for (var m = 0; m < s.milestones.length; m++) {
        await db.into(db.goalMilestones).insert(
              GoalMilestonesCompanion.insert(
                id: _uuid.v4(),
                goalId: goalId,
                title: s.milestones[m],
                done: Value(m < s.milestonesDone),
                doneAt: Value(m < s.milestonesDone ? now : null),
                sortIndex: Value(m),
                createdAt: now,
                updatedAt: now,
              ),
            );
      }

      for (final title in s.linkHabits) {
        final id = habitId(title);
        if (id == null) continue;
        await db.into(db.goalLinks).insert(GoalLinksCompanion.insert(
              id: _uuid.v4(),
              goalId: goalId,
              entityType: LinkedEntity.habit.value,
              entityId: id,
              createdAt: now,
              updatedAt: now,
            ));
      }
    }
  });
}

class _GoalSpec {
  _GoalSpec(
    this.name,
    this.description,
    this.targetDate,
    this.mode, {
    this.milestones = const [],
    this.milestonesDone = 0,
    this.linkHabits = const [],
    this.status = GoalStatus.active,
  });

  final String name;
  final String? description;
  final CivilDate targetDate;
  final GoalProgressMode mode;
  final List<String> milestones;
  final int milestonesDone;
  final List<String> linkHabits;
  final GoalStatus status;
}

int _mask(List<int> dows) =>
    dows.fold(0, (acc, d) => acc | (1 << d));

class _Spec {
  _Spec(
    this.title,
    this.category,
    this.kind, {
    this.mask = 127,
    this.perPeriod,
    this.reliability = 0.8,
    this.type = HabitType.binary,
    this.reminderTime,
  });

  final String title;
  final String category;
  final ScheduleKind kind;
  final int mask;
  final int? perPeriod;
  final double reliability;
  final HabitType type;
  final String? reminderTime;
}
