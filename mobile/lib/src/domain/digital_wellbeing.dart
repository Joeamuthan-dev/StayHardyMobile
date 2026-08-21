/// Turning a pile of per-app minutes into one number a person can act on.
///
/// ## What the Focus Score is
///
/// The share of your *discretionary* screen time that went into things that
/// compound. Discretionary means system time is removed first: the launcher,
/// the dialler and the keyboard are the phone being a phone, and letting them
/// move the score would mean the number changed for reasons the user never
/// chose.
///
///     score = 100 × (invested + ½ · neutral) / (invested + neutral + leisure)
///
/// Messaging counts as a half because it genuinely is half — the same app is a
/// standup and a group chat in the same minute. Weighting it either way would
/// make the headline a lie for one half of the userbase.
///
/// ## What it is not
///
/// It is not a grade, and nothing here produces a scold. A low score on a
/// Sunday is a rested person, not a failure, which is why [WellbeingBand] tops
/// out at a description and never at a target. There is no goal, no limit, and
/// no red.
///
/// ## Why it can be trusted to be quiet
///
/// Every claim in this file is gated on evidence. [ScreenTimeRules] already
/// established that pattern for correlations; the same floor applies to the
/// score itself — under [minMinutesForScore] of discretionary time in a day,
/// there is no score at all rather than a wild one computed from four minutes.
library;

import 'app_categories.dart';
import 'civil_date.dart';
import 'screen_time_rules.dart';

/// One bucket's total for a period.
class CategoryUsage {
  const CategoryUsage({
    required this.category,
    required this.minutes,
    required this.apps,
  });

  final UsageCategory category;
  final int minutes;

  /// Longest first. Drives "you spent 2h 10m of your 3h social time in
  /// Instagram", which is the sentence people actually act on.
  final List<AppUsage> apps;

  AppUsage? get topApp => apps.isEmpty ? null : apps.first;
}

/// How a period of screen time breaks down.
class UsageBreakdown {
  const UsageBreakdown({
    required this.categories,
    required this.investedMinutes,
    required this.neutralMinutes,
    required this.leisureMinutes,
    required this.systemMinutes,
    required this.days,
  });

  /// Largest first, system excluded — it is reported separately because it is
  /// not a choice the user made.
  final List<CategoryUsage> categories;

  final int investedMinutes;
  final int neutralMinutes;
  final int leisureMinutes;
  final int systemMinutes;

  /// How many days this covers, so the UI can say "per day" honestly.
  final int days;

  /// Everything the user chose to open.
  int get discretionaryMinutes =>
      investedMinutes + neutralMinutes + leisureMinutes;

  int get totalMinutes => discretionaryMinutes + systemMinutes;

  int get dailyAverageMinutes =>
      days <= 0 ? 0 : (totalMinutes / days).round();

  bool get isEmpty => totalMinutes <= 0;

  /// The biggest bucket, or null when there is nothing to point at.
  CategoryUsage? get dominant => categories.isEmpty ? null : categories.first;

  /// The biggest leisure bucket — the one a nudge would be about.
  CategoryUsage? get dominantLeisure {
    for (final c in categories) {
      if (c.category.intent == UsageIntent.leisure) return c;
    }
    return null;
  }

  static const empty = UsageBreakdown(
    categories: [],
    investedMinutes: 0,
    neutralMinutes: 0,
    leisureMinutes: 0,
    systemMinutes: 0,
    days: 0,
  );
}

/// The band a Focus Score falls in.
///
/// Descriptions, not grades. "Leaning to leisure" is a statement of fact a
/// person can agree or disagree with; "Poor" is a judgement they will resent
/// from an app they let see their phone usage.
enum WellbeingBand {
  deepWork('Deep work', 'Most of your screen time went into things that build.'),
  balanced('Balanced', 'A fair split between building and unwinding.'),
  leaning('Leaning to leisure', 'More of the day went to feeds and video than to work.'),
  mostlyLeisure('Mostly leisure', 'Almost all discretionary time was entertainment.');

  const WellbeingBand(this.label, this.blurb);
  final String label;
  final String blurb;
}

/// A Focus Score, or the honest absence of one.
class FocusScore {
  const FocusScore._({
    required this.value,
    required this.band,
    required this.hasEnoughData,
  });

  /// 0..100.
  final int value;
  final WellbeingBand band;

  /// False when there was too little discretionary time to say anything.
  /// The UI must show "not enough yet", never a zero.
  final bool hasEnoughData;

  static const unknown = FocusScore._(
    value: 0,
    band: WellbeingBand.balanced,
    hasEnoughData: false,
  );

  static WellbeingBand bandFor(int score) {
    if (score >= 70) return WellbeingBand.deepWork;
    if (score >= 45) return WellbeingBand.balanced;
    if (score >= 25) return WellbeingBand.leaning;
    return WellbeingBand.mostlyLeisure;
  }
}

/// A day's score, for the trend chart.
class DailyScore {
  const DailyScore({
    required this.date,
    required this.score,
    required this.minutes,
  });

  final CivilDate date;

  /// Null on a day with too little data — plotted as a gap, never as a zero.
  final int? score;
  final int minutes;
}

abstract final class DigitalWellbeing {
  /// Below this much discretionary time in a day, no score is produced.
  ///
  /// Twenty minutes is roughly the point where the ratio stops swinging wildly
  /// on a single app switch. A score computed from four minutes is noise
  /// wearing the costume of a measurement.
  static const minMinutesForScore = 20;

  /// Days needed before a week-over-week trend is stated.
  static const minDaysForTrend = 5;

  /// Fold a set of days into one breakdown.
  static UsageBreakdown breakdown(
    List<ScreenDay> days, {
    Map<String, String> overrides = const {},
  }) {
    if (days.isEmpty) return UsageBreakdown.empty;

    final minutesById = <String, int>{};
    final appsById = <String, List<AppUsage>>{};
    // Merged across days so "Instagram" is one row for the week rather than
    // seven, which is what makes the per-app line readable.
    final mergedApps = <String, AppUsage>{};

    for (final day in days) {
      for (final app in day.apps) {
        final existing = mergedApps[app.packageName];
        mergedApps[app.packageName] = AppUsage(
          packageName: app.packageName,
          foregroundMs: (existing?.foregroundMs ?? 0) + app.foregroundMs,
          launchCount: (existing?.launchCount ?? 0) + app.launchCount,
          appLabel: app.appLabel ?? existing?.appLabel,
        );
      }
    }

    for (final app in mergedApps.values) {
      final category = AppTaxonomy.categorise(
        app.packageName,
        overrides: overrides,
      );
      minutesById[category.id] = (minutesById[category.id] ?? 0) + app.minutes;
      (appsById[category.id] ??= []).add(app);
    }

    var invested = 0, neutral = 0, leisure = 0, system = 0;
    final categories = <CategoryUsage>[];

    for (final entry in minutesById.entries) {
      final category = UsageCategory.byId(entry.key);
      final minutes = entry.value;

      switch (category.intent) {
        case UsageIntent.invested:
          invested += minutes;
        case UsageIntent.neutral:
          neutral += minutes;
        case UsageIntent.leisure:
          leisure += minutes;
        case UsageIntent.system:
          system += minutes;
      }

      if (category.intent == UsageIntent.system) continue;
      final apps = appsById[entry.key] ?? <AppUsage>[];
      apps.sort((a, b) => b.foregroundMs.compareTo(a.foregroundMs));
      categories.add(
        CategoryUsage(category: category, minutes: minutes, apps: apps),
      );
    }

    categories.sort((a, b) => b.minutes.compareTo(a.minutes));

    return UsageBreakdown(
      categories: categories,
      investedMinutes: invested,
      neutralMinutes: neutral,
      leisureMinutes: leisure,
      systemMinutes: system,
      days: days.length,
    );
  }

  /// The score for a breakdown.
  static FocusScore score(UsageBreakdown b) {
    final discretionary = b.discretionaryMinutes;
    if (discretionary < minMinutesForScore) return FocusScore.unknown;

    final weighted = b.investedMinutes + (b.neutralMinutes / 2);
    final value = ((weighted / discretionary) * 100).round().clamp(0, 100);

    return FocusScore._(
      value: value,
      band: FocusScore.bandFor(value),
      hasEnoughData: true,
    );
  }

  /// A score per day, for the trend.
  static List<DailyScore> daily(
    List<ScreenDay> days, {
    Map<String, String> overrides = const {},
  }) {
    return [
      for (final day in days)
        () {
          final b = breakdown([day], overrides: overrides);
          final s = score(b);
          return DailyScore(
            date: day.date,
            score: s.hasEnoughData ? s.value : null,
            minutes: day.minutes,
          );
        }(),
    ];
  }

  /// Change in average score between the two halves of a period.
  ///
  /// Null rather than zero when there is not enough on either side — "we cannot
  /// tell yet" and "no change" are different statements, and only one of them
  /// is honest with four days of data.
  static int? trend(List<DailyScore> scores) {
    final scored = scores.where((s) => s.score != null).toList();
    if (scored.length < minDaysForTrend) return null;

    final half = scored.length ~/ 2;
    final older = scored.take(half);
    final newer = scored.skip(half);
    if (older.isEmpty || newer.isEmpty) return null;

    int avg(Iterable<DailyScore> xs) =>
        (xs.map((s) => s.score!).reduce((a, b) => a + b) / xs.length).round();

    return avg(newer) - avg(older);
  }
}


/// The sentence the numbers were collected for.
///
/// The per-app table tells people what Android's own settings already tell
/// them. This is the part only StayHardy can say: what the pace *costs* over
/// a month and a year, next to the habits the time could have fed. Tone
/// matters — a healthy balance gets told it is healthy, because advice that
/// can only scold is advice that gets switched off.
class TimeAdvice {
  const TimeAdvice({
    required this.headline,
    required this.body,
    required this.positive,
  });

  final String headline;
  final String body;

  /// True when the reading deserves congratulation, not caution.
  final bool positive;

  static TimeAdvice? from(UsageBreakdown breakdown) {
    if (breakdown.days <= 0 || breakdown.totalMinutes == 0) return null;

    final leisureDaily = breakdown.leisureMinutes / breakdown.days;

    // Name the biggest leisure sink, so the advice is about Instagram-time,
    // not an abstract "usage".
    CategoryUsage? sink;
    for (final c in breakdown.categories) {
      if (c.category.intent != UsageIntent.leisure) continue;
      if (sink == null || c.minutes > sink.minutes) sink = c;
    }

    if (leisureDaily >= 90 && sink != null) {
      final monthlyHours = leisureDaily * 30 / 60;
      final yearlyDays = leisureDaily * 365 / 60 / 24;
      final buyBack = (monthlyHours / 2).round();
      return TimeAdvice(
        headline:
            '${_clock(leisureDaily.round())} a day goes to ${sink.category.label.toLowerCase()}',
        body: 'Kept up for a month, that is about ${monthlyHours.round()} '
            'hours — roughly ${yearlyDays.round()} full days a year. Halve '
            'it and you buy back $buyBack hours a month for everything else '
            'on this page.',
        positive: false,
      );
    }

    final invested = breakdown.investedMinutes / breakdown.totalMinutes;
    if (invested >= 0.5) {
      return TimeAdvice(
        headline: 'Your screen time builds things',
        body: '${(invested * 100).round()}% of it went into work and '
            'learning. Whatever you are doing with this phone, keep doing '
            'it.',
        positive: true,
      );
    }

    return TimeAdvice(
      headline: 'A healthy budget',
      body: 'Around ${_clock(leisureDaily.round())} of leisure a day — '
          'that is rest, not waste. The score only moves when it crowds '
          'out the things you said matter.',
      positive: true,
    );
  }

  static String _clock(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h == 0) return '${m}m';
    return m == 0 ? '${h}h' : '${h}h ${m}m';
  }
}
