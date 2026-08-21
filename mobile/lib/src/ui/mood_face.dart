import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../domain/mood_rules.dart';
import '../theme/aura_tokens.dart';
import '../theme/mood_palette.dart';

/// A mood, as a face.
///
/// One drawing shared by the check-in orb and the Stats chart, so the face for
/// a score of 2 on the chart is exactly the face the user picked when they
/// logged it. Two hand-drawn sets of the same five expressions would drift
/// apart the first time either was touched.
class MoodFace extends StatelessWidget {
  const MoodFace({
    super.key,
    required this.level,
    this.size = 22,
    this.colour,
    this.blink = 0,
  });

  final MoodLevel level;
  final double size;

  /// Defaults to the level's own palette colour.
  final Color? colour;

  /// 0 open .. 1 shut. Only the check-in animates this.
  final double blink;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final fill = colour ?? t.mood(level);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: fill),
      child: CustomPaint(
        painter: MoodFacePainter(
          mood: level.fraction,
          blink: blink,
          ink: t.onMood,
        ),
      ),
    );
  }
}

/// A face whose every feature is a function of one number.
///
/// Eyes, brows, cheeks and mouth all interpolate off [mood] (0 terrible,
/// 1 excellent), so dragging the slider morphs one continuous face rather than
/// cross-fading between five drawn ones.
class MoodFacePainter extends CustomPainter {
  MoodFacePainter({
    required this.mood,
    required this.blink,
    required this.ink,
  });

  /// 0 (terrible) to 1 (excellent).
  final double mood;

  /// 0 open, 1 fully shut.
  final double blink;

  final Color ink;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final fill = Paint()..color = ink;
    final stroke = Paint()
      ..color = ink
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final eyeY = h * 0.44;
    final eyeDx = w * 0.145;
    final centre = w * 0.5;

    // --- eyes -------------------------------------------------------------
    // Happy eyes squint into arcs; low eyes are wide and round. Blink
    // collapses whatever shape is current, so it works at every mood.
    final squint = ((mood - 0.6) / 0.4).clamp(0.0, 1.0);
    final openness = (1 - blink) * (1 - squint * 0.85);
    final eyeR = w * (0.052 - mood * 0.008);

    for (final dx in [centre - eyeDx, centre + eyeDx]) {
      if (squint > 0.5 && blink < 0.5) {
        // A happy arc — the ^^ eyes.
        stroke.strokeWidth = w * 0.030;
        final span = eyeR * 2.1;
        canvas.drawArc(
          Rect.fromCenter(
            center: Offset(dx, eyeY + eyeR * 0.5),
            width: span,
            height: span,
          ),
          math.pi,
          math.pi,
          false,
          stroke,
        );
      } else {
        canvas.drawOval(
          Rect.fromCenter(
            center: Offset(dx, eyeY),
            width: eyeR * 2,
            height: math.max(eyeR * 2 * openness, w * 0.012),
          ),
          fill,
        );
        // A catchlight, which is most of what makes an eye look alive.
        if (openness > 0.55) {
          canvas.drawCircle(
            Offset(dx + eyeR * 0.32, eyeY - eyeR * 0.34),
            eyeR * 0.30,
            Paint()..color = ink.withValues(alpha: 0.35),
          );
        }
      }
    }

    // --- brows ------------------------------------------------------------
    // Angled inward and low when unhappy; lifted and level as the mood rises.
    if (mood < 0.62) {
      final tilt = (0.62 - mood) / 0.62;
      stroke.strokeWidth = w * 0.030;
      final browY = eyeY - h * 0.115 - tilt * h * 0.012;
      final halfLen = w * 0.075;
      canvas.drawLine(
        Offset(centre - eyeDx - halfLen, browY - h * 0.022 * tilt),
        Offset(centre - eyeDx + halfLen, browY + h * 0.030 * tilt),
        stroke,
      );
      canvas.drawLine(
        Offset(centre + eyeDx + halfLen, browY - h * 0.022 * tilt),
        Offset(centre + eyeDx - halfLen, browY + h * 0.030 * tilt),
        stroke,
      );
    }

    // --- cheeks -----------------------------------------------------------
    // Blush only once genuinely happy. It is the detail that reads as warmth.
    if (mood > 0.68) {
      final blush = ((mood - 0.68) / 0.32).clamp(0.0, 1.0);
      final cheek = Paint()..color = ink.withValues(alpha: 0.16 * blush);
      for (final dx in [centre - w * 0.24, centre + w * 0.24]) {
        canvas.drawOval(
          Rect.fromCenter(
            center: Offset(dx, h * 0.56),
            width: w * 0.13,
            height: w * 0.085,
          ),
          cheek,
        );
      }
    }

    // --- mouth ------------------------------------------------------------
    final mouthY = h * 0.655;
    final halfW = w * 0.135;
    // Control point swings from above the endpoints (frown) to below (smile),
    // so one quadratic covers the whole range.
    final curve = (mood - 0.5) * 2;

    if (mood > 0.86) {
      // An open, grinning mouth at the very top of the scale — the one state
      // that earns more than a line.
      final grin = ((mood - 0.86) / 0.14).clamp(0.0, 1.0);
      final path = Path()
        ..moveTo(centre - halfW, mouthY - h * 0.005)
        ..quadraticBezierTo(
            centre, mouthY + h * (0.10 + 0.06 * grin), centre + halfW,
            mouthY - h * 0.005)
        ..close();
      canvas.drawPath(path, fill);
    } else {
      stroke.strokeWidth = w * 0.034;
      canvas.drawPath(
        Path()
          ..moveTo(centre - halfW, mouthY)
          ..quadraticBezierTo(
              centre, mouthY + curve * h * 0.13, centre + halfW, mouthY),
        stroke,
      );
    }

    // --- a single tear, at the very bottom of the scale --------------------
    if (mood < 0.12) {
      final tear = (1 - mood / 0.12).clamp(0.0, 1.0);
      final tx = centre + eyeDx;
      final ty = eyeY + h * 0.085 + tear * h * 0.05;
      canvas.drawCircle(
        Offset(tx, ty),
        w * 0.022 * tear,
        Paint()..color = ink.withValues(alpha: 0.55 * tear),
      );
    }
  }

  @override
  bool shouldRepaint(MoodFacePainter old) =>
      old.mood != mood || old.blink != blink || old.ink != ink;
}
