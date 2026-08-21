import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Dart side of the Capacitor-Preferences bridge.
///
/// See `android/.../LegacyPrefsBridge.kt` for why this exists and what the final
/// Capacitor release left behind.
class LegacyPrefs {
  const LegacyPrefs([this._channel = _defaultChannel]);

  static const _defaultChannel =
      MethodChannel('com.stayhardy.app/legacy_prefs');
  final MethodChannel _channel;

  /// Key holding the JSON array of Supabase session keys that were carried over.
  static const sessionIndexKey = 'v2_session_keys';

  /// Marker the bridge release wrote once it finished copying.
  static const bridgeMarkerKey = 'v2_bridge_completed_at';

  static const routineOrderPrefix = 'routine_order_';
  static const themeKey = 'theme';
  static const languageKey = 'language';

  /// Every bridged value. Empty on iOS, on a fresh install, or if the user
  /// never received the bridge release — all of which are normal.
  Future<Map<String, String>> readAll() async {
    if (!_supported) return const {};
    try {
      final raw = await _channel.invokeMapMethod<String, String>('readAll');
      return raw ?? const {};
    } on PlatformException catch (e) {
      debugPrint('[legacy] readAll failed: ${e.message}');
      return const {};
    } on MissingPluginException {
      // Running on a platform without the bridge. Not an error.
      return const {};
    }
  }

  /// The Supabase session JSON left by the Capacitor build, if any.
  ///
  /// Returns the first entry that parses as a session with a refresh token,
  /// along with the keys that should be deleted once it has been consumed.
  Future<({String json, List<String> keys})?> recoverSession() async {
    final all = await readAll();
    if (all.isEmpty) return null;

    final index = all[sessionIndexKey];
    final keys = <String>[];
    if (index != null) {
      try {
        keys.addAll((jsonDecode(index) as List).cast<String>());
      } catch (_) {
        // Index unreadable — fall through to scanning below.
      }
    }
    if (keys.isEmpty) {
      keys.addAll(all.keys.where((k) => k.startsWith('sb-')));
    }

    for (final key in keys) {
      final value = all[key];
      if (value == null) continue;
      try {
        final parsed = jsonDecode(value);
        if (parsed is Map && parsed['refresh_token'] is String) {
          return (json: value, keys: [...keys, sessionIndexKey]);
        }
      } catch (_) {
        continue;
      }
    }
    return null;
  }

  /// Delete the carried-over session.
  ///
  /// Must be called immediately after the session is handed to secure storage —
  /// the whole point of the bridge is that these tokens live in unencrypted
  /// storage for one launch and no longer.
  Future<void> clear(List<String> keys) async {
    if (!_supported || keys.isEmpty) return;
    try {
      await _channel.invokeMethod<bool>('remove', {'keys': keys});
    } on PlatformException catch (e) {
      debugPrint('[legacy] clear failed: ${e.message}');
    } on MissingPluginException {
      // Nothing to clear.
    }
  }

  /// Habit ordering from the Capacitor build, as remote routine ids in display
  /// order, keyed by the legacy user id.
  Future<List<String>> routineOrder(String userId) async {
    final all = await readAll();
    final raw = all['$routineOrderPrefix$userId'];
    if (raw == null) return const [];
    try {
      return (jsonDecode(raw) as List).cast<String>();
    } catch (_) {
      return const [];
    }
  }

  bool get _supported => defaultTargetPlatform == TargetPlatform.android;
}
