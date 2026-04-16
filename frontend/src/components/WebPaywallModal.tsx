/**
 * WebPaywallModal — Instamojo paywall for web browser users ONLY.
 * Android / iOS use PaywallModal (RevenueCat). This file is NOT imported on native.
 * Platform gate is in PaywallContext.tsx via Capacitor.isNativePlatform().
 *
 * Flow: Create payment request → redirect to Instamojo payment page →
 *       Instamojo redirects back to /payment-success?payment_id=xxx&payment_request_id=xxx
 *       → PaymentSuccess page calls instamojo-verify → Pro granted.
 */
import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { LIFETIME_PRICE_INR } from '../config/lifetimePricing';

interface Props { onClose: () => void; }

const benefitSections = [
  {
    title: 'Advanced Telemetry',
    items: ['1-Year Productivity Heatmaps', 'Deep Insight Analytics', 'Category Performance Reports'],
  },
  {
    title: 'Habit Tracking',
    items: ['Advanced Habit Streaks', 'Historical Completion Trends', 'Rhythm Stability Metrics'],
  },
  {
    title: 'Elite System',
    items: ['Cloud Sync & Secure Backup', 'Early Access to Future Modules', 'Premium Tactical Aesthetics'],
  },
];

export const WebPaywallModal: React.FC<Props> = ({ onClose }) => {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const handlePurchase = async () => {
    if (!user) { showToast('Please sign in first.'); return; }
    setBusy(true);

    try {
      // 1. Create Instamojo payment request via edge function
      const { data: order, error: orderErr } = await supabase.functions.invoke('instamojo-create-order', {});

      if (orderErr || !order?.paymentUrl) {
        showToast(orderErr?.message ?? 'Could not initiate payment. Try again.');
        setBusy(false);
        return;
      }

      // 2. Redirect to Instamojo payment page
      // Instamojo handles UPI, cards, netbanking, wallets natively
      // After payment it redirects back to INSTAMOJO_RETURN_URL with payment params
      window.location.href = order.paymentUrl;

      // Page will navigate away — no further handling needed here.

    } catch {
      showToast('Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '16px',
    }}>
      {/* Click-away */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#161C1A', color: '#00E87A',
          padding: '12px 24px', borderRadius: '12px',
          border: '1px solid rgba(0,232,122,0.3)',
          fontSize: '13px', fontWeight: '600',
          zIndex: 10001, whiteSpace: 'nowrap',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {toast}
        </div>
      )}

      {/* Modal */}
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: '440px',
        background: '#0A0A0A',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden',
        boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 24px 8px 24px', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.2em', color: '#00E87A', marginBottom: '4px', textTransform: 'uppercase' }}>
              Lifetime Access
            </div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              StayHardy PRO
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <X size={18} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        {/* Scrollable benefits */}
        <div style={{ overflowY: 'auto', padding: '8px 24px 16px 24px', flex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', lineHeight: '1.6', margin: '0 0 24px' }}>
            One payment. Full access forever. No subscriptions, no renewals.
          </p>

          {benefitSections.map((section, idx) => (
            <div key={idx} style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '9px', fontWeight: '800', letterSpacing: '0.16em',
                color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase',
                marginBottom: '12px', paddingBottom: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                {section.title}
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {section.items.map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <CheckCircle2
                      size={16} color="#00E87A"
                      style={{ flexShrink: 0, marginTop: '2px', filter: 'drop-shadow(0 0 4px rgba(0,232,122,0.4))' }}
                    />
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: '16px 24px 28px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handlePurchase}
            disabled={busy}
            style={{
              width: '100%', height: '56px',
              background: busy ? 'rgba(0,232,122,0.35)' : 'linear-gradient(135deg, #00E87A 0%, #00C563 100%)',
              color: '#000', borderRadius: '16px', border: 'none',
              fontSize: '16px', fontWeight: '900',
              cursor: busy ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: busy ? 'none' : '0 8px 24px rgba(0,232,122,0.25)',
              transition: 'all 0.2s ease',
              letterSpacing: '-0.2px',
            }}
          >
            {busy ? (
              <>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  border: '2.5px solid rgba(0,0,0,0.2)',
                  borderTop: '2.5px solid #000',
                  animation: 'cf-spin 0.8s linear infinite',
                }} />
                Opening Payment…
              </>
            ) : (
              `Unlock Pro — ₹${LIFETIME_PRICE_INR}`
            )}
          </button>

          <p style={{
            textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.2)',
            marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="11" rx="2"/>
              <path d="M8 11V7a4 4 0 018 0v4"/>
            </svg>
            Secured by Instamojo · UPI / Cards / Netbanking
          </p>
        </div>

        <style>{`@keyframes cf-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};
