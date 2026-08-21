import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/achievement_service.dart';
import '../../data/providers.dart';
import '../../domain/badge_catalogue.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/progress_rule.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../shared/section_header.dart';
import 'badge_medal.dart';
import 'share_card.dart';

/// Level, XP, and the whole badge ladder.
///
/// Locked badges are shown rather than hidden. A ladder whose top you cannot
/// see gives you nothing to climb toward, and hiding it turns the screen into a
/// list of things you have already done — which is a trophy cabinet, not a
/// reason to come back.
class AchievementsScreen extends ConsumerWidget {
  const AchievementsScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const AchievementsScreen()),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final async = ref.watch(achievementsProvider);

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
            message: "Couldn't load your badges.",
            detail: e.toString(),
            onRetry: () => ref.invalidate(achievementsProvider),
          ),
          data: (view) => _Body(view: view),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.view});
  final AchievementsView view;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final earned = view.earnedKeys;

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
      children: [
        ScreenTitle(
          title: 'Standing',
          trailing: '${earned.length} OF ${BadgeCatalogue.all.length}',
        ),
        const SizedBox(height: Space.xl),

        SurfaceCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text('LEVEL', style: text.labelMedium),
                  const SizedBox(width: Space.sm),
                  Text('${view.level}',
                      style: AuraType.numeral(40, color: t.accent)),
                  const Spacer(),
                  Text('${view.xp} XP',
                      style: text.bodyMedium?.copyWith(color: t.textMuted)),
                ],
              ),
              const SizedBox(height: Space.md),
              ProgressRule(fraction: view.levelProgress),
              const SizedBox(height: Space.sm),
              Text(
                '${view.xpToNext} XP to level ${view.level + 1}',
                style: text.bodySmall?.copyWith(color: t.textMuted),
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.md),
        Text(
          'XP comes from work you have actually done — check-ins, focused '
          'minutes, tasks and goals finished. It never goes down.',
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),

        if (view.nextUp != null) ...[
          const SizedBox(height: Space.xl),
          const SectionLabel('Next up'),
          const SizedBox(height: Space.md),
          _NextUpCard(def: view.nextUp!, stats: view.stats),
        ],

        const SizedBox(height: Space.xxl),
        const SectionLabel('Badges'),
        const SizedBox(height: Space.lg),

        for (final def in BadgeCatalogue.all)
          _BadgeRow(
            def: def,
            earned: earned.contains(def.key),
            earnedAt: _earnedAt(def.key),
          ),
      ],
    );
  }

  int? _earnedAt(String key) {
    for (final b in view.earned) {
      if (b.def.key == key) return b.earnedAt;
    }
    return null;
  }
}

class _NextUpCard extends StatelessWidget {
  const _NextUpCard({required this.def, required this.stats});

  final BadgeDef def;
  final AchievementStats stats;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final have = stats.valueOf(def.metric);
    final fraction = (have / def.threshold).clamp(0.0, 1.0);

    return SurfaceCard(
      child: Row(
        children: [
          BadgeMedal(def: def, earned: false, size: 54),
          const SizedBox(width: Space.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(def.name, style: text.titleMedium),
                const SizedBox(height: 4),
                Text(
                  '$have of ${def.threshold} ${_unit(def.metric)}',
                  style: text.bodySmall?.copyWith(color: t.textMuted),
                ),
                const SizedBox(height: Space.sm),
                ProgressRule(fraction: fraction),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _unit(BadgeMetric m) => switch (m) {
        BadgeMetric.bestStreak => 'days',
        BadgeMetric.totalCheckIns => 'check-ins',
        BadgeMetric.focusMinutes => 'focused minutes',
        BadgeMetric.perfectWeeks => 'perfect weeks',
      };
}

class _BadgeRow extends StatelessWidget {
  const _BadgeRow({
    required this.def,
    required this.earned,
    required this.earnedAt,
  });

  final BadgeDef def;
  final bool earned;
  final int? earnedAt;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: Space.md),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: t.border, width: Dimens.hairline),
        ),
      ),
      child: Row(
        children: [
          BadgeMedal(def: def, earned: earned, size: 48),
          const SizedBox(width: Space.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  def.name,
                  style: text.bodyLarge?.copyWith(
                    color: earned ? t.textPrimary : t.textMuted,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  earned && earnedAt != null
                      ? _earnedLabel(earnedAt!)
                      : def.description,
                  style: text.bodySmall?.copyWith(color: t.textMuted),
                ),
              ],
            ),
          ),
          if (earned)
            AppButton.text(
              label: 'SHARE',
              onPressed: () => BadgeSharing.share(
                context: context,
                def: def,
                headline: def.name,
                footnote: earnedAt == null ? null : _earnedLabel(earnedAt!),
              ),
            ),
        ],
      ),
    );
  }

  static String _earnedLabel(int epochMillis) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
        'Sep', 'Oct', 'Nov', 'Dec'];
    final d = DateTime.fromMillisecondsSinceEpoch(epochMillis);
    return 'Earned ${d.day} ${months[d.month - 1]} ${d.year}';
  }
}
