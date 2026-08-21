import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../data/screen_time_service.dart';
import '../../domain/screen_time_rules.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/progress_rule.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../paywall/paywall_screen.dart';
import '../shared/section_header.dart';
import 'screen_time_disclosure.dart';

/// Screen time, shown as context for habit data.
///
/// Deliberately **not** a wellbeing dashboard: no daily limit, no target, no
/// red bar telling anyone off for using their phone. That app gets deleted. The
/// only claim made here is the one worth making — whether the days habits slip
/// are the days the phone wins — and it is only made once there is enough data
/// to make it honestly.
class ScreenTimeScreen extends ConsumerStatefulWidget {
  const ScreenTimeScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const ScreenTimeScreen()),
    );
  }

  @override
  ConsumerState<ScreenTimeScreen> createState() => _ScreenTimeScreenState();
}

class _ScreenTimeScreenState extends ConsumerState<ScreenTimeScreen> {
  AppLifecycleListener? _lifecycle;

  @override
  void initState() {
    super.initState();
    // The permission is granted on a Settings screen with no callback, so the
    // only way to learn about it is to re-check when the user comes back.
    _lifecycle = AppLifecycleListener(onResume: _refresh);
    unawaited(_collect());
  }

  @override
  void dispose() {
    _lifecycle?.dispose();
    super.dispose();
  }

  void _refresh() => unawaited(_collect());

  Future<void> _collect() async {
    await ref.read(screenTimeServiceProvider).collect();
    if (mounted) ref.invalidate(screenTimeProvider);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final async = ref.watch(screenTimeProvider);

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
            message: "Couldn't read your screen time.",
            detail: e.toString(),
            onRetry: () => ref.invalidate(screenTimeProvider),
          ),
          data: (view) => view.granted
              ? _Granted(view: view)
              : _NotGranted(onGranted: _collect),
        ),
      ),
    );
  }
}

/// Shown until usage access exists. Never a dead end.
class _NotGranted extends ConsumerWidget {
  const _NotGranted({required this.onGranted});
  final Future<void> Function() onGranted;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final supported = ref.read(screenTimeServiceProvider).supported;

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
      children: [
        const ScreenTitle(title: 'Screen time'),
        const SizedBox(height: Space.md),
        Text(
          supported
              ? 'See your phone use next to your habit history, and find out '
                  'whether the days you slip are the days the phone wins.'
              : 'Screen time is an Android feature — Apple does not let apps '
                  'read it.',
          style: text.bodyLarge?.copyWith(color: t.textSecondary),
        ),
        if (supported) ...[
          const SizedBox(height: Space.xl),
          AppButton.primary(
            label: 'SET IT UP',
            // Always through the disclosure, never straight to the settings
            // intent — that ordering is what Play requires.
            onPressed: () async {
              await ScreenTimeDisclosureScreen.open(context);
              await onGranted();
            },
          ),
          const SizedBox(height: Space.md),
          Text(
            'Nothing is read until you switch it on in Android settings, and '
            'nothing ever leaves your phone.',
            style: text.bodySmall?.copyWith(color: t.textMuted),
          ),
        ],
      ],
    );
  }
}

class _Granted extends ConsumerWidget {
  const _Granted({required this.view});
  final ScreenTimeView view;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final today = view.today;

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
      children: [
        const ScreenTitle(title: 'Screen time', trailing: 'TODAY'),
        const SizedBox(height: Space.xl),

        Center(
          child: Column(
            children: [
              Text(
                ScreenTimeRules.formatDuration(today.minutes),
                // No ring and no colour. A ring implies a target, and there is
                // no correct number of hours to give someone.
                style: AuraType.numeral(56, color: t.textPrimary),
              ),
              const SizedBox(height: Space.sm),
              Text(
                today.unlockCount > 0
                    ? '${today.unlockCount} UNLOCKS · '
                        '${ScreenTimeRules.formatDuration(view.weekAverageMinutes)} DAILY AVERAGE'
                    : '${ScreenTimeRules.formatDuration(view.weekAverageMinutes)} DAILY AVERAGE',
                style: text.labelMedium,
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.xxl),

        if (view.correlation != null) ...[
          _CorrelationCard(correlation: view.correlation!),
          const SizedBox(height: Space.xxl),
        ],

        if (view.recent.length > 1) ...[
          const SectionLabel('Last two weeks'),
          const SizedBox(height: Space.md),
          _DayBars(view: view),
          const SizedBox(height: Space.xxl),
        ],

        if (today.apps.isNotEmpty) ...[
          const SectionLabel('Today'),
          const SizedBox(height: Space.md),
          for (final app in today.apps.take(8))
            _AppRow(app: app, max: today.apps.first.foregroundMs),
        ] else
          Text(
            'Nothing recorded yet today.',
            style: text.bodyMedium?.copyWith(color: t.textMuted),
          ),

        const SizedBox(height: Space.xxl),
        Text(
          'This stays on your phone. It is not uploaded, not shared, and not '
          'included in your backups. App-by-app detail is deleted after '
          '${ScreenTimeRules.appDetailRetentionDays} days.',
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),
        const SizedBox(height: Space.lg),
        Center(
          child: AppButton.text(
            label: 'DELETE MY SCREEN TIME DATA',
            danger: true,
            onPressed: () => _confirmDelete(context, ref),
          ),
        ),
      ],
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: c.aura.surface,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.md)),
        title: Text('Delete screen time data?',
            style: Theme.of(c).textTheme.titleLarge),
        content: Text(
          'Everything collected is erased from this phone. Your habits, tasks '
          'and goals are untouched. Android keeps its own copy — revoke usage '
          'access in Settings to stop it being read again.',
          style: Theme.of(c).textTheme.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: Text('Cancel',
                style: TextStyle(color: c.aura.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (!(confirmed ?? false)) return;

    await ref.read(screenTimeServiceProvider).deleteAll();
    ref.invalidate(screenTimeProvider);
  }
}

/// The one claim this screen makes.
class _CorrelationCard extends StatelessWidget {
  const _CorrelationCard({required this.correlation});
  final ScreenTimeCorrelation correlation;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final more = correlation.moreOnMissedDays;

    return SurfaceCard(
      // Tinted brass either way. Even the unflattering reading is information,
      // not a telling-off.
      tint: t.accent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.compare_arrows_rounded,
                  size: Dimens.iconMd, color: t.accent),
              const SizedBox(width: Space.md),
              Expanded(
                child: Text(
                  more
                      ? 'More phone on the days you slip'
                      : 'Your phone use is not the problem',
                  style: text.titleMedium?.copyWith(color: t.accent),
                ),
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          Text(
            more
                ? '${ScreenTimeRules.formatDuration(correlation.missedDayAverage)} '
                    'on days you missed habits, against '
                    '${ScreenTimeRules.formatDuration(correlation.keptDayAverage)} '
                    'on days you kept them.'
                : 'You actually use your phone '
                    '${ScreenTimeRules.formatDuration(correlation.gap.abs())} '
                    'less on the days you miss habits. Whatever is getting in '
                    'the way, it is not this.',
            style: text.bodyMedium?.copyWith(color: t.textSecondary),
          ),
          const SizedBox(height: Space.sm),
          Text(
            'Across ${correlation.sampleDays} days.',
            style: text.bodySmall?.copyWith(color: t.textMuted),
          ),
        ],
      ),
    );
  }
}

class _DayBars extends StatelessWidget {
  const _DayBars({required this.view});
  final ScreenTimeView view;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    var max = 1;
    for (final d in view.recent) {
      if (d.minutes > max) max = d.minutes;
    }

    return Column(
      children: [
        SizedBox(
          height: 90,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              for (final d in view.recent)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Container(
                          height: (d.minutes / max * 74).clamp(1.0, 74.0),
                          decoration: BoxDecoration(
                            // Today is still filling up; showing it at the same
                            // weight as a finished day makes every morning look
                            // like an improvement.
                            color: d.isPartial ? t.accentMuted : t.accent,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text('${d.date.day}',
                            style: text.labelMedium?.copyWith(fontSize: 8)),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _AppRow extends StatelessWidget {
  const _AppRow({required this.app, required this.max});
  final AppUsage app;
  final int max;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: Space.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  app.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: text.bodyLarge,
                ),
              ),
              const SizedBox(width: Space.md),
              Text(
                ScreenTimeRules.formatDuration(app.minutes),
                style: text.bodyMedium?.copyWith(color: t.textMuted),
              ),
            ],
          ),
          const SizedBox(height: Space.sm),
          ProgressRule(
            fraction: max == 0 ? 0 : app.foregroundMs / max,
          ),
        ],
      ),
    );
  }
}

/// Opens screen time, or the paywall. Pro by the plan of record.
Future<void> openScreenTimeRespectingPlan(
  BuildContext context,
  WidgetRef ref,
) async {
  if (ref.read(isProProvider)) {
    await ScreenTimeScreen.open(context);
    return;
  }
  await PaywallScreen.open(context);
}
