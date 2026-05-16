import React from 'react';

interface Props {
  phase: 'idle' | 'loading' | 'success';
}

const LoginLoadingScreen: React.FC<Props> = ({ phase }) => {
  if (phase === 'idle') return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#080A08',
    }}>
      {phase === 'loading' ? (
        <>
          <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '28px' }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '3px solid rgba(0,232,122,0.12)',
              borderTop: '3px solid #00E87A',
              animation: 'llSpin 0.9s linear infinite',
            }} />
            <div style={{
              position: 'absolute', inset: '13px', borderRadius: '50%',
              border: '2px solid rgba(0,232,122,0.06)',
              borderBottom: '2px solid rgba(0,229,204,0.4)',
              animation: 'llSpin 1.5s linear infinite reverse',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px',
              animation: 'llPulse 1.6s ease-in-out infinite',
            }}>
              ⚡
            </div>
          </div>
          <p style={{
            margin: 0, fontSize: '18px', fontWeight: '800',
            color: '#FFFFFF', letterSpacing: '0.02em',
          }}>
            Loading your arena...
          </p>
          <p style={{
            margin: '8px 0 0 0', fontSize: '13px', fontWeight: '500',
            color: 'rgba(255,255,255,0.35)',
          }}>
            Setting up your dashboard
          </p>
        </>
      ) : (
        <>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(0,232,122,0.12)',
            border: '2px solid rgba(0,232,122,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '28px',
            animation: 'llBounce 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: '0 0 32px rgba(0,232,122,0.25)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
              stroke="#00E87A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p style={{
            margin: 0, fontSize: '20px', fontWeight: '900',
            color: '#FFFFFF', letterSpacing: '-0.2px',
          }}>
            Welcome back!
          </p>
          <p style={{
            margin: '8px 0 0 0', fontSize: '14px', fontWeight: '600',
            color: '#00E87A',
          }}>
            Time to get to work 💪
          </p>
        </>
      )}

      <style>{`
        @keyframes llSpin { to { transform: rotate(360deg); } }
        @keyframes llPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.6; transform:scale(0.85); }
        }
        @keyframes llBounce {
          from { opacity:0; transform:scale(0.5); }
          to   { opacity:1; transform:scale(1); }
        }
      `}</style>
    </div>
  );
};

export default LoginLoadingScreen;
