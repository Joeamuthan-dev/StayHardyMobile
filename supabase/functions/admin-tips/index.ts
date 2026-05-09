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

    // Parse optional `since` date from request body — filters out pre-launch test tips
    let since: string | null = null;
    try {
      const body = await req.json() as Record<string, unknown>;
      if (body?.since && typeof body.since === 'string') {
        since = body.since;
      }
    } catch {
      // no body or non-JSON body is fine
    }

    // Fetch all successful tips (filtered by launch date if provided)
    let summaryQuery = supabaseAdmin
      .from('tips')
      .select('id, user_id, user_email, user_name, amount, razorpay_payment_id, razorpay_order_id, tipped_at, payment_status')
      .eq('payment_status', 'success');

    if (since) {
      summaryQuery = summaryQuery.gte('tipped_at', since);
    }

    const { data: allTips, error: tipsErr } = await summaryQuery;
    if (tipsErr) {
      logPostgrestErr('tips select', tipsErr);
      return new Response(JSON.stringify({ error: tipsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tips = allTips ?? [];

    // Financial summary — computed from filtered tips
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const totalInr = tips.reduce((s: number, r: { amount: number }) => s + (r.amount ?? 0), 0);
    const supporters = new Set(tips.filter((r: { user_id: string | null }) => r.user_id).map((r: { user_id: string }) => r.user_id)).size;
    const thisMonthInr = tips
      .filter((r: { tipped_at: string }) => r.tipped_at >= thisMonthStart)
      .reduce((s: number, r: { amount: number }) => s + (r.amount ?? 0), 0);
    const lastMonthInr = tips
      .filter((r: { tipped_at: string }) => r.tipped_at >= lastMonthStart && r.tipped_at < thisMonthStart)
      .reduce((s: number, r: { amount: number }) => s + (r.amount ?? 0), 0);

    // Amount breakdown (e.g. how many ₹29 tips, ₹49 tips, etc.)
    const breakdownMap: Record<number, number> = {};
    for (const r of tips as { amount: number }[]) {
      const amt = r.amount ?? 0;
      breakdownMap[amt] = (breakdownMap[amt] ?? 0) + 1;
    }
    const amountBreakdown = Object.entries(breakdownMap)
      .map(([amount, cnt]) => ({ amount: Number(amount), cnt }))
      .sort((a, b) => a.amount - b.amount);

    // Top supporters
    const byUser: Record<string, { user_email: string; total_tipped: number; tip_count: number }> = {};
    for (const r of tips as { user_id: string | null; user_email: string | null; amount: number }[]) {
      const key = r.user_id ?? r.user_email ?? 'anonymous';
      if (!byUser[key]) byUser[key] = { user_email: r.user_email ?? '', total_tipped: 0, tip_count: 0 };
      byUser[key].total_tipped += r.amount ?? 0;
      byUser[key].tip_count += 1;
    }
    const topSupporters = Object.values(byUser)
      .sort((a, b) => b.total_tipped - a.total_tipped)
      .slice(0, 5);

    // Recent tips (most recent 15 from filtered set)
    const recent = [...tips]
      .sort((a: { tipped_at: string }, b: { tipped_at: string }) =>
        new Date(b.tipped_at).getTime() - new Date(a.tipped_at).getTime()
      )
      .slice(0, 15);

    return new Response(
      JSON.stringify({
        financial: {
          totalInr,
          supporters,
          thisMonthInr,
          lastMonthInr,
        },
        amountBreakdown,
        recent,
        topSupporters,
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
