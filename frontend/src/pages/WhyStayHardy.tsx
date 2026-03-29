import React from 'react';
import { useNavigate } from 'react-router-dom';

const WhyStayHardy: React.FC = () => {
  const navigate = useNavigate();

  const onClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
      overflowY: 'auto',
      color: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>

      {/* HEADER — close button only */}
      <div style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingBottom: '4px',
        display: 'flex',
        justifyContent: 'flex-end',
        paddingRight: '16px',
      }}>
        <div
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="9" y2="9"/>
            <line x1="9" y1="1" x2="1" y2="9"/>
          </svg>
        </div>
      </div>

      {/* CARD 1 — WHY THIS APP */}
      <div style={{
        margin: '8px 16px 0 16px',
        background: 'linear-gradient(135deg, rgba(0,232,122,0.07) 0%, rgba(0,100,60,0.05) 100%)',
        border: '1px solid rgba(0,232,122,0.2)',
        borderRadius: '24px',
        padding: '24px 20px',
        boxShadow: '0 0 24px rgba(0,232,122,0.06)'
      }}>
        <p style={{
          fontSize: '10px',
          fontWeight: '900',
          color: '#00E87A',
          letterSpacing: '0.2em',
          margin: '0 0 14px 0',
          fontFamily: 'monospace'
        }}>WHY STAY HARDY?</p>

        <p style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 12px 0', lineHeight: 1.4, letterSpacing: '-0.2px' }}>
          Built for people who want to stay disciplined, consistent, and in control.
        </p>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0', lineHeight: 1.65 }}>
          Tracking productivity, habits, and routines shouldn't be complicated. Most apps are cluttered, overpriced, or lock your own data behind paywalls. StayHardy was built to fix exactly that.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="6" height="6" rx="1"/><rect x="3" y="13" width="6" height="6" rx="1"/>
                  <line x1="13" y1="8" x2="21" y2="8"/><line x1="13" y1="12" x2="21" y2="12"/><line x1="13" y1="16" x2="21" y2="16"/>
                </svg>
              ),
              text: 'Track tasks, goals, and daily habits — all in one place',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              ),
              text: 'Up to 1 year of productivity stats — see exactly where you\'re winning and where to focus',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><path d="M22 2l-3 3-3-3"/>
                </svg>
              ),
              text: 'Daily habit streaks with rhythm & consistency metrics',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              ),
              text: 'Your data stays yours — private, secure, and always accessible',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              ),
              text: 'Competes with premium apps. Priced only to cover maintenance — not profit',
            },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, marginTop: '1px', width: '16px', height: '16px' }}>{item.icon}</div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.5, fontWeight: '500' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CARD 2 — MEET THE CREATOR */}
      <div style={{
        margin: '12px 16px 40px 16px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '24px',
        padding: '24px 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <p style={{
          fontSize: '10px',
          fontWeight: '900',
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.2em',
          margin: '0 0 16px 0',
          fontFamily: 'monospace'
        }}>MEET THE CREATOR</p>

        {/* Profile row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flexShrink: 0 }}>
            <img
              src="/images/joe.JPG"
              alt="Joe Amuthan"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 0 0 2px #00E87A, 0 0 12px rgba(0,232,122,0.4)',
                display: 'block'
              }}
              onError={(e: any) => {
                e.target.src = 'https://ui-avatars.com/api/?name=Joe+Amuthan&background=0D0D0D&color=00E87A';
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <p style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>Joe Amuthan</p>
              {/* LinkedIn icon only */}
              <div
                onClick={() => window.open('https://linkedin.com/in/joeamuthan', '_blank')}
                style={{
                  width: '30px',
                  height: '30px',
                  background: '#0077B5',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFFFFF">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '500', margin: 0 }}>Full-Stack Developer & Product Builder</p>
          </div>
        </div>

        <p style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.7)',
          margin: 0,
          lineHeight: 1.7,
          fontWeight: '400'
        }}>
          Every feature here was built with intention — to genuinely help you show up every day.
          <br /><br />
          If it helps you win your day, I'd love to hear from you. Stay connected. Stay Hardy.
          <br /><br />
          Built for myself. First for me. Now for you.
        </p>
      </div>

    </div>
  );
};

export default WhyStayHardy;
