/// Accountability circles and the challenge engine — the client's half.
///
/// ## Read this before trusting anything here
///
/// Habit content **never leaves the device**. There is no habit sync; the only
/// Flutter→Supabase write in the whole app is a feedback insert. So the server
/// cannot verify that a check-in reflects work actually done. It receives counts
/// that *this file produced*, and can only check that they are internally
/// consistent, arrive inside the right window, and are not a replay.
///
/// **This code runs on the client and the server trusts its output.** Saying so
/// plainly matters: an earlier draft of this design described the filtering
/// below as a server-side check, which would have invited reviewers to grant it
/// trust it has not earned. It is a client-side tally, and the security model
/// does not rest on it.
///
/// What makes that acceptable is the payout: **you get your own stake back.**
/// Complete the cohort and you are refunded; fail and it is forfeited to the
/// destination named on the cohort. There is no pot split, so a successful
/// cheat gains the cheater nothing but their own money returned. This is a
/// commitment device with a soft trust model, and it is designed to be safe as
/// one — not to be a fraud-proof escrow it could never be.
///
/// ## What is deliberately NOT here
///
/// **No day-boundary or cutoff arithmetic.** The cohort's day window belongs to
/// the server, which owns the pinned timezone; the client renders a countdown
/// from `{cohort_day, closes_at_utc, server_now_utc}` it was handed. Computing
/// the boundary locally is exactly the bug the header of `civil_date.dart` was
/// written to prevent — *"the paid challenge settles money on day boundaries,
/// so it cannot stay invisible"* — and it would put two implementations of the
/// same rule on opposite sides of the wire, free to drift.
library;

import '../data/enums.dart';

abstract final class ChallengeRules {
  /// A cohort runs 30 days. Long enough to be a real commitment, short enough
  /// that someone can see the end from the start.
  static const cohortDays = 30;

  /// How many friends fit in a private circle, by plan. The server holds only
  /// the hard ceiling (it cannot see RevenueCat); these bounds shape the
  /// picker, which is enforcement enough for a friends feature.
  static const freeCircleMembers = 3;
  static const proCircleMembers = 50;

  /// Offered durations when creating a private circle.
  static const circleDayOptions = [7, 14, 21, 30];

  /// Days you may miss and still complete. 27 of 30.
  ///
  /// Not zero. A perfect-attendance bar sounds rigorous and is actually
  /// predatory: one stomach bug forfeits the stake, almost everyone fails, and
  /// the product reads as designed to collect. Three misses is a bar a
  /// committed person clears and a disengaged one does not.
  static const allowedMisses = 3;

  static const requiredDays = cohortDays - allowedMisses;

  /// Mirrors the `habits_required between 0 and 20` check in the migration.
  /// A cohort day cannot meaningfully track more than this, and the two limits
  /// must agree or the server will reject a payload the client thought valid.
  static const maxHabitsPerDay = 20;

  /// Sources whose logs count toward a cohort day.
  ///
  /// `migration` and `restore` are excluded: imported history and a restored
  /// backup are not work done *inside* the cohort. This is also the cheapest
  /// attack there is — backups are unsigned plaintext-header gzip in the user's
  /// own Drive, and `BackupService` merges `habit_logs` as a union where an
  /// incoming row never loses, so fabricated rows are additive and permanent.
  /// Filtering on source raises the cost of that attack from "edit a JSON file"
  /// to "edit a JSON file and know which integer to write" — which is to say,
  /// barely at all. It is a speed bump, and the payout model is the actual
  /// defence.
  static const countableSources = <LogSource>{
    LogSource.manual,
    LogSource.widget,
    LogSource.notification,
  };
}

/// One habit's standing on one cohort day.
class ChallengeHabitDay {
  const ChallengeHabitDay({
    required this.habitId,
    required this.due,
    required this.completed,
    required this.frozen,
    this.backfilled = false,
    this.source = LogSource.manual,
  });

  final String habitId;

  /// Scheduled that day. A habit that was not due is not a miss.
  final bool due;

  /// A log row exists for the day.
  final bool completed;

  /// A streak freeze covers the day.
  final bool frozen;

  /// The log was entered after its day closed.
  final bool backfilled;

  final LogSource source;

  /// Whether this counts as genuinely done.
  ///
  /// Freezes are excluded here and reported separately — `PeriodOutcome`'s
  /// `satisfied` is `frozen || completed >= required`, and `FreezeSource.manual`
  /// lets a user hand-grant themselves one from Settings. A conflated integer
  /// would let that buy a day.
  bool get countsAsDone =>
      due &&
      completed &&
      !backfilled &&
      ChallengeRules.countableSources.contains(source);

  /// Covered by a freeze rather than done. Reported, never silently merged.
  bool get countsAsFrozen => due && !countsAsDone && frozen;
}

/// One day, reduced to the three integers the server stores.
class ChallengeTally {
  const ChallengeTally({
    required this.required,
    required this.done,
    required this.frozen,
  });

  final int required;
  final int done;
  final int frozen;

  /// Nothing was scheduled. Neither a win nor a loss — same rule the streak
  /// engine applies to rest days, and it must not count against a cohort.
  bool get isRestDay => required == 0;

  /// Whether the day is clean on its own terms, ignoring freezes.
  bool get isComplete => required > 0 && done >= required;

  /// Whether it is clean once freezes are allowed. The cohort ruleset decides
  /// which of these two it settles on; the tally never pre-decides it.
  bool get isCompleteWithFreezes => required > 0 && done + frozen >= required;

  static const empty = ChallengeTally(required: 0, done: 0, frozen: 0);
}

/// How a member finished.
class CohortVerdict {
  const CohortVerdict({
    required this.daysCompleted,
    required this.daysRequired,
    required this.restDays,
  });

  final int daysCompleted;
  final int daysRequired;
  final int restDays;

  bool get completed => daysCompleted >= daysRequired;

  /// Days still needed. Zero once the bar is cleared.
  int get remaining =>
      daysCompleted >= daysRequired ? 0 : daysRequired - daysCompleted;
}

abstract final class ChallengeTallying {
  /// Reduce a day's habits to `(required, done, frozen)`.
  ///
  /// Capped at [ChallengeRules.maxHabitsPerDay] so the payload can never
  /// violate the server's own CHECK constraint and get rejected wholesale —
  /// a user with 30 habits should have a valid day, not an error.
  static ChallengeTally tally(Iterable<ChallengeHabitDay> habits) {
    var required = 0;
    var done = 0;
    var frozen = 0;

    for (final h in habits) {
      if (!h.due) continue;
      if (required >= ChallengeRules.maxHabitsPerDay) break;
      required++;
      if (h.countsAsDone) {
        done++;
      } else if (h.countsAsFrozen) {
        frozen++;
      }
    }

    return ChallengeTally(required: required, done: done, frozen: frozen);
  }

  /// Settle a member across the whole cohort.
  ///
  /// [countFrozenDays] is the cohort's ruleset, not a client preference — it
  /// arrives from the server with the cohort. Rest days are excluded from the
  /// requirement rather than counted as wins: a member whose habits are all
  /// weekday-only should not clear a 30-day bar by resting through it.
  static CohortVerdict settle(
    List<ChallengeTally> days, {
    bool countFrozenDays = false,
    int requiredDays = ChallengeRules.requiredDays,
  }) {
    var completed = 0;
    var rest = 0;

    for (final d in days) {
      if (d.isRestDay) {
        rest++;
        continue;
      }
      if (countFrozenDays ? d.isCompleteWithFreezes : d.isComplete) completed++;
    }

    // A cohort that was mostly rest days cannot demand 27 active ones.
    final scheduledDays = days.length - rest;
    final bar = requiredDays > scheduledDays ? scheduledDays : requiredDays;

    return CohortVerdict(
      daysCompleted: completed,
      daysRequired: bar,
      restDays: rest,
    );
  }
}

/// A member's standing tier on the circle board — the gamified label.
///
/// Judged on **pace**, points against days elapsed, so day 3 of a month is as
/// competitive as day 28: someone at 2.8 points on day 3 is "unstoppable" even
/// though 2.8 would be a weak month total. Thresholds are deliberately
/// generous at the bottom — "warming up" must read as an invitation, not a
/// verdict.
enum CircleTier {
  unstoppable('UNSTOPPABLE', 0.9),
  consistent('CONSISTENT', 0.7),
  building('BUILDING', 0.4),
  warmingUp('WARMING UP', 0.0);

  const CircleTier(this.label, this.minPace);

  final String label;

  /// Minimum points-per-elapsed-day to hold this tier.
  final double minPace;

  static CircleTier of(double points, int daysElapsed) {
    final days = daysElapsed < 1 ? 1 : daysElapsed;
    final pace = points / days;
    for (final tier in CircleTier.values) {
      if (pace >= tier.minPace) return tier;
    }
    return CircleTier.warmingUp;
  }
}

/// Fractional daily points — the board's scoring, mirrored from the server.
///
/// A day is worth `done / required`, capped at 1: finish everything scheduled
/// and the day is a full point, finish 80% and it is 0.8. Rest days
/// (required = 0) are worth nothing either way — someone with no habits
/// scheduled must not out-score someone who did the work.
///
/// **Advisory on the client.** The server's RPC computes the board everyone
/// sees; this exists so private circles (scored client-side from the shared
/// daily rows) and any local preview use the same arithmetic, and the two can
/// never disagree by more than floating point.
abstract final class CircleScoring {
  /// The fairness floor and ceiling, owner's ruling: a full point needs at
  /// least [fullDayFloor] habits done, and nothing past [countCap] counts.
  /// Two easy habits max out at 0.67/day; twenty padded ones still cap at 1;
  /// 2-of-10 scores against 7, not 10, so ambition isn't self-punishing.
  /// The cap deliberately equals the free habit cap.
  static const fullDayFloor = 3;
  static const countCap = 7;

  static double dayPoints({required int done, required int required}) {
    if (required <= 0) return 0;
    final cappedDone = done > countCap ? countCap : done;
    final base = required > countCap ? countCap : required;
    final denominator = base < fullDayFloor ? fullDayFloor : base;
    final fraction = cappedDone / denominator;
    return fraction > 1 ? 1 : fraction;
  }

  /// Board display: whole numbers stay whole ("12"), fractions show one
  /// decimal ("12.4") — two decimals of a habit score is false precision.
  static String formatPoints(double points) {
    final rounded = (points * 10).round() / 10;
    return rounded == rounded.roundToDouble()
        ? '${rounded.round()}'
        : rounded.toStringAsFixed(1);
  }
}
