import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/database.dart';
import '../../data/enums.dart';
import '../../data/providers.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/check_ring.dart';

/// Subtasks, inside the task editor.
///
/// **One level deep, enforced by the fact that this widget is never rendered
/// for a subtask.** A tree at phone width is a trap: it needs indentation
/// nobody can see, drag-to-reparent nobody can hit, and a "which level am I
/// adding to" question at every tap. One level covers the real case — a task
/// with a handful of steps — and costs none of that.
///
/// Editing is deliberately minimal: a title, a tick, a delete. A subtask with
/// its own due date and priority is just a task, and should be one.
class SubtaskList extends ConsumerStatefulWidget {
  const SubtaskList({super.key, required this.parent});

  /// Null while the parent is still being created — subtasks need a parent id
  /// to hang off, so the section explains that instead of silently vanishing.
  final Task? parent;

  @override
  ConsumerState<SubtaskList> createState() => _SubtaskListState();
}

class _SubtaskListState extends ConsumerState<SubtaskList> {
  final _controller = TextEditingController();
  List<Task> _subtasks = const [];
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final parent = widget.parent;
    if (parent == null) {
      setState(() => _loaded = true);
      return;
    }
    final subtasks =
        await ref.read(taskRepositoryProvider).subtasksOf(parent.id);
    if (mounted) {
      setState(() {
        _subtasks = subtasks;
        _loaded = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final parent = widget.parent;

    if (parent == null) {
      return Text(
        'Save this task first, then you can break it into steps.',
        style: text.bodySmall?.copyWith(color: t.textMuted),
      );
    }
    if (!_loaded) return const SizedBox(height: Space.xl);

    final done = _subtasks
        .where((s) => TaskStatus.fromValue(s.status) == TaskStatus.completed)
        .length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_subtasks.isNotEmpty) ...[
          Text('$done of ${_subtasks.length} done',
              style: text.bodySmall?.copyWith(color: t.textMuted)),
          const SizedBox(height: Space.sm),
        ],
        for (final subtask in _subtasks) _SubtaskRow(
          subtask: subtask,
          onToggle: () => _toggle(subtask),
          onDelete: () => _delete(subtask),
        ),
        const SizedBox(height: Space.sm),
        TextField(
          controller: _controller,
          textCapitalization: TextCapitalization.sentences,
          // Keeps the keyboard up so several steps can be added in a row —
          // adding one at a time and re-tapping the field is what makes
          // subtask UIs feel like a chore.
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _add(),
          decoration: InputDecoration(
            hintText: 'Add a step',
            suffixIcon: IconButton(
              icon: Icon(Icons.add_rounded, color: t.accent),
              onPressed: _add,
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _add() async {
    final title = _controller.text.trim();
    final parent = widget.parent;
    if (title.isEmpty || parent == null) return;

    unawaited(HapticFeedback.selectionClick().catchError((_) {}));
    _controller.clear();
    await ref.read(taskRepositoryProvider).create(
          title: title,
          parentTaskId: parent.id,
          // Deliberately inherits nothing else. A step is due when its parent
          // is due, and giving it its own date invites two dates that disagree.
        );
    await _load();
  }

  Future<void> _toggle(Task subtask) async {
    unawaited(HapticFeedback.selectionClick().catchError((_) {}));
    await ref.read(taskRepositoryProvider).toggle(subtask.id);
    await _load();
  }

  Future<void> _delete(Task subtask) async {
    await ref.read(taskRepositoryProvider).delete(subtask.id);
    await _load();
  }
}

class _SubtaskRow extends StatelessWidget {
  const _SubtaskRow({
    required this.subtask,
    required this.onToggle,
    required this.onDelete,
  });

  final Task subtask;
  final VoidCallback onToggle;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final done =
        TaskStatus.fromValue(subtask.status) == TaskStatus.completed;

    return InkWell(
      onTap: onToggle,
      splashColor: t.accent.withValues(alpha: Alphas.splash),
      highlightColor: t.accent.withValues(alpha: Alphas.highlight),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: Space.sm),
        child: Row(
          children: [
            CheckRing(done: done),
            const SizedBox(width: Space.md),
            Expanded(
              child: Text(
                subtask.title,
                // Dimmed, never struck through — the same rule the habit list
                // follows, for the same reason.
                style: text.bodyMedium?.copyWith(
                  color: done ? t.textMuted : t.textPrimary,
                ),
              ),
            ),
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onDelete,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: Space.sm),
                child: Icon(Icons.close_rounded,
                    size: Dimens.iconSm, color: t.textMuted),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
