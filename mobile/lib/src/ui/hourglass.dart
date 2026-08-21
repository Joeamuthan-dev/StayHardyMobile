import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/aura_tokens.dart';

/// A sand timer.
///
/// The classic object, because it is the one metaphor that needs no legend:
/// sand in the top is time you have, sand in the bottom is time you spent, and
/// the stream between them is the fact that it is still running.
///
/// **The stream stops when the timer stops.** A paused hourglass is readable as
/// paused from across a desk, which is not true of a ring that has merely
/// stopped growing.
///
/// ## What makes it read as glass rather than as two triangles
///
/// The first pass drew straight-sided triangles with a flat lime fill and a
/// line of uniform dots down the middle. Every detail below exists because
/// removing it made the object look like a diagram:
///
/// * **Curved silhouette.** A real bulb sweeps outward from the neck before
///   turning up to the rim. Straight edges read as a funnel, not as blown glass.
/// * **A concave top surface and a convex bottom mound.** Draining sand dips in
///   the middle where it is falling away; landing sand piles into a peak. Two
///   flat lines read as coloured liquid.
/// * **A tapering stream with scattered grains.** A constant-width bar with
///   evenly spaced circles reads as a string of beads.
/// * **Specular highlight and rim light.** Without a bright edge the glass has
///   no surface, and the sand looks painted onto the background.
///
/// ## The sand levels are area-correct, not height-correct
///
/// Each bulb is roughly a triangle, so filling it to half its *height* is not
/// filling half its *volume*. The top drains as `√remaining`, the bottom fills
/// as `1 − √(1 − elapsed)`. Height-linear sand appears to rush at the start and
/// crawl at the end, which reads as a broken clock.
class Hourglass extends StatefulWidget {
  const Hourglass({
    super.key,
    required this.fraction,
    required this.running,
    this.size = 200,
    this.sand,
    this.finished = false,
  });

  /// 0..1 elapsed.
  final double fraction;

  /// Drives the falling stream and the drifting grains. False while paused,
  /// finished, or not yet started.
  final bool running;

  final double size;

  /// Defaults to the brand accent.
  final Color? sand;

  final bool finished;

  @override
  State<Hourglass> createState() => _HourglassState();
}

class _HourglassState extends State<Hourglass>
    with SingleTickerProviderStateMixin {
  late final AnimationController _flow;

  @override
  void initState() {
    super.initState();
    _flow = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    );
    _sync();
  }

  @override
  void didUpdateWidget(Hourglass old) {
    super.didUpdateWidget(old);
    _sync();
  }

  void _sync() {
    if (widget.running && !_flow.isAnimating) {
      _flow.repeat();
    } else if (!widget.running && _flow.isAnimating) {
      _flow.stop();
    }
  }

  @override
  void dispose() {
    _flow.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final sand = widget.sand ?? t.accent;
    // A specular highlight is light in both themes. `textPrimary` is near-white
    // on the dark ground; on the light one it is near-black, so the light theme
    // takes `surface` (pure white) instead.
    final specular = Theme.of(context).brightness == Brightness.dark
        ? t.textPrimary
        : t.surface;

    return AnimatedBuilder(
      animation: _flow,
      builder: (context, _) {
        return SizedBox(
          width: widget.size * 0.78,
          height: widget.size,
          child: CustomPaint(
            painter: _HourglassPainter(
              elapsed: widget.fraction.clamp(0.0, 1.0),
              flow: _flow.value,
              running: widget.running,
              finished: widget.finished,
              sand: sand,
              specular: specular,
              glassTint: t.surfaceAlt,
              frame: t.borderStrong,
              frameHi: t.textMuted,
            ),
          ),
        );
      },
    );
  }
}

class _HourglassPainter extends CustomPainter {
  _HourglassPainter({
    required this.elapsed,
    required this.flow,
    required this.running,
    required this.finished,
    required this.sand,
    required this.specular,
    required this.glassTint,
    required this.frame,
    required this.frameHi,
  });

  final double elapsed;

  /// 0..1, looping. Drives the falling grains.
  final double flow;

  final bool running;
  final bool finished;
  final Color sand;
  final Color specular;
  final Color glassTint;
  final Color frame;
  final Color frameHi;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final cx = w / 2;

    // --- proportions ------------------------------------------------------
    final capH = h * 0.030;
    final capInset = w * 0.005;
    final neckY = h / 2;
    final neckHalf = w * 0.040;
    final rimInset = w * 0.13;
    final topRimY = capH * 2.0;
    final botRimY = h - capH * 2.0;

    final topBulb = _bulb(
      rimY: topRimY,
      neckY: neckY,
      cx: cx,
      rimLeft: rimInset,
      rimRight: w - rimInset,
      neckHalf: neckHalf,
    );
    final bottomBulb = _bulb(
      rimY: botRimY,
      neckY: neckY,
      cx: cx,
      rimLeft: rimInset,
      rimRight: w - rimInset,
      neckHalf: neckHalf,
    );

    // --- posts, behind the glass ------------------------------------------
    final postPaint = Paint()
      ..color = frame
      ..strokeWidth = w * 0.022
      ..strokeCap = StrokeCap.round;
    for (final dx in [rimInset * 0.62, w - rimInset * 0.62]) {
      canvas.drawLine(Offset(dx, topRimY), Offset(dx, botRimY), postPaint);
    }

    // --- glass body -------------------------------------------------------
    // A vertical gradient rather than a flat tint: a single alpha over the
    // whole bulb has no volume, and volume is the difference between glass and
    // a shape.
    final glassPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          glassTint.withValues(alpha: 0.75),
          glassTint.withValues(alpha: 0.35),
        ],
      ).createShader(Rect.fromLTWH(0, 0, w, h));
    canvas.drawPath(topBulb, glassPaint);
    canvas.drawPath(bottomBulb, glassPaint);

    // --- sand -------------------------------------------------------------
    final remaining = (1 - elapsed).clamp(0.0, 1.0);
    final topH = neckY - topRimY;
    final bottomH = botRimY - neckY;

    // See the class note: area, not height.
    final topSandH = topH * math.sqrt(remaining);
    final bottomSandH = bottomH * (1 - math.sqrt(remaining));

    final sandShader = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        Color.lerp(sand, specular, 0.22)!,
        sand,
        Color.lerp(sand, frame, 0.30)!,
      ],
      stops: const [0, 0.55, 1],
    ).createShader(Rect.fromLTWH(0, 0, w, h));
    final sandPaint = Paint()..shader = sandShader;

    // Top: a body of sand whose surface dips in the middle, where it is
    // draining away. The dip is what says "this is emptying".
    if (topSandH > 0.5) {
      canvas.save();
      canvas.clipPath(topBulb);
      final surfaceY = neckY - topSandH;
      // A broad, shallow sag — not a funnel. Sand slumping toward a drain
      // dishes gently across the whole surface; a deep narrow V turns the
      // bulb into a heart, which is what the first attempt drew.
      final dip = math.min(w * 0.042, topSandH * 0.28) * (running ? 1 : 0.65);
      final dipHalf = w * 0.42;
      canvas.drawPath(
        Path()
          ..moveTo(-w, surfaceY)
          ..lineTo(cx - dipHalf, surfaceY)
          ..quadraticBezierTo(cx, surfaceY + dip * 2, cx + dipHalf, surfaceY)
          ..lineTo(w * 2, surfaceY)
          ..lineTo(w * 2, neckY + 1)
          ..lineTo(-w, neckY + 1)
          ..close(),
        sandPaint,
      );
      _grainTexture(canvas, Rect.fromLTRB(0, surfaceY, w, neckY), w);
      canvas.restore();
    }

    // Bottom: a pile with a peak under the stream.
    if (bottomSandH > 0.5) {
      canvas.save();
      canvas.clipPath(bottomBulb);
      final surfaceY = botRimY - bottomSandH;
      final moundH = math.min(w * 0.10, bottomSandH * 0.55);
      final moundW = math.min(w * 0.46, bottomSandH * 2.2);
      canvas.drawPath(
        Path()
          ..moveTo(-w, surfaceY)
          ..lineTo(cx - moundW / 2, surfaceY)
          ..quadraticBezierTo(cx, surfaceY - moundH, cx + moundW / 2, surfaceY)
          ..lineTo(w * 2, surfaceY)
          ..lineTo(w * 2, botRimY + 1)
          ..lineTo(-w, botRimY + 1)
          ..close(),
        sandPaint,
      );
      _grainTexture(canvas, Rect.fromLTRB(0, surfaceY, w, botRimY), w);
      canvas.restore();
    }

    // --- the falling stream ------------------------------------------------
    // Drawn while paused too — frozen mid-air and faded, not vanished. The
    // flow controller stops on pause, so every grain holds its exact
    // position; the fade plus the stilled motion is what reads as "paused",
    // and resuming never teleports sand into existence.
    if (remaining > 0.0005 && elapsed > 0.0005) {
      final streamTop = neckY - topH * 0.06;
      final streamBottom = botRimY - bottomSandH;
      if (streamBottom > streamTop) {
        canvas.save();
        canvas.clipPath(bottomBulb);
        if (!running) {
          canvas.saveLayer(
            Rect.fromLTWH(0, 0, w, size.height),
            Paint()..color = sand.withValues(alpha: 0.4),
          );
        }
        final span = streamBottom - streamTop;

        // A taper, not a bar: the column widens very slightly as it falls and
        // fades where it meets the pile.
        canvas.drawPath(
          Path()
            ..moveTo(cx - w * 0.009, streamTop)
            ..lineTo(cx + w * 0.009, streamTop)
            ..lineTo(cx + w * 0.017, streamBottom)
            ..lineTo(cx - w * 0.017, streamBottom)
            ..close(),
          Paint()
            ..shader = LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [sand.withValues(alpha: 0.9), sand.withValues(alpha: 0.3)],
            ).createShader(
                Rect.fromLTRB(cx - w * 0.02, streamTop, cx + w * 0.02, streamBottom)),
        );

        // Grains: varied size and lateral drift, so the column reads as
        // falling material rather than as evenly spaced beads.
        const count = 11;
        for (var i = 0; i < count; i++) {
          final seed = (i * 2654435761) % 1000 / 1000;
          final p = (flow * (0.85 + seed * 0.3) + i / count) % 1.0;
          final y = streamTop + p * span;
          final drift = math.sin((p * 6.0 + seed * 6.28)) * w * 0.020 * p;
          final r = w * (0.008 + seed * 0.011);
          canvas.drawCircle(
            Offset(cx + drift, y),
            r,
            Paint()..color = sand.withValues(alpha: 0.55 + seed * 0.45),
          );
        }

        // Scatter where it lands. Three short-lived specks bouncing off the
        // mound — the detail that makes the pile feel struck rather than drawn.
        for (var i = 0; i < 3; i++) {
          final p = (flow * 1.6 + i / 3) % 1.0;
          final dir = i.isEven ? 1 : -1;
          canvas.drawCircle(
            Offset(
              cx + dir * w * 0.075 * p,
              streamBottom - math.sin(p * math.pi) * w * 0.055,
            ),
            w * 0.010 * (1 - p),
            Paint()..color = sand.withValues(alpha: 0.8 * (1 - p)),
          );
        }
        if (!running) canvas.restore();
        canvas.restore();
      }
    }

    // --- glass surface ----------------------------------------------------
    // Painted last so it sits over the sand. Without it the sand looks like a
    // shape on the background rather than something inside a vessel.
    for (final bulb in [topBulb, bottomBulb]) {
      canvas.save();
      canvas.clipPath(bulb);

      // Specular streak down the left shoulder.
      canvas.drawPath(
        Path()
          ..moveTo(rimInset + w * 0.055, topRimY)
          ..cubicTo(rimInset + w * 0.005, h * 0.22, cx - w * 0.16, h * 0.40,
              cx - neckHalf, neckY)
          ..lineTo(cx - neckHalf - w * 0.055, neckY)
          ..cubicTo(cx - w * 0.24, h * 0.40, rimInset - w * 0.045, h * 0.22,
              rimInset - w * 0.010, topRimY)
          ..close(),
        Paint()
          ..shader = LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              specular.withValues(alpha: 0.30),
              specular.withValues(alpha: 0.04),
            ],
          ).createShader(Rect.fromLTWH(0, 0, w, h)),
      );
      canvas.restore();
    }

    // Rim light on the outline.
    final outline = Paint()
      ..strokeWidth = w * 0.013
      ..style = PaintingStyle.stroke
      ..strokeJoin = StrokeJoin.round
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          specular.withValues(alpha: finished ? 0.0 : 0.32),
          (finished ? sand : frameHi).withValues(alpha: 0.55),
        ],
      ).createShader(Rect.fromLTWH(0, 0, w, h));
    canvas.drawPath(topBulb, outline);
    canvas.drawPath(bottomBulb, outline);

    // --- caps -------------------------------------------------------------
    for (final y in [capH, h - capH]) {
      final rect = RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx, y), width: w - capInset * 2, height: capH * 2),
        Radius.circular(capH),
      );
      canvas.drawRRect(
        rect,
        Paint()
          ..shader = LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              (finished ? sand : frameHi),
              Color.lerp(finished ? sand : frameHi, frame, 0.65)!,
            ],
          ).createShader(rect.outerRect),
      );
      // A thin lit edge along the top of each cap.
      canvas.drawLine(
        Offset(cx - w * 0.40, y - capH * 0.55),
        Offset(cx + w * 0.40, y - capH * 0.55),
        Paint()
          ..color = specular.withValues(alpha: 0.25)
          ..strokeWidth = capH * 0.35
          ..strokeCap = StrokeCap.round,
      );
    }
  }

  /// One bulb, as a closed curve from the rim to the neck.
  ///
  /// Cubic rather than straight: the sides bow outward near the rim and sweep
  /// in to the neck, which is the profile of blown glass. Straight edges make a
  /// funnel.
  Path _bulb({
    required double rimY,
    required double neckY,
    required double cx,
    required double rimLeft,
    required double rimRight,
    required double neckHalf,
  }) {
    final span = (neckY - rimY).abs();
    final dir = rimY < neckY ? 1.0 : -1.0;
    final bulge = (rimRight - rimLeft) * 0.10;

    return Path()
      ..moveTo(rimLeft, rimY)
      ..cubicTo(
        rimLeft - bulge * 0.25,
        rimY + dir * span * 0.42,
        cx - neckHalf - bulge * 0.9,
        rimY + dir * span * 0.80,
        cx - neckHalf,
        neckY,
      )
      ..lineTo(cx + neckHalf, neckY)
      ..cubicTo(
        cx + neckHalf + bulge * 0.9,
        rimY + dir * span * 0.80,
        rimRight + bulge * 0.25,
        rimY + dir * span * 0.42,
        rimRight,
        rimY,
      )
      ..close();
  }

  /// Faint speckle over a sand body, so a large fill does not read as plastic.
  ///
  /// Deterministic from the pixel position — a random source would make the
  /// grain crawl on every repaint, which at 60fps looks like television static.
  void _grainTexture(Canvas canvas, Rect area, double w) {
    if (area.height < 4) return;
    final speck = Paint()..color = frame.withValues(alpha: 0.16);
    final step = w * 0.075;
    for (var y = area.top + step / 2; y < area.bottom; y += step) {
      for (var x = area.left + step / 2; x < area.right; x += step) {
        final jitter = ((x * 13 + y * 7).round() % 100) / 100;
        canvas.drawCircle(
          Offset(x + jitter * step * 0.5, y + (1 - jitter) * step * 0.5),
          w * 0.006,
          speck,
        );
      }
    }
  }

  @override
  bool shouldRepaint(_HourglassPainter old) =>
      old.elapsed != elapsed ||
      old.flow != flow ||
      old.running != running ||
      old.finished != finished ||
      old.sand != sand;
}
