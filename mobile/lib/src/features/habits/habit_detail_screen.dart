import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/database.dart';
import '../../data/habit_repository.dart';
import '../../data/providers.dart';
import '../../domain/civil_date.dart';
import '../../domain/streak_engine.dart';
import '../../data/enums.dart';
import '../../theme/habit_categories.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/progress_ring.dart';

import '../../ui/check_ring.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../shared/section_header.dart';
import 'habit_editor.dart';

/// One habit, on its own.
///
/// The habits list answers "what now"; this answers "how am I doing at this,
/// really". Both numbers on it are computed over **sealed periods only** — an
/// open day dragging the rate down every morning and back up every evening
/// makes it look like the number moves on its own.
class HabitDetailScreen extends ConsumerWidget {
  const HabitDetailScreen({super.key, required this.habitId});

  final String habitId;

  static Future<void> open(BuildContext context, String habitId) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => HabitDetailScreen(habitId: habitId),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final async = ref.watch(habitDetailProvider(habitId));

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
        child: async.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(
            message: "Couldn't load this habit.",
            detail: e.toString(),
            onRetry: () => ref.invalidate(habitDetailProvider(habitId)),
          ),
          data: (detail) => _Body(detail: detail),
        ),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.detail});
  final HabitDetail detail;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final habit = detail.habit;
    final category = HabitCategories.resolve(habit.category);

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            IconBadge(
              icon: category.icon,
              color: category.colorOf(context),
              size: 44,
            ),
            const SizedBox(width: Space.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(habit.title, style: text.displayMedium),
                  const SizedBox(height: 4),
                  Text(
                    '${category.name.toUpperCase()}  ·  '
                    '${_scheduleLabel(ref, habit).toUpperCase()}',
                    style: text.labelMedium?.copyWith(color: t.textMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(width: Space.sm),
            HeaderAction(
              icon: Icons.edit_outlined,
              tooltip: 'Edit habit',
              onTap: () => HabitEditor.open(context, habit: habit),
            ),
          ],
        ),
        const SizedBox(height: Space.lg),

        // The action this page was missing entirely. Someone who opens a habit
        // to look at its history and realises they have not done it today had
        // to go back a screen to tick it — on the one screen entirely about
        // that habit.
        _TodayRow(detail: detail),
        const SizedBox(height: Space.lg),

        SurfaceCard(
          gradient: Grad.surfaceWash(t),
          child: Column(
            children: [
              ProgressRing(
                fraction: detail.recentRate / 100,
                size: 150,
                stroke: 12,
                color: detail.recentRate >= 80 ? t.success : null,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${detail.currentStreak}',
                      style: AuraType.numeral(
                        44,
                        color: detail.currentStreak > 0
                            ? t.textPrimary
                            : t.textMuted,
                      ),
                    ),
                    Text(
                      detail.currentStreak == 1 ? 'DAY STREAK' : 'DAY STREAK',
                      style: text.labelMedium,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: Space.md),
              // Says what the ring is measuring. An unlabelled arc around a
              // streak count reads as though the arc *is* the streak.
              Text(
                'Ring: ${detail.recentRate}% kept over the last 30 days',
                style: text.bodySmall?.copyWith(color: t.textMuted),
              ),
              const SizedBox(height: Space.lg),
              Divider(color: t.border, height: Dimens.hairline),
              const SizedBox(height: Space.md),
              Row(
                children: [
                  _Metric(
                    value: '${detail.longestStreak}',
                    label: 'BEST RUN',
                    tint: t.warn,
                  ),
                  _MetricDivider(),
                  _Metric(
                    value: '${detail.totalCompletions}',
                    label: 'CHECK-INS',
                    tint: t.accent,
                  ),
                  _MetricDivider(),
                  _Metric(
                    value: '${detail.allTimeRate}%',
                    label: 'ALL TIME',
                    tint: t.secondary,
                  ),
                ],
              ),
            ],
          ),
        ),

        if (detail.freezesUsed > 0) ...[
          const SizedBox(height: Space.lg),
          StatusNote(
            icon: Icons.ac_unit_rounded,
            message: detail.freezesUsed == 1
                ? 'A streak save covered one day here.'
                : '${detail.freezesUsed} streak saves have covered days here.',
            tint: t.accent,
          ),
        ],

        const SizedBox(height: Space.xxl),
        const SectionLabel('History'),
        const SizedBox(height: Space.md),
        _HistoryGrid(detail: detail),

        if (detail.firstLogDate != null) ...[
          const SizedBox(height: Space.md),
          Text(
            'First done ${_friendlyDate(detail.firstLogDate!)} · '
            'last done ${_friendlyDate(detail.lastLogDate!)}',
            style: text.bodySmall?.copyWith(color: t.textMuted),
          ),
        ],

        const SizedBox(height: Space.xl),
        AppButton.outline(
          label: 'EDIT, ARCHIVE OR DELETE',
          onPressed: () => HabitEditor.open(context, habit: habit),
        ),
      ],
    );
  }

  /// '23 Apr 2026' rather than '2026-04-23'.
  ///
  /// The ISO form is right in the database and wrong in a sentence — it reads
  /// as a machine identifier, which is exactly what it is.
  static String _friendlyDate(String iso) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
        'Sep', 'Oct', 'Nov', 'Dec'];
    final d = CivilDate.parse(iso);
    return '${d.day} ${months[d.month - 1]} ${d.year}';
  }

  String _scheduleLabel(WidgetRef ref, Habit habit) {
    final schedule = ref.read(habitRepositoryProvider).scheduleOf(habit);
    return switch (schedule.kind) {
      ScheduleKind.daily => 'Every day',
      ScheduleKind.weekdays => _weekdayLabel(habit.weekdayMask),
      ScheduleKind.timesPerPeriod =>
        '${habit.targetPerPeriod ?? 1}× a week, any days',
      ScheduleKind.everyNDays => 'Every ${habit.intervalDays ?? 1} days',
    };
  }

  static String _weekdayLabel(int mask) {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    final on = [
      for (var d = 0; d < 7; d++)
        if (mask & (1 << d) != 0) names[d],
    ];
    if (on.length == 7) return 'Every day';
    return on.join(', ');
  }
}

/// The last stretch of this habit's periods, oldest to newest.
///
/// Deliberately per-period, not per-calendar-day: a Mon/Wed/Fri habit has no
/// Sunday, and drawing an empty cell for one would read as a miss. Rest days
/// simply are not in the data — the same reason the streak engine needs no
/// special case for them.
class _HistoryGrid extends StatelessWidget {
  const _HistoryGrid({required this.detail});
  final HabitDetail detail;

  static const _maxCells = 91;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    if (detail.outcomes.isEmpty) {
      return Text('Nothing recorded yet.',
          style: text.bodyMedium?.copyWith(color: t.textMuted));
    }

    final today = CivilDate.today();
    final shown = detail.outcomes.length > _maxCells
        ? detail.outcomes.sublist(detail.outcomes.length - _maxCells)
        : detail.outcomes;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: Dimens.heatGap,
          runSpacing: Dimens.heatGap,
          children: [
            for (final o in shown)
              Container(
                width: Dimens.heatCell + 2,
                height: Dimens.heatCell + 2,
                decoration: BoxDecoration(
                  color: _colorFor(o, t, today),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
          ],
        ),
        const SizedBox(height: Space.sm),
        Row(
          children: [
            Text('Last ${shown.length} scheduled days',
                style: text.bodySmall?.copyWith(color: t.textMuted)),
            const Spacer(),
            _Key(color: t.heat.last, label: 'done'),
            const SizedBox(width: Space.md),
            _Key(color: t.secondary, label: 'saved'),
            const SizedBox(width: Space.md),
            _Key(color: t.heat.first, label: 'missed'),
          ],
        ),
      ],
    );
  }

  /// Deep green kept, blue saved, empty missed — the app-wide scheme.
  ///
  /// Saved was briefly pale green, which put it on the same ramp as a partial
  /// day and made the two indistinguishable in a grid of ninety cells. Blue is
  /// off the ramp entirely, which is the point: a save is not a degree of
  /// completion, it is a different kind of thing.
  Color _colorFor(PeriodOutcome o, AuraTokens t, CivilDate today) {
    if (o.frozen) return t.secondary;
    if (o.completed >= o.required) return t.heat.last;
    // Still open. Not a miss — the period has not ended.
    if (!o.end.isBefore(today)) return t.surfaceAlt;
    return t.heat.first;
  }
}

class _Key extends StatelessWidget {
  const _Key({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration:
              BoxDecoration(color: color, borderRadius: BorderRadius.circular(2)),
        ),
        const SizedBox(width: 4),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}


/// Today's state for this habit, and the tap that changes it.
class _TodayRow extends ConsumerWidget {
  const _TodayRow({required this.detail});
  final HabitDetail detail;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final today = CivilDate.today();
    final done = detail.doneDates.contains(today.iso);
    final frozen = detail.frozenDates.contains(today.iso);

    // A habit not scheduled today must not offer a check-off: logging it would
    // create a completion on a day the schedule never asked for.
    final schedule = ref.read(habitRepositoryProvider).scheduleOf(detail.habit);
    final dueToday = schedule.periodFor(today) != null;

    if (!dueToday) {
      return SurfaceCard(
        padding: const EdgeInsets.all(Space.md),
        child: Row(
          children: [
            Icon(Icons.event_busy_outlined,
                size: Dimens.iconMd, color: t.textMuted),
            const SizedBox(width: Space.md),
            Expanded(
              child: Text('Not scheduled today',
                  style: text.bodyMedium?.copyWith(color: t.textSecondary)),
            ),
          ],
        ),
      );
    }

    return SurfaceCard(
      tint: done ? t.success : null,
      padding: const EdgeInsets.all(Space.md),
      onTap: () {
        unawaited(HapticFeedback.selectionClick().catchError((_) {}));
        unawaited(ref.read(habitRepositoryProvider).toggle(detail.habit.id));
      },
      child: Row(
        children: [
          CheckRing(done: done, size: 30, tint: done ? t.success : null),
          const SizedBox(width: Space.md),
          Expanded(
            child: Text(
              frozen
                  ? 'Covered by a streak save'
                  : (done ? 'Done today' : 'Mark done today'),
              style: text.titleMedium
                  ?.copyWith(color: done ? t.success : t.textPrimary),
            ),
          ),
          if (done)
            Text('TAP TO UNDO',
                style: text.labelMedium?.copyWith(color: t.textMuted)),
        ],
      ),
    );
  }
}

class _MetricDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
        width: Dimens.hairline,
        height: 34,
        color: context.aura.border,
      );
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.value,
    required this.label,
    required this.tint,
  });

  final String value;
  final String label;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 18,
            height: 3,
            decoration: BoxDecoration(
              color: tint,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
          const SizedBox(height: 8),
          Text(value, style: AuraType.numeral(22, color: t.textPrimary)),
          const SizedBox(height: 2),
          Text(label,
              style: Theme.of(context).textTheme.labelMedium,
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
