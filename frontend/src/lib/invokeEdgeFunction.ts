import { supabase } from '../supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function parseJwtPayload(token: string): { iss?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as { iss?: string };
  } catch {
    return null;
  }
}

export function accessTokenMatchesConfiguredProject(accessToken: string): boolean {
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) return true;
  const payload = parseJwtPayload(accessToken);
  if (!payload?.iss) return true;
  try {
    const host = new URL(supabaseUrl).hostname;
    return payload.iss.includes(host);
  } catch {
    return true;
  }
}

type InvokeResult<T> = Awaited<ReturnType<typeof supabase.functions.invoke<T>>>;

export type InvokeEdgeOptions = {
  /** Extra attempts when the device fails to complete fetch (common on mobile after Razorpay). Default 4. */
  retries?: number;
  /** Abort after this many ms. Default 120000. */
  timeoutMs?: number;
  /**
   * Skip supabase.auth.getUser() — one fewer HTTP round trip before Edge Function.
   * Safe for razorpay-verify right after checkout when session was already valid.
   */
  skipAuthProbe?: boolean;
};

function isTransientFetchError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; message?: string };
  if (e.name === 'FunctionsFetchError') return true;
  const m = e.message ?? '';
  return m.includes('Failed to send a request') || m.includes('fetch') || m.includes('NetworkError');
}

async function invokeOnce<T = unknown>(
  name: string,
  body: Record<string, unknown>,
  skipAuthProbe: boolean,
  timeoutMs: number
): Promise<InvokeResult<T>> {
  const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr) {
    console.warn('refreshSession', refreshErr);
  }

  const session =
    refreshed.session ?? (await supabase.auth.getSession()).data.session ?? null;

  if (!session?.access_token) {
    return {
      data: null,
      error: Object.assign(new Error('Not signed in'), { name: 'AuthSessionMissing' }),
      response: undefined,
    } as InvokeResult<T>;
  }

  if (!skipAuthProbe) {
    const { data: userData, error: guErr } = await supabase.auth.getUser();
    if (guErr || !userData.user) {
      return {
        data: null,
        error: Object.assign(
          new Error(
            guErr?.message?.includes('JWT')
              ? 'Session invalid or expired. Sign out, sign in again, then retry.'
              : guErr?.message || 'Could not validate session. Sign out and sign in again.'
          ),
          { name: 'AuthInvalid' }
        ),
        response: undefined,
      } as InvokeResult<T>;
    }
  }

  if (!accessTokenMatchesConfiguredProject(session.access_token)) {
    await supabase.auth.signOut();
    return {
      data: null,
      error: Object.assign(
        new Error(
          'Your login is for a different Supabase project than VITE_SUPABASE_URL. You were signed out — sign in again.'
        ),
        { name: 'ProjectMismatch' }
      ),
      response: undefined,
    } as InvokeResult<T>;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
  };
  if (supabaseAnonKey && !supabaseAnonKey.includes('placeholder')) {
    headers.apikey = supabaseAnonKey;
  }

  return supabase.functions.invoke<T>(name, {
    method: 'POST',
    body,
    headers,
    timeout: timeoutMs,
  });
}

/**
 * Refreshes session, validates user (optional), invokes Edge Function with retries on flaky mobile networks.
 */
export async function invokeEdgeFunctionWithUserJwt<T = unknown>(
  name: string,
  body?: Record<string, unknown>,
  opts?: InvokeEdgeOptions
): Promise<InvokeResult<T>> {
  const retries = opts?.retries ?? 4;
  const timeoutMs = opts?.timeoutMs ?? 120_000;
  const skipAuthProbe = opts?.skipAuthProbe ?? false;
  const payload = body ?? {};

  let last: InvokeResult<T> | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    last = await invokeOnce<T>(name, payload, skipAuthProbe, timeoutMs);

    if (!last.error) {
      return last;
    }

    if (!isTransientFetchError(last.error)) {
      return last;
    }

    if (attempt < retries - 1) {
      const delay = 400 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return last!;
}
