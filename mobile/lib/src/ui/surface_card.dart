import 'package:flutter/material.dart';

import '../theme/aura_tokens.dart';

/// A card.
///
/// Monolith treated cards as a reluctant exception to a hairline design. Aura
/// inverts that: **the card is the unit of the interface.** It has a real fill,
/// a 1px lifted border and a soft shadow, because a screen of flat rectangles
/// separated by 0.5px scratches is exactly what "looks like a notebook" means.
///
/// [tint] tints fill, border and shadow from one colour, for status blocks
/// (complete, overdue, at risk) so those never need bespoke decoration.
/// [gradient] paints the brand wash instead of a flat fill — reserved for the
/// one hero block on a screen.
class SurfaceCard extends StatelessWidget {
  const SurfaceCard({
    super.key,
    required this.child,
    this.tint,
    this.gradient,
    this.padding = const EdgeInsets.all(Space.lg),
    this.radius = Radii.lg,
    this.onTap,
    this.elevated = true,
  });

  final Widget child;
  final Color? tint;
  final Gradient? gradient;
  final EdgeInsets padding;
  final double radius;
  final VoidCallback? onTap;

  /// Cards nested inside another card drop their shadow — stacked shadows read
  /// as mud rather than as depth.
  final bool elevated;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final shape = BorderRadius.circular(radius);

    final decorated = Container(
      padding: padding,
      decoration: BoxDecoration(
        // Tints are blended onto the surface rather than painted translucent
        // over the page ground — see the note on [Grad.surfaceWash] for what
        // translucency did to light mode.
        color: gradient != null
            ? null
            : (tint == null
                ? t.surface
                : Color.alphaBlend(
                    tint!.withValues(alpha: Alphas.tint), t.surface)),
        gradient: gradient,
        border: Border.all(
          color: tint == null
              ? t.border
              : tint!.withValues(alpha: Alphas.subtleBorder),
          width: Dimens.border,
        ),
        borderRadius: shape,
        boxShadow: elevated
            ? (tint == null ? Shadows.card(t) : Shadows.tintedCard(tint!))
            : null,
      ),
      child: child,
    );

    if (onTap == null) return decorated;

    // Clipped so the splash follows the corner radius instead of painting a
    // rectangle over it.
    return Material(
      color: Colors.transparent,
      borderRadius: shape,
      child: InkWell(
        onTap: onTap,
        borderRadius: shape,
        splashColor: t.accent.withValues(alpha: Alphas.splash),
        highlightColor: t.accent.withValues(alpha: Alphas.highlight),
        child: decorated,
      ),
    );
  }
}

/// A status line inside a card: icon, message, one accent colour.
class StatusNote extends StatelessWidget {
  const StatusNote({
    super.key,
    required this.icon,
    required this.message,
    required this.tint,
  });

  final IconData icon;
  final String message;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      tint: tint,
      padding: const EdgeInsets.all(Space.md),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: tint.withValues(alpha: Alphas.tintStrong),
              borderRadius: BorderRadius.circular(Radii.sm),
            ),
            child: Icon(icon, size: Dimens.iconSm, color: tint),
          ),
          const SizedBox(width: Space.md),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: tint),
            ),
          ),
        ],
      ),
    );
  }
}

/// A small rounded badge holding an icon, tinted from one colour.
///
/// The repeating leading element on rows throughout the app. Extracted so the
/// size, radius and tint strength are decided once.
class IconBadge extends StatelessWidget {
  const IconBadge({
    super.key,
    required this.icon,
    required this.color,
    this.size = 38,
    this.gradient,
  });

  final IconData icon;
  final Color color;
  final double size;

  /// Paints the brand gradient instead of a flat tint — for the one element on
  /// a screen that should feel like the primary action.
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: gradient == null
            ? color.withValues(alpha: Alphas.tintStrong)
            : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(size * 0.32),
      ),
      child: Icon(
        icon,
        size: size * 0.5,
        color: gradient == null ? color : context.aura.onAccent,
      ),
    );
  }
}
