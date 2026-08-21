import 'package:flutter/material.dart';

import '../theme/aura_tokens.dart';
import 'app_button.dart';

/// The three states every data-backed screen needs, in one place.
///
/// Screens hand an `AsyncValue` to [AsyncView] rather than each inventing its
/// own spinner, empty copy, and error layout — which is how a codebase ends up
/// with four different "something went wrong" screens.

/// Loading. Deliberately a thin brass rule rather than a spinner: local SQLite
/// reads resolve in a frame or two, and a spinner that flashes for 30ms reads as
/// jank. This only becomes visible if something is genuinely slow.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Center(
      child: SizedBox(
        width: 90,
        child: LinearProgressIndicator(
          minHeight: 3,
          backgroundColor: t.border,
          color: t.accent,
        ),
      ),
    );
  }
}

/// Nothing here yet — an invitation, not an apology.
class EmptyView extends StatelessWidget {
  const EmptyView({
    super.key,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: text.displaySmall),
        const SizedBox(height: Space.sm),
        Text(message, style: text.bodyMedium?.copyWith(color: t.textMuted)),
        if (actionLabel != null && onAction != null) ...[
          const SizedBox(height: Space.xl),
          AppButton.outline(label: actionLabel!, onPressed: onAction),
        ],
      ],
    );
  }
}

/// Something failed. States what happened and offers a way forward; never shows
/// a raw exception to the user, though it keeps one available for support.
class ErrorView extends StatelessWidget {
  const ErrorView({
    super.key,
    required this.message,
    this.detail,
    this.onRetry,
  });

  final String message;

  /// Technical detail, shown small and muted. Useful in a bug report, ignorable
  /// by everyone else.
  final String? detail;

  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Space.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message, style: text.titleMedium),
            if (detail != null) ...[
              const SizedBox(height: Space.sm),
              Text(
                detail!,
                style: text.bodySmall?.copyWith(color: t.textMuted),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (onRetry != null) ...[
              const SizedBox(height: Space.lg),
              AppButton.outline(label: 'TRY AGAIN', onPressed: onRetry),
            ],
          ],
        ),
      ),
    );
  }
}
