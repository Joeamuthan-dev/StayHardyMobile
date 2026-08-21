import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../data/insight_repository.dart';
import '../../data/providers.dart';
import '../../domain/civil_date.dart';
import '../../domain/consistency_trend.dart';
import '../../domain/insight_rules.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/progress_ring.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../../ui/zone_colour.dart';
import '../shared/section_header.dart';

/// The weekly review.
///
/// Deliberately shaped as a page you read once, not a dashboard you scan: the
/// week's headline number, then a small number of specific claims, each with
/// the evidence behind it and — where there is an honest one — something to do.
///
/// The order is the argument. How the week went, what carried it, what did not,
/// and only then what to do about next week. Putting the plan last means it is
/// read as a conclusion rather than as a demand.
class WeeklyReviewScreen extends ConsumerWidget {
  const WeeklyReviewScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const WeeklyReviewScreen()),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final async = ref.watch(weeklyReviewProvider);
    final review = async.value;

    return Scaffold(
      backgroundColor: t.bg,
      appBar: AppBar(
        backgroundColor: t.bg,
        elevation: 0,
        centerTitle: true,
        title: Text('Weekly Review',
            style: Theme.of(context).textTheme.titleMedium),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: t.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          // Only offered once there is a week worth sending. A share button
          // that produces "0% — no data" is a trap, not a feature.
          if (review != null && review.hasEnoughData)
            Padding(
              padding: const EdgeInsets.only(right: Space.md),
              child: _ShareButton(review: review),
            ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: async.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(
            message: "Couldn't build your review.",
            detail: e.toString(),
            onRetry: () => ref.invalidate(weeklyReviewProvider),
          ),
          data: (review) => _Body(review: review),
        ),
      ),
    );
  }
}

class _ShareButton extends StatelessWidget {
  const _ShareButton({required this.review});
  final WeeklyReview review;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return IconButton(
      style: IconButton.styleFrom(
        backgroundColor: t.surface,
        shape: const CircleBorder(),
      ),
      icon: Icon(Icons.ios_share_rounded, size: 18, color: t.textPrimary),
      tooltip: 'Share this week',
      onPressed: () {
        final box = context.findRenderObject() as RenderBox?;
        final input = review.input;
        final wins = review.insights
            .where((i) => i.tone == InsightTone.win)
            .take(2)
            .map((i) => '• ${i.headline}')
            .join('\n');
        Share.share(
          [
            'My week on StayHardy: ${input.rate}% consistency',
            '${input.checkIns} check-ins · ${input.strongDays} of '
                '${input.trackedDays} strong days',
            if (wins.isNotEmpty) '\n$wins',
          ].join('\n'),
          sharePositionOrigin:
              box == null ? null : box.localToGlobal(Offset.zero) & box.size,
        );
      },
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.review});
  final WeeklyReview review;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final input = review.input;

    if (!review.hasEnoughData) {
      return const Padding(
        padding: EdgeInsets.all(Space.lg),
        child: EmptyView(
          title: 'Nothing to review yet',
          message: 'Check a few habits off and the first review will appear '
              'here next week.',
        ),
      );
    }

    final wins =
        review.insights.where((i) => i.tone == InsightTone.win).toList();
    final risks =
        review.insights.where((i) => i.tone == InsightTone.risk).toList();
    final patterns =
        review.insights.where((i) => i.tone == InsightTone.pattern).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
      children: [
        Text(
          _range(input.weekStart, input.weekEnd),
          style: text.labelLarge?.copyWith(color: t.textMuted),
        ),
        const SizedBox(height: Space.lg),

        _Hero(input: input),
        const SizedBox(height: Space.lg),
        _Totals(input: input),
        const SizedBox(height: Space.xl),

        const SectionLabel('Your week'),
        const SizedBox(height: Space.md),
        LayoutBuilder(
          builder: (context, c) {
            final week = _DailyStrip(input: input);
            final win = wins.isEmpty
                ? null
                : _BiggestWin(insight: wins.first, input: input);
            // Two columns is the shape this wants, but at 320dp it becomes two
            // slivers. Below the threshold they stack instead of shrinking.
            if (win == null) return week;
            if (c.maxWidth < 340) {
              return Column(
                children: [week, const SizedBox(height: Space.md), win],
              );
            }
            return IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: week),
                  const SizedBox(width: Space.md),
                  Expanded(child: win),
                ],
              ),
            );
          },
        ),

        if (wins.length > 1) ...[
          const SizedBox(height: Space.xl),
          const SectionLabel('Other wins'),
          const SizedBox(height: Space.md),
          for (final w in wins.skip(1)) ...[
            _ClaimRow(insight: w, input: input, tone: InsightTone.win),
            const SizedBox(height: Space.sm),
          ],
        ],

        if (risks.isNotEmpty) ...[
          const SizedBox(height: Space.xl),
          const SectionLabel('Needs attention'),
          const SizedBox(height: Space.md),
          for (final r in risks) ...[
            _ClaimRow(insight: r, input: input, tone: InsightTone.risk),
            const SizedBox(height: Space.sm),
          ],
        ],

        if (patterns.isNotEmpty) ...[
          const SizedBox(height: Space.xl),
          const SectionLabel('Worth noting'),
          const SizedBox(height: Space.md),
          for (final p in patterns) ...[
            _ClaimRow(insight: p, input: input, tone: InsightTone.pattern),
            const SizedBox(height: Space.sm),
          ],
        ],

        if (review.insights.isEmpty) ...[
          const SizedBox(height: Space.xl),
          SurfaceCard(
            child: Text(
              'Nothing worth flagging this week — which is its own kind of '
              'good news. Patterns need a few weeks before they mean anything.',
              style: text.bodyMedium?.copyWith(color: t.textSecondary),
            ),
          ),
        ],

        const SizedBox(height: Space.xl),
        _NextWeek(wins: wins, risks: risks, input: input),
      ],
    );
  }

  static String _range(CivilDate from, CivilDate to) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG',
        'SEP', 'OCT', 'NOV', 'DEC'];
    final sameMonth = from.month == to.month;
    final left =
        sameMonth ? '${from.day}' : '${from.day} ${months[from.month - 1]}';
    return '$left–${to.day} ${months[to.month - 1]}';
  }
}

/// Ring, movement, and one sentence about the week.
class _Hero extends StatelessWidget {
  const _Hero({required this.input});
  final ReviewInput input;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final zone = ConsistencyZone.of(input.rate / 100);
    final c = zoneColour(zone, t);
    final delta = input.rate - input.ratePrev;
    final best = input.bestWeekRate;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        ProgressRing(
          fraction: input.rate / 100,
          size: 132,
          stroke: 7,
          color: c,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${input.rate}%', style: AuraType.numeral(30, color: c)),
              Text('CONSISTENCY',
                  style: text.labelSmall?.copyWith(
                      color: t.textMuted, letterSpacing: 0.6)),
              const SizedBox(height: 5),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: c.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(Radii.pill),
                ),
                child: Text(
                  zone.label.toUpperCase(),
                  style: TextStyle(
                      fontSize: 9, fontWeight: FontWeight.w800, color: c),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: Space.lg),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Only drawn when there is a week to compare against. "Up 43
              // points" against a week the user did not have the app is a lie
              // dressed as encouragement.
              if (input.hasPreviousWeek) ...[
                Row(
                  children: [
                    Icon(
                      delta == 0
                          ? Icons.remove_rounded
                          : (delta > 0
                              ? Icons.arrow_upward_rounded
                              : Icons.arrow_downward_rounded),
                      size: 14,
                      color: delta == 0
                          ? t.textMuted
                          : (delta > 0 ? t.success : t.danger),
                    ),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        delta == 0
                            ? 'Level with last week'
                            : '${delta.abs()} pts vs last week',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: delta == 0
                              ? t.textMuted
                              : (delta > 0 ? t.success : t.danger),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: Space.sm),
              ],
              Text(
                _verdict(input.rate, delta, input.hasPreviousWeek),
                style: text.bodyLarge?.copyWith(height: 1.3),
              ),
              if (best != null) ...[
                const SizedBox(height: Space.md),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: Space.md, vertical: 9),
                  decoration: BoxDecoration(
                    color: t.surface,
                    borderRadius: BorderRadius.circular(Radii.md),
                    border: Border.all(color: t.border),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.emoji_events_outlined,
                          size: 15, color: t.accent),
                      const SizedBox(width: 7),
                      Expanded(
                        child: Text('Best week',
                            style: text.bodySmall
                                ?.copyWith(color: t.textSecondary)),
                      ),
                      Text(
                        best <= input.rate ? 'This one' : '$best%',
                        style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: t.textPrimary),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  /// Two short lines: what the week was, and what to do with that.
  ///
  /// Never scolding on a bad week. Someone opening a review after a poor seven
  /// days already knows it went badly; the useful half is the second sentence.
  static String _verdict(int rate, int delta, bool hasPrev) {
    if (rate >= 80) {
      return 'A strong week.\nThis is the rhythm worth protecting.';
    }
    if (hasPrev && delta <= -10) {
      return "A slower week.\nLet's get your rhythm back.";
    }
    if (hasPrev && delta >= 10) {
      return 'A stronger week.\nWhatever changed, keep doing it.';
    }
    if (rate >= 50) return 'A steady week.\nOne more day lands the next band.';
    return 'A hard week.\nPick one habit and start there.';
  }
}

/// Check-ins, tasks, focus — the three counts, given equal weight.
class _Totals extends StatelessWidget {
  const _Totals({required this.input});
  final ReviewInput input;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return SurfaceCard(
      padding:
          const EdgeInsets.symmetric(horizontal: Space.md, vertical: Space.md),
      child: Row(
        children: [
          _Total(
            icon: Icons.check_circle_outline_rounded,
            tint: t.accent,
            value: '${input.checkIns}',
            label: 'Check-ins',
          ),
          _Divider(),
          _Total(
            icon: Icons.checklist_rounded,
            tint: t.secondary,
            value: '${input.tasksCompleted}',
            label: 'Tasks done',
          ),
          _Divider(),
          _Total(
            icon: Icons.schedule_rounded,
            tint: t.warn,
            value: input.focusMinutes >= 60
                ? '${(input.focusMinutes / 60).toStringAsFixed(1)}h'
                : '${input.focusMinutes}m',
            label: 'Focus time',
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
        width: Dimens.hairline,
        height: 32,
        color: context.aura.border,
      );
}

class _Total extends StatelessWidget {
  const _Total({
    required this.icon,
    required this.tint,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final Color tint;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Expanded(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: tint.withValues(alpha: 0.14),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 15, color: tint),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(value, style: AuraType.numeral(18, color: t.textPrimary)),
                Text(label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 10.5, color: t.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Seven days, each in its own band's colour.
class _DailyStrip extends StatelessWidget {
  const _DailyStrip({required this.input});
  final ReviewInput input;

  static const _letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return SurfaceCard(
      padding: const EdgeInsets.all(Space.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Flexible(
                child: Text('Daily consistency',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.bodyMedium),
              ),
              const SizedBox(width: 5),
              Tooltip(
                triggerMode: TooltipTriggerMode.tap,
                margin: const EdgeInsets.symmetric(horizontal: Space.lg),
                message: 'Each dot is one day: habits done ÷ habits due.\n'
                    'A strong day is 80% or better — the green ones.\n'
                    'Days with nothing due are left hollow.',
                child: Icon(Icons.info_outline_rounded,
                    size: 12, color: t.textMuted),
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              for (var i = 0; i < 7; i++)
                _Day(
                  letter: _letters[input.weekStart.addDays(i).dow],
                  scheduled: input.dayScheduled[i],
                  completed: input.dayCompleted[i],
                ),
            ],
          ),
          const SizedBox(height: Space.md),
          Text.rich(
            TextSpan(children: [
              TextSpan(
                text: '${input.strongDays}',
                style: TextStyle(
                    color: t.accent,
                    fontWeight: FontWeight.w800,
                    fontSize: 13),
              ),
              TextSpan(
                text: ' / ${input.trackedDays} strong days',
                style: TextStyle(color: t.textSecondary, fontSize: 12.5),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}

class _Day extends StatelessWidget {
  const _Day({
    required this.letter,
    required this.scheduled,
    required this.completed,
  });

  final String letter;
  final int scheduled;
  final int completed;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    // Nothing due is neither a win nor a loss, so it gets no colour at all —
    // painting a rest day red would invent a failure the user did not have.
    final rest = scheduled == 0;
    final c = rest
        ? t.textMuted
        : zoneColour(ConsistencyZone.of(completed / scheduled), t);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(letter,
            style: TextStyle(
                fontSize: 10, color: t.textMuted, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: rest ? Colors.transparent : c.withValues(alpha: 0.30),
            border: Border.all(
              color: rest ? t.border : c,
              width: rest ? 1 : 2,
            ),
          ),
        ),
      ],
    );
  }
}

/// The single best thing that happened, given its own card.
class _BiggestWin extends StatelessWidget {
  const _BiggestWin({required this.insight, required this.input});

  final Insight insight;
  final ReviewInput input;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final parts = _split(insight.headline);

    return Container(
      padding: const EdgeInsets.all(Space.md),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Radii.lg),
        border: Border.all(color: t.success.withValues(alpha: 0.35)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            t.success.withValues(alpha: 0.18),
            t.success.withValues(alpha: 0.04),
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(Icons.rocket_launch_outlined, size: 13, color: t.success),
              const SizedBox(width: 5),
              Text('BIGGEST WIN',
                  style: text.labelSmall?.copyWith(
                      color: t.success, fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: Space.sm),
          Text(
            parts.$1,
            style: text.titleSmall?.copyWith(height: 1.25),
          ),
          if (parts.$2 != null) ...[
            const SizedBox(height: 2),
            Text(parts.$2!,
                style: text.bodySmall?.copyWith(
                    color: t.success, fontWeight: FontWeight.w700)),
          ],
          const SizedBox(height: Space.sm),
          Text(
            insight.detail,
            style: text.bodySmall?.copyWith(color: t.textSecondary),
          ),
        ],
      ),
    );
  }

  /// Insight headlines are written as "Meditate: perfect week". The subject and
  /// the claim are worth showing apart, but only when the colon is really a
  /// separator rather than punctuation inside a sentence.
  static (String, String?) _split(String headline) {
    final i = headline.indexOf(': ');
    if (i <= 0) return (headline, null);
    final claim = headline.substring(i + 2);
    if (claim.isEmpty) return (headline, null);
    return (
      headline.substring(0, i),
      claim[0].toUpperCase() + claim.substring(1),
    );
  }
}

/// One finding: what it is, the evidence, and its number where there is one.
class _ClaimRow extends StatelessWidget {
  const _ClaimRow({
    required this.insight,
    required this.input,
    required this.tone,
  });

  final Insight insight;
  final ReviewInput input;
  final InsightTone tone;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final tint = switch (tone) {
      InsightTone.win => t.success,
      InsightTone.risk => t.danger,
      // Patterns are observations, not verdicts. Tinting them like a warning
      // would make "Tuesday is your weakest day" read as a telling-off.
      InsightTone.pattern => t.textSecondary,
    };
    final parts = _BiggestWin._split(insight.headline);
    final trailing = _trailing();

    return Container(
      padding: const EdgeInsets.all(Space.md),
      decoration: BoxDecoration(
        color: tone == InsightTone.pattern
            ? t.surface
            : tint.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(Radii.lg),
        border: Border.all(
          color: tone == InsightTone.pattern
              ? t.border
              : tint.withValues(alpha: 0.28),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: tint.withValues(alpha: 0.14),
              shape: BoxShape.circle,
            ),
            child: Icon(_icon, size: 16, color: tint),
          ),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(parts.$1, style: text.bodyLarge),
                if (parts.$2 != null)
                  Text(parts.$2!,
                      style: text.bodySmall
                          ?.copyWith(color: tint, fontWeight: FontWeight.w700)),
                const SizedBox(height: 3),
                Text(insight.detail,
                    style: text.bodySmall?.copyWith(color: t.textSecondary)),
                if (insight.action != null) ...[
                  const SizedBox(height: Space.sm),
                  Text(insight.action!,
                      style: text.bodySmall?.copyWith(color: t.textPrimary)),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: Space.sm),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(
                color: tint.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(Radii.pill),
              ),
              child: Text(
                trailing,
                style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: tint),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// The number behind the claim, when one can be stated without inventing it.
  String? _trailing() {
    final goalId = insight.goalId;
    if (goalId != null) {
      for (final g in input.goals) {
        if (g.id == goalId) return '${g.progress}%';
      }
    }
    final habitId = insight.habitId;
    if (habitId != null) {
      for (final h in input.habits) {
        // A flexible habit has no per-day denominator, so "5 / 0" is not a
        // thing to print. Its completions are stated in the detail line.
        if (h.id == habitId && h.scheduled > 0) {
          return '${h.completed}/${h.scheduled}';
        }
      }
    }
    return null;
  }

  IconData get _icon => switch (insight.kind) {
        InsightKind.perfectWeek => Icons.check_rounded,
        InsightKind.newBest => Icons.trending_up_rounded,
        InsightKind.improving => Icons.trending_up_rounded,
        InsightKind.slipping => Icons.trending_down_rounded,
        InsightKind.streakAtRisk => Icons.local_fire_department_outlined,
        InsightKind.dormant => Icons.bedtime_outlined,
        InsightKind.goalBehind => Icons.flag_outlined,
        InsightKind.goalUnlinked => Icons.link_off_rounded,
        InsightKind.weakWeekday => Icons.event_busy_outlined,
        InsightKind.strongWeekday => Icons.event_available_outlined,
        InsightKind.focusUp => Icons.timer_outlined,
        InsightKind.overloaded => Icons.layers_outlined,
      };
}

/// Keep / Improve / Focus, then the way through to acting on it.
///
/// Every line is derived from a finding above it. A plan that does not follow
/// from the review is just three motivational sentences, and the user can tell.
class _NextWeek extends ConsumerWidget {
  const _NextWeek({
    required this.wins,
    required this.risks,
    required this.input,
  });

  final List<Insight> wins;
  final List<Insight> risks;
  final ReviewInput input;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.all(Space.lg),
      decoration: BoxDecoration(
        color: t.surface,
        borderRadius: BorderRadius.circular(Radii.lg),
        border: Border.all(color: t.accent.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('NEXT WEEK PLAN',
              style: text.labelLarge?.copyWith(
                  color: t.accent, fontWeight: FontWeight.w800)),
          const SizedBox(height: Space.lg),
          LayoutBuilder(
            builder: (context, c) {
              final items = [
                _Step(
                  icon: Icons.trending_up_rounded,
                  tint: t.accent,
                  title: 'Keep',
                  body: _keep(),
                ),
                _Step(
                  icon: Icons.north_east_rounded,
                  tint: t.warn,
                  title: 'Improve',
                  body: _improve(),
                ),
                _Step(
                  icon: Icons.adjust_rounded,
                  tint: t.danger,
                  title: 'Focus',
                  body: _focus(),
                ),
              ];
              // Three columns of prose need roughly 95dp each before the words
              // start breaking one per line. A 393dp phone leaves ~313dp here,
              // which fits; a 320dp phone does not, and stacks instead.
              if (c.maxWidth < 300) {
                return Column(
                  children: [
                    for (final i in items) ...[
                      i,
                      if (i != items.last) const SizedBox(height: Space.md),
                    ],
                  ],
                );
              }
              return IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final i in items) ...[
                      Expanded(child: i),
                      if (i != items.last) const SizedBox(width: Space.md),
                    ],
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: Space.lg),
          AppButton.primary(
            label: 'PLAN NEXT WEEK',
            icon: Icons.arrow_forward_rounded,
            iconTrailing: true,
            onPressed: () {
              // Straight to the place the plan is actually edited, rather than
              // a screen that congratulates the user for having read a screen.
              ref.read(shellTabProvider.notifier).state = 2;
              Navigator.of(context).pop();
            },
          ),
        ],
      ),
    );
  }

  String _keep() {
    final perfect =
        wins.where((w) => w.kind == InsightKind.perfectWeek).length;
    if (perfect > 0) {
      return 'Hold the $perfect habit${perfect == 1 ? '' : 's'} that went '
          'the whole week.';
    }
    if (input.strongDays > 0) {
      return 'Hold the ${input.strongDays} day'
          '${input.strongDays == 1 ? '' : 's'} that landed.';
    }
    return 'Pick the one habit you want to keep no matter what.';
  }

  String _improve() {
    final subject = _subjectOf(wins.firstOrNull);
    if (subject != null) return 'Keep $subject going — it is carrying you.';
    if (input.rate < 100) {
      return 'One extra day next week moves the number.';
    }
    return 'Nothing to fix. Add one only if you want it.';
  }

  String _focus() {
    final subject = _subjectOf(risks.firstOrNull);
    if (subject != null) return 'Make progress on $subject this week.';
    return 'Nothing is slipping. Protect what you have.';
  }

  /// The habit or goal a finding is about, by id rather than by parsing its
  /// headline — headlines are prose and will be reworded.
  String? _subjectOf(Insight? insight) {
    if (insight == null) return null;
    final habitId = insight.habitId;
    if (habitId != null) {
      for (final h in input.habits) {
        if (h.id == habitId) return h.title;
      }
    }
    final goalId = insight.goalId;
    if (goalId != null) {
      for (final g in input.goals) {
        if (g.id == goalId) return g.name;
      }
    }
    return null;
  }
}

class _Step extends StatelessWidget {
  const _Step({
    required this.icon,
    required this.tint,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final Color tint;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Container(
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                color: tint.withValues(alpha: 0.14),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 14, color: tint),
            ),
            const SizedBox(width: 7),
            Flexible(
              child: Text(title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: text.bodyMedium
                      ?.copyWith(color: tint, fontWeight: FontWeight.w800)),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(body,
            style: text.bodySmall
                ?.copyWith(color: t.textSecondary, height: 1.35)),
      ],
    );
  }
}

/// Opens the review, or the paywall. Insights are Pro by the plan of record.
///
/// One entry point, as with focus and the habit cap, so a second affordance
/// cannot quietly bypass the gate.
/// The weekly review, free for everyone.
///
/// It was Pro. That was the wrong thing to sell: the review is the moment the
/// app stops being a checklist and tells you something you did not know, and
/// putting it behind a wall meant the users least convinced by the app were the
/// only ones who never saw it. It is also computed entirely on-device from data
/// the user already owns, so it costs nothing to give away.
///
/// The name is kept — nothing calls this that does not want the plan respected
/// if a gate ever returns — but there is no gate today.
Future<void> openWeeklyReviewRespectingPlan(
  BuildContext context,
  WidgetRef ref,
) {
  return WeeklyReviewScreen.open(context);
}
