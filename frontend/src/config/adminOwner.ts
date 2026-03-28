/**
 * Single owner account — Admin Hub and admin nav links only for this email.
 * DB `users.role` must not downgrade this user when merged into AuthUser.
 */
export const OWNER_ADMIN_EMAIL = 'joeamuthan2@gmail.com';

function normalizeEmailForCompare(email: string | undefined | null): string {
  if (!email) return '';
  return email
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

export function isOwnerAdminEmail(email: string | undefined | null): boolean {
  return normalizeEmailForCompare(email) === OWNER_ADMIN_EMAIL;
}

/**
 * Use for sidebar, routes, and guards — checks normalized email so "Joe@gmail.com" matches.
 * Prefer this over `user.role === 'admin'` so stale cache/DB merges cannot hide Admin Hub.
 */
export function isAdminHubUser(user: { email?: string; role?: string } | null | undefined): boolean {
  return isOwnerAdminEmail(user?.email) || user?.role === 'admin';
}

/** Settings profile + upsell: owner email or DB role `admin`. */
export function isAdminProfileUser(user: { email?: string; role?: string } | null | undefined): boolean {
  return isOwnerAdminEmail(user?.email) || user?.role === 'admin';
}

/** Use after loading profile from DB or cache so owner always sees admin UI. */
export function resolveUserRole(email: string | undefined | null): 'admin' | 'user' {
  if (isOwnerAdminEmail(email)) return 'admin';
  return 'user';
}
