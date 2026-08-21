import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/domain/app_categories.dart';
import 'package:stayhardy/src/theme/aura_tokens.dart';

/// Enforces that the theme is the single source of truth for colour and type.
///
/// The point of this test is that swapping [AuraTokens.dark] /
/// [AuraTokens.light] — or handing the app an entirely different palette —
/// must repaint every screen. One `Color(0xFF...)` or `fontFamily: 'Inter'`
/// buried in a feature file silently survives that swap, and the app ends up
/// half-themed in a way nobody notices until it ships.
///
/// If this test fails: move the value into [AuraTokens] (or the type scale)
/// and read it through `context.aura` / `Theme.of(context).textTheme`.
void main() {
  /// Files allowed to name raw colours and font families: the theme itself.
  const themeFiles = {
    'lib/src/theme/aura_tokens.dart',
    'lib/src/theme/aura_typography.dart',
    'lib/src/theme/aura_theme.dart',
  };

  // `Colors.transparent` has no themed equivalent and carries no brand meaning.
  final allowedColorLiterals = RegExp(r'Colors\.transparent');

  final rawColor = RegExp(r'Color\(0x[0-9a-fA-F]{6,8}\)|Colors\.[a-zA-Z]+');
  final rawFont = RegExp(r"fontFamily\s*:\s*'");

  List<File> dartFilesUnder(String dir) {
    final root = Directory(dir);
    if (!root.existsSync()) return const [];
    return root
        .listSync(recursive: true)
        .whereType<File>()
        .where((f) => f.path.endsWith('.dart'))
        .where((f) => !f.path.endsWith('.g.dart'))
        .toList();
  }

  test('no screen hardcodes a colour', () {
    final offenders = <String>[];

    for (final file in dartFilesUnder('lib')) {
      final rel = file.path.replaceFirst(RegExp(r'^.*/mobile/'), '');
      if (themeFiles.contains(rel)) continue;

      final lines = file.readAsLinesSync();
      for (var i = 0; i < lines.length; i++) {
        final line = lines[i];
        if (line.trimLeft().startsWith('//')) continue;
        final withoutAllowed = line.replaceAll(allowedColorLiterals, '');
        if (rawColor.hasMatch(withoutAllowed)) {
          offenders.add('$rel:${i + 1}  ${line.trim()}');
        }
      }
    }

    expect(
      offenders,
      isEmpty,
      reason: 'Hardcoded colours break theme swapping. Move these into '
          'AuraTokens and read them via context.aura:\n'
          '${offenders.join('\n')}',
    );
  });

  test('no screen hardcodes a font family', () {
    final offenders = <String>[];

    for (final file in dartFilesUnder('lib')) {
      final rel = file.path.replaceFirst(RegExp(r'^.*/mobile/'), '');
      if (themeFiles.contains(rel)) continue;

      final lines = file.readAsLinesSync();
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].trimLeft().startsWith('//')) continue;
        if (rawFont.hasMatch(lines[i])) {
          offenders.add('$rel:${i + 1}  ${lines[i].trim()}');
        }
      }
    }

    expect(
      offenders,
      isEmpty,
      reason: 'Font families belong in AuraType:\n${offenders.join('\n')}',
    );
  });

  test('light and dark define exactly the same token set', () {
    // A token present in one theme and missing in the other is a crash waiting
    // for whichever mode the developer was not testing in.
    expect(
      AuraTokens.light.categories.keys.toSet(),
      AuraTokens.dark.categories.keys.toSet(),
    );
    expect(AuraTokens.light.heat.length, AuraTokens.dark.heat.length);
    expect(AuraTokens.dark.categories.length, 16);

    // The usage palette is keyed by UsageCategory.id and read through
    // `usageColor`. A missing key there renders a donut slice in the fallback
    // grey, which looks like a bug rather than like a category.
    expect(
      AuraTokens.light.usage.keys.toSet(),
      AuraTokens.dark.usage.keys.toSet(),
    );
  });

  test('every usage category has a hue in both themes', () {
    for (final tokens in [AuraTokens.dark, AuraTokens.light]) {
      for (final category in UsageCategory.all) {
        expect(
          tokens.usage[category.id],
          isNotNull,
          reason: '${category.id} has no colour — add it to AuraTokens.usage',
        );
      }
    }
  });

  test('the display face is not a serif', () {
    // Fraunces at display size is what made the app read as a printed journal.
    // It is unbundled; this fails the build if anything reintroduces it.
    final pubspec = File('pubspec.yaml').readAsStringSync();
    final bundled = pubspec.split('fonts:').last;
    expect(
      bundled.contains('Fraunces.ttf'),
      isFalse,
      reason: 'Fraunces is deliberately not bundled — see aura_typography.dart',
    );
  });

  test('every category name resolves to a hue in both themes', () {
    for (final tokens in [AuraTokens.dark, AuraTokens.light]) {
      for (final name in tokens.categories.keys) {
        expect(tokens.category(name), isNotNull);
      }
      // Unknown / user-typed customs fall back to the accent rather than
      // throwing or rendering transparent.
      expect(tokens.category('not-a-real-category'), tokens.accent);
      expect(tokens.category(null), tokens.accent);
    }
  });
}
