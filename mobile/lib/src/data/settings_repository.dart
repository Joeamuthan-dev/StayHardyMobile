import 'package:flutter/material.dart';

import 'database.dart';

/// Typed access to the `settings` key/value table.
///
/// Keys are declared here and nowhere else, so a rename is one edit rather than
/// a grep across the app. Reads are cached in memory after first load — settings
/// are consulted on nearly every build and a disk hit per frame is wasteful.
abstract final class SettingsKeys {
  static const themeMode = 'theme_mode';
  static const weekStartDow = 'week_start_dow';
  static const isPro = 'is_pro';
  static const grandfatheredHabitCount = 'grandfathered_habit_count';
  static const lastBackupAt = 'last_backup_at';
  static const onboardingComplete = 'onboarding_complete';
  static const restorePromptShown = 'restore_prompt_shown';

  /// True once badges have been evaluated at least once on this device.
  ///
  /// Gates the celebration popup: the first evaluation after an install or an
  /// import qualifies for everything at once, and nine popups stacked up is not
  /// a celebration.
  static const badgesEvaluated = 'badges_evaluated';

  /// Highest XP ever derived. XP is recomputed from lifetime totals, so this
  /// ratchet is what stops a deleted habit taking a level away.
  static const xpHighWater = 'xp_high_water';

  /// Cached announcements, so the updates screen opens instantly and works
  /// offline. Content that is not urgent should never be behind a spinner.
  static const announcementsCache = 'announcements_cache';

  /// When the user last opened the updates screen, ISO 8601.
  static const announcementsSeenAt = 'announcements_seen_at';

  /// True once the user has read the screen-time disclosure and agreed to it.
  ///
  /// Play requires a prominent in-app disclosure BEFORE usage access is
  /// requested. This flag is what proves the disclosure came first, and the
  /// only call site that opens the usage-access screen is gated on it.
  static const screenTimeDisclosureAccepted = 'screen_time_disclosure_accepted';

  /// Watermark for the streak-freeze rollover, 'YYYY-MM-DD'.
  ///
  /// The single thing standing between "freezes are earned by showing up" and
  /// "freezes are earned by changing the device clock" — see [FreezeRules].
  static const lastFreezeRunDate = 'last_freeze_run_date';

  /// Whether mood tracking is on. Off by default — an app that starts asking
  /// how you feel without being asked is intrusive, and this is the one feature
  /// where opt-in has to be real rather than a default someone has to find.
  static const moodEnabled = 'mood_enabled';

  /// When to ask, 'HH:mm' local. Null means enabled but never prompting.
  static const moodReminderTime = 'mood_reminder_time';

  /// Whether the automatic notification-permission ask has happened.
  ///
  /// Reminders are meant to be on by default, but Android 13 makes "on" a
  /// runtime permission — so default-on means asking once, unprompted, at a
  /// moment the user is settled. This flag is what makes it exactly once:
  /// re-asking on every launch is how apps train people to hit "don't allow".
  static const notificationAskDone = 'notification_permission_asked';

  /// Whether the first-run habit-finder offer has been made.
  static const habitFinderOfferDone = 'habit_finder_offer_done';

  /// The last circle-news announcement id already shown as a notification.
  static const circleNewsLastNotified = 'circle_news_last_notified';

  /// 'YYYY-MM-DD' of the last app open, and the consecutive-day open streak
  /// it anchors — inputs to the rating ask, see [ReviewRules].
  static const lastAppOpenDate = 'last_app_open_date';
  static const appOpenStreak = 'app_open_streak';

  /// Epoch ms of the last Play rating ask, and how many have ever been made.
  static const ratingAskedLast = 'rating_asked_last';
  static const ratingAskCount = 'rating_ask_count';

  /// Epoch ms of the last Play update check.
  static const updateCheckLast = 'update_check_last';

  /// Whether the one-time "turn on auto backup?" ask has been made (Pro).
  static const autoBackupOfferDone = 'auto_backup_offer_done';

  /// Whether the one-time "restore from your Drive?" ask has been made (Pro).
  static const driveRestoreOfferDone = 'drive_restore_offer_done';

  /// Whether the Pro daily Drive auto-backup is switched on.
  static const autoBackupEnabled = 'auto_backup_enabled';

  /// The free tier's on-device daily copy, independent of Drive.
  ///
  /// Split from [autoBackupEnabled] because one flag was doing two jobs: a free
  /// member switching "auto backup" on and a Pro member connecting Drive are
  /// different promises, and sharing a key meant turning one off turned the
  /// other off too.
  static const localAutoBackupEnabled = 'local_auto_backup_enabled';

  /// Set once the Pro default for Drive backup has been applied on this device.
  ///
  /// Without this marker, "Pro users get it on by default" would re-enable it
  /// on every launch and quietly overrule anyone who deliberately turned it
  /// off. The default is a starting position, not a policy.
  static const autoBackupDefaulted = 'auto_backup_defaulted';

  /// Whether the one-time StayHardy Circle invitation card was dismissed.
  ///
  /// Locked decision: the global circle is **never auto-joined**. The card
  /// appears once, and "not now" collapses it to a quiet link — this flag is
  /// what keeps the promise that it was one time.
  static const globalCirclePromptDismissed = 'global_circle_prompt_dismissed';

  /// The user's own app → usage-category rulings, as a JSON object.
  ///
  /// Held here rather than in a table because it is small, sparse, and only
  /// ever read as a whole. It must survive everything: once someone has told
  /// the app that YouTube is work for them, re-guessing would be the single
  /// most annoying thing the feature could do.
  static const usageOverrides = 'usage_category_overrides';
}

class SettingsRepository {
  SettingsRepository(this._db);

  final AppDatabase _db;
  final Map<String, String> _cache = {};
  bool _loaded = false;

  Future<void> _ensureLoaded() async {
    if (_loaded) return;
    final rows = await _db.select(_db.settings).get();
    for (final r in rows) {
      _cache[r.key] = r.value;
    }
    _loaded = true;
  }

  Future<String?> getString(String key) async {
    await _ensureLoaded();
    return _cache[key];
  }

  Future<int?> getInt(String key) async {
    final v = await getString(key);
    return v == null ? null : int.tryParse(v);
  }

  Future<bool> getBool(String key, {bool fallback = false}) async {
    final v = await getString(key);
    return v == null ? fallback : v == 'true';
  }

  Future<void> set(String key, String value) async {
    await _ensureLoaded();
    _cache[key] = value;
    await _db.into(_db.settings).insertOnConflictUpdate(
          Setting(
            key: key,
            value: value,
            updatedAt: DateTime.now().millisecondsSinceEpoch,
          ),
        );
  }

  Future<ThemeMode> themeMode() async {
    final raw = await getString(SettingsKeys.themeMode);
    return switch (raw) {
      'dark' => ThemeMode.dark,
      'light' => ThemeMode.light,
      // System is the default. Dark is the intended look, but overriding the
      // user's OS-level choice on first launch is presumptuous.
      _ => ThemeMode.system,
    };
  }

  Future<void> setThemeMode(ThemeMode mode) =>
      set(SettingsKeys.themeMode, mode.name);
}
