/// Mood tracking: the scale, and what may honestly be said about it.
///
/// ## Why a 1–5 scale and one entry a day
///
/// Five points is the widest scale people use consistently. Ten-point scales
/// drift — today's 7 is last week's 6 — which destroys exactly the thing a mood
/// chart is for. One entry a day keeps the series comparable and keeps the
/// prompt answerable; a tracker that asks six times a day gets answered zero.
///
/// ## The rule that matters
///
/// **This is not a diagnostic.** Nothing here produces a clinical reading, a
/// warning, or advice about the user's mental health, and nothing may be added
/// that does. It draws a line, it says whether the line moved, and it says
/// whether good days and kept habits tend to land together. That is the whole
/// remit.
///
/// The correlation is gated exactly as `ScreenTimeRules.correlate` is — a claim
/// from four days is astrology, and it is worse than astrology when the subject
/// is how somebody feels.
library;

import 'civil_date.dart';

/// A point on the scale.
///
/// The labels are plain and unclinical on purpose. "Low" rather than
/// "depressed"; "Rough" rather than "distressed".
enum MoodLevel {
  terrible(1, 'Terrible'),
  low(2, 'Low'),
  okay(3, 'Okay'),
  good(4, 'Good'),
  excellent(5, 'Excellent');

  const MoodLevel(this.score, this.label);

  final int score;
  final String label;

  static MoodLevel fromScore(int score) {
    final clamped = score.clamp(1, 5);
    return MoodLevel.values.firstWhere((m) => m.score == clamped);
  }

  /// 0..1 along the scale, for the gradient slider and the chart.
  double get fraction => (score - 1) / 4;
}

/// One recorded day.
class MoodEntry {
  const MoodEntry({
    required this.date,
    required this.score,
    this.note,
  });

  final CivilDate date;
  final int score;
  final String? note;

  MoodLevel get level => MoodLevel.fromScore(score);
}

/// A day's mood set against that day's habit completion.
class MoodVsHabits {
  const MoodVsHabits({
    required this.date,
    required this.score,
    required this.habitRate,
  });

  final CivilDate date;
  final int score;

  /// 0..1, or null on a day with nothing scheduled — which is not a zero.
  final double? habitRate;
}

/// What the mood series says, when it says anything.
class MoodSummary {
  const MoodSummary({
    required this.entries,
    required this.average,
    required this.trend,
    required this.bestDay,
    required this.worstDay,
    required this.correlation,
  });

  /// Oldest first.
  final List<MoodEntry> entries;

  /// Mean score over the window, or null below the evidence floor.
  final double? average;

  /// Change between the two halves of the window, in scale points. Null when
  /// there is not enough to compare.
  final double? trend;

  /// Weekday names, or null when no day stands out.
  final String? bestDay;
  final String? worstDay;

  /// Difference in average habit completion between good and bad mood days.
  final MoodHabitLink? correlation;

  bool get isEmpty => entries.isEmpty;

  static const empty = MoodSummary(
    entries: [],
    average: null,
    trend: null,
    bestDay: null,
    worstDay: null,
    correlation: null,
  );
}

/// The one relationship this feature is allowed to describe.
class MoodHabitLink {
  const MoodHabitLink({
    required this.goodMoodHabitRate,
    required this.lowMoodHabitRate,
    required this.sampleDays,
  });

  /// 0..100 habit completion on days rated 4–5, and on days rated 1–2.
  final int goodMoodHabitRate;
  final int lowMoodHabitRate;
  final int sampleDays;

  int get gap => goodMoodHabitRate - lowMoodHabitRate;

  /// True when better days are also more productive days — the direction most
  /// people expect. It runs the other way often enough to be worth checking.
  bool get keepsMoreOnGoodDays => gap > 0;
}

abstract final class MoodRules {
  /// Entries needed before an average is shown at all.
  static const minEntriesForAverage = 3;

  /// Entries needed before a trend is stated.
  static const minEntriesForTrend = 6;

  /// Days needed on *each side* before mood and habits are compared.
  static const minDaysPerSideForLink = 3;

  /// Entries needed before a weekday pattern is claimed.
  static const minEntriesForWeekday = 14;

  /// Scale points between two halves before the change is worth reporting.
  static const materialTrend = 0.4;

  /// Percentage points between good and low days before the link is stated.
  static const materialLinkPoints = 15;

  /// A day counts as "good" at or above this, and "low" at or below 2.
  static const goodScore = 4;
  static const lowScore = 2;

  static MoodSummary summarise(
    List<MoodEntry> entries, {
    List<MoodVsHabits> againstHabits = const [],
  }) {
    if (entries.isEmpty) return MoodSummary.empty;

    final sorted = [...entries]..sort((a, b) => a.date.iso.compareTo(b.date.iso));

    double? average;
    if (sorted.length >= minEntriesForAverage) {
      var total = 0;
      for (final e in sorted) {
        total += e.score;
      }
      average = total / sorted.length;
    }

    double? trend;
    if (sorted.length >= minEntriesForTrend) {
      final half = sorted.length ~/ 2;
      double mean(Iterable<MoodEntry> xs) =>
          xs.map((e) => e.score).reduce((a, b) => a + b) / xs.length;
      final delta = mean(sorted.skip(half)) - mean(sorted.take(half));
      // Reported only when it is a real move. A 0.1 swing is noise, and
      // telling someone their mood is "down" on noise is not acceptable here.
      if (delta.abs() >= materialTrend) trend = delta;
    }

    final (best, worst) = _weekdays(sorted);

    return MoodSummary(
      entries: sorted,
      average: average,
      trend: trend,
      bestDay: best,
      worstDay: worst,
      correlation: link(againstHabits),
    );
  }

  /// Best and worst weekday, or nulls when no day stands apart.
  static (String?, String?) _weekdays(List<MoodEntry> entries) {
    if (entries.length < minEntriesForWeekday) return (null, null);
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday'];

    final totals = List<int>.filled(7, 0);
    final counts = List<int>.filled(7, 0);
    for (final e in entries) {
      totals[e.date.dow] += e.score;
      counts[e.date.dow]++;
    }

    double? bestAvg, worstAvg;
    int? bestIdx, worstIdx;
    for (var i = 0; i < 7; i++) {
      // Two occurrences is two weeks of that weekday. Below that, one bad
      // Tuesday would win the title outright.
      if (counts[i] < 2) continue;
      final avg = totals[i] / counts[i];
      if (bestAvg == null || avg > bestAvg) {
        bestAvg = avg;
        bestIdx = i;
      }
      if (worstAvg == null || avg < worstAvg) {
        worstAvg = avg;
        worstIdx = i;
      }
    }

    if (bestIdx == null || worstIdx == null || bestIdx == worstIdx) {
      return (null, null);
    }
    if ((bestAvg! - worstAvg!) < materialTrend) return (null, null);
    return (names[bestIdx], names[worstIdx]);
  }

  /// Habit completion on good-mood days versus low-mood days.
  ///
  /// Null rather than zero when the evidence is thin: "no relationship" and
  /// "we cannot tell yet" are different statements and only one is honest.
  static MoodHabitLink? link(List<MoodVsHabits> days) {
    final usable = days.where((d) => d.habitRate != null).toList();
    if (usable.isEmpty) return null;

    var goodRate = 0.0, lowRate = 0.0;
    var goodDays = 0, lowDays = 0;
    for (final d in usable) {
      if (d.score >= goodScore) {
        goodRate += d.habitRate!;
        goodDays++;
      } else if (d.score <= lowScore) {
        lowRate += d.habitRate!;
        lowDays++;
      }
    }

    if (goodDays < minDaysPerSideForLink ||
        lowDays < minDaysPerSideForLink) {
      return null;
    }

    final good = ((goodRate / goodDays) * 100).round();
    final low = ((lowRate / lowDays) * 100).round();
    if ((good - low).abs() < materialLinkPoints) return null;

    return MoodHabitLink(
      goodMoodHabitRate: good,
      lowMoodHabitRate: low,
      sampleDays: goodDays + lowDays,
    );
  }
}

/// What a stretch of readings adds up to.
///
/// Computed from whatever slice the caller is actually drawing, so every number
/// on the card describes the same bars the user is looking at. Deriving the
/// headline from a 90-day window while the chart showed two weeks was how the
/// average and the picture ended up disagreeing.
///
/// Nothing here is a clinical claim. It counts days and reports the count; the
/// words the UI wraps around it are deliberately plain.
class MoodBreakdown {
  const MoodBreakdown({
    required this.average,
    required this.mostCommon,
    required this.mostCommonDays,
    required this.goodDays,
    required this.lowDays,
    required this.days,
    required this.bestWeekday,
    required this.worstWeekday,
  });

  final double average;

  /// The level recorded most often. Ties break toward the *lower* level: told
  /// "your most common mood is Good" on a week split evenly between good and
  /// okay, a person would rightly feel the app was flattering them.
  final MoodLevel mostCommon;
  final int mostCommonDays;

  /// Days at [MoodLevel.good] or better, and at [MoodLevel.low] or worse.
  final int goodDays;
  final int lowDays;

  final int days;

  /// The weekday that reads highest and the one that reads lowest, or null
  /// when there is not enough on either to say it.
  ///
  /// Computed from the same slice as everything else here, so the sentence
  /// under the chart describes the bars above it. It used to come from a fixed
  /// 90-day window while the chart showed the selected range, which meant the
  /// two could name different days from the same screen.
  final String? bestWeekday;
  final String? worstWeekday;

  int get goodPercent =>
      days == 0 ? 0 : ((goodDays / days) * 100).round().clamp(0, 100);

  static MoodBreakdown? of(List<MoodEntry> entries) {
    if (entries.isEmpty) return null;

    final counts = <MoodLevel, int>{};
    var total = 0;
    var good = 0;
    var low = 0;
    for (final e in entries) {
      final level = e.level;
      counts[level] = (counts[level] ?? 0) + 1;
      total += e.score;
      if (e.score >= MoodLevel.good.score) good++;
      if (e.score <= MoodLevel.low.score) low++;
    }

    var top = MoodLevel.values.first;
    var topCount = -1;
    // Ascending order, and strictly-greater, so a tie keeps the lower level.
    for (final level in MoodLevel.values) {
      final n = counts[level] ?? 0;
      if (n > topCount) {
        top = level;
        topCount = n;
      }
    }

    // A weekday claim needs more than one sighting. "Tuesdays read lowest" off
    // a single Tuesday is not a pattern, it is a Tuesday.
    const minPerWeekday = 2;
    final sum = List<int>.filled(7, 0);
    final n = List<int>.filled(7, 0);
    for (final e in entries) {
      sum[e.date.dow] += e.score;
      n[e.date.dow]++;
    }
    int? best;
    int? worst;
    for (var d = 0; d < 7; d++) {
      if (n[d] < minPerWeekday) continue;
      final mean = sum[d] / n[d];
      if (best == null || mean > sum[best] / n[best]) best = d;
      if (worst == null || mean < sum[worst] / n[worst]) worst = d;
    }
    // Naming the same day as both the high and the low says nothing.
    final namedBest = (best != null && worst != null && best != worst)
        ? _weekdayNames[best]
        : null;
    final namedWorst = (best != null && worst != null && best != worst)
        ? _weekdayNames[worst]
        : null;

    return MoodBreakdown(
      bestWeekday: namedBest,
      worstWeekday: namedWorst,
      average: total / entries.length,
      mostCommon: top,
      mostCommonDays: topCount,
      goodDays: good,
      lowDays: low,
      days: entries.length,
    );
  }
}

const _weekdayNames = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

/// How finely the mood chart is drawn at a given range.
///
/// A year of daily bars is 365 slivers on a phone — technically the whole
/// range, practically a barcode. Zoom out and the useful unit gets longer, so
/// the chart keeps roughly a dozen readable columns whichever chip is picked
/// while still covering every day the range contains.
enum MoodGrain { day, week, month }

/// One column of the mood chart.
class MoodBar {
  const MoodBar({
    required this.label,
    required this.average,
    required this.days,
    required this.isLatest,
  });

  final String label;

  /// 1..5, the mean of the readings inside this bucket.
  final double average;

  /// How many readings it was built from — a bar standing for eleven days is
  /// a different claim from one standing for a single Tuesday.
  final int days;

  final bool isLatest;

  MoodLevel get level => MoodLevel.fromScore(average.round());
}

abstract final class MoodChart {
  static MoodGrain grainFor(int rangeDays) {
    if (rangeDays <= 31) return MoodGrain.day;
    if (rangeDays <= 120) return MoodGrain.week;
    return MoodGrain.month;
  }

  static const _initials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  static const _months = [
    'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D',
  ];

  /// Buckets [entries] for the range, oldest first.
  ///
  /// Buckets with no readings are dropped rather than drawn at zero: a day
  /// nobody logged is not a bad day, and a gap in the line is the honest way
  /// to say nothing was recorded.
  static List<MoodBar> bars(List<MoodEntry> entries, int rangeDays) {
    if (entries.isEmpty) return const [];
    final grain = grainFor(rangeDays);

    final buckets = <String, List<MoodEntry>>{};
    final order = <String>[];
    for (final e in entries) {
      final key = switch (grain) {
        MoodGrain.day => e.date.iso,
        // Bucketed by how far back the day sits, so weeks are whole and
        // aligned to the range's end rather than to an arbitrary Monday.
        MoodGrain.week => 'w${_weekIndex(entries.last.date, e.date)}',
        MoodGrain.month => '${e.date.year}-${e.date.month}',
      };
      (buckets[key] ??= <MoodEntry>[]).add(e);
      if (buckets[key]!.length == 1) order.add(key);
    }

    return [
      for (var i = 0; i < order.length; i++)
        () {
          final group = buckets[order[i]]!;
          final mean =
              group.fold<int>(0, (a, e) => a + e.score) / group.length;
          final first = group.first;
          return MoodBar(
            label: switch (grain) {
              MoodGrain.day => _initials[first.date.dow],
              MoodGrain.week => '${first.date.day}',
              MoodGrain.month => _months[first.date.month - 1],
            },
            average: mean,
            days: group.length,
            isLatest: i == order.length - 1,
          );
        }(),
    ];
  }

  static int _weekIndex(CivilDate last, CivilDate day) =>
      day.daysUntil(last) ~/ 7;
}
