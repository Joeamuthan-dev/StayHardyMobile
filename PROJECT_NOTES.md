# StayHardy — operational notes

Facts that cost real time to establish. Written down so they never have to be
rediscovered.

Last updated: 21 August 2026

---

## Identity

| | |
|---|---|
| Package | `com.stayhardy.app` |
| Play title | StayHardy: Build Better Habits (30/30 chars — at the cap) |
| Repo | `Joeamuthan-dev/StayHardyMobile` (mobile **and** website live here) |
| Website | https://stayhardy.com — Vercel project `stay-hardy` |
| Supabase | project `tiavhmbpplerffdjmodw` |

### Accounts — these differ, and mixing them wastes hours

| Service | Account |
|---|---|
| Play Console | `amuthanjoe2@gmail.com` |
| Google Cloud / OAuth (project `stayhardy`) | `joeamuthan2@gmail.com` |
| Vercel org | `joeamuthan-devs-projects` |

---

## Signing — the single most expensive lesson

The Play upload key is the **5F** key:

```
SHA-1   5F:5F:60:FF:F8:2D:3E:6E:2A:9C:F0:BE:14:DA:CC:A4:82:81:08:EB
SHA-256 07:C0:E3:AC:90:06:9C:20:C1:9F:26:07:BA:81:A6:58:E4:9B:3D:E1:BD:E6:5E:98:41:27:0A:9A:2D:68:00:5D
alias   stayhardy
file    frontend/android/upload-key-5F.jks   (gitignored — never commit)
```

**Play's "different certificate" error names the certificate it received, not
the one it wants.** Four rebuilds were wasted reading it the other way. When in
doubt, Play Console → App signing states the expected upload key outright.

The same SHA-1 must be on the Android OAuth client, or Google Sign-In fails on
release builds while working fine in debug.

Verify any artifact before uploading:

```bash
apksigner verify --print-certs app-release.apk        # APK
keytool -printcert -file META-INF/*.RSA                # from inside an AAB
```

---

## Release process

```bash
cd mobile
flutter analyze && flutter test          # must be clean; 566 tests as of 2.0.8
flutter build appbundle --release        # -> build/app/outputs/bundle/release/
```

Then Play Console → Closed Testing – Beta → Create release → upload → notes →
Save → **Submit for review** (a separate step from Save).

Hard-won details:
- **Verify the artifact AND the notes together before saving.** A prepare-page
  re-render once wiped both and published an empty release, deactivating a
  working build. Check the release shows "1 version code".
- Play's "What's new" is capped at **500 characters**.
- Uploading over an in-review release **cancels and restarts that review**.
- Version code must only ever increase.

Current state: **2.0.8 (35)** in review on Closed Testing – Beta.
Production is still **1.1.13 (24)** — the old Capacitor app. 2.0 has never
reached production. A production release with the same bundle sits saved as a
draft, deliberately unsubmitted.

---

## Vercel — how the website actually deploys

Git-connected: **push to `main` builds and deploys**. There is no CLI step.

If pushes stop deploying, check Project → Settings → Git for
`Error: Project Link not found`. That means Vercel's GitHub App lost access to
the repo. Reinstalling the App does **not** repair it. The fix:

1. Disconnect
2. "Adjust GitHub App Permissions" → grant access to `StayHardyMobile`
3. Reconnect — and confirm it says **StayHardyMobile**, not `StayHardy`
   (a different repo that will silently connect and never build)

Reconnecting does not replay missed webhooks; push a new commit to trigger one.

The site is HashRouter: admin is at **`/#/login`**, not `/login`.

---

## Rules that hold across the codebase

**A flexible habit owes the week, not the day.** `Schedule.isDueOn()` returns
false for `timesPerPeriod`, so counting completions against an `isDueOn`
denominator lets a flexible check-in pay down the *daily* habits' quota. Four
places had this bug: the Stats headline, the weekly review, perfect-week badge
detection, and the screen-time correlation. Every rate now counts a flexible
habit only on days it is actually kept.

**A rest day is a gap, never a zero.** Nothing scheduled is not a failure.

**Today does not vote on a rolling average.** A day in progress dragged the
trend down every morning until it was excluded.

**Never derive one number two ways.** Every disagreement this project has had —
73% vs 71%, "Drive connected" above a Connect button, best-weekday naming a
different day than the chart — was two sources answering one question.

**Screen-time data never leaves the device.**
**The RevenueCat `sk_` key lives only in Supabase function secrets.**
The Supabase **anon** key in `app_config.dart` is public by design and safe in
git; RLS is what protects the data.

---

## Known-good facts

- Google Drive backup needs the consent screen published for `drive.appdata`;
  a real 403 now surfaces as "Drive backup is not switched on yet".
- Push notifications have never worked (no `google-services.json`, zero tokens).
  Anything built must be useful without them.
- `seedDevData` is gated on `kDebugMode` **and** an empty database. It seeds 180
  days of habits, mood, goals and tasks — used for store screenshots.
- Debug builds render identically to release
  (`debugShowCheckedModeBanner: false`), so screenshots from them are shippable.

---

## Open items

- Home shows "4-day streak" while Stats shows "181 CURRENT" on the same data.
  They may measure different things by design — unverified.
- Admin dashboard has never been seen rendered; needs a sign-in at `/#/login`.
- Admin Users/Revenue data grids with pagination — requested, not built.
- 30-day trial — planned, not in 2.0.8. Deliberately absent from store copy.
- Paid challenge cohorts blocked on legal review and a Play-policy question:
  project notes say "never use Razorpay in-app", but the challenge design
  assumes Razorpay collect + RazorpayX payout.

---

## Store assets

`/Users/joeamuthan/Music/SH2.0/UPLOAD` — 8 phone screenshots, 7" and 10" tablet
frames, the 1024x500 feature graphic, and both description files (emoji and
pure-ASCII). Short description (72/80):

> Habit tracker with streaks, goals, tasks & mood. Free, offline, private.

Free tier is `freeHabitLimit = 7` and `freeFocusSessionsPerDay = 2`, 30-day
history. Pro adds unlimited habits and focus, 90-day/1-year history, and Drive
backup. Tasks and goals were never capped — older store copy claimed otherwise.
