// Deploy: supabase functions deploy tip-record-failed --no-verify-jwt
// Records a failed support payment when Razorpay checkout fails (payment.failed).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchRazorpayOrder(orderId: string, keyId: string, keySecret: string): Promise<Record<string, unknown>> {
  const basic = btoa(`${keyId}:${keySecret}`);
  const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: { Authorization: `Basic ${basic}` },
  });
  return (await res.json()) as Record<string, unknown>;
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

    let body: { razorpay_order_id?: string; device_platform?: string; error_code?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const razorpay_order_id = String(body.razorpay_order_id ?? '').trim();
    if (!razorpay_order_id) {
      return new Response(JSON.stringify({ error: 'Missing razorpay_order_id' }), {
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

    const orderJson = await fetchRazorpayOrder(razorpay_order_id, keyId, keySecret);
    if ((orderJson as { error?: unknown }).error) {
      return new Response(JSON.stringify({ error: 'Invalid order' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notes = (orderJson.notes ?? {}) as Record<string, string>;
    if (String(notes.user_id ?? '') !== user.id) {
      return new Response(JSON.stringify({ error: 'Order mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const product = notes.product ?? '';
    if (product !== 'stayhardy_support') {
      return new Response(JSON.stringify({ error: 'Not a support order' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const amountPaise = Number((orderJson as { amount?: number }).amount);
    const amountInr = Number.isFinite(amountPaise) ? Math.round(amountPaise / 100) : 0;

    const rawPlat = String(body.device_platform ?? 'web').toLowerCase();
    const device_platform =
      rawPlat === 'android' || rawPlat === 'ios' || rawPlat === 'web' ? rawPlat : 'web';

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);

    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const nameFromMeta =
      (typeof meta?.name === 'string' && meta.name) ||
      (typeof meta?.full_name === 'string' && meta.full_name) ||
      '';

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .maybeSingle();

    const userName =
      (typeof profile?.name === 'string' && profile.name.trim()) ? profile.name.trim() : String(nameFromMeta);
    const email = user.email ?? (typeof profile?.email === 'string' ? profile.email : '') ?? '';

    const { error: insErr } = await supabaseAdmin.from('tips').insert({
      user_id: user.id,
      user_email: email,
      user_name: userName,
      amount: Math.max(1, amountInr),
      razorpay_payment_id: null,
      razorpay_order_id: razorpay_order_id,
      payment_status: 'failed',
      device_platform,
    });

    if (insErr) {
      console.error(insErr);
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
