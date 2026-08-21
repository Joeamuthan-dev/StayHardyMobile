import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../domain/civil_date.dart';
import '../../domain/mood_rules.dart';
import '../../theme/aura_tokens.dart';
import '../../theme/mood_palette.dart';
import '../../theme/aura_typography.dart';
import '../../ui/app_button.dart';
import '../../ui/mood_face.dart';

/// "How do you feel today?"
///
/// One question, one drag, one button. The reference this follows is right
/// about the important thing: the *whole screen* answers with the user, so the
/// reading is felt rather than filled in. The colour, the face and the word all
/// move together as the slider moves.
///
/// No 3D render — a bundled illustration set would add megabytes to an APK for
/// five states. The orb is drawn: a soft gradient circle with a simple painted
/// expression, which scales, tints and animates for free.
class MoodCheckIn extends ConsumerStatefulWidget {
  const MoodCheckIn({super.key, this.date});

  /// Defaults to today. Passed explicitly when editing an earlier day.
  final CivilDate? date;

  static Future<void> open(BuildContext context, {CivilDate? date}) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        fullscreenDialog: true,
        builder: (_) => MoodCheckIn(date: date),
      ),
    );
  }

  @override
  ConsumerState<MoodCheckIn> createState() => _MoodCheckInState();
}

class _MoodCheckInState extends ConsumerState<MoodCheckIn> {
  // Starts in the middle rather than at an extreme: an initial value of 1 or 5
  // nudges the answer, and a mood scale that nudges is a mood scale that lies.
  double _value = 3;
  bool _loaded = false;
  bool _saving = false;

  CivilDate get _date => widget.date ?? CivilDate.today();

  @override
  void initState() {
    super.initState();
    unawaited(_loadExisting());
  }

  Future<void> _loadExisting() async {
    final existing =
        await ref.read(moodRepositoryProvider).entryFor(_date);
    if (!mounted) return;
    setState(() {
      if (existing != null) _value = existing.score.toDouble();
      _loaded = true;
    });
  }

  MoodLevel get _level => MoodLevel.fromScore(_value.round());

  Color _colourFor(AuraTokens t, MoodLevel level) => t.mood(level);

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final text = Theme.of(context).textTheme;
    final colour = t.mood(_level);

    return Scaffold(
      appBar: AppBar(
        leading: const CloseButton(),
        actions: [
          if (_loaded)
            TextButton(
              onPressed: _saving ? null : _skip,
              child: Text('Not today',
                  style: text.titleMedium?.copyWith(color: t.textMuted)),
            ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Space.lg),
          child: Column(
            children: [
              Text(
                _date.iso == CivilDate.today().iso
                    ? 'How do you feel today?'
                    : 'How was that day?',
                textAlign: TextAlign.center,
                style: text.displayMedium,
              ),
              const Spacer(),

              _MoodOrb(level: _level, colour: colour),
              const SizedBox(height: Space.xl),

              AnimatedSwitcher(
                duration: Motion.fast,
                child: Text(
                  _level.label,
                  key: ValueKey(_level),
                  style: AuraType.numeral(38, color: colour, weight: 700),
                ),
              ),

              const Spacer(),

              _ScaleTrack(value: _value, colourFor: t.mood),
              SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  trackHeight: 0,
                  overlayShape:
                      const RoundSliderOverlayShape(overlayRadius: 22),
                  thumbShape:
                      const RoundSliderThumbShape(enabledThumbRadius: 14),
                  thumbColor: colour,
                  overlayColor: colour.withValues(alpha: Alphas.tint),
                  activeTrackColor: Colors.transparent,
                  inactiveTrackColor: Colors.transparent,
                ),
                child: Slider(
                  value: _value,
                  min: 1,
                  max: 5,
                  divisions: 4,
                  onChanged: (v) {
                    if (v.round() != _value.round()) {
                      unawaited(
                          HapticFeedback.selectionClick().catchError((_) {}));
                    }
                    setState(() => _value = v);
                  },
                ),
              ),
              // Inset to the track's own edges and given the two ends' colours.
              // Flush against the screen margin they read as page furniture and
              // clipped oddly against the slider above; here they are clearly
              // the poles of the scale.
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Terrible',
                        style: text.labelLarge
                            ?.copyWith(color: _colourFor(t, MoodLevel.terrible)
                                .withValues(alpha: 0.8))),
                    Text('Excellent',
                        style: text.labelLarge
                            ?.copyWith(color: _colourFor(t, MoodLevel.excellent)
                                .withValues(alpha: 0.8))),
                  ],
                ),
              ),
              const SizedBox(height: Space.xl),

              AppButton.primary(
                label: _saving ? 'SAVING…' : 'SAVE',
                onPressed: _saving ? null : _save,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    unawaited(HapticFeedback.mediumImpact().catchError((_) {}));
    await ref
        .read(moodRepositoryProvider)
        .log(_value.round(), on: widget.date);
    if (mounted) Navigator.of(context).pop();
  }

  /// Closing without answering must not be recorded as anything.
  ///
  /// A skipped day is genuinely missing data, and inventing a 3 for it would
  /// quietly flatten every average the feature produces.
  void _skip() => Navigator.of(context).pop();
}

/// The face.
///
/// Three animations run at once, because a face that only changes when dragged
/// looks dead between drags:
///
/// * **Float** — a slow sine bob, so the orb hovers rather than sits.
/// * **Blink** — irregular, on a timer rather than a loop. A metronomic blink
///   is more unsettling than none at all.
/// * **Squash** — a spring on every change of level, so answering *feels* like
///   the character reacted to you.
///
/// Everything is painted. Five illustration states would be megabytes of APK
/// for a screen used once a day, and a drawn face can interpolate *between*
/// moods — which is the thing that makes dragging the slider feel alive.
class _MoodOrb extends StatefulWidget {
  const _MoodOrb({required this.level, required this.colour});

  final MoodLevel level;
  final Color colour;

  @override
  State<_MoodOrb> createState() => _MoodOrbState();
}

class _MoodOrbState extends State<_MoodOrb>
    with TickerProviderStateMixin {
  late final AnimationController _float;
  late final AnimationController _blink;
  late final AnimationController _squash;
  Timer? _blinkTimer;

  @override
  void initState() {
    super.initState();
    _float = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2600),
    )..repeat(reverse: true);
    _blink = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _squash = AnimationController(
      vsync: this,
      duration: Motion.slow,
      value: 1,
    );
    _scheduleBlink();
  }

  /// Blinks land 2–6 seconds apart. The interval is derived from the frame
  /// clock rather than a random source so it stays deterministic in tests,
  /// while still reading as irregular to a person.
  void _scheduleBlink() {
    final jitter = 2000 + (_float.lastElapsedDuration?.inMilliseconds ?? 0) % 4000;
    _blinkTimer = Timer(Duration(milliseconds: jitter), () async {
      if (!mounted) return;
      await _blink.forward();
      if (!mounted) return;
      await _blink.reverse();
      if (mounted) _scheduleBlink();
    });
  }

  @override
  void didUpdateWidget(_MoodOrb old) {
    super.didUpdateWidget(old);
    if (old.level != widget.level) {
      // Squash and rebound. The character reacts to the answer.
      _squash
        ..value = 0
        ..forward();
      unawaited(HapticFeedback.selectionClick().catchError((_) {}));
    }
  }

  @override
  void dispose() {
    _blinkTimer?.cancel();
    _float.dispose();
    _blink.dispose();
    _squash.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ink = context.aura.onMood;

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: widget.level.fraction),
      duration: Motion.slow,
      curve: Motion.emphasised,
      builder: (context, mood, _) {
        return AnimatedBuilder(
          animation: Listenable.merge([_float, _blink, _squash]),
          builder: (context, _) {
            // Bob: full amplitude when happy, almost none when low. A
            // "terrible" orb that bounces cheerfully is telling the user their
            // answer was not heard.
            final bob = math.sin(_float.value * math.pi * 2) *
                (2 + mood * 6);

            // Spring: overshoot once, then settle.
            final spring = _squash.isAnimating || _squash.value < 1
                ? 1 + math.sin(_squash.value * math.pi) * 0.09
                : 1.0;

            final scale = (0.88 + mood * 0.16) * spring;

            return Transform.translate(
              offset: Offset(0, bob),
              child: Transform.scale(
                scale: scale,
                child: Container(
                  width: 190,
                  height: 190,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        widget.colour.withValues(alpha: 0.98),
                        widget.colour.withValues(alpha: 0.62),
                      ],
                      center: const Alignment(-0.35, -0.45),
                      radius: 0.95,
                    ),
                    boxShadow: Shadows.glow(widget.colour),
                  ),
                  child: CustomPaint(
                    painter: MoodFacePainter(
                      mood: mood,
                      blink: _blink.value,
                      ink: ink,
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}


/// The gradient scale under the slider.
class _ScaleTrack extends StatelessWidget {
  const _ScaleTrack({required this.value, required this.colourFor});

  final double value;
  final Color Function(MoodLevel) colourFor;

  @override
  Widget build(BuildContext context) {
    final t = context.aura;
    final fraction = (value - 1) / 4;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: LayoutBuilder(
        builder: (context, c) => Stack(
          children: [
            Container(
              height: 14,
              decoration: BoxDecoration(
                color: t.surfaceAlt,
                borderRadius: BorderRadius.circular(Radii.pill),
              ),
            ),
            // Filled only to the current point, so the scale reads as an answer
            // rather than as decoration.
            Container(
              height: 14,
              width: (c.maxWidth * fraction).clamp(14.0, c.maxWidth),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    colourFor(MoodLevel.terrible),
                    colourFor(MoodLevel.low),
                    colourFor(MoodLevel.okay),
                    colourFor(MoodLevel.good),
                    colourFor(MoodLevel.excellent),
                  ],
                ),
                borderRadius: BorderRadius.circular(Radii.pill),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
