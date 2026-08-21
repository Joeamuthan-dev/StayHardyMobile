import 'dart:io';

import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/challenge_service.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/enums.dart';
import 'package:stayhardy/src/data/habit_repository.dart';
import 'package:stayhardy/src/domain/civil_date.dart';

/// What the client actually sends to the server.
///
/// The server cannot audit these numbers — it never sees a habit — so the value
/// of this layer is that it computes them honestly and never sends something
/// the server's own constraints would reject.
void main() {
  late AppDatabase db;
  late ChallengeService challenge;

  // A Saturday.
  final today = CivilDate(2026, 8, 15);

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    challenge = ChallengeService(db, HabitRepository(db));
  });

  tearDown(() async => db.close());

  Future<void> addHabit(
    String id, {
    ScheduleKind kind = ScheduleKind.daily,
    int mask = 127,
    String startDate = '2026-01-01',
  }) {
    return db.into(db.habits).insert(HabitsCompanion.insert(
          id: id,
          title: 'Habit $id',
          startDate: startDate,
          scheduleKind: Value(kind.value),
          weekdayMask: Value(mask),
          createdAt: 1,
          updatedAt: 1,
        ));
  }

  Future<void> log(
    String habitId, {
    CivilDate? day,
    bool backfilled = false,
    LogSource source = LogSource.manual,
  }) {
    final d = day ?? today;
    return db.into(db.habitLogs).insert(HabitLogsCompanion.insert(
          id: '$habitId-${d.iso}',
          habitId: habitId,
          logDate: d.iso,
          loggedAt: 1,
          backfilled: Value(backfilled),
          source: Value(source.value),
          createdAt: 1,
          updatedAt: 1,
        ));
  }

  group('the tally sent to the server', () {
    test('counts a genuine check-in', () async {
      await addHabit('a');
      await addHabit('b');
      await log('a');

      final t = await challenge.tallyFor(today);
      expect(t.required, 2);
      expect(t.done, 1);
      expect(t.frozen, 0);
    });

    test('does not count a backfilled log', () async {
      await addHabit('a');
      await log('a', backfilled: true);

      final t = await challenge.tallyFor(today);
      expect(t.required, 1);
      expect(t.done, 0);
    });

    test('does not count restored or migrated history', () async {
      // The cheapest attack available: backups are unsigned, and habit_logs
      // merges as a union where an incoming row never loses. Filtering on
      // source is a speed bump, not a wall — but it is free.
      await addHabit('a');
      await addHabit('b');
      await log('a', source: LogSource.restore);
      await log('b', source: LogSource.migration);

      final t = await challenge.tallyFor(today);
      expect(t.required, 2);
      expect(t.done, 0);
    });

    test('reports a freeze separately from a completion', () async {
      await addHabit('a');
      await db.into(db.habitFreezes).insert(HabitFreezesCompanion.insert(
            id: 'f1',
            habitId: 'a',
            freezeDate: today.iso,
            createdAt: 1,
            updatedAt: 1,
          ));

      final t = await challenge.tallyFor(today);
      expect(t.done, 0);
      expect(t.frozen, 1);
      expect(t.isComplete, isFalse,
          reason: 'a hand-granted freeze must not read as a completed day');
    });

    test('a habit not due today is not required', () async {
      // Mon–Fri only; the 15th is a Saturday.
      await addHabit('weekdays', kind: ScheduleKind.weekdays, mask: 0x3E);

      final t = await challenge.tallyFor(today);
      expect(t.required, 0);
      expect(t.isRestDay, isTrue);
    });

    test('a habit that did not exist yet is not required', () async {
      await addHabit('later', startDate: '2026-09-01');

      final t = await challenge.tallyFor(today);
      expect(t.required, 0);
    });

    test('no habits at all tallies to a rest day, not a failure', () async {
      final t = await challenge.tallyFor(today);
      expect(t.isRestDay, isTrue);
      expect(t.required, 0);
    });

    test('never exceeds the server\'s own constraints', () async {
      // The migration has `check (habits_required between 0 and 20)` and
      // `check (habits_done + habits_frozen <= habits_required)`. A payload
      // that violates either is rejected wholesale, so a user with 30 habits
      // would simply be unable to check in.
      for (var i = 0; i < 30; i++) {
        await addHabit('h$i');
        await log('h$i');
      }

      final t = await challenge.tallyFor(today);
      expect(t.required, lessThanOrEqualTo(20));
      expect(t.done + t.frozen, lessThanOrEqualTo(t.required));
    });
  });

  group('circles are free', () {
    test('no Pro gate stands between a user and a circle', () {
      // The leaderboard drifted into being Pro-only in contradiction to the
      // same stated principle ("challenge is independent of Pro"), and nothing
      // caught it. This is that catch.
      final screen =
          File('lib/src/features/challenge/circles_screen.dart').readAsStringSync();
      final settings =
          File('lib/src/features/settings/settings_screen.dart').readAsStringSync();

      expect(screen.contains('PaywallScreen'), isFalse,
          reason: 'circles must never route to the paywall');

      // Plan may shape private-circle CAPACITY (3/50 members, one circle
      // free — owner's decisions). The StayHardy Circle stays plan-blind:
      // its join sheet is pinned free of any Pro consultation, and nothing
      // in circles may route to the paywall.
      String slice(String from, String to) =>
          screen.substring(screen.indexOf(from), screen.indexOf(to));
      final globalJoin =
          slice('class _GlobalJoinSheetState', 'class _CreateSheetState');
      expect(globalJoin.contains('isProProvider'), isFalse,
          reason: 'joining the StayHardy Circle must never consult Pro');

      // The entry point is the promoted _CirclesCard; its whole class body
      // must not consult any plan gate.
      final entry = settings.substring(settings.indexOf('class _CirclesCard'));
      final card = entry.substring(0, entry.indexOf('class _CommunitySection'));
      expect(card.contains('RespectingPlan'), isFalse,
          reason: 'the Circles entry must not go through a plan gate');
      expect(card.contains('isProProvider'), isFalse,
          reason: 'the Circles entry must not consult Pro status');
    });
  });

  group('degrading without a backend', () {
    test('reports unavailable rather than throwing', () async {
      // The local-only build has no Supabase at all. Every entry point must
      // return a sentence, not blow up.
      expect(challenge.available, isFalse);

      final result = await challenge.createCircle(
        name: 'Morning crew',
        timezone: 'Asia/Kolkata',
      );
      expect(result.isSuccess, isFalse);
      expect(result.outcome, ChallengeOutcome.notConfigured);
      expect(result.message, isNotNull);
    });

    test('reads return empty rather than throwing', () async {
      expect(await challenge.myCircles(), isEmpty);
      expect(await challenge.standings('nope'), isEmpty);
    });

    test('the tally still works offline', () async {
      // Circles need the network; knowing where you stand today does not.
      await addHabit('a');
      await log('a');
      expect((await challenge.tallyFor(today)).done, 1);
    });
  });
}
