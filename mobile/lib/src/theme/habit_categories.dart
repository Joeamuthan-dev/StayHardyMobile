import 'package:flutter/material.dart';

import 'aura_tokens.dart';

/// Habit categories: names and icons only.
///
/// The 16 names are preserved exactly from the Capacitor build so migrated rows
/// map without translation.
///
/// **Colours deliberately do not live here.** They are theme tokens
/// ([AuraTokens.categories]) and are resolved per-context via
/// [colorOf]. Two reasons:
///
/// 1. Changing the theme must repaint the entire app, including category hues.
///    A `const Color` in this file would survive a theme swap and quietly break
///    the palette.
/// 2. Light and dark need different values — the dark-mode hues wash out on a
///    near-white ground.
///
/// Colour is also resolved at *render* time from the category name, never read
/// back from the stored row. The legacy schema denormalized `color` and `icon`
/// onto each routine at insert time, which meant a palette change never reached
/// habits that already existed.
@immutable
class HabitCategory {
  const HabitCategory(this.name, this.icon, {this.emoji});

  final String name;
  final IconData icon;

  /// A user-chosen emoji, carried by custom categories ("\u{1F3B8} Guitar").
  /// When present it IS the icon — an emoji someone picked beats any glyph we
  /// could guess.
  final String? emoji;

  /// This category's hue in the active theme.
  Color colorOf(BuildContext context) => context.aura.category(name);

  /// The category's mark: their emoji if they chose one, our icon otherwise.
  /// One call site per screen instead of every screen re-deciding.
  Widget glyph({required double size, required Color color}) => emoji == null
      ? Icon(icon, size: size, color: color)
      : Text(emoji!,
          style: TextStyle(fontSize: size * 0.86, height: 1),
          textAlign: TextAlign.center);
}

abstract final class HabitCategories {
  static const general = HabitCategory('General', Icons.all_inclusive_rounded);
  static const comeback = HabitCategory('Comeback', Icons.restart_alt_rounded);
  static const growth = HabitCategory('Growth', Icons.trending_up_rounded);
  static const health = HabitCategory('Health', Icons.favorite_rounded);
  static const hobby = HabitCategory('Hobby', Icons.extension_rounded);
  static const home = HabitCategory('Home', Icons.home_rounded);
  static const learning = HabitCategory('Learning', Icons.menu_book_rounded);
  static const mindset =
      HabitCategory('Mindset', Icons.self_improvement_rounded);
  static const social = HabitCategory('Social', Icons.groups_rounded);
  static const work = HabitCategory('Work', Icons.work_rounded);
  // Was a pencil - which read as edit, not content, and clashed with the
  // actual edit affordance two inches away.
  static const content = HabitCategory('Content', Icons.smart_display_rounded);
  static const finance = HabitCategory('Finance', Icons.savings_rounded);
  static const fitness = HabitCategory('Fitness', Icons.fitness_center_rounded);
  static const creative = HabitCategory('Creative', Icons.palette_rounded);
  static const travel = HabitCategory('Travel', Icons.flight_takeoff_rounded);
  static const custom = HabitCategory('Custom', Icons.auto_awesome_rounded);

  static const all = <HabitCategory>[
    general, comeback, growth, health, hobby, home, learning, mindset,
    social, work, content, finance, fitness, creative, travel, custom,
  ];

  static final _byName = {for (final c in all) c.name.toLowerCase(): c};

  /// The fifteen named categories, without the [custom] placeholder.
  ///
  /// [custom] is not a category, it is the *door* to one — an editor offering it
  /// as a sixteenth choice alongside real ones is offering a habit filed under
  /// the literal word "Custom".
  static final named = all.where((c) => c != custom).toList(growable: false);

  /// Whether [name] is one of the fifteen, as opposed to the user's own words.
  static bool isNamed(String? name) =>
      name != null && _byName.containsKey(name.trim().toLowerCase());

  /// Resolve a stored category name.
  ///
  /// Falls back to [general] rather than throwing: `routines.category` was added
  /// in a later migration, so older rows have it null or empty.
  ///
  /// Anything else is the user's own words, typed under "Custom" — the legacy
  /// app allowed this and rows in the wild carry it. It keeps **their** label
  /// and borrows Custom's icon, rather than being flattened to the word
  /// "Custom": a habit filed under "Guitar" should say Guitar everywhere, which
  /// is the whole point of typing it.
  ///
  /// Its colour resolves through [AuraTokens.category], which falls back to the
  /// accent for any unrecognised name — so custom categories are lime, and
  /// stay lime through a theme swap.
  static HabitCategory resolve(String? name) {
    if (name == null || name.trim().isEmpty) return general;
    final trimmed = name.trim();
    final known = _byName[trimmed.toLowerCase()];
    if (known != null) return known;

    // A custom label may lead with the user's emoji ("\u{1F3B8} Guitar").
    // The whole string stays the stored name - old-app compatible - but the
    // emoji renders as the mark.
    final first = trimmed.characters.first;
    if (_looksLikeEmoji(first)) {
      return HabitCategory(trimmed, custom.icon, emoji: first);
    }
    return HabitCategory(trimmed, custom.icon);
  }

  /// Good enough for "did they lead with an emoji": anything far outside the
  /// basic scripts. False negatives just fall back to the icon.
  static bool _looksLikeEmoji(String grapheme) {
    if (grapheme.isEmpty) return false;
    final code = grapheme.runes.first;
    return code >= 0x1F000 || (code >= 0x2600 && code <= 0x27BF);
  }
}
