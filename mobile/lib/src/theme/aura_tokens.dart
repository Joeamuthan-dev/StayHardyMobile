import 'package:flutter/material.dart';

/// The Aura design language.
///
/// Replaces "Monolith" — near-black grounds, a single brass accent and hairline
/// rules instead of cards. That language was editorial and calm, and it read as
/// a paper notebook: flat, beige, and with nothing on screen that felt like
/// software you would pay for.
///
/// Aura is built on three ideas instead:
///
/// * **Depth is real.** Cards sit on the ground with a soft shadow and a
///   1px lifted border, not a hairline scratched into a flat plane. Elevation
///   is the primary way hierarchy is expressed.
/// * **One lime gradient carries identity.** [accent] → [accentAlt] appears on
///   the hero ring, the active nav pill and primary buttons — and nowhere else.
///   A gradient used everywhere is a gradient that means nothing.
/// * **Data has its own hue.** [secondary] (sky) owns charts, screen-time and
///   anything measured, so a number never has to compete with a call to action
///   for the same colour.
///
/// Lime rather than the violet this replaces, and rather than a fresh colour:
/// the live React app already ships `--accent-stitch: #BBFF00`, so this is the
/// brand returning users have seen, not a new identity invented for the rebuild.
///
/// **Lime is a light colour.** [onAccent] is near-black in dark mode — white
/// text on this accent fails contrast badly. Anything painted on [accent] must
/// read [onAccent] rather than assuming white.
///
/// Access via `Theme.of(context).extension<AuraTokens>()!`, or the
/// `context.aura` shorthand at the bottom of this file.
@immutable
class AuraTokens extends ThemeExtension<AuraTokens> {
  const AuraTokens({
    required this.bg,
    required this.bgSunken,
    required this.surface,
    required this.surfaceAlt,
    required this.surfaceHigh,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.border,
    required this.borderStrong,
    required this.accent,
    required this.accentAlt,
    required this.accentMuted,
    required this.secondary,
    required this.success,
    required this.warn,
    required this.danger,
    required this.heat,
    required this.onAccent,
    required this.shadow,
    required this.categories,
    required this.usage,
  });

  /// Page ground.
  final Color bg;

  /// Below the ground — the well a card sits in, and the scrim behind sheets.
  final Color bgSunken;

  /// A card. The workhorse surface.
  final Color surface;

  /// Recessed, for inset rows and input fields.
  final Color surfaceAlt;

  /// Lifted above a card — the nav bar, sheets, menus.
  final Color surfaceHigh;

  final Color textPrimary;

  /// Supporting copy. Deliberately not [textMuted] — see the note there.
  final Color textSecondary;

  /// Hints, captions, and metadata only.
  ///
  /// This sits near the 4.5:1 AA floor by design and must never carry meaning on
  /// its own. Anything a user needs to read uses [textSecondary].
  final Color textMuted;

  final Color border;
  final Color borderStrong;

  /// Violet. The brand, and the start of every gradient.
  final Color accent;

  /// The gradient partner — a warmer violet. Never used on its own as a fill;
  /// it exists so [Grad.brand] has somewhere to go.
  final Color accentAlt;

  /// Violet at reduced presence, for inactive states and tinted fills.
  final Color accentMuted;

  /// Teal. Owns measured things: charts, screen time, usage categories.
  ///
  /// Separate from [accent] on purpose — when a chart and a button share a
  /// colour, the user cannot tell which parts of a screen they can press.
  final Color secondary;

  final Color success;

  /// Amber. Attention without alarm — approaching a limit, a soft warning.
  final Color warn;

  final Color danger;

  /// Heatmap intensity ramp, index 0 (empty) to 4 (full).
  ///
  /// **Light green is a partial day; deep green is a completed one.** The scale
  /// runs pale → rich rather than dim → bright, so "more" reads as *denser
  /// colour* the way it does on paper. The alternative — brightest for full —
  /// is the convention on dark backgrounds, and it made a half-kept day and a
  /// fully-kept day hard to tell apart at a glance.
  ///
  /// Deliberately **not** the lime accent.
  /// The accent means "this is the brand / you can press this"; a grid of 365
  /// lime squares drowns that out on every screen it appears. Green here reads
  /// as pure data, and the ramp is the one people already know how to read from
  /// commit graphs.
  final List<Color> heat;

  /// Foreground for anything sitting on top of [accent].
  final Color onAccent;

  /// Base shadow colour. Cards apply it at low alpha; see [Shadows].
  final Color shadow;

  /// The 16 habit-category hues, keyed by lowercase category name.
  final Map<String, Color> categories;

  /// The screen-time usage-category hues, keyed by
  /// `UsageCategory.id`. Kept separate from [categories] because a habit
  /// category and an app category are different vocabularies that happen to
  /// share some words — "health" the habit is not "Health" the app bucket.
  final Map<String, Color> usage;

  // ---------------------------------------------------------------------------
  // Dark — the primary experience
  // ---------------------------------------------------------------------------
  static const dark = AuraTokens(
    bg: Color(0xFF0A0C09),
    bgSunken: Color(0xFF060704),
    surface: Color(0xFF151812),
    surfaceAlt: Color(0xFF1E221A),
    surfaceHigh: Color(0xFF262B21),
    textPrimary: Color(0xFFF2F5EC),
    textSecondary: Color(0xB3F2F5EC), // 70%
    textMuted: Color(0x80F2F5EC), // 50%
    border: Color(0x14F2F5EC), // 8%
    borderStrong: Color(0x2BF2F5EC), // 17%
    accent: Color(0xFFC4F14B),
    accentAlt: Color(0xFF8BE86B),
    accentMuted: Color(0x66C4F14B),
    secondary: Color(0xFF58B7FF),
    success: Color(0xFF4ADE80),
    warn: Color(0xFFFBBF24),
    danger: Color(0xFFFF6B6B),
    heat: [
      Color(0xFF171C18),
      Color(0xFFBBF7D0),
      Color(0xFF6EE7A0),
      Color(0xFF2FA85A),
      Color(0xFF15803D),
    ],
    // Near-black, NOT white. Lime is a light colour and white on it is
    // unreadable; every fill that uses [accent] reads this for its foreground.
    onAccent: Color(0xFF0A0C09),
    shadow: Color(0xFF000000),
    categories: _darkCategories,
    usage: _darkUsage,
  );

  // ---------------------------------------------------------------------------
  // Light
  // ---------------------------------------------------------------------------
  static const light = AuraTokens(
    bg: Color(0xFFF7F8F3),
    bgSunken: Color(0xFFEDEFE6),
    surface: Color(0xFFFFFFFF),
    surfaceAlt: Color(0xFFF1F3EA),
    surfaceHigh: Color(0xFFFFFFFF),
    textPrimary: Color(0xFF12150E),
    textSecondary: Color(0xB312150E),
    textMuted: Color(0x8012150E),
    border: Color(0x1412150E),
    borderStrong: Color(0x2412150E),
    // Lime is unreadable as text or as a fill on a near-white ground, so light
    // mode drops to a deep olive-green of the same family. The two modes are
    // therefore not the same hue at the same lightness — they are the same
    // *idea* at the lightness each ground can carry.
    accent: Color(0xFF4F7A12),
    accentAlt: Color(0xFF3C7A3C),
    accentMuted: Color(0x664F7A12),
    secondary: Color(0xFF0369A1),
    success: Color(0xFF15803D),
    warn: Color(0xFFB45309),
    danger: Color(0xFFDC2626),
    heat: [
      Color(0xFFEBEDF0),
      Color(0xFF9BE9A8),
      Color(0xFF40C463),
      Color(0xFF30A14E),
      Color(0xFF216E39),
    ],
    // White here, because light mode's accent is dark. See the dark-mode note.
    onAccent: Color(0xFFFFFFFF),
    shadow: Color(0xFF1C2416),
    categories: _lightCategories,
    usage: _lightUsage,
  );

  /// Spaced by hue where the wheel allows, and by value where it does not.
  /// Retuned from the brass-adjacent originals: these are saturated enough to
  /// read as a deliberate palette rather than as tinted greys.
  static const _darkCategories = <String, Color>{
    'general': Color(0xFF9CA3A0),
    'comeback': Color(0xFFFB923C),
    'growth': Color(0xFF4ADE80),
    'health': Color(0xFFFF8FA3),
    'hobby': Color(0xFFFBBF24),
    'home': Color(0xFF58B7FF),
    'learning': Color(0xFF8B9DF7),
    'mindset': Color(0xFFC29BF5),
    'social': Color(0xFFF9789F),
    'work': Color(0xFF3DD9C0),
    'content': Color(0xFF7CC4FF),
    'finance': Color(0xFF5BE0A0),
    'fitness': Color(0xFFFF7A6B),
    'creative': Color(0xFFFFB088),
    'travel': Color(0xFF56D4E8),
    'custom': Color(0xFFC4F14B),
  };

  /// Darkened for a near-white ground; the dark-mode values wash out on paper.
  static const _lightCategories = <String, Color>{
    'general': Color(0xFF5F6B63),
    'comeback': Color(0xFFC2410C),
    'growth': Color(0xFF15803D),
    'health': Color(0xFFBE123C),
    'hobby': Color(0xFFB45309),
    'home': Color(0xFF0369A1),
    'learning': Color(0xFF3F4FBF),
    'mindset': Color(0xFF7E22CE),
    'social': Color(0xFFBE185D),
    'work': Color(0xFF0F766E),
    'content': Color(0xFF1D4ED8),
    'finance': Color(0xFF047857),
    'fitness': Color(0xFFB91C1C),
    'creative': Color(0xFFC2410C),
    'travel': Color(0xFF0E7490),
    'custom': Color(0xFF4F7A12),
  };

  /// Usage-category hues. Ordered by intent rather than by hue: the three
  /// "spent well" buckets are cool, the three "spent on you" buckets are warm,
  /// so the donut reads before any label is parsed.
  static const _darkUsage = <String, Color>{
    'productivity': Color(0xFF3DD9C0),
    'communication': Color(0xFF58B7FF),
    'learning': Color(0xFF8B9DF7),
    'health': Color(0xFF4ADE80),
    'finance': Color(0xFF5BE0A0),
    'creation': Color(0xFF56D4E8),
    'social': Color(0xFFF9789F),
    'entertainment': Color(0xFFFF7A6B),
    'games': Color(0xFFFB923C),
    'shopping': Color(0xFFFBBF24),
    'reading': Color(0xFFC29BF5),
    'utility': Color(0xFF9CA3A0),
    'other': Color(0xFF6B7280),
  };

  static const _lightUsage = <String, Color>{
    'productivity': Color(0xFF0F766E),
    'communication': Color(0xFF0369A1),
    'learning': Color(0xFF3F4FBF),
    'health': Color(0xFF15803D),
    'finance': Color(0xFF047857),
    'creation': Color(0xFF0E7490),
    'social': Color(0xFFBE185D),
    'entertainment': Color(0xFFB91C1C),
    'games': Color(0xFFC2410C),
    'shopping': Color(0xFFB45309),
    'reading': Color(0xFF7E22CE),
    'utility': Color(0xFF5F6B63),
    'other': Color(0xFF4B5563),
  };

  /// Category hue by name, falling back to [accent] for user-typed customs.
  Color category(String? name) =>
      categories[(name ?? '').trim().toLowerCase()] ?? accent;

  /// Usage-category hue by id, falling back to the neutral "other" bucket.
  Color usageColor(String id) => usage[id] ?? usage['other'] ?? textMuted;

  /// Google's brand-mark colours, for the painted "G" on the sign-in button.
  ///
  /// Brand-fixed and identical in both themes, which is why they are statics
  /// rather than per-theme fields — and this file is the one sanctioned home
  /// for raw colour literals, so the painter reads them from here rather than
  /// tripping the theme-guard test.
  static const googleBlue = Color(0xFF4285F4);
  static const googleRed = Color(0xFFEA4335);
  static const googleYellow = Color(0xFFFBBC05);
  static const googleGreen = Color(0xFF34A853);

  /// LinkedIn's brand blue — the same brand-statics exception the Google
  /// button colours use: real marks render in their own colours.
  static const linkedInBlue = Color(0xFF0A66C2);

  /// Google Drive's three faces, for the mark drawn in `ui/drive_mark.dart`.
  /// Same exception again: a Drive logo tinted to our palette is not the Drive
  /// logo, and users identify this feature by the colours.
  static const driveGreen = Color(0xFF00AC47);
  static const driveYellow = Color(0xFFFFBA00);
  static const driveBlue = Color(0xFF2684FC);

  /// A legible foreground for an arbitrary fill.
  ///
  /// The heat ramp runs from near-white pale greens to deep forest greens, so
  /// no single text colour survives every cell — a white numeral vanished on
  /// the palest fill, which is exactly how the calendar shipped. Decided by
  /// the fill's own luminance rather than by which bucket it came from, so a
  /// future palette change cannot silently break legibility again.
  Color onFill(Color fill) => fill.computeLuminance() > 0.35
      ? const Color(0xFF10140E)
      : const Color(0xFFF7F8F3);

  @override
  AuraTokens copyWith({
    Color? bg,
    Color? bgSunken,
    Color? surface,
    Color? surfaceAlt,
    Color? surfaceHigh,
    Color? textPrimary,
    Color? textSecondary,
    Color? textMuted,
    Color? border,
    Color? borderStrong,
    Color? accent,
    Color? accentAlt,
    Color? accentMuted,
    Color? secondary,
    Color? success,
    Color? warn,
    Color? danger,
    List<Color>? heat,
    Color? onAccent,
    Color? shadow,
    Map<String, Color>? categories,
    Map<String, Color>? usage,
  }) {
    return AuraTokens(
      bg: bg ?? this.bg,
      bgSunken: bgSunken ?? this.bgSunken,
      surface: surface ?? this.surface,
      surfaceAlt: surfaceAlt ?? this.surfaceAlt,
      surfaceHigh: surfaceHigh ?? this.surfaceHigh,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textMuted: textMuted ?? this.textMuted,
      border: border ?? this.border,
      borderStrong: borderStrong ?? this.borderStrong,
      accent: accent ?? this.accent,
      accentAlt: accentAlt ?? this.accentAlt,
      accentMuted: accentMuted ?? this.accentMuted,
      secondary: secondary ?? this.secondary,
      success: success ?? this.success,
      warn: warn ?? this.warn,
      danger: danger ?? this.danger,
      heat: heat ?? this.heat,
      onAccent: onAccent ?? this.onAccent,
      shadow: shadow ?? this.shadow,
      categories: categories ?? this.categories,
      usage: usage ?? this.usage,
    );
  }

  @override
  AuraTokens lerp(ThemeExtension<AuraTokens>? other, double t) {
    if (other is! AuraTokens) return this;
    Map<String, Color> lerpMap(Map<String, Color> a, Map<String, Color> b) => {
          for (final e in a.entries)
            e.key: Color.lerp(e.value, b[e.key] ?? e.value, t)!,
        };

    return AuraTokens(
      bg: Color.lerp(bg, other.bg, t)!,
      bgSunken: Color.lerp(bgSunken, other.bgSunken, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceAlt: Color.lerp(surfaceAlt, other.surfaceAlt, t)!,
      surfaceHigh: Color.lerp(surfaceHigh, other.surfaceHigh, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      border: Color.lerp(border, other.border, t)!,
      borderStrong: Color.lerp(borderStrong, other.borderStrong, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      accentAlt: Color.lerp(accentAlt, other.accentAlt, t)!,
      accentMuted: Color.lerp(accentMuted, other.accentMuted, t)!,
      secondary: Color.lerp(secondary, other.secondary, t)!,
      success: Color.lerp(success, other.success, t)!,
      warn: Color.lerp(warn, other.warn, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      heat: [
        for (var i = 0; i < heat.length; i++)
          Color.lerp(heat[i], other.heat[i], t)!,
      ],
      onAccent: Color.lerp(onAccent, other.onAccent, t)!,
      shadow: Color.lerp(shadow, other.shadow, t)!,
      categories: lerpMap(categories, other.categories),
      usage: lerpMap(usage, other.usage),
    );
  }
}

/// Spacing scale.
abstract final class Space {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 14.0;
  static const lg = 20.0;
  static const xl = 28.0;
  static const xxl = 44.0;
}

/// Corner radii.
///
/// Deliberately rounder than Monolith's 12px cap. Soft corners at this scale
/// read as modern software; the previous cap was chosen to look "considered"
/// and landed on "stationery".
abstract final class Radii {
  static const sm = 10.0;
  static const md = 16.0;
  static const lg = 22.0;
  static const xl = 30.0;
  static const pill = 999.0;
}

/// Component dimensions.
abstract final class Dimens {
  /// Retained for the few places a true hairline is still right — table rules
  /// inside a card, and the divider between two rows of the same object.
  static const hairline = 0.5;

  /// A card's lifted border.
  static const border = 1.0;

  /// Filled progress bars. Aura uses a real bar, not a 1px rule.
  static const bar = 8.0;

  static const iconSm = 16.0;
  static const iconMd = 20.0;
  static const iconLg = 24.0;

  /// Minimum interactive height. Below 48 fails accessibility guidance.
  static const touchTarget = 48.0;

  static const controlHeight = 54.0;

  /// The floating nav bar, and the gap it leaves under itself.
  static const navHeight = 66.0;
  static const navInset = 12.0;

  /// Bottom padding for a scroll view sitting under the floating nav.
  static const scrollBottomInset = navHeight + navInset + Space.xl;

  /// The completion ring on a habit row.
  static const checkRing = 24.0;

  /// Heatmap cell and its gap.
  static const heatCell = 11.0;
  static const heatGap = 3.0;
}

/// Opacity steps used for tinting.
abstract final class Alphas {
  /// Fill behind an active accent element.
  static const tint = 0.14;

  /// A more present tint — selected chips, status pills.
  static const tintStrong = 0.22;

  /// Ink splash on a row.
  static const splash = 0.07;

  /// Ink highlight on a row.
  static const highlight = 0.04;

  /// Border of a tinted container.
  static const subtleBorder = 0.30;

  /// A chart series behind its own line.
  static const chartFill = 0.18;
}

/// Motion. Short and eased — no bounce, no overshoot.
abstract final class Motion {
  static const fast = Duration(milliseconds: 120);
  static const base = Duration(milliseconds: 200);
  static const slow = Duration(milliseconds: 320);
  static const curve = Curves.easeOutCubic;

  /// For anything that grows into place — rings, bars, the nav pill.
  static const emphasised = Curves.easeOutQuart;
}

/// The brand gradient, and the tinted washes derived from it.
///
/// Centralised so "the gradient" is one definition. A gradient re-typed at each
/// call site is a gradient that drifts by a few degrees on every screen.
abstract final class Grad {
  /// Violet → warm violet. Identity. Hero ring, primary button, active nav pill.
  static LinearGradient brand(AuraTokens t) => LinearGradient(
        colors: [t.accent, t.accentAlt],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );

  /// The same sweep, for a ring's arc.
  static SweepGradient brandSweep(AuraTokens t) => SweepGradient(
        colors: [t.accent, t.accentAlt, t.accent],
        startAngle: 0,
        endAngle: 3.14159 * 2,
      );

  /// Pale green → deep green, for a score ring.
  ///
  /// The arc gets *denser* as it fills, so the ring carries the same meaning as
  /// the consistency grid: more colour is more done. A single flat lime arc
  /// looked identical at 20% and at 90% until you read the number.
  static SweepGradient scoreSweep(AuraTokens t) => SweepGradient(
        colors: [t.heat[1], t.heat[2], t.heat[3], t.heat.last],
        stops: const [0, 0.35, 0.7, 1],
        startAngle: 0,
        endAngle: 3.14159 * 2,
      );

  /// Teal → cyan-ish. Measured things.
  static LinearGradient data(AuraTokens t) => LinearGradient(
        colors: [t.secondary, t.accent],
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
      );

  /// A barely-there wash for a hero card, so it is not a flat rectangle.
  ///
  /// **Opaque**, blended onto [AuraTokens.surface] rather than painted as a
  /// translucent layer. A see-through wash sat directly on the page ground —
  /// invisible as a flaw on the near-black theme, but in light mode every hero
  /// card became a grey-green smear that read as a rendering bug ("blurred
  /// cards"). Blending first means the card is a solid surface with a tinted
  /// finish, and its shadow falls from a real edge in both themes.
  static LinearGradient surfaceWash(AuraTokens t) => LinearGradient(
        colors: [
          Color.alphaBlend(t.accent.withValues(alpha: 0.10), t.surface),
          Color.alphaBlend(t.accentAlt.withValues(alpha: 0.03), t.surface),
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
}

/// Elevation. The single biggest departure from Monolith, which had none.
abstract final class Shadows {
  /// A resting card.
  static List<BoxShadow> card(AuraTokens t) => [
        BoxShadow(
          color: t.shadow.withValues(alpha: 0.20),
          blurRadius: 20,
          offset: const Offset(0, 6),
          spreadRadius: -6,
        ),
      ];

  /// The floating nav bar and sheets — lifted clear of the content.
  static List<BoxShadow> lifted(AuraTokens t) => [
        BoxShadow(
          color: t.shadow.withValues(alpha: 0.30),
          blurRadius: 32,
          offset: const Offset(0, 12),
          spreadRadius: -8,
        ),
      ];

  /// A coloured glow under an accented element. Used sparingly — the hero
  /// ring, the primary button, the active nav pill.
  static List<BoxShadow> glow(Color c) => [
        BoxShadow(
          color: c.withValues(alpha: 0.35),
          blurRadius: 24,
          offset: const Offset(0, 8),
          spreadRadius: -8,
        ),
      ];

  /// The restrained version, for a full-width tinted status card.
  ///
  /// A danger-tinted block at full [glow] strength puts a red halo across the
  /// whole screen width, which reads as an alarm rather than as a card that
  /// happens to be about something late.
  static List<BoxShadow> tintedCard(Color c) => [
        BoxShadow(
          color: c.withValues(alpha: 0.14),
          blurRadius: 18,
          offset: const Offset(0, 5),
          spreadRadius: -10,
        ),
      ];
}

extension AuraContext on BuildContext {
  AuraTokens get aura => Theme.of(this).extension<AuraTokens>()!;
}
