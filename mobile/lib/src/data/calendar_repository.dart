import 'package:drift/drift.dart';

import '../domain/civil_date.dart';
import 'database.dart';
import 'habit_repository.dart';

/// One day in the calendar grid.
class CalendarDay {
  const CalendarDay({
    required this.date,
    required this.scheduled,
    required this.completed,
    required this.frozen,
  });

  final CivilDate date;
  final int scheduled;
  final int completed;

  /// Habits forgiven by a streak freeze on this day.
  final int frozen;

  /// Nothing was due. Neither a win nor a loss, and painted as neither.
  bool get isRestDay => scheduled == 0;

  bool get isComplete => scheduled > 0 && completed >= scheduled;

  /// 0..1, or null on a rest day — which is not a rate of zero.
  double? get rate => scheduled == 0 ? null : (completed / scheduled).clamp(0.0, 1.0);
}

/// One habit's standing on a chosen day, for the day sheet.
class CalendarEntry {
  const CalendarEntry({
    required this.habit,
    required this.done,
    required this.frozen,
  });

  final Habit habit;
  final bool done;

  /// Covered by a freeze. Shown, but not togglable — a freeze is a record of
  /// something the app did, not a check-in the user can take back.
  final bool frozen;
}

/// A month of habit history, and the ability to fix it.
///
/// The calendar exists for one thing the rest of the app cannot do: **marking a
/// day you actually did but forgot to tick.** A read-only month grid is a
/// decoration; the whole value is that Tuesday can be corrected on Thursday.
class CalendarRepository {
  CalendarRepository(this._db, this._habits);

  final AppDatabase _db;
  final HabitRepository _habits;

  Stream<List<CalendarDay>> watchMonth(CivilDate anyDayInMonth) {
    return _db
        .watchTables(
          'calendar_month',
          {_db.habits, _db.habitLogs, _db.habitFreezes},
        )
        .asyncMap((_) => loadMonth(anyDayInMonth));
  }

  /// Every day of the month containing [anyDayInMonth], oldest first.
  ///
  /// Days after today are returned with nothing scheduled rather than omitted:
  /// the grid needs the full month to lay out, and a future day showing as
  /// "missed" would be absurd.
  Future<List<CalendarDay>> loadMonth(
    CivilDate anyDayInMonth, {
    CivilDate? on,
  }) async {
    final today = on ?? CivilDate.today();
    final start = anyDayInMonth.startOfMonth();
    final end = anyDayInMonth.endOfMonth();

    // Archived habits are included: they were genuinely scheduled back then,
    // and dropping them would make a user's history quietly improve every time
    // they archived something.
    final habits = await (_db.select(_db.habits)
          ..where((h) => h.deletedAt.isNull()))
        .get();

    final logRows = await _db.customSelect(
      'SELECT log_date, COUNT(*) AS c FROM habit_logs '
      'WHERE deleted_at IS NULL AND log_date >= ?1 AND log_date <= ?2 '
      'GROUP BY log_date',
      variables: [Variable<String>(start.iso), Variable<String>(end.iso)],
    ).get();
    final doneByDate = {
      for (final r in logRows) r.read<String>('log_date'): r.read<int>('c'),
    };

    final freezeRows = await _db.customSelect(
      'SELECT freeze_date, COUNT(*) AS c FROM habit_freezes '
      'WHERE deleted_at IS NULL AND freeze_date >= ?1 AND freeze_date <= ?2 '
      'GROUP BY freeze_date',
      variables: [Variable<String>(start.iso), Variable<String>(end.iso)],
    ).get();
    final frozenByDate = {
      for (final r in freezeRows)
        r.read<String>('freeze_date'): r.read<int>('c'),
    };

    final out = <CalendarDay>[];
    for (var d = start; d.isAtOrBefore(end); d = d.addDays(1)) {
      var scheduled = 0;
      if (!d.isAfter(today)) {
        scheduled = _scheduledOn(habits, d);
      }
      out.add(CalendarDay(
        date: d,
        scheduled: scheduled,
        completed: doneByDate[d.iso] ?? 0,
        frozen: frozenByDate[d.iso] ?? 0,
      ));
    }
    return out;
  }

  /// What was due on [day], and what was done.
  Future<List<CalendarEntry>> entriesFor(CivilDate day) async {
    final habits = await (_db.select(_db.habits)
          ..where((h) => h.deletedAt.isNull())
          ..orderBy([(h) => OrderingTerm.asc(h.sortIndex)]))
        .get();

    final logs = await (_db.select(_db.habitLogs)
          ..where((l) => l.logDate.equals(day.iso) & l.deletedAt.isNull()))
        .get();
    final done = {for (final l in logs) l.habitId};

    final freezes = await (_db.select(_db.habitFreezes)
          ..where((f) => f.freezeDate.equals(day.iso) & f.deletedAt.isNull()))
        .get();
    final frozen = {for (final f in freezes) f.habitId};

    return [
      for (final h in habits)
        if (_wasScheduled(h, day))
          CalendarEntry(
            habit: h,
            done: done.contains(h.id),
            frozen: frozen.contains(h.id),
          ),
    ];
  }

  /// Toggle a habit on a past day.
  ///
  /// Marked [backfilled] so it is distinguishable from a check-in made on the
  /// day. The flag costs nothing here and is what lets a paid challenge reject
  /// retroactive completions later without needing a schema change then.
  ///
  /// Future days are refused outright — there is no honest meaning to ticking
  /// off something that has not happened.
  Future<bool> setDone(
    String habitId,
    CivilDate day, {
    required bool done,
    CivilDate? on,
  }) async {
    final today = on ?? CivilDate.today();
    if (day.isAfter(today)) return false;

    if (!done) {
      await (_db.delete(_db.habitLogs)
            ..where((l) =>
                l.habitId.equals(habitId) & l.logDate.equals(day.iso)))
          .go();
      return true;
    }

    final now = DateTime.now().millisecondsSinceEpoch;
    await _habits.toggleOn(
      habitId,
      day,
      backfilled: day.iso != today.iso,
      now: now,
    );
    return true;
  }

  int _scheduledOn(List<Habit> habits, CivilDate d) {
    var n = 0;
    for (final h in habits) {
      if (_wasScheduled(h, d)) n++;
    }
    return n;
  }

  /// Whether [h] was genuinely due on [d].
  ///
  /// Bounded by the habit's own lifetime at both ends. Without the start bound
  /// every habit appears to have failed every day before it existed; without
  /// the archive bound, archiving one retroactively adds misses to days after
  /// the user had already stopped.
  bool _wasScheduled(Habit h, CivilDate d) {
    if (CivilDate.parse(h.startDate).isAfter(d)) return false;
    final archivedAt = h.archivedAt;
    if (archivedAt != null &&
        CivilDate.today(DateTime.fromMillisecondsSinceEpoch(archivedAt))
            .isBefore(d)) {
      return false;
    }
    return _habits.scheduleOf(h).isDueOn(d);
  }
}
