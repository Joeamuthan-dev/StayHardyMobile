import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import {
  Zap,
  Flame,
  BarChart2,
  Target,
  Shield,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';

const BENEFITS = [
  {
    icon: <Flame size={18} color="#00E676" />,
    text: 'Advanced Habit Tracking & Real-time Streaks',
  },
  {
    icon: <BarChart2 size={18} color="#00E676" />,
    text: '1-Year Behavioral Heatmaps & Charts',
  },
  {
    icon: <CheckCircle2 size={18} color="#00E676" />,
    text: 'Category-wise Productivity Insights',
  },
  {
    icon: <Target size={18} color="#00E676" />,
    text: 'Unlimited Goals, Routines & Habits',
  },
  {
    icon: <Shield size={18} color="#00E676" />,
    text: 'Priority Vault Support',
  },
];

const Paywall: React.FC = () => {
  const navigate = useNavigate();
  const {
    offerings,
    purchasePackage,
    restorePurchases,
    loading,
  } = useSubscription();

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const monthlyPkg = offerings?.monthly;
  const yearlyPkg = offerings?.yearly;
  const rcAvailable = !!(monthlyPkg || yearlyPkg);
  const [selectedPlan, setSelectedPlan] = useState<
    'monthly' | 'yearly'
  >('yearly');

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/home');
  };

  const handlePurchase = async () => {
    const pkg =
      selectedPlan === 'yearly' ? yearlyPkg : monthlyPkg;
    if (!pkg) return;
    setPurchasing(true);
    setMessage(null);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        setMessage({ text: 'Welcome to the 1%! 🎉', type: 'success' });
        setTimeout(() => navigate('/home'), 1500);
      } else {
        setMessage({ text: 'Purchase cancelled.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Purchase failed. Try again.', type: 'error' });
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setMessage(null);
    try {
      const success = await restorePurchases();
      if (success) {
        setMessage({ text: 'Purchase restored!', type: 'success' });
        setTimeout(() => navigate('/home'), 1500);
      } else {
        setMessage({
          text: 'No purchases found.',
          type: 'error',
        });
      }
    } catch {
      setMessage({ text: 'Restore failed. Try again.', type: 'error' });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 24px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        boxSizing: 'border-box',
      }}
    >

      {/* ── BACK BUTTON ── */}
      <button
        onClick={handleBack}
        style={{
          alignSelf: 'flex-start',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginBottom: '24px',
          flexShrink: 0,
        }}
      >
        <ChevronLeft size={20} color="white" />
      </button>

      {/* ── HEADER ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {/* Lightning bolt icon in glowing dark circle */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(0,230,118,0.1)',
            border: '1px solid rgba(0,230,118,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow:
              '0 0 24px rgba(0,230,118,0.2), 0 0 48px rgba(0,230,118,0.08)',
            marginBottom: '16px',
          }}
        >
          <Zap size={28} color="#00E676" fill="#00E676" />
        </div>

        <h1
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: '800',
            fontSize: '30px',
            color: '#FFFFFF',
            letterSpacing: '-0.5px',
            margin: '0 0 8px 0',
            lineHeight: 1.1,
          }}
        >
          StayHardy{' '}
          <span style={{ color: '#00E676' }}>PRO</span>
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.4)',
            margin: 0,
            fontWeight: '400',
          }}
        >
          Unlock the full suite of tactical modules.
        </p>
      </div>

      {/* ── PLAN SELECTOR (only if RC available) ── */}
      {rcAvailable && (
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginTop: '24px',
            flexShrink: 0,
          }}
        >
          {(
            [
              {
                key: 'yearly' as const,
                label: 'Yearly',
                badge: 'BEST VALUE',
                pkg: yearlyPkg,
                per: 'per year',
              },
              {
                key: 'monthly' as const,
                label: 'Monthly',
                badge: null,
                pkg: monthlyPkg,
                per: 'per month',
              },
            ] as const
          ).map((plan) => (
            <button
              key={plan.key}
              onClick={() => setSelectedPlan(plan.key)}
              style={{
                flex: 1,
                padding: '12px 8px',
                borderRadius: '14px',
                border:
                  selectedPlan === plan.key
                    ? '1px solid rgba(0,230,118,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                background:
                  selectedPlan === plan.key
                    ? 'rgba(0,230,118,0.08)'
                    : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
              }}
            >
              {plan.badge && (
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    color: '#00E676',
                    letterSpacing: '0.1em',
                    background: 'rgba(0,230,118,0.15)',
                    padding: '2px 8px',
                    borderRadius: '20px',
                  }}
                >
                  {plan.badge}
                </span>
              )}
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color:
                    selectedPlan === plan.key
                      ? '#00E676'
                      : 'rgba(255,255,255,0.5)',
                  fontFamily: 'Syne, sans-serif',
                }}
              >
                {plan.pkg?.product?.priceString ?? plan.label}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.25)',
                }}
              >
                {plan.per}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── BENEFITS CHECKLIST ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          marginTop: '28px',
          flexShrink: 0,
        }}
      >
        {BENEFITS.map((b, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9px',
                background: 'rgba(0,230,118,0.08)',
                border: '1px solid rgba(0,230,118,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {b.icon}
            </div>

            {/* Text */}
            <span
              style={{
                fontSize: '13px',
                fontWeight: '500',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.3,
              }}
            >
              {b.text}
            </span>
          </div>
        ))}
      </div>

      {/* ── SPACER — pushes CTA to bottom ── */}
      <div style={{ flex: 1 }} />

      {/* ── MESSAGE ── */}
      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background:
              message.type === 'success'
                ? 'rgba(0,230,118,0.1)'
                : 'rgba(239,68,68,0.1)',
            border: `1px solid ${
              message.type === 'success'
                ? 'rgba(0,230,118,0.3)'
                : 'rgba(239,68,68,0.3)'
            }`,
            fontSize: '13px',
            fontWeight: '600',
            color:
              message.type === 'success' ? '#00E676' : '#EF4444',
            textAlign: 'center',
            marginBottom: '16px',
            flexShrink: 0,
          }}
        >
          {message.text}
        </div>
      )}

      {/* ── BOTTOM ACTION AREA ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          flexShrink: 0,
        }}
      >
        {/* Main CTA */}
        <button
          onClick={rcAvailable ? handlePurchase : undefined}
          disabled={purchasing || loading}
          style={{
            width: '100%',
            height: '58px',
            borderRadius: '16px',
            border: 'none',
            cursor:
              rcAvailable && !purchasing ? 'pointer' : 'default',
            fontSize: '15px',
            fontWeight: '800',
            fontFamily: 'Syne, sans-serif',
            letterSpacing: '0.06em',
            color: '#000000',
            background: rcAvailable
              ? '#00E676'
              : 'rgba(255,255,255,0.08)',
            boxShadow: rcAvailable
              ? '0 0 24px rgba(0,230,118,0.35), 0 4px 16px rgba(0,0,0,0.3)'
              : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'transform 0.15s ease, opacity 0.15s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
          onTouchStart={(e) => {
            if (!rcAvailable) return;
            (e.currentTarget as HTMLButtonElement).style.transform =
              'scale(0.97)';
            (e.currentTarget as HTMLButtonElement).style.opacity =
              '0.9';
          }}
          onTouchEnd={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform =
              'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.opacity =
              '1';
          }}
        >
          {purchasing ? (
            <>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2.5px solid rgba(0,0,0,0.3)',
                  borderTop: '2.5px solid #000',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              Processing...
            </>
          ) : rcAvailable ? (
            'UNLOCK PRO'
          ) : (
            <span
              style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              Payments coming soon
            </span>
          )}
        </button>

        {/* Restore Purchases */}
        <button
          onClick={handleRestore}
          disabled={restoring}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '12px',
            color: restoring
              ? 'rgba(255,255,255,0.5)'
              : 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            padding: '4px 8px',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            fontFamily: 'inherit',
            transition: 'color 0.2s ease',
          }}
        >
          {restoring ? 'Restoring...' : 'Restore Purchases'}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Paywall;
