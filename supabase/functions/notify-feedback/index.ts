// Fires from a Database Webhook on every `feedback` insert and emails the
// owner within seconds — a solo developer's support desk.
//
// Guarded by `x-webhook-secret` (set the same value in the webhook's HTTP
// headers and in the WEBHOOK_SECRET function secret). Sends through Resend;
// with no verified domain, Resend's onboarding sender delivers to the
// account owner's own address — which is exactly what this does.
Deno.serve(async (req) => {
  const secret = Deno.env.get('WEBHOOK_SECRET') ?? '';
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const to = Deno.env.get('OWNER_EMAIL') ?? 'joeamuthan2@gmail.com';
  if (!resendKey) {
    console.warn('[notify-feedback] RESEND_API_KEY unset — mail skipped');
    return json({ ok: true, skipped: true });
  }

  let record: Record<string, unknown> = {};
  try {
    const body = await req.json();
    record = (body?.record ?? {}) as Record<string, unknown>;
  } catch (_) {
    return json({ error: 'Bad payload' }, 400);
  }

  const type = String(record['type'] ?? 'feedback');
  const name = String(record['user_name'] ?? 'Someone');
  const email = String(record['user_email'] ?? 'no email');
  const message = String(record['message'] ?? '');

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
        subject: `[StayHardy ${type}] from ${name}`,
        text: `${message}\n\n— ${name} <${email}>`,
      }),
    });
    if (!res.ok) {
      console.error('[notify-feedback] resend failed', res.status, await res.text());
    }
  } catch (e) {
    console.error('[notify-feedback] resend errored', e);
  }
  return json({ ok: true });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
