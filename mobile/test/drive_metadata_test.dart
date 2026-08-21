import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/backup/backup_container.dart';
import 'package:stayhardy/src/backup/drive_client.dart';

/// The header is duplicated into Drive `appProperties` so listing backups costs
/// one `files.list` and zero downloads. That only holds if the round trip is
/// lossless and stays inside Drive's metadata limits — 124 bytes per value and
/// 30 entries. Breaching either is a rejected upload, and it would only show up
/// the first time a real backup ran.
void main() {
  BackupHeader header({
    Map<String, int> counts = const {'habits': 12, 'habit_logs': 3400},
    String? first = '2024-01-01',
    String? last = '2026-08-14',
    String device = 'Pixel 9',
  }) =>
      BackupHeader(
        formatVersion: BackupHeader.currentFormat,
        schemaVersion: 2,
        appVersion: '2.0.0',
        createdAt: 1786000000000,
        deviceId: 'device-uuid',
        deviceLabel: device,
        kind: 'auto',
        counts: counts,
        firstLogDate: first,
        lastLogDate: last,
      );

  test('everything the picker shows survives the round trip', () {
    final props = DriveClient.propertiesFromHeader(header());
    final back = DriveClient.headerFromProperties(props)!;

    expect(back.createdAt, 1786000000000);
    expect(back.deviceLabel, 'Pixel 9');
    expect(back.kind, 'auto');
    expect(back.schemaVersion, 2);
    expect(back.appVersion, '2.0.0');
    expect(back.counts['habit_logs'], 3400);
    expect(back.counts['habits'], 12);
    expect(back.firstLogDate, '2024-01-01');
    expect(back.lastLogDate, '2026-08-14');
  });

  test('only the summarised counts travel, whatever the table list', () {
    // Carrying a key per table would breach the 30-entry limit as tables are
    // added; carrying them as one JSON value breached the 124-byte limit at
    // eleven tables. Neither is survivable, so only four headline counts go.
    final props = DriveClient.propertiesFromHeader(header(
      counts: {for (var i = 0; i < 40; i++) 'table_$i': i * 1000},
    ));
    expect(props.length, lessThanOrEqualTo(30));
    expect(props.length, lessThan(15));
  });

  test('no value exceeds the 124-byte limit at a realistic worst case', () {
    final props = DriveClient.propertiesFromHeader(header(
      counts: const {
        'habits': 40,
        'habit_logs': 999999,
        'habit_freezes': 1200,
        'routine_stacks': 5,
        'goals': 60,
        'goal_milestones': 400,
        'goal_links': 200,
        'tasks': 9000,
        'focus_sessions': 5000,
        'badges': 16,
        'settings': 20,
      },
    ));

    for (final entry in props.entries) {
      expect(entry.value.length, lessThanOrEqualTo(124),
          reason: '${entry.key} would be rejected by Drive');
    }
    expect(props.length, lessThanOrEqualTo(30));
  });

  test('a very long device label cannot breach the value limit', () {
    // Android device names are user-settable and can be arbitrarily long.
    final props =
        DriveClient.propertiesFromHeader(header(device: 'x' * 500));
    expect(props['device']!.length, lessThanOrEqualTo(124));
  });

  test('a backup with no logs round-trips without inventing dates', () {
    final props =
        DriveClient.propertiesFromHeader(header(first: null, last: null));
    final back = DriveClient.headerFromProperties(props)!;

    expect(back.firstLogDate, isNull);
    expect(back.lastLogDate, isNull);
  });

  test('a file with no metadata at all yields no preview', () {
    // Uploaded by a version that did not write appProperties. The file is still
    // downloadable and carries its real header inside; only the preview is lost.
    expect(DriveClient.headerFromProperties(null), isNull);
  });

  test('garbage values degrade to defaults rather than crashing the list', () {
    // One unreadable file must not take the whole backup list down with it.
    final back = DriveClient.headerFromProperties(const {
      'created': 'not a number',
      'sv': 'nonsense',
      'n_log': 'also nonsense',
    });

    expect(back, isNotNull);
    expect(back!.createdAt, 0);
    expect(back.schemaVersion, 0);
    expect(back.deviceLabel, 'Unknown device');
    expect(back.counts['habit_logs'], 0);
  });

  test('the scope requested is the narrowest one that can hold a backup', () {
    // Not `drive.file`, and certainly not `drive`. appdata files are invisible
    // in the user's Drive and give the app no access to anything else in it.
    expect(DriveClient.driveAppDataScope,
        'https://www.googleapis.com/auth/drive.appdata');
  });
}
