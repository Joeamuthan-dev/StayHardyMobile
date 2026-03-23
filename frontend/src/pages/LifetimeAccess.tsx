import React, { useCallback, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { shouldShowLifetimeUpsell } from '../lib/lifetimeAccess';
import { LIFETIME_PRICE_INR } from '../config/lifetimePricing';
import { getEdgeFunctionErrorMessage } from '../lib/edgeFunctionError';
import { invokeEdgeFunctionWithUserJwt } from '../lib/invokeEdgeFunction';

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

const LifetimeAccess: React.FC = () => {
  const { user, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [isSidebarHidden, setIsSidebarHidden] = useState(
    () => localStorage.getItem('sidebarHidden') === 'true'
  );
  const toggleSidebar = () => {
    setIsSidebarHidden((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarHidden', next.toString());
      return next;
    });
  };

  const startPayment = useCallback(async () => {
    setErr('');
    setBusy(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setErr('Could not load payment library. Check your network.');
        setBusy(false);
        return;
      }

      const { data, error: createErr, response: createFnResponse } =
        await invokeEdgeFunctionWithUserJwt('razorpay-create-order', { purpose: 'lifetime' });

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
        setErr(
          'Payment configuration incomplete. Set VITE_RAZORPAY_KEY_ID in the app and deploy Edge Functions with Razorpay secrets.'
        );
        setBusy(false);
        return;
      }

      const amountPaise = typeof payload.amount === 'number' ? payload.amount : Number(payload.amount);
      if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
        setErr('Invalid order amount from server.');
        setBusy(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount: amountPaise,
        currency: payload.currency || 'INR',
        name: 'StayHardy',
        description: `Lifetime Access — ₹${LIFETIME_PRICE_INR}`,
        order_id: payload.orderId,
        prefill: {
          email: user?.email ?? '',
          name: user?.name ?? '',
        },
        theme: { color: '#00E87A' },
        modal: {
          ondismiss: () => {
            setBusy(false);
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
                  purpose: 'lifetime',
                  razorpay_order_id: paymentResult.razorpay_order_id,
                  razorpay_payment_id: paymentResult.razorpay_payment_id,
                  razorpay_signature: paymentResult.razorpay_signature,
                },
                {
                  skipAuthProbe: true,
                  retries: 4,
                  timeoutMs: 120_000,
                }
              );
            if (vErr) {
              setErr(await getEdgeFunctionErrorMessage(vErr, vData, verifyFnResponse));
              return;
            }
            const verifyPayload = vData as { ok?: boolean; error?: string };
            if (verifyPayload?.error) {
              setErr(verifyPayload.error);
              return;
            }
            const isPro = await refreshUserProfile();
            if (isPro) {
              navigate('/home', { replace: true, state: { fromLifetimePurchase: true } });
            } else {
              setErr('Payment verified but your account was not updated. Pull to refresh or sign out and back in.');
            }
          } catch (e) {
            setErr((e as Error).message || 'Verification failed.');
          } finally {
            setBusy(false);
          }
        },
      });

      rzp.on('payment.failed', (res) => {
        setBusy(false);
        const msg = res?.error?.description;
        setErr(msg && msg.trim() ? msg : 'Payment failed. Please try again.');
      });

      rzp.open();
      setBusy(false);
    } catch (e) {
      setErr((e as Error).message || 'Something went wrong.');
      setBusy(false);
    }
  }, [navigate, refreshUserProfile, user?.email, user?.name]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!shouldShowLifetimeUpsell(user)) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div
      className={`lifetime-paywall-page page-shell ${isSidebarHidden ? 'sidebar-hidden' : ''}`}
    >
      <style>{`
        .lifetime-paywall-page {
          --lp-bg: #080c0a;
          --lp-accent: #00e87a;
          background: var(--lp-bg) !important;
          min-height: 100dvh;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: rgba(255, 255, 255, 0.88);
          padding-bottom: calc(1.75rem + env(safe-area-inset-bottom, 0px)) !important;
        }
        .lifetime-paywall-page .floating-shortcuts-bar {
          display: none !important;
          pointer-events: none !important;
        }
        .lifetime-paywall-page * {
          box-sizing: border-box;
        }
        .lifetime-paywall-scroll {
          position: relative;
          z-index: 1;
          max-width: 26rem;
          margin: 0 auto;
          padding: calc(env(safe-area-inset-top, 0px) + 0.5rem) 1.15rem 1.5rem;
        }
        .lifetime-paywall-glow {
          position: absolute;
          top: -4rem;
          left: 50%;
          transform: translateX(-50%);
          width: min(120vw, 24rem);
          height: 14rem;
          background: radial-gradient(ellipse at 50% 0%, rgba(0, 232, 122, 0.14), transparent 68%);
          pointer-events: none;
          z-index: 0;
        }
        .lifetime-paywall-topbar {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 0.25rem;
        }
        .lifetime-paywall-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--lp-accent);
          background: rgba(0, 232, 122, 0.08);
          border: 1px solid rgba(0, 232, 122, 0.22);
          padding: 0.4rem 0.75rem;
          border-radius: 999px;
          margin-bottom: 1.1rem;
        }
        .lifetime-paywall-h1 {
          font-family: 'Syne', system-ui, sans-serif;
          font-weight: 800;
          font-size: clamp(1.85rem, 7vw, 2.35rem);
          line-height: 1.05;
          letter-spacing: -0.03em;
          color: #f8fafc;
          margin: 0 0 0.65rem;
        }
        .lifetime-paywall-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 400;
          line-height: 1.55;
          color: rgba(148, 163, 184, 0.95);
          margin: 0;
          max-width: 22rem;
        }
        .lifetime-paywall-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(0, 232, 122, 0.15);
          border-radius: 18px;
          padding: 1rem 1.1rem;
          display: flex;
          gap: 0.85rem;
          align-items: flex-start;
        }
        .lifetime-paywall-card-icon {
          font-size: 1.35rem;
          line-height: 1;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }
        .lifetime-paywall-card h3 {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: -0.02em;
          color: #f1f5f9;
          margin: 0 0 0.3rem;
        }
        .lifetime-paywall-card p {
          margin: 0;
          font-size: 0.8rem;
          font-weight: 400;
          line-height: 1.5;
          color: rgba(148, 163, 184, 0.92);
        }
        .lifetime-paywall-social {
          text-align: center;
          font-size: 0.72rem;
          font-weight: 500;
          color: rgba(100, 116, 139, 0.95);
          margin: 0;
          padding: 0 0.5rem;
          line-height: 1.45;
        }
        .lifetime-paywall-price-wrap {
          border-radius: 18px;
          padding: 1.25rem 1.35rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(0, 232, 122, 0.35);
          box-shadow:
            0 0 0 1px rgba(0, 232, 122, 0.12),
            0 0 32px rgba(0, 232, 122, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }
        .lifetime-paywall-was {
          font-size: 0.95rem;
          font-weight: 600;
          color: rgba(148, 163, 184, 0.55);
          text-decoration: line-through;
          text-decoration-thickness: 1px;
        }
        .lifetime-paywall-now {
          font-family: 'Syne', sans-serif;
          font-size: 2.35rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #fff;
          line-height: 1;
          margin: 0.35rem 0 0.4rem;
        }
        .lifetime-paywall-price-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: rgba(0, 232, 122, 0.85);
          letter-spacing: 0.04em;
        }
        .lifetime-paywall-cta {
          display: block;
          width: 70%;
          max-width: 280px;
          margin: 0 auto;
          padding: 0.95rem 1.25rem;
          border: none;
          border-radius: 999px;
          background: #00e87a;
          color: #080c0a;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 0.95rem;
          letter-spacing: 0.02em;
          cursor: pointer;
          box-shadow:
            0 4px 20px rgba(0, 232, 122, 0.35),
            0 0 0 1px rgba(0, 232, 122, 0.25);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .lifetime-paywall-cta:hover:not(:disabled) {
          box-shadow:
            0 6px 28px rgba(0, 232, 122, 0.45),
            0 0 0 1px rgba(0, 232, 122, 0.35);
        }
        .lifetime-paywall-cta:active:not(:disabled) {
          transform: scale(0.98);
        }
        .lifetime-paywall-cta:disabled {
          opacity: 0.65;
          cursor: wait;
        }
        .lifetime-paywall-rzp {
          text-align: center;
          font-size: 0.65rem;
          font-weight: 500;
          color: rgba(100, 116, 139, 0.9);
          margin: 0.65rem 0 0;
        }
        .lifetime-paywall-foot {
          text-align: center;
          font-size: 0.68rem;
          font-weight: 500;
          color: rgba(71, 85, 105, 0.95);
          margin: 1.5rem 0 0;
          line-height: 1.5;
          padding: 0 0.75rem;
        }
        .lifetime-paywall-err {
          border-radius: 14px;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        @keyframes lp-fade-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .lp-a {
          opacity: 0;
          animation: lp-fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .lp-d1 { animation-delay: 0.05s; }
        .lp-d2 { animation-delay: 0.12s; }
        .lp-d3 { animation-delay: 0.19s; }
        .lp-d4 { animation-delay: 0.26s; }
        .lp-d5 { animation-delay: 0.33s; }
        .lp-d6 { animation-delay: 0.4s; }
        .lp-d7 { animation-delay: 0.47s; }
        .lp-d8 { animation-delay: 0.54s; }
        .lp-d9 { animation-delay: 0.61s; }
        @media (prefers-reduced-motion: reduce) {
          .lp-a {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      <div className="lifetime-paywall-glow" aria-hidden />
      <div className="lifetime-paywall-scroll">
        <div className="lifetime-paywall-topbar lp-a lp-d1">
          <button
            type="button"
            onClick={toggleSidebar}
            className="notification-btn desktop-only-btn"
            title="Sidebar"
            style={{
              width: 36,
              height: 36,
              minWidth: 36,
              opacity: 0.45,
              background: 'rgba(255,255,255,0.06)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {isSidebarHidden ? 'side_navigation' : 'fullscreen'}
            </span>
          </button>
        </div>

        <div className="lp-a lp-d2">
          <span className="lifetime-paywall-pill">✦ One-time only · No subscription</span>
        </div>

        <h1 className="lifetime-paywall-h1 lp-a lp-d3">Unlock Everything.</h1>
        <p className="lifetime-paywall-sub lp-a lp-d4">
          Pay once. Own it forever. No renewals, no tricks.
        </p>

        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1.5rem' }}
        >
          <div className="lifetime-paywall-card lp-a lp-d5">
            <span className="lifetime-paywall-card-icon" aria-hidden>
              📊
            </span>
            <div>
              <h3>Stats &amp; Insights</h3>
              <p>
                Deep productivity charts, focus trends, and weekly reports that show how you
                actually work.
              </p>
            </div>
          </div>
          <div className="lifetime-paywall-card lp-a lp-d6">
            <span className="lifetime-paywall-card-icon" aria-hidden>
              🔁
            </span>
            <div>
              <h3>Routines &amp; Habits</h3>
              <p>
                Daily streaks, habit tracking, and reminders that keep you accountable without the
                noise.
              </p>
            </div>
          </div>
          <div className="lifetime-paywall-card lp-a lp-d7">
            <span className="lifetime-paywall-card-icon" aria-hidden>
              ♾️
            </span>
            <div>
              <h3>Lifetime Access</h3>
              <p>One payment. Permanent unlock on your account — yours to keep.</p>
            </div>
          </div>
        </div>

        <p className="lifetime-paywall-social lp-a lp-d8" style={{ marginTop: '1.35rem' }}>
          Joined by 1000+ people who chose discipline
        </p>

        <div className="lifetime-paywall-price-wrap lp-a lp-d8" style={{ marginTop: '1.25rem' }}>
          <div className="lifetime-paywall-was">₹499</div>
          <div className="lifetime-paywall-now">₹{LIFETIME_PRICE_INR}</div>
          <div className="lifetime-paywall-price-label">One-time · No hidden fees</div>
        </div>

        {err ? <div className="lifetime-paywall-err lp-a">{err}</div> : null}

        <div style={{ marginTop: '1.35rem' }} className="lp-a lp-d9">
          <button
            type="button"
            className="lifetime-paywall-cta"
            disabled={busy}
            onClick={startPayment}
          >
            {busy ? 'Please wait…' : `Unlock Now — ₹${LIFETIME_PRICE_INR}`}
          </button>
          <p className="lifetime-paywall-rzp">Powered by Razorpay · 100% secure</p>
        </div>

        <p className="lifetime-paywall-foot lp-a lp-d9">
          No subscription. Cancel nothing. Yours forever.
        </p>
      </div>

      <BottomNav isHidden={isSidebarHidden} hideFloatingShelf />
    </div>
  );
};

export default LifetimeAccess;
