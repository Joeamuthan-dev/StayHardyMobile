import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../data/stats_repository.dart';
import '../../domain/consistency_trend.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/surface_card.dart';
import '../../ui/zone_colour.dart';

/// The onboarding argument, made with the user's own days.
///
/// Two series over the selected range: what they actually did each day, and the
/// 7-day average underneath it. The point is visible on a bad day — the faint
/// line drops to the floor while the thick one barely moves — which is the one
/// moment a habit tracker can genuinely change how somebody feels.
///
/// The line is coloured by height, so the shape carries its own verdict before
/// a single word is read. The bands come from the theme's own tokens rather
/// than fixed hex, which is what keeps light mode honest.
///
/// Range follows the page's existing selector, so free members see 30 days and
/// Pro up to a year. No separate gate here: two places deciding what a free
/// member may see is how they end up disagreeing.
class ConsistencyChartCard extends ConsumerStatefulWidget {
  const ConsistencyChartCard({
    super.key,
    required this.range,
    required this.stats,
  });

  final StatsRange range;

  /// The page's own totals. Passed in rather than re-watched so the headline
  /// number here can never disagree with the number the page computed.
  final StatsView stats;

  @override
  ConsumerState<ConsistencyChartCard> createState() =>
      _ConsistencyChartCardState();
}

class _ConsistencyChartCardState extends ConsumerState<ConsistencyChartCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _draw = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  );

  /// The curve has been drawn at least once for the data currently loaded.
  ///
  /// The animation cannot start in initState: the tallies arrive from a stream
  /// a frame or two later, so the controller would run — and often finish —
  /// while the card was still an empty box, and the curve would simply appear.
  /// It starts when there is actually something to draw.
  bool _started = false;

  /// The day the user is inspecting, or null for "none". Tapping the chart is
  /// the only way this becomes non-null — nothing is selected by default,
  /// because a tooltip nobody asked for is just an obstruction.
  int? _picked;

  @override
  void didUpdateWidget(covariant ConsistencyChartCard old) {
    super.didUpdateWidget(old);
    // A new range is a new chart, not a re-scale of the old one.
    if (old.range != widget.range) {
      _picked = null;
      _replay();
    }
  }

  void _replay() {
    if (!mounted) return;
    _draw.forward(from: 0);
  }

  @override
  void dispose() {
    _draw.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final tallies = ref.watch(habitActivityProvider(widget.range.days)).value;

    // Progress and Insights live in an IndexedStack, so coming back from
    // Insights rebuilds nothing and the curve would sit there already drawn.
    // Returning to the tab is exactly when the animation is worth having.
    ref.listen<int>(statsTabProvider, (was, now) {
      if (now == 0 && was != 0) {
        _picked = null;
        _replay();
      }
    });

    if (tallies == null) return const SizedBox.shrink();

    if (!_started) {
      _started = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _replay());
    }
    final data = ConsistencyTrend.from(
      tallies,
      window: ConsistencyTrend.windowFor(widget.range.days),
    );

    // Too little history is worse than no chart: a beginner shown a jagged
    // 4-day line reads it as evidence they are already failing.
    if (!data.hasEnoughData) {
      return SurfaceCard(
        padding: const EdgeInsets.all(Space.lg),
        child: Row(
          children: [
            Icon(Icons.show_chart_rounded,
                size: Dimens.iconMd, color: t.textMuted),
            const SizedBox(width: Space.md),
            Expanded(
              child: Text(
                'Your consistency curve appears after '
                '${ConsistencyTrend.minDaysToShow} days of tracking — '
                '${data.observedDays} so far.',
                style: text.bodySmall?.copyWith(color: t.textMuted),
              ),
            ),
          ],
        ),
      );
    }

    final stats = widget.stats;
    final overall = stats.habitRate / 100;
    final now = data.latestTrend;
    final change = data.change;
    // The headline names itself "overall", so the band it is painted in must
    // be the overall figure's band — not the curve's last point, which is a
    // different number answering a different question.
    final zone = ConsistencyZone.of(overall);

    return SurfaceCard(
      padding: const EdgeInsets.all(Space.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text('YOUR CONSISTENCY',
                            style:
                                text.labelLarge?.copyWith(color: t.textMuted)),
                        const SizedBox(width: 6),
                        Tooltip(
                          triggerMode: TooltipTriggerMode.tap,
                          margin: const EdgeInsets.symmetric(
                              horizontal: Space.lg),
                          message:
                              'Each day = habits done ÷ habits due that day.\n'
                              'The curve is the ${data.windowLabel} of that.\n'
                              'Rest days are skipped, not counted as zero.\n\n'
                              'Locked in 80–100%   ·   Steady 50–79%\n'
                              'Slipping 20–49%   ·   Down 0–19%',
                          child: Icon(Icons.info_outline_rounded,
                              size: 13, color: t.textMuted),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('${stats.habitRate}%',
                            style: AuraType.numeral(32,
                                color: zoneColour(zone, t))),
                        const SizedBox(width: Space.sm),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 5),
                          child: _ZonePill(zone: zone),
                        ),
                      ],
                    ),
                    Text(
                      now == null
                          ? 'Overall · last ${widget.range.days} days'
                          : 'Overall · ${data.windowLabel} now '
                              '${(now * 100).round()}%',
                      style: text.bodySmall?.copyWith(color: t.textSecondary),
                    ),
                  ],
                ),
              ),
              if (change != null && change.abs() >= 0.01)
                _Delta(change: change, window: data.window),
            ],
          ),
          const SizedBox(height: Space.lg),
          LayoutBuilder(
            builder: (context, c) => GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTapDown: (d) =>
                  _pick(d.localPosition.dx, c.maxWidth, data, toggle: true),
              onHorizontalDragUpdate: (d) =>
                  _pick(d.localPosition.dx, c.maxWidth, data),
              onHorizontalDragEnd: (_) => setState(() => _picked = null),
              child: SizedBox(
                height: 210,
                width: double.infinity,
                child: AnimatedBuilder(
                  animation: _draw,
                  builder: (context, _) => CustomPaint(
                    painter: _CurvePainter(
                      data: data,
                      progress: Curves.easeOutCubic.transform(_draw.value),
                      picked: _picked,
                      zones: [for (final z in ConsistencyZone.values)
                        zoneColour(z, t)],
                      ghost: t.textMuted,
                      grid: t.border,
                      axisText: t.textMuted,
                      tipBg: t.surfaceHigh,
                      tipBorder: t.borderStrong,
                      tipText: t.textPrimary,
                      tipMuted: t.textSecondary,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: Space.md),
          // The distinction that actually matters is which line is which.
          // The bands are reference material and are dimmed to match.
          Row(
            children: [
              _SeriesKey(
                // The real curve is a zone gradient, so the swatch is one too.
                colours: [
                  zoneColour(ConsistencyZone.slipping, t),
                  zoneColour(ConsistencyZone.steady, t),
                  zoneColour(ConsistencyZone.lockedIn, t),
                ],
                stroke: 3,
                label: 'Your trend',
                strong: true,
              ),
              if (data.showsDailyLine) ...[
                const SizedBox(width: Space.lg),
                _SeriesKey(
                  colours: [t.textMuted.withValues(alpha: 0.45)],
                  stroke: 1.2,
                  label: 'Daily consistency',
                  strong: false,
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (final z in ConsistencyZone.values) ...[
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: zoneColour(z, t).withValues(alpha: 0.75),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                Text(z.label,
                    style: TextStyle(
                        fontSize: 9.5,
                        color: t.textMuted.withValues(alpha: 0.75))),
                if (z != ConsistencyZone.values.last)
                  const SizedBox(width: 10),
              ],
            ],
          ),
          const SizedBox(height: Space.md),
          Divider(color: t.border, height: Dimens.hairline),
          const SizedBox(height: Space.md),
          Row(
            children: [
              _Metric(
                value: '${stats.currentStreak}',
                label: 'CURRENT',
                icon: Icons.local_fire_department_rounded,
                tint: stats.currentStreak > 0 ? t.warn : t.textMuted,
              ),
              _Metric(
                value: '${stats.bestStreak}',
                label: 'BEST STREAK',
                icon: Icons.emoji_events_outlined,
                tint: t.accent,
              ),
              _Metric(
                value: '${stats.totalCompletions}',
                label: 'CHECK-INS',
                icon: Icons.check_circle_outline_rounded,
                tint: t.success,
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          _CoachPanel(coach: data.coach),
        ],
      ),
    );
  }

  void _pick(
    double dx,
    double width,
    ConsistencyTrend d, {
    bool toggle = false,
  }) {
    const gutter = _CurvePainter.padLeft;
    final plot = width - gutter;
    if (plot <= 0 || d.days < 2) return;
    final i = (((dx - gutter) / plot) * (d.days - 1)).round();
    final clamped = i.clamp(0, d.days - 1);

    // Tapping the same day again puts the tooltip away. Without this there is
    // no gesture that dismisses it at all: one tap and it stands there for the
    // rest of the session, holding the Best/Low labels down with it.
    if (toggle && clamped == _picked) {
      setState(() => _picked = null);
      return;
    }
    if (clamped != _picked) setState(() => _picked = clamped);
  }


}

/// Small badge naming the band the current average sits in.
class _ZonePill extends StatelessWidget {
  const _ZonePill({required this.zone});

  final ConsistencyZone zone;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final c = zoneColour(zone, t);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(Radii.pill),
      ),
      child: Text(
        zone.label.toUpperCase(),
        style: TextStyle(
            fontSize: 10, fontWeight: FontWeight.w800, color: c, height: 1.2),
      ),
    );
  }
}

/// The coaching card.
///
/// Colour comes from the tone, never from the band: a person at 12% gets a
/// warm amber recovery panel, not the chart's red. Red on a chart reports a
/// fact; red on the sentence telling you to try again reads as an error
/// message about you.
class _CoachPanel extends StatelessWidget {
  const _CoachPanel({required this.coach});

  final CoachNote coach;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final c = switch (coach.tone) {
      CoachTone.improving => t.success,
      CoachTone.steady => t.accent,
      CoachTone.slipping => t.warn,
      CoachTone.recovering => Color.lerp(t.warn, t.accent, 0.25)!,
    };

    return Container(
      padding: const EdgeInsets.all(Space.md),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: c.withValues(alpha: 0.22)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: c.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(
              // Material glyphs, not "↗". The bundled Inter is a variable
              // font with no arrow coverage, and a tofu box in the one line
              // meant to encourage somebody is not a risk worth taking.
              coach.aim == CoachAim.hold
                  ? Icons.east_rounded
                  : Icons.north_east_rounded,
              size: 17,
              color: c,
            ),
          ),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  coach.headline,
                  style: text.bodyMedium?.copyWith(
                      color: c, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 3),
                Text(
                  coach.body,
                  style: text.bodySmall?.copyWith(
                      color: t.textSecondary, height: 1.35),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Which line is which — the distinction the card leans on hardest.
///
/// The swatches are painted from the same colours and stroke widths the chart
/// uses, so the key is a sample of the line rather than a symbol standing in
/// for it. An earlier version drew a white bar and a dashed bar; neither line
/// on the chart was white or dashed, which quietly taught the reader the wrong
/// thing about their own data.
class _SeriesKey extends StatelessWidget {
  const _SeriesKey({
    required this.colours,
    required this.stroke,
    required this.label,
    required this.strong,
  });

  /// One colour paints a solid sample; several paint the gradient.
  final List<Color> colours;
  final double stroke;
  final String label;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // A decorated box, not a CustomPaint. A raw ui.Gradient shader in a
        // 20x8 canvas was enough to abort the whole layer's paint under
        // Impeller, taking the legend, the totals and the coaching panel down
        // with it while leaving their layout space behind. A gradient
        // decoration is the same picture through a path the engine is happy
        // with.
        Container(
          width: 20,
          height: stroke,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(stroke),
            color: colours.length == 1 ? colours.first : null,
            gradient: colours.length == 1
                ? null
                : LinearGradient(colors: colours),
          ),
        ),
        const SizedBox(width: 7),
        Text(label,
            style: TextStyle(
              fontSize: 11,
              color: strong ? t.textSecondary : t.textMuted,
              fontWeight: strong ? FontWeight.w700 : FontWeight.w500,
            )),
      ],
    );
  }
}

class _Delta extends StatelessWidget {
  const _Delta({required this.change, required this.window});

  final double change;

  /// "-18 pts" begs the question "against what?". The window answers it.
  final int window;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final up = change > 0;
    final colour = up ? t.success : t.warn;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: colour.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(Radii.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(up ? Icons.trending_up_rounded : Icons.trending_down_rounded,
              size: 14, color: colour),
          const SizedBox(width: 4),
          Text(
            '${(change * 100).round().abs()} pts',
            style: TextStyle(
                fontSize: 11.5, fontWeight: FontWeight.w800, color: colour),
          ),
          const SizedBox(width: 4),
          Text(
            'vs last ${window}d',
            style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: colour.withValues(alpha: 0.75)),
          ),
        ],
      ),
    );
  }
}

class _CurvePainter extends CustomPainter {
  const _CurvePainter({
    required this.data,
    required this.progress,
    required this.picked,
    required this.zones,
    required this.ghost,
    required this.grid,
    required this.axisText,
    required this.tipBg,
    required this.tipBorder,
    required this.tipText,
    required this.tipMuted,
  });

  final ConsistencyTrend data;
  final double progress;
  final int? picked;

  /// Band colours, highest band first — same order as [ConsistencyZone.values].
  final List<Color> zones;
  final Color ghost;
  final Color grid;
  final Color axisText;
  final Color tipBg;
  final Color tipBorder;
  final Color tipText;
  final Color tipMuted;

  static const padLeft = 30.0;
  static const padTop = 30.0;
  static const padBottom = 18.0;

  Rect _plot(Size size) =>
      Rect.fromLTRB(padLeft, padTop, size.width, size.height - padBottom);

  Offset _at(int i, double v, Rect plot) => Offset(
        data.days == 1
            ? plot.center.dx
            : plot.left + i / (data.days - 1) * plot.width,
        plot.bottom - v * plot.height,
      );

  /// Runs of consecutive readings, so rest days become gaps rather than being
  /// drawn through at zero.
  List<List<Offset>> _runs(List<double?> series, Rect plot) {
    final runs = <List<Offset>>[];
    var current = <Offset>[];
    for (var i = 0; i < series.length; i++) {
      final v = series[i];
      if (v == null) {
        if (current.length > 1) runs.add(current);
        current = [];
        continue;
      }
      current.add(_at(i, v, plot));
    }
    if (current.length > 1) runs.add(current);
    return runs;
  }

  /// Catmull–Rom, same as the onboarding chart — no hard corners anywhere in
  /// the app's charting language.
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

  /// The band ramp as a vertical shader.
  ///
  /// Height *is* value here, so one vertical gradient colours every point of
  /// the line by its own reading — no per-segment splitting, and the blend
  /// between bands stays smooth instead of stepping.
  ui.Gradient _ramp(Rect plot, List<double> alphas) => ui.Gradient.linear(
        Offset(0, plot.top),
        Offset(0, plot.bottom),
        [
          zones[0].withValues(alpha: alphas[0]),
          zones[0].withValues(alpha: alphas[0]),
          zones[1].withValues(alpha: alphas[1]),
          zones[2].withValues(alpha: alphas[2]),
          zones[3].withValues(alpha: alphas[3]),
          zones[3].withValues(alpha: alphas[3]),
        ],
        const [0.0, 0.10, 0.35, 0.65, 0.90, 1.0],
      );

  /// Draw only the leading `progress` fraction of a path.
  static Path _reveal(Path p, double f) {
    if (f >= 1) return p;
    final out = Path();
    for (final m in p.computeMetrics()) {
      out.addPath(m.extractPath(0, m.length * f), Offset.zero);
    }
    return out;
  }

  void _label(Canvas canvas, String s, Offset at, Color c, double size,
      {TextAlign align = TextAlign.left, FontWeight w = FontWeight.w600}) {
    final tp = TextPainter(
      text: TextSpan(
          text: s,
          style: TextStyle(fontSize: size, color: c, fontWeight: w)),
      textDirection: TextDirection.ltr,
      textAlign: align,
    )..layout();
    final dx = switch (align) {
      TextAlign.center => at.dx - tp.width / 2,
      TextAlign.right => at.dx - tp.width,
      _ => at.dx,
    };
    tp.paint(canvas, Offset(dx, at.dy));
  }

  @override
  void paint(Canvas canvas, Size size) {
    final plot = _plot(size);
    if (plot.width <= 0 || plot.height <= 0) return;

    _grid(canvas, plot);
    _xAxis(canvas, plot);

    // A spline through a sharp peak overshoots its own control points, which
    // on a 0–100% axis paints a value that cannot exist. Clip to the plot so
    // the curve can bulge toward 100 but never above it.
    canvas.save();
    canvas.clipRect(plot.inflate(1));

    // Day to day: faint, behind everything. It is context, not the headline —
    // and keeping it colourless is what lets the coloured curve read instantly.
    //
    // Dropped entirely past a quarter. Three hundred daily readings across a
    // phone's width is not a line, it is a picket fence, and it buries the one
    // curve the card exists to show.
    for (final run in data.showsDailyLine
        ? _runs(data.daily, plot)
        : const <List<Offset>>[]) {
      canvas.drawPath(
        _reveal(_spline(run), progress),
        Paint()
          ..color = ghost.withValues(alpha: 0.30)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.2
          ..strokeCap = StrokeCap.round,
      );
    }

    for (final run in _runs(data.trend, plot)) {
      final line = _spline(run);
      final shown = _reveal(line, progress);

      final area = Path.from(shown)
        ..lineTo(shown.getBounds().right, plot.bottom)
        ..lineTo(run.first.dx, plot.bottom)
        ..close();
      canvas.drawPath(
        area,
        Paint()..shader = _ramp(plot, const [0.30, 0.20, 0.12, 0.07]),
      );

      canvas.drawPath(
        shown,
        Paint()
          ..shader = _ramp(plot, const [0.34, 0.30, 0.26, 0.24])
          ..style = PaintingStyle.stroke
          ..strokeWidth = 8
          ..strokeCap = StrokeCap.round
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 7),
      );
      canvas.drawPath(
        shown,
        Paint()
          ..shader = _ramp(plot, const [1, 1, 1, 1])
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round,
      );
    }

    canvas.restore();

    // The markers settle in over the last quarter of the draw rather than
    // snapping on at the end — the line arrives, then the labels catch up.
    final settle = ((progress - 0.72) / 0.28).clamp(0.0, 1.0);
    if (settle > 0) {
      _moments(canvas, plot, settle);
      _tooltip(canvas, plot, size);
    }
  }

  void _grid(Canvas canvas, Rect plot) {
    for (final frac in const [0.0, 0.25, 0.5, 0.75, 1.0]) {
      final y = plot.bottom - plot.height * frac;
      final solid = frac == 0.0;
      final paint = Paint()
        ..color = grid.withValues(alpha: solid ? 1 : 0.55)
        ..strokeWidth = 1;
      if (solid) {
        canvas.drawLine(Offset(plot.left, y), Offset(plot.right, y), paint);
      } else {
        for (var x = plot.left; x < plot.right; x += 6) {
          canvas.drawLine(
              Offset(x, y), Offset((x + 3).clamp(0, plot.right), y), paint);
        }
      }
      _label(canvas, '${(frac * 100).round()}',
          Offset(padLeft - 6, y - 5), axisText, 9, align: TextAlign.right);
    }
  }

  void _xAxis(Canvas canvas, Rect plot) {
    final n = data.dates.length;
    if (n < 2) return;
    // A year is read in months; a month is read in dates. Four labels is the
    // most a 360dp phone fits without them colliding.
    final byMonth = data.days > 120;
    const slots = 4;
    for (var s = 0; s < slots; s++) {
      final i = (s / (slots - 1) * (n - 1)).round();
      final d = data.dates[i];
      final txt = byMonth ? _month(d.month) : '${d.day} ${_month(d.month)}';
      final align = s == 0
          ? TextAlign.left
          : (s == slots - 1 ? TextAlign.right : TextAlign.center);
      _label(canvas, txt, Offset(_at(i, 0, plot).dx, plot.bottom + 5),
          axisText, 9, align: align, w: FontWeight.w500);
    }
  }

  /// The handful of points worth naming, drawn without letting them collide.
  ///
  /// Labels are placed in order of importance and a later one is simply not
  /// drawn if its box would touch a box already on the canvas. Silently
  /// dropping a marker is far better than shipping two overlapping ones — the
  /// chart has to stay readable at 360dp, which is most of the install base.
  void _moments(Canvas canvas, Rect plot, double settle) {
    final taken = <Rect>[];

    // While a point is being inspected, the tooltip is the thing being read.
    // Leaving the standing labels up guarantees one of them ends up underneath
    // it, half-covered and unreadable — so they stand down and let it work.
    final quiet = picked != null;

    for (final m in data.moments) {
      final p = _at(m.index, m.value, plot);
      final c = zones[ConsistencyZone.values.indexOf(ConsistencyZone.of(m.value))];
      final isNow = m.kind == MomentKind.current;

      // Dots overshoot very slightly then settle, so they read as landing on
      // the line rather than being stamped onto it.
      final pop = settle < 1 ? 1 + 0.35 * (1 - settle) : 1.0;
      canvas.drawCircle(p, (isNow ? 8 : 6) * pop,
          Paint()..color = c.withValues(alpha: 0.20 * settle));
      if (isNow) {
        canvas.drawCircle(
            p, 4 * pop, Paint()..color = c.withValues(alpha: settle));
      } else {
        canvas.drawCircle(p, 3.6 * pop,
            Paint()..color = tipBg.withValues(alpha: settle));
        canvas.drawCircle(
          p,
          3.6 * pop,
          Paint()
            ..color = c.withValues(alpha: settle)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1.8,
        );
      }

      final tp = TextPainter(
        text: TextSpan(children: [
          TextSpan(
            text: '${(m.value * 100).round()}%',
            style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                color: c.withValues(alpha: settle)),
          ),
          TextSpan(
            text: '  ${m.caption}',
            style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: c.withValues(alpha: 0.75 * settle)),
          ),
        ]),
        textDirection: TextDirection.ltr,
      )..layout();

      // Above the point by default; below it when the point is near the
      // ceiling and the label would be clipped out of the plot.
      if (quiet) continue;

      const padX = 6.0;
      const padY = 3.0;
      final w = tp.width + padX * 2;
      final h = tp.height + padY * 2;

      // Above the point by default; below when it would be clipped at the
      // ceiling. The final point hangs its label to the left, because there is
      // no canvas to its right to hang it in.
      final above = p.dy - h - 8 >= plot.top - padTop;
      final top = above ? p.dy - h - 8 : p.dy + 9;
      final left = m.kind == MomentKind.current
          ? p.dx - w - 8
          : (p.dx - w / 2).clamp(plot.left, plot.right - w);
      final box = Rect.fromLTWH(left.clamp(plot.left, plot.right - w),
          top, w, h);

      if (taken.any((r) => r.inflate(4).overlaps(box))) continue;
      taken.add(box);

      // A label sitting directly on the curve is unreadable. The chip is the
      // cheapest way to guarantee contrast without dimming the chart itself.
      final r = RRect.fromRectAndRadius(box, const Radius.circular(6));
      canvas.drawRRect(
          r, Paint()..color = tipBg.withValues(alpha: 0.92 * settle));
      canvas.drawRRect(
        r,
        Paint()
          ..color = c.withValues(alpha: 0.45 * settle)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1,
      );
      tp.paint(canvas, Offset(box.left + padX, box.top + padY));
    }
  }

  void _tooltip(Canvas canvas, Rect plot, Size size) {
    final i = picked;
    if (i == null || i >= data.dates.length) return;
    final day = data.daily[i];
    final d = data.dates[i];

    final x = _at(i, 0, plot).dx;
    canvas.drawLine(
      Offset(x, plot.top),
      Offset(x, plot.bottom),
      Paint()
        ..color = axisText.withValues(alpha: 0.35)
        ..strokeWidth = 1,
    );

    if (day != null) {
      canvas.drawCircle(_at(i, day, plot), 3, Paint()..color = ghost);
    }
    final tv = data.trend[i];
    if (tv != null) {
      final c = zones[ConsistencyZone.values.indexOf(ConsistencyZone.of(tv))];
      canvas.drawCircle(_at(i, tv, plot), 4.5, Paint()..color = c);
    }

    final head = '${d.day} ${_month(d.month)}';
    final done = data.completed[i];
    final due = data.scheduled[i];
    final body = day == null
        ? 'Rest day — nothing was due'
        : '${(day * 100).round()}% · $done of $due habit'
            '${due == 1 ? '' : 's'} done';
    final sub = tv == null
        ? null
        : '${data.windowLabel} ${(tv * 100).round()}%';

    final tp = TextPainter(
      text: TextSpan(children: [
        TextSpan(
            text: '$head\n',
            style: TextStyle(
                fontSize: 10.5, fontWeight: FontWeight.w800, color: tipText)),
        TextSpan(
            text: body,
            style: TextStyle(fontSize: 10, color: tipMuted)),
        if (sub != null)
          TextSpan(
              text: '\n$sub',
              style: TextStyle(
                  fontSize: 9.5, color: tipMuted.withValues(alpha: 0.75))),
      ]),
      textDirection: TextDirection.ltr,
    )..layout();

    const pad = 7.0;
    final w = tp.width + pad * 2;
    final left = (x - w / 2).clamp(plot.left, size.width - w);
    final box = Rect.fromLTWH(left, plot.top, w, tp.height + pad * 2);
    final r = RRect.fromRectAndRadius(box, const Radius.circular(7));
    canvas.drawRRect(r, Paint()..color = tipBg);
    canvas.drawRRect(
      r,
      Paint()
        ..color = tipBorder
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );
    tp.paint(canvas, Offset(box.left + pad, box.top + pad));
  }

  static String _month(int m) => const [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ][m - 1];

  @override
  bool shouldRepaint(_CurvePainter old) =>
      old.progress != progress ||
      old.picked != picked ||
      !identical(old.data, data);
}

/// One of the three totals the old hero ring used to carry.
class _Metric extends StatelessWidget {
  const _Metric({
    required this.value,
    required this.label,
    required this.icon,
    required this.tint,
  });

  final String value;
  final String label;
  final IconData icon;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: Dimens.iconSm, color: tint),
          const SizedBox(height: 7),
          Text(value, style: AuraType.numeral(19, color: t.textSecondary)),
          const SizedBox(height: 3),
          Text(label,
              style: Theme.of(context).textTheme.labelMedium,
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
