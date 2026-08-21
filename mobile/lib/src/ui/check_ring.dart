import 'package:flutter/material.dart';

import '../theme/aura_tokens.dart';

/// The completion mark used for habits, tasks and milestones.
///
/// Fills with the brand gradient when done. The old version stayed an outlined
/// ring with a faint tint even when complete, on the theory that a column of
/// solid marks looked cheap — but the real problem there was the colour, not
/// the fill. Checking something off is the most satisfying moment in a habit
/// app and it should look like it landed.
class CheckRing extends StatelessWidget {
  const CheckRing({
    super.key,
    required this.done,
    this.size = Dimens.checkRing,
    this.tint,
  });

  final bool done;
  final double size;

  /// Solid override for the filled state — used to mark a frozen or skipped
  /// day, which is completion of a different kind.
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final solid = tint;

    return AnimatedContainer(
      duration: Motion.base,
      curve: Motion.curve,
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: done ? solid : null,
        gradient: done && solid == null ? Grad.brand(t) : null,
        border: done
            ? null
            : Border.all(color: t.borderStrong, width: 1.5),
        shape: BoxShape.circle,
        boxShadow: done ? Shadows.glow(solid ?? t.accent) : null,
      ),
      child: done
          ? Icon(Icons.check_rounded, size: size * 0.62, color: t.onAccent)
          : null,
    );
  }
}
