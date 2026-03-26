/** Mask email for admin tables: sh***@gmail.com */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '—';
  const [local, domain] = email.split('@');
  if (!local) return '—';
  if (local.length <= 2) return `**@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export const ADMIN_ANALYTICS_CACHE_MS = 5 * 60 * 1000;

export interface ProMembershipCounts {
  total: number;
  last30: number;
  last7: number;
}

/** Last 8 chars of Razorpay payment id */
export function shortPaymentId(id: string | null | undefined): string {
  if (!id) return '—';
  const s = String(id).trim();
  if (s.length <= 8) return s;
  return s.slice(-8);
}

/** Build 30 daily buckets (₹) from pro_purchase_date rows; max 50 rows in → partial chart if more sales exist */
export function aggregateDailyRevenue(
  dates: string[],
  priceInr: number,
  days: number
): { name: string; revenue: number; iso: string }[] {
  const now = new Date();
  const buckets = new Map<string, number>();

  for (const iso of dates) {
    if (!iso) continue;
    const d = iso.slice(0, 10);
    buckets.set(d, (buckets.get(d) ?? 0) + 1);
  }

  const out: { name: string; revenue: number; iso: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const iso = date.toISOString().slice(0, 10);
    const count = buckets.get(iso) ?? 0;
    const display = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    out.push({ name: display, revenue: count * priceInr, iso });
  }
  return out;
}
