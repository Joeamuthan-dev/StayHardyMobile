import React, { useState, useRef } from 'react';
import { isNative, isWeb } from '../utils/platform';

const triggerHaptic = async (style = 'Light') => {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ 
      style: style === 'Medium' ? ImpactStyle.Medium : ImpactStyle.Light 
    });
  } catch {
    // silent fail
  }
};

const triggerHapticHeavy = async () => {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Heavy });
    setTimeout(async () => {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }, 100);
  } catch (e) {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  }
};
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
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
  const { isPro: isSubscribed } = useSubscription();

  // Read fast cache for instant role resolution
  const isFastPro = React.useMemo(() => {
    try {
      return localStorage.getItem('cached_is_pro') === 'true';
    } catch {
      return false;
    }
  }, []);

  const isPro = isSubscribed || isFastPro || user?.isPro === true || user?.role === 'admin';
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
    await triggerHaptic('Light');
  };

  const longPressVibrate = async () => {
    await triggerHapticHeavy();
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

  const navIconSVG = (icon: string, active: boolean) => {
    const s = active ? '#00E87A' : 'currentColor';
    const props = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' as const, stroke: s, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    switch (icon) {
      case 'dashboard': return <svg {...props}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
      case 'insert_chart': return <svg {...props}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
      case 'checklist': return <svg {...props}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
      case 'star': return <svg {...props} fill={active ? '#00E87A' : 'none'}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
      case 'calendar_check': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>;
      case 'workspace_premium': return <svg {...props}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>;
      case 'calendar_month': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
      case 'history': return <svg {...props}><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5V15h5"/></svg>;
      case 'admin_panel_settings': return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
      case 'person': return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
      default: return <svg {...props}><circle cx="12" cy="12" r="4"/></svg>;
    }
  };

  const pathNorm = location.pathname.replace(/\/+$/, '') || '/';
  const hideFloatingShelfByRoute = pathNorm === '/settings' || pathNorm === '/lifetime-access' || pathNorm === '/updates' || pathNorm === '/feedback' || pathNorm === '/welcome';

  const premium = isPro || canAccessStatsAndRoutine(user);
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
      { path: '/calendar', icon: 'calendar_month', label: 'Calendar' }
    );
    if (!isWeb) items.push({ path: '/planner', icon: 'history', label: t('timeline') });
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
      {/* ── MOBILE NAVBAR (FLOATING DOCK) ── */}
      {!isWeb &&
        !hideFloatingShelfByRoute &&
        !isMobileMenuOpen &&
        !hideFloatingShelf &&
        !hideMobileNavChrome && (
        <>
          <style>{`
            @keyframes fabHalo {
              0%,100% { opacity: 1; }
              50%      { opacity: 0.82; }
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
            /* Hide the bar in some UI states but also force it stay hidden on desktop media as we have a sidebar */
            body.mobile-drawer-open .bottom-nav-container,
            body.sheet-open .bottom-nav-container {
              display: none !important;
            }
            @media (min-width: 1024px) {
              .bottom-nav-container { display: none !important; }
            }
          `}</style>

          <div className="bottom-nav-container fixed bottom-0 left-0 right-0 w-full z-[1000] flex justify-center px-4 pb-[max(20px,env(safe-area-inset-bottom,20px))] pointer-events-none">
            {/* Floating dock */}
            <div className="flex items-center justify-around bg-[rgba(14,14,14,0.94)] backdrop-blur-2xl rounded-[30px] py-2.5 px-4 w-full max-w-[440px] pointer-events-auto relative shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)] border-t border-[rgba(0,232,122,0.12)]" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>

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
                onClick={() => navigate('/routine')}
                className="flex flex-col items-center gap-1 flex-1 cursor-pointer py-1 relative"
              >
                <div style={{ animation: isActive('/routine') ? 'iconPop 0.3s ease' : 'none' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive('/routine') ? '#00E87A' : '#666666'} strokeWidth="2" strokeLinecap="round">
                    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                  </svg>
                </div>
                <span className={`text-[8px] font-extrabold tracking-wider uppercase transition-colors ${isActive('/routine') ? 'text-white' : 'text-white/30'}`}>HABITS</span>
              </div>

              {/* TASKS */}
              <div
                onClick={() => navigate('/dashboard')}
                className="flex flex-col items-center gap-1 flex-1 cursor-pointer py-1 relative"
              >
                <div style={{ animation: isActive('/dashboard') ? 'iconPop 0.3s ease' : 'none' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive('/dashboard') ? '#00E87A' : '#666666'} strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                </div>
                <span className={`text-[8px] font-extrabold tracking-wider uppercase transition-colors ${isActive('/dashboard') ? 'text-white' : 'text-white/30'}`}>TASKS</span>
              </div>

              {/* CENTER FAB */}
              <div className="relative w-14 h-14 flex-shrink-0 -mt-4">
                {/* Progress ring */}
                {pressProgress > 0 && pressProgress < 100 && (
                  <svg className="absolute -top-[5px] -left-[5px] rotate-[-90deg] pointer-events-none" width="66" height="66" viewBox="0 0 66 66">
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
                  style={{ willChange: 'transform, opacity', boxShadow: '0 0 24px rgba(0,232,122,0.35), 0 8px 24px rgba(0,0,0,0.5)' }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer select-none transition-all duration-200 ${fabState === 'longpress' ? 'bg-white scale-115 shadow-[0_0_40px_rgba(255,255,255,0.6)]' : 'bg-[#00E87A]'} ${fabState === 'pressing' ? 'scale-108' : 'scale-100'} ${fabState === 'idle' ? 'animate-[fabHalo_3s_ease-in-out_infinite]' : fabState === 'longpress' ? 'animate-[fabMorphHome_0.4s_ease]' : ''}`}
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
                  <div className="absolute -bottom-[22px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-white/50 tracking-wider pointer-events-none uppercase">
                    → HOME
                  </div>
                )}
              </div>

              {/* GOALS */}
              <div
                onClick={() => navigate('/goals')}
                className="flex flex-col items-center gap-1 flex-1 cursor-pointer py-1 relative"
              >
                <div style={{ animation: isActive('/goals') ? 'iconPop 0.3s ease' : 'none' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive('/goals') ? '#00E87A' : '#666666'} strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                  </svg>
                </div>
                <span className={`text-[8px] font-extrabold tracking-wider uppercase transition-colors ${isActive('/goals') ? 'text-white' : 'text-white/30'}`}>GOALS</span>
              </div>

              {/* STATS */}
              <div
                onClick={() => navigate('/stats')}
                className="flex flex-col items-center gap-1 flex-1 cursor-pointer py-1 relative"
              >
                <div style={{ animation: isActive('/stats') ? 'iconPop 0.3s ease' : 'none' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive('/stats') ? '#00E87A' : '#666666'} strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <span className={`text-[8px] font-extrabold tracking-wider uppercase transition-colors ${isActive('/stats') ? 'text-white' : 'text-white/30'}`}>STATS</span>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ── DESKTOP SIDEBAR (HIDDEN ON MOBILE) ── */}
      {!isHidden && (
        <aside className="desktop-sidebar hidden lg:flex">
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
          <div className="sidebar-logo flex items-center gap-[0.35rem] flex-wrap">
            <span>StayHardy</span>
            {user?.isPro && !isAdminHubUser(user) && (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Lifetime Pro"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            )}
          </div>

          <nav className="sidebar-nav">
            {desktopNavItems.map((item) => (
              <button key={item.path} type="button" className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`} onClick={() => navigate(item.path)} style={isActive(item.path) ? { color: 'var(--primary-light)' } : {}}>
                {navIconSVG(item.icon, isActive(item.path))}
                <span>{item.label}</span>
                {item.hasBadge && <span className="nav-badge">{item.badgeText}</span>}
              </button>
            ))}
          </nav>

          <div className="sidebar-logout-container mb-10">
            <button type="button" className="sidebar-nav-item w-full bg-transparent border-none mb-2" onClick={() => setIsIntroOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>Why Stay Hardy?</span>
            </button>
            <button type="button" onClick={() => logout()} className="sidebar-logout-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
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
