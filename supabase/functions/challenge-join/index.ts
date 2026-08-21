// Deploy: supabase functions deploy challenge-join --no-verify-jwt
//
// Creates a circle, or joins one by invite code.
//
// Both are server-only for the same reason: RLS on `challenge_cohorts` and
// `challenge_members` grants SELECT and nothing else. A client that could
// INSERT its own membership row could join a full cohort, join after the start
// day, or set its own status to 'completed'.
//
// Actions:
//   { action: 'create',      name, timezone, days?, max_members?, min_habits?, visibility? }
//   { action: 'join',        code }
//   { action: 'join_global', display_name?, location? }
//   { action: 'leave',       cohort_id }
//   { action: 'delete',      cohort_id }   (creator, and only while alone)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_DAYS = 30;
const MAX_MEMBERS = 50;

// No I, O, 0 or 1. A code is read aloud and typed by hand; the pairs people
// confuse are the ones worth removing.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function newCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join('');
}

/**
 * Whether the runtime recognises this IANA zone.
 *
 * Validated rather than trusted, and never silently defaulted to 'UTC'. The
 * cohort's zone decides when everyone's day ends; quietly falling back to UTC
 * would move every deadline by 5.5 hours for an India-first product.
 */
function timezoneIsValid(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function ymdInTz(tz: string, d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/// 'YYYY-MM-01' -> 'YYYY-MM-DD' of that month's final day.
function lastDayOfMonth(monthStartIso: string): string {
  const [y, m] = monthStartIso.split('-').map(Number);
  // Day 0 of the next month is the last day of this one; UTC arithmetic is
  // safe because only the calendar fields are read back out.
  const last = new Date(Date.UTC(y, m, 0));
  return last.toISOString().slice(0, 10);
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
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

  const admin = createClient(url, serviceKey);
  const action = String(body.action ?? '');

  // A display name is snapshotted at join. Deliberately NOT derived from the
  // email local-part the way the leaderboard does it — that shows part of
  // someone's email address to everyone in the cohort.
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fallbackName =
    (typeof meta?.name === 'string' && meta.name.trim()) ||
    (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
    'Member';
  const displayName = String(body.display_name ?? fallbackName).slice(0, 40);
  // Optional, member-chosen, and the only thing the board shows besides the
  // name and the number. Empty string means "did not say".
  const rawLocation = String(body.location ?? '').trim().slice(0, 48);
  const location = rawLocation.length > 0 ? rawLocation : null;

  // -------------------------------------------------------------------------
  if (action === 'create') {
    const name = String(body.name ?? '').trim();
    if (name.length < 1 || name.length > 60) {
      return json({ error: 'Give your circle a name' }, 400);
    }

    const tz = String(body.timezone ?? '');
    if (!timezoneIsValid(tz)) {
      return json({ error: 'Unrecognised timezone' }, 400);
    }

    const days = Number(body.days ?? DEFAULT_DAYS);
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      return json({ error: 'A circle runs between 1 and 90 days' }, 400);
    }

    // Caller-chosen capacity. Clamped, never rejected: the client bounds the
    // picker by plan (3 free / 50 Pro), and the server holds the hard ceiling
    // it can actually verify.
    const requestedMax = Number(body.max_members ?? MAX_MEMBERS);
    const maxMembers = Number.isInteger(requestedMax)
      ? Math.min(Math.max(requestedMax, 2), MAX_MEMBERS)
      : MAX_MEMBERS;

    // The circle's house rule: everyone competes with at least this many
    // habits. Displayed and client-checked — the server cannot count
    // device-local habits, so it is an expectation, not a bouncer.
    const requestedMin = Number(body.min_habits ?? 0);
    const minHabits = Number.isInteger(requestedMin)
      ? Math.min(Math.max(requestedMin, 0), 7)
      : 0;

    const startDay = ymdInTz(tz);
    const endDay = addDays(startDay, days - 1);

    const { data: cohort, error: cohortErr } = await admin
      .from('challenge_cohorts')
      .insert({
        // Free only. `kind` is immutable once the cohort has members (enforced
        // by a trigger), so a circle created here can never become a paid one.
        kind: 'free',
        stake_paise: 0,
        name,
        timezone: tz,
        start_day: startDay,
        end_day: endDay,
        max_members: maxMembers,
        min_habits: minHabits,
        visibility: String(body.visibility ?? 'private') === 'public' ? 'public' : 'private',
        status: 'open',
        created_by: user.id,
      })
      .select('id, name, start_day, end_day, timezone')
      .single();

    if (cohortErr || !cohort) {
      console.error('[challenge-join] create failed', cohortErr);
      return json({ error: 'Could not create the circle' }, 500);
    }

    // Retry on the unique constraint rather than trusting 32^6 not to collide.
    let code = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      code = newCode();
      const { error } = await admin
        .from('challenge_invites')
        .insert({ cohort_id: cohort.id, code });
      if (!error) break;
      if ((error as { code?: string }).code !== '23505') {
        console.error('[challenge-join] invite insert failed', error);
        return json({ error: 'Could not create an invite code' }, 500);
      }
      code = '';
    }
    if (!code) return json({ error: 'Could not create an invite code' }, 500);

    await admin.from('challenge_members').insert({
      cohort_id: cohort.id,
      user_id: user.id,
      display_name: displayName,
      location,
      status: 'active',
      activated_at: new Date().toISOString(),
    });

    return json({ ok: true, cohort, code });
  }

  // -------------------------------------------------------------------------
  // The StayHardy Circle: the app-wide monthly cohort. No code — the whole
  // point is zero friction. Finds this month's global cohort, creating it if
  // the cron has not yet (first joiner of the month wins that race; the
  // partial unique index on (start_day) where scope='global' makes the race
  // safe — the loser re-reads).
  //
  // Scoring is perfect days and the month is pinned to Asia/Kolkata; both are
  // documented on the migration and shown in the UI. Free forever.
  if (action === 'join_global') {
    const GLOBAL_TZ = 'Asia/Kolkata';
    const today = ymdInTz(GLOBAL_TZ);
    const monthStart = today.slice(0, 8) + '01';
    const monthEnd = lastDayOfMonth(monthStart);

    let { data: cohort } = await admin
      .from('challenge_cohorts')
      .select('id, name, start_day, end_day, timezone, status')
      .eq('scope', 'global')
      .in('status', ['open', 'running'])
      .order('start_day', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cohort) {
      const monthName = new Intl.DateTimeFormat('en-GB', {
        timeZone: GLOBAL_TZ,
        month: 'long',
        year: 'numeric',
      }).format(new Date());

      const { data: created, error: createErr } = await admin
        .from('challenge_cohorts')
        .insert({
          kind: 'free',
          stake_paise: 0,
          scope: 'global',
          name: `StayHardy Circle · ${monthName}`,
          timezone: GLOBAL_TZ,
          start_day: monthStart,
          end_day: monthEnd,
          // Effectively unbounded: the global circle is the whole userbase.
          max_members: 1000000,
          visibility: 'public',
          status: 'running',
          created_by: null,
        })
        .select('id, name, start_day, end_day, timezone, status')
        .single();

      if (createErr) {
        if ((createErr as { code?: string }).code === '23505') {
          // Lost the first-joiner race — the cohort now exists; re-read it.
          const { data: existing } = await admin
            .from('challenge_cohorts')
            .select('id, name, start_day, end_day, timezone, status')
            .eq('scope', 'global')
            .eq('start_day', monthStart)
            .single();
          cohort = existing;
        } else {
          console.error('[challenge-join] global create failed', createErr);
          return json({ error: 'Could not open the circle' }, 500);
        }
      } else {
        cohort = created;
      }
    }
    if (!cohort) return json({ error: 'Could not open the circle' }, 500);

    const { error: memberErr } = await admin.from('challenge_members').insert({
      cohort_id: cohort.id,
      user_id: user.id,
      display_name: displayName,
      location,
      status: 'active',
      activated_at: new Date().toISOString(),
    });
    // 23505 = already a member. That is a success, not an error — the client
    // retrying a timed-out join must land somewhere idempotent.
    if (memberErr && (memberErr as { code?: string }).code !== '23505') {
      console.error('[challenge-join] global member insert failed', memberErr);
      return json({ error: 'Could not join the circle' }, 500);
    }

    return json({ ok: true, cohort });
  }

  // -------------------------------------------------------------------------
  if (action === 'join') {
    const code = String(body.code ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      return json({ error: 'That code does not look right' }, 400);
    }

    const { data: invite } = await admin
      .from('challenge_invites')
      .select('cohort_id')
      .eq('code', code)
      .maybeSingle();

    if (!invite) return json({ error: 'No circle with that code' }, 404);

    const { data: cohort } = await admin
      .from('challenge_cohorts')
      .select('id, kind, name, status, start_day, end_day, timezone, max_members, min_habits')
      .eq('id', invite.cohort_id)
      .maybeSingle();

    if (!cohort) return json({ error: 'No circle with that code' }, 404);

    // The legal gate, again. Belt and braces: `challenge-checkin` refuses paid
    // cohorts too, so even a membership created some other way is inert.
    if (cohort.kind === 'paid') {
      return json({ error: 'Paid cohorts are not open yet' }, 403);
    }
    if (cohort.status !== 'open') {
      return json({ error: 'That circle is not open to join' }, 409);
    }

    const { count } = await admin
      .from('challenge_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('cohort_id', cohort.id)
      .in('status', ['active', 'completed', 'failed']);

    if ((count ?? 0) >= Number(cohort.max_members)) {
      return json({ error: 'That circle is full' }, 409);
    }

    const { error: joinErr } = await admin.from('challenge_members').insert({
      cohort_id: cohort.id,
      user_id: user.id,
      display_name: displayName,
      location,
      status: 'active',
      activated_at: new Date().toISOString(),
    });

    // Already a member is success, not an error — the user's intent is
    // satisfied and a duplicate tap should not read as a failure.
    if (joinErr && (joinErr as { code?: string }).code !== '23505') {
      console.error('[challenge-join] join failed', joinErr);
      return json({ error: 'Could not join that circle' }, 500);
    }

    return json({ ok: true, cohort, alreadyMember: Boolean(joinErr) });
  }

  // -------------------------------------------------------------------------
  if (action === 'leave') {
    const cohortId = String(body.cohort_id ?? '');
    if (!cohortId) return json({ error: 'cohort_id required' }, 400);

    // A status transition, never a delete. Leaving carries meaning — and once
    // stakes exist it carries financial meaning — so the row stays.
    const { error } = await admin
      .from('challenge_members')
      .update({ status: 'withdrawn', left_at: new Date().toISOString() })
      .eq('cohort_id', cohortId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[challenge-join] leave failed', error);
      return json({ error: 'Could not leave that circle' }, 500);
    }
    return json({ ok: true });
  }

  // -------------------------------------------------------------------------
  if (action === 'delete') {
    const cohortId = String(body.cohort_id ?? '');
    if (!cohortId) return json({ error: 'cohort_id required' }, 400);

    const { data: cohort } = await admin
      .from('challenge_cohorts')
      .select('id, scope, created_by')
      .eq('id', cohortId)
      .single();
    if (!cohort) return json({ error: 'No such circle' }, 404);
    if (cohort.scope === 'global') {
      return json({ error: 'The StayHardy Circle cannot be deleted' }, 403);
    }
    if (cohort.created_by !== user.id) {
      return json({ error: 'Only the creator can delete a circle' }, 403);
    }

    // Deletable only while the creator is alone. Once anyone else has
    // joined, other people's progress lives in this cohort and the creator's
    // only move is to leave it, same as everyone.
    const { count } = await admin
      .from('challenge_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('cohort_id', cohortId)
      .eq('status', 'active')
      .neq('user_id', user.id);
    if ((count ?? 0) > 0) {
      return json(
        { error: 'Others are in this circle — you can leave, not delete' },
        409,
      );
    }

    // Hard delete; members, invites and daily rows cascade with the cohort.
    const { error } = await admin
      .from('challenge_cohorts')
      .delete()
      .eq('id', cohortId);
    if (error) {
      console.error('[challenge-join] delete failed', error);
      return json({ error: 'Could not delete that circle' }, 500);
    }
    return json({ ok: true });
  }

  return json({ error: 'Unknown action' }, 400);
});
