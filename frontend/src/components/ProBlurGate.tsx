import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';

interface ProBlurGateProps {
  children: React.ReactNode;
  featureName?: string;
}

const ProBlurGate: React.FC<ProBlurGateProps> = ({
  children,
  featureName = 'this feature',
}) => {
  const { isPro } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  // Pro/admin users — render children normally, no blur
  if (isPro || isAdmin) {
    return <>{children}</>;
  }

  // Basic users — always render children blurred
  // with upgrade overlay on top. No black flash.
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        background: '#000000',
      }}
    >
      {/* Blurred page content — always rendered immediately */}
      <div
        style={{
          filter: 'blur(5px)',
          WebkitFilter: 'blur(5px)',
          pointerEvents: 'none',
          userSelect: 'none',
          // Prevent children from causing layout shift
          // that triggers the blink
          willChange: 'filter',
          minHeight: '100vh',
        }}
      >
        {children}
      </div>

      {/* Dark overlay on top of blur for depth */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 998,
          pointerEvents: 'none',
        }}
      />

      {/* Upgrade card — fixed above bottom nav */}
      <div
        style={{
          position: 'fixed',
          bottom: '100px',
          left: '16px',
          right: '16px',
          zIndex: 999,
          background: '#0A0A0A',
          border: '1px solid rgba(0,230,118,0.3)',
          borderRadius: '20px',
          padding: '28px 20px',
          textAlign: 'center',
          boxShadow:
            '0 0 40px rgba(0,230,118,0.1), 0 20px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* Lock icon */}
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>

        {/* PRO FEATURE label */}
        <p
          style={{
            fontSize: '11px',
            fontWeight: '800',
            color: '#00E676',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            margin: '0 0 8px 0',
          }}
        >
          PRO FEATURE
        </p>

        {/* Heading */}
        <h3
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: '800',
            fontSize: '26px',
            color: '#FFFFFF',
            margin: '0 0 10px 0',
            letterSpacing: '-0.3px',
          }}
        >
          {featureName.toLowerCase().includes('habit') 
            ? '💀 Blind spots kill progress' 
            : featureName.toLowerCase().includes('stat')
            ? '📈 Are you improving?'
            : `Unlock ${featureName}`}
        </h3>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.45)',
            margin: '0 0 24px 0',
            lineHeight: '1.6',
          }}
        >
          {featureName.toLowerCase().includes('habit')
            ? 'Track your habits. Join Pro for just ₹1/day.'
            : featureName.toLowerCase().includes('stat')
            ? 'Your stats are waiting. Just ₹1/day to see the truth.'
            : `Upgrade to Stay Hardy Pro to access full ${featureName} and all elite modules.`}
        </p>

        {/* CTA — navigates to /paywall */}
        <button
          onClick={() => {
            try {
              navigate('/paywall');
            } catch (err) {
              console.warn('[ProBlurGate] navigate to paywall failed:', err);
            }
          }}
          style={{
            width: '100%',
            height: '56px',
            borderRadius: '16px',
            border: 'none',
            background: '#00E676',
            color: '#000000',
            fontFamily: 'Syne, sans-serif',
            fontWeight: '800',
            fontSize: '15px',
            cursor: 'pointer',
            letterSpacing: '0.02em',
            boxShadow: '0 0 24px rgba(0,230,118,0.4)',
            transition: 'transform 0.15s ease, opacity 0.15s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
          onTouchStart={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
          }}
          onTouchEnd={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
          }}
        >
          UNLOCK FOR ₹30/mo →
        </button>
      </div>
    </div>
  );
};

export default ProBlurGate;