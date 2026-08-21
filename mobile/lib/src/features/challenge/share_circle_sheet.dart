import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';

/// The moment after creating a circle: the code, big, and the way to send it.
///
/// The share text carries the code AND the install link — the person on the
/// other end of a WhatsApp message may not have the app yet, and a code
/// without a door is a riddle.
class ShareCircleSheet extends StatelessWidget {
  const ShareCircleSheet({super.key, required this.name, required this.code});

  final String name;
  final String code;

  static Future<void> open(
    BuildContext context, {
    required String name,
    required String code,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.aura.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.md)),
      ),
      builder: (_) => ShareCircleSheet(name: name, code: code),
    );
  }

  String get _message =>
      "Join my StayHardy circle “$name” — code $code.\n"
      'Get the app: https://play.google.com/store/apps/details?id=com.stayhardy.app';

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Space.lg, Space.xl, Space.lg, Space.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Your circle is live', style: text.titleLarge),
            const SizedBox(height: Space.sm),
            Text(
              'Anyone with this code can join "$name" until it is full.',
              style: text.bodyMedium?.copyWith(color: t.textSecondary),
            ),
            const SizedBox(height: Space.xl),
            Center(
              child: GestureDetector(
                onTap: () async {
                  await Clipboard.setData(ClipboardData(text: code));
                  unawaited(
                      HapticFeedback.selectionClick().catchError((_) {}));
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: Space.xl, vertical: Space.md),
                  decoration: BoxDecoration(
                    color: t.surfaceAlt,
                    borderRadius: BorderRadius.circular(Radii.md),
                    border: Border.all(
                        color: t.accent, width: Dimens.hairline),
                  ),
                  child: Column(
                    children: [
                      Text(code,
                          style: AuraType.numeral(34,
                              color: t.accent, weight: 700)),
                      const SizedBox(height: 2),
                      Text('TAP TO COPY',
                          style: text.labelMedium
                              ?.copyWith(fontSize: 8, color: t.textMuted)),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: Space.xl),
            AppButton.primary(
              label: 'SHARE THE CIRCLE',
              onPressed: () => Share.share(_message),
            ),
            const SizedBox(height: Space.xs),
            Center(
              child: AppButton.text(
                label: 'DONE',
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
