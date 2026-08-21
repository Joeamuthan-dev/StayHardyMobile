import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/auth_service.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/providers.dart';
import 'package:stayhardy/src/data/settings_repository.dart';
import 'package:stayhardy/src/data/subscription_service.dart';

/// Stands in for the network. `null` is the case that matters most: it means
/// the server could not be reached, not that the user is on the free tier.
class _FakeAuth extends AuthService {
  _FakeAuth(this.serverPro);

  final bool? serverPro;

  @override
  Future<bool?> fetchServerIsPro() async => serverPro;
}

void main() {
  late AppDatabase db;
  late SettingsRepository settings;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    settings = SettingsRepository(db);
  });

  tearDown(() => db.close());

  Future<IsProNotifier> notifierWith({
    bool? server,
    bool cached = false,
  }) async {
    if (cached) await settings.set(SettingsKeys.isPro, 'true');
    final notifier =
        IsProNotifier(settings, SubscriptionService(), _FakeAuth(server));
    await notifier.refresh();
    return notifier;
  }

  test('a Pro user on a fresh install is not demoted to free', () async {
    // The exact production bug: 2.0 installs with an empty local database, so
    // the cached flag is false for everyone. Only the server knows.
    final notifier = await notifierWith(server: true);
    expect(notifier.state, isTrue);
  });

  test('the server answer is written back, so the next launch is right offline',
      () async {
    await notifierWith(server: true);
    expect(await settings.getBool(SettingsKeys.isPro), isTrue);
  });

  test('a free user stays free', () async {
    final notifier = await notifierWith(server: false);
    expect(notifier.state, isFalse);
  });

  test('the server revoking Pro clears a stale local cache', () async {
    final notifier = await notifierWith(server: false, cached: true);
    expect(notifier.state, isFalse);
    expect(await settings.getBool(SettingsKeys.isPro), isFalse);
  });

  test('an unreachable server never revokes Pro from someone who has it',
      () async {
    // Offline launch. Guessing "not Pro" here would lock a paying user out of
    // their own app on a train.
    final notifier = await notifierWith(server: null, cached: true);
    expect(notifier.state, isTrue);
    expect(await settings.getBool(SettingsKeys.isPro), isTrue,
        reason: 'silence must not overwrite the last confirmed answer');
  });

  test('an unreachable server does not invent Pro for a free user', () async {
    final notifier = await notifierWith(server: null);
    expect(notifier.state, isFalse);
  });
}
