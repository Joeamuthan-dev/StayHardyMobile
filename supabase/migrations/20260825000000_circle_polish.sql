-- Board polish, owner's final pre-release round:
--
-- * `habit_count` on the live standings — how many habits a member is
--   running (their most recent day's requirement), because "12 habits" on
--   the board encourages; WHICH habits stays on their phone, unchanged.
-- * `min_habits` on cohorts — a private circle's house rule ("compete with
--   at least N habits each"). Displayed and client-checked; the server
--   cannot verify device-local habit counts, so it is an expectation, not
--   a bouncer — the same soft-trust footing the whole challenge stands on.
alter table public.challenge_cohorts
  add column if not exists min_habits integer not null default 0
    check (min_habits between 0 and 7);

drop function if exists public.global_circle_standings(integer);

create function public.global_circle_standings(limit_n integer default 20)
returns table (
  user_id      uuid,
  display_name text,
  location     text,
  points       numeric,
  total_done   bigint,
  habit_count  integer,
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
      coalesce(sum(
        least(
          least(d.habits_done, 7)::numeric
            / greatest(least(nullif(d.habits_required, 0), 7), 3),
          1
        )
      ), 0)::numeric(8,2) as points,
      coalesce(sum(d.habits_done), 0) as total_done,
      coalesce((
        select d2.habits_required
        from public.challenge_daily d2
        where d2.cohort_id = m.cohort_id and d2.user_id = m.user_id
        order by d2.day desc
        limit 1
      ), 0) as habit_count
    from public.challenge_members m
    left join public.challenge_daily d
      on d.cohort_id = m.cohort_id and d.user_id = m.user_id
    where m.cohort_id = (select id from current_global)
      and m.status = 'active'
    group by m.user_id, m.display_name, m.location, m.cohort_id
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
    r.habit_count,
    r.rank,
    r.user_id = auth.uid() as is_caller
  from ranked r
  where r.rank <= limit_n or r.user_id = auth.uid()
  order by r.rank, r.total_done desc;
$$;

revoke all on function public.global_circle_standings(integer) from public;
revoke execute on function public.global_circle_standings(integer) from anon;
grant execute on function public.global_circle_standings(integer) to authenticated;
