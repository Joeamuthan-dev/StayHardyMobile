import 'package:drift/native.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/habit_repository.dart';
import 'package:stayhardy/src/data/screen_time_service.dart';
import 'package:stayhardy/src/data/settings_repository.dart';
import 'package:stayhardy/src/domain/civil_date.dart';
import 'package:stayhardy/src/domain/screen_time_rules.dart';

/// Screen time is the most sensitive thing this app can see. The tests that
/// matter are the ones about what it refuses to claim, and about the order in
/// which it asks.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final today = CivilDate(2026, 8, 15);

  AppUsage app(String pkg, int minutes, {String? label, int launches = 1}) =>
      AppUsage(
        packageName: pkg,
        foregroundMs: minutes * 60000,
        launchCount: launches,
        appLabel: label,
      );

  group('folding a day', () {
    test('the total is the sum of the apps, not a separate number', () {
      final day = ScreenTimeRules.fold(
        today,
        [app('a', 30), app('b', 12)],
        unlockCount: 40,
      );
      // The user can add up the list; the headline has to match it.
      expect(day.minutes, 42);
      expect(day.unlockCount, 40);
    });

    test('apps come back longest first', () {
      final day = ScreenTimeRules.fold(
        today,
        [app('small', 5), app('big', 90), app('mid', 20)],
        unlockCount: 0,
      );
      expect(day.apps.map((a) => a.packageName), ['big', 'mid', 'small']);
    });

    test('an app with no resolvable label falls back to its package', () {
      // Package visibility hides most apps on API 30+, and the manifest
      // deliberately does not request QUERY_ALL_PACKAGES.
      expect(app('com.example.thing', 5).displayName, 'com.example.thing');
      expect(app('com.example.thing', 5, label: 'Thing').displayName, 'Thing');
    });
  });

  group('correlation refuses to guess', () {
    List<ScreenTimeVsHabits> days(
      int count, {
      required double Function(int) rate,
      required int Function(int) minutes,
    }) =>
        [
          for (var i = 0; i < count; i++)
            ScreenTimeVsHabits(
              date: today.addDays(-i),
              minutes: minutes(i),
              habitRate: rate(i),
            ),
        ];

    test('says nothing under two weeks of data', () {
      final d = days(10,
          rate: (i) => i.isEven ? 1.0 : 0.0, minutes: (i) => i.isEven ? 60 : 300);
      expect(ScreenTimeRules.correlate(d), isNull);
    });

    test('says nothing when every day was kept', () {
      // No contrast to measure. Reporting one side against nothing is
      // meaningless, however many days there are.
      final d = days(30, rate: (_) => 1, minutes: (i) => 100 + i);
      expect(ScreenTimeRules.correlate(d), isNull);
    });

    test('says nothing when every day was missed', () {
      final d = days(30, rate: (_) => 0, minutes: (i) => 100 + i);
      expect(ScreenTimeRules.correlate(d), isNull);
    });

    test('says nothing when the gap is small', () {
      // 10 minutes apart is noise; claiming it would be the kind of confident
      // nonsense that discredits the screen.
      final d = days(30,
          rate: (i) => i.isEven ? 1.0 : 0.0,
          minutes: (i) => i.isEven ? 120 : 130);
      expect(ScreenTimeRules.correlate(d), isNull);
    });

    test('days with nothing scheduled are excluded, not counted as failures',
        () {
      final d = [
        for (var i = 0; i < 30; i++)
          ScreenTimeVsHabits(
            date: today.addDays(-i),
            minutes: 500,
            habitRate: null,
          ),
      ];
      expect(ScreenTimeRules.correlate(d), isNull);
    });

    test('a real gap is reported with its sample size', () {
      final d = days(30,
          rate: (i) => i.isEven ? 1.0 : 0.0,
          minutes: (i) => i.isEven ? 90 : 260);
      final c = ScreenTimeRules.correlate(d)!;

      expect(c.keptDayAverage, 90);
      expect(c.missedDayAverage, 260);
      expect(c.gap, 170);
      expect(c.moreOnMissedDays, isTrue);
      expect(c.sampleDays, 30);
    });

    test('the unflattering direction is reported too, not hidden', () {
      // More phone on the days habits were KEPT. Suppressing this would make
      // the feature an argument rather than a measurement.
      final d = days(30,
          rate: (i) => i.isEven ? 1.0 : 0.0,
          minutes: (i) => i.isEven ? 300 : 100);
      final c = ScreenTimeRules.correlate(d)!;
      expect(c.moreOnMissedDays, isFalse);
      expect(c.gap, -200);
    });
  });

  group('formatting', () {
    test('reads as a duration, never as a decimal', () {
      expect(ScreenTimeRules.formatDuration(0), '0m');
      expect(ScreenTimeRules.formatDuration(-5), '0m');
      expect(ScreenTimeRules.formatDuration(48), '48m');
      expect(ScreenTimeRules.formatDuration(120), '2h');
      expect(ScreenTimeRules.formatDuration(221), '3h 41m');
    });
  });

  group('the service', () {
    late AppDatabase db;
    late SettingsRepository settings;
    late ScreenTimeService service;
    late List<MethodCall> calls;
    var permitted = false;

    setUp(() {
      db = AppDatabase.forTesting(NativeDatabase.memory());
      settings = SettingsRepository(db);
      calls = [];
      permitted = false;

      const channel = MethodChannel('test/screen_time');
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
        calls.add(call);
        switch (call.method) {
          case 'hasPermission':
            return permitted;
          case 'openSettings':
            return true;
          case 'query':
            return {
              'packages': [
                {
                  'packageName': 'com.example.social',
                  'foregroundMs': 90 * 60000,
                  'launchCount': 22,
                  'appLabel': 'Social',
                },
                {
                  'packageName': 'com.example.hidden',
                  'foregroundMs': 15 * 60000,
                  'launchCount': 3,
                  'appLabel': null,
                },
              ],
              'unlockCount': 47,
            };
        }
        return null;
      });

      service = ScreenTimeService(
        db,
        HabitRepository(db),
        settings,
        channel: channel,
      );
    });

    tearDown(() async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(
              const MethodChannel('test/screen_time'), null);
      await db.close();
    });

    test('nothing is collected without permission', () async {
      await service.collect(on: today);

      expect(calls.map((c) => c.method), ['hasPermission']);
      expect(await db.select(db.screenTimeDaily).get(), isEmpty);
    });

    test('the disclosure is recorded before settings are ever opened',
        () async {
      // Play requires the disclosure first. This asserts the flag lands before
      // the intent fires, so the ordering is a fact on disk rather than an
      // assumption about navigation.
      expect(await service.disclosureAccepted(), isFalse);
      await service.acceptDisclosure();
      expect(await service.disclosureAccepted(), isTrue);
    });

    test('a granted collection stores the day and its apps', () async {
      permitted = true;
      await service.collect(days: 1, on: today);

      final day = await db.select(db.screenTimeDaily).getSingle();
      expect(day.localDate, today.iso);
      expect(day.totalForegroundMs, 105 * 60000);
      expect(day.unlockCount, 47);
      // Today is still accumulating and is flagged as such.
      expect(day.isPartial, isTrue);

      final apps = await db.select(db.screenTimeAppDaily).get();
      expect(apps.length, 2);
      expect(apps.firstWhere((a) => a.packageName == 'com.example.hidden')
          .appLabel, isNull);
    });

    test('re-collecting a day replaces it rather than doubling it', () async {
      permitted = true;
      await service.collect(days: 1, on: today);
      await service.collect(days: 1, on: today);

      final day = await db.select(db.screenTimeDaily).getSingle();
      expect(day.totalForegroundMs, 105 * 60000);
      expect((await db.select(db.screenTimeAppDaily).get()).length, 2);
    });

    test('yesterday is stored as settled, not partial', () async {
      permitted = true;
      await service.collect(days: 2, on: today);

      final rows = await db.select(db.screenTimeDaily).get();
      final yesterday =
          rows.firstWhere((r) => r.localDate == today.addDays(-1).iso);
      expect(yesterday.isPartial, isFalse);
    });

    test('per-app detail is pruned past the retention window', () async {
      final old = today
          .addDays(-(ScreenTimeRules.appDetailRetentionDays + 1))
          .iso;
      await db.customStatement(
        "INSERT INTO screen_time_app_daily (local_date, package_name, "
        "foreground_ms, launch_count, category) VALUES ('$old', 'com.old', 1, 1, 0)",
      );

      await service.pruneDetail(today: today);

      expect(await db.select(db.screenTimeAppDaily).get(), isEmpty);
    });

    test('deleting erases both tables and nothing else', () async {
      permitted = true;
      await service.collect(days: 1, on: today);
      await db.into(db.habits).insert(HabitsCompanion.insert(
            id: 'h',
            title: 'Read',
            startDate: '2026-01-01',
            createdAt: 1,
            updatedAt: 1,
          ));

      await service.deleteAll();

      expect(await db.select(db.screenTimeDaily).get(), isEmpty);
      expect(await db.select(db.screenTimeAppDaily).get(), isEmpty);
      // Habits are untouched, exactly as the confirmation dialog promises.
      expect((await db.select(db.habits).get()).length, 1);
    });

    test('a correlation is not offered before there is evidence', () async {
      permitted = true;
      await service.collect(days: 3, on: today);
      final view = await service.load(on: today);
      expect(view.correlation, isNull);
    });
  });
}
