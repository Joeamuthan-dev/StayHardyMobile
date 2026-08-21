// Monday-morning health email for the owner: growth, activity, feedback,
// and — the watchdog — whether every cron job actually ran last week.
// Numbers come from the ops_weekly_digest() SECURITY DEFINER RPC so this
// function needs no table-by-table permissions. Guarded by the same
// x-cron-secret the finalize cron uses.
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CHALLENGE_CRON_SECRET') ?? '';
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data, error } = await admin.rpc('ops_weekly_digest');
  if (error) {
    console.error('[weekly-digest] rpc failed', error);
    return json({ error: 'digest query failed' }, 500);
  }
  const d = (data ?? {}) as Record<string, unknown>;

  const failures = Number(d['cron_failures_7d'] ?? 0);
  const lines = [
    `New sign-ups this week: ${d['new_users_7d'] ?? '?'}`,
    `Circle members active: ${d['active_circle_members'] ?? '?'}`,
    `Day-tallies shared this week: ${d['checkins_7d'] ?? '?'}`,
    `Feedback received: ${d['feedback_7d'] ?? '?'}`,
    '',
    failures === 0
      ? 'Cron health: every scheduled job ran clean. ✅'
      : `Cron health: ${failures} FAILED run(s) in the last 7 days — check cron.job_run_details. ⚠️`,
  ];

  const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const to = Deno.env.get('OWNER_EMAIL') ?? 'joeamuthan2@gmail.com';
  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'StayHardy <onboarding@resend.dev>',
          to: [to],
          subject: `StayHardy weekly health — ${new Date().toISOString().slice(0, 10)}`,
          text: lines.join('\n'),
        }),
      });
      if (!res.ok) {
        console.error('[weekly-digest] resend failed', res.status, await res.text());
      }
    } catch (e) {
      console.error('[weekly-digest] resend errored', e);
    }
  } else {
    console.warn('[weekly-digest] RESEND_API_KEY unset — digest logged only:', lines.join(' | '));
  }

  return json({ ok: true, digest: d });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
