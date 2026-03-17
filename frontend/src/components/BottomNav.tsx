import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

import MobileNav from './MobileNav';
import WhyStayHardyModal from './WhyStayHardyModal';

const BottomNav: React.FC<{ isHidden?: boolean }> = ({ isHidden }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { logout, user } = useAuth();
  const [isIntroOpen, setIsIntroOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;


  // Desktop sidebar includes Goals and other tabs
  const desktopNavItems = [
    { path: '/home', icon: 'dashboard', label: 'Home' },
    { path: '/stats', icon: 'insert_chart', label: t('stats') },
    { path: '/dashboard', icon: 'checklist', label: t('home') },
    { path: '/goals', icon: 'star', label: t('goals') },
    { path: '/routine', icon: 'calendar_check', label: t('routine') },
    { path: '/calendar', icon: 'calendar_month', label: 'Calendar' },
    { path: '/planner', icon: 'history', label: t('timeline') },
    ...(user?.role === 'admin' ? [{ path: '/admin', icon: 'admin_panel_settings', label: 'Admin Hub' }] : []),
    { path: '/settings', icon: 'person', label: t('profile') }
  ];


  return (
    <>
      {/* ── Mobile Top Hamburger ── */}
      <MobileNav isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />

      {/* ── Mobile & Desktop Home bottom nav (Floating Shelf Design) ── */}
      {(location.pathname !== '/settings' && !isMobileMenuOpen) && (
        <div className={`floating-shortcuts-bar ${location.pathname === '/home' ? 'desktop-home-visible' : ''}`}>
          <button 
            onClick={() => navigate('/dashboard')} 
            className={`shelf-btn shelf-btn-task ${isActive('/dashboard') ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">check_circle</span>
            {t('home')}
          </button>
          <button 
            onClick={() => navigate('/goals')} 
            className={`shelf-btn shelf-btn-goal ${isActive('/goals') ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">star</span>
            {t('goals')}
          </button>
          <button 
            onClick={() => navigate('/routine')} 
            className={`shelf-btn shelf-btn-routine ${isActive('/routine') ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">calendar_today</span>
            {t('routine')}
          </button>
          <button 
            onClick={() => navigate('/stats')} 
            className={`shelf-btn shelf-btn-stats ${isActive('/stats') ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">insights</span>
            {t('stats')}
          </button>
        </div>
      )}

      {/* ── Desktop left sidebar (hidden on mobile) ── */}
      {!isHidden && (
        <aside className="desktop-sidebar">
          <div className="sidebar-logo">
            <span>StayHardy</span>
          </div>

          <nav className="sidebar-nav">
            {desktopNavItems.map(item => (
              <button
                key={item.path}
                className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                style={isActive(item.path) ? { color: 'var(--primary-light)' } : {}}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontVariationSettings: isActive(item.path) ? "'FILL' 1" : ""
                  }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-logout-container">
            <button 
              className="sidebar-nav-item" 
              style={{ marginBottom: '0.5rem', width: '100%', border: 'none', background: 'transparent' }}
              onClick={() => setIsIntroOpen(true)}
            >
              <span className="material-symbols-outlined">help_outline</span>
              <span>Why Stay Hardy?</span>
            </button>
            <button onClick={() => logout()} className="sidebar-logout-btn">
              <span className="material-symbols-outlined">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      <WhyStayHardyModal 
        isOpen={isIntroOpen} 
        onClose={() => setIsIntroOpen(false)} 
      />
      
      {/* Expose trigger to MobileNav via window for simplicity in this architecture */}
      {React.useEffect(() => {
        (window as any).showStayHardyIntro = () => setIsIntroOpen(true);
      }, [])}
    </>
  );
};

export default BottomNav;
