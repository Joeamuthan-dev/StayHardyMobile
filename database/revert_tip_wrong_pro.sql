-- Optional cleanup: find users whose Pro row was tied to a TIP payment id (bug: verify used wrong path).
-- Review every row before updating. Pro status uses public.users.is_pro (not pro_member).
-- Legit Pro users have payment_id from a lifetime order, not from tips.

-- Preview: Pro users where the stored payment_id is actually a tip payment
SELECT u.id,
       u.email,
       u.is_pro,
       u.payment_id,
       u.pro_purchase_date,
       t.amount AS tip_amount_inr,
       t.tipped_at
FROM public.users u
INNER JOIN public.tips t
  ON t.user_id = u.id
 AND t.razorpay_payment_id = u.payment_id
 AND t.payment_status = 'success'
WHERE u.is_pro = true;

-- If you confirm a row is wrong (tip id stored as Pro), revert that user only:
-- UPDATE public.users
-- SET is_pro = false,
--     pro_purchase_date = NULL,
--     payment_id = NULL,
--     payment_amount = NULL
-- WHERE id = 'PASTE_UUID_HERE';
