import 'package:flutter/material.dart';

import '../theme/aura_tokens.dart';

/// The Google Drive mark, drawn rather than bundled.
///
/// Material's `Icons.add_to_drive` is a monochrome glyph of a *folder*, which
/// is why the backup rows never read as "Google Drive" at a glance. This is the
/// real trilateral in Google's own colours, drawn as three polygons — no asset
/// to ship, no licence file, and it stays crisp at every size.
///
/// [muted] renders it in the surrounding text colour instead, for the off
/// state: a full-colour brand mark next to a switch that is off looks like the
/// feature is running.
class DriveMark extends StatelessWidget {
  const DriveMark({super.key, this.muted = false});

  final bool muted;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DrivePainter(
        muted ? IconTheme.of(context).color?.withValues(alpha: 0.55) : null,
      ),
    );
  }
}

class _DrivePainter extends CustomPainter {
  const _DrivePainter(this.flat);

  /// When set, every face is painted this one colour.
  final Color? flat;

  // Official proportions, in a 87.3 x 78 box.
  static const _w = 87.3;
  static const _h = 78.0;

  static const _green = AuraTokens.driveGreen;
  static const _yellow = AuraTokens.driveYellow;
  static const _blue = AuraTokens.driveBlue;

  @override
  void paint(Canvas canvas, Size size) {
    // Fit the box while keeping the mark square-centred.
    final scale = size.shortestSide / _w;
    final dx = (size.width - _w * scale) / 2;
    final dy = (size.height - _h * scale) / 2;

    Path poly(List<Offset> points) {
      final path = Path()
        ..moveTo(dx + points.first.dx * scale, dy + points.first.dy * scale);
      for (final p in points.skip(1)) {
        path.lineTo(dx + p.dx * scale, dy + p.dy * scale);
      }
      return path..close();
    }

    void face(List<Offset> points, Color colour) {
      canvas.drawPath(
        poly(points),
        Paint()
          ..color = flat ?? colour
          ..isAntiAlias = true,
      );
    }

    // Left arm, top vertex down to the bottom-left corner.
    face(const [
      Offset(29.6, 0),
      Offset(43.65, 24.3),
      Offset(14.05, 75.6),
      Offset(0, 51.3),
    ], _green);

    // Right arm.
    face(const [
      Offset(29.6, 0),
      Offset(57.7, 0),
      Offset(87.3, 51.3),
      Offset(59.2, 51.3),
    ], _yellow);

    // The band across the base.
    face(const [
      Offset(28.05, 51.3),
      Offset(87.3, 51.3),
      Offset(73.3, 75.6),
      Offset(14.05, 75.6),
    ], _blue);
  }

  @override
  bool shouldRepaint(_DrivePainter oldDelegate) => oldDelegate.flat != flat;
}
