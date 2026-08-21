import 'package:flutter/material.dart';

import '../theme/aura_tokens.dart';

/// A number that counts up to its value.
///
/// Used for the figures a person opens the app to see. A score that is simply
/// *there* when the screen paints is read as a label; one that climbs to its
/// value is read as a result, and the half second it takes is the difference
/// between a dashboard that feels alive and one that feels printed.
///
/// Rounds during the climb rather than interpolating a string, so it never
/// shows a fractional count.
class CountUp extends StatelessWidget {
  const CountUp({
    super.key,
    required this.value,
    required this.style,
    this.suffix = '',
    this.placeholder,
    this.duration,
  });

  final int value;
  final TextStyle style;
  final String suffix;

  /// Shown instead of a number when there is nothing to count to — a rest day
  /// with no score, for instance. Never counts up to a zero that means
  /// "unknown".
  final String? placeholder;

  final Duration? duration;

  @override
  Widget build(BuildContext context) {
    if (placeholder != null) return Text(placeholder!, style: style);

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value.toDouble()),
      duration: duration ?? Motion.slow,
      curve: Motion.emphasised,
      builder: (context, v, _) => Text('${v.round()}$suffix', style: style),
    );
  }
}
