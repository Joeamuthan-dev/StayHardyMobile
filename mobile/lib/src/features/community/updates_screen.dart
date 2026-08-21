import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/community_service.dart';
import '../../data/providers.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';
import '../challenge/circles_screen.dart';
import '../challenge/prize_banner.dart';
import '../shared/section_header.dart';

/// What has changed in StayHardy.
///
/// Reads the same `announcements` table the web app does, and is
/// **cache-first**: the list the user last saw renders immediately and is
/// replaced when the network answers. Updates are not urgent, and putting a
/// spinner over content someone already read — on a train, in a lift — is the
/// wrong trade.
class UpdatesScreen extends ConsumerStatefulWidget {
  const UpdatesScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const UpdatesScreen()),
    );
  }

  @override
  ConsumerState<UpdatesScreen> createState() => _UpdatesScreenState();
}

class _UpdatesScreenState extends ConsumerState<UpdatesScreen> {
  @override
  void initState() {
    super.initState();
    // Marked seen on arrival rather than on scroll: the badge is a nudge to
    // look, and it has done its job the moment the screen opens.
    unawaited(_markSeen());
  }

  Future<void> _markSeen() async {
    await ref.read(communityServiceProvider).markAnnouncementsSeen();
    if (mounted) ref.invalidate(unreadAnnouncementsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final async = ref.watch(announcementsProvider);

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
            message: "Couldn't load updates.",
            detail: e.toString(),
            onRetry: () => ref.invalidate(announcementsProvider),
          ),
          data: (posts) => _Body(posts: posts),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.posts});
  final List<Announcement> posts;

  @override
  Widget build(BuildContext context) {
    // The 2.0 showcase leads even when the network has nothing: this screen
    // opens from a badge, and a badge that leads to "Nothing new" teaches
    // people to stop tapping it. The showcase ships in the binary, so it is
    // always true and always available offline.
    if (posts.isEmpty) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
        children: const [_Showcase()],
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xxl),
      children: [
        PrizeBanner(
          onTap: () => CirclesScreen.open(context),
        ),
        const SizedBox(height: Space.lg),
        const _Showcase(),
        const SizedBox(height: Space.xl),
        const SectionLabel('Announcements'),
        const SizedBox(height: Space.md),
        const ScreenTitle(title: 'Updates'),
        const SizedBox(height: Space.xl),
        for (final post in posts) ...[
          _PostCard(post: post),
          const SizedBox(height: Space.md),
        ],
      ],
    );
  }
}

class _PostCard extends StatelessWidget {
  const _PostCard({required this.post});
  final Announcement post;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return SurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(_icon, size: Dimens.iconSm, color: _tint(t)),
              const SizedBox(width: Space.sm),
              Text(
                post.category.toUpperCase(),
                style: text.labelMedium?.copyWith(color: _tint(t)),
              ),
              const Spacer(),
              Text(_ago(post.createdAt),
                  style: text.labelMedium?.copyWith(color: t.textMuted)),
            ],
          ),
          const SizedBox(height: Space.md),
          Text(post.title, style: text.titleLarge),
          const SizedBox(height: Space.sm),
          Text(post.message,
              style: text.bodyMedium?.copyWith(color: t.textSecondary)),
        ],
      ),
    );
  }

  // `category` is free text in the live table, so this switches on what is
  // actually in it and falls through to a neutral default rather than
  // pretending the set is closed.
  IconData get _icon => switch (post.category.toLowerCase()) {
        'feature' => Icons.auto_awesome_outlined,
        'warning' => Icons.warning_amber_rounded,
        'fix' => Icons.build_outlined,
        _ => Icons.campaign_outlined,
      };

  Color _tint(AuraTokens t) => switch (post.category.toLowerCase()) {
        'warning' => t.danger,
        'feature' => t.success,
        _ => t.accent,
      };

  static String _ago(DateTime at) {
    final days = DateTime.now().difference(at).inDays;
    if (days <= 0) return 'TODAY';
    if (days == 1) return 'YESTERDAY';
    if (days < 7) return '$days DAYS AGO';
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG',
        'SEP', 'OCT', 'NOV', 'DEC'];
    return '${at.day} ${months[at.month - 1]}';
  }
}


/// What shipped in 2.0, told as features rather than a changelog.
///
/// Cards cascade in with a stagger — each arrives a beat after the one above,
/// which is what makes a static list read as a launch. The stagger is a
/// per-card delayed tween, not a controller per card.
class _Showcase extends StatelessWidget {
  const _Showcase();

  static const _features = <(IconData, String, String)>[
    (Icons.public_rounded, 'The StayHardy Circle',
        'Every user, one board. Fair points, monthly reset — and the top 3 '
            'win Pro for life.'),
    (Icons.groups_rounded, 'Private circles',
        'A code, your friends, one board. House rules included.'),
    (Icons.auto_awesome_rounded, 'The habit finder',
        'Five taps and StayHardy builds a routine around your real day.'),
    (Icons.hourglass_bottom_rounded, 'A real hourglass',
        'The focus timer pours actual sand — and freezes when you pause.'),
    (Icons.phone_android_rounded, 'Screen-time truth',
        'Where your hours go, what they cost, and one sentence of advice '
            'that actually lands.'),
    (Icons.add_to_drive_rounded, 'Your data, your Drive',
        'Daily auto backup to your own Google Drive with Pro — and a local '
            'safety copy for everyone.'),
    (Icons.bolt_rounded, 'Faster everywhere',
        'Rebuilt from scratch: full refresh-rate scrolling, instant pages, '
            'butter-smooth.'),
  ];

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('WHAT\'S NEW',
            style: text.labelLarge?.copyWith(color: t.accent)),
        const SizedBox(height: Space.sm),
        Text('StayHardy 2.0', style: text.displayMedium),
        const SizedBox(height: Space.xs),
        Text(
          'Rebuilt from the ground up. Same habits, same account, '
          'a lot more under the bonnet.',
          style: text.bodyMedium?.copyWith(color: t.textSecondary),
        ),
        const SizedBox(height: Space.lg),
        for (var i = 0; i < _features.length; i++)
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: Motion.slow + Duration(milliseconds: i * 90),
            curve: Motion.emphasised,
            builder: (context, v, child) => Opacity(
              opacity: v.clamp(0.0, 1.0),
              child: Transform.translate(
                offset: Offset(0, (1 - v) * 22),
                child: child,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.only(bottom: Space.sm),
              child: SurfaceCard(
                padding: const EdgeInsets.all(Space.md),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    IconBadge(
                      icon: _features[i].$1,
                      color: t.accent,
                      gradient: i == 0 ? Grad.brand(t) : null,
                    ),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_features[i].$2, style: text.titleMedium),
                          const SizedBox(height: 3),
                          Text(
                            _features[i].$3,
                            style: text.bodySmall
                                ?.copyWith(color: t.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
