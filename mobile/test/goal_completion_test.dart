import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/data/database.dart';
import 'package:stayhardy/src/data/enums.dart';
import 'package:stayhardy/src/data/goal_repository.dart';

/// Finishing a goal by hand.
///
/// The app used to expose completion only once computed progress hit 100, so a
/// goal finished in real life could not be closed in the app — "close 1 loan"
/// sits at 0% until its milestones say otherwise, and the loan being paid off
/// is a fact about the world, not about the tracker. These tests cover the
/// state change behind the tick, including the way back out of it.
void main() {
  late AppDatabase db;
  late GoalRepository goals;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    goals = GoalRepository(db);
  });

  tearDown(() async => db.close());

  Future<Goal> read(String id) =>
      (db.select(db.goals)..where((g) => g.id.equals(id))).getSingle();

  test('a goal can be completed while its progress is still zero', () async {
    final id = await goals.createGoal(name: 'Close 1 loan');
    expect((await read(id)).status, GoalStatus.active.value);

    await goals.setStatus(id, GoalStatus.completed);

    final done = await read(id);
    expect(done.status, GoalStatus.completed.value);
    expect(done.completedAt, isNotNull,
        reason: 'a finished goal needs the date it finished');
  });

  test('reopening clears the completion date rather than leaving it behind',
      () async {
    // Otherwise a reopened goal is an active goal that claims to have been
    // finished, and anything reading completedAt believes it.
    final id = await goals.createGoal(name: 'Run a half marathon');
    await goals.setStatus(id, GoalStatus.completed);
    expect((await read(id)).completedAt, isNotNull);

    await goals.setStatus(id, GoalStatus.active);

    final back = await read(id);
    expect(back.status, GoalStatus.active.value);
    expect(back.completedAt, isNull);
  });

  test('completing marks the row dirty so the change can sync', () async {
    final id = await goals.createGoal(name: 'Ship 2.0');
    await goals.setStatus(id, GoalStatus.completed);
    expect((await read(id)).dirty, isTrue);
  });

  test('a mis-tap is fully recoverable', () async {
    // The tick is only safe to offer because this round-trip is lossless.
    final id = await goals.createGoal(name: 'Learn to swim');
    final before = await read(id);

    await goals.setStatus(id, GoalStatus.completed);
    await goals.setStatus(id, GoalStatus.active);

    final after = await read(id);
    expect(after.status, before.status);
    expect(after.completedAt, before.completedAt);
    expect(after.name, before.name);
  });
}
