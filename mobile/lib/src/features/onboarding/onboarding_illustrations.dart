import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';

/// The onboarding pages' living illustrations.
///
/// The old app opened with animated vignettes — a floating task board, a
/// ring that glowed and bloomed — and those earned more trust than any
/// paragraph. These are their heirs, drawn in the Aura language instead of
/// imported as assets: the same rings, grid and greens the user is about to
/// live inside, so the promise and the product are visibly the same thing.
///
/// Every loop respects reduced motion by settling at its final frame.

/// Seven day-rings filling one after another, then breathing gently — the
/// week being kept, in front of you.
class WeekRingsIllustration extends StatefulWidget {
  const WeekRingsIllustration({super.key});

  @override
  State<WeekRingsIllustration> createState() => _WeekRingsIllustrationState();
}

class _WeekRingsIllustrationState extends State<WeekRingsIllustration>
    with SingleTickerProviderStateMixin {
  late final AnimationController _loop = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 3600),
  )..repeat();

  static const _targets = [1.0, 1.0, 0.65, 1.0, 0.85, 1.0, 0.4];

  @override
  void dispose() {
    _loop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final reduce = MediaQuery.of(context).disableAnimations;

    return SizedBox(
      height: 96,
      child: AnimatedBuilder(
        animation: _loop,
        builder: (context, _) {
          final bob =
              reduce ? 0.0 : math.sin(_loop.value * math.pi * 2) * 3.5;
          return Transform.translate(
            offset: Offset(0, bob),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < _targets.length; i++)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 5),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: reduce ? _targets[i] : 0,
                          end: _targets[i]),
                      duration: Duration(milliseconds: 600 + i * 160),
                      curve: Motion.emphasised,
                      builder: (context, v, _) => SizedBox(
                        width: 34,
                        height: 34,
                        child: CustomPaint(
                          painter: _RingPainter(
                            fraction: v,
                            colour:
                                _targets[i] >= 1 ? t.heat.last : t.heat[2],
                            track: t.surfaceAlt,
                            glow: _targets[i] >= 1
                                ? t.accent.withValues(alpha: 0.35)
                                : null,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.fraction,
    required this.colour,
    required this.track,
    this.glow,
  });

  final double fraction;
  final Color colour;
  final Color track;
  final Color? glow;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 4.0;
    final center = (Offset.zero & size).center;
    final radius = (size.shortestSide - stroke) / 2;

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = track
        ..strokeWidth = stroke
        ..style = PaintingStyle.stroke,
    );
    if (fraction <= 0) return;

    if (glow != null && fraction >= 1) {
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..color = glow!
          ..strokeWidth = stroke + 3
          ..style = PaintingStyle.stroke
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
      );
    }
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * fraction.clamp(0.0, 1.0),
      false,
      Paint()
        ..color = colour
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.fraction != fraction || old.colour != colour;
}

/// The app icon's grid, coming alive cell by cell, with a lock settling over
/// it — "your data, on your phone" as a picture instead of a claim.
class PrivateGridIllustration extends StatefulWidget {
  const PrivateGridIllustration({super.key});

  @override
  State<PrivateGridIllustration> createState() =>
      _PrivateGridIllustrationState();
}

class _PrivateGridIllustrationState extends State<PrivateGridIllustration>
    with SingleTickerProviderStateMixin {
  late final AnimationController _loop = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 5200),
  )..repeat();

  @override
  void dispose() {
    _loop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final reduce = MediaQuery.of(context).disableAnimations;

    return SizedBox(
      height: 110,
      child: Center(
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            AnimatedBuilder(
              animation: _loop,
              builder: (context, _) => CustomPaint(
                size: const Size(150, 96),
                painter: _GridPainter(
                  phase: reduce ? 0.55 : _loop.value,
                  heat: t.heat,
                  ground: t.surfaceAlt,
                ),
              ),
            ),
            Positioned(
              right: -14,
              bottom: -10,
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: reduce ? 1 : 0, end: 1),
                duration: const Duration(milliseconds: 900),
                curve: Curves.elasticOut,
                builder: (context, v, child) =>
                    Transform.scale(scale: v, child: child),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    gradient: Grad.brand(t),
                    shape: BoxShape.circle,
                    boxShadow: Shadows.glow(t.accent),
                  ),
                  child:
                      Icon(Icons.lock_rounded, size: 20, color: t.onAccent),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  _GridPainter({
    required this.phase,
    required this.heat,
    required this.ground,
  });

  final double phase;
  final List<Color> heat;
  final Color ground;

  @override
  void paint(Canvas canvas, Size size) {
    const cols = 7;
    const rows = 4;
    final cw = size.width / cols;
    final ch = size.height / rows;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        // Deterministic per-cell character, plus a slow diagonal shimmer —
        // the grid looks tended, not random.
        final seed = ((r * 31 + c * 17) % 10) / 10;
        final wave =
            (math.sin((phase * 2 * math.pi) + (r + c) * 0.7) + 1) / 2;
        final level = (seed * 0.6 + wave * 0.4);
        final colour = level < 0.25
            ? ground
            : heat[(level * (heat.length - 1)).round().clamp(0, heat.length - 1)];

        final rect = RRect.fromRectAndRadius(
          Rect.fromLTWH(
              c * cw + 2, r * ch + 2, cw - 4, ch - 4),
          const Radius.circular(5),
        );
        canvas.drawRRect(rect, Paint()..color = colour);
      }
    }
  }

  @override
  bool shouldRepaint(_GridPainter old) => old.phase != phase;
}

/// The old app's screen-three ring, reborn: a score ring sweeping to 86 with
/// a breathing bloom behind it — where all of this is headed.
class BloomRingIllustration extends StatefulWidget {
  const BloomRingIllustration({super.key});

  @override
  State<BloomRingIllustration> createState() => _BloomRingIllustrationState();
}

class _BloomRingIllustrationState extends State<BloomRingIllustration>
    with SingleTickerProviderStateMixin {
  late final AnimationController _breath = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2600),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final reduce = MediaQuery.of(context).disableAnimations;

    return SizedBox(
      height: 116,
      child: Center(
        child: AnimatedBuilder(
          animation: _breath,
          builder: (context, _) {
            final v = reduce
                ? 0.5
                : Curves.easeInOut.transform(_breath.value);
            return Container(
              width: 104,
              height: 104,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: t.accent.withValues(alpha: 0.10 + 0.14 * v),
                    blurRadius: 34 + 16 * v,
                    spreadRadius: 3 + 4 * v,
                  ),
                ],
              ),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: reduce ? 0.86 : 0, end: 0.86),
                duration: const Duration(milliseconds: 1400),
                curve: Motion.emphasised,
                builder: (context, f, _) => CustomPaint(
                  painter: _RingPainter(
                    fraction: f,
                    colour: t.accent,
                    track: t.surfaceAlt,
                  ),
                  child: Center(
                    child: Text(
                      '${(f * 100).round()}',
                      style: AuraType.numeral(32, color: t.textPrimary),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}


/// The argument of the whole app, drawn: motivation burns out, a kept routine
/// compounds past it.
///
/// Built as a real chart rather than a decoration, because this is the first
/// screen a new user sees and it has to look like a product someone paid for:
///
/// * **Curves, not polylines.** The series are sampled densely and drawn
///   through a Catmull–Rom spline, so there is not a single hard corner. The
///   earlier version joined a handful of points with straight segments, which
///   read as a child's zigzag.
/// * **Red against lime.** Motivation is [AuraTokens.danger] — the colour the
///   rest of the app uses for "this is going wrong" — so the two series are
///   separable at a glance and by meaning, not just by hue.
/// * **Area fills.** A vertical gradient under each curve gives the panel depth
///   and makes the crossover legible as *area lost* versus *area gained*.
/// * **The whole width, always.** Both curves are defined across the full
///   domain; only the reveal is animated, so the composition is never
///   lopsided mid-draw.
class MotivationVsConsistencyIllustration extends StatefulWidget {
  const MotivationVsConsistencyIllustration({super.key});

  @override
  State<MotivationVsConsistencyIllustration> createState() =>
      _MotivationVsConsistencyState();
}

class _MotivationVsConsistencyState
    extends State<MotivationVsConsistencyIllustration>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 5200),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final reduce = MediaQuery.of(context).disableAnimations;

    return Column(
      children: [
        SizedBox(
          height: 168,
          width: double.infinity,
          child: AnimatedBuilder(
            animation: _c,
            builder: (context, _) {
              // Draw across the first 62%, then hold the finished picture for
              // the rest of the loop — the completed chart is the thing worth
              // looking at, so it gets most of the time on screen.
              final raw = (_c.value / 0.62).clamp(0.0, 1.0);
              final p = reduce ? 1.0 : Curves.easeInOutCubic.transform(raw);
              return CustomPaint(
                painter: _DualCurvePainter(
                  progress: p,
                  consistency: t.accent,
                  motivation: t.danger,
                  baseline: t.border,
                ),
              );
            },
          ),
        ),
        const SizedBox(height: Space.sm),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: Space.md,
          runSpacing: 4,
          children: [
            _Key(colour: t.accent, label: 'Consistency'),
            _Key(colour: t.danger, label: 'Motivation'),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Same month. Two different people.',
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),
      ],
    );
  }
}

class _Key extends StatelessWidget {
  const _Key({required this.colour, required this.label});

  final Color colour;
  final String label;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 3,
          decoration: BoxDecoration(
            color: colour,
            borderRadius: BorderRadius.circular(2),
            boxShadow: [
              BoxShadow(color: colour.withValues(alpha: 0.5), blurRadius: 6),
            ],
          ),
        ),
        const SizedBox(width: 7),
        Text(
          label,
          style: Theme.of(context)
              .textTheme
              .bodySmall
              ?.copyWith(color: t.textSecondary),
        ),
      ],
    );
  }
}

class _DualCurvePainter extends CustomPainter {
  const _DualCurvePainter({
    required this.progress,
    required this.consistency,
    required this.motivation,
    required this.baseline,
  });

  final double progress;
  final Color consistency;
  final Color motivation;
  final Color baseline;

  /// Motivation: a hard spike, then decay in diminishing waves to almost
  /// nothing. Modelled rather than hand-plotted so the curve stays smooth at
  /// any width — an exponential envelope with a damped oscillation on it, which
  /// is genuinely what burnout looks like plotted.
  static double _motivation(double x) {
    if (x < 0.14) {
      // The surge, eased so the peak is round rather than a spike.
      final u = x / 0.14;
      return math.sin(u * math.pi / 2) * 0.92;
    }
    final u = (x - 0.14) / 0.86;
    final envelope = math.exp(-u * 3.4);
    // sin, not cos: it is zero at u=0, so the decay meets the surge at exactly
    // 0.92 instead of jumping to 1.3 and clipping — which put a visible notch
    // on the peak. The wave is the "second wind" that never quite lands.
    final ripple = 1 + 0.18 * math.sin(u * math.pi * 3.0);
    return (0.92 * envelope * ripple).clamp(0.015, 1.0);
  }

  /// Consistency: a shallow S. Starts lower than motivation and stays
  /// unglamorous through the first third — the honest part — then compounds.
  static double _consistency(double x) {
    final s = 1 / (1 + math.exp(-(x - 0.46) * 6.2)); // logistic
    return (0.10 + s * 0.78).clamp(0.0, 1.0);
  }

  /// Dense samples, mapped into the canvas.
  static List<Offset> _samples(double Function(double) fn, Size size) {
    const n = 96;
    return [
      for (var i = 0; i <= n; i++)
        Offset(
          i / n * size.width,
          size.height - fn(i / n) * (size.height - 10) - 4,
        ),
    ];
  }

  /// Catmull–Rom through the samples, emitted as cubic beziers. This is what
  /// removes every corner.
  static Path _spline(List<Offset> pts) {
    final path = Path()..moveTo(pts.first.dx, pts.first.dy);
    for (var i = 0; i < pts.length - 1; i++) {
      final p0 = i == 0 ? pts[i] : pts[i - 1];
      final p1 = pts[i];
      final p2 = pts[i + 1];
      final p3 = i + 2 < pts.length ? pts[i + 2] : p2;
      path.cubicTo(
        p1.dx + (p2.dx - p0.dx) / 6,
        p1.dy + (p2.dy - p0.dy) / 6,
        p2.dx - (p3.dx - p1.dx) / 6,
        p2.dy - (p3.dy - p1.dy) / 6,
        p2.dx,
        p2.dy,
      );
    }
    return path;
  }

  /// The leading fraction of [full], via path metrics — the only way to reveal
  /// a curve without re-deriving it.
  static (Path, Offset?) _reveal(Path full, double fraction) {
    if (fraction >= 0.999) {
      final m = full.computeMetrics().first;
      return (full, m.getTangentForOffset(m.length)?.position);
    }
    final out = Path();
    Offset? head;
    for (final m in full.computeMetrics()) {
      final len = m.length * fraction.clamp(0.0, 1.0);
      out.addPath(m.extractPath(0, len), Offset.zero);
      head = m.getTangentForOffset(len)?.position;
    }
    return (out, head);
  }

  void _series(
    Canvas canvas,
    Size size,
    double Function(double) fn,
    Color colour,
    double fraction, {
    required bool head,
  }) {
    if (fraction <= 0.001) return;
    final (line, tip) = _reveal(_spline(_samples(fn, size)), fraction);

    // Area under the curve, so the panel has depth instead of two hairlines.
    final area = Path.from(line);
    if (tip != null) {
      area
        ..lineTo(tip.dx, size.height)
        ..lineTo(0, size.height)
        ..close();
      canvas.drawPath(
        area,
        Paint()
          ..shader = ui.Gradient.linear(
            Offset(0, 0),
            Offset(0, size.height),
            [colour.withValues(alpha: 0.26), colour.withValues(alpha: 0.0)],
          ),
      );
    }

    canvas.drawPath(
      line,
      Paint()
        ..color = colour.withValues(alpha: 0.28)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 8
        ..strokeCap = StrokeCap.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8),
    );
    canvas.drawPath(
      line,
      Paint()
        ..color = colour
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );

    if (head && tip != null && fraction < 0.999) {
      canvas.drawCircle(
          tip, 7, Paint()..color = colour.withValues(alpha: 0.22));
      canvas.drawCircle(tip, 3.5, Paint()..color = colour);
    }
  }

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawLine(
      Offset(0, size.height),
      Offset(size.width, size.height),
      Paint()
        ..color = baseline
        ..strokeWidth = 1,
    );

    // Motivation runs ahead so its collapse has already happened while the lime
    // curve is still climbing. That gap in time is the argument.
    _series(canvas, size, _motivation, motivation,
        (progress * 1.30).clamp(0.0, 1.0),
        head: false);
    _series(canvas, size, _consistency, consistency, progress, head: true);
  }

  @override
  bool shouldRepaint(_DualCurvePainter old) => old.progress != progress;
}
