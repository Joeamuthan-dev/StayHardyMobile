import 'civil_date.dart';

/// One encouraging line a day.
///
/// **Why not notifications.** A push that says "you've got this" is an
/// interruption charging the user for the privilege of being motivated, and it
/// is the fastest way to get an app muted. These appear only where someone has
/// already chosen to look — the home screen, and the moment a day is finished.
///
/// **Why the day picks it, not chance.** `Random` would hand out a new line on
/// every rebuild, so scrolling would shuffle it and the line would read as
/// decoration. One line per calendar day makes it a thing the user can
/// remember, mention, and come back to.
class DailyQuote {
  const DailyQuote(this.line, this.attribution);

  final String line;

  /// Null for the unattributed lines. Never invented — a made-up attribution is
  /// worse than none, and these get screenshotted.
  final String? attribution;

  /// Lines for an ordinary day.
  ///
  /// One subject only: consistency and discipline. Nothing about luck, talent
  /// or destiny — this app's whole argument is that showing up is the variable
  /// you control, and a quote about fortune contradicts the product.
  ///
  /// Kept short on purpose. These are read in one glance at the end of a
  /// screen; anything longer than a breath gets scrolled past.
  ///
  /// **Attributions are real or absent.** Most of the best lines in this genre
  /// circulate misattributed to Aristotle, Einstein or Aurelius. Where the
  /// source is not certain the line runs unattributed rather than borrowing a
  /// famous name — these get screenshotted, and a fake citation is the kind of
  /// error that outlives the app.
  static const _daily = <DailyQuote>[
    // — the core argument -------------------------------------------------
    DailyQuote('Discipline equals freedom.', 'Jocko Willink'),
    DailyQuote(
        'You do not rise to your goals. You fall to your systems.',
        'James Clear'),
    DailyQuote('Motivation gets you started. Habit keeps you going.',
        'Jim Rohn'),
    DailyQuote(
        'Success is small efforts repeated day in and day out.',
        'Robert Collier'),
    DailyQuote('Excellence is not an act, but a habit.', 'Will Durant'),
    DailyQuote('Improve 1% a day and you are 37 times better in a year.', null),

    // — showing up ---------------------------------------------------------
    DailyQuote('The day you do not feel like it is the day that counts.', null),
    DailyQuote('Show up before you feel ready. Readiness follows.', null),
    DailyQuote('Do it badly rather than not at all.', null),
    DailyQuote('Start again. That is the whole skill.', null),
    DailyQuote('Two minutes today beats an hour next week.', null),
    DailyQuote('Turning up is most of it.', null),

    // — the chain ----------------------------------------------------------
    DailyQuote('Do not break the chain.', null),
    DailyQuote('One missed day is a gap. Two is a new habit.', null),
    DailyQuote('Never miss twice.', null),
    DailyQuote('Protect the streak on the bad days. Anyone can do good ones.',
        null),
    DailyQuote('Consistency turns effort into identity.', null),

    // — patience -----------------------------------------------------------
    DailyQuote('Slow progress is still progress. Stopping is not.', null),
    DailyQuote('Boring days build everything.', null),
    DailyQuote('Nothing changes on day three. Everything changes by day ninety.',
        null),
    DailyQuote('You will not notice it working until it already has.', null),
    DailyQuote('Trust the average of your days.', null),

    // — choosing -----------------------------------------------------------
    DailyQuote('Discipline is choosing what you want most over what you want '
        'now.', null),
    DailyQuote('Every choice is a vote for who you are becoming.', null),
    DailyQuote('Decide once. Then stop negotiating with yourself.', null),
    DailyQuote('The hard way is the short way.', null),
    DailyQuote('Comfort is expensive.', null),

    // — the quiet work -----------------------------------------------------
    DailyQuote('The work nobody claps for is the work that counts.', null),
    DailyQuote('Standards, not feelings.', null),
    DailyQuote('Be the person who does what they said they would.', null),
    DailyQuote('Nobody is coming. That is the good news.', null),
    DailyQuote('Do today what you will be glad you did a year from now.', null),
    DailyQuote('Consistency is what turns average into permanent.', null),
    DailyQuote('Your habits are your future, arriving slowly.', null),
  ];

  /// Lines for a day where everything got done. Earned, so they can be warmer.
  static const _finished = <DailyQuote>[
    DailyQuote('Every habit done. That is the whole game.', null),
    DailyQuote('A perfect day. Nobody had to see it for it to count.', null),
    DailyQuote('This is what the good years are made of.', null),
    DailyQuote('You kept the promise you made to yourself.', null),
    DailyQuote('Done. Rest properly — you earned it.', null),
  ];

  /// The line for [date], stable for the whole day.
  static DailyQuote forDay(CivilDate date, {bool dayComplete = false}) {
    final pool = dayComplete ? _finished : _daily;
    // Ordinal days since an arbitrary epoch, so the sequence walks forward one
    // line per day rather than jumping around.
    final ordinal = date.year * 372 + date.month * 31 + date.day;
    return pool[ordinal % pool.length];
  }
}
