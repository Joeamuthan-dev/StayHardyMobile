import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../data/subscription_service.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/surface_card.dart';

/// Tip the developer — the old app's tip jar, moved out of the paywall.
///
/// Tips are gratitude, not commerce: they unlock nothing, and the sheet says
/// so, because a tip that might secretly be a purchase makes people hesitate
/// to give one.
class TipSheet extends ConsumerStatefulWidget {
  const TipSheet({super.key});

  static Future<void> open(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.aura.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.md)),
      ),
      builder: (_) => const TipSheet(),
    );
  }

  @override
  ConsumerState<TipSheet> createState() => _TipSheetState();
}

class _TipSheetState extends ConsumerState<TipSheet> {
  bool _busy = false;
  bool _thanked = false;
  String? _error;

  /// Which tile is mid-purchase, so only that one shows a spinner.
  int? _selected;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final tips = ref.watch(tipPlansProvider).value ?? const <ProPlan>[];

    return SafeArea(
      child: Padding(
        padding:
            const EdgeInsets.fromLTRB(Space.lg, Space.xl, Space.lg, Space.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // The old app's motivation card, kept almost word for word — it
            // was right the first time, and a tip screen that opens with a
            // price list reads as a transaction rather than a thank-you.
            SurfaceCard(
              gradient: Grad.surfaceWash(t),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('🌱', style: TextStyle(fontSize: 30)),
                  const SizedBox(height: Space.sm),
                  Text(
                    'Built with love,\nkept alive by you.',
                    style: text.titleLarge?.copyWith(height: 1.2),
                  ),
                  const SizedBox(height: Space.xs),
                  Text(
                    'StayHardy is crafted by a solo developer. Your tip helps '
                    'keep the servers running, new features coming, and the '
                    'coffee brewing.',
                    style: text.bodyMedium?.copyWith(color: t.textSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.lg),
            Text(
              'CHOOSE AN AMOUNT',
              style: text.labelLarge?.copyWith(
                color: t.textMuted,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: Space.lg),
            if (_thanked)
              _ThankYou(text: text)
            else if (tips.isEmpty)
              Text('Tips are unavailable right now.',
                  style: text.bodyMedium?.copyWith(color: t.textMuted))
            else
              // Three across, like the old app. A vertical stack made three
              // small gratitudes look like a pricing table you had to read;
              // side by side they read as one choice, taken at a glance.
              Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (var i = 0; i < tips.length && i < 3; i++) ...[
                    if (i > 0) const SizedBox(width: Space.sm),
                    Expanded(
                      child: _TipTile(
                        tip: tips[i],
                        index: i,
                        selected: _selected == i,
                        busy: _busy,
                        onTap: () => _tip(tips[i], i),
                      ),
                    ),
                  ],
                ],
              ),
            const SizedBox(height: Space.sm),
            Text(
              'Tips unlock nothing — they are just fuel. Thank you either way.',
              style: text.bodySmall?.copyWith(color: t.textMuted),
            ),
            if (_error != null) ...[
              const SizedBox(height: Space.sm),
              Text(_error!,
                  style: text.bodySmall?.copyWith(color: t.danger)),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _tip(ProPlan tip, int index) async {
    setState(() {
      _busy = true;
      _selected = index;
      _error = null;
    });
    final message =
        await ref.read(subscriptionServiceProvider).purchase(tip.package);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _selected = null;
      if (message == null) {
        _thanked = true;
      } else {
        _error = message;
      }
    });
    unawaited(Future<void>.value());
  }
}

/// One tip, as a tall tile: icon, name, price.
///
/// The icon carries the size of the gesture faster than the number does — a
/// cup, a coffee, a meal — which is what made the old app's row of three read
/// instantly. It rises on entry, staggered, so the row assembles rather than
/// appearing.
class _TipTile extends StatelessWidget {
  const _TipTile({
    required this.tip,
    required this.index,
    required this.selected,
    required this.busy,
    required this.onTap,
  });

  final ProPlan tip;
  final int index;
  final bool selected;
  final bool busy;
  final VoidCallback onTap;

  /// Escalating warmth, cheapest first. Falls back to a cup for a fourth
  /// product nobody has added yet.
  static const _icons = [
    Icons.local_cafe_rounded,
    Icons.coffee_rounded,
    Icons.restaurant_rounded,
  ];

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final icon = _icons[index < _icons.length ? index : _icons.length - 1];

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Motion.slow + Duration(milliseconds: index * 90),
      curve: Motion.emphasised,
      builder: (context, v, child) => Opacity(
        opacity: v.clamp(0.0, 1.0),
        child: Transform.translate(offset: Offset(0, (1 - v) * 18), child: child),
      ),
      child: SurfaceCard(
        padding: const EdgeInsets.symmetric(
            horizontal: Space.sm, vertical: Space.md),
        onTap: busy ? null : onTap,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 34,
              child: selected
                  ? const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : Icon(icon, size: 28, color: t.accent),
            ),
            const SizedBox(height: Space.sm),
            Text(
              // Store titles arrive as "Just Tea (StayHardy: …)" — already
              // trimmed upstream, but a long one still has to fit a third of
              // the width.
              tip.title,
              maxLines: 2,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              style: text.bodySmall?.copyWith(color: t.textSecondary),
            ),
            const SizedBox(height: 4),
            Text(tip.price, style: AuraType.numeral(17, color: t.accent)),
          ],
        ),
      ),
    );
  }
}

/// The moment after a tip lands. Worth more than a snackbar.
class _ThankYou extends StatelessWidget {
  const _ThankYou({required this.text});

  final TextTheme text;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Motion.slow,
      curve: Motion.emphasised,
      builder: (context, v, child) => Opacity(
        opacity: v.clamp(0.0, 1.0),
        child: Transform.scale(scale: 0.92 + 0.08 * v, child: child),
      ),
      child: SurfaceCard(
        gradient: Grad.surfaceWash(t),
        child: Column(
          children: [
            Text('🙏', style: const TextStyle(fontSize: 34)),
            const SizedBox(height: Space.sm),
            Text(
              'Thank you. Genuinely — this is what keeps it going.',
              textAlign: TextAlign.center,
              style: text.bodyLarge,
            ),
          ],
        ),
      ),
    );
  }
}
