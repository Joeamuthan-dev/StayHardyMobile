-- Accountability circles and the challenge engine.
--
-- THE TRUST MODEL, STATED PLAINLY
-- ------------------------------
-- Habit content never leaves the device. There is no habit sync: the only
-- Flutter→Supabase write in the whole app is a feedback insert. So the server
-- CANNOT verify that a check-in reflects work actually done — it receives a
-- count the client computed and can only check that the count is internally
-- consistent, arrives in the right window, and is not replayed.
--
-- This is therefore a COMMITMENT DEVICE WITH A SOFT TRUST MODEL, not a
-- fraud-proof escrow, and the payout design is what makes that safe:
--
--   **You get your own stake back.** Complete the cohort → refunded. Fail →
--   forfeited to the destination named on the cohort. There is no pot split.
--
-- That single decision removes the incentive behind almost every attack: a
-- successful cheat gains the cheater nothing but their own money returned.
-- Sybil accounts stop paying for themselves, a one-member cohort stops being
-- degenerate, and the framing stays "refundable deposit" rather than "prize
-- competition" — which is the safer reading under Indian gaming law.
--
-- Nothing here can move money. `kind = 'paid'` is rejected at join by
-- `challenge-join` until the owner's legal review clears.

-- `is_cohort_member` below is a `language sql` function whose body reads
-- `challenge_members` — a table this same script only creates further down.
-- Postgres validates SQL function bodies at CREATE time, so without this the
-- script fails on itself with 42P01. Same technique pg_dump uses; the body is
-- checked at first call instead, when every table exists. Applies to this
-- session only.
set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Membership helper
-- ---------------------------------------------------------------------------
-- Needed because an inline `exists (select 1 from challenge_members ...)` inside
-- challenge_members' OWN policy recurses. SECURITY DEFINER breaks the cycle.

create or replace function public.is_cohort_member(c uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.challenge_members m
    where m.cohort_id = c
      and m.user_id = auth.uid()
      and m.status in ('active', 'completed', 'failed', 'withdrawn')
  );
$$;

revoke all on function public.is_cohort_member(uuid) from public;
grant execute on function public.is_cohort_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Cohorts
-- ---------------------------------------------------------------------------
create table if not exists public.challenge_cohorts (
  id                  uuid        primary key default gen_random_uuid(),

  -- Discriminate on `kind`, NOT on `stake_paise > 0`.
  -- A numeric comparison buried in a predicate is invisible to review and to
  -- grep; `kind = 'paid'` is neither. The cross-check below keeps them honest.
  kind                text        not null default 'free'
                                  check (kind in ('free', 'paid')),
  stake_paise         bigint      not null default 0 check (stake_paise >= 0),
  constraint challenge_cohorts_kind_stake_agree
    check ((kind = 'free' and stake_paise = 0)
        or (kind = 'paid' and stake_paise > 0)),

  name                text        not null check (length(trim(name)) between 1 and 60),

  -- IANA name, e.g. 'Asia/Kolkata'. NOT a UTC offset integer — IST is +05:30
  -- and Nepal is +05:45, and every offset design breaks on DST besides.
  -- Pinned on the COHORT, never read per-member: a member's flight to another
  -- country must not move everyone else's deadline.
  timezone            text        not null,

  -- Civil dates in `timezone`, not timestamptz.
  start_day           date        not null,
  end_day             date        not null,
  constraint challenge_cohorts_dates check (end_day >= start_day),

  min_members         integer     not null default 1 check (min_members >= 1),
  max_members         integer     not null default 50 check (max_members >= 1),

  -- Where a failed stake goes. Never to other participants — see the header.
  forfeit_destination text        not null default 'charity'
                                  check (forfeit_destination in ('charity', 'house')),

  -- The rules the user actually agreed to, pinned so a settlement months later
  -- can be adjudicated against them rather than against whatever ships today.
  rules_version       integer     not null default 1,
  terms_url           text,

  status              text        not null default 'open'
                                  check (status in ('draft', 'open', 'running', 'settled', 'cancelled')),
  visibility          text        not null default 'private'
                                  check (visibility in ('private', 'public')),

  -- Nullable deliberately: `not null` together with `on delete set null` is
  -- self-contradictory and would make deleting the creator's account fail.
  -- A cohort outliving its creator is fine; a user who cannot delete their
  -- account is not.
  created_by          uuid        references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  finalized_at        timestamptz
);

create index if not exists challenge_cohorts_status_idx
  on public.challenge_cohorts (status, end_day);

alter table public.challenge_cohorts enable row level security;

-- Deliberately NOT `using (auth.uid() is not null)`. That is the mistake in
-- 20260330000001_leaderboard.sql, and here it would leak every cohort's stake,
-- size and membership to every signed-in user.
create policy "challenge_cohorts_select_member_or_public"
  on public.challenge_cohorts for select
  using (
    public.is_cohort_member(id)
    or (visibility = 'public' and status in ('open', 'running'))
  );

-- No client insert/update/delete. Creation goes through `challenge-join`, which
-- generates the invite code and validates the timezone. Update is closed so a
-- creator cannot edit the stake or the end date mid-cohort.

-- ---------------------------------------------------------------------------
-- Invite codes — deliberately a SEPARATE table
-- ---------------------------------------------------------------------------
-- If the code lived on challenge_cohorts, then any row a user can SELECT hands
-- them a join token; for public cohorts that is every code in the system.
-- Codes are resolved only inside `challenge-join` under the service role.

create table if not exists public.challenge_invites (
  cohort_id  uuid        primary key references public.challenge_cohorts(id) on delete cascade,
  code       text        not null unique check (code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);

alter table public.challenge_invites enable row level security;

-- Creator only, so they can show the code to invite people. Nobody else can
-- read it, and nobody can enumerate.
create policy "challenge_invites_select_creator"
  on public.challenge_invites for select
  using (
    exists (
      select 1 from public.challenge_cohorts c
      where c.id = public.challenge_invites.cohort_id
        and c.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------
create table if not exists public.challenge_members (
  cohort_id         uuid        not null references public.challenge_cohorts(id) on delete cascade,
  user_id           uuid        not null references auth.users(id) on delete cascade,

  -- Snapshotted at join. NOT derived from the email local-part the way
  -- leaderboard does (patch_add_pro_members_to_leaderboard.sql:8) — that leaks
  -- part of someone's email address to strangers in a public cohort.
  display_name      text        not null default 'Member',

  status            text        not null default 'active'
                                check (status in ('pending_payment', 'active', 'completed', 'failed', 'withdrawn', 'refunded')),

  -- Monotonic replay guard. The server refuses any check-in for a day at or
  -- before this, so rolling the device clock backwards buys nothing. Same
  -- discipline as SettingsKeys.lastFreezeRunDate on the client.
  max_day_submitted date,

  days_completed    integer     not null default 0 check (days_completed >= 0),
  joined_at         timestamptz not null default now(),
  activated_at      timestamptz,
  left_at           timestamptz,

  primary key (cohort_id, user_id)
);

create index if not exists challenge_members_user_idx
  on public.challenge_members (user_id);

alter table public.challenge_members enable row level security;

create policy "challenge_members_select_own_or_cohort"
  on public.challenge_members for select
  using (user_id = auth.uid() or public.is_cohort_member(cohort_id));

-- No client writes. Joining is an Edge Function (capacity, start cutoff,
-- payment state); status transitions carry financial meaning; and leaving is a
-- transition, not a delete.

-- ---------------------------------------------------------------------------
-- Daily standings — the only table the check-in function writes
-- ---------------------------------------------------------------------------
create table if not exists public.challenge_daily (
  cohort_id       uuid        not null references public.challenge_cohorts(id) on delete cascade,
  user_id         uuid        not null references auth.users(id) on delete cascade,

  -- Civil date in the COHORT's timezone.
  day             date        not null,

  habits_required integer     not null check (habits_required between 0 and 20),

  -- Genuinely completed, and covered-by-a-freeze, kept SEPARATE.
  -- PeriodOutcome.satisfied is `frozen || completed >= required`, so one
  -- conflated integer would let a hand-granted freeze (FreezeSource.manual)
  -- buy a day. The cohort ruleset decides whether frozen days count; the
  -- storage never pre-decides it.
  habits_done     integer     not null check (habits_done >= 0),
  habits_frozen   integer     not null default 0 check (habits_frozen >= 0),
  constraint challenge_daily_done_within_required
    check (habits_done + habits_frozen <= habits_required),

  streak          integer     not null default 0 check (streak >= 0),

  -- Server-assigned. `client_ts` is recorded ONLY to measure skew and is never
  -- an input to any decision.
  submitted_at    timestamptz not null default now(),
  client_ts       timestamptz,
  flags           text[]      not null default '{}',

  -- Without this, two concurrent check-ins double-count the same day.
  primary key (cohort_id, user_id, day)
);

create index if not exists challenge_daily_cohort_day_idx
  on public.challenge_daily (cohort_id, day desc);

alter table public.challenge_daily enable row level security;

-- SELECT for fellow members — this is the standings page. No client
-- INSERT/UPDATE/DELETE of any kind: every write goes through `challenge-checkin`
-- under the service role. This is the single most important policy in the file,
-- and the exact opposite of leaderboard_scores' "Users manage own scores".
create policy "challenge_daily_select_cohort"
  on public.challenge_daily for select
  using (public.is_cohort_member(cohort_id));

comment on table public.challenge_daily is
  'Counts only, never habit names — habit content stays on the device. Written exclusively by the challenge-checkin Edge Function.';

-- ---------------------------------------------------------------------------
-- Check-in audit — accepted AND rejected
-- ---------------------------------------------------------------------------
-- "I did it, the app didn't record it" is a dispute you cannot otherwise
-- answer, because there is no server-side evidence of habit work. Recording
-- rejections too at least lets support say "we received nothing from your
-- device on the 14th", or "we received it 40 minutes after the day closed".

create table if not exists public.challenge_daily_events (
  id          uuid        primary key default gen_random_uuid(),
  cohort_id   uuid        not null references public.challenge_cohorts(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  day         date,
  accepted    boolean     not null,
  reason      text,
  payload     jsonb,
  received_at timestamptz not null default now()
);

create index if not exists challenge_daily_events_lookup_idx
  on public.challenge_daily_events (cohort_id, user_id, received_at desc);

alter table public.challenge_daily_events enable row level security;

create policy "challenge_daily_events_select_own"
  on public.challenge_daily_events for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Payments — schema only; nothing writes here until legal review clears
-- ---------------------------------------------------------------------------
-- Shape copied from database/tips.sql, which is the house pattern for money:
-- service-role writes only, unique payment id for idempotency, and identity
-- fields snapshotted so the row survives account deletion.

create table if not exists public.challenge_payments (
  id                  uuid        primary key default gen_random_uuid(),
  cohort_id           uuid        not null references public.challenge_cohorts(id) on delete restrict,

  -- NOT `on delete cascade`. delete-user calls auth.admin.deleteUser, which
  -- would silently destroy the financial record of a real transaction. The
  -- email snapshot is what keeps the row meaningful afterwards.
  user_id             uuid        references auth.users(id) on delete set null,
  user_email          text        not null default '',

  amount_paise        bigint      not null check (amount_paise > 0),
  razorpay_order_id   text        not null,
  razorpay_payment_id text,
  status              text        not null default 'created'
                                  check (status in ('created', 'captured', 'failed', 'refunded')),
  refund_id           text,
  refunded_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists challenge_payments_payment_id_unique
  on public.challenge_payments (razorpay_payment_id)
  where razorpay_payment_id is not null;

alter table public.challenge_payments enable row level security;

-- Own rows only. A peer must not see another member's amounts or order ids.
create policy "challenge_payments_select_own"
  on public.challenge_payments for select
  using (user_id = auth.uid());

create policy "challenge_payments_select_admin"
  on public.challenge_payments for select
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- Immutability: a free circle can never become a paid one
-- ---------------------------------------------------------------------------
-- The whole risk of sharing one schema between free and paid is that a free
-- code path is later reused for money. This makes the promotion physically
-- impossible rather than a rule someone has to remember.

create or replace function public.challenge_cohorts_guard()
returns trigger language plpgsql as $$
begin
  if (old.kind is distinct from new.kind)
     or (old.stake_paise is distinct from new.stake_paise) then
    if old.status <> 'draft'
       or exists (select 1 from public.challenge_members m where m.cohort_id = old.id) then
      raise exception
        'kind and stake_paise are immutable once a cohort leaves draft or has members';
    end if;
  end if;

  if old.start_day is distinct from new.start_day
     or old.end_day is distinct from new.end_day
     or old.timezone is distinct from new.timezone then
    if old.status in ('running', 'settled') then
      raise exception 'cannot move the dates or timezone of a running or settled cohort';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists challenge_cohorts_guard_trg on public.challenge_cohorts;
create trigger challenge_cohorts_guard_trg
  before update on public.challenge_cohorts
  for each row execute function public.challenge_cohorts_guard();
