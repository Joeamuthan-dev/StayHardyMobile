import 'package:flutter/material.dart';

import '../../data/habit_repository.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../paywall/paywall_screen.dart';

/// Shown when a free user tries to add a habit beyond the limit.
///
/// States the position plainly and never implies anything has been taken away —
/// which matters most for migrated users, who may hold more habits than the
/// limit allows and must be told those are safe.
class HabitCapSheet extends StatelessWidget {
  const HabitCapSheet({super.key, required this.cap});

  final HabitCap cap;

  static Future<void> open(BuildContext context, HabitCap cap) {
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.aura.bg,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.md)),
      ),
      builder: (_) => HabitCapSheet(cap: cap),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(
          Space.lg, Space.sm, Space.lg, Space.lg),
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
          Text('Habit limit reached', style: text.displaySmall),
          const SizedBox(height: Space.lg),

          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('${cap.counted}',
                  style: AuraType.numeral(56, color: t.accent)),
              const SizedBox(width: Space.sm),
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text('of ${cap.limit} on the free plan',
                    style: text.bodyLarge?.copyWith(color: t.textMuted)),
              ),
            ],
          ),
          const SizedBox(height: Space.lg),

          Text(
            'Pro removes the limit entirely, and unlocks screen-time insights, '
            'focus sessions, and your full history.',
            style: text.bodyLarge?.copyWith(color: t.textSecondary),
          ),

          if (cap.isGrandfathered) ...[
            const SizedBox(height: Space.lg),
            Container(
              padding: const EdgeInsets.all(Space.md),
              decoration: BoxDecoration(
                color: t.success.withValues(alpha: Alphas.tint),
                border: Border.all(
                  color: t.success.withValues(alpha: Alphas.subtleBorder),
                  width: Dimens.hairline,
                ),
                borderRadius: BorderRadius.circular(Radii.sm),
              ),
              child: Row(
                children: [
                  Icon(Icons.lock_open_rounded,
                      size: Dimens.iconMd, color: t.success),
                  const SizedBox(width: Space.md),
                  Expanded(
                    child: Text(
                      cap.grandfathered == 1
                          ? 'The habit you already had stays yours, free, '
                              'forever.'
                          : 'The ${cap.grandfathered} habits you already had '
                              'stay yours, free, forever.',
                      style: text.bodyMedium?.copyWith(color: t.success),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: Space.xl),
          AppButton.primary(
            label: 'SEE PRO',
            onPressed: () {
              Navigator.pop(context);
              PaywallScreen.open(context);
            },
          ),
          const SizedBox(height: Space.sm),
          Center(
            child: AppButton.text(
              label: 'ARCHIVE A HABIT INSTEAD',
              onPressed: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
    );
  }
}
