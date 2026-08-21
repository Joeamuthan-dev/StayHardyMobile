import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../domain/badge_catalogue.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';

/// A badge, drawn rather than shipped as artwork.
///
/// Fifteen PNGs at three densities is 45 assets to keep in step with a palette
/// that can be swapped at runtime — and they would all be wrong in light mode.
/// Drawing from theme tokens means a badge is correct in both themes for free,
/// scales to any size, and adds nothing to the APK.
class BadgeMedal extends StatelessWidget {
  const BadgeMedal({
    super.key,
    required this.def,
    required this.earned,
    this.size = 72,
  });

  final BadgeDef def;

  /// Locked badges are shown, not hidden. A ladder you cannot see the top of
  /// gives you nothing to climb toward.
  final bool earned;

  final double size;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final ink = earned ? t.accent : t.textMuted;

    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _MedalPainter(
          ink: ink,
          fill: earned
              ? t.accent.withValues(alpha: Alphas.tint)
              : Colors.transparent,
          border: earned ? t.accent : t.border,
          earned: earned,
        ),
        child: Center(
          child: Text(
            _label,
            textAlign: TextAlign.center,
            style: AuraType.numeral(size * 0.3, color: ink),
          ),
        ),
      ),
    );
  }

  /// The threshold itself, which is the only thing that has to be legible at
  /// this size. '100' says more than an icon of a flame would.
  String get _label => switch (def.metric) {
        BadgeMetric.bestStreak => '${def.threshold}',
        BadgeMetric.totalCheckIns => def.threshold >= 1000
            ? '${def.threshold ~/ 1000}K'
            : '${def.threshold}',
        BadgeMetric.focusMinutes => '${def.threshold ~/ 60}h',
        BadgeMetric.perfectWeeks => '${def.threshold}w',
      };
}

class _MedalPainter extends CustomPainter {
  const _MedalPainter({
    required this.ink,
    required this.fill,
    required this.border,
    required this.earned,
  });

  final Color ink;
  final Color fill;
  final Color border;
  final bool earned;

  @override
  void paint(Canvas canvas, Size size) {
    final centre = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 1;

    // A hexagon rather than a circle: the app is otherwise entirely rings and
    // hairlines, and a badge needs to read as a different kind of object.
    final path = Path();
    for (var i = 0; i < 6; i++) {
      // Start at -90 degrees so the shape sits on a flat edge, not a point.
      final angle = (i * 60 - 90) * math.pi / 180;
      final p = centre + Offset(radius * math.cos(angle), radius * math.sin(angle));
      if (i == 0) {
        path.moveTo(p.dx, p.dy);
      } else {
        path.lineTo(p.dx, p.dy);
      }
    }
    path.close();

    canvas.drawPath(path, Paint()..color = fill);
    canvas.drawPath(
      path,
      Paint()
        ..color = border
        ..style = PaintingStyle.stroke
        ..strokeWidth = earned ? Dimens.border : Dimens.hairline,
    );
  }

  @override
  bool shouldRepaint(_MedalPainter old) =>
      old.ink != ink || old.fill != fill || old.earned != earned;
}
