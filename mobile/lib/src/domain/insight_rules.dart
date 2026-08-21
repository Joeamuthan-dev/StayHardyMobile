/// The weekly review: turning a week of logs into a handful of things worth
/// saying.
///
/// Three rules govern everything here, and they are the difference between an
/// insight screen people open and one they dismiss forever:
///
/// * **Every claim is earned by evidence.** "Tuesday is your weakest day" from
///   two Tuesdays is confident-sounding nonsense, and one sentence like it
///   discredits the whole screen. Each rule declares its own minimum sample and
///   stays silent below it. Silence is a valid output.
/// * **At most [InsightRules.maxShown].** Twelve observations is a data dump;
///   the work of an insight engine is deciding what *not* to say. Rules are
///   weighted by how actionable they are, and only the top few survive.
/// * **Never all bad news.** A review that is a list of failures gets closed and
///   never reopened, and then it improves nothing. If any win exists it is
///   always shown, even when risks outrank it.
library;

import 'civil_date.dart';

enum InsightTone { win, risk, pattern }

/// What a card is about. Persisted nowhere — safe to reorder.
enum InsightKind {
  perfectWeek,
  newBest,
  improving,
  slipping,
  streakAtRisk,
  dormant,
  goalBehind,
  goalUnlinked,
  weakWeekday,
  strongWeekday,
  focusUp,
  overloaded,
}

class Insight {
  const Insight({
    required this.kind,
    required this.tone,
    required this.headline,
    required this.detail,
    required this.weight,
    this.action,
    this.habitId,
    this.goalId,
  });

  final InsightKind kind;
  final InsightTone tone;

  /// One short line. Carries the finding on its own.
  final String headline;

  /// A sentence of supporting evidence — the numbers behind the claim, so the
  /// user can disagree with it.
  final String detail;

  /// What to do about it. Null when there is nothing honest to suggest;
  /// inventing advice to fill the slot is worse than leaving it out.
  final String? action;

  /// Ranking only. Higher = more worth the user's attention.
  final int weight;

  final String? habitId;
  final String? goalId;
}

/// One habit's week, next to the week before it.
class HabitWeek {
  const HabitWeek({
    required this.id,
    required this.title,
    required this.scheduled,
    required this.completed,
    required this.scheduledPrev,
    required this.completedPrev,
    required this.currentStreak,
    required this.ageDays,
    required this.bestWeekBefore,
    this.daysSinceLastCompletion,
  });

  final String id;
  final String title;

  final int scheduled;
  final int completed;
  final int scheduledPrev;
  final int completedPrev;


  final int currentStreak;

  /// Days since the habit's start date — an evidence guard, so a habit created
  /// on Friday is never called dormant.
  final int ageDays;

  /// Highest completion count of any earlier week, for "best week yet".
  final int bestWeekBefore;

  /// Null when the habit has never been completed at all.
  final int? daysSinceLastCompletion;

  /// 0..1, or null when nothing was scheduled — which is not a rate of zero.
  double? get rate => scheduled == 0 ? null : completed / scheduled;
  double? get prevRate =>
      scheduledPrev == 0 ? null : completedPrev / scheduledPrev;
}

class GoalWeek {
  const GoalWeek({
    required this.id,
    required this.name,
    required this.progress,
    required this.linkedHabits,
    required this.milestonesTotal,
    this.elapsedFraction,
    this.daysRemaining,
  });

  final String id;
  final String name;

  /// 0..100.
  final int progress;

  final int linkedHabits;
  final int milestonesTotal;

  /// How much of the goal's window has passed, 0..1. Null with no target date —
  /// a goal with no deadline cannot be behind.
  final double? elapsedFraction;

  final int? daysRemaining;
}

class ReviewInput {
  const ReviewInput({
    required this.weekStart,
    required this.weekEnd,
    required this.habits,
    required this.goals,
    required this.weekdayScheduled,
    required this.weekdayCompleted,
    required this.dayScheduled,
    required this.dayCompleted,
    required this.weekRates,
    required this.weeksOfHistory,
    required this.scheduled,
    required this.completed,
    required this.checkIns,
    required this.scheduledPrev,
    required this.completedPrev,
    required this.focusMinutes,
    required this.focusMinutesPrev,
    required this.tasksCompleted,
    required this.tasksCompletedPrev,
  });

  final CivilDate weekStart;
  final CivilDate weekEnd;

  final List<HabitWeek> habits;
  final List<GoalWeek> goals;

  /// Totals per weekday over the whole evidence window, Sunday-indexed.
  final List<int> weekdayScheduled;
  final List<int> weekdayCompleted;

  /// The seven days of the reviewed week, oldest first, index 0 == [weekStart].
  ///
  /// Indexed by position rather than by weekday because the week is a rolling
  /// seven days ending yesterday, not a calendar Monday-to-Sunday. The strip
  /// that draws these takes its letters from the real dates, so it stays true
  /// whichever day the review is opened on.
  final List<int> dayScheduled;
  final List<int> dayCompleted;

  /// Rate for each week in the evidence window, oldest first; the last entry
  /// is the reviewed week. Feeds "your best week".
  final List<int> weekRates;

  /// A day counts as strong at the Locked In band and up.
  ///
  /// Deliberately the same 0.80 line the consistency curve's top band uses, so
  /// the count and the colours agree on screen. An earlier version counted from
  /// 50%, which produced "7 / 7 strong days" printed underneath five amber
  /// dots — the number said one thing and the picture said another, and the
  /// picture is the one people believe.
  ///
  /// Kept as a literal rather than importing the band, because this file is
  /// pure domain and the band's home pulls in the data layer. `strongDayFloor`
  /// and ConsistencyZone.lockedIn.floor are pinned together by a test.
  static const strongDayFloor = 0.80;

  int get strongDays {
    var n = 0;
    for (var i = 0; i < dayScheduled.length; i++) {
      if (dayScheduled[i] == 0) continue;
      if (dayCompleted[i] / dayScheduled[i] >= strongDayFloor - 1e-9) n++;
    }
    return n;
  }

  /// Days that had anything due at all.
  int get trackedDays =>
      dayScheduled.where((s) => s > 0).length;

  /// The best week in the window, or null when this week is the only one.
  int? get bestWeekRate {
    if (weekRates.length < 2) return null;
    final best = weekRates.reduce((a, b) => a > b ? a : b);
    return best <= 0 ? null : best;
  }

  /// How many weeks of usable history exist. Gates the pattern rules.
  final int weeksOfHistory;

  /// Habit-day totals for the reviewed week and the one before it.
  final int scheduled;
  final int completed;
  final int scheduledPrev;
  final int completedPrev;

  /// Every habit ticked off during the week, whether or not it was due.
  ///
  /// Deliberately NOT [completed]. That one is the rate's numerator and counts
  /// only days a habit actually owed, which is right for a percentage and
  /// wrong for a total: tick something on a day it was not scheduled and it is
  /// still a check-in you made. Reporting the rate's numerator under the word
  /// "Check-ins" would quietly under-count the user's own work.
  final int checkIns;

  final int focusMinutes;
  final int focusMinutesPrev;
  final int tasksCompleted;
  final int tasksCompletedPrev;

  int get rate =>
      scheduled == 0 ? 0 : ((completed / scheduled) * 100).round().clamp(0, 100);
  int get ratePrev => scheduledPrev == 0
      ? 0
      : ((completedPrev / scheduledPrev) * 100).round().clamp(0, 100);

  bool get hasPreviousWeek => scheduledPrev > 0;
}

abstract final class InsightRules {
  /// Cards shown. Past about five the screen stops being a review and becomes
  /// a report nobody reads to the end.
  static const maxShown = 5;

  /// A weekly rate computed from fewer than this many scheduled days swings
  /// wildly on one missed check-in.
  static const minScheduledForRate = 3;

  /// Rate change, in points of 0..1, before a week counts as different rather
  /// than noisy.
  static const materialChange = 0.20;

  static const dormantDays = 14;

  /// Only a streak this long is worth interrupting someone about. Warning that
  /// a two-day streak is at risk is nagging, not insight.
  static const streakAtRiskFrom = 7;

  /// Percentage points a goal must trail its own elapsed time by.
  static const goalBehindPoints = 15;

  /// Weekday patterns need this many weeks before they mean anything.
  static const minWeeksForWeekdayPattern = 4;

  /// And this many scheduled days on the weekday itself.
  static const minWeekdaySamples = 4;

  /// Weekday rate gap from the mean before a day is called out.
  static const weekdayGap = 0.20;

  /// Below this, a change in focus minutes is not worth a card.
  static const focusMaterialMinutes = 30;

  /// A week is "overloaded" only above this many scheduled habit-days — below
  /// it, a low rate is a couple of missed days, not a structural problem.
  static const overloadedScheduled = 20;
  static const overloadedRate = 0.5;
}

abstract final class InsightEngine {
  static const _weekdayNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
    'Saturday',
  ];

  /// The whole review, ranked and trimmed.
  static List<Insight> generate(ReviewInput input) {
    final candidates = <Insight>[
      ..._habitInsights(input),
      ..._goalInsights(input),
      ..._patternInsights(input),
    ];

    // At most one card per habit and per goal. One struggling habit that trips
    // three rules would otherwise fill the entire review by itself.
    final best = <String, Insight>{};
    final unkeyed = <Insight>[];
    for (final i in candidates) {
      final key = i.habitId ?? i.goalId;
      if (key == null) {
        unkeyed.add(i);
        continue;
      }
      final held = best[key];
      if (held == null || i.weight > held.weight) best[key] = i;
    }

    final ranked = [...best.values, ...unkeyed]
      ..sort((a, b) => b.weight.compareTo(a.weight));

    return _withAtLeastOneWin(ranked);
  }

  /// Trim to [InsightRules.maxShown], keeping a win in the set if one exists.
  static List<Insight> _withAtLeastOneWin(List<Insight> ranked) {
    if (ranked.length <= InsightRules.maxShown) return ranked;

    final shown = ranked.take(InsightRules.maxShown).toList();
    if (shown.any((i) => i.tone == InsightTone.win)) return shown;

    final win = ranked.firstWhere(
      (i) => i.tone == InsightTone.win,
      orElse: () => shown.last,
    );
    if (identical(win, shown.last)) return shown;

    // Drop the weakest card to make room. Ending a review on something that
    // went right is what gets it opened again next week.
    shown[shown.length - 1] = win;
    return shown;
  }

  static Iterable<Insight> _habitInsights(ReviewInput input) sync* {
    for (final h in input.habits) {
      final rate = h.rate;
      final prev = h.prevRate;

      if (h.currentStreak >= InsightRules.streakAtRiskFrom &&
          (h.daysSinceLastCompletion ?? 9999) >= 2) {
        yield Insight(
          kind: InsightKind.streakAtRisk,
          tone: InsightTone.risk,
          headline: '${h.currentStreak}-day streak at risk',
          detail: '${h.title} has not been checked off in '
              '${h.daysSinceLastCompletion} days.',
          action: 'Do it today and the run survives.',
          // The most actionable thing the app can say: a real streak, a
          // specific habit, and a fix that takes one tap.
          weight: 95 + h.currentStreak,
          habitId: h.id,
        );
      }

      if (h.completed > h.bestWeekBefore &&
          h.bestWeekBefore > 0 &&
          h.completed >= InsightRules.minScheduledForRate) {
        yield Insight(
          kind: InsightKind.newBest,
          tone: InsightTone.win,
          headline: 'Best week yet for ${h.title}',
          detail: '${h.completed} check-ins — more than any week before it '
              '(previous best ${h.bestWeekBefore}).',
          weight: 85,
          habitId: h.id,
        );
      }

      if (h.scheduled >= InsightRules.minScheduledForRate &&
          h.completed >= h.scheduled) {
        yield Insight(
          kind: InsightKind.perfectWeek,
          tone: InsightTone.win,
          headline: '${h.title}: perfect week',
          detail: 'All ${h.scheduled} scheduled days done.',
          weight: 70 + h.scheduled,
          habitId: h.id,
        );
      }

      if (rate != null &&
          prev != null &&
          h.scheduled >= InsightRules.minScheduledForRate &&
          h.scheduledPrev >= InsightRules.minScheduledForRate) {
        final delta = rate - prev;
        if (delta >= InsightRules.materialChange) {
          yield Insight(
            kind: InsightKind.improving,
            tone: InsightTone.win,
            headline: '${h.title} is climbing',
            detail: '${_pct(prev)} last week, ${_pct(rate)} this week.',
            weight: 55,
            habitId: h.id,
          );
        } else if (-delta >= InsightRules.materialChange) {
          yield Insight(
            kind: InsightKind.slipping,
            tone: InsightTone.risk,
            headline: '${h.title} is slipping',
            detail: '${_pct(prev)} last week, ${_pct(rate)} this week.',
            action: 'Either protect the time for it, or cut it back to the '
                'days you actually do it.',
            weight: 65,
            habitId: h.id,
          );
        }
      }

      // Never completed counts as dormant from the habit's own age.
      final quietFor = h.daysSinceLastCompletion ?? h.ageDays;
      if (quietFor >= InsightRules.dormantDays &&
          h.ageDays >= InsightRules.dormantDays) {
        yield Insight(
          kind: InsightKind.dormant,
          tone: InsightTone.risk,
          headline: '${h.title} has gone quiet',
          detail: h.daysSinceLastCompletion == null
              ? 'Never checked off since you created it.'
              : 'Nothing logged for $quietFor days.',
          // Deliberately gentle, and archiving is offered first. A habit
          // someone has stopped doing is usually the wrong habit, not a
          // character failure — and it is dragging every rate on the Stats
          // screen down with it.
          action: 'Archive it, or shrink it to something you would actually '
              'do on a bad day.',
          weight: 40,
          habitId: h.id,
        );
      }
    }
  }

  static Iterable<Insight> _goalInsights(ReviewInput input) sync* {
    for (final g in input.goals) {
      final elapsed = g.elapsedFraction;
      if (elapsed != null &&
          g.progress < (elapsed * 100) - InsightRules.goalBehindPoints) {
        yield Insight(
          kind: InsightKind.goalBehind,
          tone: InsightTone.risk,
          headline: '${g.name} is behind',
          detail: '${g.progress}% done with ${(elapsed * 100).round()}% of the '
              'time gone'
              '${g.daysRemaining == null ? '' : ' — ${g.daysRemaining} days left'}.',
          action: g.linkedHabits == 0
              ? 'Link a habit to it so daily work moves the number.'
              : 'Move the date, or cut the goal down to what fits.',
          weight: 75,
          goalId: g.id,
        );
      }

      if (g.linkedHabits == 0 && g.milestonesTotal == 0) {
        yield Insight(
          kind: InsightKind.goalUnlinked,
          tone: InsightTone.pattern,
          headline: '${g.name} has nothing behind it',
          detail: 'No habits linked and no milestones, so its progress can '
              'only ever be a number you type in.',
          action: 'Link the habit that actually moves it.',
          weight: 30,
          goalId: g.id,
        );
      }
    }
  }

  static Iterable<Insight> _patternInsights(ReviewInput input) sync* {
    if (input.scheduled >= InsightRules.overloadedScheduled &&
        input.completed / input.scheduled < InsightRules.overloadedRate) {
      yield Insight(
        kind: InsightKind.overloaded,
        tone: InsightTone.pattern,
        headline: 'You are scheduling more than you finish',
        detail: '${input.completed} of ${input.scheduled} scheduled habit-days '
            'done this week.',
        action: 'Fewer habits done every day beats more habits done sometimes.',
        weight: 60,
      );
    }

    yield* _weekdayInsights(input);

    final focusDelta = input.focusMinutes - input.focusMinutesPrev;
    if (focusDelta >= InsightRules.focusMaterialMinutes &&
        input.focusMinutes >= InsightRules.focusMaterialMinutes) {
      yield Insight(
        kind: InsightKind.focusUp,
        tone: InsightTone.win,
        headline: 'More focused time',
        detail: '${input.focusMinutes} minutes this week, up from '
            '${input.focusMinutesPrev}.',
        weight: 50,
      );
    }
  }

  /// Best and worst weekday, or nothing.
  ///
  /// Gated twice: enough weeks overall, and enough scheduled days on the
  /// weekday itself. Both matter — four weeks of history still says nothing
  /// about Sunday if nothing is ever scheduled on a Sunday.
  static Iterable<Insight> _weekdayInsights(ReviewInput input) sync* {
    if (input.weeksOfHistory < InsightRules.minWeeksForWeekdayPattern) return;

    final rates = <int, double>{};
    for (var dow = 0; dow < 7; dow++) {
      final scheduled = input.weekdayScheduled[dow];
      if (scheduled < InsightRules.minWeekdaySamples) continue;
      rates[dow] = input.weekdayCompleted[dow] / scheduled;
    }
    // Comparing two days is not a weekly pattern.
    if (rates.length < 4) return;

    final mean = rates.values.reduce((a, b) => a + b) / rates.length;
    final sorted = rates.entries.toList()
      ..sort((a, b) => a.value.compareTo(b.value));
    final worst = sorted.first;
    final best = sorted.last;

    if (mean - worst.value >= InsightRules.weekdayGap) {
      yield Insight(
        kind: InsightKind.weakWeekday,
        tone: InsightTone.pattern,
        headline: '${_weekdayNames[worst.key]} is where it breaks',
        detail: '${_pct(worst.value)} on ${_weekdayNames[worst.key]}s against '
            '${_pct(mean)} on an average day.',
        action: 'Schedule less on that day rather than trying harder on it.',
        weight: 45,
      );
    }

    if (best.value - mean >= InsightRules.weekdayGap) {
      yield Insight(
        kind: InsightKind.strongWeekday,
        tone: InsightTone.win,
        headline: '${_weekdayNames[best.key]} is your strongest day',
        detail: '${_pct(best.value)} on ${_weekdayNames[best.key]}s against '
            '${_pct(mean)} on an average day.',
        action: 'Put the habit you keep dropping on a day like that one.',
        weight: 35,
      );
    }
  }

  static String _pct(double v) => '${(v * 100).round()}%';
}
