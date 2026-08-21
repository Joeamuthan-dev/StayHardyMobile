import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../domain/civil_date.dart';
import '../domain/screen_time_rules.dart';
import 'database.dart';
import 'enums.dart';
import 'habit_repository.dart';
import 'settings_repository.dart';

/// Everything the screen-time screen renders.
class ScreenTimeView {
  const ScreenTimeView({
    required this.granted,
    required this.today,
    required this.recent,
    required this.correlation,
  });

  /// False until the user grants usage access by hand.
  final bool granted;

  final ScreenDay today;

  /// Oldest first, one per day.
  final List<ScreenDay> recent;

  final ScreenTimeCorrelation? correlation;

  /// Nothing to show — no permission, or nothing collected yet.
  static ScreenTimeView denied(CivilDate today) => ScreenTimeView(
        granted: false,
        today: ScreenDay.empty(today),
        recent: const [],
        correlation: null,
      );

  int get weekAverageMinutes {
    final full = recent.where((d) => !d.isPartial).toList();
    if (full.isEmpty) return 0;
    var total = 0;
    for (final d in full) {
      total += d.minutes;
    }
    return total ~/ full.length;
  }
}

/// Collects Android usage statistics and stores them locally.
///
/// **Nothing here touches the network, and nothing may be added that does.** The
/// disclosure the user accepts before granting the permission says this data
/// never leaves the device; the tables it lands in are excluded from the backup
/// payload for the same reason.
///
/// Android-only. Every method degrades to "not granted" elsewhere rather than
/// throwing, so the feature simply does not appear.
class ScreenTimeService {
  ScreenTimeService(this._db, this._habits, this._settings, {MethodChannel? channel})
      : _channel = channel ?? const MethodChannel(_channelName);

  static const _channelName = 'com.stayhardy.app/screen_time';

  final AppDatabase _db;
  final HabitRepository _habits;
  final SettingsRepository _settings;
  final MethodChannel _channel;

  bool get supported => defaultTargetPlatform == TargetPlatform.android;

  Future<bool> hasPermission() async {
    if (!supported) return false;
    try {
      return await _channel.invokeMethod<bool>('hasPermission') ?? false;
    } on PlatformException catch (e) {
      debugPrint('[screentime] permission check failed: $e');
      return false;
    } on MissingPluginException {
      return false;
    }
  }

  /// Send the user to Settings → Usage access.
  ///
  /// **Only ever called after the disclosure has been accepted** — that is a
  /// Play policy requirement, not a nicety, and the single call site in
  /// `ScreenTimeDisclosureScreen` is what keeps it true.
  ///
  /// Returns false when the OEM has no usage-access screen, in which case the
  /// app's own details page is opened instead so the user is not sent nowhere.
  Future<bool> openPermissionSettings() async {
    if (!supported) return false;
    try {
      return await _channel.invokeMethod<bool>('openSettings') ?? false;
    } on PlatformException catch (e) {
      debugPrint('[screentime] could not open settings: $e');
      return false;
    } on MissingPluginException {
      return false;
    }
  }

  /// Whether the user has read and accepted the disclosure.
  Future<bool> disclosureAccepted() =>
      _settings.getBool(SettingsKeys.screenTimeDisclosureAccepted);

  Future<void> acceptDisclosure() =>
      _settings.set(SettingsKeys.screenTimeDisclosureAccepted, 'true');

  /// Pull usage for [days] back and write it to the database.
  ///
  /// Re-collecting a day overwrites it rather than adding to it: the platform is
  /// the source of truth for a day's usage, and merging two reads of the same
  /// day would double it.
  Future<void> collect({int days = 7, CivilDate? on}) async {
    if (!supported || !await hasPermission()) return;

    final today = on ?? CivilDate.today();
    final now = DateTime.now().millisecondsSinceEpoch;

    for (var i = 0; i < days; i++) {
      final date = today.addDays(-i);
      final result = await _queryDay(date);
      if (result == null) continue;

      final isToday = date.iso == today.iso;

      await _db.transaction(() async {
        await (_db.delete(_db.screenTimeAppDaily)
              ..where((a) => a.localDate.equals(date.iso)))
            .go();

        for (final app in result.apps) {
          await _db.into(_db.screenTimeAppDaily).insert(
                ScreenTimeAppDailyCompanion.insert(
                  localDate: date.iso,
                  packageName: app.packageName,
                  appLabel: Value(app.appLabel),
                  foregroundMs: Value(app.foregroundMs),
                  launchCount: Value(app.launchCount),
                ),
              );
        }

        await _db.into(_db.screenTimeDaily).insertOnConflictUpdate(
              ScreenTimeDailyCompanion.insert(
                localDate: date.iso,
                totalForegroundMs: Value(result.totalMs),
                unlockCount: Value(result.unlockCount),
                // Top five, so the summary still renders after the per-app
                // detail is pruned at 90 days.
                topAppsJson: Value(_encodeTop(result.apps)),
                collectedAt: now,
                isPartial: Value(isToday),
              ),
            );
      });
    }

    await pruneDetail(today: today);
  }

  /// Drop per-app detail older than the retention window.
  ///
  /// The daily totals stay forever; the per-app breakdown is the sensitive part
  /// and there is no reason to keep two years of it to draw a chart.
  Future<void> pruneDetail({CivilDate? today}) async {
    final cutoff = (today ?? CivilDate.today())
        .addDays(-ScreenTimeRules.appDetailRetentionDays)
        .iso;
    await _db.customStatement(
      'DELETE FROM screen_time_app_daily WHERE local_date < ?',
      [cutoff],
    );
  }

  /// Erase everything collected.
  ///
  /// Offered because the disclosure promises control, and "you can turn it off"
  /// is worth little if the data already gathered stays. Android keeps its own
  /// copy either way — the UI says so rather than implying this wipes the OS.
  Future<void> deleteAll() async {
    await _db.transaction(() async {
      await _db.delete(_db.screenTimeAppDaily).go();
      await _db.delete(_db.screenTimeDaily).go();
    });
  }

  Future<ScreenDay?> _queryDay(CivilDate date) async {
    final start = DateTime(date.year, date.month, date.day);
    final end = start.add(const Duration(days: 1));

    try {
      final raw = await _channel.invokeMapMethod<String, dynamic>('query', {
        'startMs': start.millisecondsSinceEpoch,
        'endMs': end.millisecondsSinceEpoch,
      });
      if (raw == null) return null;

      final apps = <AppUsage>[];
      for (final entry in (raw['packages'] as List? ?? const [])) {
        final m = (entry as Map).cast<Object?, Object?>();
        apps.add(AppUsage(
          packageName: m['packageName'] as String? ?? '',
          foregroundMs: (m['foregroundMs'] as num?)?.toInt() ?? 0,
          launchCount: (m['launchCount'] as num?)?.toInt() ?? 0,
          appLabel: m['appLabel'] as String?,
        ));
      }

      return ScreenTimeRules.fold(
        date,
        apps.where((a) => a.packageName.isNotEmpty).toList(),
        unlockCount: (raw['unlockCount'] as num?)?.toInt() ?? 0,
      );
    } on PlatformException catch (e) {
      debugPrint('[screentime] query failed for ${date.iso}: $e');
      return null;
    } on MissingPluginException {
      return null;
    }
  }

  Stream<ScreenTimeView> watch({int days = 14}) {
    return _db
        .watchTables(
          'screen_time',
          {_db.screenTimeDaily, _db.screenTimeAppDaily, _db.habitLogs,
            _db.habits},
        )
        .asyncMap((_) => load(days: days));
  }

  Future<ScreenTimeView> load({int days = 14, CivilDate? on}) async {
    final granted = await hasPermission();
    final today = on ?? CivilDate.today();
    final from = today.addDays(-(days - 1));

    final dayRows = await (_db.select(_db.screenTimeDaily)
          ..where((d) => d.localDate.isBiggerOrEqualValue(from.iso))
          ..orderBy([(d) => OrderingTerm.asc(d.localDate)]))
        .get();

    final appRows = await (_db.select(_db.screenTimeAppDaily)
          ..where((a) => a.localDate.equals(today.iso))
          ..orderBy([(a) => OrderingTerm.desc(a.foregroundMs)]))
        .get();

    final todayApps = [
      for (final a in appRows)
        AppUsage(
          packageName: a.packageName,
          foregroundMs: a.foregroundMs,
          launchCount: a.launchCount,
          appLabel: a.appLabel,
        ),
    ];

    final recent = [
      for (final r in dayRows)
        ScreenDay(
          date: CivilDate.parse(r.localDate),
          totalMs: r.totalForegroundMs,
          unlockCount: r.unlockCount,
          apps: r.localDate == today.iso ? todayApps : const [],
          isPartial: r.isPartial,
        ),
    ];

    return ScreenTimeView(
      granted: granted,
      today: recent.isEmpty || recent.last.date.iso != today.iso
          ? ScreenDay.empty(today)
          : recent.last,
      recent: recent,
      correlation: await _correlate(recent, today),
    );
  }

  /// Screen time against habit completion, one point per day.
  Future<ScreenTimeCorrelation?> _correlate(
    List<ScreenDay> days,
    CivilDate today,
  ) async {
    if (days.isEmpty) return null;

    final habits = await (_db.select(_db.habits)
          ..where((h) => h.deletedAt.isNull()))
        .get();

    // habit_id, not a bare count: a flexible habit is never `isDueOn` any
    // given day, so counting every check-in against a denominator that
    // excludes it inflates the rate — the same defect the Stats headline and
    // the weekly review both carried.
    final logRows = await _db.customSelect(
      'SELECT log_date, habit_id FROM habit_logs '
      'WHERE deleted_at IS NULL AND log_date >= ?1',
      variables: [Variable<String>(days.first.date.iso)],
    ).get();
    final keptByDate = <String, Set<String>>{};
    for (final r in logRows) {
      (keptByDate[r.read<String>('log_date')] ??= <String>{})
          .add(r.read<String>('habit_id'));
    }

    final points = <ScreenTimeVsHabits>[];
    for (final day in days) {
      // Today is still in progress on both axes — an incomplete habit day
      // against an incomplete screen-time day would drag the correlation.
      if (day.isPartial || day.date.iso == today.iso) continue;

      final kept = keptByDate[day.date.iso];
      var scheduled = 0;
      var completed = 0;
      for (final h in habits) {
        if (CivilDate.parse(h.startDate).isAfter(day.date)) continue;

        final schedule = _habits.scheduleOf(h);
        final done = kept?.contains(h.id) ?? false;
        // A flexible habit owes the week rather than the day, so it counts
        // only on the days it is actually kept.
        if (schedule.kind == ScheduleKind.timesPerPeriod) {
          if (done) {
            scheduled++;
            completed++;
          }
        } else if (schedule.isDueOn(day.date)) {
          scheduled++;
          if (done) completed++;
        }
      }

      points.add(ScreenTimeVsHabits(
        date: day.date,
        minutes: day.minutes,
        habitRate: scheduled == 0 ? null : (completed / scheduled).clamp(0.0, 1.0),
      ));
    }

    return ScreenTimeRules.correlate(points);
  }

  static String _encodeTop(List<AppUsage> apps) {
    final top = apps.take(5).map((a) =>
        '{"p":${_json(a.packageName)},"l":${_json(a.appLabel)},"ms":${a.foregroundMs}}');
    return '[${top.join(',')}]';
  }

  static String _json(String? s) {
    if (s == null) return 'null';
    final escaped =
        s.replaceAll(r'\', r'\\').replaceAll('"', r'\"').replaceAll('\n', r'\n');
    return '"$escaped"';
  }
}
