import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../data/settings_repository.dart';
import '../../migration/legacy_source.dart';
import '../../migration/migration_service.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/progress_rule.dart';

/// What the old account still holds. Null when there is nothing to offer.
class LegacyDataSummary {
  const LegacyDataSummary({required this.habits, required this.checkIns});

  final int habits;
  final int checkIns;

  bool get isWorthOffering => habits > 0 || checkIns > 0;
}

/// Cheap probe: two count queries, no rows transferred.
///
/// Runs once per launch and only when signed in. If it fails — offline, RLS,
/// anything — it returns null and the prompt simply never appears. A failed
/// probe must never block or annoy.
final legacyDataProbeProvider = FutureProvider<LegacyDataSummary?>((ref) async {
  final source = ref.watch(legacySourceProvider);
  if (source == null) return null;

  final repo = ref.watch(settingsRepositoryProvider);
  if (await repo.getBool(SettingsKeys.restorePromptShown)) return null;

  try {
    final habits = await source.count(LegacyTable.routines);
    final logs = await source.count(LegacyTable.routineLogs);
    return LegacyDataSummary(habits: habits, checkIns: logs);
  } catch (_) {
    return null;
  }
});

/// One-time offer to bring old history across.
///
/// Shown once, dismissible, never blocking. Streaks are this product's
/// retention mechanic — a long-time user who opens the rebuilt app and sees
/// zero is the most likely person to uninstall. This makes the choice explicit
/// rather than leaving it buried in Settings where they may never look.
class RestorePrompt extends ConsumerStatefulWidget {
  const RestorePrompt({super.key, required this.summary});

  final LegacyDataSummary summary;

  static Future<void> open(BuildContext context, LegacyDataSummary summary) {
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.aura.bg,
      isScrollControlled: true,
      useSafeArea: true,
      // Dismissible by design. A modal you cannot escape is not an offer.
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.md)),
      ),
      builder: (_) => RestorePrompt(summary: summary),
    );
  }

  @override
  ConsumerState<RestorePrompt> createState() => _RestorePromptState();
}

class _RestorePromptState extends ConsumerState<RestorePrompt> {
  bool _busy = false;
  MigrationProgress? _progress;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Recorded the moment the offer is on screen, not when a button is pressed.
    //
    // This sheet is dismissible and draggable by design, and only the two
    // buttons used to set the flag — so anyone who swiped it away, or tapped
    // the scrim, was asked again on every single launch. Being nagged about a
    // one-time offer is worse than missing it, and the footer already points at
    // Settings › Export & restore for anyone who changes their mind.
    unawaited(_markShown());
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final s = widget.summary;

    return Padding(
      padding:
          const EdgeInsets.fromLTRB(Space.lg, Space.sm, Space.lg, Space.lg),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
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
          Text('Welcome back', style: text.displaySmall),
          const SizedBox(height: Space.lg),

          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('${s.checkIns}',
                  style: AuraType.numeral(56, color: t.accent)),
              const SizedBox(width: Space.sm),
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text('check-ins waiting',
                    style: text.bodyLarge?.copyWith(color: t.textMuted)),
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          Text(
            'We found ${s.habits} habit${s.habits == 1 ? '' : 's'} and their '
            'full history on your old account. Bring them across and your '
            'streaks carry on where they left off.',
            style: text.bodyLarge?.copyWith(color: t.textSecondary),
          ),

          if (_busy && _progress != null) ...[
            const SizedBox(height: Space.lg),
            ProgressRule(fraction: _progress!.fraction),
            const SizedBox(height: Space.sm),
            Text('${_progress!.totalImported} restored',
                style: text.bodySmall?.copyWith(color: t.textMuted)),
          ],

          if (_error != null) ...[
            const SizedBox(height: Space.md),
            Text(_error!, style: text.bodyMedium?.copyWith(color: t.danger)),
          ],

          const SizedBox(height: Space.xl),
          AppButton.primary(
            label: _busy ? 'RESTORING…' : 'RESTORE MY HISTORY',
            onPressed: _busy ? null : _restore,
          ),
          const SizedBox(height: Space.sm),
          Center(
            child: AppButton.text(
              label: 'START FRESH',
              onPressed: _busy ? null : _dismiss,
            ),
          ),
          const SizedBox(height: Space.sm),
          Center(
            child: Text(
              'You can restore later — Settings, then Export & restore.',
              style: text.bodySmall?.copyWith(color: t.textMuted),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _markShown() => ref
      .read(settingsRepositoryProvider)
      .set(SettingsKeys.restorePromptShown, 'true');

  Future<void> _dismiss() async {
    // "Start fresh" is a real choice, and it sticks. Re-asking would make the
    // decision feel ignored.
    await _markShown();
    if (mounted) Navigator.pop(context);
  }

  Future<void> _restore() async {
    final service = ref.read(migrationServiceProvider);
    if (service == null) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    final result = await service.run(
      onProgress: (p) {
        if (mounted) setState(() => _progress = p);
      },
      onImportComplete: () =>
          ref
              .read(habitRepositoryProvider)
              .enforceFreeCap(isPro: ref.read(isProProvider)),
    );

    if (!mounted) return;

    if (result.state == MigrationState.completed) {
      await _markShown();
      if (mounted) Navigator.pop(context);
      return;
    }

    setState(() {
      _busy = false;
      _error = "That didn't finish. Nothing was lost — your old data is still "
          'on our servers. Try again from Settings.';
    });
  }
}
