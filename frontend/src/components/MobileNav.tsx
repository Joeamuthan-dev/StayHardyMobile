import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessStatsAndRoutine, shouldShowLifetimeUpsell } from '../lib/lifetimeAccess';
import { LIFETIME_PRICE_INR } from '../config/lifetimePricing';
import { isAdminHubUser } from '../config/adminOwner';
import { useAppSettings } from '../hooks/useAppSettings';
import SupportModal from './SupportModal';

import pkg from '../../package.json';

interface MobileNavProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

/* ─── Inline SVG Icons ─────────────────────────────────────── */
const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);
const IconTasks = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2"/>
    <path d="M9 9l2 2 4-4"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
    <line x1="9" y1="17" x2="13" y2="17"/>
  </svg>
);
const IconGoals = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="5"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
  </svg>
);
const IconHabits = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 109-9"/>
    <path d="M3 12V7M3 12H8"/>
    <path d="M12 7v5l3 3"/>
  </svg>
);
const IconStats = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="13" width="4" height="8" rx="1"/>
    <rect x="10" y="8" width="4" height="13" rx="1"/>
    <rect x="17" y="3" width="4" height="18" rx="1"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <rect x="7" y="14" width="3" height="3" rx="0.5" fill="currentColor" stroke="none"/>
  </svg>
);
const IconProfile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const IconHelp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M9.5 9a3 3 0 015 2c0 2-3 3-3 3"/>
    <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
  </svg>
);
const IconFeedback = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    <line x1="9" y1="9" x2="15" y2="9"/>
    <line x1="9" y1="13" x2="12" y2="13"/>
  </svg>
);
const IconSupport = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21C12 21 4 14.5 4 9a8 8 0 0116 0c0 5.5-8 12-8 12z"/>
    <circle cx="12" cy="9" r="2.5" fill="currentColor" stroke="none"/>
  </svg>
);
const IconAdmin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6l-8-4z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);
const IconLock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="11" rx="2"/>
    <path d="M8 11V7a4 4 0 018 0v4"/>
  </svg>
);
const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
const IconLogout = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
/* ─────────────────────────────────────────────────────────── */

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

  const navItems = [
    { path: '/home',      label: 'Home',   Icon: IconHome,   locked: false,    featured: false },
    { path: '/dashboard', label: 'Tasks',  Icon: IconTasks,  locked: false,    featured: false },
    { path: '/goals',     label: 'Goals',  Icon: IconGoals,  locked: false,    featured: false },
    { path: '/routine',   label: 'Habits', Icon: IconHabits, locked: !isPro,   featured: true  },
    { path: '/stats',     label: 'Stats',  Icon: IconStats,  locked: !isPro,   featured: false },
  ];

  const accountItems = [
    { path: '/calendar', label: 'Calendar', Icon: IconCalendar },
    { path: '/settings', label: 'Profile',  Icon: IconProfile },
  ];

  const drawerPanel = (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          display: isOpen ? 'block' : 'none',
        }}
      >
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => setIsOpen(false)}
        />

        {/* Drawer */}
        <aside
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onDrawerTouchStart}
          onTouchEnd={onDrawerTouchEnd}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '78vw', maxWidth: '300px', height: '100vh',
            background: 'linear-gradient(180deg, #0C1512 0%, #080D0B 100%)',
            borderRight: '1px solid rgba(0,232,122,0.08)',
            overflowX: 'hidden', overflowY: 'auto',
            zIndex: 401,
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.32s cubic-bezier(0.16,1,0.3,1)',
            display: 'flex', flexDirection: 'column',
          }}
        >

          {/* ── Header ── */}
          <div style={{
            padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 20px 20px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'linear-gradient(180deg, rgba(0,232,122,0.06) 0%, transparent 100%)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#00E87A', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                  STAY HARDY
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', marginTop: '3px', textTransform: 'uppercase' }}>
                  The 1% starts here.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  width: '32px', height: '32px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
                </svg>
              </button>
            </div>

            {/* User Card */}
            <div
              onClick={() => handleNavigate('/settings')}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '12px 14px',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(0,232,122,0.2), rgba(0,232,122,0.05))',
                border: '1.5px solid rgba(0,232,122,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden',
              }}>
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#00E87A' }}>
                    {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name ?? 'User'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  {isAdmin ? (
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#F59E0B', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '5px', padding: '1px 6px', letterSpacing: '0.08em' }}>ADMIN</span>
                  ) : isPro ? (
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#00E87A', background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.25)', borderRadius: '5px', padding: '1px 6px', letterSpacing: '0.08em' }}>PRO</span>
                  ) : (
                    <span style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>FREE</span>
                  )}
                </div>
              </div>
              <IconChevron />
            </div>
          </div>

          {/* ── Nav Items ── */}
          <div style={{ padding: '16px 12px 8px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.18)', padding: '0 6px 10px 6px', textTransform: 'uppercase' }}>
              Navigate
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {navItems.map(({ path, label, Icon, locked, featured }) => {
                const active = isActive(path);
                return (
                  <button
                    key={path}
                    type="button"
                    onClick={() => locked ? handleNavigate('/lifetime-access') : handleNavigate(path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '13px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      width: '100%', textAlign: 'left',
                      background: active
                        ? 'rgba(0,232,122,0.12)'
                        : featured
                          ? 'linear-gradient(135deg, rgba(0,232,122,0.07) 0%, rgba(0,232,122,0.02) 100%)'
                          : 'transparent',
                      border: active
                        ? '1px solid rgba(0,232,122,0.22)'
                        : featured
                          ? '1px solid rgba(0,232,122,0.14)'
                          : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      opacity: locked ? 0.55 : 1,
                      color: active ? '#00E87A' : featured ? 'rgba(0,232,122,0.6)' : 'rgba(255,255,255,0.45)',
                      position: 'relative',
                    }}
                  >
                    {active && (
                      <span style={{
                        position: 'absolute', left: 0, top: '20%', bottom: '20%',
                        width: '3px', borderRadius: '0 3px 3px 0',
                        background: '#00E87A',
                        boxShadow: '0 0 8px rgba(0,232,122,0.6)',
                      }} />
                    )}
                    <Icon />
                    <span style={{
                      flex: 1,
                      fontSize: '14px',
                      fontWeight: active || featured ? '700' : '500',
                      color: active ? '#00E87A' : featured ? 'rgba(0,232,122,0.85)' : 'rgba(255,255,255,0.65)',
                      letterSpacing: active ? '-0.1px' : '0',
                    }}>
                      {label}
                    </span>
                    {featured && !active && (
                      <span style={{ fontSize: '8px', fontWeight: '800', color: '#00E87A', background: 'rgba(0,232,122,0.12)', border: '1px solid rgba(0,232,122,0.2)', borderRadius: '5px', padding: '2px 6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Core</span>
                    )}
                    {locked && <IconLock />}
                    {active && !locked && (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00E87A', boxShadow: '0 0 6px #00E87A' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Lifetime Upsell ── */}
          {upsell && (
            <div style={{ padding: '4px 12px 8px 12px' }}>
              <div
                onClick={() => handleNavigate('/lifetime-access')}
                style={{
                  background: 'linear-gradient(135deg, rgba(0,232,122,0.1) 0%, rgba(0,232,122,0.04) 100%)',
                  border: '1px solid rgba(0,232,122,0.22)',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px',
                  background: 'rgba(0,232,122,0.12)',
                  border: '1px solid rgba(0,232,122,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#00E87A', letterSpacing: '-0.2px' }}>
                    Unlock Lifetime Pro
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    ₹{displayLifetimePrice} · No renewals ever
                  </div>
                </div>
                <IconChevron />
              </div>
            </div>
          )}

          {/* ── Account Section ── */}
          <div style={{ padding: '8px 12px 8px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.18)', padding: '8px 6px 10px 6px', textTransform: 'uppercase' }}>
              Account
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {accountItems.map(({ path, label, Icon }) => {
                const active = isActive(path);
                return (
                  <button
                    key={path}
                    type="button"
                    onClick={() => handleNavigate(path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '13px',
                      padding: '11px 14px', borderRadius: '12px',
                      width: '100%', textAlign: 'left',
                      background: active ? 'rgba(0,232,122,0.1)' : 'transparent',
                      border: active ? '1px solid rgba(0,232,122,0.18)' : '1px solid transparent',
                      cursor: 'pointer', transition: 'all 0.18s ease',
                      color: active ? '#00E87A' : 'rgba(255,255,255,0.45)',
                    }}
                  >
                    <Icon />
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: active ? '700' : '500', color: active ? '#00E87A' : 'rgba(255,255,255,0.65)' }}>
                      {label}
                    </span>
                    <IconChevron />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Support Section ── */}
          <div style={{ padding: '0 12px 8px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.18)', padding: '8px 6px 10px 6px', textTransform: 'uppercase' }}>
              Support
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <button type="button" onClick={() => { handleNavigate('/welcome'); setIsOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '11px 14px', borderRadius: '12px', width: '100%', textAlign: 'left', background: 'transparent', border: '1px solid transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.45)' }}
              >
                <IconHelp />
                <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: 'rgba(255,255,255,0.65)' }}>Expert Intelligence</span>
              </button>

              {!isAdmin && (
                <>
                  <button type="button" onClick={() => { navigate('/feedback'); setIsOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '11px 14px', borderRadius: '12px', width: '100%', textAlign: 'left', background: 'transparent', border: '1px solid transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.45)' }}
                  >
                    <IconFeedback />
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: 'rgba(255,255,255,0.65)' }}>Global Feedback</span>
                  </button>
                  <button type="button" onClick={() => { setShowSupportModal(true); setIsOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '11px 14px', borderRadius: '12px', width: '100%', textAlign: 'left', background: 'transparent', border: '1px solid transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.45)' }}
                  >
                    <IconSupport />
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: 'rgba(255,255,255,0.65)' }}>Back the Mission</span>
                  </button>
                </>
              )}

              {isAdminHubUser(user) && (
                <button type="button" onClick={() => handleNavigate('/admin')}
                  style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '11px 14px', borderRadius: '12px', width: '100%', textAlign: 'left', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', cursor: 'pointer', color: '#F59E0B' }}
                >
                  <IconAdmin />
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: '700', color: '#F59E0B' }}>Admin Hub</span>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: '#F59E0B', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '5px', padding: '2px 6px', letterSpacing: '0.08em' }}>ADMIN</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Footer / Logout ── */}
          <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.12)' }}>StayHardy v{pkg.version} · Made with ♥ in India</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await new Promise(r => setTimeout(r, 350));
                logout();
              }}
              style={{
                width: '100%',
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'rgba(239,68,68,0.7)',
              }}
            >
              <IconLogout />
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(239,68,68,0.7)' }}>Sign Out</span>
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
