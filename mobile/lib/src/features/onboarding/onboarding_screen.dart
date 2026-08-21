import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'onboarding_illustrations.dart';

import '../../data/enums.dart';
import '../../data/providers.dart';
import '../../data/settings_repository.dart';
import '../../theme/habit_categories.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/app_button.dart';
import '../../ui/check_ring.dart';
import '../../ui/surface_card.dart';

/// First run.
///
/// Three screens, and the third one *does something*: the user leaves with real
/// habits already created. An onboarding that only shows slides hands the user
/// an empty app and asks them to start from nothing, which is where most habit
/// apps lose people on day one.
///
/// Skippable at every step. Anyone who arrives via migration never sees this —
/// they already have their data.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;
  final _picked = <_Starter>{};
  bool _busy = false;

  /// Deliberately small and concrete. "Meditate daily" is a decision; "build
  /// mindfulness" is a mood.
  static const _starters = <_Starter>[
    // Specific and ordinary on purpose. "Move for 20 minutes" is a category;
    // "Walk 30 minutes" is something you either did or did not do today, which
    // is the only kind of habit a tracker can be honest about. Weighted toward
    // what this audience actually says out loud — studying, sleep, screen time,
    // family — rather than a wellness-app vocabulary.
    _Starter('Walk 30 minutes', 'Health'),
    _Starter('Read 10 pages', 'Learning'),
    _Starter('Study 1 hour', 'Learning'),
    _Starter('No phone in bed', 'Focus'),
    _Starter('Less social media', 'Focus'),
    _Starter('Sleep by 11', 'Health'),
    _Starter('Workout 20 minutes', 'Fitness'),
    _Starter('Drink 3L water', 'Health'),
    _Starter('Meditate 10 minutes', 'Mindset'),
    _Starter('Call family', 'Social'),
    _Starter('No junk food', 'Health'),
    _Starter('Plan tomorrow', 'Work'),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Skip stays available throughout. Trapping someone in onboarding
            // to inflate a completion metric is hostile.
            Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.only(right: Space.sm),
                child: AppButton.text(
                  label: _page == 2 ? 'SKIP FOR NOW' : 'SKIP',
                  onPressed: _busy ? null : _finish,
                ),
              ),
            ),
            Expanded(
              child: PageView(
                controller: _controller,
                onPageChanged: (i) => setState(() => _page = i),
                children: [
                  _Slide(
                    illustration: const MotivationVsConsistencyIllustration(),
                    eyebrow: 'WELCOME',
                    title: 'Discipline,\nnot motivation',
                    body: 'Motivation is weather. A routine you actually keep '
                        'is climate. StayHardy tracks the second one.',
                    points: [
                      (Icons.calendar_month_rounded,
                          'See your whole week at a glance'),
                      (Icons.local_fire_department_rounded,
                          'Streaks that survive one bad day'),
                      (Icons.insights_rounded,
                          'Find the day of the week you keep losing'),
                    ],
                  ),
                  _Slide(
                    illustration: const PrivateGridIllustration(),
                    eyebrow: 'PRIVACY',
                    title: 'Everything\nstays yours',
                    body: 'Your habits, goals and tasks live on this phone — '
                        'not on our servers.',
                    points: [
                      (Icons.phone_android_rounded,
                          'Works fully offline, forever'),
                      (Icons.cloud_outlined,
                          'Back up to your own Google Drive'),
                      (Icons.visibility_off_outlined,
                          'Screen-time data never leaves the device'),
                    ],
                  ),
                  _StarterPicker(
                    starters: _starters,
                    picked: _picked,
                    onToggle: (s) => setState(() {
                      _picked.contains(s) ? _picked.remove(s) : _picked.add(s);
                    }),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  Space.lg, Space.md, Space.lg, Space.lg),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      for (var i = 0; i < 3; i++)
                        AnimatedContainer(
                          duration: Motion.fast,
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: i == _page ? 18 : 6,
                          height: 3,
                          decoration: BoxDecoration(
                            color: i == _page ? t.accent : t.border,
                            borderRadius: BorderRadius.circular(Radii.pill),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: Space.lg),
                  AppButton.primary(
                    label: switch (_page) {
                      2 when _picked.isEmpty => 'START WITH NO HABITS',
                      2 => 'ADD ${_picked.length} '
                          'HABIT${_picked.length == 1 ? '' : 'S'}',
                      _ => 'CONTINUE',
                    },
                    onPressed: _busy ? null : _next,
                  ),
                  if (_page == 2) ...[
                    const SizedBox(height: Space.sm),
                    Text(
                      'You can change, add or remove any of these later.',
                      style: text.bodySmall?.copyWith(color: t.textMuted),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _next() {
    if (_page < 2) {
      unawaited(HapticFeedback.selectionClick().catchError((_) {}));
      _controller.nextPage(duration: Motion.base, curve: Motion.curve);
      return;
    }
    _finish();
  }

  Future<void> _finish() async {
    setState(() => _busy = true);

    final repo = ref.read(habitRepositoryProvider);
    for (final starter in _picked) {
      await repo.createHabit(
        title: starter.title,
        category: starter.category,
        kind: ScheduleKind.daily,
      );
    }

    await ref
        .read(settingsRepositoryProvider)
        .set(SettingsKeys.onboardingComplete, 'true');

    // BootGate re-reads this and moves on.
    ref.invalidate(onboardingCompleteProvider);
  }
}

class _Starter {
  const _Starter(this.title, this.category);
  final String title;
  final String category;
}

/// A pitch slide.
///
/// Was a headline and a paragraph on a bare ground, which is the cheapest
/// onboarding there is. The three concrete points below the copy do the real
/// work: they name features rather than asserting a mood, so someone deciding
/// whether to keep the app learns something in the four seconds they give it.
class _Slide extends StatelessWidget {
  const _Slide({
    required this.illustration,
    required this.eyebrow,
    required this.title,
    required this.body,
    required this.points,
  });

  final Widget illustration;
  final String eyebrow;
  final String title;
  final String body;
  final List<(IconData, String)> points;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    // Text assembles under the illustration a beat at a time — the page
    // performing its promise instead of stating it.
    Widget reveal(int index, Widget child) {
      if (MediaQuery.of(context).disableAnimations) return child;
      return TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: Duration(milliseconds: 420 + index * 110),
        curve: Curves.easeOutCubic,
        builder: (context, v, c) => Opacity(
          opacity: v,
          child:
              Transform.translate(offset: Offset(0, (1 - v) * 16), child: c),
        ),
        child: child,
      );
    }

    // Centred when the content fits, scrollable when it does not. Top-aligning
    // it left a dead half-screen between the last bullet and CONTINUE on tall
    // phones, which made a finished slide look like it was still loading.
    return LayoutBuilder(
      builder: (context, box) => SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
            horizontal: Space.lg, vertical: Space.md),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: box.maxHeight - Space.md * 2),
          child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          illustration,
          const SizedBox(height: Space.lg),
          reveal(0,
              Text(eyebrow, style: text.labelLarge?.copyWith(color: t.accent))),
          const SizedBox(height: Space.sm),
          reveal(1, Text(title, style: text.displayLarge)),
          const SizedBox(height: Space.md),
          reveal(
              2,
              Text(body,
                  style: text.bodyLarge?.copyWith(color: t.textSecondary))),
          const SizedBox(height: Space.xl),
          for (var i = 0; i < points.length; i++)
            reveal(
              3 + i,
              Padding(
                padding: const EdgeInsets.only(bottom: Space.md),
                child: Row(
                  children: [
                    Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: t.accent.withValues(alpha: Alphas.tint),
                        borderRadius: BorderRadius.circular(Radii.sm),
                      ),
                      child: Icon(points[i].$1, size: 15, color: t.accent),
                    ),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Text(
                        points[i].$2,
                        style: text.bodyMedium
                            ?.copyWith(color: t.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
          ),
        ),
      ),
    );
  }
}

class _StarterPicker extends StatelessWidget {
  const _StarterPicker({
    required this.starters,
    required this.picked,
    required this.onToggle,
  });

  final List<_Starter> starters;
  final Set<_Starter> picked;
  final void Function(_Starter) onToggle;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: Space.lg),
      children: [
        const SizedBox(height: Space.md),
        // Was a decorative breathing ring. On the one screen that asks the user
        // to *do* something, the top of the page should answer "how am I
        // doing?" — so it now counts what they have picked and fills as they
        // go, which is also the nudge toward picking more than one.
        _PickProgress(count: picked.length),
        const SizedBox(height: Space.md),
        Text('Pick a few\nto start', style: text.displayMedium),
        const SizedBox(height: Space.md),
        Text(
          'Two or three is plenty. Most people fail by starting with ten.',
          style: text.bodyLarge?.copyWith(color: t.textSecondary),
        ),
        const SizedBox(height: Space.xl),
        for (final s in starters)
          Padding(
            padding: const EdgeInsets.only(bottom: Space.sm),
            child: _StarterCard(
              starter: s,
              selected: picked.contains(s),
              onTap: () {
                unawaited(HapticFeedback.selectionClick().catchError((_) {}));
                onToggle(s);
              },
            ),
          ),
        const SizedBox(height: Space.lg),
      ],
    );
  }
}


/// A suggested habit, as a selectable card.
///
/// Matches the habit cards the user will see on Home five seconds later, so the
/// first screen that shows a habit already teaches what one looks like.
class _StarterCard extends StatelessWidget {
  const _StarterCard({
    required this.starter,
    required this.selected,
    required this.onTap,
  });

  final _Starter starter;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final category = HabitCategories.resolve(starter.category);
    final colour = category.colorOf(context);

    return SurfaceCard(
      tint: selected ? t.accent : null,
      padding: const EdgeInsets.symmetric(
          horizontal: Space.md, vertical: Space.md),
      onTap: onTap,
      child: Row(
        children: [
          IconBadge(icon: category.icon, color: colour, size: 36),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(starter.title, style: text.bodyLarge),
                const SizedBox(height: 2),
                Text(starter.category.toUpperCase(),
                    style: text.labelMedium?.copyWith(color: t.textMuted)),
              ],
            ),
          ),
          CheckRing(done: selected, size: 26),
        ],
      ),
    );
  }
}

/// How many starter habits are picked, as a filling bar.
///
/// Three segments, because three is the number that matters: the Circle scores
/// a full point only at three habits a day, and someone who leaves onboarding
/// with one habit has not really started. The bar reaching full is the quiet
/// argument for picking a third.
class _PickProgress extends StatelessWidget {
  const _PickProgress({required this.count});

  final int count;

  static const _target = 3;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final done = count >= _target;

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < _target; i++) ...[
              if (i > 0) const SizedBox(width: 6),
              AnimatedContainer(
                duration: Motion.base,
                curve: Motion.curve,
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: i < count ? t.accent : t.surfaceHigh,
                  borderRadius: BorderRadius.circular(Radii.pill),
                  boxShadow: i < count
                      ? [
                          BoxShadow(
                            color: t.accent.withValues(alpha: 0.45),
                            blurRadius: 9,
                          ),
                        ]
                      : null,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: Space.sm),
        AnimatedSwitcher(
          duration: Motion.base,
          child: Text(
            count == 0
                ? 'Pick your first'
                : done
                    ? '$count picked — that is a real day'
                    : '$count of $_target',
            key: ValueKey('$count-$done'),
            style: text.bodySmall?.copyWith(
              color: done ? t.accent : t.textMuted,
            ),
          ),
        ),
      ],
    );
  }
}
