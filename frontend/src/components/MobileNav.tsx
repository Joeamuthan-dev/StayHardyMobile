import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { canAccessStatsAndRoutine, shouldShowLifetimeUpsell } from '../lib/lifetimeAccess';
import { LIFETIME_PRICE_INR } from '../config/lifetimePricing';
import { isAdminHubUser } from '../config/adminOwner';
import SupportModal from './SupportModal';

import pkg from '../../package.json';

interface MobileNavProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

type NavLinkItem = {
  kind: 'link';
  path: string;
  icon: string;
  label: string;
  hasBadge?: boolean;
  badgeText?: string;
  desc: string;
  accent: string;
};

type NavProItem = { kind: 'pro'; path: '/lifetime-access'; desc: string; accent: string };

type NavItem = NavLinkItem | NavProItem;

const NAV_DESC: Partial<Record<string, string>> = {
  '/home': 'Daily productivity hub',
  '/stats': 'Performance insights',
  '/dashboard': 'Priorities and focus',
  '/goals': 'Targets and milestones',
  '/routine': 'Habits that stick',
  '/calendar': 'Schedule and reminders',
  '/planner': 'Completed work archive',
  '/admin': 'System overview',
  '/settings': 'Account and profile',
};

const ACCENT_ROT = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#f43f5e'];

const MobileNav: React.FC<MobileNavProps> = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { logout, user } = useAuth();
  const [showSupportModal, setShowSupportModal] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const isActive = (path: string) => location.pathname === path;

  const premium = canAccessStatsAndRoutine(user);
  const upsell = shouldShowLifetimeUpsell(user);

  const menuItems = React.useMemo((): NavItem[] => {
    let accentIdx = 0;
    const nextAccent = () => ACCENT_ROT[accentIdx++ % ACCENT_ROT.length];
    const items: NavItem[] = [
      {
        kind: 'link',
        path: '/home',
        icon: 'dashboard',
        label: 'Home',
        desc: NAV_DESC['/home'] || '',
        accent: nextAccent(),
      },
    ];

    if (premium) {
      items.push({
        kind: 'link',
        path: '/stats',
        icon: 'insert_chart',
        label: t('stats'),
        desc: NAV_DESC['/stats'] || '',
        accent: nextAccent(),
      });
    }

    items.push(
      {
        kind: 'link',
        path: '/dashboard',
        icon: 'checklist',
        label: t('home'),
        desc: NAV_DESC['/dashboard'] || '',
        accent: nextAccent(),
      },
      {
        kind: 'link',
        path: '/goals',
        icon: 'star',
        label: t('goals'),
        desc: NAV_DESC['/goals'] || '',
        accent: nextAccent(),
      },
    );

    if (premium) {
      items.push({
        kind: 'link',
        path: '/routine',
        icon: 'calendar_check',
        label: t('routine'),
        hasBadge: true,
        badgeText: 'NEW',
        desc: NAV_DESC['/routine'] || '',
        accent: nextAccent(),
      });
    }

    if (upsell) {
      items.push({
        kind: 'pro',
        path: '/lifetime-access',
        desc: 'One-time lifetime unlock',
        accent: '#4ade80',
      });
    }

    items.push(
      {
        kind: 'link',
        path: '/calendar',
        icon: 'calendar_month',
        label: 'Calendar',
        desc: NAV_DESC['/calendar'] || '',
        accent: nextAccent(),
      },
      {
        kind: 'link',
        path: '/planner',
        icon: 'history',
        label: t('timeline'),
        desc: NAV_DESC['/planner'] || '',
        accent: nextAccent(),
      },
    );

    if (isAdminHubUser(user)) {
      items.push({
        kind: 'link',
        path: '/admin',
        icon: 'admin_panel_settings',
        label: 'Admin Hub',
        desc: NAV_DESC['/admin'] || '',
        accent: nextAccent(),
      });
    }

    items.push({
      kind: 'link',
      path: '/settings',
      icon: 'person',
      label: t('profile'),
      desc: NAV_DESC['/settings'] || '',
      accent: nextAccent(),
    });
    return items;
  }, [user, premium, upsell, t]);

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

  const drawerPanel = (
    <>
      {isOpen && (
        <div
          className="mn-overlay"
          role="presentation"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={`mn-drawer ${isOpen ? 'mn-drawer--open' : ''}`}
        aria-hidden={!isOpen}
        onTouchStart={onDrawerTouchStart}
        onTouchEnd={onDrawerTouchEnd}
      >
        <div className="mn-drawer-bg" aria-hidden />
        <div className="mn-drawer-scroll">
          <div className="mn-section-label">
            <span>Navigate</span>
            <span className="mn-section-line" />
          </div>

          <nav className="mn-nav" aria-label="Main">
            {menuItems.map((item, idx) => {
              const delay = 50 + idx * 50;
              if (item.kind === 'pro') {
                const proActive = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    style={{ animationDelay: `${delay}ms` }}
                    className={`mn-row mn-row--stagger mn-nav-pro ${proActive ? 'mn-row--active' : ''}`}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <span
                      className="mn-ico-box"
                      style={{ background: `${item.accent}22`, borderColor: `${item.accent}44`, color: item.accent }}
                    >
                      <span className="material-symbols-outlined">workspace_premium</span>
                    </span>
                    <span className="mn-row-text">
                      <span className="mn-row-title">{`Lifetime ₹${LIFETIME_PRICE_INR}`}</span>
                      <span className="mn-row-desc">{item.desc}</span>
                    </span>
                    <span className="mn-pill">One-time</span>
                  </button>
                );
              }

              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  style={{ animationDelay: `${delay}ms` }}
                  className={`mn-row mn-row--stagger ${active ? 'mn-row--active' : ''}`}
                  onClick={() => handleNavigate(item.path)}
                >
                  <span
                    className="mn-ico-box"
                    style={{
                      background: `${item.accent}22`,
                      borderColor: `${item.accent}40`,
                      color: item.accent,
                    }}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </span>
                  <span className="mn-row-text">
                    <span className="mn-row-title">{item.label}</span>
                    <span className="mn-row-desc">{item.desc}</span>
                  </span>
                  {item.hasBadge ? (
                    <span className="mn-badge">{item.badgeText}</span>
                  ) : (
                    <span className="material-symbols-outlined mn-chevron">chevron_right</span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              style={{ animationDelay: `${50 + menuItems.length * 50}ms` }}
              className="mn-row mn-row--stagger"
              onClick={() => {
                setIsOpen(false);
                (window as unknown as { showStayHardyIntro?: () => void }).showStayHardyIntro?.();
              }}
            >
              <span
                className="mn-ico-box"
                style={{ background: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.35)', color: '#4ade80' }}
              >
                <span className="material-symbols-outlined">help_outline</span>
              </span>
              <span className="mn-row-text">
                <span className="mn-row-title">Why Stay Hardy?</span>
                <span className="mn-row-desc">Product tour and features</span>
              </span>
              <span className="material-symbols-outlined mn-chevron">chevron_right</span>
            </button>
          </nav>

          <div className="mn-settings">
            <button
              type="button"
              style={{ animationDelay: `${50 + (menuItems.length + 1) * 50}ms` }}
              className="mn-row mn-row--stagger mn-row--compact"
              onClick={() => {
                navigate('/feedback');
                setIsOpen(false);
              }}
            >
              <span className="mn-ico-box mn-ico-box--sm">
                <span className="material-symbols-outlined">chat</span>
              </span>
              <span className="mn-row-text">
                <span className="mn-row-title">Send feedback</span>
              </span>
              <span className="material-symbols-outlined mn-chevron">chevron_right</span>
            </button>
            <button
              type="button"
              style={{ animationDelay: `${50 + (menuItems.length + 2) * 50}ms` }}
              className="mn-row mn-row--stagger mn-row--compact"
              onClick={() => {
                setShowSupportModal(true);
                setIsOpen(false);
              }}
            >
              <span className="mn-ico-box mn-ico-box--sm">
                <span className="material-symbols-outlined">favorite</span>
              </span>
              <span className="mn-row-text">
                <span className="mn-row-title">Support this app</span>
              </span>
              <span className="material-symbols-outlined mn-chevron">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="mn-footer">
          <button
            type="button"
            className="mn-logout"
            onClick={() => logout()}
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Logout session</span>
          </button>
          <p className="mn-version">StayHardy v{pkg.version}</p>
        </div>
      </aside>
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

      <style>{`
        .mn-burger {
          display: none;
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 1rem);
          left: max(1rem, env(safe-area-inset-left, 0px));
          width: 42px;
          height: 42px;
          padding: 0;
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(15, 23, 42, 0.92);
          z-index: 1400;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 5px;
          box-sizing: border-box;
          transition:
            background 0.35s cubic-bezier(0.68, -0.6, 0.32, 1.6),
            border-color 0.35s cubic-bezier(0.68, -0.6, 0.32, 1.6),
            box-shadow 0.35s cubic-bezier(0.68, -0.6, 0.32, 1.6);
          overflow: hidden;
        }
        .mn-burger--open {
          background: rgba(16, 185, 129, 0.18);
          border-color: rgba(52, 211, 153, 0.4);
          box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.35), 0 0 16px rgba(52, 211, 153, 0.35);
        }
        .mn-burger:active .mn-burger-flash {
          opacity: 1;
          transition: opacity 0.05s ease;
        }
        .mn-burger-flash {
          position: absolute;
          inset: 0;
          background: rgba(52, 211, 153, 0.35);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        .mn-bar {
          display: block;
          height: 2px;
          background: #fff;
          border-radius: 1px;
          transform-origin: center;
          transition:
            transform 350ms cubic-bezier(0.68, -0.6, 0.32, 1.6),
            opacity 280ms ease,
            width 350ms cubic-bezier(0.68, -0.6, 0.32, 1.6),
            margin 350ms cubic-bezier(0.68, -0.6, 0.32, 1.6),
            background 350ms ease;
        }
        .mn-bar--top {
          width: 18px;
        }
        .mn-bar--mid {
          width: 14px;
          margin-left: 4px;
          align-self: flex-start;
        }
        .mn-burger:not(.mn-burger--open) .mn-bar--mid {
          margin-left: 4px;
        }
        .mn-bar--bot {
          width: 18px;
        }
        .mn-burger--open .mn-bar--top {
          transform: rotate(45deg) translateY(7px);
          background: #4ade80;
          box-shadow: 0 0 10px rgba(52, 211, 153, 0.6);
        }
        .mn-burger--open .mn-bar--mid {
          transform: scaleX(0);
          opacity: 0;
          width: 14px;
        }
        .mn-burger--open .mn-bar--bot {
          transform: rotate(-45deg) translateY(-7px);
          background: #4ade80;
          box-shadow: 0 0 10px rgba(52, 211, 153, 0.6);
        }

        .mn-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          z-index: 1200;
        }

        .mn-drawer {
          position: fixed;
          top: 0;
          left: 0;
          width: 300px;
          max-width: 100vw;
          height: 100vh;
          height: 100dvh;
          z-index: 1300;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding: calc(env(safe-area-inset-top, 0px) + 0.75rem) 0 calc(env(safe-area-inset-bottom, 0px) + 0.5rem);
          transform: translateX(-105%);
          transition: transform 400ms cubic-bezier(0.32, 0.72, 0, 1);
          border-right: 1px solid rgba(255, 255, 255, 0.07);
          overflow: hidden;
        }
        .mn-drawer--open {
          transform: translateX(0);
        }
        .mn-drawer-bg {
          position: absolute;
          inset: 0;
          background: #0b1220;
          z-index: 0;
        }
        .mn-drawer-bg::before {
          content: '';
          position: absolute;
          top: -20%;
          left: -30%;
          width: 80%;
          height: 50%;
          background: radial-gradient(ellipse, rgba(52, 211, 153, 0.08), transparent 70%);
          pointer-events: none;
        }
        .mn-drawer-bg::after {
          content: '';
          position: absolute;
          bottom: -10%;
          right: -20%;
          width: 70%;
          height: 45%;
          background: radial-gradient(ellipse, rgba(59, 130, 246, 0.05), transparent 65%);
          pointer-events: none;
        }

        .mn-drawer-scroll {
          position: relative;
          z-index: 1;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0 0.85rem;
          -webkit-overflow-scrolling: touch;
        }
        .mn-drawer-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .mn-drawer-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 10px;
        }

        .mn-section-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0.5rem 0 0.65rem;
        }
        .mn-section-label span:first-child {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.55rem;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.85);
          flex-shrink: 0;
        }
        .mn-section-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.12), transparent);
          min-width: 0;
        }
        .mn-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .mn-settings {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 0.5rem;
        }

        .mn-row {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 13px 12px;
          border-radius: 14px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          text-align: left;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }
        .mn-row--compact {
          padding: 10px 12px;
        }
        .mn-row--stagger {
          opacity: 0;
          animation: mn-stagger-in 0.45s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
        .mn-drawer--open .mn-row--stagger {
          animation-name: mn-stagger-in;
        }
        .mn-drawer:not(.mn-drawer--open) .mn-row--stagger {
          animation: none;
          opacity: 0;
        }
        @keyframes mn-stagger-in {
          from {
            opacity: 0;
            transform: translateX(-14px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .mn-row:active::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(52, 211, 153, 0.12);
          pointer-events: none;
        }

        .mn-ico-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .mn-ico-box .material-symbols-outlined {
          font-size: 20px !important;
        }
        .mn-ico-box--sm {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          color: rgba(226, 232, 240, 0.85) !important;
        }
        .mn-row-text {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .mn-row-title {
          font-weight: 700;
          font-size: 0.88rem;
          color: #f8fafc;
          line-height: 1.2;
        }
        .mn-row-desc {
          font-size: 0.65rem;
          color: rgba(148, 163, 184, 0.9);
          line-height: 1.25;
        }
        .mn-row--compact .mn-row-title {
          font-size: 0.82rem;
          font-weight: 600;
        }
        .mn-chevron {
          font-size: 18px !important;
          color: rgba(148, 163, 184, 0.45);
          flex-shrink: 0;
        }
        .mn-badge {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.5rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 8px;
          background: rgba(52, 211, 153, 0.18);
          color: #4ade80;
          border: 1px solid rgba(52, 211, 153, 0.35);
          flex-shrink: 0;
        }
        .mn-row--active {
          background: rgba(52, 211, 153, 0.1);
          border-color: rgba(52, 211, 153, 0.35);
        }

        .mn-nav-pro {
          border: 1px solid rgba(52, 211, 153, 0.4);
          background: rgba(16, 185, 129, 0.08);
        }
        .mn-nav-pro.mn-row--active {
          background: rgba(16, 185, 129, 0.16);
        }
        .mn-pill {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.5rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.35);
          color: #4ade80;
          border: 1px solid rgba(52, 211, 153, 0.35);
          flex-shrink: 0;
        }

        .mn-footer {
          position: relative;
          z-index: 2;
          flex-shrink: 0;
          padding: 0.75rem 0.85rem 0.25rem;
          margin-top: auto;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, transparent, rgba(2, 6, 23, 0.85));
        }
        .mn-logout {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1rem;
          border-radius: 14px;
          border: 1px solid rgba(248, 113, 113, 0.2);
          background: rgba(127, 29, 29, 0.25);
          color: #fecaca;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          transition: box-shadow 0.2s ease, background 0.2s ease;
          opacity: 0;
          animation: mn-logout-in 0.45s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
        .mn-drawer--open .mn-logout {
          animation-delay: 450ms;
        }
        .mn-drawer:not(.mn-drawer--open) .mn-logout {
          animation: none;
          opacity: 0;
        }
        @keyframes mn-logout-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .mn-logout .material-symbols-outlined {
          font-size: 18px !important;
        }
        .mn-logout:active {
          box-shadow: 0 0 24px rgba(248, 113, 113, 0.35);
          background: rgba(127, 29, 29, 0.4);
        }
        .mn-version {
          text-align: center;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.55rem;
          color: rgba(100, 116, 139, 0.9);
          margin: 0.65rem 0 0;
        }

        @media (max-width: 767px) {
          .mn-burger {
            display: flex;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mn-burger .mn-bar,
          .mn-burger {
            transition-duration: 0.15s !important;
          }
          .mn-drawer {
            transition-duration: 0.2s !important;
          }
          .mn-row--stagger,
          .mn-logout {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

    </>
  );
};

export default MobileNav;
