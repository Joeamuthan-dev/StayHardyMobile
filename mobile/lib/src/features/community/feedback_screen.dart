import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/community_service.dart';
import '../../data/providers.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/app_button.dart';
import '../../ui/editor_sheet.dart';
import '../../ui/surface_card.dart';
import '../shared/section_header.dart';

/// Report a bug, ask for something, or get help.
///
/// Writes to the same `feedback` table the web app does, with the same columns
/// and the same `TKT-` id shape, so a ticket filed here lands in the admin
/// dashboard next to one filed from the web rather than in a parallel system
/// nobody checks.
class FeedbackScreen extends ConsumerStatefulWidget {
  const FeedbackScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const FeedbackScreen()),
    );
  }

  @override
  ConsumerState<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends ConsumerState<FeedbackScreen> {
  final _message = TextEditingController();
  String _category = CommunityService.categories.first;
  bool _busy = false;
  String? _sentTicketId;
  String? _error;

  @override
  void initState() {
    super.initState();
    _message.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final userId = ref.watch(authUserIdProvider);
    final tickets = ref.watch(myTicketsProvider).value ?? const [];
    final length = _message.text.trim().length;
    final canSend = userId != null &&
        length >= CommunityService.minMessageLength &&
        !_busy;

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
        child: ListView(
          padding: EdgeInsets.fromLTRB(
            Space.lg,
            0,
            Space.lg,
            MediaQuery.of(context).viewInsets.bottom + Space.xxl,
          ),
          children: [
            const ScreenTitle(title: 'Get in touch'),
            const SizedBox(height: Space.md),
            Text(
              'A real person reads these.',
              style: text.bodyMedium?.copyWith(color: t.textSecondary),
            ),
            const SizedBox(height: Space.xl),

            if (_sentTicketId != null) ...[
              StatusNote(
                icon: Icons.check_rounded,
                // The ticket id is shown because it is the only thing the user
                // can quote back. "Thanks for your feedback!" with nothing to
                // reference is a dead end.
                message: 'Sent. Your reference is $_sentTicketId — we will '
                    'reply to the email on your account.',
                tint: t.success,
              ),
              const SizedBox(height: Space.lg),
            ],

            if (_error != null) ...[
              StatusNote(
                icon: Icons.error_outline_rounded,
                message: _error!,
                tint: t.danger,
              ),
              const SizedBox(height: Space.lg),
            ],

            Field(
              label: 'What is this about',
              child: Wrap(
                spacing: Space.sm,
                runSpacing: Space.sm,
                children: [
                  for (final c in CommunityService.categories)
                    ChoiceChipTile(
                      label: c,
                      selected: c == _category,
                      onTap: () => setState(() => _category = c),
                    ),
                ],
              ),
            ),

            Field(
              label: 'Tell us',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: _message,
                    maxLines: 6,
                    maxLength: CommunityService.maxMessageLength,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: const InputDecoration(
                      hintText: 'What happened, and what did you expect?',
                      counterText: '',
                    ),
                  ),
                  const SizedBox(height: Space.xs),
                  Text(
                    length < CommunityService.minMessageLength
                        ? 'A few more words — '
                            '${CommunityService.minMessageLength - length} to go'
                        : '$length characters',
                    style: text.bodySmall?.copyWith(color: t.textMuted),
                  ),
                ],
              ),
            ),

            AppButton.primary(
              label: _busy ? 'SENDING…' : 'SEND',
              onPressed: canSend ? _send : null,
            ),
            if (userId == null) ...[
              const SizedBox(height: Space.sm),
              Text(
                'Sign in so we can reply to you.',
                textAlign: TextAlign.center,
                style: text.bodySmall?.copyWith(color: t.textMuted),
              ),
            ],

            if (tickets.isNotEmpty) ...[
              const SizedBox(height: Space.xxl),
              const SectionLabel('Your messages'),
              const SizedBox(height: Space.md),
              for (final ticket in tickets) _TicketCard(ticket: ticket),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _send() async {
    final userId = ref.read(authUserIdProvider);
    if (userId == null) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    final ticketId = await ref.read(communityServiceProvider).submit(
          message: _message.text,
          // 'Bug' and 'Feature request' are support tickets in the admin
          // dashboard's terms; the rest is general feedback. Matching the web
          // app's split keeps one triage queue rather than two.
          type: _category == 'Bug' || _category == 'Feature request'
              ? 'support'
              : 'feedback',
          subcategory: _category.toLowerCase(),
          userId: userId,
        );

    if (!mounted) return;
    setState(() {
      _busy = false;
      if (ticketId == null) {
        // Never a silent success. Someone who reports a bug and is thanked
        // while nothing was written is worse off than someone told to retry.
        _error = "That didn't send. Check your connection and try again — "
            'your message is still here.';
      } else {
        _sentTicketId = ticketId;
        _message.clear();
      }
    });
    ref.invalidate(myTicketsProvider);
  }
}

class _TicketCard extends StatelessWidget {
  const _TicketCard({required this.ticket});
  final FeedbackTicket ticket;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: Space.md),
      child: SurfaceCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(ticket.ticketId,
                    style: text.labelMedium?.copyWith(color: t.accent)),
                const Spacer(),
                Text(
                  ticket.status.toUpperCase(),
                  style: text.labelMedium?.copyWith(
                    color: ticket.isOpen ? t.textMuted : t.success,
                  ),
                ),
              ],
            ),
            const SizedBox(height: Space.sm),
            Text(
              ticket.message,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: text.bodyMedium?.copyWith(color: t.textSecondary),
            ),
            if (ticket.reply != null && ticket.reply!.isNotEmpty) ...[
              const SizedBox(height: Space.md),
              Container(
                padding: const EdgeInsets.only(left: Space.md),
                decoration: BoxDecoration(
                  border: Border(
                    left: BorderSide(color: t.accent, width: Dimens.border),
                  ),
                ),
                child: Text(ticket.reply!, style: text.bodyMedium),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
