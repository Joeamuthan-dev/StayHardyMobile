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
        {/* Change 1: Lock icon SVG replacement */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'rgba(0,230,118,0.1)',
          border: '1px solid rgba(0,230,118,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px auto',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24"
            fill="none" stroke="#00E676" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11"
              rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        {/* Change 2: PRO FEATURE label typography */}
        <p
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '11px',
            fontWeight: '700',
            color: '#00E676',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            margin: '0 0 10px 0',
          }}
        >
          PRO FEATURE
        </p>

        {/* Change 3: Main heading typography + Emoji removal */}
        <h3
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: '800',
            fontSize: '24px',
            color: '#FFFFFF',
            letterSpacing: '-0.3px',
            lineHeight: '1.25',
            margin: '0 0 10px 0',
            textAlign: 'center',
          }}
        >
          Unlock {featureName}
        </h3>

        {/* Change 4: Subtitle typography + Clean text */}
        <p
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
            fontWeight: '400',
            color: 'rgba(255,255,255,0.5)',
            lineHeight: '1.6',
            margin: '0 0 22px 0',
            textAlign: 'center',
          }}
        >
          Upgrade to Stay Hardy Pro to access full {featureName} and all elite modules.
        </p>

        {/* Change 5: CTA Button typography and updated text */}
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
            cursor: 'pointer',
            boxShadow: '0 0 24px rgba(0,230,118,0.4)',
            transition: 'transform 0.15s ease, opacity 0.15s ease',
            WebkitTapHighlightColor: 'transparent',
            // Updated typography
            fontFamily: 'Syne, sans-serif',
            fontWeight: '800',
            fontSize: '14px',
            letterSpacing: '0.06em',
            color: '#000000',
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
          The 1% starts here ⚡
        </button>
      </div>
    </div>
  );
};

export default ProBlurGate;