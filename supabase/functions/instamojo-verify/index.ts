// Deploy: supabase functions deploy instamojo-verify --no-verify-jwt
//
// Called by PaymentSuccess page after Instamojo redirects back.
// Body: { payment_id, payment_request_id }
// Fetches payment from Instamojo API, verifies status=Credit, grants Pro.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INSTAMOJO_PAYMENT_API = 'https://www.instamojo.com/api/1.1/payments/';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentId = String(body.payment_id ?? '').trim();
    const paymentRequestId = String(body.payment_request_id ?? '').trim();

    if (!paymentId || !paymentRequestId) {
      return new Response(JSON.stringify({ error: 'Missing payment_id or payment_request_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('INSTAMOJO_API_KEY');
    const authToken = Deno.env.get('INSTAMOJO_AUTH_TOKEN');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey || !authToken || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Fetch payment from Instamojo API ──
    const res = await fetch(`${INSTAMOJO_PAYMENT_API}${paymentId}/`, {
      headers: {
        'X-Api-Key': apiKey,
        'X-Auth-Token': authToken,
      },
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.error('[instamojo-verify] Payment fetch error:', data);
      return new Response(JSON.stringify({ error: 'Could not fetch payment from Instamojo' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payment = data.payment;

    // ── Validate payment status ──
    if (payment.status !== 'Credit') {
      return new Response(
        JSON.stringify({ error: `Payment not successful. Status: ${payment.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Validate payment_request_id matches ──
    if (payment.payment_request?.id !== paymentRequestId) {
      console.error('[instamojo-verify] payment_request_id mismatch');
      return new Response(JSON.stringify({ error: 'Payment request mismatch' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Validate amount ──
    const expectedAmount = Number(Deno.env.get('INSTAMOJO_AMOUNT_INR') ?? '499');
    if (Number(payment.amount) !== expectedAmount) {
      console.error('[instamojo-verify] Amount mismatch', payment.amount, expectedAmount);
      return new Response(JSON.stringify({ error: 'Payment amount mismatch' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Verify user owns this payment request ──
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
    const { data: orderRow } = await supabaseAdmin
      .from('instamojo_orders')
      .select('user_id')
      .eq('payment_request_id', paymentRequestId)
      .maybeSingle();

    if (orderRow && orderRow.user_id !== user.id) {
      console.error('[instamojo-verify] User mismatch', orderRow.user_id, user.id);
      return new Response(JSON.stringify({ error: 'Payment does not belong to this user' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Grant Pro ──
    const now = new Date().toISOString();
    const patch = {
      is_pro: true,
      pro_purchase_date: now,
      payment_id: paymentId,
      payment_amount: expectedAmount,
      subscription_plan: 'lifetime',
      subscription_status: 'lifetime',
    };

    const { data: updatedRows, error: upErr } = await supabaseAdmin
      .from('users')
      .update(patch)
      .eq('id', user.id)
      .select('id');

    if (upErr) {
      console.error('[instamojo-verify] DB update error:', upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User row doesn't exist yet — insert
    if (!updatedRows?.length) {
      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const name = (typeof meta?.name === 'string' && meta.name) ? meta.name : '';
      const { error: insErr } = await supabaseAdmin.from('users').insert({
        id: user.id,
        email: user.email ?? '',
        name,
        role: 'user',
        created_at: now,
        ...patch,
      });
      if (insErr) {
        console.error('[instamojo-verify] DB insert error:', insErr);
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Mark order as paid
    await supabaseAdmin
      .from('instamojo_orders')
      .update({ status: 'paid', payment_id: paymentId })
      .eq('payment_request_id', paymentRequestId);

    console.log('[instamojo-verify] Pro granted ✅', user.id, paymentId);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[instamojo-verify] Exception:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
