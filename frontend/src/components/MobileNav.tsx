import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessStatsAndRoutine, shouldShowLifetimeUpsell } from '../lib/lifetimeAccess';
import { LIFETIME_PRICE_INR } from '../config/lifetimePricing';
import { isAdminHubUser } from '../config/adminOwner';
import { useAppSettings } from '../hooks/useAppSettings';
import SupportModal from './SupportModal';
import { Home, Repeat, CheckSquare, Target, BarChart2, Calendar, User, HelpCircle, MessageSquare, Heart, LogOut, ChevronRight, Lock } from 'lucide-react';

import pkg from '../../package.json';

interface MobileNavProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}



const MobileNav: React.FC<MobileNavProps> = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { settings: appSettings } = useAppSettings();
  const displayLifetimePrice = React.useMemo(() => {
    const p = appSettings.pro_price;
    return Number.isFinite(p) && p > 0 ? p : LIFETIME_PRICE_INR;
  }, [appSettings.pro_price]);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const isActive = (path: string) => location.pathname === path;

  const premium = canAccessStatsAndRoutine(user);
  const upsell = shouldShowLifetimeUpsell(user);
  const isAdmin = user?.email === 'joe@gmail.com' || user?.role === 'admin';
  const isPro = premium;

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('mobile-drawer-open');
    } else {
      document.body.classList.remove('mobile-drawer-open');
    }
    return () => document.body.classList.remove('mobile-drawer-open');
  }, [isOpen]);

  const onDrawerTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const onDrawerTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current == null) return;
      const endX = e.changedTouches[0].clientX;
      const dx = endX - touchStartX.current;
      touchStartX.current = null;
      if (dx < -60) setIsOpen(false);
    },
    [setIsOpen],
  );

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '13px 16px',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    textAlign: 'left' as const,
    width: '100%',
    boxSizing: 'border-box' as const
  };

  const iconStyle = {
    color: 'rgba(255,255,255,0.45)'
  };

  const labelStyle = {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)'
  };

  const drawerPanel = (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 400,
          display: isOpen ? 'block' : 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
          }}
          onClick={() => setIsOpen(false)}
        />
        <aside
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '78vw',
            maxWidth: '300px',
            height: '100vh',
            background: '#0D1210',
            overflowX: 'hidden',
            overflowY: 'auto',
            paddingBottom: '32px',
            zIndex: 401,
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
          }}
          onTouchStart={onDrawerTouchStart}
          onTouchEnd={onDrawerTouchEnd}
        >
          {/* ── SECTION 1: Branding Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '56px 16px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#00E87A', letterSpacing: '-0.5px', display: 'block', marginBottom: '4px' }}>
                StayHardy
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                The 1% starts here.
              </span>
            </div>

            <div
              onClick={() => setIsOpen(false)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="13" y2="13"/>
                <line x1="13" y1="1" x2="1" y2="13"/>
              </svg>
            </div>
          </div>

          {/* ── SECTION 2: NAVIGATE (The Command List) ── */}
          <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)', padding: '24px 16px 8px 20px', display: 'block', textTransform: 'uppercase' }}>
            COMMAND CENTER
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
            {[
              { path: '/home', label: 'Home', Icon: Home },
              { path: '/dashboard', label: 'Tasks', Icon: CheckSquare },
              { path: '/goals', label: 'Goals', Icon: Target },
              { path: '/routine', label: 'Habits', Icon: Repeat, locked: !isPro },
              { path: '/stats', label: 'Stats', Icon: BarChart2, locked: !isPro },
            ].map(({ path, label, Icon, locked }) => {
              const active = isActive(path);

              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => {
                    if (locked) {
                      handleNavigate('/lifetime-access');
                    } else {
                      handleNavigate(path);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    width: '100%',
                    background: active ? 'rgba(0, 230, 118, 0.1)' : 'transparent',
                    borderLeft: active ? '2.5px solid #00E676' : '2.5px solid transparent',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    textAlign: 'left',
                    opacity: locked ? 0.5 : 1
                  }}
                >
                  <Icon 
                    size={20} 
                    style={{ 
                      color: active ? '#00E676' : 'rgba(255,255,255,0.4)',
                      filter: active ? 'drop-shadow(0 0 5px rgba(0, 230, 118, 0.3))' : 'none'
                    }} 
                  />
                  <span style={{ 
                    fontSize: '15px', 
                    fontWeight: active ? '700' : '500', 
                    color: active ? '#00E676' : 'rgba(255,255,255,0.6)',
                    flex: 1
                  }}>
                    {label}
                  </span>
                  {locked && (
                    <Lock size={14} color="#FFD700" style={{ opacity: 0.8 }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── SECTION 3: LIFETIME OFFER (The Funnel) ── */}
          {upsell && (
            <div
              onClick={() => handleNavigate('/lifetime-access')}
              style={{
                margin: '20px 16px 8px 16px',
                background: 'linear-gradient(135deg, rgba(0,230,118,0.08), rgba(0,230,118,0.02))',
                border: '1px solid rgba(0,230,118,0.25)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 0 20px rgba(0,230,118,0.05)',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0,230,118,0.4)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(0,230,118,0.25)'}
            >
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '10px', 
                background: 'rgba(0,230,118,0.15)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0 
              }}>
                <span style={{ fontSize: '18px', color: '#00E676' }}>⚡</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: '900', color: '#00E676', display: 'block', letterSpacing: '-0.2px' }}>
                  Lifetime ₹{displayLifetimePrice}
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', fontWeight: '500' }}>
                  Elite Access · No renewals
                </span>
              </div>
              <ChevronRight size={16} color="rgba(0,230,118,0.4)" />
            </div>
          )}

          {/* ── SECTION 4: ACCOUNT ── */}
          <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)', padding: '24px 16px 8px 20px', display: 'block', textTransform: 'uppercase' }}>
            ACCOUNT
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px' }}>
            {[
              { path: '/calendar', label: 'Calendar', Icon: Calendar },
              { path: '/settings', label: 'Profile', Icon: User },
            ].map(({ path, label, Icon }) => (
              <button 
                key={path}
                type="button" 
                onClick={() => handleNavigate(path)} 
                style={{
                  ...rowStyle,
                  padding: '12px 16px',
                  borderRadius: '12px',
                }}
              >
                <Icon size={18} style={{ color: isActive(path) ? '#00E676' : 'rgba(255,255,255,0.4)' }} />
                <span style={{ ...labelStyle, fontSize: '14px', color: isActive(path) ? '#FFFFFF' : 'rgba(255,255,255,0.6)' }}>{label}</span>
                <ChevronRight size={14} style={{ opacity: 0.2 }} />
              </button>
            ))}
          </div>

          {/* ── SECTION 5: HELP ── */}
          <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)', padding: '24px 16px 8px 20px', display: 'block', textTransform: 'uppercase' }}>
            SUPPORT
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px' }}>
            <button type="button" onClick={() => { handleNavigate('/welcome'); setIsOpen(false); }} style={rowStyle}>
              <HelpCircle size={18} style={iconStyle} />
              <span style={{ ...labelStyle, fontSize: '14px' }}>Expert Intelligence</span>
            </button>
            {!isAdmin && (
              <>
                <button type="button" onClick={() => { navigate('/feedback'); setIsOpen(false); }} style={rowStyle}>
                  <MessageSquare size={18} style={iconStyle} />
                  <span style={{ ...labelStyle, fontSize: '14px' }}>Global Feedback</span>
                </button>
                <button type="button" onClick={() => { setShowSupportModal(true); setIsOpen(false); }} style={rowStyle}>
                  <Heart size={18} style={iconStyle} />
                  <span style={{ ...labelStyle, fontSize: '14px' }}>Back the Mission</span>
                </button>
              </>
            )}
            {isAdminHubUser(user) && (
              <button type="button" onClick={() => handleNavigate('/admin')} style={rowStyle}>
                <span style={{ fontSize: '20px' }}>🛡️</span>
                <span style={{ ...labelStyle, fontSize: '14px' }}>Admin Protocol</span>
              </button>
            )}
          </div>

          {/* ── SECTION 6: FOOTER ── */}
          <div style={{ marginTop: 'auto', padding: '16px 16px 32px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', textAlign: 'center', display: 'block', marginBottom: '4px' }}>
              StayHardy v{pkg.version}
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', textAlign: 'center', display: 'block', marginBottom: '14px' }}>
              Made with ❤️ in India
            </span>
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await new Promise(r => setTimeout(r, 350));
                logout();
              }}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={16} color="rgba(239,68,68,0.7)" />
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(239,68,68,0.7)' }}>Terminate Session</span>
            </button>
          </div>
        </aside>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        className={`mn-burger ${isOpen ? 'mn-burger--open' : ''}`}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="mn-burger-flash" aria-hidden />
        <span className="mn-bar mn-bar--top" />
        <span className="mn-bar mn-bar--mid" />
        <span className="mn-bar mn-bar--bot" />
      </button>

      {createPortal(drawerPanel, document.body)}

      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />

    </>
  );
};

export default MobileNav;
