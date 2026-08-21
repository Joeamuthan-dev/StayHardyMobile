import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../data/settings_repository.dart';
import '../../data/habit_repository.dart';
import '../../data/subscription_service.dart';
import '../../domain/challenge_rules.dart';
import '../../ui/app_button.dart';
import '../../ui/drive_mark.dart';
import '../../ui/surface_card.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../achievements/achievements_screen.dart';
import '../backup/backup_screen.dart';
import '../backup/drive_backup_screen.dart';
import '../challenge/circles_screen.dart';
import '../community/feedback_screen.dart';
import '../community/updates_screen.dart';
import '../screentime/screen_time_disclosure.dart';
import '../paywall/paywall_screen.dart';
import '../shared/section_header.dart';
import 'about_screen.dart';
import 'tip_sheet.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  /// Pushed from the gear in a screen header.
  ///
  /// Settings used to be the sixth bottom-tab destination. It spent a permanent
  /// slot in the most valuable navigation space on the phone on a screen people
  /// open roughly once a month, and it was the main reason four real
  /// destinations had to share the bar with two that were not.
  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          appBar: AppBar(leading: const BackButton()),
          body: const SafeArea(top: false, child: SettingsScreen()),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);

    return ListView(
      padding:
          const EdgeInsets.fromLTRB(Space.lg, Space.sm, Space.lg, Space.xxl),
      children: [
        const ScreenTitle(title: 'Settings'),
        const SizedBox(height: Space.lg),

        // Who is signed in, before anything else. A settings page with no
        // account card makes people doubt they are signed in at all — which
        // on an app holding a paid subscription is the wrong doubt to plant.
        const _ProfileCard(),
        const SizedBox(height: Space.md),

        // Circles, right under the account. It was the last row of the last
        // card, which is where features go to be undiscovered — and it is the
        // one social thing the app has.
        const _CirclesCard(),
        const SizedBox(height: Space.xl),

        // Three groups, not ten sections. Every caption that repeated what
        // its control already said is gone — captions survive only where
        // they carry a warning the control cannot (data loss, permissions).
        const SectionLabel('Preferences'),
        const SizedBox(height: Space.md),
        _SegmentedRow(
          options: const [
            (ThemeMode.system, 'System'),
            (ThemeMode.dark, 'Dark'),
            (ThemeMode.light, 'Light'),
          ],
          selected: mode,
          onSelected: (m) =>
              ref.read(themeModeProvider.notifier).setMode(m),
        ),
        const SizedBox(height: Space.md),
        const _MoodSection(),
        const SizedBox(height: Space.md),
        const _ScreenTimeSection(),
        const SizedBox(height: Space.md),
        const _ReminderSection(),

        // Backup leads this half of the page. Losing your history is the only
        // unrecoverable thing that can happen in a habit app, so it outranks
        // the plan card it used to sit beneath.
        const SizedBox(height: Space.lg),
        const SectionLabel('Backup'),
        const SizedBox(height: Space.md),
        const _AutoBackupSection(),

        const SizedBox(height: Space.lg),
        const SectionLabel('Your plan'),
        const SizedBox(height: Space.md),
        const _PlanSection(),

        const SizedBox(height: Space.lg),
        const SectionLabel('StayHardy'),
        const SizedBox(height: Space.md),
        const _CommunitySection(),
      ],
    );
  }
}

/// Opt-in import of habits, goals and tasks from the previous app.
///
/// Deliberately not automatic. It is safe to run at any time and safe to run
/// twice — every row is keyed on `remote_id` and written with insert-or-ignore,
/// so a re-run converges rather than duplicating.
class _PlanSection extends ConsumerStatefulWidget {
  const _PlanSection();

  @override
  ConsumerState<_PlanSection> createState() => _PlanSectionState();
}

class _PlanSectionState extends ConsumerState<_PlanSection> {
  bool _restoring = false;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final cap = ref.watch(habitCapProvider).value;
    if (cap == null) return const SizedBox(height: Space.xl);

    final plan = ref.watch(activePlanProvider).value;
    // A store plan names itself; a database grant cannot, and "Pro" is the
    // honest answer there rather than a guessed billing period.
    final planLabel = cap.isPro ? (plan?.label ?? 'Pro') : 'Free';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SurfaceCard(
          padding: const EdgeInsets.symmetric(
              horizontal: Space.lg, vertical: Space.sm),
          onTap: () => _PlanDetailSheet.open(context, cap: cap, plan: plan),
          child: Column(
            children: [
              _StatRow(
                label: 'Plan',
                value: planLabel,
                icon: cap.isPro
                    ? Icons.workspace_premium_outlined
                    : Icons.person_outline_rounded,
                last: plan?.renewsOn == null,
              ),
              // "Renews" and "Ends" are not the same promise. Someone who has
              // cancelled needs the date they lose access, not a renewal date
              // that will never happen.
              if (plan?.renewsOn != null)
                _StatRow(
                  label: plan!.willRenew ? 'Renews' : 'Ends',
                  value: _date(plan.renewsOn!),
                  icon: Icons.event_outlined,
                  last: true,
                ),
            ],
          ),
        ),
        const SizedBox(height: Space.xs),
        Text(
          "Tap to see what's included.",
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),
        if (cap.isGrandfathered) ...[
          const SizedBox(height: Space.md),
          Text(
            'Habits you created before the free limit existed stay yours. '
            'They never count toward it.',
            style: text.bodySmall?.copyWith(color: t.textMuted),
          ),
        ],
        const SizedBox(height: Space.md),
        if (!cap.isPro)
          AppButton.outline(
            label: 'UPGRADE TO PRO',
            onPressed: () => PaywallScreen.open(context),
          )
        else ...[
          AppButton.outline(
            label: _restoring ? 'CHECKING…' : 'RESTORE PURCHASES',
            onPressed: _restoring ? null : _restore,
          ),
          // Only a live, renewing store subscription can be cancelled. Lifetime
          // buyers have nothing to manage, and offering them a cancel link
          // would imply a recurring charge they never agreed to.
          if (plan != null && plan.renewsOn != null && plan.willRenew) ...[
            const SizedBox(height: Space.sm),
            AppButton.text(
              label: 'MANAGE SUBSCRIPTION',
              onPressed: () => unawaited(_manageSubscription()),
            ),
          ],
        ],
      ],
    );
  }

  /// Restore, and say something true about what came back.
  ///
  /// Four different situations used to collapse into "found / not found":
  /// never bought, bought and lapsed, already active, and store unreachable.
  /// A lapsed subscriber told "nothing found" goes hunting for a billing bug
  /// that does not exist, so each case gets its own sentence.
  Future<void> _restore() async {
    setState(() => _restoring = true);
    try {
      final wasPro = ref.read(isProProvider);
      final outcome = await ref
          .read(subscriptionServiceProvider)
          .restoreDetailed(wasProBefore: wasPro);

      await ref.read(isProProvider.notifier).refresh();
      ref.invalidate(activePlanProvider);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(outcome.message),
          duration: const Duration(seconds: 5),
          // An expired subscriber is one tap from fixing it; anyone else has
          // nothing to act on, so no action is offered.
          action: outcome == RestoreOutcome.expired
              ? SnackBarAction(
                  label: 'SUBSCRIBE',
                  onPressed: () => PaywallScreen.open(context),
                )
              : null,
        ),
      );
    } finally {
      if (mounted) setState(() => _restoring = false);
    }
  }

  /// Play owns cancellation — there is no billing API for it, so the supported
  /// route is a deep link to the managed-subscriptions screen.
  Future<void> _manageSubscription() async {
    final uri = SubscriptionService.manageSubscriptionUri();
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open the Play Store.')),
      );
    }
  }
}

String _date(DateTime d) => '${d.day}/${d.month}/${d.year}';

/// What the current plan actually gets you, and where it stops.
class _PlanDetailSheet extends StatelessWidget {
  const _PlanDetailSheet({required this.cap, required this.plan});

  final HabitCap cap;
  final ProDetail? plan;

  static Future<void> open(BuildContext context,
      {required HabitCap cap, ProDetail? plan}) {
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.aura.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.md)),
      ),
      builder: (_) => _PlanDetailSheet(cap: cap, plan: plan),
    );
  }

  static String _subtitle(bool isPro, ProDetail? plan) {
    if (!isPro) return 'Everything below stays free, forever.';
    final renews = plan?.renewsOn;
    if (plan == null || renews == null) return 'Yours for good — no renewal.';
    return '${plan.label} · ${plan.willRenew ? "renews" : "ends"} '
        '${_date(renews)}';
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final isPro = cap.isPro;

    // Written as what *this* member has, not as a comparison table. A free
    // member reading "unlimited habits ✗" learns less than "7 of 7 used".
    final rows = isPro
        ? const [
            (Icons.all_inclusive_rounded, 'Unlimited habits'),
            (Icons.cloud_done_outlined, 'Google Drive backup of everything'),
            (Icons.query_stats_rounded, 'Full history and insights'),
            (Icons.ac_unit_rounded, 'Streak freezes'),
            (Icons.timer_outlined, 'Unlimited focus sessions'),
            (Icons.groups_rounded, 'Larger private circles'),
          ]
        : [
            (
              Icons.check_circle_outline_rounded,
              '${cap.counted} of ${cap.limit} habits used'
            ),
            (Icons.phone_android_rounded, 'Local backup, last 30 days'),
            (Icons.query_stats_rounded, 'Recent history and insights'),
            (
              Icons.groups_rounded,
              'Private circles up to ${ChallengeRules.freeCircleMembers} people'
            ),
          ];

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(Space.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(isPro ? 'Your Pro plan' : 'Your free plan',
                style: text.titleLarge),
            const SizedBox(height: 4),
            Text(
              _subtitle(isPro, plan),
              style: text.bodySmall?.copyWith(color: t.textMuted),
            ),
            const SizedBox(height: Space.lg),
            for (final (icon, label) in rows) ...[
              Row(
                children: [
                  Icon(icon, size: Dimens.iconSm, color: t.accent),
                  const SizedBox(width: Space.md),
                  Expanded(child: Text(label, style: text.bodyMedium)),
                ],
              ),
              const SizedBox(height: Space.md),
            ],
            if (!isPro) ...[
              const SizedBox(height: Space.xs),
              AppButton.primary(
                label: 'SEE PRO',
                onPressed: () {
                  Navigator.of(context).pop();
                  PaywallScreen.open(context);
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Updates and feedback.
/// Circles, promoted to a first-class card.
///
/// No Pro gate. The old leaderboard drifted into being Pro-only against the
/// same stated principle; a test asserts this entry point does not.
class _CirclesCard extends ConsumerWidget {
  const _CirclesCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final circles = ref.watch(myCirclesProvider).value;
    final inGlobal = circles?.any((c) => c.isGlobal) ?? false;

    return SurfaceCard(
      gradient: Grad.surfaceWash(t),
      onTap: () => CirclesScreen.open(context),
      child: Row(
        children: [
          IconBadge(icon: Icons.public_rounded, color: t.accent, size: 42),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('StayHardy Circle', style: text.titleMedium),
                const SizedBox(height: 2),
                Text(
                  inGlobal
                      ? 'See where you stand this month'
                      : 'Every user, one board. Perfect days win.',
                  style: text.bodySmall?.copyWith(color: t.textMuted),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded,
              size: Dimens.iconSm, color: t.textMuted),
        ],
      ),
    );
  }
}

class _CommunitySection extends ConsumerWidget {
  const _CommunitySection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadAnnouncementsProvider).value ?? 0;

    return SurfaceCard(
      padding: const EdgeInsets.symmetric(
          horizontal: Space.lg, vertical: Space.sm),
      child: Column(
        children: [
          _LinkRow(
            icon: Icons.campaign_outlined,
            label: "What's new",
            // The count is the whole point of the row: without it there is no
            // reason to ever tap it.
            trailing: unread > 0 ? '$unread new' : null,
            highlight: unread > 0,
            onTap: () => UpdatesScreen.open(context),
          ),
          _LinkRow(
            icon: Icons.military_tech_outlined,
            label: 'Badges',
            onTap: () => AchievementsScreen.open(context),
          ),
          _LinkRow(
            icon: Icons.local_cafe_outlined,
            label: 'Tip the developer',
            onTap: () => TipSheet.open(context),
          ),
          _LinkRow(
            icon: Icons.chat_bubble_outline_rounded,
            label: 'Report a problem',
            onTap: () => FeedbackScreen.open(context),
          ),
          _LinkRow(
            icon: Icons.info_outline_rounded,
            label: 'About StayHardy',
            onTap: () => AboutScreen.open(context),
            last: true,
          ),
        ],
      ),
    );
  }
}

/// A tappable row inside a settings card.
class _LinkRow extends StatelessWidget {
  const _LinkRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
    this.highlight = false,
    this.last = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? trailing;
  final bool highlight;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return InkWell(
      onTap: onTap,
      splashColor: t.accent.withValues(alpha: Alphas.splash),
      highlightColor: t.accent.withValues(alpha: Alphas.highlight),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: Space.md),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: last ? Colors.transparent : t.border,
              width: Dimens.hairline,
            ),
          ),
        ),
        child: Row(
          children: [
            Icon(icon, size: Dimens.iconSm, color: t.textMuted),
            const SizedBox(width: Space.md),
            Expanded(child: Text(label, style: text.bodyLarge)),
            if (trailing != null)
              Text(
                trailing!,
                style: text.bodyMedium?.copyWith(
                  color: highlight ? t.accent : t.textMuted,
                ),
              ),
            const SizedBox(width: Space.sm),
            Icon(Icons.chevron_right_rounded,
                size: Dimens.iconSm, color: t.textMuted),
          ],
        ),
      ),
    );
  }
}

/// Google Drive backup: one switch that tells the truth.
///
/// The switch reads **the connection, not the intention**. Storing "on" while
/// Drive was never connected is what made this confusing before: the toggle sat
/// on, nothing was ever uploaded, and the screen still offered a CONNECT button
/// as if nothing had been switched on at all. Here, on means connected and
/// backing up; anything less reads off and says why.
class _AutoBackupSection extends ConsumerStatefulWidget {
  const _AutoBackupSection();

  @override
  ConsumerState<_AutoBackupSection> createState() => _AutoBackupSectionState();
}

class _AutoBackupSectionState extends ConsumerState<_AutoBackupSection> {
  bool _localBusy = false;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final isPro = ref.watch(isProProvider);
    final status = ref.watch(backupStatusProvider).value;
    final connected = status?.driveConnected ?? false;
    final localOn = ref.watch(localAutoBackupEnabledProvider).value ?? false;

    // Drive is "on" only when it is genuinely connected. The switch reports the
    // connection, never the intention.
    final driveOn = isPro && connected;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ---------------------------------------------------------- Drive ---
        // Switching this on does not try to connect inline. Connecting means a
        // Google account picker, a consent screen and a first upload, and a
        // switch is the wrong place to run all that — failures had nowhere to
        // be explained, which is why it looked like the toggle "did nothing".
        // It opens the backup screen, where every step has room to report.
        SurfaceCard(
          padding: const EdgeInsets.symmetric(
              horizontal: Space.md, vertical: Space.xs),
          onTap: () => _openDrive(isPro),
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            leading: SizedBox(
              width: Dimens.iconMd,
              height: Dimens.iconMd,
              child: DriveMark(muted: !driveOn),
            ),
            title: Row(
              children: [
                Flexible(
                  child: Text('Google Drive', style: text.bodyLarge),
                ),
                const SizedBox(width: Space.sm),
                const _TierPill(label: 'PRO', pro: true),
              ],
            ),
            subtitle: Text(
              !isPro
                  ? 'Keep your history in your own Google Drive'
                  : driveOn
                      ? (status?.lastBackupAt == null
                          ? 'Connected — no backup yet, tap to sync'
                          : 'Connected — last backup ${_shortAgo(status!.lastBackupAt!)}')
                      : 'Not connected — tap to set it up',
              style: text.bodySmall
                  ?.copyWith(color: driveOn ? t.accent : t.textMuted),
            ),
            trailing: Switch(
              value: driveOn,
              activeThumbColor: t.accent,
              onChanged: (_) => _openDrive(isPro),
            ),
          ),
        ),

        const SizedBox(height: Space.sm),

        // ---------------------------------------------------------- local ---
        SurfaceCard(
          padding: const EdgeInsets.symmetric(
              horizontal: Space.md, vertical: Space.xs),
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              Icons.smartphone_rounded,
              size: Dimens.iconMd,
              color: localOn ? t.accent : t.textMuted,
            ),
            title: Row(
              children: [
                Flexible(
                  child: Text('Local backup', style: text.bodyLarge),
                ),
                const SizedBox(width: Space.sm),
                const _TierPill(label: 'FREE', pro: false),
              ],
            ),
            subtitle: Text(
              localOn
                  ? 'On — a daily copy of your last 30 days, on this phone'
                  : 'Off — a daily copy kept on this phone',
              style: text.bodySmall
                  ?.copyWith(color: localOn ? t.accent : t.textMuted),
            ),
            trailing: _localBusy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Switch(
                    value: localOn,
                    activeThumbColor: t.accent,
                    onChanged: _setLocal,
                  ),
          ),
        ),

        const SizedBox(height: Space.xs),
        Text(
          // A local copy dies with the phone. Saying so is the whole reason
          // anyone upgrades for Drive, and it is also simply true.
          localOn && !driveOn
              ? 'A local copy is lost if the phone is. Drive survives it.'
              : 'Without a backup, deleting the app deletes your history.',
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),
        const SizedBox(height: Space.sm),
        AppButton.outline(
          label: 'BACKUP & RESTORE',
          onPressed: () => BackupScreen.open(context),
        ),
      ],
    );
  }

  /// Drive is a Pro feature with its own screen; non-members meet the paywall.
  void _openDrive(bool isPro) {
    if (!isPro) {
      PaywallScreen.open(context);
      return;
    }
    DriveBackupScreen.open(context);
  }

  Future<void> _setLocal(bool want) async {
    setState(() => _localBusy = true);
    try {
      await ref
          .read(settingsRepositoryProvider)
          .set(SettingsKeys.localAutoBackupEnabled, want.toString());
      ref.invalidate(localAutoBackupEnabledProvider);

      if (want) {
        // Take the first copy now. A switch that promises "daily" and shows
        // nothing today is one nobody trusts.
        await ref.read(backupCoordinatorProvider).backupLocalAuto();
        ref.invalidate(backupStatusProvider);
        _say('Local backup on. First copy saved.');
      }
    } catch (e) {
      _say('Could not save a local backup.');
    } finally {
      if (mounted) setState(() => _localBusy = false);
    }
  }

  void _say(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }
}

/// PRO / FREE marker beside a feature name.
class _TierPill extends StatelessWidget {
  const _TierPill({required this.label, required this.pro});

  final String label;
  final bool pro;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: pro ? t.accent.withValues(alpha: 0.16) : t.surfaceHigh,
        borderRadius: BorderRadius.circular(Radii.pill),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 9.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.9,
          color: pro ? t.accent : t.textMuted,
        ),
      ),
    );
  }
}

/// How long ago, in the fewest words that are still true.
String _shortAgo(int epochMillis) {
  final d = DateTime.now()
      .difference(DateTime.fromMillisecondsSinceEpoch(epochMillis));
  if (d.inMinutes < 1) return 'just now';
  if (d.inMinutes < 60) return '${d.inMinutes}m ago';
  if (d.inHours < 24) return '${d.inHours}h ago';
  return '${d.inDays}d ago';
}

/// Reminder health, stated plainly.
///
/// Android OEMs (Xiaomi, Oppo, Vivo, Samsung) throttle background alarms hard,
/// and a habit app whose reminders silently stop firing is worthless. Rather
/// than pretend it always works, this says what the OS is currently allowing and
/// offers the fix.
class _ReminderSection extends ConsumerWidget {
  const _ReminderSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(reminderDiagnosticsProvider);
    final service = ref.read(notificationServiceProvider);

    return async.when(
      loading: () => const SizedBox(height: Space.xl),
      error: (_, _) => Text('Could not check reminder status.',
          style: text.bodyMedium?.copyWith(color: t.textMuted)),
      data: (d) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // A switch, matching every other permission row on this screen. It
          // read as a status label before, which left "Blocked" looking like
          // something you could only fix elsewhere.
          //
          // Android has no API to revoke a granted notification permission, so
          // switching off opens the app's system settings — said plainly rather
          // than faking a local toggle the OS would ignore.
          SurfaceCard(
            padding: const EdgeInsets.symmetric(
                horizontal: Space.md, vertical: Space.xs),
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                d.permissionGranted
                    ? Icons.notifications_active_outlined
                    : Icons.notifications_off_outlined,
                size: Dimens.iconMd,
                color: d.permissionGranted ? t.accent : t.textMuted,
              ),
              title: Text('Notifications', style: text.bodyLarge),
              subtitle: Text(
                d.permissionGranted
                    ? 'On — habit reminders can reach you'
                    : 'Off — reminders cannot reach you',
                style: text.bodySmall?.copyWith(
                    color: d.permissionGranted ? t.accent : t.textMuted),
              ),
              trailing: Switch(
                value: d.permissionGranted,
                activeThumbColor: t.accent,
                onChanged: (want) async {
                  if (want) {
                    await service.requestPermission();
                    await service.rescheduleAll();
                    ref.invalidate(reminderDiagnosticsProvider);
                    return;
                  }
                  // Android gives an app no way to hand a granted notification
                  // permission back, so this says where it can be done rather
                  // than flipping a switch the OS would immediately contradict.
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'Turn these off in Android Settings › Apps › '
                          'StayHardy › Notifications.',
                        ),
                      ),
                    );
                  }
                },
              ),
            ),
          ),
          const SizedBox(height: Space.md),
          if (!d.permissionGranted)
            const SizedBox.shrink()
          else if (!d.exactAlarmsAllowed)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Reminders may arrive a few minutes late. Allowing exact '
                  'alarms fixes that.',
                  style: text.bodySmall?.copyWith(color: t.textMuted),
                ),
                const SizedBox(height: Space.md),
                AppButton.outline(
                  label: 'ALLOW EXACT TIMING',
                  onPressed: () async {
                    await service.requestExactAlarmPermission();
                    await service.rescheduleAll();
                    ref.invalidate(reminderDiagnosticsProvider);
                  },
                ),
              ],
            )
          else
            Text(
              'Set a time on a habit and it will remind you on the days it is '
              'scheduled.',
              style: text.bodySmall?.copyWith(color: t.textMuted),
            ),
        ],
      ),
    );
  }
}

/// A row of mutually exclusive options sharing one hairline frame.
class _SegmentedRow<T> extends StatelessWidget {
  const _SegmentedRow({
    required this.options,
    required this.selected,
    required this.onSelected,
  });

  final List<(T, String)> options;
  final T selected;
  final ValueChanged<T> onSelected;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    return Row(
      children: [
        for (final (value, label) in options)
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () {
                if (value == selected) return;
                unawaited(HapticFeedback.selectionClick().catchError((_) {}));
                onSelected(value);
              },
              child: AnimatedContainer(
                duration: Motion.fast,
                curve: Motion.curve,
                margin: const EdgeInsets.only(right: Space.sm),
                height: Dimens.touchTarget,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: value == selected
                      ? t.accent.withValues(alpha: Alphas.tint)
                      : null,
                  border: Border.all(
                    color: value == selected ? t.accent : t.border,
                    width:
                        value == selected ? Dimens.border : Dimens.hairline,
                  ),
                  borderRadius: BorderRadius.circular(Radii.sm),
                ),
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: value == selected
                            ? t.textPrimary
                            : t.textMuted,
                      ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow({
    required this.label,
    required this.value,
    this.icon,
    this.last = false,
  });

  final String label;
  final String value;
  final IconData? icon;

  /// Suppresses the divider on the final row inside a card.
  final bool last;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: Space.md),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: last ? Colors.transparent : t.border,
            width: Dimens.hairline,
          ),
        ),
      ),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, size: Dimens.iconSm, color: t.textMuted),
            const SizedBox(width: Space.md),
          ],
          Expanded(child: Text(label, style: text.bodyLarge)),
          Text(value, style: text.bodyLarge?.copyWith(color: t.textMuted)),
        ],
      ),
    );
  }
}


/// Mood tracking: the switch, and when to be asked.
///
/// Off by default and offered exactly here — never as a card on Home nudging
/// people to turn it on. Asking somebody how they feel is a bigger ask than any
/// other setting in this app, and it should be their idea.
class _MoodSection extends ConsumerWidget {
  const _MoodSection();

  /// Default ask time. Evening, because a 9am prompt collects a reading of
  /// the night before, which is not the day being recorded.
  static const _defaultTime = TimeOfDay(hour: 21, minute: 0);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final settings = ref.watch(moodSettingsProvider);

    final reminder = _parse(settings.reminder);

    // One control. Turning it on confirms the time right away; the row then
    // shows the time and tapping the ROW changes it — deliberately a ListTile
    // with a trailing switch, because on a SwitchListTile tapping the row
    // toggles, and "tap to change the time" would have turned tracking off.
    return SurfaceCard(
      padding: const EdgeInsets.symmetric(
          horizontal: Space.md, vertical: Space.xs),
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        onTap: settings.enabled ? () => _changeTime(context, ref) : null,
        // The face turns with the switch — the one row on this screen where a
        // literal picture of the thing beats an icon. Animated so flipping the
        // switch has a visible consequence right next to it.
        leading: AnimatedSwitcher(
          duration: Motion.base,
          transitionBuilder: (child, anim) => ScaleTransition(
            scale: anim,
            child: FadeTransition(opacity: anim, child: child),
          ),
          child: Text(
            settings.enabled ? '😄' : '😔',
            key: ValueKey(settings.enabled),
            style: const TextStyle(fontSize: 24),
          ),
        ),
        title: Text('Track my mood', style: text.bodyLarge),
        subtitle: Text(
          settings.enabled
              ? 'Asks every day at '
                  '${(reminder ?? _defaultTime).format(context)} — tap to '
                  'change'
              : 'One reading a day, on a 1–5 scale.',
          style: text.bodySmall?.copyWith(color: t.textMuted),
        ),
        trailing: Switch(
          value: settings.enabled,
          activeThumbColor: t.accent,
          onChanged: (v) => v ? _turnOn(context, ref) : _turnOff(ref),
        ),
      ),
    );
  }

  Future<void> _changeTime(BuildContext context, WidgetRef ref) async {
    final notifier = ref.read(moodSettingsProvider.notifier);
    final current = _parse(ref.read(moodSettingsProvider).reminder);
    final picked = await showTimePicker(
      context: context,
      initialTime: current ?? _defaultTime,
    );
    if (picked == null) return;
    await notifier.setReminder(
      '${picked.hour.toString().padLeft(2, '0')}:'
      '${picked.minute.toString().padLeft(2, '0')}',
    );
  }

  Future<void> _turnOff(WidgetRef ref) =>
      ref.read(moodSettingsProvider.notifier).setEnabled(false);

  /// Enable and confirm the time in one gesture. Cancelling the picker keeps
  /// the default rather than leaving tracking on with no ask — a mood log
  /// nobody is asked to fill stays empty.
  Future<void> _turnOn(BuildContext context, WidgetRef ref) async {
    final notifier = ref.read(moodSettingsProvider.notifier);
    final current = _parse(ref.read(moodSettingsProvider).reminder);

    final picked = await showTimePicker(
      context: context,
      initialTime: current ?? _defaultTime,
    );

    final time = picked ?? current ?? _defaultTime;
    await notifier.setEnabled(true);
    await notifier.setReminder(
      '${time.hour.toString().padLeft(2, '0')}:'
      '${time.minute.toString().padLeft(2, '0')}',
    );
  }

  static TimeOfDay? _parse(String? hhmm) {
    if (hhmm == null || hhmm.isEmpty) return null;
    final parts = hhmm.split(':');
    if (parts.length != 2) return null;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return null;
    return TimeOfDay(hour: hour, minute: minute);
  }
}
class _ScreenTimeSection extends ConsumerWidget {
  const _ScreenTimeSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Android-only: iOS has no readable usage API, and the row used to
    // dead-end (or worse) there.
    if (!ref.read(screenTimeServiceProvider).supported) {
      return const SizedBox.shrink();
    }
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final granted = ref.watch(screenTimeProvider).value?.granted ?? false;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SurfaceCard(
          padding: const EdgeInsets.symmetric(
              horizontal: Space.md, vertical: Space.xs),
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              granted
                  ? Icons.phone_android_rounded
                  : Icons.phonelink_erase_rounded,
              size: Dimens.iconMd,
              color: granted ? t.accent : t.textSecondary,
            ),
            title: Text('Usage access', style: text.bodyLarge),
            subtitle: Text(
              granted
                  ? 'On — Insights is tracking where your hours go'
                  : 'Off — Insights cannot see your screen time',
              style: text.bodySmall?.copyWith(
                color: granted ? t.accent : t.textMuted,
              ),
            ),
            // A switch, because that is what it is. The old chevron row read
            // as navigation and gave no clue the permission was already on.
            //
            // Android will not let an app hand a usage-access grant back, so
            // switching off can only take the user to the system screen that
            // can — said plainly rather than faking a local toggle that the OS
            // would silently ignore.
            trailing: Switch(
              value: granted,
              activeThumbColor: t.accent,
              onChanged: (want) async {
                final service = ref.read(screenTimeServiceProvider);
                if (want) {
                  final ok = await ScreenTimeDisclosureScreen.open(context);
                  if (ok) ref.invalidate(screenTimeProvider);
                  return;
                }
                await service.openPermissionSettings();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Turn StayHardy off in the list to revoke usage '
                        'access.',
                      ),
                    ),
                  );
                }
                ref.invalidate(screenTimeProvider);
              },
            ),
          ),
        ),
      ],
    );
  }
}


/// The account, at the top of Settings.
///
/// Initial avatar (no photo infrastructure and none needed), name or email,
/// the plan as a badge, and sign-out behind a tap on the card — with a
/// confirmation, because sign-out on a local-first app reads scarier than it
/// is and the sheet is where that gets said.
class _ProfileCard extends ConsumerWidget {
  const _ProfileCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final auth = ref.watch(authServiceProvider);
    final email = auth.currentEmail;
    final isPro = ref.watch(isProProvider);
    final signedIn = ref.watch(authUserIdProvider) != null;

    final display = email ?? 'Local only';
    final initial =
        display.isEmpty ? '?' : display.characters.first.toUpperCase();

    return SurfaceCard(
      gradient: Grad.surfaceWash(t),
      padding: const EdgeInsets.all(Space.md),
      onTap: signedIn ? () => _accountSheet(context, ref, display) : null,
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: Grad.brand(t),
              shape: BoxShape.circle,
            ),
            child: Text(
              initial,
              style: AuraType.numeral(22, color: t.onAccent, weight: 700),
            ),
          ),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(display,
                    style: text.titleMedium, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 3),
                Text(
                  signedIn
                      ? 'Signed in · data backed up under this account'
                      : 'Your data lives on this phone only',
                  style: text.bodySmall?.copyWith(color: t.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(width: Space.sm),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
            decoration: BoxDecoration(
              color: isPro
                  ? t.accent.withValues(alpha: Alphas.tintStrong)
                  : t.surfaceAlt,
              borderRadius: BorderRadius.circular(Radii.pill),
            ),
            child: Text(
              isPro ? 'PRO' : 'FREE',
              style: text.labelMedium?.copyWith(
                color: isPro ? t.accent : t.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _accountSheet(
    BuildContext context,
    WidgetRef ref,
    String display,
  ) async {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    await showModalBottomSheet<void>(
      context: context,
      builder: (sheet) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Space.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(display, style: text.titleLarge),
              const SizedBox(height: Space.sm),
              Text(
                'Your habits stay on this phone either way. Signing out only '
                'disconnects backup and Pro until you sign in again.',
                style: text.bodyMedium?.copyWith(color: t.textSecondary),
              ),
              const SizedBox(height: Space.lg),
              AppButton.outline(
                label: 'SIGN OUT',
                onPressed: () async {
                  Navigator.pop(sheet);
                  // Pop to the root FIRST. BootGate swaps home to the login
                  // screen underneath, but Settings is a pushed route — left
                  // on top it reads as "I signed out and nothing happened".
                  Navigator.of(context).popUntil((r) => r.isFirst);
                  await ref.read(authServiceProvider).signOut();
                  ref.read(authUserIdProvider.notifier).state = null;
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
