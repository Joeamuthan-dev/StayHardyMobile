import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/focus_repository.dart';
import '../../data/goal_repository.dart';
import '../../data/habit_repository.dart';
import '../../data/providers.dart';
import '../../domain/civil_date.dart';
import '../../domain/daily_quote.dart';
import '../../domain/day_score.dart';
import '../../domain/focus_rules.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../theme/mood_palette.dart';
import '../../ui/charts.dart';
import '../../ui/count_up.dart';
import '../../ui/progress_ring.dart';
import '../../ui/segmented_tabs.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../focus/focus_screen.dart';
import '../mood/mood_check_in.dart';
import '../settings/settings_screen.dart';
import '../shared/section_header.dart';

/// The dashboard.
///
/// Home is an **overview**, not a worklist. It answers "how am I doing and what
/// is outstanding" in one screen, and every tile is a door to the page that
/// owns that data — habits to Habits, tasks and goals to Plan, anything
/// measured to Stats.
///
/// It used to be the worklist: a checkable habit list, task rows and goal cards
/// all inline. That made Home a fifth copy of four other screens, and none of
/// those screens could be improved without improving Home too.
///
/// **The trade this makes:** checking a habit off is now one tap further away,
/// on the Habits tab. That is the cost of an overview, and it is the reason the
/// habits tile leads the page and states exactly how many are outstanding.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final habits = ref.watch(todayHabitsProvider);

    if (habits.isLoading && !habits.hasValue) return const LoadingView();
    if (habits.hasError && !habits.hasValue) {
      return ErrorView(
        message: "Couldn't load your day.",
        detail: habits.error.toString(),
        onRetry: () => ref.invalidate(todayHabitsProvider),
      );
    }

    return const _Dashboard();
  }
}

/// Where each tile sends you. Kept in one place so the dashboard's whole
/// navigation contract can be read at a glance.
extension _Go on WidgetRef {
  void toHabits() => read(shellTabProvider.notifier).state = 1;

  void toTasks() {
    read(planTabProvider.notifier).state = 0;
    read(shellTabProvider.notifier).state = 2;
  }

  void toGoals() {
    read(planTabProvider.notifier).state = 1;
    read(shellTabProvider.notifier).state = 2;
  }

  void toStats([int tab = 0]) {
    read(statsTabProvider.notifier).state = tab;
    read(shellTabProvider.notifier).state = 3;
  }
}

class _Dashboard extends ConsumerWidget {
  const _Dashboard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadAnnouncementsProvider).value ?? 0;
    final habits = ref.watch(todayHabitsProvider).value ?? const [];
    final streak = habits.isEmpty
        ? 0
        : habits.map((h) => h.streak).reduce((a, b) => a > b ? a : b);
    // Changes on every visit to Home, which restarts the entrance animations.
    final reveal = ref.watch(homeRevealProvider);

    return RefreshIndicator(
      color: context.aura.accent,
      backgroundColor: context.aura.surface,
      onRefresh: () async {
        ref.invalidate(todayHabitsProvider);
        ref.invalidate(taskBoardProvider);
        ref.invalidate(goalsProvider);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          Space.lg,
          Space.sm,
          Space.lg,
          Dimens.scrollBottomInset,
        ),
        children: [
          // The eyebrow carries the streak, not the date.
          //
          // The date is on the status bar, the lock screen and the notification
          // shade; repeating it in the most valuable line of the app bought
          // nothing. The streak is the number people open the app for, and it
          // was previously buried three cards down. On day one, before there is
          // a streak, it falls back to the date so the line is never empty.
          ScreenTitle(
            title: _greeting(),
            trailing: streak > 0
                ? '$streak-DAY STREAK'
                : _dateLabel(CivilDate.today()),
            actions: [
              HeaderAction(
                icon: Icons.settings_outlined,
                tooltip: 'Settings',
                badge: unread,
                onTap: () => SettingsScreen.open(context),
              ),
            ],
          ),
          const SizedBox(height: Space.lg),

          // Gone once the day is done, not switched to "all done". The score
          // card directly below already says 100 in deep green — a second
          // card repeating "finished" is applause that delays the information.
          if (ref.watch(dayScoreProvider).habitsLeft > 0) ...[
            const _DueTodayBanner(),
            const SizedBox(height: Space.md),
          ],

          _ScoreCard(key: ValueKey('score-$reveal')),
          const SizedBox(height: Space.md),

          _ActivityCard(key: ValueKey('activity-$reveal')),
          const SizedBox(height: Space.xl),

          const SectionLabel('Tools'),
          const SizedBox(height: Space.sm),
          const _FocusCard(),
          const SizedBox(height: Space.sm),
          const _MoodCard(),
          const SizedBox(height: Space.sm),
          const _InsightsCard(),

          // The day's line, last. Deliberately at the bottom: encouragement
          // above the habit list would be a slogan sitting between someone and
          // the thing they opened the app to do. Down here it is the sign-off
          // on a screen they have already read.
          const SizedBox(height: Space.xl),
          const _DailyLine(),
        ],
      ),
    );
  }

  static String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 5) return 'Late night';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Tonight';
  }

  static String _dateLabel(CivilDate d) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
        'FRIDAY', 'SATURDAY'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG',
        'SEP', 'OCT', 'NOV', 'DEC'];
    return '${days[d.dow]} · ${d.day} ${months[d.month - 1]}';
  }
}

/// The headline: what is outstanding, in a sentence, straight to Habits.
class _DueTodayBanner extends ConsumerWidget {
  const _DueTodayBanner();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final score = ref.watch(dayScoreProvider);
    final left = score.habitsLeft;

    return SurfaceCard(
      gradient: Grad.surfaceWash(t),
      onTap: ref.toHabits,
      child: Row(
        children: [
          IconBadge(
            icon: left == 0
                ? Icons.check_circle_outline_rounded
                : Icons.bolt_rounded,
            color: left == 0 ? t.success : t.accent,
            gradient: left == 0 ? null : Grad.brand(t),
            size: 44,
          ),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  score.habitsDue == 0
                      ? 'No habits today'
                      : (left == 0
                          ? 'All habits done'
                          : '$left habit${left == 1 ? '' : 's'} to go'),
                  style: text.titleLarge?.copyWith(
                    color: left == 0 && score.habitsDue > 0 ? t.success : null,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  score.habitsDue == 0
                      ? 'Nothing scheduled — add one any time'
                      : '${score.habitsDone} of ${score.habitsDue} done today',
                  style: text.bodyMedium?.copyWith(color: t.textSecondary),
                ),
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

/// Productivity, with goals and tasks beneath it.
///
/// The ring is today's obligations met — see [DayScore] for why it is a plain
/// fraction rather than a weighted blend.
class _ScoreCard extends ConsumerWidget {
  const _ScoreCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final score = ref.watch(dayScoreProvider);
    final goals = ref.watch(goalsProvider).value ?? const <GoalView>[];
    final board = ref.watch(taskBoardProvider).value;

    final active = goals.where((g) => !g.isComplete).toList();
    final goalProgress = active.isEmpty
        ? 0.0
        : active.map((g) => g.progress).reduce((a, b) => a + b) /
            (active.length * 100);

    final tasksLeft = (board?.overdue.length ?? 0) + (board?.today.length ?? 0);
    final tasksDoneToday = board?.completed.length ?? 0;
    final taskFraction = (tasksLeft + tasksDoneToday) == 0
        ? 0.0
        : tasksDoneToday / (tasksLeft + tasksDoneToday);

    return Column(
      children: [
        SurfaceCard(
          onTap: () => ref.toStats(),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text('PRODUCTIVITY SCORE',
                        style: text.labelLarge?.copyWith(color: t.textMuted)),
                  ),
                  Icon(Icons.bar_chart_rounded,
                      size: Dimens.iconMd, color: t.accent),
                ],
              ),
              const SizedBox(height: Space.lg),
              ProgressRing(
                fraction: score.fraction,
                size: 150,
                stroke: 13,
                // Pale green at the start of the arc, deep green by the end,
                // so the ring gets denser as it fills — the same "more colour
                // is more done" rule as the consistency grid.
                sweep: Grad.scoreSweep(t),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CountUp(
                      value: score.percent ?? 0,
                      placeholder: score.percent == null ? '—' : null,
                      style: AuraType.numeral(
                        46,
                        color: score.isComplete ? t.heat.last : t.textPrimary,
                      ),
                    ),
                    Text(score.percent == null ? 'REST DAY' : 'PERCENT',
                        style: text.labelMedium),
                  ],
                ),
              ),
              const SizedBox(height: Space.md),
              Text(
                score.summary,
                style: text.bodyMedium?.copyWith(color: t.textSecondary),
              ),
              // Never a silent deduction. It says how many points, why, and
              // goes to the screen where the categories can be corrected.
              if (score.hasPenalty) ...[
                const SizedBox(height: Space.md),
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => ref.toStats(1),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: Space.md, vertical: Space.sm),
                    decoration: BoxDecoration(
                      color: t.warn.withValues(alpha: Alphas.tint),
                      borderRadius: BorderRadius.circular(Radii.pill),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.phone_android_rounded,
                            size: 13, color: t.warn),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            score.penaltyLabel!,
                            style: text.bodySmall?.copyWith(color: t.warn),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(Icons.chevron_right_rounded,
                            size: 14, color: t.warn),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: Space.sm),
        Row(
          children: [
            Expanded(
              child: _MiniTile(
                label: 'Goals',
                detail: active.isEmpty
                    ? 'None active'
                    : '${active.length} active',
                fraction: goalProgress,
                tint: t.secondary,
                onTap: ref.toGoals,
              ),
            ),
            const SizedBox(width: Space.sm),
            Expanded(
              child: _MiniTile(
                label: 'Tasks',
                detail: tasksLeft == 0
                    ? 'Nothing due'
                    : '$tasksLeft pending',
                fraction: taskFraction,
                tint: tasksLeft > 0 ? t.warn : t.success,
                onTap: ref.toTasks,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _MiniTile extends StatelessWidget {
  const _MiniTile({
    required this.label,
    required this.detail,
    required this.fraction,
    required this.tint,
    required this.onTap,
  });

  final String label;
  final String detail;
  final double fraction;
  final Color tint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return SurfaceCard(
      padding: const EdgeInsets.all(Space.md),
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: text.titleMedium),
                const SizedBox(height: 2),
                Text(detail,
                    style: text.bodySmall?.copyWith(color: t.textMuted),
                    overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          const SizedBox(width: Space.sm),
          ProgressRing(
            fraction: fraction,
            size: 42,
            stroke: 5,
            glow: false,
            color: tint,
            child: CountUp(
              value: (fraction * 100).round(),
              style: AuraType.numeral(12, color: t.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

/// Habit activity, 7 or 30 days, straight to Stats.
class _ActivityCard extends ConsumerStatefulWidget {
  const _ActivityCard({super.key});

  @override
  ConsumerState<_ActivityCard> createState() => _ActivityCardState();
}

class _ActivityCardState extends ConsumerState<_ActivityCard> {
  int _index = 0;
  static const _windows = [7, 30];

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final days = _windows[_index];
    final tallies =
        ref.watch(habitActivityProvider(days)).value ?? const <DayTally>[];
    final habits = ref.watch(todayHabitsProvider).value ?? const [];

    final streak = habits.isEmpty
        ? 0
        : habits.map((h) => h.streak).reduce((a, b) => a > b ? a : b);

    const initials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return SurfaceCard(
      onTap: () => ref.toStats(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('HABIT ACTIVITY',
                    style: text.labelLarge?.copyWith(color: t.textMuted)),
              ),
              SegmentedTabs(
                expand: false,
                labels: const ['7D', '30D'],
                index: _index,
                onSelect: (i) => setState(() => _index = i),
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          Row(
            children: [
              Icon(Icons.local_fire_department_rounded,
                  size: Dimens.iconSm, color: streak > 0 ? t.warn : t.textMuted),
              const SizedBox(width: 6),
              Text(
                streak == 0
                    ? 'No streak yet'
                    : '$streak day streak',
                style: text.titleMedium,
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          if (tallies.isEmpty)
            SizedBox(
              height: 100,
              child: Center(
                child: Text('Nothing logged yet',
                    style: text.bodySmall?.copyWith(color: t.textMuted)),
              ),
            )
          else ...[
            BarRow(
              height: 100,
              maxBarWidth: days == 7 ? 34 : 12,
              bars: [
                for (var i = 0; i < tallies.length; i++)
                  Bar(
                    // Weekday initials for a week. Thirty labels in a 300px
                    // row is not an axis — the two-digit dates wrapped into
                    // stacked single digits — so the range is captioned below
                    // instead.
                    label: days == 7 ? initials[tallies[i].date.dow] : '',
                    value: tallies[i].completed.toDouble(),
                    highlight: i == tallies.length - 1,
                    color: tallies[i].scheduled > 0 &&
                            tallies[i].completed >= tallies[i].scheduled
                        ? t.success
                        : null,
                  ),
              ],
            ),
            if (days != 7)
              Text(
                'Last 30 days · green is a day fully kept',
                style: text.bodySmall?.copyWith(color: t.textMuted),
              ),
          ],
        ],
      ),
    );
  }
}

/// Focus, with the free allowance stated up front.
class _FocusCard extends ConsumerWidget {
  const _FocusCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final run = ref.watch(activeFocusProvider).value;
    final summary = ref.watch(focusSummaryProvider).value ?? FocusSummary.empty;
    final quota = ref.watch(focusQuotaProvider);

    final now = DateTime.now().millisecondsSinceEpoch;
    final running = run != null;
    final finished = running && run.isFinishedAt(now);

    final String label;
    final String detail;
    if (finished) {
      label = 'Session complete';
      detail = 'Tap to bank it';
    } else if (running) {
      label = run.isPaused ? 'Focus paused' : 'Focusing';
      detail = '${formatFocusClock(run.remainingAt(now))} left'
          '${run.goalName == null ? '' : ' · ${run.goalName}'}';
    } else if (!quota.canStart) {
      label = 'Focus limit reached';
      detail = 'Both free blocks used today';
    } else {
      label = 'Start a focus block';
      detail = summary.todayMinutes > 0
          ? '${formatFocusTotal(summary.todayMinutes)} focused today'
          : (quota.isLimited
              ? '25 minutes · ${quota.remaining} free today'
              : '25 minutes, one thing');
    }

    return _ToolCard(
      icon: finished
          ? Icons.check_rounded
          : (running ? Icons.timer_outlined : Icons.hourglass_top_rounded),
      tint: finished ? t.success : (running ? t.accent : null),
      title: label,
      detail: detail,
      onTap: () => openFocusRespectingPlan(context, ref),
    );
  }
}

/// Today's mood, or the prompt. Renders nothing when the feature is off.
class _MoodCard extends ConsumerWidget {
  const _MoodCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    // Home only ever reads today's face, so it asks for the smallest window
    // that can contain it rather than dragging a range's worth of history in.
    final view = ref.watch(moodProvider(1)).value;
    if (view == null || !view.enabled) return const SizedBox.shrink();

    final entry = view.today;
    final level = entry?.level;

    return _ToolCard(
      icon: entry == null
          ? Icons.sentiment_satisfied_outlined
          : Icons.mood_rounded,
      tint: level == null ? null : t.mood(level),
      title: entry == null ? 'How do you feel today?' : level!.label,
      detail: entry == null
          ? 'Ten seconds, one slider'
          : 'Tap to change today’s reading',
      onTap: () => MoodCheckIn.open(context),
    );
  }
}

/// The way into the screen-time breakdown and the advisor.
class _InsightsCard extends ConsumerWidget {
  const _InsightsCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final granted = ref.watch(wellbeingProvider).value?.granted ?? false;

    return _ToolCard(
      icon: Icons.auto_awesome_rounded,
      title: 'Insights',
      detail: granted
          ? 'Where your hours actually go'
          : 'See what your habits compete with',
      onTap: () => ref.toStats(1),
    );
  }
}

/// The repeating row in the Tools section.
class _ToolCard extends StatelessWidget {
  const _ToolCard({
    required this.icon,
    required this.title,
    required this.detail,
    required this.onTap,
    this.tint,
  });

  final IconData icon;
  final String title;
  final String detail;
  final VoidCallback onTap;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return SurfaceCard(
      tint: tint,
      padding: const EdgeInsets.all(Space.md),
      onTap: onTap,
      child: Row(
        children: [
          IconBadge(
            icon: icon,
            color: tint ?? t.accent,
            gradient: tint == null ? Grad.brand(t) : null,
          ),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: text.titleMedium?.copyWith(color: tint)),
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

/// One encouraging line, changing once a day.
///
/// Typographic rather than a card — it should read as a closing thought, not
/// another module competing with the data above it. See [DailyQuote] for why
/// this lives here and not in a notification.
class _DailyLine extends ConsumerWidget {
  const _DailyLine();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final score = ref.watch(dayScoreProvider);
    final quote = DailyQuote.forDay(
      CivilDate.today(),
      // A finished day earns the warmer pool.
      dayComplete: score.isComplete,
    );

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Motion.slow,
      curve: Motion.emphasised,
      builder: (context, v, child) => Opacity(
        opacity: v.clamp(0.0, 1.0),
        child: child,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(width: 26, height: 2, color: t.accent),
          const SizedBox(height: Space.md),
          Text(
            quote.line,
            style: text.titleMedium?.copyWith(
              height: 1.35,
              letterSpacing: -0.2,
              color: t.textSecondary,
            ),
          ),
          if (quote.attribution != null) ...[
            const SizedBox(height: Space.xs),
            Text(
              '— ${quote.attribution}',
              style: text.bodySmall?.copyWith(color: t.textMuted),
            ),
          ],
        ],
      ),
    );
  }
}
