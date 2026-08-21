/// A calendar date with no time and no zone — "the 14th of August", not an
/// instant.
///
/// Backed by a UTC [DateTime] purely as a calendar, never as a moment. All
/// arithmetic therefore happens in a zone with no DST, which removes the entire
/// class of bug the previous app worked around with
/// `new Date(t - offset*60000).toISOString()`. That trick silently produces the
/// wrong day around midnight and across DST transitions; it stayed invisible
/// only because most users are in IST, which has no DST. The paid challenge
/// settles money on day boundaries, so it cannot stay invisible.
extension type const CivilDate._(DateTime _d) implements Object {
  factory CivilDate(int year, int month, int day) =>
      CivilDate._(DateTime.utc(year, month, day));

  /// Today in the device's local zone, captured as a calendar date.
  factory CivilDate.today([DateTime? now]) {
    final n = now ?? DateTime.now();
    return CivilDate(n.year, n.month, n.day);
  }

  /// Parses 'YYYY-MM-DD'. Tolerates a longer ISO string by taking the date part,
  /// because some legacy rows stored a full timestamp where a date was expected.
  factory CivilDate.parse(String s) {
    final t = s.length > 10 ? s.substring(0, 10) : s;
    final parts = t.split('-');
    if (parts.length != 3) {
      throw FormatException('Not a civil date: "$s"');
    }
    return CivilDate(
      int.parse(parts[0]),
      int.parse(parts[1]),
      int.parse(parts[2]),
    );
  }

  int get year => _d.year;
  int get month => _d.month;
  int get day => _d.day;

  /// 0 = Sunday .. 6 = Saturday, matching the [weekdayMask] bit layout.
  ///
  /// Deliberately NOT Dart's `DateTime.weekday`, which is 1 = Monday .. 7 =
  /// Sunday. Mixing the two is the single easiest way to shift every schedule
  /// by a day.
  int get dow => _d.weekday % 7;

  /// Bit for this day within a weekday mask.
  int get dowBit => 1 << dow;

  CivilDate addDays(int n) => CivilDate._(_d.add(Duration(days: n)));

  /// Whole days from this date to [other]; negative if [other] is earlier.
  int daysUntil(CivilDate other) => other._d.difference(_d).inDays;

  bool isBefore(CivilDate other) => _d.isBefore(other._d);
  bool isAfter(CivilDate other) => _d.isAfter(other._d);
  bool isAtOrBefore(CivilDate other) => !isAfter(other);
  bool isAtOrAfter(CivilDate other) => !isBefore(other);

  /// Start of the week containing this date, given a week-start day
  /// (0 = Sunday, 1 = Monday).
  CivilDate startOfWeek(int weekStartDow) {
    final delta = (dow - weekStartDow + 7) % 7;
    return addDays(-delta);
  }

  CivilDate startOfMonth() => CivilDate(year, month, 1);

  CivilDate endOfMonth() => month == 12
      ? CivilDate(year, 12, 31)
      : CivilDate(year, month + 1, 1).addDays(-1);

  /// 'YYYY-MM-DD'. The on-disk and in-backup representation.
  String get iso {
    final m = month.toString().padLeft(2, '0');
    final d = day.toString().padLeft(2, '0');
    return '$year-$m-$d';
  }
}

/// Ordering helper — extension types don't get [Comparable] for free.
int compareCivil(CivilDate a, CivilDate b) => a.iso.compareTo(b.iso);
