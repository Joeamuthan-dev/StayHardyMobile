import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/database.dart';
import '../../data/enums.dart';
import '../../data/providers.dart';
import '../../theme/habit_categories.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/editor_sheet.dart';
import '../../ui/surface_card.dart';

/// Create or edit a habit.
///
/// One sheet for both. Pass [habit] to edit, omit it to create.
class HabitEditor extends ConsumerStatefulWidget {
  const HabitEditor({super.key, this.habit});

  final Habit? habit;

  static Future<void> open(BuildContext context, {Habit? habit}) {
    return EditorSheet.show(context, HabitEditor(habit: habit));
  }

  @override
  ConsumerState<HabitEditor> createState() => _HabitEditorState();
}

class _HabitEditorState extends ConsumerState<HabitEditor> {
  late final TextEditingController _title;
  late final TextEditingController _customCategory;

  /// A starter shelf, not a catalogue — the field takes any emoji a keyboard
  /// can type; these just save opening the emoji keyboard for the usual
  /// suspects.
  static const _emojiSuggestions = [
    '\u{1F4AA}', '\u{1F4DA}', '\u{1F9D8}', '\u{1F3B8}',
    '\u{1F3A8}', '\u{1F4B0}', '\u{1F331}', '\u{26BD}',
  ];

  static String _stripLeadingEmoji(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return '';
    final first = trimmed.characters.first;
    final code = first.runes.first;
    final isEmoji = code >= 0x1F000 || (code >= 0x2600 && code <= 0x27BF);
    return isEmoji
        ? trimmed.characters.skip(1).toString().trim()
        : trimmed;
  }
  late HabitCategory _category;

  /// True while the user is filing this under a category of their own.
  late bool _isCustom;

  /// Set once Create has been pressed with an empty name, so the field only
  /// turns red after a real attempt — colouring it on open scolds someone for
  /// not having typed yet.
  bool _showNameError = false;
  late ScheduleKind _kind;
  late int _mask;
  late int _perPeriod;
  late HabitType _type;
  TimeOfDay? _reminder;

  bool get _isEdit => widget.habit != null;

  @override
  void initState() {
    super.initState();
    final h = widget.habit;
    _title = TextEditingController(text: h?.title ?? '');
    _category = HabitCategories.resolve(h?.category);
    _isCustom = h != null && !HabitCategories.isNamed(h.category);
    _customCategory =
        TextEditingController(text: _isCustom ? _category.name : '');
    _kind = ScheduleKind.fromValue(h?.scheduleKind ?? ScheduleKind.daily.value);
    // Weekdays default to Mon–Fri, which is what "weekdays" means to a user.
    _mask = h?.weekdayMask ?? 127;
    _perPeriod = h?.targetPerPeriod ?? 3;
    _type = HabitType.fromValue(h?.habitType ?? HabitType.binary.value);
    _reminder = _parseTime(h?.reminderTime);
  }

  @override
  void dispose() {
    _title.dispose();
    _customCategory.dispose();
    super.dispose();
  }

  /// The badge beside the name field, and what gets saved.
  HabitCategory get _effectiveCategory {
    if (!_isCustom) return _category;
    final typed = _customCategory.text.trim();
    return typed.isEmpty
        ? HabitCategories.custom
        : HabitCategory(typed, HabitCategories.custom.icon);
  }

  static TimeOfDay? _parseTime(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    final parts = raw.split(':');
    if (parts.length != 2) return null;
    final h = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    if (h == null || m == null) return null;
    return TimeOfDay(hour: h, minute: m);
  }

  String? get _reminderString => _reminder == null
      ? null
      : '${_reminder!.hour.toString().padLeft(2, '0')}:'
          '${_reminder!.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return EditorSheet(
      title: _isEdit ? 'Edit habit' : 'New habit',
      saveLabel: _isEdit ? 'SAVE CHANGES' : 'CREATE',
      destructiveLabel: _isEdit ? 'ARCHIVE OR DELETE' : null,
      onDestructive: _isEdit ? _archiveOrDelete : null,
      onSave: _save,
      children: [
        // The name, with the chosen category's icon and colour beside it, so
        // the two choices that decide how the habit *looks* on the list are
        // visible together instead of a plain field at the top and a wall of
        // chips further down.
        Field(
          label: 'What is the habit',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SurfaceCard(
                tint: _showNameError && _title.text.trim().isEmpty
                    ? t.danger
                    : null,
                padding: const EdgeInsets.symmetric(
                    horizontal: Space.md, vertical: Space.sm),
                child: Row(
                  children: [
                    IconBadge(
                      icon: _effectiveCategory.icon,
                      color: _effectiveCategory.colorOf(context),
                      size: 40,
                    ),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: TextField(
                        controller: _title,
                        autofocus: !_isEdit,
                        textCapitalization: TextCapitalization.sentences,
                        style: text.titleLarge,
                        // Clears the error the moment they start typing.
                        onChanged: (_) => setState(() {}),
                        decoration: InputDecoration(
                          hintText: 'Read 20 pages',
                          filled: false,
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: EdgeInsets.zero,
                          hintStyle:
                              text.titleLarge?.copyWith(color: t.textMuted),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (_showNameError && _title.text.trim().isEmpty) ...[
                const SizedBox(height: Space.sm),
                Text(
                  'Give it a name first.',
                  style: text.bodySmall?.copyWith(color: t.danger),
                ),
              ],
            ],
          ),
        ),

        Field(
          label: 'How you track it',
          // A 2×2 grid rather than a wrap. Four chips of wildly different
          // widths wrapped to a ragged second row with "Abstain" stranded on
          // its own, which read as a layout accident rather than a choice.
          child: Column(
            children: [
              for (var row = 0; row < 2; row++)
                Padding(
                  padding: EdgeInsets.only(bottom: row == 0 ? Space.sm : 0),
                  child: Row(
                    children: [
                      for (var col = 0; col < 2; col++) ...[
                        if (col > 0) const SizedBox(width: Space.sm),
                        Expanded(
                          child: _TypeTile(
                            type: HabitType.values[row * 2 + col],
                            selected:
                                HabitType.values[row * 2 + col] == _type,
                            onTap: () => setState(
                                () => _type = HabitType.values[row * 2 + col]),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
            ],
          ),
        ),

        Field(
          label: 'Category',
          // A horizontal rail rather than a wrapped grid: sixteen text chips
          // wrapped to five rows and pushed the schedule — the choice people
          // actually care about — below the fold on every phone.
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                height: 74,
                child: ListView.separated(
                  // Keyed so a widget test can drive the rail. Finding it by
                  // axis matches a TextField's own internal scrollable, and
                  // finding it through one of its tiles breaks the moment that
                  // tile scrolls out of view and is disposed.
                  key: const ValueKey('category-rail'),
                  scrollDirection: Axis.horizontal,
                  // The fifteen real categories, then the Custom door last.
                  itemCount: HabitCategories.named.length + 1,
                  separatorBuilder: (_, _) => const SizedBox(width: Space.sm),
                  itemBuilder: (context, i) {
                    final isDoor = i == HabitCategories.named.length;
                    final c =
                        isDoor ? HabitCategories.custom : HabitCategories.named[i];
                    final selected = isDoor
                        ? _isCustom
                        : (!_isCustom && c.name == _category.name);
                    final colour = isDoor
                        ? t.accent
                        : c.colorOf(context);

                    return _CategoryTile(
                      icon: isDoor ? Icons.add_rounded : c.icon,
                      label: isDoor ? 'Custom' : c.name,
                      colour: colour,
                      selected: selected,
                      onTap: () => setState(() {
                        if (isDoor) {
                          _isCustom = true;
                        } else {
                          _isCustom = false;
                          _category = c;
                        }
                      }),
                    );
                  },
                ),
              ),
              // The whole point of the Custom door: somewhere to type.
              // Revealed inline rather than in a dialog — a dialog to name a
              // category is a modal on top of a modal.
              AnimatedSize(
                duration: Motion.base,
                curve: Motion.curve,
                alignment: Alignment.topLeft,
                child: !_isCustom
                    ? const SizedBox(width: double.infinity)
                    : Padding(
                        padding: const EdgeInsets.only(top: Space.md),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            TextField(
                              controller: _customCategory,
                              autofocus: true,
                              textCapitalization: TextCapitalization.words,
                              maxLength: 20,
                              onChanged: (_) => setState(() {}),
                              decoration: const InputDecoration(
                                hintText: 'Guitar, Spanish, Physio…',
                                counterText: '',
                                prefixIcon: Icon(Icons.label_outline_rounded),
                              ),
                            ),
                            const SizedBox(height: Space.sm),
                            // A mark to go with the word. Tapping an emoji
                            // prefixes it into the label, and from then on it
                            // renders as the category's icon everywhere.
                            Wrap(
                              spacing: Space.sm,
                              runSpacing: Space.sm,
                              children: [
                                for (final e in _emojiSuggestions)
                                  GestureDetector(
                                    onTap: () => setState(() {
                                      final words = _stripLeadingEmoji(
                                          _customCategory.text);
                                      _customCategory.text =
                                          words.isEmpty ? e : '$e $words';
                                      _customCategory.selection =
                                          TextSelection.collapsed(
                                              offset: _customCategory
                                                  .text.length);
                                    }),
                                    child: Container(
                                      width: 40,
                                      height: 40,
                                      alignment: Alignment.center,
                                      decoration: BoxDecoration(
                                        color: _customCategory.text
                                                .startsWith(e)
                                            ? t.accent.withValues(
                                                alpha: Alphas.tintStrong)
                                            : t.surfaceAlt,
                                        borderRadius:
                                            BorderRadius.circular(Radii.md),
                                      ),
                                      child: Text(e,
                                          style: const TextStyle(
                                              fontSize: 20, height: 1)),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: Space.xs),
                            Text(
                              _customCategory.text.trim().isEmpty
                                  ? 'Name it and every screen will use your '
                                      'word. Type or tap any emoji to make '
                                      'it the icon.'
                                  : 'Filed under ${_customCategory.text.trim()}.',
                              style:
                                  text.bodySmall?.copyWith(color: t.textMuted),
                            ),
                          ],
                        ),
                      ),
              ),
            ],
          ),
        ),

        Field(
          label: 'Schedule',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: Space.sm,
                runSpacing: Space.sm,
                children: [
                  ChoiceChipTile(
                    label: 'Every day',
                    selected: _kind == ScheduleKind.daily,
                    onTap: () => setState(() {
                      _kind = ScheduleKind.daily;
                      _mask = 127;
                    }),
                  ),
                  ChoiceChipTile(
                    label: 'Certain days',
                    selected: _kind == ScheduleKind.weekdays,
                    onTap: () => setState(() {
                      _kind = ScheduleKind.weekdays;
                      if (_mask == 127) _mask = 0x3E; // Mon–Fri
                    }),
                  ),
                  ChoiceChipTile(
                    label: 'Times per week',
                    selected: _kind == ScheduleKind.timesPerPeriod,
                    onTap: () =>
                        setState(() => _kind = ScheduleKind.timesPerPeriod),
                  ),
                ],
              ),
              if (_kind == ScheduleKind.weekdays) ...[
                const SizedBox(height: Space.md),
                WeekdayPicker(
                  mask: _mask,
                  onChanged: (m) => setState(() => _mask = m),
                ),
              ],
              if (_kind == ScheduleKind.timesPerPeriod) ...[
                const SizedBox(height: Space.md),
                Row(
                  children: [
                    for (var n = 1; n <= 6; n++)
                      Padding(
                        padding: const EdgeInsets.only(right: Space.sm),
                        child: ChoiceChipTile(
                          label: '$n',
                          selected: n == _perPeriod,
                          onTap: () => setState(() => _perPeriod = n),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: Space.sm),
                Text(
                  'Complete it any $_perPeriod days of the week. No fixed days, '
                  'so a missed Monday is not a missed habit.',
                  style: text.bodySmall?.copyWith(color: t.textMuted),
                ),
              ],
            ],
          ),
        ),

        Field(
          label: 'Reminder',
          // A row with a clock and a chevron. The previous full-width chip was
          // indistinguishable from a text input, so "No reminder" read as an
          // empty field somebody had failed to fill in.
          child: SurfaceCard(
            padding: const EdgeInsets.symmetric(
                horizontal: Space.md, vertical: Space.xs),
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                _reminder == null
                    ? Icons.notifications_off_outlined
                    : Icons.notifications_active_outlined,
                size: Dimens.iconMd,
                color: _reminder == null ? t.textMuted : t.accent,
              ),
              title: Text(
                _reminder == null
                    ? 'No reminder'
                    : 'Every day at ${_reminder!.format(context)}',
                style: text.bodyLarge?.copyWith(
                  color: _reminder == null ? t.textSecondary : t.textPrimary,
                ),
              ),
              trailing: _reminder == null
                  ? Icon(Icons.chevron_right_rounded,
                      size: Dimens.iconMd, color: t.textMuted)
                  : IconButton(
                      icon: Icon(Icons.close_rounded,
                          size: Dimens.iconMd, color: t.textMuted),
                      onPressed: () => setState(() => _reminder = null),
                    ),
              onTap: () async {
                final picked = await showTimePicker(
                  context: context,
                  initialTime:
                      _reminder ?? const TimeOfDay(hour: 8, minute: 0),
                );
                if (picked != null) setState(() => _reminder = picked);
              },
            ),
          ),
        ),
      ],
    );
  }

  bool _save() {
    final title = _title.text.trim();
    if (title.isEmpty) {
      // Say why, rather than leaving the sheet open with no explanation —
      // which is what a bare `return false` did.
      setState(() => _showNameError = true);
      return false;
    }

    final repo = ref.read(habitRepositoryProvider);
    final mask = _kind == ScheduleKind.daily ? 127 : _mask;
    final perPeriod =
        _kind == ScheduleKind.timesPerPeriod ? _perPeriod : null;

    if (_isEdit) {
      unawaited(repo.updateHabit(
        widget.habit!.id,
        title: title,
        category: _effectiveCategory.name,
        kind: _kind,
        weekdayMask: mask,
        targetPerPeriod: perPeriod,
        type: _type,
        reminderTime: _reminderString,
      ));
    } else {
      unawaited(repo.createHabit(
        title: title,
        category: _effectiveCategory.name,
        kind: _kind,
        weekdayMask: mask,
        targetPerPeriod: perPeriod,
        type: _type,
      ));
    }
    return true;
  }

  /// Offers both endings, with archive first.
  ///
  /// Archive is almost always right — a habit you stopped doing is still part
  /// of your record, and silently destroying a 90-day streak is unforgivable.
  /// But "I made a typo" and "I created this by accident" are real, and having
  /// no way to remove a habit was a genuine gap.
  Future<bool> _archiveOrDelete() async {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (sheet) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Space.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.habit!.title, style: text.titleLarge),
              const SizedBox(height: Space.lg),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: IconBadge(
                  icon: Icons.inventory_2_outlined,
                  color: t.secondary,
                  size: 38,
                ),
                title: Text('Archive', style: text.bodyLarge),
                subtitle: Text(
                  'Leaves your list, keeps its history and streak record.',
                  style: text.bodySmall?.copyWith(color: t.textMuted),
                ),
                onTap: () => Navigator.pop(sheet, 'archive'),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: IconBadge(
                  icon: Icons.delete_outline_rounded,
                  color: t.danger,
                  size: 38,
                ),
                title: Text('Delete',
                    style: text.bodyLarge?.copyWith(color: t.danger)),
                subtitle: Text(
                  'Removes the habit and every check-in it has. '
                  'This cannot be undone.',
                  style: text.bodySmall?.copyWith(color: t.textMuted),
                ),
                onTap: () => Navigator.pop(sheet, 'delete'),
              ),
            ],
          ),
        ),
      ),
    );

    if (choice == 'archive') {
      await ref.read(habitRepositoryProvider).archive(widget.habit!.id);
      return true;
    }
    if (choice != 'delete') return false;

    if (!mounted) return false;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text('Delete ${widget.habit!.title}?',
            style: Theme.of(c).textTheme.titleLarge),
        content: Text(
          'Its check-ins go with it. If you just want it off your list, '
          'archive it instead — that keeps the record.',
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
      await ref.read(habitRepositoryProvider).deleteHabit(widget.habit!.id);
      return true;
    }
    return false;
  }
}


/// One square in the category rail.
class _CategoryTile extends StatelessWidget {
  const _CategoryTile({
    required this.icon,
    required this.label,
    required this.colour,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color colour;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: SizedBox(
        width: 62,
        child: Column(
          children: [
            AnimatedContainer(
              duration: Motion.fast,
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: colour.withValues(
                    alpha: selected ? Alphas.tintStrong : 0.10),
                borderRadius: BorderRadius.circular(Radii.md),
                border: Border.all(
                  color: selected ? colour : Colors.transparent,
                  width: 1.5,
                ),
              ),
              child: Icon(icon, size: Dimens.iconMd, color: colour),
            ),
            const SizedBox(height: 5),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: text.labelMedium?.copyWith(
                color: selected ? t.textPrimary : t.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// One cell of the tracking-type grid.
///
/// Carries a one-line explanation, because "Count" and "Minutes" do not
/// actually say what they will do to the check-off button.
class _TypeTile extends StatelessWidget {
  const _TypeTile({
    required this.type,
    required this.selected,
    required this.onTap,
  });

  final HabitType type;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    final (title, blurb, icon) = switch (type) {
      HabitType.binary => ('Simple', 'Done or not', Icons.check_rounded),
      HabitType.quantity => ('Count', 'How many', Icons.tag_rounded),
      HabitType.duration => ('Minutes', 'How long', Icons.timer_outlined),
      HabitType.negative => ('Abstain', 'Avoid it', Icons.block_rounded),
    };

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: Motion.fast,
        padding: const EdgeInsets.symmetric(
            horizontal: Space.md, vertical: Space.md),
        decoration: BoxDecoration(
          color: selected
              ? t.accent.withValues(alpha: Alphas.tint)
              : t.surface,
          borderRadius: BorderRadius.circular(Radii.md),
          border: Border.all(
            color: selected ? t.accent : t.border,
            width: selected ? 1.5 : Dimens.border,
          ),
        ),
        child: Row(
          children: [
            Icon(icon,
                size: Dimens.iconSm,
                color: selected ? t.accent : t.textMuted),
            const SizedBox(width: Space.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: text.titleMedium?.copyWith(
                      color: selected ? t.accent : t.textPrimary,
                    ),
                  ),
                  Text(blurb, style: text.labelMedium),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
