import 'package:flutter/material.dart';

import '../../theme/aura_tokens.dart';

/// The screen title block every top-level screen opens with.
///
/// Now carries actions on the right. "You" used to be a sixth bottom-tab
/// destination, which spent a permanent slot in the most valuable navigation
/// real estate on the phone for a screen people open once a month. It lives
/// behind [ScreenTitle.actions] instead.
class ScreenTitle extends StatelessWidget {
  const ScreenTitle({
    super.key,
    required this.title,
    this.trailing,
    this.subtitle,
    this.actions = const [],
  });

  final String title;

  /// Small letterspaced label under the title — a date, a count, a status.
  final String? trailing;

  /// A full sentence under the title, when a label is not enough.
  final String? subtitle;

  /// Circular icon buttons on the right. Two is the practical maximum before
  /// the title starts wrapping on a small phone.
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final t = context.aura;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (trailing != null) ...[
                Text(trailing!, style: text.labelMedium),
                const SizedBox(height: 5),
              ],
              Text(title, style: text.displayMedium),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle!,
                  style: text.bodyMedium?.copyWith(color: t.textMuted),
                ),
              ],
            ],
          ),
        ),
        for (final a in actions) ...[
          const SizedBox(width: Space.sm),
          a,
        ],
      ],
    );
  }
}

/// A circular icon button for [ScreenTitle.actions].
///
/// Sized to [Dimens.touchTarget] whatever the icon inside it — the previous
/// header had 15px tap targets, which fail accessibility guidance and are
/// genuinely hard to hit.
class HeaderAction extends StatelessWidget {
  const HeaderAction({
    super.key,
    required this.icon,
    required this.onTap,
    this.tooltip,
    this.badge = 0,
  });

  final IconData icon;
  final VoidCallback onTap;
  final String? tooltip;

  /// A count shown in a dot on the corner. Zero renders nothing.
  final int badge;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    final button = Semantics(
      button: true,
      label: tooltip,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Container(
          width: Dimens.touchTarget,
          height: Dimens.touchTarget,
          decoration: BoxDecoration(
            color: t.surface,
            shape: BoxShape.circle,
            border: Border.all(color: t.border, width: Dimens.border),
          ),
          child: Icon(icon, size: Dimens.iconMd, color: t.textSecondary),
        ),
      ),
    );

    if (badge <= 0) return button;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        button,
        Positioned(
          right: 2,
          top: 2,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: t.danger,
              borderRadius: BorderRadius.circular(Radii.pill),
              border: Border.all(color: t.bg, width: 1.5),
            ),
            child: Text(
              badge > 9 ? '9+' : '$badge',
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(color: t.onAccent),
            ),
          ),
        ),
      ],
    );
  }
}

/// A small uppercase eyebrow that introduces a group of rows.
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.color, this.action});

  final String text;

  /// Overrides the muted default — used to tint a section that needs attention,
  /// e.g. "Overdue".
  final Color? color;

  /// A trailing affordance, typically a "See all" text button.
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final label = Text(
      text.toUpperCase(),
      style: Theme.of(context)
          .textTheme
          .labelLarge
          ?.copyWith(color: color ?? context.aura.textMuted),
    );

    if (action == null) return label;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [label, action!],
    );
  }
}
