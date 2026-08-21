import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import 'database.dart';

/// Local habit reminders.
///
/// Everything here is local — no FCM, no server. A habit reminder is a promise
/// the app makes to the user, and routing it through a push service would make
/// it depend on network, a valid token, and a backend being up.
///
/// **On Android reliability:** WorkManager and inexact alarms are aggressively
/// throttled by Xiaomi, Oppo, Vivo and Samsung, which is most of this app's
/// user base. Reminders therefore ask for exact alarms where the OS allows it
/// and degrade to inexact rather than failing silently — and [diagnostics]
/// exists so a user who says "my reminders don't fire" can be given a real
/// answer instead of a shrug.
class NotificationService {
  NotificationService(this._db, [FlutterLocalNotificationsPlugin? plugin])
      : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  final AppDatabase _db;
  final FlutterLocalNotificationsPlugin _plugin;

  static const _channelId = 'habit_reminders';
  static const _channelName = 'Habit reminders';
  static const _channelDescription =
      'Daily nudges for the habits you scheduled a time for.';

  /// Separate channel so a user can silence daily nudges without also losing
  /// the end of a focus session they are actively waiting on — Android channel
  /// settings are per-channel and permanent once created.
  static const _focusChannelId = 'focus_timer';
  static const _focusChannelName = 'Focus timer';
  static const _focusChannelDescription =
      'Tells you when a focus session has finished.';

  /// Fixed id: there is only ever one focus session in flight, so scheduling a
  /// new one must replace the old alarm rather than stack on it.
  static const focusNotificationId = 90000001;

  /// Notification ids are derived from the habit id and weekday, so a habit can
  /// be rescheduled or cancelled without tracking ids separately.
  static int notificationId(String habitId, int dow) =>
      (habitId.hashCode & 0x00FFFFFF) * 8 + dow;

  bool _ready = false;

  Future<void> init() async {
    if (_ready || !_supported) return;

    tzdata.initializeTimeZones();
    try {
      tz.setLocalLocation(tz.getLocation(await FlutterTimezone.getLocalTimezone()));
    } catch (e) {
      // An unknown zone must not stop the app booting; UTC reminders are wrong
      // but recoverable, a crash on launch is not.
      debugPrint('[notify] timezone lookup failed, using UTC: $e');
    }

    await _plugin.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      ),
      // Payload-based routing. A notification that opens the app on Home and
      // leaves the user to find the screen it was about has done half its job.
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload != null && payload.isNotEmpty) {
          onNotificationTap?.call(payload);
        }
      },
    );
    _ready = true;
  }

  /// Set by `main` once the widget tree exists. Static because the tap can
  /// arrive through a launch, before any instance is listening.
  static void Function(String payload)? onNotificationTap;

  /// Payload for the daily mood prompt.
  static const moodPayload = 'mood_check_in';
  static const circleNewsPayload = 'circle_news';

  /// The champion announcement, as a rich local notification — fired when a
  /// circle member's app wakes and finds fresh circle news. Local rather
  /// than push (this project has no FCM); arrives at next app wake, styled
  /// like the moment it is.
  Future<void> showCircleNews({
    required String title,
    required String body,
  }) async {
    try {
      await _plugin.show(
        90000003,
        title,
        body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            'circle_news',
            'StayHardy Circle',
            channelDescription: 'Champions and circle news, monthly.',
            importance: Importance.high,
            priority: Priority.high,
            styleInformation: BigTextStyleInformation(body),
          ),
        ),
        payload: circleNewsPayload,
      );
    } catch (e) {
      debugPrint('[notify] circle news failed: $e');
    }
  }

  /// Ask for notification permission. Returns whether reminders can be posted.
  ///
  /// Called from Settings on an explicit user action, never on first launch —
  /// a permission prompt before the user has created anything is the fastest
  /// way to a permanent denial.
  Future<bool> requestPermission() async {
    if (!_supported) return false;
    final status = await Permission.notification.request();
    return status.isGranted;
  }

  Future<bool> hasPermission() async {
    if (!_supported) return false;
    return Permission.notification.isGranted;
  }

  /// Whether the OS will let us post at an exact minute.
  ///
  /// Play restricts the auto-granted `USE_EXACT_ALARM` to alarm and calendar
  /// apps, so a habit app has to request `SCHEDULE_EXACT_ALARM` and cope with
  /// a refusal.
  Future<bool> canScheduleExact() async {
    if (!_supported) return false;
    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    return await android?.canScheduleExactNotifications() ?? false;
  }

  Future<void> requestExactAlarmPermission() async {
    if (!_supported) return;
    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestExactAlarmsPermission();
  }

  /// Rebuild every scheduled reminder from the database.
  ///
  /// Cancel-then-reschedule rather than diffing: the whole set is at most a few
  /// dozen alarms, and a diff that drifts leaves phantom reminders for habits
  /// the user deleted — a far worse failure than a few redundant syscalls.
  Future<void> rescheduleAll() async {
    if (!_supported) return;
    await init();
    if (!await hasPermission()) return;

    // Deliberately NOT `cancelAll()`. This runs on every habit change, and a
    // blanket cancel would take the in-flight focus alarm with it — so checking
    // off a habit mid-session would silently stop the timer ever telling you it
    // finished. Cancel the reminders individually and leave the focus id alone.
    for (final pending in await _plugin.pendingNotificationRequests()) {
      if (pending.id == focusNotificationId) continue;
      await _plugin.cancel(pending.id);
    }

    final habits = await (_db.select(_db.habits)
          ..where((h) => h.deletedAt.isNull() & h.archivedAt.isNull())
          ..where((h) => h.reminderTime.isNotNull()))
        .get();

    final exact = await canScheduleExact();

    for (final habit in habits) {
      final time = habit.reminderTime;
      if (time == null || time.isEmpty) continue;

      final parts = time.split(':');
      if (parts.length != 2) continue;
      final hour = int.tryParse(parts[0]);
      final minute = int.tryParse(parts[1]);
      if (hour == null || minute == null) continue;

      // Reminders follow the habit's own schedule: a Mon/Wed/Fri habit must not
      // nag on Sunday.
      final mask = habit.reminderDaysMask != 0
          ? habit.reminderDaysMask
          : habit.weekdayMask;

      for (var dow = 0; dow < 7; dow++) {
        if (mask & (1 << dow) == 0) continue;
        await _scheduleWeekly(
          id: notificationId(habit.id, dow),
          title: habit.title,
          body: _body(habit.title),
          dow: dow,
          hour: hour,
          minute: minute,
          exact: exact,
        );
      }
    }
  }

  Future<void> _scheduleWeekly({
    required int id,
    required String title,
    required String body,
    required int dow,
    required int hour,
    required int minute,
    required bool exact,
  }) async {
    try {
      await _plugin.zonedSchedule(
        id,
        title,
        body,
        _nextInstanceOf(dow, hour, minute),
        NotificationDetails(
          android: AndroidNotificationDetails(
            _channelId,
            _channelName,
            channelDescription: _channelDescription,
            importance: Importance.defaultImportance,
            priority: Priority.defaultPriority,
          ),
        ),
        androidScheduleMode: exact
            ? AndroidScheduleMode.exactAllowWhileIdle
            // Not a silent downgrade: the Settings screen tells the user their
            // reminders may drift and offers the permission.
            : AndroidScheduleMode.inexactAllowWhileIdle,
        matchDateTimeComponents: DateTimeComponents.dayOfWeekAndTime,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
      );
    } catch (e) {
      debugPrint('[notify] schedule failed for "$title": $e');
    }
  }

  /// Next occurrence of a weekday at a time, in the device's zone.
  ///
  /// `tz` handles DST here rather than manual offset arithmetic — a reminder
  /// that shifts by an hour twice a year is exactly the bug this avoids.
  static tz.TZDateTime _nextInstanceOf(int dow, int hour, int minute) {
    final now = tz.TZDateTime.now(tz.local);
    var scheduled = tz.TZDateTime(
        tz.local, now.year, now.month, now.day, hour, minute);

    // `dow` is Sunday-indexed to match weekdayMask; TZDateTime.weekday is
    // 1=Monday..7=Sunday.
    while (scheduled.weekday % 7 != dow || !scheduled.isAfter(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }
    return scheduled;
  }

  static String _body(String title) => 'Time for $title.';

  /// What a user needs to know when reminders are not arriving.
  Future<ReminderDiagnostics> diagnostics() async {
    if (!_supported) {
      return const ReminderDiagnostics(
        permissionGranted: false,
        exactAlarmsAllowed: false,
        scheduledCount: 0,
      );
    }
    await init();
    final pending = await _plugin.pendingNotificationRequests();
    return ReminderDiagnostics(
      permissionGranted: await hasPermission(),
      exactAlarmsAllowed: await canScheduleExact(),
      scheduledCount: pending.length,
    );
  }

  /// Fire when the running focus session is due to end.
  ///
  /// The alarm is pinned to an absolute instant rather than a countdown,
  /// because the process will very likely not be alive to notice the timer
  /// running out — which is the entire reason a focus timer needs a
  /// notification at all. Cancelled and rescheduled on every pause and resume,
  /// so the alarm can never survive the session it belongs to.
  Future<void> scheduleFocusEnd(DateTime dueAt, {String? goalName}) async {
    if (!_supported) return;
    await init();
    await cancelFocusEnd();
    if (!await hasPermission()) return;
    if (!dueAt.isAfter(DateTime.now())) return;

    try {
      await _plugin.zonedSchedule(
        focusNotificationId,
        'Focus session complete',
        goalName == null
            ? "That's the block done. Step away before the next one."
            : 'Time on $goalName is banked. Step away before the next one.',
        tz.TZDateTime.from(dueAt, tz.local),
        NotificationDetails(
          android: AndroidNotificationDetails(
            _focusChannelId,
            _focusChannelName,
            channelDescription: _focusChannelDescription,
            // Higher than a habit nudge: the user asked to be told at a precise
            // moment and is waiting for it.
            importance: Importance.high,
            priority: Priority.high,
          ),
        ),
        androidScheduleMode: await canScheduleExact()
            ? AndroidScheduleMode.exactAllowWhileIdle
            : AndroidScheduleMode.inexactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
      );
    } catch (e) {
      debugPrint('[notify] focus schedule failed: $e');
    }
  }

  /// The daily "how do you feel?" prompt.
  ///
  /// Its own channel, so someone who wants habit nudges but not a mood question
  /// can silence one without the other — Android channel settings are the only
  /// control users actually have, and bundling unrelated notifications onto one
  /// channel takes that control away.
  static const _moodChannelId = 'mood_check_in';
  static const _moodChannelName = 'Mood check-in';
  static const _moodChannelDescription =
      'A once-a-day prompt to record how you are feeling.';

  /// Fixed id: one prompt a day, so rescheduling replaces rather than stacks.
  static const moodNotificationId = 90000002;

  /// Schedule the daily prompt at [hhmm] local ('HH:mm').
  ///
  /// `matchDateTimeComponents: time` makes this repeat daily off a single
  /// alarm, so it survives reboots and does not need re-arming each morning.
  Future<void> scheduleMoodReminder(String hhmm) async {
    if (!_supported) return;
    await init();
    await cancelMoodReminder();
    if (!await hasPermission()) return;

    final parts = hhmm.split(':');
    if (parts.length != 2) return;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return;

    final now = tz.TZDateTime.now(tz.local);
    var when = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    // Today's slot has already passed, so the first fire is tomorrow. Without
    // this the plugin fires immediately on scheduling.
    if (!when.isAfter(now)) when = when.add(const Duration(days: 1));

    try {
      await _plugin.zonedSchedule(
        moodNotificationId,
        'How was today?',
        'Ten seconds, one slider.',
        when,
        payload: moodPayload,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _moodChannelId,
            _moodChannelName,
            channelDescription: _moodChannelDescription,
            // Deliberately lower than a focus alarm. This is an invitation, not
            // something the user is waiting on.
            importance: Importance.defaultImportance,
            priority: Priority.defaultPriority,
          ),
        ),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        matchDateTimeComponents: DateTimeComponents.time,
      );
    } catch (e) {
      debugPrint('[notify] mood schedule failed: $e');
    }
  }

  Future<void> cancelMoodReminder() async {
    if (!_supported) return;
    await init();
    await _plugin.cancel(moodNotificationId);
  }

  Future<void> cancelFocusEnd() async {
    if (!_supported) return;
    await init();
    await _plugin.cancel(focusNotificationId);
  }

  Future<void> cancelAll() async {
    if (!_supported) return;
    await init();
    await _plugin.cancelAll();
  }

  bool get _supported => defaultTargetPlatform == TargetPlatform.android;
}

class ReminderDiagnostics {
  const ReminderDiagnostics({
    required this.permissionGranted,
    required this.exactAlarmsAllowed,
    required this.scheduledCount,
  });

  final bool permissionGranted;
  final bool exactAlarmsAllowed;
  final int scheduledCount;

  bool get healthy => permissionGranted && scheduledCount > 0;
}


