import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/aura_tokens.dart';
import '../theme/aura_typography.dart';

/// One bar in a [BarRow].
class Bar {
  const Bar({
    required this.label,
    required this.value,
    this.color,
    this.highlight = false,
    this.caption,
  });

  /// Axis label under the bar — a weekday initial, a date.
  final String label;

  final double value;

  /// Overrides the default gradient with a solid colour.
  final Color? color;

  /// Draws the label in full strength. Used for today.
  final bool highlight;

  /// Shown above the bar when the row is tall enough to carry it.
  final String? caption;
}

/// A row of vertical bars.
///
/// The workhorse chart: screen time per day, habits kept per day, minutes
/// focused per day. Bars are scaled against the largest value in the set rather
/// than a fixed maximum, and a set that is entirely zero renders as empty
/// tracks rather than as full-height bars — which is what a naive `value / max`
/// does when max is zero.
class BarRow extends StatelessWidget {
  const BarRow({
    super.key,
    required this.bars,
    this.height = 120,
    this.reference,
    this.maxBarWidth = 34,
  });

  final List<Bar> bars;
  final double height;

  /// Widest a single bar may be drawn.
  ///
  /// Without this, a chart with two or three points gives each one a third of
  /// the card and the result reads as a broken layout rather than as data —
  /// which is exactly what a first mood reading looked like.
  final double maxBarWidth;

  /// A dashed line across the chart — typically the period average, so a day
  /// can be read against the user's own normal rather than against nothing.
  final double? reference;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    if (bars.isEmpty) return SizedBox(height: height);

    var max = 0.0;
    for (final b in bars) {
      if (b.value > max) max = b.value;
    }
    if (reference != null && reference! > max) max = reference!;
    final hasData = max > 0;

    return SizedBox(
      height: height + 22,
      child: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                if (reference != null && hasData)
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: (reference! / max) * height,
                    child: CustomPaint(
                      painter: _DashedLine(color: t.borderStrong),
                      size: const Size(double.infinity, 1),
                    ),
                  ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    for (final b in bars)
                      Expanded(
                        child: _BarColumn(
                          bar: b,
                          fraction: hasData ? (b.value / max) : 0,
                          height: height,
                          maxWidth: maxBarWidth,
                          // A per-bar duration rather than a real stagger:
                          // TweenAnimationBuilder cannot be delayed, but
                          // finishing at slightly different times reads as a
                          // wave for one line of code and no controllers.
                          index: bars.indexOf(b),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 7),
          Row(
            children: [
              for (final b in bars)
                Expanded(
                  child: Text(
                    b.label,
                    textAlign: TextAlign.center,
                    style: text.labelMedium?.copyWith(
                      color: b.highlight ? t.textPrimary : t.textMuted,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BarColumn extends StatelessWidget {
  const _BarColumn({
    required this.bar,
    required this.fraction,
    required this.height,
    required this.maxWidth,
    this.index = 0,
  });

  final Bar bar;
  final double fraction;
  final double height;
  final double maxWidth;
  final int index;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 3),
      child: Align(
        alignment: Alignment.bottomCenter,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth),
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: fraction.clamp(0.0, 1.0)),
            duration: Motion.slow,
            curve: Motion.emphasised,
            builder: (context, value, _) => Stack(
              alignment: Alignment.bottomCenter,
              children: [
                Container(
                  height: height,
                  decoration: BoxDecoration(
                    color: t.surfaceAlt,
                    borderRadius: BorderRadius.circular(Radii.sm),
                  ),
                ),
                Container(
                  // A visible stub for a real-but-tiny value: a day with four
                  // minutes on it must not look identical to a day with none.
                  height: bar.value <= 0 ? 0 : math.max(value * height, 4),
                  decoration: BoxDecoration(
                    color: bar.color,
                    gradient: bar.color == null
                        ? LinearGradient(
                            colors: [t.accentAlt, t.accent],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          )
                        : null,
                    borderRadius: BorderRadius.circular(Radii.sm),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DashedLine extends CustomPainter {
  _DashedLine({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;
    const dash = 4.0, gap = 4.0;
    var x = 0.0;
    while (x < size.width) {
      canvas.drawLine(Offset(x, 0), Offset(x + dash, 0), paint);
      x += dash + gap;
    }
  }

  @override
  bool shouldRepaint(_DashedLine old) => old.color != color;
}

/// One slice of a [DonutChart] / segment of a [StackedBar].
class Slice {
  const Slice({required this.label, required this.value, required this.color});

  final String label;
  final double value;
  final Color color;
}

/// A donut.
///
/// Used for the screen-time category split. Slices below [minVisibleFraction]
/// are still drawn — dropping them would make the ring not add up, and a chart
/// whose parts do not sum to the whole is worse than no chart.
class DonutChart extends StatelessWidget {
  const DonutChart({
    super.key,
    required this.slices,
    this.size = 150,
    this.stroke = 22,
    this.center,
  });

  final List<Slice> slices;
  final double size;
  final double stroke;
  final Widget? center;

  static const minVisibleFraction = 0.01;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    var total = 0.0;
    for (final s in slices) {
      total += s.value;
    }

    return SizedBox(
      width: size,
      height: size,
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: Motion.slow,
        curve: Motion.emphasised,
        builder: (context, value, _) => CustomPaint(
          painter: _DonutPainter(
            slices: slices,
            total: total,
            stroke: stroke,
            progress: value,
            empty: t.surfaceAlt,
          ),
          child: center == null ? null : Center(child: center),
        ),
      ),
    );
  }
}

class _DonutPainter extends CustomPainter {
  _DonutPainter({
    required this.slices,
    required this.total,
    required this.stroke,
    required this.progress,
    required this.empty,
  });

  final List<Slice> slices;
  final double total;
  final double stroke;
  final double progress;
  final Color empty;

  @override
  void paint(Canvas canvas, Size size) {
    final center = (Offset.zero & size).center;
    final radius = (size.shortestSide - stroke) / 2;
    final circle = Rect.fromCircle(center: center, radius: radius);

    if (total <= 0) {
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..color = empty
          ..strokeWidth = stroke
          ..style = PaintingStyle.stroke,
      );
      return;
    }

    // A small gap between slices so adjacent hues of similar value still read
    // as two slices rather than one band.
    const gap = 0.02;
    var start = -math.pi / 2;
    for (final s in slices) {
      final sweep = (s.value / total) * 2 * math.pi * progress;
      if (sweep <= 0) continue;
      canvas.drawArc(
        circle,
        start + gap / 2,
        math.max(sweep - gap, 0.004),
        false,
        Paint()
          ..color = s.color
          ..strokeWidth = stroke
          ..strokeCap = StrokeCap.butt
          ..style = PaintingStyle.stroke,
      );
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(_DonutPainter old) =>
      old.progress != progress || old.slices != slices || old.total != total;
}

/// A single horizontal bar split into proportional segments.
///
/// The compact form of [DonutChart] — used where the split is context rather
/// than the subject, and a 150px circle would dominate a row it should support.
class StackedBar extends StatelessWidget {
  const StackedBar({super.key, required this.slices, this.height = 10});

  final List<Slice> slices;
  final double height;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    var total = 0.0;
    for (final s in slices) {
      total += s.value;
    }

    if (total <= 0) {
      return Container(
        height: height,
        decoration: BoxDecoration(
          color: t.surfaceAlt,
          borderRadius: BorderRadius.circular(height),
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(height),
      child: SizedBox(
        height: height,
        child: Row(
          children: [
            for (final s in slices)
              if (s.value > 0)
                Expanded(
                  flex: math.max((s.value / total * 1000).round(), 1),
                  child: ColoredBox(color: s.color),
                ),
          ],
        ),
      ),
    );
  }
}

/// A legend entry: a colour dot, a label, and a value.
class LegendRow extends StatelessWidget {
  const LegendRow({
    super.key,
    required this.color,
    required this.label,
    required this.value,
    this.share,
  });

  final Color color;
  final String label;
  final String value;

  /// 0..1, rendered as a right-aligned percentage.
  final double? share;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        children: [
          Container(
            width: 9,
            height: 9,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: Space.md),
          Expanded(
            child: Text(
              label,
              style: text.bodyLarge,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(value, style: AuraType.numeral(15, color: t.textPrimary)),
          if (share != null) ...[
            const SizedBox(width: Space.sm),
            SizedBox(
              width: 38,
              child: Text(
                '${(share! * 100).round()}%',
                textAlign: TextAlign.right,
                style: text.bodySmall?.copyWith(color: t.textMuted),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
