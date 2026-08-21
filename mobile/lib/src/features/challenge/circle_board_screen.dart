import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/challenge_service.dart';
import '../../data/providers.dart';
import '../../domain/challenge_rules.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../shared/section_header.dart';
import '../../ui/app_button.dart';
import 'prize_banner.dart';
import 'share_circle_sheet.dart';

/// The full circle board — one page, both kinds of circle.
///
/// A podium for the top three, the board to twenty, and the caller's own row
/// pinned underneath when they sit outside it: the two questions a
/// leaderboard exists to answer are "who is winning" and "where am I", and
/// neither may require scrolling past the other.
///
/// What a row shows is a name, an optional "where I'm from", a tier label,
/// and a number. Never a habit — those live on the member's phone and
/// nowhere else.
class CircleBoardScreen extends ConsumerWidget {
  const CircleBoardScreen({super.key, required this.circle});

  final Circle circle;

  static Future<void> open(BuildContext context, Circle circle) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CircleBoardScreen(circle: circle),
      ),
    );
  }

  /// Days of the cohort that have happened so far, for pace-based tiers.
  int _daysElapsed() {
    final start = DateTime.tryParse(circle.startDay);
    if (start == null) return 1;
    final days = DateTime.now().difference(start).inDays + 1;
    return days < 1 ? 1 : days;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;

    final rowsAsync = circle.isGlobal
        ? ref.watch(globalStandingsProvider).whenData(_fromGlobal)
        : ref
            .watch(circleStandingsProvider(circle.id))
            .whenData((s) => _fromPrivate(s, ref.read(authUserIdProvider)));

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
        child: rowsAsync.when(
          loading: () => const LoadingView(),
          error: (e, _) => ErrorView(
            message: "Couldn't load the board.",
            detail: e.toString(),
            onRetry: () => circle.isGlobal
                ? ref.invalidate(globalStandingsProvider)
                : ref.invalidate(circleStandingsProvider(circle.id)),
          ),
          data: (rows) => _Board(
            circle: circle,
            rows: rows,
            daysElapsed: _daysElapsed(),
          ),
        ),
      ),
    );
  }

  List<_BoardRow> _fromGlobal(List<GlobalStanding> standings) => [
        for (final s in standings)
          _BoardRow(
            rank: s.rank,
            name: s.displayName,
            location: s.location,
            points: s.points,
            isCaller: s.isCaller,
            habitCount: s.habitCount,
          ),
      ];

  /// Private standings arrive sorted but unranked; ties share a rank, the
  /// same way the server ranks the global board.
  List<_BoardRow> _fromPrivate(List<CircleStanding> standings, String? uid) {
    final rows = <_BoardRow>[];
    var rank = 0;
    double? lastPoints;
    for (var i = 0; i < standings.length; i++) {
      final s = standings[i];
      if (lastPoints == null || s.points != lastPoints) {
        rank = i + 1;
        lastPoints = s.points;
      }
      rows.add(_BoardRow(
        rank: rank,
        name: s.displayName,
        location: s.location,
        points: s.points,
        isCaller: uid != null && s.userId == uid,
      ));
    }
    return rows;
  }
}

class _BoardRow {
  const _BoardRow({
    required this.rank,
    required this.name,
    required this.location,
    required this.points,
    required this.isCaller,
    this.habitCount = 0,
  });

  final int rank;
  final String name;
  final String? location;
  final double points;
  final bool isCaller;

  /// How many habits they run — encouragement, never content.
  final int habitCount;
}

class _Board extends ConsumerWidget {
  const _Board({
    required this.circle,
    required this.rows,
    required this.daysElapsed,
  });

  final Circle circle;
  final List<_BoardRow> rows;
  final int daysElapsed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    final podium = rows.where((r) => r.rank <= 3).take(3).toList();
    final board = rows.where((r) => r.rank > 3 && r.rank <= 20).toList();
    final callerOutside =
        rows.where((r) => r.isCaller && r.rank > 20).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
      children: [
        ScreenTitle(
          title: circle.isGlobal ? 'StayHardy Circle' : circle.name,
          trailing: _monthLabel(circle.startDay).toUpperCase(),
        ),
        const SizedBox(height: Space.xs),
        Text(
          'Habits stay private — the board only sees names and numbers.',
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),
        if (circle.isGlobal) ...[
          const SizedBox(height: Space.md),
          const PrizeBanner(),
        ],
        const SizedBox(height: Space.md),
        // One tap explains the whole scoring system — the rules moved off
        // the page and into a sheet, so the board leads with the board.
        SurfaceCard(
          padding: const EdgeInsets.symmetric(
              horizontal: Space.lg, vertical: Space.md),
          onTap: () => _HowPointsSheet.open(context),
          child: Row(
            children: [
              Icon(Icons.calculate_rounded,
                  size: Dimens.iconSm, color: t.accent),
              const SizedBox(width: Space.md),
              Expanded(
                child: Text('How do points work?',
                    style: text.bodyMedium),
              ),
              Icon(Icons.chevron_right_rounded,
                  size: Dimens.iconSm, color: t.textMuted),
            ],
          ),
        ),
        const SizedBox(height: Space.xl),

        if (rows.isEmpty)
          SurfaceCard(
            child: Text(
              'The month is young — nobody is on the board yet. Share a day '
              'and be first.',
              style: text.bodyMedium?.copyWith(color: t.textSecondary),
            ),
          )
        else ...[
          _Podium(rows: podium, daysElapsed: daysElapsed),
          if (board.isNotEmpty) ...[
            const SizedBox(height: Space.xl),
            const SectionLabel('THE BOARD'),
            const SizedBox(height: Space.sm),
            SurfaceCard(
              padding: const EdgeInsets.symmetric(
                  horizontal: Space.lg, vertical: Space.sm),
              child: Column(
                children: [
                  for (final r in board)
                    _Row(row: r, daysElapsed: daysElapsed),
                ],
              ),
            ),
          ],
          if (callerOutside.isNotEmpty) ...[
            const SizedBox(height: Space.md),
            Center(
              child: Text('···',
                  style: text.labelMedium?.copyWith(color: t.textMuted)),
            ),
            const SizedBox(height: Space.md),
            SurfaceCard(
              padding: const EdgeInsets.symmetric(
                  horizontal: Space.lg, vertical: Space.sm),
              child: Column(
                children: [
                  for (final r in callerOutside)
                    _Row(row: r, daysElapsed: daysElapsed),
                ],
              ),
            ),
          ],
        ],

        const SizedBox(height: Space.xl),
        const SectionLabel('TODAY'),
        const SizedBox(height: Space.md),
        const _TodayStatus(),

        if (circle.isGlobal) ...[
          const SizedBox(height: Space.xl),
          const _PastMonths(),
        ],
        const SizedBox(height: Space.xl),
        _CircleActions(circle: circle),
      ],
    );
  }

  static String _monthLabel(String startDay) {
    final date = DateTime.tryParse(startDay);
    if (date == null) return '';
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return '${names[date.month - 1]} ${date.year}';
  }
}

/// The top three, arranged as a podium: #1 centre and raised, #2 left,
/// #3 right. Missing places simply do not render — a two-member circle gets
/// a two-step podium, not placeholders for people who don't exist.
class _Podium extends StatelessWidget {
  const _Podium({required this.rows, required this.daysElapsed});

  final List<_BoardRow> rows;
  final int daysElapsed;

  @override
  Widget build(BuildContext context) {
    _BoardRow? at(int rank) {
      for (final r in rows) {
        if (r.rank == rank) return r;
      }
      return null;
    }

    // Ties can put two members on the same step; show the first of each and
    // let the board list carry the rest — a podium with five statues reads
    // as a bug, not a triumph.
    final first = at(1);
    final second = at(2);
    final third = at(3);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: second == null
              ? const SizedBox.shrink()
              : _PodiumPlace(row: second, size: 62, daysElapsed: daysElapsed),
        ),
        Expanded(
          child: first == null
              ? const SizedBox.shrink()
              : _PodiumPlace(
                  row: first, size: 84, crowned: true, daysElapsed: daysElapsed),
        ),
        Expanded(
          child: third == null
              ? const SizedBox.shrink()
              : _PodiumPlace(row: third, size: 62, daysElapsed: daysElapsed),
        ),
      ],
    );
  }
}

class _PodiumPlace extends StatelessWidget {
  const _PodiumPlace({
    required this.row,
    required this.size,
    required this.daysElapsed,
    this.crowned = false,
  });

  final _BoardRow row;
  final double size;
  final bool crowned;
  final int daysElapsed;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final tier = CircleTier.of(row.points, daysElapsed);
    final initial =
        row.name.isEmpty ? '?' : row.name.characters.first.toUpperCase();

    return Column(
      children: [
        if (crowned) ...[
          Icon(Icons.emoji_events_rounded, size: Dimens.iconMd, color: t.warn),
          const SizedBox(height: Space.xs),
        ],
        Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: crowned ? Grad.brand(t) : null,
            color: crowned ? null : t.surfaceAlt,
            shape: BoxShape.circle,
            border: row.isCaller
                ? Border.all(color: t.accent, width: 2)
                : null,
            boxShadow: crowned ? Shadows.glow(t.accent) : null,
          ),
          child: Text(
            initial,
            style: AuraType.numeral(size * 0.4,
                color: crowned ? t.onAccent : t.textPrimary, weight: 700),
          ),
        ),
        const SizedBox(height: Space.sm),
        Text(
          '#${row.rank}',
          style: text.labelMedium?.copyWith(color: t.textMuted),
        ),
        Text(
          row.isCaller ? '${row.name} (you)' : row.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: crowned ? text.titleMedium : text.bodyMedium,
        ),
        if (row.location != null)
          Text(
            row.location!,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: text.bodySmall?.copyWith(color: t.textMuted),
          ),
        const SizedBox(height: 2),
        Text(
          '${CircleScoring.formatPoints(row.points)} PTS',
          style: AuraType.numeral(15, color: t.accent),
        ),
        const SizedBox(height: 2),
        Text(
          row.habitCount > 0
              ? '${tier.label} · ${row.habitCount} HABITS'
              : tier.label,
          style: text.labelMedium
              ?.copyWith(fontSize: 8, color: t.textSecondary),
        ),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.row, required this.daysElapsed});

  final _BoardRow row;
  final int daysElapsed;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final tier = CircleTier.of(row.points, daysElapsed);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Space.sm),
      child: Row(
        children: [
          SizedBox(
            width: 34,
            child: Text('#${row.rank}',
                style: AuraType.numeral(14,
                    color: row.isCaller ? t.accent : t.textMuted)),
          ),
          const SizedBox(width: Space.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  row.isCaller ? '${row.name} (you)' : row.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: text.bodyLarge?.copyWith(
                    color: row.isCaller ? t.accent : t.textPrimary,
                  ),
                ),
                Text(
                  [
                    if (row.location != null) row.location!,
                    tier.label,
                    if (row.habitCount > 0)
                      '${row.habitCount} habit${row.habitCount == 1 ? '' : 's'}',
                  ].join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: text.bodySmall
                      ?.copyWith(fontSize: 10, color: t.textMuted),
                ),
              ],
            ),
          ),
          Text(CircleScoring.formatPoints(row.points),
              style: AuraType.numeral(18, color: t.accent)),
          const SizedBox(width: 4),
          Text('PTS', style: text.labelMedium?.copyWith(fontSize: 8)),
        ],
      ),
    );
  }
}

/// Finished months, browseable. Chips select a month; the snapshot renders
/// beneath — names as they were when the month was won.
class _PastMonths extends ConsumerStatefulWidget {
  const _PastMonths();

  @override
  ConsumerState<_PastMonths> createState() => _PastMonthsState();
}

class _PastMonthsState extends ConsumerState<_PastMonths> {
  String? _selected;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final months = ref.watch(hallOfFameMonthsProvider).value ?? const [];

    if (months.isEmpty) return const SizedBox.shrink();

    final selected = _selected ?? months.first;
    final entries =
        ref.watch(hallOfFameForMonthProvider(selected)).value ?? const [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionLabel('PAST MONTHS'),
        const SizedBox(height: Space.md),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final m in months)
                Padding(
                  padding: const EdgeInsets.only(right: Space.sm),
                  child: GestureDetector(
                    onTap: () => setState(() => _selected = m),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: Space.md, vertical: Space.xs),
                      decoration: BoxDecoration(
                        color: m == selected ? t.accent : t.surfaceAlt,
                        borderRadius: BorderRadius.circular(Radii.pill),
                      ),
                      child: Text(
                        _shortMonth(m),
                        style: text.labelMedium?.copyWith(
                          color: m == selected ? t.onAccent : t.textSecondary,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: Space.md),
        SurfaceCard(
          padding: const EdgeInsets.symmetric(
              horizontal: Space.lg, vertical: Space.sm),
          child: entries.isEmpty
              ? Padding(
                  padding: const EdgeInsets.symmetric(vertical: Space.md),
                  child: Text('Nothing recorded for this month.',
                      style: text.bodyMedium?.copyWith(color: t.textMuted)),
                )
              : Column(
                  children: [
                    for (final e in entries)
                      Padding(
                        padding:
                            const EdgeInsets.symmetric(vertical: Space.sm),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 34,
                              child: e.won
                                  ? Icon(Icons.emoji_events_rounded,
                                      size: Dimens.iconSm, color: t.warn)
                                  : Text('#${e.rank}',
                                      style: AuraType.numeral(14,
                                          color: e.rank <= 3
                                              ? t.accent
                                              : t.textMuted)),
                            ),
                            const SizedBox(width: Space.sm),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                      e.won
                                          ? '${e.displayName} · WON LIFETIME PRO'
                                          : e.displayName,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: e.won
                                          ? text.bodyLarge
                                          : text.bodyMedium?.copyWith(
                                              color: t.textSecondary)),
                                  if (e.location != null)
                                    Text(e.location!,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: text.bodySmall?.copyWith(
                                            fontSize: 10,
                                            color: t.textMuted)),
                                ],
                              ),
                            ),
                            Text(CircleScoring.formatPoints(e.points),
                                style: AuraType.numeral(16,
                                    color:
                                        e.rank <= 3 ? t.accent : t.textMuted)),
                            const SizedBox(width: 4),
                            Text('PTS',
                                style:
                                    text.labelMedium?.copyWith(fontSize: 8)),
                          ],
                        ),
                      ),
                  ],
                ),
        ),
      ],
    );
  }

  static String _shortMonth(String monthStart) {
    final date = DateTime.tryParse(monthStart);
    if (date == null) return monthStart;
    const names = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
    ];
    return '${names[date.month - 1]} ${date.year}';
  }
}


/// Today's tally, stated — not asked for. Sharing is automatic (on habit
/// changes and at launch), so the board carries a status line where a
/// "share" button used to nag.
class _TodayStatus extends ConsumerWidget {
  const _TodayStatus();

  static String _todayLine(ChallengeTally tally) {
    final points = CircleScoring.dayPoints(
        done: tally.done, required: tally.required);
    final label = CircleScoring.formatPoints(points);
    final unit = label == '1' ? 'point' : 'points';
    return '${tally.done} of ${tally.required} done today — worth '
        '$label $unit, shared automatically.';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final tally = ref.watch(challengeTallyProvider).value ?? ChallengeTally.empty;

    return SurfaceCard(
      padding: const EdgeInsets.symmetric(
          horizontal: Space.lg, vertical: Space.md),
      child: Row(
        children: [
          Icon(Icons.sync_rounded, size: Dimens.iconSm, color: t.accent),
          const SizedBox(width: Space.md),
          Expanded(
            child: Text(
              tally.isRestDay
                  ? 'Nothing scheduled today — shares itself either way.'
                  : _todayLine(tally),
              style: text.bodySmall?.copyWith(color: t.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

/// The circle's own controls. Private: share the code (creator), leave, and
/// — for a creator still alone — delete (server-guarded). Global: leave.
class _CircleActions extends ConsumerWidget {
  const _CircleActions({required this.circle});
  final Circle circle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final code = circle.isGlobal
        ? null
        : ref.watch(inviteCodeProvider(circle.id)).value;
    final isCreator = !circle.isGlobal &&
        circle.createdBy != null &&
        circle.createdBy == ref.watch(authUserIdProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (code != null) ...[
          const SectionLabel('INVITE'),
          const SizedBox(height: Space.md),
          SurfaceCard(
            padding: const EdgeInsets.symmetric(
                horizontal: Space.lg, vertical: Space.md),
            onTap: () => ShareCircleSheet.open(context,
                name: circle.name, code: code),
            child: Row(
              children: [
                Icon(Icons.ios_share_rounded,
                    size: Dimens.iconMd, color: t.accent),
                const SizedBox(width: Space.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Share this circle', style: text.bodyLarge),
                      const SizedBox(height: 2),
                      Text('Code $code — send it to a friend',
                          style:
                              text.bodySmall?.copyWith(color: t.textMuted)),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded,
                    size: Dimens.iconSm, color: t.textMuted),
              ],
            ),
          ),
          const SizedBox(height: Space.lg),
        ],
        Center(
          child: AppButton.text(
            label: circle.isGlobal
                ? 'LEAVE THE STAYHARDY CIRCLE'
                : 'LEAVE THIS CIRCLE',
            danger: true,
            onPressed: () => _leave(context, ref),
          ),
        ),
        if (isCreator)
          Center(
            child: AppButton.text(
              label: 'DELETE THIS CIRCLE',
              danger: true,
              onPressed: () => _delete(context, ref),
            ),
          ),
      ],
    );
  }

  Future<void> _leave(BuildContext context, WidgetRef ref) async {
    final confirmed = await _confirm(
      context,
      title: circle.isGlobal
          ? 'Leave the StayHardy Circle?'
          : 'Leave ${circle.name}?',
      body: circle.isGlobal
          ? 'Your points this month are gone. You can rejoin any time.'
          : 'Your progress stays on the board; you just stop appearing in '
              'new days. You can rejoin with the code.',
      action: 'Leave',
    );
    if (confirmed != true) return;

    await ref.read(challengeServiceProvider).leave(circle.id);
    ref.invalidate(myCirclesProvider);
    ref.invalidate(globalStandingsProvider);
    if (context.mounted) Navigator.of(context).pop();
  }

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final confirmed = await _confirm(
      context,
      title: 'Delete ${circle.name}?',
      body: 'Gone for good, along with its code. Only possible while you are '
          'the only member.',
      action: 'Delete',
    );
    if (confirmed != true) return;

    final result =
        await ref.read(challengeServiceProvider).deleteCircle(circle.id);
    if (!context.mounted) return;

    if (result.isSuccess) {
      ref.invalidate(myCirclesProvider);
      Navigator.of(context).pop();
      return;
    }
    // The server's refusal, verbatim — usually "others are in this circle".
    await showDialog<void>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: c.aura.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.md),
        ),
        content: Text(result.message ?? 'Could not delete that circle.',
            style: Theme.of(c).textTheme.bodyMedium),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c),
            child: Text('OK',
                style: TextStyle(color: c.aura.textSecondary)),
          ),
        ],
      ),
    );
  }

  Future<bool?> _confirm(
    BuildContext context, {
    required String title,
    required String body,
    required String action,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: c.aura.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.md),
        ),
        title: Text(title, style: Theme.of(c).textTheme.titleLarge),
        content: Text(body, style: Theme.of(c).textTheme.bodyMedium),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: Text('Cancel',
                style: TextStyle(color: c.aura.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: Text(action, style: TextStyle(color: c.aura.danger)),
          ),
        ],
      ),
    );
  }
}


/// The scoring system, explained once, on demand — instead of a paragraph
/// squatting at the top of every board visit.
class _HowPointsSheet extends StatelessWidget {
  const _HowPointsSheet();

  static Future<void> open(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.aura.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.md)),
      ),
      builder: (_) => const _HowPointsSheet(),
    );
  }

  static const _rules = <(IconData, String)>[
    (Icons.check_circle_rounded,
        'Do your habits. Your day shares itself with the board — no button '
            'to remember.'),
    (Icons.star_rounded,
        'A full point needs at least 3 habits done. Fewer than 3 can never '
            'earn a whole point.'),
    (Icons.block_rounded,
        'Nothing past 7 counts. Padding your list with easy habits earns '
            'nothing extra.'),
    (Icons.pie_chart_rounded,
        'Partial days earn partial points — 5 of 7 done is worth 5 out '
            'of 7.'),
    (Icons.restart_alt_rounded,
        'Points reset to zero on the 1st of every month. Every month is a '
            'fresh race.'),
    (Icons.emoji_events_rounded,
        'Month-end: the top 3 win StayHardy Pro for life. Ties share the '
            'crown.'),
  ];

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return SafeArea(
      child: Padding(
        padding:
            const EdgeInsets.fromLTRB(Space.lg, Space.xl, Space.lg, Space.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('How points work', style: text.titleLarge),
            const SizedBox(height: Space.lg),
            for (final (icon, line) in _rules)
              Padding(
                padding: const EdgeInsets.only(bottom: Space.md),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(icon, size: Dimens.iconSm, color: t.accent),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Text(line,
                          style: text.bodyMedium
                              ?.copyWith(color: t.textSecondary)),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
