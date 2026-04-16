create table if not exists public.leaderboard_members (
  user_id      uuid        primary key references auth.users(id) on delete cascade,
  display_name text        not null,
  avatar_url   text,
  joined_at    timestamptz not null default now(),
  is_active    boolean     not null default true
);
alter table public.leaderboard_members enable row level security;
create policy "Members visible to authenticated"
  on public.leaderboard_members for select
  using (auth.uid() is not null);
create policy "Users manage own membership"
  on public.leaderboard_members for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.leaderboard_scores (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  month      text        not null,
  points     numeric     not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table public.leaderboard_scores enable row level security;
create policy "Scores visible to authenticated"
  on public.leaderboard_scores for select
  using (auth.uid() is not null);
create policy "Users manage own scores"
  on public.leaderboard_scores for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
