import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/focus_repository.dart';
import 'package:stayhardy/src/domain/civil_date.dart';
import 'package:stayhardy/src/domain/focus_rules.dart';

/// The focus timer's one real hazard is that it looks correct while the app is
/// in the foreground and lies the moment it is not. Every test here pins a fake
/// clock and moves it, rather than waiting.
void main() {
  _quotaTests();
  // A fixed wall clock. Nothing here sleeps.
  const t0 = 1786000000000;
  const minute = 60 * 1000;

  group('elapsed is wall-clock, not ticks', () {
    FocusRun running({int accrued = 0, int? resumedAt = t0}) => FocusRun(
          id: 'f',
          startedAt: t0,
          plannedSeconds: 25 * 60,
          accruedSeconds: accrued,
          resumedAt: resumedAt,
          interruptions: 0,
        );

    test('time passes with no ticks at all', () {
      // The process was frozen for the whole 25 minutes; a tick counter would
      // read zero here.
      final run = running();
      expect(run.elapsedAt(t0 + 25 * minute), 25 * 60);
      expect(run.remainingAt(t0 + 25 * minute), 0);
      expect(run.isFinishedAt(t0 + 25 * minute), isTrue);
    });

    test('a paused run does not advance', () {
      final run = running(accrued: 300, resumedAt: null);
      expect(run.isPaused, isTrue);
      expect(run.elapsedAt(t0 + 60 * minute), 300);
      expect(run.remainingAt(t0 + 60 * minute), 25 * 60 - 300);
    });

    test('accrued time and the open span add up', () {
      final run = running(accrued: 600, resumedAt: t0 + 10 * minute);
      expect(run.elapsedAt(t0 + 15 * minute), 600 + 300);
    });

    test('remaining never goes negative and the ring never overfills', () {
      final run = running();
      expect(run.remainingAt(t0 + 90 * minute), 0);
      expect(run.fractionAt(t0 + 90 * minute), 1);
    });

    test('a clock that jumps backwards does not rewind the timer', () {
      final run = running(accrued: 120, resumedAt: t0);
      expect(run.elapsedAt(t0 - 60 * minute), 120);
    });

    test('dueAt is an absolute instant the alarm can be pinned to', () {
      final run = running(accrued: 300, resumedAt: t0);
      // 25 planned, 5 already banked, so 20 more from the resume point.
      expect(
        run.dueAt!.millisecondsSinceEpoch,
        t0 + 20 * minute,
      );
    });

    test('a paused run has nothing to schedule', () {
      expect(running(resumedAt: null).dueAt, isNull);
    });
  });

  group('recovery of a session the OS killed', () {
    test('still inside its window — hand it back', () {
      expect(
        FocusRecovering.decide(
          wallElapsedMs: 10 * minute,
          plannedSeconds: 25 * 60,
          wasPaused: false,
        ),
        FocusRecovery.resume,
      );
    });

    test('the window elapsed while the app was dead — credit it', () {
      expect(
        FocusRecovering.decide(
          wallElapsedMs: 26 * minute,
          plannedSeconds: 25 * 60,
          wasPaused: false,
        ),
        FocusRecovery.complete,
      );
    });

    test('a paused session is never auto-completed', () {
      // Paused means the user stopped it on purpose. Time passing while it is
      // paused is not focus, however much of it there was.
      expect(
        FocusRecovering.decide(
          wallElapsedMs: 300 * minute,
          plannedSeconds: 25 * 60,
          wasPaused: true,
        ),
        FocusRecovery.resume,
      );
    });

    test('a day-old row is discarded, not credited', () {
      expect(
        FocusRecovering.decide(
          wallElapsedMs: focusStaleAfter.inMilliseconds,
          plannedSeconds: 25 * 60,
          wasPaused: false,
        ),
        FocusRecovery.discard,
      );
    });
  });

  group('clock formatting', () {
    test('pads to mm:ss', () {
      expect(formatFocusClock(0), '00:00');
      expect(formatFocusClock(9), '00:09');
      expect(formatFocusClock(65), '01:05');
      expect(formatFocusClock(25 * 60), '25:00');
    });

    test('grows an hour field rather than showing 90:00', () {
      expect(formatFocusClock(3600), '1:00:00');
      expect(formatFocusClock(5445), '1:30:45');
    });

    test('negative input is floored, never rendered as -1', () {
      expect(formatFocusClock(-5), '00:00');
    });

    test('totals read as durations', () {
      expect(formatFocusTotal(0), '0m');
      expect(formatFocusTotal(45), '45m');
      expect(formatFocusTotal(60), '1h');
      expect(formatFocusTotal(85), '1h 25m');
    });
  });

  group('repository', () {
    late AppDatabase db;
    late FocusRepository focus;

    setUp(() {
      db = AppDatabase.forTesting(NativeDatabase.memory());
      focus = FocusRepository(db);
    });

    tearDown(() async => db.close());

    Future<String> addGoal(String id, String name) async {
      await db.into(db.goals).insert(GoalsCompanion.insert(
          id: id, name: name, createdAt: 1, updatedAt: 1));
      return id;
    }

    test('starting records the goal and resolves its name', () async {
      await addGoal('g1', 'Ship StayHardy 2.0');
      final run = await focus.start(
        plannedSeconds: 25 * 60,
        goalId: 'g1',
        nowMs: t0,
      );

      expect(run.goalId, 'g1');
      expect(run.goalName, 'Ship StayHardy 2.0');
      expect(run.isPaused, isFalse);
      expect(run.elapsedAt(t0), 0);
    });

    test('pause banks the open span and counts an interruption', () async {
      final run = await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      await focus.pause(run.id, nowMs: t0 + 5 * minute);

      final paused = (await focus.activeRun())!;
      expect(paused.isPaused, isTrue);
      expect(paused.accruedSeconds, 5 * 60);
      expect(paused.interruptions, 1);
      // And it stays banked at 5 minutes however long the pause lasts.
      expect(paused.elapsedAt(t0 + 60 * minute), 5 * 60);
    });

    test('resume starts a new span from the resume point', () async {
      final run = await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      await focus.pause(run.id, nowMs: t0 + 5 * minute);
      await focus.resume(run.id, nowMs: t0 + 30 * minute);

      final resumed = (await focus.activeRun())!;
      // 5 banked + 2 since resuming. The 25-minute pause is not credited.
      expect(resumed.elapsedAt(t0 + 32 * minute), 7 * 60);
    });

    test('pausing twice does not double-bank', () async {
      final run = await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      await focus.pause(run.id, nowMs: t0 + 5 * minute);
      await focus.pause(run.id, nowMs: t0 + 9 * minute);

      final paused = (await focus.activeRun())!;
      expect(paused.accruedSeconds, 5 * 60);
      expect(paused.interruptions, 1);
    });

    test('finishing early banks the real time but is not "completed"',
        () async {
      final run = await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      await focus.finish(run.id, nowMs: t0 + 20 * minute);

      final row = await db.select(db.focusSessions).getSingle();
      expect(row.actualSeconds, 20 * 60);
      expect(row.completed, isFalse);
      expect(row.endedAt, t0 + 20 * minute);
      expect(await focus.activeRun(), isNull);
    });

    test('running the full length is marked completed', () async {
      final run = await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      await focus.finish(run.id, nowMs: t0 + 25 * minute);

      final row = await db.select(db.focusSessions).getSingle();
      expect(row.completed, isTrue);
    });

    test('discarding leaves no trace', () async {
      final run = await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      await focus.abandon(run.id);

      expect(await db.select(db.focusSessions).get(), isEmpty);
      expect(await focus.activeRun(), isNull);
    });

    test('a killed session past its window is credited on recovery', () async {
      await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      // The app died; next launch is an hour later.
      final settled = await focus.recoverOrphans(nowMs: t0 + 60 * minute);

      expect(settled, 1);
      final row = await db.select(db.focusSessions).getSingle();
      expect(row.completed, isTrue);
      expect(row.actualSeconds, 25 * 60);
      // Credited to when it actually ended, not to when the app came back.
      expect(row.endedAt, t0 + 25 * minute);
      expect(await focus.activeRun(), isNull);
    });

    test('a killed session still inside its window keeps running', () async {
      await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      final settled = await focus.recoverOrphans(nowMs: t0 + 10 * minute);

      expect(settled, 0);
      final run = await focus.activeRun();
      expect(run, isNotNull);
      expect(run!.elapsedAt(t0 + 10 * minute), 10 * 60);
    });

    test('a stale session is discarded rather than credited', () async {
      await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      await focus.recoverOrphans(nowMs: t0 + focusStaleAfter.inMilliseconds);

      expect(await db.select(db.focusSessions).get(), isEmpty);
    });

    test('starting a new session settles whatever was left open', () async {
      await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      await focus.start(plannedSeconds: 15 * 60, nowMs: t0 + 60 * minute);

      final rows = await db.select(db.focusSessions).get();
      expect(rows.length, 2);
      // Exactly one is in flight — the old one can never linger and shadow it.
      expect(rows.where((r) => r.endedAt == null).length, 1);
      expect((await focus.activeRun())!.plannedSeconds, 15 * 60);
    });

    test('starting while one is genuinely running closes it, not leaks it',
        () async {
      // The case recovery does not cover: the first session is minutes old and
      // perfectly healthy, so nothing would mark it stale. Left open, it gets
      // auto-completed at the next launch and credited as 25 minutes of focus
      // the user never did.
      await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      await focus.start(plannedSeconds: 15 * 60, nowMs: t0 + 5 * minute);

      final open =
          (await db.select(db.focusSessions).get()).where((r) => r.endedAt == null);
      expect(open.length, 1);
      expect(open.single.plannedSeconds, 15 * 60);

      // The 5 minutes actually worked are banked, not thrown away.
      final closed = (await db.select(db.focusSessions).get())
          .firstWhere((r) => r.endedAt != null);
      expect(closed.actualSeconds, 5 * 60);
      expect(closed.completed, isFalse);
    });

    test('a double-tapped start leaves one session, not two', () async {
      await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      // Same frame, near enough. Banking a three-second session would make
      // "sessions today" a count of taps.
      await focus.start(plannedSeconds: 25 * 60, nowMs: t0 + 300);

      final rows = await db.select(db.focusSessions).get();
      expect(rows.length, 1);
      expect(rows.single.endedAt, isNull);
    });

    test('summary counts only ended sessions', () async {
      final done = await focus.start(plannedSeconds: 25 * 60, nowMs: t0);
      await focus.finish(done.id, nowMs: t0 + 25 * minute);
      // A second session still running must not inflate today's total.
      await focus.start(plannedSeconds: 45 * 60, nowMs: t0 + 30 * minute);

      final s = await focus.summary(
        on: CivilDate.today(DateTime.fromMillisecondsSinceEpoch(t0)),
      );
      expect(s.todayMinutes, 25);
      expect(s.todaySessions, 1);
      expect(s.bestDayMinutes, 25);
    });

    test('focus time is attributed to the goal it was spent on', () async {
      await addGoal('g1', 'Ship StayHardy 2.0');
      await addGoal('g2', 'Run a half marathon');

      final a = await focus.start(
          plannedSeconds: 25 * 60, goalId: 'g1', nowMs: t0);
      await focus.finish(a.id, nowMs: t0 + 25 * minute);
      final b = await focus.start(
          plannedSeconds: 45 * 60, goalId: 'g2', nowMs: t0 + 30 * minute);
      await focus.finish(b.id, nowMs: t0 + 75 * minute);

      final byGoal = await focus.byGoal();
      expect(byGoal.first.name, 'Run a half marathon');
      expect(byGoal.first.minutes, 45);
      expect(byGoal.last.minutes, 25);
    });
  });
}


/// The free allowance.
///
/// Focus was Pro-only, which meant nobody could evaluate it and "Focus
/// sessions" on a paywall meant nothing. It is now free with a daily cap.
void _quotaTests() {
  group('the free focus allowance', () {
    test('a fresh free day has the full allowance', () {
      const q = FocusQuota(isPro: false, usedToday: 0);
      expect(q.canStart, isTrue);
      expect(q.remaining, freeFocusSessionsPerDay);
    });

    test('spends down as blocks finish', () {
      expect(const FocusQuota(isPro: false, usedToday: 1).remaining, 1);
      expect(const FocusQuota(isPro: false, usedToday: 1).canStart, isTrue);
    });

    test('blocks a third start', () {
      const q = FocusQuota(isPro: false, usedToday: 2);
      expect(q.canStart, isFalse);
      expect(q.remaining, 0);
    });

    test('never reports a negative allowance', () {
      // Reachable: a lapsed subscription after a heavy Pro day.
      expect(const FocusQuota(isPro: false, usedToday: 9).remaining, 0);
    });

    test('Pro is never limited', () {
      const q = FocusQuota(isPro: true, usedToday: 99);
      expect(q.canStart, isTrue);
      expect(q.isLimited, isFalse);
      expect(q.label, 'Unlimited');
    });
  });
}
