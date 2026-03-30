-- Achievement badges earned by users based on habit streak milestones
create table if not exists public.user_badges (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  badge_key   text        not null,
  earned_at   timestamptz not null default now(),
  popup_shown boolean     not null default false,
  unique(user_id, badge_key)
);

alter table public.user_badges enable row level security;

create policy "Users manage own badges"
  on public.user_badges for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
