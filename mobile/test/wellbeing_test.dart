import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/domain/app_categories.dart';
import 'package:stayhardy/src/domain/civil_date.dart';
import 'package:stayhardy/src/domain/coach_engine.dart';
import 'package:stayhardy/src/domain/digital_wellbeing.dart';
import 'package:stayhardy/src/domain/screen_time_rules.dart';

/// The screen-time intelligence, tested around what it refuses to claim.
///
/// The risk in this feature is not arithmetic, it is confidence: a score
/// computed from four minutes, a "pattern" from three days, or a category the
/// user has already corrected being re-guessed. Those are the tests that matter.
void main() {
  final day = CivilDate(2026, 8, 15);

  AppUsage app(String pkg, int minutes, {String? label}) => AppUsage(
        packageName: pkg,
        foregroundMs: minutes * 60000,
        launchCount: 1,
        appLabel: label,
      );

  ScreenDay screenDay(CivilDate d, List<AppUsage> apps) =>
      ScreenTimeRules.fold(d, apps, unlockCount: 10);

  group('classifying an app', () {
    test('knows the obvious ones', () {
      expect(AppTaxonomy.categorise('com.instagram.android'),
          UsageCategory.social);
      expect(AppTaxonomy.categorise('com.google.android.youtube'),
          UsageCategory.entertainment);
      expect(AppTaxonomy.categorise('com.whatsapp'),
          UsageCategory.communication);
      expect(AppTaxonomy.categorise('com.google.android.gm'),
          UsageCategory.productivity);
    });

    test('YouTube is not caught by a google-prefix rule', () {
      // The exact table is consulted before any keyword, specifically so this
      // does not become "Google app, therefore productivity".
      expect(AppTaxonomy.categorise('com.google.android.youtube').intent,
          UsageIntent.leisure);
    });

    test('falls back to keywords for apps it has never seen', () {
      expect(AppTaxonomy.categorise('com.someoem.launcher3'),
          UsageCategory.utility);
      expect(AppTaxonomy.categorise('com.random.puzzlegame'),
          UsageCategory.games);
      expect(AppTaxonomy.categorise('com.tiny.localbank'),
          UsageCategory.finance);
    });

    test('gives up honestly rather than guessing wildly', () {
      expect(AppTaxonomy.categorise('xyz.abc.def'), UsageCategory.other);
    });

    test('a user override always wins, even over the exact table', () {
      // Someone whose job is running an Instagram account. The app must never
      // overrule them, and this is the single most important rule in the file.
      final overrides = {'com.instagram.android': 'productivity'};
      expect(
        AppTaxonomy.categorise('com.instagram.android', overrides: overrides),
        UsageCategory.productivity,
      );
      expect(
        AppTaxonomy.isGuess('com.instagram.android', overrides: overrides),
        isFalse,
      );
    });

    test('knows when it is guessing', () {
      expect(AppTaxonomy.isGuess('com.instagram.android'), isFalse);
      expect(AppTaxonomy.isGuess('com.unknown.thing'), isTrue);
    });

    test('every assignable category is a real, non-placeholder bucket', () {
      expect(
        UsageCategory.assignable.any((c) => c.id == UsageCategory.other.id),
        isFalse,
        reason: '"Other" means undecided; choosing it would be '
            'indistinguishable from never having chosen',
      );
    });
  });

  group('the breakdown', () {
    test('sorts categories by time, largest first', () {
      final b = DigitalWellbeing.breakdown([
        screenDay(day, [
          app('com.instagram.android', 60),
          app('com.google.android.gm', 90),
          app('com.whatsapp', 30),
        ]),
      ]);

      expect(b.categories.first.category, UsageCategory.productivity);
      expect(b.categories.first.minutes, 90);
    });

    test('splits by intent', () {
      final b = DigitalWellbeing.breakdown([
        screenDay(day, [
          app('com.google.android.gm', 100), // invested
          app('com.whatsapp', 40), // neutral
          app('com.instagram.android', 60), // leisure
        ]),
      ]);

      expect(b.investedMinutes, 100);
      expect(b.neutralMinutes, 40);
      expect(b.leisureMinutes, 60);
      expect(b.discretionaryMinutes, 200);
    });

    test('keeps system time out of the split entirely', () {
      final b = DigitalWellbeing.breakdown([
        screenDay(day, [
          app('com.google.android.gm', 60),
          app('com.android.settings', 200),
        ]),
      ]);

      expect(b.systemMinutes, 200);
      expect(b.discretionaryMinutes, 60,
          reason: 'the launcher is not a choice the user made');
      expect(
        b.categories.any((c) => c.category.intent == UsageIntent.system),
        isFalse,
        reason: 'system never appears as a slice',
      );
    });

    test('merges an app across days into one row', () {
      final b = DigitalWellbeing.breakdown([
        screenDay(day, [app('com.instagram.android', 30)]),
        screenDay(day.addDays(1), [app('com.instagram.android', 45)]),
      ]);

      final social =
          b.categories.firstWhere((c) => c.category == UsageCategory.social);
      expect(social.apps.length, 1);
      expect(social.minutes, 75);
      expect(b.days, 2);
    });

    test('names the biggest leisure app, which is what a nudge is about', () {
      final b = DigitalWellbeing.breakdown([
        screenDay(day, [
          app('com.instagram.android', 20, label: 'Instagram'),
          app('com.google.android.youtube', 90, label: 'YouTube'),
        ]),
      ]);

      expect(b.dominantLeisure!.topApp!.displayName, 'YouTube');
    });
  });

  group('the Focus Score', () {
    test('is withheld below the evidence floor', () {
      final b = DigitalWellbeing.breakdown([
        screenDay(day, [app('com.instagram.android', 5)]),
      ]);
      final score = DigitalWellbeing.score(b);

      expect(score.hasEnoughData, isFalse,
          reason: 'a ratio from five minutes is noise wearing a measurement');
      expect(score.value, 0);
    });

    test('is 100 when every discretionary minute was invested', () {
      final b = DigitalWellbeing.breakdown([
        screenDay(day, [app('com.google.android.gm', 120)]),
      ]);
      expect(DigitalWellbeing.score(b).value, 100);
    });

    test('is 0 when none of it was', () {
      final b = DigitalWellbeing.breakdown([
        screenDay(day, [app('com.instagram.android', 120)]),
      ]);
      expect(DigitalWellbeing.score(b).value, 0);
    });

    test('counts messaging as exactly half', () {
      // The whole reason UsageIntent.neutral exists. An hour of WhatsApp is
      // half a standup and half a group chat, and weighting it either way
      // would make the headline a lie for half the userbase.
      final b = DigitalWellbeing.breakdown([
        screenDay(day, [app('com.whatsapp', 120)]),
      ]);
      expect(DigitalWellbeing.score(b).value, 50);
    });

    test('is not moved by system time', () {
      final withSystem = DigitalWellbeing.breakdown([
        screenDay(day, [
          app('com.google.android.gm', 60),
          app('com.instagram.android', 60),
          app('com.android.settings', 300),
        ]),
      ]);
      final without = DigitalWellbeing.breakdown([
        screenDay(day, [
          app('com.google.android.gm', 60),
          app('com.instagram.android', 60),
        ]),
      ]);

      expect(DigitalWellbeing.score(withSystem).value,
          DigitalWellbeing.score(without).value);
    });

    test('bands describe rather than grade', () {
      expect(FocusScore.bandFor(85), WellbeingBand.deepWork);
      expect(FocusScore.bandFor(50), WellbeingBand.balanced);
      expect(FocusScore.bandFor(30), WellbeingBand.leaning);
      expect(FocusScore.bandFor(5), WellbeingBand.mostlyLeisure);

      for (final band in WellbeingBand.values) {
        for (final word in ['bad', 'poor', 'fail', 'wasted', 'lazy']) {
          expect(
            '${band.label} ${band.blurb}'.toLowerCase().contains(word),
            isFalse,
            reason: 'the score describes a day, it does not grade a person',
          );
        }
      }
    });

    test('a user override moves the score', () {
      final days = [
        screenDay(day, [app('com.google.android.youtube', 120)]),
      ];

      expect(DigitalWellbeing.score(DigitalWellbeing.breakdown(days)).value, 0);
      expect(
        DigitalWellbeing.score(DigitalWellbeing.breakdown(
          days,
          overrides: {'com.google.android.youtube': 'learning'},
        )).value,
        100,
      );
    });
  });

  group('the daily trend', () {
    test('leaves thin days unscored rather than scoring them zero', () {
      final scores = DigitalWellbeing.daily([
        screenDay(day, [app('com.instagram.android', 2)]),
        screenDay(day.addDays(1), [app('com.google.android.gm', 120)]),
      ]);

      expect(scores.first.score, isNull,
          reason: 'a gap is honest; a zero is a claim');
      expect(scores.last.score, 100);
    });

    test('refuses a trend without enough scored days', () {
      final scores = DigitalWellbeing.daily([
        screenDay(day, [app('com.google.android.gm', 60)]),
        screenDay(day.addDays(1), [app('com.google.android.gm', 60)]),
      ]);
      expect(DigitalWellbeing.trend(scores), isNull);
    });

    test('reports a real improvement once there is enough to compare', () {
      final days = <ScreenDay>[
        for (var i = 0; i < 3; i++)
          screenDay(day.addDays(i), [app('com.instagram.android', 120)]),
        for (var i = 3; i < 6; i++)
          screenDay(day.addDays(i), [app('com.google.android.gm', 120)]),
      ];

      final trend = DigitalWellbeing.trend(DigitalWellbeing.daily(days));
      expect(trend, isNotNull);
      expect(trend! > 0, isTrue);
    });
  });

  group('the advisor', () {
    CoachHabit habit(String title, {int rate = 80, int streak = 10,
        String category = 'General', String? reminder}) =>
        CoachHabit(
          title: title,
          category: category,
          rate: rate,
          streak: streak,
          dueToday: true,
          doneToday: false,
          reminder: reminder,
        );

    test('ranks overdue work above everything else', () {
      // It is already owed, already decided, and the cheapest thing to clear.
      const s = CoachSnapshot(
        trackedDays: 40,
        habitRate: 40,
        habitsToday: 9,
        overdueTasks: 4,
      );
      final advice = CoachEngine.recommendations(s);
      expect(advice.first.title, 'Clear the backlog first');
    });

    test('every recommendation carries evidence and an action', () {
      // Advice without a number behind it is a horoscope.
      const s = CoachSnapshot(
        trackedDays: 40,
        habitRate: 45,
        habitsToday: 9,
        overdueTasks: 2,
        weakestHabit: 'Run',
        weakestHabitRate: 20,
        worstWeekday: 'Tuesday',
        goalsBehind: 1,
      );
      for (final a in CoachEngine.recommendations(s)) {
        expect(a.why.trim(), isNotEmpty);
        expect(a.action.trim(), isNotEmpty);
        expect(RegExp(r'\d').hasMatch('${a.why}${a.title}'), isTrue,
            reason: '"${a.title}" states no number');
      }
    });

    test('suggests stacking a weak habit onto a strong one', () {
      final s = CoachSnapshot(
        trackedDays: 40,
        habitRate: 60,
        habits: [habit('Meditate', rate: 95), habit('Run', rate: 30)],
      );
      final titles =
          CoachEngine.recommendations(s).map((a) => a.title).join(' ');
      expect(titles.contains('Stack "Run" onto "Meditate"'), isTrue);
    });

    test('says nothing about the phone without screen-time data', () {
      const s = CoachSnapshot(
        trackedDays: 40,
        habitRate: 60,
        leisureMinutesPerDay: 300,
        screenTimeGranted: false,
      );
      final titles =
          CoachEngine.recommendations(s).map((a) => a.title).join(' ');
      expect(titles.toLowerCase().contains('further away'), isFalse,
          reason: 'the minutes are meaningless when access was never granted');
    });

    test('refuses to advise before there is a week of history', () {
      final reply = CoachEngine.answer(
        CoachTopic.improve,
        const CoachSnapshot(trackedDays: 3, overdueTasks: 5),
      );
      expect(reply.headline, 'Give it a week first');
      expect(reply.advice, isEmpty);
    });

    test('says so plainly when nothing needs changing', () {
      final reply = CoachEngine.answer(
        CoachTopic.improve,
        // Focus minutes included deliberately: without them the "book a focus
        // block" tip fires, which is correct behaviour and not what this test
        // is about.
        const CoachSnapshot(
          trackedDays: 40,
          habitRate: 92,
          habitsToday: 3,
          focusMinutesWeek: 180,
        ),
      );
      expect(reply.tone, CoachTone.good);
      expect(reply.advice, isEmpty);
    });

    test('builds a routine only from habits the user actually has', () {
      final s = CoachSnapshot(
        trackedDays: 40,
        habits: [
          habit('Run', category: 'Fitness'),
          habit('Read', category: 'Learning'),
          habit('Journal', category: 'Mindset'),
        ],
      );
      final reply = CoachEngine.answer(CoachTopic.routine, s);
      final titles = reply.routine.map((b) => b.title).toList();

      expect(titles.contains('Run'), isTrue);
      expect(titles.contains('Read'), isTrue);
      expect(titles.contains('Journal'), isTrue);
      // Placed by what each habit is for, not dumped in one slot.
      expect(reply.routine.map((b) => b.when).toSet().length, greaterThan(1));
    });

    test('a habit with a reminder is placed by its own time', () {
      final s = CoachSnapshot(
        trackedDays: 40,
        habits: [habit('Late walk', category: 'Fitness', reminder: '21:00')],
      );
      final reply = CoachEngine.answer(CoachTopic.routine, s);
      expect(reply.routine.first.when, 'Evening',
          reason: 'Fitness defaults to Morning, but the user said 21:00');
    });

    test('has nothing to build a routine from without habits', () {
      final reply = CoachEngine.answer(
        CoachTopic.routine,
        const CoachSnapshot(trackedDays: 40),
      );
      expect(reply.routine, isEmpty);
      expect(reply.headline, 'Nothing to build with yet');
    });

    test('routes the new questions', () {
      expect(CoachEngine.route('build me a routine'), CoachTopic.routine);
      expect(CoachEngine.route('what should I change'), CoachTopic.improve);
      expect(CoachEngine.route('what is stealing my time'), CoachTopic.wasting);
      expect(CoachEngine.route('what am I good at'), CoachTopic.strengths);
    });
  });

  group('the coach', () {
    test('says it has nothing yet rather than inventing a briefing', () {
      final reply = CoachEngine.greeting(const CoachSnapshot(trackedDays: 1));
      expect(reply.headline, 'Not much to go on yet');
    });

    test('refuses to name a weak spot in the first week', () {
      final reply = CoachEngine.answer(
        CoachTopic.lagging,
        const CoachSnapshot(trackedDays: 4, weakestHabit: 'Run', weakestHabitRate: 10),
      );
      expect(reply.headline, 'Too early to say');
      expect(reply.paragraphs.join().contains('Run'), isFalse);
    });

    test('names the actual weak habit once there is history', () {
      final reply = CoachEngine.answer(
        CoachTopic.lagging,
        const CoachSnapshot(
          trackedDays: 30,
          weakestHabit: 'Cold shower',
          weakestHabitRate: 22,
        ),
      );
      expect(reply.paragraphs.join().contains('Cold shower'), isTrue);
      expect(reply.paragraphs.join().contains('22%'), isTrue);
    });

    test('refuses a weekday pattern below the evidence floor', () {
      final reply = CoachEngine.answer(
        CoachTopic.timing,
        const CoachSnapshot(trackedDays: 5, bestWeekday: 'Monday'),
      );
      expect(reply.headline, 'Not enough days yet');
    });

    test('explains the permission instead of guessing about the phone', () {
      final reply = CoachEngine.answer(
        CoachTopic.screenTime,
        const CoachSnapshot(trackedDays: 30),
      );
      expect(reply.headline, 'Screen time is off');
      expect(reply.paragraphs.join().contains('never uploaded'), isTrue);
    });

    test('routes plain questions to a topic', () {
      expect(CoachEngine.route('where am I lagging?'), CoachTopic.lagging);
      expect(CoachEngine.route('too much instagram?'), CoachTopic.screenTime);
      expect(CoachEngine.route('how do I get more consistent'),
          CoachTopic.consistency);
      expect(CoachEngine.route('am I on track'), CoachTopic.goals);
    });

    test('an unrecognised question is answered helpfully, not refused', () {
      // "I don't have a rule for that" was a dead end that made the chat feel
      // like a form validator. The fallback now says plainly that the message
      // was not fully understood — honesty stays — and then gives the
      // briefing anyway, so no message ever ends nowhere.
      final reply = CoachEngine.converse(
        'what is the capital of France',
        const CoachSnapshot(trackedDays: 30, habitRate: 70, habitsToday: 3),
      );
      expect(reply.headline, "I'm not sure I caught that");
      expect(reply.paragraphs.join().contains('where you stand'), isTrue);
      expect(reply.paragraphs.join().contains('70%'), isTrue,
          reason: 'the fallback still answers from real data');
    });

    test('greets back instead of refusing a greeting', () {
      final reply = CoachEngine.converse(
        'hi',
        const CoachSnapshot(trackedDays: 30, habitsToday: 4, habitsDoneToday: 1),
      );
      expect(reply.headline, 'Hey');
      expect(reply.paragraphs.join().contains('3 habits'), isTrue);
    });

    test('a greeting inside a longer question is not small talk', () {
      // "which app is hitting me hardest" contains "hi" twice. Whole-message
      // matching keeps small talk from swallowing real questions.
      final reply = CoachEngine.converse(
        'which app is hitting me hardest on screen time',
        const CoachSnapshot(trackedDays: 30),
      );
      expect(reply.headline, isNot('Hey'));
    });

    test('answers about a habit named in the message', () {
      final s = CoachSnapshot(
        trackedDays: 30,
        habits: [
          CoachHabit(
            title: 'Morning workout',
            category: 'Fitness',
            rate: 88,
            streak: 12,
            dueToday: true,
            doneToday: false,
          ),
        ],
      );
      final reply = CoachEngine.converse('how is my workout going', s);
      expect(reply.headline, 'Morning workout');
      expect(reply.paragraphs.join().contains('88%'), isTrue);
      expect(reply.paragraphs.join().contains('12-day streak'), isTrue);
      expect(reply.paragraphs.join().contains('Still open today'), isTrue);
    });

    test('scored routing picks the strongest topic, not the first keyword', () {
      // Carries signals for several topics; the phone signals outnumber them.
      expect(
        CoachEngine.route(
            'is my phone and instagram scrolling behind my bad days'),
        CoachTopic.screenTime,
      );
    });

    test('every number it states is one it was given', () {
      // The point of a deterministic coach: no sentence may contain a figure
      // that is not in the snapshot.
      const snapshot = CoachSnapshot(
        trackedDays: 40,
        habitRate: 73,
        currentStreak: 9,
        habitsToday: 5,
        habitsDoneToday: 2,
        overdueTasks: 3,
      );
      final reply = CoachEngine.answer(CoachTopic.briefing, snapshot);
      final body = reply.paragraphs.join(' ');

      expect(body.contains('73%'), isTrue);
      expect(body.contains('40 days'), isTrue);
      expect(body.contains('9 days'), isTrue);
      expect(body.contains('3 tasks'), isTrue);
    });

    test('a completed day is congratulated, not padded with advice', () {
      final reply = CoachEngine.answer(
        CoachTopic.today,
        const CoachSnapshot(trackedDays: 30, habitsToday: 4, habitsDoneToday: 4),
      );
      expect(reply.headline, 'Nothing is owed');
      expect(reply.tone, CoachTone.good);
    });
  });
}
