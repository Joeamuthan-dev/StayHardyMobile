create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_read_all" on public.app_settings;
create policy "app_settings_read_all"
  on public.app_settings
  for select
  using (true);

drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write"
  on public.app_settings
  for all
  using (auth.jwt() ->> 'email' = 'joe@gmail.com' or auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'email' = 'joe@gmail.com' or auth.jwt() ->> 'role' = 'service_role');

insert into public.app_settings (key, value, description, updated_by)
values
  ('pro_price', '99', 'Pro membership price in INR', 'system'),
  ('pro_original_price', '499', 'Pro original strike-through price in INR', 'system')
on conflict (key) do nothing;

