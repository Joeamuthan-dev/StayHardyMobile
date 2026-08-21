/// Today's productivity score.
///
/// ## What the number means
///
/// **The share of today's obligations you have met.** An obligation is a habit
/// scheduled for today or a task due today — the things the app said you were
/// going to do before the day started.
///
///     score = (habits done + tasks done) / (habits due + tasks due)
///
/// ## Why it is not weighted
///
/// A blend like "habits 60%, tasks 30%, focus 10%" looks more sophisticated and
/// is impossible to defend: nobody can say why 60 rather than 55, and a user who
/// notices their score move without doing anything loses trust in every other
/// number in the app. One obligation is one obligation. The score is the
/// fraction you kept, and it can be checked by counting.
///
/// Focus minutes are deliberately **not** in it. Focus is optional work nobody
/// promised, and letting it lift the score would mean a day of timers and no
/// habits scores well — the exact opposite of what this app is for.
///
/// ## A day with nothing due has no score
///
/// [percent] is null, never zero. A rest day is not a failure, and a dashboard
/// that greets someone with a red 0% on their day off is a dashboard they close.
///
/// ## The screen-time deduction
///
/// Heavy leisure phone use takes points off. Four rules keep that fair:
///
/// 1. **No data, no deduction.** Screen time is off for most people, and it is
///    opt-in. If the penalty applied blind, granting usage access would drop
///    everybody's score the moment they allowed it — punishing the exact users
///    who trusted the app with more. [leisureMinutes] is nullable and null
///    means *no adjustment whatsoever*, not zero leisure.
/// 2. **There is a free allowance.** [freeLeisureMinutes] a day costs nothing.
///    Rest is not a failure either, and a tracker that docks you for half an
///    hour of television is one people delete.
/// 3. **It can only subtract, and only so far.** Capped at
///    [maxScreenPenalty] points. A phone metric must never outweigh what you
///    actually did — and it can never *add*, because you cannot do more than
///    100% of what you promised by putting your phone down.
/// 4. **It is shown, never silent.** [penalty] is exposed separately so the UI
///    can say "−12 from screen time" and link to the breakdown. A number that
///    quietly drops is a number nobody trusts again.
///
/// Only *leisure* counts — social, entertainment, games, shopping. Messaging is
/// excluded (it is work and life at once), productivity and learning obviously
/// are, and system time never counts. Those buckets come from the same
/// taxonomy the user can correct by hand, which is the escape hatch for a
/// misfiled work app.
library;

import 'dart:math' as math;

class DayScore {
  const DayScore({
    required this.habitsDue,
    required this.habitsDone,
    required this.tasksDue,
    required this.tasksDone,
    this.leisureMinutes,
  });

  /// Leisure minutes on the phone today, or **null when unknown** — screen
  /// time off, permission refused, or too little collected to judge. Null
  /// means no deduction at all. See the library note.
  final int? leisureMinutes;

  /// Leisure that costs nothing. Roughly an evening's television.
  static const freeLeisureMinutes = 90;

  /// Leisure beyond the allowance that earns the full deduction.
  static const fullPenaltyAfterMinutes = 180;

  /// The most screen time can ever take off.
  ///
  /// Deliberately a fifth of the score. The obligations you set are the
  /// subject; the phone is context, and context must not be able to overturn
  /// the thing it is context for.
  static const maxScreenPenalty = 20;

  final int habitsDue;
  final int habitsDone;

  /// Tasks due today or already overdue. Overdue counts: it was owed, and the
  /// day it was owed on has passed.
  final int tasksDue;
  final int tasksDone;

  int get totalDue => habitsDue + tasksDue;
  int get totalDone => habitsDone + tasksDone;

  int get habitsLeft => (habitsDue - habitsDone).clamp(0, 1 << 30);
  int get tasksLeft => (tasksDue - tasksDone).clamp(0, 1 << 30);

  bool get hasObligations => totalDue > 0;

  /// Obligations met, before any screen-time deduction. 0..100, or null on a
  /// day with nothing scheduled.
  int? get basePercent {
    if (!hasObligations) return null;
    return ((totalDone / totalDue) * 100).round().clamp(0, 100);
  }

  /// Points taken off for leisure phone use. Always 0..[maxScreenPenalty], and
  /// always 0 when [leisureMinutes] is null.
  int get penalty {
    final leisure = leisureMinutes;
    if (leisure == null) return 0;
    final excess = leisure - freeLeisureMinutes;
    if (excess <= 0) return 0;
    final ramp = (excess / fullPenaltyAfterMinutes).clamp(0.0, 1.0);
    return (ramp * maxScreenPenalty).round();
  }

  bool get hasPenalty => penalty > 0;

  /// 0..100, or null on a day with nothing scheduled. See the library note.
  int? get percent {
    final base = basePercent;
    if (base == null) return null;
    return math.max(0, base - penalty);
  }

  /// True when every obligation was met — judged on the work, not the phone.
  ///
  /// Screen time must not be able to take "you did everything" away from
  /// someone who did everything.
  bool get isComplete => hasObligations && totalDone >= totalDue;

  /// 0..1 for the gauge. Zero when there is nothing to measure.
  double get fraction => hasObligations ? (percent! / 100) : 0;

  /// One line under the number. States the arithmetic rather than grading the
  /// person — "3 of 7 done" is checkable; "poor" is a verdict.
  String get summary {
    if (!hasObligations) return 'Nothing scheduled today';
    if (isComplete && !hasPenalty) return 'Everything done';
    if (isComplete) return 'Everything done · $basePercent before screen time';
    return '$totalDone of $totalDue done';
  }

  /// One line naming the deduction, or null when there is none.
  String? get penaltyLabel => hasPenalty
      ? '−$penalty from ${_formatMinutes(leisureMinutes!)} of leisure screen time'
      : null;

  static String _formatMinutes(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h == 0) return '${m}m';
    if (m == 0) return '${h}h';
    return '${h}h ${m}m';
  }

  static const empty =
      DayScore(habitsDue: 0, habitsDone: 0, tasksDue: 0, tasksDone: 0);
}
