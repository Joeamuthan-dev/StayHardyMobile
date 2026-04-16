-- Patch: Add all existing Pro members to Hardy Board
-- Run once in Supabase SQL Editor.
-- Safe to re-run — uses ON CONFLICT DO UPDATE.

INSERT INTO public.leaderboard_members (user_id, display_name, avatar_url, is_active)
SELECT
  u.id,
  COALESCE(NULLIF(u.name, ''), split_part(au.email, '@', 1), 'Warrior') AS display_name,
  u.avatar_url,
  true AS is_active
FROM public.users u
JOIN auth.users au ON au.id = u.id
WHERE
  u.is_pro = true
  OR EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.user_id = u.id
      AND p.product_id IN ('stayhardy_pro_monthly', 'stayhardy_pro_yearly')
  )
ON CONFLICT (user_id) DO UPDATE SET is_active = true;
