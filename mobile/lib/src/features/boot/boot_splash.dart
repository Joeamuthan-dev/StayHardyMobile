import 'package:flutter/material.dart';

import '../../theme/aura_tokens.dart';

/// The in-Flutter half of the splash: shown while the boot gate decides
/// where to send the user, visually continuous with the native launch screen
/// (same icon, same near-black ground) so boot reads as one moment, not two.
///
/// Under the wordmark, "STAY" is transmitted in Morse — the Interstellar
/// signal, and the first word of the app's own name. It replaces the inherited
/// "GRINDING…" line: same job (something alive while the boot gate decides),
/// but it rewards the person who works out what it is spelling.
class BootSplash extends StatefulWidget {
  const BootSplash({super.key});

  @override
  State<BootSplash> createState() => _BootSplashState();
}

class _BootSplashState extends State<BootSplash>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final reduceMotion = MediaQuery.of(context).disableAnimations;

    return Scaffold(
      backgroundColor: t.bg,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedBuilder(
              animation: _pulse,
              builder: (context, child) {
                final v = reduceMotion
                    ? 0.5
                    : Curves.easeInOut.transform(_pulse.value);
                return Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: t.accent.withValues(alpha: 0.10 + 0.14 * v),
                        blurRadius: 46 + 22 * v,
                        spreadRadius: 4 + 5 * v,
                      ),
                    ],
                  ),
                  child: child,
                );
              },
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child:
                    Image.asset('assets/brand/app_icon.png', fit: BoxFit.cover),
              ),
            ),
            const SizedBox(height: Space.xl),
            Text(
              'STAYHARDY',
              style: text.labelMedium?.copyWith(
                letterSpacing: 5,
                color: t.textPrimary,
              ),
            ),
            const SizedBox(height: Space.xs),
            _MorseStay(paused: reduceMotion),
          ],
        ),
      ),
    );
  }
}

/// "STAY", transmitted.
///
/// S ···   T −   A ·−   Y −·−−
///
/// Symbols illuminate left to right on a loop, so the row reads as a signal
/// being sent rather than a static graphic. Real Morse weighting is kept — a
/// dash is three times a dot — because getting that wrong is visible to anyone
/// who knows the code, and they are exactly the audience this is for.
class _MorseStay extends StatefulWidget {
  const _MorseStay({required this.paused});

  final bool paused;

  @override
  State<_MorseStay> createState() => _MorseStayState();
}

class _MorseStayState extends State<_MorseStay>
    with SingleTickerProviderStateMixin {
  /// true = dash, false = dot. Grouped by letter.
  static const _letters = <List<bool>>[
    [false, false, false], // S
    [true], // T
    [false, true], // A
    [true, false, true, true], // Y
  ];

  static const _count = 10;

  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2600),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = context.aura;

    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) {
        // A short tail of the cycle is dead air, so the sequence visibly
        // restarts instead of wrapping seamlessly into itself.
        final playhead = widget.paused ? 1.0 : (_c.value / 0.82).clamp(0.0, 1.0);
        var index = 0;

        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var l = 0; l < _letters.length; l++) ...[
              if (l > 0) const SizedBox(width: 13),
              for (var i = 0; i < _letters[l].length; i++) ...[
                if (i > 0) const SizedBox(width: 4),
                _Symbol(
                  dash: _letters[l][i],
                  lit: widget.paused || playhead >= (index++) / _count,
                  colour: t.textPrimary,
                ),
              ],
            ],
          ],
        );
      },
    );
  }
}

class _Symbol extends StatelessWidget {
  const _Symbol({required this.dash, required this.lit, required this.colour});

  final bool dash;
  final bool lit;
  final Color colour;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: Motion.base,
      curve: Motion.curve,
      width: dash ? 18 : 7,
      height: 7,
      decoration: BoxDecoration(
        color: colour.withValues(alpha: lit ? 0.96 : 0.16),
        borderRadius: BorderRadius.circular(dash ? 3.5 : 99),
        boxShadow: lit
            ? [
                BoxShadow(
                  color: colour.withValues(alpha: 0.55),
                  blurRadius: 11,
                  spreadRadius: 0.5,
                ),
              ]
            : null,
      ),
    );
  }
}
