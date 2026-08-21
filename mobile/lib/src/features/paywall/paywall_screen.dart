import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../data/subscription_service.dart';
import '../../domain/focus_rules.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../challenge/prize_banner.dart';

/// StayHardy Pro.
///
/// States what Pro gives and what it costs, then gets out of the way. No
/// countdown timers, no fake scarcity, no pre-ticked upsell — the app is asking
/// someone to pay for a discipline tool, and a manipulative paywall undercuts
/// the entire premise.
class PaywallScreen extends ConsumerStatefulWidget {
  const PaywallScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const PaywallScreen()),
    );
  }

  @override
  ConsumerState<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends ConsumerState<PaywallScreen> {
  int _selected = 0;
  bool _busy = false;
  String? _error;

  static const _benefits = <(IconData, String)>[
    // One line each — the paywall must fit a phone screen without scrolling.
    // The list is re-checked against what is actually gated whenever a
    // feature moves across the line; details live where the gates are.
    (Icons.all_inclusive_rounded, 'Unlimited habits — free keeps 7'),
    (Icons.hourglass_top_rounded,
        'Unlimited focus blocks — free gets $freeFocusSessionsPerDay a day'),
    (Icons.calendar_month_rounded, 'Full history — free sees 30 days'),
    (Icons.add_to_drive_rounded, 'Daily auto backup to your Google Drive'),
    (Icons.phone_android_rounded, 'Screen-time insights'),
    (Icons.groups_rounded, 'Private circles up to 50 friends'),
  ];

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final plansAsync = ref.watch(proPlansProvider);

    return Scaffold(
      backgroundColor: t.bg,
      body: Stack(
        children: [
          // A slow ambient glow behind everything — the login page's aurora
          // language, so "premium" reads as the same brand, not a new one.
          const Positioned.fill(child: _AuroraWash()),
          SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(
                  Space.lg, Space.sm, Space.lg, Space.xxl),
              children: [
                Row(
                  children: [
                    IconButton(
                      padding: EdgeInsets.zero,
                      alignment: Alignment.centerLeft,
                      icon: Icon(Icons.close_rounded, color: t.textPrimary),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: _busy ? null : _restore,
                      child: Text('Restore',
                          style: text.bodyMedium
                              ?.copyWith(color: t.textSecondary)),
                    ),
                  ],
                ),
                const SizedBox(height: Space.md),

                // --- hero -------------------------------------------------
                _Stagger(
                  index: 0,
                  child: Center(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: Shadows.glow(t.accent),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.asset('assets/brand/app_icon.png',
                                fit: BoxFit.cover),
                          ),
                        ),
                        const SizedBox(width: Space.md),
                        Text('StayHardy', style: text.headlineMedium),
                        const SizedBox(width: Space.sm),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 9, vertical: 3),
                          decoration: BoxDecoration(
                            gradient: Grad.brand(t),
                            borderRadius: BorderRadius.circular(Radii.pill),
                            boxShadow: Shadows.glow(t.accent),
                          ),
                          child: Text('PRO',
                              style: AuraType.numeral(15,
                                  color: t.onAccent, weight: 800)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: Space.sm),
                const _Stagger(
                  index: 2,
                  child: PrizeBanner(compact: true),
                ),
                const SizedBox(height: Space.lg),

                // --- benefits: one tight card, one line each --------------
                _Stagger(
                  index: 1,
                  child: SurfaceCard(
                    gradient: Grad.surfaceWash(t),
                    padding: const EdgeInsets.symmetric(
                        horizontal: Space.md, vertical: Space.sm),
                    child: Column(
                      children: [
                        for (var i = 0; i < _benefits.length; i++)
                          Padding(
                            padding: const EdgeInsets.symmetric(
                                vertical: Space.sm),
                            child: Row(
                              children: [
                                Icon(_benefits[i].$1,
                                    size: Dimens.iconSm, color: t.accent),
                                const SizedBox(width: Space.md),
                                Expanded(
                                  child: Text(
                                    _benefits[i].$2,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: text.bodyMedium,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: Space.lg),

                plansAsync.when(
              loading: () => const LoadingView(),
              error: (_, _) => _unavailable(context),
              data: (plans) {
                if (plans.isEmpty) return _unavailable(context);
                return Column(
                  children: [
                    for (var i = 0; i < plans.length; i++)
                      Padding(
                        padding: const EdgeInsets.only(bottom: Space.sm),
                        child: _PlanTile(
                          plan: plans[i],
                          selected: i == _selected,
                          onTap: () => setState(() => _selected = i),
                        ),
                      ),
                    const SizedBox(height: Space.lg),
                    if (_error != null) ...[
                      StatusNote(
                        icon: Icons.error_outline_rounded,
                        message: _error!,
                        tint: t.danger,
                      ),
                      const SizedBox(height: Space.md),
                    ],
                    AppButton.primary(
                      label: _busy ? 'PLEASE WAIT…' : 'GO PRO',
                      onPressed:
                          _busy ? null : () => _purchase(plans[_selected]),
                    ),
                    const SizedBox(height: Space.md),
                    Text(
                      'Billed through Google Play. Cancel any time in the Play '
                      'Store — your habits and history stay yours either way.',
                      style: text.bodySmall?.copyWith(color: t.textMuted),
                      textAlign: TextAlign.center,
                    ),
                  ],
                );
              },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Shown when billing is unconfigured or the store returns nothing.
  ///
  /// Says so plainly rather than showing a Continue button that cannot work.
  Widget _unavailable(BuildContext context) {
    return StatusNote(
      icon: Icons.info_outline_rounded,
      message: 'Plans are unavailable right now. Please try again shortly.',
      tint: context.aura.textMuted,
    );
  }

  Future<void> _purchase(ProPlan plan) async {
    setState(() {
      _busy = true;
      _error = null;
    });

    final message =
        await ref.read(subscriptionServiceProvider).purchase(plan.package);
    if (!mounted) return;

    if (message == null) {
      await ref.read(isProProvider.notifier).refresh();
      if (mounted) Navigator.pop(context);
      return;
    }
    setState(() {
      _busy = false;
      _error = message;
    });
  }

  Future<void> _restore() async {
    setState(() {
      _busy = true;
      _error = null;
    });

    final found = await ref.read(subscriptionServiceProvider).restore();
    if (!mounted) return;

    if (found) {
      await ref.read(isProProvider.notifier).refresh();
      if (mounted) Navigator.pop(context);
      return;
    }
    setState(() {
      _busy = false;
      // Honest: the old app reported success on any completed call, which is
      // why people saw "restored" and still had nothing.
      _error = 'No previous purchase found on this Google account.';
    });
  }
}

class _PlanTile extends StatelessWidget {
  const _PlanTile({
    required this.plan,
    required this.selected,
    required this.onTap,
  });

  final ProPlan plan;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return SurfaceCard(
      onTap: onTap,
      tint: selected ? t.accent : null,
      padding: const EdgeInsets.all(Space.lg),
      child: Row(
        children: [
          Container(
            width: Dimens.checkRing,
            height: Dimens.checkRing,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: selected ? t.accent : t.borderStrong,
                width: Dimens.border,
              ),
              color: selected
                  ? t.accent.withValues(alpha: Alphas.tint)
                  : null,
            ),
            child: selected
                ? Icon(Icons.check, size: 13, color: t.accent)
                : null,
          ),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(plan.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: text.titleMedium),
                    ),
                    if (plan.badge != null) ...[
                      const SizedBox(width: Space.sm),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: t.accent.withValues(alpha: Alphas.tint),
                          borderRadius: BorderRadius.circular(Radii.sm),
                        ),
                        child: Text(plan.badge!,
                            style: text.labelMedium
                                ?.copyWith(color: t.accent, fontSize: 9)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(plan.period,
                    style: text.bodySmall?.copyWith(color: t.textMuted)),
              ],
            ),
          ),
          Text(plan.price,
              style: AuraType.numeral(22, color: t.textPrimary)),
        ],
      ),
    );
  }
}


/// Soft radial glows drifting at the page's corners — ambience, not content.
class _AuroraWash extends StatelessWidget {
  const _AuroraWash();

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return IgnorePointer(
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: const Alignment(-0.9, -0.9),
            radius: 1.1,
            colors: [
              t.accent.withValues(alpha: 0.10),
              t.accent.withValues(alpha: 0.0),
            ],
          ),
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: const Alignment(1.0, 0.4),
              radius: 1.2,
              colors: [
                t.secondary.withValues(alpha: 0.06),
                t.secondary.withValues(alpha: 0.0),
              ],
            ),
          ),
          child: const SizedBox.expand(),
        ),
      ),
    );
  }
}

/// Staggered entrance: each element fades and rises a beat after the one
/// above it, so the page assembles itself instead of appearing.
class _Stagger extends StatelessWidget {
  const _Stagger({required this.index, required this.child});

  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) return child;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 380 + index * 70),
      curve: Curves.easeOutCubic,
      builder: (context, v, c) => Opacity(
        opacity: v,
        child: Transform.translate(offset: Offset(0, (1 - v) * 18), child: c),
      ),
      child: child,
    );
  }
}
