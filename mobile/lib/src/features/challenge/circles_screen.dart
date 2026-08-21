import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter_timezone/flutter_timezone.dart';

import 'circle_board_screen.dart';
import 'prize_banner.dart';
import 'share_circle_sheet.dart';

import '../../data/challenge_service.dart';
import '../../data/providers.dart';
import '../../data/settings_repository.dart';
import '../../domain/challenge_rules.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/editor_sheet.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../shared/section_header.dart';

/// Accountability circles.
///
/// A circle is a small group who can see whether each other showed up — and
/// nothing else. The standings carry counts and a name; **no habit ever leaves
/// the device**, so nobody in your circle learns what you are working on unless
/// you tell them. That is the whole privacy proposition and it is worth saying
/// on the screen, not just in a schema comment.
///
/// Free. Not gated on Pro — deliberately, and there is a test asserting it,
/// because the leaderboard drifted into being Pro-only against the same stated
/// principle.
class CirclesScreen extends ConsumerWidget {
  const CirclesScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const CirclesScreen()),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final async = ref.watch(myCirclesProvider);

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
            message: "Couldn't load your circles.",
            detail: e.toString(),
            onRetry: () => ref.invalidate(myCirclesProvider),
          ),
          data: (circles) => _Body(circles: circles),
        ),
      ),
    );
  }
}

/// The whole page: the global StayHardy Circle on top, private circles below.
///
/// The global section has three states — member (the board), invited (the
/// one-time card), and declined (a quiet link). Locked decision: **never
/// auto-join**; the card asks once and `SettingsKeys.globalCirclePromptDismissed`
/// keeps that promise.
class _Body extends ConsumerWidget {
  const _Body({required this.circles});
  final List<Circle> circles;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Circle? global;
    final private = <Circle>[];
    for (final c in circles) {
      if (c.isGlobal) {
        global = c;
      } else {
        private.add(c);
      }
    }
    // Null while the flag is loading — treated as declined so the big card
    // never flashes in front of someone who already said "not now".
    final dismissed = ref.watch(globalPromptDismissedProvider).value;

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
      children: [
        const ScreenTitle(title: 'Circles', trailing: 'SHOW UP TOGETHER'),
        const SizedBox(height: Space.xl),

        const SectionLabel('STAYHARDY CIRCLE'),
        const SizedBox(height: Space.md),
        if (global != null) ...[
          _GlobalCard(circle: global),
          const SizedBox(height: Space.xl),
        ] else if (dismissed == false) ...[
          const _GlobalJoinCard(),
          const SizedBox(height: Space.xl),
        ] else ...[
          Center(
            child: AppButton.text(
              label: 'JOIN THE STAYHARDY CIRCLE',
              onPressed: () => _GlobalJoinSheet.open(context),
            ),
          ),
          const SizedBox(height: Space.lg),
        ],

        const SectionLabel('PRIVATE CIRCLES'),
        const SizedBox(height: Space.md),
        if (private.isEmpty)
          ..._emptyPrivate(context)
        else ...[
          for (final circle in private) ...[
            _CircleCard(circle: circle),
            const SizedBox(height: Space.lg),
          ],
          Center(
            child: AppButton.text(
              label: 'JOIN ANOTHER',
              onPressed: () => _JoinSheet.open(context),
            ),
          ),
        ],
      ],
    );
  }

  List<Widget> _emptyPrivate(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return [
      Text(
        'A small group who can see whether you showed up. '
        'They see a number, never what you are working on.',
        style: text.bodyLarge?.copyWith(color: t.textSecondary),
      ),
      const SizedBox(height: Space.lg),
      AppButton.primary(
        label: 'START A CIRCLE',
        onPressed: () => _CreateSheet.open(context),
      ),
      const SizedBox(height: Space.sm),
      Center(
        child: AppButton.text(
          label: 'I HAVE A CODE',
          onPressed: () => _JoinSheet.open(context),
        ),
      ),
      const SizedBox(height: Space.xl),
      SurfaceCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.lock_outline_rounded,
                    size: Dimens.iconSm, color: t.accent),
                const SizedBox(width: Space.sm),
                Text('WHAT OTHERS SEE',
                    style: text.labelMedium?.copyWith(color: t.accent)),
              ],
            ),
            const SizedBox(height: Space.md),
            Text(
              'How many of your habits you finished each day, and your '
              'streak. Not their names, not your notes, not your goals. '
              'Those never leave this phone.',
              style: text.bodyMedium?.copyWith(color: t.textSecondary),
            ),
          ],
        ),
      ),
    ];
  }
}

/// The one-time invitation. Shown until joined or explicitly declined.
class _GlobalJoinCard extends ConsumerWidget {
  const _GlobalJoinCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return SurfaceCard(
      gradient: Grad.surfaceWash(t),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconBadge(
                icon: Icons.public_rounded,
                color: t.accent,
                size: 42,
              ),
              const SizedBox(width: Space.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('The ${_monthName()} Circle is on',
                        style: text.titleLarge),
                    const SizedBox(height: 2),
                    Text('Every StayHardy user. One board.',
                        style: text.bodySmall?.copyWith(color: t.textMuted)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          Text(
            'Do your habits, earn points — a full point a day takes at '
            'least three done, and padding a list past seven earns nothing '
            'extra. Points reset monthly and the top twenty are remembered '
            'forever. Progress shares itself as you check habits off; the '
            'board sees a name and a number, never your habits.',
            style: text.bodyMedium?.copyWith(color: t.textSecondary),
          ),
          const SizedBox(height: Space.md),
          const PrizeBanner(),
          const SizedBox(height: Space.lg),
          AppButton.primary(
            label: 'PICK A NAME & JOIN',
            onPressed: () => _GlobalJoinSheet.open(context),
          ),
          const SizedBox(height: Space.xs),
          Center(
            child: AppButton.text(
              label: 'NOT NOW',
              onPressed: () async {
                await ref
                    .read(settingsRepositoryProvider)
                    .set(SettingsKeys.globalCirclePromptDismissed, 'true');
                ref.invalidate(globalPromptDismissedProvider);
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// The member's summary card: your rank, the top three, today's share
/// button — and the full board one tap away. The card answers "how am I
/// doing"; the page answers everything else.
class _GlobalCard extends ConsumerWidget {
  const _GlobalCard({required this.circle});
  final Circle circle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final standings = ref.watch(globalStandingsProvider).value;

    GlobalStanding? caller;
    final topThree = <GlobalStanding>[];
    for (final s in standings ?? const <GlobalStanding>[]) {
      if (s.isCaller) caller = s;
      if (s.rank <= 3 && topThree.length < 3) topThree.add(s);
    }

    return SurfaceCard(
      gradient: Grad.surfaceWash(t),
      onTap: () => CircleBoardScreen.open(context, circle),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('StayHardy Circle', style: text.titleLarge),
                    const SizedBox(height: 2),
                    Text(
                      caller == null
                          ? 'EVERY USER · ONE BOARD'
                          : 'YOU ARE #${caller.rank} · '
                              '${CircleScoring.formatPoints(caller.points)} PTS',
                      style: text.labelMedium?.copyWith(color: t.accent),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(Icons.logout_rounded,
                    size: Dimens.iconSm, color: t.textMuted),
                tooltip: 'Leave the circle',
                onPressed: () => _leave(context, ref),
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          const PrizeBanner(compact: true),
          if (topThree.isNotEmpty) ...[
            const SizedBox(height: Space.md),
            Text(
              [
                for (final s in topThree)
                  '${s.rank}. ${s.isCaller ? 'You' : s.displayName}',
              ].join('   '),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: text.bodyMedium?.copyWith(color: t.textSecondary),
            ),
          ],
          const SizedBox(height: Space.md),
          Row(
            children: [
              Text('SEE THE FULL BOARD',
                  style: text.labelMedium?.copyWith(color: t.accent)),
              Icon(Icons.chevron_right_rounded,
                  size: Dimens.iconSm, color: t.accent),
            ],
          ),
          const SizedBox(height: Space.sm),
          Text(
            'Progress shares itself as you check habits off.',
            style: text.bodySmall?.copyWith(color: t.textMuted),
          ),
        ],
      ),
    );
  }

  Future<void> _leave(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: c.aura.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radii.md),
        ),
        title: Text('Leave the StayHardy Circle?',
            style: Theme.of(c).textTheme.titleLarge),
        content: Text(
          'Your points this month are gone. You can rejoin any time.',
          style: Theme.of(c).textTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: Text('Stay',
                style: TextStyle(color: c.aura.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: Text('Leave', style: TextStyle(color: c.aura.danger)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    await ref.read(challengeServiceProvider).leave(circle.id);
    ref.invalidate(myCirclesProvider);
    ref.invalidate(globalStandingsProvider);
  }
}

/// The name is the only thing the board will ever show, so it gets picked
/// deliberately at join time — never defaulted from an email address.
class _GlobalJoinSheet extends ConsumerStatefulWidget {
  const _GlobalJoinSheet();

  static Future<void> open(BuildContext context) =>
      EditorSheet.show(context, const _GlobalJoinSheet());

  @override
  ConsumerState<_GlobalJoinSheet> createState() => _GlobalJoinSheetState();
}

class _GlobalJoinSheetState extends ConsumerState<_GlobalJoinSheet> {
  final _name = TextEditingController();
  final _location = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _location.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return EditorSheet(
      title: 'Join the StayHardy Circle',
      saveLabel: _busy ? 'JOINING…' : 'JOIN',
      onSave: _join,
      children: [
        TextField(
          controller: _name,
          autofocus: true,
          maxLength: 40,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(
            hintText: 'How the board should show you',
            counterText: '',
          ),
        ),
        const SizedBox(height: Space.md),
        TextField(
          controller: _location,
          maxLength: 48,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(
            hintText: 'Where are you from? (optional)',
            counterText: '',
          ),
        ),
        const SizedBox(height: Space.sm),
        Text(
          'Name and place are visible to every member. Everything else '
          'about your habits stays on this phone.',
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),
        if (_error != null) ...[
          const SizedBox(height: Space.md),
          Text(_error!, style: text.bodyMedium?.copyWith(color: t.danger)),
        ],
      ],
    );
  }

  /// Kicks off the join and keeps the sheet open. Popping happens only when
  /// the server said yes — "press join and nothing happens" was exactly the
  /// failure mode of popping first and erroring into a closed sheet.
  bool _join() {
    final name = _name.text.trim();
    if (name.isEmpty || _busy) return false;

    setState(() {
      _busy = true;
      _error = null;
    });

    unawaited(() async {
      final result = await ref
          .read(challengeServiceProvider)
          .joinGlobal(displayName: name, location: _location.text);
      // The invitation has been answered either way; the big card collapses.
      await ref
          .read(settingsRepositoryProvider)
          .set(SettingsKeys.globalCirclePromptDismissed, 'true');
      ref.invalidate(globalPromptDismissedProvider);

      if (result.isSuccess) {
        ref.invalidate(myCirclesProvider);
        ref.invalidate(globalStandingsProvider);
        if (mounted) Navigator.of(context).pop();
        return;
      }
      if (mounted) {
        setState(() {
          _busy = false;
          _error = result.message;
        });
      }
    }());
    return false;
  }
}

/// Month name for copy only — which cohort "this month" actually is stays a
/// server decision.
String _monthName() {
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return names[DateTime.now().month - 1];
}

class _CircleCard extends ConsumerWidget {
  const _CircleCard({required this.circle});
  final Circle circle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final standings = ref.watch(circleStandingsProvider(circle.id)).value;

    return SurfaceCard(
      onTap: () => CircleBoardScreen.open(context, circle),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(circle.name, style: text.titleLarge)),
              Text('${circle.startDay} → ${circle.endDay}',
                  style: text.labelMedium?.copyWith(color: t.textMuted)),
            ],
          ),
          const SizedBox(height: Space.lg),

          if (standings == null)
            const SizedBox(height: Space.xl)
          else if (standings.isEmpty)
            Text('Nobody has checked in yet.',
                style: text.bodyMedium?.copyWith(color: t.textMuted))
          else ...[
            // The card carries the top three; the full board is one tap away.
            for (final s in standings.take(3)) _StandingRow(standing: s),
            if (standings.length > 3)
              Padding(
                padding: const EdgeInsets.only(bottom: Space.sm),
                child: Row(
                  children: [
                    Text('SEE ALL ${standings.length}',
                        style: text.labelMedium?.copyWith(color: t.accent)),
                    Icon(Icons.chevron_right_rounded,
                        size: Dimens.iconSm, color: t.accent),
                  ],
                ),
              ),
          ],

        ],
      ),
    );
  }
}

class _StandingRow extends StatelessWidget {
  const _StandingRow({required this.standing});
  final CircleStanding standing;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: Space.md),
      child: Row(
        children: [
          Icon(
            standing.doneToday
                ? Icons.check_circle_outline_rounded
                : Icons.circle_outlined,
            size: Dimens.iconSm,
            color: standing.doneToday ? t.success : t.textMuted,
          ),
          const SizedBox(width: Space.md),
          Expanded(
            child: Text(standing.displayName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: text.bodyLarge),
          ),
          Text(CircleScoring.formatPoints(standing.points),
              style: AuraType.numeral(18, color: t.accent)),
          const SizedBox(width: 4),
          Text('PTS', style: text.labelMedium?.copyWith(fontSize: 8)),
        ],
      ),
    );
  }
}

class _CreateSheet extends ConsumerStatefulWidget {
  const _CreateSheet();

  static Future<void> open(BuildContext context) =>
      EditorSheet.show(context, const _CreateSheet());

  @override
  ConsumerState<_CreateSheet> createState() => _CreateSheetState();
}

class _CreateSheetState extends ConsumerState<_CreateSheet> {
  final _name = TextEditingController();
  int _days = ChallengeRules.cohortDays;
  int _members = ChallengeRules.freeCircleMembers;
  int _minHabits = 0;
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    // Capacity is the one plan-shaped thing about circles: free circles fit
    // three friends, Pro fits fifty. Joining and the StayHardy Circle stay
    // ungated — see the challenge_service test that pins that.
    final cap = ref.watch(isProProvider)
        ? ChallengeRules.proCircleMembers
        : ChallengeRules.freeCircleMembers;
    if (_members > cap) _members = cap;

    return EditorSheet(
      title: 'Start a circle',
      saveLabel: _busy ? 'CREATING…' : 'CREATE',
      onSave: _create,
      children: [
        TextField(
          controller: _name,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(hintText: 'Morning crew'),
        ),
        const SizedBox(height: Space.lg),
        Field(
          label: 'How long',
          child: Wrap(
            spacing: Space.sm,
            runSpacing: Space.sm,
            children: [
              for (final d in ChallengeRules.circleDayOptions)
                ChoiceChipTile(
                  label: '$d days',
                  selected: d == _days,
                  onTap: () => setState(() => _days = d),
                ),
            ],
          ),
        ),
        Field(
          label: 'Friends',
          child: Row(
            children: [
              _StepButton(
                icon: Icons.remove_rounded,
                enabled: _members > 2,
                onTap: () => setState(() => _members--),
              ),
              SizedBox(
                width: 64,
                child: Text(
                  '$_members',
                  textAlign: TextAlign.center,
                  style: AuraType.numeral(26, color: t.accent),
                ),
              ),
              _StepButton(
                icon: Icons.add_rounded,
                enabled: _members < cap,
                onTap: () => setState(() => _members++),
              ),
              const SizedBox(width: Space.md),
              Expanded(
                child: Text(
                  cap == ChallengeRules.freeCircleMembers
                      ? 'Free circles fit ${ChallengeRules.freeCircleMembers} '
                          '— Pro fits ${ChallengeRules.proCircleMembers}.'
                      : 'Up to ${ChallengeRules.proCircleMembers} with Pro.',
                  style: text.bodySmall?.copyWith(color: t.textMuted),
                ),
              ),
            ],
          ),
        ),
        Field(
          label: 'Minimum habits',
          child: Row(
            children: [
              _StepButton(
                icon: Icons.remove_rounded,
                enabled: _minHabits > 0,
                onTap: () => setState(() => _minHabits--),
              ),
              SizedBox(
                width: 64,
                child: Text(
                  _minHabits == 0 ? '—' : '$_minHabits',
                  textAlign: TextAlign.center,
                  style: AuraType.numeral(26,
                      color: _minHabits == 0 ? t.textMuted : t.accent),
                ),
              ),
              _StepButton(
                icon: Icons.add_rounded,
                enabled: _minHabits < 7,
                onTap: () => setState(() => _minHabits++),
              ),
              const SizedBox(width: Space.md),
              Expanded(
                child: Text(
                  _minHabits == 0
                      ? 'Optional — a house rule so friends compete with '
                          'equal habit counts.'
                      : 'Everyone competes with at least $_minHabits '
                          'habit${_minHabits == 1 ? '' : 's'}.',
                  style: text.bodySmall?.copyWith(color: t.textMuted),
                ),
              ),
            ],
          ),
        ),
        Text(
          'You will get a code to share — anyone with it can join until the '
          'circle is full.',
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),
        if (_error != null) ...[
          const SizedBox(height: Space.md),
          Text(_error!, style: text.bodyMedium?.copyWith(color: t.danger)),
        ],
      ],
    );
  }

  /// Stays open until the server answers. On success the sheet closes and the
  /// share moment opens — the code is the whole point of creating.
  bool _create() {
    final name = _name.text.trim();
    if (name.isEmpty || _busy) return false;

    // One private circle on the free plan — counted over the circles the
    // user is actually in, so leaving one frees the slot.
    if (!ref.read(isProProvider)) {
      final privates = (ref.read(myCirclesProvider).value ?? const [])
          .where((c) => !c.isGlobal)
          .length;
      if (privates >= 1) {
        setState(() => _error =
            'One private circle on the free plan — leave it first, or go '
            'Pro for more.');
        return false;
      }
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    unawaited(() async {
      final result = await ref.read(challengeServiceProvider).createCircle(
            name: name,
            // The device's IANA zone, sent explicitly and validated
            // server-side. `DateTime.timeZoneName` gives an abbreviation like
            // 'IST', which the server rightly refuses.
            timezone: await FlutterTimezone.getLocalTimezone(),
            days: _days,
            maxMembers: _members,
            minHabits: _minHabits,
          );
      if (result.isSuccess) {
        ref.invalidate(myCirclesProvider);
        if (mounted) {
          final code = result.code;
          Navigator.of(context).pop();
          if (code != null) {
            unawaited(ShareCircleSheet.open(context, name: name, code: code));
          }
        }
        return;
      }
      if (mounted) {
        setState(() {
          _busy = false;
          _error = result.message;
        });
      }
    }());
    return false;
  }
}

class _StepButton extends StatelessWidget {
  const _StepButton({
    required this.icon,
    required this.enabled,
    required this.onTap,
  });

  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: enabled ? onTap : null,
      child: Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: t.surfaceAlt,
          borderRadius: BorderRadius.circular(Radii.md),
          border: Border.all(
              color: enabled ? t.borderStrong : t.border,
              width: Dimens.hairline),
        ),
        child: Icon(icon,
            size: Dimens.iconMd,
            color: enabled ? t.textPrimary : t.textMuted),
      ),
    );
  }
}
class _JoinSheet extends ConsumerStatefulWidget {
  const _JoinSheet();

  static Future<void> open(BuildContext context) =>
      EditorSheet.show(context, const _JoinSheet());

  @override
  ConsumerState<_JoinSheet> createState() => _JoinSheetState();
}

class _JoinSheetState extends ConsumerState<_JoinSheet> {
  final _code = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return EditorSheet(
      title: 'Join a circle',
      saveLabel: _busy ? 'JOINING…' : 'JOIN',
      onSave: _join,
      children: [
        TextField(
          controller: _code,
          autofocus: true,
          textCapitalization: TextCapitalization.characters,
          maxLength: 6,
          decoration: const InputDecoration(
            hintText: 'ABC123',
            counterText: '',
          ),
        ),
        const SizedBox(height: Space.sm),
        Text('Six characters, from whoever started the circle.',
            style: text.bodySmall?.copyWith(color: t.textMuted)),
        if (_error != null) ...[
          const SizedBox(height: Space.md),
          Text(_error!, style: text.bodyMedium?.copyWith(color: t.danger)),
        ],
      ],
    );
  }

  /// Open until the server answers; the error lands in front of the person
  /// who typed the code, not in a sheet that already closed.
  bool _join() {
    final code = _code.text.trim().toUpperCase();
    if (code.length != 6 || _busy) return false;

    // Same one-circle rule as creating — a join IS entering a circle.
    if (!ref.read(isProProvider)) {
      final privates = (ref.read(myCirclesProvider).value ?? const [])
          .where((c) => !c.isGlobal)
          .length;
      if (privates >= 1) {
        setState(() => _error =
            'One private circle on the free plan — leave it first, or go '
            'Pro for more.');
        return false;
      }
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    unawaited(() async {
      final result = await ref.read(challengeServiceProvider).joinByCode(code);
      if (result.isSuccess) {
        ref.invalidate(myCirclesProvider);
        if (mounted) Navigator.of(context).pop();
        return;
      }
      if (mounted) {
        setState(() {
          _busy = false;
          _error = result.message;
        });
      }
    }());
    return false;
  }
}
