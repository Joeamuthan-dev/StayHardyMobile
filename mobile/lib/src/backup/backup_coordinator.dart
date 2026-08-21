import 'dart:ui' show Rect;

import 'package:flutter/foundation.dart';

import '../data/settings_repository.dart';
import 'backup_container.dart';
import 'backup_retention.dart';
import 'backup_service.dart';
import 'drive_client.dart';
import 'local_backup.dart';

/// The state the backup screen renders.
class BackupStatus {
  const BackupStatus({
    required this.driveConnected,
    required this.lastBackupAt,
    required this.backups,
    this.problem,
  });

  /// True only when the Drive scope is actually granted. Never optimistic.
  final bool driveConnected;

  /// Epoch millis of the last successful backup — Drive or local export.
  final int? lastBackupAt;

  /// What is in Drive, newest first. Empty when not connected.
  final List<DriveBackup> backups;

  /// Why Drive is unavailable, when that is the interesting part.
  final DriveFailure? problem;

  static const disconnected = BackupStatus(
    driveConnected: false,
    lastBackupAt: null,
    backups: [],
  );
}

/// Which way a [BackupCoordinator.syncWithDrive] resolved.
enum SyncDirection {
  /// Local was ahead: a fresh snapshot went up.
  uploaded,

  /// Drive held a backup this device had never seen: it came down and merged.
  restored,

  /// Drive already holds this device's latest. Nothing to do, and saying so is
  /// more useful than uploading a duplicate to look busy.
  alreadyInSync,
}

class SyncOutcome {
  const SyncOutcome({
    required this.direction,
    this.added = 0,
    this.updated = 0,
  });

  final SyncDirection direction;

  /// Rows a restore brought in. Zero for an upload.
  final int added;
  final int updated;

  /// What the user is told when it finishes.
  String get message => switch (direction) {
        SyncDirection.uploaded => 'Backed up to Google Drive.',
        SyncDirection.restored => added == 0 && updated == 0
            ? 'Restored from Google Drive — nothing here was missing.'
            : 'Restored from Google Drive — $added added, $updated updated.',
        SyncDirection.alreadyInSync => 'Already up to date.',
      };
}

/// Coordinates snapshots, Drive, retention, and local files.
///
/// Nothing here reports a backup as taken on the strength of a call that
/// failed, and nothing may be changed to do so: the last-backup timestamp is
/// written only after Drive returns a file id.
class BackupCoordinator {
  BackupCoordinator(
    this._service,
    this._settings, {
    DriveClient? drive,
    LocalBackup local = const LocalBackup(),
  })  : _drive = drive ?? DriveClient(),
        _local = local;

  final BackupService _service;
  final SettingsRepository _settings;
  final DriveClient _drive;
  final LocalBackup _local;

  Future<BackupStatus> status() async {
    final last = await _settings.getInt(SettingsKeys.lastBackupAt);

    if (!await _drive.hasAccount()) {
      return BackupStatus(
        driveConnected: false,
        lastBackupAt: last,
        backups: const [],
        problem: DriveFailure.notAuthorised,
      );
    }

    try {
      // Connected means "we can actually read your backups", proven by doing
      // it, rather than by a local flag that can disagree with reality.
      final backups = await _drive.list();
      return BackupStatus(
        driveConnected: true,
        lastBackupAt: last,
        backups: backups,
      );
    } on DriveException catch (e) {
      // Reported rather than swallowed — "backup is on" while every upload
      // fails is the worst possible state.
      //
      // But losing the network is not losing the connection. Reporting a
      // flight-mode blip as disconnected sends the user back to a CONNECT
      // button for an account that is still perfectly connected, which is the
      // same contradiction from the other direction. Only an authorisation
      // failure actually revokes the connection; everything else is a
      // connected account having a bad minute, and the problem is shown
      // alongside rather than instead.
      final revoked = e.failure == DriveFailure.notAuthorised ||
          e.failure == DriveFailure.noAccount ||
          e.failure == DriveFailure.notConfigured;
      return BackupStatus(
        driveConnected: !revoked,
        lastBackupAt: last,
        backups: const [],
        problem: e.failure,
      );
    }
  }

  /// Ask for the Drive scope. Returns whether it was granted.
  Future<bool> connectDrive() => _drive.requestScope();

  /// Take a snapshot and upload it, then prune.
  ///
  /// Throws [DriveException] on failure — deliberately, so no caller can treat
  /// a failed upload as a completed backup by ignoring a returned bool.
  Future<DriveBackup> backupNow({String kind = 'manual'}) async {
    final bytes = await _service.createSnapshot(kind: kind);
    final header = BackupContainer.decodeHeader(bytes);
    final name = LocalBackup.fileNameFor(
      DateTime.fromMillisecondsSinceEpoch(header.createdAt),
    );

    final fileId =
        await _drive.upload(bytes: bytes, header: header, name: name);

    // Written only after the upload returned an id. A last-backup timestamp
    // recorded ahead of the upload would tell the user they are protected when
    // they are not.
    await _settings.set(
      SettingsKeys.lastBackupAt,
      '${DateTime.now().millisecondsSinceEpoch}',
    );

    await pruneDrive();

    return DriveBackup(
      fileId: fileId,
      name: name,
      createdAt: header.createdAt,
      sizeBytes: bytes.length,
      header: header,
    );
  }

  /// Apply the retention policy to Drive.
  ///
  /// Failures are logged and swallowed: pruning is housekeeping, and a delete
  /// that fails must never make a successful backup look like a failed one.
  Future<RetentionPlan> pruneDrive() async {
    try {
      final backups = await _drive.list();
      final plan = BackupRetention.plan(
        [for (final b in backups) b.asRecord],
        now: DateTime.now().millisecondsSinceEpoch,
      );

      for (final doomed in plan.delete) {
        await _drive.delete(doomed.id);
      }
      return plan;
    } on DriveException catch (e) {
      debugPrint('[backup] prune skipped: $e');
      return const RetentionPlan(keep: [], delete: []);
    }
  }

  Future<List<int>> downloadFromDrive(String fileId) =>
      _drive.download(fileId);

  /// One button that makes this device and Drive agree.
  ///
  /// The direction is decided, not asked. Drive's newest backup is compared
  /// against the last backup *this device* took: if Drive is ahead, another
  /// device wrote it and it comes down; otherwise this device is the newer one
  /// and it goes up.
  ///
  /// A restore here always **merges** — [BackupService] unions check-ins rather
  /// than letting an older file erase newer ones. Sync is a routine, frequently
  /// tapped action, and a routine action must never be able to delete history.
  /// Replacing is still available, deliberately, behind the per-backup restore
  /// on the Backup screen.
  ///
  /// [onProgress] is called with a 0–1 fraction and a line to show. The phases
  /// are coarse because honest coarse progress beats a smooth fake one.
  Future<SyncOutcome> syncWithDrive({
    void Function(double progress, String message)? onProgress,
  }) async {
    void report(double p, String m) => onProgress?.call(p, m);

    report(0.05, 'Checking Google Drive…');
    final remote = await _drive.list();
    final lastLocal = await _settings.getInt(SettingsKeys.lastBackupAt) ?? 0;
    final newest = remote.isEmpty ? null : remote.first;

    // Drive is ahead only if it holds something created after this device's own
    // last backup. Equal timestamps mean this device wrote it.
    if (newest != null && newest.createdAt > lastLocal) {
      report(0.25, 'Downloading your backup…');
      final bytes = await _drive.download(newest.fileId);

      report(0.6, 'Checking what would change…');
      final preview = await _service.preview(bytes);

      report(0.75, 'Restoring…');
      await _service.restore(bytes);

      // The device is now level with Drive; record it so the next sync does not
      // pull the same file down again.
      await _settings.set(
        SettingsKeys.lastBackupAt,
        '${newest.createdAt}',
      );

      report(1, 'Done');
      return SyncOutcome(
        direction: SyncDirection.restored,
        added: preview.totalAdded,
        updated: preview.totalUpdated,
      );
    }

    report(0.25, 'Preparing your data…');
    final bytes = await _service.createSnapshot(kind: 'sync');
    final header = BackupContainer.decodeHeader(bytes);

    // Nothing has changed since the copy already up there. Uploading an
    // identical snapshot would burn the user's quota to achieve nothing.
    if (newest != null && newest.header?.counts != null) {
      final same = _sameCounts(newest.header!.counts, header.counts);
      if (same && newest.createdAt >= lastLocal) {
        report(1, 'Done');
        return const SyncOutcome(direction: SyncDirection.alreadyInSync);
      }
    }

    report(0.5, 'Uploading to Google Drive…');
    final name = LocalBackup.fileNameFor(
      DateTime.fromMillisecondsSinceEpoch(header.createdAt),
    );
    await _drive.upload(bytes: bytes, header: header, name: name);

    await _settings.set(
      SettingsKeys.lastBackupAt,
      '${DateTime.now().millisecondsSinceEpoch}',
    );

    report(0.9, 'Tidying old backups…');
    await pruneDrive();

    report(1, 'Done');
    return const SyncOutcome(direction: SyncDirection.uploaded);
  }

  static bool _sameCounts(Map<String, int> a, Map<String, int> b) {
    if (a.length != b.length) return false;
    for (final entry in a.entries) {
      if (b[entry.key] != entry.value) return false;
    }
    return true;
  }

  /// Whether an automatic backup is due. Consulted at resume, never on a timer.
  Future<bool> isAutoBackupDue() async {
    return BackupRetention.isDue(
      lastBackupAt: await _settings.getInt(SettingsKeys.lastBackupAt),
      now: DateTime.now().millisecondsSinceEpoch,
    );
  }

  // --- local files ---------------------------------------------------------

  /// Export a snapshot through the OS share sheet.
  ///
  /// Works with no account, no Drive scope, and no network — which is the
  /// point. Records a backup timestamp only when the sheet reports the file was
  /// actually delivered somewhere.
  /// The free tier's on-device daily copy: last [windowDays] of dated rows,
  /// every structure row, one rolling file. Same container as every other
  /// backup, so the normal restore pipeline reads it.
  Future<void> backupLocalAuto({int windowDays = 30}) async {
    final bytes = await _service.createSnapshot(
        kind: 'auto-local', logWindowDays: windowDays);
    await _local.writeAuto(bytes);
    await _settings.set(
      SettingsKeys.lastBackupAt,
      '${DateTime.now().millisecondsSinceEpoch}',
    );
  }

  Future<({List<int> bytes, DateTime writtenAt})?> latestLocalAuto() =>
      _local.readAuto();

  Future<bool> exportToFile({Rect? sharePosition, int? logWindowDays}) async {
    final bytes = await _service.createSnapshot(
        kind: 'export', logWindowDays: logWindowDays);
    final shared = await _local.export(bytes, sharePosition: sharePosition);
    if (shared) {
      await _settings.set(
        SettingsKeys.lastBackupAt,
        '${DateTime.now().millisecondsSinceEpoch}',
      );
    }
    return shared;
  }

  /// Pick a `.shbak` file. Null if the user backed out.
  Future<ImportedBackup?> pickFile() => _local.pick();

  /// What restoring [bytes] would do. Reads only — nothing is written.
  Future<RestorePreview> preview(List<int> bytes) => _service.preview(bytes);

  Future<void> restore(List<int> bytes, {bool replace = false}) =>
      _service.restore(bytes, replace: replace);
}
