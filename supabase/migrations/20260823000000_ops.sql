-- Ops plumbing for the weekly health digest: one SECURITY DEFINER function
-- gathers every number, so the edge function needs no per-table grants.
create or replace function public.ops_weekly_digest()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  cron_failures integer := 0;
begin
  -- cron tables belong to the pg_cron extension; absent on local stacks,
  -- so the read is guarded rather than assumed.
  begin
    select count(*) into cron_failures
    from cron.job_run_details
    where status = 'failed'
      and start_time > now() - interval '7 days';
  exception when others then
    cron_failures := -1;  -- "could not check" reads differently from "zero"
  end;

  select jsonb_build_object(
    'new_users_7d', (
      select count(*) from auth.users
      where created_at > now() - interval '7 days'
    ),
    'active_circle_members', (
      select count(*) from public.challenge_members m
      where m.status = 'active'
        and m.cohort_id = (
          select id from public.challenge_cohorts
          where scope = 'global' and status in ('open', 'running')
          order by start_day desc limit 1
        )
    ),
    'checkins_7d', (
      select count(*) from public.challenge_daily
      where day > (now() - interval '7 days')::date
    ),
    'feedback_7d', (
      select count(*) from public.feedback
      where created_at > now() - interval '7 days'
    ),
    'cron_failures_7d', cron_failures
  ) into result;

  return result;
end;
$$;

revoke all on function public.ops_weekly_digest() from public;
revoke execute on function public.ops_weekly_digest() from anon;
grant execute on function public.ops_weekly_digest() to service_role;
