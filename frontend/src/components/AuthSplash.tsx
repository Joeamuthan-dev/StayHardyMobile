import React from 'react';

/** Full-screen boot / session restore — matches protected-route loading so there is no login ↔ home flicker. */
const AuthSplash: React.FC = () => (
  <div
    style={{
      height: '100dvh',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#020617',
      flexDirection: 'column',
      gap: '1rem',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      boxSizing: 'border-box',
    }}
  >
    <div
      className="auth-splash-spinner"
      style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(16, 185, 129, 0.1)',
        borderTopColor: '#10b981',
        borderRadius: '50%',
        animation: 'auth-splash-spin 0.9s linear infinite',
      }}
    />
    <div
      style={{
        color: '#10b981',
        fontWeight: 900,
        fontSize: '0.9rem',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
      }}
    >
      StayHard — Grinding…
    </div>
    <style>{`@keyframes auth-splash-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default AuthSplash;
