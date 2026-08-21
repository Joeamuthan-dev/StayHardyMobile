import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../migration/migration_service.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/progress_rule.dart';

/// Shown while a user's data is being brought over from the old app.
///
/// Blocking, but never a dead end. Every failure path offers a retry, and the
/// copy is explicit that nothing has been lost — because the most likely reason
/// a user sees this screen twice is that they were on a train with no signal,
/// not that their history is gone.
class MigrationScreen extends ConsumerStatefulWidget {
  const MigrationScreen({super.key});

  @override
  ConsumerState<MigrationScreen> createState() => _MigrationScreenState();
}

class _MigrationScreenState extends ConsumerState<MigrationScreen> {
  MigrationProgress? _progress;
  bool _running = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  Future<void> _start() async {
    if (_running) return;
    setState(() => _running = true);

    final service = ref.read(migrationServiceProvider);
    if (service == null) {
      // No signed-in user yet — nothing to migrate against.
      setState(() => _running = false);
      return;
    }

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
    setState(() {
      _progress = result;
      _running = false;
    });

    if (result.state == MigrationState.completed) {
      // Re-read the marker so BootGate moves on.
      ref.invalidate(migrationStatusProvider);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final p = _progress;
    final failed = p?.state == MigrationState.failed;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Space.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(),
              Text(
                failed ? 'Still restoring' : 'Restoring your data',
                style: text.displayMedium,
              ),
              const SizedBox(height: Space.md),
              Text(
                failed
                    ? "We couldn't finish bringing everything over. Nothing has "
                        'been lost — your data is still safe on our servers. '
                        'Check your connection and try again.'
                    : 'Bringing your habits, goals and tasks across from the '
                        'old app. This happens once.',
                style: text.bodyLarge?.copyWith(color: t.textMuted),
              ),
              const SizedBox(height: Space.xxl),

              if (p != null) ...[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '${p.totalImported}',
                      style: AuraType.numeral(56, color: t.accent),
                    ),
                    const SizedBox(width: Space.sm),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text('items restored',
                          style: text.bodyLarge?.copyWith(color: t.textMuted)),
                    ),
                  ],
                ),
                const SizedBox(height: Space.lg),
                ProgressRule(
                  fraction: p.fraction,
                  color: failed ? t.danger : t.accent,
                ),
              ],

              const Spacer(),

              if (failed)
                AppButton.primary(
                  label: _running ? 'RETRYING…' : 'TRY AGAIN',
                  onPressed: _running ? null : _start,
                ),
              // Deliberately no "skip" button. Skipping would drop the user into
              // an empty app where anything they create collides with the pull
              // when it finally lands.
              const SizedBox(height: Space.md),
              Text(
                'Your data stays on our servers until this finishes.',
                style: text.bodySmall?.copyWith(color: t.textMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
