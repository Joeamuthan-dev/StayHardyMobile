import React, { useState, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { canAccessStatsAndRoutine, shouldShowLifetimeUpsell } from '../lib/lifetimeAccess';
import { LIFETIME_PRICE_INR } from '../config/lifetimePricing';
import { isAdminHubUser } from '../config/adminOwner';
import { useAppSettings } from '../hooks/useAppSettings';

import SupportModal from './SupportModal';
import WhyStayHardyModal from './WhyStayHardyModal';

const useLongPress = (
  onLongPress: () => void,
  onShortPress: () => void,
  onStart: () => void,
  onStop: () => void,
  delay: number = 500
) => {
  const timerRef = useRef<any>(null);
  const isLongPress = useRef(false);

  const start = () => {
    isLongPress.current = false;
    onStart();
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
      onStop();
    }, delay);
  };

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onStop();
    if (!isLongPress.current) onShortPress();
  };

  return {
    onTouchStart: start,
    onMouseDown: start,
    onTouchEnd: stop,
    onMouseUp: stop,
    onTouchMove: () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      onStop();
    }
  };
};

const BottomNav: React.FC<{
  isHidden?: boolean;
  hideFloatingShelf?: boolean;
  hideMobileNavChrome?: boolean;
}> = ({ isHidden, hideFloatingShelf, hideMobileNavChrome }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { logout, user } = useAuth();
  const isPro = user?.isPro === true || user?.role === 'admin';
  const { settings: appSettings } = useAppSettings();
  const displayLifetimePrice = React.useMemo(() => {
    const p = appSettings.pro_price;
    return Number.isFinite(p) && p > 0 ? p : LIFETIME_PRICE_INR;
  }, [appSettings.pro_price]);
  const [isIntroOpen, setIsIntroOpen] = React.useState(false);
  const [showSupportModal, setShowSupportModal] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const [fabState, setFabState] = useState<'idle' | 'pressing' | 'longpress'>('idle');
  const [pressProgress, setPressProgress] = useState(0);
  const progressInterval = useRef<any>(null);

  const shortPressVibrate = async () => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (e) {}
  };

  const longPressVibrate = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      setTimeout(async () => { await Haptics.impact({ style: ImpactStyle.Medium }); }, 100);
    } catch (e) {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  };

  const startPressProgress = () => {
    setPressProgress(0);
    const startTime = Date.now();
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / 500) * 100);
      setPressProgress(progress);
      if (progress >= 100) clearInterval(progressInterval.current);
    }, 16);
  };

  const stopPressProgress = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    setPressProgress(0);
  };

  const handleLongPress = async () => {
    setFabState('longpress');
    await longPressVibrate();
    setTimeout(() => {
      setFabState('idle');
      navigate('/home');
    }, 400);
  };

  const handleShortPress = async () => {
    setFabState('pressing');
    await shortPressVibrate();
    setTimeout(() => setFabState('idle'), 200);

    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/dashboard') window.dispatchEvent(new CustomEvent('open-create-task'));
    else if (path === '/goals') window.dispatchEvent(new CustomEvent('open-create-goal'));
    else if (path === '/routine') window.dispatchEvent(new CustomEvent('open-create-routine'));
    else navigate('/home');
  };

  const longPressHandlers = useLongPress(handleLongPress, handleShortPress, startPressProgress, stopPressProgress, 500);

  const isActive = (path: string) => location.pathname === path;

  const pathNorm = location.pathname.replace(/\/+$/, '') || '/';
  const hideFloatingShelfByRoute = pathNorm === '/settings' || pathNorm === '/lifetime-access';

  const premium = canAccessStatsAndRoutine(user);
  const upsell = shouldShowLifetimeUpsell(user);

  const desktopNavItems = React.useMemo(() => {
    const items: Array<{ path: string; icon: string; label: string; hasBadge?: boolean; badgeText?: string }> = [
      { path: '/home', icon: 'dashboard', label: 'Home' }
    ];
    if (premium) items.push({ path: '/stats', icon: 'insert_chart', label: t('stats') });
    items.push(
      { path: '/dashboard', icon: 'checklist', label: t('home') },
      { path: '/goals', icon: 'star', label: t('goals') }
    );
    if (premium) items.push({ path: '/routine', icon: 'calendar_check', label: 'Habits', hasBadge: true, badgeText: 'NEW' });
    if (upsell) items.push({ path: '/lifetime-access', icon: 'workspace_premium', label: `Lifetime ₹${displayLifetimePrice}` });
    items.push(
      { path: '/calendar', icon: 'calendar_month', label: 'Calendar' },
      { path: '/planner', icon: 'history', label: t('timeline') }
    );
    if (isAdminHubUser(user)) items.push({ path: '/admin', icon: 'admin_panel_settings', label: 'Admin Hub' });
    items.push({ path: '/settings', icon: 'person', label: t('profile') });
    return items;
  }, [user, premium, upsell, t, displayLifetimePrice]);

  React.useEffect(() => {
    (window as unknown as { showStayHardyIntro?: () => void }).showStayHardyIntro = () => setIsIntroOpen(true);
    return () => { delete (window as unknown as { showStayHardyIntro?: () => void }).showStayHardyIntro; };
  }, []);

  React.useEffect(() => {
    const openMenu = () => setIsMobileMenuOpen(true);
    window.addEventListener('stayhardy-open-mobile-nav', openMenu);
    return () => window.removeEventListener('stayhardy-open-mobile-nav', openMenu);
  }, []);

  // Liquid dot position map: [routine, dashboard, goals, stats]
  const navPaths = ['/routine', '/dashboard', '/goals', '/stats'];
  const dotPositions = ['18%', '36%', '64%', '82%'];
  const activeNavIdx = navPaths.findIndex(p => location.pathname.startsWith(p));

  const isFabActionPage = location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/goals') ||
    location.pathname.startsWith('/routine');

  return (
    <>
      {/* ── PREMIUM FLOATING DOCK (MOBILE) ── */}
      {!hideFloatingShelfByRoute &&
        !isMobileMenuOpen &&
        !hideFloatingShelf &&
        !hideMobileNavChrome && (
        <>
          <style>{`
            @keyframes fabHalo {
              0%,100% {
                box-shadow: 0 0 20px rgba(0,232,122,0.3), 0 0 40px rgba(0,232,122,0.1), 0 8px 24px rgba(0,0,0,0.5);
              }
              50% {
                box-shadow: 0 0 32px rgba(0,232,122,0.5), 0 0 64px rgba(0,232,122,0.2), 0 8px 24px rgba(0,0,0,0.5);
              }
            }
            @keyframes fabMorphHome {
              0%   { transform: scale(1)    rotate(0deg)  }
              50%  { transform: scale(1.15) rotate(45deg) }
              100% { transform: scale(1.1)  rotate(90deg) }
            }
            @keyframes dotSlide {
              from { opacity: 0; transform: translateX(-50%) scaleX(0) }
              to   { opacity: 1; transform: translateX(-50%) scaleX(1) }
            }
            @keyframes iconPop {
              0%   { transform: scale(1) }
              50%  { transform: scale(1.2) }
              100% { transform: scale(1) }
            }
            body.mobile-drawer-open .bottom-nav-container {
              display: none !important;
            }
          `}</style>

          <div className="bottom-nav-container" style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            padding: '0 16px',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
            pointerEvents: 'none'
          }}>
            {/* Floating dock */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              background: 'rgba(14,14,14,0.94)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '30px',
              padding: '10px 16px',
              width: '100%',
              maxWidth: '440px',
              position: 'relative',
              pointerEvents: 'all',
              overflow: 'visible',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
              borderTop: '1px solid rgba(0,232,122,0.12)'
            }}>

              {/* Liquid indicator dot */}
              {activeNavIdx >= 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '7px',
                  left: dotPositions[activeNavIdx],
                  transform: 'translateX(-50%)',
                  width: '20px',
                  height: '3px',
                  borderRadius: '3px',
                  background: '#00E87A',
                  boxShadow: '0 0 8px rgba(0,232,122,0.8)',
                  transition: 'left 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                  animation: 'dotSlide 0.3s ease'
                }} />
              )}

              {/* HABITS */}
              <div
                onClick={() => navigate(isPro ? '/routine' : '/lifetime-access')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, cursor: 'pointer', padding: '4px 0', position: 'relative' }}
              >
                {!isPro && (
                  <div style={{ position: 'absolute', top: 0, right: '8px', width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    <svg width="5" height="5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                )}
                <div style={{ animation: isActive('/routine') ? 'iconPop 0.3s ease' : 'none' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={!isPro ? 'rgba(239,68,68,0.6)' : isActive('/routine') ? '#00E87A' : '#666666'} strokeWidth="2" strokeLinecap="round">
                    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                  </svg>
                </div>
                <span style={{ fontSize: '8px', fontWeight: '800', letterSpacing: '0.08em', color: !isPro ? 'rgba(239,68,68,0.5)' : isActive('/routine') ? '#FFFFFF' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s ease' }}>HABITS</span>
              </div>

              {/* TASKS */}
              <div
                onClick={() => navigate('/dashboard')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, cursor: 'pointer', padding: '4px 0', position: 'relative' }}
              >
                <div style={{ animation: isActive('/dashboard') ? 'iconPop 0.3s ease' : 'none' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive('/dashboard') ? '#00E87A' : '#666666'} strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                </div>
                <span style={{ fontSize: '8px', fontWeight: '800', letterSpacing: '0.08em', color: isActive('/dashboard') ? '#FFFFFF' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s ease' }}>TASKS</span>
              </div>

              {/* CENTER FAB */}
              <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0, marginTop: '-16px' }}>
                {/* Progress ring */}
                {pressProgress > 0 && pressProgress < 100 && (
                  <svg style={{ position: 'absolute', top: '-5px', left: '-5px', transform: 'rotate(-90deg)', pointerEvents: 'none' }} width="66" height="66" viewBox="0 0 66 66">
                    <circle cx="33" cy="33" r="30" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
                    <circle cx="33" cy="33" r="30" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={String(2 * Math.PI * 30)}
                      strokeDashoffset={String(2 * Math.PI * 30 * (1 - pressProgress / 100))}
                      style={{ transition: 'stroke-dashoffset 0.016s linear' }}
                    />
                  </svg>
                )}
                {/* FAB */}
                <div
                  {...longPressHandlers}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: fabState === 'longpress' ? '#FFFFFF' : '#00E87A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    transition: 'background 0.3s ease, transform 0.2s ease',
                    transform: fabState === 'pressing' ? 'scale(1.08)' : fabState === 'longpress' ? 'scale(1.15)' : 'scale(1)',
                    animation: fabState === 'idle' ? 'fabHalo 3s ease-in-out infinite' : fabState === 'longpress' ? 'fabMorphHome 0.4s ease' : 'none',
                    boxShadow: fabState === 'longpress' ? '0 0 40px rgba(255,255,255,0.6)' : undefined
                  }}
                >
                  {fabState === 'longpress' ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  ) : isFabActionPage ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  )}
                </div>
                {/* Long press hint */}
                {fabState === 'pressing' && pressProgress > 30 && (
                  <div style={{ position: 'absolute', bottom: '-22px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', pointerEvents: 'none' }}>
                    → HOME
                  </div>
                )}
              </div>

              {/* GOALS */}
              <div
                onClick={() => navigate('/goals')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, cursor: 'pointer', padding: '4px 0', position: 'relative' }}
              >
                <div style={{ animation: isActive('/goals') ? 'iconPop 0.3s ease' : 'none' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive('/goals') ? '#00E87A' : '#666666'} strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                  </svg>
                </div>
                <span style={{ fontSize: '8px', fontWeight: '800', letterSpacing: '0.08em', color: isActive('/goals') ? '#FFFFFF' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s ease' }}>GOALS</span>
              </div>

              {/* STATS */}
              <div
                onClick={() => navigate(isPro ? '/stats' : '/lifetime-access')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, cursor: 'pointer', padding: '4px 0', position: 'relative' }}
              >
                {!isPro && (
                  <div style={{ position: 'absolute', top: 0, right: '8px', width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    <svg width="5" height="5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                )}
                <div style={{ animation: isActive('/stats') ? 'iconPop 0.3s ease' : 'none' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={!isPro ? 'rgba(239,68,68,0.6)' : isActive('/stats') ? '#00E87A' : '#666666'} strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <span style={{ fontSize: '8px', fontWeight: '800', letterSpacing: '0.08em', color: !isPro ? 'rgba(239,68,68,0.5)' : isActive('/stats') ? '#FFFFFF' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s ease' }}>STATS</span>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ── DESKTOP SIDEBAR ── */}
      {!isHidden && (
        <aside className="desktop-sidebar">
          <style>{`
            @keyframes pulseGlow {
              0% { box-shadow: 0 0 0 0px rgba(16, 185, 129, 0.4); }
              70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
              100% { box-shadow: 0 0 0 0px rgba(16, 185, 129, 0); }
            }
            .nav-badge {
              margin-left: auto;
              background: #10b981;
              color: #ffffff;
              font-size: 0.6rem;
              font-weight: 900;
              padding: 2px 6px;
              border-radius: 10px;
              letter-spacing: 0.05em;
              box-shadow: 0 0 0 0px rgba(16, 185, 129, 0.4);
              animation: pulseGlow 2s infinite;
            }
          `}</style>
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span>StayHardy</span>
            {user?.isPro && !isAdminHubUser(user) && (
              <span className="material-symbols-outlined" style={{ fontSize: '1.05rem', color: '#fbbf24', fontVariationSettings: "'FILL' 1" }} aria-label="Lifetime Pro" title="Lifetime Pro">star</span>
            )}
          </div>

          <nav className="sidebar-nav">
            {desktopNavItems.map((item) => (
              <button key={item.path} type="button" className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`} onClick={() => navigate(item.path)} style={isActive(item.path) ? { color: 'var(--primary-light)' } : {}}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive(item.path) ? "'FILL' 1" : '' }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.hasBadge && <span className="nav-badge">{item.badgeText}</span>}
              </button>
            ))}
          </nav>

          <div className="sidebar-logout-container">
            <button type="button" className="sidebar-nav-item" style={{ marginBottom: '0.5rem', width: '100%', border: 'none', background: 'transparent' }} onClick={() => setIsIntroOpen(true)}>
              <span className="material-symbols-outlined">help_outline</span>
              <span>Why Stay Hardy?</span>
            </button>
            <button type="button" onClick={() => logout()} className="sidebar-logout-btn">
              <span className="material-symbols-outlined">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      <WhyStayHardyModal
        isOpen={isIntroOpen}
        onClose={() => setIsIntroOpen(false)}
        onOpenSupport={() => { setIsIntroOpen(false); setShowSupportModal(true); }}
      />
      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </>
  );
};

export default BottomNav;
