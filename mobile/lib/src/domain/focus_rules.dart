/// The focus timer, expressed as arithmetic over timestamps.
///
/// Nothing here counts ticks. A `Timer.periodic` that increments a counter is
/// the obvious way to build a timer and the wrong one: Android freezes a
/// backgrounded process, so the counter stops exactly when the user is doing the
/// thing being measured, and a 25-minute session with the screen off is credited
/// as a few seconds. Elapsed is therefore always derived from wall-clock
/// timestamps, and the UI's repaint tick is only a repaint — never the source of
/// truth.
library;

/// Durations offered on the timer. Deliberately short: a list that starts at two
/// hours invites a session nobody finishes, and an abandoned session teaches the
/// user the feature does not work for them.
const focusPresetMinutes = <int>[15, 25, 45, 60];

/// The default. 25 is the pomodoro convention and the one people recognise.
const focusDefaultMinutes = 25;

/// A session older than this is not a session — it is a row left behind by a
/// process that died. Never credited, always discarded.
const focusStaleAfter = Duration(hours: 24);

/// Focus blocks a free user may finish per day.
///
/// Not zero, which is what it was: a Pro-only timer is a feature nobody can
/// evaluate, and "Focus sessions" on a paywall means nothing to someone who has
/// never used one. Two is enough to feel what a focused block does to an
/// afternoon and short of enough for a working day.
///
/// The quota counts **finished** sessions, and a session shorter than
/// [focusMinimumBankedSeconds] is deleted outright rather than recorded — so a
/// fumbled start costs nothing. Charging someone a daily allowance for a
/// double-tap would be the worst possible first impression of the limit.
const freeFocusSessionsPerDay = 2;

/// Below this, a closed session is thrown away rather than recorded.
///
/// Exists because starting a session is one tap and a double-tap is one tap too
/// many. Without it, every fumbled start leaves a three-second row in the
/// history, and the "sessions today" count measures taps rather than work.
const focusMinimumBankedSeconds = 60;

/// A free user's remaining allowance for today.
class FocusQuota {
  const FocusQuota({
    required this.isPro,
    required this.usedToday,
  });

  final bool isPro;
  final int usedToday;

  bool get isLimited => !isPro;

  int get remaining => isPro
      ? 1 << 30
      : (freeFocusSessionsPerDay - usedToday).clamp(0, freeFocusSessionsPerDay);

  bool get canStart => isPro || remaining > 0;

  /// 'Pro' users get no copy about limits at all — see the UI call sites.
  String get label => isPro
      ? 'Unlimited'
      : '$remaining of $freeFocusSessionsPerDay left today';

  static const unknown = FocusQuota(isPro: false, usedToday: 0);
}

/// Where you are in a pomodoro cycle.
///
/// The classic pattern is four focus blocks separated by short breaks, then a
/// long one. StayHardy tracks the position but **never enforces it**: there is
/// no forced break screen and no lockout, because a timer that refuses to let
/// you work is a timer people stop opening. It is a suggestion with a number
/// attached.
enum FocusPhase {
  focus('Focus'),
  shortBreak('Short break'),
  longBreak('Long break');

  const FocusPhase(this.label);
  final String label;
}

abstract final class Pomodoro {
  /// Blocks before the long break.
  static const cycleLength = 4;

  static const shortBreakMinutes = 5;
  static const longBreakMinutes = 20;

  /// Which block of the current cycle is next, 1-based.
  ///
  /// Derived from *sessions completed today* rather than stored, so it needs no
  /// state of its own and resets naturally at midnight. Someone who does three
  /// blocks in the morning and returns at 8pm picks up at four, which is the
  /// reading that matches how the day actually went.
  static int positionInCycle(int completedToday) =>
      (completedToday % cycleLength) + 1;

  /// What should follow a block that just finished.
  static FocusPhase phaseAfter(int completedToday) =>
      completedToday > 0 && completedToday % cycleLength == 0
          ? FocusPhase.longBreak
          : FocusPhase.shortBreak;

  static int breakMinutesAfter(int completedToday) =>
      phaseAfter(completedToday) == FocusPhase.longBreak
          ? longBreakMinutes
          : shortBreakMinutes;
}

/// An in-flight focus session, reconstructed from the row alone.
class FocusRun {
  const FocusRun({
    required this.id,
    required this.startedAt,
    required this.plannedSeconds,
    required this.accruedSeconds,
    required this.resumedAt,
    required this.interruptions,
    this.goalId,
    this.habitId,
    this.taskId,
    this.goalName,
    this.habitName,
    this.label,
  });

  final String id;

  /// Epoch millis.
  final int startedAt;

  final int plannedSeconds;

  /// Focus seconds banked by spans that have already closed.
  final int accruedSeconds;

  /// Epoch millis the current running span began, or null while paused.
  final int? resumedAt;

  final int interruptions;

  final String? goalId;
  final String? habitId;
  final String? taskId;

  /// Resolved for display, so the timer screen does not have to join.
  final String? goalName;

  /// Resolved for display when the block is for a habit.
  final String? habitName;

  /// The free-text "what for", when the block is for neither.
  final String? label;

  /// Whatever this block is for, in one word-or-few for the header.
  String? get focusLabel => label ?? goalName ?? habitName;

  bool get isPaused => resumedAt == null;

  /// Focus seconds accrued as of [nowMs].
  int elapsedAt(int nowMs) {
    final open = resumedAt;
    if (open == null) return accruedSeconds;
    // A clock that moved backwards yields a negative span; clamp rather than
    // let the ring run backwards or the remaining time grow.
    final live = ((nowMs - open) / 1000).floor();
    return accruedSeconds + (live < 0 ? 0 : live);
  }

  int remainingAt(int nowMs) {
    final left = plannedSeconds - elapsedAt(nowMs);
    return left < 0 ? 0 : left;
  }

  bool isFinishedAt(int nowMs) => elapsedAt(nowMs) >= plannedSeconds;

  /// 0..1, for the ring.
  double fractionAt(int nowMs) {
    if (plannedSeconds <= 0) return 1;
    final f = elapsedAt(nowMs) / plannedSeconds;
    return f < 0 ? 0 : (f > 1 ? 1 : f);
  }

  /// Wall-clock instant this run is due to finish, or null while paused.
  ///
  /// This is what a completion notification is scheduled against — the alarm has
  /// to be pinned to an absolute time, because the process will not be alive to
  /// notice the timer running out.
  DateTime? get dueAt => resumedAt == null
      ? null
      : DateTime.fromMillisecondsSinceEpoch(
          resumedAt! + (plannedSeconds - accruedSeconds) * 1000,
        );
}

/// What to do with a session found unfinished at launch.
enum FocusRecovery {
  /// Still inside its planned window. Hand it back and keep counting.
  resume,

  /// The planned window elapsed while the app was not running. Credit it in
  /// full and mark it complete.
  ///
  /// This is the honest reading of the contract: the user asked for N minutes of
  /// focus, N minutes passed, and the app being killed by the OS in the middle
  /// is the app's problem rather than theirs. The alternative — discarding —
  /// silently deletes the sessions of exactly the users whose phones are most
  /// aggressive about killing background apps.
  complete,

  /// Far too old to mean anything. Discarded, never credited.
  discard,
}

abstract final class FocusRecovering {
  /// Decides the fate of an unfinished session.
  ///
  /// [wallElapsedMs] is measured from `startedAt`, not from `resumedAt` — a
  /// process that died cannot have resumed, so the only trustworthy anchor is
  /// when the session began.
  static FocusRecovery decide({
    required int wallElapsedMs,
    required int plannedSeconds,
    required bool wasPaused,
  }) {
    if (wallElapsedMs >= focusStaleAfter.inMilliseconds) {
      return FocusRecovery.discard;
    }
    // A paused session is not running down. Whatever time has passed since,
    // the user stopped it deliberately — resume it and let them decide.
    if (wasPaused) return FocusRecovery.resume;
    if (wallElapsedMs >= plannedSeconds * 1000) return FocusRecovery.complete;
    return FocusRecovery.resume;
  }
}

/// 'MM:SS', or 'H:MM:SS' past an hour.
String formatFocusClock(int seconds) {
  final s = seconds < 0 ? 0 : seconds;
  final h = s ~/ 3600;
  final m = (s % 3600) ~/ 60;
  final sec = s % 60;
  final mm = m.toString().padLeft(2, '0');
  final ss = sec.toString().padLeft(2, '0');
  return h > 0 ? '$h:$mm:$ss' : '$mm:$ss';
}

/// '1h 25m' / '45m' / '—'. For totals, where seconds are noise.
String formatFocusTotal(int minutes) {
  if (minutes <= 0) return '0m';
  final h = minutes ~/ 60;
  final m = minutes % 60;
  if (h == 0) return '${m}m';
  if (m == 0) return '${h}h';
  return '${h}h ${m}m';
}
