import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../data/enums.dart';
import '../../domain/habit_finder.dart';
import '../../theme/habit_categories.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/surface_card.dart';
import 'habit_cap_sheet.dart';

/// The habit finder: five taps, then a routine built for this person.
///
/// Deliberately game-shaped — one question per screen, big chips, no typing,
/// a progress trail, and a reveal at the end. The person who opens this is
/// the person who does not know what to build; every ounce of friction here
/// costs exactly the users the feature exists for.
class HabitFinderScreen extends ConsumerStatefulWidget {
  const HabitFinderScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        fullscreenDialog: true,
        builder: (_) => const HabitFinderScreen(),
      ),
    );
  }

  @override
  ConsumerState<HabitFinderScreen> createState() => _HabitFinderScreenState();
}

class _HabitFinderScreenState extends ConsumerState<HabitFinderScreen> {
  int _step = 0;

  // Sliders carry a sensible default, so those steps are answered on
  // arrival — momentum matters more than a forced first touch.
  int _wakeMinutes = 7 * 60;
  int _sleepMinutes = 23 * 60;
  final Set<FocusArea> _areas = {};
  bool _areaLimitNudge = false;
  StartLevel? _level;
  Intensity? _intensity;

  List<HabitSuggestion>? _suggestions;
  final Set<String> _added = {};

  static const _steps = 5;

  bool get _stepAnswered => switch (_step) {
        0 || 1 => true,
        2 => _areas.isNotEmpty,
        3 => _level != null,
        _ => _intensity != null,
      };

  void _advance() {
    unawaited(HapticFeedback.selectionClick().catchError((_) {}));
    if (_step < _steps - 1) {
      setState(() => _step++);
      return;
    }
    setState(() {
      _suggestions = HabitFinder.suggest(FinderAnswers(
        wakeMinutes: _wakeMinutes,
        sleepMinutes: _sleepMinutes,
        areas: _areas,
        level: _level!,
        intensity: _intensity!,
      ));
    });
  }

  Future<void> _add(HabitSuggestion s) async {
    final repo = ref.read(habitRepositoryProvider);
    final isPro = ref.read(isProProvider);

    // The same door as every other create: the cap sheet, never a dead tap.
    final cap = await repo.capStatus(isPro: isPro);
    if (!cap.canCreate) {
      if (mounted) await HabitCapSheet.open(context, cap);
      return;
    }

    await repo.createHabit(
      title: s.title,
      category: s.category,
      kind: ScheduleKind.daily,
    );
    unawaited(HapticFeedback.mediumImpact().catchError((_) {}));
    if (mounted) setState(() => _added.add(s.title));
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    return Scaffold(
      backgroundColor: t.bg,
      appBar: AppBar(
        backgroundColor: t.bg,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close_rounded, color: t.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        top: false,
        child: AnimatedSwitcher(
          duration: Motion.base,
          switchInCurve: Curves.easeOutCubic,
          switchOutCurve: Curves.easeInCubic,
          transitionBuilder: (child, animation) => FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween(
                begin: const Offset(0.06, 0),
                end: Offset.zero,
              ).animate(animation),
              child: child,
            ),
          ),
          child: _suggestions == null
              ? _Question(
                  key: ValueKey('q$_step'),
                  step: _step,
                  totalSteps: _steps,
                  answered: _stepAnswered,
                  onNext: _advance,
                  onBack: _step == 0
                      ? null
                      : () => setState(() => _step--),
                  child: _questionBody(),
                )
              : _Results(
                  key: const ValueKey('results'),
                  suggestions: _suggestions!,
                  added: _added,
                  onAdd: _add,
                  onDone: () => Navigator.of(context).pop(),
                ),
        ),
      ),
    );
  }

  Widget _questionBody() {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    Widget chips<T>({
      required List<T> options,
      required String Function(T) label,
      required bool Function(T) selected,
      required void Function(T) onTap,
      String Function(T)? emoji,
    }) {
      return Wrap(
        spacing: Space.sm,
        runSpacing: Space.sm,
        children: [
          for (final o in options)
            GestureDetector(
              onTap: () => onTap(o),
              child: AnimatedContainer(
                duration: Motion.fast,
                padding: const EdgeInsets.symmetric(
                    horizontal: Space.lg, vertical: Space.md),
                decoration: BoxDecoration(
                  color: selected(o)
                      ? t.accent.withValues(alpha: Alphas.tintStrong)
                      : t.surface,
                  borderRadius: BorderRadius.circular(Radii.md),
                  border: Border.all(
                    color: selected(o) ? t.accent : t.border,
                    width: selected(o) ? 1.4 : Dimens.hairline,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (emoji != null) ...[
                      Text(emoji(o),
                          style: const TextStyle(fontSize: 18, height: 1)),
                      const SizedBox(width: Space.sm),
                    ],
                    Text(
                      label(o),
                      style: text.bodyLarge?.copyWith(
                        color: selected(o) ? t.accent : t.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      );
    }

    return switch (_step) {
      0 => _QuestionCopy(
          title: 'When do you usually wake up?',
          sub: 'Your routine gets built around your real day, not an ideal '
              'one.',
          child: _TimeDial(
            minutes: _wakeMinutes,
            min: 3 * 60,
            max: 12 * 60,
            quip: HabitFinder.wakeQuip(_wakeMinutes),
            onChanged: (m) => setState(() => _wakeMinutes = m),
          ),
        ),
      1 => _QuestionCopy(
          title: 'And when do you actually sleep?',
          sub: 'Not when you get into bed — when the phone finally loses.',
          child: _TimeDial(
            minutes: _sleepMinutes,
            min: 21 * 60,
            max: 30 * 60,
            quip: HabitFinder.sleepQuip(_sleepMinutes),
            onChanged: (m) => setState(() => _sleepMinutes = m),
          ),
        ),
      2 => _QuestionCopy(
          title: 'What do you want to improve?',
          sub: _areaLimitNudge
              ? 'Five is plenty — focus beats breadth.'
              : 'Pick up to five. ${_areas.length} of '
                  '${FocusArea.maxSelected} chosen.',
          child: chips<FocusArea>(
            options: FocusArea.values,
            label: (a) => a.label,
            emoji: (a) => a.emoji,
            selected: _areas.contains,
            onTap: (a) => setState(() {
              _areaLimitNudge = false;
              if (_areas.contains(a)) {
                _areas.remove(a);
              } else if (_areas.length < FocusArea.maxSelected) {
                _areas.add(a);
              } else {
                _areaLimitNudge = true;
              }
            }),
          ),
        ),
      3 => _QuestionCopy(
          title: 'Where are you right now?',
          sub: 'No wrong answer — the routine is sized to it.',
          child: chips<StartLevel>(
            options: StartLevel.values,
            label: (l) => l.label,
            selected: (l) => l == _level,
            onTap: (l) => setState(() => _level = l),
          ),
        ),
      _ => _QuestionCopy(
          title: 'How hard do you want to go?',
          sub: 'Smaller sticks better. You can always add more later.',
          child: chips<Intensity>(
            options: Intensity.values,
            label: (i) => '${i.label} · ${i.habitCount} habits',
            selected: (i) => i == _intensity,
            onTap: (i) => setState(() => _intensity = i),
          ),
        ),
    };
  }
}

/// A big time readout over a 15-minute-stepped slider, with the finder's
/// running commentary underneath. The quip is the gamification: the slider
/// answers back, so people tell it the truth.
class _TimeDial extends StatelessWidget {
  const _TimeDial({
    required this.minutes,
    required this.min,
    required this.max,
    required this.quip,
    required this.onChanged,
  });

  final int minutes;
  final int min;
  final int max;
  final String quip;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Center(
          child: Text(
            HabitFinder.clock(minutes),
            style: AuraType.numeral(46, color: t.accent),
          ),
        ),
        const SizedBox(height: Space.md),
        Slider(
          value: minutes.toDouble(),
          min: min.toDouble(),
          max: max.toDouble(),
          divisions: (max - min) ~/ 15,
          onChanged: (v) {
            final snapped = (v / 15).round() * 15;
            if (snapped != minutes) {
              unawaited(
                  HapticFeedback.selectionClick().catchError((_) {}));
            }
            onChanged(snapped);
          },
        ),
        const SizedBox(height: Space.md),
        Center(
          child: AnimatedSwitcher(
            duration: Motion.base,
            child: Text(
              quip,
              key: ValueKey(quip),
              textAlign: TextAlign.center,
              style: text.bodyMedium?.copyWith(color: t.textSecondary),
            ),
          ),
        ),
      ],
    );
  }
}

class _QuestionCopy extends StatelessWidget {
  const _QuestionCopy({
    required this.title,
    required this.sub,
    required this.child,
  });

  final String title;
  final String sub;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: text.headlineMedium),
        const SizedBox(height: Space.sm),
        Text(sub, style: text.bodyMedium?.copyWith(color: t.textSecondary)),
        const SizedBox(height: Space.xl),
        child,
      ],
    );
  }
}

class _Question extends StatelessWidget {
  const _Question({
    super.key,
    required this.step,
    required this.totalSteps,
    required this.answered,
    required this.onNext,
    required this.onBack,
    required this.child,
  });

  final int step;
  final int totalSteps;
  final bool answered;
  final VoidCallback onNext;
  final VoidCallback? onBack;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    return Padding(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // The trail: where you are in the game.
          Row(
            children: [
              for (var i = 0; i < totalSteps; i++)
                AnimatedContainer(
                  duration: Motion.base,
                  width: i == step ? 26 : 8,
                  height: 8,
                  margin: const EdgeInsets.only(right: 6),
                  decoration: BoxDecoration(
                    color: i <= step ? t.accent : t.surfaceAlt,
                    borderRadius: BorderRadius.circular(Radii.pill),
                  ),
                ),
            ],
          ),
          const SizedBox(height: Space.xl),
          Expanded(child: SingleChildScrollView(child: child)),
          const SizedBox(height: Space.md),
          Row(
            children: [
              if (onBack != null)
                AppButton.text(label: 'BACK', onPressed: onBack),
              const Spacer(),
              SizedBox(
                width: 190,
                child: AppButton.primary(
                  label: step == totalSteps - 1 ? 'SHOW MY HABITS' : 'NEXT',
                  onPressed: answered ? onNext : null,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Results extends ConsumerWidget {
  const _Results({
    super.key,
    required this.suggestions,
    required this.added,
    required this.onAdd,
    required this.onDone,
  });

  final List<HabitSuggestion> suggestions;
  final Set<String> added;
  final Future<void> Function(HabitSuggestion) onAdd;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Built for you', style: text.headlineMedium),
          const SizedBox(height: Space.sm),
          Text(
            'Tap + and it lands on your Habits page, scheduled daily from '
            'today. Start small — you can edit any of them later.',
            style: text.bodyMedium?.copyWith(color: t.textSecondary),
          ),
          const SizedBox(height: Space.lg),
          Expanded(
            child: ListView.separated(
              itemCount: suggestions.length,
              separatorBuilder: (_, _) => const SizedBox(height: Space.sm),
              itemBuilder: (context, i) {
                final s = suggestions[i];
                final category = HabitCategories.resolve(s.category);
                final done = added.contains(s.title);

                return SurfaceCard(
                  padding: const EdgeInsets.symmetric(
                      horizontal: Space.md, vertical: Space.md),
                  child: Row(
                    children: [
                      category.glyph(
                          size: Dimens.iconMd,
                          color: category.colorOf(context)),
                      const SizedBox(width: Space.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(s.title, style: text.bodyLarge),
                            const SizedBox(height: 3),
                            Text(
                              s.reason,
                              style: text.bodySmall
                                  ?.copyWith(color: t.textMuted),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: Space.sm),
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: done ? null : () => onAdd(s),
                        child: AnimatedContainer(
                          duration: Motion.base,
                          width: 42,
                          height: 42,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            gradient: done ? null : Grad.brand(t),
                            color: done ? t.surfaceAlt : null,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            done
                                ? Icons.check_rounded
                                : Icons.add_rounded,
                            size: Dimens.iconMd,
                            color: done ? t.success : t.onAccent,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: Space.md),
          AppButton.primary(
            label: added.isEmpty ? 'MAYBE LATER' : 'DONE — TAKE ME THERE',
            onPressed: onDone,
          ),
        ],
      ),
    );
  }
}
