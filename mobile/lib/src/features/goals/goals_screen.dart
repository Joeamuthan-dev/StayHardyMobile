import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/goal_repository.dart';
import '../../data/providers.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/check_ring.dart';
import '../../ui/progress_rule.dart';
import '../../ui/progress_ring.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../../ui/app_button.dart';
import '../../ui/count_up.dart';
import '../shared/section_header.dart';
import '../../data/enums.dart';
import 'goal_celebration.dart';
import 'goal_editor.dart';

/// Goals, with progress derived from real work rather than a stored number.
class GoalsScreen extends ConsumerWidget {
  const GoalsScreen({super.key, this.embedded = false});

  /// True when rendered inside the Plan screen's segmented control, which
  /// already supplies the title and the tab bar.
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(goalsProvider);

    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(
        message: "Couldn't load your goals.",
        detail: e.toString(),
        onRetry: () => ref.invalidate(goalsProvider),
      ),
      data: (goals) {
        final active = goals.where((g) => !g.isComplete).toList();
        final done = goals.where((g) => g.isComplete).toList();

        return ListView(
          padding: EdgeInsets.fromLTRB(
            Space.lg,
            embedded ? 0 : Space.sm,
            Space.lg,
            Dimens.scrollBottomInset,
          ),
          children: [
            if (!embedded) ...[
              ScreenTitle(
                title: 'Goals',
                trailing: active.isEmpty ? null : '${active.length} ACTIVE',
              ),
              const SizedBox(height: Space.lg),
            ],
            if (active.isNotEmpty || done.isNotEmpty) ...[
              _Summary(active: active, done: done),
              const SizedBox(height: Space.lg),
            ],
            if (active.isEmpty && done.isEmpty)
              EmptyView(
                title: 'No goals yet',
                message: 'Goals give your habits somewhere to point.',
                actionLabel: 'NEW GOAL',
                onAction: () => GoalEditor.open(context),
              ),
            for (final g in active) _GoalCard(view: g),
            // The bottom courtesy button shows only when there is a list to
            // be at the bottom OF — with zero goals it doubled the empty
            // state's own CTA, and two identical buttons read as a bug.
            if (active.isNotEmpty || done.isNotEmpty) ...[
              const SizedBox(height: Space.sm),
              AppButton.outline(
                label: 'NEW GOAL',
                onPressed: () => GoalEditor.open(context),
              ),
            ],
            if (done.isNotEmpty) ...[
              const SizedBox(height: Space.xl),
              const SectionLabel('Achieved'),
              const SizedBox(height: Space.md),
              for (final g in done) _GoalCard(view: g),
            ],
          ],
        );
      },
    );
  }
}

class _GoalCard extends ConsumerWidget {
  const _GoalCard({required this.view});
  final GoalView view;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final g = view.goal;
    final complete = view.isComplete;

    return Padding(
      padding: const EdgeInsets.only(bottom: Space.md),
      child: SurfaceCard(
        onTap: () => GoalEditor.open(context, goal: g),
        child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  g.name,
                  style: text.titleLarge?.copyWith(
                    color: complete ? t.textMuted : t.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: Space.sm),
              // Explicit, because "tap the card to edit" is not discoverable
              // and delete lives inside the editor.
              Icon(Icons.edit_outlined,
                  size: Dimens.iconMd, color: t.textMuted),
              const SizedBox(width: Space.sm),
              ProgressRing(
                fraction: view.progress / 100,
                size: 52,
                stroke: 5,
                glow: false,
                color: complete
                    ? t.success
                    : (view.isOverdue ? t.danger : null),
                child: Text(
                  '${view.progress}',
                  style: AuraType.numeral(
                    16,
                    color: complete ? t.success : t.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          if (g.description != null) ...[
            const SizedBox(height: 4),
            Text(g.description!,
                style: text.bodyMedium?.copyWith(color: t.textMuted)),
          ],
          const SizedBox(height: Space.lg),
          // The bar draws itself to the real value — progress arriving, not
          // progress already filed away.
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: view.progress / 100),
            duration: Motion.slow,
            curve: Motion.emphasised,
            builder: (context, f, _) => ProgressRule(
              fraction: f,
              color: complete
                  ? t.success
                  : (view.isOverdue ? t.danger : null),
            ),
          ),
          const SizedBox(height: Space.md),
          Row(
            children: [
              Expanded(child: Text(_meta(), style: text.labelMedium)),
              _StatusPill(view: view),
              const SizedBox(width: Space.md),
              // The finishing control lives on the card's action row, not
              // wedged between the edit pencil and the ring where it was one
              // grey glyph among three and read as decoration.
              _CompleteTick(view: view),
            ],
          ),


          if (view.milestonesTotal > 0 && !complete) ...[
            const SizedBox(height: Space.md),
            Divider(color: t.border, height: Dimens.hairline, thickness: Dimens.hairline),
            const SizedBox(height: Space.sm),
            _Milestones(goalId: g.id),
          ],
          ],
        ),
      ),
    );
  }

  String _meta() {
    final parts = <String>[];
    if (view.milestonesTotal > 0) {
      parts.add('${view.milestonesDone}/${view.milestonesTotal} MILESTONES');
    }
    if (view.linkedHabits > 0) {
      parts.add('${view.linkedHabits} LINKED HABITS');
    }
    return parts.join('   ·   ');
  }
}

/// Days remaining, or why the goal needs attention.
/// Mark a goal achieved — at any point, not only at 100%.
///
/// The app used to offer this only once computed progress reached 100, which
/// meant a goal the user had genuinely finished in real life could not be
/// closed: "Close 1 loan" sits at 0% until the milestones say otherwise, and
/// the loan being paid off is a fact about the world, not about the app. A
/// tracker that will not let you say "this is done" is arguing with its user.
///
/// Completing below 100% asks first, because it is the one tap that ends a
/// goal early. Completing at 100% does not — the user has already earned it
/// and a confirmation there is just a door held shut for no reason.
class _CompleteTick extends ConsumerWidget {
  const _CompleteTick({required this.view});

  final GoalView view;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final done = view.isComplete;
    final ready = view.progress >= 100;

    // Green throughout: this is the one control on the card that means
    // "finished", and a grey tick beside a grey pencil read as another piece
    // of chrome rather than the action it is.
    final green = t.success;

    return Tooltip(
      message: done ? 'Reopen this goal' : 'Mark achieved',
      child: Semantics(
        button: true,
        label: done ? 'Reopen goal' : 'Mark goal achieved',
        child: InkResponse(
          radius: 28,
          onTap: () => done
              ? _reopen(context, ref)
              : completeGoal(context, ref, view),
          child: Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              // Filled when it is done, and filled-but-lighter the moment the
              // goal is finishable — so the tap is invited at exactly the
              // moment it is worth making.
              color: done
                  ? green
                  : green.withValues(alpha: ready ? 0.22 : 0.10),
              border: Border.all(
                color: green.withValues(alpha: done || ready ? 1 : 0.45),
                width: done || ready ? 1.6 : 1.2,
              ),
              boxShadow: ready && !done
                  ? [
                      BoxShadow(
                        color: green.withValues(alpha: 0.35),
                        blurRadius: 10,
                      ),
                    ]
                  : null,
            ),
            child: Icon(
              Icons.check_rounded,
              size: 20,
              color: done ? t.onAccent : green,
            ),
          ),
        ),
      ),
    );
  }

  /// A mis-tap must be undoable. Without this the tick is a one-way door and
  /// the safest thing a careful user could do is never press it.
  Future<void> _reopen(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: context.aura.surfaceHigh,
        title: const Text('Reopen this goal?'),
        content: Text('"${view.goal.name}" will go back to active.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(c).pop(false),
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () => Navigator.of(c).pop(true),
            child: const Text('REOPEN'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await ref
        .read(goalRepositoryProvider)
        .setStatus(view.goal.id, GoalStatus.active);
    ref.invalidate(goalsProvider);
  }
}

/// Complete a goal, confirming first when it is being ended early.
Future<void> completeGoal(
  BuildContext context,
  WidgetRef ref,
  GoalView view,
) async {
  if (view.progress < 100) {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: context.aura.surfaceHigh,
        title: const Text('Mark this achieved?'),
        content: Text(
          '"${view.goal.name}" is tracking at ${view.progress}%. Marking it '
          'achieved closes it now — you can reopen it later if you need to.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(c).pop(false),
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () => Navigator.of(c).pop(true),
            child: const Text('MARK ACHIEVED'),
          ),
        ],
      ),
    );
    if (ok != true) return;
  }

  await ref
      .read(goalRepositoryProvider)
      .setStatus(view.goal.id, GoalStatus.completed);
  ref.invalidate(goalsProvider);
  if (context.mounted) {
    await GoalCelebration.show(context, view.goal.name);
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.view});
  final GoalView view;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    final (label, color) = switch (view) {
      _ when view.isComplete => ('ACHIEVED', t.success),
      _ when view.isOverdue => ('${-view.daysRemaining!} DAYS OVER', t.danger),
      _ when view.daysRemaining != null =>
        ('${view.daysRemaining} DAYS LEFT', t.textMuted),
      _ => ('NO DEADLINE', t.textMuted),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: Alphas.tint),
        borderRadius: BorderRadius.circular(Radii.pill),
      ),
      child: Text(label, style: text.labelMedium?.copyWith(color: color)),
    );
  }
}

class _Milestones extends ConsumerWidget {
  const _Milestones({required this.goalId});
  final String goalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final repo = ref.watch(goalRepositoryProvider);

    return FutureBuilder(
      // Rebuilt whenever the goals stream re-emits, which a milestone toggle
      // triggers via the goal_milestones table.
      future: repo.milestonesFor(goalId),
      builder: (context, snap) {
        final items = snap.data ?? const [];
        if (items.isEmpty) return const SizedBox.shrink();
        return Column(
          children: [
            for (final m in items)
              InkWell(
                onTap: () {
                  unawaited(
                      HapticFeedback.selectionClick().catchError((_) {}));
                  unawaited(ref
                      .read(goalRepositoryProvider)
                      .toggleMilestone(m.id, !m.done));
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: Space.sm),
                  child: Row(
                    children: [
                      CheckRing(done: m.done, size: Dimens.iconSm + 3),
                      const SizedBox(width: Space.sm),
                      Expanded(
                        child: Text(
                          m.title,
                          style: text.bodyMedium?.copyWith(
                            color: m.done ? t.textMuted : t.textSecondary,
                          ),
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


/// Three counts, matching the Tasks tab so the two halves of Plan read as one
/// screen rather than as two apps sharing a tab bar.
class _Summary extends StatelessWidget {
  const _Summary({required this.active, required this.done});

  final List<GoalView> active;
  final List<GoalView> done;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final overdue = active.where((g) => g.isOverdue).length;

    Widget cell(int value, String label, Color tint) => Expanded(
          child: Column(
            children: [
              // Counts rise from zero on every visit — the page waking up.
              CountUp(value: value, style: AuraType.numeral(26, color: tint)),
              const SizedBox(height: 5),
              Text(
                label,
                style: Theme.of(context).textTheme.labelMedium,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        );

    Widget divider() => Container(
          width: Dimens.hairline,
          height: 34,
          color: t.border,
        );

    return SurfaceCard(
      padding: const EdgeInsets.symmetric(
          horizontal: Space.md, vertical: Space.lg),
      child: Row(
        children: [
          cell(active.length, 'IN PROGRESS', t.accent),
          divider(),
          cell(done.length, 'ACHIEVED', t.success),
          divider(),
          cell(overdue, 'PAST DATE', overdue == 0 ? t.textMuted : t.danger),
        ],
      ),
    );
  }
}
