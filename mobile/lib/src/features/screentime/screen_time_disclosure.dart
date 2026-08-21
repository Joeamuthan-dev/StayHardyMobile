import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/app_button.dart';
import '../shared/section_header.dart';

/// The prominent disclosure shown **before** usage access is requested.
///
/// This is a Google Play policy requirement, not a courtesy: an app that
/// requests `PACKAGE_USAGE_STATS` without an in-app disclosure that names the
/// data, states what it is used for, and says whether it is shared gets the
/// release rejected. It must appear before the permission request, must be
/// dismissible without granting, and cannot be buried inside a privacy policy
/// link.
///
/// Three things make it compliant, and none of them can be quietly dropped:
///
/// * It is a **full screen the user has to act on**, not a toast or a line of
///   fine print under a switch.
/// * It says **exactly what is read** — app names and how long each was open —
///   and exactly what it is used for.
/// * **"Not now" is a real answer** that returns without asking for anything.
///
/// [ScreenTimeService.openPermissionSettings] is called from precisely one
/// place: the accept button below. That single call site is what keeps
/// "disclosure first" true as the app grows.
class ScreenTimeDisclosureScreen extends ConsumerStatefulWidget {
  const ScreenTimeDisclosureScreen({super.key});

  static Future<bool> open(BuildContext context) async {
    final accepted = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => const ScreenTimeDisclosureScreen(),
      ),
    );
    return accepted ?? false;
  }

  @override
  ConsumerState<ScreenTimeDisclosureScreen> createState() =>
      _ScreenTimeDisclosureScreenState();
}

class _ScreenTimeDisclosureScreenState
    extends ConsumerState<ScreenTimeDisclosureScreen> {
  bool _busy = false;

  static const _points = <(IconData, String, String)>[
    (
      Icons.apps_rounded,
      'What StayHardy reads',
      'Which apps you opened and how long each one was in the foreground, plus '
          'how many times you unlocked your phone. Nothing inside any app — no '
          'messages, no accounts, no content.',
    ),
    (
      Icons.insights_rounded,
      'What it is used for',
      'One thing: showing your screen time next to your habit history, so you '
          'can see whether the days you miss habits are the days you are on '
          'your phone most.',
    ),
    (
      Icons.phone_android_rounded,
      'Where it goes',
      'Nowhere. It is stored on this phone only. It is never uploaded, never '
          'sent to our servers, never shared or sold, and it is left out of '
          'your backups. Per-app detail is deleted after 90 days.',
    ),
    (
      Icons.lock_open_rounded,
      'You stay in control',
      'You grant this by hand in Android settings and can revoke it there at '
          'any time. Turning it off in StayHardy deletes everything collected.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: t.bg,
      appBar: AppBar(
        backgroundColor: t.bg,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close_rounded, color: t.textPrimary),
          onPressed: () => Navigator.of(context).pop(false),
        ),
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding:
              const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
          children: [
            const ScreenTitle(title: 'Screen time'),
            const SizedBox(height: Space.md),
            Text(
              'Before you turn this on, here is exactly what it does.',
              style: text.bodyLarge?.copyWith(color: t.textSecondary),
            ),
            const SizedBox(height: Space.xl),

            for (final (icon, title, body) in _points) ...[
              _Point(icon: icon, title: title, body: body),
              const SizedBox(height: Space.xl),
            ],

            AppButton.primary(
              label: _busy ? 'OPENING SETTINGS…' : 'CONTINUE',
              onPressed: _busy ? null : _accept,
            ),
            const SizedBox(height: Space.sm),
            Text(
              'Android will ask you to switch on "Usage access" for StayHardy '
              'on the next screen.',
              textAlign: TextAlign.center,
              style: text.bodySmall?.copyWith(color: t.textMuted),
            ),
            const SizedBox(height: Space.md),
            Center(
              child: AppButton.text(
                label: 'NOT NOW',
                onPressed: () => Navigator.of(context).pop(false),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _accept() async {
    setState(() => _busy = true);
    final service = ref.read(screenTimeServiceProvider);

    // Recorded before the settings screen opens, so the ordering the policy
    // requires is a fact on disk rather than an assumption about navigation.
    await service.acceptDisclosure();
    await service.openPermissionSettings();

    if (mounted) {
      setState(() => _busy = false);
      Navigator.of(context).pop(true);
    }
  }
}

class _Point extends StatelessWidget {
  const _Point({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: Dimens.iconMd, color: t.accent),
        const SizedBox(width: Space.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: text.titleMedium),
              const SizedBox(height: Space.xs),
              Text(body,
                  style: text.bodyMedium?.copyWith(color: t.textSecondary)),
            ],
          ),
        ),
      ],
    );
  }
}
