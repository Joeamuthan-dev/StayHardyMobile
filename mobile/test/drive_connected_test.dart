import 'package:flutter_test/flutter_test.dart';
import 'package:stayhardy/src/backup/drive_client.dart';

/// What "connected" is allowed to mean.
///
/// This screen once showed "Drive connected." directly above a card saying the
/// backup was not switched on, with a CONNECT button underneath — because two
/// different sources were being asked the same question and one of them was a
/// local cache that lagged behind the grant it was reporting on.
///
/// The rule the fix encodes: only an authorisation problem revokes a
/// connection. Everything else is a connected account having a bad minute.
void main() {
  bool revokes(DriveFailure f) =>
      f == DriveFailure.notAuthorised ||
      f == DriveFailure.noAccount ||
      f == DriveFailure.notConfigured;

  test('losing the network does not lose the connection', () {
    // Flight mode sending someone back to a CONNECT button, for an account
    // that is still perfectly connected, is the same contradiction from the
    // other direction.
    expect(revokes(DriveFailure.network), isFalse);
  });

  test('a rejected request does not lose the connection either', () {
    expect(revokes(DriveFailure.rejected), isFalse);
  });

  test('only an authorisation problem sends you back to CONNECT', () {
    expect(revokes(DriveFailure.notAuthorised), isTrue);
    expect(revokes(DriveFailure.noAccount), isTrue);
    expect(revokes(DriveFailure.notConfigured), isTrue);
  });

  test('the revoking set is exhaustive over the enum', () {
    // If a new failure kind is added, this test forces a decision about which
    // side of the line it falls on rather than letting it default.
    final decided = {
      for (final f in DriveFailure.values) f: revokes(f),
    };
    expect(decided.length, DriveFailure.values.length);
    expect(decided.values.where((v) => v).length, 3);
  });
}
