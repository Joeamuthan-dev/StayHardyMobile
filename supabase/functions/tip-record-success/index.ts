// Deploy: supabase functions deploy tip-record-success --no-verify-jwt
//
// Records a successful tip payment made via direct client-side Razorpay checkout
// (no order_id / signature flow). Auth is via anon key + userId in body.
// Verifies the payment with Razorpay API before writing to DB to prevent spoofing.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchRazorpayPayment(
  paymentId: string,
  keyId: string,
  keySecret: string
): Promise<Record<string, unknown>> {
  const basic = btoa(`${keyId}:${keySecret}`);
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${basic}` },
  });
  return (await res.json()) as Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse body first
    let body: {
      razorpay_payment_id?: string;
      amountInr?: number;
      userId?: string;
      email?: string;
    };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const razorpay_payment_id = String(body.razorpay_payment_id ?? '').trim();
    const userId = String(body.userId ?? '').trim();
    const emailFromBody = String(body.email ?? '').trim();
    const amountInrFromBody = Number(body.amountInr);

    if (!razorpay_payment_id) {
      return new Response(JSON.stringify({ error: 'Missing razorpay_payment_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!keyId || !keySecret || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Verify payment with Razorpay API ──────────────────────────────────────
    // This is critical — prevents anyone from calling this endpoint with a fake payment ID.
    const paymentJson = await fetchRazorpayPayment(razorpay_payment_id, keyId, keySecret);

    if ((paymentJson as { error?: unknown }).error) {
      console.error('Razorpay payment fetch error', paymentJson);
      return new Response(JSON.stringify({ error: 'Could not verify payment with Razorpay' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentStatus = String((paymentJson as { status?: string }).status ?? '');
    if (paymentStatus !== 'captured') {
      console.error('Payment not captured', { paymentStatus, razorpay_payment_id });
      return new Response(JSON.stringify({ error: `Payment status is '${paymentStatus}', not captured` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Amount from Razorpay (in paise) — use server value, not client-provided value
    const amountPaise = Number((paymentJson as { amount?: number }).amount);
    const amountInr = Number.isFinite(amountPaise) && amountPaise > 0
      ? Math.round(amountPaise / 100)
      : (Number.isFinite(amountInrFromBody) && amountInrFromBody > 0 ? amountInrFromBody : 1);

    // ── Write to DB ───────────────────────────────────────────────────────────
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);

    // Look up user profile for name/email
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .maybeSingle();

    const userName = (typeof profile?.name === 'string' && profile.name.trim()) ? profile.name.trim() : '';
    const email = (typeof profile?.email === 'string' && profile.email) ? profile.email : emailFromBody;

    // Duplicate-safe insert (unique on razorpay_payment_id)
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error: insErr } = await supabaseAdmin.from('tips').insert({
        user_id: userId,
        user_email: email,
        user_name: userName,
        amount: amountInr,
        razorpay_payment_id,
        razorpay_order_id: null,
        payment_status: 'success',
        device_platform: 'android',
      });

      if (!insErr) {
        return new Response(JSON.stringify({ ok: true, amountInr }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const code = (insErr as { code?: string }).code;
      if (code === '23505') {
        // Duplicate payment_id — already recorded, that's fine
        return new Response(JSON.stringify({ ok: true, amountInr, duplicate: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.error('tips insert attempt', attempt, insErr);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }

    return new Response(JSON.stringify({ error: 'Could not record tip after retries' }), {
      status: 500,
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
