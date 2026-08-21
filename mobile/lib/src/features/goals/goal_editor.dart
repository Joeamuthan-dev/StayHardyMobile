import 'dart:async';

import 'package:drift/drift.dart' hide Column;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/database.dart';
import '../../data/enums.dart';
import '../../data/providers.dart';
import '../../domain/civil_date.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/check_ring.dart';
import '../../theme/habit_categories.dart';
import '../../ui/editor_sheet.dart';

/// Create or edit a goal, including its milestones.
class GoalEditor extends ConsumerStatefulWidget {
  const GoalEditor({super.key, this.goal});

  final Goal? goal;

  static Future<void> open(BuildContext context, {Goal? goal}) {
    return EditorSheet.show(context, GoalEditor(goal: goal));
  }

  @override
  ConsumerState<GoalEditor> createState() => _GoalEditorState();
}

class _GoalEditorState extends ConsumerState<GoalEditor> {
  late final TextEditingController _name;
  late final TextEditingController _description;
  final _milestone = TextEditingController();
  late GoalProgressMode _mode;
  CivilDate? _target;
  List<GoalMilestone> _milestones = const [];

  /// The habits this goal draws progress from, edited as a set and written
  /// declaratively on save.
  Set<String> _linkedHabits = {};

  bool get _isEdit => widget.goal != null;

  @override
  void initState() {
    super.initState();
    final g = widget.goal;
    _name = TextEditingController(text: g?.name ?? '');
    _description = TextEditingController(text: g?.description ?? '');
    _mode = GoalProgressMode.fromValue(
        g?.progressMode ?? GoalProgressMode.milestones.value);
    _target = g?.targetDate == null ? null : CivilDate.parse(g!.targetDate!);
    if (_isEdit) _loadMilestones();
  }

  Future<void> _loadMilestones() async {
    final db = ref.read(databaseProvider);
    final rows = await (db.select(db.goalMilestones)
          ..where((m) =>
              m.goalId.equals(widget.goal!.id) & m.deletedAt.isNull())
          ..orderBy([(m) => OrderingTerm.asc(m.sortIndex)]))
        .get();
    if (mounted) setState(() => _milestones = rows);
    if (widget.goal != null) {
      final linked = await ref
          .read(goalRepositoryProvider)
          .linkedHabitIds(widget.goal!.id);
      if (mounted) setState(() => _linkedHabits = linked);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _milestone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return EditorSheet(
      title: _isEdit ? 'Edit goal' : 'New goal',
      saveLabel: _isEdit ? 'SAVE CHANGES' : 'CREATE',
      destructiveLabel: _isEdit ? 'DELETE GOAL' : null,
      onDestructive: _isEdit ? _delete : null,
      onSave: _save,
      children: [
        TextField(
          controller: _name,
          autofocus: !_isEdit,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(hintText: 'Close the credit card EMI'),
        ),
        const SizedBox(height: Space.md),
        TextField(
          controller: _description,
          maxLines: 2,
          minLines: 1,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(hintText: 'Why it matters'),
        ),
        const SizedBox(height: Space.xl),

        Field(
          label: 'Target date',
          child: Row(
            children: [
              Expanded(
                child: ChoiceChipTile(
                  label: _target == null ? 'No deadline' : _format(_target!),
                  selected: _target != null,
                  onTap: () async {
                    final now = DateTime.now();
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: now.add(const Duration(days: 30)),
                      firstDate: now,
                      lastDate: DateTime(now.year + 10),
                    );
                    if (picked != null) {
                      setState(() => _target =
                          CivilDate(picked.year, picked.month, picked.day));
                    }
                  },
                ),
              ),
              if (_target != null) ...[
                const SizedBox(width: Space.sm),
                ChoiceChipTile(
                  label: 'Clear',
                  selected: false,
                  onTap: () => setState(() => _target = null),
                ),
              ],
            ],
          ),
        ),

        Field(
          label: 'Track progress by',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: Space.sm,
                runSpacing: Space.sm,
                children: [
                  for (final mode in GoalProgressMode.values)
                    ChoiceChipTile(
                      label: switch (mode) {
                        GoalProgressMode.milestones => 'Milestones',
                        GoalProgressMode.linked => 'Linked habits',
                        GoalProgressMode.manual => 'Set it myself',
                      },
                      selected: mode == _mode,
                      onTap: () => setState(() => _mode = mode),
                    ),
                ],
              ),
              const SizedBox(height: Space.sm),
              Text(
                switch (_mode) {
                  GoalProgressMode.milestones =>
                    'Progress is the share of milestones you have ticked off.',
                  GoalProgressMode.linked =>
                    'Progress comes from how consistently the habits attached '
                        'to this goal get done.',
                  GoalProgressMode.manual =>
                    'You move the number yourself.',
                },
                style: text.bodySmall?.copyWith(color: t.textMuted),
              ),

              // The mode said "linked habits" and then offered no way to link
              // one — the option was a dead end unless a row already existed
              // in the database. This is the missing half.
              if (_mode == GoalProgressMode.linked) ...[
                const SizedBox(height: Space.md),
                _HabitPicker(
                  selected: _linkedHabits,
                  onToggle: (id) => setState(() {
                    _linkedHabits.contains(id)
                        ? _linkedHabits.remove(id)
                        : _linkedHabits.add(id);
                  }),
                ),
              ],
            ],
          ),
        ),

        // Milestones can only be attached once the goal has an id.
        if (_isEdit)
          Field(
            label: 'Milestones',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final m in _milestones)
                  Padding(
                    padding: const EdgeInsets.only(bottom: Space.sm),
                    child: Row(
                      children: [
                        CheckRing(done: m.done, size: Dimens.iconMd),
                        const SizedBox(width: Space.md),
                        Expanded(
                          child: Text(
                            m.title,
                            style: text.bodyLarge?.copyWith(
                              color: m.done ? t.textMuted : t.textPrimary,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: Icon(Icons.close_rounded,
                              size: Dimens.iconSm, color: t.textMuted),
                          onPressed: () async {
                            await ref
                                .read(goalRepositoryProvider)
                                .deleteMilestone(m.id);
                            await _loadMilestones();
                          },
                        ),
                      ],
                    ),
                  ),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _milestone,
                        textCapitalization: TextCapitalization.sentences,
                        decoration:
                            const InputDecoration(hintText: 'Add a milestone'),
                        onSubmitted: (_) => _addMilestone(),
                      ),
                    ),
                    const SizedBox(width: Space.sm),
                    IconButton(
                      icon: Icon(Icons.add_rounded, color: t.accent),
                      onPressed: _addMilestone,
                    ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }

  Future<void> _addMilestone() async {
    final title = _milestone.text.trim();
    if (title.isEmpty) return;
    _milestone.clear();
    await ref.read(goalRepositoryProvider).addMilestone(widget.goal!.id, title);
    await _loadMilestones();
  }

  static String _format(CivilDate d) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
        'Sep', 'Oct', 'Nov', 'Dec'];
    return '${d.day} ${months[d.month - 1]} ${d.year}';
  }

  bool _save() {
    final name = _name.text.trim();
    if (name.isEmpty) return false;

    final description = _description.text.trim();
    final repo = ref.read(goalRepositoryProvider);

    // Sequenced inside one future rather than two unawaited calls: the links
    // need the goal's id, and on create that id does not exist until the goal
    // row lands.
    unawaited(() async {
      if (_isEdit) {
        await repo.updateGoal(
          widget.goal!.id,
          name: name,
          description: description.isEmpty ? null : description,
          targetDate: _target,
          mode: _mode,
        );
        await repo.setLinkedHabits(widget.goal!.id, _linkedHabits);
      } else {
        final id = await repo.createGoal(
          name: name,
          description: description.isEmpty ? null : description,
          targetDate: _target,
          mode: _mode,
        );
        if (_linkedHabits.isNotEmpty) {
          await repo.setLinkedHabits(id, _linkedHabits);
        }
      }
    }());
    return true;
  }

  Future<bool> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: c.aura.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.md),
        ),
        title: Text('Delete ${widget.goal!.name}?',
            style: Theme.of(c).textTheme.titleLarge),
        content: Text(
          'The goal and its milestones are removed. Habits linked to it are '
          'not affected.',
          style: Theme.of(c).textTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: Text('Cancel',
                style: TextStyle(color: c.aura.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: Text('Delete', style: TextStyle(color: c.aura.danger)),
          ),
        ],
      ),
    );

    if (confirmed ?? false) {
      await ref.read(goalRepositoryProvider).deleteGoal(widget.goal!.id);
      return true;
    }
    return false;
  }
}


/// The habits a goal can draw progress from, as a checklist.
class _HabitPicker extends ConsumerWidget {
  const _HabitPicker({required this.selected, required this.onToggle});

  final Set<String> selected;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final habits = ref.watch(activeHabitsProvider).value ?? const [];

    if (habits.isEmpty) {
      return Text(
        'No habits yet — create one first and it will appear here.',
        style: text.bodySmall?.copyWith(color: t.textMuted),
      );
    }

    return Column(
      children: [
        for (final h in habits)
          InkWell(
            onTap: () => onToggle(h.id),
            borderRadius: BorderRadius.circular(Radii.sm),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: Space.sm),
              child: Row(
                children: [
                  Icon(
                    HabitCategories.resolve(h.category).icon,
                    size: Dimens.iconSm,
                    color: HabitCategories.resolve(h.category).colorOf(context),
                  ),
                  const SizedBox(width: Space.sm),
                  Expanded(
                    child: Text(h.title,
                        style: text.bodyLarge, overflow: TextOverflow.ellipsis),
                  ),
                  CheckRing(done: selected.contains(h.id), size: 22),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
