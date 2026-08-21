// RevenueCat → Supabase: mirrors Pro status into public.users.is_pro, so the
// SERVER has a truthful Pro flag (the app's hybrid fallback already reads it).
//
// Configure in RevenueCat: Integrations → Webhooks → this function's URL,
// with the Authorization header set to the same value as the
// REVENUECAT_WEBHOOK_AUTH function secret.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const PRO_ENTITLEMENT = 'StayHardy Pro';

Deno.serve(async (req) => {
  const auth = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? '';
  if (!auth || req.headers.get('authorization') !== auth) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // deno-lint-ignore no-explicit-any
  let event: any;
  try {
    event = (await req.json())?.event;
  } catch (_) {
    return json({ error: 'Bad payload' }, 400);
  }
  if (!event) return json({ error: 'No event' }, 400);
  if (event.type === 'TEST') return json({ ok: true, test: true });

  const appUserId = String(event.app_user_id ?? '');
  // RevenueCat anonymous ids are not Supabase uuids — nothing to mirror.
  if (!appUserId || appUserId.startsWith('$RCAnonymousID')) {
    return json({ ok: true, ignored: true });
  }

  // Pro is ON when the event carries the entitlement and is not an
  // expiration; EXPIRATION turns it off. CANCELLATION alone does NOT — a
  // cancelled subscription stays active until it expires, and flipping
  // early is how paying users get robbed of paid time.
  const entitlements: string[] = (event.entitlement_ids ?? []) as string[];
  const hasPro = entitlements.includes(PRO_ENTITLEMENT);
  let isPro: boolean | null = null;
  if (event.type === 'EXPIRATION') isPro = false;
  else if (hasPro) isPro = true;
  if (isPro === null) return json({ ok: true, unchanged: true });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { error } = await admin
    .from('users')
    .update({ is_pro: isPro })
    .eq('id', appUserId);
  if (error) {
    console.error('[revenuecat-webhook] update failed', error);
    return json({ error: 'update failed' }, 500);
  }
  return json({ ok: true, user: appUserId, is_pro: isPro });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
