import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const MobileNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { logout, user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/home', icon: 'dashboard', label: 'Home' },
    { path: '/stats', icon: 'insert_chart', label: t('stats') },
    { path: '/dashboard', icon: 'checklist', label: t('home') },
    { path: '/goals', icon: 'star', label: t('goals') },
    { path: '/routine', icon: 'calendar_check', label: t('routine') },
    { path: '/calendar', icon: 'calendar_month', label: 'Calendar' },
    { path: '/planner', icon: 'history', label: t('timeline') },
    ...(user?.role === 'admin' ? [{ path: '/admin', icon: 'admin_panel_settings', label: 'Admin Hub' }] : []),
    { path: '/settings', icon: 'person', label: t('profile') },
  ];


  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button (Mobile Only) */}
      <button 
        className="mobile-hamburger-btn"
        onClick={() => setIsOpen(true)}
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setIsOpen(false)} />
      )}

      {/* Drawer */}
      <aside className={`mobile-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="sidebar-logo">
            <span>StayHardy</span>
          </div>
          <button className="close-drawer-btn" onClick={() => setIsOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="drawer-nav">
          {menuItems.map(item => (
            <button
              key={item.path}
              className={`drawer-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleNavigate(item.path)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="drawer-footer">
          <button
            onClick={() => logout()}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.875rem 1.25rem',
              borderRadius: '1rem',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <style>{`
        .mobile-hamburger-btn {
          display: none;
          position: fixed;
          top: 1rem;
          left: 1rem;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-main);
          z-index: 1000;
          cursor: pointer;
          align-items: center;
          justify-content: center;
        }
        .mobile-hamburger-btn .material-symbols-outlined {
          font-size: 20px;
        }

        .mobile-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1100;
        }

        .mobile-drawer {
          position: fixed;
          top: 0;
          left: -280px;
          width: 280px;
          height: 100vh;
          background: #000000;
          backdrop-filter: blur(25px) saturate(180%);

          -webkit-backdrop-filter: blur(25px) saturate(180%);
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 1200;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          box-shadow: 15px 0 50px rgba(0,0,0,0.6);
        }

        .mobile-drawer.open {
          left: 0;
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .close-drawer-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .drawer-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .drawer-nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1.25rem;
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.95rem;
          text-align: left;
          width: 100%;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .drawer-nav-item:active {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          transform: scale(0.98);
        }

        .drawer-nav-item.active {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.3);
          color: #10b981;
          font-weight: 800;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.1);
        }

        .light-mode .drawer-nav-item {
          background: rgba(0, 0, 0, 0.02);
          border-color: rgba(0, 0, 0, 0.05);
        }

        .light-mode .drawer-nav-item.active {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.2);
          color: #065f46;
        }

        .drawer-footer {
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .light-mode .mobile-drawer {
          background: rgba(255, 255, 255, 0.85);
          border-right: 1px solid rgba(0, 0, 0, 0.05);
        }

        .light-mode .drawer-footer {
          border-top-color: rgba(0, 0, 0, 0.05);
        }

        @media (max-width: 767px) {
          .mobile-hamburger-btn {
            display: flex;
          }
        }
      `}</style>
    </>
  );
};

export default MobileNav;
