/// The habit finder: five taps in, a personal routine out.
///
/// Most people do not lack discipline, they lack a starting list — "what
/// should I even track?" is the question that stops habit apps before day
/// one. The finder asks five select-only questions (sliders and chips, no
/// typing, no wrong answers) and assembles a routine from a curated
/// catalogue, sized to how hard the person wants to go and anchored to when
/// they are actually awake.
///
/// Pure: answers in, suggestions out. The screen owns the taps; the
/// repository owns the writes; the free cap is checked at add time exactly
/// like any other create.
library;

/// What someone wants to work on. Every entry MUST have a suggestion in
/// [HabitFinder.suggest] — an area you can pick but never hear about again
/// is a broken promise.
enum FocusArea {
  fitness('Fitness', '💪'),
  health('Health', '❤️'),
  mind('Calm mind', '🧘'),
  learning('Learning', '📚'),
  studies('Studies', '🎓'),
  coding('Coding', '💻'),
  language('A language', '🗣️'),
  career('Career', '💼'),
  business('Business', '📈'),
  money('Money', '💰'),
  focus('Focus', '🎯'),
  reading('Reading', '📖'),
  gratitude('Gratitude', '🙏'),
  family('Family time', '🏠');

  const FocusArea(this.label, this.emoji);

  final String label;
  final String emoji;

  /// Focus beats breadth: the finder accepts at most five.
  static const maxSelected = 5;
}

enum StartLevel {
  neverStarted('Never really started'),
  fresh('Just starting out'),
  onAndOff('I start, then stop'),
  steady('Fairly consistent'),
  lockedIn('Locked in — want more');

  const StartLevel(this.label);
  final String label;

  /// Whether suggestions should be sized down to their smallest honest form.
  bool get wantsTiny => this == neverStarted || this == fresh;
}

enum Intensity {
  gentle('Ease me in', 3),
  steady('A real push', 5),
  allIn('All in', 7);

  const Intensity(this.label, this.habitCount);

  final String label;

  /// How many habits the finder hands back. Seven is the free cap on
  /// purpose: the biggest routine the finder builds is exactly the routine
  /// a free account can hold.
  final int habitCount;
}

class FinderAnswers {
  const FinderAnswers({
    required this.wakeMinutes,
    required this.sleepMinutes,
    required this.areas,
    required this.level,
    required this.intensity,
  });

  /// Minutes past midnight, e.g. 6:30am = 390.
  final int wakeMinutes;

  /// Minutes past midnight of the SAME evening's clock — past-midnight
  /// bedtimes keep counting (1:30am = 1530), so "later" is always a bigger
  /// number.
  final int sleepMinutes;

  final Set<FocusArea> areas;
  final StartLevel level;
  final Intensity intensity;
}

class HabitSuggestion {
  const HabitSuggestion({
    required this.title,
    required this.category,
    required this.reason,
  });

  final String title;

  /// A category name `HabitCategories.resolve` understands.
  final String category;

  /// One sentence of "why this, for you" — the personal part.
  final String reason;
}

abstract final class HabitFinder {
  /// Minutes past midnight → "6:30 AM" (values ≥ 24h wrap: 1530 → "1:30 AM").
  static String clock(int minutes) {
    final m = minutes % 1440;
    final h24 = m ~/ 60;
    final min = (m % 60).toString().padLeft(2, '0');
    final h12 = h24 % 12 == 0 ? 12 : h24 % 12;
    return '$h12:$min ${h24 < 12 ? 'AM' : 'PM'}';
  }

  /// The wake slider's running commentary. Gamification with a wink — sharp
  /// enough to be fun, never mean enough to make someone lie to the slider.
  static String wakeQuip(int minutes) => switch (minutes) {
        < 300 => 'Before the sun. We have questions, but respect.',
        < 360 => 'Early bird. The day is yours before anyone asks for it.',
        < 420 => 'The classic winner’s window.',
        < 480 => 'Perfectly reasonable. The world wakes with you.',
        < 540 => 'The snooze button is winning this relationship.',
        < 600 => 'The morning called. It went to voicemail.',
        < 660 => 'Brunch is not a breakfast.',
        _ => 'Good afternoon.',
      };

  /// The bedtime slider's commentary, tuned for the night owls.
  static String sleepQuip(int minutes) => switch (minutes) {
        < 1320 => 'Grandma bedtime — and grandma is thriving.',
        < 1380 => 'Textbook. Boring. Devastatingly effective.',
        < 1440 => 'Cutting it close to tomorrow.',
        < 1500 => 'Officially tomorrow. Batman hours.',
        < 1560 => 'The owls are asking YOU to log off.',
        _ => 'You and the sunrise are on a collision course.',
      };

  /// The routine for these answers: anchors first, then the chosen areas in
  /// the order they were picked, capped at the intensity's count. Never
  /// returns duplicates.
  static List<HabitSuggestion> suggest(FinderAnswers a) {
    final tiny = a.level.wantsTiny;
    final out = <HabitSuggestion>[];
    final wakeAt = clock(a.wakeMinutes);

    // Sleep anchor first: every other habit inherits its odds from sleep.
    // Someone up past 11 gets a wind-down; early sleepers skip it —
    // suggesting fixes for problems they don't have reads as generic.
    if (a.sleepMinutes >= 1380) {
      final target = a.sleepMinutes >= 1500 ? '12' : '11';
      out.add(HabitSuggestion(
        title: 'Screen off by $target',
        category: 'Health',
        reason: 'You sleep around ${clock(a.sleepMinutes)} — the last hour '
            'of scrolling is where tomorrow is lost.',
      ));
    }
    if (a.wakeMinutes >= 480) {
      out.add(HabitSuggestion(
        title: 'Up by ${clock(a.wakeMinutes - 30)}',
        category: 'Growth',
        reason: 'Half an hour earlier than your current $wakeAt — one anchor '
            'time makes every other habit easier to place.',
      ));
    }

    final byArea = <FocusArea, HabitSuggestion>{
      FocusArea.fitness: HabitSuggestion(
        title: tiny ? '10-minute walk' : '30-minute workout',
        category: 'Fitness',
        reason: tiny
            ? 'Small enough to do on the worst day — that is what makes '
                'it stick.'
            : 'Best soon after $wakeAt, before the day starts negotiating.',
      ),
      FocusArea.health: const HabitSuggestion(
        title: 'Drink 2L of water',
        category: 'Health',
        reason: 'The cheapest health habit there is, and the easiest to '
            'keep visible.',
      ),
      FocusArea.mind: HabitSuggestion(
        title: tiny ? '5-minute meditation' : '15-minute meditation',
        category: 'Mindset',
        reason: 'Right after waking at $wakeAt — before the phone gets the '
            'first word.',
      ),
      FocusArea.learning: HabitSuggestion(
        title: tiny ? 'Learn one new thing' : '30 minutes of learning',
        category: 'Learning',
        reason: 'Compounds quietly — a year of this is unrecognisable.',
      ),
      FocusArea.studies: HabitSuggestion(
        title: tiny ? '25 minutes of study' : 'Two study blocks',
        category: 'Learning',
        reason: 'Scheduled study beats mood-based study every week of the '
            'year.',
      ),
      FocusArea.coding: HabitSuggestion(
        title: tiny ? '30 minutes of code' : 'One hour of code',
        category: 'Work',
        reason: 'Daily beats weekend marathons — the streak is the skill.',
      ),
      FocusArea.language: const HabitSuggestion(
        title: '15 minutes of language practice',
        category: 'Learning',
        reason: 'Languages are won by frequency, not duration.',
      ),
      FocusArea.career: const HabitSuggestion(
        title: 'One step toward the job',
        category: 'Work',
        reason: 'An application, a message, a portfolio piece — one '
            'concrete move a day compounds fast.',
      ),
      FocusArea.business: const HabitSuggestion(
        title: 'Review the numbers',
        category: 'Work',
        reason: 'Ten minutes with yesterday’s numbers, every day — '
            'nothing surprises a founder who looks.',
      ),
      FocusArea.money: const HabitSuggestion(
        title: 'Track every rupee spent',
        category: 'Finance',
        reason: 'Awareness is the whole trick — money leaks stop when they '
            'are written down.',
      ),
      FocusArea.focus: const HabitSuggestion(
        title: 'One deep work block',
        category: 'Work',
        reason: 'One focused block a day outworks a scattered eight hours. '
            'The Focus timer counts it.',
      ),
      FocusArea.reading: HabitSuggestion(
        title: tiny ? 'Read 10 pages' : 'Read 20 pages',
        category: 'Learning',
        reason: 'A page count beats a time goal — you can see the finish '
            'from the start.',
      ),
      FocusArea.gratitude: const HabitSuggestion(
        title: 'Write three gratitudes',
        category: 'Mindset',
        reason: 'Two minutes that reliably bends the whole day’s '
            'reading of itself.',
      ),
      FocusArea.family: const HabitSuggestion(
        title: 'Real time with family',
        category: 'Social',
        reason: 'Phones down, twenty minutes — the habit nobody regrets.',
      ),
    };

    for (final area in a.areas.take(FocusArea.maxSelected)) {
      final s = byArea[area];
      if (s != null && !out.any((e) => e.title == s.title)) out.add(s);
    }

    // Everyone gets the closer if there is room: a day reviewed is a day
    // that teaches something.
    if (out.length < a.intensity.habitCount) {
      out.add(const HabitSuggestion(
        title: 'Plan tomorrow tonight',
        category: 'Mindset',
        reason: 'Two minutes before bed decides the whole next morning.',
      ));
    }

    return out.take(a.intensity.habitCount).toList(growable: false);
  }
}
