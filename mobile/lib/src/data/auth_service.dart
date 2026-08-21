import 'dart:convert';

import 'dart:async';

import 'package:bcrypt/bcrypt.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_config.dart';
import '../migration/legacy_prefs.dart';

/// Session storage backed by the platform keystore.
///
/// Replaces `capacitor-secure-storage-plugin`, whose entries this build cannot
/// read — which is exactly why the bridge release copies the session out to
/// Preferences first. See [AuthService.recoverLegacySession].
class SecureSessionStorage extends LocalStorage {
  static const _key = 'supabase_session';
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  @override
  Future<void> initialize() async {}

  @override
  Future<String?> accessToken() async => _read();

  @override
  Future<bool> hasAccessToken() async => (await _read()) != null;

  @override
  Future<void> persistSession(String persistSessionString) async {
    try {
      await _storage.write(key: _key, value: persistSessionString);
    } catch (e) {
      debugPrint('[auth] persist failed: $e');
    }
  }

  @override
  Future<void> removePersistedSession() async {
    try {
      await _storage.delete(key: _key);
    } catch (e) {
      debugPrint('[auth] remove failed: $e');
    }
  }

  /// Reads defensively: the keystore throws on some Android 6–8 devices after a
  /// biometric enrolment change. The Capacitor build had the same guard, and
  /// losing it would turn a recoverable re-login into a crash loop.
  Future<String?> _read() async {
    try {
      return await _storage.read(key: _key);
    } catch (e) {
      debugPrint('[auth] read failed, treating as signed out: $e');
      return null;
    }
  }
}

enum AuthOutcome { success, invalidCredentials, unconfirmedEmail, network, unknown }

class AuthResult {
  const AuthResult(this.outcome, {this.message, this.userId});

  final AuthOutcome outcome;
  final String? message;
  final String? userId;

  bool get isSuccess => outcome == AuthOutcome.success;
}

class AuthService {
  AuthService([this._legacy = const LegacyPrefs()]);

  final LegacyPrefs _legacy;

  SupabaseClient get _client => Supabase.instance.client;

  static Future<void> initialize() async {
    if (!AppConfig.hasBackend) return;
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      // `anonKey` is deprecated in favour of `publishableKey`. Kept for now:
      // the project's existing key is an anon JWT, and swapping the parameter
      // without also rotating to a publishable key would break auth.
      // ignore: deprecated_member_use
      anonKey: AppConfig.supabaseAnonKey,
      authOptions: FlutterAuthClientOptions(
        localStorage: SecureSessionStorage(),
        // PKCE is the correct native flow and is what linkIdentity and magic
        // links need. The web build used implicit; that does not carry over.
        authFlowType: AuthFlowType.pkce,
      ),
    );
  }

  String? get currentUserId =>
      AppConfig.hasBackend ? _client.auth.currentUser?.id : null;

  String? get currentEmail =>
      AppConfig.hasBackend ? _client.auth.currentUser?.email : null;

  /// Whether an auth failure is really "the phone has no internet".
  ///
  /// supabase_flutter reports offline and DNS failures as
  /// [AuthRetryableFetchException], which subclasses `AuthException` and carries
  /// the raw socket error as its `message`. Handlers that catch `AuthException`
  /// and surface `e.message` therefore printed
  /// `ClientException with SocketException: Failed host lookup: '<project>.supabase.co'`
  /// at the user — an unreadable wall that also put the project URL on screen.
  ///
  /// The string check backs up the type check because the same condition
  /// surfaces as a plain `AuthException` on some gotrue paths.
  static bool _isOffline(AuthException e) {
    if (e is AuthRetryableFetchException) return true;
    final m = e.message.toLowerCase();
    return m.contains('socketexception') ||
        m.contains('failed host lookup') ||
        m.contains('clientexception') ||
        m.contains('network is unreachable') ||
        m.contains('connection refused') ||
        m.contains('connection closed');
  }

  static const _offlineResult = AuthResult(
    AuthOutcome.network,
    message: 'No internet connection. Connect and try again.',
  );

  /// The server's view of Pro, from `users.is_pro`.
  ///
  /// Null means "could not be established" — signed out, offline, or the row
  /// is missing — and callers must treat that as unknown rather than as false.
  /// Returning false there would strip Pro from a paying user on a flaky
  /// connection, which is the worst failure this check has.
  ///
  /// This column is the one place every route to Pro converges: the
  /// `revenuecat-webhook` mirrors store subscriptions into it (including
  /// clearing it on EXPIRATION), Razorpay lifetime purchases set it, and admin
  /// grants set it by hand. The device's own cached flag knows about none of
  /// that on a fresh install, which is why it cannot be the source of truth.
  Future<bool?> fetchServerIsPro() async {
    if (!AppConfig.hasBackend) return null;
    final userId = currentUserId;
    if (userId == null) return null;
    try {
      final row = await _client
          .from('users')
          .select('is_pro')
          .eq('id', userId)
          .maybeSingle();
      if (row == null) return null;
      return row['is_pro'] == true;
    } catch (e) {
      debugPrint('[auth] is_pro lookup failed: $e');
      return null;
    }
  }

  /// The signed-in user id, re-emitted on every auth event — sign-in,
  /// sign-out, and (the one nobody plans for) a session revoked server-side
  /// mid-run. Null means signed out. The boot gate lives off this: reading
  /// the id once at launch left a dead session showing the whole app until
  /// the next restart.
  Stream<String?> get userIdChanges {
    if (!AppConfig.hasBackend) return const Stream.empty();
    return _client.auth.onAuthStateChange.map((_) => currentUserId);
  }

  /// Fires when the app is opened from a password-recovery link. The link in
  /// the reset email points at stayhardy.com/auth/reset; when Android hands
  /// it to the app instead of the browser, supabase_flutter exchanges the
  /// code and emits this — at which point the user is signed in on a
  /// recovery session and must be walked straight to "set a new PIN".
  Stream<void> get passwordRecovery {
    if (!AppConfig.hasBackend) return const Stream.empty();
    return _client.auth.onAuthStateChange
        .where((s) => s.event == AuthChangeEvent.passwordRecovery)
        .map((_) {});
  }

  /// Finish a reset: the new PIN becomes the password, exactly the old
  /// app's shape ('SH' + pin), plus the non-fatal bcrypt mirror into
  /// users.pin that sign-up also writes.
  Future<AuthResult> completePinReset(String pin) async {
    if (!AppConfig.hasBackend || _client.auth.currentUser == null) {
      return const AuthResult(AuthOutcome.unknown,
          message: 'The reset link has expired. Request a new one.');
    }
    try {
      await _client.auth.updateUser(
        UserAttributes(password: AppConfig.padPinForAuth(pin)),
      );
    } on AuthException catch (e) {
      if (_isOffline(e)) return _offlineResult;
      return AuthResult(AuthOutcome.unknown, message: e.message);
    }

    try {
      final hashed = BCrypt.hashpw(pin, BCrypt.gensalt());
      await _client.from('users').update({'pin': hashed}).eq(
          'id', _client.auth.currentUser!.id);
    } catch (e) {
      // Mirror only — auth's password is the source of truth for sign-in.
      debugPrint('[auth] users.pin mirror failed: $e');
    }
    return const AuthResult(AuthOutcome.success);
  }

  /// Legacy PIN login, unchanged from the Capacitor build.
  ///
  /// The password is literally `'SH' + pin`, so this must not be "improved" —
  /// every existing account's password is that exact string.
  Future<AuthResult> signInWithPin(String email, String pin) async {
    if (!AppConfig.hasBackend) {
      return const AuthResult(AuthOutcome.unknown,
          message: 'Sign-in is unavailable in this build.');
    }

    try {
      final response = await _client.auth.signInWithPassword(
        // Normalised exactly as the old Login page did; some accounts were
        // created with mixed-case addresses.
        email: email.trim().toLowerCase(),
        password: AppConfig.padPinForAuth(pin),
      );
      return AuthResult(AuthOutcome.success, userId: response.user?.id);
    } on AuthException catch (e) {
      // Offline first: the raw socket text contains none of the keywords below,
      // so without this it falls through and is shown to the user verbatim.
      if (_isOffline(e)) return _offlineResult;
      final message = e.message.toLowerCase();
      if (message.contains('confirm')) {
        return const AuthResult(
          AuthOutcome.unconfirmedEmail,
          message: 'Please confirm your email address first. '
              'Check your inbox for the link we sent.',
        );
      }
      return const AuthResult(
        AuthOutcome.invalidCredentials,
        message: 'That email and PIN do not match an account.',
      );
    } catch (e) {
      debugPrint('[auth] pin sign-in failed: $e');
      return const AuthResult(
        AuthOutcome.network,
        message: 'Could not reach StayHardy. Check your connection.',
      );
    }
  }

  /// Create an account, exactly as the Capacitor build does.
  ///
  /// Three things are load-bearing and none may be "improved":
  ///
  /// * the password is `'SH' + pin` — every path that ever signs this user in
  ///   again builds the same string;
  /// * `emailRedirectTo` is the same hosted page the live app uses, so the
  ///   confirmation email's link keeps working without new infrastructure;
  /// * the `public.users` row carries a **bcrypt** hash of the pin, because
  ///   that is what the web app's legacy verification reads. The insert is
  ///   non-fatal there and non-fatal here — a missed profile row must not
  ///   strand a created auth account.
  Future<AuthResult> signUp({
    required String email,
    required String pin,
    required String name,
  }) async {
    if (!AppConfig.hasBackend) {
      return const AuthResult(AuthOutcome.unknown,
          message: 'Sign-up is unavailable in this build.');
    }

    final cleanEmail = email.trim().toLowerCase();
    try {
      final response = await _client.auth.signUp(
        email: cleanEmail,
        password: AppConfig.padPinForAuth(pin),
        emailRedirectTo: 'https://stayhardy.com/auth/verify',
        data: {'name': name.trim()},
      );

      final userId = response.user?.id;
      if (userId != null) {
        // Background and non-fatal, matching the old build.
        unawaited(() async {
          try {
            final hashed = BCrypt.hashpw(pin, BCrypt.gensalt());
            await _client.from('users').insert({
              'id': userId,
              'email': cleanEmail,
              'name': name.trim(),
              'pin': hashed,
              'created_at': DateTime.now().toIso8601String(),
            });
          } catch (e) {
            debugPrint('[auth] profile insert failed (non-fatal): $e');
          }
        }());
      }

      // Supabase returns a user with no session when email confirmation is
      // on — which it is for this project. The account exists; the user's
      // next step is their inbox, and the UI has to say so.
      if (response.session == null) {
        return const AuthResult(
          AuthOutcome.unconfirmedEmail,
          message: 'Account created. Check your email for the '
              'confirmation link, then sign in.',
        );
      }
      return AuthResult(AuthOutcome.success, userId: userId);
    } on AuthException catch (e) {
      if (_isOffline(e)) return _offlineResult;
      final message = e.message.toLowerCase();
      if (message.contains('already registered') ||
          message.contains('already exists')) {
        return const AuthResult(
          AuthOutcome.invalidCredentials,
          message: 'That email already has an account. Sign in instead — '
              'or use Forgot PIN if you cannot get in.',
        );
      }
      if (message.contains('rate limit') || message.contains('too many')) {
        return const AuthResult(
          AuthOutcome.network,
          message: 'Too many attempts. Wait a moment and try again.',
        );
      }
      return AuthResult(AuthOutcome.unknown, message: e.message);
    } catch (e) {
      debugPrint('[auth] sign-up failed: $e');
      return const AuthResult(
        AuthOutcome.network,
        message: 'Could not reach StayHardy. Check your connection.',
      );
    }
  }

  /// Send the PIN-reset email.
  ///
  /// The redirect is the app's own scheme, **not** the website, and that is
  /// forced by PKCE rather than being a preference. The emailed link carries a
  /// `code` that can only be exchanged by the client holding the matching
  /// verifier — this app, on this device. Pointing it at
  /// `https://stayhardy.com/auth/reset` sent people to a web page that has no
  /// verifier and cannot finish the reset, which is why the link appeared to
  /// "just open the website" with no way to choose a new PIN.
  ///
  /// A custom scheme also removes the dependency on Android App Link
  /// verification: `https` links reached through Supabase's redirect are
  /// completed inside the browser and never handed to the app, whereas
  /// `stayhardy://` always is. Same-device-only is not a limitation here —
  /// PKCE requires it regardless.
  ///
  /// `auth/callback` rather than a reset-specific path purely because it is
  /// already on the project's allow-list. Supabase matches `redirectTo`
  /// exactly, and an unlisted URL is rejected outright — so the path here must
  /// never be "improved" without adding the new value in Supabase →
  /// Authentication → URL Configuration → Redirect URLs first.
  ///
  /// The path carries no meaning to the app either way: supabase_flutter reads
  /// the recovery code out of whatever `stayhardy://` link arrives and emits
  /// [passwordRecovery], which is what routes to the set-a-new-PIN screen.
  static const pinResetRedirect = 'stayhardy://auth/callback';

  Future<AuthResult> sendPinReset(String email) async {
    if (!AppConfig.hasBackend) {
      return const AuthResult(AuthOutcome.unknown,
          message: 'Reset is unavailable in this build.');
    }
    try {
      await _client.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        redirectTo: pinResetRedirect,
      );
      return const AuthResult(
        AuthOutcome.success,
        message: 'Reset link sent. Open it on this phone — it comes straight '
            'back here to set a new PIN.',
      );
    } on AuthException catch (e) {
      if (_isOffline(e)) return _offlineResult;
      return AuthResult(AuthOutcome.unknown, message: e.message);
    } catch (e) {
      debugPrint('[auth] reset failed: $e');
      return const AuthResult(
        AuthOutcome.network,
        message: 'Could not reach StayHardy. Check your connection.',
      );
    }
  }

  /// Google sign-in via a native ID token.
  ///
  /// `serverClientId` is the **Web** OAuth client, not an Android one: Android
  /// mints an ID token *for* the web client, and Supabase validates that
  /// audience. Both the upload-key and Play App Signing SHA-1s must also be
  /// registered as Android OAuth clients, or this works in debug and fails for
  /// every Play Store user.
  ///
  /// Drive scope is deliberately NOT requested here. Asking for Drive access on
  /// the very first screen measurably hurts activation; it is requested
  /// incrementally when the user turns on backup.
  Future<AuthResult> signInWithGoogle() async {
    if (!AppConfig.hasGoogleSignIn) {
      return const AuthResult(
        AuthOutcome.unknown,
        message: 'Google sign-in is not configured in this build.',
      );
    }

    try {
      final google = GoogleSignIn(
        serverClientId: AppConfig.googleServerClientId,
        scopes: const ['email', 'profile'],
      );

      // Sign out first so the account chooser always appears. Silently reusing
      // the last account is confusing on a shared or multi-account phone.
      await google.signOut();

      final account = await google.signIn();
      if (account == null) {
        // User dismissed the chooser. Not an error, and must not show one.
        return const AuthResult(AuthOutcome.unknown);
      }

      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null) {
        return const AuthResult(
          AuthOutcome.unknown,
          message: 'Google did not return a sign-in token. '
              'Check the OAuth client configuration.',
        );
      }

      final response = await _client.auth.signInWithIdToken(
        provider: OAuthProvider.google,
        idToken: idToken,
        accessToken: auth.accessToken,
      );
      return AuthResult(AuthOutcome.success, userId: response.user?.id);
    } on AuthException catch (e) {
      debugPrint('[auth] google sign-in rejected: ${e.message}');
      return const AuthResult(
        AuthOutcome.invalidCredentials,
        message: 'Google sign-in was refused. Please try again.',
      );
    } catch (e) {
      debugPrint('[auth] google sign-in failed: $e');
      return const AuthResult(
        AuthOutcome.network,
        message: 'Could not complete Google sign-in. '
            'Check your connection and try again.',
      );
    }
  }

  /// Adopt the session the Capacitor build left behind.
  ///
  /// Without this, every existing user is signed out by the upgrade and has to
  /// remember a 4-digit PIN set months ago — over an email some never confirmed.
  ///
  /// The carried keys are deleted the moment the session is adopted, so the
  /// refresh token sits in unencrypted storage for one launch and no longer.
  Future<bool> recoverLegacySession() async {
    if (!AppConfig.hasBackend) return false;
    if (_client.auth.currentSession != null) return true;

    final found = await _legacy.recoverSession();
    if (found == null) return false;

    try {
      // The stored value is the supabase-js session object; recoverSession
      // wants the same JSON shape.
      final decoded = jsonDecode(found.json);
      await _client.auth.recoverSession(jsonEncode(decoded));

      final ok = _client.auth.currentSession != null;
      if (ok) await _legacy.clear(found.keys);
      return ok;
    } catch (e) {
      debugPrint('[auth] legacy session recovery failed: $e');
      return false;
    }
  }

  /// Email prefill for a user whose session could not be carried over.
  Future<String?> legacyEmailHint() async {
    final all = await _legacy.readAll();
    return all['saved_email'] ?? all['remembered_email'];
  }

  Future<void> signOut() async {
    if (!AppConfig.hasBackend) return;
    try {
      await _client.auth.signOut();
    } catch (e) {
      debugPrint('[auth] sign-out failed: $e');
    }
  }
}
