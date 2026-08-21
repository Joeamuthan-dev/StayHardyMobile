import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../data/focus_repository.dart';
import '../../data/stats_repository.dart';
import '../../domain/civil_date.dart';
import '../../domain/mood_rules.dart';
import '../../domain/streak_engine.dart';
import '../../theme/habit_categories.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/mood_palette.dart';
import '../../theme/aura_typography.dart';
import '../../ui/charts.dart';
import '../../ui/mood_face.dart';

import '../../ui/segmented_tabs.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import 'consistency_chart_card.dart';
import '../focus/focus_screen.dart';
import '../insights/weekly_review_screen.dart';
import '../mood/mood_check_in.dart';
import '../paywall/paywall_screen.dart';
import '../settings/settings_screen.dart';
import '../shared/section_header.dart';
import 'insights_tab.dart';

/// Everything measured, in two views.
///
/// * **Progress** — consistency, streaks, where the work goes.
/// * **Insights** — what your phone says about your time, and what to do about
///   it. Screen time and the advisor were separate tabs; they are one subject
///   ("what does my data say about me") and splitting them meant the advice sat
///   away from the numbers it was describing.
class StatsScreen extends ConsumerWidget {
  const StatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref.watch(statsTabProvider);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.sm, Space.lg, 0),
          child: Column(
            children: [
              ScreenTitle(
                title: 'Stats',
                trailing: 'YOUR NUMBERS',
                actions: [
                  HeaderAction(
                    icon: Icons.settings_outlined,
                    tooltip: 'Settings',
                    onTap: () => SettingsScreen.open(context),
                  ),
                ],
              ),
              const SizedBox(height: Space.lg),
              SegmentedTabs(
                labels: const ['Progress', 'Insights'],
                index: index,
                onSelect: (i) => ref.read(statsTabProvider.notifier).state = i,
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.md),
        Expanded(
          child: IndexedStack(
            index: index,
            children: const [
              _ProgressTab(),
              InsightsTab(),
            ],
          ),
        ),
      ],
    );
  }
}

class _ProgressTab extends ConsumerWidget {
  const _ProgressTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final range = ref.watch(statsRangeProvider);
    final async = ref.watch(statsProvider);

    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(
        message: "Couldn't build your stats.",
        detail: e.toString(),
        onRetry: () => ref.invalidate(statsProvider),
      ),
      data: (stats) => _ProgressBody(stats: stats, range: range),
    );
  }
}

class _ProgressBody extends ConsumerWidget {
  const _ProgressBody({required this.stats, required this.range});

  final StatsView stats;
  final StatsRange range;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;

    return ListView(
      padding: const EdgeInsets.fromLTRB(
          Space.lg, 0, Space.lg, Dimens.scrollBottomInset),
      children: [
        // Full width, not hugging the left edge. It governs every card below
        // it, and a control that small in the corner did not look like it
        // governed anything.
        // Free sees the last 30 days; 90D and 1Y are Pro. The locked chips
        // stay visible with a padlock — a range you can see but not open
        // sells the upgrade; a range that isn't there sells nothing.
        SegmentedTabs(
          labels: [
            for (final r in StatsRange.values)
              ref.watch(isProProvider) || r == StatsRange.days30
                  ? r.label
                  : '${r.label} 🔒',
          ],
          index: StatsRange.values.indexOf(range),
          onSelect: (i) {
            final picked = StatsRange.values[i];
            if (picked != StatsRange.days30 && !ref.read(isProProvider)) {
              PaywallScreen.open(context);
              return;
            }
            ref.read(statsRangeProvider.notifier).state = picked;
          },
        ),
        const SizedBox(height: Space.lg),

        // The curve is the hero now. It carries the headline rate, the three
        // totals the ring used to show, and — unlike the ring — the shape of
        // how they got there, which is the part a single number cannot say.
                ConsistencyChartCard(range: range, stats: stats),
        const SizedBox(height: Space.md),

        const _ReviewRow(),
        _MoodSection(range: range),
        const SizedBox(height: Space.xl),

        const SectionLabel('Every day in range'),
        const SizedBox(height: Space.md),
        SurfaceCard(
          padding: const EdgeInsets.all(Space.md),
          child: _Heatmap(stats: stats),
        ),
        const SizedBox(height: Space.xl),

        if (stats.byCategory.isNotEmpty) ...[
          const SizedBox(height: Space.xl),
          _EffortCard(stats: stats),
        ],

        if (stats.bestWeekday != null) ...[
          const SizedBox(height: Space.lg),
          StatusNote(
            icon: Icons.insights_rounded,
            message: '${stats.bestWeekday} is your strongest day.',
            tint: t.accent,
          ),
        ],

        // Last, deliberately. Focus is optional work — it belongs after the
        // habits, tasks and goals the user actually committed to, not wedged
        // between them.
        _FocusSection(range: range),
      ],
    );
  }

  /// One sentence under the ring. States the number's meaning without ever
  /// grading the person — "half the days are getting away" is a fact they can
  /// act on; "poor" is a verdict they will resent.
}

/// Way into the weekly review.
///
/// Stats answers "what have I done"; the review answers "so what". They belong
/// next to each other, but not on the same screen — a page of numbers with five
/// opinions mixed into it is neither.
class _ReviewRow extends ConsumerWidget {
  const _ReviewRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final review = ref.watch(weeklyReviewProvider).value;
    final count = review?.insights.length ?? 0;
    final detail = count == 0
        ? 'Last 7 days'
        : '$count thing${count == 1 ? '' : 's'} worth knowing';

    return SurfaceCard(
      padding: const EdgeInsets.all(Space.md),
      onTap: () => openWeeklyReviewRespectingPlan(context, ref),
      child: Row(
        children: [
          IconBadge(
            icon: Icons.auto_awesome_rounded,
            color: t.accent,
            gradient: Grad.brand(t),
          ),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Weekly review', style: text.titleMedium),
                const SizedBox(height: 2),
                Text(detail,
                    style: text.bodySmall?.copyWith(color: t.textSecondary)),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded,
              size: Dimens.iconMd, color: t.textMuted),
        ],
      ),
    );
  }
}

/// The consistency grid.
///
/// Two layouts, because one cannot fill the card at every range:
///
/// * **Short ranges lay out as a calendar** — seven columns, one per weekday,
///   weeks stacked downward. Thirty days is five columns in a commit-graph
///   layout, which left 60% of the card empty however the cell was sized.
/// * **Long ranges lay out as a commit graph** — columns of seven, sized to
///   fill the width exactly. Ninety days is fourteen columns, a year is
///   fifty-three, and both fill.
///
/// Colour is the green ramp in [AuraTokens.heat], not the lime accent: 365
/// accent-coloured squares would drown out every real call to action.
class _Heatmap extends StatelessWidget {
  const _Heatmap({required this.stats});
  final StatsView stats;

  /// Above this many weeks, switch to the commit-graph layout.
  static const _calendarMaxWeeks = 8;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final weeks = _weeks();
    if (weeks.isEmpty) return const SizedBox.shrink();

    final asCalendar = weeks.length <= _calendarMaxWeeks;

    return LayoutBuilder(
      builder: (context, c) {
        final gap = asCalendar ? 5.0 : (weeks.length > 20 ? 2.0 : 3.0);
        final columns = asCalendar ? 7 : weeks.length;
        // No lower clamp: a floor on the cell size is what made a year
        // overflow the card, because 53 columns do not fit at 5px each.
        final cell =
            ((c.maxWidth - (columns - 1) * gap) / columns).clamp(1.0, 46.0);
        final gridWidth = columns * cell + (columns - 1) * gap;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: gridWidth,
              child: asCalendar
                  ? _WeekdayLabels(cell: cell, gap: gap)
                  : _MonthLabels(weeks: weeks, cell: cell, gap: gap),
            ),
            const SizedBox(height: 6),
            if (asCalendar)
              Column(
                children: [
                  for (var w = 0; w < weeks.length; w++) ...[
                    if (w > 0) SizedBox(height: gap),
                    Row(
                      children: [
                        for (var d = 0; d < 7; d++) ...[
                          if (d > 0) SizedBox(width: gap),
                          _Cell(
                            day: d < weeks[w].length ? weeks[w][d] : null,
                            size: cell,
                            stats: stats,
                          ),
                        ],
                      ],
                    ),
                  ],
                ],
              )
            else
              Row(
                children: [
                  for (var i = 0; i < weeks.length; i++) ...[
                    if (i > 0) SizedBox(width: gap),
                    Column(
                      children: [
                        for (var d = 0; d < weeks[i].length; d++) ...[
                          if (d > 0) SizedBox(height: gap),
                          _Cell(day: weeks[i][d], size: cell, stats: stats),
                        ],
                      ],
                    ),
                  ],
                ],
              ),
            const SizedBox(height: Space.md),
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${stats.days.where((d) => d.completed > 0).length} active '
                    'days in this range',
                    style: text.bodySmall?.copyWith(color: t.textMuted),
                  ),
                ),
                Text('LESS', style: text.labelMedium),
                const SizedBox(width: 5),
                for (final colour in t.heat)
                  Padding(
                    padding: const EdgeInsets.only(left: 3),
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: colour,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                const SizedBox(width: 7),
                Text('MORE', style: text.labelMedium),
              ],
            ),
          ],
        );
      },
    );
  }

  /// Weeks of seven, oldest first, padded so every week starts on the same
  /// weekday. Without the pad the grid shears by a day each week and the rows
  /// stop meaning anything.
  List<List<DayOutcome?>> _weeks() {
    if (stats.days.isEmpty) return const [];
    final padded = <DayOutcome?>[
      for (var i = 0; i < stats.days.first.date.dow; i++) null,
      ...stats.days,
    ];
    return [
      for (var i = 0; i < padded.length; i += 7)
        padded.sublist(i, (i + 7).clamp(0, padded.length)),
    ];
  }
}

/// S M T W T F S, for the calendar layout.
class _WeekdayLabels extends StatelessWidget {
  const _WeekdayLabels({required this.cell, required this.gap});

  final double cell;
  final double gap;

  @override
  Widget build(BuildContext context) {
    const initials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    final text = Theme.of(context).textTheme;

    return Row(
      children: [
        for (var d = 0; d < 7; d++) ...[
          if (d > 0) SizedBox(width: gap),
          SizedBox(
            width: cell,
            child: Text(initials[d],
                textAlign: TextAlign.center, style: text.labelMedium),
          ),
        ],
      ],
    );
  }
}

class _Cell extends StatelessWidget {
  const _Cell({required this.day, required this.size, required this.stats});

  final DayOutcome? day;
  final double size;
  final StatsView stats;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final d = day;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: d == null ? Colors.transparent : t.heat[stats.intensityOf(d)],
        borderRadius: BorderRadius.circular(size * 0.22),
      ),
    );
  }
}

/// Month initials above the columns where a month begins.
class _MonthLabels extends StatelessWidget {
  const _MonthLabels({
    required this.weeks,
    required this.cell,
    required this.gap,
  });

  final List<List<DayOutcome?>> weeks;
  final double cell;
  final double gap;

  @override
  Widget build(BuildContext context) {
    // Real month names. Single initials were unreadable — "M J J A" tells a
    // reader nothing, and two of those letters are ambiguous anyway.
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG',
        'SEP', 'OCT', 'NOV', 'DEC'];
    final text = Theme.of(context).textTheme;

    // Collision is a *pixel* problem, not a column-count one: three columns
    // apart is comfortable at 20px cells and overlapping at 4px ones.
    const minLabelGap = 34.0;

    var lastMonth = -1;
    var lastX = -minLabelGap;
    final marks = <int, String>{};
    for (var i = 0; i < weeks.length; i++) {
      final first = weeks[i].firstWhere((d) => d != null, orElse: () => null);
      if (first == null) continue;
      if (first.date.month == lastMonth) continue;
      lastMonth = first.date.month;
      final x = i * (cell + gap);
      if (x - lastX < minLabelGap) continue;
      lastX = x;
      marks[i] = months[first.date.month - 1];
    }

    return SizedBox(
      height: 12,
      child: Stack(
        children: [
          for (final entry in marks.entries)
            Positioned(
              left: entry.key * (cell + gap),
              child: Text(entry.value, style: text.labelMedium),
            ),
        ],
      ),
    );
  }
}

/// Where effort goes, and which way it is moving.
///
/// The heart of the screen: habits, tasks and goals all roll up into a category,
/// and this is the only view that answers "what am I actually working on".
///
/// Three things the previous version got wrong:
///
/// * **It counted habit check-ins only.** A category someone was pouring task
///   work into showed as empty.
/// * **It showed totals with no baseline.** A ranked list says where you have
///   always spent time; it cannot say what *changed*, which is the only part
///   worth acting on.
/// * **It buried the answer.** Six identical bars make the reader do the
///   comparison. The headline now states it.
class _EffortCard extends StatelessWidget {
  const _EffortCard({required this.stats});
  final StatsView stats;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final top = stats.byCategory.take(6).toList();
    final max = stats.byCategory.first.completions;

    final rising = stats.byCategory.where((c) => c.isImproving).toList()
      ..sort((a, b) => (b.changePercent ?? 0).compareTo(a.changePercent ?? 0));
    final falling = stats.byCategory.where((c) => c.isSlipping).toList()
      ..sort((a, b) => (a.changePercent ?? 0).compareTo(b.changePercent ?? 0));

    final leader = stats.byCategory.first;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionLabel('Where your effort goes'),
        const SizedBox(height: Space.md),
        SurfaceCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // The answer, in a sentence, before any bars.
              Text(
                'Most of it went to ${HabitCategories.resolve(leader.category).name}',
                style: text.titleMedium,
              ),
              const SizedBox(height: 3),
              Text(
                '${leader.completions} of ${_total(stats)} things done '
                'in this range',
                style: text.bodySmall?.copyWith(color: t.textMuted),
              ),
              const SizedBox(height: Space.lg),

              for (final c in top)
                _EffortRow(stat: c, max: max),

              if (rising.isNotEmpty || falling.isNotEmpty) ...[
                const SizedBox(height: Space.sm),
                Divider(color: t.border, height: Dimens.hairline),
                const SizedBox(height: Space.md),
                if (rising.isNotEmpty)
                  _TrendLine(
                    icon: Icons.trending_up_rounded,
                    tint: t.success,
                    text: 'Gaining ground in '
                        '${HabitCategories.resolve(rising.first.category).name}'
                        ' · up ${rising.first.changeLabel} on the '
                        'previous ${stats.range.days} days',
                  ),
                if (falling.isNotEmpty)
                  _TrendLine(
                    icon: Icons.trending_down_rounded,
                    tint: t.warn,
                    text: 'Slipping in '
                        '${HabitCategories.resolve(falling.first.category).name}'
                        ' · down ${falling.first.changeLabel} on the '
                        'previous ${stats.range.days} days',
                  ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  static int _total(StatsView stats) {
    var n = 0;
    for (final c in stats.byCategory) {
      n += c.completions;
    }
    return n;
  }
}

/// One category: its share, its habit/task split, and its direction.
class _EffortRow extends StatelessWidget {
  const _EffortRow({required this.stat, required this.max});

  final CategoryStat stat;
  final int max;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final category = HabitCategories.resolve(stat.category);
    final colour = category.colorOf(context);
    final change = stat.changePercent;

    return Padding(
      padding: const EdgeInsets.only(bottom: Space.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              category.glyph(size: Dimens.iconSm, color: colour),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  category.name,
                  style: text.bodyMedium?.copyWith(color: t.textPrimary),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (change != null && (stat.isImproving || stat.isSlipping)) ...[
                Icon(
                  stat.isImproving
                      ? Icons.arrow_upward_rounded
                      : Icons.arrow_downward_rounded,
                  size: 12,
                  color: stat.isImproving ? t.success : t.warn,
                ),
                Text(
                  stat.changeLabel!,
                  style: text.labelMedium?.copyWith(
                    color: stat.isImproving ? t.success : t.warn,
                  ),
                ),
                const SizedBox(width: Space.sm),
              ],
              Text('${stat.completions}',
                  style: AuraType.numeral(14, color: t.textPrimary)),
            ],
          ),
          const SizedBox(height: 6),
          // The bar is split so the habit and task halves of a category are
          // visible — "all my Fitness effort is tasks, none of it is habits"
          // is a genuinely useful thing to notice.
          _SplitBar(
            habits: stat.habitCompletions,
            tasks: stat.taskCompletions,
            max: max,
            colour: colour,
          ),
        ],
      ),
    );
  }
}

class _SplitBar extends StatelessWidget {
  const _SplitBar({
    required this.habits,
    required this.tasks,
    required this.max,
    required this.colour,
  });

  final int habits;
  final int tasks;
  final int max;
  final Color colour;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    const height = 7.0;

    return LayoutBuilder(
      builder: (context, c) {
        final total = habits + tasks;
        final full = max == 0 ? 0.0 : (total / max) * c.maxWidth;
        final habitW = total == 0 ? 0.0 : full * (habits / total);

        return Stack(
          children: [
            Container(
              height: height,
              decoration: BoxDecoration(
                color: t.surfaceAlt,
                borderRadius: BorderRadius.circular(height),
              ),
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(height),
              child: SizedBox(
                height: height,
                width: full,
                child: Row(
                  children: [
                    Container(width: habitW, color: colour),
                    Expanded(
                      child: ColoredBox(
                        color: colour.withValues(alpha: 0.42),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _TrendLine extends StatelessWidget {
  const _TrendLine({
    required this.icon,
    required this.tint,
    required this.text,
  });

  final IconData icon;
  final Color tint;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Space.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: Dimens.iconSm, color: tint),
          const SizedBox(width: Space.sm),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: context.aura.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}


/// Mood, when the user has switched it on.
///
/// Renders nothing when the feature is off — Stats must not advertise. When it
/// is on it shows the line, the average, and the one relationship this feature
/// is allowed to describe: whether better days and kept habits land together.
class _MoodSection extends ConsumerWidget {
  const _MoodSection({required this.range});
  final StatsRange range;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final view = ref.watch(moodProvider(range.days)).value;
    if (view == null || !view.enabled) return const SizedBox.shrink();

    final summary = view.summary;
    if (summary.isEmpty) {
      return Padding(
        padding: const EdgeInsets.only(top: Space.xl),
        child: SurfaceCard(
          child: Text(
            'No mood readings yet. The first few fill this in.',
            style: text.bodyMedium?.copyWith(color: t.textMuted),
          ),
        ),
      );
    }

    // One reading is not a chart. A single bar spans the whole card and reads
    // as a rendering fault, so the first day gets a proper card instead: the
    // face they picked, the word they picked, and the way back in to change
    // it — structured like every other tile on the screen rather than a bare
    // sentence floating in a box.
    if (summary.entries.length < 2) {
      final only = summary.entries.single;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: Space.xl),
          const SectionLabel('Mood'),
          const SizedBox(height: Space.md),
          SurfaceCard(
            padding: const EdgeInsets.all(Space.md),
            onTap: () => MoodCheckIn.open(context),
            child: Row(
              children: [
                MoodFace(level: only.level, size: 40),
                const SizedBox(width: Space.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Today: ${only.level.label}',
                        style: text.titleMedium
                            ?.copyWith(color: t.mood(only.level)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'First reading logged. A few more and this becomes '
                        'a trend you can see.',
                        style:
                            text.bodySmall?.copyWith(color: t.textSecondary),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded,
                    size: Dimens.iconMd, color: t.textMuted),
              ],
            ),
          ),
        ],
      );
    }

    // Sliced to the selected range, then to what a phone can render. The
    // readings themselves are kept for 90 days regardless — this is only how
    // many of them are drawn.
    final cutoff = CivilDate.today().addDays(-(range.days - 1)).iso;
    final inRange = summary.entries
        .where((e) => e.date.iso.compareTo(cutoff) >= 0)
        .toList();
    if (inRange.length < 2) return const SizedBox.shrink();

    final breakdown = MoodBreakdown.of(inRange)!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: Space.xl),
        const SectionLabel('Mood'),
        const SizedBox(height: Space.md),
        _MoodTrendCard(
          bars: MoodChart.bars(inRange, range.days),
          grain: MoodChart.grainFor(range.days),
          breakdown: breakdown,
          rangeDays: range.days,
        ),
      ],
    );
  }
}

/// The chart: a face on top of every bar, and the two numbers that frame it.
///
/// The face is the point. Nobody decodes a bar height into a feeling, but
/// everybody reads a frown — so the face sits at the top of its own bar rather
/// than in a tidy row above the chart, which made them look like a legend.
class _MoodTrendCard extends StatelessWidget {
  const _MoodTrendCard({
    required this.bars,
    required this.grain,
    required this.breakdown,
    required this.rangeDays,
  });

  final List<MoodBar> bars;
  final MoodGrain grain;
  final MoodBreakdown breakdown;
  final int rangeDays;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              MoodFace(level: breakdown.mostCommon, size: 34),
              const SizedBox(width: Space.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Mood', style: text.titleMedium),
                    Text(
                      // Says which unit the bars stand for, because "3.4" over
                      // weekly columns and "3.4" over daily ones are different
                      // claims and the chart cannot tell you which it is.
                      switch (grain) {
                        MoodGrain.day => 'Day by day · last $rangeDays days',
                        MoodGrain.week => 'Weekly average · last $rangeDays '
                            'days',
                        MoodGrain.month =>
                          'Monthly average · last $rangeDays days',
                      },
                      style: text.bodySmall?.copyWith(color: t.textMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: Space.lg),
          LayoutBuilder(
            builder: (context, c) {
              final average = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(breakdown.average.toStringAsFixed(1),
                          style: AuraType.numeral(34, color: t.accent)),
                      Text(' / 5',
                          style: text.bodyLarge
                              ?.copyWith(color: t.textMuted)),
                    ],
                  ),
                  Text('Average mood',
                      style:
                          text.bodySmall?.copyWith(color: t.textSecondary)),
                ],
              );
              final common = _MostCommon(breakdown: breakdown);
              // Side by side is the shape. A 393dp phone leaves ~321dp inside
              // this card, which fits; only a genuinely narrow device stacks.
              if (c.maxWidth < 300) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    average,
                    const SizedBox(height: Space.md),
                    common,
                  ],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  average,
                  const SizedBox(width: Space.md),
                  // Expanded, not Spacer-then-Flexible: a Spacer claims every
                  // spare pixel first, so the chip was laid out at its minimum
                  // and ellipsised itself into "Most c... / Good ..." on a
                  // card with room to spare.
                  Expanded(child: common),
                ],
              );
            },
          ),
          const SizedBox(height: Space.lg),
          _MoodBars(bars: bars),
          const SizedBox(height: Space.sm),
          Row(
            children: [
              for (final b in bars)
                Expanded(
                  child: Text(
                    b.label,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.clip,
                    style: TextStyle(
                      fontSize: bars.length > 20 ? 8 : 11,
                      fontWeight:
                          b.isLatest ? FontWeight.w800 : FontWeight.w500,
                      color: b.isLatest ? t.accent : t.textMuted,
                    ),
                  ),
                ),
            ],
          ),
          if (breakdown.bestWeekday != null &&
              breakdown.worstWeekday != null) ...[
            const SizedBox(height: Space.lg),
            Container(
              padding: const EdgeInsets.all(Space.md),
              decoration: BoxDecoration(
                color: t.bgSunken,
                borderRadius: BorderRadius.circular(Radii.md),
              ),
              child: Row(
                children: [
                  Icon(Icons.lightbulb_outline_rounded,
                      size: Dimens.iconSm, color: t.warn),
                  const SizedBox(width: Space.sm),
                  Expanded(
                    child: Text.rich(
                      TextSpan(children: [
                        TextSpan(
                            text: 'Your mood is highest on ',
                            style: text.bodySmall
                                ?.copyWith(color: t.textSecondary)),
                        TextSpan(
                            text: '${breakdown.bestWeekday!}s',
                            style: text.bodySmall?.copyWith(
                                color: t.accent,
                                fontWeight: FontWeight.w700)),
                        TextSpan(
                            text: ' and lowest on ',
                            style: text.bodySmall
                                ?.copyWith(color: t.textSecondary)),
                        TextSpan(
                            text: '${breakdown.worstWeekday!}s',
                            style: text.bodySmall?.copyWith(
                                color: t.danger,
                                fontWeight: FontWeight.w700)),
                        TextSpan(
                            text: '.',
                            style: text.bodySmall
                                ?.copyWith(color: t.textSecondary)),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: Space.md),
          Text(
            'You felt good or better on ${breakdown.goodDays} of '
            '${breakdown.days} recorded day'
            '${breakdown.days == 1 ? '' : 's'} '
            '(${breakdown.goodPercent}%). A record of what you logged, not a '
            'health assessment.',
            style: text.bodySmall?.copyWith(color: t.textMuted, height: 1.35),
          ),
        ],
      ),
    );
  }
}

class _MostCommon extends StatelessWidget {
  const _MostCommon({required this.breakdown});
  final MoodBreakdown breakdown;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final colour = t.mood(breakdown.mostCommon);

    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: Space.md, vertical: Space.sm),
      decoration: BoxDecoration(
        color: t.bgSunken,
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: t.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          MoodFace(level: breakdown.mostCommon, size: 28),
          const SizedBox(width: Space.sm),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Most common mood',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.bodySmall?.copyWith(color: t.textMuted)),
                Text.rich(
                  TextSpan(children: [
                    TextSpan(
                      text: breakdown.mostCommon.label,
                      style: text.bodyLarge?.copyWith(
                          color: colour, fontWeight: FontWeight.w800),
                    ),
                    TextSpan(
                      text: '  ${breakdown.mostCommonDays} day'
                          '${breakdown.mostCommonDays == 1 ? '' : 's'}',
                      style:
                          text.bodySmall?.copyWith(color: t.textSecondary),
                    ),
                  ]),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Bars with their faces, over dashed guides.
class _MoodBars extends StatelessWidget {
  const _MoodBars({required this.bars});

  final List<MoodBar> bars;

  static const _height = 168.0;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    return LayoutBuilder(
      builder: (context, c) {
        final slot = c.maxWidth / bars.length;
        // The face is the readable part, but two weeks of them on a 360dp
        // phone would overlap. It shrinks with the column and steps aside
        // entirely when there is genuinely no room, rather than smearing.
        final faceSize = slot >= 34
            ? 26.0
            : slot >= 26
                ? 20.0
                : slot >= 20
                    ? 15.0
                    // A month of daily columns lands around here. The face is
                    // small but it still carries the shape and the colour,
                    // which is most of what it was doing at any size.
                    : slot >= 13
                        ? 11.0
                        : 0.0;
        final gap = faceSize == 0 ? 0.0 : 6.0;
        final maxBar = _height - faceSize - gap;
        final barWidth = (slot * 0.52).clamp(6.0, 26.0);

        return SizedBox(
          height: _height,
          child: Stack(
            children: [
              Positioned.fill(
                child: CustomPaint(painter: _MoodGuides(colour: t.border)),
              ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (final b in bars)
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          if (faceSize > 0) ...[
                            MoodFace(level: b.level, size: faceSize),
                            SizedBox(height: gap),
                          ],
                          // Plotted 1..5 rather than 0-based, so a terrible
                          // day still draws a bar. A zero-height bar reads as
                          // a missing entry, which it is not.
                          TweenAnimationBuilder<double>(
                            tween: Tween(
                                begin: 0, end: b.average / 5 * maxBar),
                            duration: Motion.slow,
                            curve: Motion.emphasised,
                            builder: (context, h, _) => Container(
                              width: barWidth,
                              height: h,
                              decoration: BoxDecoration(
                                borderRadius:
                                    BorderRadius.circular(barWidth / 2),
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    t.mood(b.level),
                                    t.mood(b.level).withValues(alpha: 0.72),
                                  ],
                                ),
                                border: b.isLatest
                                    ? Border.all(
                                        color: t.textPrimary, width: 1.5)
                                    : null,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _MoodGuides extends CustomPainter {
  const _MoodGuides({required this.colour});
  final Color colour;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = colour.withValues(alpha: 0.6)
      ..strokeWidth = 1;
    for (var i = 1; i <= 4; i++) {
      final y = size.height - size.height * (i / 5);
      for (var x = 0.0; x < size.width; x += 6) {
        canvas.drawLine(Offset(x, y), Offset(x + 3, y), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_MoodGuides old) => old.colour != colour;
}





/// Focus time, drawn from the pomodoro logs.
///
/// Shown to everyone, including someone who has never run a block — the empty
/// state is an invitation with a button, not a blank chart. Hiding the section
/// entirely meant the one feature that needs to be *tried* to be understood was
/// invisible to exactly the people who had not tried it.
class _FocusSection extends ConsumerWidget {
  const _FocusSection({required this.range});
  final StatsRange range;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final raw =
        ref.watch(focusHistoryProvider(range.days)).value ?? const <int>[];
    // Downsampled so a year does not try to draw 365 one-pixel bars. Summed
    // rather than sampled — dropping days would understate the totals the
    // chart sits next to.
    final history = _downsample(raw, 30);
    final summary =
        ref.watch(focusSummaryProvider).value ?? FocusSummary.empty;
    final quota = ref.watch(focusQuotaProvider);

    final everUsed = raw.any((m) => m > 0) || summary.weekMinutes > 0;
    final bucketDays = (raw.length / history.length).ceil();
    final today = CivilDate.today();
    const initials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    final start = today.addDays(-(raw.length - 1));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: Space.xl),
        const SectionLabel('Focus'),
        const SizedBox(height: Space.md),
        SurfaceCard(
          onTap: () => openFocusRespectingPlan(context, ref),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconBadge(
                    icon: Icons.hourglass_top_rounded,
                    color: t.accent,
                    gradient: Grad.brand(t),
                    size: 38,
                  ),
                  const SizedBox(width: Space.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          everUsed ? 'Deep work' : 'Try a focus block',
                          style: text.titleMedium,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          everUsed
                              ? (quota.isLimited
                                  ? '${quota.remaining} free blocks left today'
                                  : 'Unlimited blocks')
                              : '25 minutes on one thing, timed',
                          style:
                              text.bodySmall?.copyWith(color: t.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded,
                      size: Dimens.iconMd, color: t.textMuted),
                ],
              ),

              if (everUsed) ...[
                const SizedBox(height: Space.lg),
                Row(
                  children: [
                    _FocusMetric(
                      value: _hm(summary.weekMinutes),
                      label: 'THIS WEEK',
                      tint: t.secondary,
                    ),
                    _FocusMetric(
                      value: '${summary.todaySessions}',
                      label: 'BLOCKS TODAY',
                      tint: t.accent,
                    ),
                    _FocusMetric(
                      value: _hm(summary.bestDayMinutes),
                      label: 'BEST DAY',
                      tint: t.warn,
                    ),
                  ],
                ),
                if (history.length > 1) ...[
                  const SizedBox(height: Space.lg),
                  BarRow(
                    height: 74,
                    maxBarWidth: 14,
                    bars: [
                      for (var i = 0; i < history.length; i++)
                        Bar(
                          // A weekday letter only means something when a bar
                          // *is* a day. Once buckets span weeks the axis is
                          // dropped rather than mislabelled.
                          label: bucketDays == 1
                              ? initials[start.addDays(i).dow]
                              : '',
                          value: history[i].toDouble(),
                          highlight: i == history.length - 1,
                          color: t.secondary,
                        ),
                    ],
                  ),
                  const SizedBox(height: Space.sm),
                  Text(
                    bucketDays == 1
                        ? 'Last ${raw.length} days'
                        : 'Last ${raw.length} days, $bucketDays-day totals',
                    style: text.bodySmall?.copyWith(color: t.textMuted),
                  ),
                ],
              ],
            ],
          ),
        ),
      ],
    );
  }

  /// Sum [values] into at most [buckets] groups, oldest first.
  static List<int> _downsample(List<int> values, int buckets) {
    if (values.length <= buckets) return values;
    final size = (values.length / buckets).ceil();
    return [
      for (var i = 0; i < values.length; i += size)
        values
            .sublist(i, (i + size).clamp(0, values.length))
            .fold(0, (a, b) => a + b),
    ];
  }

  /// '1h 20m' / '45m' / '0m'.
  static String _hm(int minutes) {
    if (minutes <= 0) return '0m';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h == 0) return '${m}m';
    if (m == 0) return '${h}h';
    return '${h}h ${m}m';
  }
}

class _FocusMetric extends StatelessWidget {
  const _FocusMetric({
    required this.value,
    required this.label,
    required this.tint,
  });

  final String value;
  final String label;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(width: 18, height: 3,
              decoration: BoxDecoration(
                  color: tint, borderRadius: BorderRadius.circular(3))),
          const SizedBox(height: 7),
          Text(value, style: AuraType.numeral(19, color: t.textPrimary)),
          Text(label, style: Theme.of(context).textTheme.labelMedium),
        ],
      ),
    );
  }
}


