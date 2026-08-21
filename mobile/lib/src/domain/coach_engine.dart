/// The coach.
///
/// ## What this is
///
/// A deterministic advisor that reads the user's own numbers and says something
/// specific about them. Ask "where am I lagging?" and it names the habit, the
/// weekday and the app — from that user's data, not from a list of tips.
///
/// ## Why it is not a language model
///
/// It would have been less code to POST the user's history to an LLM. Three
/// reasons not to, in order of weight:
///
/// 1. **The screen-time disclosure the user accepted says this data never
///    leaves the device**, and the tables it lives in are excluded from the
///    backup payload for the same reason. Shipping it to an API would break a
///    promise already made to 274 people.
/// 2. It would cost money per message, forever, on a free feature.
/// 3. It would sometimes invent a streak the user does not have. Every number
///    in every sentence here is read from the database.
///
/// The trade is real and worth stating: this cannot answer a question it has no
/// rule for. [CoachEngine.route] falls back to saying so plainly and listing
/// what it *can* answer, rather than bluffing — an advisor that fakes an answer
/// about your own life is worse than one that admits its limits.
///
/// ## The one rule every reply follows
///
/// **Never claim a pattern the data cannot support.** Every threshold in this
/// file exists to keep a sentence honest, and any topic without enough evidence
/// says so instead of guessing. This is the same floor `ScreenTimeRules` and
/// `InsightRules` already hold to.
library;

import 'digital_wellbeing.dart';
import 'screen_time_rules.dart';

/// One habit, as the advisor sees it.
class CoachHabit {
  const CoachHabit({
    required this.title,
    required this.category,
    required this.rate,
    required this.streak,
    required this.dueToday,
    required this.doneToday,
    this.reminder,
  });

  final String title;
  final String category;

  /// 0..100 over the review window.
  final int rate;
  final int streak;
  final bool dueToday;
  final bool doneToday;

  /// 'HH:mm', when the user set one.
  final String? reminder;

  bool get isAnchor => rate >= 80 && streak >= 5;
  bool get isStruggling => rate < 55;
}

/// A block in a suggested day.
class RoutineBlock {
  const RoutineBlock({
    required this.when,
    required this.title,
    required this.detail,
  });

  /// 'Morning', 'Midday', 'Evening' — not clock times, unless the user set one.
  final String when;
  final String title;
  final String detail;
}

/// One thing worth changing, with the evidence behind it.
class CoachAdvice {
  const CoachAdvice({
    required this.title,
    required this.why,
    required this.action,
    required this.weight,
    this.tone = CoachTone.neutral,
  });

  final String title;

  /// The observation this rests on. Always a number from the user's own data —
  /// advice without evidence is a horoscope.
  final String why;

  /// One concrete thing to do. Never "be more consistent".
  final String action;

  /// Higher sorts first. Ranked so the user is told the *most* useful thing,
  /// not the first thing the code happened to find.
  final int weight;

  final CoachTone tone;
}

/// Everything the coach is allowed to look at.
///
/// A flat value class rather than a pile of repositories on purpose: the engine
/// stays pure and unit-testable, and it is obvious at a glance exactly what the
/// coach can see.
class CoachSnapshot {
  const CoachSnapshot({
    this.habitRate = 0,
    this.currentStreak = 0,
    this.bestStreak = 0,
    this.habitsToday = 0,
    this.habitsDoneToday = 0,
    this.trackedDays = 0,
    this.bestWeekday,
    this.worstWeekday,
    this.weakestHabit,
    this.weakestHabitRate = 0,
    this.strongestHabit,
    this.overdueTasks = 0,
    this.dueTodayTasks = 0,
    this.activeGoals = 0,
    this.goalsBehind = 0,
    this.focusMinutesWeek = 0,
    this.breakdown = UsageBreakdown.empty,
    this.focusScore = FocusScore.unknown,
    this.scoreTrend,
    this.correlation,
    this.screenTimeGranted = false,
    this.habits = const [],
    this.leisureMinutesPerDay = 0,
    this.investedMinutesPerDay = 0,
    this.topLeisureApp,
    this.topLeisureCategory,
  });

  /// Every habit, with its rate, streak and reminder. The routine builder and
  /// the advice engine both work from this rather than from aggregates.
  final List<CoachHabit> habits;

  final int leisureMinutesPerDay;
  final int investedMinutesPerDay;
  final String? topLeisureApp;
  final String? topLeisureCategory;

  /// 0..100 over the tracked window.
  final int habitRate;
  final int currentStreak;
  final int bestStreak;
  final int habitsToday;
  final int habitsDoneToday;

  /// How many days of history exist. The gate on every "pattern" claim.
  final int trackedDays;

  final String? bestWeekday;
  final String? worstWeekday;

  final String? weakestHabit;
  final int weakestHabitRate;
  final String? strongestHabit;

  final int overdueTasks;
  final int dueTodayTasks;
  final int activeGoals;
  final int goalsBehind;

  final int focusMinutesWeek;

  final UsageBreakdown breakdown;
  final FocusScore focusScore;
  final int? scoreTrend;
  final ScreenTimeCorrelation? correlation;
  final bool screenTimeGranted;

  int get habitsLeftToday => (habitsToday - habitsDoneToday).clamp(0, 9999);
}

/// What the coach can be asked.
enum CoachTopic {
  briefing('How am I doing?', CoachGroup.review),
  improve('What should I change?', CoachGroup.act),
  routine('Build me a routine', CoachGroup.act),
  today('What should I do right now?', CoachGroup.act),
  lagging('Where am I lagging?', CoachGroup.review),
  strengths('What am I doing well?', CoachGroup.review),
  consistency('How do I get more consistent?', CoachGroup.act),
  screenTime('Where does my phone time go?', CoachGroup.phone),
  wasting('What is stealing my time?', CoachGroup.phone),
  timing('When am I at my best?', CoachGroup.review),
  goals('Am I on track for my goals?', CoachGroup.review);

  const CoachTopic(this.prompt, this.group);

  /// The question as the user would tap it.
  final String prompt;

  /// Which shelf it sits on in the chip rail.
  final CoachGroup group;
}

/// The chip rail's shelves. Eleven undifferentiated chips is a wall; three
/// labelled groups is a menu.
enum CoachGroup {
  act('Do'),
  review('Review'),
  phone('Phone');

  const CoachGroup(this.label);
  final String label;
}

/// A reply. Plain paragraphs plus an optional highlighted number.
class CoachReply {
  const CoachReply({
    required this.paragraphs,
    this.headline,
    this.metric,
    this.metricLabel,
    this.tone = CoachTone.neutral,
    this.advice = const [],
    this.routine = const [],
  });

  /// Ranked, actionable findings rendered as their own blocks.
  final List<CoachAdvice> advice;

  /// A suggested shape of day.
  final List<RoutineBlock> routine;

  final List<String> paragraphs;

  /// A short bolded lead, shown above the body.
  final String? headline;

  /// One number worth pulling out, e.g. '68' — rendered large beside the reply.
  final String? metric;
  final String? metricLabel;

  final CoachTone tone;
}

/// Colours the reply. Never used to scold — [CoachTone.warn] is for "this needs
/// attention", never for "you failed".
enum CoachTone { neutral, good, warn }

abstract final class CoachEngine {
  /// Days of history before the coach will describe a "pattern" at all.
  static const minDaysForPattern = 14;

  /// A weekday is only called out if it is this far off the average.
  static const weekdayGapPoints = 15;

  /// The opening line when the chat is first shown.
  static CoachReply greeting(CoachSnapshot s) {
    if (s.trackedDays < 3) {
      return const CoachReply(
        headline: 'Not much to go on yet',
        paragraphs: [
          "I read your habits, tasks, goals and screen time and tell you what "
              "they say — all on this device, nothing sent anywhere.",
          "Give it a few days of check-ins and I'll have something worth "
              "saying. Ask me anything below in the meantime.",
        ],
      );
    }
    return answer(CoachTopic.briefing, s);
  }

  /// One conversational turn.
  ///
  /// This is what makes typing feel understood, in order of attempt:
  ///
  /// 1. **Small talk** — greetings and thanks get a warm, brief reply. A chat
  ///    that answers "hi" with a refusal has failed before the first question.
  /// 2. **Their own habits by name** — "how is my meditation going" answers
  ///    about *that habit*, with its rate and streak. Recognising the user's
  ///    own words is the single most personal thing a deterministic engine can
  ///    honestly do.
  /// 3. **Scored topic routing** — every topic is scored against the message
  ///    and the best match wins, so "why do I keep failing my evening habits"
  ///    lands on lagging rather than on whichever keyword happened to be
  ///    checked first.
  /// 4. **A helpful fallback** — no match still answers: it says plainly that
  ///    the message was not fully understood, then gives the briefing anyway.
  ///    Honesty about the limits, without a dead end.
  ///
  /// Still not a language model, on purpose: the screen-time disclosure says
  /// this data never leaves the device, and every sentence produced here is
  /// assembled from the user's own numbers.
  static CoachReply converse(String input, CoachSnapshot s) {
    final q = _normalise(input);

    // --- 1. small talk ---------------------------------------------------
    if (_matchesAny(q, ['hi', 'hii', 'hello', 'hey', 'yo', 'good morning',
        'good evening', 'good afternoon', 'morning', 'evening'])) {
      final line = s.habitsLeftToday > 0
          ? '${s.habitsLeftToday} habit${s.habitsLeftToday == 1 ? '' : 's'} '
              'still open today — want to know where to start?'
          : (s.habitsToday > 0
              ? 'Everything scheduled today is already done.'
              : 'Nothing scheduled today.');
      return CoachReply(
        headline: _greetWord(q),
        paragraphs: [line, 'Ask me anything below, or tap a question.'],
        tone: CoachTone.neutral,
      );
    }
    if (_matchesAny(q, ['thanks', 'thank you', 'thx', 'ty', 'nice', 'great',
        'cool', 'ok', 'okay', 'good'])) {
      return const CoachReply(
        headline: 'Any time',
        paragraphs: [
          'The numbers update as you go — come back whenever you want a read.',
        ],
        tone: CoachTone.good,
      );
    }

    // --- 2. their own habits, by name ------------------------------------
    for (final habit in s.habits) {
      final name = _normalise(habit.title);
      if (name.isEmpty) continue;
      // Match the full title, or its distinctive words for titles like
      // "Morning workout" asked about as "workout".
      final words = name.split(' ').where((w) => w.length >= 4);
      final hit = q.contains(name) || words.any(q.contains);
      if (!hit) continue;

      final lines = <String>[
        '"${habit.title}" is at ${habit.rate}% over the review window'
            '${habit.streak > 0 ? ', with a ${habit.streak}-day streak' : ''}.',
        habit.doneToday
            ? 'Already done today.'
            : (habit.dueToday ? 'Still open today.' : 'Not scheduled today.'),
      ];
      if (habit.isStruggling) {
        lines.add('It is your weak spot right now. Try halving it — a '
            'two-minute version you actually do beats a proper one you skip.');
      } else if (habit.isAnchor) {
        lines.add('It is one of your anchors — you barely miss it. Stacking a '
            'weaker habit straight after it is the most reliable trick there '
            'is.');
      }
      return CoachReply(
        headline: habit.title,
        paragraphs: lines,
        metric: '${habit.rate}%',
        metricLabel: 'KEPT',
        tone: habit.isStruggling ? CoachTone.warn : CoachTone.good,
      );
    }

    // --- 3. scored topics -------------------------------------------------
    final topic = route(input);
    if (topic != null) return answer(topic, s);

    // --- 4. helpful fallback ----------------------------------------------
    final briefing = _briefing(s);
    return CoachReply(
      headline: "I'm not sure I caught that",
      paragraphs: [
        "I answer from your own data, so I can't improvise — but here is "
            'where you stand:',
        ...briefing.paragraphs,
        'You can also ask about any habit by name.',
      ],
      metric: briefing.metric,
      metricLabel: briefing.metricLabel,
      tone: briefing.tone,
    );
  }

  static String _normalise(String input) => input
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9\s]'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();

  /// Whole-message match for short phrases, so "hi" fires but "which app is
  /// hitting me hardest" does not match on the "hi" inside "which".
  static bool _matchesAny(String q, List<String> phrases) {
    if (q.length > 24) return false;
    return phrases.any((p) => q == p || q.startsWith('$p '));
  }

  static String _greetWord(String q) {
    if (q.startsWith('good morning') || q == 'morning') return 'Good morning';
    if (q.startsWith('good evening') || q == 'evening') return 'Good evening';
    return 'Hey';
  }

  /// Map free text onto a topic, best score wins.
  ///
  /// Scored rather than first-match: "why do I keep failing my evening habits"
  /// contains signals for three topics, and the one with the most evidence
  /// should answer rather than whichever keyword list happened to be checked
  /// first.
  static CoachTopic? route(String input) {
    final q = _normalise(input);

    int score(List<String> words) =>
        words.where(q.contains).length;

    final scores = <CoachTopic, int>{
      CoachTopic.routine: score(['routine', 'schedule my', 'plan my day',
          'shape of', 'daily plan', 'my day plan', 'timetable', 'structure']),
      CoachTopic.improve: score(['change', 'fix', 'advice', 'advise',
          'suggest', 'help me', 'differently', 'recommend', 'improve my',
          'better at', 'tips']),
      CoachTopic.wasting: score(['waste', 'wasting', 'stealing', 'losing time',
          'time going', 'time sink', 'procrastinat']),
      CoachTopic.strengths: score(['doing well', 'good at', 'strength',
          'working well', 'strongest', 'best habit', 'proud']),
      CoachTopic.lagging: score(['lag', 'behind', 'weak', 'worst', 'struggl',
          'failing', 'fail', 'bad at', 'missing', 'slipping', 'problem']),
      CoachTopic.screenTime: score(['screen', 'phone', 'instagram', 'youtube',
          'social media', 'scroll', 'distract', 'apps', 'usage', 'mobile']),
      CoachTopic.consistency: score(['consistent', 'consistency', 'streak',
          'stick', 'keep up', 'maintain', 'every day', 'discipline']),
      CoachTopic.goals: score(['goal', 'target', 'deadline', 'on track',
          'milestone']),
      CoachTopic.timing: score(['when am i', 'time of day', 'best day',
          'weekday', 'which day', 'what day']),
      CoachTopic.today: score(['right now', 'today', 'next', 'should i do',
          'focus on', 'start with', 'first']),
      CoachTopic.briefing: score(['how am i', 'doing', 'summary', 'overall',
          'progress', 'status', 'overview', 'how is it going']),
    };

    CoachTopic? best;
    var bestScore = 0;
    for (final entry in scores.entries) {
      if (entry.value > bestScore) {
        bestScore = entry.value;
        best = entry.key;
      }
    }
    return best;
  }

  /// The reply for an unrecognised question.
  static CoachReply unknown() => const CoachReply(
        headline: "I don't have a rule for that",
        paragraphs: [
          "I'm not a general chatbot — I only answer from your own data, so I "
              "can't make something up.",
          'Try one of the questions below.',
        ],
      );

  static CoachReply answer(CoachTopic topic, CoachSnapshot s) {
    switch (topic) {
      case CoachTopic.briefing:
        return _briefing(s);
      case CoachTopic.lagging:
        return _lagging(s);
      case CoachTopic.consistency:
        return _consistency(s);
      case CoachTopic.screenTime:
        return _screenTime(s);
      case CoachTopic.today:
        return _today(s);
      case CoachTopic.timing:
        return _timing(s);
      case CoachTopic.goals:
        return _goals(s);
      case CoachTopic.improve:
        return _improve(s);
      case CoachTopic.routine:
        return _routine(s);
      case CoachTopic.strengths:
        return _strengths(s);
      case CoachTopic.wasting:
        return _wasting(s);
    }
  }

  // ---------------------------------------------------------------------------
  // The consultation
  // ---------------------------------------------------------------------------

  /// Everything worth changing, ranked.
  ///
  /// Weights are the whole point: a person told five things changes none of
  /// them. The engine finds what it can, sorts by how much difference it would
  /// make, and the UI shows the top few.
  static List<CoachAdvice> recommendations(CoachSnapshot s) {
    final out = <CoachAdvice>[];

    // Overdue work outranks everything. It is already-owed, already-decided,
    // and it is the cheapest thing on this list to clear.
    if (s.overdueTasks > 0) {
      out.add(CoachAdvice(
        title: 'Clear the backlog first',
        why: '${s.overdueTasks} task${s.overdueTasks == 1 ? ' is' : 's are'} '
            'past due.',
        action: s.overdueTasks > 3
            ? 'Delete or reschedule half of them today. A list you have stopped '
                'believing costs more than it holds.'
            : 'Finish or delete them today — do not carry them another week.',
        weight: 100,
        tone: CoachTone.warn,
      ));
    }

    // Too many habits is the single most common cause of a collapsing rate.
    if (s.habitsToday > 6 && s.habitRate < 70) {
      out.add(CoachAdvice(
        title: 'Carry fewer habits',
        why: '${s.habitsToday} scheduled today and ${s.habitRate}% kept '
            'overall.',
        action: 'Pause the two you care least about for a fortnight. Rates '
            'climb when the list shrinks, not when you try harder.',
        weight: 92,
        tone: CoachTone.warn,
      ));
    }

    // A single habit dragging the average.
    if (s.weakestHabit != null && s.weakestHabitRate < 50) {
      out.add(CoachAdvice(
        title: 'Shrink "${s.weakestHabit}"',
        why: 'It sits at ${s.weakestHabitRate}%, well under everything else.',
        action: 'Halve it. A two-minute version you actually do beats a proper '
            'one you skip — and the streak is what compounds, not the size.',
        weight: 86,
        tone: CoachTone.warn,
      ));
    }

    // Habit stacking, the most reliable trick there is.
    final anchor = s.habits.where((h) => h.isAnchor).toList();
    final wobbly = s.habits.where((h) => h.isStruggling).toList();
    if (anchor.isNotEmpty && wobbly.isNotEmpty) {
      out.add(CoachAdvice(
        title: 'Stack "${wobbly.first.title}" onto "${anchor.first.title}"',
        why: 'You almost never miss "${anchor.first.title}" '
            '(${anchor.first.rate}%), and "${wobbly.first.title}" is at '
            '${wobbly.first.rate}%.',
        action: 'Do the weak one immediately after the strong one. An existing '
            'habit is a better trigger than any reminder.',
        weight: 80,
      ));
    }

    // A weekday that reliably fails is a scheduling problem, not willpower.
    if (s.worstWeekday != null) {
      out.add(CoachAdvice(
        title: 'Give ${s.worstWeekday}s a lighter plan',
        why: 'Across ${s.trackedDays} tracked days, ${s.worstWeekday} is '
            'consistently your weakest.',
        action: 'Move one habit off it, or accept it as a rest day on purpose. '
            'A day you reliably lose is a schedule to fix, not a character '
            'flaw.',
        weight: 74,
      ));
    }

    // Phone. Only ever raised with real numbers behind it.
    if (s.screenTimeGranted && s.leisureMinutesPerDay >= 120) {
      final app = s.topLeisureApp ?? s.topLeisureCategory ?? 'the biggest one';
      out.add(CoachAdvice(
        title: 'Put $app one step further away',
        why: '${_hm(s.leisureMinutesPerDay)} a day of leisure screen time, '
            'mostly there.',
        action: 'Move it off your home screen and out of the dock. Friction '
            'beats willpower, and deleting it is a bigger ask than it needs '
            'to be.',
        weight: 70,
        tone: CoachTone.warn,
      ));
    }

    if (s.correlation != null && s.correlation!.moreOnMissedDays) {
      out.add(CoachAdvice(
        title: 'Your heavy phone days are your missed days',
        why: 'On days you miss habits you average '
            '${_hm(s.correlation!.gap)} more screen time, across '
            '${s.correlation!.sampleDays} days.',
        action: 'Do the first habit before the first unlock. That is the only '
            'ordering you control.',
        weight: 66,
      ));
    }

    // Focus, offered once the basics are not on fire.
    if (s.focusMinutesWeek < 60 && s.habitRate >= 50) {
      out.add(const CoachAdvice(
        title: 'Book one focus block',
        why: 'Under an hour of focused time banked this week.',
        action: 'One 25-minute block, on the thing you keep postponing. A '
            'booked block gets kept far more often than an intention.',
        weight: 55,
      ));
    }

    if (s.goalsBehind > 0) {
      out.add(CoachAdvice(
        title: 'Re-date or cut a goal',
        why: '${s.goalsBehind} goal${s.goalsBehind == 1 ? ' is' : 's are'} '
            'behind the pace needed to land on time.',
        action: 'Move the date or cut the scope. Carrying a goal you have '
            'quietly stopped believing in costs more than dropping it.',
        weight: 50,
        tone: CoachTone.warn,
      ));
    }

    out.sort((a, b) => b.weight.compareTo(a.weight));
    return out;
  }

  static CoachReply _improve(CoachSnapshot s) {
    if (s.trackedDays < 7) {
      return const CoachReply(
        headline: 'Give it a week first',
        paragraphs: [
          'I can only suggest changes I can back with your own numbers, and a '
              'few days is not enough to tell a habit from a bad Tuesday.',
        ],
      );
    }

    final advice = recommendations(s).take(3).toList();
    if (advice.isEmpty) {
      return CoachReply(
        headline: 'Nothing worth changing',
        paragraphs: [
          'No overdue work, no habit dragging, no weekday you reliably lose. '
              'At ${s.habitRate}% the honest advice is to leave the plan alone '
              'and let it compound.',
        ],
        tone: CoachTone.good,
      );
    }

    return CoachReply(
      headline: advice.length == 1
          ? 'One thing to change'
          : '${advice.length} things, most useful first',
      paragraphs: const [
        'Ranked by how much difference each would make. Do the first one and '
            'ignore the rest until it sticks.',
      ],
      advice: advice,
      tone: advice.first.tone,
    );
  }

  /// A shape of day built from the habits they already have.
  ///
  /// Not a generic morning routine off the internet — every block is one of
  /// their own habits, placed by its reminder if it has one and by its category
  /// if it does not.
  static CoachReply _routine(CoachSnapshot s) {
    if (s.habits.isEmpty) {
      return const CoachReply(
        headline: 'Nothing to build with yet',
        paragraphs: [
          'A routine here is made of your own habits, not a template. Add two '
              'or three and ask again.',
        ],
      );
    }

    final blocks = <RoutineBlock>[];

    String slotFor(CoachHabit h) {
      final reminder = h.reminder;
      if (reminder != null && reminder.length >= 2) {
        final hour = int.tryParse(reminder.substring(0, 2));
        if (hour != null) {
          if (hour < 12) return 'Morning';
          if (hour < 17) return 'Midday';
          return 'Evening';
        }
      }
      // No reminder: place by what the habit is for.
      return switch (h.category.toLowerCase()) {
        'fitness' || 'health' => 'Morning',
        'work' || 'learning' || 'finance' || 'content' => 'Midday',
        'mindset' || 'social' || 'hobby' || 'creative' => 'Evening',
        _ => 'Midday',
      };
    }

    for (final slot in ['Morning', 'Midday', 'Evening']) {
      final inSlot = s.habits.where((h) => slotFor(h) == slot).toList()
        ..sort((a, b) => b.rate.compareTo(a.rate));
      if (inSlot.isEmpty) continue;

      // The strongest habit in a slot anchors it; the rest hang off it.
      final anchor = inSlot.first;
      blocks.add(RoutineBlock(
        when: slot,
        title: anchor.title,
        detail: anchor.reminder != null
            ? 'Already set for ${anchor.reminder}. Anchor the rest of the slot '
                'to it.'
            : 'Your strongest ${slot.toLowerCase()} habit at ${anchor.rate}% — '
                'start the slot here.',
      ));
      for (final h in inSlot.skip(1).take(2)) {
        blocks.add(RoutineBlock(
          when: slot,
          title: h.title,
          detail: 'Straight after "${anchor.title}". '
              '${h.rate < 60 ? 'It is at ${h.rate}%, so it needs the anchor.' : ''}'
              .trim(),
        ));
      }
    }

    if (s.focusMinutesWeek >= 0 && s.habits.length >= 2) {
      blocks.add(const RoutineBlock(
        when: 'Midday',
        title: 'One 25-minute focus block',
        detail: 'On whatever you have been postponing. Phone in another room.',
      ));
    }

    if (s.screenTimeGranted && s.leisureMinutesPerDay >= 90) {
      blocks.add(RoutineBlock(
        when: 'Evening',
        title: 'Phone down 30 minutes before bed',
        detail: '${_hm(s.leisureMinutesPerDay)} a day of leisure screen time. '
            'The last half hour is the cheapest one to reclaim.',
      ));
    }

    return CoachReply(
      headline: 'A day built from your own habits',
      paragraphs: [
        'Placed by the reminders you set, and by what each habit is for. '
            'Nothing here is new — it is what you already track, in an order '
            'that gives each one a trigger.',
      ],
      routine: blocks,
    );
  }

  static CoachReply _strengths(CoachSnapshot s) {
    final lines = <String>[];

    if (s.currentStreak >= 7) {
      lines.add('You are ${s.currentStreak} days into a streak. That is the '
          'part that compounds.');
    }
    final anchors = s.habits.where((h) => h.isAnchor).toList()
      ..sort((a, b) => b.rate.compareTo(a.rate));
    if (anchors.isNotEmpty) {
      lines.add('"${anchors.first.title}" is at ${anchors.first.rate}% — you '
          'barely miss it. That is an anchor you can hang weaker habits on.');
    }
    if (s.bestWeekday != null) {
      lines.add('${s.bestWeekday}s are reliably your strongest day.');
    }
    if (s.habitRate >= 70) {
      lines.add('${s.habitRate}% overall. Most people who install a habit app '
          'never see a number like that.');
    }
    if (s.focusMinutesWeek >= 120) {
      lines.add('${_hm(s.focusMinutesWeek)} of focused work banked this week.');
    }

    if (lines.isEmpty) {
      return const CoachReply(
        headline: 'Early, but nothing broken',
        paragraphs: [
          'Nothing stands out as a strength yet — which at this stage means '
              'there is not enough history, not that there is nothing there. '
              'Keep going and ask again in a fortnight.',
        ],
      );
    }

    return CoachReply(
      headline: 'What is working',
      paragraphs: lines,
      tone: CoachTone.good,
    );
  }

  static CoachReply _wasting(CoachSnapshot s) {
    if (!s.screenTimeGranted) {
      return const CoachReply(
        headline: 'I cannot see your phone use',
        paragraphs: [
          'Turn on usage access in Insights and I can tell you exactly which '
              'app is taking the hours, and whether it lines up with the days '
              'you miss habits.',
          'It stays on this device — it is never uploaded and never backed up.',
        ],
      );
    }

    final lines = <String>[];
    if (s.leisureMinutesPerDay > 0) {
      lines.add('${_hm(s.leisureMinutesPerDay)} a day goes to leisure apps'
          '${s.topLeisureApp == null ? '' : ', most of it in ${s.topLeisureApp}'}'
          '.');
    }
    if (s.investedMinutesPerDay > 0) {
      lines.add('Against ${_hm(s.investedMinutesPerDay)} a day on things that '
          'compound.');
    }
    if (s.overdueTasks > 0 && s.leisureMinutesPerDay >= 60) {
      lines.add('You have ${s.overdueTasks} overdue '
          'task${s.overdueTasks == 1 ? '' : 's'} and '
          '${_hm(s.leisureMinutesPerDay)} a day of leisure. Those two facts '
          'are usually the same fact.');
    }

    if (lines.isEmpty) {
      return const CoachReply(
        headline: 'Nothing collected yet',
        paragraphs: ['Usage access is on but no days have been recorded yet.'],
      );
    }

    final advice = recommendations(s)
        .where((a) => a.title.contains('further away') || a.title.contains('phone'))
        .toList();

    return CoachReply(
      headline: 'Where the hours actually go',
      paragraphs: lines,
      advice: advice,
      metric: s.focusScore.hasEnoughData ? '${s.focusScore.value}' : null,
      metricLabel: 'FOCUS SCORE',
      tone: s.leisureMinutesPerDay >= 180 ? CoachTone.warn : CoachTone.neutral,
    );
  }

  static String _hm(int minutes) {
    if (minutes <= 0) return '0m';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h == 0) return '${m}m';
    if (m == 0) return '${h}h';
    return '${h}h ${m}m';
  }

  // ---------------------------------------------------------------------------

  static CoachReply _briefing(CoachSnapshot s) {
    final lines = <String>[];

    lines.add(
      'You are keeping ${s.habitRate}% of your scheduled habits'
      '${s.trackedDays > 0 ? ' over the last ${s.trackedDays} days' : ''}.'
      '${s.currentStreak > 0 ? ' Current streak: ${s.currentStreak} days.' : ''}',
    );

    if (s.habitsLeftToday > 0) {
      lines.add(
        '${s.habitsLeftToday} habit${s.habitsLeftToday == 1 ? '' : 's'} still '
        'open today, out of ${s.habitsToday}.',
      );
    } else if (s.habitsToday > 0) {
      lines.add('Everything scheduled for today is done.');
    }

    if (s.overdueTasks > 0) {
      lines.add(
        '${s.overdueTasks} task${s.overdueTasks == 1 ? ' is' : 's are'} past '
        'due — those tend to be what quietly eats a week.',
      );
    }

    if (s.focusScore.hasEnoughData) {
      lines.add(
        'Your Focus Score is ${s.focusScore.value}. '
        '${s.focusScore.band.blurb}',
      );
    }

    final tone = s.habitRate >= 80
        ? CoachTone.good
        : (s.habitRate < 50 && s.trackedDays >= 7
            ? CoachTone.warn
            : CoachTone.neutral);

    return CoachReply(
      headline: _headlineFor(s),
      paragraphs: lines,
      metric: '${s.habitRate}%',
      metricLabel: 'CONSISTENCY',
      tone: tone,
    );
  }

  static String _headlineFor(CoachSnapshot s) {
    if (s.habitRate >= 85) return 'This is working';
    if (s.habitRate >= 65) return 'Solid, with a soft spot';
    if (s.habitRate >= 40) return 'Half the days are getting away';
    if (s.trackedDays < 7) return 'Early days';
    return 'Time to shrink the plan';
  }

  static CoachReply _lagging(CoachSnapshot s) {
    final lines = <String>[];
    var tone = CoachTone.neutral;

    if (s.trackedDays < 7) {
      return const CoachReply(
        headline: 'Too early to say',
        paragraphs: [
          "I need about a week of check-ins before I can tell a real weak spot "
              "from an ordinary bad day.",
        ],
      );
    }

    if (s.weakestHabit != null && s.weakestHabitRate < 60) {
      lines.add(
        '"${s.weakestHabit}" is your weakest habit at ${s.weakestHabitRate}%. '
        'Everything else is doing better than that.',
      );
      lines.add(
        'One habit dragging is usually a sign it is too big, or scheduled at a '
        'time that does not exist in your day. Try halving it before dropping '
        'it — a two-minute version you actually do beats a perfect one you skip.',
      );
      tone = CoachTone.warn;
    }

    if (s.worstWeekday != null) {
      lines.add('${s.worstWeekday} is consistently your weakest day.');
    }

    if (s.overdueTasks > 2) {
      lines.add(
        '${s.overdueTasks} tasks are overdue. That backlog is its own drag — '
        'clearing or deleting them is usually worth more than adding anything '
        'new.',
      );
      tone = CoachTone.warn;
    }

    final leisure = s.breakdown.dominantLeisure;
    if (s.screenTimeGranted && leisure != null && leisure.minutes > 0) {
      final perDay = s.breakdown.days > 0
          ? leisure.minutes ~/ s.breakdown.days
          : leisure.minutes;
      if (perDay >= 45) {
        lines.add(
          '${leisure.category.label} is taking about '
          '${ScreenTimeRules.formatDuration(perDay)} a day'
          '${leisure.topApp == null ? '' : ', mostly ${leisure.topApp!.displayName}'}.',
        );
      }
    }

    if (lines.isEmpty) {
      return CoachReply(
        headline: 'Nothing is obviously lagging',
        paragraphs: [
          'No habit, weekday or task pile stands out as a weak spot right now. '
              'At ${s.habitRate}% consistency the honest advice is to leave the '
              'plan alone.',
        ],
        tone: CoachTone.good,
      );
    }

    return CoachReply(
      headline: 'Where it is slipping',
      paragraphs: lines,
      tone: tone,
    );
  }

  static CoachReply _consistency(CoachSnapshot s) {
    final lines = <String>[];

    if (s.habitsToday > 6) {
      lines.add(
        'You have ${s.habitsToday} habits scheduled today. Past about five, '
        'completion rates fall for almost everyone — not from laziness, but '
        'because a long list stops being a plan and becomes a wish.',
      );
    }

    if (s.worstWeekday != null && s.bestWeekday != null) {
      lines.add(
        'You keep ${s.bestWeekday}s well and lose ${s.worstWeekday}s. Moving '
        'or shrinking just the ${s.worstWeekday} schedule is the cheapest win '
        'available to you.',
      );
    }

    if (s.currentStreak > 0 && s.bestStreak > s.currentStreak) {
      lines.add(
        'Your best run was ${s.bestStreak} days; you are on ${s.currentStreak}. '
        'You have already proved the ceiling is higher than today.',
      );
    }

    if (s.correlation != null && s.correlation!.moreOnMissedDays) {
      lines.add(
        'On days you miss habits you average '
        '${ScreenTimeRules.formatDuration(s.correlation!.gap)} more screen time '
        'than on days you keep them, across '
        '${s.correlation!.sampleDays} days. That is a correlation, not a cause '
        '— but it is worth knowing which way it points.',
      );
    }

    if (s.focusMinutesWeek > 0) {
      lines.add(
        'You banked ${ScreenTimeRules.formatDuration(s.focusMinutesWeek)} of '
        'focus this week. Sessions are the most reliable lever here — a booked '
        'block gets kept far more often than an intention.',
      );
    }

    if (lines.isEmpty) {
      lines.add(
        'Keep the plan small and fixed for two more weeks. There is not enough '
        'history yet for me to find a lever worth pulling.',
      );
    }

    return CoachReply(
      headline: 'Getting more consistent',
      paragraphs: lines,
      metric: s.currentStreak > 0 ? '${s.currentStreak}' : null,
      metricLabel: 'DAY STREAK',
    );
  }

  static CoachReply _screenTime(CoachSnapshot s) {
    if (!s.screenTimeGranted) {
      return const CoachReply(
        headline: 'Screen time is off',
        paragraphs: [
          'Turn on usage access and I can tell you which categories your hours '
              'go to, and whether your heavy phone days line up with the days '
              'you miss habits.',
          'It stays on this device. It is not backed up and it is never '
              'uploaded.',
        ],
      );
    }

    final b = s.breakdown;
    if (b.isEmpty) {
      return const CoachReply(
        headline: 'Nothing collected yet',
        paragraphs: [
          'Usage access is on but no days have been recorded. Check back '
              'tomorrow.',
        ],
      );
    }

    final lines = <String>[];
    final perDay = b.dailyAverageMinutes;
    lines.add(
      'You average ${ScreenTimeRules.formatDuration(perDay)} on your phone a '
      'day over the last ${b.days} day${b.days == 1 ? '' : 's'}.',
    );

    final top = b.dominant;
    if (top != null) {
      final topPerDay = b.days > 0 ? top.minutes ~/ b.days : top.minutes;
      lines.add(
        'The biggest single category is ${top.category.label} at '
        '${ScreenTimeRules.formatDuration(topPerDay)} a day'
        '${top.topApp == null ? '' : ' — most of it in ${top.topApp!.displayName}'}.',
      );
    }

    if (s.focusScore.hasEnoughData) {
      lines.add(
        'That works out to a Focus Score of ${s.focusScore.value} out of 100: '
        '${s.focusScore.band.blurb.toLowerCase()}',
      );
    }

    final leisure = b.dominantLeisure;
    if (leisure != null && b.leisureMinutes > 0) {
      final leisurePerDay = b.days > 0
          ? b.leisureMinutes ~/ b.days
          : b.leisureMinutes;
      if (leisurePerDay >= 90) {
        lines.add(
          'If you wanted one concrete change: '
          '${leisure.topApp?.displayName ?? leisure.category.label} is where '
          'the time actually goes. Moving it off your home screen is a smaller '
          'ask than deleting it and works nearly as well.',
        );
      }
    }

    if (s.scoreTrend != null && s.scoreTrend!.abs() >= 5) {
      lines.add(
        s.scoreTrend! > 0
            ? 'Your score is up ${s.scoreTrend} points on the first half of '
                'this period. Whatever changed, it is working.'
            : 'Your score is down ${s.scoreTrend!.abs()} points on the first '
                'half of this period.',
      );
    }

    lines.add(
      'These categories are my guess from the app names. Tap any app to '
      'correct it — your answer sticks and I never overrule it.',
    );

    return CoachReply(
      headline: 'Where your hours go',
      paragraphs: lines,
      metric: s.focusScore.hasEnoughData ? '${s.focusScore.value}' : null,
      metricLabel: 'FOCUS SCORE',
      tone: s.focusScore.hasEnoughData && s.focusScore.value >= 60
          ? CoachTone.good
          : CoachTone.neutral,
    );
  }

  static CoachReply _today(CoachSnapshot s) {
    final lines = <String>[];

    if (s.overdueTasks > 0) {
      lines.add(
        'Start with the ${s.overdueTasks} overdue '
        'task${s.overdueTasks == 1 ? '' : 's'}. Late work costs more attention '
        'sitting undone than it does to finish.',
      );
    }

    if (s.habitsLeftToday > 0) {
      lines.add(
        'Then the ${s.habitsLeftToday} habit'
        '${s.habitsLeftToday == 1 ? '' : 's'} still open today.'
        '${s.currentStreak > 0 ? ' Your ${s.currentStreak}-day streak is riding on it.' : ''}',
      );
    }

    if (s.dueTodayTasks > 0) {
      lines.add(
        '${s.dueTodayTasks} task${s.dueTodayTasks == 1 ? ' is' : 's are'} due '
        'today.',
      );
    }

    if (lines.isEmpty) {
      return const CoachReply(
        headline: 'Nothing is owed',
        paragraphs: [
          'No overdue tasks, no habits left, nothing due. Start a focus block '
              'on something that matters to you, or take the evening.',
        ],
        tone: CoachTone.good,
      );
    }

    return CoachReply(
      headline: 'In this order',
      paragraphs: lines,
      metric: '${s.habitsLeftToday}',
      metricLabel: 'HABITS LEFT',
    );
  }

  static CoachReply _timing(CoachSnapshot s) {
    if (s.trackedDays < minDaysForPattern) {
      return CoachReply(
        headline: 'Not enough days yet',
        paragraphs: [
          'I need about $minDaysForPattern days before a weekday pattern is a '
              'pattern rather than a coincidence. You are at ${s.trackedDays}.',
        ],
      );
    }

    final lines = <String>[];
    if (s.bestWeekday != null) {
      lines.add('${s.bestWeekday} is your strongest day.');
    }
    if (s.worstWeekday != null) {
      lines.add(
        '${s.worstWeekday} is your weakest. Schedule the habits that matter '
        'most away from it, or give it a deliberately lighter plan — a day you '
        'reliably lose is a scheduling problem, not a willpower one.',
      );
    }
    if (s.strongestHabit != null) {
      lines.add(
        '"${s.strongestHabit}" is the one you almost never miss. Stacking a '
        'wobbly habit immediately after it is the single most reliable trick '
        'in habit forming.',
      );
    }

    if (lines.isEmpty) {
      lines.add('No weekday stands out from the others yet.');
    }

    return CoachReply(headline: 'Your shape of week', paragraphs: lines);
  }

  static CoachReply _goals(CoachSnapshot s) {
    if (s.activeGoals == 0) {
      return const CoachReply(
        headline: 'No active goals',
        paragraphs: [
          'Habits keep you moving; a goal tells you where. Even one, with a '
              'date on it, changes how the daily list reads.',
        ],
      );
    }

    final lines = <String>[
      'You have ${s.activeGoals} active goal${s.activeGoals == 1 ? '' : 's'}.',
    ];

    if (s.goalsBehind > 0) {
      lines.add(
        '${s.goalsBehind} '
        '${s.goalsBehind == 1 ? 'is' : 'are'} behind the pace needed to land on '
        'the target date. Either move the date or cut the scope — carrying a '
        'goal you have quietly stopped believing in costs more than dropping it.',
      );
    } else {
      lines.add('All of them are on or ahead of pace.');
    }

    return CoachReply(
      headline: 'Goals',
      paragraphs: lines,
      metric: '${s.activeGoals}',
      metricLabel: 'ACTIVE',
      tone: s.goalsBehind > 0 ? CoachTone.warn : CoachTone.good,
    );
  }
}
