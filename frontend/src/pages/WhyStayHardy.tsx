import React from 'react';
import { useNavigate } from 'react-router-dom';

const WhyStayHardy: React.FC = () => {
  const navigate = useNavigate();

  const onClose = () => {
    // Navigate home if possible, or just back
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  const onLetsGo = () => {
    navigate('/home');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      overflowX: 'hidden',
      overflowY: 'auto',
      scrollBehavior: 'smooth',
      color: '#FFFFFF',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center }
          100% { background-position: 200% center }
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.7 }
          50% { opacity: 1 }
        }
        @keyframes borderGlow {
          0%,100% {
            box-shadow: 0 0 8px rgba(0,232,122,0.2);
          }
          50% {
            box-shadow: 0 0 16px rgba(0,232,122,0.4);
          }
        }
      `}</style>

      {/* SECTION 1 — HEADER BRANDING */}
      <div style={{
        paddingTop: '52px',
        paddingBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
      }}>

        {/* Close button */}
        <div
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '52px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="9" y2="9"/>
            <line x1="9" y1="1" x2="1" y2="9"/>
          </svg>
        </div>

        {/* Brand name */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: '900',
          color: '#FFFFFF',
          margin: 0,
          letterSpacing: '-0.5px',
          textAlign: 'center'
        }}>
          Stay Hardy
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: '13px',
          color: '#00E87A',
          margin: 0,
          fontWeight: '500',
          textAlign: 'center',
          letterSpacing: '0.02em'
        }}>
          The 1% starts here.
        </p>
      </div>

      {/* SECTION 2 — 2x2 BENTO GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        padding: '0 16px',
        flex: '0 0 auto'
      }}>
        {[
          {
            title: 'Tasks',
            desc: 'Master every project.',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            ),
            color: '#00E87A',
            glow: 'rgba(0,232,122,0.3)',
            bg: 'rgba(0,232,122,0.05)'
          },
          {
            title: 'Goals',
            desc: 'Clear milestones.',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
            ),
            color: '#818CF8',
            glow: 'rgba(129,140,248,0.3)',
            bg: 'rgba(129,140,248,0.05)'
          },
          {
            title: 'Habits',
            desc: 'Build daily streaks.',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round">
                <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            ),
            color: '#F97316',
            glow: 'rgba(249,115,22,0.3)',
            bg: 'rgba(249,115,22,0.05)'
          },
          {
            title: 'Stats',
            desc: 'See your grind pay off.',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            ),
            color: '#06B6D4',
            glow: 'rgba(6,182,212,0.3)',
            bg: 'rgba(6,182,212,0.05)'
          }
        ].map((feature, i) => (
          <div key={i} style={{
            background: feature.bg,
            border: `1px solid ${feature.color}`,
            borderRadius: '16px',
            padding: '14px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: `0 0 12px ${feature.glow}, inset 0 0 12px ${feature.bg}`,
            animation: 'borderGlow 3s ease-in-out infinite'
          }}>
            {/* Icon box */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: `rgba(${feature.color.replace('#','').match(/.{2}/g)?.map(h => parseInt(h,16)).join(',')},0.12)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {feature.icon}
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 2px 0' }}>{feature.title}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.3 }}>{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 3 — MEET THE CREATOR */}
      <div style={{
        margin: '10px 16px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '24px',
        padding: '24px 20px',
        flex: '0 0 auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        {/* LABEL */}
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
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img 
              src="/images/joe.JPG" 
              alt="Joe Amuthan"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 0 0 2px #00E87A, 0 0 12px #00E87A60',
                display: 'block'
              }}
              onError={(e: any) => {
                e.target.src = 'https://ui-avatars.com/api/?name=Joe+Amuthan&background=0D0D0D&color=00E87A';
              }}
            />
          </div>

          {/* Name + LinkedIn */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
              <p style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>Joe Amuthan</p>
              <div
                onClick={() => window.open('https://linkedin.com/in/joeamuthan', '_blank')}
                style={{
                  background: 'rgba(0,119,181,0.15)',
                  border: '1px solid rgba(0,119,181,0.3)',
                  borderRadius: '12px',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#0077B5">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>
                </svg>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '0.05em' }}>STAY CONNECTED</span>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '500', margin: 0 }}>Full-Stack Developer & Product Builder</p>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <p style={{ 
            fontSize: '13px', 
            color: 'rgba(255,255,255,0.7)', 
            margin: '0 0 16px 0', 
            lineHeight: 1.6,
            fontWeight: '400'
          }}>
            I spent years searching for a productivity app that actually tracked habits, tasks, and goals — without charging me every month for it.
            <br /><br />
            Everything good was behind a subscription wall.
            <br /><br />
            So I built StayHardy myself. First for me. Now for you. 
            <br /><br />
            This is the app I always wanted — distraction-free, private, and yours to own forever. No subscription. No compromise.
            <br /><br />
            If it helps you win your day, I'd love to hear from you. Stay connected.
          </p>
        </div>

        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />

        <p style={{ 
          fontSize: '11px', 
          color: '#00E87A', 
          margin: 0, 
          fontStyle: 'italic', 
          textAlign: 'center', 
          fontWeight: '600',
          letterSpacing: '0.02em'
        }}>
          "Built with grit. Owned forever. The 1% starts here."
        </p>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }}/>

      {/* SECTION 4 — FIXED BOTTOM ACTION BAR */}
      <div style={{
        padding: '0 16px 36px 16px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.95) 30%)',
      }}>
        {/* Trust pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px', flexWrap: 'nowrap' }}>
          {['✦ No Subscription', '✦ Zero Ads', '✦ Private & Secure'].map((pill, i) => (
            <span key={i} style={{
              background: 'rgba(0,232,122,0.07)',
              border: '1px solid rgba(0,232,122,0.2)',
              borderRadius: '20px',
              padding: '4px 10px',
              fontSize: '9px',
              fontWeight: '700',
              color: '#00E87A',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap'
            }}>{pill}</span>
          ))}
        </div>

        {/* Shimmer CTA button */}
        <button
          onClick={onLetsGo}
          style={{
            width: '100%',
            height: '56px',
            borderRadius: '18px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '900',
            color: '#000000',
            letterSpacing: '0.06em',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(90deg, #00E87A 0%, #00FF88 40%, #00E87A 60%, #00C563 100%)',
            backgroundSize: '200% auto',
            animation: 'shimmer 2.5s linear infinite',
            boxShadow: '0 0 24px rgba(0,232,122,0.4)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>LET'S GET STARTED</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </div>
        </button>
      </div>

    </div>
  );
};

export default WhyStayHardy;
