/// When the app may ask for a Play Store rating, and when it may point at an
/// update — the two politeness problems every app eventually mishandles.
///
/// The rating rules are the owner's: never before three CONSECUTIVE days of
/// actually opening the app, never more than once a month, and never more
/// than three times ever — the Play dialog cannot tell us "they rated", so a
/// lifetime cap is what "stop once they rated" degrades to gracefully.
/// (Google's own quota also suppresses over-asking, but relying on someone
/// else's throttle to be polite is not a policy.)
library;

abstract final class ReviewRules {
  static const consecutiveDaysNeeded = 3;
  static const askInterval = Duration(days: 30);
  static const maxLifetimeAsks = 3;
  static const updateCheckInterval = Duration(days: 1);

  /// The new streak after an app open on [todayIso], given the previous open
  /// day and streak. Same-day reopens don't move it; a missed day resets it.
  static int streakAfterOpen({
    required String? lastOpenIso,
    required String? yesterdayIso,
    required String todayIso,
    required int streak,
  }) {
    if (lastOpenIso == todayIso) return streak < 1 ? 1 : streak;
    if (lastOpenIso == yesterdayIso) return streak + 1;
    return 1;
  }

  static bool shouldAskReview({
    required int streak,
    required int? lastAskedMs,
    required int askCount,
    required int nowMs,
  }) {
    if (streak < consecutiveDaysNeeded) return false;
    if (askCount >= maxLifetimeAsks) return false;
    if (lastAskedMs != null &&
        nowMs - lastAskedMs < askInterval.inMilliseconds) {
      return false;
    }
    return true;
  }

  static bool shouldCheckUpdate({
    required int? lastCheckMs,
    required int nowMs,
  }) {
    return lastCheckMs == null ||
        nowMs - lastCheckMs >= updateCheckInterval.inMilliseconds;
  }
}
