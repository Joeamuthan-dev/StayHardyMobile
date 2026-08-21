import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';

/// The moment a goal is achieved.
///
/// A full-screen beat: confetti burst, the trophy, the goal's name, one button.
/// Reaching a goal is the rarest event in the app — rarer than any streak — and
/// it was previously acknowledged by a row moving to an "Achieved" list, which
/// is bookkeeping, not an ending.
///
/// The confetti is painted, not a package: ~40 particles on physics-free arcs
/// for two seconds, which is all the moment needs and keeps the APK free of a
/// dependency used once.
class GoalCelebration extends StatefulWidget {
  const GoalCelebration({super.key, required this.goalName});

  final String goalName;

  static Future<void> show(BuildContext context, String goalName) {
    return Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.transparent,
        pageBuilder: (_, _, _) => GoalCelebration(goalName: goalName),
        transitionsBuilder: (_, animation, _, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  State<GoalCelebration> createState() => _GoalCelebrationState();
}

class _GoalCelebrationState extends State<GoalCelebration>
    with SingleTickerProviderStateMixin {
  late final AnimationController _run;

  @override
  void initState() {
    super.initState();
    _run = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..forward();
    unawaited(HapticFeedback.heavyImpact().catchError((_) {}));
  }

  @override
  void dispose() {
    _run.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: t.bg.withValues(alpha: 0.96),
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(
              child: AnimatedBuilder(
                animation: _run,
                builder: (context, _) => CustomPaint(
                  painter: _ConfettiPainter(
                    progress: _run.value,
                    palette: [
                      t.accent,
                      t.accentAlt,
                      t.success,
                      t.warn,
                      t.secondary,
                    ],
                  ),
                ),
              ),
            ),
            Center(
              child: Padding(
                padding: const EdgeInsets.all(Space.lg),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: 1),
                      duration: Motion.slow,
                      curve: Curves.elasticOut,
                      builder: (context, v, child) =>
                          Transform.scale(scale: v, child: child),
                      child: Container(
                        width: 110,
                        height: 110,
                        decoration: BoxDecoration(
                          gradient: Grad.brand(t),
                          shape: BoxShape.circle,
                          boxShadow: Shadows.glow(t.accent),
                        ),
                        child: Icon(Icons.emoji_events_rounded,
                            size: 54, color: t.onAccent),
                      ),
                    ),
                    const SizedBox(height: Space.xl),
                    Text('Goal achieved',
                        style: text.labelLarge?.copyWith(color: t.accent)),
                    const SizedBox(height: Space.sm),
                    Text(
                      widget.goalName,
                      textAlign: TextAlign.center,
                      style: AuraType.numeral(30, color: t.textPrimary,
                          weight: 700),
                    ),
                    const SizedBox(height: Space.sm),
                    Text(
                      'Set it, worked it, finished it. That is the whole arc.',
                      textAlign: TextAlign.center,
                      style: text.bodyMedium?.copyWith(color: t.textSecondary),
                    ),
                    const SizedBox(height: Space.xxl),
                    AppButton.primary(
                      label: 'KEEP GOING',
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter({required this.progress, required this.palette});

  final double progress;
  final List<Color> palette;

  static const _count = 42;

  @override
  void paint(Canvas canvas, Size size) {
    if (progress <= 0) return;

    for (var i = 0; i < _count; i++) {
      // Deterministic per-particle parameters — a random source would reshuffle
      // the burst on every frame.
      final seed = (i * 2654435761) % 1000 / 1000;
      final angle = (i / _count) * math.pi * 2 + seed;
      final speed = 0.35 + seed * 0.65;

      // Fired from the upper centre, arcing outward and falling.
      final t = progress;
      final x = size.width / 2 +
          math.cos(angle) * speed * size.width * 0.55 * t;
      final y = size.height * 0.32 +
          math.sin(angle) * speed * size.height * 0.25 * t +
          size.height * 0.55 * t * t; // gravity

      final fade = (1 - t).clamp(0.0, 1.0);
      if (fade <= 0) continue;

      final paint = Paint()
        ..color = palette[i % palette.length].withValues(alpha: fade);

      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(angle + t * 6 * (seed - 0.5));
      // Mixed shapes read as confetti; uniform circles read as bubbles.
      if (i.isEven) {
        canvas.drawRect(
            Rect.fromCenter(center: Offset.zero, width: 7, height: 4), paint);
      } else {
        canvas.drawCircle(Offset.zero, 3, paint);
      }
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_ConfettiPainter old) => old.progress != progress;
}
