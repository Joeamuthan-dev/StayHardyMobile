import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/app_config.dart';
import 'settings_repository.dart';

/// A post on the updates screen.
class Announcement {
  const Announcement({
    required this.id,
    required this.title,
    required this.message,
    required this.category,
    required this.createdAt,
  });

  final String id;
  final String title;
  final String message;

  /// 'info' / 'feature' / 'warning' — free text in the live table, so it is
  /// never switched on exhaustively.
  final String category;

  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'message': message,
        'category': category,
        'created_at': createdAt.toIso8601String(),
      };

  static Announcement? fromJson(Map<String, dynamic> j) {
    final id = j['id']?.toString();
    if (id == null) return null;
    return Announcement(
      id: id,
      title: '${j['title'] ?? ''}',
      message: '${j['message'] ?? ''}',
      category: '${j['category'] ?? 'info'}',
      createdAt:
          DateTime.tryParse('${j['created_at']}') ?? DateTime.now(),
    );
  }
}

/// A support ticket or piece of feedback the user has sent.
class FeedbackTicket {
  const FeedbackTicket({
    required this.ticketId,
    required this.message,
    required this.type,
    required this.status,
    required this.createdAt,
    this.reply,
  });

  final String ticketId;
  final String message;
  final String type;
  final String status;
  final DateTime createdAt;
  final String? reply;

  bool get isOpen => status == 'open';
}

/// Reads announcements and writes feedback against the **live** Supabase
/// project the Capacitor app already uses.
///
/// Both table shapes are copied from the running web app rather than redesigned:
/// `announcements(id, title, message, category, created_at, is_active)` and
/// `feedback(user_id, user_name, user_email, message, type, subcategory,
/// ticket_id, status, priority, created_at, updated_at)`. The admin dashboard
/// reads these columns today, so a ticket filed from Flutter has to look
/// exactly like one filed from the web or it simply will not appear there.
class CommunityService {
  CommunityService(this._settings, {SupabaseClient? client})
      : _client = client;

  final SettingsRepository _settings;
  final SupabaseClient? _client;

  SupabaseClient? get _supabase {
    if (!AppConfig.hasBackend) return null;
    try {
      return _client ?? Supabase.instance.client;
    } catch (_) {
      // Supabase was never initialised — a local-only build.
      return null;
    }
  }

  /// Announcements, newest first.
  ///
  /// Served from the local cache first and refreshed behind it. Updates are the
  /// one screen in the app that genuinely needs the network, and showing a
  /// spinner over a list the user already read — on a train, in a lift — is the
  /// wrong trade.
  Future<List<Announcement>> announcements({bool refresh = true}) async {
    final cached = await _cachedAnnouncements();
    if (!refresh) return cached;

    final client = _supabase;
    if (client == null) return cached;

    try {
      final rows = await client
          .from('announcements')
          .select('id, title, message, category, created_at')
          .eq('is_active', true)
          .order('created_at', ascending: false)
          .limit(30);

      final fresh = <Announcement>[
        for (final row in rows)
          ?Announcement.fromJson(Map<String, dynamic>.from(row)),
      ];

      await _settings.set(
        SettingsKeys.announcementsCache,
        jsonEncode([for (final a in fresh) a.toJson()]),
      );
      return fresh;
    } catch (e) {
      // Offline, or the table moved. The cache is a better answer than an
      // error screen for content that is not urgent.
      debugPrint('[community] announcements failed, serving cache: $e');
      return cached;
    }
  }

  Future<List<Announcement>> _cachedAnnouncements() async {
    final raw = await _settings.getString(SettingsKeys.announcementsCache);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final list = jsonDecode(raw) as List;
      return [
        for (final item in list)
          ?Announcement.fromJson(Map<String, dynamic>.from(item as Map)),
      ];
    } catch (e) {
      debugPrint('[community] unreadable announcement cache: $e');
      return const [];
    }
  }

  /// How many posts the user has not seen.
  Future<int> unreadCount() async {
    final seenRaw = await _settings.getString(SettingsKeys.announcementsSeenAt);
    final cached = await _cachedAnnouncements();
    if (seenRaw == null) return cached.length;

    final seen = DateTime.tryParse(seenRaw);
    if (seen == null) return cached.length;
    return cached.where((a) => a.createdAt.isAfter(seen)).length;
  }

  Future<void> markAnnouncementsSeen() => _settings.set(
        SettingsKeys.announcementsSeenAt,
        DateTime.now().toIso8601String(),
      );

  /// File feedback or a support ticket.
  ///
  /// Returns the ticket id on success, null when it could not be sent — never
  /// a silent success. Someone who reports a bug and is told "thanks!" while
  /// nothing was written is worse off than someone told to try again.
  Future<String?> submit({
    required String message,
    required String type,
    required String subcategory,
    required String userId,
    String userName = '',
    String userEmail = '',
  }) async {
    final client = _supabase;
    if (client == null) return null;

    final trimmed = message.trim();
    if (trimmed.isEmpty) return null;

    // Same shape the web app generates, so both produce ids the admin
    // dashboard can read and sort together.
    final ticketId = 'TKT-${DateTime.now().millisecondsSinceEpoch % 1000000}';
    final now = DateTime.now().toIso8601String();

    try {
      await client.from('feedback').insert({
        'user_id': userId,
        'user_name': userName,
        'user_email': userEmail,
        'message': trimmed.length > maxMessageLength
            ? trimmed.substring(0, maxMessageLength)
            : trimmed,
        'type': type,
        'subcategory': subcategory,
        'ticket_id': ticketId,
        'status': 'open',
        'priority': 'normal',
        'created_at': now,
        'updated_at': now,
      });
      return ticketId;
    } catch (e) {
      debugPrint('[community] feedback submit failed: $e');
      return null;
    }
  }

  /// Tickets this user has filed, newest first.
  Future<List<FeedbackTicket>> myTickets(String userId) async {
    final client = _supabase;
    if (client == null) return const [];

    try {
      final rows = await client
          .from('feedback')
          .select('ticket_id, message, type, status, created_at, reply')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .limit(20);

      return [
        for (final row in rows)
          FeedbackTicket(
            ticketId: '${row['ticket_id'] ?? ''}',
            message: '${row['message'] ?? ''}',
            type: '${row['type'] ?? 'feedback'}',
            status: '${row['status'] ?? 'open'}',
            createdAt:
                DateTime.tryParse('${row['created_at']}') ?? DateTime.now(),
            reply: row['reply'] as String?,
          ),
      ];
    } catch (e) {
      debugPrint('[community] could not load tickets: $e');
      return const [];
    }
  }

  static const maxMessageLength = 2000;
  static const minMessageLength = 10;

  static const categories = <String>[
    'Bug',
    'Feature request',
    'Billing',
    'Account',
    'Something else',
  ];
}
