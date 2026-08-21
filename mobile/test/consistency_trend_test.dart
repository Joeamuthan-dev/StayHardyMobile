import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/habit_repository.dart';
import 'package:stayhardy/src/domain/consistency_trend.dart';
import 'package:stayhardy/src/domain/civil_date.dart';

List<DayTally> days(List<(int scheduled, int completed)> spec) {
  var d = CivilDate(2026, 1, 1);
  return [
    for (final (s, c) in spec)
      DayTally(date: d = d.addDays(1), scheduled: s, completed: c),
  ];
}

List<(int, int)> days30() => List.generate(30, (_) => (2, 2));

void main() {
  group('the trend line', () {
    test('a rest day is absent, never a zero', () {
      // Nothing scheduled is not a failure. Plotting it as 0% would punish
      // someone for a day they did nothing wrong on.
      final t = ConsistencyTrend.from(days([(0, 0), (2, 2)]));
      expect(t.daily.first, isNull);
      expect(t.daily.last, 1.0);
    });

    test('smooths what the daily line spikes', () {
      // Alternating perfect and missed days: daily swings 0..1 every day,
      // the trend should sit near the middle and barely move.
      final t = ConsistencyTrend.from(
        days(List.generate(21, (i) => (2, i.isEven ? 2 : 0))),
      );
      final settled = t.trend.whereType<double>().toList();
      for (final v in settled) {
        expect(v, greaterThan(0.35));
        expect(v, lessThan(0.65));
      }
    });

    test('has no trend until a full window exists', () {
      final t = ConsistencyTrend.from(days(List.generate(10, (_) => (1, 1))));
      expect(t.trend.take(t.window - 1), everyElement(isNull));
      expect(t.trend[t.window - 1], isNotNull);
    });

    test('a window of only rest days averages nothing, not zero', () {
      final t = ConsistencyTrend.from(days(List.generate(10, (_) => (0, 0))));
      expect(t.trend, everyElement(isNull));
      expect(t.latestTrend, isNull);
    });

    test('hides itself until there is enough history to mean anything', () {
      final thin = ConsistencyTrend.from(days(List.generate(10, (_) => (1, 1))));
      expect(thin.hasEnoughData, isFalse);

      final enough =
          ConsistencyTrend.from(days(List.generate(14, (_) => (1, 1))));
      expect(enough.hasEnoughData, isTrue);
    });

    test('rest days do not count toward the history threshold', () {
      // 30 calendar days but only 3 with anything scheduled is not 30 days of
      // evidence, and the chart must not pretend otherwise.
      final mostlyRest = ConsistencyTrend.from(
        days(List.generate(30, (i) => i < 3 ? (1, 1) : (0, 0))),
      );
      expect(mostlyRest.observedDays, 3);
      expect(mostlyRest.hasEnoughData, isFalse);
    });

    test('reports improvement over the previous window', () {
      // Bad fortnight, then ten good days. The good run is deliberately
      // shorter than two windows: with 14 good days the comparison point is
      // already perfect and a zero delta is the correct answer, which is a
      // property of the metric rather than a bug.
      final t = ConsistencyTrend.from(days([
        ...List.generate(14, (_) => (2, 0)),
        ...List.generate(10, (_) => (2, 2)),
      ]));
      expect(t.change, isNotNull);
      expect(t.change!, greaterThan(0));
    });

    test('an unfinished today never drags the average down', () {
      // Twenty perfect days, then a today that is 1-of-9 done because it is
      // still 9am. The average must stay at 100% — the collapse has not
      // happened, and showing one every morning would be the cruellest
      // possible bug in a habit tracker.
      final t = ConsistencyTrend.from(days([
        ...List.generate(20, (_) => (3, 3)),
        (9, 1),
      ]));
      expect(t.latestTrend, 1.0);
      // ...but today is still drawn on the daily line, honestly.
      expect(t.daily.last, closeTo(1 / 9, 0.001));
    });

    test('a completed day can be included when the caller asks', () {
      final t = ConsistencyTrend.from(
        days([...List.generate(20, (_) => (3, 3)), (9, 1)]),
        excludeToday: false,
      );
      expect(t.latestTrend, lessThan(1.0));
    });

    test('a perfect run reads as a flat 100%', () {
      final t = ConsistencyTrend.from(days(List.generate(20, (_) => (3, 3))));
      expect(t.latestTrend, 1.0);
    });

    test('completion above scheduled cannot exceed 100%', () {
      // Extra check-ins on a lighter day must not produce a 150% point.
      final t = ConsistencyTrend.from(days([(1, 3)]));
      expect(t.daily.first, 1.0);
    });
  });

  group('the averaging window', () {
    test('scales with the range being viewed', () {
      // A 7-day mean drawn across a year is weekly wiggle, not a trend.
      expect(ConsistencyTrend.windowFor(30), 7);
      expect(ConsistencyTrend.windowFor(90), 14);
      expect(ConsistencyTrend.windowFor(365), 30);
    });

    test('always says out loud which average is on screen', () {
      final month = ConsistencyTrend.from(days(days30()), window: 7);
      final year = ConsistencyTrend.from(days(days30()), window: 30);
      expect(month.windowLabel, '7-day average');
      expect(year.windowLabel, '30-day average');
      expect(month.windowLabel, isNot(year.windowLabel));
    });

    test('a wider window smooths harder', () {
      // Same days, two zooms: the wider one must swing less.
      final spec = [
        for (var i = 0; i < 80; i++) (2, i % 2 == 0 ? 2 : 0),
      ];
      double spread(ConsistencyTrend t) {
        final v = t.trend.whereType<double>().toList();
        return v.reduce((a, b) => a > b ? a : b) -
            v.reduce((a, b) => a < b ? a : b);
      }

      expect(spread(ConsistencyTrend.from(days(spec), window: 30)),
          lessThan(spread(ConsistencyTrend.from(days(spec), window: 7))));
    });
  });

  group('what the card is allowed to say', () {
    test('the delta period matches the window it was measured over', () {
      // "Up 12 points in a week" while showing a 30-day mean is simply false.
      expect(ConsistencyTrend.from(days(days30()), window: 7).periodLabel,
          'a week');
      expect(ConsistencyTrend.from(days(days30()), window: 30).periodLabel,
          'a month');
    });

    test('the daily line is dropped once it stops being readable', () {
      expect(
          ConsistencyTrend.from(days(List.generate(30, (_) => (2, 2))))
              .showsDailyLine,
          isTrue);
      expect(
          ConsistencyTrend.from(days(List.generate(365, (_) => (2, 2))))
              .showsDailyLine,
          isFalse);
    });
  });

  group('moments and momentum', () {
    test('a tapped day can name the counts behind its percentage', () {
      final t = ConsistencyTrend.from(days([(14, 12), (4, 4)]));
      expect(t.scheduled.first, 14);
      expect(t.completed.first, 12);
    });

    test('"best" is not drawn when it is where you already are', () {
      // Best and Now on the same point is two labels for one fact.
      final t = ConsistencyTrend.from(days(List.generate(30, (_) => (2, 2))));
      final kinds = t.moments.map((m) => m.kind);
      expect(kinds, contains(MomentKind.current));
      expect(kinds, isNot(contains(MomentKind.best)));
    });

    test('at most three moments are ever offered', () {
      final t = ConsistencyTrend.from(days([
        for (var i = 0; i < 90; i++) (4, i % 7 == 0 ? 0 : 4),
      ]));
      expect(t.moments.length, lessThanOrEqualTo(3));
    });

    test('a top run sits at its own peak; a faded one does not', () {
      expect(
          ConsistencyTrend.from(days(List.generate(40, (_) => (5, 5))))
              .isAtPeak,
          isTrue);
      expect(
          ConsistencyTrend.from(days([
            ...List.generate(30, (_) => (10, 10)),
            ...List.generate(20, (_) => (10, 8)),
          ])).isAtPeak,
          isFalse);
    });

    test('a fall reads as falling, a climb as improving', () {
      final falling = ConsistencyTrend.from(days([
        ...List.generate(20, (_) => (4, 3)),
        ...List.generate(7, (_) => (4, 1)),
      ]));
      expect(falling.direction, TrendDirection.falling);

      final rising = ConsistencyTrend.from(days([
        ...List.generate(20, (_) => (4, 1)),
        ...List.generate(7, (_) => (4, 3)),
      ]));
      expect(rising.direction, TrendDirection.improving);
    });

    test('steady weeks only count weeks that had data', () {
      final t = ConsistencyTrend.from(days([
        ...List.generate(21, (_) => (2, 2)),
        ...List.generate(14, (_) => (0, 0)),
      ]));
      final w = t.steadyWeeks;
      expect(w.total, lessThan(5));
      expect(w.held, lessThanOrEqualTo(w.total));
    });
  });

  group('the coach', () {
    ConsistencyTrend at(List<(int, int)> spec) =>
        ConsistencyTrend.from(days(spec));

    test('reads position and direction, not position alone', () {
      // Same band, opposite direction: the card must not say the same thing.
      final rising = at([
        ...List.generate(20, (_) => (4, 1)),
        ...List.generate(7, (_) => (4, 3)),
      ]);
      final falling = at([
        ...List.generate(20, (_) => (4, 3)),
        ...List.generate(7, (_) => (4, 2)),
      ]);
      expect(rising.zone, falling.zone);
      expect(rising.coach.headline, isNot(falling.coach.headline));
    });

    test('never colours encouragement as an error', () {
      // The worst stretch is the likeliest moment for someone to quit. The
      // chart may paint that data red; the sentence must not.
      final wrecked = at(List.generate(30, (_) => (10, 0)));
      expect(wrecked.zone, ConsistencyZone.down);
      expect(wrecked.coach.tone, CoachTone.recovering);

      // Whatever the data does, the tone stays inside the warm set. There is
      // deliberately no "danger" tone to reach for.
      const safe = {
        CoachTone.improving,
        CoachTone.steady,
        CoachTone.slipping,
        CoachTone.recovering,
      };
      expect(CoachTone.values.toSet(), safe);
      for (final spec in [
        List.generate(30, (_) => (5, 5)),
        List.generate(30, (_) => (5, 3)),
        List.generate(30, (_) => (5, 1)),
        List.generate(30, (_) => (10, 0)),
      ]) {
        expect(safe, contains(at(spec).coach.tone));
      }
    });

    test('a promised number of strong days is arithmetically true', () {
      final t = at(List.generate(30, (_) => (4, 2)));
      final target = t.nextZoneUp!;
      final k = t.strongDaysTo(target);
      if (k != null) {
        // Replay it: k perfect days really must clear the band.
        final replayed = ConsistencyTrend.from(days([
          ...List.generate(30, (_) => (4, 2)),
          ...List.generate(k, (_) => (4, 4)),
          (0, 0),
        ]));
        expect(replayed.latestTrend, greaterThanOrEqualTo(target.floor - 1e-9));
      }
    });

    test('no number is promised before a full window exists', () {
      final t = ConsistencyTrend.from(days(List.generate(4, (_) => (2, 1))));
      expect(t.strongDaysTo(ConsistencyZone.lockedIn), isNull);
    });

    test('a target too far out is left unspoken rather than stated', () {
      // From 0% on a 30-day window it takes 24 perfect days to reach Locked
      // In. That is true, unpicturable, and reads as a sentence — so the card
      // says nothing rather than saying it.
      final t = ConsistencyTrend.from(
        days(List.generate(60, (_) => (5, 0))),
        window: 30,
      );
      expect(t.strongDaysTo(ConsistencyZone.lockedIn), isNull);
      expect(t.coach.headline, isNotEmpty);
    });

    test('a promise, when made, is never more than a week away', () {
      for (final n in [2, 3, 5, 8]) {
        final t = ConsistencyTrend.from(days(List.generate(40, (_) => (n, 1))));
        for (final z in ConsistencyZone.values) {
          final k = t.strongDaysTo(z);
          if (k != null) expect(k, lessThanOrEqualTo(ConsistencyTrend.maxPromise));
        }
      }
    });

    test('the top band is told to hold, everyone else to push', () {
      final top = at(List.generate(40, (_) => (5, 5)));
      expect(top.zone, ConsistencyZone.lockedIn);
      final low = at(List.generate(30, (_) => (10, 1)));
      expect(low.coach.aim, CoachAim.push);
    });

    test('the verb agrees with the number of days promised', () {
      // "4 strong days changes the direction" reads as machine output.
      for (final spec in [
        List.generate(30, (_) => (4, 2)),
        List.generate(30, (_) => (5, 3)),
        List.generate(30, (_) => (8, 5)),
        List.generate(30, (_) => (10, 7)),
      ]) {
        final t = at(spec);
        final line = '${t.coach.headline} ${t.coach.body}';
        final m = RegExp(r'(\d+) strong days? (\w+)').firstMatch(line);
        if (m == null) continue;
        final n = int.parse(m.group(1)!);
        final verb = m.group(2)!;
        if (const {'reach', 'change', 'get', 'reaches', 'changes', 'gets'}
            .contains(verb)) {
          expect(verb.endsWith('s'), n == 1,
              reason: '"$n strong day(s) $verb" does not agree');
        }
      }
    });

    test('every band and direction produces a usable message', () {
      for (final spec in [
        List.generate(30, (_) => (5, 5)),
        List.generate(30, (_) => (5, 3)),
        List.generate(30, (_) => (5, 2)),
        List.generate(30, (_) => (10, 1)),
      ]) {
        final c = at(spec).coach;
        expect(c.headline, isNotEmpty);
        expect(c.body, isNotEmpty);
        // Nothing may leak an unresolved interpolation into the UI.
        expect(c.body, isNot(contains(r'$')));
        expect(c.headline, isNot(contains('null')));
        expect(c.body, isNot(contains('null')));
      }
    });
  });

  group('consistency zones', () {
    test('band boundaries are inclusive at the floor', () {
      expect(ConsistencyZone.of(1.0), ConsistencyZone.lockedIn);
      expect(ConsistencyZone.of(0.80), ConsistencyZone.lockedIn);
      expect(ConsistencyZone.of(0.799), ConsistencyZone.steady);
      expect(ConsistencyZone.of(0.50), ConsistencyZone.steady);
      expect(ConsistencyZone.of(0.499), ConsistencyZone.slipping);
      expect(ConsistencyZone.of(0.20), ConsistencyZone.slipping);
      expect(ConsistencyZone.of(0.199), ConsistencyZone.down);
      expect(ConsistencyZone.of(0.0), ConsistencyZone.down);
    });

    test('float noise cannot push a real 80% run into the band below', () {
      // A mean of seven 0.8s is 0.7999999999999999. The card would otherwise
      // print "80%" beside a STEADY pill.
      final t = ConsistencyTrend.from(days(List.generate(20, (_) => (10, 8))));
      expect(t.zone, ConsistencyZone.lockedIn);
    });

    test('no band is named in the language of a compliance report', () {
      // The words a person reads about their own worst fortnight matter.
      for (final z in ConsistencyZone.values) {
        expect(z.label.toLowerCase(), isNot(contains('risk')));
        expect(z.label.toLowerCase(), isNot(contains('fail')));
        expect(z.note, isNotEmpty);
      }
    });

    test('the peak is the highest point on the trend, not the daily line', () {
      // A single perfect day inside a bad stretch must not become "your best".
      final t = ConsistencyTrend.from(days([
        ...List.generate(10, (_) => (4, 4)),
        ...List.generate(10, (_) => (4, 1)),
        (4, 4),
      ]));
      final peak = t.peakIndex!;
      expect(t.trend[peak], 1.0);
      expect(peak, lessThan(12));
    });

    test('the peak ignores rest days rather than ranking them', () {
      final t = ConsistencyTrend.from(days([
        ...List.generate(10, (_) => (2, 2)),
        ...List.generate(5, (_) => (0, 0)),
        ...List.generate(8, (_) => (2, 1)),
      ]));
      expect(t.peakIndex, isNotNull);
      expect(t.trend[t.peakIndex!], 1.0);
    });

    test('the zone follows the current average', () {
      final good = ConsistencyTrend.from(days(List.generate(20, (_) => (5, 5))));
      expect(good.zone, ConsistencyZone.lockedIn);
      final bad = ConsistencyTrend.from(days(List.generate(20, (_) => (10, 1))));
      expect(bad.zone, ConsistencyZone.down);
    });

    test('every day carries the date it belongs to', () {
      final t = ConsistencyTrend.from(days(List.generate(20, (_) => (2, 2))));
      expect(t.dates, hasLength(20));
      expect(t.dates.last.isAfter(t.dates.first), isTrue);
    });
  });
}
