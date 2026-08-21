import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/ui/drive_mark.dart';

/// The Drive mark is hand-drawn geometry, so "it compiles" proves nothing about
/// whether it looks like the Google Drive logo. This renders it so the shape
/// can be checked by eye, and pins it against silent regression afterwards.
void main() {
  testWidgets('the Drive mark renders', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          backgroundColor: Colors.white,
          body: Center(
            child: SizedBox(width: 128, height: 128, child: DriveMark()),
          ),
        ),
      ),
    );

    await expectLater(
      find.byType(DriveMark),
      matchesGoldenFile('goldens/drive_mark.png'),
    );
  });

  testWidgets('the muted Drive mark renders', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          backgroundColor: Colors.white,
          body: Center(
            child: SizedBox(
              width: 128,
              height: 128,
              child: DriveMark(muted: true),
            ),
          ),
        ),
      ),
    );

    await expectLater(
      find.byType(DriveMark),
      matchesGoldenFile('goldens/drive_mark_muted.png'),
    );
  });
}
