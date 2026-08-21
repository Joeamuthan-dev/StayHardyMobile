import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/providers.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/surface_card.dart';
import '../shared/section_header.dart';

/// The old app's "Why StayHardy?" page, carried over and refined — the same
/// promise, the same creator, the same face.
class AboutScreen extends ConsumerWidget {
  const AboutScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const AboutScreen()),
    );
  }

  static const _points = <(IconData, String)>[
    (Icons.checklist_rounded,
        'Tasks, goals, and daily habits — all in one place'),
    (Icons.insights_rounded,
        'Up to a year of stats — see exactly where you are winning'),
    (Icons.local_fire_department_rounded,
        'Streaks with rhythm and consistency, not guilt'),
    (Icons.lock_rounded,
        'Your data stays yours — on your phone, private, always accessible'),
    (Icons.savings_rounded,
        'Competes with premium apps. Priced to cover maintenance, not profit'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: t.bg,
      appBar: AppBar(
        backgroundColor: t.bg,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: t.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
          children: [
            const ScreenTitle(title: 'Why StayHardy?'),
            const SizedBox(height: Space.lg),

            SurfaceCard(
              gradient: Grad.surfaceWash(t),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Built for people who want to stay disciplined, '
                    'consistent, and in control.',
                    style: text.titleMedium,
                  ),
                  const SizedBox(height: Space.md),
                  Text(
                    "Tracking productivity, habits, and routines shouldn't "
                    'be complicated. Most apps are cluttered, overpriced, or '
                    'lock your own data behind paywalls. StayHardy was built '
                    'to fix exactly that.',
                    style: text.bodyMedium?.copyWith(color: t.textSecondary),
                  ),
                  const SizedBox(height: Space.lg),
                  for (final (icon, line) in _points)
                    Padding(
                      padding: const EdgeInsets.only(bottom: Space.sm),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(icon, size: Dimens.iconSm, color: t.accent),
                          const SizedBox(width: Space.md),
                          Expanded(
                            child: Text(line,
                                style: text.bodySmall
                                    ?.copyWith(color: t.textSecondary)),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),

            const SizedBox(height: Space.lg),
            const SectionLabel('MEET THE CREATOR'),
            const SizedBox(height: Space.md),
            SurfaceCard(
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(Radii.md),
                    child: Image.asset(
                      'assets/brand/joe.jpg',
                      width: 64,
                      height: 64,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(width: Space.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Joe Amuthan', style: text.titleMedium),
                        const SizedBox(height: 2),
                        Text('Sr. Software Engineer & Product Builder',
                            style: text.bodySmall
                                ?.copyWith(color: t.textMuted)),
                      ],
                    ),
                  ),
                  // The real LinkedIn mark, not a generic link glyph.
                  GestureDetector(
                    onTap: () => launchUrl(
                      Uri.parse('https://linkedin.com/in/joeamuthan'),
                      mode: LaunchMode.externalApplication,
                    ),
                    child: Container(
                      width: 34,
                      height: 34,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AuraTokens.linkedInBlue,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'in',
                        style: text.titleMedium?.copyWith(
                          color: t.onFill(AuraTokens.linkedInBlue),
                          fontWeight: FontWeight.w800,
                          height: 1,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: Space.lg),
            // Written as a reason, not a slogan.
            //
            // The old line ("consistency beats luck — the app just keeps the
            // score") was two claims nobody asked about: an argument against
            // luck, which nobody blames, and a description of a database. This
            // says why the thing exists and who it is for, which is the only
            // question an About page is actually being asked.
            Text(
              'I built this because I kept starting things and stopping.\n\n'
              'Not for people who are already disciplined — for the rest of '
              'us, on the days it would be easier not to. Open it, mark the '
              'day, close it. That is the whole idea.',
              textAlign: TextAlign.center,
              style: text.bodyMedium?.copyWith(
                color: t.textSecondary,
                height: 1.55,
              ),
            ),
            const SizedBox(height: Space.lg),
            SurfaceCard(
              padding: const EdgeInsets.symmetric(
                  horizontal: Space.lg, vertical: Space.md),
              child: Row(
                children: [
                  Text('Version', style: text.bodyLarge),
                  const Spacer(),
                  Text(ref.watch(appVersionProvider),
                      style: text.bodyMedium?.copyWith(color: t.textMuted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
