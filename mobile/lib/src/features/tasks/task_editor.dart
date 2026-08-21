import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/database.dart';
import '../../data/enums.dart';
import '../../data/providers.dart';
import '../../domain/civil_date.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/editor_sheet.dart';
import 'subtask_list.dart';

/// Create or edit a task. Pass [task] to edit, omit it to create.
class TaskEditor extends ConsumerStatefulWidget {
  const TaskEditor({super.key, this.task});

  final Task? task;

  static Future<void> open(BuildContext context, {Task? task}) {
    return EditorSheet.show(context, TaskEditor(task: task));
  }

  @override
  ConsumerState<TaskEditor> createState() => _TaskEditorState();
}

class _TaskEditorState extends ConsumerState<TaskEditor> {
  late final TextEditingController _title;
  late final TextEditingController _notes;
  late TaskPriority _priority;
  CivilDate? _due;

  bool get _isEdit => widget.task != null;

  @override
  void initState() {
    super.initState();
    final t = widget.task;
    _title = TextEditingController(text: t?.title ?? '');
    _notes = TextEditingController(text: t?.description ?? '');
    _priority =
        TaskPriority.fromValue(t?.priority ?? TaskPriority.medium.value);
    _due = t?.dueDate == null
        ? (_isEdit ? null : CivilDate.today())
        : CivilDate.parse(t!.dueDate!);
  }

  @override
  void dispose() {
    _title.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final quickDates = <(String, CivilDate?)>[
      ('Today', CivilDate.today()),
      ('Tomorrow', CivilDate.today().addDays(1)),
      ('Next week', CivilDate.today().addDays(7)),
      ('No date', null),
    ];

    // A date the user picked by hand won't match a quick option; show it as its
    // own chip rather than leaving the row looking unselected.
    final isCustom = _due != null &&
        !quickDates.any((o) => o.$2?.iso == _due!.iso);

    return EditorSheet(
      title: _isEdit ? 'Edit task' : 'New task',
      saveLabel: _isEdit ? 'SAVE CHANGES' : 'CREATE',
      destructiveLabel: _isEdit ? 'DELETE TASK' : null,
      onDestructive: _isEdit ? _delete : null,
      onSave: _save,
      children: [
        TextField(
          controller: _title,
          autofocus: !_isEdit,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(hintText: 'Recharge the phone'),
        ),
        const SizedBox(height: Space.md),
        TextField(
          controller: _notes,
          maxLines: 3,
          minLines: 1,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(hintText: 'Notes (optional)'),
        ),
        const SizedBox(height: Space.xl),

        Field(
          label: 'When',
          child: Wrap(
            spacing: Space.sm,
            runSpacing: Space.sm,
            children: [
              for (final (label, date) in quickDates)
                ChoiceChipTile(
                  label: label,
                  selected: !isCustom && _due?.iso == date?.iso,
                  onTap: () => setState(() => _due = date),
                ),
              ChoiceChipTile(
                label: isCustom ? _format(_due!) : 'Pick a date',
                selected: isCustom,
                onTap: () async {
                  final now = DateTime.now();
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: now,
                    firstDate: DateTime(now.year - 1),
                    lastDate: DateTime(now.year + 5),
                  );
                  if (picked != null) {
                    setState(() => _due =
                        CivilDate(picked.year, picked.month, picked.day));
                  }
                },
              ),
            ],
          ),
        ),

        Field(
          label: 'Priority',
          child: Row(
            children: [
              for (final p in TaskPriority.values)
                Padding(
                  padding: const EdgeInsets.only(right: Space.sm),
                  child: ChoiceChipTile(
                    label: switch (p) {
                      TaskPriority.low => 'Low',
                      TaskPriority.medium => 'Medium',
                      TaskPriority.high => 'High',
                    },
                    selected: p == _priority,
                    onTap: () => setState(() => _priority = p),
                  ),
                ),
            ],
          ),
        ),

        Field(
          label: 'Steps',
          child: SubtaskList(parent: widget.task),
        ),
      ],
    );
  }

  static String _format(CivilDate d) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
        'Sep', 'Oct', 'Nov', 'Dec'];
    return '${d.day} ${months[d.month - 1]}';
  }

  bool _save() {
    final title = _title.text.trim();
    if (title.isEmpty) return false;

    final notes = _notes.text.trim();
    final repo = ref.read(taskRepositoryProvider);

    if (_isEdit) {
      unawaited(repo.update(
        widget.task!.id,
        title: title,
        description: notes.isEmpty ? null : notes,
        priority: _priority,
        dueDate: _due,
      ));
    } else {
      unawaited(repo.create(
        title: title,
        description: notes.isEmpty ? null : notes,
        priority: _priority,
        dueDate: _due,
      ));
    }
    return true;
  }

  Future<bool> _delete() async {
    await ref.read(taskRepositoryProvider).delete(widget.task!.id);
    return true;
  }
}
