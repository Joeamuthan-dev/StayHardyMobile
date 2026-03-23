import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import { invokeEdgeFunctionWithUserJwt } from '../lib/invokeEdgeFunction';
import { getEdgeFunctionErrorMessage } from '../lib/edgeFunctionError';
import { markSupportPaymentCompleted } from '../lib/supportPopup';

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (payload: { error?: { description?: string } }) => void) => void;
};

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

const PRESETS = [29, 49, 99] as const;

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function devicePlatform(): 'android' | 'ios' | 'web' {
  const p = Capacitor.getPlatform();
  if (p === 'ios') return 'ios';
  if (p === 'android') return 'android';
  return 'web';
}

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [selectedPreset, setSelectedPreset] = useState<number>(49);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [thankYou, setThankYou] = useState<{ amount: number } | null>(null);
  const lastOrderIdRef = useRef<string | null>(null);
  const thankYouRef = useRef(false);

  useEffect(() => {
    thankYouRef.current = !!thankYou;
  }, [thankYou]);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!thankYou) return;
    const t = window.setTimeout(() => {
      setThankYou(null);
      setShouldRender(false);
      navigate('/home');
    }, 4000);
    return () => clearTimeout(t);
  }, [thankYou, navigate]);

  const effectiveInr = useMemo(() => {
    if (customMode) {
      const raw = customInput.replace(/\D/g, '');
      if (!raw) return null;
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n)) return null;
      if (n < 1 || n > 9999) return null;
      return n;
    }
    return selectedPreset;
  }, [customMode, customInput, selectedPreset]);

  const ctaLabel = useMemo(() => {
    if (effectiveInr == null) return 'Support';
    return `Support with ₹${effectiveInr}`;
  }, [effectiveInr]);

  const selectPreset = (n: number) => {
    setSelectedPreset(n);
    setCustomMode(false);
    setCustomInput('');
    setErr('');
  };

  const runVerifyRetries = useCallback(
    async (payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      const plat = devicePlatform();
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt));
        const { data: vData, error: vErr } =
          await invokeEdgeFunctionWithUserJwt(
            'razorpay-verify',
            {
              purpose: 'support',
              razorpay_order_id: payload.razorpay_order_id,
              razorpay_payment_id: payload.razorpay_payment_id,
              razorpay_signature: payload.razorpay_signature,
              device_platform: plat,
            },
            { skipAuthProbe: true, retries: 2, timeoutMs: 120_000 }
          );
        if (vErr) {
          console.error('verify retry', vErr);
          continue;
        }
        const verifyPayload = vData as { ok?: boolean; persistFailed?: boolean };
        if (verifyPayload?.ok && !verifyPayload?.persistFailed) return true;
      }
      return false;
    },
    []
  );

  const handlePay = useCallback(async () => {
    setErr('');
    setToast('');
    if (!user?.id) {
      setErr('Sign in to support the app.');
      return;
    }
    if (customMode) {
      const raw = customInput.replace(/\D/g, '');
      if (!raw) {
        setErr('Enter an amount.');
        return;
      }
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n) || n < 1) {
        setErr('Minimum amount is ₹1');
        return;
      }
      if (n > 9999) {
        setErr('Maximum amount is ₹9,999');
        return;
      }
    }
    if (effectiveInr == null) {
      setErr('Enter a valid amount.');
      return;
    }

    setBusy(true);
    lastOrderIdRef.current = null;
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setErr('Could not load payment. Check your network.');
        setBusy(false);
        return;
      }

      const { data, error: createErr, response: createFnResponse } =
        await invokeEdgeFunctionWithUserJwt('razorpay-create-order', {
          purpose: 'support',
          amountInr: effectiveInr,
        });

      if (createErr) {
        setErr(await getEdgeFunctionErrorMessage(createErr, data, createFnResponse));
        setBusy(false);
        return;
      }

      const payload = data as {
        orderId?: string;
        keyId?: string;
        amount?: number;
        currency?: string;
        error?: string;
      };

      if (payload.error) {
        setErr(payload.error);
        setBusy(false);
        return;
      }

      const keyId = RAZORPAY_KEY_ID || payload.keyId;
      if (!payload.orderId || !keyId) {
        setErr('Payment is not configured. Try again later.');
        setBusy(false);
        return;
      }

      const amountPaise = typeof payload.amount === 'number' ? payload.amount : Number(payload.amount);
      if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
        setErr('Invalid order amount.');
        setBusy(false);
        return;
      }

      lastOrderIdRef.current = payload.orderId;

      const plat = devicePlatform();
      const rzp = new window.Razorpay({
        key: keyId,
        amount: amountPaise,
        currency: payload.currency || 'INR',
        name: 'StayHardy',
        description: 'Support the Developer',
        order_id: payload.orderId,
        prefill: {
          email: user?.email ?? '',
        },
        theme: { color: '#00E87A' },
        modal: {
          ondismiss: () => {
            setBusy(false);
            lastOrderIdRef.current = null;
          },
        },
        handler: async (paymentResult: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setBusy(true);
          try {
            const { data: vData, error: vErr, response: verifyFnResponse } =
              await invokeEdgeFunctionWithUserJwt(
                'razorpay-verify',
                {
                  purpose: 'support',
                  razorpay_order_id: paymentResult.razorpay_order_id,
                  razorpay_payment_id: paymentResult.razorpay_payment_id,
                  razorpay_signature: paymentResult.razorpay_signature,
                  device_platform: plat,
                },
                { skipAuthProbe: true, retries: 4, timeoutMs: 120_000 }
              );
            if (vErr) {
              setToast(await getEdgeFunctionErrorMessage(vErr, vData, verifyFnResponse));
              setBusy(false);
              return;
            }
            const verifyPayload = vData as {
              ok?: boolean;
              error?: string;
              support?: boolean;
              amountInr?: number;
              persistFailed?: boolean;
            };
            if (verifyPayload?.error) {
              setToast(
                verifyPayload.error.includes('signature') || verifyPayload.error.includes('Invalid')
                  ? 'Payment verification failed. Contact support if amount was deducted.'
                  : verifyPayload.error
              );
              setBusy(false);
              return;
            }
            if (!verifyPayload?.ok) {
              setToast('Payment verification failed. Contact support if amount was deducted.');
              setBusy(false);
              return;
            }
            if (verifyPayload?.persistFailed) {
              void runVerifyRetries({
                razorpay_order_id: paymentResult.razorpay_order_id,
                razorpay_payment_id: paymentResult.razorpay_payment_id,
                razorpay_signature: paymentResult.razorpay_signature,
              });
            }

            const amt = Number(verifyPayload?.amountInr ?? effectiveInr);
            const amountFinal = Number.isFinite(amt) ? amt : effectiveInr ?? 0;
            markSupportPaymentCompleted();
            setThankYou({ amount: amountFinal });
            setShouldRender(true);
            onClose();
          } catch (e) {
            setToast((e as Error).message || 'Verification failed.');
          } finally {
            setBusy(false);
            lastOrderIdRef.current = null;
          }
        },
      });

      rzp.on('payment.failed', (res) => {
        setBusy(false);
        setToast('Payment failed. Please try again.');
        const msg = res?.error?.description;
        if (msg && msg.trim()) setErr(msg);
        const oid = lastOrderIdRef.current;
        if (oid) {
          void invokeEdgeFunctionWithUserJwt('tip-record-failed', {
            razorpay_order_id: oid,
            device_platform: plat,
          }).catch(() => {});
        }
        lastOrderIdRef.current = null;
      });

      rzp.open();
      setBusy(false);
    } catch (e) {
      setErr((e as Error).message || 'Something went wrong.');
      setBusy(false);
    }
  }, [user?.id, user?.email, effectiveInr, customInput, customMode, onClose, runVerifyRetries]);

  const dismissThankYouContinue = () => {
    setThankYou(null);
    setShouldRender(false);
    navigate('/home');
  };

  if (!shouldRender && !thankYou) return null;

  return (
    <>
      <div
        className={`support-msk ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && e.propertyName === 'opacity' && !isOpen && !thankYouRef.current) {
            setShouldRender(false);
          }
        }}
      >
        <div className="support-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="support-handle" aria-hidden />
          <button type="button" className="support-x" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="support-ambient" aria-hidden />

          <div className="support-inner">
            <div className="support-anim-icon">
              <div className="support-icon-box" aria-hidden>
                <div className="support-icon-glow" />
                <svg className="support-heart-svg" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    fill="#00E87A"
                  />
                </svg>
              </div>
            </div>

            <h2 className="support-headline">Built with ❤️ for people who grind.</h2>
            <p className="support-sub">100% free. Zero ads. Just pure productivity.</p>

            <p className="support-body">
              I built StayHardy alone — no team, no investors, no ads. Just one developer who believes you deserve a clean,
              focused productivity app. If it&apos;s helped you even once, consider buying me a Tea ☕ — it keeps this app
              alive and growing.
            </p>

            <div className="support-amount-row">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`support-amt ${!customMode && selectedPreset === n ? 'active' : ''}`}
                  onClick={() => selectPreset(n)}
                >
                  ₹{n}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="support-custom-link"
              onClick={() => {
                setCustomMode(true);
                setCustomInput(String(selectedPreset));
                setErr('');
              }}
            >
              Or enter custom amount
            </button>

            {customMode && (
              <div className="support-custom-field">
                <span className="support-rupee">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="support-custom-input"
                  placeholder="Amount"
                  value={customInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCustomInput(digits);
                  }}
                  aria-label="Custom amount in rupees"
                />
              </div>
            )}

            {err ? <p className="support-err">{err}</p> : null}

            <button
              type="button"
              className="support-cta"
              onClick={handlePay}
              disabled={busy || (customMode && effectiveInr == null)}
            >
              <span className="material-symbols-outlined support-cta-lock">lock</span>
              {busy ? 'Please wait…' : ctaLabel}
            </button>
            <p className="support-secure">🔒 Secure payment via Razorpay</p>

            <button type="button" className="support-later" onClick={onClose}>
              Maybe later
            </button>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="support-toast" role="alert">
          {toast}
        </div>
      ) : null}

      {thankYou ? (
        <div className="support-thankyou-full" role="status">
          <div className="support-thankyou-ambient" aria-hidden />
          <div className="support-thankyou-inner">
            <div className="support-thankyou-tick-wrap" aria-hidden>
              <svg className="support-thankyou-tick" viewBox="0 0 24 24" fill="none">
                <path
                  className="support-thankyou-tick-path"
                  d="M 6 12 L 10.5 16.5 L 18 7"
                  pathLength={100}
                  stroke="#00E87A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
            <h2 className="support-thankyou-head">You&apos;re a legend! 🙏</h2>
            <p className="support-thankyou-sub">
              Thank you for supporting StayHardy.
              <br />
              Your ₹{thankYou.amount} means more than you know.
              <br />
              This keeps the app alive and ad-free.
            </p>
            <p className="support-thankyou-pill">✦ Payment Confirmed · ₹{thankYou.amount}</p>
            <button type="button" className="support-thankyou-cta" onClick={dismissThankYouContinue}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      <style>{`
        .support-msk {
          position: fixed;
          inset: 0;
          z-index: 10000;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 0.35s ease, visibility 0.35s;
        }
        .support-msk.open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .support-sheet {
          position: relative;
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          background: #0e1512;
          border: 1px solid rgba(0, 232, 122, 0.12);
          border-radius: 28px 28px 0 0;
          padding: 20px 24px calc(32px + env(safe-area-inset-bottom, 0));
          transform: translateY(100%);
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          max-height: min(92vh, 720px);
          overflow-y: auto;
          box-sizing: border-box;
        }
        .support-msk.open .support-sheet {
          transform: translateY(0);
        }

        .support-handle {
          width: 36px;
          height: 4px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.15);
          margin: 0 auto 16px;
        }

        .support-x {
          position: absolute;
          top: calc(12px + env(safe-area-inset-top, 0));
          right: 16px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          z-index: 2;
        }
        .support-x .material-symbols-outlined {
          font-size: 14px;
        }

        .support-ambient {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          height: 160px;
          pointer-events: none;
          background: radial-gradient(ellipse at top, rgba(0, 232, 122, 0.06), transparent 70%);
          border-radius: 28px 28px 0 0;
        }

        .support-inner {
          position: relative;
          z-index: 1;
          text-align: center;
        }

        .support-anim-icon {
          opacity: 0;
          animation: supIn 0.45s ease forwards;
          animation-delay: 0.2s;
        }
        .support-icon-box {
          width: 64px;
          height: 64px;
          margin: 0 auto;
          border-radius: 18px;
          background: linear-gradient(145deg, #1a1a1a, #0d0d0d);
          border: 1px solid rgba(0, 232, 122, 0.25);
          box-shadow: 0 0 20px rgba(0, 232, 122, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: visible;
        }
        .support-icon-glow {
          position: absolute;
          inset: -6px;
          border-radius: 22px;
          background: radial-gradient(circle, rgba(0, 232, 122, 0.2), transparent 65%);
          animation: supGlow 2.2s ease-in-out infinite;
          pointer-events: none;
        }
        .support-heart-svg {
          width: 34px;
          height: 34px;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 0 8px rgba(0, 232, 122, 0.45));
          animation: supHeart 2.2s ease-in-out infinite;
        }
        @keyframes supGlow {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        @keyframes supHeart {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }

        .support-headline {
          font-family: 'Syne', system-ui, sans-serif;
          font-weight: 700;
          font-size: 22px;
          color: #fff;
          letter-spacing: -0.5px;
          margin: 18px 0 0;
          line-height: 1.25;
          opacity: 0;
          transform: translateY(10px);
          animation: supUp 0.5s ease forwards;
          animation-delay: 0.35s;
        }
        .support-sub {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          font-style: italic;
          color: #00e87a;
          margin: 8px 0 0;
          opacity: 0;
          transform: translateY(10px);
          animation: supUp 0.5s ease forwards;
          animation-delay: 0.45s;
        }
        .support-body {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.7);
          max-width: 280px;
          margin: 16px auto 0;
          opacity: 0;
          transform: translateY(10px);
          animation: supUp 0.5s ease forwards;
          animation-delay: 0.55s;
        }

        .support-amount-row {
          display: flex;
          gap: 8px;
          margin-top: 18px;
          opacity: 0;
          transform: translateY(10px);
          animation: supUp 0.5s ease forwards;
          animation-delay: 0.65s;
        }
        .support-amt {
          flex: 1;
          padding: 10px 0;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }
        .support-amt.active {
          background: rgba(0, 232, 122, 0.12);
          border-color: #00e87a;
          color: #00e87a;
          transform: scale(1.04);
        }

        .support-custom-link {
          display: block;
          margin: 10px auto 0;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.35);
          font-size: 11px;
          cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        .support-custom-field {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin-top: 10px;
          max-width: 200px;
          margin-left: auto;
          margin-right: auto;
        }
        .support-rupee {
          color: rgba(255, 255, 255, 0.5);
          font-size: 15px;
          font-weight: 600;
        }
        .support-custom-input {
          flex: 1;
          min-width: 0;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 8px 12px;
          color: #fff;
          font-size: 15px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        .support-err {
          color: #f87171;
          font-size: 12px;
          margin: 10px 0 0;
        }

        .support-cta {
          width: 100%;
          height: 52px;
          margin-top: 16px;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: #000;
          background: linear-gradient(135deg, #00e87a, #00c563);
          box-shadow: 0 8px 24px rgba(0, 232, 122, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0;
          transform: translateY(10px);
          animation: supUp 0.5s ease forwards;
          animation-delay: 0.75s;
          animation-fill-mode: forwards;
          transition: opacity 0.2s, transform 0.2s;
        }
        .support-cta:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .support-cta-lock {
          font-size: 12px !important;
        }

        .support-secure {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.35);
          margin: 10px 0 0;
        }

        .support-later {
          display: block;
          width: 100%;
          margin-top: 4px;
          padding: 12px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.35);
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          cursor: pointer;
          opacity: 0;
          transform: translateY(10px);
          animation: supUp 0.5s ease forwards;
          animation-delay: 0.85s;
          animation-fill-mode: forwards;
        }

        @keyframes supIn {
          to { opacity: 1; }
        }
        @keyframes supUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .support-toast {
          position: fixed;
          top: calc(16px + env(safe-area-inset-top, 0));
          left: 50%;
          transform: translateX(-50%);
          z-index: 10002;
          max-width: min(360px, calc(100vw - 32px));
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(30, 30, 30, 0.95);
          border: 1px solid rgba(248, 113, 113, 0.4);
          color: #fecaca;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          line-height: 1.45;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
        }

        .support-thankyou-full {
          position: fixed;
          inset: 0;
          z-index: 10003;
          background: #080c0a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
        }
        .support-thankyou-ambient {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse at 50% 20%, rgba(0, 232, 122, 0.12), transparent 55%);
        }
        .support-thankyou-inner {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 340px;
        }
        .support-thankyou-tick-wrap {
          width: 88px;
          height: 88px;
          margin: 0 auto;
          border-radius: 22px;
          background: linear-gradient(145deg, #1a1a2e, #0d0d1a);
          border: 1px solid rgba(0, 232, 122, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .support-thankyou-tick {
          width: 48px;
          height: 48px;
        }
        .support-thankyou-tick-path {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: supThankDraw 0.65s ease-out forwards;
        }
        @keyframes supThankDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
        .support-thankyou-head {
          font-family: 'Syne', system-ui, sans-serif;
          font-weight: 700;
          font-size: 26px;
          color: #fff;
          margin: 20px 0 0;
          line-height: 1.2;
        }
        .support-thankyou-sub {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.6);
          margin: 14px 0 0;
        }
        .support-thankyou-pill {
          display: inline-block;
          margin-top: 16px;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          color: #00e87a;
          background: rgba(0, 232, 122, 0.1);
          border: 1px solid rgba(0, 232, 122, 0.25);
        }
        .support-thankyou-cta {
          margin-top: 22px;
          padding: 12px 28px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #00e87a, #00c563);
          color: #000;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </>
  );
};

export default SupportModal;
