import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessStatsAndRoutine, shouldShowLifetimeUpsell } from '../lib/lifetimeAccess';
import { LIFETIME_PRICE_INR } from '../config/lifetimePricing';
import { isAdminHubUser } from '../config/adminOwner';
import { useAppSettings } from '../hooks/useAppSettings';
import SupportModal from './SupportModal';
import { Home, Repeat, CheckSquare, Target, Calendar, User, HelpCircle, MessageSquare, Heart, LogOut, ChevronRight } from 'lucide-react';

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

  const chevronStyle = {
    color: 'rgba(255,255,255,0.2)'
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

          {/* ── SECTION 2: NAVIGATE ── */}
          <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)', padding: '14px 16px 6px 16px', display: 'block' }}>
            NAVIGATE
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '0 16px', width: '100%', boxSizing: 'border-box', marginBottom: '4px' }}>
            {[
              { path: '/home', label: 'Home', Icon: Home },
              { path: '/routine', label: 'Habits', Icon: Repeat },
              { path: '/dashboard', label: 'Tasks', Icon: CheckSquare },
              { path: '/goals', label: 'Goals', Icon: Target },
            ].map(({ path, label, Icon }) => {
              const active = isActive(path);

              if (path === '/routine' && !isPro) {
                return (
                  <div
                    key={path}
                    onClick={() => { handleNavigate('/lifetime-access'); setIsOpen(false); }}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px',
                      padding: '16px 12px',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '8px',
                      cursor: 'pointer',
                      opacity: 0.7,
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ position: 'relative', width: 'fit-content' }}>
                      <Icon size={22} color="#EF4444" style={{ flexShrink: 0 }} />
                      <div style={{
                        position: 'absolute',
                        top: '-4px', right: '-6px',
                        width: '12px', height: '12px',
                        borderRadius: '50%',
                        background: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <rect x="3" y="11" width="18" height="11" rx="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(239,68,68,0.7)', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  </div>
                );
              }

              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => handleNavigate(path)}
                  style={{
                    background: active ? 'rgba(0,232,122,0.1)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1px solid rgba(0,232,122,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: '16px 12px',
                    minHeight: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: active ? '0 0 12px rgba(0,232,122,0.1)' : 'none',
                    textAlign: 'left',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}
                >
                  <Icon size={22} style={{ color: active ? '#00E87A' : 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: active ? '#FFFFFF' : 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── SECTION 3: ACCOUNT ── */}
          <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)', padding: '14px 16px 6px 16px', display: 'block' }}>
            ACCOUNT
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
            <button type="button" onClick={() => handleNavigate('/calendar')} style={rowStyle}>
              <Calendar size={20} style={iconStyle} />
              <span style={labelStyle}>Calendar</span>
              <ChevronRight size={16} style={chevronStyle} />
            </button>
            <button type="button" onClick={() => handleNavigate('/settings')} style={rowStyle}>
              <User size={20} style={iconStyle} />
              <span style={labelStyle}>Profile</span>
              <ChevronRight size={16} style={chevronStyle} />
            </button>
          </div>

          {/* ── SECTION 4: LIFETIME OFFER ── */}
          {upsell && (
            <div
              onClick={() => handleNavigate('/lifetime-access')}
              style={{
                margin: '8px 16px',
                background: 'linear-gradient(135deg, rgba(0,232,122,0.08), rgba(0,232,122,0.03))',
                border: '1px solid rgba(0,232,122,0.25)',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(0,232,122,0.08)'
              }}
            >
              <span style={{ fontSize: '18px', color: '#00E87A' }}>⚡</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#00E87A', display: 'block' }}>
                  Lifetime ₹{displayLifetimePrice}
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(0,232,122,0.6)', display: 'block' }}>
                  One-time · No renewals
                </span>
              </div>
              <span style={{ background: 'rgba(0,232,122,0.12)', border: '1px solid rgba(0,232,122,0.25)', borderRadius: '10px', padding: '3px 8px', fontSize: '9px', fontWeight: '800', color: '#00E87A', marginLeft: 'auto' }}>
                ONE-TIME
              </span>
            </div>
          )}

          {/* ── SECTION 5: HELP ── */}
          <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.2)', padding: '14px 16px 6px 16px', display: 'block' }}>
            HELP
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
            <button type="button" onClick={() => { handleNavigate('/welcome'); setIsOpen(false); }} style={rowStyle}>
              <HelpCircle size={20} style={iconStyle} />
              <span style={labelStyle}>Why Stay Hardy?</span>
              <ChevronRight size={16} style={chevronStyle} />
            </button>
            {!isAdmin && (
              <>
                <button type="button" onClick={() => { navigate('/feedback'); setIsOpen(false); }} style={rowStyle}>
                  <MessageSquare size={20} style={iconStyle} />
                  <span style={labelStyle}>Support &amp; Feedback</span>
                  <ChevronRight size={16} style={chevronStyle} />
                </button>
                <button type="button" onClick={() => { setShowSupportModal(true); setIsOpen(false); }} style={rowStyle}>
                  <Heart size={20} style={iconStyle} />
                  <span style={labelStyle}>Support this app</span>
                  <ChevronRight size={16} style={chevronStyle} />
                </button>
              </>
            )}
            {isAdminHubUser(user) && (
              <button type="button" onClick={() => handleNavigate('/admin')} style={rowStyle}>
                <span style={{ fontSize: '18px' }}>🛡️</span>
                <span style={labelStyle}>Admin Hub</span>
                <ChevronRight size={16} style={chevronStyle} />
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
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '14px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={15} color="rgba(239,68,68,0.6)" />
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(239,68,68,0.6)' }}>Logout</span>
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
