import 'package:flutter/material.dart';

import '../theme/aura_tokens.dart';

/// A rounded progress bar.
///
/// Was a 1px hairline that filled from the left. That was the honest expression
/// of the old design language and also the reason progress was invisible on a
/// phone at arm's length. This is a real bar: [Dimens.bar] tall, fully rounded,
/// painted with the brand gradient unless given a semantic colour.
///
/// The class name is unchanged from `ProgressRule` on purpose — it is used in
/// Habits, Goals and Stats, and renaming it would churn those files for nothing.
class ProgressRule extends StatelessWidget {
  const ProgressRule({
    super.key,
    required this.fraction,
    this.color,
    this.height = Dimens.bar,
    this.trackColor,
  });

  /// 0..1. Values outside the range are clamped rather than overflowing.
  final double fraction;

  /// Solid override. Null paints the brand gradient — pass [AuraTokens.success]
  /// for a finished goal, so "done" is distinguishable from "in progress"
  /// without a second widget.
  final Color? color;

  final double height;
  final Color? trackColor;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final safe = fraction.isFinite ? fraction.clamp(0.0, 1.0) : 0.0;
    final radius = BorderRadius.circular(height);

    return LayoutBuilder(
      builder: (context, c) => Stack(
        children: [
          Container(
            height: height,
            decoration: BoxDecoration(
              color: trackColor ?? t.surfaceAlt,
              borderRadius: radius,
            ),
          ),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: safe),
            duration: Motion.slow,
            curve: Motion.emphasised,
            builder: (context, value, _) => Container(
              height: height,
              // Never narrower than its own height once non-zero: a 2px sliver
              // of gradient reads as a rendering artefact, not as progress.
              width: value <= 0
                  ? 0
                  : (c.maxWidth * value).clamp(height, c.maxWidth),
              decoration: BoxDecoration(
                color: color,
                gradient: color == null ? Grad.brand(t) : null,
                borderRadius: radius,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
