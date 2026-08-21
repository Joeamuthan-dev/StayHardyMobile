import 'dart:io';
import 'dart:ui' show Rect;

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import 'backup_container.dart';

/// Export and import a `.shbak` file through the OS.
///
/// **This is the escape hatch, and it works with no account and no Drive
/// scope.** A backup system that only functions when a Google sign-in, an
/// OAuth consent screen and a network all cooperate is a backup system that
/// fails exactly when someone needs it. Export writes a file and hands it to
/// the share sheet; the user picks where it goes and confirms there.
///
/// Nothing here uploads anything on its own.
class LocalBackup {
  const LocalBackup();

  /// Suggested filename. Sortable, and obvious in a Downloads folder a year
  /// later — `backup.shbak` is not.
  static String fileNameFor(DateTime at) {
    String two(int v) => v.toString().padLeft(2, '0');
    return 'stayhardy-${at.year}-${two(at.month)}-${two(at.day)}'
        '-${two(at.hour)}${two(at.minute)}.shbak';
  }

  static const _autoFileName = 'stayhardy_auto.shbak';

  /// Write the rolling on-device auto backup — ONE file, overwritten daily.
  /// Lives in app documents: survives app updates, dies with an uninstall,
  /// which is exactly the promise the free tier makes ("completely local").
  Future<void> writeAuto(List<int> bytes) async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$_autoFileName');
    await file.writeAsBytes(bytes, flush: true);
  }

  /// The rolling auto copy, or null if one was never written.
  Future<({List<int> bytes, DateTime writtenAt})?> readAuto() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$_autoFileName');
      if (!await file.exists()) return null;
      return (
        bytes: await file.readAsBytes(),
        writtenAt: await file.lastModified(),
      );
    } catch (_) {
      return null;
    }
  }

  /// Write [bytes] to a temp file and open the share sheet.
  ///
  /// Returns false if the user dismissed the sheet without choosing anything.
  Future<bool> export(List<int> bytes, {Rect? sharePosition}) async {
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/${fileNameFor(DateTime.now())}');
    await file.writeAsBytes(bytes, flush: true);

    final result = await Share.shareXFiles(
      [XFile(file.path, mimeType: 'application/octet-stream')],
      sharePositionOrigin: sharePosition,
    );
    return result.status == ShareResultStatus.success;
  }

  /// Let the user pick a `.shbak` file and read it.
  ///
  /// Returns null when the picker was dismissed — a normal answer, not an
  /// error. Throws [CorruptBackupException] when the chosen file is not a
  /// StayHardy backup, so the caller can say so plainly instead of failing
  /// halfway through a restore.
  Future<ImportedBackup?> pick() async {
    final result = await FilePicker.platform.pickFiles(
      // Deliberately `any` rather than an extension filter: Android's document
      // picker resolves custom extensions through MIME type, and `.shbak` has
      // no registered type — filtering would show the user an empty folder
      // containing the file they are looking at.
      type: FileType.any,
      withData: true,
    );

    final picked = result?.files.singleOrNull;
    if (picked == null) return null;

    final bytes = picked.bytes ?? await _readPath(picked.path);
    if (bytes == null) {
      throw CorruptBackupException('That file could not be read.');
    }

    // Parsed here, before anything else sees it, so an unreadable file fails at
    // the picker rather than mid-restore.
    final header = BackupContainer.decodeHeader(bytes);
    return ImportedBackup(
      name: picked.name,
      bytes: bytes,
      header: header,
    );
  }

  static Future<List<int>?> _readPath(String? path) async {
    if (path == null) return null;
    try {
      return await File(path).readAsBytes();
    } catch (e) {
      debugPrint('[backup] could not read picked file: $e');
      return null;
    }
  }
}

class ImportedBackup {
  const ImportedBackup({
    required this.name,
    required this.bytes,
    required this.header,
  });

  final String name;
  final List<int> bytes;
  final BackupHeader header;
}
