import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'habit_repository.dart';
import 'task_repository.dart';

/// Keeps the home-screen widgets in step with the database.
///
/// The payload shape is fixed by widgets already installed on users' devices —
/// see `WidgetContract` on the Android side. Fields cannot be added, renamed, or
/// dropped without leaving placed widgets on their empty state.
class WidgetService {
  WidgetService(
    this._habits,
    this._tasks, [
    this._channel = _defaultChannel,
  ]);

  static const _defaultChannel = MethodChannel('com.stayhardy.app/widget');

  final HabitRepository _habits;
  final TaskRepository _tasks;
  final MethodChannel _channel;

  /// Recompute and push. Safe to call often; cheap enough to run after every
  /// check-off.
  Future<void> sync() async {
    if (!_supported) return;
    try {
      await _channel.invokeMethod<bool>('update', await buildPayload());
    } on PlatformException catch (e) {
      // A widget that fails to update is a cosmetic problem. It must never
      // surface as an error in the app or block the write that triggered it.
      debugPrint('[widget] update failed: ${e.message}');
    } on MissingPluginException {
      // Platform without the bridge.
    }
  }

  @visibleForTesting
  Future<Map<String, Object>> buildPayload() async {
    final today = await _habits.loadToday();
    final board = await _tasks.loadBoard();

    final routinesTotal = today.length;
    final routinesCompleted = today.where((h) => h.isDone).length;

    // Today's tasks only. Counting the whole backlog would make the widget's
    // ratio drift permanently toward zero as old tasks accumulate — the same
    // flaw the old productivity score had.
    final tasksToday = [...board.overdue, ...board.today];
    final tasksTotal = tasksToday.length + board.completed.length;
    final tasksCompleted = board.completed.length;

    // The best single streak on show today, which is what the small widget has
    // room for.
    final streak = today.isEmpty
        ? 0
        : today.map((h) => h.streak).reduce((a, b) => a > b ? a : b);

    return {
      'streak': streak,
      'routinesCompleted': routinesCompleted,
      'routinesTotal': routinesTotal,
      'tasksCompleted': tasksCompleted,
      'tasksTotal': tasksTotal,
      'productivityScore': _score(
        routinesCompleted: routinesCompleted,
        routinesTotal: routinesTotal,
        tasksCompleted: tasksCompleted,
        tasksTotal: tasksTotal,
      ),
      'topPendingTask': _topPending(board),
    };
  }

  /// Today's score, weighted toward habits.
  ///
  /// Windowed to today rather than to lifetime totals, unlike the score in the
  /// app being replaced, which mixed all-time task counts with today-only habits
  /// and therefore decayed forever.
  static int _score({
    required int routinesCompleted,
    required int routinesTotal,
    required int tasksCompleted,
    required int tasksTotal,
  }) {
    final habitPart =
        routinesTotal == 0 ? null : routinesCompleted / routinesTotal;
    final taskPart = tasksTotal == 0 ? null : tasksCompleted / tasksTotal;

    if (habitPart == null && taskPart == null) return 0;
    if (taskPart == null) return (habitPart! * 100).round();
    if (habitPart == null) return (taskPart * 100).round();
    return ((habitPart * 0.7 + taskPart * 0.3) * 100).round();
  }

  static String _topPending(TaskBoard board) {
    // Overdue first — that is the thing most worth surfacing at a glance.
    final candidates = [...board.overdue, ...board.today, ...board.someday];
    if (candidates.isEmpty) return '';
    final t = candidates.first;
    return t.title.length > 60 ? '${t.title.substring(0, 57)}…' : t.title;
  }

  /// Clears the widget when the user signs out or wipes their data, so a
  /// stranger picking up the phone cannot read yesterday's habits off the home
  /// screen.
  Future<void> clear() async {
    if (!_supported) return;
    try {
      await _channel.invokeMethod<bool>('update', {
        'streak': 0,
        'routinesCompleted': 0,
        'routinesTotal': 0,
        'tasksCompleted': 0,
        'tasksTotal': 0,
        'productivityScore': 0,
        'topPendingTask': '',
      });
    } on PlatformException catch (_) {
      // Nothing to do.
    } on MissingPluginException {
      // Nothing to do.
    }
  }

  bool get _supported => defaultTargetPlatform == TargetPlatform.android;
}
