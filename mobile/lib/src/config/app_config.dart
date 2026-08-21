/// Build-time configuration.
///
/// The production values are compiled in as defaults, overridable with
/// `--dart-define` / `--dart-define-from-file` for a different environment.
/// They are all public-by-design: the anon key ships inside every APK and is
/// protected by row-level security, not secrecy; the RevenueCat key and the
/// Google web client id are likewise public identifiers.
///
/// Defaults exist because the app must NEVER run without a backend: the login
/// gate is absolute, and a build that silently lost its credentials used to
/// fall into a "local only" mode that let anyone straight past sign-in —
/// which is exactly what happened the first time the project was run from
/// Android Studio without the dart-define file.
///
/// The service-role key must never appear in the app under any circumstance.
abstract final class AppConfig {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://tiavhmbpplerffdjmodw.supabase.co',
  );
  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpYXZobWJwcGxlcmZmZGptb2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NDYxNDUsImV4cCI6MjA4OTAyMjE0NX0.fEds7QOgCfz_w7kpOKNz5xxCdJvPo3ShuPrWwCDNv2s',
  );

  /// The **Web** OAuth client id, not an Android one. Google Sign-In on Android
  /// mints an ID token *for* the web client, and Supabase validates it against
  /// that audience. Passing an Android client id here is the classic reason
  /// sign-in works in debug and fails for every Play Store user.
  static const googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue:
        '766645579986-mspdbvmlgcatm7kid24j1hvs8irvhidh.apps.googleusercontent.com',
  );

  /// Whether a backend is wired up at all.
  ///
  /// Always true in practice now that defaults are compiled in — kept because
  /// services still guard on it, and because tests can blank the values via
  /// dart-define to exercise their degraded paths.
  static bool get hasBackend =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  static bool get hasGoogleSignIn =>
      hasBackend && googleServerClientId.isNotEmpty;

  /// RevenueCat public SDK key. Safe to embed — it can only read offerings and
  /// make purchases as the signed-in app user.
  static const revenueCatAndroidKey = String.fromEnvironment(
    'REVENUECAT_ANDROID_KEY',
    defaultValue: 'goog_FoCItomkyOvFfxbPYCSrBihMFKM',
  );

  static bool get hasBilling => revenueCatAndroidKey.isNotEmpty;

  /// Entitlement identifier, unchanged from the Capacitor build.
  ///
  /// Renaming this would strand every existing subscriber — RevenueCat matches
  /// on the exact string.
  static const proEntitlementId = 'StayHardy Pro';

  /// Legacy PIN → Supabase password.
  ///
  /// Reproduces `padPinForAuth` from the Capacitor build exactly
  /// (`frontend/src/utils/pinUtils.ts`). Every existing user's password is this
  /// string, so it cannot change without locking them all out.
  ///
  /// It is also only a 10,000-value space, which is precisely why Google
  /// Sign-In is the primary path and why linking is nudged after a PIN login.
  static String padPinForAuth(String pin) => 'SH$pin';
}
