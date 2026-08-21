import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/domain/challenge_rules.dart';

void main() {
  group('CircleScoring.dayPoints', () {
    test('a finished day is one full point', () {
      expect(CircleScoring.dayPoints(done: 5, required: 5), 1.0);
    });

    test('80% done is 0.8 — the owner\'s worked example', () {
      expect(CircleScoring.dayPoints(done: 4, required: 5), closeTo(0.8, 1e-9));
    });

    test('overshooting the requirement cannot mint extra points', () {
      expect(CircleScoring.dayPoints(done: 9, required: 5), 1.0);
    });

    test('a rest day is worth nothing — resting must not out-score working', () {
      expect(CircleScoring.dayPoints(done: 0, required: 0), 0);
      expect(CircleScoring.dayPoints(done: 3, required: 0), 0);
    });

    group('the fairness floor and ceiling — owner\'s ruling', () {
      test('two easy habits cannot mint a full point', () {
        expect(CircleScoring.dayPoints(done: 2, required: 2),
            closeTo(2 / 3, 1e-9));
        expect(CircleScoring.dayPoints(done: 1, required: 1),
            closeTo(1 / 3, 1e-9));
      });

      test('three real habits done is an honest full day', () {
        expect(CircleScoring.dayPoints(done: 3, required: 3), 1.0);
      });

      test('a big list is not punished by its own ambition', () {
        // 2 of 10 scores against the cap of 7, not against 10.
        expect(CircleScoring.dayPoints(done: 2, required: 10),
            closeTo(2 / 7, 1e-9));
      });

      test('padding past seven earns nothing extra', () {
        expect(CircleScoring.dayPoints(done: 20, required: 20), 1.0);
        expect(CircleScoring.dayPoints(done: 10, required: 10), 1.0);
      });
    });
  });

  group('CircleScoring.formatPoints', () {
    test('whole numbers stay whole', () {
      expect(CircleScoring.formatPoints(12), '12');
      expect(CircleScoring.formatPoints(0), '0');
    });

    test('fractions show one decimal, no false precision', () {
      expect(CircleScoring.formatPoints(12.4), '12.4');
      expect(CircleScoring.formatPoints(0.8), '0.8');
      expect(CircleScoring.formatPoints(11.96), '12');
      expect(CircleScoring.formatPoints(7.8499999), '7.8');
    });
  });

  group('CircleTier.of', () {
    test('pace decides the tier, not the raw total', () {
      // 2.8 points on day 3 is winning; 2.8 on day 28 is not.
      expect(CircleTier.of(2.8, 3), CircleTier.unstoppable);
      expect(CircleTier.of(2.8, 28), CircleTier.warmingUp);
    });

    test('boundaries land on the generous side', () {
      expect(CircleTier.of(9, 10), CircleTier.unstoppable);
      expect(CircleTier.of(7, 10), CircleTier.consistent);
      expect(CircleTier.of(4, 10), CircleTier.building);
      expect(CircleTier.of(3.9, 10), CircleTier.warmingUp);
    });

    test('day zero clamps instead of dividing by nothing', () {
      expect(CircleTier.of(1, 0), CircleTier.unstoppable);
    });
  });
}
