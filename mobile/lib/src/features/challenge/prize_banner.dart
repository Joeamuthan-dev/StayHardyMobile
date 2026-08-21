import 'package:flutter/material.dart';

import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';

/// The prize, sold visually: a gold-glowing trophy banner that says
/// WIN PRO FOR LIFE louder than any paragraph could. One component, planted
/// on every surface where the circle can sell itself — the circles page,
/// the board, the paywall, What's New.
///
/// [compact] is the one-line version for pages where space is rent.
class PrizeBanner extends StatefulWidget {
  const PrizeBanner({super.key, this.compact = false, this.onTap});

  final bool compact;
  final VoidCallback? onTap;

  @override
  State<PrizeBanner> createState() => _PrizeBannerState();
}

class _PrizeBannerState extends State<PrizeBanner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _breath = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2400),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final reduce = MediaQuery.of(context).disableAnimations;

    return AnimatedBuilder(
      animation: _breath,
      builder: (context, child) {
        final v = reduce ? 0.5 : Curves.easeInOut.transform(_breath.value);
        return GestureDetector(
          onTap: widget.onTap,
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  t.warn.withValues(alpha: 0.22),
                  t.warn.withValues(alpha: 0.08),
                  t.accent.withValues(alpha: 0.10),
                ],
              ),
              borderRadius: BorderRadius.circular(Radii.md),
              border: Border.all(
                color: t.warn.withValues(alpha: 0.45 + 0.25 * v),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: t.warn.withValues(alpha: 0.10 + 0.12 * v),
                  blurRadius: 22 + 10 * v,
                  spreadRadius: 1 + 2 * v,
                ),
              ],
            ),
            padding: EdgeInsets.symmetric(
              horizontal: Space.md,
              vertical: widget.compact ? Space.sm : Space.md,
            ),
            child: child,
          ),
        );
      },
      child: widget.compact ? _compactRow(t, text) : _fullRow(t, text),
    );
  }

  Widget _trophy(AuraTokens t, double size) => Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              t.warn,
              t.warn.withValues(alpha: 0.65),
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: t.warn.withValues(alpha: 0.45),
              blurRadius: 14,
              spreadRadius: 1,
            ),
          ],
        ),
        child: Icon(Icons.emoji_events_rounded,
            size: size * 0.55, color: t.onFill(t.warn)),
      );

  Widget _fullRow(AuraTokens t, TextTheme text) {
    return Row(
      children: [
        _trophy(t, 52),
        const SizedBox(width: Space.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('WIN PRO — FOR LIFE',
                  style: AuraType.numeral(19, color: t.warn, weight: 800)),
              const SizedBox(height: 3),
              Text(
                'Top the StayHardy Circle this month. Top 3 win a lifetime '
                'of StayHardy Pro — free, forever.',
                style: text.bodySmall?.copyWith(color: t.textSecondary),
              ),
            ],
          ),
        ),
        if (widget.onTap != null)
          Icon(Icons.chevron_right_rounded,
              size: Dimens.iconSm, color: t.warn),
      ],
    );
  }

  Widget _compactRow(AuraTokens t, TextTheme text) {
    return Row(
      children: [
        _trophy(t, 34),
        const SizedBox(width: Space.md),
        Expanded(
          child: Text(
            'TOP 3 THIS MONTH WIN PRO FOR LIFE',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AuraType.numeral(13, color: t.warn, weight: 800),
          ),
        ),
        if (widget.onTap != null)
          Icon(Icons.chevron_right_rounded,
              size: Dimens.iconSm, color: t.warn),
      ],
    );
  }
}
