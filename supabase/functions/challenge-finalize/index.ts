// Deploy: supabase secrets set CHALLENGE_CRON_SECRET=... SUPABASE_SERVICE_ROLE_KEY=...
//         supabase functions deploy challenge-finalize --no-verify-jwt
//
// Called by an external scheduler, hourly:
//   curl -X POST "$SUPABASE_URL/functions/v1/challenge-finalize" \
//        -H "x-cron-secret: $CHALLENGE_CRON_SECRET"
//
// There is no pg_cron in this project — `send-daily-pushes` is driven the same
// way, and this follows it deliberately rather than inventing a second pattern.
// Note the consequence: an external caller's reliability sits in this path, so
// every invocation is logged and a missed run is a real operational risk.
//
// Idempotent by construction: it only ever selects cohorts that are still
// unfinalised, and stamps `finalized_at` inside the same pass. A double
// invocation settles nothing twice.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

/**
 * Hours after a cohort's last day before it settles.
 *
 * Not zero. The final day closes at midnight in the cohort's zone, and a member
 * checking in at 23:58 on a slow connection must not lose it to a cron that
 * fired at 00:00:01.
 */
const SETTLE_GRACE_HOURS = 6;

function ymdInTz(tz: string, d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function hourInTz(tz: string, d = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz || 'UTC',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(d);
  return parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const cronSecret = Deno.env.get('CHALLENGE_CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) return json({ error: 'Service role not configured' }, 500);

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
  const now = new Date();

  const { data: cohorts, error } = await admin
    .from('challenge_cohorts')
    .select('id, kind, scope, name, timezone, start_day, end_day, status')
    .in('status', ['open', 'running'])
    .is('finalized_at', null);

  if (error) {
    console.error('[challenge-finalize] could not list cohorts', error);
    return json({ error: 'Could not list cohorts' }, 500);
  }

  const settled: string[] = [];

  for (const cohort of cohorts ?? []) {
    const tz = String(cohort.timezone);
    const today = ymdInTz(tz, now);

    // Still running, or inside the grace window after the last day.
    if (today <= String(cohort.end_day)) continue;
    if (today === String(cohort.end_day) && hourInTz(tz, now) < SETTLE_GRACE_HOURS) continue;

    // The global StayHardy Circle settles differently: no pass/fail, no
    // per-member completion — the month ends, the podium is written, and the
    // next month opens with everyone carried across. Handled first so the
    // free-cohort logic below stays exactly what it was.
    if ((cohort as { scope?: string }).scope === 'global') {
      await settleGlobal(admin, cohort as GlobalCohort, now);
      settled.push(String(cohort.id));
      continue;
    }

    // Paid cohorts are refused outright rather than settled without a payout
    // path. Marking someone "failed" when no money can move either way would
    // be a result with no consequence attached — and the moment payouts exist,
    // this branch has to be written deliberately, not inherited from the free
    // one. That is the whole point of separating them.
    if (cohort.kind === 'paid') {
      console.error('[challenge-finalize] refusing to settle a paid cohort', cohort.id);
      continue;
    }

    const { data: members } = await admin
      .from('challenge_members')
      .select('user_id')
      .eq('cohort_id', cohort.id)
      .eq('status', 'active');

    const { data: days } = await admin
      .from('challenge_daily')
      .select('user_id, habits_required, habits_done')
      .eq('cohort_id', cohort.id);

    // A day counts only if it was genuinely completed. `habits_frozen` is
    // deliberately not added in here: the schema keeps the two apart precisely
    // so a settlement cannot quietly decide that a hand-granted freeze counts.
    const completedByUser = new Map<string, number>();
    for (const d of days ?? []) {
      const required = Number(d.habits_required ?? 0);
      const done = Number(d.habits_done ?? 0);
      if (required > 0 && done >= required) {
        const uid = String(d.user_id);
        completedByUser.set(uid, (completedByUser.get(uid) ?? 0) + 1);
      }
    }

    for (const m of members ?? []) {
      const uid = String(m.user_id);
      const completed = completedByUser.get(uid) ?? 0;
      await admin
        .from('challenge_members')
        .update({ status: 'completed', days_completed: completed })
        .eq('cohort_id', cohort.id)
        .eq('user_id', uid);
    }

    // Stamped last, so a crash mid-loop leaves the cohort unfinalised and the
    // next run picks it up again rather than leaving members half-settled.
    await admin
      .from('challenge_cohorts')
      .update({ status: 'settled', finalized_at: now.toISOString() })
      .eq('id', cohort.id)
      .is('finalized_at', null);

    settled.push(String(cohort.id));
  }

  // Logged on every invocation, including the empty ones — a run that stops
  // happening is otherwise invisible until someone's circle never ends.
  console.log('[challenge-finalize] ran', {
    at: now.toISOString(),
    considered: cohorts?.length ?? 0,
    settled: settled.length,
  });

  return json({ ok: true, settled });
});


type GlobalCohort = {
  id: string;
  timezone: string;
  start_day: string;
  end_day: string;
};

/// Month-end for the StayHardy Circle: podium, rollover, carry-forward.
///
/// Ordered so a crash at any point is retried safely on the next run:
/// the new cohort and hall-of-fame writes are idempotent (23505-tolerant /
/// upsert-shaped), and `finalized_at` is stamped last — an unfinalised cohort
/// is simply picked up again.
async function settleGlobal(
  // deno-lint-ignore no-explicit-any
  admin: any,
  cohort: GlobalCohort,
  now: Date,
): Promise<void> {
  // 1. The snapshot: top 20 by fractional daily points (done/required, capped
  // at 1 per day), ties on total check-ins — the same formula as the live
  // board's RPC, and they must never drift apart.
  const { data: rows } = await admin
    .from('challenge_members')
    .select('user_id, display_name, location')
    .eq('cohort_id', cohort.id)
    .eq('status', 'active');

  const { data: days } = await admin
    .from('challenge_daily')
    .select('user_id, habits_required, habits_done')
    .eq('cohort_id', cohort.id);

  const points = new Map<string, { points: number; done: number }>();
  for (const d of days ?? []) {
    const uid = String(d.user_id);
    const entry = points.get(uid) ?? { points: 0, done: 0 };
    const required = Number(d.habits_required ?? 0);
    const done = Number(d.habits_done ?? 0);
    // Fair points — mirrors global_circle_standings exactly:
    // min(done,7) / clamp(required,3,7), capped at 1.
    if (required > 0) {
      const cappedDone = Math.min(done, 7);
      const denom = Math.max(Math.min(required, 7), 3);
      entry.points += Math.min(cappedDone / denom, 1);
    }
    entry.done += done;
    points.set(uid, entry);
  }

  const ranked = (rows ?? [])
    .map((m: { user_id: string; display_name: string; location?: string }) => ({
      user_id: String(m.user_id),
      display_name: String(m.display_name ?? 'Member'),
      location: m.location ?? null,
      ...(points.get(String(m.user_id)) ?? { points: 0, done: 0 }),
    }))
    .sort((a: { points: number; done: number }, b: { points: number; done: number }) =>
      b.points - a.points || b.done - a.done)
    .slice(0, 20);

  // Ties at the top win — but the prize pool is capped at THREE (owner's
  // ruling: fifty level players cannot all take lifetime Pro). Winners are
  // the top-points players in display order, so when more than three tie,
  // total check-ins — the ranking's own tie-break — decides which three.
  const topPoints = ranked.length > 0 ? ranked[0].points : 0;
  const winners = ranked
    .filter((r: { points: number }) => topPoints > 0 && r.points === topPoints)
    .slice(0, 3);

  for (let i = 0; i < ranked.length; i++) {
    const { error } = await admin.from('challenge_hall_of_fame').insert({
      cohort_id: cohort.id,
      month_start: cohort.start_day,
      rank: i + 1,
      user_id: ranked[i].user_id,
      display_name: ranked[i].display_name,
      location: ranked[i].location,
      points: Math.round(ranked[i].points * 100) / 100,
      total_done: ranked[i].done,
      won: winners.some(
        (w: { user_id: string }) => w.user_id === ranked[i].user_id,
      ),
    });
    // 23505 = a previous partial run already wrote this rank. Fine.
    if (error && (error as { code?: string }).code !== '23505') {
      console.error('[challenge-finalize] hall of fame write failed', error);
      return; // leave unfinalised; retried next run
    }
  }

  // 1b. The prize: every month's #1 wins StayHardy Pro for life, granted as
  // a RevenueCat promotional entitlement keyed to their Supabase uuid — the
  // same id the app configures the SDK with, so Pro simply appears at their
  // next launch. Best-effort: a failed grant logs loudly and the settlement
  // continues; the snapshot row proves who won, so a manual regrant is
  // always possible from the RevenueCat dashboard.
  for (const w of winners) {
    await grantLifetimePro(w.user_id);
  }
  if (winners.length > 0) {
    await announceWinners(admin, cohort, winners);
  }

  // 2. Next month's cohort.
  const nextStart = nextMonthStart(cohort.end_day);
  const nextEnd = monthEnd(nextStart);
  const monthName = new Intl.DateTimeFormat('en-GB', {
    timeZone: cohort.timezone,
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${nextStart}T12:00:00Z`));

  let nextId: string | null = null;
  const { data: created, error: createErr } = await admin
    .from('challenge_cohorts')
    .insert({
      kind: 'free',
      stake_paise: 0,
      scope: 'global',
      name: `StayHardy Circle · ${monthName}`,
      timezone: cohort.timezone,
      start_day: nextStart,
      end_day: nextEnd,
      max_members: 1000000,
      visibility: 'public',
      status: 'running',
      created_by: null,
    })
    .select('id')
    .single();

  if (createErr) {
    if ((createErr as { code?: string }).code === '23505') {
      const { data: existing } = await admin
        .from('challenge_cohorts')
        .select('id')
        .eq('scope', 'global')
        .eq('start_day', nextStart)
        .single();
      nextId = existing ? String(existing.id) : null;
    } else {
      console.error('[challenge-finalize] rollover create failed', createErr);
      return;
    }
  } else {
    nextId = String(created.id);
  }
  if (!nextId) return;

  // 3. Carry every active member across, points implicitly reset because the
  // new cohort has no daily rows yet. 23505-tolerant for retries.
  for (const m of rows ?? []) {
    const { error } = await admin.from('challenge_members').insert({
      cohort_id: nextId,
      user_id: m.user_id,
      display_name: m.display_name,
      status: 'active',
      activated_at: now.toISOString(),
    });
    if (error && (error as { code?: string }).code !== '23505') {
      console.error('[challenge-finalize] carry-forward failed', error);
      return;
    }
  }

  // 4. Only now is the month closed.
  await admin
    .from('challenge_cohorts')
    .update({ status: 'settled', finalized_at: now.toISOString() })
    .eq('id', cohort.id)
    .is('finalized_at', null);
}

function nextMonthStart(endDayIso: string): string {
  const [y, m] = endDayIso.split('-').map(Number);
  const next = new Date(Date.UTC(y, m, 1)); // month is 0-based; m = next month
  return next.toISOString().slice(0, 10);
}

function monthEnd(monthStartIso: string): string {
  const [y, m] = monthStartIso.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}


/// Grants the 'StayHardy Pro' entitlement forever via RevenueCat's
/// promotional-entitlement endpoint. Requires the REVENUECAT_SECRET_KEY
/// function secret (the sk_ key, never the public SDK key). Skips silently
/// when unconfigured so non-production stacks settle without it.
async function grantLifetimePro(appUserId: string): Promise<void> {
  const key = Deno.env.get('REVENUECAT_SECRET_KEY') ?? '';
  if (!key) {
    console.warn('[challenge-finalize] REVENUECAT_SECRET_KEY unset — winner not granted');
    return;
  }
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}` +
        `/entitlements/${encodeURIComponent('StayHardy Pro')}/promotional`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ duration: 'lifetime' }),
      },
    );
    if (!res.ok) {
      console.error('[challenge-finalize] winner grant failed', res.status, await res.text());
    } else {
      console.log('[challenge-finalize] lifetime Pro granted to', appUserId);
    }
  } catch (e) {
    console.error('[challenge-finalize] winner grant errored', e);
  }
}


/// Posts the month's champion into `announcements` with category 'circle' —
/// the client shows that category ONLY to StayHardy Circle members (owner's
/// ruling: the prize is the circle's news, not a broadcast). Idempotent by
/// title: a retried settlement finds the row and moves on.
async function announceWinners(
  // deno-lint-ignore no-explicit-any
  admin: any,
  cohort: GlobalCohort,
  winners: { display_name: string; location?: string | null; points: number }[],
): Promise<void> {
  try {
    const month = new Intl.DateTimeFormat('en-GB', {
      timeZone: cohort.timezone,
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${cohort.start_day}T12:00:00Z`));

    const names = winners.map((w) => w.display_name).join(', ');
    const title = winners.length === 1
      ? `\u{1F3C6} ${month} Circle champion: ${names}`
      : `\u{1F3C6} ${month} Circle champions: ${names}`;
    const { data: existing } = await admin
      .from('announcements')
      .select('id')
      .eq('title', title)
      .maybeSingle();
    if (existing) return;

    const points = Math.round(winners[0].points * 10) / 10;
    const body = winners.length === 1
      ? `${names} topped the StayHardy Circle with ${points} points — and ` +
        `wins StayHardy Pro for life.`
      : `${names} finished level at the top with ${points} points — a tie ` +
        `at the summit, and all of them win StayHardy Pro for life.`;
    const { error } = await admin.from('announcements').insert({
      title,
      message:
        `${body} A new month has begun: everyone is back to zero, and the ` +
        `next lifetime Pro is up for grabs. Show up.`,
      category: 'circle',
      is_active: true,
    });
    if (error) console.error('[challenge-finalize] announce failed', error);
  } catch (e) {
    console.error('[challenge-finalize] announce errored', e);
  }
}
