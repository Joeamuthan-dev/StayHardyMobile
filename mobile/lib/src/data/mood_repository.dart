import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../domain/civil_date.dart';
import '../domain/mood_rules.dart';
import 'database.dart';
import 'habit_repository.dart';

/// Everything the mood feature renders.
class MoodView {
  const MoodView({
    required this.enabled,
    required this.today,
    required this.summary,
  });

  /// False until the user turns mood tracking on in Settings. Off by default —
  /// an app that starts asking how you feel without being asked is intrusive.
  final bool enabled;

  /// Today's entry, or null if not logged yet.
  final MoodEntry? today;

  final MoodSummary summary;

  bool get loggedToday => today != null;

  static const off = MoodView(
    enabled: false,
    today: null,
    summary: MoodSummary.empty,
  );
}

class MoodRepository {
  MoodRepository(this._db, this._habits);

  final AppDatabase _db;
  final HabitRepository _habits;
  static const _uuid = Uuid();

  /// How far back the summary looks.
  static const windowDays = 90;

  /// Record (or overwrite) a day.
  ///
  /// Upsert rather than insert: `mood_logs` is unique on `log_date`, and
  /// changing your mind an hour later is normal use, not an error. The row is
  /// reused so the day keeps one identity across a Drive backup.
  Future<void> log(int score, {CivilDate? on, String? note}) async {
    final day = on ?? CivilDate.today();
    final now = DateTime.now().millisecondsSinceEpoch;
    final clamped = score.clamp(1, 5);

    final existing = await (_db.select(_db.moodLogs)
          ..where((m) => m.logDate.equals(day.iso) & m.deletedAt.isNull()))
        .getSingleOrNull();

    if (existing != null) {
      await (_db.update(_db.moodLogs)..where((m) => m.id.equals(existing.id)))
          .write(MoodLogsCompanion(
        score: Value(clamped),
        note: Value(note),
        loggedAt: Value(now),
        updatedAt: Value(now),
        dirty: const Value(true),
      ));
      return;
    }

    await _db.into(_db.moodLogs).insert(MoodLogsCompanion.insert(
          id: _uuid.v4(),
          logDate: day.iso,
          score: clamped,
          note: Value(note),
          loggedAt: now,
          createdAt: now,
          updatedAt: now,
        ));
  }

  Future<void> clear(CivilDate day) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await (_db.update(_db.moodLogs)
          ..where((m) => m.logDate.equals(day.iso)))
        .write(MoodLogsCompanion(
      deletedAt: Value(now),
      updatedAt: Value(now),
      dirty: const Value(true),
    ));
  }

  Future<MoodEntry?> entryFor(CivilDate day) async {
    final row = await (_db.select(_db.moodLogs)
          ..where((m) => m.logDate.equals(day.iso) & m.deletedAt.isNull()))
        .getSingleOrNull();
    if (row == null) return null;
    return MoodEntry(
      date: CivilDate.parse(row.logDate),
      score: row.score,
      note: row.note,
    );
  }

  /// [days] is the range the Stats page is showing.
  ///
  /// Previously fixed at [windowDays], which meant the mood card described 90
  /// days no matter which chip was selected — and on the 1Y chip it could not
  /// show a year at all, because the data never left the repository. Every
  /// number the card prints now comes from exactly the window the user picked.
  Stream<MoodView> watch({required bool enabled, int days = windowDays}) {
    if (!enabled) return Stream.value(MoodView.off);
    return _db
        .watchTables(
          'mood_view_$days',
          {_db.moodLogs, _db.habitLogs, _db.habits},
        )
        .asyncMap((_) => load(days: days));
  }

  Future<MoodView> load({CivilDate? on, int days = windowDays}) async {
    final today = on ?? CivilDate.today();
    final span = days < 1 ? 1 : days;
    final since = today.addDays(-(span - 1));

    final rows = await (_db.select(_db.moodLogs)
          ..where((m) =>
              m.deletedAt.isNull() &
              m.logDate.isBiggerOrEqualValue(since.iso))
          ..orderBy([(m) => OrderingTerm.asc(m.logDate)]))
        .get();

    final entries = [
      for (final r in rows)
        MoodEntry(
          date: CivilDate.parse(r.logDate),
          score: r.score,
          note: r.note,
        ),
    ];

    return MoodView(
      enabled: true,
      today: entries
          .where((e) => e.date.iso == today.iso)
          .cast<MoodEntry?>()
          .firstOrNull,
      summary: MoodRules.summarise(
        entries,
        againstHabits: await _againstHabits(entries, today, span),
      ),
    );
  }

  /// Pairs each mood entry with that day's habit completion.
  ///
  /// Reuses [HabitRepository.recentDays] rather than recomputing scheduling
  /// rules, so mood-vs-habits and the week strip can never disagree about what
  /// a day's completion was.
  Future<List<MoodVsHabits>> _againstHabits(
    List<MoodEntry> entries,
    CivilDate today,
    int days,
  ) async {
    if (entries.isEmpty) return const [];

    final tallies = await _habits.recentDays(days: days, on: today);
    final byDate = {for (final t in tallies) t.date.iso: t};

    return [
      for (final e in entries)
        MoodVsHabits(
          date: e.date,
          score: e.score,
          habitRate: () {
            final t = byDate[e.date.iso];
            // A day with nothing scheduled has no rate. Treating it as 0%
            // would drag every rest day into the "bad day" bucket.
            if (t == null || t.scheduled == 0) return null;
            return t.completed / t.scheduled;
          }(),
        ),
    ];
  }
}
