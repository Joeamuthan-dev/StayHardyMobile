import 'package:drift/drift.dart' hide isNull;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/habit_repository.dart';

/// The free-tier limit is revenue logic AND a promise to existing users.
/// Getting grandfathering wrong means a live user opens the rebuilt app and
/// finds habits they created themselves sitting behind a paywall.
void main() {
  late AppDatabase db;
  late HabitRepository repo;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    repo = HabitRepository(db);
  });

  tearDown(() async => db.close());

  Future<void> addHabits(int count, {int createdBase = 1000}) async {
    for (var i = 0; i < count; i++) {
      await db.into(db.habits).insert(HabitsCompanion.insert(
            id: 'h$i',
            title: 'Habit $i',
            startDate: '2026-01-01',
            // Distinct timestamps so "oldest first" is deterministic.
            createdAt: createdBase + i,
            updatedAt: createdBase + i,
          ));
    }
  }

  group('free limit', () {
    test('allows creation up to the limit', () async {
      await addHabits(6);
      final cap = await repo.capStatus(isPro: false);
      expect(cap.counted, 6);
      expect(cap.remaining, 1);
      expect(cap.canCreate, isTrue);
    });

    test('blocks creation at the limit', () async {
      await addHabits(7);
      final cap = await repo.capStatus(isPro: false);
      expect(cap.counted, 7);
      expect(cap.remaining, 0);
      expect(cap.canCreate, isFalse);
    });

    test('Pro is never blocked', () async {
      await addHabits(40);
      final cap = await repo.capStatus(isPro: true);
      expect(cap.canCreate, isTrue);
      expect(cap.isPro, isTrue);
    });

    test('archived habits free up a slot', () async {
      await addHabits(7);
      expect((await repo.capStatus(isPro: false)).canCreate, isFalse);

      await repo.archive('h0');
      final cap = await repo.capStatus(isPro: false);
      expect(cap.counted, 6);
      expect(cap.canCreate, isTrue,
          reason: 'archiving is the free way back under the limit');
    });
  });

  group('the free cap on restore', () {
    // Owner's rule, replacing the earlier grandfathering: free means seven
    // however the habits arrived. Restore was the side door — creation was
    // gated, but a Supabase pull or a backup file could walk in with twelve.
    test('does nothing when at or under the limit', () async {
      await addHabits(7);
      expect(await repo.enforceFreeCap(isPro: false), 0);
      final cap = await repo.capStatus(isPro: false);
      expect(cap.total, 7);
      expect(cap.canCreate, isFalse);
    });

    test('a restore beyond the limit keeps the top seven, archives the rest',
        () async {
      await addHabits(12);
      final archived = await repo.enforceFreeCap(isPro: false);

      expect(archived, 5, reason: '12 - 7 = 5 beyond the limit');

      final cap = await repo.capStatus(isPro: false);
      expect(cap.total, 7, reason: 'only seven remain visible');
      expect(cap.canCreate, isFalse);
    });

    test('archives the newest, keeps the oldest — nothing is deleted',
        () async {
      await addHabits(9);
      await repo.enforceFreeCap(isPro: false);

      final rows = await (db.select(db.habits)
            ..orderBy([(h) => OrderingTerm.asc(h.createdAt)]))
          .get();

      expect(rows.take(7).every((h) => h.archivedAt == null), isTrue);
      expect(rows.skip(7).every((h) => h.archivedAt != null), isTrue);
      expect(rows.every((h) => h.deletedAt == null), isTrue,
          reason: 'archived, never deleted — Pro brings them back whole');
    });

    test('Pro is never capped', () async {
      await addHabits(12);
      expect(await repo.enforceFreeCap(isPro: true), 0);
      final cap = await repo.capStatus(isPro: true);
      expect(cap.total, 12);
    });

    test('is idempotent — a second run archives nothing new', () async {
      await addHabits(10);
      expect(await repo.enforceFreeCap(isPro: false), 3);
      expect(await repo.enforceFreeCap(isPro: false), 0);
      final cap = await repo.capStatus(isPro: false);
      expect(cap.total, 7);
    });

    test('an empty account is unaffected', () async {
      expect(await repo.enforceFreeCap(isPro: false), 0);
      final cap = await repo.capStatus(isPro: false);
      expect(cap.total, 0);
      expect(cap.canCreate, isTrue);
      expect(cap.remaining, HabitRepository.freeHabitLimit);
    });
  });
}
