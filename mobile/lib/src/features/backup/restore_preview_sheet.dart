import 'package:flutter/material.dart';

import '../../backup/backup_service.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/surface_card.dart';

/// What a restore would do, shown before a single row is written.
///
/// A restore is the most destructive thing in the app, and the two modes differ
/// in a way that is invisible from their names: **merge** keeps whatever this
/// phone has that the backup does not, **replace** deletes it. The whole point
/// of this sheet is that "12 things on this phone are not in this backup" is
/// stated in words before the choice is made, not discovered afterwards.
class RestorePreviewSheet extends StatefulWidget {
  const RestorePreviewSheet({
    super.key,
    required this.preview,
    required this.fileName,
    required this.onRestore,
  });

  final RestorePreview preview;
  final String fileName;

  /// Called with `replace`.
  final Future<void> Function(bool replace) onRestore;

  static Future<bool> open(
    BuildContext context, {
    required RestorePreview preview,
    required String fileName,
    required Future<void> Function(bool replace) onRestore,
  }) async {
    final done = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: context.aura.bg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.md)),
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.92,
      ),
      useSafeArea: true,
      builder: (_) => RestorePreviewSheet(
        preview: preview,
        fileName: fileName,
        onRestore: onRestore,
      ),
    );
    return done ?? false;
  }

  @override
  State<RestorePreviewSheet> createState() => _RestorePreviewSheetState();
}

class _RestorePreviewSheetState extends State<RestorePreviewSheet> {
  bool _replace = false;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final p = widget.preview;
    final header = p.header;
    final at = DateTime.fromMillisecondsSinceEpoch(header.createdAt);

    return Padding(
      padding:
          const EdgeInsets.fromLTRB(Space.lg, Space.lg, Space.lg, Space.xl),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: Space.lg),
                decoration: BoxDecoration(
                  color: t.borderStrong,
                  borderRadius: BorderRadius.circular(Radii.pill),
                ),
              ),
            ),
            Text('Restore this backup?', style: text.displaySmall),
            const SizedBox(height: Space.sm),
            Text(
              'Taken ${at.day}/${at.month}/${at.year} on '
              '${header.deviceLabel}'
              '${header.lastLogDate == null ? '' : ', with check-ins up to ${header.lastLogDate}'}.',
              style: text.bodyMedium?.copyWith(color: t.textSecondary),
            ),

            const SizedBox(height: Space.xl),
            SurfaceCard(
              child: Row(
                children: [
                  Expanded(
                    child: _Count(
                      value: p.totalAdded,
                      label: 'ADDED',
                      tint: t.success,
                    ),
                  ),
                  Expanded(
                    child: _Count(value: p.totalUpdated, label: 'UPDATED'),
                  ),
                  Expanded(
                    child: _Count(
                      value: p.totalLocalOnly,
                      label: 'ONLY HERE',
                      tint: _replace && p.totalLocalOnly > 0 ? t.danger : null,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: Space.lg),
            _ModeTile(
              title: 'Merge',
              body: 'Adds what the backup has and keeps everything already on '
                  'this phone. Check-ins are combined, never replaced.',
              selected: !_replace,
              onTap: () => setState(() => _replace = false),
            ),
            const SizedBox(height: Space.sm),
            _ModeTile(
              title: 'Replace',
              body: p.totalLocalOnly == 0
                  ? 'Makes this phone match the backup exactly.'
                  : 'Makes this phone match the backup exactly — and '
                      '**deletes the ${p.totalLocalOnly} things that are only '
                      'here**.',
              selected: _replace,
              danger: true,
              onTap: () => setState(() => _replace = true),
            ),

            if (_replace && p.totalLocalOnly > 0) ...[
              const SizedBox(height: Space.md),
              StatusNote(
                icon: Icons.warning_amber_rounded,
                message: '${p.totalLocalOnly} items on this phone are not in '
                    'this backup. Replace will delete them and there is no '
                    'undo.',
                tint: t.danger,
              ),
            ],

            const SizedBox(height: Space.xl),
            AppButton.primary(
              label: _busy
                  ? 'RESTORING…'
                  : (_replace ? 'REPLACE EVERYTHING' : 'MERGE THIS BACKUP'),
              onPressed: _busy ? null : _restore,
            ),
            const SizedBox(height: Space.sm),
            Center(
              child: AppButton.text(
                label: 'CANCEL',
                onPressed: _busy ? null : () => Navigator.pop(context, false),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _restore() async {
    setState(() => _busy = true);
    await widget.onRestore(_replace);
    if (mounted) Navigator.pop(context, true);
  }
}

class _Count extends StatelessWidget {
  const _Count({required this.value, required this.label, this.tint});

  final int value;
  final String label;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Column(
      children: [
        Text('$value',
            style: AuraType.numeral(28, color: tint ?? t.textPrimary)),
        const SizedBox(height: 6),
        Text(label,
            style: Theme.of(context).textTheme.labelMedium,
            textAlign: TextAlign.center),
      ],
    );
  }
}

class _ModeTile extends StatelessWidget {
  const _ModeTile({
    required this.title,
    required this.body,
    required this.selected,
    required this.onTap,
    this.danger = false,
  });

  final String title;
  final String body;
  final bool selected;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final tint = danger ? t.danger : t.accent;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: Motion.fast,
        padding: const EdgeInsets.all(Space.md),
        decoration: BoxDecoration(
          color: selected ? tint.withValues(alpha: Alphas.tint) : null,
          border: Border.all(
            color: selected ? tint : t.border,
            width: selected ? Dimens.border : Dimens.hairline,
          ),
          borderRadius: BorderRadius.circular(Radii.sm),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: text.titleMedium
                  ?.copyWith(color: selected ? tint : t.textPrimary),
            ),
            const SizedBox(height: 4),
            Text(
              body.replaceAll('**', ''),
              style: text.bodySmall?.copyWith(color: t.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
