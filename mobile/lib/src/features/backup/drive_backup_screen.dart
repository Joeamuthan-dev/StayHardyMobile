import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../backup/backup_coordinator.dart';
import '../../backup/drive_client.dart';
import '../../data/providers.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/app_button.dart';
import '../../ui/drive_mark.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../shared/section_header.dart';
import 'restore_preview_sheet.dart';

/// Google Drive backup — Pro only, and nothing else on the page.
///
/// Split out of [BackupScreen] deliberately. Those are two different promises
/// to two different people: Drive is a paid feature about a copy that survives
/// losing the phone, and Backup & restore is the free one everybody gets. Mixed
/// on one screen, a free member scrolled past a Drive section they could not
/// use, and a Pro member connecting Drive was shown manual .shbak files they had
/// no reason to care about.
class DriveBackupScreen extends ConsumerStatefulWidget {
  const DriveBackupScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const DriveBackupScreen()),
    );
  }

  @override
  ConsumerState<DriveBackupScreen> createState() => _DriveBackupScreenState();
}

class _DriveBackupScreenState extends ConsumerState<DriveBackupScreen> {
  bool _busy = false;
  String? _note;

  /// Non-null only while a sync is running: (0–1, what it is doing).
  (double, String)? _sync;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final async = ref.watch(backupStatusProvider);

    return Scaffold(
      backgroundColor: t.bg,
      appBar: AppBar(
        backgroundColor: t.bg,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: t.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        top: false,
        child: async.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(
            message: "Couldn't check your Drive backups.",
            detail: e.toString(),
            onRetry: () => ref.invalidate(backupStatusProvider),
          ),
          data: _body,
        ),
      ),
    );
  }

  Widget _body(BackupStatus status) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
      children: [
        const ScreenTitle(title: 'Google Drive'),
        const SizedBox(height: Space.md),
        Text(
          status.driveConnected
              ? (status.lastBackupAt == null
                  ? 'Connected. Sync to send your first copy up.'
                  : 'Last backed up ${_ago(status.lastBackupAt!)}.')
              : 'A daily copy of everything, kept in your own Google Drive.',
          style: text.bodyMedium?.copyWith(color: t.textSecondary),
        ),
        if (_note != null) ...[
          const SizedBox(height: Space.lg),
          StatusNote(
            icon: Icons.info_outline_rounded,
            message: _note!,
            tint: t.accent,
          ),
        ],
        const SizedBox(height: Space.xl),
        _DriveSection(
          status: status,
          busy: _busy || _sync != null,
          sync: _sync,
          onConnect: _connectDrive,
          onSync: _syncNow,
          onRestore: _restoreFromDrive,
        ),
      ],
    );
  }

  Future<void> _connectDrive() async {
    setState(() {
      _busy = true;
      _note = null;
    });
    final granted = await ref.read(backupCoordinatorProvider).connectDrive();
    if (!mounted) return;
    setState(() {
      _busy = false;
      _note = granted
          ? 'Drive connected.'
          : 'Drive access was not granted. Nothing has been uploaded.';
    });
    ref.invalidate(backupStatusProvider);
  }

  /// Push this device and Drive into agreement, narrating as it goes.
  Future<void> _syncNow() async {
    setState(() {
      _sync = (0, 'Starting…');
      _note = null;
    });
    try {
      final outcome = await ref.read(backupCoordinatorProvider).syncWithDrive(
            onProgress: (p, m) {
              if (mounted) setState(() => _sync = (p, m));
            },
          );
      if (!mounted) return;
      setState(() {
        _sync = null;
        _note = outcome.message;
      });
    } on DriveException catch (e) {
      if (!mounted) return;
      setState(() {
        _sync = null;
        _note = e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _sync = null;
        _note = 'Sync could not finish. Your data is unchanged.';
      });
    }
    ref.invalidate(backupStatusProvider);
  }

  Future<void> _restoreFromDrive(DriveBackup backup) async {
    setState(() {
      _busy = true;
      _note = null;
    });

    final coordinator = ref.read(backupCoordinatorProvider);
    List<int> bytes;
    try {
      bytes = await coordinator.downloadFromDrive(backup.fileId);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _note = 'Could not download that backup. Check your connection.';
        });
      }
      return;
    }

    final preview = await coordinator.preview(bytes);
    if (!mounted) return;
    setState(() => _busy = false);

    final restored = await RestorePreviewSheet.open(
      context,
      preview: preview,
      fileName: backup.name,
      onRestore: (replace) => coordinator.restore(bytes, replace: replace),
    );

    if (restored && mounted) {
      setState(() => _note = 'Restored from Drive. Everything is back.');
      ref.invalidate(backupStatusProvider);
      ref.invalidate(todayHabitsProvider);
      ref.invalidate(thisWeekProvider);
    }
  }

  static String _ago(int epochMillis) {
    final d = DateTime.now()
        .difference(DateTime.fromMillisecondsSinceEpoch(epochMillis));
    if (d.inMinutes < 1) return 'just now';
    if (d.inMinutes < 60) return '${d.inMinutes} minutes ago';
    if (d.inHours < 24) return '${d.inHours} hours ago';
    return '${d.inDays} days ago';
  }
}

class _DriveSection extends StatelessWidget {
  const _DriveSection({
    required this.status,
    required this.busy,
    required this.sync,
    required this.onConnect,
    required this.onSync,
    required this.onRestore,
  });

  final BackupStatus status;
  final bool busy;
  final (double, String)? sync;
  final Future<void> Function() onConnect;
  final Future<void> Function() onSync;
  final Future<void> Function(DriveBackup) onRestore;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    if (!status.driveConnected) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SurfaceCard(
            gradient: Grad.surfaceWash(t),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // The real mark, drawn in Google's colours — see
                    // [DriveMark]. A generic folder glyph here read as "some
                    // storage thing" rather than "your Google Drive".
                    const SizedBox(width: 38, height: 38, child: DriveMark()),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Back up to your Google Drive',
                              style: text.titleMedium),
                          const SizedBox(height: 2),
                          Text(
                            'Yours, not ours',
                            style: text.bodySmall
                                ?.copyWith(color: t.textMuted),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: Space.md),
                Text(
                  status.problem?.let() ??
                      'Connect Drive and StayHardy keeps a copy of your '
                      'habits, tasks and goals in your own account — restored '
                      'with one tap on a new phone.',
                  style: text.bodyMedium?.copyWith(color: t.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(height: Space.md),
          AppButton.primary(
            label: 'CONNECT GOOGLE DRIVE',
            onPressed: busy ? null : () => onConnect(),
          ),
          const SizedBox(height: Space.sm),
          Text(
            'StayHardy can only see the backups it creates — nothing else in '
            'your Drive, and they stay hidden from your Drive files. Until '
            'this is switched on, use the export above.',
            style: text.bodySmall?.copyWith(color: t.textMuted),
          ),
        ],
      );
    }

    // Connected. This states the fact and then offers the only action that
    // matters — the screen used to keep offering CONNECT to people who were
    // already connected, which is what made the whole feature feel broken.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Connected has to be legible at a glance. A small tick in the corner
        // was doing this job and losing: the screen read the same whether you
        // were connected or not, which is why a working connection still felt
        // like an unfinished one.
        Container(
          padding: const EdgeInsets.all(Space.lg),
          decoration: BoxDecoration(
            color: t.success.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(Radii.lg),
            border: Border.all(color: t.success.withValues(alpha: 0.35)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const SizedBox(
                      width: 34, height: 34, child: DriveMark()),
                  const SizedBox(width: Space.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Google Drive', style: text.titleSmall),
                        const SizedBox(height: 2),
                        Text(
                          // A connected account that could not be reached says
                          // so, rather than claiming an empty Drive.
                          status.problem?.let() ??
                              (status.backups.isEmpty
                                  ? 'Nothing backed up yet — sync to send '
                                      'your first copy up.'
                                  : '${status.backups.length} '
                                      '${status.backups.length == 1 ? "backup" : "backups"}'
                                      ' in your Drive'),
                          style: text.bodySmall?.copyWith(
                            color: status.problem == null
                                ? t.textMuted
                                : t.warn,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: Space.md),
              Container(
                width: double.infinity,
                height: Dimens.controlHeight,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: t.success,
                  borderRadius: BorderRadius.circular(Radii.pill),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle_rounded,
                        size: Dimens.iconSm, color: t.onAccent),
                    const SizedBox(width: Space.sm),
                    Text(
                      'CONNECTED',
                      style: text.labelLarge?.copyWith(color: t.onAccent),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.md),

        if (sync != null) ...[
          // Real progress from the real phases, not a spinner pretending.
          Text(sync!.$2, style: text.bodySmall?.copyWith(color: t.accent)),
          const SizedBox(height: Space.xs),
          ClipRRect(
            borderRadius: BorderRadius.circular(Radii.pill),
            child: LinearProgressIndicator(
              value: sync!.$1,
              minHeight: 6,
              backgroundColor: t.surfaceHigh,
              valueColor: AlwaysStoppedAnimation(t.accent),
            ),
          ),
          const SizedBox(height: Space.xs),
          Text('${(sync!.$1 * 100).round()}%',
              style: text.bodySmall?.copyWith(color: t.textMuted)),
        ] else
          AppButton.primary(
            label: 'SYNC NOW',
            onPressed: busy ? null : () => onSync(),
          ),

        const SizedBox(height: Space.sm),
        Text(
          'Sync sends this phone up, or brings your newest backup down if '
          'another device is ahead. It merges — it never deletes what is only '
          'here.',
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),

        if (status.backups.isNotEmpty) ...[
          const SizedBox(height: Space.lg),
          Text('Backups in your Drive',
              style: text.bodySmall?.copyWith(color: t.textMuted)),
          const SizedBox(height: Space.xs),
          for (final backup in status.backups.take(10))
            _BackupRow(
              backup: backup,
              onTap: busy ? null : () => onRestore(backup),
            ),
          const SizedBox(height: Space.sm),
          Text(
            'Tap one to restore that exact copy — you will see what would '
            'change before anything is written.',
            style: text.bodySmall?.copyWith(color: t.textMuted),
          ),
        ],
      ],
    );
  }
}

class _BackupRow extends StatelessWidget {
  const _BackupRow({required this.backup, required this.onTap});
  final DriveBackup backup;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final header = backup.header;
    final at = DateTime.fromMillisecondsSinceEpoch(backup.createdAt);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: Space.md),
        decoration: BoxDecoration(
          border: Border(
              bottom: BorderSide(color: t.border, width: Dimens.hairline)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${at.day}/${at.month}/${at.year}',
                      style: text.bodyLarge),
                  const SizedBox(height: 3),
                  Text(
                    // Straight out of appProperties — this row costs no
                    // download.
                    header == null
                        ? '${(backup.sizeBytes / 1024).round()} KB'
                        : '${header.counts['habit_logs'] ?? 0} check-ins · '
                            '${header.deviceLabel}',
                    style: text.bodySmall?.copyWith(color: t.textMuted),
                  ),
                ],
              ),
            ),
            Icon(Icons.download_rounded,
                size: Dimens.iconSm, color: t.textMuted),
          ],
        ),
      ),
    );
  }
}

extension on DriveFailure {
  /// The user-facing line for a failure, or null to use the generic copy.
  String? let() => switch (this) {
        // The expected state today: the OAuth consent screen has not been
        // verified for the drive.appdata scope. Said plainly rather than
        // dressed up as a transient error the user could retry away.
        DriveFailure.notAuthorised => 'Drive backup is not switched on yet.',
        DriveFailure.noAccount =>
          'Sign in with Google to back up to Drive. PIN sign-in cannot use it.',
        DriveFailure.network => 'Could not reach Drive. Check your connection.',
        DriveFailure.rejected =>
          'Drive refused the request — your Drive may be full.',
        DriveFailure.notConfigured => null,
      };
}


/// The rolling on-device auto copy: when it was written, and one tap to
/// restore it through the normal preview pipeline.
