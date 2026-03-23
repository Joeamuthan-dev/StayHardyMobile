/**
 * supabase.functions.invoke sets error.message to "Edge function returned a non-2xx status code"
 * while the real reason is usually in the response JSON body as { error: "..." }.
 * Also reads FunctionsHttpError.context when the returned `response` field is missing.
 *
 * FunctionsFetchError = fetch() threw (offline, DNS, CORS, abort/timeout) — not the same as HTTP 5xx.
 */

export type EdgeFunctionErrorOptions = {
  /**
   * When true (default), generic connection failures mention payment/refund wording (checkout flows).
   * Set false for admin / analytics so messages stay accurate.
   */
  paymentContext?: boolean;
};

function getResponseFromError(error: unknown): Response | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { context?: unknown; name?: string };
  if (e.context instanceof Response) return e.context;
  return undefined;
}

function pickMessageFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  for (const key of ['error', 'message', 'msg', 'details']) {
    const v = o[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return null;
}

function fetchFailureMessage(error: unknown, paymentContext: boolean): string {
  const ctx = error as { context?: unknown; name?: string };
  const inner = ctx.context;
  if (inner && typeof inner === 'object' && (inner as { name?: string }).name === 'AbortError') {
    return 'Request timed out. Try again.';
  }
  if (paymentContext) {
    return 'Network error: could not reach the server. Check Wi‑Fi or mobile data and try again. If money was debited, wait a minute and pull to refresh, or sign out and back in.';
  }
  const hint =
    inner instanceof Error
      ? inner.message
      : typeof inner === 'object' && inner !== null && 'message' in inner
        ? String((inner as { message: unknown }).message)
        : '';
  if (hint && hint !== 'Failed to fetch') {
    return `Connection error: ${hint.slice(0, 200)}`;
  }
  return 'Could not reach the server. Check your connection and try again.';
}

/**
 * Extract a user-facing message from supabase.functions.invoke when error is set.
 */
export async function getEdgeFunctionErrorMessage(
  error: unknown,
  data: unknown,
  response: Response | undefined | null,
  opts?: EdgeFunctionErrorOptions
): Promise<string> {
  const paymentContext = opts?.paymentContext !== false;

  if (error && typeof error === 'object') {
    const e = error as { name?: string; message?: string };
    if (e.name === 'FunctionsRelayError') {
      return 'Could not reach the Edge Function (relay). Wait a moment and try again, or check Supabase status.';
    }
    if (e.name === 'FunctionsFetchError') {
      return fetchFailureMessage(error, paymentContext);
    }
    const m = e.message ?? '';
    if (m.includes('Failed to send a request to the Edge Function')) {
      return fetchFailureMessage(error, paymentContext);
    }
  }

  const fromData = pickMessageFromBody(data);
  if (fromData) return withJwtHint(fromData);

  const res = response ?? getResponseFromError(error) ?? null;
  if (res) {
    const status = res.status;
    try {
      const raw = await res.clone().text();
      const trimmed = raw.trim();
      if (trimmed) {
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed) as unknown;
            const msg = pickMessageFromBody(parsed);
            if (msg) return withJwtHint(msg);
          } catch {
            /* not JSON */
          }
        }
        return withJwtHint(trimmed.slice(0, 500));
      }
    } catch {
      /* ignore */
    }

    if (status === 401) {
      return withJwtHint(
        'Unauthorized (401). Sign in again, or check that Edge Functions accept your session.'
      );
    }
    if (status === 404) {
      return withJwtHint(
        'Edge Function not found (404). Deploy it to this Supabase project (e.g. admin-tips) and wait a minute.'
      );
    }
    if (status >= 500) {
      return withJwtHint(
        paymentContext
          ? `Server error (${status}). Check Supabase Edge Function logs and Razorpay secrets.`
          : `Server error (${status}). Check Supabase → Edge Functions → Logs (e.g. admin-tips, DB RPC, or tips table).`
      );
    }
    if (status >= 400) {
      return withJwtHint(
        `Request failed (HTTP ${status}). Check Supabase Dashboard → Edge Functions → Logs.`
      );
    }
  }

  const err = error as { message?: string; name?: string };
  if (typeof err?.message === 'string' && err.message.trim()) {
    if (err.message.includes('non-2xx') && res) {
      return withJwtHint(
        `Edge Function failed (HTTP ${res.status}). Open Supabase → Edge Functions → Logs for details.`
      );
    }
    return withJwtHint(err.message);
  }
  return withJwtHint('Something went wrong. Try again.');
}

function withJwtHint(msg: string): string {
  if (!/invalid\s*jwt/i.test(msg)) return msg;
  return `${msg} Sign out and sign in again. If it continues, check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY match the project where Edge Functions are deployed.`;
}
