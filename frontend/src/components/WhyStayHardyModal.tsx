import React, { useEffect, useState } from 'react';
import { openExternalUrl } from '../lib/openExternalUrl';

interface WhyStayHardyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstTime?: boolean;
  /** Opens the existing Support modal / flow (wired in BottomNav & HomeDashboard). */
  onOpenSupport?: () => void;
}

/** Env override optional default below. Use `#` or empty to disable. */
const DEFAULT_DEV_LINKEDIN = 'https://www.linkedin.com/in/joeamuthan/';
const DEV_LINKEDIN_URL =
  (import.meta.env.VITE_DEV_LINKEDIN_URL as string | undefined)?.trim() ||
  DEFAULT_DEV_LINKEDIN;
const DEV_WEBSITE_URL = '#';
const DEFAULT_DEV_AVATAR =
  'https://tiavhmbpplerffdjmodw.supabase.co/storage/v1/object/public/avatars/B7DB02BF-B1EE-4934-A5C0-6F45F22D9F70.JPG';
const DEV_AVATAR_SRC =
  (import.meta.env.VITE_DEV_AVATAR_URL as string | undefined)?.trim() || DEFAULT_DEV_AVATAR;

const TRUST_PILLS = ['No Subscription Fees', 'Zero Ads', 'Private & Secure'] as const;

const features = [
  {
    id: 'tasks',
    title: 'Tasks',
    icon: 'checklist',
    iconBg: 'rgba(59,130,246,0.15)',
    iconColor: '#3B82F6',
    desc: 'Capture, prioritize & complete',
  },
  {
    id: 'goals',
    title: 'Goals',
    icon: 'star',
    iconBg: 'rgba(245,158,11,0.15)',
    iconColor: '#F59E0B',
    desc: 'Set targets, track days left',
  },
  {
    id: 'routine',
    title: 'Routines',
    icon: 'event_repeat',
    iconBg: 'rgba(0,232,122,0.12)',
    iconColor: '#00E87A',
    desc: 'Build habits that compound',
  },
  {
    id: 'stats',
    title: 'Stats',
    icon: 'bar_chart',
    iconBg: 'rgba(168,85,247,0.12)',
    iconColor: '#A855F7',
    desc: 'See your grind pay off',
  },
] as const;

function IconLinkedIn() {
  return (
    <svg className="why-dev-soc-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  );
}

const WhyStayHardyModal: React.FC<WhyStayHardyModalProps> = ({ isOpen, onClose, isFirstTime, onOpenSupport }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [devAvatarFailed, setDevAvatarFailed] = useState(false);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setDevAvatarFailed(false);
  }, [isOpen]);

  const handleDismiss = () => {
    onClose();
  };

  const handleSupportPress = () => {
    onOpenSupport?.();
  };

  if (!shouldRender) return null;

  const showPhoto = Boolean(DEV_AVATAR_SRC) && !devAvatarFailed;

  return (
    <div
      className={`why-modal-overlay ${isOpen ? 'open' : ''}`}
      onClick={handleDismiss}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === 'opacity' && !isOpen) {
          setShouldRender(false);
        }
      }}
    >
      <div className="why-modal-content" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="why-modal-close" onClick={handleDismiss} aria-label="Close">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="why-modal-ambient" aria-hidden="true" />

        <div className="why-modal-body">
          <div className="why-hero-block">
            <div className="why-tick-icon-wrap why-tick-icon-wrap--3d" aria-hidden="true">
              <div className="why-tick-glow-disc" />
              <div className="why-tick-svg-scale">
                <svg className="why-tick-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    className="why-tick-path"
                    d="M 6 12 L 10.5 16.5 L 18 7"
                    pathLength={100}
                    stroke="#00E87A"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
            </div>

            <h1 className="why-display-title">STAY HARDY</h1>
            <p className="why-tagline">Your personal productivity assistant</p>
          </div>

          <div className="why-section-head">
            <span className="why-section-label">What you get</span>
          </div>

          <div className="why-feature-grid">
            {features.map((f, index) => (
              <div
                key={f.id}
                className="why-feature-card"
                style={
                  {
                    '--why-card-delay': `${0.5 + index * 0.15}s`,
                    '--why-icon-bg': f.iconBg,
                    '--why-icon-color': f.iconColor,
                  } as React.CSSProperties
                }
              >
                <div className="why-feature-iconbox">
                  <span className="material-symbols-outlined">{f.icon}</span>
                </div>
                <h3 className="why-feature-title">{f.title}</h3>
                <p className="why-feature-text">{f.desc}</p>
              </div>
            ))}
          </div>

          <button type="button" className="why-support-btn" onClick={handleSupportPress}>
            <span className="why-support-btn__heart" aria-hidden>
              ♥
            </span>
            <span className="why-support-btn__label">Support This App</span>
            <span className="why-support-btn__arrow" aria-hidden>
              →
            </span>
          </button>
          <p className="why-support-hint">Even ₹1 keeps this app alive 🙏</p>

          <div className="why-trust-pills-row" role="list" aria-label="No subscription fees, zero ads, private and secure">
            {TRUST_PILLS.map((label) => (
              <span key={label} className="why-trust-pill" role="listitem">
                {label}
              </span>
            ))}
          </div>

          <div className="why-dev-section">
            <p className="why-dev-section-label">About the developer</p>
            <div className="why-dev-card">
              <div className="why-dev-avatar-wrap">
                {showPhoto ? (
                  <img
                    className="why-dev-avatar-img"
                    src={DEV_AVATAR_SRC}
                    alt=""
                    onError={() => setDevAvatarFailed(true)}
                  />
                ) : (
                  <span className="why-dev-avatar-fallback" aria-hidden>
                    JA
                  </span>
                )}
              </div>
              <div className="why-dev-info">
                <div className="why-dev-name-row">
                  <span className="why-dev-name">Joe Amuthan</span>
                  <span className="why-dev-verified" title="Verified" aria-label="Verified">
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                      <circle cx="7" cy="7" r="7" fill="#00E87A" />
                      <path
                        d="M4 7.2 L6.2 9.4 L10 4.8"
                        stroke="#fff"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </span>
                  <button
                    type="button"
                    className="why-dev-ext"
                    aria-label="Open developer website"
                    disabled={DEV_WEBSITE_URL === '#'}
                    onClick={() => void openExternalUrl(DEV_WEBSITE_URL)}
                  >
                    <span className="material-symbols-outlined">open_in_new</span>
                  </button>
                </div>
                <p className="why-dev-tagline">Building What I Wish Existed</p>
                <div className="why-dev-socials">
                  <button
                    type="button"
                    className="why-dev-social-btn"
                    aria-label="LinkedIn"
                    disabled={!DEV_LINKEDIN_URL.startsWith('http')}
                    onClick={() => void openExternalUrl(DEV_LINKEDIN_URL)}
                  >
                    <IconLinkedIn />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button type="button" className="why-cta-primary" onClick={handleDismiss}>
            {isFirstTime ? "Get Started — It's Free" : "Let's Go 💪"}
          </button>

          {isFirstTime && <p className="why-signup-hint">No account? Sign up in seconds</p>}
        </div>
      </div>

      <style>{`
        .why-modal-overlay {
          position: fixed;
          inset: 0;
          background: #080c0a;
          z-index: 2000;
          display: flex;
          align-items: stretch;
          justify-content: center;
          padding: 0;
          padding-top: env(safe-area-inset-top, 0);
          padding-bottom: env(safe-area-inset-bottom, 0);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.45s;
        }
        .why-modal-overlay.open {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .why-modal-content {
          background: #080c0a;
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          height: 100%;
          max-height: 100%;
          min-height: 0;
          border-radius: 0;
          border: none;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 16px 18px 16px;
          padding-top: calc(16px + env(safe-area-inset-top, 0));
          padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
          box-sizing: border-box;
          transform: translateY(100%);
          opacity: 0;
          transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease;
        }
        .why-modal-overlay.open .why-modal-content {
          transform: translateY(0);
          opacity: 1;
        }
        .why-modal-overlay:not(.open) .why-modal-content {
          transform: translateY(100%);
          opacity: 0;
          transition: transform 0.42s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.35s ease;
        }

        .why-modal-ambient {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 120%;
          max-width: 480px;
          height: 160px;
          pointer-events: none;
          background: radial-gradient(ellipse at top center, rgba(0, 232, 122, 0.08) 0%, transparent 65%);
        }

        .why-modal-body {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: hidden;
          justify-content: flex-start;
        }

        .why-modal-close {
          position: absolute;
          top: calc(12px + env(safe-area-inset-top, 0));
          right: 16px;
          z-index: 5;
          background: rgba(26, 26, 46, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.75);
          width: 30px;
          height: 30px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.2s;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
        }
        .why-modal-close:hover {
          background: rgba(40, 40, 60, 0.95);
          border-color: rgba(0, 232, 122, 0.35);
          color: #fff;
        }
        .why-modal-close .material-symbols-outlined {
          font-size: 18px;
        }

        .why-hero-block {
          text-align: center;
          flex-shrink: 0;
        }

        .why-tick-icon-wrap {
          width: 64px;
          height: 64px;
          margin: 0 auto 10px;
          border-radius: 18px;
          background: linear-gradient(145deg, #1a1a2e, #0d0d1a);
          border: 1px solid rgba(0, 232, 122, 0.2);
          box-shadow:
            0 8px 32px rgba(0, 232, 122, 0.25),
            0 2px 8px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: visible;
        }

        .why-tick-icon-wrap--3d {
          transform-style: preserve-3d;
          transform: perspective(220px) rotateX(8deg);
          box-shadow:
            0 8px 32px rgba(0, 232, 122, 0.25),
            0 2px 8px rgba(0, 0, 0, 0.6),
            0 12px 24px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -2px 6px rgba(0, 0, 0, 0.35);
        }

        .why-tick-glow-disc {
          position: absolute;
          width: 44px;
          height: 44px;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 232, 122, 0.15) 0%, transparent 70%);
          pointer-events: none;
          animation: why-tick-glow-pulse 2.5s ease-in-out infinite;
          animation-delay: 0.9s;
          opacity: 0.4;
        }

        .why-tick-svg-scale {
          position: relative;
          z-index: 1;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateZ(12px);
          animation: why-tick-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s both;
        }

        .why-tick-svg {
          width: 100%;
          height: 100%;
          display: block;
          filter: drop-shadow(0 0 6px rgba(0, 232, 122, 0.35)) drop-shadow(0 4px 2px rgba(0, 0, 0, 0.5));
        }

        .why-tick-path {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: why-tick-draw 0.6s ease-out forwards;
        }

        @keyframes why-tick-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes why-tick-pop {
          0% {
            transform: translateZ(12px) scale(1);
          }
          50% {
            transform: translateZ(12px) scale(1.15);
          }
          100% {
            transform: translateZ(12px) scale(1);
          }
        }

        @keyframes why-tick-glow-pulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }

        .why-display-title {
          font-family: 'Syne', system-ui, sans-serif;
          font-weight: 800;
          font-size: 28px;
          color: #ffffff;
          letter-spacing: 2px;
          margin: 8px 0 2px;
          line-height: 1.1;
        }

        .why-tagline {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 300;
          font-style: italic;
          color: #00e87a;
          margin: 0 0 8px;
          line-height: 1.3;
        }

        .why-section-head {
          margin-top: 0;
          margin-bottom: 8px;
          text-align: center;
        }

        .why-section-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(0, 232, 122, 0.55);
        }

        .why-feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
          margin-top: 0;
          flex-shrink: 0;
        }

        .why-feature-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          padding: 10px 10px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          min-height: 0;
          opacity: 0;
          transform: translateY(16px);
          animation: why-card-in 0.5s ease-out forwards;
          animation-delay: var(--why-card-delay, 0.5s);
          animation-fill-mode: forwards;
          transition: background 0.15s ease, transform 0.15s ease;
          cursor: default;
          -webkit-tap-highlight-color: transparent;
        }

        .why-feature-card:hover {
          background: rgba(255, 255, 255, 0.07);
        }

        .why-feature-card:active {
          background: rgba(255, 255, 255, 0.07);
          transform: translateY(0) scale(0.98);
        }

        @keyframes why-card-in {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .why-feature-iconbox {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--why-icon-bg);
          color: var(--why-icon-color);
        }

        .why-feature-iconbox .material-symbols-outlined {
          font-size: 16px;
        }

        .why-feature-title {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          margin: 6px 0 0;
          line-height: 1.2;
        }

        .why-feature-text {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          line-height: 1.35;
          color: rgba(255, 255, 255, 0.5);
          margin: 3px 0 0;
        }

        .why-trust-pills-row {
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: center;
          gap: 6px;
          width: 100%;
          overflow: visible;
          margin: 6px 0;
          flex-shrink: 0;
        }

        .why-trust-pill {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 9px;
          font-weight: 500;
          color: rgba(0, 232, 122, 0.75);
          background: rgba(0, 232, 122, 0.08);
          border: 1px solid rgba(0, 232, 122, 0.18);
          border-radius: 20px;
          padding: 4px 8px;
          white-space: nowrap;
          flex-shrink: 0;
          line-height: 1.2;
        }

        @media (max-width: 400px) {
          .why-trust-pill {
            font-size: 8px;
            padding: 3px 6px;
          }
        }

        .why-support-btn {
          width: 100%;
          height: 42px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border-radius: 12px;
          border: 1px solid rgba(0, 232, 122, 0.25);
          background: rgba(0, 232, 122, 0.08);
          cursor: pointer;
          flex-shrink: 0;
          margin-top: 10px;
          transition: background 0.15s ease, transform 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .why-support-btn:active {
          transform: scale(0.99);
          background: rgba(0, 232, 122, 0.12);
        }
        .why-support-btn__heart {
          font-size: 14px;
          line-height: 1;
          color: #00e87a;
          flex-shrink: 0;
        }
        .why-support-btn__label {
          flex: 1;
          text-align: left;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #00e87a;
        }
        .why-support-btn__arrow {
          font-size: 13px;
          color: rgba(0, 232, 122, 0.45);
          flex-shrink: 0;
        }

        .why-support-hint {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.3);
          text-align: center;
          margin: 4px 0;
          flex-shrink: 0;
          line-height: 1.3;
        }

        .why-dev-section {
          margin-top: 0;
          flex-shrink: 0;
        }
        .why-dev-section-label {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
          margin: 0 0 6px;
          text-align: center;
        }
        .why-dev-card {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .why-dev-avatar-wrap {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid rgba(0, 232, 122, 0.4);
          overflow: hidden;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(0, 232, 122, 0.3), rgba(0, 232, 122, 0.1));
        }
        .why-dev-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .why-dev-avatar-fallback {
          font-family: 'Syne', system-ui, sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #00e87a;
        }
        .why-dev-info {
          min-width: 0;
          flex: 1;
        }
        .why-dev-name-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0 4px;
        }
        .why-dev-name {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
        }
        .why-dev-verified {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          margin-left: 2px;
          flex-shrink: 0;
        }
        .why-dev-ext {
          background: none;
          border: none;
          padding: 0;
          margin-left: 4px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.45);
          transition: color 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .why-dev-ext .material-symbols-outlined {
          font-size: 14px;
        }
        .why-dev-ext:hover:not(:disabled) {
          color: rgba(255, 255, 255, 0.75);
        }
        .why-dev-ext:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .why-dev-tagline {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-style: italic;
          color: #00e87a;
          margin: 2px 0 0;
          line-height: 1.3;
        }
        .why-dev-socials {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          margin-top: 6px;
        }
        .why-dev-social-btn {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          border: none;
          background: rgba(255, 255, 255, 0.07);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          cursor: pointer;
          padding: 0;
          transition: background 0.15s ease, transform 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .why-dev-social-btn:active:not(:disabled) {
          transform: scale(0.96);
        }
        .why-dev-social-btn:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .why-dev-soc-svg {
          width: 13px;
          height: 13px;
          display: block;
        }

        .why-cta-primary {
          position: relative;
          width: 100%;
          height: 46px;
          margin-top: 10px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #000000;
          background: linear-gradient(135deg, #00e87a, #00c563);
          box-shadow: 0 6px 20px rgba(0, 232, 122, 0.28);
          overflow: hidden;
          flex-shrink: 0;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }

        .why-cta-primary::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 45%;
          height: 100%;
          background: linear-gradient(
            105deg,
            transparent 0%,
            rgba(255, 255, 255, 0.35) 45%,
            transparent 90%
          );
          transform: translateX(-120%);
          animation: why-cta-shimmer 3s ease-in-out infinite;
          animation-delay: 2s;
          pointer-events: none;
        }

        @keyframes why-cta-shimmer {
          0%,
          66% {
            transform: translateX(-120%);
            opacity: 0;
          }
          67% {
            opacity: 1;
          }
          85% {
            transform: translateX(280%);
            opacity: 1;
          }
          86%,
          100% {
            transform: translateX(280%);
            opacity: 0;
          }
        }

        .why-cta-primary:hover {
          box-shadow: 0 8px 24px rgba(0, 232, 122, 0.35);
        }

        .why-cta-primary:active {
          transform: scale(0.99);
        }

        .why-signup-hint {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 9px;
          color: rgba(255, 255, 255, 0.35);
          text-align: center;
          margin: 4px 0 0;
          flex-shrink: 0;
          line-height: 1.25;
        }

        @media (min-width: 600px) {
          .why-modal-content {
            border-radius: 1.75rem;
            margin: 1.5rem auto;
            height: auto;
            max-height: min(92vh, 860px);
            padding: 1.25rem 1.5rem 1.25rem;
            padding-top: calc(1.25rem + env(safe-area-inset-top, 0));
          }
          .why-modal-close {
            top: calc(1rem + env(safe-area-inset-top, 0));
            right: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default WhyStayHardyModal;
