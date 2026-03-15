import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

import MobileNav from './MobileNav';

const BottomNav: React.FC<{ isHidden?: boolean }> = ({ isHidden }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { logout, user } = useAuth();
  const [showActionSheet, setShowActionSheet] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Mobile nav (exactly 4 items to fit design)
  const mobileNavItems = [
    { path: '/home', icon: 'dashboard', label: 'Home' },
    { path: '/dashboard', icon: 'checklist', label: t('home') },
    { path: '/routine', icon: 'calendar_check', label: t('routine') },
    { path: '/settings', icon: 'person', label: t('profile') },
  ];

  // Desktop sidebar includes Goals and other tabs
  const desktopNavItems = [
    { path: '/home', icon: 'dashboard', label: 'Home' },
    { path: '/dashboard', icon: 'checklist', label: t('home') },
    { path: '/goals', icon: 'star', label: t('goals') },
    { path: '/routine', icon: 'calendar_check', label: t('routine') },
    { path: '/stats', icon: 'insert_chart', label: t('stats') },
    { path: '/planner', icon: 'calendar_month', label: t('timeline') },
    ...(user?.role === 'admin' ? [{ path: '/admin', icon: 'admin_panel_settings', label: 'Admin Hub' }] : []),
    { path: '/settings', icon: 'person', label: t('profile') }
  ];

  return (
    <>
      {/* ── Mobile Top Hamburger ── */}
      <MobileNav />

      {/* ── Mobile bottom nav (hidden on desktop) ── */}
      <nav className="bottom-nav-premium bottom-nav-mobile">
        {mobileNavItems.slice(0, 2).map(item => (
          <div
            key={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
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
          </div>
        ))}

        <button
          className={`nav-add-btn ${showActionSheet ? 'active' : ''}`}
          onClick={() => setShowActionSheet(!showActionSheet)}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '2.5rem', transition: 'transform 0.3s' }}
          >
            {showActionSheet ? 'close' : 'add'}
          </span>
        </button>

        {mobileNavItems.slice(2).map(item => (
          <div
            key={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
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
          </div>
        ))}

        {/* Action Sheet Overlay */}
        {showActionSheet && (
          <div className="action-sheet-overlay" onClick={() => setShowActionSheet(false)}>
            <div className="action-sheet-content" onClick={e => e.stopPropagation()}>
              <div className="action-sheet-title">CREATE NEW</div>
              <div className="action-options">
                <div className="action-option" onClick={() => { navigate('/dashboard?action=new-task'); setShowActionSheet(false); }}>
                  <div className="action-icon-bg" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                    <span className="material-symbols-outlined">add_task</span>
                  </div>
                  <span>Task</span>
                </div>
                <div className="action-option" onClick={() => { navigate('/goals?action=new-goal'); setShowActionSheet(false); }}>
                  <div className="action-icon-bg" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                    <span className="material-symbols-outlined">star</span>
                  </div>
                  <span>Goal</span>
                </div>
                <div className="action-option" onClick={() => { navigate('/routine?action=new-routine'); setShowActionSheet(false); }}>
                  <div className="action-icon-bg" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                    <span className="material-symbols-outlined">calendar_check</span>
                  </div>
                  <span>Routine</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

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
            <button onClick={() => logout()} className="sidebar-logout-btn">
              <span className="material-symbols-outlined">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}
      <style>{`
        .action-sheet-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 90px;
          animation: fadeIn 0.3s ease;
        }

        .action-sheet-content {
          background: var(--card-bg);
          width: calc(100% - 2rem);
          max-width: 400px;
          border-radius: 2rem;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .light-mode .action-sheet-content {
          background: #ffffff;
          border-color: rgba(0, 0, 0, 0.05);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .action-sheet-title {
          font-size: 10px;
          font-weight: 900;
          color: #64748b;
          text-align: center;
          letter-spacing: 0.15em;
          margin-bottom: 1.5rem;
        }

        .action-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .action-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .action-icon-bg {
          width: 60px;
          height: 60px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .action-option:active .action-icon-bg {
          transform: scale(0.9);
        }

        .action-option span:last-child {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--text-main);
        }

        .nav-add-btn {
          transition: transform 0.3s;
        }

        .nav-add-btn.active {
          background: #ef4444 !important;
          transform: translateY(-20px) rotate(45deg);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default BottomNav;
