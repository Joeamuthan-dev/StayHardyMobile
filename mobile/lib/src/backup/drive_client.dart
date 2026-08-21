import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'backup_container.dart';
import 'backup_retention.dart';

/// Why a Drive operation could not run.
enum DriveFailure {
  /// The `drive.appdata` scope has not been granted *by this user yet*.
  ///
  /// The normal state before someone connects Drive, and after they revoke it
  /// from their Google account. Nothing in the UI may show a backup as
  /// succeeded on the strength of a call that returned this.
  notAuthorised,

  /// Signed out, or signed in with PIN rather than Google.
  noAccount,

  /// Offline, or Drive returned 5xx.
  network,

  /// Drive rejected the request — quota, revoked token, malformed file.
  rejected,

  /// The build has no Google client id configured.
  notConfigured,
}

class DriveException implements Exception {
  const DriveException(this.failure, [this.detail]);

  final DriveFailure failure;
  final String? detail;

  /// What the user is told. Never a raw HTTP error.
  String get message => switch (failure) {
        DriveFailure.notAuthorised =>
          'StayHardy does not have permission to use your Google Drive yet.',
        DriveFailure.noAccount =>
          'Sign in with Google to back up to Drive.',
        DriveFailure.network =>
          'Could not reach Google Drive. Check your connection.',
        DriveFailure.rejected =>
          'Google Drive refused the request. Your Drive may be full.',
        DriveFailure.notConfigured =>
          'Drive backup is not available in this build.',
      };

  @override
  String toString() => 'DriveException($failure): ${detail ?? message}';
}

/// A backup sitting in Drive.
class DriveBackup {
  const DriveBackup({
    required this.fileId,
    required this.name,
    required this.createdAt,
    required this.sizeBytes,
    this.header,
  });

  final String fileId;
  final String name;
  final int createdAt;
  final int sizeBytes;

  /// Reconstructed from `appProperties` — **no download required**.
  ///
  /// This is the whole reason the header is duplicated into Drive metadata:
  /// listing ten backups with their dates and counts is one `files.list` call,
  /// not ten downloads of a gzipped blob over a phone connection.
  final BackupHeader? header;

  BackupRecord get asRecord =>
      BackupRecord(id: fileId, createdAt: createdAt, sizeBytes: sizeBytes);
}

/// Google Drive `appDataFolder` client.
///
/// Hand-rolled REST rather than `googleapis` + `extension_google_sign_in`: the
/// whole surface used here is four calls, and those packages pull in a large
/// generated API and a second auth path that would have to be kept in step with
/// the Supabase session that is already the app's identity.
///
/// **appDataFolder, not the user's Drive.** Files written there are invisible in
/// the Drive UI, count against the user's quota but cannot be opened or deleted
/// by hand, and are removed by Google when the app is uninstalled. It is the
/// correct place for a backup nobody should have to look at, and it is the
/// narrowest scope that can hold one.
class DriveClient {
  DriveClient({http.Client? httpClient, GoogleSignIn? signIn})
      : _http = httpClient ?? http.Client(),
        _signIn = signIn ??
            GoogleSignIn(
              serverClientId: AppConfig.googleServerClientId,
              scopes: const ['email', 'profile', driveAppDataScope],
            );

  /// The narrowest scope that can hold a backup. Not `drive.file`, not `drive`.
  static const driveAppDataScope =
      'https://www.googleapis.com/auth/drive.appdata';

  static const _apiBase = 'https://www.googleapis.com/drive/v3';
  static const _uploadBase = 'https://www.googleapis.com/upload/drive/v3';

  final http.Client _http;
  final GoogleSignIn _signIn;

  /// Whether the user has already granted the Drive scope.
  ///
  /// Checked without prompting, so the backup screen can show its real state on
  /// arrival rather than throwing a consent dialog at someone who only opened
  /// Settings to change the theme.
  /// Whether there is a Google account this device can act as.
  ///
  /// Deliberately NOT a scope check. `canAccessScopes` was the gate here and
  /// it can still answer false immediately after `requestScopes` has returned
  /// true — which produced a screen saying "Drive connected." directly above a
  /// card saying it was not, and a CONNECT button that never went away.
  ///
  /// The authority on whether the scope works is Drive itself: a request
  /// without it comes back 401/403, which [_send] already reports as
  /// [DriveFailure.notAuthorised]. So this only answers the cheap half — is
  /// there an account at all — and the real call decides the rest.
  Future<bool> hasAccount() async {
    if (!AppConfig.hasGoogleSignIn) return false;
    try {
      final account =
          _signIn.currentUser ?? await _signIn.signInSilently();
      return account != null;
    } catch (e) {
      debugPrint('[drive] account check failed: $e');
      return false;
    }
  }

  /// Ask for the Drive scope.
  ///
  /// Incremental by design: the scope is requested here, at the moment the user
  /// turns backup on, rather than bundled into the first sign-in. Asking a
  /// stranger for access to their Drive on the login screen measurably costs
  /// activation, and most users never turn backup on at all.
  ///
  /// Returns false when the user declines — which is a normal answer, not an
  /// error, and must not produce a failure dialog.
  Future<bool> requestScope() async {
    if (!AppConfig.hasGoogleSignIn) return false;
    try {
      final account =
          _signIn.currentUser ?? await _signIn.signIn();
      if (account == null) return false;
      return await _signIn.requestScopes(const [driveAppDataScope]);
    } catch (e) {
      debugPrint('[drive] scope request failed: $e');
      return false;
    }
  }

  /// List every backup, newest first. One round trip, no downloads.
  Future<List<DriveBackup>> list() async {
    final headers = await _authHeaders();

    final uri = Uri.parse('$_apiBase/files').replace(queryParameters: {
      'spaces': 'appDataFolder',
      'orderBy': 'createdTime desc',
      'pageSize': '50',
      'fields': 'files(id,name,createdTime,size,appProperties)',
    });

    final response = await _send(() => _http.get(uri, headers: headers));
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final files = (body['files'] as List? ?? const []);

    return [
      for (final f in files.cast<Map<String, dynamic>>())
        DriveBackup(
          fileId: f['id'] as String,
          name: f['name'] as String? ?? 'backup',
          createdAt: DateTime.tryParse(f['createdTime'] as String? ?? '')
                  ?.millisecondsSinceEpoch ??
              0,
          sizeBytes: int.tryParse('${f['size'] ?? 0}') ?? 0,
          header: headerFromProperties(
            (f['appProperties'] as Map?)?.cast<String, dynamic>(),
          ),
        ),
    ];
  }

  /// Upload a snapshot. Returns the new file id.
  Future<String> upload({
    required List<int> bytes,
    required BackupHeader header,
    required String name,
  }) async {
    final headers = await _authHeaders();

    final metadata = <String, dynamic>{
      'name': name,
      'parents': ['appDataFolder'],
      // The header duplicated as metadata, so [list] can show what is in each
      // backup without downloading any of them.
      'appProperties': propertiesFromHeader(header),
    };

    // Multipart related, built by hand: `http.MultipartRequest` produces
    // form-data, which Drive rejects for this endpoint.
    const boundary = 'stayhardy-backup-boundary';
    final body = <int>[
      ...utf8.encode('--$boundary\r\n'
          'Content-Type: application/json; charset=UTF-8\r\n\r\n'
          '${jsonEncode(metadata)}\r\n'
          '--$boundary\r\n'
          'Content-Type: application/octet-stream\r\n\r\n'),
      ...bytes,
      ...utf8.encode('\r\n--$boundary--'),
    ];

    final uri = Uri.parse('$_uploadBase/files')
        .replace(queryParameters: {'uploadType': 'multipart', 'fields': 'id'});

    final response = await _send(() => _http.post(
          uri,
          headers: {
            ...headers,
            'Content-Type': 'multipart/related; boundary=$boundary',
          },
          body: body,
        ));

    return (jsonDecode(response.body) as Map<String, dynamic>)['id'] as String;
  }

  Future<List<int>> download(String fileId) async {
    final headers = await _authHeaders();
    final uri = Uri.parse('$_apiBase/files/$fileId')
        .replace(queryParameters: {'alt': 'media'});
    final response = await _send(() => _http.get(uri, headers: headers));
    return response.bodyBytes;
  }

  Future<void> delete(String fileId) async {
    final headers = await _authHeaders();
    await _send(
      () => _http.delete(Uri.parse('$_apiBase/files/$fileId'), headers: headers),
      allowEmpty: true,
    );
  }

  /// Bearer headers, or a typed failure.
  ///
  /// Never prompts. A background backup that popped a consent dialog would be
  /// indefensible, so this reports [DriveFailure.notAuthorised] and lets the UI
  /// decide whether to ask.
  Future<Map<String, String>> _authHeaders() async {
    if (!AppConfig.hasGoogleSignIn) {
      throw const DriveException(DriveFailure.notConfigured);
    }

    final account = _signIn.currentUser ?? await _signIn.signInSilently();
    if (account == null) {
      throw const DriveException(DriveFailure.noAccount);
    }

    // No `canAccessScopes` gate. It is a local cache of what Google last told
    // the plugin, and after a fresh grant it can lag behind the truth — so it
    // was refusing requests the account was perfectly entitled to make. If the
    // scope really is missing, the API answers 401/403 and _send reports it.
    final auth = await account.authentication;
    final token = auth.accessToken;
    if (token == null) {
      throw const DriveException(
        DriveFailure.notAuthorised,
        'no access token on the signed-in account',
      );
    }
    return {'Authorization': 'Bearer $token'};
  }

  Future<http.Response> _send(
    Future<http.Response> Function() request, {
    bool allowEmpty = false,
  }) async {
    http.Response response;
    try {
      response = await request();
    } catch (e) {
      throw DriveException(DriveFailure.network, '$e');
    }

    if (response.statusCode == 401 || response.statusCode == 403) {
      throw DriveException(DriveFailure.notAuthorised, response.body);
    }
    if (response.statusCode >= 500) {
      throw DriveException(DriveFailure.network, response.body);
    }
    if (response.statusCode >= 400) {
      throw DriveException(DriveFailure.rejected, response.body);
    }
    if (!allowEmpty && response.bodyBytes.isEmpty) {
      throw const DriveException(DriveFailure.rejected, 'empty response');
    }
    return response;
  }

  /// Table counts carried in Drive metadata.
  ///
  /// A **summary, not the full map.** Drive caps each `appProperties` value at
  /// 124 bytes, and the real counts JSON passes that at eleven tables — an
  /// upload that would have been rejected the first time it ran for real. These
  /// four are the only ones the backup picker shows; the complete counts live
  /// in the header inside the file and are read on the restore-preview path,
  /// which downloads it anyway.
  static const summarisedCounts = <String, String>{
    'habits': 'n_hab',
    'habit_logs': 'n_log',
    'tasks': 'n_tsk',
    'goals': 'n_gol',
  };

  /// Header → `appProperties`.
  ///
  /// Visible for testing: the round trip through this pair is what makes the
  /// backup list one `files.list` with zero downloads, and it is the only part
  /// of this client that can be checked without a Google account.
  @visibleForTesting
  static Map<String, String> propertiesFromHeader(BackupHeader h) => {
        'fv': '${h.formatVersion}',
        'sv': '${h.schemaVersion}',
        'av': h.appVersion,
        'kind': h.kind,
        // Truncated rather than trusted: a device label is user-settable on
        // Android and a long one would push this value past Drive's limit.
        'device': h.deviceLabel.length > 60
            ? h.deviceLabel.substring(0, 60)
            : h.deviceLabel,
        'created': '${h.createdAt}',
        if (h.firstLogDate != null) 'first': h.firstLogDate!,
        if (h.lastLogDate != null) 'last': h.lastLogDate!,
        for (final entry in summarisedCounts.entries)
          if (h.counts[entry.key] != null) entry.value: '${h.counts[entry.key]}',
      };

  @visibleForTesting
  static BackupHeader? headerFromProperties(Map<String, dynamic>? p) {
    if (p == null) return null;
    try {
      return BackupHeader(
        formatVersion: int.tryParse('${p['fv']}') ?? 0,
        schemaVersion: int.tryParse('${p['sv']}') ?? 0,
        appVersion: '${p['av'] ?? ''}',
        createdAt: int.tryParse('${p['created']}') ?? 0,
        deviceId: '',
        deviceLabel: '${p['device'] ?? 'Unknown device'}',
        kind: '${p['kind'] ?? 'auto'}',
        counts: {
          for (final entry in summarisedCounts.entries)
            if (p[entry.value] != null)
              entry.key: int.tryParse('${p[entry.value]}') ?? 0,
        },
        firstLogDate: p['first'] as String?,
        lastLogDate: p['last'] as String?,
      );
    } catch (e) {
      // Metadata written by a future version, or hand-edited. The file is still
      // downloadable and its real header is inside it; only the preview is lost.
      debugPrint('[drive] unreadable appProperties: $e');
      return null;
    }
  }
}
