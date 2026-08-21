import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/aura_tokens.dart';

/// The hero progress ring.
///
/// Drawn with a [CustomPainter] rather than a `CircularProgressIndicator` so the
/// track, cap, gradient and sweep can all be controlled — a stock indicator has
/// a fixed stroke and a butt cap that reads cheap at this size.
///
/// By default the arc is painted with the brand gradient rather than a flat
/// colour: at 190px a solid arc is the single largest area of flat colour on
/// the screen, and it is what made the previous hero look printed. Pass [color]
/// to override with a solid semantic colour (success on a completed day).
class ProgressRing extends StatefulWidget {
  const ProgressRing({
    super.key,
    required this.fraction,
    required this.size,
    this.stroke = 10,
    this.color,
    this.trackColor,
    this.glow = true,
    this.sweep,
    this.child,
  });

  /// Overrides the brand sweep. Ignored when [color] is set.
  final SweepGradient? sweep;

  final double fraction;
  final double size;
  final double stroke;

  /// Solid override. Null paints [Grad.brandSweep].
  final Color? color;

  final Color? trackColor;

  /// A soft coloured bloom behind the ring. Off for small inline rings, where
  /// it would just look smudged.
  final bool glow;

  final Widget? child;

  @override
  State<ProgressRing> createState() => _ProgressRingState();
}

class _ProgressRingState extends State<ProgressRing>
    with SingleTickerProviderStateMixin {
  /// One breath of the glow when the fill lands.
  ///
  /// The fill animation on its own ends by simply stopping, which reads as the
  /// number arriving rather than being *reached*. A single soft swell of the
  /// halo at the moment the arc settles is the difference — and it runs once,
  /// because a ring that keeps pulsing is a notification, not a chart.
  late final AnimationController _settle;

  @override
  void initState() {
    super.initState();
    _settle = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
  }

  @override
  void dispose() {
    _settle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final safe =
        widget.fraction.isFinite ? widget.fraction.clamp(0.0, 1.0) : 0.0;
    final solid = widget.color;

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: safe),
      duration: Motion.slow,
      curve: Motion.emphasised,
      onEnd: () {
        if (safe > 0 && mounted) _settle.forward(from: 0);
      },
      builder: (context, value, _) {
        return AnimatedBuilder(
          animation: _settle,
          builder: (context, _) {
            // 0 → 1 → 0 over the controller's run.
            final swell = math.sin(_settle.value * math.pi);
            return SizedBox(
              width: widget.size,
              height: widget.size,
              child: CustomPaint(
                painter: _RingPainter(
                  fraction: value,
                  track: widget.trackColor ?? t.surfaceAlt,
                  solid: solid,
                  gradient: solid == null
                      ? (widget.sweep ?? Grad.brandSweep(t))
                      : null,
                  stroke: widget.stroke,
                  // Painted as a blurred copy of the arc, not as a BoxShadow
                  // on the container. A shadow on a circular box paints a
                  // filled blurred *disc*, which is invisible behind a 3px
                  // ring and a solid coloured plate behind a 16px one — which
                  // is exactly how it shipped on the focus timer.
                  glow: widget.glow
                      ? (solid ??
                          (widget.sweep == null ? t.accent : t.heat[3]))
                      : null,
                  glowAlpha: 0.45 + swell * 0.30,
                  tipShadow: t.shadow.withValues(alpha: 0.55),
                ),
                child: widget.child == null
                    ? null
                    : Center(child: widget.child),
              ),
            );
          },
        );
      },
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.fraction,
    required this.track,
    required this.solid,
    required this.gradient,
    required this.stroke,
    required this.glow,
    this.glowAlpha = 0.45,
    required this.tipShadow,
  });

  /// Strength of the halo, briefly raised by the settle pulse.
  final double glowAlpha;

  /// Under the tip dot. From the theme's shadow token, so the theme-guard test
  /// keeps its "no raw colours outside the theme" rule intact.
  final Color tipShadow;

  final double fraction;
  final Color track;
  final Color? solid;
  final SweepGradient? gradient;
  final double stroke;

  /// Null for no halo. Painted as a blurred stroke along the same arc.
  final Color? glow;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final center = rect.center;
    final radius = (size.shortestSide - stroke) / 2;
    final circle = Rect.fromCircle(center: center, radius: radius);

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = track
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke,
    );

    if (fraction <= 0) return;

    if (glow != null) {
      canvas.drawArc(
        circle,
        -math.pi / 2,
        2 * math.pi * fraction,
        false,
        Paint()
          ..color = glow!.withValues(alpha: glowAlpha.clamp(0.0, 1.0))
          ..strokeWidth = stroke
          ..strokeCap = StrokeCap.round
          ..style = PaintingStyle.stroke
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, stroke * 0.9),
      );
    }

    final sweep = Paint()
      ..strokeWidth = stroke
      ..style = PaintingStyle.stroke
      // Round caps read as considered; butt caps read as a loading spinner.
      ..strokeCap = StrokeCap.round;

    if (gradient != null) {
      // The seam, fixed properly this time.
      //
      // A previous attempt shifted the gradient's startAngle to cover the
      // round cap. It could never work: Flutter computes a pixel's sweep angle
      // in [0, 2π), so the cap's pixels just before 0° evaluate at ~2π and
      // clamp to the gradient's END colour — a lick of deep green under the
      // pale start, whatever the startAngle says. The only reliable shape is
      // to stop using stroke caps for the gradient at all:
      //
      // * the body is a **butt-capped** arc carrying the gradient, scaled to
      //   the drawn sweep so the deepest colour always sits at the tip;
      // * the start is an explicit dot in the first colour;
      // * the tip is an explicit dot in the last colour, over a small dark
      //   blur — the shadow is what makes a nearly-full ring's tip read as
      //   lying *above* its own start, the way a watch ring does, instead of
      //   as a rendering artefact beside it.
      final arc = 2 * math.pi * fraction;
      sweep
        ..strokeCap = StrokeCap.butt
        ..shader = SweepGradient(
          colors: gradient!.colors,
          stops: gradient!.stops,
          endAngle: math.max(arc, 0.01),
        ).createShader(circle, textDirection: null);

      canvas.save();
      canvas.translate(center.dx, center.dy);
      canvas.rotate(-math.pi / 2);
      canvas.translate(-center.dx, -center.dy);
      canvas.drawArc(circle, 0, arc, false, sweep);

      final startPoint = Offset(center.dx + radius, center.dy);
      final tipPoint = Offset(
        center.dx + radius * math.cos(arc),
        center.dy + radius * math.sin(arc),
      );
      canvas.drawCircle(
          startPoint, stroke / 2, Paint()..color = gradient!.colors.first);
      if (arc > 0.35) {
        canvas.drawCircle(
          tipPoint,
          stroke / 2 + 0.5,
          Paint()
            ..color = tipShadow
            ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
        );
      }
      canvas.drawCircle(
          tipPoint, stroke / 2, Paint()..color = gradient!.colors.last);
      canvas.restore();
    } else {
      sweep.color = solid!;
      canvas.drawArc(
        circle,
        // Start at twelve o'clock rather than three.
        -math.pi / 2,
        2 * math.pi * fraction,
        false,
        sweep,
      );
    }
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.fraction != fraction ||
      old.solid != solid ||
      old.track != track ||
      old.stroke != stroke ||
      old.glow != glow ||
      old.glowAlpha != glowAlpha;
}
