import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/enums.dart';
import '../../data/habit_repository.dart';
import '../../data/providers.dart';
import '../../domain/civil_date.dart';
import '../../theme/habit_categories.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/surface_card.dart';
import '../../ui/check_ring.dart';
import '../../ui/state_views.dart';
import '../calendar/calendar_screen.dart';
import '../../ui/week_strip.dart';
import '../shared/section_header.dart';
import '../challenge/circles_screen.dart';
import 'habit_cap_sheet.dart';
import 'habit_editor.dart';
import 'habit_finder_screen.dart';
import 'habit_detail_screen.dart';
import 'habit_order_screen.dart';

/// Today's habits.
///
/// The rules that keep this from drifting back toward a generic checklist:
///
/// * **What is left comes first.** Completed habits sink to their own section
///   at the bottom, dimmed. A flat list in creation order makes you re-scan the
///   whole thing every time you check something off, and the list gets *harder*
///   to read as the day goes well — exactly backwards.
/// * **Done is dimmed, never struck through.** Strikethrough is a to-do-list
///   convention that defaces the text and makes a good day illegible.
/// * **Three separate targets per card.** The ring completes, the card opens
///   the history, the pencil edits. One tap doing different things depending on
///   where it landed is the bug this avoids.
/// * **Nothing is deleted from view.** Finished habits stay on screen. Removing
///   them makes a completed day look empty, which is the opposite of the
///   feeling the screen should end on.
class HabitsScreen extends ConsumerWidget {
  const HabitsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(todayHabitsProvider);
    // Watched here so the button label reflects the cap without each call site
    // re-deriving it.
    ref.watch(habitCapProvider);

    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(
        message: "Couldn't load your habits.",
        detail: e.toString(),
        onRetry: () => ref.invalidate(todayHabitsProvider),
      ),
      data: (habits) => _Body(habits: habits),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.habits});
  final List<HabitToday> habits;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final today = CivilDate.today();

    final done = habits.where((h) => h.isDone).length;
    final total = habits.length;

    final best = habits.isEmpty
        ? 0
        : habits.map((h) => h.streak).reduce((a, b) => a > b ? a : b);
    final pending = habits.where((h) => !h.isDone).toList();
    final finished = habits.where((h) => h.isDone).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(
          Space.lg, Space.sm, Space.lg, Dimens.scrollBottomInset),
      children: [
        ScreenTitle(
          title: 'Habits',
          trailing: _dateLabel(today),
          actions: [
            HeaderAction(
              icon: Icons.swap_vert_rounded,
              tooltip: 'Arrange & edit',
              onTap: () => HabitOrderScreen.open(context),
            ),
            HeaderAction(
              icon: Icons.calendar_month_outlined,
              tooltip: 'Calendar',
              onTap: () => CalendarScreen.open(context),
            ),
          ],
        ),
        const SizedBox(height: Space.lg),

        if (total > 0) ...[
          // One card, not two. The week strip and the three counters were
          // separate blocks that between them pushed the first habit below the
          // fold on a small phone — on the screen whose entire job is showing
          // habits.
          _HeroCard(done: done, total: total, best: best, habits: habits),
          const SizedBox(height: Space.lg),

          const _StreakProtectionNote(),

          if (pending.isNotEmpty) ...[
            SectionLabel(
              'To do',
              action: Text(
                '${pending.length} left',
                style: text.bodySmall?.copyWith(color: t.textSecondary),
              ),
            ),
            const SizedBox(height: Space.sm),
            for (final h in pending)
              Padding(
                padding: const EdgeInsets.only(bottom: Space.sm),
                child: _HabitCard(entry: h),
              ),
          ] else
            StatusNote(
              icon: Icons.check_rounded,
              message: "Every habit done. That's the whole job.",
              tint: t.success,
            ),

          if (finished.isNotEmpty) ...[
            const SizedBox(height: Space.lg),
            SectionLabel(
              'Done today',
              color: t.success,
              action: Text(
                '${finished.length}',
                style: text.bodySmall?.copyWith(color: t.textMuted),
              ),
            ),
            const SizedBox(height: Space.sm),
            for (final h in finished)
              Padding(
                padding: const EdgeInsets.only(bottom: Space.sm),
                child: _HabitCard(entry: h),
              ),
          ],

          const SizedBox(height: Space.md),
          const _NewHabitButton(),

          const SizedBox(height: Space.sm),
          const _FinderPromo(),

          // The habits page is where the showing-up happens, so it is where
          // the circle earns its pitch: the work someone just did here is
          // exactly what scores there.
          const SizedBox(height: Space.lg),
          const _CirclePromo(),
        ] else
          _EmptyDay(onCreate: () => openHabitEditorRespectingCap(context, ref)),
      ],
    );
  }

  static String _dateLabel(CivilDate d) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
        'FRIDAY', 'SATURDAY'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG',
        'SEP', 'OCT', 'NOV', 'DEC'];
    return '${days[d.dow]} · ${d.day} ${months[d.month - 1]}';
  }
}

/// Create button that reflects, and enforces, the free limit.
class _NewHabitButton extends ConsumerWidget {
  const _NewHabitButton();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final cap = ref.watch(habitCapProvider).value;

    return Column(
      children: [
        AppButton.primary(
          label: 'NEW HABIT',
          onPressed: () => openHabitEditorRespectingCap(context, ref),
        ),
        // The limit is stated before it bites. A cap the user only discovers by
        // being blocked feels like a bait-and-switch.
        if (cap != null && !cap.isPro) ...[
          const SizedBox(height: Space.sm),
          Text(
            cap.canCreate
                ? '${cap.counted} of ${cap.limit} on the free plan'
                : 'Free plan full — Pro removes the limit',
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: cap.canCreate ? t.textMuted : t.accent),
          ),
        ],
      ],
    );
  }
}

/// Streak freezes: what is banked, and what has recently been spent.
///
/// A freeze that is applied silently is worthless — the user never learns the
/// app protected them, and the first they hear of it is a streak number that
/// looks wrong. This says it out loud for three days, then goes quiet.
class _StreakProtectionNote extends ConsumerWidget {
  const _StreakProtectionNote();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final protection = ref.watch(streakProtectionProvider).value;
    if (protection == null || !protection.hasAny) {
      return const SizedBox.shrink();
    }

    final saves = protection.recentSaves;

    return Padding(
      padding: const EdgeInsets.only(bottom: Space.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (saves.isNotEmpty) ...[
            StatusNote(
              icon: Icons.ac_unit_rounded,
              message: saves.length == 1
                  ? 'Streak saved. ${saves.first.habitTitle} was covered on '
                      '${_dayName(saves.first.date)}.'
                  : '${saves.length} streaks saved. A save covered the days '
                      'you missed.',
              tint: t.accent,
            ),
            if (protection.balance > 0) const SizedBox(height: Space.sm),
          ],
          if (protection.balance > 0)
            Text(
              '${protection.balance} '
              'streak ${protection.balance == 1 ? 'save' : 'saves'} banked · '
              'used automatically on a day you miss',
              style: text.bodySmall?.copyWith(color: t.textMuted),
            ),
        ],
      ),
    );
  }

  static String _dayName(String iso) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday'];
    return days[CivilDate.parse(iso).dow];
  }
}

/// Opens the editor, or explains the limit.
///
/// One entry point so a future create affordance cannot accidentally bypass the
/// cap — the check lives here rather than at each button.
Future<void> openHabitEditorRespectingCap(
  BuildContext context,
  WidgetRef ref,
) async {
  final isPro = ref.read(isProProvider);
  final cap = await ref.read(habitRepositoryProvider).capStatus(isPro: isPro);
  if (!context.mounted) return;

  if (cap.canCreate) {
    await HabitEditor.open(context);
  } else {
    await HabitCapSheet.open(context, cap);
  }
}

/// A habit, as its own card.
///
/// Was a row inside one long bordered list, which made twelve habits read as a
/// spreadsheet. A card each gives the check target room, puts the seven-day
/// trail directly under the title where it can be read, and leaves space for a
/// visible edit control.
///
/// Three separate tap targets, deliberately: the ring completes, the card
/// opens the habit's history, the pencil edits. Previously all three lived on
/// one row behind tap and long-press, and editing was undiscoverable.
/// The way into the habit finder for people who already have habits — the
/// "what am I missing?" moment.
class _FinderPromo extends StatelessWidget {
  const _FinderPromo();

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
                Text('Not sure what to build?', style: text.titleSmall),
                const SizedBox(height: 2),
                Text(
                  'Five taps and StayHardy suggests a routine for you.',
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

/// One quiet line for the StayHardy Circle — a pointer, not a banner.
class _CirclePromo extends ConsumerWidget {
  const _CirclePromo();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final circles = ref.watch(myCirclesProvider).value;
    final inGlobal = circles?.any((c) => c.isGlobal) ?? false;

    return SurfaceCard(
      padding: const EdgeInsets.symmetric(
          horizontal: Space.lg, vertical: Space.md),
      onTap: () => CirclesScreen.open(context),
      child: Row(
        children: [
          Icon(Icons.public_rounded, size: Dimens.iconMd, color: t.accent),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('StayHardy Circle', style: text.titleSmall),
                const SizedBox(height: 2),
                Text(
                  inGlobal
                      ? 'Days like this are how you climb the board.'
                      : 'Perfect days score points against every user.',
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

class _HabitCard extends ConsumerStatefulWidget {
  const _HabitCard({required this.entry});
  final HabitToday entry;

  @override
  ConsumerState<_HabitCard> createState() => _HabitCardState();
}

class _HabitCardState extends ConsumerState<_HabitCard> {
  /// True during the moment between the tap and the write.
  ///
  /// Same contract as the task row: the instant version moved the card into
  /// "Done today" on the same frame as the tap, so the thing the user acted
  /// on vanished from under their finger. This holds the card in place, plays
  /// the tick and a success wash, and only then lets the list regroup.
  bool _celebrating = false;

  HabitToday get entry => widget.entry;

  Future<void> _complete() async {
    if (entry.isDone) {
      // Un-checking needs no ceremony.
      unawaited(HapticFeedback.selectionClick().catchError((_) {}));
      unawaited(ref.read(habitRepositoryProvider).toggle(entry.habit.id));
      return;
    }

    // Captured before the hold so the write cannot be lost to a dispose —
    // the tap already happened; the ceremony must never eat it.
    final repo = ref.read(habitRepositoryProvider);
    setState(() => _celebrating = true);
    unawaited(HapticFeedback.mediumImpact().catchError((_) {}));
    await Future<void>.delayed(const Duration(milliseconds: 1200));
    if (mounted) setState(() => _celebrating = false);
    unawaited(repo.toggle(entry.habit.id));
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final category = HabitCategories.resolve(entry.habit.category);
    final colour = category.colorOf(context);
    final done = _celebrating || entry.isDone;

    // Completed cards recede rather than disappear: no shadow, no border
    // emphasis, contents at reduced opacity. They are still readable and still
    // tappable — a finished day should look finished, not empty. The card in
    // its celebration moment stays at full strength with a success wash.
    return Dismissible(
      key: ValueKey('habit-${entry.habit.id}'),
      // Swipe right-to-left to complete — the everyday gesture. Completed
      // cards don't dismiss; un-checking stays a deliberate tap on the ring.
      direction:
          entry.isDone ? DismissDirection.none : DismissDirection.endToStart,
      confirmDismiss: (_) async {
        unawaited(_complete());
        // Never actually removed — the write regroups the list itself.
        return false;
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: Space.lg),
        decoration: BoxDecoration(
          color: t.success.withValues(alpha: Alphas.tintStrong),
          borderRadius: BorderRadius.circular(Radii.md),
        ),
        child: Icon(Icons.check_rounded, color: t.success),
      ),
      child: Opacity(
        opacity: entry.isDone && !_celebrating ? 0.62 : 1,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(Radii.md),
          child: Stack(
            children: [
          SurfaceCard(
            elevated: !done,
            padding: const EdgeInsets.symmetric(
                horizontal: Space.md, vertical: Space.md),
            onTap: () => HabitDetailScreen.open(context, entry.habit.id),
            child: Row(
              children: [
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: _complete,
                  child: Padding(
                    padding: const EdgeInsets.only(right: Space.md),
                    child: CheckRing(done: done, size: 28),
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          _GlyphPop(
                            child: category.glyph(
                                size: Dimens.iconSm, color: colour),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: AnimatedDefaultTextStyle(
                              duration: Motion.base,
                              curve: Motion.curve,
                              style: (text.bodyLarge ?? const TextStyle())
                                  .copyWith(
                                // Dimmed, never struck through.
                                color: entry.isDone && !_celebrating
                                    ? t.textMuted
                                    : t.textPrimary,
                              ),
                              child: Text(
                                entry.habit.title,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                          if (entry.streak > 0)
                            _StreakBadge(days: entry.streak),
                        ],
                      ),
                      const SizedBox(height: Space.sm),
                      Row(
                        children: [
                          HabitTrail(trail: entry.trail),
                          const SizedBox(width: Space.sm),
                          Expanded(
                            child: Text(
                              _meta(category.name),
                              style: text.labelMedium
                                  ?.copyWith(color: t.textMuted),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
              // The "it counted" moment: a green wash sweeping across the
              // whole card, left to right, over the second before it retires
              // to Done. No bar, no percentage — just the day filling up.
              if (_celebrating)
                Positioned.fill(
                  child: IgnorePointer(
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: 1),
                      duration: const Duration(milliseconds: 950),
                      curve: Motion.emphasised,
                      builder: (context, f, _) => Align(
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          widthFactor: f,
                          heightFactor: 1,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  t.success.withValues(
                                      alpha: Alphas.tintStrong),
                                  t.success
                                      .withValues(alpha: Alphas.tint),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _meta(String categoryName) {
    final parts = <String>[categoryName.toUpperCase()];
    if (entry.isFlexible) {
      parts.add('${entry.periodProgress} OF ${entry.periodTarget} THIS WEEK');
    }
    if (HabitType.fromValue(entry.habit.habitType) == HabitType.negative) {
      parts.add('ABSTAIN');
    }
    return parts.join('   ·   ');
  }
}

/// A little life for the category mark: it lands with a spring and a small
/// settling turn on every page visit. One-shot on purpose — icons that spin
/// forever stop meaning anything within a day.
class _GlyphPop extends StatelessWidget {
  const _GlyphPop({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 650),
      curve: Curves.elasticOut,
      builder: (context, v, c) => Transform.rotate(
        angle: (1 - v) * -0.6,
        child: Transform.scale(scale: 0.55 + 0.45 * v, child: c),
      ),
      child: child,
    );
  }
}

class _StreakBadge extends StatelessWidget {
  const _StreakBadge({required this.days});
  final int days;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: t.warn.withValues(alpha: Alphas.tint),
        borderRadius: BorderRadius.circular(Radii.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.local_fire_department_rounded, size: 13, color: t.warn),
          const SizedBox(width: 3),
          Text(
            '$days',
            style: Theme.of(context)
                .textTheme
                .labelLarge
                ?.copyWith(color: t.warn),
          ),
        ],
      ),
    );
  }
}

/// The week and today's counters, in one block.
///
/// Was two separate cards. Between them they pushed the first habit below the
/// fold on a small phone — on the screen whose entire job is showing habits.
class _HeroCard extends ConsumerWidget {
  const _HeroCard({
    required this.done,
    required this.total,
    required this.best,
    required this.habits,
  });

  final int done;
  final int total;
  final int best;
  final List<HabitToday> habits;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final days = ref.watch(thisWeekProvider).value ?? const <DayTally>[];

    return SurfaceCard(
      gradient: Grad.surfaceWash(t),
      padding: const EdgeInsets.fromLTRB(Space.md, Space.lg, Space.md, Space.md),
      child: Column(
        children: [
          if (days.isNotEmpty) ...[
            WeekStrip(
              today: CivilDate.today(),
              days: [
                for (final d in days)
                  WeekDay(
                    date: d.date,
                    scheduled: d.scheduled,
                    completed: d.completed,
                  ),
              ],
            ),
            const SizedBox(height: Space.lg),
            Divider(color: t.border, height: Dimens.hairline),
            const SizedBox(height: Space.md),
          ],
          Row(
            children: [
              _Stat(
                icon: Icons.local_fire_department_rounded,
                tint: best > 0 ? t.warn : t.textMuted,
                value: '$best',
                label: 'BEST STREAK',
              ),
              _StatDivider(),
              _Stat(
                icon: Icons.check_circle_outline_rounded,
                tint: t.accent,
                value: '$done/$total',
                label: 'DONE TODAY',
              ),
              _StatDivider(),
              _Stat(
                icon: Icons.event_repeat_rounded,
                tint: t.secondary,
                value: '${habits.where((h) => h.isFlexible).length}',
                label: 'FLEXIBLE',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Nothing scheduled — an invitation, not an apology.
class _EmptyDay extends StatelessWidget {
  const _EmptyDay({required this.onCreate});
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return SurfaceCard(
      gradient: Grad.surfaceWash(t),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconBadge(
            icon: Icons.bolt_rounded,
            color: t.accent,
            gradient: Grad.brand(t),
            size: 44,
          ),
          const SizedBox(height: Space.md),
          Text('Nothing scheduled today', style: text.titleLarge),
          const SizedBox(height: Space.xs),
          Text(
            'Either today is a rest day, or there is nothing here yet. Start '
            'with one habit you could keep on your worst day.',
            style: text.bodyMedium?.copyWith(color: t.textSecondary),
          ),
          const SizedBox(height: Space.lg),
          Builder(
            builder: (context) => AppButton.primary(
              label: 'FIND MY HABITS',
              onPressed: () => HabitFinderScreen.open(context),
            ),
          ),
          const SizedBox(height: Space.sm),
          Center(
            child:
                AppButton.text(label: 'I KNOW WHAT I WANT', onPressed: onCreate),
          ),
        ],
      ),
    );
  }
}

class _StatDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
        width: Dimens.hairline,
        height: 34,
        color: context.aura.border,
      );
}

/// One cell of the summary card.
class _Stat extends StatelessWidget {
  const _Stat({
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
      child: Column(
        children: [
          Icon(icon, size: Dimens.iconSm, color: tint),
          const SizedBox(height: 6),
          Text(value, style: AuraType.numeral(20, color: t.textPrimary)),
          const SizedBox(height: 3),
          Text(label,
              style: Theme.of(context).textTheme.labelMedium,
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
