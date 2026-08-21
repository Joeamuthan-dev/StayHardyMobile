import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/achievement_service.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/habit_repository.dart';
import 'package:stayhardy/src/data/settings_repository.dart';
import 'package:stayhardy/src/domain/badge_catalogue.dart';
import 'package:stayhardy/src/domain/civil_date.dart';

/// Badges are a promise: earned once, kept forever. The tests that matter are
/// the ones that stop something being taken away.
void main() {
  group('the legacy ladder', () {
    test('keys and names are byte-identical to the Capacitor build', () {
      // These are the primary key of the `user_badges` rows being migrated from
      // Supabase for 274 live users. A renamed key re-awards a badge they
      // already hold; a renamed badge takes away something they can name.
      expect(
        BadgeCatalogue.streakLadder.map((b) => b.key).toList(),
        ['streak_7', 'streak_15', 'streak_30', 'streak_50', 'streak_100',
          'streak_150', 'streak_200', 'streak_250', 'streak_300'],
      );
      expect(
        BadgeCatalogue.streakLadder.map((b) => b.name).toList(),
        ['7-Day Streak', '15-Day Grind', '30-Day Champion', '50-Day Legend',
          '100-Day Warrior', '150-Day Immortal', '200-Day God Mode',
          '250-Day Ascended', '300-Day Diamond'],
      );
      expect(
        BadgeCatalogue.streakLadder.map((b) => b.threshold).toList(),
        [7, 15, 30, 50, 100, 150, 200, 250, 300],
      );
    });

    test('new badges cannot collide with the legacy keys', () {
      final keys = BadgeCatalogue.all.map((b) => b.key).toList();
      expect(keys.toSet().length, keys.length);
      for (final b in BadgeCatalogue.additions) {
        expect(b.key.startsWith('streak_'), isFalse,
            reason: '${b.key} could collide with a migrated row');
      }
    });
  });

  group('earning', () {
    AchievementStats stats({
      int bestStreak = 0,
      int totalCheckIns = 0,
      int focusMinutes = 0,
      int perfectWeeks = 0,
    }) =>
        AchievementStats(
          bestStreak: bestStreak,
          totalCheckIns: totalCheckIns,
          focusMinutes: focusMinutes,
          perfectWeeks: perfectWeeks,
          tasksCompleted: 0,
          goalsCompleted: 0,
        );

    test('crossing a threshold earns every rung below it too', () {
      // Someone importing a 120-day streak gets the whole ladder up to 100,
      // not just the top rung.
      final keys = BadgeEngine.qualifying(stats(bestStreak: 120))
          .map((b) => b.key)
          .toSet();
      expect(keys, containsAll(
          ['streak_7', 'streak_15', 'streak_30', 'streak_50', 'streak_100']));
      expect(keys, isNot(contains('streak_150')));
    });

    test('a badge already held is not offered again', () {
      final fresh = BadgeEngine.newlyEarned(
        stats(bestStreak: 30),
        {'streak_7', 'streak_15'},
      );
      expect(fresh.map((b) => b.key), ['streak_30']);
    });

    test('volume badges reward the user who broke a streak and kept going', () {
      // No streak at all, 600 check-ins. The streak ladder gives this person
      // nothing; the volume ladder is the point.
      final keys = BadgeEngine.qualifying(stats(totalCheckIns: 600))
          .map((b) => b.key)
          .toSet();
      expect(keys, containsAll(['volume_100', 'volume_500']));
      expect(keys, isNot(contains('volume_1000')));
      expect(keys.any((k) => k.startsWith('streak_')), isFalse);
    });

    test('next-up points at the nearest unearned badge', () {
      final next = BadgeEngine.nextUp(stats(bestStreak: 6), const {});
      expect(next!.key, 'streak_7');
    });

    test('next-up is null once everything is held', () {
      final all = {for (final b in BadgeCatalogue.all) b.key};
      expect(BadgeEngine.nextUp(stats(bestStreak: 400), all), isNull);
    });
  });

  group('XP and levels', () {
    test('level 1 starts at zero and needs no XP', () {
      expect(Xp.levelFor(0), 1);
      expect(Xp.thresholdFor(1), 0);
    });

    test('the curve is monotonic and accelerating', () {
      var previousGap = 0;
      for (var l = 2; l <= 30; l++) {
        final gap = Xp.thresholdFor(l) - Xp.thresholdFor(l - 1);
        expect(gap, greaterThan(previousGap),
            reason: 'level $l must cost more than level ${l - 1}');
        previousGap = gap;
      }
    });

    test('a level is never entered before its threshold', () {
      for (var l = 2; l <= 20; l++) {
        final at = Xp.thresholdFor(l);
        expect(Xp.levelFor(at - 1), l - 1);
        expect(Xp.levelFor(at), l);
      }
    });

    test('progress and remaining agree with each other', () {
      const xp = 450;
      final level = Xp.levelFor(xp);
      expect(Xp.progressIn(xp), greaterThan(0));
      expect(Xp.progressIn(xp), lessThan(1));
      expect(xp + Xp.toNextLevel(xp), Xp.thresholdFor(level + 1));
    });

    test('a corrupt XP value cannot hang the level loop', () {
      expect(Xp.levelFor(1 << 40), lessThanOrEqualTo(1000));
    });

    test('every source of XP contributes', () {
      const s = AchievementStats(
        bestStreak: 0,
        totalCheckIns: 1,
        focusMinutes: 1,
        perfectWeeks: 0,
        tasksCompleted: 1,
        goalsCompleted: 1,
      );
      expect(
        Xp.forStats(s, badgesEarned: 1),
        Xp.perCheckIn +
            Xp.perFocusMinute +
            Xp.perTaskCompleted +
            Xp.perGoalCompleted +
            Xp.perBadge,
      );
    });
  });

  group('awarding against the database', () {
    late AppDatabase db;
    late AchievementService achievements;
    late SettingsRepository settings;

    final today = CivilDate(2026, 8, 15);

    setUp(() {
      db = AppDatabase.forTesting(NativeDatabase.memory());
      settings = SettingsRepository(db);
      achievements =
          AchievementService(db, HabitRepository(db), settings);
    });

    tearDown(() async => db.close());

    Future<void> addHabit(String id, {String startDate = '2025-01-01'}) {
      return db.into(db.habits).insert(HabitsCompanion.insert(
            id: id,
            title: 'Read',
            startDate: startDate,
            createdAt: 1,
            updatedAt: 1,
          ));
    }

    Future<void> logRun(String habitId, int days, {int endingDaysAgo = 1}) async {
      for (var i = 0; i < days; i++) {
        final d = today.addDays(-(endingDaysAgo + i));
        await db.into(db.habitLogs).insert(HabitLogsCompanion.insert(
              id: '$habitId-${d.iso}',
              habitId: habitId,
              logDate: d.iso,
              loggedAt: 1,
              createdAt: 1,
              updatedAt: 1,
            ));
      }
    }

    test('the first evaluation awards silently, with no popup storm', () async {
      await addHabit('h');
      await logRun('h', 40);

      final fresh = await achievements.evaluate();

      // Badges are awarded...
      final rows = await db.select(db.badges).get();
      expect(rows.map((r) => r.key),
          containsAll(['streak_7', 'streak_15', 'streak_30']));
      // ...but nothing is returned to celebrate, and every row is pre-marked
      // shown. Someone importing two years of history must not be met by nine
      // stacked popups.
      expect(fresh, isEmpty);
      expect(rows.every((r) => r.popupShown), isTrue);
    });

    test('a badge earned later does pop', () async {
      await addHabit('h');
      await logRun('h', 8);
      await achievements.evaluate(); // first run, silent

      // Extend the run backwards so the streak reaches 15.
      await logRun('h', 8, endingDaysAgo: 9);
      final fresh = await achievements.evaluate();

      expect(fresh.map((d) => d.key), contains('streak_15'));
      final row = await (db.select(db.badges)
            ..where((b) => b.key.equals('streak_15')))
          .getSingle();
      expect(row.popupShown, isFalse);
    });

    test('evaluating twice does not re-award or re-pop', () async {
      await addHabit('h');
      await logRun('h', 8);
      await achievements.evaluate();
      await logRun('h', 8, endingDaysAgo: 9);
      await achievements.evaluate();

      final again = await achievements.evaluate();
      expect(again, isEmpty);
    });

    test('a badge survives the streak that earned it being broken', () async {
      await addHabit('h');
      await logRun('h', 10);
      await achievements.evaluate();
      expect((await db.select(db.badges).get()).map((r) => r.key),
          contains('streak_7'));

      // Wipe the history entirely. The record of having done it stands.
      await db.customStatement('DELETE FROM habit_logs');
      await achievements.evaluate();

      expect((await db.select(db.badges).get()).map((r) => r.key),
          contains('streak_7'));
    });

    test('XP never falls when history is deleted', () async {
      await addHabit('h');
      await logRun('h', 30);
      final before = (await achievements.load()).xp;
      expect(before, greaterThan(0));

      await db.customStatement('DELETE FROM habit_logs');
      final after = (await achievements.load()).xp;

      // Un-checking a box, deleting a habit, or restoring an older backup all
      // shrink the derived figure. None of them may take a level away.
      expect(after, before);
    });

    test('badges are judged on the best streak, not the current one', () async {
      await addHabit('h');
      // A 10-day run that ended a month ago.
      await logRun('h', 10, endingDaysAgo: 30);

      final stats = await achievements.computeStats(on: today);
      expect(stats.bestStreak, greaterThanOrEqualTo(10));

      await achievements.evaluate();
      expect((await db.select(db.badges).get()).map((r) => r.key),
          contains('streak_7'));
    });

    test('an unknown badge key is kept but not rendered', () async {
      await db.into(db.badges).insert(
            BadgesCompanion.insert(key: 'from_the_future', earnedAt: 1),
          );
      final view = await achievements.load();

      expect(view.earned.any((b) => b.def.key == 'from_the_future'), isFalse);
      // Still on disk — never revoke what was awarded.
      expect((await db.select(db.badges).get()).length, 1);
    });

    test('an empty week is not a perfect week', () async {
      // No habits at all. Awarding "every scheduled habit, every day" to
      // someone with nothing scheduled would make the badge meaningless.
      final stats = await achievements.computeStats(on: today);
      expect(stats.perfectWeeks, 0);
      expect(BadgeEngine.qualifying(stats).map((b) => b.key),
          isNot(contains('perfect_1')));
    });

    test('the first evaluation is only first once', () async {
      await addHabit('h');
      await achievements.evaluate();
      expect(await settings.getBool(SettingsKeys.badgesEvaluated), isTrue);
    });
  });
}
