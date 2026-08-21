import '../data/habit_repository.dart';
import 'civil_date.dart';

/// Daily completion against its own rolling average.
///
/// This is the onboarding chart's argument, made with the user's real data.
/// The onboarding version is an illustration of two *different people*; this
/// one is a single person, and the two lines are the same days measured two
/// ways:
///
/// * **Daily** — what fraction of the day's scheduled habits got done. Volatile
///   by nature: this is the line that feels like motivation.
/// * **Trend** — a centred-trailing 7-day mean of that. This is the line that
///   compounds, and the one worth judging yourself by.
///
/// Deliberately *not* labelled "motivation". The app does not measure
/// motivation, and putting that word on a computed number would be inventing a
/// metric — the honest claim is "your day-to-day bounces; here is the average
/// underneath it", which is also the more useful one.
class ConsistencyTrend {
  const ConsistencyTrend({
    required this.daily,
    required this.trend,
    required this.dates,
    required this.scheduled,
    required this.completed,
    required this.days,
    required this.window,
  });

  /// 0–1 per day, oldest first. Days with nothing scheduled are null: a rest
  /// day is not a failure, and plotting it as zero would carve a hole in the
  /// line for something the user did nothing wrong on.
  final List<double?> daily;

  /// The rolling mean, same length. Null until there is a window to average.
  final List<double?> trend;

  /// The calendar day each index belongs to, so the axis can label itself and
  /// a tapped point can say which day it was.
  final List<CivilDate> dates;

  /// Raw counts per day. A percentage is a claim; "12 of 14 done" is the thing
  /// the user actually recognises as their own Tuesday, which is why a tapped
  /// point shows both.
  final List<int> scheduled;
  final List<int> completed;

  final int days;

  /// Days that actually carry a reading.
  int get observedDays => daily.where((d) => d != null).length;

  /// Below this the chart is noise wearing a trend line's clothes, and showing
  /// it makes a beginner feel like they are already failing.
  static const minDaysToShow = 14;

  bool get hasEnoughData => observedDays >= minDaysToShow;

  /// Where the trend finished, or null when it never started.
  double? get latestTrend =>
      trend.lastWhere((t) => t != null, orElse: () => null);

  /// Trend now versus one window ago — the number worth putting in words.
  double? get change {
    final now = latestTrend;
    if (now == null) return null;
    final earlier = trend.where((t) => t != null).toList();
    if (earlier.length < window * 2) return null;
    final before = earlier[earlier.length - window];
    if (before == null) return null;
    return now - before;
  }

  /// How many days the average spans.
  ///
  /// Scales with the range being viewed. A 7-day mean drawn across a year is
  /// 365 points of weekly wiggle — technically the same metric, visually
  /// noise. Zoom out and you want the monthly shape; zoom in and you want the
  /// weekly one. The label always states which is on screen, so the number is
  /// never ambiguous.
  final int window;

  static int windowFor(int rangeDays) {
    if (rangeDays <= 30) return 7;
    if (rangeDays <= 90) return 14;
    return 30;
  }

  /// The span the delta covers, in words — "up 12 points in a week" has to
  /// name the same period the delta was measured over, or the sentence is
  /// simply false at the wider zooms.
  String get periodLabel => switch (window) {
        7 => 'a week',
        14 => 'a fortnight',
        _ => 'a month',
      };

  /// Whether the day-to-day series is worth drawing at this zoom.
  bool get showsDailyLine => days <= 90;

  /// How the window is said out loud.
  String get windowLabel => switch (window) {
        7 => '7-day average',
        14 => '2-week average',
        _ => '30-day average',
      };

  /// The best day on the trend line — the one worth marking, because being
  /// shown proof you have already held a higher average is the most useful
  /// thing this chart can say on a bad week.
  int? get peakIndex {
    int? best;
    for (var i = 0; i < trend.length; i++) {
      final v = trend[i];
      if (v == null) continue;
      if (best == null || v > trend[best]!) best = i;
    }
    return best;
  }

  /// Which band the current average sits in.
  ConsistencyZone get zone => ConsistencyZone.of(latestTrend ?? 0);

  /// Where the trend bottomed out.
  int? get lowIndex {
    int? worst;
    for (var i = 0; i < trend.length; i++) {
      final v = trend[i];
      if (v == null) continue;
      if (worst == null || v < trend[worst]!) worst = i;
    }
    return worst;
  }

  /// The points worth labelling on the chart, already filtered for relevance.
  ///
  /// Capped at three, and every one has to earn its place. Five floating
  /// labels on a 360dp phone is not a chart with highlights, it is a chart
  /// with a crowd standing in front of it — so a marker that would restate
  /// what another marker already says is dropped rather than drawn.
  List<TrendMoment> get moments {
    final now = latestTrend;
    final nowAt = trend.lastIndexWhere((e) => e != null);
    if (now == null || nowAt < 0) return const [];

    final out = <TrendMoment>[
      TrendMoment(
        index: nowAt,
        value: now,
        kind: MomentKind.current,
        caption: 'Now',
      ),
    ];

    final best = peakIndex;
    // Only a highlight if it is meaningfully above where they are standing —
    // otherwise "best" and "now" are the same point wearing two labels.
    if (best != null && best != nowAt && trend[best]! - now >= 0.05) {
      out.add(TrendMoment(
        index: best,
        value: trend[best]!,
        kind: MomentKind.best,
        caption: 'Best',
      ));
    }

    final low = lowIndex;
    if (low != null &&
        low != nowAt &&
        low != best &&
        now - trend[low]! >= 0.10 &&
        // A low sitting on top of the best label helps nobody.
        (best == null || (low - best).abs() > days ~/ 6)) {
      out.add(TrendMoment(
        index: low,
        value: trend[low]!,
        kind: MomentKind.low,
        caption: 'Low',
      ));
    }
    return out;
  }

  /// Whole weeks in range whose average held at Steady or better, over the
  /// number of weeks that had any data at all.
  ({int held, int total}) get steadyWeeks {
    var held = 0;
    var total = 0;
    for (var start = 0; start + 7 <= trend.length; start += 7) {
      final slice =
          trend.sublist(start, start + 7).whereType<double>().toList();
      if (slice.isEmpty) continue;
      total++;
      final mean = slice.reduce((a, b) => a + b) / slice.length;
      if (mean >= ConsistencyZone.steady.floor) held++;
    }
    return (held: held, total: total);
  }

  /// Whether the average is at its highest point in the whole range.
  ///
  /// Guards the one line in the card that would otherwise be a lie: "your
  /// strongest period yet" must not appear while a higher point is visible
  /// on the same screen.
  bool get isAtPeak {
    final now = latestTrend;
    final best = peakIndex;
    if (now == null || best == null) return false;
    return now >= trend[best]! - 0.005;
  }

  TrendDirection get direction {
    final c = change;
    if (c == null) return TrendDirection.stable;
    // Three points over a window is a real move; anything under it is the
    // metric breathing, and reacting to that would make the card flicker
    // between messages on days the user did nothing different.
    if (c >= 0.03) return TrendDirection.improving;
    if (c <= -0.03) return TrendDirection.falling;
    return TrendDirection.stable;
  }

  /// The band above the current one, or null at the top.
  ConsistencyZone? get nextZoneUp {
    final i = ConsistencyZone.values.indexOf(zone);
    return i == 0 ? null : ConsistencyZone.values[i - 1];
  }

  /// How many perfect days in a row it would actually take to reach [target].
  ///
  /// Real arithmetic on the real window, not an encouraging guess. Each new
  /// day pushes the oldest one out, so this walks k upward and returns the
  /// first k whose resulting mean clears the target. Returns null when the
  /// window is not yet full or when it cannot be done inside one window —
  /// promising "3 strong days" that the maths does not support would be the
  /// fastest way to make this card untrustworthy.
  int? strongDaysTo(ConsistencyZone target) {
    final upTo = trend.lastIndexWhere((e) => e != null);
    if (upTo < 0) return null;

    final tail = <double>[];
    for (var i = upTo; i >= 0 && tail.length < window; i--) {
      final v = daily[i];
      if (v != null) tail.insert(0, v);
    }
    if (tail.length < window) return null;

    // Only a promise a person can picture. "24 strong days reaches Locked In"
    // is arithmetically true and useless — it reads as a sentence, not a
    // target. Past a week the card drops the number and encourages instead.
    for (var k = 1; k <= maxPromise && k <= window; k++) {
      final kept = tail.sublist(k);
      final sum = kept.fold<double>(0, (a, b) => a + b) + k;
      if (sum / window >= target.floor - 1e-9) return k;
    }
    return null;
  }

  /// The furthest ahead the card will promise a concrete number of days.
  static const maxPromise = 7;

  /// The window in the words a person would use for it.
  String get thisPeriod => switch (window) {
        7 => 'this week',
        14 => 'this fortnight',
        _ => 'this month',
      };

  /// What the card should say, from where they are *and* where they are going.
  CoachNote get coach {
    final pct = ((latestTrend ?? 0) * 100).round();
    final dir = direction;
    final up = nextZoneUp;
    final k = up == null ? null : strongDaysTo(up);
    final reach = k == null
        ? null
        : '$k strong day${k == 1 ? '' : 's'}';
    // "4 strong days changes the direction" is the kind of slip that makes a
    // careful sentence read as machine output. The verb agrees with the count.
    final v = k == 1 ? 's' : '';

    switch (zone) {
      case ConsistencyZone.lockedIn:
        return switch (dir) {
          TrendDirection.improving => CoachNote(
              headline: "You're locked in",
              body: "Keep this rhythm going — you're building something "
                  'strong.',
              tone: CoachTone.improving,
              aim: CoachAim.push,
            ),
          TrendDirection.stable => CoachNote(
              headline: "You're locked in",
              body: "You're at $pct% $thisPeriod. This is the zone worth "
                  'living in — protect it.',
              tone: CoachTone.steady,
              aim: CoachAim.hold,
            ),
          TrendDirection.falling => const CoachNote(
              headline: 'Still strong',
              body: "A small dip won't erase what you have built. Keep "
                  'showing up.',
              tone: CoachTone.steady,
              aim: CoachAim.hold,
            ),
        };

      case ConsistencyZone.steady:
        return switch (dir) {
          TrendDirection.improving => CoachNote(
              headline: reach == null
                  ? "You're finding your rhythm"
                  : '$reach reach$v Locked In',
              body: "You're at $pct% $thisPeriod, and climbing. Keep this "
                  'going.',
              tone: CoachTone.improving,
              aim: CoachAim.push,
            ),
          TrendDirection.stable => CoachNote(
              headline: "You're holding steady",
              body: reach == null
                  ? "You're at $pct% $thisPeriod. One stronger week pushes "
                      'you into your best zone.'
                  : "You're at $pct% $thisPeriod. $reach would push you into "
                      'Locked In.',
              tone: CoachTone.steady,
              aim: CoachAim.push,
            ),
          TrendDirection.falling => CoachNote(
              headline: reach == null
                  ? 'You can turn this around'
                  : '$reach change$v the direction',
              body: "You're at $pct% $thisPeriod. Keep showing up and push "
                  'back toward Locked In.',
              tone: CoachTone.slipping,
              aim: CoachAim.push,
            ),
        };

      case ConsistencyZone.slipping:
        return switch (dir) {
          TrendDirection.improving => CoachNote(
              headline: 'Nice comeback',
              body: "You're at $pct% $thisPeriod and moving the right way. "
                  'Keep stacking days.',
              tone: CoachTone.improving,
              aim: CoachAim.push,
            ),
          _ => CoachNote(
              headline: 'Start small today',
              body: reach == null
                  ? 'One completed habit is enough to begin turning this '
                      'around.'
                  : 'One habit today is enough to start. $reach get$v you '
                      'back to Steady.',
              tone: CoachTone.slipping,
              aim: CoachAim.push,
            ),
        };

      case ConsistencyZone.down:
        return const CoachNote(
          headline: 'Today is a fresh start',
          body: 'Pick one habit and get one win on the board. That is the '
              'whole job today.',
          // Warm, never red. This is the person most likely to close the app
          // and not come back, and the card should not look like a warning.
          tone: CoachTone.recovering,
          aim: CoachAim.push,
        );
    }
  }

  /// Build from the activity tallies the stats page already loads.
  factory ConsistencyTrend.from(
    List<DayTally> tallies, {
    bool excludeToday = true,
    int window = 7,
  }) {
    final daily = <double?>[
      for (final t in tallies)
        t.scheduled == 0 ? null : (t.completed / t.scheduled).clamp(0.0, 1.0),
    ];

    final trend = <double?>[];
    for (var i = 0; i < daily.length; i++) {
      // Today is excluded from the average, always.
      //
      // A day in progress is not a bad day. Including it meant that at 9am,
      // with two of nine habits done, the rolling average showed a collapse
      // that had not happened — the single most demoralising thing this chart
      // could do, and it would do it every morning. Today still appears on the
      // daily line; it just does not get a vote on the trend until it is over.
      if (i == daily.length - 1 && excludeToday) {
        trend.add(null);
        continue;
      }
      final from = i - window + 1;
      if (from < 0) {
        trend.add(null);
        continue;
      }
      final slice = daily.sublist(from, i + 1).whereType<double>().toList();
      // A window of pure rest days averages nothing, not zero.
      trend.add(slice.isEmpty
          ? null
          : slice.reduce((a, b) => a + b) / slice.length);
    }

    return ConsistencyTrend(
      daily: daily,
      trend: trend,
      dates: [for (final t in tallies) t.date],
      scheduled: [for (final t in tallies) t.scheduled],
      completed: [for (final t in tallies) t.completed],
      days: tallies.length,
      window: window,
    );
  }
}

/// The four bands the curve is read in.
///
/// Adapted from the brief's colour zones, with the labels rewritten. "Needs
/// attention" and "At risk" are the vocabulary of a compliance dashboard; a
/// person looking at their own bad fortnight does not need to be told they are
/// a risk. The bands are identical, the words are kinder, and the top band is
/// named for what the app is actually about.
enum ConsistencyZone {
  lockedIn(0.80, 'Locked in', 'You are running at full strength.'),
  steady(0.50, 'Steady', 'Not perfect. Still moving. This is most weeks.'),
  slipping(0.20, 'Slipping', 'The week got away. It is recoverable.'),
  down(0.0, 'Down', 'A hard stretch. Pick one habit and restart there.');

  const ConsistencyZone(this.floor, this.label, this.note);

  /// Inclusive lower bound, 0–1.
  final double floor;
  final String label;
  final String note;

  static ConsistencyZone of(double v) {
    // A mean of seven 0.8s is 0.7999999999999999, and a bare `>=` puts a
    // genuine 80% run one band below where it belongs — the card would print
    // "80%" next to a STEADY pill. The epsilon is float noise only; it is far
    // too small to move a real boundary.
    const eps = 1e-9;
    for (final z in values) {
      if (v >= z.floor - eps) return z;
    }
    return down;
  }
}

/// What kind of thing a marked point on the curve is.
enum MomentKind { best, low, current }

/// A point worth putting a label on.
class TrendMoment {
  const TrendMoment({
    required this.index,
    required this.value,
    required this.kind,
    required this.caption,
  });

  final int index;
  final double value;
  final MomentKind kind;
  final String caption;
}

/// Which way the average is moving, independent of where it stands.
///
/// Kept separate from [ConsistencyZone] on purpose. "80% and falling" and
/// "40% and climbing" need opposite things said to them, and a single enum
/// mixing the two can only ever express one of those facts.
enum TrendDirection { improving, stable, falling }

/// How the coaching card should feel. Never carries the danger colour: the
/// chart uses red to report data, but a person at 12% is not an error state,
/// and colouring their encouragement like a crash alert is how an app loses
/// somebody on the exact day it should keep them.
enum CoachTone { improving, steady, slipping, recovering }

/// Where the card points the reader next.
enum CoachAim { push, hold }

/// One piece of coaching: a headline that says what to do, and a line of
/// evidence underneath it that says why.
///
/// Named CoachNote rather than CoachMessage because the app already has a
/// CoachMessage — a turn in the AI chat. Two unrelated things with one name is
/// how the wrong import ends up in a file at 1am.
class CoachNote {
  const CoachNote({
    required this.headline,
    required this.body,
    required this.tone,
    required this.aim,
  });

  final String headline;
  final String body;
  final CoachTone tone;
  final CoachAim aim;
}
