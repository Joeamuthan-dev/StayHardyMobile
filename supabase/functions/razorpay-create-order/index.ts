// Deploy: supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=...
//         supabase functions deploy razorpay-create-order --no-verify-jwt
//
// Body (optional JSON):
//   {} or { "purpose": "lifetime" } — lifetime Pro order (amount from LIFETIME_AMOUNT_PAISE or default 100 paise)
//   { "purpose": "support", "amountInr": 49 } — tip / support (1–9999 INR)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: 'Razorpay not configured on server' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let requestBody: { purpose?: string; amountInr?: number } = {};
    try {
      const text = await req.text();
      if (text.trim()) requestBody = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const purpose = String(requestBody.purpose ?? 'lifetime');
    let amountPaise: number;
    let notes: Record<string, string>;

    if (purpose === 'support') {
      const inr = Number(requestBody.amountInr);
      if (!Number.isFinite(inr) || inr < 1 || inr > 9999) {
        return new Response(JSON.stringify({ error: 'Invalid support amount (1–9999 INR)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      amountPaise = Math.round(inr * 100);
      notes = {
        user_id: user.id,
        product: 'stayhardy_support',
        payment_type: 'tip',
        amount_inr: String(Math.round(inr)),
      };
    } else {
      const envPaise = Deno.env.get('LIFETIME_AMOUNT_PAISE');
      amountPaise = envPaise ? Number(envPaise) : 100;
      if (!Number.isFinite(amountPaise) || amountPaise < 100) {
        amountPaise = 100;
      }
      notes = {
        user_id: user.id,
        product: 'stayhardy_lifetime',
        payment_type: 'pro_membership',
      };
    }

    // Razorpay receipt max 40 chars — keep compact (tip_ vs pro_ for support vs lifetime)
    const receiptPrefix = purpose === 'support' ? 'tip' : 'pro';
    const receipt = `${receiptPrefix}_${user.id.replace(/-/g, '').slice(0, 8)}_${Date.now()}`;
    const basic = btoa(`${keyId}:${keySecret}`);

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basic}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes,
      }),
    });

    const order = await res.json();
    if (!res.ok) {
      console.error('Razorpay order error', order);
      return new Response(JSON.stringify({ error: order.error?.description || 'Order failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
