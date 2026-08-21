import 'package:flutter/material.dart';

import '../theme/aura_tokens.dart';
import '../theme/aura_typography.dart';

/// One number in a [StatStrip].
class StatItem {
  const StatItem({
    required this.value,
    required this.label,
    this.accent = false,
    this.tint,
  });

  final String value;
  final String label;

  /// Paints the numeral in the brass accent.
  final bool accent;

  /// Overrides [accent] with a specific colour (danger, success).
  final Color? tint;
}

/// A row of headline numbers separated by hairlines.
///
/// The repeating unit under a hero on almost every screen. Extracted so the
/// numeral size, label treatment, and divider weight are decided once — three
/// screens each inventing their own "row of stats" is how an app starts looking
/// assembled rather than designed.
class StatStrip extends StatelessWidget {
  const StatStrip({super.key, required this.items});

  final List<StatItem> items;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    return IntrinsicHeight(
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0)
              VerticalDivider(
                color: t.border,
                width: Space.lg,
                thickness: Dimens.hairline,
              ),
            Expanded(child: _Cell(item: items[i])),
          ],
        ],
      ),
    );
  }
}

class _Cell extends StatelessWidget {
  const _Cell({required this.item});
  final StatItem item;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Column(
      children: [
        Text(
          item.value,
          style: AuraType.numeral(
            30,
            color: item.tint ?? (item.accent ? t.accent : t.textPrimary),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          item.label,
          style: Theme.of(context).textTheme.labelMedium,
          textAlign: TextAlign.center,
          maxLines: 2,
        ),
      ],
    );
  }
}
