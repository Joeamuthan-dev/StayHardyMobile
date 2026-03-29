// Deploy: supabase functions deploy admin-tips --no-verify-jwt
// Returns aggregated tips data for admin dashboard only.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function logPostgrestErr(scope: string, err: unknown) {
  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  console.error(`[admin-tips] ${scope}`, e.message, e.code ?? '', e.details ?? '', e.hint ?? '');
}

/** PostgREST sometimes returns jsonb RPC results as parsed objects; normalize string JSON if needed. */
function asJsonObject(val: unknown): Record<string, unknown> {
  if (val != null && typeof val === 'object' && !Array.isArray(val)) return val as Record<string, unknown>;
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val) as unknown;
      if (p != null && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  return {};
}

function asJsonArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val) as unknown;
      if (Array.isArray(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return [];
}

/**
 * Must match frontend AuthContext admin check. Set secret ADMIN_EMAILS=a@x.com,b@y.com
 * in Supabase (optional). If unset, defaults to joe@gmail.com like the app.
 */
function isAllowlistedAdminEmail(email: string | undefined): boolean {
  const e = email?.toLowerCase().trim() ?? '';
  if (!e) return false;
  const raw = Deno.env.get('ADMIN_EMAILS');
  if (raw === undefined || raw.trim() === '') {
    return e === 'joeamuthan2@gmail.com';
  }
  const allowed = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(e);
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

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
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

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);

    const { data: adminRow, error: roleErr } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (roleErr) {
      logPostgrestErr('users role lookup', roleErr);
    }

    const dbAdmin = !roleErr && adminRow?.role === 'admin';
    const emailAdmin = isAllowlistedAdminEmail(user.email ?? undefined);
    if (!dbAdmin && !emailAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: fin, error: finErr } = await supabaseAdmin.rpc('admin_tips_financial_summary');
    if (finErr) {
      logPostgrestErr('rpc admin_tips_financial_summary', finErr);
      return new Response(JSON.stringify({ error: finErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: breakdown, error: brErr } = await supabaseAdmin.rpc('admin_tips_amount_breakdown');
    if (brErr) {
      logPostgrestErr('rpc admin_tips_amount_breakdown', brErr);
      return new Response(JSON.stringify({ error: brErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: top5, error: topErr } = await supabaseAdmin.rpc('admin_tips_top_supporters');
    if (topErr) {
      logPostgrestErr('rpc admin_tips_top_supporters', topErr);
      return new Response(JSON.stringify({ error: topErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: recent, error: recErr } = await supabaseAdmin
      .from('tips')
      .select(
        'id,user_id,user_email,user_name,amount,razorpay_payment_id,razorpay_order_id,tipped_at,payment_status'
      )
      .eq('payment_status', 'success')
      .order('tipped_at', { ascending: false })
      .limit(15);

    if (recErr) {
      logPostgrestErr('tips select', recErr);
      return new Response(JSON.stringify({ error: recErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const summary = asJsonObject(fin);

    return new Response(
      JSON.stringify({
        financial: {
          totalInr: Number(summary.total_inr ?? 0),
          supporters: Number(summary.supporters ?? 0),
          thisMonthInr: Number(summary.this_month_inr ?? 0),
          lastMonthInr: Number(summary.last_month_inr ?? 0),
        },
        amountBreakdown: asJsonArray(breakdown),
        recent: recent ?? [],
        topSupporters: asJsonArray(top5),
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
