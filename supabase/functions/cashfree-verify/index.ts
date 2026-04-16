// Deploy: supabase functions deploy cashfree-verify --no-verify-jwt
//
// Verifies a Cashfree payment by fetching order status from Cashfree API.
// Grants Pro if order_status === "PAID" and amount matches.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CASHFREE_API_VERSION = '2023-08-01';

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
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderId = String(body.order_id ?? '').trim();
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Missing order_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appId = Deno.env.get('CASHFREE_APP_ID');
    const secretKey = Deno.env.get('CASHFREE_SECRET_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!appId || !secretKey || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Fetch order from Cashfree API ──
    const orderRes = await fetch(`https://api.cashfree.com/pg/orders/${orderId}`, {
      headers: {
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
    });

    const order = await orderRes.json();

    if (!orderRes.ok) {
      console.error('[cashfree-verify] Order fetch error:', order);
      return new Response(JSON.stringify({ error: 'Could not fetch order from Cashfree' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Validate order status ──
    if (order.order_status !== 'PAID') {
      return new Response(
        JSON.stringify({ error: `Payment not completed. Status: ${order.order_status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Validate this order belongs to the calling user ──
    const customerId = order.customer_details?.customer_id ?? '';
    if (customerId !== user.id) {
      console.error('[cashfree-verify] User mismatch', customerId, user.id);
      return new Response(JSON.stringify({ error: 'Order does not belong to this user' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Validate amount ──
    const expectedAmountInr = Number(Deno.env.get('CASHFREE_AMOUNT_INR') ?? '499');
    if (Number(order.order_amount) !== expectedAmountInr) {
      console.error('[cashfree-verify] Amount mismatch', order.order_amount, expectedAmountInr);
      return new Response(JSON.stringify({ error: 'Order amount mismatch' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Get payment_id from order payments ──
    let cashfreePaymentId = orderId; // fallback
    try {
      const paymentsRes = await fetch(`https://api.cashfree.com/pg/orders/${orderId}/payments`, {
        headers: {
          'x-api-version': CASHFREE_API_VERSION,
          'x-client-id': appId,
          'x-client-secret': secretKey,
        },
      });
      if (paymentsRes.ok) {
        const payments = await paymentsRes.json();
        const successPayment = (payments as any[]).find(p => p.payment_status === 'SUCCESS');
        if (successPayment?.cf_payment_id) {
          cashfreePaymentId = String(successPayment.cf_payment_id);
        }
      }
    } catch {
      // Non-fatal — fallback to orderId
    }

    // ── Grant Pro in Supabase ──
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
    const now = new Date().toISOString();
    const patch = {
      is_pro: true,
      pro_purchase_date: now,
      payment_id: cashfreePaymentId,
      payment_amount: expectedAmountInr,
      subscription_plan: 'lifetime',
      subscription_status: 'lifetime',
    };

    const { data: updatedRows, error: upErr } = await supabaseAdmin
      .from('users')
      .update(patch)
      .eq('id', user.id)
      .select('id');

    if (upErr) {
      console.error('[cashfree-verify] DB update error:', upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User row didn't exist — insert it
    if (!updatedRows?.length) {
      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const name = (typeof meta?.name === 'string' && meta.name) || '';
      const { error: insErr } = await supabaseAdmin.from('users').insert({
        id: user.id,
        email: user.email ?? '',
        name,
        role: 'user',
        created_at: now,
        ...patch,
      });
      if (insErr) {
        console.error('[cashfree-verify] DB insert error:', insErr);
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('[cashfree-verify] Pro granted ✅', user.id, orderId);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[cashfree-verify] Exception:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
