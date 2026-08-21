import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/aura_tokens.dart';

/// One destination in [AuraNavBar].
class NavDestination {
  const NavDestination({
    required this.label,
    required this.icon,
    required this.activeIcon,
  });

  final String label;
  final IconData icon;

  /// The filled variant. Outline-when-inactive / filled-when-active is the
  /// clearest state signal available at 22px, and it works before colour does
  /// for anyone who cannot rely on the accent hue.
  final IconData activeIcon;
}

/// The bottom navigation bar.
///
/// Replaces a full-bleed row of six uppercase words sitting on a hairline,
/// which read as a torn page edge and forced six destinations into a space that
/// comfortably holds four.
///
/// This is a floating, blurred, shadowed bar with four destinations. The
/// selected one expands into a gradient pill carrying its label; the rest are
/// icons only. The expansion is animated, so the selection reads as a physical
/// movement rather than a colour swap.
class AuraNavBar extends StatelessWidget {
  const AuraNavBar({
    super.key,
    required this.destinations,
    required this.index,
    required this.onSelect,
  });

  final List<NavDestination> destinations;
  final int index;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          Space.lg,
          0,
          Space.lg,
          Dimens.navInset,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(Radii.pill),
          child: BackdropFilter(
            // The bar floats over scrolling content, so it has to stay legible
            // with anything passing beneath it. Blur does that without the
            // opaque slab that would waste the floating treatment.
            filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
            child: Container(
              height: Dimens.navHeight,
              padding: const EdgeInsets.symmetric(horizontal: Space.sm),
              decoration: BoxDecoration(
                color: t.surfaceHigh.withValues(alpha: 0.88),
                borderRadius: BorderRadius.circular(Radii.pill),
                border: Border.all(color: t.border, width: Dimens.border),
                boxShadow: Shadows.lifted(t),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  for (var i = 0; i < destinations.length; i++)
                    _NavItem(
                      destination: destinations[i],
                      selected: i == index,
                      onTap: () {
                        if (i == index) return;
                        unawaited(
                          HapticFeedback.selectionClick().catchError((_) {}),
                        );
                        onSelect(i);
                      },
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.destination,
    required this.selected,
    required this.onTap,
  });

  final NavDestination destination;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Semantics(
      button: true,
      selected: selected,
      label: destination.label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: AnimatedContainer(
          duration: Motion.base,
          curve: Motion.emphasised,
          height: Dimens.touchTarget,
          padding: EdgeInsets.symmetric(horizontal: selected ? Space.md : 14),
          decoration: BoxDecoration(
            gradient: selected ? Grad.brand(t) : null,
            borderRadius: BorderRadius.circular(Radii.pill),
            boxShadow: selected ? Shadows.glow(t.accent) : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                selected ? destination.activeIcon : destination.icon,
                size: 22,
                color: selected ? t.onAccent : t.textMuted,
              ),
              // Animated rather than conditional, so the pill grows into place
              // instead of the row snapping to a new layout.
              AnimatedSize(
                duration: Motion.base,
                curve: Motion.emphasised,
                child: selected
                    ? Padding(
                        padding: const EdgeInsets.only(left: 7),
                        child: Text(
                          destination.label,
                          style: text.titleMedium?.copyWith(color: t.onAccent),
                        ),
                      )
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
