/// Which backups to keep, and which to let go.
///
/// Grandfather-father-son, because the failure a backup exists to survive is
/// rarely "my phone died last night" — it is "something has been quietly wrong
/// for three weeks and I only just noticed". Keeping thirty daily copies gives
/// you thirty copies of the same corruption; keeping a thinning tail gives you
/// a month ago.
///
/// Two rules override everything, and both exist because the worst possible
/// outcome here is deleting the last good copy:
///
/// * **The newest backup is never deleted**, whatever the buckets say.
/// * **A single backup is never deleted.** If pruning would empty the set, it
///   prunes nothing.
library;

/// A backup as retention sees it. Deliberately not a Drive file — the policy is
/// the same for Drive and for anything else, and it is only testable if it does
/// not know where the bytes live.
class BackupRecord {
  const BackupRecord({
    required this.id,
    required this.createdAt,
    this.sizeBytes = 0,
  });

  final String id;

  /// Epoch millis.
  final int createdAt;

  final int sizeBytes;
}

/// What a prune would do. Returned rather than performed, so the caller can
/// show it before anything is destroyed.
class RetentionPlan {
  const RetentionPlan({required this.keep, required this.delete});

  final List<BackupRecord> keep;
  final List<BackupRecord> delete;

  bool get isNoOp => delete.isEmpty;
}

abstract final class BackupRetention {
  /// Every backup from the last week is kept, however many there are.
  static const dailyDays = 7;

  /// Then one per week for a month.
  static const weeklyWeeks = 4;

  /// Then one per month for half a year.
  static const monthlyMonths = 6;

  /// Hard ceiling regardless of the buckets, so a pathological clock or a
  /// runaway scheduler cannot fill the user's Drive quota.
  static const maxKept = 24;

  /// Decide what survives.
  ///
  /// [now] is passed in rather than read, so the policy is deterministic and
  /// the tests do not depend on the day they are run.
  static RetentionPlan plan(List<BackupRecord> backups, {required int now}) {
    if (backups.length <= 1) {
      return RetentionPlan(keep: List.of(backups), delete: const []);
    }

    final sorted = [...backups]
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    final keep = <String>{};
    // The newest is kept before any bucketing runs. A clock that jumped, or a
    // backup dated in the future, must never be able to knock it out.
    keep.add(sorted.first.id);

    const day = 24 * 60 * 60 * 1000;
    final seenWeek = <int>{};
    final seenMonth = <int>{};

    for (final b in sorted) {
      final ageDays = (now - b.createdAt) ~/ day;

      if (ageDays < dailyDays) {
        keep.add(b.id);
        continue;
      }
      if (ageDays < dailyDays + weeklyWeeks * 7) {
        // One per week bucket. Sorted newest-first, so the first backup seen in
        // a bucket is the newest in it — which is the one worth keeping.
        if (seenWeek.add(ageDays ~/ 7)) keep.add(b.id);
        continue;
      }
      if (ageDays < dailyDays + weeklyWeeks * 7 + monthlyMonths * 30) {
        if (seenMonth.add(ageDays ~/ 30)) keep.add(b.id);
        continue;
      }
      // Older than the whole ladder. Dropped.
    }

    // Apply the ceiling, newest first.
    final ordered = [for (final b in sorted) if (keep.contains(b.id)) b];
    final capped = ordered.take(maxKept).toSet();

    final kept = <BackupRecord>[];
    final dropped = <BackupRecord>[];
    for (final b in sorted) {
      (capped.contains(b) ? kept : dropped).add(b);
    }

    // Belt and braces: pruning must never empty the set.
    if (kept.isEmpty) {
      return RetentionPlan(keep: [sorted.first], delete: sorted.skip(1).toList());
    }
    return RetentionPlan(keep: kept, delete: dropped);
  }

  /// Whether a new backup is due.
  ///
  /// At most one automatic backup a day. More often costs bandwidth and quota
  /// to capture a database that changes by a handful of rows, and it pushes the
  /// useful older copies out of the daily bucket faster.
  static bool isDue({required int? lastBackupAt, required int now}) {
    if (lastBackupAt == null) return true;
    // A last-backup timestamp in the future means the clock moved; treat it as
    // due rather than blocking backups until the date catches up.
    if (lastBackupAt > now) return true;
    return now - lastBackupAt >= 24 * 60 * 60 * 1000;
  }
}
