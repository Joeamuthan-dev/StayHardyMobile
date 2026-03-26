// Deploy: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
//         supabase secrets set PUSH_CRON_SECRET=your-long-random-secret
//         supabase functions deploy send-daily-pushes --no-verify-jwt
//
// Schedule: POST every 15 minutes:
//   curl -X POST "$SUPABASE_URL/functions/v1/send-daily-pushes" -H "x-cron-secret: $PUSH_CRON_SECRET"
//
// Firebase Admin (FCM v1). Android: FCM token from @capacitor/push-notifications.
// iOS: token must be an FCM registration token for send() to succeed (configure Firebase iOS SDK) or use a bridge.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { initializeApp, cert, getApps } from 'npm:firebase-admin@12.7.0/app';
import { getMessaging } from 'npm:firebase-admin@12.7.0/messaging';
import type { Message } from 'npm:firebase-admin@12.7.0/messaging';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function ymdInTz(tz: string, d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function hourMinuteInTz(tz: string, d = new Date()): { h: number; m: number } {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz || 'UTC',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });
  const parts = f.formatToParts(d);
  return {
    h: parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10),
    m: parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10),
  };
}

function firstName(name: string | null): string {
  if (!name?.trim()) return 'there';
  return name.trim().split(/\s+/)[0] ?? 'there';
}

interface Queued {
  message: Message;
  userId: string;
  kind: 'morning' | 'evening';
  date: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const cronSecret = Deno.env.get('PUSH_CRON_SECRET');
  const headerSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || headerSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!saJson) {
    return new Response(JSON.stringify({ error: 'FIREBASE_SERVICE_ACCOUNT_JSON not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase service configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: rows, error: qErr } = await supabase
    .from('users')
    .select('id, name, push_token, push_timezone, last_morning_push_date, last_evening_push_date')
    .eq('push_notifications_enabled', true)
    .not('push_token', 'is', null);

  if (qErr) {
    console.error('Query users:', qErr);
    return new Response(JSON.stringify({ error: qErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const users = rows ?? [];
  if (users.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, message: 'No subscribers' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let sa: Record<string, string>;
  try {
    sa = JSON.parse(saJson);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid FIREBASE_SERVICE_ACCOUNT_JSON' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(sa as never) });
  }
  const messaging = getMessaging();

  const now = new Date();
  const queued: Queued[] = [];

  for (const u of users as Array<{
    id: string;
    name: string | null;
    push_token: string;
    push_timezone: string | null;
    last_morning_push_date: string | null;
    last_evening_push_date: string | null;
  }>) {
    const tz = u.push_timezone || 'UTC';
    const today = ymdInTz(tz, now);
    const { h, m } = hourMinuteInTz(tz, now);
    const fn = firstName(u.name);

    if (h === 9 && m < 15 && u.last_morning_push_date !== today) {
      queued.push({
        userId: u.id,
        kind: 'morning',
        date: today,
        message: {
          token: u.push_token,
          notification: {
            title: `Good morning, ${fn}! 🌅`,
            body:
              "A new day, a new chance to stay hard. Check your goals, update your tasks, and keep your routines alive. You've got this. 💪",
          },
          data: { route: '/home' } as Record<string, string>,
          android: { priority: 'high' },
          apns: {
            payload: {
              aps: {
                sound: 'default',
              },
            },
          },
        },
      });
    }

    if (h === 22 && m < 15 && u.last_evening_push_date !== today) {
      queued.push({
        userId: u.id,
        kind: 'evening',
        date: today,
        message: {
          token: u.push_token,
          notification: {
            title: `Hey ${fn}, how was your day? 🌙`,
            body:
              'Before you rest, take 2 minutes — mark your completed tasks, update your goals, and log your routines. Consistency is what separates the hard from the rest.',
          },
          data: { route: '/dashboard' } as Record<string, string>,
          android: { priority: 'high' },
          apns: {
            payload: {
              aps: {
                sound: 'default',
              },
            },
          },
        },
      });
    }
  }

  if (queued.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0, message: 'No users in send window' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const messages = queued.map((q) => q.message);
  const result = await messaging.sendEach(messages);

  const errors: string[] = [];
  for (let i = 0; i < result.responses.length; i++) {
    const r = result.responses[i];
    const q = queued[i];
    if (r.success) {
      if (q.kind === 'morning') {
        await supabase.from('users').update({ last_morning_push_date: q.date }).eq('id', q.userId);
      } else {
        await supabase.from('users').update({ last_evening_push_date: q.date }).eq('id', q.userId);
      }
    } else if (r.error) {
      errors.push(`${q.userId}: ${r.error.message}`);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
      queued: queued.length,
      errors: errors.slice(0, 30),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
