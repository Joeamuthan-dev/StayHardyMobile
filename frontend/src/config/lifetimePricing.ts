/**
 * Lifetime Pro price (INR).
 * TEST: ₹1 — change to `99` for production and redeploy Edge Functions (see comments there).
 */
export const LIFETIME_PRICE_INR = 1;

/** Razorpay order amount in paise (must match `razorpay-create-order`). */
export const LIFETIME_AMOUNT_PAISE = LIFETIME_PRICE_INR * 100;
