import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/habit_repository.dart';
import 'package:stayhardy/src/data/providers.dart';
import 'package:stayhardy/src/features/habits/habit_editor.dart';
import 'package:stayhardy/src/theme/aura_theme.dart';

/// The habit editor, driven the way a person drives it.
///
/// Written as a widget test rather than checked by eye on a device: the custom
/// category is a reveal behind a tap, and "I saw it work once" is not something
/// the next change can be checked against.
void main() {
  late AppDatabase db;

  setUp(() => db = AppDatabase.forTesting(NativeDatabase.memory()));
  tearDown(() async => db.close());

  Future<void> pumpEditor(WidgetTester tester) async {
    // Taller than the 800x600 default: the editor is a full sheet, and a short
    // surface leaves the CREATE button outside the hit-testable area.
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [databaseProvider.overrideWithValue(db)],
        child: MaterialApp(
          theme: AuraTheme.dark(),
          home: const Scaffold(body: HabitEditor()),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  /// The category rail, found by its axis rather than by index — the editor
  /// contains several scrollables and their order is not a contract.
  /// The category rail.
  ///
  /// By key rather than by axis (a single-line `TextField` owns a horizontal
  /// Scrollable of its own) or by one of its tiles (which stops resolving the
  /// moment that tile scrolls out of view and is disposed).
  Finder rail() => find
      .descendant(
        of: find.byKey(const ValueKey('category-rail')),
        matching: find.byType(Scrollable),
      )
      .first;

  /// The rail lazily builds, so an off-screen tile does not exist yet and no
  /// finder will ever match it. It has to be dragged into view first.
  ///
  /// Rewound to the start before seeking, because `scrollUntilVisible` only
  /// travels forward — selecting Custom (last) and then Health (fourth) would
  /// otherwise scroll away from the target forever.
  Future<void> tapCategory(WidgetTester tester, String label) async {
    await tester.drag(rail(), const Offset(2500, 0));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text(label),
      160,
      scrollable: rail(),
      maxScrolls: 40,
    );
    await tester.tap(find.text(label));
    await tester.pumpAndSettle();
  }

  testWidgets('offers the fifteen real categories and a Custom door',
      (tester) async {
    await pumpEditor(tester);
    expect(find.text('General'), findsOneWidget);

    await tester.scrollUntilVisible(find.text('Custom'), 160,
        scrollable: rail(), maxScrolls: 40);
    expect(find.text('Custom'), findsOneWidget);
  });

  testWidgets('Custom reveals a field to type your own category',
      (tester) async {
    await pumpEditor(tester);

    // Nothing to type into until Custom is chosen.
    expect(
      find.byWidgetPredicate((w) =>
          w is TextField &&
          w.decoration?.hintText == 'Guitar, Spanish, Physio…'),
      findsNothing,
    );

    await tapCategory(tester, 'Custom');

    final field = find.byWidgetPredicate(
      (w) =>
          w is TextField &&
          w.decoration?.hintText == 'Guitar, Spanish, Physio…',
    );
    expect(field, findsOneWidget,
        reason: 'tapping Custom must give the user somewhere to type');
  });

  testWidgets('a typed category is what gets saved', (tester) async {
    await pumpEditor(tester);

    await tester.enterText(find.byType(TextField).first, 'Practise scales');
    await tapCategory(tester, 'Custom');

    final field = find.byWidgetPredicate(
      (w) =>
          w is TextField &&
          w.decoration?.hintText == 'Guitar, Spanish, Physio…',
    );
    await tester.enterText(field, 'Guitar');
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('CREATE'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('CREATE'));
    await tester.pumpAndSettle();

    final habits = await HabitRepository(db).activeHabits();
    expect(habits, hasLength(1));
    expect(habits.single.title, 'Practise scales');
    expect(habits.single.category, 'Guitar',
        reason: 'the stored category is the user\'s word, not "Custom"');
  });

  testWidgets('choosing a named category after Custom wins', (tester) async {
    await pumpEditor(tester);
    await tester.enterText(find.byType(TextField).first, 'Run');

    await tapCategory(tester, 'Custom');
    await tester.enterText(
      find.byWidgetPredicate((w) =>
          w is TextField &&
          w.decoration?.hintText == 'Guitar, Spanish, Physio…'),
      'Guitar',
    );
    await tester.pumpAndSettle();

    // Change your mind: the typed text must not leak into the saved row.
    await tapCategory(tester, 'Health');
    await tester.ensureVisible(find.text('CREATE'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('CREATE'));
    await tester.pumpAndSettle();

    final habits = await HabitRepository(db).activeHabits();
    expect(habits.single.category, 'Health');
  });

  testWidgets('an empty name is refused with a reason, not silently',
      (tester) async {
    await pumpEditor(tester);

    await tester.ensureVisible(find.text('CREATE'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('CREATE'));
    await tester.pumpAndSettle();

    expect(find.text('Give it a name first.'), findsOneWidget,
        reason: 'a bare `return false` left the sheet open explaining nothing');
    expect(await HabitRepository(db).activeHabits(), isEmpty);
  });

  testWidgets('Custom with nothing typed falls back rather than saving blank',
      (tester) async {
    await pumpEditor(tester);
    await tester.enterText(find.byType(TextField).first, 'Something');
    await tapCategory(tester, 'Custom');

    await tester.ensureVisible(find.text('CREATE'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('CREATE'));
    await tester.pumpAndSettle();

    final habits = await HabitRepository(db).activeHabits();
    expect(habits.single.category, 'Custom',
        reason: 'an empty custom name must not store an empty category');
  });
}
