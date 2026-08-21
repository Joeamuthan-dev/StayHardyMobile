-- Razorpay webhook support.
--
-- Until now, a payment was only ever recorded by `razorpay-verify`, which the
-- CLIENT calls after checkout returns. If the app died in that window the money
-- was captured at Razorpay and never recorded here, with no job to notice.
-- `razorpay-webhook` is the second, server-to-server confirmer. This migration
-- gives it the two things it needs: somewhere to audit what arrived, and room in
-- `tips` to record a refund.
--
-- Safe to run more than once. Additive only — no existing column changes type,
-- and no existing row is touched.

-- ---------------------------------------------------------------------------
-- 1. Audit log of every webhook delivery
-- ---------------------------------------------------------------------------
-- Written BEFORE the event is acted on, so that even if a handler throws or the
-- schema drifts, we still know exactly what Razorpay said and when. This is the
-- difference between "we can reconstruct what happened" and "the money vanished".
--
-- Deliberately not unique on payment_id: Razorpay legitimately redelivers, and
-- the count of deliveries is itself diagnostic. Idempotency lives on the tables
-- that hold money, not here.

create table if not exists public.payment_events (
  id          uuid        primary key default gen_random_uuid(),
  provider    text        not null default 'razorpay',
  event_type  text        not null,
  payment_id  text,
  order_id    text,
  payload     jsonb       not null,
  received_at timestamptz not null default now()
);

create index if not exists payment_events_payment_id_idx
  on public.payment_events (payment_id)
  where payment_id is not null;
create index if not exists payment_events_received_at_idx
  on public.payment_events (received_at desc);

alter table public.payment_events enable row level security;

-- No client access of any kind. Edge Functions write with the service role,
-- which bypasses RLS; admins read through an Edge Function, exactly as `tips`
-- does. A payload column holding raw gateway JSON must never be client-readable.
create policy "payment_events_admin_select"
  on public.payment_events for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

comment on table public.payment_events is
  'Append-only audit of gateway webhook deliveries. Written by Edge Functions (service role) before the event is acted on.';

-- ---------------------------------------------------------------------------
-- 2. Refund columns on tips
-- ---------------------------------------------------------------------------
-- A refund issued from the Razorpay dashboard currently leaves `tips` claiming
-- the payment succeeded, so admin revenue totals overstate. The webhook can now
-- reconcile it.

alter table public.tips
  add column if not exists refund_id     text,
  add column if not exists refunded_at   timestamptz,
  add column if not exists refund_amount integer;

-- Widen the status check to admit 'refunded'. Dropping and re-adding is the only
-- way to alter a CHECK; the name matches what Postgres generated originally.
alter table public.tips
  drop constraint if exists tips_payment_status_check;
alter table public.tips
  add constraint tips_payment_status_check
  check (payment_status in ('success', 'failed', 'pending', 'refunded'));

-- ---------------------------------------------------------------------------
-- 3. Reconciliation view
-- ---------------------------------------------------------------------------
-- Payments Razorpay told us about that never became a row. This is the query
-- that answers "did we lose any money last week", and it should be empty.

-- security_invoker: without it a view runs as its OWNER and silently bypasses
-- RLS on tips and users, handing every payment row to anyone who can select it.
create or replace view public.payment_reconciliation
with (security_invoker = true) as
select
  e.payment_id,
  e.order_id,
  min(e.received_at)                       as first_seen_at,
  count(*)                                 as delivery_count,
  (t.razorpay_payment_id is not null)      as recorded_in_tips,
  (u.payment_id is not null)               as recorded_as_pro
from public.payment_events e
left join public.tips  t on t.razorpay_payment_id = e.payment_id
left join public.users u on u.payment_id          = e.payment_id
where e.event_type = 'payment.captured'
  and e.payment_id is not null
group by e.payment_id, e.order_id, t.razorpay_payment_id, u.payment_id
having t.razorpay_payment_id is null and u.payment_id is null;

comment on view public.payment_reconciliation is
  'Captured payments with no corresponding tips or Pro row. Should always be empty; anything here is money taken and not delivered.';
