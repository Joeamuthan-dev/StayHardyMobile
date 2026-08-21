import 'package:drift/drift.dart' hide isNull, isNotNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/enums.dart';
import 'package:stayhardy/src/data/habit_repository.dart';
import 'package:stayhardy/src/data/mood_repository.dart';
import 'package:stayhardy/src/domain/civil_date.dart';
import 'package:stayhardy/src/domain/focus_rules.dart';
import 'package:stayhardy/src/domain/mood_rules.dart';
import 'package:stayhardy/src/theme/aura_tokens.dart';
import 'package:stayhardy/src/theme/habit_categories.dart';

/// Mood tracking, tested around what it refuses to say.
///
/// The risk in a mood feature is not arithmetic — it is a chart that asserts
/// something about how somebody is doing on the strength of four taps. Every
/// threshold here exists to stop that, so these are the tests that matter.
void main() {
  final today = CivilDate(2026, 8, 15);

  MoodEntry entry(int daysBack, int score) =>
      MoodEntry(date: today.addDays(-daysBack), score: score);

  group('the scale', () {
    test('clamps out-of-range scores rather than throwing', () {
      expect(MoodLevel.fromScore(0), MoodLevel.terrible);
      expect(MoodLevel.fromScore(9), MoodLevel.excellent);
    });

    test('labels are plain rather than clinical', () {
      // This feature must never read as a diagnosis.
      for (final level in MoodLevel.values) {
        for (final word in ['depress', 'anxious', 'disorder', 'unwell']) {
          expect(level.label.toLowerCase().contains(word), isFalse);
        }
      }
    });
  });

  group('the summary', () {
    test('withholds an average until there is enough to average', () {
      final s = MoodRules.summarise([entry(1, 5), entry(0, 1)]);
      expect(s.average, isNull);
      expect(s.entries, hasLength(2));
    });

    test('averages once past the floor', () {
      final s = MoodRules.summarise([entry(2, 4), entry(1, 2), entry(0, 3)]);
      expect(s.average, closeTo(3.0, 0.001));
    });

    test('refuses a trend without enough entries', () {
      final s = MoodRules.summarise([
        for (var i = 0; i < 4; i++) entry(i, 5 - i),
      ]);
      expect(s.trend, isNull);
    });

    test('refuses a trend that is only noise', () {
      // Six entries, but the two halves differ by a rounding error. Telling
      // somebody their mood is "down" on this would be indefensible.
      final s = MoodRules.summarise([
        entry(5, 3), entry(4, 3), entry(3, 3),
        entry(2, 3), entry(1, 3), entry(0, 4),
      ]);
      expect(s.trend, isNull);
    });

    test('reports a real move', () {
      final s = MoodRules.summarise([
        entry(5, 2), entry(4, 2), entry(3, 1),
        entry(2, 4), entry(1, 5), entry(0, 5),
      ]);
      expect(s.trend, isNotNull);
      expect(s.trend! > 0, isTrue);
    });

    test('names no weekday below the evidence floor', () {
      final s = MoodRules.summarise([
        for (var i = 0; i < 10; i++) entry(i, i.isEven ? 5 : 1),
      ]);
      expect(s.bestDay, isNull);
      expect(s.worstDay, isNull);
    });
  });

  group('mood against habits', () {
    MoodVsHabits day(int back, int score, double? rate) => MoodVsHabits(
          date: today.addDays(-back),
          score: score,
          habitRate: rate,
        );

    test('says nothing without enough days on both sides', () {
      final link = MoodRules.link([
        day(0, 5, 1.0),
        day(1, 5, 1.0),
        day(2, 1, 0.0),
      ]);
      expect(link, isNull, reason: 'only one low day');
    });

    test('says nothing when the gap is not material', () {
      final link = MoodRules.link([
        for (var i = 0; i < 3; i++) day(i, 5, 0.80),
        for (var i = 3; i < 6; i++) day(i, 1, 0.75),
      ]);
      expect(link, isNull);
    });

    test('reports a real gap', () {
      final link = MoodRules.link([
        for (var i = 0; i < 3; i++) day(i, 5, 0.90),
        for (var i = 3; i < 6; i++) day(i, 1, 0.30),
      ]);
      expect(link, isNotNull);
      expect(link!.goodMoodHabitRate, 90);
      expect(link.lowMoodHabitRate, 30);
      expect(link.keepsMoreOnGoodDays, isTrue);
    });

    test('does not hide a gap that runs the other way', () {
      // Some people work hardest when they feel worst. Reporting only the
      // expected direction would be telling them what they want to hear.
      final link = MoodRules.link([
        for (var i = 0; i < 3; i++) day(i, 5, 0.20),
        for (var i = 3; i < 6; i++) day(i, 1, 0.90),
      ]);
      expect(link, isNotNull);
      expect(link!.keepsMoreOnGoodDays, isFalse);
    });

    test('ignores days with nothing scheduled rather than scoring them zero', () {
      final link = MoodRules.link([
        for (var i = 0; i < 3; i++) day(i, 5, null),
        for (var i = 3; i < 6; i++) day(i, 1, 0.30),
      ]);
      expect(link, isNull, reason: 'the good-mood side has no usable days');
    });
  });

  group('storing a reading', () {
    late AppDatabase db;
    late MoodRepository repo;

    setUp(() {
      db = AppDatabase.forTesting(NativeDatabase.memory());
      repo = MoodRepository(db, HabitRepository(db));
    });

    tearDown(() async => db.close());

    test('records and reads back a day', () async {
      await repo.log(4, on: today);
      final e = await repo.entryFor(today);
      expect(e!.score, 4);
      expect(e.level, MoodLevel.good);
    });

    test('logging twice on one day overwrites rather than duplicating', () async {
      // `mood_logs` is unique on log_date. Changing your mind an hour later is
      // normal use, not an error, and a second row would break the average.
      await repo.log(2, on: today);
      await repo.log(5, on: today);

      final rows = await db.select(db.moodLogs).get();
      expect(rows.where((r) => r.deletedAt == null), hasLength(1));
      expect((await repo.entryFor(today))!.score, 5);
    });

    test('clamps a score outside the scale', () async {
      await repo.log(99, on: today);
      expect((await repo.entryFor(today))!.score, 5);
    });

    test('is off until switched on', () async {
      final view = await repo.watch(enabled: false).first;
      expect(view.enabled, isFalse);
      expect(view.summary.isEmpty, isTrue);
    });

    test('pairs readings with that day\'s habit completion', () async {
      await db.into(db.habits).insert(HabitsCompanion.insert(
            id: 'h',
            title: 'Run',
            startDate: '2026-01-01',
            scheduleKind: Value(ScheduleKind.daily.value),
            createdAt: 1,
            updatedAt: 1,
          ));
      await db.into(db.habitLogs).insert(HabitLogsCompanion.insert(
            id: 'l',
            habitId: 'h',
            logDate: today.iso,
            loggedAt: 1,
            createdAt: 1,
            updatedAt: 1,
          ));
      await repo.log(5, on: today);

      final view = await repo.load(on: today);
      expect(view.loggedToday, isTrue);
      expect(view.summary.entries, hasLength(1));
    });
  });

  group('custom categories', () {
    test('a known name resolves to its own category', () {
      expect(HabitCategories.resolve('Fitness').name, 'Fitness');
      expect(HabitCategories.resolve('fitness').name, 'Fitness');
    });

    test('free text keeps the user\'s own words', () {
      // The whole point of typing one. Flattening "Guitar" to "Custom" is what
      // the previous resolve did, and it made the feature pointless.
      final c = HabitCategories.resolve('Guitar');
      expect(c.name, 'Guitar');
      expect(c.icon, HabitCategories.custom.icon);
    });

    test('trims what the user typed', () {
      expect(HabitCategories.resolve('  Spanish  ').name, 'Spanish');
    });

    test('empty and null fall back to General, not to Custom', () {
      expect(HabitCategories.resolve(null).name, 'General');
      expect(HabitCategories.resolve('   ').name, 'General');
    });

    test('isNamed separates the fifteen from free text', () {
      expect(HabitCategories.isNamed('Health'), isTrue);
      expect(HabitCategories.isNamed('Guitar'), isFalse);
      expect(HabitCategories.isNamed(null), isFalse);
    });

    test('the picker offers fifteen real categories, not the placeholder', () {
      // "Custom" is a door, not a category. Offering it alongside real ones
      // files a habit under the literal word "Custom".
      expect(HabitCategories.named, hasLength(15));
      expect(HabitCategories.named.contains(HabitCategories.custom), isFalse);
      expect(HabitCategories.all, hasLength(16));
    });

    test('a custom category takes the accent in both themes', () {
      // Falls through AuraTokens.category's fallback, so it survives a theme
      // swap rather than being a stored hex.
      for (final tokens in [AuraTokens.dark, AuraTokens.light]) {
        expect(tokens.category('Guitar'), tokens.accent);
      }
    });
  });

  group('the pomodoro cycle', () {
    test('counts positions from one', () {
      expect(Pomodoro.positionInCycle(0), 1);
      expect(Pomodoro.positionInCycle(3), 4);
    });

    test('wraps after a full cycle', () {
      expect(Pomodoro.positionInCycle(4), 1);
      expect(Pomodoro.positionInCycle(5), 2);
    });

    test('the fourth block earns the long break', () {
      expect(Pomodoro.phaseAfter(1), FocusPhase.shortBreak);
      expect(Pomodoro.phaseAfter(4), FocusPhase.longBreak);
      expect(Pomodoro.breakMinutesAfter(4), Pomodoro.longBreakMinutes);
      expect(Pomodoro.breakMinutesAfter(2), Pomodoro.shortBreakMinutes);
    });

    test('a fresh day owes no break', () {
      expect(Pomodoro.phaseAfter(0), FocusPhase.shortBreak);
    });
  });

  group('the mood breakdown', () {
    List<MoodEntry> from(List<int> scores) {
      var d = CivilDate(2026, 5, 1);
      return [
        for (final s in scores)
          MoodEntry(date: d = d.addDays(1), score: s),
      ];
    }

    test('a tie for most common breaks toward the lower mood', () {
      // Told "your most common mood is Good" on a week split evenly between
      // good and okay, a person would rightly feel flattered rather than
      // informed.
      final b = MoodBreakdown.of(from([3, 3, 4, 4]))!;
      expect(b.mostCommon, MoodLevel.okay);
      expect(b.mostCommonDays, 2);
    });

    test('counts good days at four and above, low days at two and below', () {
      final b = MoodBreakdown.of(from([1, 2, 3, 4, 5]))!;
      expect(b.goodDays, 2);
      expect(b.lowDays, 2);
      expect(b.days, 5);
      expect(b.goodPercent, 40);
    });

    test('the average is the mean of exactly the days passed in', () {
      final b = MoodBreakdown.of(from([2, 4]))!;
      expect(b.average, 3.0);
    });

    test('an empty stretch produces nothing rather than a zero', () {
      // A card reading "0.0 / 5 average mood" for someone who has logged
      // nothing is a verdict on a person who never spoke.
      expect(MoodBreakdown.of(const []), isNull);
    });

    test('a single perfect day does not round the share past 100', () {
      final b = MoodBreakdown.of(from([5]))!;
      expect(b.goodPercent, 100);
      expect(b.mostCommon, MoodLevel.excellent);
    });

    test('a heavy stretch is reported plainly, not softened', () {
      final b = MoodBreakdown.of(from([1, 1, 2, 2, 2]))!;
      expect(b.goodPercent, 0);
      expect(b.lowDays, 5);
      expect(b.mostCommon, MoodLevel.low);
    });
  });

  group('the mood chart follows the range chip', () {
    List<MoodEntry> run(int days, {int score = 4}) {
      var d = CivilDate(2026, 1, 1);
      return [
        for (var i = 0; i < days; i++)
          MoodEntry(date: d = d.addDays(1), score: score),
      ];
    }

    test('the unit gets longer as the range gets wider', () {
      expect(MoodChart.grainFor(30), MoodGrain.day);
      expect(MoodChart.grainFor(90), MoodGrain.week);
      expect(MoodChart.grainFor(365), MoodGrain.month);
    });

    test('a year is drawn in about a dozen columns, not 365 slivers', () {
      final bars = MoodChart.bars(run(365), 365);
      expect(bars.length, lessThanOrEqualTo(13));
      expect(bars.length, greaterThan(6));
    });

    test('a quarter is drawn in about a dozen columns too', () {
      final bars = MoodChart.bars(run(90), 90);
      expect(bars.length, lessThanOrEqualTo(14));
      expect(bars.length, greaterThan(6));
    });

    test('a month keeps one column per recorded day', () {
      final bars = MoodChart.bars(run(21), 30);
      expect(bars.length, 21);
    });

    test('days nobody logged are absent, never drawn as zero', () {
      // A day with no reading is not a bad day.
      var d = CivilDate(2026, 3, 1);
      final sparse = <MoodEntry>[
        MoodEntry(date: d, score: 5),
        MoodEntry(date: d = d.addDays(9), score: 2),
      ];
      final bars = MoodChart.bars(sparse, 30);
      expect(bars.length, 2);
      expect(bars.every((b) => b.average > 0), isTrue);
    });

    test('a bucket averages the days inside it', () {
      var d = CivilDate(2026, 6, 1);
      final week = <MoodEntry>[
        for (final s in [2, 4, 3, 5, 2, 4, 3])
          MoodEntry(date: d = d.addDays(1), score: s),
      ];
      final bars = MoodChart.bars(week, 90);
      expect(bars, hasLength(1));
      expect(bars.single.days, 7);
      expect(bars.single.average, closeTo(23 / 7, 0.001));
    });

    test('only the last column is marked as current', () {
      final bars = MoodChart.bars(run(10), 30);
      expect(bars.where((b) => b.isLatest), hasLength(1));
      expect(bars.last.isLatest, isTrue);
    });

    test('an empty range draws nothing rather than a floor of zeros', () {
      expect(MoodChart.bars(const [], 30), isEmpty);
    });
  });

  group('weekday reading', () {
    test('a single sighting is not a pattern', () {
      var d = CivilDate(2026, 2, 2); // a Monday
      final one = [
        for (var i = 0; i < 5; i++)
          MoodEntry(date: d = d.addDays(1), score: 3 + (i == 0 ? 2 : 0)),
      ];
      final b = MoodBreakdown.of(one)!;
      expect(b.bestWeekday, isNull, reason: 'one reading per weekday');
      expect(b.worstWeekday, isNull);
    });

    test('the same day is never both the high and the low', () {
      var d = CivilDate(2026, 2, 2);
      final flat = [
        for (var i = 0; i < 21; i++)
          MoodEntry(date: d = d.addDays(1), score: 3),
      ];
      final b = MoodBreakdown.of(flat)!;
      expect(b.bestWeekday, b.worstWeekday);
      expect(b.bestWeekday, isNull);
    });
  });
}
