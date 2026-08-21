import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/stats_repository.dart';

/// Where effort goes, and which way it is moving.
///
/// The risk in a trend badge is claiming a direction from nothing. Every test
/// here is about the cases where it must stay silent.
void main() {
  CategoryStat stat({
    int habits = 0,
    int tasks = 0,
    int previous = 0,
  }) =>
      CategoryStat(
        category: 'Fitness',
        habitCompletions: habits,
        taskCompletions: tasks,
        previousTotal: previous,
      );

  group('effort per category', () {
    test('counts habits and tasks together', () {
      // The old version counted check-ins only, so a category someone was
      // pouring task work into read as empty.
      expect(stat(habits: 4, tasks: 3).completions, 7);
    });

    test('a task-only category is still real effort', () {
      expect(stat(tasks: 5).completions, 5);
    });
  });

  group('the trend', () {
    test('says nothing without a baseline worth dividing by', () {
      // Everything is "up infinitely" from zero, and a young account with two
      // check-ins last month is not "up 300%" — it is a new habit.
      expect(stat(habits: 9, previous: 0).changePercent, isNull);
      expect(stat(habits: 9, previous: 2).changePercent, isNull);
      expect(stat(habits: 40, previous: CategoryStat.minBaseline - 1)
          .changePercent, isNull);
      expect(stat(habits: 9, previous: 0).isImproving, isFalse);
    });

    test('reports a real rise', () {
      final s = stat(habits: 20, previous: 10);
      expect(s.changePercent, 100);
      expect(s.isImproving, isTrue);
      expect(s.isSlipping, isFalse);
    });

    test('writes a big change as a multiple, not a percentage', () {
      // "up 392%" is arithmetically true and communicates nothing except that
      // the app will print any number.
      expect(stat(habits: 50, previous: 10).changeLabel, '5.0×');
      expect(stat(habits: 13, previous: 10).changeLabel, '30%');
    });

    test('reports a real fall', () {
      final s = stat(habits: 5, previous: 10);
      expect(s.changePercent, -50);
      expect(s.isSlipping, isTrue);
      expect(s.isImproving, isFalse);
    });

    test('a small wobble is not a trend', () {
      // 10 → 11 is noise. Telling somebody they are "improving in Fitness" on
      // one extra check-in makes every future claim worth less.
      final s = stat(habits: 11, previous: 10);
      expect(s.changePercent, 10);
      expect(s.isImproving, isFalse);
      expect(s.isSlipping, isFalse);
    });

    test('flat is neither', () {
      final s = stat(habits: 10, previous: 10);
      expect(s.changePercent, 0);
      expect(s.isImproving, isFalse);
      expect(s.isSlipping, isFalse);
    });

    test('the threshold is symmetric', () {
      expect(stat(habits: 115, previous: 100).isImproving, isTrue);
      expect(stat(habits: 85, previous: 100).isSlipping, isTrue);
      expect(stat(habits: 114, previous: 100).isImproving, isFalse);
      expect(stat(habits: 86, previous: 100).isSlipping, isFalse);
    });
  });
}
