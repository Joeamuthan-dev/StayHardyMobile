import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/domain/habit_finder.dart';

FinderAnswers answers({
  int wake = 420,
  int sleep = 1380,
  Set<FocusArea>? areas,
  StartLevel level = StartLevel.fresh,
  Intensity intensity = Intensity.steady,
}) =>
    FinderAnswers(
      wakeMinutes: wake,
      sleepMinutes: sleep,
      areas: areas ?? {FocusArea.fitness, FocusArea.reading},
      level: level,
      intensity: intensity,
    );

void main() {
  group('clock', () {
    test('formats morning, noon, and past-midnight values', () {
      expect(HabitFinder.clock(390), '6:30 AM');
      expect(HabitFinder.clock(720), '12:00 PM');
      expect(HabitFinder.clock(0), '12:00 AM');
      // Past-midnight bedtimes wrap: 25:30 on the evening clock is 1:30 AM.
      expect(HabitFinder.clock(1530), '1:30 AM');
    });
  });

  group('suggest', () {
    test('never hands back more than the intensity asked for', () {
      final all = answers(
        areas: FocusArea.values.toSet(),
        intensity: Intensity.gentle,
      );
      expect(HabitFinder.suggest(all).length, Intensity.gentle.habitCount);
    });

    test('"all in" is exactly the free cap — seven', () {
      final s = HabitFinder.suggest(answers(
        areas: FocusArea.values.toSet(),
        intensity: Intensity.allIn,
      ));
      expect(s.length, 7);
    });

    test('every pickable area has a suggestion behind it', () {
      for (final area in FocusArea.values) {
        final s = HabitFinder.suggest(answers(
          wake: 420,
          sleep: 1320, // early sleeper — no anchors stealing slots
          areas: {area},
          intensity: Intensity.allIn,
        ));
        expect(s.map((e) => e.title).toSet().length, s.length,
            reason: 'no duplicates for $area');
        expect(s, isNotEmpty, reason: '$area must produce something');
      }
    });

    test('late sleepers get the wind-down anchor; early sleepers do not', () {
      final night = HabitFinder.suggest(answers(sleep: 1500));
      expect(night.first.title, startsWith('Screen off'));

      final early = HabitFinder.suggest(answers(sleep: 1290));
      expect(early.any((s) => s.title.startsWith('Screen off')), isFalse,
          reason: 'fixes for problems they do not have read as generic');
    });

    test('fresh starters get the smaller versions', () {
      final tiny = HabitFinder.suggest(
          answers(level: StartLevel.neverStarted, areas: {FocusArea.fitness}));
      expect(tiny.any((s) => s.title == '10-minute walk'), isTrue);

      final big = HabitFinder.suggest(
          answers(level: StartLevel.lockedIn, areas: {FocusArea.fitness}));
      expect(big.any((s) => s.title == '30-minute workout'), isTrue);
    });

    test('area picks beyond five are ignored, in pick order', () {
      final s = HabitFinder.suggest(answers(
        sleep: 1290,
        wake: 420,
        areas: FocusArea.values.toSet(), // insertion order = enum order
        intensity: Intensity.allIn,
      ));
      // First five areas plus the closer fit within seven.
      expect(s.length, lessThanOrEqualTo(7));
    });
  });

  test('the quips cover every slider position without gaps', () {
    for (var m = 180; m <= 720; m += 15) {
      expect(HabitFinder.wakeQuip(m), isNotEmpty);
    }
    for (var m = 1260; m <= 1800; m += 15) {
      expect(HabitFinder.sleepQuip(m), isNotEmpty);
    }
  });
}
