// Deploy: supabase functions deploy instamojo-create-order --no-verify-jwt
//
// Env vars required:
//   INSTAMOJO_API_KEY      — from Instamojo dashboard → API & Plugins
//   INSTAMOJO_AUTH_TOKEN   — from Instamojo dashboard → API & Plugins
//   INSTAMOJO_AMOUNT_INR   — e.g. "499"
//   INSTAMOJO_RETURN_URL   — e.g. "https://stayhardy.com/payment-success"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INSTAMOJO_API = 'https://www.instamojo.com/api/1.1/payment-requests/';

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

    const apiKey = Deno.env.get('INSTAMOJO_API_KEY');
    const authToken = Deno.env.get('INSTAMOJO_AUTH_TOKEN');
    if (!apiKey || !authToken) {
      return new Response(JSON.stringify({ error: 'Instamojo not configured on server' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountInr = Number(Deno.env.get('INSTAMOJO_AMOUNT_INR') ?? '499');
    const returnUrl = Deno.env.get('INSTAMOJO_RETURN_URL') ?? 'https://stayhardy.com/payment-success';

    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const name = (typeof meta?.name === 'string' && meta.name) ? meta.name : 'StayHardy User';
    const email = user.email ?? '';

    // Build form body for Instamojo
    const form = new URLSearchParams({
      purpose: 'StayHardy Pro — Lifetime Access',
      amount: String(amountInr),
      buyer_name: name,
      email,
      redirect_url: returnUrl,
      // Embed user_id in webhook so we know who paid
      webhook: '',
      allow_repeated_payments: 'false',
      send_email: 'false',
      send_sms: 'false',
    });

    const res = await fetch(INSTAMOJO_API, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'X-Auth-Token': authToken,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.error('[instamojo-create-order] Error:', data);
      return new Response(
        JSON.stringify({ error: data?.message ?? 'Payment request creation failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentRequest = data.payment_request;

    // Store user_id → payment_request_id mapping in Supabase
    // so verify function can match the payment to the right user
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (serviceKey) {
      const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
      await admin.from('instamojo_orders').insert({
        payment_request_id: paymentRequest.id,
        user_id: user.id,
        amount: amountInr,
        created_at: new Date().toISOString(),
        status: 'pending',
      }).then(({ error }) => {
        if (error) console.warn('[instamojo-create-order] Could not store order (table may not exist):', error.message);
      });
    }

    return new Response(
      JSON.stringify({
        paymentUrl: paymentRequest.longurl,
        paymentRequestId: paymentRequest.id,
        amount: amountInr,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[instamojo-create-order] Exception:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
