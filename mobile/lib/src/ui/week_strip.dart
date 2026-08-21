import 'package:flutter/material.dart';

import '../data/habit_repository.dart';
import '../domain/civil_date.dart';
import '../theme/aura_tokens.dart';
import '../theme/aura_typography.dart';

/// One day in [WeekStrip].
class WeekDay {
  const WeekDay({
    required this.date,
    required this.scheduled,
    required this.completed,
  });

  final CivilDate date;
  final int scheduled;
  final int completed;

  bool get isRest => scheduled == 0;
  bool get isPerfect => scheduled > 0 && completed >= scheduled;
  double get fraction =>
      scheduled == 0 ? 0 : (completed / scheduled).clamp(0.0, 1.0);
}

/// The week at a glance: seven dated rings across the top of a screen.
///
/// This is the single most legible thing a habit tracker can show, and the app
/// did not have it — consistency lived only in a 90-day heatmap two taps away,
/// which answers "how is the quarter going" and never "how is *this week*
/// going". Every reference tracker leads with this and they are right to.
///
/// Each ring fills by that day's completion. Today gets a filled accent ring;
/// the future is drawn but empty, because seeing the days you still have left
/// is the point.
class WeekStrip extends StatelessWidget {
  const WeekStrip({
    super.key,
    required this.days,
    required this.today,
    this.onTap,
  });

  /// Seven entries, oldest first.
  final List<WeekDay> days;
  final CivilDate today;
  final ValueChanged<CivilDate>? onTap;

  @override
  Widget build(BuildContext context) {
    const initials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        for (var i = 0; i < days.length; i++)
          _DayCell(
            initial: initials[days[i].date.dow],
            day: days[i],
            index: i,
            isToday: days[i].date.iso == today.iso,
            isFuture: today.isBefore(days[i].date),
            onTap: onTap == null ? null : () => onTap!(days[i].date),
          ),
      ],
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.initial,
    required this.day,
    required this.index,
    required this.isToday,
    required this.isFuture,
    required this.onTap,
  });

  final String initial;
  final WeekDay day;

  /// Position in the week, for the staggered entrance sweep.
  final int index;

  final bool isToday;
  final bool isFuture;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    // Deep green for a day fully kept, lighter the less of it was; lime for a
    // day barely started. The same ramp the calendar and the consistency grid
    // use, so "how green" means the same thing on every screen.
    final ring = isFuture || day.isRest
        ? t.borderStrong
        : switch (day.fraction) {
            >= 1.0 => t.heat.last,
            >= 0.67 => t.heat[3],
            >= 0.34 => t.heat[2],
            > 0.0 => t.accent,
            _ => t.borderStrong,
          };

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Column(
        children: [
          Text(
            initial,
            style: text.labelMedium?.copyWith(
              color: isToday ? t.textPrimary : t.textMuted,
            ),
          ),
          const SizedBox(height: 7),
          SizedBox(
            width: 36,
            height: 36,
            // The rings sweep themselves full on arrival, left to right —
            // the page opening feels like the week being drawn, and because
            // tabs build fresh it plays on every visit.
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: isFuture ? 0 : day.fraction),
              duration: Duration(milliseconds: 500 + index * 110),
              curve: Motion.emphasised,
              builder: (context, animated, child) => CustomPaint(
              painter: _DayRingPainter(
                fraction: animated,
                ring: ring,
                track: t.surfaceAlt,
                // Today is filled rather than outlined — an outline-only
                // "today" is invisible on a row of seven outlines. Filled in
                // its own progress colour, so a completed today is a deep
                // green disc and an untouched one is still obviously today.
                fill: isToday
                    ? (day.fraction > 0 ? ring : t.accent)
                    : null,
              ),
              child: Center(
                child: Text(
                  '${day.date.day}',
                  style: AuraType.numeral(
                    13,
                    // Today's disc can be any colour on the progress ramp, so
                    // its numeral derives from that fill's luminance.
                    color: isToday
                        ? t.onFill(day.fraction > 0 ? ring : t.accent)
                        : (isFuture ? t.textMuted : t.textSecondary),
                    weight: isToday ? 700 : 550,
                  ),
                ),
              ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DayRingPainter extends CustomPainter {
  _DayRingPainter({
    required this.fraction,
    required this.ring,
    required this.track,
    required this.fill,
  });

  final double fraction;
  final Color ring;
  final Color track;
  final Color? fill;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 2.5;
    final center = (Offset.zero & size).center;
    final radius = (size.shortestSide - stroke) / 2;

    if (fill != null) {
      canvas.drawCircle(center, radius, Paint()..color = fill!);
      return;
    }

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = track
        ..strokeWidth = stroke
        ..style = PaintingStyle.stroke,
    );

    if (fraction <= 0) return;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -1.5707963,
      6.2831853 * fraction,
      false,
      Paint()
        ..color = ring
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke,
    );
  }

  @override
  bool shouldRepaint(_DayRingPainter old) =>
      old.fraction != fraction || old.ring != ring || old.fill != fill;
}

/// A habit's own last seven days, as a row of small marks.
///
/// Goes on every habit row. A streak number says "9"; this says *which* days,
/// which is the thing that shows someone their Thursdays are the problem. The
/// number alone has never done that.
class HabitTrail extends StatelessWidget {
  const HabitTrail({super.key, required this.trail, this.size = 7});

  /// Oldest first, ending today. Usually seven entries.
  final List<DayMark> trail;
  final double size;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final mark in trail)
          Padding(
            padding: const EdgeInsets.only(right: 4),
            child: _mark(t, mark),
          ),
      ],
    );
  }

  /// One dot.
  ///
  /// Deep green kept, blue saved, faint red missed — the same colours the
  /// habit's own history grid and the calendar use, so a person does not have
  /// to learn three legends for the same three facts.
  Widget _mark(AuraTokens t, DayMark mark) {
    final (color, filled) = switch (mark) {
      DayMark.done => (t.heat.last, true),
      DayMark.frozen => (t.secondary, true),
      DayMark.missed => (t.danger.withValues(alpha: 0.55), false),
      // Today, not yet done. Neutral — never a miss.
      DayMark.pending => (t.textMuted, false),
      DayMark.notDue => (t.borderStrong, false),
    };

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: filled ? color : null,
        border: filled ? null : Border.all(color: color, width: 1.2),
        shape: BoxShape.circle,
      ),
    );
  }
}
