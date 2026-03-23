// Deploy: supabase functions deploy delete-user
// Service-role wipe of all user rows + storage + public.users + auth.admin.deleteUser.
// Client calls with user JWT; optional body.target_user_id or body.user_id for admin.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isAllowlistedAdminEmail(email: string | undefined): boolean {
  const e = email?.toLowerCase().trim() ?? '';
  if (!e) return false;
  const raw = Deno.env.get('ADMIN_EMAILS');
  if (raw === undefined || raw.trim() === '') {
    return e === 'joe@gmail.com';
  }
  const allowed = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(e);
}

function logErr(scope: string, err: unknown) {
  const e = err as { message?: string; code?: string };
  console.error(`[delete-user] ${scope}`, e?.message ?? err, e?.code ?? '');
}

async function deleteOptional(
  admin: ReturnType<typeof createClient>,
  table: string,
  column: string,
  userId: string,
) {
  const { error } = await admin.from(table).delete().eq(column, userId);
  if (error) logErr(`optional ${table}`, error);
}

/** App uses camelCase userId on tasks/goals/categories (PostgREST). */
async function deleteRequired(
  admin: ReturnType<typeof createClient>,
  table: string,
  column: 'userId' | 'user_id',
  userId: string,
  label: string,
): Promise<Response | null> {
  const { error } = await admin.from(table).delete().eq(column, userId);
  if (error) {
    logErr(label, error);
    return new Response(JSON.stringify({ error: error.message ?? `Failed to delete ${label}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return null;
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
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!serviceKey || !url || !anon) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerErr,
    } = await supabaseUser.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: { target_user_id?: string; user_id?: string; reason?: string } = {};
    try {
      if (req.method === 'POST') {
        const t = await req.text();
        if (t) body = JSON.parse(t) as typeof body;
      }
    } catch {
      body = {};
    }

    const admin = createClient(url, serviceKey);

    let targetId = caller.id;
    const rawTarget = (body.target_user_id ?? body.user_id ?? '').toString().trim();

    if (rawTarget && rawTarget !== caller.id) {
      const { data: adminRow, error: roleErr } = await admin
        .from('users')
        .select('role')
        .eq('id', caller.id)
        .maybeSingle();

      if (roleErr) logErr('caller role', roleErr);

      const dbAdmin = !roleErr && adminRow?.role === 'admin';
      const emailAdmin = isAllowlistedAdminEmail(caller.email ?? undefined);
      if (!dbAdmin && !emailAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetId = rawTarget;
    }

    const reason =
      typeof body.reason === 'string' && body.reason.trim() !== ''
        ? body.reason.trim().slice(0, 200)
        : rawTarget && rawTarget !== caller.id
          ? 'admin_delete'
          : 'user_requested';

    const { data: profile, error: profileErr } = await admin
      .from('users')
      .select('email')
      .eq('id', targetId)
      .maybeSingle();

    if (profileErr) logErr('profile fetch', profileErr);

    const userEmail = (profile as { email?: string } | null)?.email ?? caller.email ?? '';

    // --- Ordered deletion (children → parents). Schema: tasks/goals use userId; routines/logs use user_id. ---
    let errResp: Response | null;

    errResp = await deleteRequired(admin, 'tasks', 'userId', targetId, 'tasks');
    if (errResp) return errResp;

    errResp = await deleteRequired(admin, 'goals', 'userId', targetId, 'goals');
    if (errResp) return errResp;

    await deleteOptional(admin, 'categories', 'userId', targetId);

    errResp = await deleteRequired(admin, 'routines', 'user_id', targetId, 'routines');
    if (errResp) return errResp;

    errResp = await deleteRequired(admin, 'routine_logs', 'user_id', targetId, 'routine_logs');
    if (errResp) return errResp;

    await deleteOptional(admin, 'task_history', 'user_id', targetId);
    await deleteOptional(admin, 'calendar_events', 'user_id', targetId);
    await deleteOptional(admin, 'user_stats', 'user_id', targetId);

    const { error: eTips } = await admin.from('tips').delete().eq('user_id', targetId);
    if (eTips) logErr('tips', eTips);

    await deleteOptional(admin, 'pro_purchases', 'user_id', targetId);
    await deleteOptional(admin, 'push_tokens', 'user_id', targetId);

    const { error: eFb } = await admin.from('feedback').delete().eq('user_id', targetId);
    if (eFb) logErr('feedback', eFb);

    await deleteOptional(admin, 'user_preferences', 'user_id', targetId);
    await deleteOptional(admin, 'signup_logs', 'user_id', targetId);

    // Storage: avatars — root file by email + optional folder named by user id
    if (userEmail) {
      const avatarName = `${userEmail.replace(/@/g, '_at_')}.jpg`;
      const { error: avErr } = await admin.storage.from('avatars').remove([avatarName]);
      if (avErr) logErr('avatars remove email file', avErr);
    }

    const { data: avFolder, error: avListErr } = await admin.storage.from('avatars').list(targetId);
    if (avListErr) {
      logErr('avatars list user folder', avListErr);
    } else if (avFolder && avFolder.length > 0) {
      const paths = avFolder.map((f) => `${targetId}/${f.name}`);
      const { error: avRm } = await admin.storage.from('avatars').remove(paths);
      if (avRm) logErr('avatars remove user folder', avRm);
    }

    const { data: tiFiles, error: tiListErr } = await admin.storage.from('task-images').list(targetId);
    if (tiListErr) {
      logErr('task-images list', tiListErr);
    } else if (tiFiles && tiFiles.length > 0) {
      const paths = tiFiles.map((f) => `${targetId}/${f.name}`);
      const { error: tiRm } = await admin.storage.from('task-images').remove(paths);
      if (tiRm) logErr('task-images remove', tiRm);
    }

    const { error: logErrIns } = await admin.from('deletions_log').insert({
      user_email: userEmail,
      user_id: targetId,
      reason,
    });
    if (logErrIns) {
      logErr('deletions_log', logErrIns);
      return new Response(JSON.stringify({ error: logErrIns.message ?? 'Failed to write deletion log' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: eUsers } = await admin.from('users').delete().eq('id', targetId);
    if (eUsers) {
      logErr('users', eUsers);
      return new Response(JSON.stringify({ error: eUsers.message ?? 'Failed to delete user profile' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: authDelErr } = await admin.auth.admin.deleteUser(targetId);
    if (authDelErr) {
      logErr('auth.admin.deleteUser', authDelErr);
      return new Response(JSON.stringify({ error: authDelErr.message ?? 'Failed to delete auth user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    logErr('unhandled', e);
    return new Response(JSON.stringify({ error: (e as Error)?.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
