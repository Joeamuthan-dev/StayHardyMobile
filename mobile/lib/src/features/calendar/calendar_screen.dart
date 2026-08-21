import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/calendar_repository.dart';
import '../../data/providers.dart';
import '../../domain/civil_date.dart';
import '../../theme/habit_categories.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/check_ring.dart';
import '../../ui/state_views.dart';
import '../paywall/paywall_screen.dart';
import '../shared/section_header.dart';

/// A month of history you can correct.
///
/// A read-only month grid is a decoration. The whole reason this screen earns
/// its place is the thing nothing else in the app can do: **tick off the
/// Tuesday you actually did but forgot to mark.** Everything else here exists
/// to get you to that tap.
class CalendarScreen extends ConsumerWidget {
  const CalendarScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const CalendarScreen()),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final month = ref.watch(calendarMonthProvider);
    final async = ref.watch(calendarProvider);

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
            message: "Couldn't load your calendar.",
            detail: e.toString(),
            onRetry: () => ref.invalidate(calendarProvider),
          ),
          data: (days) => _Body(month: month, days: days),
        ),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.month, required this.days});

  final CivilDate month;
  final List<CalendarDay> days;

  static const _months = ['January', 'February', 'March', 'April', 'May',
      'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final today = CivilDate.today();

    final tracked = days.where((d) => !d.isRestDay).toList();
    final complete = tracked.where((d) => d.isComplete).length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
      children: [
        ScreenTitle(
          title: _months[month.month - 1],
          trailing: '${month.year}',
        ),
        const SizedBox(height: Space.lg),

        Row(
          children: [
            _Arrow(
              icon: Icons.chevron_left_rounded,
              onTap: () => _go(context, ref, -1),
            ),
            const SizedBox(width: Space.sm),
            _Arrow(
              icon: Icons.chevron_right_rounded,
              // Never past the current month. There is nothing to show and
              // nothing to correct in a month that has not happened.
              onTap: month.month == today.month && month.year == today.year
                  ? null
                  : () => _go(context, ref, 1),
            ),
            const Spacer(),
            Text(
              tracked.isEmpty
                  ? 'Nothing tracked'
                  : '$complete of ${tracked.length} days clean',
              style: text.bodySmall?.copyWith(color: t.textMuted),
            ),
          ],
        ),
        const SizedBox(height: Space.xl),

        _Grid(days: days, today: today),
        const SizedBox(height: Space.lg),

        Row(
          children: [
            Text('Tap a day to fix it',
                style: text.bodySmall?.copyWith(color: t.textMuted)),
            const Spacer(),
            _Key(color: t.heat.last, label: 'all done'),
            const SizedBox(width: Space.md),
            _Key(color: t.heat[2], label: 'partial'),
            const SizedBox(width: Space.md),
            _Key(color: t.secondary, label: 'saved'),
          ],
        ),
      ],
    );
  }

  void _go(BuildContext context, WidgetRef ref, int delta) {
    final current = ref.read(calendarMonthProvider);
    // Via day 1 of the month, so stepping back from the 31st cannot land on a
    // month that has no 31st and silently skip one.
    final target = delta < 0
        ? current.addDays(-1).startOfMonth()
        : current.endOfMonth().addDays(1).startOfMonth();

    // Free history is the last 30 days, everywhere — same line the stats
    // ranges draw. A month that ended before that window is Pro.
    if (delta < 0 && !ref.read(isProProvider)) {
      final windowStart = CivilDate.today().addDays(-30);
      if (target.endOfMonth().isBefore(windowStart)) {
        PaywallScreen.open(context);
        return;
      }
    }
    ref.read(calendarMonthProvider.notifier).state = target;
  }
}

class _Grid extends ConsumerWidget {
  const _Grid({required this.days, required this.today});

  final List<CalendarDay> days;
  final CivilDate today;

  static const _dowLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    if (days.isEmpty) return const SizedBox.shrink();

    // Pad so the first of the month lands under its real weekday.
    final leading = days.first.date.dow;
    final cells = <CalendarDay?>[
      ...List<CalendarDay?>.filled(leading, null),
      ...days,
    ];

    return Column(
      children: [
        Row(
          children: [
            for (final label in _dowLabels)
              Expanded(
                child: Center(
                  child: Text(label,
                      style: Theme.of(context).textTheme.labelMedium),
                ),
              ),
          ],
        ),
        const SizedBox(height: Space.sm),
        for (var row = 0; row * 7 < cells.length; row++)
          Row(
            children: [
              for (var col = 0; col < 7; col++)
                Expanded(
                  child: _Cell(
                    day: row * 7 + col < cells.length
                        ? cells[row * 7 + col]
                        : null,
                    today: today,
                    onTap: (d) => _openDay(context, ref, d),
                  ),
                ),
            ],
          ),
        const SizedBox(height: Space.sm),
        Container(height: Dimens.hairline, color: t.border),
      ],
    );
  }

  Future<void> _openDay(
    BuildContext context,
    WidgetRef ref,
    CalendarDay day,
  ) async {
    if (day.date.isAfter(today)) return;
    unawaited(HapticFeedback.selectionClick().catchError((_) {}));
    await DaySheet.open(context, day.date);
  }
}

class _Cell extends StatelessWidget {
  const _Cell({required this.day, required this.today, required this.onTap});

  final CalendarDay? day;
  final CivilDate today;
  final void Function(CalendarDay) onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final d = day;
    if (d == null) return const SizedBox(height: 44);

    final isToday = d.date.iso == today.iso;
    final isFuture = d.date.isAfter(today);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: isFuture ? null : () => onTap(d),
      child: SizedBox(
        height: 44,
        child: Center(
          child: Builder(builder: (context) {
            final fill = _fill(d, t, isFuture);
            return Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: fill,
                borderRadius: BorderRadius.circular(Radii.sm),
                border: isToday
                    ? Border.all(color: t.accent, width: Dimens.border)
                    : null,
              ),
              alignment: Alignment.center,
              child: Text(
                '${d.date.day}',
                style: AuraType.numeral(
                  13,
                  // From the fill's own luminance: the ramp spans near-white
                  // to deep forest, and one fixed colour cannot read on both.
                  color: fill != null
                      ? t.onFill(fill)
                      : (isFuture ? t.textMuted : t.textPrimary),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }

  /// One scheme, used everywhere in the app: **deep green all done, lighter
  /// green the less of the day was kept, blue for a day a streak save covered,
  /// and nothing at all for a day that was missed or was never scheduled.**
  ///
  /// Leaving a miss unpainted rather than colouring it is deliberate. A grid
  /// that marks failure is a grid people stop opening, and an empty cell
  /// already reads as "nothing happened here".
  Color? _fill(CalendarDay d, AuraTokens t, bool isFuture) {
    if (isFuture) return null;
    if (d.frozen > 0 && !d.isComplete) return t.secondary;
    // A rest day is neither a win nor a loss and is painted as neither. Filling
    // it would make a Mon/Wed/Fri user's calendar look two-thirds failed.
    final rate = d.rate;
    if (rate == null) return null;
    if (rate >= 1) return t.heat.last;
    if (rate <= 0) return null;
    if (rate >= 0.67) return t.heat[3];
    if (rate >= 0.34) return t.heat[2];
    return t.heat[1];
  }
}

/// One day, and the habits that were due on it.
class DaySheet extends ConsumerStatefulWidget {
  const DaySheet({super.key, required this.date});

  final CivilDate date;

  static Future<void> open(BuildContext context, CivilDate date) {
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.aura.bg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.md)),
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.8,
      ),
      useSafeArea: true,
      builder: (_) => DaySheet(date: date),
    );
  }

  @override
  ConsumerState<DaySheet> createState() => _DaySheetState();
}

class _DaySheetState extends ConsumerState<DaySheet> {
  List<CalendarEntry>? _entries;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    final entries =
        await ref.read(calendarRepositoryProvider).entriesFor(widget.date);
    if (mounted) setState(() => _entries = entries);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final entries = _entries;

    return Padding(
      padding:
          const EdgeInsets.fromLTRB(Space.lg, Space.lg, Space.lg, Space.xl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: Space.lg),
              decoration: BoxDecoration(
                color: t.borderStrong,
                borderRadius: BorderRadius.circular(Radii.pill),
              ),
            ),
          ),
          Text(_dateLabel(widget.date), style: text.displaySmall),
          const SizedBox(height: Space.sm),
          Text(
            widget.date.iso == CivilDate.today().iso
                ? 'What was due today.'
                : 'Tick anything you did but forgot to mark.',
            style: text.bodyMedium?.copyWith(color: t.textMuted),
          ),
          const SizedBox(height: Space.lg),

          if (entries == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: Space.xl),
              child: LoadingView(),
            )
          else if (entries.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: Space.lg),
              child: Text(
                'Nothing was scheduled on this day.',
                style: text.bodyMedium?.copyWith(color: t.textMuted),
              ),
            )
          else
            Flexible(
              child: ListView(
                shrinkWrap: true,
                children: [
                  for (final entry in entries) _EntryRow(
                    entry: entry,
                    onToggle: () => _toggle(entry),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _toggle(CalendarEntry entry) async {
    // A freeze is a record of something the app did on the user's behalf, not
    // a check-in they can take back by tapping.
    if (entry.frozen) return;

    unawaited(HapticFeedback.selectionClick().catchError((_) {}));
    await ref.read(calendarRepositoryProvider).setDone(
          entry.habit.id,
          widget.date,
          done: !entry.done,
        );
    await _load();
  }

  static String _dateLabel(CivilDate d) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
        'Sep', 'Oct', 'Nov', 'Dec'];
    return '${days[d.dow]} ${d.day} ${months[d.month - 1]}';
  }
}

class _EntryRow extends StatelessWidget {
  const _EntryRow({required this.entry, required this.onToggle});

  final CalendarEntry entry;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final category = HabitCategories.resolve(entry.habit.category);

    return InkWell(
      onTap: entry.frozen ? null : onToggle,
      splashColor: t.accent.withValues(alpha: Alphas.splash),
      highlightColor: t.accent.withValues(alpha: Alphas.highlight),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: Space.md),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: t.border, width: Dimens.hairline),
          ),
        ),
        child: Row(
          children: [
            if (entry.frozen)
              Icon(Icons.ac_unit_rounded,
                  size: Dimens.checkRing, color: t.accentMuted)
            else
              CheckRing(done: entry.done),
            const SizedBox(width: Space.md),
            category.glyph(size: Dimens.iconSm, color: category.colorOf(context)),
            const SizedBox(width: Space.sm),
            Expanded(
              child: Text(
                entry.habit.title,
                style: text.bodyLarge?.copyWith(
                  color: entry.done || entry.frozen
                      ? t.textMuted
                      : t.textPrimary,
                ),
              ),
            ),
            if (entry.frozen)
              Text('FROZEN',
                  style: text.labelMedium?.copyWith(color: t.accentMuted)),
          ],
        ),
      ),
    );
  }
}

class _Arrow extends StatelessWidget {
  const _Arrow({required this.icon, this.onTap});
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        width: Dimens.touchTarget,
        height: Dimens.touchTarget - 8,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          border: Border.all(color: t.border, width: Dimens.hairline),
          borderRadius: BorderRadius.circular(Radii.sm),
        ),
        child: Icon(icon,
            size: Dimens.iconMd,
            color: onTap == null ? t.border : t.textSecondary),
      ),
    );
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
          decoration: BoxDecoration(
              color: color, borderRadius: BorderRadius.circular(2)),
        ),
        const SizedBox(width: 4),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
