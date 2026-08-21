-- The circle board, second pass — owner's decisions after first live use:
--
-- * **Fractional daily points.** A day is worth `habits_done / habits_required`,
--   capped at 1 — finish everything and the day is a full point, finish 80% and
--   it is 0.8. Replaces the all-or-nothing perfect day: partial effort now
--   moves the board, and exact ties become rare instead of the norm.
-- * **Where members are from.** One optional free-text line ("Chennai, India"),
--   chosen by the member at join. It is the ONLY thing shown besides the name
--   and the number — habits never leave the device, unchanged.
-- * **Top 20, not 10** — on the live board and in the monthly snapshot.

-- ---------------------------------------------------------------------------
-- Location, on the member row. Nullable: saying where you are from is opt-in.
-- ---------------------------------------------------------------------------
alter table public.challenge_members
  add column if not exists location text
    check (location is null or char_length(location) <= 48);

alter table public.challenge_hall_of_fame
  add column if not exists location text;

-- ---------------------------------------------------------------------------
-- The snapshot widens to 20 and its points turn fractional.
-- ---------------------------------------------------------------------------
alter table public.challenge_hall_of_fame
  drop constraint if exists challenge_hall_of_fame_rank_check;
alter table public.challenge_hall_of_fame
  add constraint challenge_hall_of_fame_rank_check check (rank between 1 and 20);

alter table public.challenge_hall_of_fame
  alter column points type numeric(8,2) using points::numeric;

-- ---------------------------------------------------------------------------
-- Standings RPC, fractional. The return row changes shape (points becomes
-- numeric, location appears), so the old function must be dropped first —
-- `create or replace` refuses to change a return type.
-- ---------------------------------------------------------------------------
drop function if exists public.global_circle_standings(integer);

create function public.global_circle_standings(limit_n integer default 20)
returns table (
  user_id      uuid,
  display_name text,
  location     text,
  points       numeric,
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
      m.location,
      -- A rest day (required = 0) is no point either way: someone with
      -- nothing scheduled must not out-rank someone who did the work.
      coalesce(sum(
        least(d.habits_done::numeric / nullif(d.habits_required, 0), 1)
      ), 0)::numeric(8,2) as points,
      coalesce(sum(d.habits_done), 0) as total_done
    from public.challenge_members m
    left join public.challenge_daily d
      on d.cohort_id = m.cohort_id and d.user_id = m.user_id
    where m.cohort_id = (select id from current_global)
      and m.status = 'active'
    group by m.user_id, m.display_name, m.location
  ),
  ranked as (
    select
      s.*,
      rank() over (order by s.points desc, s.total_done desc) as rank
    from scored s
  )
  select
    r.user_id,
    r.display_name,
    r.location,
    r.points,
    r.total_done,
    r.rank,
    r.user_id = auth.uid() as is_caller
  from ranked r
  where r.rank <= limit_n or r.user_id = auth.uid()
  order by r.rank, r.total_done desc;
$$;

revoke all on function public.global_circle_standings(integer) from public;
grant execute on function public.global_circle_standings(integer) to authenticated;
