create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  category text not null default 'info',
  is_active boolean not null default true,
  posted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists announcements_created_at_idx on public.announcements(created_at desc);
create index if not exists announcements_active_created_idx on public.announcements(is_active, created_at desc);

alter table public.announcements enable row level security;

drop policy if exists "announcements_read_all" on public.announcements;
create policy "announcements_read_all"
  on public.announcements
  for select
  using (true);

drop policy if exists "announcements_admin_write" on public.announcements;
create policy "announcements_admin_write"
  on public.announcements
  for all
  using (auth.jwt() ->> 'email' = 'joe@gmail.com' or auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'email' = 'joe@gmail.com' or auth.jwt() ->> 'role' = 'service_role');

