// src/pages/ComingSoon.tsx
import React, { useEffect, useState } from 'react';

const ComingSoon: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dots, setDots] = useState('');

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #0d0d0d 50%, #001a0d 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#ffffff',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(0,232,122,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Top badge */}
      <div style={{
        background: 'rgba(0,232,122,0.12)',
        border: '1px solid rgba(0,232,122,0.3)',
        borderRadius: '100px',
        padding: '6px 16px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#00E87A',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '32px',
      }}>
        Android App — Coming Soon{dots}
      </div>

      {/* Logo + Brand */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #00E87A, #00b85e)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 0 40px rgba(0,232,122,0.35)',
          fontSize: '32px',
        }}>
          💪
        </div>
        <h1 style={{
          fontSize: 'clamp(36px, 8vw, 64px)',
          fontWeight: 800,
          margin: 0,
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          StayHardy
        </h1>
      </div>

      {/* Tagline */}
      <p style={{
        fontSize: 'clamp(16px, 3vw, 22px)',
        color: 'rgba(255,255,255,0.55)',
        textAlign: 'center',
        maxWidth: '480px',
        lineHeight: 1.6,
        margin: '0 0 48px',
      }}>
        Build powerful habits, crush your goals, and track your productivity — all in one place.
      </p>

      {/* Feature pills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        justifyContent: 'center',
        marginBottom: '48px',
        maxWidth: '480px',
      }}>
        {['Daily Habits', 'Goal Tracking', 'Productivity Score', 'Leaderboard', 'Smart Planner'].map(f => (
          <span key={f} style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '100px',
            padding: '6px 14px',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.7)',
          }}>
            {f}
          </span>
        ))}
      </div>

      {/* Email notify form */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        marginBottom: '48px',
      }}>
        {!submitted ? (
          <>
            <p style={{
              textAlign: 'center',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: '14px',
            }}>
              Get notified when we launch
            </p>
            <form onSubmit={handleNotify} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#ffffff',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button type="submit" style={{
                background: 'linear-gradient(135deg, #00E87A, #00b85e)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#000',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}>
                Notify Me
              </button>
            </form>
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            background: 'rgba(0,232,122,0.1)',
            border: '1px solid rgba(0,232,122,0.25)',
            borderRadius: '14px',
            padding: '16px',
            color: '#00E87A',
            fontSize: '14px',
            fontWeight: 600,
          }}>
            ✓ You're on the list! We'll notify you at launch.
          </div>
        )}
      </div>

      {/* Android coming soon card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        maxWidth: '360px',
        width: '100%',
        marginBottom: '48px',
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'rgba(0,232,122,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          flexShrink: 0,
        }}>
          🤖
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '3px' }}>
            Android App
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
            Launching on Google Play Store soon
          </div>
        </div>
        <div style={{
          marginLeft: 'auto',
          background: 'rgba(0,232,122,0.15)',
          color: '#00E87A',
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '100px',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          SOON
        </div>
      </div>

      {/* Footer */}
      <p style={{
        fontSize: '13px',
        color: 'rgba(255,255,255,0.25)',
        textAlign: 'center',
      }}>
        © {new Date().getFullYear()} StayHardy. Built for warriors who never quit.
      </p>
    </div>
  );
};

export default ComingSoon;
