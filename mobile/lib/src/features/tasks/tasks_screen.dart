import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/database.dart';
import '../../data/enums.dart';
import '../../data/providers.dart';
import '../../data/task_repository.dart';
import '../../domain/civil_date.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/count_up.dart';
import '../../ui/check_ring.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../settings/settings_screen.dart';
import '../shared/section_header.dart';
import 'task_editor.dart';

/// The planner.
///
/// Grouped by when a task is actually due rather than by an arbitrary list,
/// because "what is late and what is today" is the only question this screen
/// needs to answer at a glance. Overdue leads — burying late work under a flat
/// list is how planners quietly stop being used.
class TasksScreen extends ConsumerWidget {
  const TasksScreen({super.key, this.embedded = false});

  /// True when rendered inside the Plan screen's segmented control, which
  /// already supplies the title and the tab bar. Standalone use keeps its own
  /// header so the screen still works if it is ever pushed as a route.
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(taskBoardProvider);

    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(
        message: "Couldn't load your tasks.",
        detail: e.toString(),
        onRetry: () => ref.invalidate(taskBoardProvider),
      ),
      data: (board) => _Body(board: board, embedded: embedded),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.board, required this.embedded});

  final TaskBoard board;
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

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
            title: 'Tasks',
            trailing: board.openCount == 0 ? null : '${board.openCount} OPEN',
            actions: [
              HeaderAction(
                icon: Icons.settings_outlined,
                onTap: () => SettingsScreen.open(context),
              ),
            ],
          ),
          const SizedBox(height: Space.lg),
        ],

        if (board.isEmpty)
          EmptyView(
            title: 'Nothing on the list',
            message: "Tasks you add show up here, grouped by when they're due.",
            actionLabel: 'NEW TASK',
            onAction: () => TaskEditor.open(context),
          )
        else ...[
          _Summary(board: board),
          const SizedBox(height: Space.lg),

          if (board.overdue.isNotEmpty) ...[
            StatusNote(
              icon: Icons.error_outline_rounded,
              message: board.overdue.length == 1
                  ? 'One task is past its date.'
                  : '${board.overdue.length} tasks are past their date.',
              tint: t.danger,
            ),
            const SizedBox(height: Space.lg),
          ],

          _Group(label: 'Overdue', tasks: board.overdue, tint: t.danger,
              subtaskLabel: board.subtaskLabel),
          _Group(label: 'Today', tasks: board.today, tint: t.accent,
              subtaskLabel: board.subtaskLabel),
          _Group(label: 'Upcoming', tasks: board.upcoming,
              subtaskLabel: board.subtaskLabel),
          _Group(label: 'No date', tasks: board.someday,
              subtaskLabel: board.subtaskLabel),
          if (board.completed.isNotEmpty)
            _Group(
              label: 'Done today',
              tasks: board.completed,
              tint: t.success,
              subtaskLabel: board.subtaskLabel,
            ),

          if (board.openCount == 0 && board.completed.isNotEmpty) ...[
            Text('Everything on the list is done.',
                style: text.bodyMedium?.copyWith(color: t.success)),
            const SizedBox(height: Space.lg),
          ],

          // A courtesy for someone already at the bottom; the primary create
          // is the + in the Plan header.
          AppButton.outline(
            label: 'NEW TASK',
            onPressed: () => TaskEditor.open(context),
          ),
        ],
      ],
    );
  }
}

/// Three counts in one card.
///
/// Replaces a 150px ring whose number was "open tasks" — a ring implies a
/// fraction of something complete, and "17 open" is not that. The counts are
/// the honest shape of this data.
class _Summary extends StatelessWidget {
  const _Summary({required this.board});
  final TaskBoard board;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    return SurfaceCard(
      padding: const EdgeInsets.symmetric(
          horizontal: Space.md, vertical: Space.lg),
      child: Row(
        children: [
          _Count(
            value: board.overdue.length,
            label: 'OVERDUE',
            tint: board.overdue.isEmpty ? t.textMuted : t.danger,
          ),
          _Divider(),
          _Count(
            value: board.today.length,
            label: 'DUE TODAY',
            tint: t.accent,
          ),
          _Divider(),
          _Count(
            value: board.completed.length,
            label: 'DONE TODAY',
            tint: t.success,
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
        height: 34,
        color: context.aura.border,
      );
}

class _Count extends StatelessWidget {
  const _Count({required this.value, required this.label, required this.tint});

  final int value;
  final String label;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    return Expanded(
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
  }
}

class _Group extends StatelessWidget {
  const _Group({
    required this.label,
    required this.tasks,
    required this.subtaskLabel,
    this.tint,
  });

  final String label;
  final List<Task> tasks;

  /// Resolves a task's step progress, so the group does not have to know how
  /// the board stores it.
  final String? Function(String taskId) subtaskLabel;

  /// Colours the group label and its count only — never the rows, which stay
  /// neutral so the list reads as one thing.
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    if (tasks.isEmpty) return const SizedBox.shrink();
    final t = context.aura;

    return Padding(
      padding: const EdgeInsets.only(bottom: Space.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: tint ?? t.textMuted,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: Space.sm),
              SectionLabel(label, color: tint),
              const SizedBox(width: Space.sm),
              Text(
                '${tasks.length}',
                style: Theme.of(context)
                    .textTheme
                    .labelMedium
                    ?.copyWith(color: t.textMuted),
              ),
            ],
          ),
          const SizedBox(height: Space.sm),
          SurfaceCard(
            padding: const EdgeInsets.symmetric(horizontal: Space.md),
            child: Column(
              children: [
                for (var i = 0; i < tasks.length; i++)
                  _TaskRow(
                    task: tasks[i],
                    subtasks: subtaskLabel(tasks[i].id),
                    last: i == tasks.length - 1,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskRow extends ConsumerStatefulWidget {
  const _TaskRow({required this.task, required this.last, this.subtasks});

  final Task task;
  final bool last;

  /// '2 of 5', or null when the task has no steps.
  final String? subtasks;

  @override
  ConsumerState<_TaskRow> createState() => _TaskRowState();
}

class _TaskRowState extends ConsumerState<_TaskRow> {
  /// True during the moment between the tap and the write.
  ///
  /// The completion write is deliberately delayed: the instant version moved
  /// the row into "Done today" on the same frame as the tap, so the thing the
  /// user acted on vanished from under their finger and the tick was never
  /// seen. This holds the row in place, plays the tick, and only then lets the
  /// board regroup it — which is the moment that makes finishing feel like
  /// finishing.
  bool _celebrating = false;

  Task get task => widget.task;

  Future<void> _complete() async {
    final wasDone =
        TaskStatus.fromValue(task.status) == TaskStatus.completed;
    if (wasDone) {
      // Un-completing needs no ceremony.
      unawaited(HapticFeedback.selectionClick().catchError((_) {}));
      unawaited(ref.read(taskRepositoryProvider).toggle(task.id));
      return;
    }

    setState(() => _celebrating = true);
    unawaited(HapticFeedback.mediumImpact().catchError((_) {}));
    await Future<void>.delayed(const Duration(milliseconds: 1100));
    if (!mounted) {
      // The screen is gone but the intent was clear — the tap still counts.
      await ref.read(taskRepositoryProvider).toggle(task.id);
      return;
    }
    setState(() => _celebrating = false);
    unawaited(ref.read(taskRepositoryProvider).toggle(task.id));
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final done = _celebrating ||
        TaskStatus.fromValue(task.status) == TaskStatus.completed;
    final priority = TaskPriority.fromValue(task.priority);

    return Dismissible(
      key: ValueKey(task.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: Space.md),
        child: Icon(Icons.delete_outline_rounded,
            color: t.danger, size: Dimens.iconMd),
      ),
      onDismissed: (_) {
        unawaited(HapticFeedback.mediumImpact().catchError((_) {}));
        unawaited(ref.read(taskRepositoryProvider).delete(task.id));
      },
      child: InkWell(
        onTap: _celebrating ? null : _complete,
        onLongPress: () => TaskEditor.open(context, task: task),
        splashColor: t.accent.withValues(alpha: Alphas.splash),
        highlightColor: t.accent.withValues(alpha: Alphas.highlight),
        child: AnimatedContainer(
          duration: Motion.base,
          decoration: BoxDecoration(
            // A wash of success while the tick lands, so the whole row takes
            // part in the moment rather than only the ring.
            color: _celebrating
                ? t.success.withValues(alpha: Alphas.tint)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(Radii.sm),
            border: widget.last || _celebrating
                ? null
                : Border(
                    bottom:
                        BorderSide(color: t.border, width: Dimens.hairline),
                  ),
          ),
          padding: const EdgeInsets.symmetric(vertical: Space.md),
          child: Row(
            children: [
              CheckRing(done: done, tint: done ? t.success : null),
              const SizedBox(width: Space.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.title,
                      style: text.bodyLarge?.copyWith(
                        color: done ? t.textMuted : t.textPrimary,
                        decoration:
                            done ? TextDecoration.lineThrough : null,
                        decorationColor: t.textMuted,
                      ),
                    ),
                    if (_meta(priority).isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(_meta(priority),
                          style: text.labelMedium
                              ?.copyWith(color: t.textMuted)),
                    ],
                  ],
                ),
              ),
              // High priority earns one mark. Anything more (a coloured pill
              // per level) turns the list into a traffic light.
              if (priority == TaskPriority.high && !done)
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: t.warn.withValues(alpha: Alphas.tint),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.priority_high_rounded,
                      size: 13, color: t.warn),
                ),
              // Edit — and therefore delete, which lives inside the editor.
              // Both were previously reachable only by long-press, which is
              // why people reported the app had no way to delete a task.
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => TaskEditor.open(context, task: task),
                child: Padding(
                  padding: const EdgeInsets.only(left: Space.sm),
                  child: Icon(Icons.edit_outlined,
                      size: Dimens.iconMd, color: t.textMuted),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _meta(TaskPriority priority) {
    final parts = <String>[];
    if (task.dueDate != null) parts.add(_friendlyDate(task.dueDate!));
    // Progress before category: "2 OF 5 STEPS" is the reason to open the task,
    // and the category rarely is.
    final subtasks = widget.subtasks;
    if (subtasks != null) parts.add('${subtasks.toUpperCase()} STEPS');
    if (task.category != null && task.category!.isNotEmpty) {
      parts.add(task.category!.toUpperCase());
    }
    return parts.join('   ·   ');
  }

  /// Relative where it helps, absolute where it doesn't. "In 40 days" is worse
  /// than a date.
  static String _friendlyDate(String iso) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG',
        'SEP', 'OCT', 'NOV', 'DEC'];
    final today = CivilDate.today();
    final d = CivilDate.parse(iso);
    final delta = today.daysUntil(d);

    if (delta == 0) return 'TODAY';
    if (delta == 1) return 'TOMORROW';
    if (delta == -1) return 'YESTERDAY';
    if (delta < 0) return '${-delta} DAYS AGO';
    if (delta <= 6) return 'IN $delta DAYS';
    return '${d.day} ${months[d.month - 1]}';
  }
}
