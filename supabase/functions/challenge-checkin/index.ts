// Deploy: supabase functions deploy challenge-checkin --no-verify-jwt
//
// THE ONLY WRITER OF `challenge_daily`.
//
// RLS on that table grants members SELECT and nothing else — no client
// INSERT/UPDATE/DELETE of any kind. Every standing in the app arrives through
// this function. That is the opposite of `leaderboard_scores`, whose policy is
// "Users manage own scores" and whose points are computed in the browser, which
// is why any user can write any number there.
//
// WHAT THIS CAN AND CANNOT VERIFY
// -------------------------------
// Habit content never leaves the device, so the counts in the body were
// computed by the client (see `mobile/lib/src/domain/challenge_rules.dart`) and
// this function cannot audit them against anything. It is not pretending to.
// What it CAN enforce, and does:
//
//   * the day is the one the SERVER says is open, in the cohort's pinned zone
//   * the day has not already been submitted, and is not older than the last
//     one submitted — so rolling the device clock back buys nothing
//   * the counts are internally consistent and within the cohort's own limits
//   * every attempt, accepted or rejected, is recorded
//
// The security model rests on the payout — you get your own stake back — not on
// this function being able to detect a determined liar. It cannot.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Client clock this far from ours is worth flagging. */
const SKEW_FLAG_MINUTES = 10;

/** Free circles allow a late tick until 03:00 the next morning. */
const FREE_GRACE_HOURS = 3;

/**
 * 'YYYY-MM-DD' in an IANA zone.
 *
 * Lifted verbatim from `send-daily-pushes/index.ts` — already proven in
 * production, and the only correct way to do this. Hand-rolled offset maths
 * breaks on +05:30, +05:45 and every DST transition.
 */
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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization' }, 401);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) return json({ error: 'Service role not configured' }, 500);

  const asUser = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await asUser.auth.getUser();
  if (userErr || !user) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const cohortId = String(body.cohort_id ?? '');
  if (!cohortId) return json({ error: 'cohort_id required' }, 400);

  const admin = createClient(url, serviceKey);

  // Every attempt is recorded, accepted or not. "I did it, the app didn't
  // record it" is otherwise unanswerable — there is no server-side evidence of
  // habit work, so the log of what arrived is the only evidence there is.
  const audit = async (accepted: boolean, reason: string, day?: string) => {
    await admin.from('challenge_daily_events').insert({
      cohort_id: cohortId,
      user_id: user.id,
      day: day ?? null,
      accepted,
      reason,
      payload: body,
    });
  };

  const { data: cohort } = await admin
    .from('challenge_cohorts')
    .select('id, kind, timezone, start_day, end_day, status')
    .eq('id', cohortId)
    .maybeSingle();

  if (!cohort) {
    await audit(false, 'cohort_not_found');
    return json({ error: 'Cohort not found' }, 404);
  }

  // The gate the owner's legal review sits behind. A paid cohort cannot be
  // checked into at all until this is deliberately removed — not a flag that
  // could default the wrong way.
  if (cohort.kind === 'paid') {
    await audit(false, 'paid_cohorts_not_enabled');
    return json({ error: 'Paid cohorts are not open yet' }, 403);
  }

  if (cohort.status !== 'open' && cohort.status !== 'running') {
    await audit(false, `cohort_status_${cohort.status}`);
    return json({ error: 'This cohort is not accepting check-ins' }, 409);
  }

  const { data: member } = await admin
    .from('challenge_members')
    .select('status, max_day_submitted, days_completed')
    .eq('cohort_id', cohortId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member || member.status !== 'active') {
    await audit(false, 'not_an_active_member');
    return json({ error: 'You are not an active member of this cohort' }, 403);
  }

  // ---- the day window, computed here and nowhere else -----------------------
  const tz = String(cohort.timezone);
  const now = new Date();
  const serverToday = ymdInTz(tz, now);
  const hour = hourInTz(tz, now);

  const requestedDay = String(body.day ?? serverToday);

  // Yesterday is acceptable only inside the free grace window. Paid cohorts get
  // no grace at all: every grace window is an extra chance to submit a day you
  // did not do, and an extra dispute surface. This is the one place free and
  // paid genuinely should diverge.
  const yesterday = ymdInTz(tz, new Date(now.getTime() - 86_400_000));
  const graceOpen = cohort.kind === 'free' && hour < FREE_GRACE_HOURS;

  const dayIsAllowed =
    requestedDay === serverToday || (graceOpen && requestedDay === yesterday);

  if (!dayIsAllowed) {
    await audit(false, 'day_outside_window', requestedDay);
    return json(
      {
        error: 'That day is closed',
        cohort_day: serverToday,
        requested_day: requestedDay,
      },
      409,
    );
  }

  if (requestedDay < String(cohort.start_day) || requestedDay > String(cohort.end_day)) {
    await audit(false, 'day_outside_cohort', requestedDay);
    return json({ error: 'That day is outside this cohort' }, 409);
  }

  // Monotonic replay guard. Setting the device clock back to re-submit an
  // earlier day gets nothing: the server compares against the furthest day this
  // member has already reached, which only ever moves forward. Same discipline
  // as `SettingsKeys.lastFreezeRunDate` on the client.
  const highWater = member.max_day_submitted as string | null;
  if (highWater && requestedDay < highWater) {
    await audit(false, 'replay_before_high_water', requestedDay);
    return json({ error: 'That day has already passed for you' }, 409);
  }

  // ---- the counts -----------------------------------------------------------
  const required = Number(body.habits_required ?? 0);
  const done = Number(body.habits_done ?? 0);
  const frozen = Number(body.habits_frozen ?? 0);
  const streak = Number(body.streak ?? 0);

  const sane =
    Number.isInteger(required) && required >= 0 && required <= 20 &&
    Number.isInteger(done) && done >= 0 &&
    Number.isInteger(frozen) && frozen >= 0 &&
    done + frozen <= required &&
    Number.isInteger(streak) && streak >= 0;

  if (!sane) {
    await audit(false, 'counts_out_of_range', requestedDay);
    return json({ error: 'Counts are not valid for a day' }, 400);
  }

  // client_ts is stored to MEASURE skew and never to decide anything. A clock
  // 40 minutes out is a signal worth keeping; it is not grounds to reject, or
  // travelling users would be locked out.
  const flags: string[] = [];
  const clientTsRaw = body.client_ts ? String(body.client_ts) : null;
  let clientTs: string | null = null;
  if (clientTsRaw) {
    const parsed = new Date(clientTsRaw);
    if (!Number.isNaN(parsed.getTime())) {
      clientTs = parsed.toISOString();
      const skewMin = Math.abs(parsed.getTime() - now.getTime()) / 60_000;
      if (skewMin > SKEW_FLAG_MINUTES) flags.push(`clock_skew_${Math.round(skewMin)}m`);
    } else {
      flags.push('client_ts_unparseable');
    }
  }
  if (graceOpen && requestedDay === yesterday) flags.push('late_grace');

  const { error: upsertErr } = await admin
    .from('challenge_daily')
    .upsert(
      {
        cohort_id: cohortId,
        user_id: user.id,
        day: requestedDay,
        habits_required: required,
        habits_done: done,
        habits_frozen: frozen,
        streak,
        submitted_at: now.toISOString(),
        client_ts: clientTs,
        flags,
      },
      { onConflict: 'cohort_id,user_id,day' },
    );

  if (upsertErr) {
    console.error('[challenge-checkin] upsert failed', upsertErr);
    await audit(false, 'upsert_failed', requestedDay);
    return json({ error: 'Could not record your day' }, 500);
  }

  // Advance the high-water mark only forward. `max_day_submitted` is the guard
  // above, so it must never move backwards even if a grace-window submission
  // for yesterday arrives after today's.
  if (!highWater || requestedDay > highWater) {
    await admin
      .from('challenge_members')
      .update({ max_day_submitted: requestedDay })
      .eq('cohort_id', cohortId)
      .eq('user_id', user.id);
  }

  await audit(true, 'accepted', requestedDay);

  // The client renders its countdown from these, never from its own clock.
  const endOfDayUtc = new Date(now);
  endOfDayUtc.setUTCHours(endOfDayUtc.getUTCHours() + (24 - hour));
  endOfDayUtc.setUTCMinutes(0, 0, 0);

  return json({
    ok: true,
    cohort_day: serverToday,
    server_now_utc: now.toISOString(),
    closes_at_utc: endOfDayUtc.toISOString(),
    flags,
  });
});
