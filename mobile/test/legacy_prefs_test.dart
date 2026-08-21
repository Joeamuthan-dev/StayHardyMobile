import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/migration/legacy_prefs.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('test/legacy_prefs');
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  late Map<String, String> store;
  late List<List<String>> removals;

  void install({bool throwOnRead = false}) {
    messenger.setMockMethodCallHandler(channel, (call) async {
      switch (call.method) {
        case 'readAll':
          if (throwOnRead) {
            throw PlatformException(code: 'boom', message: 'prefs unavailable');
          }
          return store;
        case 'remove':
          final keys =
              (call.arguments as Map)['keys'] as List;
          removals.add(keys.cast<String>());
          for (final k in keys) {
            store.remove(k);
          }
          return true;
      }
      return null;
    });
  }

  setUp(() {
    store = {};
    removals = [];
  });

  tearDown(() => messenger.setMockMethodCallHandler(channel, null));

  const prefs = LegacyPrefs(channel);

  String session({String refresh = 'r-token'}) => jsonEncode({
        'access_token': 'a-token',
        'refresh_token': refresh,
        'expires_at': 1786000000,
      });

  test('recovers a session listed in the index', () async {
    store = {
      LegacyPrefs.sessionIndexKey: jsonEncode(['sb-abc-auth-token']),
      'sb-abc-auth-token': session(),
      LegacyPrefs.themeKey: 'dark',
    };
    install();

    final found = await prefs.recoverSession();
    expect(found, isNotNull);
    expect(jsonDecode(found!.json)['refresh_token'], 'r-token');
    expect(found.keys, contains('sb-abc-auth-token'));
    expect(found.keys, contains(LegacyPrefs.sessionIndexKey));
  });

  test('falls back to scanning sb-* when the index is missing or corrupt',
      () async {
    store = {
      LegacyPrefs.sessionIndexKey: '{not json',
      'sb-xyz-auth-token': session(refresh: 'scanned'),
    };
    install();

    final found = await prefs.recoverSession();
    expect(found, isNotNull);
    expect(jsonDecode(found!.json)['refresh_token'], 'scanned');
  });

  test('ignores a value that is not a session', () async {
    // A key that matches the family but holds something else must not be
    // handed to Supabase as a session.
    store = {
      LegacyPrefs.sessionIndexKey: jsonEncode(['sb-abc-auth-token']),
      'sb-abc-auth-token': jsonEncode({'not': 'a session'}),
    };
    install();

    expect(await prefs.recoverSession(), isNull);
  });

  test('returns null on a fresh install', () async {
    install();
    expect(await prefs.recoverSession(), isNull);
  });

  test('a platform failure degrades to null rather than crashing boot',
      () async {
    install(throwOnRead: true);
    expect(await prefs.recoverSession(), isNull);
    expect(await prefs.routineOrder('u-1'), isEmpty);
  });

  test('clear removes exactly the keys it was given', () async {
    store = {
      LegacyPrefs.sessionIndexKey: jsonEncode(['sb-abc-auth-token']),
      'sb-abc-auth-token': session(),
      LegacyPrefs.themeKey: 'dark',
    };
    install();

    final found = await prefs.recoverSession();
    await prefs.clear(found!.keys);

    expect(removals, hasLength(1));
    expect(store.containsKey('sb-abc-auth-token'), isFalse,
        reason: 'the refresh token must not survive first launch');
    expect(store[LegacyPrefs.themeKey], 'dark',
        reason: 'non-session state is left alone');
  });

  test('reads habit ordering, tolerating corrupt json', () async {
    store = {'${LegacyPrefs.routineOrderPrefix}u-1': jsonEncode(['a', 'b'])};
    install();
    expect(await prefs.routineOrder('u-1'), ['a', 'b']);

    store = {'${LegacyPrefs.routineOrderPrefix}u-1': 'garbage'};
    expect(await prefs.routineOrder('u-1'), isEmpty);
    expect(await prefs.routineOrder('nobody'), isEmpty);
  });
}
