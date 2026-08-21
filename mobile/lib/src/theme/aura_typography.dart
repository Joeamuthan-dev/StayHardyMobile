import 'package:flutter/material.dart';

/// Aura type scale.
///
/// **One family: Inter.** Monolith paired Inter with Fraunces, a high-contrast
/// serif, and used it for every heading and hero number. A serif at display
/// size is what made the app read as a printed journal — the single strongest
/// signal of the "notebook" feel, ahead even of the brass palette.
///
/// Inter is a variable font shipped as one file covering 100–900, so every
/// style sets `fontVariations` explicitly. `fontWeight` alone does not reliably
/// select an instance from a variable file — it is still set alongside so that
/// font fallback (and any future static build) behaves sensibly.
///
/// The hierarchy now comes from weight and tracking rather than from a second
/// family: display text is heavy and tightly tracked, body text is regular and
/// neutral, eyebrows are small and widely tracked.
abstract final class AuraType {
  /// Kept as a separate constant from [body] so a future display face can be
  /// swapped in at one place. Today they are the same family by design.
  static const display = 'Inter';
  static const body = 'Inter';

  /// Numerals must not shift width as they animate or count up.
  static const _tabular = [FontFeature.tabularFigures()];

  /// Inter axes: wght 100–900, opsz 14–32.
  static List<FontVariation> _axes(double weight, double size) => [
        FontVariation('wght', weight),
        FontVariation('opsz', size.clamp(14.0, 32.0)),
      ];

  static TextStyle _style({
    required double size,
    required double weight,
    required Color color,
    double height = 1.4,
    double letterSpacing = 0,
    bool tabular = false,
  }) {
    return TextStyle(
      fontFamily: body,
      fontSize: size,
      fontWeight: FontWeight.values[(weight ~/ 100) - 1],
      fontVariations: _axes(weight, size),
      height: height,
      letterSpacing: letterSpacing,
      color: color,
      fontFeatures: tabular ? _tabular : null,
    );
  }

  static TextTheme textTheme(Color primary, Color secondary) {
    return TextTheme(
      // Screen titles. Heavy and tight — the opposite of Monolith's light,
      // airy serif, and the reason the app now reads as an application.
      displayLarge: _style(
          size: 34, weight: 700, color: primary, height: 1.1, letterSpacing: -0.8),
      displayMedium: _style(
          size: 28, weight: 700, color: primary, height: 1.15, letterSpacing: -0.6),
      // Hero metrics — streak counts, percentages, scores.
      displaySmall: _style(
          size: 22,
          weight: 600,
          color: primary,
          height: 1.2,
          letterSpacing: -0.4,
          tabular: true),
      titleLarge: _style(
          size: 17, weight: 600, color: primary, height: 1.3, letterSpacing: -0.2),
      titleMedium: _style(
          size: 15, weight: 600, color: primary, height: 1.35, letterSpacing: -0.1),
      bodyLarge: _style(size: 15, weight: 450, color: primary, height: 1.45),
      bodyMedium: _style(size: 13.5, weight: 450, color: secondary, height: 1.45),
      bodySmall: _style(size: 12.5, weight: 450, color: secondary, height: 1.45),
      // Section eyebrows: small, letterspaced, uppercased at the call site.
      labelLarge: _style(
          size: 11.5, weight: 600, color: secondary, height: 1.2, letterSpacing: 0.8),
      labelMedium: _style(
          size: 10.5, weight: 600, color: secondary, height: 1.2, letterSpacing: 1.0),
    );
  }

  /// A numeral style at an arbitrary size, for metrics that scale with their
  /// container rather than snap to the scale above.
  ///
  /// Tracking tightens as the size grows — Inter set at its default spacing
  /// looks loose above about 40pt, which is exactly where hero numbers live.
  static TextStyle numeral(
    double size, {
    required Color color,
    double weight = 650,
  }) {
    return _style(
      size: size,
      weight: weight,
      color: color,
      height: 1.0,
      letterSpacing: size >= 40 ? -1.8 : (size >= 24 ? -0.8 : -0.3),
      tabular: true,
    );
  }
}
