import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../theme/aura_tokens.dart';
import '../../ui/app_button.dart';

/// Where a password-recovery link lands when the app catches it.
///
/// The user arrives on a recovery session; this asks for the new 4-digit PIN
/// twice and finishes the reset in-app — no website involved. That is the
/// whole fix for "the email link just loads the site and nothing happens".
class SetNewPinScreen extends ConsumerStatefulWidget {
  const SetNewPinScreen({super.key});

  static Future<void> open(BuildContext context) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        fullscreenDialog: true,
        builder: (_) => const SetNewPinScreen(),
      ),
    );
  }

  @override
  ConsumerState<SetNewPinScreen> createState() => _SetNewPinScreenState();
}

class _SetNewPinScreenState extends ConsumerState<SetNewPinScreen> {
  final _first = TextEditingController();
  final _second = TextEditingController();
  bool _busy = false;
  bool _done = false;
  String? _error;

  @override
  void dispose() {
    _first.dispose();
    _second.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final pin = _first.text.trim();
    if (pin.length != 4) {
      setState(() => _error = 'Four digits.');
      return;
    }
    if (pin != _second.text.trim()) {
      setState(() => _error = 'They do not match.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    final result = await ref.read(authServiceProvider).completePinReset(pin);
    if (!mounted) return;

    if (result.isSuccess) {
      unawaited(HapticFeedback.mediumImpact().catchError((_) {}));
      // The recovery session IS a signed-in session — flow straight into
      // the app rather than bouncing back to login.
      ref.read(authUserIdProvider.notifier).state =
          ref.read(authServiceProvider).currentUserId;
      setState(() {
        _busy = false;
        _done = true;
      });
      await Future<void>.delayed(const Duration(milliseconds: 900));
      if (mounted) Navigator.of(context).pop();
      return;
    }
    setState(() {
      _busy = false;
      _error = result.message;
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

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
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.xl),
          children: [
            Text('Set a new PIN', style: text.headlineMedium),
            const SizedBox(height: Space.sm),
            Text(
              _done
                  ? 'Done — your new PIN works everywhere now.'
                  : 'Four digits. It becomes your sign-in on every device.',
              style: text.bodyMedium?.copyWith(
                  color: _done ? t.success : t.textSecondary),
            ),
            const SizedBox(height: Space.xl),
            TextField(
              controller: _first,
              autofocus: true,
              obscureText: true,
              keyboardType: TextInputType.number,
              maxLength: 4,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                  hintText: 'New 4-digit PIN', counterText: ''),
            ),
            const SizedBox(height: Space.md),
            TextField(
              controller: _second,
              obscureText: true,
              keyboardType: TextInputType.number,
              maxLength: 4,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                  hintText: 'Same PIN again', counterText: ''),
            ),
            if (_error != null) ...[
              const SizedBox(height: Space.md),
              Text(_error!,
                  style: text.bodyMedium?.copyWith(color: t.danger)),
            ],
            const SizedBox(height: Space.xl),
            AppButton.primary(
              label: _busy ? 'SAVING…' : (_done ? 'DONE' : 'SAVE NEW PIN'),
              onPressed: _busy || _done ? null : _save,
            ),
          ],
        ),
      ),
    );
  }
}
