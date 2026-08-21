import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/aura_tokens.dart';
import 'app_button.dart';

/// The scaffold every create/edit form sits in.
///
/// Create and edit are the *same* sheet with different initial values, not two
/// screens. Two forms for one object is how a field gets added to one and
/// forgotten in the other.
///
/// Handles the keyboard inset, the destructive action, and the save button, so
/// each editor only supplies its fields.
class EditorSheet extends StatelessWidget {
  const EditorSheet({
    super.key,
    required this.title,
    required this.children,
    required this.onSave,
    this.saveLabel = 'SAVE',
    this.destructiveLabel,
    this.onDestructive,
  });

  final String title;
  final List<Widget> children;

  /// Return false to keep the sheet open (validation failed).
  final bool Function() onSave;

  final String saveLabel;

  /// e.g. "ARCHIVE" or "DELETE". Omitted when creating.
  final String? destructiveLabel;
  final Future<bool> Function()? onDestructive;

  static Future<void> show(BuildContext context, Widget sheet) {
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.aura.bg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.md)),
      ),
      // Cap the height so a long form scrolls inside the sheet instead of
      // growing under the status bar, and leave the top inset clear.
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.92,
      ),
      useSafeArea: true,
      builder: (_) => sheet,
    );
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        Space.lg,
        Space.sm,
        Space.lg,
        // Lifts the save button clear of the keyboard rather than letting it
        // sit underneath, which is the single most common bottom-sheet bug.
        MediaQuery.of(context).viewInsets.bottom + Space.lg,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle: signals the sheet is dismissible, and gives the
            // title room to breathe below the safe-area inset.
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: Space.lg),
                decoration: BoxDecoration(
                  color: context.aura.borderStrong,
                  borderRadius: BorderRadius.circular(Radii.pill),
                ),
              ),
            ),
            Text(title, style: text.displaySmall),
            const SizedBox(height: Space.lg),
            ...children,
            const SizedBox(height: Space.xxl),
            AppButton.primary(
              label: saveLabel,
              onPressed: () {
                if (onSave()) Navigator.pop(context);
              },
            ),
            if (destructiveLabel != null && onDestructive != null) ...[
              const SizedBox(height: Space.sm),
              Center(
                child: AppButton.text(
                  label: destructiveLabel!,
                  danger: true,
                  onPressed: () async {
                    unawaited(
                        HapticFeedback.mediumImpact().catchError((_) {}));
                    if (await onDestructive!.call() && context.mounted) {
                      Navigator.pop(context);
                    }
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// A labelled block inside an editor.
class Field extends StatelessWidget {
  const Field({super.key, required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Space.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(),
              style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: Space.md),
          child,
        ],
      ),
    );
  }
}

/// A selectable chip. Shared by every editor so selection reads identically
/// whether you are picking a category, a schedule, or a priority.
class ChoiceChipTile extends StatelessWidget {
  const ChoiceChipTile({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.accent,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  /// Tint shown only while selected — sixteen coloured chips at rest is noise.
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final tint = selected ? (accent ?? t.accent) : t.border;

    return GestureDetector(
      onTap: () {
        unawaited(HapticFeedback.selectionClick().catchError((_) {}));
        onTap();
      },
      child: AnimatedContainer(
        duration: Motion.fast,
        padding: const EdgeInsets.symmetric(
            horizontal: Space.md, vertical: Space.sm + 2),
        decoration: BoxDecoration(
          color: selected ? tint.withValues(alpha: Alphas.tint) : null,
          border: Border.all(
            color: tint,
            width: selected ? Dimens.border : Dimens.hairline,
          ),
          borderRadius: BorderRadius.circular(Radii.sm),
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: selected ? t.textPrimary : t.textMuted,
              ),
        ),
      ),
    );
  }
}

/// Weekday picker, Sunday-indexed to match `weekdayMask`.
class WeekdayPicker extends StatelessWidget {
  const WeekdayPicker({super.key, required this.mask, required this.onChanged});

  final int mask;
  final ValueChanged<int> onChanged;

  static const _labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    return Row(
      children: [
        for (var dow = 0; dow < 7; dow++)
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(right: Space.xs),
              child: GestureDetector(
                onTap: () {
                  final next = mask ^ (1 << dow);
                  // A habit with no days would never be due and would silently
                  // vanish from every list; refuse rather than allow it.
                  if (next == 0) return;
                  unawaited(HapticFeedback.selectionClick().catchError((_) {}));
                  onChanged(next);
                },
                child: AnimatedContainer(
                  duration: Motion.fast,
                  height: Dimens.touchTarget,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: mask & (1 << dow) != 0
                        ? t.accent.withValues(alpha: Alphas.tint)
                        : null,
                    border: Border.all(
                      color: mask & (1 << dow) != 0 ? t.accent : t.border,
                      width: mask & (1 << dow) != 0
                          ? Dimens.border
                          : Dimens.hairline,
                    ),
                    borderRadius: BorderRadius.circular(Radii.sm),
                  ),
                  child: Text(
                    _labels[dow],
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: mask & (1 << dow) != 0
                              ? t.accent
                              : t.textMuted,
                        ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
