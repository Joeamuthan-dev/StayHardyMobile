import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/app_config.dart';
import '../../data/auth_service.dart';
import '../../data/providers.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/segmented_tabs.dart';
import '../../ui/surface_card.dart';

/// The front door.
///
/// This screen has one job before it collects a single credential: make the
/// promise. Someone lands here having decided to work on themselves, and a
/// plain email field says "form" when it should say "beginning". So the page
/// leads with the brand — the app icon, a slow aurora behind it, and the
/// product's whole argument in four words: LUCK struck out, CONSISTENCY
/// underlined. It says *what this is* without a paragraph.
///
/// The mechanics under it are deliberately boring and unchanged: password is
/// `'SH' + pin`, Google mints an ID token for the web client, and every
/// message that is progress renders calm green rather than error red.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

/// Which form the card is showing.
enum _Mode { signIn, signUp, forgot }

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _email = TextEditingController();
  final _pin = TextEditingController();
  final _name = TextEditingController();
  final _pinFocus = FocusNode();

  _Mode _mode = _Mode.signIn;
  bool _busy = false;
  String? _error;

  /// A confirmation, as opposed to an error — "reset link sent", "account
  /// created, check your inbox". Kept separate so it renders calm, not red.
  String? _notice;

  /// Drives the aurora drift and the badge float, forever and slowly.
  late final AnimationController _ambient;

  @override
  void initState() {
    super.initState();
    _ambient = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 14),
    )..repeat();
    _prefillFromLegacy();
    // Repaints the PIN boxes as digits arrive, and on focus changes.
    _pin.addListener(() => setState(() {}));
    _pinFocus.addListener(() => setState(() {}));
  }

  /// If the upgrade could not carry the session, at least carry the address, so
  /// the user is greeted by name rather than an empty form.
  Future<void> _prefillFromLegacy() async {
    final hint = await ref.read(authServiceProvider).legacyEmailHint();
    if (hint != null && mounted && _email.text.isEmpty) {
      setState(() => _email.text = hint);
    }
  }

  @override
  void dispose() {
    _ambient.dispose();
    _email.dispose();
    _pin.dispose();
    _name.dispose();
    _pinFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      body: Stack(
        children: [
          // The aurora sits behind everything, including the status bar area.
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _ambient,
              builder: (context, _) => CustomPaint(
                painter: _AuroraPainter(
                  t: _ambient.value,
                  colours: [t.accent, t.secondary, t.accentAlt],
                ),
              ),
            ),
          ),
          SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(
                  Space.lg, Space.md, Space.lg, Space.md),
              children: [
                // --- the promise -----------------------------------------
                // One compact header row: everything above the card must fit
                // in ~120dp, because the whole page has to be visible without
                // scrolling — a Google button below the fold is a Google
                // button nobody presses.
                _Reveal(
                  index: 0,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      AnimatedBuilder(
                        animation: _ambient,
                        builder: (context, child) => Transform.translate(
                          offset: Offset(
                            0,
                            math.sin(_ambient.value * math.pi * 2) * 3,
                          ),
                          child: child,
                        ),
                        child: Container(
                          width: 46,
                          height: 46,
                          // The shipped launcher icon, not a stand-in glyph.
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: Shadows.glow(t.accent),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.asset(
                              'assets/brand/app_icon.png',
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: Space.md),
                      Text('StayHardy', style: text.headlineLarge),
                    ],
                  ),
                ),
                const SizedBox(height: Space.md),
                // The product's whole argument, made in front of you — it
                // carries the tagline's job too, in fewer pixels.
                _Reveal(
                  index: 2,
                  // Keyed on the mode so tapping Sign in / Create account
                  // replays the argument. It is the one piece of theatre on a
                  // screen people see constantly, and playing once per app
                  // launch is what made it feel like a static graphic.
                  child: Center(child: _MottoMotif(key: ValueKey(_mode))),
                ),
                const SizedBox(height: Space.lg),

                // --- the form --------------------------------------------
                _Reveal(
                  index: 3,
                  child: SurfaceCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SegmentedTabs(
                          labels: const ['Sign in', 'Create account'],
                          index: _mode == _Mode.signUp ? 1 : 0,
                          onSelect: (i) => _switchMode(
                              i == 1 ? _Mode.signUp : _Mode.signIn),
                        ),
                        const SizedBox(height: Space.md),

                        Text(
                          switch (_mode) {
                            _Mode.signIn => 'Welcome back',
                            _Mode.signUp => 'Start your streak',
                            _Mode.forgot => 'Reset your PIN',
                          },
                          style: text.titleLarge,
                        ),
                        const SizedBox(height: 3),
                        Text(
                          switch (_mode) {
                            _Mode.signIn =>
                              'Your habits are where you left them.',
                            _Mode.signUp =>
                              'One account, and day one starts now.',
                            _Mode.forgot =>
                              'We email you a link to choose a new PIN.',
                          },
                          style:
                              text.bodySmall?.copyWith(color: t.textMuted),
                        ),
                        const SizedBox(height: Space.md),

                        // Grows and shrinks with the mode rather than
                        // jump-cutting between three screens.
                        AnimatedSize(
                          duration: Motion.base,
                          curve: Motion.curve,
                          alignment: Alignment.topCenter,
                          child: Column(
                            children: [
                              if (_mode == _Mode.signUp) ...[
                                TextField(
                                  controller: _name,
                                  textCapitalization:
                                      TextCapitalization.words,
                                  decoration: const InputDecoration(
                                    hintText: 'Your name',
                                    prefixIcon:
                                        Icon(Icons.person_outline_rounded),
                                  ),
                                ),
                                const SizedBox(height: Space.md),
                              ],
                              TextField(
                                controller: _email,
                                keyboardType: TextInputType.emailAddress,
                                autocorrect: false,
                                decoration: const InputDecoration(
                                  hintText: 'you@email.com',
                                  prefixIcon:
                                      Icon(Icons.mail_outline_rounded),
                                ),
                              ),
                              if (_mode != _Mode.forgot) ...[
                                const SizedBox(height: Space.md),
                                _PinBoxes(
                                  controller: _pin,
                                  focusNode: _pinFocus,
                                  label: _mode == _Mode.signUp
                                      ? 'Choose a 4-digit PIN'
                                      : 'Your 4-digit PIN',
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: Space.md),

                        if (_error != null) ...[
                          StatusNote(
                            icon: Icons.error_outline_rounded,
                            message: _error!,
                            tint: t.danger,
                          ),
                          const SizedBox(height: Space.md),
                        ],
                        if (_notice != null) ...[
                          StatusNote(
                            icon: Icons.mark_email_read_outlined,
                            message: _notice!,
                            tint: t.success,
                          ),
                          const SizedBox(height: Space.md),
                        ],

                        AppButton.primary(
                          label: _busy
                              ? 'WORKING…'
                              : switch (_mode) {
                                  _Mode.signIn => 'SIGN IN',
                                  _Mode.signUp => 'CREATE ACCOUNT',
                                  _Mode.forgot => 'SEND RESET LINK',
                                },
                          onPressed: _busy ? null : _submit,
                        ),
                        const SizedBox(height: Space.sm),
                        Center(
                          child: AppButton.text(
                            label: _mode == _Mode.forgot
                                ? 'BACK TO SIGN IN'
                                : 'FORGOT PIN?',
                            onPressed: () => _switchMode(_mode == _Mode.forgot
                                ? _Mode.signIn
                                : _Mode.forgot),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // --- Google ----------------------------------------------
                if (AppConfig.hasGoogleSignIn) ...[
                  const SizedBox(height: Space.lg),
                  _Reveal(
                    index: 4,
                    child: Row(
                      children: [
                        Expanded(
                            child: Divider(
                                color: t.border, height: Dimens.hairline)),
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: Space.md),
                          child: Text('OR', style: text.labelMedium),
                        ),
                        Expanded(
                            child: Divider(
                                color: t.border, height: Dimens.hairline)),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.lg),
                  _Reveal(
                    index: 5,
                    child: _GoogleButton(onPressed: _busy ? null : _google),
                  ),
                ],

                const SizedBox(height: Space.xl),
                _Reveal(
                  index: 6,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.lock_outline_rounded,
                          size: 13, color: t.textMuted),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          'Private by design — your habits stay on your phone.',
                          style:
                              text.bodySmall?.copyWith(color: t.textMuted),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _switchMode(_Mode mode) => setState(() {
        _mode = mode;
        _error = null;
        _notice = null;
      });

  Future<void> _google() async {
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    final result = await ref.read(authServiceProvider).signInWithGoogle();
    if (!mounted) return;

    if (result.isSuccess) {
      _onSignedIn(result);
      return;
    }
    setState(() {
      _busy = false;
      _error = result.message;
    });
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    final pin = _pin.text.trim();

    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Enter your email address.');
      return;
    }
    if (_mode != _Mode.forgot && pin.length != 4) {
      setState(() => _error = 'The PIN is 4 digits.');
      return;
    }
    if (_mode == _Mode.signUp && _name.text.trim().isEmpty) {
      setState(() => _error = 'Tell us your name.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });

    final auth = ref.read(authServiceProvider);
    final result = switch (_mode) {
      _Mode.signIn => await auth.signInWithPin(email, pin),
      _Mode.signUp =>
        await auth.signUp(email: email, pin: pin, name: _name.text),
      _Mode.forgot => await auth.sendPinReset(email),
    };
    if (!mounted) return;

    // Sign-in, or a sign-up that came back with a live session (Supabase
    // does that when email confirmation is switched off) — both land inside.
    if (result.isSuccess && result.userId != null) {
      _onSignedIn(result);
      return;
    }

    setState(() {
      _busy = false;
      // Sign-up lands on "check your inbox" and forgot on "link sent" — both
      // are progress, not failure, and must not render red.
      if (result.isSuccess || result.outcome == AuthOutcome.unconfirmedEmail) {
        _notice = result.message;
        if (_mode == _Mode.signUp) _mode = _Mode.signIn;
      } else {
        _error = result.message;
      }
    });
  }

  void _onSignedIn(AuthResult result) {
    // Publishing the id is what unblocks the migration and the legacy source;
    // BootGate reacts from there.
    ref.read(authUserIdProvider.notifier).state = result.userId;
    // Re-key RevenueCat to this account BEFORE asking it about Pro — the
    // sequence is what lets a subscriber sign in on a new phone and have
    // their purchase follow the account rather than the install.
    unawaited(() async {
      final userId = result.userId;
      if (userId != null) {
        await ref.read(subscriptionServiceProvider).identify(userId);
      }
      await ref.read(isProProvider.notifier).refresh();
      // Pro members land with Drive backup already switched on.
      final changed = await applyProBackupDefault(
        ref.read(settingsRepositoryProvider),
        ref.read(isProProvider),
      );
      if (changed) ref.invalidate(autoBackupEnabledProvider);
    }());
  }
}

/// Entrance stagger: each block fades in and rises a beat after the previous.
class _Reveal extends StatelessWidget {
  const _Reveal({required this.index, required this.child});

  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Motion.slow + Duration(milliseconds: index * 110),
      curve: Motion.emphasised,
      builder: (context, v, child) => Opacity(
        opacity: v.clamp(0.0, 1.0),
        child:
            Transform.translate(offset: Offset(0, (1 - v) * 24), child: child),
      ),
      child: child,
    );
  }
}

/// "BE THE 1%", argued with a crowd rather than a slogan.
///
/// A hundred dots — everyone who said they would start. They fade out one by
/// one until a single lime dot is left holding, and the line lands under it.
/// The graphic *is* the definition: nobody has to be told what 1% means
/// because they just watched ninety-nine of them quit.
///
/// The old line ("consistency beats luck") named the wrong enemy. Nobody
/// installing a habit tracker believes luck is the problem; the burst that dies
/// on day four is. This keeps the brand thread from the Capacitor app's
/// "THE 1% STARTS HERE" while carrying the compounding idea underneath.
class _MottoMotif extends StatefulWidget {
  const _MottoMotif({super.key});

  @override
  State<_MottoMotif> createState() => _MottoMotifState();
}

class _MottoMotifState extends State<_MottoMotif>
    with SingleTickerProviderStateMixin {
  static const _cols = 20;
  static const _rows = 5; // 100 dots exactly — the number has to be true.

  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2600),
  )..forward();

  /// The survivor, in the middle row and middle column.
  ///
  /// It has to finish centred above the words: once the other ninety-nine have
  /// gone, a lone dot anywhere else reads as a rendering glitch rather than the
  /// last one standing.
  static const _keeper = 50; // row 2 of 5, column 10 of 20

  /// Deterministic quit order, so the animation is identical every replay and
  /// the last dot standing is always the same one.
  static final List<int> _order = () {
    final ids = List<int>.generate(_cols * _rows, (i) => i)
      ..remove(_keeper);
    // A fixed shuffle: index-hashed, no Random, so there is nothing to seed.
    ids.sort((a, b) =>
        ((a * 7919) % 101).compareTo(((b * 7919) % 101)));
    return ids;
  }();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final reduce = MediaQuery.of(context).disableAnimations;

    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        final v = reduce ? 1.0 : _c.value;
        // Dots clear out over the first two thirds; the words arrive after.
        final cull = Curves.easeInOut.transform((v / 0.66).clamp(0.0, 1.0));
        final words = Curves.easeOutCubic
            .transform(((v - 0.55) / 0.45).clamp(0.0, 1.0));
        final gone = (cull * _order.length).floor();
        // The survivor holds while the words arrive, then goes too. Leaving a
        // lone dot parked above the line reads as a stray pixel rather than the
        // end of a story — the graphic has already made its point by then.
        final keeperOut = v > 0.90;

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: Motion.slow,
              curve: Motion.curve,
              height: keeperOut ? 0 : 34,
              child: LayoutBuilder(
                builder: (context, box) {
                  final gap = box.maxWidth / _cols;
                  return Stack(
                    children: [
                      for (var i = 0; i < _cols * _rows; i++)
                        _Dot(
                          left: (i % _cols) * gap,
                          top: (i ~/ _cols) * 7.0,
                          keeper: i == _keeper,
                          // A dot is out once the cull has passed its place in
                          // the queue.
                          out: i == _keeper
                              ? keeperOut
                              : _order.indexOf(i) < gone,
                          colour: t.accent,
                          dim: t.textMuted,
                        ),
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: Space.sm),
            Opacity(
              opacity: words.clamp(0.0, 1.0),
              child: Transform.translate(
                offset: Offset(0, (1 - words) * 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      'BE THE ',
                      style: text.titleMedium?.copyWith(
                        letterSpacing: 4,
                        color: t.textSecondary,
                      ),
                    ),
                    Text(
                      '1%',
                      style: AuraType.numeral(24, color: t.accent),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({
    required this.left,
    required this.top,
    required this.keeper,
    required this.out,
    required this.colour,
    required this.dim,
  });

  final double left;
  final double top;
  final bool keeper;
  final bool out;
  final Color colour;
  final Color dim;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: left,
      top: top,
      child: AnimatedOpacity(
        duration: Motion.base,
        opacity: out ? 0.0 : 1.0,
        child: Container(
          width: keeper ? 6 : 4,
          height: keeper ? 6 : 4,
          decoration: BoxDecoration(
            color: keeper ? colour : dim,
            shape: BoxShape.circle,
            boxShadow: keeper
                ? [
                    BoxShadow(
                      color: colour.withValues(alpha: 0.6),
                      blurRadius: 8,
                      spreadRadius: 1,
                    ),
                  ]
                : null,
          ),
        ),
      ),
    );
  }
}

/// Four PIN boxes over one invisible field.
///
/// A single obscured TextField is functionally identical and looks like a
/// password box from 2009. Four boxes that light up as digits land is the
/// pattern every premium app uses for short codes, and it doubles as live
/// feedback that exactly four digits are wanted.
class _PinBoxes extends StatelessWidget {
  const _PinBoxes({
    required this.controller,
    required this.focusNode,
    required this.label,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final String label;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final value = controller.text;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: text.labelMedium),
        const SizedBox(height: Space.sm),
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => focusNode.requestFocus(),
          child: Stack(
            children: [
              // The real input, invisible but focusable — the boxes are only
              // a rendering of its state.
              Opacity(
                opacity: 0,
                child: SizedBox(
                  height: 1,
                  child: TextField(
                    controller: controller,
                    focusNode: focusNode,
                    keyboardType: TextInputType.number,
                    maxLength: 4,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                    ],
                    decoration: const InputDecoration(counterText: ''),
                  ),
                ),
              ),
              Row(
                children: [
                  for (var i = 0; i < 4; i++) ...[
                    if (i > 0) const SizedBox(width: Space.sm),
                    Expanded(
                      child: AnimatedContainer(
                        duration: Motion.fast,
                        height: 48,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: t.surfaceAlt,
                          borderRadius: BorderRadius.circular(Radii.md),
                          border: Border.all(
                            color: focusNode.hasFocus && value.length == i
                                ? t.accent
                                : (i < value.length
                                    ? t.accentMuted
                                    : t.border),
                            width: focusNode.hasFocus && value.length == i
                                ? 1.5
                                : Dimens.border,
                          ),
                        ),
                        child: Text(
                          // A dot, not the digit: shoulder-surfing a PIN in a
                          // café is the attack this account model actually
                          // faces.
                          i < value.length ? '●' : '',
                          style: AuraType.numeral(18, color: t.textPrimary),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// "Continue with Google", with the mark painted rather than bundled.
class _GoogleButton extends StatelessWidget {
  const _GoogleButton({required this.onPressed});

  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(Radii.md),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(Radii.md),
        child: Container(
          height: Dimens.controlHeight,
          decoration: BoxDecoration(
            color: t.surface,
            borderRadius: BorderRadius.circular(Radii.md),
            border: Border.all(color: t.borderStrong, width: Dimens.border),
            boxShadow: Shadows.card(t),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CustomPaint(
                size: Size(20, 20),
                painter: _GoogleGPainter(),
              ),
              const SizedBox(width: Space.md),
              Text('Continue with Google', style: text.titleMedium),
            ],
          ),
        ),
      ),
    );
  }
}

/// The four-colour G, approximated with arcs.
///
/// Painted rather than bundled: an asset needs licensing hygiene and a build
/// step, and at 20px four arcs and a bar are indistinguishable from the real
/// mark. Colours live on [AuraTokens] statics — the one sanctioned home for
/// raw literals.
class _GoogleGPainter extends CustomPainter {
  const _GoogleGPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.width * 0.20;
    final radius = (size.shortestSide - stroke) / 2;
    final center = (Offset.zero & size).center;
    final rect = Rect.fromCircle(center: center, radius: radius);

    Paint arc(Color colour) => Paint()
      ..color = colour
      ..strokeWidth = stroke
      ..style = PaintingStyle.stroke;

    double rad(double deg) => deg * math.pi / 180;

    // Angles measured clockwise from 3 o'clock, matching the real mark's
    // segment order: blue right, green bottom, yellow left, red top.
    canvas.drawArc(rect, rad(-10), rad(55), false, arc(AuraTokens.googleBlue));
    canvas.drawArc(rect, rad(45), rad(90), false, arc(AuraTokens.googleGreen));
    canvas.drawArc(
        rect, rad(135), rad(90), false, arc(AuraTokens.googleYellow));
    canvas.drawArc(rect, rad(225), rad(90), false, arc(AuraTokens.googleRed));

    // The bar into the counter — what makes it a G rather than a wheel.
    canvas.drawRect(
      Rect.fromLTWH(
        center.dx,
        center.dy - stroke / 2,
        radius + stroke / 2,
        stroke,
      ),
      Paint()..color = AuraTokens.googleBlue,
    );
  }

  @override
  bool shouldRepaint(_GoogleGPainter old) => false;
}

/// Slow-drifting colour fields behind the page.
///
/// Three soft radial blobs on Lissajous paths. Subtle on purpose: at these
/// alphas it reads as depth rather than decoration, in both themes.
class _AuroraPainter extends CustomPainter {
  _AuroraPainter({required this.t, required this.colours});

  /// 0..1, looping.
  final double t;
  final List<Color> colours;

  @override
  void paint(Canvas canvas, Size size) {
    final phase = t * math.pi * 2;

    void blob(Color colour, double alpha, double fx, double fy, double px,
        double radius) {
      final centre = Offset(
        size.width * (0.5 + 0.38 * math.sin(phase * fx + px)),
        size.height * (0.28 + 0.20 * math.cos(phase * fy + px)),
      );
      canvas.drawCircle(
        centre,
        radius,
        Paint()
          ..shader = RadialGradient(
            colors: [
              colour.withValues(alpha: alpha),
              colour.withValues(alpha: 0),
            ],
          ).createShader(Rect.fromCircle(center: centre, radius: radius)),
      );
    }

    blob(colours[0], 0.16, 1, 1, 0, size.width * 0.55);
    blob(colours[1], 0.08, -1, 1, 2.1, size.width * 0.45);
    blob(colours[2], 0.10, 1, -1, 4.2, size.width * 0.50);
  }

  @override
  bool shouldRepaint(_AuroraPainter old) => old.t != t;
}
