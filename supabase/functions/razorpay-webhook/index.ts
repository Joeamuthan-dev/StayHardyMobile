// Deploy — RUN THE MIGRATION FIRST:
//   1. supabase migration up            (20260815000000_razorpay_webhook_support.sql)
//   2. supabase secrets set RAZORPAY_WEBHOOK_SECRET=... SUPABASE_SERVICE_ROLE_KEY=...
//   3. supabase functions deploy razorpay-webhook --no-verify-jwt
//
// Order matters. The audit insert degrades quietly if `payment_events` is
// missing (supabase-js returns an error object rather than throwing), but
// `refund.processed` writes columns this migration adds — without it, refunds
// throw, return 500, and Razorpay retries them for 24 hours.
//
// Then in the Razorpay Dashboard → Settings → Webhooks, add:
//   URL:    https://<project>.supabase.co/functions/v1/razorpay-webhook
//   Secret: the same RAZORPAY_WEBHOOK_SECRET
//   Events: payment.captured, payment.failed, refund.processed
//
// WHY THIS EXISTS
// ---------------
// `razorpay-verify` is called by the CLIENT after checkout returns. If the app is
// killed, backgrounded to death, or loses connectivity in that window — which is
// common on Android right after the Razorpay sheet closes — the payment is
// captured at Razorpay and NOTHING is ever recorded here. The user is charged and
// receives nothing, and no reconciliation job exists to notice.
//
// This webhook is the second, independent confirmer. Razorpay calls it
// server-to-server and retries on any non-2xx, so it does not depend on the
// user's device surviving. Either path may win; both converge on the same row.
//
// TWO THINGS THAT ARE DIFFERENT FROM `razorpay-verify` — do not copy that file's
// signature code:
//
//  1. The webhook HMAC is over the **raw request body**, keyed with
//     RAZORPAY_WEBHOOK_SECRET, delivered in the `x-razorpay-signature` header.
//     It is NOT the `${orderId}|${paymentId}` construction. The body must be read
//     as text ONCE and verified BEFORE parsing — re-serialising the JSON changes
//     the bytes and the signature will never match.
//  2. There is no user JWT. The caller is Razorpay, not a signed-in user, so
//     `verify_jwt = false` and identity comes from the order notes the server
//     itself wrote at order-creation time.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/** Must match razorpay-create-order notes.product. */
const PRODUCT_SUPPORT = 'stayhardy_support';
const PRODUCT_LIFETIME = 'stayhardy_lifetime';

type Json = Record<string, unknown>;

/**
 * Constant-time comparison.
 *
 * A plain `===` on a signature leaks, through timing, how many leading bytes
 * were correct — which is enough to forge one given enough attempts. Razorpay
 * will happily let an attacker retry, so this is the one comparison in the
 * codebase that must not short-circuit.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function webhookSignatureValid(
  secret: string,
  rawBody: string,
  signature: string,
): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return timingSafeEqual(expected, signature.trim().toLowerCase());
}

/**
 * 200 for anything we understood, even if we chose not to act.
 *
 * Razorpay retries on non-2xx with backoff for 24h. Returning an error for an
 * event we simply do not handle turns a no-op into a retry storm, and buries
 * the failures that actually matter.
 */
function ok(body: Json = { ok: true }): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret || !serviceKey) {
    // 500 is right here: this IS a retryable condition — a missing secret is an
    // operator error, and we want Razorpay to redeliver once it is fixed.
    console.error('[razorpay-webhook] not configured');
    return new Response(JSON.stringify({ error: 'Not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Read once, verify, then parse. Order matters.
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!signature || !(await webhookSignatureValid(secret, rawBody, signature))) {
    console.error('[razorpay-webhook] invalid signature — rejecting');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: Json;
  try {
    event = JSON.parse(rawBody) as Json;
  } catch {
    // Signed but unparseable. Retrying will not help.
    console.error('[razorpay-webhook] signed payload was not JSON');
    return ok({ ok: false, reason: 'unparseable' });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
  const eventName = String(event.event ?? '');
  const payload = (event.payload ?? {}) as Json;

  // Audit first, act second. If the handler below throws or the schema drifts,
  // we still know exactly what Razorpay told us and when — which is the whole
  // difference between "we can reconstruct this" and "the money vanished".
  const paymentEntity =
    ((payload.payment as Json | undefined)?.entity as Json | undefined) ?? undefined;
  const refundEntity =
    ((payload.refund as Json | undefined)?.entity as Json | undefined) ?? undefined;
  const entity = paymentEntity ?? refundEntity;

  const paymentId = String(entity?.id ?? '');
  const orderId = String(entity?.order_id ?? '');

  await admin.from('payment_events').insert({
    provider: 'razorpay',
    event_type: eventName,
    payment_id: paymentId || null,
    order_id: orderId || null,
    payload: event,
  });

  try {
    switch (eventName) {
      case 'payment.captured':
        return await handleCaptured(admin, paymentEntity);
      case 'payment.failed':
        return await handleFailed(admin, paymentEntity);
      case 'refund.processed':
        return await handleRefund(admin, refundEntity);
      default:
        return ok({ ok: true, ignored: eventName });
    }
  } catch (e) {
    // A genuine 500 so Razorpay redelivers. The audit row above is already
    // committed, so a redelivery is safe and idempotent.
    console.error('[razorpay-webhook] handler threw', eventName, e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function handleCaptured(
  admin: ReturnType<typeof createClient>,
  payment: Json | undefined,
): Promise<Response> {
  if (!payment) return ok({ ok: false, reason: 'no payment entity' });

  const paymentId = String(payment.id ?? '');
  const orderId = String(payment.order_id ?? '');
  const amountPaise = Number(payment.amount ?? 0);

  // Routing is by the order NOTES the server wrote at creation time — never by
  // anything a client could influence. Same rule as razorpay-verify: a tip can
  // never grant Pro.
  const notes = (payment.notes ?? {}) as Record<string, string>;
  const product = String(notes.product ?? '').trim();
  const userId = String(notes.user_id ?? '').trim();

  if (!paymentId || !userId) {
    console.error('[razorpay-webhook] captured without id/user', { paymentId, userId });
    return ok({ ok: false, reason: 'missing identifiers' });
  }

  if (product === PRODUCT_SUPPORT) {
    const amountInr = Math.round(amountPaise / 100);
    if (!Number.isFinite(amountInr) || amountInr < 1) {
      return ok({ ok: false, reason: 'bad amount' });
    }

    // The webhook has no user session, so identity fields come from the profile.
    const { data: profile } = await admin
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .maybeSingle();

    const { error } = await admin.from('tips').insert({
      user_id: userId,
      user_email: (profile as { email?: string } | null)?.email ?? '',
      user_name: (profile as { name?: string } | null)?.name ?? '',
      amount: amountInr,
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      payment_status: 'success',
      device_platform: 'web',
    });

    // 23505 = the client callback already recorded it. That is the system
    // working, not a failure — the unique index on razorpay_payment_id is what
    // makes two independent confirmers safe.
    if (error && (error as { code?: string }).code !== '23505') throw error;

    return ok({ ok: true, product, duplicate: Boolean(error) });
  }

  if (product === PRODUCT_LIFETIME) {
    const expected = Number(Deno.env.get('LIFETIME_AMOUNT_PAISE') ?? 100);
    if (!Number.isFinite(amountPaise) || amountPaise !== expected) {
      console.error('[razorpay-webhook] lifetime amount mismatch', { amountPaise, expected });
      return ok({ ok: false, reason: 'amount mismatch' });
    }

    // Only grant if not already Pro, so a redelivery cannot overwrite the
    // original purchase date with a later one.
    const { data: profile } = await admin
      .from('users')
      .select('is_pro')
      .eq('id', userId)
      .maybeSingle();

    if ((profile as { is_pro?: boolean } | null)?.is_pro) {
      return ok({ ok: true, product, alreadyPro: true });
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from('users')
      .update({
        is_pro: true,
        pro_purchase_date: now,
        payment_id: paymentId,
        payment_amount: Math.round(expected / 100),
      })
      .eq('id', userId);

    if (error) throw error;
    return ok({ ok: true, product, granted: true });
  }

  // A product this function does not know — most likely a newer one deployed
  // after this file. Audited above; explicitly not acted on.
  console.error('[razorpay-webhook] unknown product', product);
  return ok({ ok: false, reason: 'unknown product', product });
}

async function handleFailed(
  admin: ReturnType<typeof createClient>,
  payment: Json | undefined,
): Promise<Response> {
  if (!payment) return ok({ ok: false, reason: 'no payment entity' });

  const notes = (payment.notes ?? {}) as Record<string, string>;
  if (String(notes.product ?? '') !== PRODUCT_SUPPORT) {
    // Only tips carry a failure row today; a failed Pro payment simply leaves
    // the user un-upgraded, which is already the correct state.
    return ok({ ok: true, noted: true });
  }

  const { error } = await admin.from('tips').insert({
    user_id: String(notes.user_id ?? ''),
    user_email: '',
    user_name: '',
    amount: Math.max(1, Math.round(Number(payment.amount ?? 100) / 100)),
    razorpay_payment_id: String(payment.id ?? ''),
    razorpay_order_id: String(payment.order_id ?? ''),
    payment_status: 'failed',
    device_platform: 'web',
  });
  if (error && (error as { code?: string }).code !== '23505') throw error;

  return ok({ ok: true, failed: true });
}

async function handleRefund(
  admin: ReturnType<typeof createClient>,
  refund: Json | undefined,
): Promise<Response> {
  if (!refund) return ok({ ok: false, reason: 'no refund entity' });

  const paymentId = String(refund.payment_id ?? '');
  if (!paymentId) return ok({ ok: false, reason: 'no payment id' });

  const { error } = await admin
    .from('tips')
    .update({
      payment_status: 'refunded',
      refund_id: String(refund.id ?? ''),
      refunded_at: new Date().toISOString(),
      refund_amount: Math.round(Number(refund.amount ?? 0) / 100),
    })
    .eq('razorpay_payment_id', paymentId);

  if (error) throw error;
  return ok({ ok: true, refunded: true });
}
