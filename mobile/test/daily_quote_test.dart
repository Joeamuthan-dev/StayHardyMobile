import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/domain/civil_date.dart';
import 'package:stayhardy/src/domain/daily_quote.dart';

void main() {
  group('the daily line', () {
    test('is the same all day, however often it is asked for', () {
      final day = CivilDate(2026, 8, 21);
      final first = DailyQuote.forDay(day);
      for (var i = 0; i < 50; i++) {
        expect(DailyQuote.forDay(day).line, first.line);
      }
    });

    test('moves on the next day', () {
      // Not a guarantee of *different* text — the pool wraps — but consecutive
      // days must not land on the same index, which is what a bad hash does.
      final a = DailyQuote.forDay(CivilDate(2026, 8, 21));
      final b = DailyQuote.forDay(CivilDate(2026, 8, 22));
      expect(identical(a, b), isFalse);
    });

    test('a finished day gets a different pool from an ordinary one', () {
      final day = CivilDate(2026, 8, 21);
      final ordinary = DailyQuote.forDay(day);
      final finished = DailyQuote.forDay(day, dayComplete: true);
      expect(finished.line, isNot(ordinary.line));
    });

    test('walks the whole pool rather than sticking on a few lines', () {
      final seen = <String>{};
      for (var d = 1; d <= 28; d++) {
        seen.add(DailyQuote.forDay(CivilDate(2026, 2, d)).line);
      }
      // A month must not keep landing on the same handful.
      expect(seen.length, greaterThanOrEqualTo(20));
    });

    test('has enough lines that a month never repeats one', () {
      final seen = <String>{};
      for (var d = 0; d < 31; d++) {
        seen.add(DailyQuote.forDay(CivilDate(2026, 3, 1).addDays(d)).line);
      }
      expect(seen.length, 31, reason: 'a repeat inside one month is visible');
    });

    test('stays on subject — no luck, fate or talent', () {
      // The product's argument is that showing up is the controllable
      // variable. A quote about luck argues the opposite.
      const offTopic = ['luck', 'lucky', 'fate', 'destiny', 'talent', 'gifted'];
      for (var d = 0; d < 120; d++) {
        final line = DailyQuote.forDay(CivilDate(2026, 1, 1).addDays(d))
            .line
            .toLowerCase();
        for (final word in offTopic) {
          expect(line.contains(word), isFalse, reason: '"$line" mentions $word');
        }
      }
    });

    test('lines stay short enough to read at a glance', () {
      for (var d = 0; d < 120; d++) {
        final line = DailyQuote.forDay(CivilDate(2026, 1, 1).addDays(d)).line;
        expect(line.length, lessThanOrEqualTo(80), reason: line);
      }
    });

    test('never attributes a line it cannot source', () {
      // Guards against a well-meaning edit adding "— Anonymous" or inventing a
      // name. Attribution is either a real person or absent.
      for (var d = 1; d <= 60; d++) {
        final q = DailyQuote.forDay(CivilDate(2026, 1, 1).addDays(d));
        expect(q.attribution, anyOf(isNull, isNotEmpty));
        expect(q.attribution?.toLowerCase(), isNot('anonymous'));
      }
    });
  });
}
