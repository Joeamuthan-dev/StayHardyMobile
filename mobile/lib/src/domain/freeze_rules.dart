import 'civil_date.dart';
import 'streak_engine.dart';

/// How a streak freeze is earned, banked, and spent.
///
/// A freeze forgives one missed period so a streak survives a bad day. That
/// makes it worth money to a user, which makes it worth cheating for, so the
/// whole design is built around one property: **a freeze can only ever be
/// created by time moving forward.**
///
/// Three things enforce that, and none of them may be relaxed:
///
/// * Freezes are **materialized rows**, never inferred while reading. If the
///   streak walk decided "this gap looks forgivable" at read time, then editing
///   history — or simply changing a schedule — would silently manufacture
///   streaks nobody earned.
/// * Repair runs **only at a rollover the app actually observed**. A period that
///   ended before the last recorded run has already been walked past and is
///   closed forever. Reinstalling, restoring a backup, or moving the clock
///   backwards therefore cannot re-open it.
/// * Earning counts **real work only** — periods where the user genuinely met
///   the target. A frozen period never contributes toward the next freeze, so
///   freezes cannot bootstrap themselves.
abstract final class FreezeRules {
  /// Satisfied periods of real work per freeze earned.
  ///
  /// Ten is deliberately slow. A freeze that arrives every few days makes the
  /// streak number meaningless; one that takes a fortnight of genuine
  /// consistency is a reward for the behaviour the app is trying to produce.
  static const periodsPerEarn = 10;

  /// Ceiling on banked freezes per habit.
  ///
  /// Without a cap, a user returning after a long absence would have a dozen
  /// banked freezes auto-spend across their whole gap and be shown a streak
  /// they did not run. Two covers "I was ill" and stops well short of
  /// "I stopped using the app".
  static const maxBalance = 2;

  /// Nothing that ended more than this many days ago is ever repaired, even on
  /// a rollover that legitimately spans a longer gap.
  static const maxRepairAgeDays = 7;
}

/// What a rollover decided for one habit.
class FreezePlan {
  const FreezePlan({
    required this.earned,
    required this.balance,
    required this.earnedTotal,
    required this.repairs,
  });

  /// Freezes newly earned by this run.
  final int earned;

  /// Balance after earning and spending.
  final int balance;

  /// Lifetime earned, a monotonic ratchet. Stored so entitlement is never
  /// re-granted when history is recounted.
  final int earnedTotal;

  /// Period **start** dates ('YYYY-MM-DD') to materialize as freeze rows.
  ///
  /// Start rather than end because that is the key the streak walk looks up —
  /// for a weekly habit the freeze belongs to the week, not to a Sunday.
  final List<String> repairs;

  bool get changed => earned > 0 || repairs.isNotEmpty;
}

/// Decides earning and spending for one habit. Pure — no database, no clock.
abstract final class FreezePlanner {
  /// [periods] must be oldest-first and cover the habit's whole evaluated
  /// history, including the period containing [today].
  ///
  /// [lastRunDate] is the last rollover this device actually observed, or null
  /// if none has been recorded. **A null last-run never repairs anything**: on a
  /// first run the app has no evidence any of those days passed while it was
  /// watching, and a fresh install carrying imported history would otherwise
  /// hand out freezes for gaps that happened in another app entirely. It still
  /// earns, so a long-standing user starts with a bank rather than nothing.
  static FreezePlan plan({
    required List<PeriodOutcome> periods,
    required CivilDate today,
    required int balance,
    required int earnedTotal,
    CivilDate? lastRunDate,
  }) {
    // 1. Earn. Only sealed periods where the work was genuinely done — an open
    //    period could still be abandoned, and a frozen one was not worked.
    var worked = 0;
    for (final p in periods) {
      if (p.end.isBefore(today) && p.completed >= p.required) worked++;
    }
    final entitled = worked ~/ FreezeRules.periodsPerEarn;
    final earned = entitled > earnedTotal ? entitled - earnedTotal : 0;
    var bal = (balance + earned).clamp(0, FreezeRules.maxBalance);

    // 2. Spend.
    final repairs = <String>[];
    if (lastRunDate != null) {
      // Local view of satisfaction that a repair updates, so two consecutive
      // missed days can both be covered — the second one's "was a streak
      // running?" check sees the first as repaired.
      final satisfied = [for (final p in periods) p.satisfied];

      for (var i = 0; i < periods.length && bal > 0; i++) {
        final p = periods[i];
        if (satisfied[i]) continue;
        // Still open. Today is not a failure yet.
        if (!p.end.isBefore(today)) continue;
        // Already walked past on an earlier run. Closed forever.
        if (p.end.isBefore(lastRunDate)) continue;
        if (p.end.daysUntil(today) > FreezeRules.maxRepairAgeDays) continue;
        // Nothing to protect. Spending a freeze to extend a streak of zero
        // burns the bank on a habit the user has not started.
        if (i == 0 || !satisfied[i - 1]) continue;

        repairs.add(p.start.iso);
        satisfied[i] = true;
        bal--;
      }
    }

    return FreezePlan(
      earned: earned,
      balance: bal,
      earnedTotal: earnedTotal + earned,
      repairs: repairs,
    );
  }
}
