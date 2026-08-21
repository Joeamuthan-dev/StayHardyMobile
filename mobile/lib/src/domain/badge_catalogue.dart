/// Badges and XP.
///
/// **The nine `streak_*` keys and their names are copied verbatim from the
/// Capacitor build and must never change.** They are the primary key of
/// `user_badges` rows being migrated from Supabase, so a renamed key silently
/// re-awards a badge the user already had — and a renamed *badge* takes away
/// something they earned two years ago and can name. Descriptions are kept as
/// written for the same reason: they are the product's voice, not this file's.
///
/// New badges are free to be added, and use prefixes that cannot collide with
/// the legacy ladder.
library;

/// What a badge is measured against.
enum BadgeMetric {
  /// Best overall streak ever reached.
  bestStreak,

  /// Lifetime habit check-ins.
  totalCheckIns,

  /// Lifetime focused minutes.
  focusMinutes,

  /// Weeks in which every scheduled habit-day was completed.
  perfectWeeks,
}

class BadgeDef {
  const BadgeDef({
    required this.key,
    required this.name,
    required this.description,
    required this.metric,
    required this.threshold,
  });

  /// Stable identifier. Migrated rows are matched on this.
  final String key;

  final String name;
  final String description;

  final BadgeMetric metric;

  /// The value of [metric] at which this badge is earned.
  final int threshold;
}

abstract final class BadgeCatalogue {
  /// The legacy ladder. Keys, names and copy are verbatim from
  /// `frontend/src/hooks/useBadges.ts`.
  static const streakLadder = <BadgeDef>[
    BadgeDef(
      key: 'streak_7',
      name: '7-Day Streak',
      description: '7 days straight. Consistency is a superpower.',
      metric: BadgeMetric.bestStreak,
      threshold: 7,
    ),
    BadgeDef(
      key: 'streak_15',
      name: '15-Day Grind',
      description: 'Two weeks of discipline. Keep pushing.',
      metric: BadgeMetric.bestStreak,
      threshold: 15,
    ),
    BadgeDef(
      key: 'streak_30',
      name: '30-Day Champion',
      description: "A full month. You're built different.",
      metric: BadgeMetric.bestStreak,
      threshold: 30,
    ),
    BadgeDef(
      key: 'streak_50',
      name: '50-Day Legend',
      description: '50 days. Your habits are forged in steel.',
      metric: BadgeMetric.bestStreak,
      threshold: 50,
    ),
    BadgeDef(
      key: 'streak_100',
      name: '100-Day Warrior',
      description: '100 days. Elite tier. Bow to no one.',
      metric: BadgeMetric.bestStreak,
      threshold: 100,
    ),
    BadgeDef(
      key: 'streak_150',
      name: '150-Day Immortal',
      description: '150 days. Most quit at day 1.',
      metric: BadgeMetric.bestStreak,
      threshold: 150,
    ),
    BadgeDef(
      key: 'streak_200',
      name: '200-Day God Mode',
      description: '200 days. You ARE Stay Hardy.',
      metric: BadgeMetric.bestStreak,
      threshold: 200,
    ),
    BadgeDef(
      key: 'streak_250',
      name: '250-Day Ascended',
      description: '250 days. A different species entirely.',
      metric: BadgeMetric.bestStreak,
      threshold: 250,
    ),
    BadgeDef(
      key: 'streak_300',
      name: '300-Day Diamond',
      description: '300 days. Pressure made you a diamond.',
      metric: BadgeMetric.bestStreak,
      threshold: 300,
    ),
  ];

  /// Added in 2.0. Prefixed so they can never collide with the legacy ladder.
  ///
  /// These exist because a ladder built only on streak length has one shape of
  /// winner: the person who has never missed. Volume and focus reward the user
  /// who broke a streak in March and kept going anyway, which is most people.
  static const additions = <BadgeDef>[
    BadgeDef(
      key: 'volume_100',
      name: 'Hundred Marks',
      description: '100 check-ins. The work is starting to add up.',
      metric: BadgeMetric.totalCheckIns,
      threshold: 100,
    ),
    BadgeDef(
      key: 'volume_500',
      name: 'Five Hundred',
      description: '500 check-ins, streak or no streak.',
      metric: BadgeMetric.totalCheckIns,
      threshold: 500,
    ),
    BadgeDef(
      key: 'volume_1000',
      name: 'Four Figures',
      description: '1,000 check-ins. Very few people get here.',
      metric: BadgeMetric.totalCheckIns,
      threshold: 1000,
    ),
    BadgeDef(
      key: 'focus_600',
      name: 'Ten Hours Deep',
      description: '10 hours of focused work, timed and banked.',
      metric: BadgeMetric.focusMinutes,
      threshold: 600,
    ),
    BadgeDef(
      key: 'focus_3000',
      name: 'Fifty Hours Deep',
      description: '50 hours of focus. That is a skill, not a mood.',
      metric: BadgeMetric.focusMinutes,
      threshold: 3000,
    ),
    BadgeDef(
      key: 'perfect_1',
      name: 'Clean Week',
      description: 'Every scheduled habit, every day, for a whole week.',
      metric: BadgeMetric.perfectWeeks,
      threshold: 1,
    ),
    BadgeDef(
      key: 'perfect_10',
      name: 'Ten Clean Weeks',
      description: 'Ten perfect weeks. The exception became the rule.',
      metric: BadgeMetric.perfectWeeks,
      threshold: 10,
    ),
  ];

  static const all = <BadgeDef>[...streakLadder, ...additions];

  static BadgeDef? byKey(String key) {
    for (final b in all) {
      if (b.key == key) return b;
    }
    return null;
  }
}

/// The numbers badges are judged against.
class AchievementStats {
  const AchievementStats({
    required this.bestStreak,
    required this.totalCheckIns,
    required this.focusMinutes,
    required this.perfectWeeks,
    required this.tasksCompleted,
    required this.goalsCompleted,
  });

  final int bestStreak;
  final int totalCheckIns;
  final int focusMinutes;
  final int perfectWeeks;
  final int tasksCompleted;
  final int goalsCompleted;

  static const zero = AchievementStats(
    bestStreak: 0,
    totalCheckIns: 0,
    focusMinutes: 0,
    perfectWeeks: 0,
    tasksCompleted: 0,
    goalsCompleted: 0,
  );

  int valueOf(BadgeMetric metric) => switch (metric) {
        BadgeMetric.bestStreak => bestStreak,
        BadgeMetric.totalCheckIns => totalCheckIns,
        BadgeMetric.focusMinutes => focusMinutes,
        BadgeMetric.perfectWeeks => perfectWeeks,
      };
}

/// XP, and the level curve it feeds.
///
/// XP is **derived from lifetime totals, then ratcheted** — never accumulated
/// as events arrive. Deriving it means it can be rebuilt exactly after a
/// restore or a reinstall with no ledger to carry; ratcheting means deleting a
/// habit, un-checking a box, or restoring an older backup can never take a
/// level away. A level that goes down is worse than no level at all.
abstract final class Xp {
  static const perCheckIn = 10;
  static const perFocusMinute = 1;
  static const perTaskCompleted = 5;
  static const perGoalCompleted = 100;
  static const perBadge = 25;

  static int forStats(AchievementStats s, {int badgesEarned = 0}) {
    return s.totalCheckIns * perCheckIn +
        s.focusMinutes * perFocusMinute +
        s.tasksCompleted * perTaskCompleted +
        s.goalsCompleted * perGoalCompleted +
        badgesEarned * perBadge;
  }

  /// Total XP needed to *reach* [level]. Level 1 starts at zero.
  ///
  /// Quadratic, so the first few levels arrive within days — long enough to
  /// mean something, short enough that a new user sees one — while level 30 is
  /// a year of real work rather than a fortnight of it.
  static int thresholdFor(int level) {
    if (level <= 1) return 0;
    return 50 * (level - 1) * level;
  }

  static int levelFor(int xp) {
    if (xp <= 0) return 1;
    var level = 1;
    while (thresholdFor(level + 1) <= xp) {
      level++;
      // Runaway guard: nobody reaches 999, and an infinite loop here would
      // freeze the app on a corrupt value rather than show a wrong number.
      if (level > 999) break;
    }
    return level;
  }

  /// Progress through the current level, 0..1.
  static double progressIn(int xp) {
    final level = levelFor(xp);
    final floor = thresholdFor(level);
    final ceiling = thresholdFor(level + 1);
    if (ceiling <= floor) return 1;
    return ((xp - floor) / (ceiling - floor)).clamp(0.0, 1.0);
  }

  static int toNextLevel(int xp) =>
      (thresholdFor(levelFor(xp) + 1) - xp).clamp(0, 1 << 30);
}

abstract final class BadgeEngine {
  /// Every badge [stats] qualifies for, in catalogue order.
  ///
  /// A pure threshold test with no notion of what was awarded before: earning
  /// is monotonic in each metric, and the caller only ever *adds* what is
  /// missing. That is what makes "earned badges are never revoked" a property
  /// of the data flow rather than a rule someone has to remember.
  static List<BadgeDef> qualifying(AchievementStats stats) {
    return [
      for (final b in BadgeCatalogue.all)
        if (stats.valueOf(b.metric) >= b.threshold) b,
    ];
  }

  /// Qualifying badges not already held.
  static List<BadgeDef> newlyEarned(
    AchievementStats stats,
    Set<String> alreadyHeld,
  ) {
    return [
      for (final b in qualifying(stats))
        if (!alreadyHeld.contains(b.key)) b,
    ];
  }

  /// The next badge to aim at, or null once every one is held.
  static BadgeDef? nextUp(AchievementStats stats, Set<String> held) {
    BadgeDef? best;
    var bestGap = 1 << 30;
    for (final b in BadgeCatalogue.all) {
      if (held.contains(b.key)) continue;
      final gap = b.threshold - stats.valueOf(b.metric);
      if (gap <= 0) return b; // qualifies already but not yet awarded
      if (gap < bestGap) {
        bestGap = gap;
        best = b;
      }
    }
    return best;
  }
}
