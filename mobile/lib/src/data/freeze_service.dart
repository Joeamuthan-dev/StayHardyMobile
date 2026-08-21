import 'dart:math' as math;

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../domain/civil_date.dart';
import '../domain/freeze_rules.dart';
import '../domain/streak_engine.dart';
import 'database.dart';
import 'enums.dart';
import 'habit_repository.dart';
import 'settings_repository.dart';

const _uuid = Uuid();

/// One streak a rollover saved.
class FreezeSave {
  const FreezeSave({
    required this.habitId,
    required this.habitTitle,
    required this.date,
  });

  final String habitId;
  final String habitTitle;

  /// Period start, 'YYYY-MM-DD'.
  final String date;
}

/// What a rollover did, for the UI to report.
class FreezeRunResult {
  const FreezeRunResult({
    required this.ran,
    required this.saves,
    required this.earned,
  });

  /// False when the rollover was a no-op — already run today, or the clock has
  /// moved backwards.
  final bool ran;

  final List<FreezeSave> saves;
  final int earned;

  static const skipped =
      FreezeRunResult(ran: false, saves: [], earned: 0);
}

/// Applies [FreezePlanner] to the database, at most once per calendar day.
///
/// This is the only writer of `habit_freezes` and `habit_streak_state`, and the
/// only place [SettingsKeys.lastFreezeRunDate] moves. Keeping the earn, the
/// spend, and the watermark in one transaction-shaped method is what makes
/// "a freeze can only be created by time moving forward" checkable in one place
/// rather than argued about across three call sites.
class FreezeService {
  FreezeService(this._db, this._habits, this._settings);

  final AppDatabase _db;
  final HabitRepository _habits;
  final SettingsRepository _settings;

  /// Run the daily rollover. Safe to call on every app start and resume.
  Future<FreezeRunResult> runRollover({CivilDate? on}) async {
    final today = on ?? CivilDate.today();
    final raw = await _settings.getString(SettingsKeys.lastFreezeRunDate);
    final lastRun = raw == null ? null : CivilDate.parse(raw);

    // Already run today, or the device clock moved backwards. Either way there
    // is no forward motion to grant anything for, and the watermark is left
    // where it is — moving it back would re-open periods already closed.
    if (lastRun != null && !lastRun.isBefore(today)) {
      return FreezeRunResult.skipped;
    }

    final habits = await _habits.activeHabits();
    final now = DateTime.now().millisecondsSinceEpoch;
    final saves = <FreezeSave>[];
    var earned = 0;

    for (final habit in habits) {
      final logs = await _habits.logsFor(habit.id);
      final outcomes =
          await _habits.outcomesFor(habit, logs: logs, on: today);
      if (outcomes.isEmpty) continue;

      final state = await (_db.select(_db.habitStreakState)
            ..where((s) => s.habitId.equals(habit.id)))
          .getSingleOrNull();

      final plan = FreezePlanner.plan(
        periods: outcomes,
        today: today,
        balance: state?.freezeBalance ?? 0,
        earnedTotal: state?.freezesEarnedTotal ?? 0,
        lastRunDate: lastRun,
      );

      for (final date in plan.repairs) {
        await _db.into(_db.habitFreezes).insert(
              HabitFreezesCompanion.insert(
                id: _uuid.v4(),
                habitId: habit.id,
                freezeDate: date,
                source: Value(FreezeSource.earned.value),
                createdAt: now,
                updatedAt: now,
              ),
              // The UNIQUE (habit_id, freeze_date) constraint is the real
              // guard against a double-grant; this makes hitting it a no-op
              // rather than an exception that aborts everyone else's rollover.
              mode: InsertMode.insertOrIgnore,
            );
        saves.add(FreezeSave(
          habitId: habit.id,
          habitTitle: habit.title,
          date: date,
        ));
      }
      earned += plan.earned;

      // Recompute over the post-repair view, so the cached streak reflects the
      // freezes this run just spent instead of lagging a day behind them.
      final repaired = plan.repairs.toSet();
      final resolved = [
        for (final o in outcomes)
          if (repaired.contains(o.start.iso))
            PeriodOutcome(
              key: o.key,
              start: o.start,
              end: o.end,
              required: o.required,
              completed: o.completed,
              frozen: true,
            )
          else
            o,
      ];
      final streak = StreakEngine.compute(resolved, today: today);

      final logDates = logs.map((l) => l.logDate).toList()..sort();

      await _db.into(_db.habitStreakState).insertOnConflictUpdate(
            HabitStreakStateCompanion.insert(
              habitId: habit.id,
              currentStreak: Value(streak.current),
              // Never allowed to fall. A longest streak that shrinks because
              // history scrolled past the 400-period horizon reads as the app
              // having deleted an achievement.
              longestStreak: Value(
                math.max(streak.longest, state?.longestStreak ?? 0),
              ),
              lastSatisfiedPeriod: Value(streak.lastSatisfiedKey),
              freezeBalance: Value(plan.balance),
              freezesEarnedTotal: Value(plan.earnedTotal),
              totalCompletions: Value(logs.length),
              firstLogDate:
                  Value(logDates.isEmpty ? null : logDates.first),
              computedThrough: Value(outcomes.last.key),
              computedAt: now,
            ),
          );
    }

    await _settings.set(SettingsKeys.lastFreezeRunDate, today.iso);
    return FreezeRunResult(ran: true, saves: saves, earned: earned);
  }
}

/// Where the user stands on streak protection, for the UI.
class StreakProtection {
  const StreakProtection({required this.balance, required this.recentSaves});

  /// Freezes banked across every active habit.
  final int balance;

  /// Streaks saved in the last few days, newest first.
  final List<FreezeSave> recentSaves;

  static const empty = StreakProtection(balance: 0, recentSaves: []);

  bool get hasAny => balance > 0 || recentSaves.isNotEmpty;
}
