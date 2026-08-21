import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/domain/review_rules.dart';

void main() {
  group('streakAfterOpen', () {
    test('same-day reopens do not move the streak', () {
      expect(
        ReviewRules.streakAfterOpen(
          lastOpenIso: '2026-08-20',
          yesterdayIso: '2026-08-19',
          todayIso: '2026-08-20',
          streak: 2,
        ),
        2,
      );
    });

    test('consecutive days climb, a missed day resets to one', () {
      expect(
        ReviewRules.streakAfterOpen(
          lastOpenIso: '2026-08-19',
          yesterdayIso: '2026-08-19',
          todayIso: '2026-08-20',
          streak: 2,
        ),
        3,
      );
      expect(
        ReviewRules.streakAfterOpen(
          lastOpenIso: '2026-08-17',
          yesterdayIso: '2026-08-19',
          todayIso: '2026-08-20',
          streak: 6,
        ),
        1,
      );
    });

    test('first open ever starts at one', () {
      expect(
        ReviewRules.streakAfterOpen(
          lastOpenIso: null,
          yesterdayIso: '2026-08-19',
          todayIso: '2026-08-20',
          streak: 0,
        ),
        1,
      );
    });
  });

  group('shouldAskReview — the owner\'s politeness rules', () {
    const now = 1000000000000;

    test('never before three consecutive days', () {
      expect(
        ReviewRules.shouldAskReview(
            streak: 2, lastAskedMs: null, askCount: 0, nowMs: now),
        isFalse,
      );
      expect(
        ReviewRules.shouldAskReview(
            streak: 3, lastAskedMs: null, askCount: 0, nowMs: now),
        isTrue,
      );
    });

    test('at most monthly', () {
      final recent = now - const Duration(days: 20).inMilliseconds;
      final old = now - const Duration(days: 31).inMilliseconds;
      expect(
        ReviewRules.shouldAskReview(
            streak: 5, lastAskedMs: recent, askCount: 1, nowMs: now),
        isFalse,
      );
      expect(
        ReviewRules.shouldAskReview(
            streak: 5, lastAskedMs: old, askCount: 1, nowMs: now),
        isTrue,
      );
    });

    test('three lifetime asks, then silence forever', () {
      expect(
        ReviewRules.shouldAskReview(
            streak: 9, lastAskedMs: null, askCount: 3, nowMs: now),
        isFalse,
      );
    });
  });

  test('update checks are daily, not per-launch', () {
    const now = 1000000000000;
    expect(ReviewRules.shouldCheckUpdate(lastCheckMs: null, nowMs: now), isTrue);
    expect(
      ReviewRules.shouldCheckUpdate(
          lastCheckMs: now - const Duration(hours: 5).inMilliseconds,
          nowMs: now),
      isFalse,
    );
    expect(
      ReviewRules.shouldCheckUpdate(
          lastCheckMs: now - const Duration(hours: 25).inMilliseconds,
          nowMs: now),
      isTrue,
    );
  });
}
