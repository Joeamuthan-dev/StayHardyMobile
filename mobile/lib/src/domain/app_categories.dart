/// Sorting installed apps into buckets, so screen time can say something more
/// useful than a total.
///
/// ## The honesty problem, and how this resolves it
///
/// The previous design refused to classify at all, on the grounds that "a
/// default list of distracting apps would call someone's livelihood a
/// distraction — the same app is doom scrolling for one person and their job
/// for another." That is a real objection and it is still true.
///
/// It is answered here by three rules rather than by refusing to be useful:
///
/// 1. **A default classification is a guess, and is labelled as one.** Every
///    app shows its bucket and every bucket is one tap from being changed.
/// 2. **The user's override always wins and is permanent.** [categorise] takes
///    the override map first and never re-guesses an app the user has ruled on.
/// 3. **No bucket is called bad.** The axis is [UsageIntent] — time *invested*
///    versus time *spent on yourself* — and a day of leisure is not a failure.
///    Nothing in this file produces a scold.
///
/// The classification is a heuristic over package names. It will be wrong about
/// somebody's job. That is acceptable precisely because rule 2 exists.
library;

/// What a bucket of time is for.
enum UsageIntent {
  /// Time that compounds — work, study, training, money, making things.
  invested,

  /// Genuinely ambiguous. Messaging is the whole reason this value exists:
  /// it is a work tool and a social one in the same minute, and forcing it
  /// either way would make the headline number a lie.
  neutral,

  /// Time spent on yourself. Not wasted, not judged — but it is the bucket
  /// people are usually surprised by, which is the point of showing it.
  leisure,

  /// The phone being a phone: launcher, settings, dialler, keyboard.
  /// Excluded from every ratio; counting the launcher as productivity (or as
  /// leisure) would move the score for reasons the user never chose.
  system,
}

/// A bucket.
class UsageCategory {
  const UsageCategory({
    required this.id,
    required this.label,
    required this.intent,
    required this.blurb,
  });

  /// Stable key. Persisted in overrides and used to look up the hue in
  /// `AuraTokens.usage` — never renamed once shipped.
  final String id;

  final String label;
  final UsageIntent intent;

  /// One line explaining what lands here, shown when the user is choosing.
  final String blurb;

  static const productivity = UsageCategory(
    id: 'productivity',
    label: 'Productivity',
    intent: UsageIntent.invested,
    blurb: 'Docs, mail, calendar, notes, project tools',
  );
  static const learning = UsageCategory(
    id: 'learning',
    label: 'Learning',
    intent: UsageIntent.invested,
    blurb: 'Courses, languages, study apps',
  );
  static const creation = UsageCategory(
    id: 'creation',
    label: 'Creating',
    intent: UsageIntent.invested,
    blurb: 'Design, code, editing, writing',
  );
  static const health = UsageCategory(
    id: 'health',
    label: 'Health',
    intent: UsageIntent.invested,
    blurb: 'Training, tracking, meditation, sleep',
  );
  static const finance = UsageCategory(
    id: 'finance',
    label: 'Money',
    intent: UsageIntent.invested,
    blurb: 'Banking, payments, investing',
  );
  static const reading = UsageCategory(
    id: 'reading',
    label: 'Reading',
    intent: UsageIntent.invested,
    blurb: 'Books, long-form, news',
  );

  static const communication = UsageCategory(
    id: 'communication',
    label: 'Messaging',
    intent: UsageIntent.neutral,
    blurb: 'Chat and calls — work and personal at once',
  );
  static const other = UsageCategory(
    id: 'other',
    label: 'Other',
    intent: UsageIntent.neutral,
    blurb: 'Not classified yet',
  );

  static const social = UsageCategory(
    id: 'social',
    label: 'Social',
    intent: UsageIntent.leisure,
    blurb: 'Feeds, stories, short video',
  );
  static const entertainment = UsageCategory(
    id: 'entertainment',
    label: 'Entertainment',
    intent: UsageIntent.leisure,
    blurb: 'Video, music, streaming',
  );
  static const games = UsageCategory(
    id: 'games',
    label: 'Games',
    intent: UsageIntent.leisure,
    blurb: 'Anything you play',
  );
  static const shopping = UsageCategory(
    id: 'shopping',
    label: 'Shopping',
    intent: UsageIntent.leisure,
    blurb: 'Retail, food delivery, marketplaces',
  );

  static const utility = UsageCategory(
    id: 'utility',
    label: 'System',
    intent: UsageIntent.system,
    blurb: 'Launcher, settings, dialler, keyboard',
  );

  /// Every bucket, in the order they are offered to the user.
  static const all = <UsageCategory>[
    productivity,
    creation,
    learning,
    health,
    finance,
    reading,
    communication,
    social,
    entertainment,
    games,
    shopping,
    utility,
    other,
  ];

  static UsageCategory byId(String? id) {
    for (final c in all) {
      if (c.id == id) return c;
    }
    return other;
  }

  /// The buckets a user may assign by hand.
  ///
  /// [other] is excluded: it means "we have not decided", and letting someone
  /// deliberately choose it would make an override indistinguishable from a
  /// missing one.
  static List<UsageCategory> get assignable =>
      all.where((c) => c.id != other.id).toList();
}

/// Package name → bucket.
abstract final class AppTaxonomy {
  /// Exact package matches. Checked before any keyword rule, because
  /// `com.google.android.youtube` must not be caught by the `google` → tools
  /// heuristic, and `com.instagram.android` must not be read as a camera app.
  ///
  /// Weighted towards what is actually installed in India, since that is where
  /// the userbase is — a table full of US-only apps would classify almost
  /// nothing and the whole feature would sit at "Other".
  static const _exact = <String, UsageCategory>{
    // --- social ---------------------------------------------------------
    'com.instagram.android': UsageCategory.social,
    'com.instagram.lite': UsageCategory.social,
    'com.facebook.katana': UsageCategory.social,
    'com.facebook.lite': UsageCategory.social,
    'com.zhiliaoapp.musically': UsageCategory.social, // TikTok
    'com.ss.android.ugc.trill': UsageCategory.social,
    'com.snapchat.android': UsageCategory.social,
    'com.twitter.android': UsageCategory.social,
    'com.x.android': UsageCategory.social,
    'com.reddit.frontpage': UsageCategory.social,
    'com.pinterest': UsageCategory.social,
    'com.linkedin.android': UsageCategory.social,
    'com.google.android.apps.youtube.creator': UsageCategory.social,
    'sharechat.videoapp': UsageCategory.social,
    'in.mohalla.sharechat': UsageCategory.social,
    'com.moj.core': UsageCategory.social,
    'com.threads.android': UsageCategory.social,
    'com.bereal.ft': UsageCategory.social,
    'app.bsky': UsageCategory.social,

    // --- entertainment --------------------------------------------------
    'com.google.android.youtube': UsageCategory.entertainment,
    'com.google.android.apps.youtube.music': UsageCategory.entertainment,
    'com.google.android.youtube.tv': UsageCategory.entertainment,
    'com.netflix.mediaclient': UsageCategory.entertainment,
    'com.amazon.avod.thirdpartyclient': UsageCategory.entertainment,
    'in.startv.hotstar': UsageCategory.entertainment,
    'in.startv.hotstar.dplus': UsageCategory.entertainment,
    'com.jio.jioplay.tv': UsageCategory.entertainment,
    'com.jiocinema': UsageCategory.entertainment,
    'com.spotify.music': UsageCategory.entertainment,
    'com.gaana': UsageCategory.entertainment,
    'com.bsbportal.music': UsageCategory.entertainment, // Wynk
    'com.jio.media.jiobeats': UsageCategory.entertainment,
    'com.sonyliv': UsageCategory.entertainment,
    'com.zee5.app': UsageCategory.entertainment,
    'com.tubitv': UsageCategory.entertainment,
    'com.disney.disneyplus': UsageCategory.entertainment,
    'tv.twitch.android.app': UsageCategory.entertainment,

    // --- productivity ---------------------------------------------------
    'com.google.android.gm': UsageCategory.productivity,
    'com.google.android.apps.docs': UsageCategory.productivity,
    'com.google.android.apps.docs.editors.docs': UsageCategory.productivity,
    'com.google.android.apps.docs.editors.sheets': UsageCategory.productivity,
    'com.google.android.apps.docs.editors.slides': UsageCategory.productivity,
    'com.google.android.calendar': UsageCategory.productivity,
    'com.google.android.keep': UsageCategory.productivity,
    'com.google.android.apps.tasks': UsageCategory.productivity,
    'com.microsoft.office.outlook': UsageCategory.productivity,
    'com.microsoft.office.word': UsageCategory.productivity,
    'com.microsoft.office.excel': UsageCategory.productivity,
    'com.microsoft.office.powerpoint': UsageCategory.productivity,
    'com.microsoft.todos': UsageCategory.productivity,
    'com.microsoft.teams': UsageCategory.productivity,
    'com.notion.id': UsageCategory.productivity,
    'com.todoist': UsageCategory.productivity,
    'com.ticktick.task': UsageCategory.productivity,
    'com.evernote': UsageCategory.productivity,
    'md.obsidian': UsageCategory.productivity,
    'com.trello': UsageCategory.productivity,
    'com.asana.app': UsageCategory.productivity,
    'com.atlassian.android.jira.core': UsageCategory.productivity,
    'com.linear': UsageCategory.productivity,
    'us.zoom.videomeetings': UsageCategory.productivity,
    'com.google.android.apps.meetings': UsageCategory.productivity,
    'com.anthropic.claude': UsageCategory.productivity,
    'com.openai.chatgpt': UsageCategory.productivity,
    'com.google.android.apps.bard': UsageCategory.productivity,
    'com.stayhardy.app': UsageCategory.productivity,

    // --- creating -------------------------------------------------------
    'com.figma.mirror': UsageCategory.creation,
    'com.canva.editor': UsageCategory.creation,
    'com.adobe.lrmobile': UsageCategory.creation,
    'com.adobe.psmobile': UsageCategory.creation,
    'com.adobe.premiereclip': UsageCategory.creation,
    'com.github.android': UsageCategory.creation,
    'com.termux': UsageCategory.creation,
    'com.google.android.apps.photosgo': UsageCategory.creation,
    'com.instagram.boomerang': UsageCategory.creation,
    'com.lightricks.videoleap': UsageCategory.creation,
    'com.videoeditor.capcut': UsageCategory.creation,
    'com.lemon.lvoverseas': UsageCategory.creation, // CapCut

    // --- learning -------------------------------------------------------
    'com.duolingo': UsageCategory.learning,
    'org.coursera.android': UsageCategory.learning,
    'com.udemy.android': UsageCategory.learning,
    'com.khanacademy.android': UsageCategory.learning,
    'org.khanacademy.android': UsageCategory.learning,
    'com.byjus.thelearningapp': UsageCategory.learning,
    'com.unacademyapp': UsageCategory.learning,
    'com.physicswallah.app': UsageCategory.learning,
    'com.anki.android': UsageCategory.learning,
    'com.ichi2.anki': UsageCategory.learning,
    'com.brilliant.android': UsageCategory.learning,
    'com.sololearn': UsageCategory.learning,

    // --- health ---------------------------------------------------------
    'com.google.android.apps.fitness': UsageCategory.health,
    'com.fitbit.FitbitMobile': UsageCategory.health,
    'com.strava': UsageCategory.health,
    'com.myfitnesspal.android': UsageCategory.health,
    'com.nike.ntc': UsageCategory.health,
    'com.headspace.android': UsageCategory.health,
    'com.calm.android': UsageCategory.health,
    'com.getsomeheadspace.android': UsageCategory.health,
    'cure.fit.app': UsageCategory.health,
    'com.cure.fit': UsageCategory.health,
    'com.samsung.android.app.shealth': UsageCategory.health,
    'com.sleepcycle.sleepanalysis': UsageCategory.health,

    // --- money ----------------------------------------------------------
    'com.phonepe.app': UsageCategory.finance,
    'net.one97.paytm': UsageCategory.finance,
    'com.google.android.apps.nbu.paisa.user': UsageCategory.finance, // GPay
    'in.org.npci.upiapp': UsageCategory.finance, // BHIM
    'com.dreamplug.androidapp': UsageCategory.finance, // CRED
    'in.zerodha.kite3': UsageCategory.finance,
    'com.zerodha.kite3': UsageCategory.finance,
    'com.msf.angelmobile': UsageCategory.finance,
    'in.groww.app': UsageCategory.finance,
    'com.grow.grow': UsageCategory.finance,
    'com.sbi.lotusintouch': UsageCategory.finance,
    'com.snapwork.hdfc': UsageCategory.finance,
    'com.csam.icici.bank.imobile': UsageCategory.finance,
    'com.axis.mobile': UsageCategory.finance,
    'com.paypal.android.p2pmobile': UsageCategory.finance,

    // --- reading --------------------------------------------------------
    'com.amazon.kindle': UsageCategory.reading,
    'com.google.android.apps.books': UsageCategory.reading,
    'com.medium.reader': UsageCategory.reading,
    'com.google.android.apps.magazines': UsageCategory.reading,
    'com.ycombinator.hackernews': UsageCategory.reading,
    'flipboard.app': UsageCategory.reading,
    'com.audible.application': UsageCategory.reading,
    'in.inshorts.android': UsageCategory.reading,
    'com.pocket.app': UsageCategory.reading,

    // --- messaging ------------------------------------------------------
    'com.whatsapp': UsageCategory.communication,
    'com.whatsapp.w4b': UsageCategory.communication,
    'org.telegram.messenger': UsageCategory.communication,
    'com.facebook.orca': UsageCategory.communication,
    'com.discord': UsageCategory.communication,
    'com.Slack': UsageCategory.communication,
    'org.thoughtcrime.securesms': UsageCategory.communication, // Signal
    'com.google.android.apps.messaging': UsageCategory.communication,
    'com.samsung.android.messaging': UsageCategory.communication,
    'com.skype.raider': UsageCategory.communication,
    'com.viber.voip': UsageCategory.communication,
    'com.hike.chat.stickers': UsageCategory.communication,

    // --- shopping -------------------------------------------------------
    'in.amazon.mShop.android.shopping': UsageCategory.shopping,
    'com.amazon.mShop.android.shopping': UsageCategory.shopping,
    'com.flipkart.android': UsageCategory.shopping,
    'com.myntra.android': UsageCategory.shopping,
    'com.ajio.stores': UsageCategory.shopping,
    'in.swiggy.android': UsageCategory.shopping,
    'com.application.zomato': UsageCategory.shopping,
    'com.grofers.customerapp': UsageCategory.shopping, // Blinkit
    'com.zeptoconsumerapp': UsageCategory.shopping,
    'com.bigbasket.mobileapp': UsageCategory.shopping,
    'com.nykaa.android': UsageCategory.shopping,
    'com.meesho.supply': UsageCategory.shopping,
    'com.ubercab': UsageCategory.shopping,
    'com.olacabs.customer': UsageCategory.shopping,
    'com.rapido.passenger': UsageCategory.shopping,

    // --- system ---------------------------------------------------------
    'com.android.settings': UsageCategory.utility,
    'com.android.systemui': UsageCategory.utility,
    'com.android.dialer': UsageCategory.utility,
    'com.google.android.dialer': UsageCategory.utility,
    'com.android.contacts': UsageCategory.utility,
    'com.google.android.contacts': UsageCategory.utility,
    'com.android.camera': UsageCategory.utility,
    'com.google.android.GoogleCamera': UsageCategory.utility,
    'com.android.chrome': UsageCategory.utility,
    'com.google.android.googlequicksearchbox': UsageCategory.utility,
    'com.google.android.inputmethod.latin': UsageCategory.utility,
    'com.google.android.apps.nexuslauncher': UsageCategory.utility,
    'com.sec.android.app.launcher': UsageCategory.utility,
    'com.miui.home': UsageCategory.utility,
    'com.google.android.apps.maps': UsageCategory.utility,
    'com.android.vending': UsageCategory.utility, // Play Store
    'com.google.android.gms': UsageCategory.utility,
    'com.android.permissioncontroller': UsageCategory.utility,
  };

  /// Substring rules, applied in order when no exact match exists.
  ///
  /// Order is load-bearing: `game` before `com.google` would misfile Google
  /// apps, and `launcher` must beat everything so a skinned OEM home screen is
  /// never counted as real usage.
  static const _keywords = <(String, UsageCategory)>[
    ('launcher', UsageCategory.utility),
    ('.home', UsageCategory.utility),
    ('systemui', UsageCategory.utility),
    ('inputmethod', UsageCategory.utility),
    ('keyboard', UsageCategory.utility),
    ('settings', UsageCategory.utility),
    ('.dialer', UsageCategory.utility),
    ('packageinstaller', UsageCategory.utility),

    ('game', UsageCategory.games),
    ('.games.', UsageCategory.games),
    ('playgames', UsageCategory.games),
    ('ludo', UsageCategory.games),
    ('pubg', UsageCategory.games),
    ('battlegrounds', UsageCategory.games),
    ('freefire', UsageCategory.games),
    ('dream11', UsageCategory.games),
    ('rummy', UsageCategory.games),
    ('casino', UsageCategory.games),

    ('bank', UsageCategory.finance),
    ('upi', UsageCategory.finance),
    ('wallet', UsageCategory.finance),
    ('invest', UsageCategory.finance),
    ('trading', UsageCategory.finance),

    ('news', UsageCategory.reading),
    ('reader', UsageCategory.reading),
    ('ebook', UsageCategory.reading),
    ('podcast', UsageCategory.reading),

    ('messenger', UsageCategory.communication),
    ('.chat', UsageCategory.communication),
    ('.sms', UsageCategory.communication),
    ('.mms', UsageCategory.communication),
    ('.mail', UsageCategory.communication),

    ('music', UsageCategory.entertainment),
    ('video', UsageCategory.entertainment),
    ('player', UsageCategory.entertainment),
    ('.tv', UsageCategory.entertainment),
    ('stream', UsageCategory.entertainment),

    ('shop', UsageCategory.shopping),
    ('store', UsageCategory.shopping),

    ('fitness', UsageCategory.health),
    ('health', UsageCategory.health),
    ('workout', UsageCategory.health),
    ('meditat', UsageCategory.health),

    ('camera', UsageCategory.creation),
    ('photo', UsageCategory.creation),
    ('editor', UsageCategory.creation),

    ('learn', UsageCategory.learning),
    ('study', UsageCategory.learning),
    ('course', UsageCategory.learning),
    ('exam', UsageCategory.learning),

    ('office', UsageCategory.productivity),
    ('.docs', UsageCategory.productivity),
    ('calendar', UsageCategory.productivity),
    ('note', UsageCategory.productivity),
  ];

  /// Classify one package.
  ///
  /// [overrides] is the user's own map of package → category id and is checked
  /// **first**. Once someone has said what an app is, this function must never
  /// contradict them — not on a new install, not after a table update.
  static UsageCategory categorise(
    String packageName, {
    Map<String, String> overrides = const {},
  }) {
    final override = overrides[packageName];
    if (override != null) return UsageCategory.byId(override);

    final exact = _exact[packageName];
    if (exact != null) return exact;

    final lower = packageName.toLowerCase();
    for (final (needle, category) in _keywords) {
      if (lower.contains(needle)) return category;
    }
    return UsageCategory.other;
  }

  /// Whether [categorise] would be guessing rather than reading a rule.
  ///
  /// Drives the "we guessed — is this right?" prompt: there is no point asking
  /// the user to confirm apps the table already knows for certain.
  static bool isGuess(
    String packageName, {
    Map<String, String> overrides = const {},
  }) {
    if (overrides.containsKey(packageName)) return false;
    return !_exact.containsKey(packageName);
  }
}
