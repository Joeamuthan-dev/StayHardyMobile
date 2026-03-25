import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Preferences } from '@capacitor/preferences';
import { supabase } from '../supabase';

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (payload: { error?: { description?: string } }) => void) => void;
};



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

interface ProPaywallProps {
  currentUser?: any;
  onClose?: () => void;
}

const ProPaywall: React.FC<ProPaywallProps> = ({ currentUser, onClose }) => {
  const navigate = useNavigate();
  const { refreshUserProfile } = useAuth();
  const [proPrice, setProPrice] = useState(199);
  const [originalPrice, setOriginalPrice] = useState(999);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const fetchProPrice = async () => {
      try {
        const { value } = await Preferences.get({ key: 'app_settings' });
        if (value) {
          const cached = JSON.parse(value);
          const data = cached?.data;
          if (data?.pro_price) {
            setProPrice(data.pro_price);
            setOriginalPrice(data.pro_original_price || 999);
            return;
          }
        }
        const { data } = await supabase.from('app_settings').select('pro_price, pro_original_price').single();
        if (data) {
          setProPrice(data.pro_price || 199);
          setOriginalPrice(data.pro_original_price || 999);
        }
      } catch (e) {
        setProPrice(199);
        setOriginalPrice(999);
      }
    };

    const fetchUserCount = async () => {
      try {
        const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          const marketingCount = count * 2;
          setUserCount(marketingCount);
          console.log('DB count:', count);
          console.log('Marketing count:', marketingCount);
        }
      } catch (e) {
        console.error('Count error:', e);
      }
    };

    fetchProPrice();
    fetchUserCount();
  }, []);
  const handlePayment = useCallback(async (price: number) => {
    if (!currentUser?.id) {
      setErr('Please log in first.');
      setBusy(false);
      return;
    }

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded || !(window as any).Razorpay) {
        setErr('Could not load payment library. Check your network.');
        setBusy(false);
        return;
      }

      const options = {
        key: 'rzp_live_STxtr78ph0HFG9',
        amount: price * 100, // paise
        currency: 'INR',
        name: 'StayHardy',
        description: 'Lifetime Pro Access',
        prefill: {
          name: currentUser.name || '',
          email: currentUser.email || '',
          contact: ''
        },
        theme: {
          color: '#00E87A'
        },
        handler: async (response: any) => {
          console.log('Payment success:', response.razorpay_payment_id);
          setBusy(true);
          try {
            const { error } = await supabase
              .from('users')
              .update({
                is_pro: true,
                pro_purchase_date: new Date().toISOString()
              })
              .eq('id', currentUser.id);

            if (!error) {
              const isPro = await refreshUserProfile();
              if (isPro) {
                navigate('/home', { replace: true });
              } else {
                setErr('Payment verified but your account was not updated.');
              }
            } else {
              setErr('Payment done! Contact support if not activated.');
            }
          } catch (e) {
             setErr((e as Error).message || 'Something went wrong.');
          } finally {
             setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      setBusy(false);
    } catch (e) {
      setErr((e as Error).message || 'Something went wrong.');
      setBusy(false);
    }
  }, [navigate, refreshUserProfile, currentUser]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#080C0A',
      zIndex: 200,
      overflowY: 'auto',
      padding: '0 0 40px 0'
    }}>
      {/* SECTION 1 — HEADER */}
      <div style={{
        padding: '52px 24px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          background: '#00E87A',
          borderRadius: '20px',
          padding: '6px 16px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            fontSize: '10px',
            fontWeight: '900',
            color: '#000000',
            letterSpacing: '0.1em'
          }}>
            ONE-TIME ONLY • NO SUBSCRIPTION
          </span>
        </div>

        <h1 style={{
          fontSize: '36px',
          fontWeight: '900',
          color: '#FFFFFF',
          margin: 0,
          textAlign: 'center',
          letterSpacing: '-1px',
          lineHeight: 1.1
        }}>
          Unlock Everything.
        </h1>

        <p style={{
          fontSize: '15px',
          color: 'rgba(255,255,255,0.45)',
          margin: 0,
          textAlign: 'center',
          lineHeight: 1.6
        }}>
          Pay once. Own it forever. No renewals, no tricks.
        </p>
      </div>

      {/* SECTION 2 — FEATURE CARDS */}
      <div style={{
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Card 1 — Stats */}
        <div style={{ background: '#1C1F26', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 3px 0' }}>Stats & Insights</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>Deep productivity charts, focus trends, and weekly reports.</p>
          </div>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#00E87A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>

        {/* Card 2 — Habits */}
        <div style={{ background: '#1C1F26', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 3px 0' }}>Routines & Habits</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>Daily streaks, habit tracking, and reminders that keep you accountable.</p>
          </div>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#00E87A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>

        {/* Card 3 — Lifetime */}
        <div style={{ background: '#1C1F26', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12h8"/><path d="M12 8v8"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 3px 0' }}>Lifetime Access</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>One payment. Permanent unlock on your account — yours to keep.</p>
          </div>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#00E87A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>

      {userCount !== null && (
        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.3)',
          padding: '16px 24px 0 24px',
          margin: 0
        }}>
          ✦ Joined by{' '}
          <span style={{
            color: 'rgba(255,255,255,0.5)',
            fontWeight: '700'
          }}>
            {userCount.toLocaleString()}+
          </span>
          {' '}people who chose discipline
        </p>
      )}

      {err ? <p style={{ color: '#EF4444', textAlign: 'center', fontSize: '12px', margin: '8px 0 0 0' }}>{err}</p> : null}

      {/* SECTION 4 — PRICING + CTA */}
      <div style={{
        margin: '16px 16px 0 16px',
        border: '1.5px dashed #00E87A',
        borderRadius: '20px',
        padding: '20px',
        background: 'rgba(0,232,122,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
          <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.25)', textDecoration: 'line-through', fontWeight: '500' }}>₹{originalPrice}</span>
          <span style={{ fontSize: '38px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-1px', lineHeight: 1 }}>₹{proPrice}</span>
        </div>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 20px 0' }}>One-time payment. No subscription.</p>

        <button
          onClick={() => handlePayment(proPrice)}
          disabled={busy}
          style={{
            width: '100%', height: '54px', background: '#00E87A', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '900', color: '#000000', cursor: busy ? 'wait' : 'pointer', letterSpacing: '-0.2px', boxShadow: '0 0 24px rgba(0,232,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: busy ? 0.7 : 1
          }}>
          {busy ? 'Processing…' : `Unlock Now — ₹${proPrice}`}
        </button>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: '12px 0 0 0' }}>🔒 Secure payment via Razorpay</p>
      </div>

      {onClose && (
        <p onClick={onClose} style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.25)', margin: '16px 0 0 0', cursor: 'pointer', padding: '8px' }}>
          Maybe later
        </p>
      )}
    </div>
  );
};

export default ProPaywall;
