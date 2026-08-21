import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/enums.dart';
import 'package:stayhardy/src/migration/legacy_mappers.dart';

/// These fixtures mirror the shapes actually present in the live Supabase
/// tables, including the ones that only exist because of historical bugs:
/// mixed camelCase/snake_case within a row, three spellings of "completed",
/// timestamps in date columns, and null columns added by later migrations.
void main() {
  const now = 1786000000000;

  group('weekdayMask', () {
    test('maps three-letter day names to bits', () {
      // Mon | Wed | Fri
      expect(LegacyMappers.weekdayMask(['Mon', 'Wed', 'Fri']), 42);
      expect(LegacyMappers.weekdayMask(['Sun']), 1);
      expect(LegacyMappers.weekdayMask(['Sat']), 64);
    });

    test('is case and whitespace tolerant', () {
      expect(LegacyMappers.weekdayMask([' mon ', 'WED', 'Fri']), 42);
    });

    test('treats null or empty as every day, not never', () {
      // Rows predating the days column showed daily in the old app. Mapping
      // them to 0 would make every one of those habits silently disappear.
      expect(LegacyMappers.weekdayMask(null), 127);
      expect(LegacyMappers.weekdayMask([]), 127);
      expect(LegacyMappers.weekdayMask('not-a-list'), 127);
    });

    test('unrecognised day names do not produce an empty schedule', () {
      expect(LegacyMappers.weekdayMask(['Funday', 'Blursday']), 127);
    });
  });

  group('civilDate', () {
    test('passes through a plain date', () {
      expect(LegacyMappers.civilDate('2026-08-14'), '2026-08-14');
    });

    test('truncates a full timestamp', () {
      // goals.targetDate is a text column and holds both forms in production.
      expect(LegacyMappers.civilDate('2026-08-14T18:30:00.000Z'), '2026-08-14');
    });

    test('returns null for empty or unparseable values', () {
      expect(LegacyMappers.civilDate(null), isNull);
      expect(LegacyMappers.civilDate(''), isNull);
      expect(LegacyMappers.civilDate('   '), isNull);
      expect(LegacyMappers.civilDate('someday'), isNull);
    });
  });

  group('either', () {
    test('reads whichever naming convention is present', () {
      expect(LegacyMappers.either({'userId': 'a'}, 'userId', 'user_id'), 'a');
      expect(LegacyMappers.either({'user_id': 'b'}, 'userId', 'user_id'), 'b');
      expect(LegacyMappers.either({}, 'userId', 'user_id'), isNull);
    });
  });

  group('habit', () {
    test('maps a typical routine row', () {
      final c = LegacyMappers.habit({
        'id': 'r-1',
        'title': 'Morning workout',
        'days': ['Mon', 'Wed', 'Fri'],
        'category': 'Fitness',
        'time': '06:30',
        'created_at': '2025-03-02T04:00:00.000Z',
      }, ordinal: 3, now: now);

      expect(c.remoteId.value, 'r-1');
      expect(c.title.value, 'Morning workout');
      expect(c.category.value, 'Fitness');
      expect(c.weekdayMask.value, 42);
      expect(c.scheduleKind.value, ScheduleKind.weekdays.value);
      expect(c.reminderTime.value, '06:30');
      expect(c.reminderDaysMask.value, 42, reason: 'reminder follows schedule');
      expect(c.sortIndex.value, 3);
      expect(c.startDate.value, '2025-03-02');
      expect(c.habitType.value, HabitType.binary.value);
    });

    test('an all-days routine becomes a daily schedule', () {
      final c = LegacyMappers.habit({
        'id': 'r-2',
        'title': 'Meditate',
        'days': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        'created_at': '2025-03-02T04:00:00.000Z',
      }, ordinal: 0, now: now);

      expect(c.scheduleKind.value, ScheduleKind.daily.value);
      expect(c.weekdayMask.value, 127);
    });

    test('null category becomes General', () {
      // routines.category was added by a later migration, so older rows are null.
      final c = LegacyMappers.habit({
        'id': 'r-3',
        'title': 'Read',
        'created_at': '2025-03-02T04:00:00.000Z',
      }, ordinal: 0, now: now);
      expect(c.category.value, 'General');
    });

    test('a missing title is salvaged rather than dropped', () {
      // Dropping the habit would orphan its entire log history.
      final c = LegacyMappers.habit(
          {'id': 'r-4', 'created_at': '2025-03-02T04:00:00.000Z'},
          ordinal: 0, now: now);
      expect(c.title.value, 'Untitled habit');
      expect(c.remoteId.value, 'r-4');
    });

    test('no reminder means no reminder days', () {
      final c = LegacyMappers.habit({
        'id': 'r-5',
        'title': 'Walk',
        'time': null,
        'created_at': '2025-03-02T04:00:00.000Z',
      }, ordinal: 0, now: now);
      expect(c.reminderTime.value, isNull);
      expect(c.reminderDaysMask.value, 0);
    });
  });

  group('habitLog', () {
    test('maps a completion and preserves its original timestamp', () {
      final c = LegacyMappers.habitLog(
        {
          'routine_id': 'r-1',
          'completed_at': '2025-06-11',
          'created_at': '2025-06-11T19:04:00.000Z',
        },
        localHabitId: 'local-1',
        now: now,
      );

      expect(c, isNotNull);
      expect(c!.logDate.value, '2025-06-11');
      expect(c.habitId.value, 'local-1');
      expect(c.source.value, LogSource.migration.value);
      expect(
        c.loggedAt.value,
        DateTime.parse('2025-06-11T19:04:00.000Z').millisecondsSinceEpoch,
      );
    });

    test('falls back to midday on the logged date, never to now', () {
      // Using "now" would make years-old check-ins look like they happened
      // during the migration, which corrupts every streak and heatmap.
      final c = LegacyMappers.habitLog(
        {'routine_id': 'r-1', 'completed_at': '2025-06-11'},
        localHabitId: 'local-1',
        now: now,
      );
      expect(
        c!.loggedAt.value,
        DateTime.parse('2025-06-11T12:00:00Z').millisecondsSinceEpoch,
      );
      expect(c.loggedAt.value, lessThan(now));
    });

    test('drops logs whose habit did not import', () {
      final c = LegacyMappers.habitLog(
        {'routine_id': 'gone', 'completed_at': '2025-06-11'},
        localHabitId: null,
        now: now,
      );
      expect(c, isNull);
    });

    test('drops logs with no usable date', () {
      expect(
        LegacyMappers.habitLog({'routine_id': 'r-1'},
            localHabitId: 'local-1', now: now),
        isNull,
      );
    });
  });

  group('goal', () {
    test('maps a camelCase row', () {
      final c = LegacyMappers.goal({
        'id': 'g-1',
        'name': 'Run a half marathon',
        'description': 'Sub 2:00',
        'targetDate': '2026-10-01',
        'status': 'pending',
        'quote': 'No days off',
        'createdAt': '2026-01-05T09:00:00.000Z',
        'updatedAt': '2026-02-05T09:00:00.000Z',
      }, ordinal: 0, now: now);

      expect(c.remoteId.value, 'g-1');
      expect(c.name.value, 'Run a half marathon');
      expect(c.targetDate.value, '2026-10-01');
      expect(c.status.value, GoalStatus.active.value);
      expect(c.completedAt.value, isNull);
    });

    test('accepts all three production spellings of completed', () {
      // The old Goals page tolerated each of these, so each exists in the data.
      for (final s in ['completed', 'done', 'achieved']) {
        final c = LegacyMappers.goal(
            {'id': 'g', 'name': 'x', 'status': s}, ordinal: 0, now: now);
        expect(c.status.value, GoalStatus.completed.value, reason: s);
        expect(c.manualProgress.value, 100, reason: s);
      }
    });

    test('falls back to snake_case timestamps', () {
      final c = LegacyMappers.goal({
        'id': 'g-2',
        'name': 'x',
        'created_at': '2026-01-05T09:00:00.000Z',
      }, ordinal: 0, now: now);
      expect(c.createdAt.value,
          DateTime.parse('2026-01-05T09:00:00.000Z').millisecondsSinceEpoch);
    });

    test('a null legacy progress becomes zero, not a crash', () {
      // goals.progress was read by the old score but written by nothing.
      final c = LegacyMappers.goal(
          {'id': 'g-3', 'name': 'x', 'progress': null},
          ordinal: 0, now: now);
      expect(c.manualProgress.value, 0);
      expect(c.progressMode.value, GoalProgressMode.manual.value);
    });

    test('truncates a timestamp stored in targetDate', () {
      final c = LegacyMappers.goal({
        'id': 'g-4',
        'name': 'x',
        'targetDate': '2026-10-01T00:00:00.000Z',
      }, ordinal: 0, now: now);
      expect(c.targetDate.value, '2026-10-01');
    });
  });

  group('task', () {
    test('maps the mixed-convention row shape', () {
      // Note both conventions in one row — this is the real schema.
      final c = LegacyMappers.task({
        'id': 't-1',
        'title': 'Call the bank',
        'status': 'pending',
        'priority': 'High',
        'category': 'Admin',
        'order_index': 7,
        'createdAt': '2026-02-01T09:00:00.000Z',
        'updatedAt': '2026-02-02T09:00:00.000Z',
      }, ordinal: 0, now: now);

      expect(c.remoteId.value, 't-1');
      expect(c.priority.value, TaskPriority.high.value);
      expect(c.sortIndex.value, 7);
      expect(c.status.value, TaskStatus.pending.value);
      expect(c.completedAt.value, isNull);
    });

    test('completed tasks carry a completion time', () {
      final c = LegacyMappers.task({
        'id': 't-2',
        'title': 'x',
        'status': 'completed',
        'updatedAt': '2026-02-02T09:00:00.000Z',
      }, ordinal: 0, now: now);
      expect(c.status.value, TaskStatus.completed.value);
      expect(c.completedAt.value,
          DateTime.parse('2026-02-02T09:00:00.000Z').millisecondsSinceEpoch);
    });

    test('an unknown priority lands on medium rather than throwing', () {
      final c = LegacyMappers.task(
          {'id': 't-3', 'title': 'x', 'priority': 'URGENT!!'},
          ordinal: 0, now: now);
      expect(c.priority.value, TaskPriority.medium.value);
    });

    test('missing order_index falls back to page ordinal', () {
      final c = LegacyMappers.task({'id': 't-4', 'title': 'x'},
          ordinal: 12, now: now);
      expect(c.sortIndex.value, 12);
    });
  });

  group('badge', () {
    test('imports as already-seen', () {
      // Otherwise a two-year user gets nine celebration popups at once.
      final c = LegacyMappers.badge(
          {'badge_key': 'streak_30', 'earned_at': '2025-09-01T00:00:00.000Z'},
          now: now);
      expect(c, isNotNull);
      expect(c!.key.value, 'streak_30');
      expect(c.popupShown.value, isTrue);
    });

    test('skips rows with no key', () {
      expect(LegacyMappers.badge({'badge_key': null}, now: now), isNull);
      expect(LegacyMappers.badge({}, now: now), isNull);
    });
  });
}
