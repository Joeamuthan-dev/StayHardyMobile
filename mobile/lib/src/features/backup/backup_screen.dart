import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../backup/backup_container.dart';
import '../../backup/backup_coordinator.dart';
import '../../backup/local_backup.dart';
import '../../data/providers.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/app_button.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../shared/section_header.dart';
import 'restore_preview_sheet.dart';

/// Backup and restore — everything that works without paying.
///
/// Google Drive is deliberately absent: it is a Pro feature with its own screen
/// ([DriveBackupScreen]). Everything here needs no account, no permission and
/// no network, which is exactly why it is the free tier's safety net.
class BackupScreen extends ConsumerStatefulWidget {
  const BackupScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const BackupScreen()),
    );
  }

  @override
  ConsumerState<BackupScreen> createState() => _BackupScreenState();
}

class _BackupScreenState extends ConsumerState<BackupScreen> {
  bool _busy = false;
  String? _note;

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
            message: "Couldn't check your backups.",
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
        const ScreenTitle(title: 'Backup'),
        const SizedBox(height: Space.md),
        Text(
          status.lastBackupAt == null
              ? 'You have never backed up. Everything lives on this phone and '
                  'nowhere else.'
              : 'Last backed up ${_ago(status.lastBackupAt!)}.',
          style: text.bodyMedium?.copyWith(
            color: status.lastBackupAt == null ? t.danger : t.textSecondary,
          ),
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
        const SectionLabel('On this phone'),
        const SizedBox(height: Space.md),
        const _LocalAutoRow(),

        const SizedBox(height: Space.xl),
        const SectionLabel('Manual copy'),
        const SizedBox(height: Space.md),
        AppButton.outline(
          label: _busy ? 'PREPARING…' : 'EXPORT TO A FILE',
          onPressed: _busy ? null : _export,
        ),
        const SizedBox(height: Space.sm),
        AppButton.outline(
          label: 'RESTORE FROM A FILE',
          onPressed: _busy ? null : _import,
        ),
        const SizedBox(height: Space.sm),
        Text(
          'A .shbak file with your habits, check-ins, tasks and goals — no '
          "screen-time data. Restores always preview before writing.",
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),
      ],
    );
  }

  Future<void> _export() async {
    setState(() {
      _busy = true;
      _note = null;
    });

    final box = context.findRenderObject() as RenderBox?;
    // Free exports carry the last 30 days of history (structure always
    // whole); Pro exports carry everything — same line the whole plan draws.
    final shared = await ref.read(backupCoordinatorProvider).exportToFile(
          sharePosition:
              box == null ? null : box.localToGlobal(Offset.zero) & box.size,
          logWindowDays: ref.read(isProProvider) ? null : 30,
        );

    if (!mounted) return;
    setState(() {
      _busy = false;
      // Honest either way. A "backed up!" message after a dismissed share sheet
      // would tell the user they are safe when no file was written anywhere.
      _note = shared ? 'Backup saved.' : null;
    });
    ref.invalidate(backupStatusProvider);
  }

  Future<void> _import() async {
    setState(() {
      _busy = true;
      _note = null;
    });

    final coordinator = ref.read(backupCoordinatorProvider);
    ImportedBackup? picked;
    try {
      picked = await coordinator.pickFile();
    } on CorruptBackupException catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _note = "That file isn't a StayHardy backup. ${e.message}";
        });
      }
      return;
    }

    if (picked == null) {
      if (mounted) setState(() => _busy = false);
      return;
    }

    final preview = await coordinator.preview(picked.bytes);
    if (!mounted) return;
    setState(() => _busy = false);

    final restored = await RestorePreviewSheet.open(
      context,
      preview: preview,
      fileName: picked.name,
      onRestore: (replace) => coordinator.restore(picked!.bytes, replace: replace),
    );

    if (restored && mounted) {
      setState(() => _note = 'Restored. Everything is back.');
      _invalidateEverything();
    }
  }

  /// The wire that makes Drive backups worth having: download the chosen
  /// snapshot and hand it to the same preview-then-restore flow a local file
  /// uses. One pipeline, so Drive restores can never behave differently from
  /// file restores.
  void _invalidateEverything() {
    ref
      ..invalidate(backupStatusProvider)
      ..invalidate(todayHabitsProvider)
      ..invalidate(activeHabitsProvider)
      ..invalidate(taskBoardProvider)
      ..invalidate(goalsProvider)
      ..invalidate(statsProvider)
      ..invalidate(weeklyReviewProvider)
      ..invalidate(achievementsProvider)
      ..invalidate(habitCapProvider)
      ..invalidate(libraryStatsProvider);
  }

  static String _ago(int epochMillis) {
    final delta = DateTime.now()
        .difference(DateTime.fromMillisecondsSinceEpoch(epochMillis));
    if (delta.inMinutes < 1) return 'just now';
    if (delta.inHours < 1) return '${delta.inMinutes} minutes ago';
    if (delta.inHours < 24) return '${delta.inHours} hours ago';
    if (delta.inDays == 1) return 'yesterday';
    return '${delta.inDays} days ago';
  }
}

/// Drive, stated as it actually is.
class _LocalAutoRow extends ConsumerStatefulWidget {
  const _LocalAutoRow();

  @override
  ConsumerState<_LocalAutoRow> createState() => _LocalAutoRowState();
}

class _LocalAutoRowState extends ConsumerState<_LocalAutoRow> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return FutureBuilder<({List<int> bytes, DateTime writtenAt})?>(
      future: ref.read(backupCoordinatorProvider).latestLocalAuto(),
      builder: (context, snap) {
        final auto = snap.data;
        return SurfaceCard(
          padding: const EdgeInsets.symmetric(
              horizontal: Space.lg, vertical: Space.md),
          onTap: auto == null || _busy ? null : () => _restore(auto.bytes),
          child: Row(
            children: [
              Icon(Icons.smartphone_rounded,
                  size: Dimens.iconMd,
                  color: auto == null ? t.textMuted : t.accent),
              const SizedBox(width: Space.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Local auto backup', style: text.bodyLarge),
                    const SizedBox(height: 2),
                    Text(
                      auto == null
                          ? 'None yet — turn on Auto backup in Settings'
                          : 'Last 30 days · written '
                              '${auto.writtenAt.day}/${auto.writtenAt.month}'
                              '/${auto.writtenAt.year} — tap to restore',
                      style: text.bodySmall?.copyWith(color: t.textMuted),
                    ),
                  ],
                ),
              ),
              if (auto != null)
                Icon(Icons.restore_rounded,
                    size: Dimens.iconSm, color: t.textMuted),
            ],
          ),
        );
      },
    );
  }

  Future<void> _restore(List<int> bytes) async {
    setState(() => _busy = true);
    final coordinator = ref.read(backupCoordinatorProvider);
    final preview = await coordinator.preview(bytes);
    if (!mounted) return;
    setState(() => _busy = false);

    await RestorePreviewSheet.open(
      context,
      preview: preview,
      fileName: 'Local auto backup',
      onRestore: (replace) => coordinator.restore(bytes, replace: replace),
    );
    ref.invalidate(backupStatusProvider);
  }
}
