import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../domain/badge_catalogue.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/app_button.dart';
import 'badge_medal.dart';
import 'share_card.dart';

/// The one moment the app is allowed to interrupt someone.
///
/// Shown once per badge and never again: `badges.popup_shown` is set the moment
/// this closes, and the Supabase import and the first local evaluation both
/// pre-mark everything shown, so a user arriving with two years of history is
/// never met by nine of these stacked up.
///
/// Deliberately one badge at a time. Three at once is a notification, not a
/// celebration.
class BadgeCelebration extends ConsumerWidget {
  const BadgeCelebration({super.key, required this.defs});

  final List<BadgeDef> defs;

  static Future<void> show(BuildContext context, List<BadgeDef> defs) {
    if (defs.isEmpty) return Future.value();
    unawaited(HapticFeedback.mediumImpact().catchError((_) {}));

    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.aura.bg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.md)),
      ),
      useSafeArea: true,
      builder: (_) => BadgeCelebration(defs: defs),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final def = defs.first;
    final more = defs.length - 1;

    return Padding(
      padding: const EdgeInsets.fromLTRB(Space.lg, Space.lg, Space.lg, Space.xl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: Space.xl),
              decoration: BoxDecoration(
                color: t.borderStrong,
                borderRadius: BorderRadius.circular(Radii.pill),
              ),
            ),
          ),
          Center(child: BadgeMedal(def: def, earned: true, size: 96)),
          const SizedBox(height: Space.xl),
          Center(
            child: Text('BADGE EARNED',
                style: text.labelMedium?.copyWith(color: t.accent)),
          ),
          const SizedBox(height: Space.sm),
          Center(child: Text(def.name, style: text.displaySmall)),
          const SizedBox(height: Space.md),
          Center(
            child: Text(
              def.description,
              textAlign: TextAlign.center,
              style: text.bodyMedium?.copyWith(color: t.textSecondary),
            ),
          ),
          if (more > 0) ...[
            const SizedBox(height: Space.md),
            Center(
              child: Text(
                'and $more more waiting in your badges',
                style: text.bodySmall?.copyWith(color: t.textMuted),
              ),
            ),
          ],
          const SizedBox(height: Space.xxl),
          AppButton.primary(
            label: 'SHARE IT',
            onPressed: () => BadgeSharing.share(
              context: context,
              def: def,
              headline: def.name,
            ),
          ),
          const SizedBox(height: Space.sm),
          Center(
            child: AppButton.text(
              label: 'NOT NOW',
              onPressed: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
    );
  }
}

/// Evaluates badges and celebrates anything new.
///
/// Called from the shell after the first frame rather than during boot: a modal
/// that beats the UI onto the screen reads as an ad, and the evaluation itself
/// touches every habit's history.
Future<void> celebrateNewBadges(BuildContext context, WidgetRef ref) async {
  final service = ref.read(achievementServiceProvider);
  final fresh = await service.evaluate();
  if (fresh.isEmpty || !context.mounted) return;

  await BadgeCelebration.show(context, fresh);
  // Marked shown whether the user shared or dismissed. The badge is theirs
  // either way, and re-offering the same celebration is nagging.
  await service.markShown(fresh.map((d) => d.key));
}
