import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_config.dart';
import '../domain/challenge_rules.dart';
import '../domain/civil_date.dart';
import 'database.dart';
import 'enums.dart';
import 'habit_repository.dart';

/// Why a challenge call did not do what was asked.
///
/// A typed outcome rather than an exception, matching `AuthResult` — the UI
/// needs a finished sentence it can show, not a stack trace.
enum ChallengeOutcome {
  success,
  notSignedIn,
  notConfigured,
  network,
  dayClosed,
  notAMember,
  full,
  notFound,
  paidNotOpen,
  unknown,
}

class ChallengeResult {
  const ChallengeResult(this.outcome, {this.message, this.cohortId, this.code});

  final ChallengeOutcome outcome;

  /// A finished human sentence. Never an error code.
  final String? message;

  final String? cohortId;

  /// Invite code, on create.
  final String? code;

  bool get isSuccess => outcome == ChallengeOutcome.success;
}

/// A circle the user belongs to.
class Circle {
  const Circle({
    required this.id,
    required this.name,
    required this.startDay,
    required this.endDay,
    required this.timezone,
    required this.memberCount,
    this.isGlobal = false,
    this.createdBy,
  });

  final String id;
  final String name;
  final String startDay;
  final String endDay;
  final String timezone;
  final int memberCount;

  /// The one automatic monthly StayHardy Circle, as opposed to a private
  /// invite-code circle.
  final bool isGlobal;

  /// Who started it — null for the global circle and for old rows.
  final String? createdBy;
}

/// One line on the global StayHardy Circle board.
///
/// Comes straight from the `global_circle_standings` RPC — rank, points and
/// ties are all decided in the database, never recomputed here, so the board
/// every member sees is the same board.
class GlobalStanding {
  const GlobalStanding({
    required this.rank,
    required this.displayName,
    required this.points,
    required this.totalDone,
    required this.isCaller,
    this.location,
    this.habitCount = 0,
  });

  /// How many habits this member runs (their latest shared day's schedule) —
  /// shown as encouragement. WHICH habits never leaves their phone.
  final int habitCount;

  final int rank;
  final String displayName;

  /// Member-chosen "where I'm from", or null if they didn't say.
  final String? location;

  /// Fractional daily points this month — done/required capped at 1 per day.
  final double points;

  /// Total check-ins — the tie-breaker, shown as context.
  final int totalDone;

  /// This row is the signed-in user (may sit far below the visible top-N).
  final bool isCaller;
}

/// One podium line from a finished month, snapshotted at settlement.
class HallOfFameEntry {
  const HallOfFameEntry({
    required this.monthStart,
    required this.rank,
    required this.displayName,
    required this.points,
    this.location,
    this.won = false,
  });

  /// True for every player whose points equalled the month's maximum — they
  /// ALL won lifetime Pro (ties are never broken for the prize).
  final bool won;

  /// 'YYYY-MM-DD' of the month the podium belongs to.
  final String monthStart;
  final int rank;
  final String displayName;
  final String? location;
  final double points;
}

/// One member's line on the standings board.
class CircleStanding {
  const CircleStanding({
    required this.userId,
    required this.displayName,
    required this.daysCompleted,
    required this.streak,
    required this.doneToday,
    this.points = 0,
    this.location,
  });

  final String userId;
  final String displayName;

  /// Fractional daily points — same arithmetic as the global board, computed
  /// client-side from the cohort's shared daily rows.
  final double points;

  final String? location;
  final int daysCompleted;
  final int streak;
  final bool doneToday;
}

/// The server's view of the current day. **The client never computes this.**
///
/// The cohort's timezone is pinned server-side, and the day boundary decides
/// whether a check-in counts — so both live there. The UI counts down from
/// [closesAtUtc] against a monotonic [Stopwatch], not against `DateTime.now()`,
/// so changing the device clock does not move the deadline on screen either.
class CohortClock {
  const CohortClock({
    required this.cohortDay,
    required this.serverNowUtc,
    required this.closesAtUtc,
  });

  final String cohortDay;
  final DateTime serverNowUtc;
  final DateTime closesAtUtc;

  Duration get remaining => closesAtUtc.difference(serverNowUtc);
}

/// Accountability circles.
///
/// **What this sends is a count, and the server trusts it.** Habit content
/// never leaves the device — see `challenge_rules.dart` for the full argument
/// and why the payout model, not this code, is what makes that safe.
class ChallengeService {
  ChallengeService(this._db, this._habits, {SupabaseClient? client})
      : _client = client;

  final AppDatabase _db;
  final HabitRepository _habits;
  final SupabaseClient? _client;

  /// Null whenever the backend is unusable, so every caller degrades instead of
  /// throwing. Copied from `CommunityService` — `hasBackend` alone is not
  /// enough, because `Supabase.initialize()` may never have run.
  SupabaseClient? get _supabase {
    if (!AppConfig.hasBackend) return null;
    try {
      return _client ?? Supabase.instance.client;
    } catch (_) {
      return null;
    }
  }

  bool get available => _supabase != null;

  /// Build today's tally from local data.
  ///
  /// Reads logs directly rather than through `loadToday` because the challenge
  /// needs each log's `backfilled` and `source`, which the today-view drops.
  Future<ChallengeTally> tallyFor(CivilDate day) async {
    final habits = await _habits.activeHabits();
    if (habits.isEmpty) return ChallengeTally.empty;

    final logs = await (_db.select(_db.habitLogs)
          ..where((l) => l.logDate.equals(day.iso) & l.deletedAt.isNull()))
        .get();
    final byHabit = {for (final l in logs) l.habitId: l};

    final freezes = await (_db.select(_db.habitFreezes)
          ..where((f) => f.freezeDate.equals(day.iso) & f.deletedAt.isNull()))
        .get();
    final frozen = {for (final f in freezes) f.habitId};

    final entries = <ChallengeHabitDay>[];
    for (final h in habits) {
      if (CivilDate.parse(h.startDate).isAfter(day)) continue;
      final log = byHabit[h.id];
      entries.add(ChallengeHabitDay(
        habitId: h.id,
        due: _habits.scheduleOf(h).isDueOn(day),
        completed: log != null,
        frozen: frozen.contains(h.id),
        backfilled: log?.backfilled ?? false,
        source: LogSource.fromValue(log?.source ?? LogSource.manual.value),
      ));
    }

    return ChallengeTallying.tally(entries);
  }

  Future<ChallengeResult> createCircle({
    required String name,
    required String timezone,
    String? location,
    int days = ChallengeRules.cohortDays,
    int maxMembers = ChallengeRules.freeCircleMembers,
    int minHabits = 0,
  }) async {
    final from = location?.trim() ?? '';
    return _invoke('challenge-join', {
      'action': 'create',
      'name': name,
      'timezone': timezone,
      'days': days,
      'max_members': maxMembers,
      'min_habits': minHabits,
      if (from.isNotEmpty) 'location': from,
    });
  }

  /// Delete a circle — the server allows it only for the creator, and only
  /// while nobody else is in it. Everyone else's path out is [leave].
  Future<ChallengeResult> deleteCircle(String cohortId) =>
      _invoke('challenge-join', {'action': 'delete', 'cohort_id': cohortId});

  /// The invite code for a circle. RLS hands it only to the creator; anyone
  /// else gets null and the share affordance simply does not appear.
  Future<String?> inviteCode(String cohortId) async {
    final client = _supabase;
    if (client == null) return null;
    try {
      final row = await client
          .from('challenge_invites')
          .select('code')
          .eq('cohort_id', cohortId)
          .maybeSingle();
      return row == null ? null : '${row['code']}';
    } catch (e) {
      debugPrint('[challenge] could not read invite code: $e');
      return null;
    }
  }

  /// Push the local tally to every circle the user is in — the automatic
  /// version of "share today", run at launch and after habit changes so the
  /// board never depends on someone remembering a button. [includeYesterday]
  /// covers the 03:00 grace window: a day finished at 11pm and never shared
  /// still lands when the app opens the next morning.
  Future<void> autoShareAll({bool includeYesterday = false}) async {
    final client = _supabase;
    if (client == null || client.auth.currentUser == null) return;

    final circles = await myCircles();
    if (circles.isEmpty) return;

    for (final c in circles) {
      await checkIn(c.id);
      if (includeYesterday) {
        await checkIn(c.id, on: CivilDate.today().addDays(-1));
      }
    }
  }

  Future<ChallengeResult> joinByCode(String code, {String? location}) {
    final from = location?.trim() ?? '';
    return _invoke('challenge-join', {
      'action': 'join',
      'code': code,
      if (from.isNotEmpty) 'location': from,
    });
  }

  /// Join this month's global StayHardy Circle.
  ///
  /// The server finds or creates the month's cohort — the client never gets to
  /// pick which cohort "this month" means.
  Future<ChallengeResult> joinGlobal({String? displayName, String? location}) {
    final name = displayName?.trim() ?? '';
    final from = location?.trim() ?? '';
    return _invoke('challenge-join', {
      'action': 'join_global',
      if (name.isNotEmpty) 'display_name': name,
      if (from.isNotEmpty) 'location': from,
    });
  }

  /// The global board: top [limit] plus the caller's own row wherever it sits.
  Future<List<GlobalStanding>> globalStandings({int limit = 20}) async {
    final client = _supabase;
    if (client == null) return const [];

    try {
      final rows =
          await client.rpc('global_circle_standings', params: {'limit_n': limit});
      return [
        for (final r in rows as List)
          if (r case final Map<String, dynamic> m)
            GlobalStanding(
              rank: (m['rank'] as num?)?.toInt() ?? 0,
              displayName: '${m['display_name'] ?? 'Member'}',
              location: m['location'] as String?,
              points: switch (m['points']) {
                final num n => n.toDouble(),
                final String t => double.tryParse(t) ?? 0,
                _ => 0,
              },
              totalDone: (m['total_done'] as num?)?.toInt() ?? 0,
              habitCount: (m['habit_count'] as num?)?.toInt() ?? 0,
              isCaller: m['is_caller'] == true,
            ),
      ];
    } catch (e) {
      debugPrint('[challenge] could not load global standings: $e');
      return const [];
    }
  }

  /// A finished month's board — the newest settled month when [monthStart]
  /// is null, otherwise exactly that month ('YYYY-MM-DD' of its first day).
  Future<List<HallOfFameEntry>> hallOfFame({String? monthStart}) async {
    final client = _supabase;
    if (client == null) return const [];

    try {
      var query = client
          .from('challenge_hall_of_fame')
          .select('month_start, rank, display_name, location, points, won');
      if (monthStart != null) query = query.eq('month_start', monthStart);

      final rows = await query
          .order('month_start', ascending: false)
          .order('rank', ascending: true)
          .limit(20);

      // The unfiltered query spans all settled months; keep only the newest.
      final latest = rows.isEmpty ? null : '${rows.first['month_start']}';
      return [
        for (final r in rows)
          if ('${r['month_start']}' == latest)
            HallOfFameEntry(
              monthStart: '${r['month_start']}',
              rank: (r['rank'] as num?)?.toInt() ?? 0,
              displayName: '${r['display_name'] ?? 'Member'}',
              location: r['location'] as String?,
              won: r['won'] == true,
              points: switch (r['points']) {
                final num n => n.toDouble(),
                final String t => double.tryParse(t) ?? 0,
                _ => 0,
              },
            ),
      ];
    } catch (e) {
      debugPrint('[challenge] could not load hall of fame: $e');
      return const [];
    }
  }

  /// The finished months that have a board, newest first ('YYYY-MM-DD').
  Future<List<String>> hallOfFameMonths() async {
    final client = _supabase;
    if (client == null) return const [];

    try {
      final rows = await client
          .from('challenge_hall_of_fame')
          .select('month_start')
          .order('month_start', ascending: false);
      final months = <String>[];
      for (final r in rows) {
        final m = '${r['month_start']}';
        if (!months.contains(m)) months.add(m);
      }
      return months;
    } catch (e) {
      debugPrint('[challenge] could not list hall of fame months: $e');
      return const [];
    }
  }

  Future<ChallengeResult> leave(String cohortId) =>
      _invoke('challenge-join', {'action': 'leave', 'cohort_id': cohortId});

  /// Submit today.
  ///
  /// `client_ts` is sent so the server can *measure* clock skew. It is not an
  /// input to any decision there, and nothing here should imply otherwise.
  Future<ChallengeResult> checkIn(String cohortId, {CivilDate? on}) async {
    final day = on ?? CivilDate.today();
    final tally = await tallyFor(day);
    final streak = await _overallStreak();

    return _invoke('challenge-checkin', {
      'cohort_id': cohortId,
      'day': day.iso,
      'habits_required': tally.required,
      'habits_done': tally.done,
      'habits_frozen': tally.frozen,
      'streak': streak,
      'client_ts': DateTime.now().toUtc().toIso8601String(),
    });
  }

  Future<List<Circle>> myCircles() async {
    final client = _supabase;
    if (client == null) return const [];

    try {
      final rows = await client
          .from('challenge_members')
          .select(
              'cohort_id, challenge_cohorts(id, name, start_day, end_day, timezone, scope, created_by)')
          .eq('status', 'active');

      return [
        for (final row in rows)
          if (row['challenge_cohorts'] case final Map<String, dynamic> c)
            Circle(
              id: '${c['id']}',
              name: '${c['name'] ?? 'Circle'}',
              startDay: '${c['start_day']}',
              endDay: '${c['end_day']}',
              timezone: '${c['timezone'] ?? 'UTC'}',
              memberCount: 0,
              isGlobal: '${c['scope']}' == 'global',
              createdBy: c['created_by'] as String?,
            ),
      ];
    } catch (e) {
      debugPrint('[challenge] could not load circles: $e');
      return const [];
    }
  }

  /// Standings for a circle, best first.
  Future<List<CircleStanding>> standings(String cohortId, {CivilDate? on}) async {
    final client = _supabase;
    if (client == null) return const [];
    final today = (on ?? CivilDate.today()).iso;

    try {
      final members = await client
          .from('challenge_members')
          .select('user_id, display_name, location, days_completed')
          .eq('cohort_id', cohortId);

      final days = await client
          .from('challenge_daily')
          .select('user_id, day, habits_required, habits_done, streak')
          .eq('cohort_id', cohortId);

      final streakByUser = <String, int>{};
      final doneToday = <String>{};
      final completedByUser = <String, int>{};
      final pointsByUser = <String, double>{};

      for (final d in days) {
        final uid = '${d['user_id']}';
        final required = (d['habits_required'] as num?)?.toInt() ?? 0;
        final done = (d['habits_done'] as num?)?.toInt() ?? 0;
        // Same arithmetic as the global board's RPC — see [CircleScoring].
        pointsByUser[uid] = (pointsByUser[uid] ?? 0) +
            CircleScoring.dayPoints(done: done, required: required);
        if (required > 0 && done >= required) {
          completedByUser[uid] = (completedByUser[uid] ?? 0) + 1;
        }
        if ('${d['day']}' == today) {
          streakByUser[uid] = (d['streak'] as num?)?.toInt() ?? 0;
          if (required > 0 && done >= required) doneToday.add(uid);
        }
      }

      final out = [
        for (final m in members)
          CircleStanding(
            userId: '${m['user_id']}',
            displayName: '${m['display_name'] ?? 'Member'}',
            location: m['location'] as String?,
            points: pointsByUser['${m['user_id']}'] ?? 0,
            daysCompleted: completedByUser['${m['user_id']}'] ?? 0,
            streak: streakByUser['${m['user_id']}'] ?? 0,
            doneToday: doneToday.contains('${m['user_id']}'),
          ),
      ]..sort((a, b) {
          final byPoints = b.points.compareTo(a.points);
          if (byPoints != 0) return byPoints;
          return b.daysCompleted.compareTo(a.daysCompleted);
        });

      return out;
    } catch (e) {
      debugPrint('[challenge] could not load standings: $e');
      return const [];
    }
  }

  /// Today's overall streak, for display on the board.
  Future<int> _overallStreak() async {
    final habits = await _habits.activeHabits();
    var best = 0;
    for (final h in habits) {
      final detail = await _habits.detailFor(h.id);
      if (detail.currentStreak > best) best = detail.currentStreak;
    }
    return best;
  }

  Future<ChallengeResult> _invoke(String fn, Map<String, dynamic> body) async {
    final client = _supabase;
    if (client == null) {
      return const ChallengeResult(
        ChallengeOutcome.notConfigured,
        message: 'Circles are not available in this build.',
      );
    }
    if (client.auth.currentUser == null) {
      return const ChallengeResult(
        ChallengeOutcome.notSignedIn,
        message: 'Sign in to use circles.',
      );
    }

    try {
      final response = await client.functions.invoke(fn, body: body);
      final data = response.data;

      if (data is Map && data['ok'] == true) {
        final cohort = data['cohort'];
        return ChallengeResult(
          ChallengeOutcome.success,
          cohortId: cohort is Map ? '${cohort['id']}' : null,
          code: data['code'] as String?,
        );
      }

      final message = data is Map ? data['error'] as String? : null;
      return ChallengeResult(_outcomeFor(response.status, message),
          message: message ?? 'That did not work. Please try again.');
    } on FunctionException catch (e) {
      final details = e.details;
      final message = details is Map ? details['error'] as String? : null;
      debugPrint('[challenge] $fn failed: ${e.status} $message');
      return ChallengeResult(_outcomeFor(e.status, message),
          message: message ?? 'That did not work. Please try again.');
    } catch (e) {
      debugPrint('[challenge] $fn failed: $e');
      return const ChallengeResult(
        ChallengeOutcome.network,
        message: 'Could not reach the server. Check your connection.',
      );
    }
  }

  static ChallengeOutcome _outcomeFor(int? status, String? message) {
    final text = (message ?? '').toLowerCase();
    if (text.contains('paid cohorts')) return ChallengeOutcome.paidNotOpen;
    if (text.contains('full')) return ChallengeOutcome.full;
    if (text.contains('closed')) return ChallengeOutcome.dayClosed;
    if (text.contains('not an active member')) return ChallengeOutcome.notAMember;

    return switch (status) {
      401 => ChallengeOutcome.notSignedIn,
      403 => ChallengeOutcome.notAMember,
      404 => ChallengeOutcome.notFound,
      409 => ChallengeOutcome.dayClosed,
      _ => ChallengeOutcome.unknown,
    };
  }
}
