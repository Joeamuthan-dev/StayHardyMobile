-- Waitlist table for Coming Soon page email capture
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);

alter table waitlist enable row level security;

-- Anyone (unauthenticated) can insert their email
create policy "Anyone can join waitlist"
  on waitlist for insert
  with check (true);
