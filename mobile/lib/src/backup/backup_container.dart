import 'dart:convert';
import 'dart:io';

/// Metadata describing a backup, stored in the clear.
///
/// Deliberately NOT compressed with the payload: restore-with-preview lists
/// real counts and dates before the user commits to anything, and on Drive this
/// same data lives in `appProperties`, so the picker is one `files.list` call
/// with zero downloads.
class BackupHeader {
  const BackupHeader({
    required this.formatVersion,
    required this.schemaVersion,
    required this.appVersion,
    required this.createdAt,
    required this.deviceId,
    required this.deviceLabel,
    required this.kind,
    required this.counts,
    this.firstLogDate,
    this.lastLogDate,
  });

  static const currentFormat = 1;

  final int formatVersion;
  final int schemaVersion;
  final String appVersion;
  final int createdAt;
  final String deviceId;
  final String deviceLabel;

  /// 'auto' or 'manual'. Manual snapshots are never auto-pruned.
  final String kind;

  /// Row counts per table, for the preview.
  final Map<String, int> counts;

  final String? firstLogDate;
  final String? lastLogDate;

  int get totalRows => counts.values.fold(0, (a, b) => a + b);

  Map<String, dynamic> toJson() => {
        'v': formatVersion,
        'schema': schemaVersion,
        'app': appVersion,
        'created_at': createdAt,
        'device_id': deviceId,
        'device_label': deviceLabel,
        'kind': kind,
        'counts': counts,
        'first_log': firstLogDate,
        'last_log': lastLogDate,
      };

  static BackupHeader fromJson(Map<String, dynamic> j) => BackupHeader(
        formatVersion: j['v'] as int? ?? 1,
        schemaVersion: j['schema'] as int? ?? 1,
        appVersion: j['app'] as String? ?? 'unknown',
        createdAt: j['created_at'] as int? ?? 0,
        deviceId: j['device_id'] as String? ?? 'unknown',
        deviceLabel: j['device_label'] as String? ?? 'Unknown device',
        kind: j['kind'] as String? ?? 'auto',
        counts: Map<String, int>.from(j['counts'] as Map? ?? const {}),
        firstLogDate: j['first_log'] as String?,
        lastLogDate: j['last_log'] as String?,
      );
}

class CorruptBackupException implements Exception {
  CorruptBackupException(this.message);
  final String message;
  @override
  String toString() => 'CorruptBackupException: $message';
}

/// The `.shbak` file format.
///
/// ```
/// SHBK              4-byte magic
/// <header json>\n   one line, plaintext
/// <gzip(jsonl)>     the rows
/// ```
///
/// JSONL rather than a raw SQLite page copy: a v12 backup restoring into a v19
/// app becomes a field-level upgrade rather than a database-file migration, and
/// it compresses roughly four times better. Restore is slower, which does not
/// matter at these sizes — a three-year power user is under 2 MB gzipped.
abstract final class BackupContainer {
  static const magic = 'SHBK';

  static List<int> encode(BackupHeader header, List<Map<String, dynamic>> rows) {
    final payload = rows.map(jsonEncode).join('\n');
    final compressed = GZipCodec().encode(utf8.encode(payload));

    return [
      ...utf8.encode(magic),
      ...utf8.encode('${jsonEncode(header.toJson())}\n'),
      ...compressed,
    ];
  }

  /// Reads the header without touching the payload — what makes the picker
  /// instant.
  static BackupHeader decodeHeader(List<int> bytes) {
    if (bytes.length < magic.length ||
        utf8.decode(bytes.take(magic.length).toList()) != magic) {
      throw CorruptBackupException('Not a StayHardy backup file.');
    }

    final newline = bytes.indexOf(0x0A, magic.length);
    if (newline < 0) {
      throw CorruptBackupException('Backup header is truncated.');
    }

    try {
      final json = utf8.decode(bytes.sublist(magic.length, newline));
      return BackupHeader.fromJson(jsonDecode(json) as Map<String, dynamic>);
    } catch (e) {
      throw CorruptBackupException('Backup header is unreadable: $e');
    }
  }

  static List<Map<String, dynamic>> decodeRows(List<int> bytes) {
    // Re-validates the magic so a caller cannot skip straight to the payload.
    decodeHeader(bytes);
    final newline = bytes.indexOf(0x0A, magic.length);

    try {
      final decompressed =
          GZipCodec().decode(bytes.sublist(newline + 1));
      final text = utf8.decode(decompressed);
      if (text.trim().isEmpty) return const [];

      return text
          .split('\n')
          .where((line) => line.trim().isNotEmpty)
          .map((line) => jsonDecode(line) as Map<String, dynamic>)
          .toList();
    } catch (e) {
      if (e is CorruptBackupException) rethrow;
      throw CorruptBackupException('Backup payload is unreadable: $e');
    }
  }
}
