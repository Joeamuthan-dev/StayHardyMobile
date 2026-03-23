// Deploy: supabase secrets set RAZORPAY_KEY_SECRET=... SUPABASE_SERVICE_ROLE_KEY=...
//         supabase functions deploy razorpay-verify --no-verify-jwt
//
// Routing is by Razorpay ORDER NOTES (product), NOT client body.purpose — tips can never grant Pro.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Must match razorpay-create-order notes.product */
const PRODUCT_SUPPORT = 'stayhardy_support';
const PRODUCT_LIFETIME = 'stayhardy_lifetime';

async function razorpaySignatureValid(
  secret: string,
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  const message = `${orderId}|${paymentId}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return expected.toLowerCase() === signature.trim().toLowerCase();
}

async function fetchRazorpayOrder(orderId: string, keyId: string, keySecret: string): Promise<Record<string, unknown>> {
  const basic = btoa(`${keyId}:${keySecret}`);
  const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: { Authorization: `Basic ${basic}` },
  });
  return (await res.json()) as Record<string, unknown>;
}

async function insertTipRow(
  supabaseAdmin: ReturnType<typeof createClient>,
  row: Record<string, unknown>
): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error: insErr } = await supabaseAdmin.from('tips').insert(row);
    if (!insErr) return { ok: true };
    const code = (insErr as { code?: string }).code;
    if (code === '23505') return { ok: true, duplicate: true };
    console.error('tips insert attempt', attempt, insErr);
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  return { ok: false, error: 'insert failed after retries' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const razorpay_order_id = String(body.razorpay_order_id ?? '');
    const razorpay_payment_id = String(body.razorpay_payment_id ?? '');
    const razorpay_signature = String(body.razorpay_signature ?? '');

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const secret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    if (!secret || !keyId) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!(await razorpaySignatureValid(secret, razorpay_order_id, razorpay_payment_id, razorpay_signature))) {
      console.error('[razorpay-verify] Invalid signature (possible fraud)', {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
      });
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderJson = await fetchRazorpayOrder(razorpay_order_id, keyId, secret);
    if ((orderJson as { error?: { description?: string } }).error) {
      console.error('Razorpay order fetch error', orderJson);
      return new Response(JSON.stringify({ error: 'Could not verify order' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notes = (orderJson.notes ?? {}) as Record<string, string>;
    if (String(notes.user_id ?? '') !== user.id) {
      console.error('Order user mismatch', notes.user_id, user.id);
      return new Response(JSON.stringify({ error: 'Order mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const product = String(notes.product ?? '').trim();
    if (product !== PRODUCT_SUPPORT && product !== PRODUCT_LIFETIME) {
      console.error('[razorpay-verify] Unknown order product', product);
      return new Response(JSON.stringify({ error: 'Invalid order type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawPlat = String(body.device_platform ?? 'web').toLowerCase();
    const device_platform =
      rawPlat === 'android' || rawPlat === 'ios' || rawPlat === 'web' ? rawPlat : 'web';

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'Service role not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
    const amountPaise = Number((orderJson as { amount?: number }).amount);

    /** --- Tips / support only: insert tips row, never touch users.is_pro --- */
    if (product === PRODUCT_SUPPORT) {
      if (!Number.isFinite(amountPaise) || amountPaise < 100) {
        return new Response(JSON.stringify({ error: 'Invalid order amount' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const amountInr = Math.round(amountPaise / 100);

      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const nameFromMeta =
        (typeof meta?.name === 'string' && meta.name) ||
        (typeof meta?.full_name === 'string' && meta.full_name) ||
        '';

      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('name, email, is_pro')
        .eq('id', user.id)
        .maybeSingle();

      const isProBefore = Boolean((profile as { is_pro?: boolean } | null)?.is_pro);

      const userName =
        (typeof profile?.name === 'string' && profile.name.trim()) ? profile.name.trim() : String(nameFromMeta);
      const email = user.email ?? (typeof profile?.email === 'string' ? profile.email : '') ?? '';

      const tipRow = {
        user_id: user.id,
        user_email: email,
        user_name: userName,
        amount: amountInr,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_order_id: razorpay_order_id,
        payment_status: 'success',
        device_platform,
      };

      const inserted = await insertTipRow(supabaseAdmin, tipRow);
      if (inserted.ok) {
        const { data: afterProfile } = await supabaseAdmin
          .from('users')
          .select('is_pro, payment_id')
          .eq('id', user.id)
          .maybeSingle();
        const isProAfter = Boolean((afterProfile as { is_pro?: boolean } | null)?.is_pro);
        const storedPayId = (afterProfile as { payment_id?: string | null } | null)?.payment_id ?? null;
        if (
          !isProBefore &&
          isProAfter &&
          storedPayId === razorpay_payment_id
        ) {
          console.error(
            '[CRITICAL] Tip payment id stored as Pro payment_id — reverting mistaken Pro grant',
            { user_id: user.id }
          );
          await supabaseAdmin
            .from('users')
            .update({
              is_pro: false,
              pro_purchase_date: null,
              payment_id: null,
              payment_amount: null,
            })
            .eq('id', user.id);
        }

        return new Response(JSON.stringify({ ok: true, support: true, amountInr }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.error('[CRITICAL] tips insert failed after retries', {
        user_id: user.id,
        razorpay_payment_id,
        razorpay_order_id,
        amountInr,
      });
      const webhook = Deno.env.get('ADMIN_TIP_FAILURE_WEBHOOK_URL');
      if (webhook) {
        try {
          await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'tip_persist_failed',
              user_id: user.id,
              razorpay_payment_id,
              razorpay_order_id,
              amountInr,
            }),
          });
        } catch {
          /* ignore */
        }
      }

      return new Response(
        JSON.stringify({ ok: true, support: true, amountInr, persistFailed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    /** --- Lifetime Pro only: update users, never touch tips --- */
    const envPaise = Deno.env.get('LIFETIME_AMOUNT_PAISE');
    const expectedPaise = envPaise ? Number(envPaise) : 100;
    if (!Number.isFinite(expectedPaise) || expectedPaise < 100) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration (lifetime amount)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!Number.isFinite(amountPaise) || amountPaise !== expectedPaise) {
      return new Response(JSON.stringify({ error: 'Order amount does not match lifetime product' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const paymentAmountInr = Math.round(expectedPaise / 100);
    const patch = {
      is_pro: true,
      pro_purchase_date: now,
      payment_id: razorpay_payment_id,
      payment_amount: paymentAmountInr,
    };

    const { data: updatedRows, error: upErr } = await supabaseAdmin
      .from('users')
      .update(patch)
      .eq('id', user.id)
      .select('id');

    if (upErr) {
      console.error(upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (updatedRows?.length) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const nameFromMeta =
      (typeof meta?.name === 'string' && meta.name) ||
      (typeof meta?.full_name === 'string' && meta.full_name) ||
      '';

    const { error: insErr } = await supabaseAdmin.from('users').insert({
      id: user.id,
      email: user.email ?? '',
      name: nameFromMeta,
      role: 'user',
      created_at: now,
      is_pro: true,
      pro_purchase_date: now,
      payment_id: razorpay_payment_id,
      payment_amount: paymentAmountInr,
    });

    if (insErr) {
      console.error(insErr);
      return new Response(
        JSON.stringify({
          error:
            insErr.message ||
            'Could not save Pro status. Ensure public.users allows inserts for new accounts (e.g. pin column nullable or default).',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
