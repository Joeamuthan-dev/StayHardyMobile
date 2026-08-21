import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/backup/backup_retention.dart';

/// Retention deletes things. Every test here is about what it refuses to
/// delete — the worst outcome available to this code is dropping the last good
/// copy of someone's two years of history.
void main() {
  const day = 24 * 60 * 60 * 1000;
  const now = 1786000000000;

  BackupRecord at(int daysAgo, {String? id}) => BackupRecord(
        id: id ?? 'd$daysAgo',
        createdAt: now - daysAgo * day,
      );

  Set<String> keptIds(List<BackupRecord> input) =>
      BackupRetention.plan(input, now: now).keep.map((b) => b.id).toSet();

  group('never deletes the last copy', () {
    test('a single backup is left alone', () {
      final plan = BackupRetention.plan([at(500)], now: now);
      expect(plan.delete, isEmpty);
      expect(plan.keep.length, 1);
    });

    test('an empty set is a no-op', () {
      expect(BackupRetention.plan(const [], now: now).isNoOp, isTrue);
    });

    test('backups far older than the whole ladder still leave one behind', () {
      // Every one of these is past the six-month tail, so bucketing alone
      // would delete all of them.
      final plan = BackupRetention.plan(
        [at(400), at(500), at(600)],
        now: now,
      );
      expect(plan.keep.length, 1);
      expect(plan.keep.single.id, 'd400', reason: 'the newest survives');
      expect(plan.delete.length, 2);
    });

    test('the newest is kept even when its date is in the future', () {
      // A clock that jumped forward, or a file created on a device set wrong.
      // Bucketing on a negative age must not be able to drop it.
      final future = BackupRecord(id: 'future', createdAt: now + 10 * day);
      expect(keptIds([future, at(1), at(2)]), contains('future'));
    });
  });

  group('the ladder', () {
    test('everything from the last week is kept', () {
      final input = [for (var i = 0; i < 7; i++) at(i)];
      expect(keptIds(input).length, 7);
    });

    test('daily backups thin to weekly after a week', () {
      final input = [for (var i = 0; i < 30; i++) at(i)];
      final kept = keptIds(input);

      // The first seven days survive in full.
      for (var i = 0; i < 7; i++) {
        expect(kept, contains('d$i'));
      }
      // Beyond that it thins out — nowhere near all 30.
      expect(kept.length, lessThan(15));
      expect(kept.length, greaterThan(7));
    });

    test('a year of daily backups still leaves a usable tail', () {
      final input = [for (var i = 0; i < 365; i++) at(i)];
      final plan = BackupRetention.plan(input, now: now);

      expect(plan.keep.length, lessThanOrEqualTo(BackupRetention.maxKept));
      // And it reaches back — the point of the ladder is having last month,
      // not thirty copies of last night.
      final oldest = plan.keep.last;
      expect((now - oldest.createdAt) ~/ day, greaterThan(60));
    });

    test('the newest in each bucket wins, not the oldest', () {
      // Two backups in the same week bucket, 10 and 13 days old.
      final kept = keptIds([at(0), at(10), at(13)]);
      expect(kept, contains('d10'));
      expect(kept, isNot(contains('d13')));
    });

    test('the hard ceiling is respected however dense the input', () {
      // 60 backups all inside the daily window — every one qualifies on the
      // ladder alone. The cap is what stops a runaway scheduler filling a Drive.
      final input = [
        for (var i = 0; i < 60; i++)
          BackupRecord(id: 'x$i', createdAt: now - i * 3600 * 1000),
      ];
      final plan = BackupRetention.plan(input, now: now);
      expect(plan.keep.length, BackupRetention.maxKept);
      // And the ones kept are the newest.
      expect(plan.keep.first.id, 'x0');
    });
  });

  group('scheduling', () {
    test('a device that has never backed up is due', () {
      expect(BackupRetention.isDue(lastBackupAt: null, now: now), isTrue);
    });

    test('not due again within the day', () {
      expect(
        BackupRetention.isDue(lastBackupAt: now - 3600 * 1000, now: now),
        isFalse,
      );
    });

    test('due once a day has passed', () {
      expect(
        BackupRetention.isDue(lastBackupAt: now - day - 1, now: now),
        isTrue,
      );
    });

    test('a last-backup date in the future does not block backups forever', () {
      // A clock that was wrong when the last backup ran would otherwise leave
      // the user un-backed-up until the date caught up.
      expect(
        BackupRetention.isDue(lastBackupAt: now + 30 * day, now: now),
        isTrue,
      );
    });
  });
}
