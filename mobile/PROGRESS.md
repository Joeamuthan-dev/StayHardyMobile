# StayHardy 2.0 — Build Progress

Persistent checkpoint. **Read this first** when resuming after a context reset.
Plan of record: `~/.claude/plans/for-the-pro-versus-temporal-nova.md`

Working dir: `/Users/joeamuthan/Music/StayHardy/mobile`
Build env: `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`

## Verify loop (run after every change)

```
cd /Users/joeamuthan/Music/StayHardy/mobile
flutter analyze && flutter test
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
flutter build apk --debug
~/Library/Android/sdk/platform-tools/adb install -r build/app/outputs/flutter-apk/app-debug.apk
```

Emulator: `flutter emulators --launch Pixel_9`. `adb` is **not** on PATH — use
`~/Library/Android/sdk/platform-tools/adb`. Screenshot:
`adb shell screencap -p /sdcard/s.png && adb pull /sdcard/s.png /tmp/s.png`.

## Locked decisions (do not relitigate)

- Free = 7 habits max, existing users **grandfathered**; Pro = unlimited + insights + screen time + focus + full history
- Challenge is independent of Pro; monthly 30-day cohorts; Razorpay + RazorpayX
- Auth: Google Sign-In primary, legacy PIN (`'SH' + pin`) kept indefinitely with a link-Google nudge
- Same package `com.stayhardy.app`, same keystore, versionCode **26+** (Capacitor bridge shipped 25), minSdk 24
- Design = **"Aura"**: near-black ground, **lime** (`#C4F14B`) brand gradient with **dark text
  on it**, sky blue for measured data, Inter only, elevated cards over hairlines. Replaced
  "Monolith" (brass + Fraunces serif + hairlines) on 19 Aug 2026, then the violet first pass on
  20 Aug. Lime rather than a new colour: the live React app already ships `--accent-stitch:
  #BBFF00`. Light mode drops to deep olive `#4F7A12` — lime is unreadable on white.
  Four bottom tabs (Home / Habits / Plan / Stats); Settings is a header gear, not a tab.
  Stats = Progress | Insights. There is no "Coach" — the advisor is a screen called **Ask**.
- One canonical strict streak algorithm; earned badges never revoked
- `android:allowBackup="false"` in both apps

## Done

- **Bridge release** (Capacitor 1.1.14 / vc25) — copies `routine_order_*`, theme, language,
  and the Supabase session from secure storage into Capacitor Preferences so Flutter can read
  them. Built + signed. **NOT YET UPLOADED TO PLAY** — needs device verification first.
- **Flutter scaffold** — `com.stayhardy.app`, minSdk 24, target 36, v2.0.0+26, release signing
  wired to the existing keystore, deep links carried over, `allowBackup=false`
- **Monolith design system** — `lib/src/theme/`: tokens (incl. `onAccent`, 16 category hues,
  heat ramp), typography (variable-font axes), theme, categories
- **Theme guard test** — `test/theme_tokens_test.dart` fails the build on any hardcoded
  `Color(0x…)` / `Colors.*` / `fontFamily:` outside the three theme files
- **Drift schema** — 17 tables, partial indexes, WAL, FK on. `EXPLAIN QUERY PLAN` tests assert
  the streak walk and heatmap hit their indexes
- **Streak engine** — period-based; one algorithm covers daily / weekdays / X-per-week /
  every-N-days, plus freezes. `CivilDate` does UTC-backed civil-date arithmetic (DST-safe)
- **Habits screen** — live Drift data, toggle, archive, create sheet
- **Home + Goals screens + tab shell** — `IndexedStack`, typographic tabs
- **Goal progress derived** from milestones or linked habits (fixes the always-0 bug)
- **Migration engine** — `lib/src/migration/`: pure mappers + resumable keyset state machine.
  Handles mixed camel/snake columns, 3 spellings of "completed", timestamps in date columns,
  orphaned logs, duplicate habit-days, corrupt marker, mid-run failure + resume
- **Legacy prefs bridge** — `LegacyPrefsBridge.kt` + `legacy_prefs.dart` reads the
  `CapacitorStorage` SharedPreferences the bridge release wrote (`_cap_` prefixed): Supabase
  session, habit order, theme. Session keys are deleted immediately after recovery
- **Tasks / planner** — grouped overdue / today / upcoming / no-date / done-today, swipe to
  delete, priority, relative dates
- **Settings** — theme mode (system/dark/light) persisted to the settings table and verified
  to survive restart; live library counts
- **Stats** — real heatmap from `habit_logs`, completion rates, streaks over a fixed 400-day
  window (NOT the display range), category breakdown, best-weekday insight with a minimum-data
  guard. `showcase/stats_showcase.dart` deleted
- **Shared UI** — `lib/src/ui/`: `AppButton` (3 variants, respects disabled), `CheckRing`,
  `ProgressRule`, `LoadingView`/`EmptyView`/`ErrorView`. `Dimens` + `Alphas` tokens added
- **6-tab shell** — Home · Habits · Tasks · Goals · Stats · You
- **Home redesign** — hero `ProgressRing`, 3-up stat strip, category icons, inline check-off,
  overdue section, mini goal rings. The first pass read as a notepad; this gives the screen a
  focal point
- **Home-screen widget** — the four Java `RemoteViews` classes copied verbatim (class names and
  `ComponentName`s are load-bearing), `WidgetContract` extracted from the Capacitor plugin,
  `WidgetBridge.kt` + `widget_service.dart` write the exact 7-field JSON. **Verified on device:
  prefs written, both providers registered.** `home_widget` package deliberately NOT used — it
  writes to a different prefs file and would blank every placed widget
- **Reminders** — `flutter_local_notifications`, per-habit weekly schedules following the
  habit's own weekday mask, `tz`-based DST-safe scheduling, boot receiver, exact-alarm request
  with honest inexact fallback, and a Settings diagnostics section (permission / exact timing /
  scheduled count) so "my reminders don't fire" has a real answer.
  **Required `isCoreLibraryDesugaringEnabled` at minSdk 24** — java.time is missing on API 24

- **Boot gate + config** — `AppConfig` (all credentials via `--dart-define`, never committed),
  `BootGate` routes local-only → shell, migration-outstanding → restore screen,
  `MigrationScreen` with live progress and retry (deliberately no "skip")

### Verified

- `flutter analyze` clean · **315 tests passing** · debug + release APK build
- **Reorder + freezes verified on emulator-5554**: drag moved "Long run" 7 → 1, `sort_index`
  persisted densely 0..6 with every row dirty, and the Habits list + widget order followed.
  Freeze earning showed 11 banked across 7 seeded habits; forcing a real forward rollover
  (watermark set to yesterday, yesterday's log deleted) spent one freeze, wrote a single
  `habit_freezes` row, held Meditate's streak at 19 instead of resetting it to 1, and surfaced
  "Streak saved. Meditate was covered on Friday."
- **Focus verified on emulator-5554**: schema migrated v1 → v2 in place; a 15-minute session
  went 14:37 → 12:50 across 1m47s that included **75 seconds with the process force-stopped**,
  proving the clock is wall-clock and not a tick counter; pause froze it at 14:29 across 45s of
  wall time; finish-early banked `actual_seconds = 79` with `interruptions = 1`,
  `completed = 0`, and the 76-second pause correctly excluded
- **Weekly review verified on emulator-5554** against 4 months of seeded history: 94%
  consistency, up 6 points, and four specific cards — "18-day streak at risk · Meditate has not
  been checked off in 2 days", "Best week yet for No sugar (previous best 6)", "Deep work block:
  perfect week", "Close 1 Loan is behind · 0% done with 56% of the time gone". Two wins, two
  risks. Today's focus session correctly excluded from a week that ends yesterday
- **Badges verified on emulator-5554**: first evaluation awarded 6 badges (streak_7…100 from a
  121-day best streak, volume_100 from 329 check-ins) all pre-marked `popup_shown = 1` — no
  popup storm. Level 10, 5416 XP, "84 XP to level 11" (threshold 5500) agrees. `perfect_1`
  correctly NOT awarded at 78% completion. Share sheet opened with a real 1080×1350 PNG in the
  app cache, dark card while the app was in light mode; dismissed without sending
- **Screen time verified end to end on emulator-5554**: disclosure → `ACTION_USAGE_ACCESS_SETTINGS`
  opened with StayHardy listed "Not allowed" (proving the manifest entry grants nothing on its
  own) → granted → returned to the app, which collected 7 days of REAL usage. 12h 4m today,
  per-app StayHardy 10h 8m / Fintrackr 1h 14m / nexuslauncher 39m — the last with a null label,
  correctly falling back to its package name. Today flagged `is_partial = 1` and drawn in muted
  accent; earlier days settled. No correlation card at 2 days of data, as the guard requires
- **Backup verified on emulator-5554**: export produced a real 18,670-byte `.shbak` — `SHBK`
  magic, plaintext header readable without decompressing, 507 rows across 8 tables, counts
  matching the app's own "Your data" panel (10 habits / 427 check-ins / 33 tasks / 13 goals),
  and **no screen-time tables**, so the exclusion holds in a real export. Handed to the share
  sheet with the user choosing the destination. The picker then found the file and the restore
  preview read it and diffed it against the live database as a perfect no-op — 0 added,
  0 updated, 0 only-here — which is exactly right for restoring a backup onto the phone that
  made it. Drive shows "not switched on yet", as the boundary requires
- **Circles verified on emulator-5554**: the screen renders with its "WHAT OTHERS SEE" privacy
  card stating plainly that a circle exposes counts and a streak, never habit names. On a
  local-only build every network entry point returns a sentence rather than throwing, and the
  daily tally still computes offline. **Both migrations parse under the real Postgres parser
  (libpg_query, 11 + 31 statements); all four Edge Functions type-check clean.** Nothing has been
  applied or deployed to the live project — that is yours to run
- **Calendar + habit detail verified on emulator-5554**: August grid with the 1st correctly under
  Saturday, "10 of 15 days clean", days 1-15 painted and 16-31 left blank (a day that has not
  happened cannot have been missed), forward arrow disabled on the current month. Habit detail
  for "Long run" showed schedule "Sat", a 2-day streak, 11 best run / 14 check-ins / 76% all
  time, and **18 history cells** - one per Saturday over four months, confirming the per-period
  grid. NOT visually verified: the subtask editor and the updates/feedback screens - `adb input`
  cannot reliably produce a Flutter long-press, and the Supabase screens need a signed-in
  session the local-only verification build does not have. Both are covered by tests
- **Release APK signer SHA-256 `81d43bab…a53f` matches the Capacitor release exactly.**
  Same key + same applicationId + versionCode 26 > 25 = the in-place upgrade is sound.
  (Verify with `apksigner`, NOT `jarsigner` — jarsigner cannot read APK Signature Scheme
  v2/v3 and reports a false "jar is unsigned".)
- Release manifest: versionCode 26, minSdk 24, allowBackup false
- Theme switch verified on device: applies instantly, persists across restart, light mode
  correct on every screen

- **UI pass across all six screens** — shared `ProgressRing`, `StatStrip`, `SurfaceCard`,
  `StatusNote` in `lib/src/ui/`. Every screen now has a hero ring, a 3-up stat strip, category
  icons, and grouped surfaces. The first pass was hairlines-only and read as a notepad; the fix
  was adding focal points and texture, not more colour

- **Editors** — `HabitEditor`, `TaskEditor`, `GoalEditor` on a shared `EditorSheet`
  (`lib/src/ui/editor_sheet.dart` + `Field`, `ChoiceChipTile`, `WeekdayPicker`). Create and edit
  are ONE sheet with different initial values, never two forms. Habit: title, 4 types, category,
  schedule incl. weekday picker + times-per-week, reminder time, archive. Task: title, notes,
  quick + custom dates, priority, delete. Goal: name, why, target date, progress mode,
  milestone add/remove, delete. Long-press a habit or task row to edit; tap a goal card.
  Repositories gained `updateHabit` / `update` / `updateGoal` / `addMilestone` /
  `deleteMilestone` / `deleteGoal`

- **7-habit free cap + grandfathering** — `HabitCap` model, `capStatus()`, `applyGrandfathering()`
  (idempotent, flags newest-first, runs from `MigrationService.run(onImportComplete:)` so
  imported users NEVER find their own habits paywalled). `openHabitEditorRespectingCap()` is the
  single gate; usage is stated on the button before it blocks; Settings shows plan + "kept from
  before". 11 dedicated tests.

- **Paywall + RevenueCat** — `SubscriptionService` (configure / identify / resolve / plans /
  purchase / restore) + `PaywallScreen`. Ports the Capacitor hybrid rule EXACTLY: RC active =>
  Pro; RC holds any record but inactive => NOT Pro; RC holds nothing => fall back to
  `users.is_pro` (admin-granted + lifetime). `appUserID` must stay the Supabase uuid.
  `isProProvider.refresh()` is the single seam. Prices come from the store, never hardcoded.
  Restore reports the truth (the old app said "restored" on any completed call).
  **Needs `--dart-define=REVENUECAT_ANDROID_KEY=...`; degrades to "plans unavailable" without it.**

- **Backup engine** — `lib/src/backup/`. `.shbak` container = `SHBK` magic + PLAINTEXT header
  line + gzip(JSONL), so restore-with-preview reads counts/dates without decompressing (and on
  Drive the same data goes in `appProperties`, making the picker one `files.list` with zero
  downloads). Full snapshots, never deltas. Derived tables excluded and cleared on restore.
  **Merge rules: LWW on `updated_at`; a tombstone wins a tie (no zombie rows); `habit_logs` is a
  UNION, never LWW** — a missing log is absence of evidence, not a denial, and treating it as LWW
  means restoring an old backup silently destroys a streak. 17 dedicated tests.
  **Still to do: the Drive client itself (needs `drive.appdata` OAuth), retention pruning,
  workmanager scheduling, and the restore-preview UI.**

- **Auth wired to the LIVE Supabase project** — `AuthService` + `SecureSessionStorage`
  (flutter_secure_storage, PKCE) + `LoginScreen`. PIN path is complete and uses
  `'SH' + pin` verbatim. `recoverLegacySession()` adopts the bridged session at boot and deletes
  the carried keys immediately. `BootGate` now gates on `authUserIdProvider`.
  Config lives in **gitignored `mobile/dart_define.json`**; build with
  `flutter build apk --dart-define-from-file=dart_define.json`.
  **Verified on device: `***** Supabase init completed *****`, no exceptions.**
  Google sign-in returns an honest "not configured" and falls back to PIN until
  `GOOGLE_SERVER_CLIENT_ID` exists.

- **RevenueCat live key wired** — in gitignored `dart_define.json`. SDK initialises and reaches
  Google Play. On the emulator billing returns `BILLING_UNAVAILABLE` (no Play account on the AVD),
  and the app degrades exactly as designed: no crash, empty offerings, paywall shows
  "Plans are unavailable right now." **Purchases must be verified on a real device signed into a
  Play account, with the app installed from an internal-testing track** — sideloaded debug builds
  cannot complete a Play purchase.

- **Google Sign-In implemented** — `signInWithIdToken` with the **Web** client as
  `serverClientId`. Drive scope deliberately NOT requested at sign-in (incremental, at the
  backup step). Cancelled chooser returns silently, never an error.
  Manual linking enabled in Supabase.

### OAuth fingerprints (all for package `com.stayhardy.app`)

| Key | SHA-1 |
|---|---|
| Upload (stayhardy-release.keystore) | `B8:3F:01:34:8F:0A:26:B5:57:10:53:1A:6B:CC:42:9E:3A:2D:D5:D6` |
| Play App Signing (Google) | `4E:12:E0:20:C9:4B:3E:EA:6D:46:1D:05:4F:08:36:4D:FC:1F:4F:3A` |
| Debug (~/.android/debug.keystore) | `40:C8:D6:2F:CB:B2:E4:56:9A:A4:FD:25:14:08:18:B8:BD:6E:A4:02` |

**Debug builds are signed with the DEBUG key**, so Google sign-in fails locally unless that
third fingerprint is also registered as an Android OAuth client.

- **Migration is now OPT-IN, not a boot gate** (owner decision: old data is expendable, but
  sign-in must keep working). `BootGate` = signed out -> Login; new device -> Onboarding;
  otherwise the app. "RESTORE MY OLD DATA" lives in Settings and is safe to run twice
  (remote_id + insert-or-ignore). **This removes the bridge-release soak from the critical
  path** — the Flutter build no longer depends on 1.1.14 having shipped, though the session
  carry-over is still worth having so existing users are not forced to re-login.
- **Onboarding** — 3 pages, skippable throughout, and the last page CREATES real habits so
  nobody lands in an empty app. Auto-skipped for anyone who already has habits.

- **Habit reorder** — `HabitRepository.reorder()` rewrites every `sort_index` densely in one
  transaction and marks rows dirty. `activeHabits()` now orders by `(sort_index, created_at)`;
  the second key matters because every migrated habit with no legacy ordinal landed on 0, and a
  list that reshuffles between builds makes dragging look broken. `HabitOrderScreen`
  (`ARRANGE ORDER` on the Habits screen, shown from 2 habits up) is a **separate screen** with
  explicit drag handles — the Habits list is filtered to *today* and already spends tap on
  check-off and long-press on edit, so drag-on-the-list would reorder an invisible subset and
  turn every mis-drag into silent data loss. Order saves on drop, no save button. The list is
  loaded once rather than streamed, so our own writes don't fight the drag animation. This is
  also the order the home-screen widget renders (`WidgetService` → `loadToday` → `activeHabits`).

- **Streak freezes** — `lib/src/domain/freeze_rules.dart` (pure `FreezeRules` + `FreezePlanner`)
  and `lib/src/data/freeze_service.dart`. One freeze per **10 completed periods**, cap **2** per
  habit, nothing forgiven more than **7 days** after the fact.
  The whole design defends one property: **a freeze can only be created by time moving forward.**
  - Freezes are materialized rows, never inferred at read time.
  - Repair only runs for periods that ended **on or after `settings.last_freeze_run_date`** — a
    gap already walked past is closed forever, so reinstalling, restoring, or rewinding the
    clock cannot re-open it. A backwards clock is a no-op that leaves the watermark alone.
  - `lastRunDate == null` (first ever run) **earns but never repairs** — a fresh install
    carrying imported history must not hand out freezes for gaps that happened in another app.
  - Earning counts only periods where the work was genuinely done: a frozen period never pays
    for the next freeze, and an open period is not counted until it closes.
  - `freezes_earned_total` is a monotonic ratchet, so recounting history grants nothing.
  - A freeze is never spent where no streak was running (would show a streak of 1 to someone
    who has done nothing).
  Rollover runs at launch **and on every resume** (`startStreakMaintenance`, `AppLifecycleListener`)
  — a phone that is never swiped away would otherwise stop granting freezes for the heaviest
  users. Guarded to once per calendar day, so resume-firing cannot double-grant.
  Surfaced on the Habits screen ("Streak saved. X was covered on Friday." for 3 days, plus the
  banked count) and explained in full in Settings → Streak protection. A silently-applied freeze
  is worthless — the user just sees a streak number that looks wrong.
  `HabitRepository.outcomesFor()` is now the single place logs + freezes become `PeriodOutcome`s,
  so the live streak and the rollover can never disagree.

- **Focus mode** — `lib/src/domain/focus_rules.dart` (pure) + `lib/src/data/focus_repository.dart`
  + `lib/src/features/focus/focus_screen.dart`. Presets 15/25/45/60, optional goal link, entry
  from a Home row that turns into the live timer while a session runs.
  **The timer is wall-clock, never a tick counter.** Elapsed is always
  `actual_seconds + (now - resumed_at)`; a `Timer.periodic` counter stops the moment Android
  freezes the process, so a 25-minute session with the screen off would be credited as seconds —
  the exact case the feature exists to measure. The screen's 1s timer is *only* a repaint.
  - **Schema v2**: `focus_sessions.resumed_at` added, with a real `onUpgrade`. v1 shipped to
    nobody, but every dev device holds a v1 file and a migration that is never exercised until
    it matters is not a migration. Verified on device: `user_version` 1 → 2, column added,
    10 habits intact.
  - Pause banks the open span and counts an interruption; the pause itself is never credited.
    "Finish early" banks the real time but does **not** mark the session completed — 20 of 25
    minutes is 20 minutes of work, and an app that throws it away teaches people not to start.
  - **Recovery of sessions the OS killed**: inside its window → resume; window elapsed while
    dead → credit in full (the user asked for N minutes and N minutes passed; being killed is
    the app's problem, and discarding would delete the sessions of exactly the users whose
    phones kill background apps hardest); >24h → discard, never credit. A *paused* session is
    never auto-completed.
  - `start()` closes any session still in flight, not only stale ones. Recovery alone left a
    healthy running session open underneath a new one, where it would be auto-completed at next
    launch and credited as focus never done. Sessions under 60s are discarded rather than
    banked, so a double-tapped start leaves one row. **Found on device, not in review.**
  - Completion notification on its own channel, pinned to an absolute instant (the process will
    not be alive to notice a countdown), cancelled/rescheduled on pause and resume.
    `rescheduleAll()` no longer calls `cancelAll()` — it ran on every habit change and would
    have taken the in-flight focus alarm with it.
  - No wakelock, deliberately: holding the screen on for 25 minutes to display a number nobody
    should be watching contradicts the whole proposition.

- **FIXED: every Drift table-watcher in the app was collapsing into one stream.**
  Drift caches streams by SQL text + arguments and **ignores `readsFrom`**. Eight watchers were
  written as `customSelect('SELECT 1', readsFrom: {…})`, so they all shared a single stream
  carrying only the *first* subscriber's tables — `{habits, habitLogs, habitFreezes}`, because
  `startWidgetSync` subscribes first. Goals, tasks, stats, habit cap, streak protection and
  focus were therefore only refreshing when a habit changed, and focus never refreshed at all.
  The bug is invisible in isolation — each stream is correct when it is the only one alive —
  and presents as screens that are quietly stale.
  Fixed with `AppDatabase.watchTables(key, tables)`, which forces distinct SQL per watcher and
  asserts the key is a bare identifier. `test/database_test.dart` keeps two watchers alive at
  once and fails if a focus write wakes the habits watcher or misses the focus one — verified
  to fail against the old code.

- **Insight engine / weekly review** — `lib/src/domain/insight_rules.dart` (pure `InsightEngine`
  + all thresholds in `InsightRules`), `lib/src/data/insight_repository.dart` (counts only, no
  judgement), `lib/src/features/insights/weekly_review_screen.dart`, reached from a row on Stats.
  Pro-gated through `openWeeklyReviewRespectingPlan`.
  Three rules govern it, and they are the whole design:
  - **Every claim is earned by evidence.** "Tuesday is your weakest day" from two Tuesdays
    discredits the entire app. Each rule declares its own minimum sample and stays silent below
    it — weekday patterns need 4 weeks AND 4 samples on that weekday AND 4 usable weekdays; a
    rate needs 3 scheduled days; a streak warning needs a 7-day streak; a new habit is never
    called dormant. **Silence is a valid output.**
  - **At most 5 cards**, one per habit and one per goal, ranked by how actionable they are. A
    single collapsing habit trips three rules and would otherwise fill the review alone.
  - **Never all bad news.** If any win exists it is always shown, even when risks outrank it —
    a review that is a list of failures gets closed and never reopened, and then it improves
    nothing.
  **The reviewed week ends YESTERDAY, never today** — same rule as open periods in the streak
  engine: a habit due this afternoon has not been missed, and counting it would make every
  morning review read as a collapse. Previous week = the 7 days before that; evidence window
  is 12 weeks, bucketed so the last bucket is exactly the reviewed week.
  36 dedicated tests, most of them asserting that the engine says *nothing*.

- **Badges + XP + share cards** — `lib/src/domain/badge_catalogue.dart` (pure catalogue,
  `BadgeEngine`, `Xp`), `lib/src/data/achievement_service.dart`,
  `lib/src/features/achievements/` (screen, drawn medal, celebration sheet, share card).
  Reached from a "Standing" row in Settings; celebration fires from `AppShell` after the
  restore prompt.
  - **The nine `streak_*` keys, names and copy are byte-identical to the Capacitor build** and
    a test asserts it. They are the primary key of the `user_badges` rows being migrated for
    274 live users: a renamed key re-awards a badge they already hold, a renamed badge takes
    away something they can name. New badges (`volume_*`, `focus_*`, `perfect_*`) are prefixed
    so they can never collide, and exist because a ladder built only on streak length has one
    shape of winner — volume rewards the person who broke a streak in March and kept going.
  - **XP is derived from lifetime totals, then ratcheted** into `settings.xp_high_water`.
    Deriving it means it rebuilds exactly after a restore with no ledger to carry; ratcheting
    means deleting a habit, un-checking a box, or restoring an older backup can never take a
    level away. Levels are `50·(n-1)·n`, so early levels arrive in days and level 30 is a year.
  - **Badges are judged on the BEST streak, never the current one** — a badge records something
    that happened, and breaking a streak cannot un-happen it.
  - **First evaluation on a device awards silently.** A fresh install or an import qualifies
    for everything at once; `settings.badges_evaluated` gates the popup exactly as the Supabase
    import pre-marks migrated rows shown. Nine stacked celebrations is not a celebration.
  - An unknown badge key (future version, hand-inserted row) is kept on disk but not rendered —
    never revoke, never invent a name for it.
  - Medals are **drawn from theme tokens**, not shipped as artwork: 15 badges × 3 densities is
    45 assets that would all be wrong in light mode and stale after a palette change.
  - Share card is **always dark** whatever the app theme — it lands in someone else's feed, and
    a near-white card on a near-white timeline disappears. Rendered off-screen in its own
    pipeline at 1080×1350 (a hidden in-tree widget would be constrained by the phone's screen
    and letterbox on small devices). Written to the app's own cache; **nothing is sent
    anywhere** — the OS sheet is where the user picks a destination and confirms.
    Adds one dependency, `share_plus`.

- **Screen-time analytics** — `ScreenTimeBridge.kt` (native), 
  `lib/src/domain/screen_time_rules.dart` (pure), `lib/src/data/screen_time_service.dart`,
  `lib/src/features/screentime/` (disclosure + screen). Android only, Pro only, reached from a
  row on Stats that is hidden entirely on other platforms.
  - **Play prominent disclosure is a full screen shown BEFORE the permission**, naming the data,
    what it is used for, and that it is never shared — with "Not now" as a real answer. Requesting
    `PACKAGE_USAGE_STATS` without it gets the release rejected. `acceptDisclosure()` is written to
    settings *before* the settings intent fires, so the required ordering is a fact on disk rather
    than an assumption about navigation, and `openPermissionSettings()` has exactly one call site.
  - **`queryAndAggregateUsageStats` is NOT usable** for per-day totals — it aggregates over
    arbitrary intervals and double-counts sessions crossing a boundary, so its numbers disagree
    with Digital Wellbeing on the same phone. Foreground time is reconstructed from raw
    `UsageEvents` resume/pause pairs clipped to the window, with a 12h look-behind so a session
    already running at midnight is not dropped, and open sessions credited to the window end.
  - **Permission is checked via `AppOpsManager`, not `checkSelfPermission`** — the manifest entry
    only makes the app *eligible* to appear in the usage-access list; `checkSelfPermission`
    returns granted whether or not the user flipped the switch.
  - No `QUERY_ALL_PACKAGES` (sensitive, needs a Play declaration). A `<queries>` entry for
    launcher apps resolves most names; anything still hidden falls back to its package name.
  - **FIXED: `screen_time_daily` and `screen_time_app_daily` were in `backedUpTables`.** The
    disclosure says this data never leaves the phone and a Drive backup is exactly it leaving the
    phone. Both are now in `excludedFromBackup`, with tests that a snapshot contains no
    screen-time rows (not even in the header counts) and that an older backup carrying them does
    not restore them.
  - No goals, no limits, no red, no ring — a ring implies a target and there is no correct number
    of hours. The only claim made is the correlation, and it stays silent under 14 days, under 3
    days on either side, or under a 30-minute gap. The unflattering direction (more phone on days
    habits were KEPT) is reported too rather than hidden.
  - Per-app detail pruned at 90 days; "delete my screen time data" wipes both tables and says
    plainly that Android keeps its own copy.

- **Backup: local export/import, retention, restore preview, Drive client** —
  `lib/src/backup/backup_retention.dart` (pure), `drive_client.dart`, `local_backup.dart`,
  `backup_coordinator.dart`, `lib/src/features/backup/` (screen + restore-preview sheet).
  Reached from a Settings row that reads **"Never backed up" in danger red** — stated as a risk,
  because someone with two years of history and no copy of it should be told.
  - **Local export/import is the headline and it works TODAY** — no account, no Drive scope, no
    network. A backup system that only functions when a Google sign-in, an OAuth consent screen
    and a connection all cooperate fails exactly when it is needed. Export writes a `.shbak` and
    hands it to the OS share sheet (Drive is one of the targets, so a user can put a backup in
    Drive by hand right now); import picks a file, previews it, then restores.
  - The picker uses `FileType.any` deliberately: Android resolves custom extensions by MIME
    type and `.shbak` has none, so an extension filter shows the user an empty folder containing
    the file they are looking at. Verified — the picker classifies it as a "BIN file".
  - **Restore preview before anything is written.** Merge and replace differ in a way invisible
    from their names, so the sheet says "N items on this phone are not in this backup — replace
    will delete them" in words, with merge preselected.
  - **Retention is grandfather-father-son**: everything for 7 days, weekly for 4 weeks, monthly
    for 6 months, hard ceiling 24. Two overrides that cannot be removed — the newest backup is
    never deleted (even if its timestamp is in the future, i.e. a clock that jumped), and a
    single backup is never deleted. 13 tests, most of them about what it refuses to delete.
  - **BOUNDARY HELD: the Drive client is complete but cannot succeed.** `drive.appdata` is not
    granted on the OAuth consent screen, so every call ends in `DriveFailure.notAuthorised` and
    the UI says "Drive backup is not switched on yet" rather than dressing it up as a retryable
    error. `backupNow()` throws rather than returning a bool, so no caller can treat a failed
    upload as a completed backup, and the last-backup timestamp is written only after an upload
    returns a file id. Auto-backup scheduling is deliberately NOT wired — it would only fail.
  - **FIXED BEFORE IT SHIPPED: Drive `appProperties` would have been rejected.** The header was
    encoded as one `counts` JSON value — 184 bytes against Drive's 124-byte per-value limit, at
    eleven tables. It would have failed on the first real upload, after the scope was granted.
    Now only four headline counts travel (short keys), the device label is truncated, and tests
    assert both Drive limits at a realistic worst case.
  - Scope is `drive.appdata` — not `drive.file`, not `drive`. Files are invisible in the user's
    Drive, and the app can see nothing else in it. Requested incrementally at the backup step,
    never at sign-in.

- **Remaining screens: calendar, habit detail, subtasks, updates, feedback** —
  `lib/src/data/calendar_repository.dart`, `community_service.dart`,
  `HabitRepository.detailFor()`, `TaskRepository.subtaskCounts()`, and
  `lib/src/features/{calendar,habits,tasks,community}/`.
  - **Calendar earns its place by being writable.** A read-only month grid is a decoration; the
    reason this screen exists is the one thing nothing else in the app can do — tick off the
    Tuesday you actually did but forgot to mark. Backfilled logs are flagged `backfilled = 1`,
    which is what lets a paid challenge reject retroactive completions later without a schema
    change then. Future days are refused outright, rest days are painted as neither win nor
    loss, days before a habit existed are not counted against it, and an **archived habit still
    counts on the days it was live** — dropping it would make a user's history quietly improve
    the moment they archive something.
  - **Habit detail**: rates computed over SEALED periods only, so the number does not drift down
    every morning and back up every evening. The history grid is **per-period, not per-calendar-
    day** — a Sat-only habit shows 18 cells over four months, not 120 with 102 painted as
    misses. Reached by long-press; tapping the row stays a check-off, and editing now lives
    inside detail rather than being the long-press destination.
  - **Subtasks**: one level, enforced by the widget never rendering for a subtask. A tree at
    phone width needs indentation nobody sees and drag-to-reparent nobody hits. Progress shows
    on the planner row as "2 OF 5 STEPS" from one grouped query, not a query per row.
  - **Updates + feedback read and write the LIVE Supabase tables** the web app already uses,
    with the columns copied verbatim — `announcements(id,title,message,category,created_at,
    is_active)` and `feedback(user_id,user_name,user_email,message,type,subcategory,ticket_id,
    status,priority,...)` including the same `TKT-` id shape, so a ticket filed from Flutter
    lands in the admin dashboard beside one filed from the web instead of in a parallel system
    nobody checks. Announcements are cache-first. Feedback returns the ticket id or null —
    **never a silent success**; someone who reports a bug and is thanked while nothing was
    written is worse off than someone told to retry.
  - 17 dedicated tests, mostly about what the calendar refuses to change.

- **Razorpay webhook — fixes live revenue loss** — `supabase/functions/razorpay-webhook/index.ts`
  + `supabase/migrations/20260815000000_razorpay_webhook_support.sql`.
  Verification was client-callback-only: if the app died after Razorpay captured and before
  `razorpay-verify` ran, the user was charged and nothing was recorded, with no job to notice.
  This is the second, server-to-server confirmer.
  - **Its HMAC is different** — over the RAW request body with `RAZORPAY_WEBHOOK_SECRET` in
    `x-razorpay-signature`, NOT the `${orderId}|${paymentId}` construction in `razorpay-verify`.
    Body is read as text once and verified before parsing; re-serialising changes the bytes.
    Constant-time compare, because this is the one comparison that guards money.
  - Routes off Razorpay order **notes**, same discipline as `razorpay-verify` ("tips can never
    grant Pro"). Idempotent via the existing unique index — 23505 is the system working.
  - Audits every delivery to `payment_events` BEFORE acting, adds refund columns to `tips`, and
    ships a `payment_reconciliation` view that lists captured payments with no row. **It should
    always be empty; anything in it is money taken and not delivered.**
  - The view is `security_invoker = true` — without it a view runs as its OWNER and silently
    bypasses RLS on `tips` and `users`.

- **Accountability circles + challenge engine (Phase 3, free half)** —
  `supabase/migrations/20260815000001_challenge.sql`, three Edge Functions,
  `lib/src/domain/challenge_rules.dart`, `lib/src/data/challenge_service.dart`,
  `lib/src/features/challenge/circles_screen.dart`. Free, not Pro-gated, with a test asserting it.
  - **THE CORRECTION THAT SHAPED EVERYTHING: the server cannot verify habit completion.**
    An adversarial review caught that the approved plan claimed `challenge-checkin` would refuse
    backfilled / migrated / freeze-satisfied logs. It cannot — **habit logs never leave the
    device**; the only Flutter→Supabase write in the app is a feedback insert. The client
    computes a count and posts an integer. Those filters are client-side and are now labelled as
    such in `challenge_rules.dart`, in the migration header, and in `challenge-checkin`.
  - **Payout is refund-your-own-stake** (owner's decision). Complete → refunded; fail → forfeit
    to the cohort's named destination. No pot split. This is what makes the soft trust model
    safe: a successful cheat gains the cheater nothing but their own money back, so sybils stop
    paying for themselves, a one-member cohort stops being degenerate, and the framing stays
    "refundable deposit" rather than "prize competition" under Indian gaming law.
  - **`challenge_daily` is SELECT-only for clients.** Every write goes through the Edge Function
    under the service role — the exact opposite of `leaderboard_scores`, whose "Users manage own
    scores" policy lets anyone write any number.
  - Discriminates on `kind in ('free','paid')`, **not** `stake_paise > 0` — a numeric comparison
    buried in a predicate is invisible to review. A trigger makes `kind` and `stake_paise`
    immutable once a cohort has members, so a free circle can never become a paid one.
  - Timezone pinned **on the cohort** as an IANA name, validated server-side, never defaulted to
    UTC. Reuses `ymdInTz` from `send-daily-pushes` verbatim.
  - Monotonic `max_day_submitted` ratchet: rolling the device clock back to re-submit an earlier
    day is refused. No 03:00 grace for paid cohorts — every grace window is an extra chance to
    submit a day you did not do. Free circles keep it.
  - `habits_done` and `habits_frozen` stored **separately**, so a hand-granted freeze
    (`FreezeSource.manual`) can never buy a day.
  - Invite codes live in a **separate table** — on the cohort row they would be a free join token
    for every cohort a user can select.
  - `challenge_daily_events` audits accepted AND rejected attempts, because "I did it, the app
    didn't record it" is otherwise unanswerable.
  - Payment tables have **no cascade from `auth.users`** — `delete-user` would have destroyed the
    financial record. Email is snapshotted, as `tips` does.
  - Paid cohorts are refused at join, at check-in, and at finalize. Three independent gates.

### Redesign — "Aura" (19 Aug 2026)

Full UI rebuild. The brief: one Home carrying all productivity, Tasks+Goals merged behind tabs,
a Stats screen that categorises screen time and coaches from it, Settings out of the tab bar,
and a bottom nav that does not look like a torn page edge.

- **Theme rewritten in place.** `Monolith*` → `Aura*` across 48 files (mechanical, verified by
  `flutter analyze`). Renamed rather than kept, because "Monolith" names the design that was
  removed and would mislead every future reader.
- **Fraunces unbundled.** A display serif is the strongest "printed journal" signal an interface
  can carry — ahead even of the brass palette. Hierarchy now comes from weight and tracking.
  `theme_tokens_test.dart` fails the build if it is ever re-bundled.
- **Cards, not hairlines.** `SurfaceCard` gained a real fill, a 1px lifted border and a shadow.
  `ProgressRule` went from a 1px rule to an 8px rounded bar; `ProgressRing` paints a sweep
  gradient. New: `AuraNavBar`, `SegmentedTabs`, `charts.dart` (bars, donut, stacked bar, legend).
- **Home is now the single page** — habits, tasks, goals and focus, all checkable in place.
- **Plan** = Tasks + Goals under one segmented control. **Stats** = Progress / Phone / Coach.
- **Screen-time categorisation** (`app_categories.dart`): ~200 exact package mappings plus keyword
  fallbacks, weighted to the Indian market. The old design refused to classify at all, on the
  grounds that calling someone's livelihood a distraction is wrong. That objection is answered by
  rules, not by refusing to be useful: a user override always wins and is never re-guessed, every
  guess is labelled "GUESS", and no bucket is called bad.
- **Focus Score** (`digital_wellbeing.dart`): share of *discretionary* time that compounds.
  Messaging counts half; system time (launcher, dialler, keyboard) is excluded entirely so the
  number cannot move for reasons the user never chose. Withheld below 20 minutes rather than
  computed from noise.
- **Coach** (`coach_engine.dart`): deterministic, on-device, reads the user's own numbers.
  **Not an LLM** — the screen-time disclosure already promises this data never leaves the device,
  and 274 people accepted it on that basis. It says "I don't have a rule for that" rather than
  bluffing.
- 31 new tests (`wellbeing_test.dart`), written around what the engines *refuse* to claim.

Fixed while doing it:
- `SegmentedTabs(expand: false)` wrapped a `LayoutBuilder` in an `IntrinsicWidth`. `LayoutBuilder`
  cannot answer an intrinsic-size query, so the entire Stats → Progress tab rendered blank with no
  exception logged. Found on the emulator, not in review. The content-sized variant no longer uses
  `LayoutBuilder` at all.
- `GoalRepository.loadGoals()` read the wall clock directly, so `InsightRepository.buildInput(on:)`
  could not honour its own `on` parameter. Harmless in production (`on` is always today) but it
  made `insight_repository_test.dart` pass only on the day it was written — it had been red since
  16 Aug. Now takes an optional `on`.

**Not yet seen with live data:** the donut, per-app list and Focus Score need granted usage
access and real app usage. The emulator has neither, so that path is unit-tested but has never
been rendered against a real day. Worth a look on a real device before release.

### Second pass — lime, week trackers, mood, pomodoro (20 Aug 2026)

Owner review of the violet build: palette rejected, dashboard and habit cards to be rebuilt around
week/streak visuals, editing and deleting undiscoverable, Phone+Coach to merge, plus two new
features. All of it done in one pass.

**Palette.** Violet → lime on near-black. `onAccent` is now near-black in dark mode: lime is a
light colour and white on it fails contrast. Anything painted on `accent` must read `onAccent`.

**Week tracking — the main visual change.**
- `WeekStrip`: seven dated rings, filled by that day's completion, today filled solid. Leads both
  Home and Habits. The app previously had no way to see *this week* — consistency lived only in a
  90-day heatmap two taps away.
- `HabitTrail`: each habit's own last seven days as dots on its card. A streak number says "9";
  this says *which* days, which is what shows someone their Thursdays are the problem.
- Backed by `HabitToday.trail` (`DayMark`) and `HabitRepository.recentDays()`. `recentDays` walks
  **every active habit**, not just today's — folding it out of `loadToday` would drop a Mon–Fri
  habit's whole week every Saturday.
- Flexible habits count as scheduled only on days they were done. A 3×/week habit is not "missed"
  on the other four days.

**Edit and delete were never missing — they were invisible.** Both lived behind a *long-press*.
Every habit, task and goal row now carries a pencil. Habits additionally gained a real
`deleteHabit` (soft, tombstoned, logs included) offered beside Archive, with Archive first.

**Stats: Phone + Coach → Insights.** One subject, so one tab: the advisor's unprompted read sits
*above* the charts it is drawn from. The chat is now `AskScreen`, pushed. Never called a coach —
a persona promises open conversation this deliberately cannot deliver.

**Mood tracking (new).** Schema **v2 → v3**, `mood_logs`, one row per day, unique on `log_date`.
- Off by default and offered only in Settings. No card on Home nudging people to enable it.
- 1–5 scale. `MoodCheckIn` is one question, one drag, one button; the orb, the word and the colour
  all move together. The face is **drawn** (one interpolated quadratic), not a bundled 3D render —
  five illustration states would have cost megabytes of APK.
- Optional daily reminder on its own notification channel, so it can be silenced without killing
  habit nudges. Cancelled whenever tracking is off *or* no time is set.
- Stats shows the line, the trend and **one** relationship: habit completion on good days versus
  low days. Gated exactly as the screen-time correlation is.
- **It is not a diagnostic**, and `mood_rules.dart` says so at the top. Labels are plain — "Low",
  never "depressed". A test asserts no clinical vocabulary reaches the UI.
- Included in the backup payload (it is user content, unlike screen time).

**Pomodoro.** `Pomodoro` cycle rules (4 blocks, 5/20-minute breaks) derived from *sessions
completed today*, so it needs no state and resets at midnight. Position is shown, **never
enforced** — no forced break screen. Timer face is now a 16px gradient dial that breathes while
running and stops the instant it pauses. Focus minutes now chart in Stats.

Fixed while doing it:
- `BarRow` gave each bar an equal share of the width, so the first mood reading drew one
  full-width bar that read as a broken layout. Bars are now width-capped, and a single reading is
  stated in words rather than charted.
- The mood midpoint used `textMuted` — a grey *text* colour — which rendered the orb near-black in
  light mode. Mood colours now live in `theme/mood_palette.dart`, defined once for all three
  surfaces that draw them.

**Deliberately not built:** soundscapes/ambient audio for the timer. That needs bundled audio and
a playback package, which is a different job from "improve the UI and animation".

### Third pass — custom categories, editor UX, free Pomodoro (20 Aug 2026)

**Custom categories now work.** `HabitCategories.resolve` returned the literal word "Custom" for
any free text, throwing the user's own label away — so typing "Guitar" filed the habit under
"Custom" everywhere. It now keeps their word and borrows Custom's icon; the colour falls through
`AuraTokens.category`'s accent fallback, so it survives a theme swap.
- The rail offers the **fifteen real categories**, with Custom last as a `+` **door** rather than a
  sixteenth choice. Tapping it reveals an inline field — not a dialog, which would be a modal on
  top of a modal.
- `HabitCategories.named` / `isNamed` added so nothing has to special-case the placeholder.

**New Habit UX.**
- Name field gained a label, the live category badge, and a real error — an empty name used to
  `return false` and leave the sheet open explaining nothing.
- Type chips → a 2×2 grid of titled tiles with one-line blurbs. Four chips of different widths
  wrapped to a ragged second row with "Abstain" stranded alone.
- Reminder → an actual row with a bell and a chevron. The old full-width chip was
  indistinguishable from a text input, so "No reminder" read as a field somebody forgot to fill.

**Pomodoro is free now**, capped at `freeFocusSessionsPerDay = 2`. A Pro-only timer is a feature
nobody can evaluate, and "Focus sessions" on a paywall means nothing to someone who has never used
one. The paywall appears when the allowance is spent, not before.
- The quota is *derived* from `FocusSummary.todaySessions`, so it resets at midnight on its own and
  cannot drift from the history.
- Sessions under `focusMinimumBankedSeconds` are hard-deleted, so **a fumbled start costs nothing** —
  charging a daily allowance for a double-tap would be the worst possible first impression.
- A running session is always reachable regardless of quota or plan.

**Mood face.** Rebuilt as a real character: float, irregular blink, squash-and-rebound on change,
`^^` squint eyes when happy, angled brows when low, blush past "Good", an open grin at the top of
the scale, a tear at the bottom. All interpolated off one number, so dragging morphs one face
rather than cross-fading five.

Fixed while doing it:
- **`ProgressRing`'s glow was a `BoxShadow` on a circular box**, which paints a filled blurred
  *disc*. Invisible behind a 3px ring; a solid olive plate behind the 16px focus dial. Now painted
  as a blurred stroke along the arc.

Testing note: the habit editor is now covered by a **widget test** (`habit_editor_test.dart`),
driven the way a person drives it. The category rail is keyed for it — finding it by axis matches a
`TextField`'s own internal scrollable, and finding it through one of its tiles breaks as soon as
that tile scrolls out of view.

### Fourth pass — Home as a dashboard, sand timer (20 Aug 2026)

**Home is now an overview, not a worklist.** Owner brief: show pending habits, a productivity
score, goals and tasks pending, habit activity, and the new tools — and make every tile a door to
the page that owns that data.

- Header → `2 habits to go · 3 of 5 done today` → **Habits**
- `PRODUCTIVITY SCORE` ring → **Stats**
- `Goals` / `Tasks` mini-tiles → **Plan**, on the right sub-tab
- `HABIT ACTIVITY` (7D/30D bars + streak) → **Stats**
- Tools: Focus, Mood, Insights → their own screens

The inline habit list, task rows and goal cards are **gone from Home**. They made it a fifth copy
of four other screens, and none of those screens could be improved without improving Home too.

**The trade, stated plainly:** checking a habit off is now one tap further away, on the Habits tab.
That is the cost of an overview. It is why the habits tile leads the page and states exactly how
many are outstanding. If it turns out to hurt daily use, the fix is a compact quick-check strip
under the header — not putting the whole list back.

**The productivity score** (`domain/day_score.dart`) is the plain fraction of today's obligations
met — habits scheduled today plus tasks due, done over due. Deliberately **not** a weighted blend:
nobody can defend 60/40, and a score that moves without the user doing anything costs trust in
every other number in the app. Focus minutes are excluded — focus is optional work nobody promised,
and counting it would let a day of timers and no habits score well. A day with nothing due has
**no score**, never a zero.

**The Pomodoro is a sand timer.** Owner's idea, and the right one: it is the one metaphor that
needs no legend, and *the stream stops when the timer stops* — a paused hourglass is readable as
paused from across a desk, which a ring that merely stopped growing is not.
- Sand levels are **area-correct, not height-correct**. Each bulb is a triangle, so the top drains
  as `√remaining` and the bottom fills as `1 − √(1 − elapsed)`. Height-linear sand appears to rush
  at the start and crawl at the end, which reads as a broken clock.
- A mound on the bottom pile: a flat surface reads as liquid, a peak reads as sand.
- Grains drift down the neck on a loop while running, and vanish the moment it pauses; the sand
  greys at the same time.

Rebuilt once after review — the first attempt was two flat triangles with a line of uniform dots,
which read as a diagram. Every detail added exists because removing it broke the illusion:
**curved bulbs** (straight edges read as a funnel, not blown glass), a **concave draining surface
and convex landing mound** (two flat lines read as coloured liquid), a **tapering stream with
scattered grains and impact specks** (a constant-width bar of evenly spaced circles reads as a
string of beads), **specular highlight, rim light and side posts** (without a lit edge the sand
looks painted onto the background), and a **deterministic grain speckle** — a random source would
make the texture crawl every frame, which at 60fps is television static.
The drain dip needed softening on the second pass too: deep and narrow turned the bulb into a
heart. Sand slumping toward a drain dishes gently across the whole surface.

Fixed while doing it:
- The 30-day activity chart labelled every bar with a two-digit date, which wrapped into stacked
  single digits. Thirty labels in a 300px row is not an axis — the range is captioned instead.

### Fifth pass — review round (20 Aug 2026)

Owner review, worked through in one batch.

**Stats**
- **Weekly review is free.** It was Pro, which was the wrong thing to sell: the review is the moment
  the app stops being a checklist, and gating it meant the users least convinced by the app were
  the only ones who never saw it. It is computed on-device from data they already own.
- **Range selector spans the width.** It governs every card below it and did not look like it did.
- **Every card now follows the range.** Focus history became family-keyed on day count (a fixed
  fortnight sat under a "1Y" selection and ignored it); mood slices to the range. A year of focus
  is downsampled into ≤30 summed buckets, and the weekday axis is *dropped* rather than mislabelled
  once a bar spans more than a day.
- **Removed** "Last 14 days" (the heatmap said it again) and "Completion by type".
- **Focus moved to the bottom** and rebuilt: metrics row, empty state with a CTA, shown to everyone
  rather than hidden until first use — the one feature that has to be *tried* to be understood was
  invisible to exactly the people who had not tried it.

**The consistency grid** — two layouts, because one cannot fill the card at every range. Short
ranges lay out as a **calendar** (7 columns, weeks stacked); long ranges as a **commit graph**
(columns of 7, sized to fill exactly). Thirty days in graph form left 60% of the card empty at any
cell size. Month labels are real (`MAY`, not `M`) with pixel-based collision spacing.

**Colour semantics, app-wide:** deep green = done, pale green = saved, faint red = missed. The
ramp runs pale → rich rather than dim → bright, so "more" reads as denser colour. Same three
colours in the habit history grid and the per-habit trail dots, so nobody learns two legends for
the same three facts.

**"Freeze" is now "streak save"** everywhere in the interface. The database column stays `frozen` —
renaming a shipped column to improve copy is not a trade worth making.

**Where your effort goes** — rebuilt as the heart of the screen. Now counts **habits and tasks**
(a category someone was pouring task work into read as empty), carries a **previous-period
baseline** so it can say *improving* or *slipping* rather than only *how much*, leads with the
answer in a sentence, and splits each bar into its habit and task halves.
- Baseline floor raised 3 → 8 after seeing "up 392%" on a young account: arithmetically true,
  communicates nothing except that the app will print any number.
- Past a doubling the change is written as a multiple (`4.9×`), because a percentage stops being
  readable there.

**The productivity score now takes screen time off.** Four rules keep it fair: unknown screen time
deducts **nothing** (it is opt-in, and a blind penalty would punish the users who granted it);
90 minutes of leisure a day is free; the deduction is capped at 20 points and can only subtract,
never add; and it is always stated on the card with a link to the breakdown. `isComplete` ignores
it — screen time must not take "you did everything" away from someone who did everything.

**Habits page** — merged the week strip and counters into one hero (two cards pushed the first
habit below the fold on the screen whose job is showing habits), split into **To do** / **Done
today**, and completed cards recede rather than vanish.

**Single habit page** — gained the action it was missing entirely: a **check-off for today**.
Someone who opened a habit, saw they had not done it, and had to go back a screen to tick it. Plus
a category chip, an edit action in the header, a labelled ring ("Ring: 91% kept over 30 days" —
an unlabelled arc around a streak count reads as though the arc *is* the streak), and friendly
dates.

**Ask** — turned from a Q&A into a consultation.
- A ranked **advice engine**: every recommendation carries the number it rests on and one concrete
  action, weighted so the user is told the most useful thing rather than the first thing found.
  A test asserts every recommendation states a figure — advice without evidence is a horoscope.
- **Routine builder** from their *own* habits, placed by the reminders they set and by what each
  habit is for. Not a template off the internet.
- New questions: what to change, build a routine, what is stealing my time, what am I doing well.
- Chips grouped onto three shelves (Do / Review / Phone); eleven undifferentiated chips is a wall.

**New Habit** — free-text custom categories, 2×2 tracking-type grid, real error on an empty name,
reminder as a row rather than a chip that looked like an empty input.

**Home** — became a dashboard; see the fourth pass.

### Sixth pass — feel and finish (20 Aug 2026)

**Backfill bug fixed** (Known issue #10, open since the first week). `HabitRepository.toggle` took
an `on:` date and called `toggleOn` without the `backfilled` flag, so any past day logged through
it was recorded as same-day — which `ChallengeService.tallyFor` is specifically designed to
reject. Now derived exactly as `CalendarRepository.setDone` derives it, with `backfill_test.dart`
asserting **no write path can create a past log that claims to be same-day**.

**Home feels alive.** The score counts up from zero, bars grow in a wave (per-bar duration, not
controllers), rings sweep pale→deep green so density = doneness, and a `homeRevealProvider`
generation counter restarts the entrance animations on every visit — the IndexedStack keeps Home
alive, so without it they played once per launch. The header eyebrow now carries the **streak**
instead of the date (the date is on the status bar and lock screen already); the due-today banner
disappears entirely once the day is done rather than switching to an "all done" card the score
ring below already states.

**Ring seam fixed.** The sweep gradient's start cap sampled the angle just before 0°, which wraps
to the gradient's *end* colour — a lick of deep green under the pale start. The gradient is now
rebuilt per-frame to span exactly the drawn arc, starting one cap-width early.

**One colour scheme, app-wide** (owner's spec): deep green = all done, lighter green = partial,
**blue = streak save**, empty = missed/rest. Applied to the calendar, the habit history grid, the
week-strip rings and the per-habit trail dots. "Frozen" is "streak save" in every string; the
`frozen` database column keeps its name.

**Completion feels like completion.**
- Tasks: the row holds in place for ~1.1s with a success wash and the tick animation before the
  board regroups it. The instant version moved the row out from under the user's finger on the
  same frame as the tap, so the tick was never seen. If the screen dies mid-celebration the write
  still lands — the delay is presentation, never data.
- Goals: `setStatus` existed and *nothing called it* — a goal at 100% just sat there. A **MARK
  ACHIEVED** button now appears at 100%, and completing fires `GoalCelebration`: painted confetti
  (~40 deterministic particles, no package), trophy, the goal's name.

**Linked habits actually link.** `GoalProgressMode.linked` shipped with no way to attach a habit —
only `dev_seed` ever wrote `goal_links`. The editor now shows a habit checklist when the mode is
selected; `setLinkedHabits` writes declaratively with tombstones (and revives a tombstone on
re-link rather than minting a duplicate row).

**Plan:** the create button is a `+` in the header, matched to the open tab. It lived at the very
bottom of each list — scrolling past everything you have to add the next thing.

**Mood:** the daily notification now carries a payload and taps route straight to the check-in
(global navigator key; a mood prompt that lands you on Home breaks its own promise). The Stats
chart draws a **face per day** above the bars using the same painter as the check-in orb —
extracted to `ui/mood_face.dart` so the two cannot drift. Terrible/Excellent labels are inset to
the track and tinted with the scale's own end colours.

### Seventh pass — light mode, the ring seam for real (20 Aug 2026)

**The ring seam, fixed properly.** The first fix shifted the gradient's `startAngle` to cover the
round cap. It could never work: Flutter computes a pixel's sweep angle in **[0, 2π)**, so the
cap's pixels just before 0° evaluate at ~2π and clamp to the gradient's *end* colour, whatever
the startAngle says. The arc body is now **butt-capped**, with an explicit start dot in the first
colour and an explicit tip dot in the last colour over a small dark blur — the tip of a
nearly-full ring now reads as lying *above* its own start, the way a watch ring does, instead of
as a paint defect beside it. Plus one soft swell of the glow when the fill lands (`onEnd` →
single 650ms pulse; a ring that keeps pulsing is a notification, not a chart).

**Light mode's "blurred cards".** `Grad.surfaceWash` and card tints were painted *translucent*
over the page ground — invisible as a flaw on near-black, but in light mode every hero card
became a grey-green smear. Washes and tints are now **alpha-blended onto `surface` first**, so
every card is opaque with a tinted finish and casts a shadow from a real edge in both themes.

**Legibility is derived, not assumed.** The heat ramp spans near-white to deep forest, so no
fixed numeral colour survives every cell — day "1" on the palest fill was invisible. New
`AuraTokens.onFill(fill)` picks dark ink or off-white from the fill's own luminance; used by the
calendar day cells and the week strip's today disc. A future palette change cannot silently break
legibility again.

**Mood's first-reading banner** became a real card: MOOD section label, the face the user picked
(same shared painter), "Today: Excellent" in the level's colour, and a tap back into the check-in.

### Eighth pass — accounts, Pro, and the shop window (20 Aug 2026)

**The one real bug found: RevenueCat ran anonymous.** `main` configured the SDK with no
`appUserID` and nothing ever called `identify` — so every existing subscriber would have looked
like a new anonymous install and lost Pro. Now: `configure(appUserId: recovered uuid)` at boot,
and sign-in re-keys with `Purchases.logIn(uuid)` **before** asking about entitlements. Key
(`goog_FoCItomky…`), entitlement (`'StayHardy Pro'`), and the hybrid DB-fallback rule were all
verified identical to the live Capacitor build; Restore was already wired in the paywall.

**Sign-up and Forgot PIN now exist** (the new app only had sign-in). Mirrored from the live app
exactly — password `'SH' + pin`, `emailRedirectTo: stayhardy.com/auth/verify`, the non-fatal
`public.users` insert with the **bcrypt** pin hash (dependency added for exactly that column),
reset via the existing `stayhardy.com/auth/reset` page so no new deep-link handling. One panel
with three modes rather than three screens; sign-up success lands on a calm green "check your
inbox", not an error-red anything. **Forgot PIN verified end-to-end against live Supabase.**
Sign-up + verification email deliberately not fired at production from the emulator.

**Settings** got a profile card at the top: initial avatar, email, PRO/FREE badge, and sign-out
behind a confirmation sheet that says the true thing — signing out only disconnects backup and
Pro, the habits stay. Card absent = "Local only".

**Reminders default on.** On Android 13 "on by default" can only mean asking once, unprompted —
done after the restore offer and badge celebration so the system dialog never lands on top of
them, recorded in `notification_permission_asked` so it is exactly once. Decline is respected;
Settings holds the way back in.

**Backup** leads with a Drive-branded card (Material's own `add_to_drive` glyph — Google's brand
rules make bundling the real logo a liability), "Back up to your Google Drive · yours, not ours".
**Left open for testing, not Pro-gated** — owner's call; flip later.

**Paywall list** re-checked against what is actually gated: dropped "Insight engine" (weekly
review went free), added unlimited focus, screen-time insights, Drive backup ("free while in
testing"). Final paywall visual design deferred at owner's request.

**What's New** opens with a staggered-cascade 2.0 showcase (seven feature cards, marketing voice)
that ships in the binary — the screen opens from a badge, and a badge that leads to "Nothing new"
teaches people to stop tapping. Announcements from Supabase render below it.

**Deferred by owner:** circles discussion; paywall final UI; flipping Drive backup to Pro.

### Ninth pass — the StayHardy Circle, the app lock, focus aliveness (20 Aug 2026)

**The global circle (locked decisions: perfect-day scoring; one-time card + prompt, never
auto-join).** One automatic monthly cohort for every user, alongside the existing private
code circles. Server side — **written, NOT applied**, per the standing "I write, you apply"
arrangement:
- `supabase/migrations/20260820000000_global_circle.sql` (pglast-clean): `scope` column on
  `challenge_cohorts` + partial unique index (one global cohort per month as a database fact),
  `challenge_hall_of_fame` snapshot table (PK cohort+rank, rank 1–10, RLS select
  authenticated), and `global_circle_standings(limit_n)` SECURITY DEFINER RPC — perfect days
  = `count(*) filter (where habits_required > 0 and habits_done >= habits_required)`, ties on
  `total_done`, returns top-N **plus the caller's own row** with `is_caller`.
- `challenge-join/index.ts`: `join_global` action — find-or-create the month's cohort pinned
  to Asia/Kolkata, 23505-race-safe create, idempotent member insert.
- `challenge-finalize/index.ts`: global settlement — top-10 hall-of-fame snapshot (23505 =
  already written), next month's cohort created, active members carried forward, and
  `finalized_at` stamped **last** so a crash anywhere is retried safely.

Client: `Circle.isGlobal`, `GlobalStanding`, `HallOfFameEntry`; `joinGlobal` /
`globalStandings` (RPC) / `hallOfFame` on `ChallengeService`. `circles_screen`: global
section first (join card → board with your-rank-below-top-10 → last-month podium), private
circles beneath. All three sheets (join global / create / join by code) now stay open until
the server answers and pop **only on success** — the old fire-and-forget popped first and
errored into a closed sheet, which read as "pressed join, nothing happened".

**Deploy note (owner's side):** none of this exists in production until the two challenge
migrations + the global migration are applied and challenge-join/checkin/finalize are
deployed (plus `CHALLENGE_CRON_SECRET` and a daily cron hitting challenge-finalize). The
join button will show the server's error line until then.

**App lock.** `lock_rules.dart` (cold start always locks; 45s background grace — pure,
tested), `app_lock_service.dart` (PIN bcrypt-hashed; biometric enable requires one successful
prompt), `LockGate` above BootGate (fails shut on cold start; the app is not built underneath
the lock), `LockScreen` (PIN boxes / fingerprint retry), Settings › Security segmented row,
and a one-time post-sign-in offer sheet (stamped before showing — worst case is "never
offered", never "offered every launch"). MainActivity is now FlutterFragmentActivity
(local_auth requirement); USE_BIOMETRIC added.

**Focus.** "What for" now built from the user's own habits AND goals plus a free-text chip
(schema v4: `focus_sessions.label`); the run screen got a breathing glow behind the hourglass
and a rotating line of encouragement (label-aware, pause-aware). `FocusRun.focusLabel` =
label ?? goal ?? habit.

**Login.** Badge is the real launcher icon (assets/brand/app_icon.png); the rings motif is
now the motto — CONSISTENCY (underlined, accent) beats LUCK (struck out), both lines drawing
themselves after the words land.

**Sundry, all user-reported:** usage-access grant now detected on app resume (the provider
streamed off table writes, so returning from Android Settings changed nothing — people tapped
"turn on" twice); Settings: Circles promoted to a card right under the profile, Standing
(badges/XP) section removed (quiet Badges row kept so the screen isn't orphaned); a circle
pointer card at the bottom of Habits; `createCircle` now sends the IANA zone via
FlutterTimezone — `DateTime.timeZoneName` gave "IST", which the server rightly refuses (found
while wiring, would have broken every real-device circle creation on deploy day).

453 tests green.

**Same-day addendum (owner testing live):** join/create sheets stay open and show the
server's sentence inline, popping only on success; Security is now a single App-lock
**toggle** — turning it on asks *how* (PIN, or fingerprint where the device has one);
sign-out now pops every pushed route before the gate swaps to login (Settings left on top
read as "sign-out did nothing"); `authUserIdProvider` is fed by `onAuthStateChange` for the
whole run, so a server-side session revocation kicks to login without a restart (found live:
a restored old session was revoked by refresh-token-reuse detection minutes into the run).
iOS: pods were never installed (`Module 'app_links' not found`) and CocoaPods crashed
without a UTF-8 locale — `LANG=en_US.UTF-8 pod install --repo-update` fixed it;
`NSFaceIDUsageDescription` added for local_auth; `flutter build ios --no-codesign` compiles.
Emulator-verified end to end: fresh install → login gate (new icon + CONSISTENCY-beats-LUCK
motto), Settings (Circle card, lock toggle, no Standing), usage-access "On" via resume
re-check, focus what-for chips from real habits+goals, breathing glow + encouragement lines,
cold start → lock screen → PIN unlock.

### Tenth pass — the gate made absolute, the lock removed (20 Aug 2026)

Owner ran the app from Android Studio — no dart-define file — and walked straight past
sign-in: the "no backend → local-only shell" fallback in BootGate was doing exactly what it
was designed to do, for exactly the person it should never greet. Two changes, both blunt:

- **AppConfig now compiles the production values in as defaults** (anon key, Supabase URL,
  Google web client id, RevenueCat key — all public-by-design; dart-define still overrides
  for other environments). A build can no longer silently lose its backend.
- **BootGate's local-only branch is deleted.** Signed out → login screen, absolutely.
  Verified on the emulator with a bare `flutter build apk --debug` — the Android-Studio-style
  build — landing on login.

**App lock removed entirely** at the owner's request ("irritating"): security/ feature
folder, AppLockService, LockRules + tests, providers, Settings section, post-sign-in offer,
local_auth dependency, USE_BIOMETRIC permission, NSFaceIDUsageDescription, and MainActivity
back to FlutterActivity. 448 tests green.

### Eleventh pass — the circle board, fractional points, and a big batch of owner feedback (20 Aug 2026)

**Circle board (owner's design, after first live join).** Scoring changed from all-or-nothing
perfect days to **fractional daily points** — done/required capped at 1/day ("finish 80%, get
0.8"), ties now rare by construction. New full-page `CircleBoardScreen` for BOTH circle kinds:
podium top-3 (#1 crowned and glowing), the board to #20, pace-based tier labels
(UNSTOPPABLE / CONSISTENT / BUILDING / WARMING UP — judged on points-per-day-elapsed, so day
3 competes fairly with day 28), caller's row pinned beneath when outside the top 20, member
"where I'm from" line (opt-in free text at join, 48 chars, the ONLY thing shown beside name
and number), and a browseable past-months hall of fame. Circles page cards slimmed to
summaries that open the board. `CircleScoring` + `CircleTier` are pure and tested; private
boards compute the identical arithmetic client-side.

**SERVER: apply + redeploy needed.** `20260821000000_circle_board.sql` (location columns,
rank check 1→20, points→numeric, RPC dropped & recreated fractional — pglast-clean 9
statements) and REDEPLOY challenge-join + challenge-finalize (location passthrough,
fractional top-20 snapshot).

**Owner-feedback batch, all shipped:**
- Tabs build fresh and open at the top (IndexedStack removed — "the page felt cropped");
  entrance animations replay per visit by the same stroke.
- Habit completion now holds ~1.2s with a success wash before the list regroups (task-row
  pattern); swipe right-to-left completes; the per-card edit icon is gone — editing lives in
  the Arrange screen (now "Arrange & edit"); the hero week-rings sweep themselves full,
  staggered, on every visit.
- Plan gamification: task/goal counters count up from zero; goal progress bars draw
  themselves; MARK ACHIEVED shrunk to a content-width outline button.
- Mood: one control — enabling immediately confirms the time (default 21:00; cancelling
  keeps the default rather than enabled-but-silent); row tap changes time; ListTile+Switch
  deliberately, since SwitchListTile's row-tap would have *disabled* on "tap to change".
  Cleared-reminder '' now loads back as null.
- Settings page slimmed hard: habits-count rows gone from Plan, reminder diagnostics down to
  one line, Your-data strip gone, legacy restore moved into the Backup screen, and Backup
  replaced by an **Auto backup** toggle — free members flipping it meet the paywall, Pro get
  Drive connect, and `_maybeAutoBackup()` takes one silent daily copy at launch (failures
  silent by design). Key `auto_backup_enabled`.
- Insights: the per-app table no longer leads — `TimeAdvice` (pure, in digital_wellbeing)
  turns the breakdown into one sentence with monthly/yearly projection ("3h a day ≈ 90h a
  month — halve it and buy back 45"), positive when the balance is healthy; the app table is
  a fold-out "fine-tune categories" drawer since it exists only to correct guesses.
- iOS screen-time analytics: **not buildable** — Apple's Family Controls entitlement renders
  usage data only inside a sealed extension; an app cannot read or analyze it. Feature
  remains Android-only and hides itself on iOS.

457 tests green.

### Twelfth pass — private circles grown up, the cap made honest, habits polish (20 Aug 2026)

**Private circles (owner's decisions).** Creating asks name + duration chips (7/14/21/30
days) + a friends stepper — **3 max free, 50 max Pro**, the single plan-shaped thing about
circles (the challenge test now pins that joining stays plan-blind and capacity is the only
allowed Pro consultation). Create success opens `ShareCircleSheet`: the code huge and
tap-to-copy, plus a share message carrying code AND Play Store link. The private board gains
an INVITE share card (creator only — invite-code RLS decides), LEAVE for everyone, and
DELETE for a creator still alone; the server's new `delete` action enforces creator+alone
and refuses the global circle, with member/invite/daily rows cascading. `max_members` is
caller-chosen, server-clamped to 50 (it cannot see RevenueCat; 3-free is a client bound).

**"Share today" became a fact.** `autoShareAll()` re-sends the tally to every joined circle
after habit changes (6s debounce) and at launch — with yesterday included before 03:00,
riding the server's existing grace window. The button remains as "SHARE NOW" with copy
saying it is optional. Global copy now states the monthly reset plainly.

**Free-cap bug (owner found it live: 10 habits on a free account).** Restore was the side
door — creation was gated, imports were not, and `applyGrandfathering` deliberately let old
users keep everything. Owner overruled: free means seven, however habits arrive. Replaced
with `enforceFreeCap(isPro:)` — first seven by creation order stay, the rest are ARCHIVED
(never deleted; Pro or un-archiving brings them back whole), run after every restore path
(legacy pull ×2 and the backup screen). Deliberately NOT run at boot: entitlements may not
have resolved yet, and wrongly archiving a Pro member's habits is the worse failure. Tests
rewritten around the new rule.

**Habits polish.** Completing now plays a 0→100 sweep with a percent counter in the card's
meta row during the 1.2s hold. Category marks upgraded from thin outlined icons to filled
rounded ones (Content's pencil — which read as "edit" — became a play tile; General's empty
circle became ∞; Social became groups), and **custom categories can lead with an emoji**
("🎸 Guitar"): stored as one string (old-app compatible), the emoji renders as the mark
everywhere via `HabitCategory.glyph()`, with a starter shelf of eight in the editor and any
typed emoji working.

456 tests green.

### Thirteenth pass — the habit finder, and circles feedback round two (20 Aug 2026)

**Habit finder** ("what should I even track?" answered in five taps). Pure engine
`domain/habit_finder.dart`: wake window, sleep window, focus areas (multi), starting level,
intensity → a curated routine — sleep/wake anchors first (only for people who need them),
area habits sized to level (fresh = "read 10 pages", steady = 20), an "all in" answer hands
back exactly seven, the free cap, on purpose. Wizard `habit_finder_screen.dart`: one
question per screen, big chips, progress trail, animated transitions, then a reveal list
where **+** creates the habit (through the same cap door as every create). Entry points:
Habits empty state leads with it, a pointer card sits under the habit list and another on
Insights, and a first-run offer opens it once for a signed-in account with zero habits
(stamped before showing).

**Circles, owner's second live round:**
- "Delete not working" = the deployed challenge-join predates the `delete` action —
  redeploy is the fix (created_by was verified stamped).
- Free plan: **one private circle** — enforced at create AND join with an in-sheet message,
  never a paywall route. Test re-pinned: the global join sheet stays plan-blind; private
  capacity/quantity may consult plan.
- **SHARE NOW removed everywhere** — sharing is automatic now, so the board's TODAY card
  became a passive status line ("4 of 6 done — worth 0.7 points, shared automatically") and
  the circle cards carry one line of the same. check_in_button.dart deleted.
- The full board page now carries LEAVE for the global circle too (was card-only), private
  members all have LEAVE (already), creator-alone has DELETE.
- Past months' leaderboard: already built as the PAST MONTHS section on the global board —
  appears when a settled month exists.

**Arrange page** gained a delete icon (confirm dialog, offers archiving as the
history-keeping alternative). **Category glyphs** land with a one-shot spring-and-settle
pop per visit (deliberately not a loop). **Completion** dropped the bar+percent for a green
gradient wash sweeping the whole card left→right during the hold.

456 tests green.

### Fourteenth pass — the focus screen brief, and finder v2 (20 Aug 2026)

**Focus/Pomodoro polish, per the owner's structured brief.** The architecture already
satisfied the brief's core demand — wall-clock timer as single source of truth, hourglass
purely derived from `fractionAt(now)` — so this was presentation:
- Hourglass to 262px, spacing tightened: the hero, not an illustration.
- **Pause now freezes the stream mid-air** (faded via a sand-toned saveLayer, grains hold
  exact position because the flow controller stops) instead of hiding it — readable as
  paused AND physically honest on resume.
- Session named plainly in the eyebrow: "FOCUS BLOCK · LISTEN TO A PODCAST"; clock label
  "15 MIN FOCUS" (was "OF 15 MIN"); the encouragement rotation no longer narrates the label.
- Button hierarchy: PAUSE/RESUME both primary; **COMPLETE SESSION** (renamed from FINISH
  EARLY — finishing early is not failure) as a small outline with a confirm ("You've focused
  for 11 of 15 minutes — it all counts" / Keep focusing); DISCARD stays small and red.
- Cycle dots captioned: "Session 2 of 4 today".
- Completion: check + "Focus complete / Nice work — N minutes", one elastic settle pulse on
  the hourglass (no confetti), DONE (banks + closes) / START ANOTHER (banks + returns to
  setup with choices kept).
- **The flip**: a fresh run (startedAt < 4s ago) enters with the hourglass rotating upright
  — once per session, never on pause/resume or revisit. All decorative motion (flip, pulse,
  breathing glow) honours `MediaQuery.disableAnimations`.

**Habit finder v2 (owner feedback within the hour).** Wake and bedtime became 15-minute
sliders with a big lime readout and a live quip that answers back ("The snooze button is
winning this relationship"; "Officially tomorrow. Batman hours") — sharp enough to be fun,
never mean enough to make someone lie to the slider; bedtime runs 9 PM–6 AM for the night
owls and the copy dropped "lights out" for "when do you actually sleep?". Areas grew 8→14
(coding, language, business, gratitude, family…, every one backed by a suggestion — a test
walks all of them), capped at five picks with a counter and a gentle "focus beats breadth"
nudge. Levels grew 3→5 (never-started … locked-in). Times feed the engine as exact minutes:
anchors now say "Up by 7:30 AM — half an hour earlier than your current 8:00 AM".

464 tests green. Owner drove the wizard live on the emulator mid-build.

### Fifteenth pass — the Free/Pro line, drawn and wired (20 Aug 2026)

Owner locked the split after a full audit. **Free = the complete daily loop, last 30 days:**
7 habits, 2 focus blocks/day, tasks/goals/mood/weekly review/Ask/finder unlimited, the
StayHardy Circle forever, one 3-member private circle, manual export/restore. **Pro =
limits off + history + safety net:** unlimited habits & focus, 90D/1Y stats ranges, calendar
months older than 30 days, screen-time deep dive, Drive auto-backup, big/multiple circles.

Wired this pass:
- Stats range chips: 30D free; 90D/1Y render with a 🔒 for free users and route to the
  paywall on tap — visible-but-locked sells, hidden doesn't. Default range now 30D.
- Calendar back-arrow: a month that ended before today-30 is Pro (same line as stats).
  Habit detail needed no gate — it is inherently a 30-day view.
- Paywall list rewritten to exactly what is gated, including the owner's required honesty
  line: "Without it, everything lives only on this phone — delete the app and the history
  goes with it." Same warning under the auto-backup toggle in Settings.
- Also this pass (owner request): quota reset trick documented — re-dating
  focus_sessions.local_date via run-as tar round-trip frees the free-block quota without
  touching sign-in or habits (delete stale -wal/-shm after pushing the edited db).

464 tests green.

### Sixteenth pass — release-readiness fixes (20 Aug 2026)

Owner's pre-release bug list, all addressed:
- **Forgot-PIN actually resets now.** Root cause found: the website's ResetPassword page
  reads tokens from the URL *query*, but Supabase delivers them in the *hash fragment* — so
  the site loads bare (this bug bites the live site too; site fix is a separate owner
  deploy). The new app no longer depends on the site: an intent-filter catches
  stayhardy.com/auth/reset, supabase_flutter (PKCE) exchanges the code, the
  `passwordRecovery` event opens the new in-app SetNewPinScreen — new PIN twice →
  `updateUser('SH'+pin)` + bcrypt users.pin mirror → signed in and done. autoVerify stays
  off until assetlinks.json is published; until then Android offers the app in the chooser.
- **Perf**: `FlutterDisplayMode.setHighRefreshRate()` at boot (many Androids pin Flutter to
  60Hz), and — the real story — the owner had only ever run DEBUG builds; release build
  produced for final testing. Signing falls back to the debug keystore until
  keystore.properties exists.
- **Splash now exists as a moment**: BootGate holds the GRINDING… splash for 1.1s on every
  cold start (the boot decision resolved in milliseconds, so the splash never appeared).
- **Badge popups removed** (celebrateNewBadges call deleted); badges live in Settings only.
- **Pro onboarding offers, once each**: fresh install + Drive backups present + empty local
  → "Your backup is here — restore?" (downloads newest, full restore, all providers
  invalidated); auto-backup off → "Turn on auto backup?" (enables + connects Drive).
- **Backup screen**: Google Drive section now leads and CONNECT is Pro-gated (free →
  paywall); manual export/restore beneath; the legacy old-account restore section removed —
  the first-launch prompt is the migration path.
- **About** rebuilt from the old app's "Why StayHardy?" page: the same promise copy, the
  five points, MEET THE CREATOR with Joe's photo + LinkedIn, version. Feedback verified
  wired to the same `feedback` table as the old app.

464 tests green.

### Seventeenth pass — fairness, the monthly prize, and the free seatbelt (21 Aug 2026)

- **Placeholders localised**: "Call the bank" → "Recharge the phone"; "Run a half
  marathon" → "Close the credit card EMI". Goals page no longer shows two NEW GOAL
  buttons when empty (bottom courtesy button now requires a list to be at the bottom of).
- **iOS**: every screen-time surface now hides itself off-Android (`supported` gate in the
  Insights tab and the Settings row, plus an honest one-liner on iOS) — the TURN ON that
  crashed iPhones cannot render there any more.
- **Fair points** (owner's ruling after the two-habits-beats-ten discussion):
  `min(done,7) / clamp(required,3,7)`, capped at 1. Two easy habits max at 0.67/day; three
  real habits done = full day; 2-of-10 scores against 7 not 10; padding past seven earns
  nothing. Applied in `20260822000000_circle_fair_points.sql` (RPC rebuilt), finalize's
  snapshot, and CircleScoring — with tests pinning each example. Board copy explains it.
- **The monthly prize, automated**: challenge-finalize now grants the month's #1
  **lifetime Pro** via RevenueCat's promotional-entitlement API (needs the
  `REVENUECAT_SECRET_KEY` function secret — the sk_ key). Winner keyed by Supabase uuid,
  so Pro appears at their next launch; hall-of-fame #1 shows a trophy + "WON LIFETIME
  PRO"; join card advertises it. Grant is best-effort with loud logs; the snapshot row
  makes a manual dashboard regrant always possible.
- **Free tier gets a seatbelt**: the Auto backup switch now works for everyone — free
  writes a rolling ON-DEVICE copy (one file, overwritten daily, last 30 days of dated
  rows, structure always whole) restorable from the new "On this phone" row; manual free
  exports carry the same 30-day window. Pro unchanged: full copy to their Drive.
  Uninstall still deletes the local copy — stated, deliberate.

475 tests green. **Deploy needed**: run `20260822000000_circle_fair_points.sql`, redeploy
challenge-finalize (+ challenge-join if not yet), set `REVENUECAT_SECRET_KEY`.

### Eighteenth pass — health automations, and ties all win (21 Aug 2026)

**Owner-approved automation suite** (all written, deploy pending):
- **Winner announcement, circle-members-only**: finalize posts the champion(s) into
  `announcements` with category 'circle'; the client's announcements provider filters that
  category to global-circle members, and members get a rich LOCAL notification (channel
  `circle_news`, BigText) at next app wake — no FCM in this project, stated honestly.
  Tap routes to What's New.
- **Ties all win** (owner's ruling): the prize criterion is POINTS, not the display
  tie-break. `challenge_hall_of_fame.won` column added (`20260824000000_ties_win.sql`);
  finalize grants lifetime Pro to EVERY top-points player and the snapshot flags each;
  the client trophies all `won` rows ("· WON LIFETIME PRO"). Join card gains an
  amber MONTHLY PRIZE strip — "Top the board, win Pro FOR LIFE; tied at the top,
  everyone tied wins."
- **notify-feedback**: Database-Webhook receiver → Resend email to the owner on every
  feedback insert (guarded by WEBHOOK_SECRET header match).
- **weekly-digest**: Monday email — new sign-ups, active circle members, tallies shared,
  feedback count, and the cron watchdog (failed runs from cron.job_run_details, read via
  the new `ops_weekly_digest()` SECURITY DEFINER RPC in `20260823000000_ops.sql`;
  service_role-only, anon revoked).
- **revenuecat-webhook**: mirrors Pro into `users.is_pro` (EXPIRATION → false;
  entitlement-carrying events → true; CANCELLATION deliberately ignored — cancelled stays
  active until expiry). Auth via REVENUECAT_WEBHOOK_AUTH header equality.

**Deploy checklist**: run `20260823000000_ops.sql` + `20260824000000_ties_win.sql`;
deploy challenge-finalize, notify-feedback, weekly-digest, revenuecat-webhook; secrets
RESEND_API_KEY / WEBHOOK_SECRET / REVENUECAT_WEBHOOK_AUTH (+ OWNER_EMAIL optional);
digest cron `0 3 * * 1`; dashboard Database Webhook on `feedback`; RevenueCat webhook
config. 475 tests green.

## Next up (in order)

**Nothing in the app is half-built.** Every remaining item is either a deploy step that is
yours to run, a feature blocked on an external permission, or launch polish.

**Yours to run — written, verified, not applied**
1. Apply `20260815000000_razorpay_webhook_support.sql`, set `RAZORPAY_WEBHOOK_SECRET`, deploy
   `razorpay-webhook`, add the endpoint in the Razorpay dashboard. **This one is losing money
   today** — it is the only item here with an ongoing cost.
2. Apply `20260815000001_challenge.sql`, deploy `challenge-join` / `challenge-checkin` /
   `challenge-finalize`, set `CHALLENGE_CRON_SECRET`, point an hourly caller at finalize.

**Blocked on something outside the code**
3. Challenge PAID half — legal review AND the Play-policy contradiction. No payment functions
   were written: the collection mechanism is genuinely undecided, and a skeleton built against
   the wrong one is worse than none.
4. Drive upload — needs the `drive.appdata` scope. Client, retention and UI are already written
   behind an honest "not switched on yet".
5. Push — `google-services.json` absent; 0 tokens ever. Challenge reminders cannot rely on it.
6. Purchase verification — needs a Play internal testing track.

**Launch polish**
7. App icon, splash, Sentry, Tamil, iOS. The icon and splash still carry the old brass palette
   and now clash with the violet UI — worth doing before anything ships.
8. Delete `dev_seed.dart` once real migration lands.
9. Upload the bridge release (1.1.14 / vc25) to Play as internal testing — built and verified,
   still not uploaded.
10. `HabitRepository.toggle()` `backfilled` propagation (see Known issues).

## Production facts (verified against the live project)

- **274 users total**, 61 with unconfirmed emails — but **0 of those 61 have any data**.
  Account-forking on Google sign-in therefore cannot cost anyone real history.
  DO NOT bulk-confirm emails; it would protect nobody and create risk.
- `public.goals` has ONLY `userId` (no `user_id`). Confirms `Settings.tsx:378` is a real bug —
  "Reset Goals" has never worked and orphaned rows exist.
- **Push has never worked**: 0 tokens, 0 opt-ins, no timestamp ever. `send-daily-pushes` has
  been firing into nothing. A fresh Firebase project costs nothing.
- **Bridge release VERIFIED on a real device** (1.1.13 -> 1.1.14 upgrade path): habit order,
  Supabase session + refresh token, theme, and marker all carried into CapacitorStorage.
  Clean AAB rebuilt, `debuggable` absent. Ready to upload as internal testing.

## Known issues / carried risks

- **CHALLENGE PAID HALF IS BLOCKED, and on two things, not one.** (1) The owner's legal review —
  deposit framing, T&C, refund policy, GST, RazorpayX KYC. (2) **A contradiction in the owner's
  own notes**: `CLAUDE_PROJECT_NOTES.md:124` says *"Never use Razorpay inside Android app —
  violates Google Play policy"* and `:209` *"Razorpay = web only. RevenueCat = Android only"* —
  but the locked decision is Razorpay collect + RazorpayX payout, for an Android app. Both cannot
  be true. The likely resolution is that a **returnable deposit is not a purchase of digital
  content**, which is exactly the framing question already on the legal list — so **add the
  Play-billing question to that same review** rather than treating it as settled.
- **The server can never verify a challenge check-in.** Habit logs never leave the device, so
  every count is client-computed. The client-side filters (backfilled / migration / restore /
  freezes) raise the cost of cheating slightly; the **payout model is the actual defence**. The
  cheapest attack is editing your own unsigned Drive backup and restoring it — `habit_logs`
  merges as a union where an incoming row never loses — which defeats the source filter for the
  price of typing a zero into a JSON file. This is a commitment device, not an escrow, and it
  must never be marketed as one.
- `HabitRepository.toggle()` does not propagate `backfilled` to `toggleOn` — harmless today
  because both callers use today's date, but it will silently record a past day as same-day the
  moment anyone passes `on:`. Fix before `backfilled` carries any weight.
- **RazorpayX / payouts do not exist.** No payout, refund-execution, bank-details or KYC code
  anywhere. `challenge_payouts` is schema only.

- `dev_seed.dart` is debug-only and must be deleted once real migration lands
- `google-services.json` missing from the repo — Android push may be silently broken today
- Live `public.goals` may have BOTH `userId` and `user_id`; mappers read either via
  `LegacyMappers.either` — verify against prod before launch
- OAuth consent verification for `drive.appdata` reportedly gates GA (4–8 wks, 100-user cap)
- Nothing is committed to git; `mobile/` is untracked by design until reviewed
- A Drive restore wipes `habit_streak_state`, which also holds the freeze ratchet
  (`freezes_earned_total`), so the next rollover re-grants entitlement. That tops the bank back
  up to `maxBalance` and no further — it cannot accumulate and cannot reach past periods,
  because spending is still gated on `last_freeze_run_date` and the 7-day repair window.
  Noted in `backup_service.dart` at the wipe. If freezes ever become purchasable, this needs a
  real fix (back the ratchet up, or move it out of the derived table)
