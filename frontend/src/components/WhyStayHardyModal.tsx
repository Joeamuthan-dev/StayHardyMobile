import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';


interface WhyStayHardyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstTime?: boolean;
  /** Opens the existing Support modal / flow (wired in BottomNav & HomeDashboard). */
  onOpenSupport?: () => void;
}

/** Env override optional default below. Use `#` or empty to disable. */
const DEFAULT_DEV_AVATAR =
  'https://tiavhmbpplerffdjmodw.supabase.co/storage/v1/object/public/avatars/B7DB02BF-B1EE-4934-A5C0-6F45F22D9F70.JPG';
const DEV_AVATAR_SRC =
  (import.meta.env.VITE_DEV_AVATAR_URL as string | undefined)?.trim() || DEFAULT_DEV_AVATAR;



const WhyStayHardyModal: React.FC<WhyStayHardyModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [devAvatarFailed, setDevAvatarFailed] = useState(false);



  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setDevAvatarFailed(false);
  }, [isOpen]);

  const handleDismiss = () => {
    onClose();
  };



  if (!shouldRender) return null;

  const showPhoto = Boolean(DEV_AVATAR_SRC) && !devAvatarFailed;

  return (
    <div
      className={`why-modal-overlay ${isOpen ? 'open' : ''}`}
      onClick={handleDismiss}
      style={{
        transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.45s',
      }}
    >
      <div
        className="why-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#080C0A',
          width: '100%',
          maxWidth: '500px',
          height: '100%',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 0,
        }}
      >
        <style>{`
          @keyframes borderGlow {
            0%,100% { box-shadow: 0 0 12px rgba(0,232,122,0.2), inset 0 0 12px rgba(0,232,122,0.05); }
            50% { box-shadow: 0 0 24px rgba(0,232,122,0.4), inset 0 0 20px rgba(0,232,122,0.08); }
          }
          @keyframes dataStream {
            0% { transform: translateY(0) }
            100% { transform: translateY(-50%) }
          }
          @keyframes swipeHint {
            0%,100% { transform: translateX(0) }
            50% { transform: translateX(8px) }
          }
          @keyframes pulseGeometric {
            0%,100% { opacity: 0.3 }
            50% { opacity: 0.6 }
          }
        `}</style>

        {/* Outer scrolling container */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px', position: 'relative' }}>
          
          {/* Close button */}
          <div style={{ position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }} onClick={handleDismiss}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13"/>
              <line x1="13" y1="1" x2="1" y2="13"/>
            </svg>
          </div>

          <div style={{ padding: '48px 24px 32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {/* App icon */}
            <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, #0d2018, #1a3d28)', border: '1.5px solid rgba(0,232,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 0 24px rgba(0,232,122,0.2)', animation: 'borderGlow 3s ease-in-out infinite' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '0.1em', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              STAY HARDY
            </h1>

            <p style={{ fontSize: '14px', color: '#00E87A', fontWeight: '500', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
              The 1% starts here.
            </p>
          </div>

          {/* SECTION 2 — WHAT YOU GET */}
          <div style={{ padding: '0 16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textAlign: 'center', marginBottom: '14px' }}>
              WHAT YOU GET
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              {/* Tasks card */}
              <div style={{ background: 'rgba(0,232,122,0.04)', border: '1px solid rgba(0,232,122,0.2)', borderRadius: '20px', padding: '16px', position: 'relative', overflow: 'hidden', animation: 'borderGlow 4s ease-in-out infinite' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '200%', background: 'repeating-linear-gradient(transparent, transparent 8px, rgba(0,232,122,0.03) 8px, rgba(0,232,122,0.03) 9px)', animation: 'dataStream 4s linear infinite', pointerEvents: 'none' }}/>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                </div>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>Tasks</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>Define, track, and master every project.</p>
              </div>

              {/* Goals card */}
              <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '20px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                  </svg>
                </div>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>Goals</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>Chart your long-term success with clear milestones.</p>
              </div>

              {/* Habits card */}
              <div style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '20px', padding: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                  </svg>
                </div>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>Habits</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>Build unbreakable daily routines that compound.</p>
              </div>

              {/* Stats card */}
              <div style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '20px', padding: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>Stats</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>See your grind pay off with deep insights.</p>
              </div>
            </div>
          </div>

          {/* SECTION 4 — DEVELOPER CARD */}
          <div style={{ margin: '0 16px 24px 16px', background: '#111814', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '24px', padding: '20px' }}>
            <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', margin: '0 0 16px 0' }}>BEHIND THE APP</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid rgba(0,232,122,0.3)', overflow: 'hidden', flexShrink: 0, background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                {showPhoto ? <img src={DEV_AVATAR_SRC} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setDevAvatarFailed(true)} /> : '👨💻'}
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 3px 0' }}>Joe Amuthan</p>
                <p style={{ fontSize: '11px', color: '#00E87A', fontWeight: '600', margin: 0 }}>Founder & Lead Architect</p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 16px 0' }}>
              Building the tools I always wanted for myself, one line of code at a time. This app is born from a desire to make productivity truly impactful and accessible. <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>Stay focused, stay hardy.</span>
            </p>
            <div
              onClick={() => window.open('https://linkedin.com/in/joeamuthan', '_blank')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(0,119,181,0.12)',
                border: '1px solid rgba(0,119,181,0.3)',
                borderRadius: '12px',
                padding: '10px 18px',
                cursor: 'pointer',
                marginTop: '12px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0077B5" style={{ flexShrink: 0 }}>
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
                <circle cx="4" cy="4" r="2" fill="#0077B5"/>
              </svg>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#0077B5', lineHeight: 1 }}>
                Connect on LinkedIn
              </span>
            </div>
          </div>

          {/* SECTION 5 — CTA BUTTON */}
          <div style={{ padding: '0 16px' }}>
            <button onClick={() => { navigate('/home'); onClose(); }} style={{ width: '100%', height: '58px', background: '#00E87A', border: 'none', borderRadius: '18px', fontSize: '16px', fontWeight: '900', color: '#000000', cursor: 'pointer', letterSpacing: '0.06em', boxShadow: '0 0 28px rgba(0,232,122,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
              LET'S GET STARTED
              <span style={{ animation: 'swipeHint 1.5s ease-in-out infinite', display: 'inline-block' }}>→</span>
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {['No Subscription', 'Zero Ads', 'Private & Secure'].map(p => (
                <span key={p} style={{ background: 'rgba(0,232,122,0.08)', border: '1px solid rgba(0,232,122,0.2)', borderRadius: '20px', padding: '4px 12px', fontSize: '10px', fontWeight: '700', color: '#00E87A', letterSpacing: '0.06em' }}>
                  ✦ {p}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );

};

export default WhyStayHardyModal;
