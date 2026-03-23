import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { canAccessStatsAndRoutine, shouldShowLifetimeUpsell } from '../lib/lifetimeAccess';
import { LIFETIME_PRICE_INR } from '../config/lifetimePricing';
import { isAdminHubUser } from '../config/adminOwner';

import MobileNav from './MobileNav';
import SupportModal from './SupportModal';
import WhyStayHardyModal from './WhyStayHardyModal';

const BottomNav: React.FC<{
  isHidden?: boolean;
  hideFloatingShelf?: boolean;
  /** Hide mobile hamburger + floating shelf (e.g. task sheet open) */
  hideMobileNavChrome?: boolean;
}> = ({ isHidden, hideFloatingShelf, hideMobileNavChrome }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { logout, user } = useAuth();
  const [isIntroOpen, setIsIntroOpen] = React.useState(false);
  const [showSupportModal, setShowSupportModal] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

  const pathNorm = location.pathname.replace(/\/+$/, '') || '/';
  const hideFloatingShelfByRoute =
    pathNorm === '/settings' || pathNorm === '/lifetime-access';

  const premium = canAccessStatsAndRoutine(user);
  const upsell = shouldShowLifetimeUpsell(user);

  const desktopNavItems = React.useMemo(() => {
    const items: Array<{
      path: string;
      icon: string;
      label: string;
      hasBadge?: boolean;
      badgeText?: string;
    }> = [{ path: '/home', icon: 'dashboard', label: 'Home' }];

    if (premium) {
      items.push({ path: '/stats', icon: 'insert_chart', label: t('stats') });
    }

    items.push(
      { path: '/dashboard', icon: 'checklist', label: t('home') },
      { path: '/goals', icon: 'star', label: t('goals') }
    );

    if (premium) {
      items.push({
        path: '/routine',
        icon: 'calendar_check',
        label: t('routine'),
        hasBadge: true,
        badgeText: 'NEW',
      });
    }

    if (upsell) {
      items.push({
        path: '/lifetime-access',
        icon: 'workspace_premium',
        label: `Lifetime ₹${LIFETIME_PRICE_INR}`,
      });
    }

    items.push(
      { path: '/calendar', icon: 'calendar_month', label: 'Calendar' },
      { path: '/planner', icon: 'history', label: t('timeline') }
    );

    if (isAdminHubUser(user)) {
      items.push({ path: '/admin', icon: 'admin_panel_settings', label: 'Admin Hub' });
    }

    items.push({ path: '/settings', icon: 'person', label: t('profile') });
    return items;
  }, [user, premium, upsell, t]);

  React.useEffect(() => {
    (window as unknown as { showStayHardyIntro?: () => void }).showStayHardyIntro = () =>
      setIsIntroOpen(true);
    return () => {
      delete (window as unknown as { showStayHardyIntro?: () => void }).showStayHardyIntro;
    };
  }, []);

  React.useEffect(() => {
    const openMenu = () => setIsMobileMenuOpen(true);
    window.addEventListener('stayhardy-open-mobile-nav', openMenu);
    return () => window.removeEventListener('stayhardy-open-mobile-nav', openMenu);
  }, []);

  return (
    <>
      {!hideMobileNavChrome && (
        <MobileNav isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      )}

      {!hideFloatingShelfByRoute &&
        !isMobileMenuOpen &&
        !hideFloatingShelf &&
        !hideMobileNavChrome && (
        <div
          className={`floating-shortcuts-bar ${location.pathname === '/home' ? 'desktop-home-visible' : ''} ${!premium ? 'floating-shortcuts-bar--free' : ''}`}
        >
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className={`shelf-btn shelf-btn-task ${isActive('/dashboard') ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">check_circle</span>
            {t('home')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/goals')}
            className={`shelf-btn shelf-btn-goal ${isActive('/goals') ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">star</span>
            {t('goals')}
          </button>
          {premium ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/routine')}
                className={`shelf-btn shelf-btn-routine ${isActive('/routine') ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined">calendar_today</span>
                {t('routine')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/stats')}
                className={`shelf-btn shelf-btn-stats ${isActive('/stats') ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined">insights</span>
                {t('stats')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/lifetime-access')}
              className={`shelf-btn shelf-btn-pro-upsell ${isActive('/lifetime-access') ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined">workspace_premium</span>
              {`Pro ₹${LIFETIME_PRICE_INR}`}
            </button>
          )}
        </div>
      )}

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
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.05rem', color: '#fbbf24', fontVariationSettings: "'FILL' 1" }}
                aria-label="Lifetime Pro"
                title="Lifetime Pro"
              >
                star
              </span>
            )}
          </div>

          <nav className="sidebar-nav">
            {desktopNavItems.map((item) => (
              <button
                key={item.path}
                type="button"
                className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                style={isActive(item.path) ? { color: 'var(--primary-light)' } : {}}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontVariationSettings: isActive(item.path) ? "'FILL' 1" : '',
                  }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.hasBadge && <span className="nav-badge">{item.badgeText}</span>}
              </button>
            ))}
          </nav>

          <div className="sidebar-logout-container">
            <button
              type="button"
              className="sidebar-nav-item"
              style={{ marginBottom: '0.5rem', width: '100%', border: 'none', background: 'transparent' }}
              onClick={() => setIsIntroOpen(true)}
            >
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
        onOpenSupport={() => {
          setIsIntroOpen(false);
          setShowSupportModal(true);
        }}
      />
      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </>
  );
};

export default BottomNav;
