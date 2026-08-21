import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/aura_tokens.dart';

/// A pill segmented control.
///
/// Used wherever one screen holds two or three peer views — Tasks/Goals on
/// Plan, and the range selector on Stats. Replaces the underlined-text tabs,
/// which were indistinguishable from body copy until you noticed one was
/// brass-coloured.
///
/// The selected segment slides rather than cross-fading, so the control reads
/// as one moving object and the eye can follow which side it went to.
class SegmentedTabs extends StatelessWidget {
  const SegmentedTabs({
    super.key,
    required this.labels,
    required this.index,
    required this.onSelect,
    this.counts,
    this.expand = true,
  });

  final List<String> labels;
  final int index;
  final ValueChanged<int> onSelect;

  /// Optional badge per segment, same length as [labels]. A null entry, or a
  /// zero, renders nothing — a "0" badge is noise.
  final List<int?>? counts;

  /// Fill the available width. False sizes to content, for a range picker that
  /// should not stretch across the screen.
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    final segments = [
      for (var i = 0; i < labels.length; i++)
        _Segment(
          label: labels[i],
          count: counts == null ? null : counts![i],
          selected: i == index,
          expand: expand,
          onTap: () {
            if (i == index) return;
            unawaited(HapticFeedback.selectionClick().catchError((_) {}));
            onSelect(i);
          },
        ),
    ];

    BoxDecoration shell() => BoxDecoration(
          color: t.surfaceAlt,
          borderRadius: BorderRadius.circular(Radii.pill),
          border: Border.all(color: t.border, width: Dimens.border),
        );

    // The content-sized variant paints no sliding thumb: each segment draws its
    // own pill. It must not go through LayoutBuilder, because sizing to content
    // means an ancestor asks for intrinsic width, and LayoutBuilder cannot
    // answer an intrinsic query — the whole subtree silently fails to lay out.
    if (!expand) {
      return Container(
        padding: const EdgeInsets.all(4),
        decoration: shell(),
        child: Row(mainAxisSize: MainAxisSize.min, children: segments),
      );
    }

    return LayoutBuilder(
      builder: (context, c) => Container(
        padding: const EdgeInsets.all(4),
        decoration: shell(),
        child: Stack(
          children: [
            // The sliding thumb, positioned rather than placed in the row, so
            // it can animate independently of the labels above it.
            AnimatedAlign(
              duration: Motion.base,
              curve: Motion.emphasised,
              alignment: labels.length == 1
                  ? Alignment.center
                  : Alignment(-1 + 2 * index / (labels.length - 1), 0),
              child: Container(
                width: (c.maxWidth - 8) / labels.length,
                height: Dimens.touchTarget - 4,
                decoration: BoxDecoration(
                  gradient: Grad.brand(t),
                  borderRadius: BorderRadius.circular(Radii.pill),
                  boxShadow: Shadows.glow(t.accent),
                ),
              ),
            ),
            Row(children: [for (final s in segments) Expanded(child: s)]),
          ],
        ),
      ),
    );
  }
}

class _Segment extends StatelessWidget {
  const _Segment({
    required this.label,
    required this.count,
    required this.selected,
    required this.expand,
    required this.onTap,
  });

  final String label;
  final int? count;
  final bool selected;
  final bool expand;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final fg = selected ? t.onAccent : t.textSecondary;

    return Semantics(
      button: true,
      selected: selected,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          height: Dimens.touchTarget - 4,
          padding: EdgeInsets.symmetric(horizontal: expand ? 0 : Space.lg),
          // In the non-expanding variant there is no sliding thumb, so the
          // selected segment paints its own.
          decoration: !expand && selected
              ? BoxDecoration(
                  gradient: Grad.brand(t),
                  borderRadius: BorderRadius.circular(Radii.pill),
                )
              : null,
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: text.titleMedium?.copyWith(color: fg),
              ),
              if (count != null && count! > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: selected
                        ? t.onAccent.withValues(alpha: 0.22)
                        : t.textMuted.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(Radii.pill),
                  ),
                  child: Text(
                    '$count',
                    style: text.labelMedium?.copyWith(color: fg),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
