# StayHardy — Claude Project Notes
> Last updated: 2026-03-29
> Purpose: Fast reference for Claude to understand the project without re-exploring every session.

---

## Project Overview
**StayHardy** is a habit/productivity mobile app (Android + Web) built with:
- **Frontend:** React + TypeScript + Tailwind CSS + Vite
- **Mobile:** Capacitor (Android via Android Studio)
- **Backend:** Supabase (Auth, DB, Storage, Edge Functions)
- **Payments:** RevenueCat (Android in-app purchases) + Razorpay (web only)
- **Hosting:** Vercel (web), Android Studio (APK)

---

## Project Structure
```
/Users/joeamuthan/Music/StayHardy/
├── frontend/                   ← MAIN PROJECT (always build here)
│   ├── src/
│   │   ├── pages/              ← Page components
│   │   ├── components/         ← Shared components
│   │   ├── context/            ← React contexts
│   │   ├── services/           ← External services (RevenueCat etc.)
│   │   ├── lib/                ← Business logic
│   │   ├── utils/              ← Utilities
│   │   ├── config/             ← Config files (adminOwner.ts)
│   │   └── hooks/              ← Custom hooks
│   ├── android/                ← Capacitor Android project
│   ├── dist/                   ← Built web assets (synced to Android)
│   └── .env                    ← Environment variables
├── backend/                    ← Supabase edge functions etc.
├── database/                   ← DB schema/migrations
└── supabase/                   ← Supabase config
```

> ⚠️ There is also a worktree at `.claude/worktrees/practical-leavitt/` — **always build from the MAIN project** `/Users/joeamuthan/Music/StayHardy/frontend/` or Android Studio won't see changes.

---

## Build & Sync Commands (always run from main project)
```bash
cd /Users/joeamuthan/Music/StayHardy/frontend
npm run build          # builds to dist/
npx cap sync android   # copies dist/ → android assets
```
After every change: **Build → Clean Project → Rebuild → Run** in Android Studio.

---

## Admin Account
| Field | Value |
|---|---|
| Name | Joe |
| Email | `joeamuthan2@gmail.com` |
| DB role | `admin` |
| is_pro | `true` |
| Supabase user ID | `7431b740-60d8-41e9-9c55-994e3b40cf38` |

Admin detection is **dual-check** (email OR DB role):
```ts
// SideMenu.tsx
const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL || user?.role === 'admin';

// adminOwner.ts
OWNER_ADMIN_EMAIL = 'joeamuthan2@gmail.com'
isAdminHubUser(user) → checks email OR user.role === 'admin'
```

---

## Key Environment Variables (`.env`)
```
VITE_ADMIN_EMAIL=joeamuthan2@gmail.com
VITE_REVENUECAT_ANDROID_KEY=...
VITE_REVENUECAT_IOS_KEY=...
VITE_RAZORPAY_KEY_ID=rzp_live_STxtr78ph0HFG9
VITE_SUPABASE_URL=https://tiavhmbpplerffdjmodw.supabase.co
```

---

## Key Pages & Routes
| Route | File | Notes |
|---|---|---|
| `/home` | `HomeDashboard.tsx` | Main dashboard |
| `/settings` | `Settings.tsx` | Profile, account, support |
| `/admin` | `AdminDashboard.tsx` | Admin only — guarded by `AdminRoute` |
| `/paywall` | `Paywall.tsx` | RevenueCat Pro subscription |
| `/updates` | `StayHardyUpdatesPage.tsx` | News & Updates |
| `/feedback` | `Feedback.tsx` | Send Feedback |
| `/routine` | `Routine.tsx` | Habits (Pro feature) |
| `/stats` | `Stats.tsx` | Stats (Pro feature) |
| `/tips` | `Tips.tsx` | Web-only Razorpay donations |
| `/goals` | `Goals.tsx` | Goals page |
| `/calendar` | `Calendar.tsx` | Calendar/Reminders |

---

## Key Components
| File | Purpose |
|---|---|
| `SideMenu.tsx` | Main sidebar navigation — hamburger menu |
| `BottomNav.tsx` | Bottom tab bar |
| `SupportModal.tsx` | "Fuel This Mission" tip modal (RevenueCat) |
| `PaywallModal.tsx` | Inline paywall modal |
| `ProBlurGate.tsx` | Blurs pro features for non-pro users |
| `NativeBackButton.tsx` | Android back button handler |

---

## Payments
### Android App → RevenueCat (Google Play Billing)
- **Subscriptions:** `stayhardy_pro_monthly`, `stayhardy_pro_yearly`
- **Tips (consumables):** `tip_29`, `tip_49`, `tip_99`
- **Offering ID for tips:** `Tips` (capital T)
- **Service:** `src/services/revenuecat.ts` → `RevenueCatService`
- **Context:** `src/context/SubscriptionContext.tsx` → `useSubscription()`
- `isPro` from `useSubscription()` is the **source of truth** for subscription status

### Web (Vercel) → Razorpay
- Only used in `Tips.tsx` (web donations page)
- **Never use Razorpay inside Android app** — violates Google Play policy

---

## Global Hamburger Menu Issue & Fix Pattern
The global hamburger button in `App.tsx` is `position: fixed`, `top: calc(env(safe-area-inset-top, 0px) + 16px)`, `zIndex: 1500`.

**Fix for any page where hamburger overlaps content:**
```ts
// For sticky headers (back button + title):
paddingTop: 'calc(env(safe-area-inset-top, 0px) + 60px)'

// For page-level top padding (e.g. Settings):
padding: 'calc(env(safe-area-inset-top, 0px) + 60px) 16px ...'
```

**Pages already fixed:**
- `StayHardyUpdatesPage.tsx` ✅
- `Feedback.tsx` ✅
- `Settings.tsx` ✅ (padding via `.set-premium-page` style)

---

## Auth & User Role Flow
1. User logs in → Supabase Auth session created
2. `AuthContext.tsx` loads user from session + fetches `public.users` table
3. `role` field from DB is merged into `user.role`
4. `resolveUserRole(email)` in `adminOwner.ts` ensures admin email always gets `'admin'`
5. `isPro` from `public.users.is_pro` or RevenueCat entitlement `'StayHardy Pro'`

---

## Onboarding Screens
| Screen | File | Notes |
|---|---|---|
| Screen 1 | `OnboardingScreen1.tsx` | First intro |
| Screen 2 | `OnboardingScreen2.tsx` | Habit heatmap — 26 cols, 7 rows, spells "STAY" in green pixels |
| Screen 3 | `OnboardingScreen3.tsx` | Final CTA |

Heatmap grid setup:
```ts
gridTemplateRows: 'repeat(7, 1fr)'
gridAutoFlow: 'column'
gridAutoColumns: '1fr'
gap: '4px'
height: '200px'
// 26 columns × 7 rows = 182 cells, column-major data order
```

---

## Settings Page — Danger Zone
- **Reset Habits** — resets routines + routine_logs ✅
- ~~Reset Tasks~~ — removed
- ~~Reset Goals~~ — removed
- **Delete My Account** — calls `delete-user` edge function, then `wipeLocalDataAfterAccountDeletion()`, `setAccountDeletedToastFlag()`, then logout ✅

---

## Supabase Tables (known)
| Table | Key columns |
|---|---|
| `public.users` | `id, name, email, role, is_pro, avatar_url, status, pin` |
| `announcements` | `id, title, message, category, is_active, created_at` |
| `tasks` | `userId, ...` |
| `routines` | `user_id, ...` |
| `routine_logs` | `user_id, ...` |
| `goals` | `user_id, ...` |

---

## RevenueCat Tips Setup (completed)
- Products created in Google Play Console: `tip_29`, `tip_49`, `tip_99`
- Products added in RevenueCat → Products section (StayHardy Play Store)
- Offering created: identifier `Tips`, display name `User Tips`
- 3 packages with custom identifiers: `tip_29`, `tip_49`, `tip_99`
- Method to fetch: `RevenueCatService.getTipsOffering()` → looks up `offerings.all['Tips']`

---

## Common Gotchas
1. **Always build from main project** `/Users/joeamuthan/Music/StayHardy/frontend/` — NOT the worktree
2. **Android Studio caching** — always Clean → Rebuild → Run to see web asset changes
3. **`isPro` source of truth** = `useSubscription().isPro` from RevenueCat, NOT `user_metadata.role`
4. **Admin check** = email match OR `user.role === 'admin'` from DB (dual check)
5. **Razorpay** = web only. RevenueCat = Android only
6. **Safe area insets** — always use `env(safe-area-inset-top/bottom, 0px)` for Android notch support
