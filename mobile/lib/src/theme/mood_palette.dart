import 'package:flutter/widgets.dart';

import '../domain/mood_rules.dart';
import 'aura_tokens.dart';

/// The mood scale's colours.
///
/// Lives in the theme layer, beside [HabitCategories], because it maps a domain
/// value onto a hue and must repaint when the theme swaps. `MoodLevel` itself
/// stays pure — the domain never imports Flutter.
///
/// Defined once and read by the check-in screen, the Home card and the Stats
/// chart. Two of those previously carried their own copy, which is exactly how
/// one mood ends up two colours on two screens.
extension MoodPalette on AuraTokens {
  Color mood(MoodLevel level) => switch (level) {
        MoodLevel.terrible => danger,
        MoodLevel.low => warn,
        // Deliberately not `textMuted`. A muted *text* colour is a grey, and a
        // grey orb in light mode renders as a near-black ball — which is what
        // the first pass shipped. The midpoint is a real hue: the halfway
        // blend between the low and good ends of the scale.
        MoodLevel.okay => Color.lerp(warn, accent, 0.5)!,
        MoodLevel.good => accent,
        MoodLevel.excellent => success,
      };

  /// A foreground that reads on top of [mood].
  ///
  /// Every mood colour sits at roughly accent lightness *for its own theme* —
  /// light hues on the dark ground, dark hues on the light one — so the accent's
  /// own foreground is the right answer for all five in both themes.
  Color get onMood => onAccent;
}
