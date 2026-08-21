import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../domain/coach_engine.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/state_views.dart';
import '../../ui/surface_card.dart';

/// Ask.
///
/// A chat that only ever answers from the user's own numbers. It opens with an
/// unprompted read of where they stand, then offers the questions it can
/// actually answer as chips — a blank text box with a blinking cursor invites
/// questions the engine has no rule for, and the first thing a user would learn
/// is what it cannot do.
///
/// The free-text field is there anyway, because people type. Unrecognised input
/// gets an honest "I don't have a rule for that" rather than a bluff. See
/// [CoachEngine] for why this is deterministic and not a language model.
///
/// A pushed route rather than a third tab: it shares a subject with the
/// screen-time breakdown (what your data says about you), and two tabs for one
/// subject made Stats feel like three unrelated screens stapled together. It is
/// also never called "the coach" in the interface — a persona sets an
/// expectation of open conversation this deliberately cannot meet.
class AskScreen extends ConsumerStatefulWidget {
  const AskScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const AskScreen()),
    );
  }

  @override
  ConsumerState<AskScreen> createState() => _AskScreenState();
}

class _AskScreenState extends ConsumerState<AskScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  /// After a reply lands, so the newest turn is on screen rather than below the
  /// fold. Posted to the next frame because the list has not been laid out yet
  /// at the moment state changes.
  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: Motion.slow,
        curve: Motion.curve,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(coachSnapshotProvider);
    final messages = ref.watch(coachChatProvider);

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: const Text('Ask'),
      ),
      body: SafeArea(top: false, child: _build(async, messages)),
    );
  }

  Widget _build(
    AsyncValue<CoachSnapshot> async,
    List<CoachMessage> messages,
  ) {
    return async.when(
      loading: () => const LoadingView(),
      error: (e, _) => ErrorView(
        message: "The coach couldn't read your data.",
        detail: e.toString(),
        onRetry: () => ref.invalidate(coachSnapshotProvider),
      ),
      data: (snapshot) {
        final greeting = CoachEngine.greeting(snapshot);

        return Column(
          children: [
            Expanded(
              child: ListView(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.md),
                children: [
                  _ReplyBubble(reply: greeting, opening: true),
                  for (final m in messages)
                    m.fromUser
                        ? _UserBubble(text: m.text ?? '')
                        : _ReplyBubble(reply: m.reply!),
                  const SizedBox(height: Space.md),
                  const _PrivacyNote(),
                ],
              ),
            ),
            _Suggestions(
              onPick: (topic) {
                ref.read(coachChatProvider.notifier).ask(topic, snapshot);
                _scrollToEnd();
              },
            ),
            _Composer(
              controller: _input,
              onSend: () {
                final text = _input.text;
                if (text.trim().isEmpty) return;
                ref.read(coachChatProvider.notifier).askText(text, snapshot);
                _input.clear();
                _scrollToEnd();
              },
              onClear: messages.isEmpty
                  ? null
                  : () => ref.read(coachChatProvider.notifier).clear(),
            ),
          ],
        );
      },
    );
  }
}

class _UserBubble extends StatelessWidget {
  const _UserBubble({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    return Padding(
      padding: const EdgeInsets.only(top: Space.md, bottom: Space.xs),
      child: Align(
        alignment: Alignment.centerRight,
        child: Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * 0.75,
          ),
          padding: const EdgeInsets.symmetric(
              horizontal: Space.md, vertical: Space.sm + 2),
          decoration: BoxDecoration(
            gradient: Grad.brand(t),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(Radii.lg),
              topRight: Radius.circular(Radii.lg),
              bottomLeft: Radius.circular(Radii.lg),
              bottomRight: Radius.circular(Radii.sm),
            ),
          ),
          child: Text(
            text,
            style: Theme.of(context)
                .textTheme
                .bodyLarge
                ?.copyWith(color: t.onAccent),
          ),
        ),
      ),
    );
  }
}

class _ReplyBubble extends StatelessWidget {
  const _ReplyBubble({required this.reply, this.opening = false});

  final CoachReply reply;

  /// The unprompted first read. Gets the avatar and a little more presence than
  /// subsequent answers.
  final bool opening;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    final tint = switch (reply.tone) {
      CoachTone.good => t.success,
      CoachTone.warn => t.warn,
      CoachTone.neutral => t.accent,
    };

    return Padding(
      padding: EdgeInsets.only(top: opening ? Space.xs : Space.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconBadge(
            icon: Icons.auto_awesome_rounded,
            color: t.accent,
            gradient: Grad.brand(t),
            size: 32,
          ),
          const SizedBox(width: Space.sm),
          Expanded(
            child: SurfaceCard(
              padding: const EdgeInsets.all(Space.md),
              radius: Radii.md,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (reply.headline != null || reply.metric != null)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (reply.headline != null)
                          Expanded(
                            child: Text(
                              reply.headline!,
                              style: text.titleMedium?.copyWith(color: tint),
                            ),
                          ),
                        if (reply.metric != null) ...[
                          const SizedBox(width: Space.sm),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                reply.metric!,
                                style: AuraType.numeral(26, color: tint),
                              ),
                              if (reply.metricLabel != null)
                                Text(reply.metricLabel!,
                                    style: text.labelMedium),
                            ],
                          ),
                        ],
                      ],
                    ),
                  for (var i = 0; i < reply.paragraphs.length; i++)
                    Padding(
                      padding: EdgeInsets.only(
                        top: i == 0 && reply.headline == null ? 0 : Space.sm,
                      ),
                      child: Text(
                        reply.paragraphs[i],
                        style: text.bodyLarge
                            ?.copyWith(color: t.textSecondary),
                      ),
                    ),

                  for (var i = 0; i < reply.advice.length; i++)
                    _AdviceBlock(advice: reply.advice[i], index: i + 1),

                  if (reply.routine.isNotEmpty) _RoutinePlan(reply.routine),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The questions the engine has rules for, as one scrolling rail.
///
/// They were grouped onto three labelled shelves (Do / Review / Phone), which
/// read as a menu system when the whole point of this screen is "just talk to
/// your data". One rail, action questions first, and the free-text field right
/// below it.
class _Suggestions extends StatelessWidget {
  const _Suggestions({required this.onPick});
  final ValueChanged<CoachTopic> onPick;

  /// Action questions lead — "what should I change" is the reason to be here;
  /// review questions follow; phone questions last.
  static final _ordered = [
    ...CoachTopic.values.where((c) => c.group == CoachGroup.act),
    ...CoachTopic.values.where((c) => c.group == CoachGroup.review),
    ...CoachTopic.values.where((c) => c.group == CoachGroup.phone),
  ];

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: Space.lg),
        children: [
          for (final topic in _ordered)
            Padding(
              padding: const EdgeInsets.only(right: Space.sm),
              child: GestureDetector(
                onTap: () => onPick(topic),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: Space.md),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: t.surface,
                    borderRadius: BorderRadius.circular(Radii.pill),
                    border: Border.all(
                        color: t.borderStrong, width: Dimens.border),
                  ),
                  child: Text(
                    topic.prompt,
                    style: text.bodyMedium?.copyWith(color: t.textPrimary),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.onSend,
    required this.onClear,
  });

  final TextEditingController controller;
  final VoidCallback onSend;

  /// Null until there is a transcript to clear.
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    return Padding(
      padding: const EdgeInsets.fromLTRB(Space.lg, Space.sm, Space.lg, Space.sm),
      child: Row(
        children: [
          if (onClear != null) ...[
            IconButton(
              onPressed: onClear,
              icon: Icon(Icons.restart_alt_rounded,
                  size: Dimens.iconMd, color: t.textMuted),
              tooltip: 'Clear conversation',
            ),
            const SizedBox(width: Space.xs),
          ],
          Expanded(
            child: TextField(
              controller: controller,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => onSend(),
              decoration: const InputDecoration(
                hintText: 'Ask about your data…',
                isDense: true,
              ),
            ),
          ),
          const SizedBox(width: Space.sm),
          GestureDetector(
            onTap: onSend,
            child: Container(
              width: Dimens.touchTarget,
              height: Dimens.touchTarget,
              decoration: BoxDecoration(
                gradient: Grad.brand(t),
                shape: BoxShape.circle,
                boxShadow: Shadows.glow(t.accent),
              ),
              child: Icon(Icons.arrow_upward_rounded,
                  size: Dimens.iconMd, color: t.onAccent),
            ),
          ),
        ],
      ),
    );
  }
}

class _PrivacyNote extends StatelessWidget {
  const _PrivacyNote();

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.lock_outline_rounded, size: 13, color: t.textMuted),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            'Answers are worked out on this device from your own habits, tasks '
            'and screen time. Nothing you type here is sent anywhere.',
            style: text.bodySmall?.copyWith(color: t.textMuted),
          ),
        ),
      ],
    );
  }
}


/// One ranked recommendation: what, why, and what to do about it.
///
/// Numbered, because the order is the advice. A person told five things
/// changes none of them, so the engine ranks and the UI makes the rank visible.
class _AdviceBlock extends StatelessWidget {
  const _AdviceBlock({required this.advice, required this.index});

  final CoachAdvice advice;
  final int index;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final tint = switch (advice.tone) {
      CoachTone.good => t.success,
      CoachTone.warn => t.warn,
      CoachTone.neutral => t.accent,
    };

    return Container(
      margin: const EdgeInsets.only(top: Space.md),
      padding: const EdgeInsets.all(Space.md),
      decoration: BoxDecoration(
        color: t.surfaceAlt,
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border(left: BorderSide(color: tint, width: 3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 20,
                height: 20,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: tint.withValues(alpha: Alphas.tintStrong),
                  shape: BoxShape.circle,
                ),
                child: Text('$index',
                    style: text.labelMedium?.copyWith(color: tint)),
              ),
              const SizedBox(width: Space.sm),
              Expanded(
                child: Text(advice.title,
                    style: text.titleMedium?.copyWith(color: t.textPrimary)),
              ),
            ],
          ),
          const SizedBox(height: Space.sm),
          // The evidence, always a number from their own data. Advice without
          // it is a horoscope.
          Text(
            advice.why,
            style: text.bodySmall?.copyWith(color: t.textMuted),
          ),
          const SizedBox(height: Space.sm),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.arrow_forward_rounded, size: 13, color: tint),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  advice.action,
                  style: text.bodyMedium?.copyWith(color: t.textSecondary),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// A suggested day, grouped into its slots.
class _RoutinePlan extends StatelessWidget {
  const _RoutinePlan(this.blocks);
  final List<RoutineBlock> blocks;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    final slots = <String, List<RoutineBlock>>{};
    for (final b in blocks) {
      (slots[b.when] ??= []).add(b);
    }

    IconData glyph(String slot) => switch (slot) {
          'Morning' => Icons.wb_twilight_rounded,
          'Midday' => Icons.wb_sunny_outlined,
          _ => Icons.nightlight_outlined,
        };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final slot in ['Morning', 'Midday', 'Evening'])
          if (slots[slot] != null) ...[
            const SizedBox(height: Space.md),
            Row(
              children: [
                Icon(glyph(slot), size: Dimens.iconSm, color: t.accent),
                const SizedBox(width: 6),
                Text(slot.toUpperCase(),
                    style: text.labelLarge?.copyWith(color: t.accent)),
              ],
            ),
            const SizedBox(height: Space.sm),
            for (final b in slots[slot]!)
              Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.symmetric(
                    horizontal: Space.md, vertical: Space.sm),
                decoration: BoxDecoration(
                  color: t.surfaceAlt,
                  borderRadius: BorderRadius.circular(Radii.sm),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(b.title, style: text.bodyLarge),
                    if (b.detail.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(b.detail,
                          style:
                              text.bodySmall?.copyWith(color: t.textMuted)),
                    ],
                  ],
                ),
              ),
          ],
      ],
    );
  }
}
