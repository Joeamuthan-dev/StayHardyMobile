-- The StayHardy Circle: one free, global, monthly cohort everyone can join.
--
-- DESIGN, STATED PLAINLY
-- ----------------------
-- * One global cohort per calendar month, created by the finalize cron (or on
--   first join, whichever comes first). `scope = 'global'` distinguishes it
--   from private friends circles; a partial unique index makes "one per month"
--   a database fact rather than an application hope.
-- * Scoring is PERFECT DAYS: 1 point per day where everything scheduled was
--   done. Someone with 3 habits and someone with 12 compete as equals — the
--   game is showing up, not stacking habits. Ties break on total check-ins.
-- * The month is pinned to Asia/Kolkata and says so in the UI. A month that
--   ends at a different moment per member is not a ranking.
-- * Membership carries forward month to month; points reset because each month
--   is a fresh cohort. Last month's top 10 is snapshotted into
--   `challenge_hall_of_fame` at settlement — a snapshot, not a view, because
--   the podium must survive whatever happens to the old cohort's rows.
-- * Free forever. `kind` stays 'free'; nothing here touches the parked paid
--   machinery.
--
-- Additive only. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Scope column + one-global-per-month guarantee
-- ---------------------------------------------------------------------------
alter table public.challenge_cohorts
  add column if not exists scope text not null default 'private'
    check (scope in ('private', 'global'));

-- One live global cohort per start day. Partial, so private circles are
-- unaffected however many start the same day.
create unique index if not exists challenge_cohorts_one_global_per_month
  on public.challenge_cohorts (start_day)
  where scope = 'global';

-- Everyone signed in may SEE the global cohort exists (to join it); the
-- member-or-public policy already covers it once visibility = 'public'.

-- ---------------------------------------------------------------------------
-- 2. Hall of fame
-- ---------------------------------------------------------------------------
create table if not exists public.challenge_hall_of_fame (
  cohort_id    uuid        not null references public.challenge_cohorts(id) on delete cascade,
  month_start  date        not null,
  rank         integer     not null check (rank between 1 and 10),
  user_id      uuid        references auth.users(id) on delete set null,
  -- Snapshotted, never joined back to a live profile: the podium shows the
  -- name as it was when the month was won.
  display_name text        not null default 'Member',
  points       integer     not null default 0,
  total_done   integer     not null default 0,
  created_at   timestamptz not null default now(),
  primary key (cohort_id, rank)
);

alter table public.challenge_hall_of_fame enable row level security;

-- The podium is public to every signed-in user — that is its entire purpose.
-- It contains only chosen display names and counts, never habit content.
create policy "hall_of_fame_select_authenticated"
  on public.challenge_hall_of_fame for select
  using (auth.uid() is not null);

-- Written by the finalize cron under the service role only.

-- ---------------------------------------------------------------------------
-- 3. Standings RPC — top N plus the caller, one round trip
-- ---------------------------------------------------------------------------
-- A global circle cannot ship the whole member list to every phone. This
-- returns the top `limit_n` rows and ALWAYS the caller's own row (flagged), so
-- "#847 of 1,203" renders without a second query.
--
-- SECURITY DEFINER because it aggregates across members the caller cannot
-- select directly; it exposes only display_name, points and rank.

create or replace function public.global_circle_standings(limit_n integer default 100)
returns table (
  user_id      uuid,
  display_name text,
  points       bigint,
  total_done   bigint,
  rank         bigint,
  is_caller    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with current_global as (
    select id from public.challenge_cohorts
    where scope = 'global' and status in ('open', 'running')
    order by start_day desc
    limit 1
  ),
  scored as (
    select
      m.user_id,
      m.display_name,
      -- Perfect days: required > 0 and done >= required. A rest day is not a
      -- point — a member with no habits scheduled must not out-rank one who
      -- did the work.
      count(*) filter (
        where d.habits_required > 0 and d.habits_done >= d.habits_required
      ) as points,
      coalesce(sum(d.habits_done), 0) as total_done
    from public.challenge_members m
    left join public.challenge_daily d
      on d.cohort_id = m.cohort_id and d.user_id = m.user_id
    where m.cohort_id = (select id from current_global)
      and m.status = 'active'
    group by m.user_id, m.display_name
  ),
  ranked as (
    select
      s.*,
      rank() over (order by s.points desc, s.total_done desc) as rank
    from scored s
  )
  select r.user_id, r.display_name, r.points, r.total_done, r.rank,
         (r.user_id = auth.uid()) as is_caller
  from ranked r
  where r.rank <= limit_n or r.user_id = auth.uid()
  order by r.rank;
$$;

revoke all on function public.global_circle_standings(integer) from public;
grant execute on function public.global_circle_standings(integer) to authenticated;
