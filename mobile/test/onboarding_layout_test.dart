import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/features/onboarding/onboarding_screen.dart';
import 'package:stayhardy/src/theme/aura_theme.dart';

/// Onboarding is the one screen every new user sees, and it is built from
/// hand-laid-out illustrations — exactly the kind of thing that silently starts
/// painting the yellow-and-black overflow stripe on a narrow phone. These pump
/// each slide at small and large widths and fail on any layout exception.
///
/// Golden images were tried first and rejected: fonts do not load in the test
/// environment, so they compared tofu boxes and would break on any unrelated
/// Flutter upgrade. Asserting "nothing overflowed" is the part that matters.
void main() {
  Future<void> pumpAt(WidgetTester tester, Size size) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AuraTheme.dark(),
          home: const OnboardingScreen(),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 1200));
  }

  Future<void> swipe(WidgetTester tester) async {
    await tester.fling(find.byType(PageView), const Offset(-400, 0), 1200);
    await tester.pumpAndSettle(const Duration(milliseconds: 50));
  }

  // 1080x2400 is a common mid-range Android; 900x1800 is the narrow end
  // (360dp logical), which is where the legend row overflowed.
  for (final size in const [Size(1080, 2400), Size(900, 1800)]) {
    testWidgets('every slide lays out cleanly at ${size.width.toInt()}px',
        (tester) async {
      await pumpAt(tester, size);
      expect(tester.takeException(), isNull, reason: 'slide 1 overflowed');

      await swipe(tester);
      expect(tester.takeException(), isNull, reason: 'slide 2 overflowed');

      await swipe(tester);
      expect(tester.takeException(), isNull, reason: 'slide 3 overflowed');
    });
  }
}
