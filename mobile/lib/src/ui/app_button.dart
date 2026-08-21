import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/aura_tokens.dart';

/// The app's buttons.
///
/// Three variants, deliberately no more. [AppButton.primary] is the single
/// brass-filled action on a screen; [AppButton.outline] is the default for
/// everything else; [AppButton.text] is for tertiary actions inside dialogs.
///
/// Every variant is full-width by default and at least [Dimens.controlHeight]
/// tall, so touch targets never drift below the accessibility floor screen by
/// screen.
class AppButton extends StatelessWidget {
  const AppButton._({
    required this.label,
    required this.onPressed,
    required this.variant,
    this.icon,
    this.iconTrailing = false,
    this.expand = true,
    this.danger = false,
  });

  const AppButton.primary({
    required String label,
    required VoidCallback? onPressed,
    IconData? icon,
    bool iconTrailing = false,
    bool expand = true,
  }) : this._(
          label: label,
          onPressed: onPressed,
          icon: icon,
          iconTrailing: iconTrailing,
          expand: expand,
          variant: AppButtonVariant.primary,
        );

  const AppButton.outline({
    required String label,
    required VoidCallback? onPressed,
    IconData? icon,
    bool expand = true,
  }) : this._(
          label: label,
          onPressed: onPressed,
          icon: icon,
          expand: expand,
          variant: AppButtonVariant.outline,
        );

  const AppButton.text({
    required String label,
    required VoidCallback? onPressed,
    bool danger = false,
  }) : this._(
          label: label,
          onPressed: onPressed,
          expand: false,
          danger: danger,
          variant: AppButtonVariant.text,
        );

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  /// Put the icon after the label. A forward arrow belongs on the trailing
  /// edge — leading, it reads as "back".
  final bool iconTrailing;
  final bool expand;
  final bool danger;
  final AppButtonVariant variant;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    // Haptics are fire-and-forget: a device with no vibrator must never stop
    // the action from running.
    void handle() {
      if (onPressed == null) return;
      unawaited(HapticFeedback.selectionClick().catchError((_) {}));
      onPressed!.call();
    }

    final child = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null && !iconTrailing) ...[
          Icon(icon, size: Dimens.iconSm),
          const SizedBox(width: Space.sm),
        ],
        Flexible(
          child: Text(
            label,
            style: text.labelLarge?.copyWith(
              // A disabled button must LOOK disabled. Painting the enabled
              // colour unconditionally produces a control that invites a tap
              // and then does nothing.
              color: onPressed == null
                  ? t.textMuted
                  : switch (variant) {
                      AppButtonVariant.primary => t.onAccent,
                      AppButtonVariant.outline => t.textPrimary,
                      AppButtonVariant.text => danger ? t.danger : t.accent,
                    },
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
        if (icon != null && iconTrailing) ...[
          const SizedBox(width: Space.sm),
          Icon(icon, size: Dimens.iconSm),
        ],
      ],
    );

    return switch (variant) {
      AppButtonVariant.primary => FilledButton(
          onPressed: onPressed == null ? null : handle,
          style: FilledButton.styleFrom(
            backgroundColor: t.accent,
            disabledBackgroundColor: t.border,
            minimumSize: Size(expand ? double.infinity : 0,
                Dimens.controlHeight),
          ),
          child: child,
        ),
      AppButtonVariant.outline => OutlinedButton(
          onPressed: onPressed == null ? null : handle,
          style: OutlinedButton.styleFrom(
            side: BorderSide(color: t.border, width: Dimens.hairline),
            minimumSize: Size(expand ? double.infinity : 0,
                Dimens.controlHeight),
          ),
          child: child,
        ),
      AppButtonVariant.text => TextButton(
          onPressed: onPressed == null ? null : handle,
          style: TextButton.styleFrom(
            minimumSize: const Size(0, Dimens.touchTarget),
          ),
          child: child,
        ),
    };
  }
}

/// Public so [AppButton.variant] does not expose a private type.
enum AppButtonVariant { primary, outline, text }
