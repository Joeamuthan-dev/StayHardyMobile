// Deploy: supabase secrets set CASHFREE_APP_ID=... CASHFREE_SECRET_KEY=...
//         supabase functions deploy cashfree-create-order --no-verify-jwt
//
// Env vars:
//   CASHFREE_APP_ID       — Cashfree Client ID (production)
//   CASHFREE_SECRET_KEY   — Cashfree Client Secret (production)
//   CASHFREE_AMOUNT_INR   — Lifetime price in INR (e.g. "499")
//   CASHFREE_RETURN_URL   — e.g. "https://stayhardy.com/payment-success?order_id={order_id}"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CASHFREE_API = 'https://api.cashfree.com/pg/orders';
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appId = Deno.env.get('CASHFREE_APP_ID');
    const secretKey = Deno.env.get('CASHFREE_SECRET_KEY');
    if (!appId || !secretKey) {
      return new Response(JSON.stringify({ error: 'Cashfree not configured on server' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountInr = Number(Deno.env.get('CASHFREE_AMOUNT_INR') ?? '499');
    if (!Number.isFinite(amountInr) || amountInr < 1) {
      return new Response(JSON.stringify({ error: 'Invalid amount configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const returnUrl = Deno.env.get('CASHFREE_RETURN_URL') ??
      'https://stayhardy.com/payment-success?order_id={order_id}';

    // Build unique order ID — max 50 chars, alphanumeric + _
    const shortId = user.id.replace(/-/g, '').slice(0, 8);
    const orderId = `sh_pro_${shortId}_${Date.now()}`;

    const orderBody = {
      order_id: orderId,
      order_amount: amountInr,
      order_currency: 'INR',
      customer_details: {
        customer_id: user.id,
        customer_email: user.email ?? 'user@stayhardy.com',
        customer_phone: '9999999999', // required by Cashfree; we don't collect phone
        customer_name: user.user_metadata?.name ?? 'StayHardy User',
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: '', // optional webhook
      },
      order_note: `StayHardy Pro Lifetime — user:${user.id}`,
    };

    const res = await fetch(CASHFREE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify(orderBody),
    });

    const order = await res.json();

    if (!res.ok) {
      console.error('[cashfree-create-order] Error:', order);
      return new Response(
        JSON.stringify({ error: order?.message ?? 'Order creation failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        orderId: order.order_id,
        paymentSessionId: order.payment_session_id,
        amount: amountInr,
        currency: 'INR',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[cashfree-create-order] Exception:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
