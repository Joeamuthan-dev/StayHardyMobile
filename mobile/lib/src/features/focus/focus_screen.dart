import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/database.dart';
import '../../data/focus_repository.dart';
import '../../data/goal_repository.dart';
import '../../data/providers.dart';
import '../../domain/focus_rules.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/editor_sheet.dart';
import '../../ui/hourglass.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../paywall/paywall_screen.dart';
import '../shared/section_header.dart';

/// The focus timer.
///
/// Two states in one screen — idle (pick a length and a goal) and running (the
/// clock) — because they are the same object at different moments, and a
/// separate "session" screen would mean the setup choices live somewhere the
/// running timer cannot show them.
///
/// The screen repaints on a one-second `Timer`, but that tick is **only** a
/// repaint: every number on it is recomputed from [FocusRun]'s timestamps
/// against `DateTime.now()`. Dropping ticks — which Android does the instant the
/// process is backgrounded — therefore costs nothing but a stale pixel.
class FocusScreen extends ConsumerStatefulWidget {
  const FocusScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const FocusScreen()),
    );
  }

  @override
  ConsumerState<FocusScreen> createState() => _FocusScreenState();
}

class _FocusScreenState extends ConsumerState<FocusScreen> {
  Timer? _repaint;
  int _minutes = focusDefaultMinutes;
  String? _goalId;
  String? _habitId;
  String? _label;
  bool _busy = false;

  /// True once this screen has seen the running session reach its target, so
  /// the completion state is shown even if the user was looking elsewhere.
  bool _celebrated = false;

  @override
  void initState() {
    super.initState();
    _repaint = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  // No wakelock, deliberately. Holding the screen on for 25 minutes would drain
  // the battery to display a number nobody should be watching — and the whole
  // proposition here is "put the phone down". The timer survives the screen
  // going off because it is wall-clock based, and the notification is what
  // brings the user back.

  @override
  void dispose() {
    _repaint?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final async = ref.watch(activeFocusProvider);

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
        child: async.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(
            message: "Couldn't open focus.",
            detail: e.toString(),
            onRetry: () => ref.invalidate(activeFocusProvider),
          ),
          data: (run) =>
              run == null ? _buildIdle(context) : _buildRunning(context, run),
        ),
      ),
    );
  }

  // --- idle ------------------------------------------------------------------

  Widget _buildIdle(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final goals = ref.watch(goalsProvider).value ?? const <GoalView>[];
    final active = goals.where((g) => !g.isComplete).toList();
    final habits = ref.watch(activeHabitsProvider).value ?? const <Habit>[];
    final summary = ref.watch(focusSummaryProvider).value ?? FocusSummary.empty;
    final quota = ref.watch(focusQuotaProvider);

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
      children: [
        const ScreenTitle(title: 'Focus'),
        const SizedBox(height: Space.md),
        Text(
          'One block, one thing. The clock runs on real time — it keeps going '
          'with the screen off, and it does not stop because you left the app.',
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),
        const SizedBox(height: Space.xl),

        Field(
          label: 'How long',
          child: Row(
            children: [
              for (final m in focusPresetMinutes)
                Padding(
                  padding: const EdgeInsets.only(right: Space.sm),
                  child: ChoiceChipTile(
                    label: '$m min',
                    selected: m == _minutes,
                    onTap: () => setState(() => _minutes = m),
                  ),
                ),
            ],
          ),
        ),

        // What-for is built from the user's own life — their habits and
        // goals — plus a free-text chip for everything else. Nothing here is
        // hard-coded; an empty library just means fewer chips.
        Field(
          label: 'What for',
          child: Wrap(
            spacing: Space.sm,
            runSpacing: Space.sm,
            children: [
              ChoiceChipTile(
                label: 'Nothing in particular',
                selected:
                    _goalId == null && _habitId == null && _label == null,
                onTap: () => setState(() {
                  _goalId = null;
                  _habitId = null;
                  _label = null;
                }),
              ),
              for (final h in habits)
                ChoiceChipTile(
                  label: h.title,
                  selected: h.id == _habitId,
                  onTap: () => setState(() {
                    _habitId = h.id;
                    _goalId = null;
                    _label = null;
                  }),
                ),
              for (final g in active)
                ChoiceChipTile(
                  label: g.goal.name,
                  selected: g.goal.id == _goalId,
                  onTap: () => setState(() {
                    _goalId = g.goal.id;
                    _habitId = null;
                    _label = null;
                  }),
                ),
              if (_label != null)
                ChoiceChipTile(
                  label: _label!,
                  selected: true,
                  onTap: _askLabel,
                ),
              ChoiceChipTile(
                label: _label == null ? '+ Something else' : 'Change it',
                selected: false,
                onTap: _askLabel,
              ),
            ],
          ),
        ),

        if (summary.todaySessions > 0) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: Space.lg),
            child: SurfaceCard(
              padding: const EdgeInsets.all(Space.md),
              child: Row(
                children: [
                  _CycleDots(completedToday: summary.todaySessions),
                  const SizedBox(width: Space.md),
                  Expanded(
                    child: Text(
                      'Block ${Pomodoro.positionInCycle(summary.todaySessions)} '
                      'of ${Pomodoro.cycleLength} today · '
                      '${Pomodoro.breakMinutesAfter(summary.todaySessions)} min '
                      '${Pomodoro.phaseAfter(summary.todaySessions).label.toLowerCase()} after',
                      style: text.bodySmall?.copyWith(color: t.textSecondary),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],

        if (quota.isLimited) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: Space.md),
            child: SurfaceCard(
              tint: quota.canStart ? null : t.accent,
              padding: const EdgeInsets.all(Space.md),
              onTap: quota.canStart
                  ? null
                  : () => PaywallScreen.open(context),
              child: Row(
                children: [
                  IconBadge(
                    icon: quota.canStart
                        ? Icons.hourglass_bottom_rounded
                        : Icons.lock_outline_rounded,
                    color: t.accent,
                    size: 34,
                  ),
                  const SizedBox(width: Space.md),
                  Expanded(
                    child: Text(
                      quota.canStart
                          ? '${quota.remaining} of $freeFocusSessionsPerDay '
                              'free blocks left today'
                          : "That's both free blocks used. Pro removes the "
                              'limit — your history stays either way.',
                      style: text.bodySmall
                          ?.copyWith(color: t.textSecondary),
                    ),
                  ),
                  if (!quota.canStart)
                    Icon(Icons.chevron_right_rounded,
                        size: Dimens.iconMd, color: t.textMuted),
                ],
              ),
            ),
          ),
        ],

        AppButton.primary(
          label: !quota.canStart
              ? 'GET PRO FOR UNLIMITED'
              : (_busy ? 'STARTING…' : 'START $_minutes MINUTES'),
          onPressed: _busy
              ? null
              : (quota.canStart
                  ? _start
                  : () => PaywallScreen.open(context)),
        ),

        if (summary.todayMinutes > 0 || summary.weekMinutes > 0) ...[
          const SizedBox(height: Space.xxl),
          const SectionLabel('So far'),
          const SizedBox(height: Space.md),
          _SummaryCard(summary: summary),
        ],
      ],
    );
  }

  // --- running ---------------------------------------------------------------

  int get _completedToday =>
      ref.watch(focusSummaryProvider).value?.todaySessions ?? 0;

  Widget _buildRunning(BuildContext context, FocusRun run) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final now = DateTime.now().millisecondsSinceEpoch;
    final finished = run.isFinishedAt(now);
    final remaining = run.remainingAt(now);

    if (finished && !_celebrated) {
      _celebrated = true;
      unawaited(HapticFeedback.mediumImpact().catchError((_) {}));
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
      children: [
        ScreenTitle(
          title: finished ? 'Done' : (run.isPaused ? 'Paused' : 'Focusing'),
          // "Focus block · Listen to a podcast" — the session named plainly,
          // not narrated.
          trailing: run.focusLabel == null
              ? null
              : 'FOCUS BLOCK · ${run.focusLabel!.toUpperCase()}',
        ),
        const SizedBox(height: Space.xl),

        Center(
          child: _TimerDial(
            run: run,
            now: now,
            finished: finished,
            remaining: remaining,
          ),
        ),
        const SizedBox(height: Space.md),

        // Where this block sits in the pomodoro cycle — said, not implied.
        Center(child: _CycleDots(completedToday: _completedToday)),
        const SizedBox(height: Space.lg),

        if (!finished)
          _Encouragement(paused: run.isPaused, label: run.focusLabel),
        const SizedBox(height: Space.md),

        if (run.interruptions > 0 && !finished)
          Center(
            child: Text(
              run.interruptions == 1
                  ? 'Stopped once'
                  : 'Stopped ${run.interruptions} times',
              style: text.bodySmall?.copyWith(color: t.textMuted),
            ),
          ),
        const SizedBox(height: Space.xl),

        if (finished) ...[
          // The finish, made to feel finished: a settled check, two words,
          // and a clear pair of next actions.
          Center(
            child: Column(
              children: [
                Icon(Icons.check_circle_rounded,
                    size: 44, color: t.success),
                const SizedBox(height: Space.sm),
                Text('Focus complete', style: text.titleLarge),
                const SizedBox(height: 2),
                Text(
                  'Nice work — ${run.plannedSeconds ~/ 60} minutes'
                  '${run.focusLabel == null ? '' : ' on ${run.focusLabel}'}.',
                  textAlign: TextAlign.center,
                  style: text.bodyMedium?.copyWith(color: t.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(height: Space.xl),
          AppButton.primary(
            label: 'DONE',
            onPressed: _busy ? null : () => _finish(run.id, close: true),
          ),
          const SizedBox(height: Space.xs),
          Center(
            child: AppButton.text(
              label: 'START ANOTHER',
              onPressed: _busy ? null : () => _finish(run.id),
            ),
          ),
        ] else ...[
          // One prominent action. Completing early is quiet and honourable;
          // discarding is small and red.
          if (run.isPaused)
            AppButton.primary(
              label: 'RESUME',
              onPressed: _busy ? null : () => _resume(run),
            )
          else
            AppButton.primary(
              label: 'PAUSE',
              onPressed: _busy ? null : () => _pause(run.id),
            ),
          const SizedBox(height: Space.md),
          Center(
            child: AppButton.outline(
              label: 'COMPLETE SESSION',
              expand: false,
              onPressed: _busy ? null : () => _completeEarly(run),
            ),
          ),
          const SizedBox(height: Space.xs),
          Center(
            child: AppButton.text(
              label: 'DISCARD',
              danger: true,
              onPressed: _busy ? null : () => _abandon(run.id),
            ),
          ),
        ],
      ],
    );
  }

  /// Completing early still banks the time — a user who has done 11 of 15
  /// minutes has done 11 minutes of work, and an app that throws that away
  /// teaches them not to start. The confirm exists only to catch a stray tap.
  Future<void> _completeEarly(FocusRun run) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    final focusedMin = run.elapsedAt(now) ~/ 60;
    final plannedMin = run.plannedSeconds ~/ 60;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: c.aura.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.md),
        ),
        title: Text('Complete session early?',
            style: Theme.of(c).textTheme.titleLarge),
        content: Text(
          "You've focused for $focusedMin of $plannedMin minutes — it all "
          'counts.',
          style: Theme.of(c).textTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: Text('Keep focusing',
                style: TextStyle(color: c.aura.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: Text('Complete', style: TextStyle(color: c.aura.accent)),
          ),
        ],
      ),
    );
    if (confirmed == true) await _finish(run.id);
  }

  // --- actions ---------------------------------------------------------------

  /// Free-text "what for" — typed once, kept until changed.
  Future<void> _askLabel() async {
    final controller = TextEditingController(text: _label ?? '');
    await EditorSheet.show(
      context,
      EditorSheet(
        title: 'What is this block for?',
        saveLabel: 'SET',
        onSave: () {
          final value = controller.text.trim();
          if (value.isEmpty) return false;
          setState(() {
            _label = value;
            _goalId = null;
            _habitId = null;
          });
          return true;
        },
        children: [
          TextField(
            controller: controller,
            autofocus: true,
            maxLength: 60,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              hintText: 'Write the essay intro',
              counterText: '',
            ),
          ),
        ],
      ),
    );
    controller.dispose();
  }

  Future<void> _start() async {
    // Synchronous re-entrancy guard. `_busy` disables the button, but only from
    // the next frame — two taps inside one frame both get through, and the
    // second would start a second session on top of the first.
    if (_busy) return;
    setState(() => _busy = true);
    final run = await ref.read(focusRepositoryProvider).start(
          plannedSeconds: _minutes * 60,
          goalId: _goalId,
          habitId: _habitId,
          label: _label,
        );
    await _armNotification(run);
    if (mounted) {
      setState(() {
        _busy = false;
        _celebrated = false;
      });
    }
  }

  Future<void> _pause(String id) async {
    setState(() => _busy = true);
    await ref.read(focusRepositoryProvider).pause(id);
    await ref.read(notificationServiceProvider).cancelFocusEnd();
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _resume(FocusRun run) async {
    setState(() => _busy = true);
    final repo = ref.read(focusRepositoryProvider);
    await repo.resume(run.id);
    // Re-read rather than extrapolate: the new due time depends on the resume
    // timestamp the repository actually wrote.
    await _armNotification(await repo.activeRun());
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _finish(String id, {bool close = false}) async {
    setState(() => _busy = true);
    await ref.read(focusRepositoryProvider).finish(id);
    await ref.read(notificationServiceProvider).cancelFocusEnd();
    if (!mounted) return;
    setState(() {
      _busy = false;
      _celebrated = false;
    });
    // DONE leaves; START ANOTHER stays on the setup with the last choice
    // still selected.
    if (close) Navigator.of(context).pop();
  }

  Future<void> _abandon(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: c.aura.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.md),
        ),
        title: Text('Discard this session?',
            style: Theme.of(c).textTheme.titleLarge),
        content: Text(
          'The time is thrown away and nothing is recorded. Use "finish early" '
          'if you want to keep what you have done.',
          style: Theme.of(c).textTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: Text('Keep going',
                style: TextStyle(color: c.aura.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Discard'),
          ),
        ],
      ),
    );
    if (!(confirmed ?? false)) return;

    setState(() => _busy = true);
    await ref.read(focusRepositoryProvider).abandon(id);
    await ref.read(notificationServiceProvider).cancelFocusEnd();
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _armNotification(FocusRun? run) async {
    final due = run?.dueAt;
    final notify = ref.read(notificationServiceProvider);
    if (due == null) {
      await notify.cancelFocusEnd();
      return;
    }
    await notify.scheduleFocusEnd(due, goalName: run?.goalName);
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.summary});
  final FocusSummary summary;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      child: Row(
        children: [
          Expanded(
            child: _Metric(
              value: formatFocusTotal(summary.todayMinutes),
              label: 'TODAY',
              accent: true,
            ),
          ),
          Expanded(
            child: _Metric(
              value: formatFocusTotal(summary.weekMinutes),
              label: '7 DAYS',
            ),
          ),
          Expanded(
            child: _Metric(
              value: formatFocusTotal(summary.bestDayMinutes),
              label: 'BEST DAY',
            ),
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.value,
    required this.label,
    this.accent = false,
  });

  final String value;
  final String label;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Column(
      children: [
        Text(
          value,
          style: AuraType.numeral(
            26,
            color: accent ? t.accent : t.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Text(label,
            style: Theme.of(context).textTheme.labelMedium,
            textAlign: TextAlign.center),
      ],
    );
  }
}

/// Opens focus, or the paywall.
///
/// One entry point, mirroring `openHabitEditorRespectingCap` — the plan check
/// lives here rather than at each button so a future entry point cannot bypass
/// it. Focus is Pro by the plan of record.
/// The single entry point to the timer, and the only place the free limit is
/// enforced.
///
/// Focus used to be Pro-only. It is now free with a daily allowance — see
/// [freeFocusSessionsPerDay] for why. The paywall appears when the allowance is
/// spent, not before, so the feature sells itself by being used.
Future<void> openFocusRespectingPlan(
  BuildContext context,
  WidgetRef ref,
) async {
  // A session already running is always reachable, Pro or not, quota or not.
  // Trapping a user behind a paywall while their own timer counts down would be
  // indefensible — and it can happen, since a subscription can lapse mid-session
  // and the allowance is spent the moment a block finishes.
  if (ref.read(activeFocusProvider).value != null) {
    await FocusScreen.open(context);
    return;
  }
  // The screen itself is always reachable: it shows history and the allowance.
  // Only *starting* is gated, and that gate lives on the start button so the
  // user can see what they would be buying.
  await FocusScreen.open(context);
}


/// The timer face: a sand clock, with the time beneath it.
///
/// The clock reads out in text below rather than inside the glass — the neck of
/// an hourglass is the middle of the shape, which is exactly where a number
/// would sit on top of the falling sand.
class _TimerDial extends StatelessWidget {
  const _TimerDial({
    required this.run,
    required this.now,
    required this.finished,
    required this.remaining,
  });

  final FocusRun run;
  final int now;
  final bool finished;
  final int remaining;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final paused = run.isPaused;
    final reduceMotion = MediaQuery.of(context).disableAnimations;

    Widget glass = Hourglass(
      fraction: run.fractionAt(now),
      running: !paused && !finished,
      finished: finished,
      // The hero. Everything else on this screen is caption to it.
      size: 262,
      sand: finished ? t.success : (paused ? t.textMuted : t.accent),
    );

    // The physical metaphor, used once per session: a freshly started run
    // enters with the hourglass turning upright — the flip that starts real
    // sand. Never replayed on pause/resume or on revisiting mid-session, and
    // skipped entirely under reduced motion.
    final freshlyStarted = now - run.startedAt < 4000;
    if (freshlyStarted && !reduceMotion) {
      glass = TweenAnimationBuilder<double>(
        tween: Tween(begin: 1, end: 0),
        duration: const Duration(milliseconds: 850),
        curve: Curves.easeOutBack,
        builder: (context, v, child) =>
            Transform.rotate(angle: v * 3.14159265, child: child),
        child: glass,
      );
    }

    // Completion: one settle pulse, not confetti. The final grains landing
    // plus this breath of scale is the whole celebration.
    if (finished && !reduceMotion) {
      glass = TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: const Duration(milliseconds: 900),
        curve: Curves.elasticOut,
        builder: (context, v, child) =>
            Transform.scale(scale: 0.94 + 0.06 * v, child: child),
        child: glass,
      );
    }

    return Column(
      children: [
        _Breathing(
          active: !paused && !finished && !reduceMotion,
          colour: finished ? t.success : t.accent,
          child: glass,
        ),
        const SizedBox(height: Space.lg),
        Text(
          formatFocusClock(remaining),
          style: AuraType.numeral(
            56,
            color: finished ? t.success : t.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          finished
              ? '${run.plannedSeconds ~/ 60} MIN BANKED'
              : (paused
                  ? 'PAUSED'
                  : '${run.plannedSeconds ~/ 60} MIN FOCUS'),
          style: text.labelMedium,
        ),
      ],
    );
  }
}

class _CycleDots extends StatelessWidget {
  const _CycleDots({required this.completedToday});
  final int completedToday;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final done = completedToday % Pomodoro.cycleLength;
    // A finished fourth block fills all four rather than resetting to none —
    // "you completed a full cycle" is the moment worth showing.
    final filled = completedToday > 0 && done == 0 ? Pomodoro.cycleLength : done;

    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < Pomodoro.cycleLength; i++)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: AnimatedContainer(
                  duration: Motion.base,
                  width: i < filled ? 22 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: i < filled ? t.accent : t.surfaceAlt,
                    borderRadius: BorderRadius.circular(Radii.pill),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: Space.xs),
        // Said, not implied — unexplained dots read as decoration.
        Text(
          'Session ${Pomodoro.positionInCycle(completedToday)} of '
          '${Pomodoro.cycleLength} today',
          style: Theme.of(context)
              .textTheme
              .labelMedium
              ?.copyWith(color: t.textMuted),
        ),
      ],
    );
  }
}


/// A slow breathing glow behind the hourglass — roughly the cadence of a calm
/// breath, so the page feels alive without ever demanding a glance.
class _Breathing extends StatefulWidget {
  const _Breathing({
    required this.active,
    required this.colour,
    required this.child,
  });

  final bool active;
  final Color colour;
  final Widget child;

  @override
  State<_Breathing> createState() => _BreathingState();
}

class _BreathingState extends State<_Breathing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _breath = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 3600),
  );

  @override
  void initState() {
    super.initState();
    if (widget.active) _breath.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(_Breathing old) {
    super.didUpdateWidget(old);
    if (widget.active && !_breath.isAnimating) {
      _breath.repeat(reverse: true);
    } else if (!widget.active && _breath.isAnimating) {
      _breath.stop();
    }
  }

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _breath,
      builder: (context, child) {
        final v = Curves.easeInOut.transform(_breath.value);
        return DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: widget.colour
                    .withValues(alpha: widget.active ? 0.07 + 0.09 * v : 0.05),
                blurRadius: 56 + 22 * v,
                spreadRadius: 6 + 6 * v,
              ),
            ],
          ),
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

/// A quiet line of encouragement that changes every so often — company for
/// the block, not a coach shouting over it.
class _Encouragement extends StatefulWidget {
  const _Encouragement({required this.paused, this.label});

  final bool paused;
  final String? label;

  @override
  State<_Encouragement> createState() => _EncouragementState();
}

class _EncouragementState extends State<_Encouragement> {
  static const _lines = [
    'One block, one thing. This is the thing.',
    'The sand only moves forward. So do you.',
    'Showing up is the whole trick — and here you are.',
    'Blocks like this, stacked daily, become the whole year.',
    'The phone can wait. It always could.',
    'Slow is smooth. Smooth is fast.',
    'Nobody sees this minute. It still counts.',
  ];

  Timer? _timer;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 22), (_) {
      if (mounted) setState(() => _index++);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  // The session's name lives in the header — narrating it here read as
  // placeholder text. The rotation is company, not a caption.
  List<String> get _pool => _lines;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    final line = widget.paused
        ? 'Paused — the sand waits for you.'
        : _pool[_index % _pool.length];

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 700),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (child, animation) => FadeTransition(
        opacity: animation,
        child: SlideTransition(
          position: Tween(
            begin: const Offset(0, 0.25),
            end: Offset.zero,
          ).animate(animation),
          child: child,
        ),
      ),
      child: Text(
        line,
        key: ValueKey(line),
        textAlign: TextAlign.center,
        style: text.bodyMedium?.copyWith(color: t.textSecondary),
      ),
    );
  }
}
