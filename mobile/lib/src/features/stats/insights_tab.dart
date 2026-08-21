import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../data/screen_time_service.dart';
import '../../data/wellbeing_repository.dart';
import '../../domain/app_categories.dart';
import '../../domain/digital_wellbeing.dart';
import '../../domain/coach_engine.dart';
import '../../domain/screen_time_rules.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/charts.dart';
import '../../ui/progress_ring.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../screentime/screen_time_disclosure.dart';
import '../habits/habit_finder_screen.dart';
import '../shared/section_header.dart';
import 'ask_screen.dart';

/// What your data says about you.
///
/// Merges what were two tabs — "Phone" (screen time) and "Coach" (advice).
/// They are the same subject, and the advice is worth much more sitting
/// directly above the numbers it is drawn from.
///
/// Opens with the advisor's unprompted read, then the evidence underneath it.
///
/// ## Where the hours actually went
///
/// The screen-time feature used to report one number — a daily total — and
/// explicitly refused to say anything about *what* the time was. A total tells
/// you nothing you did not already suspect. This tab answers the question
/// people actually have: which categories, which apps, and is that the split
/// you meant?
///
/// Every classification here is a guess the user can overrule in two taps, and
/// the copy says so. See [AppTaxonomy] for why that matters.
class InsightsTab extends ConsumerWidget {
  const InsightsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(wellbeingProvider);
    final usage = ref.watch(screenTimeProvider).value;

    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(
        message: "Couldn't read your screen time.",
        detail: e.toString(),
        onRetry: () => ref.invalidate(screenTimeProvider),
      ),
      data: (view) => ListView(
        padding: const EdgeInsets.fromLTRB(
          Space.lg,
          0,
          Space.lg,
          Dimens.scrollBottomInset,
        ),
        children: [
          const _BriefingCard(),
          const SizedBox(height: Space.lg),
          const _FinderPointer(),
          const SizedBox(height: Space.xl),
          if (view.granted)
            ..._body(context, ref, view, usage)
          else if (ref.read(screenTimeServiceProvider).supported)
            const _NotGranted()
          else
            // iOS has no usage-stats API an app may read (Apple's Screen
            // Time renders only inside sealed extensions), so the ask is
            // never shown there — a button that can only crash or disappoint
            // is worse than honesty.
            const _NotOnThisPlatform(),
        ],
      ),
    );
  }
}

/// The permission wall.
///
/// Never routes straight to the OS usage-access screen: Play policy requires
/// the disclosure first, and [ScreenTimeDisclosureScreen] is the only call site
/// allowed to open it.
class _NotGranted extends ConsumerWidget {
  const _NotGranted();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    // A bare card, not its own scroll view: this now sits inside the tab's
    // ListView, and a nested unbounded ListView would blow up at layout.
    return SurfaceCard(
      gradient: Grad.surfaceWash(t),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconBadge(
            icon: Icons.phonelink_ring_rounded,
            color: t.accent,
            gradient: Grad.brand(t),
            size: 44,
          ),
          const SizedBox(height: Space.md),
          Text('See where your hours go', style: text.titleLarge),
          const SizedBox(height: Space.sm),
          Text(
            'Turn on usage access and StayHardy sorts your apps into '
            'categories, works out how much of your day compounds, and '
            'tells you whether your heavy phone days are the days you miss '
            'habits.',
            style: text.bodyMedium?.copyWith(color: t.textSecondary),
          ),
          const SizedBox(height: Space.lg),
          _Promise(
            icon: Icons.lock_outline_rounded,
            text: 'Stays on this device. Never uploaded, never backed up.',
          ),
          _Promise(
            icon: Icons.tune_rounded,
            text: 'Every category is a guess you can correct.',
          ),
          _Promise(
            icon: Icons.block_rounded,
            text: 'No limits, no blocking, no telling you off.',
          ),
          const SizedBox(height: Space.lg),
          AppButton.primary(
            label: 'TURN ON',
            onPressed: () async {
              final granted = await ScreenTimeDisclosureScreen.open(context);
              if (granted) ref.invalidate(screenTimeProvider);
            },
          ),
        ],
      ),
    );
  }
}

class _Promise extends StatelessWidget {
  const _Promise({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Padding(
      padding: const EdgeInsets.only(top: Space.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: Dimens.iconSm, color: t.secondary),
          const SizedBox(width: Space.sm),
          Expanded(
            child: Text(
              text,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: t.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

/// The screen-time half, as a list of children rather than its own scroll view,
/// so it can sit under the briefing in one continuous page.
List<Widget> _body(
  BuildContext context,
  WidgetRef ref,
  WellbeingView view,
  ScreenTimeView? usage,
) {
  final t = context.aura;
  final text = Theme.of(context).textTheme;
  final b = view.breakdown;

  if (b.isEmpty) {
    // Access granted, nothing recorded yet. Presented as its own card with a
    // clear "what happens next", not a bare empty-state sentence — this is the
    // first thing a user sees right after granting a sensitive permission, and
    // it has to say the grant worked.
    return [
      SurfaceCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconBadge(
                  icon: Icons.check_rounded,
                  color: t.success,
                  size: 38,
                ),
                const SizedBox(width: Space.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Screen time is on', style: text.titleMedium),
                      const SizedBox(height: 2),
                      Text(
                        'The grant worked — recording starts now.',
                        style:
                            text.bodySmall?.copyWith(color: t.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: Space.lg),
            Divider(color: t.border, height: Dimens.hairline),
            const SizedBox(height: Space.md),
            Text(
              'From tomorrow this page shows where your hours go by category, '
              'your Focus Score, and whether heavy phone days line up with '
              'the days you miss habits.',
              style: text.bodyMedium?.copyWith(color: t.textSecondary),
            ),
            const SizedBox(height: Space.sm),
            Text(
              'Everything stays on this phone.',
              style: text.bodySmall?.copyWith(color: t.textMuted),
            ),
          ],
        ),
      ),
    ];
  }

  final slices = [
    for (final c in b.categories)
      Slice(
        label: c.category.label,
        value: c.minutes.toDouble(),
        color: t.usageColor(c.category.id),
      ),
  ];

  return [
    _ScoreCard(view: view),
    const SizedBox(height: Space.xl),

    const SectionLabel('Daily screen time'),
    const SizedBox(height: Space.md),
    SurfaceCard(child: _DailyBars(view: view)),
    const SizedBox(height: Space.xl),

    SectionLabel(
      'The split',
      action: Text(
        '${b.days} day${b.days == 1 ? '' : 's'}',
        style: text.bodySmall?.copyWith(color: t.textMuted),
      ),
    ),
    const SizedBox(height: Space.md),
    SurfaceCard(
      child: Column(
        children: [
          Center(
            child: DonutChart(
              slices: slices,
              size: 168,
              stroke: 26,
              center: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    ScreenTimeRules.formatDuration(b.dailyAverageMinutes),
                    style: AuraType.numeral(24, color: t.textPrimary),
                  ),
                  Text('A DAY', style: text.labelMedium),
                ],
              ),
            ),
          ),
          const SizedBox(height: Space.lg),
          for (final c in b.categories)
            LegendRow(
              color: t.usageColor(c.category.id),
              label: c.category.label,
              value: ScreenTimeRules.formatDuration(
                b.days > 0 ? c.minutes ~/ b.days : c.minutes,
              ),
              share: b.discretionaryMinutes == 0
                  ? 0
                  : c.minutes / b.discretionaryMinutes,
            ),
          if (b.systemMinutes > 0) ...[
            const SizedBox(height: Space.sm),
            Text(
              'Launcher, settings and keyboard time '
              '(${ScreenTimeRules.formatDuration(b.days > 0 ? b.systemMinutes ~/ b.days : b.systemMinutes)} a day) '
              'is left out of the split and the score — it is the phone '
              'being a phone, not a choice you made.',
              style: text.bodySmall?.copyWith(color: t.textMuted),
            ),
          ],
        ],
      ),
    ),
    const SizedBox(height: Space.xl),

    const SectionLabel('What the hours are costing'),
    const SizedBox(height: Space.md),
    _TimeAdviceCard(view: view),

    if (usage?.correlation != null) ...[
      const SizedBox(height: Space.xl),
      _CorrelationCard(correlation: usage!.correlation!),
    ],
  ];
}

/// The advisor's unprompted read, and the way into asking it something.
///
/// Sits above the charts on purpose. A page that opens with a donut makes the
/// user do the interpreting; a page that opens with "2 tasks are past due —
/// those tend to be what quietly eats a week" has already done it.
/// The habit finder, offered where people come to reflect — the natural
/// "so what should I change?" moment.
class _FinderPointer extends StatelessWidget {
  const _FinderPointer();

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return SurfaceCard(
      padding: const EdgeInsets.symmetric(
          horizontal: Space.lg, vertical: Space.md),
      onTap: () => HabitFinderScreen.open(context),
      child: Row(
        children: [
          Icon(Icons.auto_awesome_rounded,
              size: Dimens.iconMd, color: t.accent),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('What habits do I need?', style: text.titleSmall),
                const SizedBox(height: 2),
                Text(
                  'Answer five quick questions and get a routine built '
                  'for you.',
                  style: text.bodySmall?.copyWith(color: t.textMuted),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded,
              size: Dimens.iconSm, color: t.textMuted),
        ],
      ),
    );
  }
}

class _BriefingCard extends ConsumerWidget {
  const _BriefingCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final snapshot = ref.watch(coachSnapshotProvider).value;
    if (snapshot == null) return const SizedBox.shrink();

    final reply = CoachEngine.greeting(snapshot);
    final tint = switch (reply.tone) {
      CoachTone.good => t.success,
      CoachTone.warn => t.warn,
      CoachTone.neutral => t.accent,
    };

    return SurfaceCard(
      gradient: Grad.surfaceWash(t),
      onTap: () => AskScreen.open(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              IconBadge(
                icon: Icons.auto_awesome_rounded,
                color: t.accent,
                gradient: Grad.brand(t),
                size: 34,
              ),
              const SizedBox(width: Space.md),
              Expanded(
                child: Text(
                  reply.headline ?? 'Where you stand',
                  style: text.titleLarge?.copyWith(color: tint),
                ),
              ),
              if (reply.metric != null)
                Text(reply.metric!, style: AuraType.numeral(24, color: tint)),
            ],
          ),
          const SizedBox(height: Space.md),
          for (final p in reply.paragraphs.take(2))
            Padding(
              padding: const EdgeInsets.only(bottom: Space.sm),
              child: Text(
                p,
                style: text.bodyMedium?.copyWith(color: t.textSecondary),
              ),
            ),
          const SizedBox(height: Space.xs),
          Row(
            children: [
              Text(
                'Ask about your data',
                style: text.titleMedium?.copyWith(color: t.accent),
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.arrow_forward_rounded,
                size: Dimens.iconSm,
                color: t.accent,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// The hero: a Focus Score, its band, and what moved it.
class _ScoreCard extends StatelessWidget {
  const _ScoreCard({required this.view});
  final WellbeingView view;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final score = view.score;
    final b = view.breakdown;

    if (!score.hasEnoughData) {
      return SurfaceCard(
        gradient: Grad.surfaceWash(t),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Not enough yet', style: text.titleLarge),
            const SizedBox(height: Space.sm),
            Text(
              'A Focus Score needs at least '
              '${DigitalWellbeing.minMinutesForScore} minutes of app use to '
              'mean anything. Below that it swings wildly on a single app '
              'switch, so there is no number rather than a wrong one.',
              style: text.bodyMedium?.copyWith(color: t.textSecondary),
            ),
          ],
        ),
      );
    }

    final tint = switch (score.band) {
      WellbeingBand.deepWork => t.success,
      WellbeingBand.balanced => t.secondary,
      WellbeingBand.leaning => t.warn,
      WellbeingBand.mostlyLeisure => t.danger,
    };

    return SurfaceCard(
      gradient: Grad.surfaceWash(t),
      child: Column(
        children: [
          Row(
            children: [
              ProgressRing(
                fraction: score.value / 100,
                size: 108,
                stroke: 10,
                color: tint,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${score.value}',
                      style: AuraType.numeral(34, color: t.textPrimary),
                    ),
                    Text('FOCUS', style: text.labelMedium),
                  ],
                ),
              ),
              const SizedBox(width: Space.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      score.band.label,
                      style: text.titleLarge?.copyWith(color: tint),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      score.band.blurb,
                      style: text.bodyMedium?.copyWith(color: t.textSecondary),
                    ),
                    if (view.trend != null && view.trend!.abs() >= 3) ...[
                      const SizedBox(height: Space.sm),
                      Row(
                        children: [
                          Icon(
                            view.trend! > 0
                                ? Icons.trending_up_rounded
                                : Icons.trending_down_rounded,
                            size: Dimens.iconSm,
                            color: view.trend! > 0 ? t.success : t.warn,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            '${view.trend! > 0 ? '+' : ''}${view.trend} on the first half',
                            style: text.bodySmall?.copyWith(
                              color: view.trend! > 0 ? t.success : t.warn,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: Space.lg),
          StackedBar(
            slices: [
              Slice(
                label: 'Invested',
                value: b.investedMinutes.toDouble(),
                color: t.success,
              ),
              Slice(
                label: 'Messaging',
                value: b.neutralMinutes.toDouble(),
                color: t.secondary,
              ),
              Slice(
                label: 'Leisure',
                value: b.leisureMinutes.toDouble(),
                color: t.warn,
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _Key(
                color: t.success,
                label: 'INVESTED',
                minutes: b.investedMinutes,
                days: b.days,
              ),
              _Key(
                color: t.secondary,
                label: 'MESSAGING',
                minutes: b.neutralMinutes,
                days: b.days,
              ),
              _Key(
                color: t.warn,
                label: 'LEISURE',
                minutes: b.leisureMinutes,
                days: b.days,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Key extends StatelessWidget {
  const _Key({
    required this.color,
    required this.label,
    required this.minutes,
    required this.days,
  });

  final Color color;
  final String label;
  final int minutes;
  final int days;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final t = context.aura;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 5),
            Text(label, style: text.labelMedium),
          ],
        ),
        const SizedBox(height: 3),
        Text(
          ScreenTimeRules.formatDuration(days > 0 ? minutes ~/ days : minutes),
          style: AuraType.numeral(15, color: t.textPrimary),
        ),
      ],
    );
  }
}

class _DailyBars extends StatelessWidget {
  const _DailyBars({required this.view});
  final WellbeingView view;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    const initials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    final days = view.daily.length <= 14
        ? view.daily
        : view.daily.sublist(view.daily.length - 14);
    if (days.isEmpty) return const SizedBox.shrink();

    var total = 0;
    for (final d in days) {
      total += d.minutes;
    }
    final average = total / days.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        BarRow(
          height: 100,
          reference: average,
          bars: [
            for (var i = 0; i < days.length; i++)
              Bar(
                label: initials[days[i].date.dow],
                value: days[i].minutes.toDouble(),
                highlight: i == days.length - 1,
                // Coloured by how the day was spent, not by how long it was —
                // a long day of deep work is not a bad day, and colouring by
                // duration alone would say it was.
                color: days[i].score == null
                    ? t.surfaceHigh
                    : (days[i].score! >= 60
                          ? t.success
                          : (days[i].score! >= 35 ? t.secondary : t.warn)),
              ),
          ],
        ),
        const SizedBox(height: Space.md),
        Text(
          'Dashed line is your ${ScreenTimeRules.formatDuration(average.round())} '
          'average. Bar colour is that day’s Focus Score, not its length.',
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: t.textMuted),
        ),
      ],
    );
  }
}

/// The per-app list, with the bucket each app landed in and a way to change it.
/// The advice card, and beneath it the folded-away app table.
///
/// The table exists only so miscategorised apps can be corrected — Android's
/// own settings already show everyone their per-app minutes, so leading with
/// it added nothing. StayHardy's job is the analysis; the list is the
/// fine-tuning drawer under it.
class _TimeAdviceCard extends ConsumerStatefulWidget {
  const _TimeAdviceCard({required this.view});
  final WellbeingView view;

  @override
  ConsumerState<_TimeAdviceCard> createState() => _TimeAdviceCardState();
}

class _TimeAdviceCardState extends ConsumerState<_TimeAdviceCard> {
  bool _fineTuning = false;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final advice = TimeAdvice.from(widget.view.breakdown);

    return Column(
      children: [
        if (advice != null)
          SurfaceCard(
            gradient: Grad.surfaceWash(t),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      advice.positive
                          ? Icons.spa_rounded
                          : Icons.hourglass_bottom_rounded,
                      size: Dimens.iconSm,
                      color: advice.positive ? t.success : t.warn,
                    ),
                    const SizedBox(width: Space.sm),
                    Expanded(
                      child: Text(advice.headline, style: text.titleMedium),
                    ),
                  ],
                ),
                const SizedBox(height: Space.md),
                Text(
                  advice.body,
                  style: text.bodyMedium?.copyWith(color: t.textSecondary),
                ),
              ],
            ),
          ),
        const SizedBox(height: Space.sm),
        Center(
          child: AppButton.text(
            label: _fineTuning
                ? 'HIDE APP CATEGORIES'
                : 'FINE-TUNE APP CATEGORIES',
            onPressed: () => setState(() => _fineTuning = !_fineTuning),
          ),
        ),
        if (_fineTuning) ...[
          const SizedBox(height: Space.sm),
          _TopApps(view: widget.view),
        ],
      ],
    );
  }
}

class _TopApps extends ConsumerWidget {
  const _TopApps({required this.view});
  final WellbeingView view;

  static const _shown = 8;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    final apps = <AppUsage>[];
    for (final c in view.breakdown.categories) {
      apps.addAll(c.apps);
    }
    apps.sort((a, b) => b.foregroundMs.compareTo(a.foregroundMs));
    final top = apps.take(_shown).toList();

    return Column(
      children: [
        SurfaceCard(
          padding: const EdgeInsets.symmetric(horizontal: Space.md),
          child: Column(
            children: [
              for (var i = 0; i < top.length; i++)
                _AppRow(
                  app: top[i],
                  category: AppTaxonomy.categorise(
                    top[i].packageName,
                    overrides: view.overrides,
                  ),
                  isGuess: AppTaxonomy.isGuess(
                    top[i].packageName,
                    overrides: view.overrides,
                  ),
                  days: view.breakdown.days,
                  last: i == top.length - 1,
                ),
            ],
          ),
        ),
        const SizedBox(height: Space.sm),
        Text(
          'Tap an app to change its category. Your answer sticks — the app '
          'never overrules a category you have set yourself.',
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),
      ],
    );
  }
}

class _AppRow extends ConsumerWidget {
  const _AppRow({
    required this.app,
    required this.category,
    required this.isGuess,
    required this.days,
    required this.last,
  });

  final AppUsage app;
  final UsageCategory category;
  final bool isGuess;
  final int days;
  final bool last;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final colour = t.usageColor(category.id);
    final perDay = days > 0 ? app.minutes ~/ days : app.minutes;

    return InkWell(
      onTap: () => _pickCategory(context, ref),
      splashColor: t.accent.withValues(alpha: Alphas.splash),
      highlightColor: t.accent.withValues(alpha: Alphas.highlight),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: Space.md),
        decoration: last
            ? null
            : BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: t.border, width: Dimens.hairline),
                ),
              ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: colour.withValues(alpha: Alphas.tintStrong),
                borderRadius: BorderRadius.circular(Radii.sm),
              ),
              alignment: Alignment.center,
              child: Text(
                app.displayName.characters.isEmpty
                    ? '?'
                    : app.displayName.characters.first.toUpperCase(),
                style: text.titleMedium?.copyWith(color: colour),
              ),
            ),
            const SizedBox(width: Space.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    app.displayName,
                    style: text.bodyLarge,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Text(
                        category.label.toUpperCase(),
                        style: text.labelMedium?.copyWith(color: colour),
                      ),
                      if (isGuess) ...[
                        const SizedBox(width: 5),
                        Text('· GUESS', style: text.labelMedium),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            Text(
              ScreenTimeRules.formatDuration(perDay),
              style: AuraType.numeral(15, color: t.textPrimary),
            ),
            const SizedBox(width: Space.xs),
            Icon(
              Icons.expand_more_rounded,
              size: Dimens.iconSm,
              color: t.textMuted,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickCategory(BuildContext context, WidgetRef ref) async {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    final chosen = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Space.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(app.displayName, style: text.titleLarge),
              const SizedBox(height: 4),
              Text(
                'What is this app for you? Somebody else’s distraction is '
                'your job.',
                style: text.bodyMedium?.copyWith(color: t.textSecondary),
              ),
              const SizedBox(height: Space.lg),
              Flexible(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      for (final c in UsageCategory.assignable)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: t
                                  .usageColor(c.id)
                                  .withValues(alpha: Alphas.tintStrong),
                              borderRadius: BorderRadius.circular(Radii.sm),
                            ),
                            child: c.id == category.id
                                ? Icon(
                                    Icons.check_rounded,
                                    size: Dimens.iconSm,
                                    color: t.usageColor(c.id),
                                  )
                                : null,
                          ),
                          title: Text(c.label, style: text.bodyLarge),
                          subtitle: Text(
                            c.blurb,
                            style: text.bodySmall?.copyWith(color: t.textMuted),
                          ),
                          onTap: () => Navigator.of(sheetContext).pop(c.id),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (chosen == null) return;
    await ref
        .read(wellbeingRepositoryProvider)
        .setOverride(app.packageName, chosen);
    ref.invalidate(wellbeingProvider);
  }
}

/// The one claim this feature is allowed to make about cause, and only when the
/// evidence clears [ScreenTimeRules.minDaysForCorrelation].
class _CorrelationCard extends StatelessWidget {
  const _CorrelationCard({required this.correlation});
  final ScreenTimeCorrelation correlation;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final more = correlation.moreOnMissedDays;

    return SurfaceCard(
      tint: more ? t.warn : t.success,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.insights_rounded,
                size: Dimens.iconMd,
                color: more ? t.warn : t.success,
              ),
              const SizedBox(width: Space.sm),
              Text(
                more ? 'A pattern worth knowing' : 'No penalty visible',
                style: text.titleMedium?.copyWith(
                  color: more ? t.warn : t.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          Text(
            more
                ? 'On days you miss habits you average '
                      '${ScreenTimeRules.formatDuration(correlation.gap)} more '
                      'screen time than on days you keep them.'
                : 'Your heavy phone days are not the days you miss habits — '
                      'if anything it runs the other way.',
            style: text.bodyMedium?.copyWith(color: t.textSecondary),
          ),
          const SizedBox(height: Space.sm),
          Text(
            'Kept days: ${ScreenTimeRules.formatDuration(correlation.keptDayAverage)}   ·   '
            'Missed days: ${ScreenTimeRules.formatDuration(correlation.missedDayAverage)}   ·   '
            '${correlation.sampleDays} days compared',
            style: text.bodySmall?.copyWith(color: t.textMuted),
          ),
          const SizedBox(height: Space.sm),
          Text(
            'This is a correlation, not a cause.',
            style: text.bodySmall?.copyWith(color: t.textMuted),
          ),
        ],
      ),
    );
  }
}


/// Said plainly on iOS instead of offering a switch that cannot work.
class _NotOnThisPlatform extends StatelessWidget {
  const _NotOnThisPlatform();

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    return SurfaceCard(
      child: Text(
        'Screen-time insights are an Android feature — Apple does not let '
        'apps read usage data on iPhone. Everything else here works the '
        'same.',
        style: text.bodyMedium?.copyWith(color: t.textSecondary),
      ),
    );
  }
}
