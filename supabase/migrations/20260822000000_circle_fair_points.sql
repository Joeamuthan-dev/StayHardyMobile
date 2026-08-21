-- Fair points, owner's ruling after watching the board:
--
--   points_for_day = LEAST(done, 7) / CLAMP(required, 3, 7), capped at 1
--
-- Two abuses die together. A two-habit list can no longer mint a full point
-- (denominator floors at 3 → max 0.67/day), and a padded twenty-trivial-habit
-- list earns nothing past seven (numerator caps at 7 — which is also the free
-- habit cap, so the ceiling is the same for everyone). Three real habits done
-- is a full day; ten-of-ten is the same full day.
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
      coalesce(sum(
        least(
          least(d.habits_done, 7)::numeric
            / greatest(least(nullif(d.habits_required, 0), 7), 3),
          1
        )
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
