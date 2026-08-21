import 'package:supabase_flutter/supabase_flutter.dart';

/// Read-only access to the legacy Supabase content tables.
///
/// Behind an interface so the migration can be tested against fixtures rather
/// than against the live database of ~100 real users. Nothing here writes.
abstract interface class LegacySource {
  /// Exact row count for the signed-in user, captured *before* the pull so the
  /// migration receipt can prove nothing was dropped.
  Future<int> count(LegacyTable table);

  /// One keyset page, ordered by the table's cursor column then id.
  ///
  /// Keyset rather than offset: offset pagination silently skips rows when the
  /// underlying set changes between pages, and this runs against a live table.
  Future<List<Map<String, dynamic>>> page(
    LegacyTable table, {
    String? afterCursor,
    String? afterId,
    int limit = 500,
  });
}

/// The five legacy tables, with the column-naming quirks of each.
enum LegacyTable {
  routines('routines', 'user_id', 'created_at'),
  routineLogs('routine_logs', 'user_id', 'completed_at'),
  // `tasks` and `goals` use a quoted camelCase owner column while their
  // neighbours use snake_case. This is a property of the live schema, not a
  // mistake here.
  tasks('tasks', 'userId', 'createdAt'),
  goals('goals', 'userId', 'createdAt'),
  userBadges('user_badges', 'user_id', 'earned_at');

  const LegacyTable(this.table, this.ownerColumn, this.cursorColumn);

  final String table;
  final String ownerColumn;
  final String cursorColumn;
}

class SupabaseLegacySource implements LegacySource {
  SupabaseLegacySource(this._client, this._userId);

  final SupabaseClient _client;
  final String _userId;

  @override
  Future<int> count(LegacyTable table) async {
    final res = await _client
        .from(table.table)
        .select('id')
        .eq(table.ownerColumn, _userId)
        .count(CountOption.exact);
    return res.count;
  }

  @override
  Future<List<Map<String, dynamic>>> page(
    LegacyTable table, {
    String? afterCursor,
    String? afterId,
    int limit = 500,
  }) async {
    var query = _client
        .from(table.table)
        .select()
        .eq(table.ownerColumn, _userId);

    // Keyset: strictly after the last cursor value seen. Ties on the cursor
    // column are broken by id, which is why both are carried.
    if (afterCursor != null) {
      query = query.gte(table.cursorColumn, afterCursor);
    }

    final rows = await query
        .order(table.cursorColumn)
        .order('id')
        .limit(limit);

    final list = rows.cast<Map<String, dynamic>>();
    if (afterCursor == null || afterId == null) return list;

    // Drop anything at or before the exact (cursor, id) already consumed.
    return list.where((r) {
      final c = r[table.cursorColumn]?.toString() ?? '';
      final id = r['id']?.toString() ?? '';
      if (c != afterCursor) return c.compareTo(afterCursor) > 0;
      return id.compareTo(afterId) > 0;
    }).toList();
  }
}
