import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { Zap, ChevronLeft } from 'lucide-react';

const Paywall: React.FC = () => {
  const navigate = useNavigate();
  const { offerings, purchasePackage, restorePurchases, loading } = useSubscription();

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const monthlyPkg = offerings?.monthly;
  const yearlyPkg = offerings?.yearly;
  const lifetimePkg = offerings?.lifetime;
  const rcAvailable = !!(monthlyPkg || yearlyPkg || lifetimePkg);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('lifetime');

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/home');
  };

  const handlePurchase = async () => {
    const pkg =
      selectedPlan === 'lifetime' ? lifetimePkg :
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
        setMessage({ text: 'No purchases found.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Restore failed. Try again.', type: 'error' });
    } finally {
      setRestoring(false);
    }
  };

  const PLANS = [
    {
      key: 'lifetime' as const,
      pkg: lifetimePkg,
      label: '🔥 LIFETIME',
      badge: 'SAVE 50%',
      gold: true,
      strikePrice: '₹999',
      price: '₹499',
      period: 'one-time',
      hook: 'Pay once · Own forever',
      subhook: 'Cheaper than 2 yearly plans',
    },
    {
      key: 'yearly' as const,
      pkg: yearlyPkg,
      label: 'YEARLY',
      badge: 'POPULAR',
      gold: false,
      strikePrice: '₹700',
      price: '₹300',
      period: '/year',
      hook: 'Just ₹25/month',
      subhook: null,
    },
    {
      key: 'monthly' as const,
      pkg: monthlyPkg,
      label: 'MONTHLY',
      badge: '70% OFF',
      gold: false,
      strikePrice: '₹99',
      price: '₹30',
      period: '/month',
      hook: 'Cancel anytime',
      subhook: null,
    },
  ] as const;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 20px',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)',
      boxSizing: 'border-box',
    }}>

      {/* Back */}
      <button
        onClick={handleBack}
        style={{
          alignSelf: 'flex-start', width: '38px', height: '38px',
          borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginBottom: '28px', flexShrink: 0,
        }}
      >
        <ChevronLeft size={20} color="white" />
      </button>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '28px', flexShrink: 0 }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 28px rgba(0,230,118,0.2)', marginBottom: '14px',
        }}>
          <Zap size={26} color="#00E676" fill="#00E676" />
        </div>
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: '800',
          fontSize: '28px', color: '#FFFFFF', letterSpacing: '-0.5px',
          margin: '0 0 6px', lineHeight: 1.1,
        }}>
          StayHardy <span style={{ color: '#00E676' }}>PRO</span>
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Choose the plan that works for you
        </p>
      </div>

      {/* Plan Cards */}
      {rcAvailable ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
          {PLANS.map((plan) => {
            const active = selectedPlan === plan.key;
            const accentColor = plan.gold ? '#FFD700' : '#00E676';
            const displayPrice = plan.pkg?.product?.priceString ?? plan.price;

            return (
              <button
                key={plan.key}
                onClick={() => setSelectedPlan(plan.key)}
                style={{
                  width: '100%', padding: '16px 18px',
                  borderRadius: '18px',
                  border: active
                    ? `1.5px solid ${plan.gold ? 'rgba(255,215,0,0.55)' : 'rgba(0,230,118,0.5)'}`
                    : '1px solid rgba(255,255,255,0.07)',
                  background: active
                    ? plan.gold ? 'rgba(255,215,0,0.06)' : 'rgba(0,230,118,0.06)'
                    : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '14px',
                  textAlign: 'left', boxSizing: 'border-box',
                  transition: 'all 0.18s ease',
                  boxShadow: active
                    ? plan.gold ? '0 0 24px rgba(255,215,0,0.07)' : '0 0 24px rgba(0,230,118,0.06)'
                    : 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Radio dot */}
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  border: active ? `2px solid ${accentColor}` : '2px solid rgba(255,255,255,0.18)',
                  background: active ? accentColor : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s ease',
                }}>
                  {active && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#000' }} />}
                </div>

                {/* Label + hook */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: '700', letterSpacing: '0.04em',
                      color: active ? accentColor : 'rgba(255,255,255,0.55)',
                      fontFamily: 'Syne, sans-serif',
                    }}>
                      {plan.label}
                    </span>
                    <span style={{
                      fontSize: '8px', fontWeight: '800', letterSpacing: '0.08em',
                      padding: '2px 7px', borderRadius: '99px',
                      color: plan.gold ? '#FFD700' : '#00E676',
                      background: plan.gold ? 'rgba(255,215,0,0.12)' : 'rgba(0,230,118,0.12)',
                      border: `1px solid ${plan.gold ? 'rgba(255,215,0,0.2)' : 'rgba(0,230,118,0.2)'}`,
                    }}>
                      {plan.badge}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '12px', color: active ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)',
                  }}>
                    {plan.hook}
                    {plan.subhook && active && (
                      <span style={{ color: accentColor, marginLeft: '6px', fontWeight: '600' }}>
                        · {plan.subhook}
                      </span>
                    )}
                  </span>
                </div>

                {/* Price block */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: '1px' }}>
                  <span style={{
                    fontSize: '11px', color: 'rgba(255,100,100,0.7)',
                    textDecoration: 'line-through', fontWeight: '500',
                  }}>
                    {plan.strikePrice}
                  </span>
                  <span style={{
                    fontSize: '20px', fontWeight: '800',
                    color: active ? accentColor : 'rgba(255,255,255,0.65)',
                    lineHeight: 1, fontFamily: 'DM Sans, sans-serif',
                    letterSpacing: '-0.5px',
                  }}>
                    {displayPrice}
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', fontWeight: '500' }}>
                    {plan.period}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Social proof nudge */}
          <p style={{
            textAlign: 'center', fontSize: '11px',
            color: 'rgba(255,255,255,0.18)', margin: '2px 0 0', fontWeight: '500',
          }}>
            💡 Most users go Lifetime — pay once, done forever.
          </p>
        </div>
      ) : (
        /* Web / RC not loaded — show static pricing preview */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
          {[
            { label: '🔥 LIFETIME', badge: 'SAVE 50%', gold: true, strike: '₹999', price: '₹499', period: 'one-time', hook: 'Pay once · Own forever' },
            { label: 'YEARLY', badge: 'POPULAR', gold: false, strike: '₹700', price: '₹300', period: '/year', hook: 'Just ₹25/month' },
            { label: 'MONTHLY', badge: '70% OFF', gold: false, strike: '₹99', price: '₹30', period: '/month', hook: 'Cancel anytime' },
          ].map((p, i) => (
            <div key={i} style={{
              padding: '16px 18px', borderRadius: '18px',
              border: i === 0 ? '1.5px solid rgba(255,215,0,0.35)' : '1px solid rgba(255,255,255,0.07)',
              background: i === 0 ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.03)',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                border: i === 0 ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.18)',
                background: i === 0 ? '#FFD700' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {i === 0 && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#000' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: i === 0 ? '#FFD700' : 'rgba(255,255,255,0.55)', fontFamily: 'Syne,sans-serif', letterSpacing: '0.04em' }}>{p.label}</span>
                  <span style={{ fontSize: '8px', fontWeight: '800', padding: '2px 7px', borderRadius: '99px', color: p.gold ? '#FFD700' : '#00E676', background: p.gold ? 'rgba(255,215,0,0.12)' : 'rgba(0,230,118,0.12)', border: `1px solid ${p.gold ? 'rgba(255,215,0,0.2)' : 'rgba(0,230,118,0.2)'}` }}>{p.badge}</span>
                </div>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>{p.hook}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,100,100,0.7)', textDecoration: 'line-through', fontWeight: '500' }}>{p.strike}</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: i === 0 ? '#FFD700' : 'rgba(255,255,255,0.6)', lineHeight: 1, fontFamily: 'DM Sans,sans-serif', letterSpacing: '-0.5px' }}>{p.price}</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)' }}>{p.period}</span>
              </div>
            </div>
          ))}
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.18)', margin: '2px 0 0' }}>
            💡 Most users go Lifetime — pay once, done forever.
          </p>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1, minHeight: '20px' }} />

      {/* Message */}
      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px', marginBottom: '14px', flexShrink: 0,
          background: message.type === 'success' ? 'rgba(0,230,118,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(0,230,118,0.3)' : 'rgba(239,68,68,0.3)'}`,
          fontSize: '13px', fontWeight: '600', textAlign: 'center',
          color: message.type === 'success' ? '#00E676' : '#EF4444',
        }}>
          {message.text}
        </div>
      )}

      {/* CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        <button
          onClick={rcAvailable ? handlePurchase : undefined}
          disabled={purchasing || loading}
          style={{
            width: '100%', height: '56px', borderRadius: '16px', border: 'none',
            cursor: rcAvailable && !purchasing ? 'pointer' : 'default',
            fontSize: '15px', fontWeight: '800',
            fontFamily: 'Syne, sans-serif', letterSpacing: '0.06em',
            color: '#000',
            background: rcAvailable ? '#00E676' : 'rgba(255,255,255,0.07)',
            boxShadow: rcAvailable ? '0 0 28px rgba(0,230,118,0.3), 0 4px 16px rgba(0,0,0,0.3)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            transition: 'transform 0.15s ease, opacity 0.15s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
          onTouchStart={e => { if (rcAvailable) { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.opacity = '0.9'; } }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
        >
          {purchasing ? (
            <>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2.5px solid rgba(0,0,0,0.3)', borderTop: '2.5px solid #000', animation: 'spin 0.8s linear infinite' }} />
              Processing...
            </>
          ) : rcAvailable ? (
            'UNLOCK PRO'
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', fontWeight: '600' }}>
              Payments coming soon
            </span>
          )}
        </button>

        <button
          onClick={handleRestore}
          disabled={restoring}
          style={{
            background: 'none', border: 'none', fontSize: '12px',
            color: restoring ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)',
            cursor: 'pointer', padding: '4px 8px',
            textDecoration: 'underline', textUnderlineOffset: '3px',
            fontFamily: 'inherit', transition: 'color 0.2s ease',
          }}
        >
          {restoring ? 'Restoring...' : 'Restore Purchases'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Paywall;
