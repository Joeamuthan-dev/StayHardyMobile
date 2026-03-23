import React from 'react';

export const GUEST_SPLASH_DURATION_MS = 7000;

interface GuestSplashProps {
  onContinue: () => void;
}

type FeatureTile = {
  icon: string;
  title: string;
  desc: string;
  iconBg: string;
  iconColor: string;
  glow: string;
};

const FEATURES: FeatureTile[] = [
  {
    icon: 'checklist',
    title: 'Tasks',
    desc: 'Capture, prioritize & complete',
    iconBg: 'rgba(59,130,246,0.15)',
    iconColor: '#3B82F6',
    glow: 'rgba(59,130,246,0.4)',
  },
  {
    icon: 'star',
    title: 'Goals',
    desc: 'Set targets, track days left',
    iconBg: 'rgba(245,158,11,0.15)',
    iconColor: '#F59E0B',
    glow: 'rgba(245,158,11,0.4)',
  },
  {
    icon: 'repeat',
    title: 'Routines',
    desc: 'Build habits that compound',
    iconBg: 'rgba(0,232,122,0.12)',
    iconColor: '#00E87A',
    glow: 'rgba(0,232,122,0.4)',
  },
  {
    icon: 'bar_chart',
    title: 'Stats',
    desc: 'See your grind pay off',
    iconBg: 'rgba(168,85,247,0.12)',
    iconColor: '#A855F7',
    glow: 'rgba(168,85,247,0.4)',
  },
];

const PARTICLE_CFG = [
  { left: '10%', bottom: '20%', size: 3, dur: 9, delay: 0, op: 0.65 },
  { left: '25%', bottom: '40%', size: 2, dur: 11, delay: 1.2, op: 0.5 },
  { left: '50%', bottom: '10%', size: 4, dur: 7, delay: 2, op: 0.55 },
  { left: '65%', bottom: '30%', size: 2, dur: 10, delay: 0.8, op: 0.7 },
  { left: '80%', bottom: '50%', size: 3, dur: 8, delay: 3, op: 0.45 },
  { left: '90%', bottom: '15%', size: 2, dur: 12, delay: 4, op: 0.6 },
];

/**
 * Signed-out intro: premium showcase → Continue or auto after GUEST_SPLASH_DURATION_MS.
 */
const GuestSplash: React.FC<GuestSplashProps> = ({ onContinue }) => {
  return (
    <div className="guest-splash-root">
      <div className="guest-splash-bg-base" aria-hidden />
      <div className="guest-splash-bg-radial" aria-hidden />
      <div className="guest-splash-bg-vignette" aria-hidden />
      <div className="guest-splash-bg-noise" aria-hidden />
      <div className="guest-splash-bg-grid" aria-hidden />

      <div className="guest-splash-particles" aria-hidden>
        {PARTICLE_CFG.map((p, i) => (
          <span
            key={i}
            className="guest-splash-particle"
            style={
              {
                left: p.left,
                bottom: p.bottom,
                width: p.size,
                height: p.size,
                '--particle-opacity': p.op,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <button type="button" className="guest-splash-close" onClick={onContinue} aria-label="Close and continue">
        <span className="material-symbols-outlined">close</span>
      </button>

      <div className="guest-splash-inner">
        <div className="guest-splash-main">
          <div className="guest-splash-hero-center">
            <div className="guest-premium-icon-wrap">
              <div className="guest-premium-icon-glow-base" aria-hidden />
              <div className="guest-premium-icon-face">
                <div className="guest-premium-icon-shine" aria-hidden />
                <div className="guest-premium-icon-svg-wrap">
                  <svg
                    className="guest-premium-tick-svg"
                    viewBox="0 0 40 40"
                    width="40"
                    height="40"
                    aria-hidden
                  >
                    <path
                      className="guest-premium-tick-path"
                      d="M10 20 L17 27 L30 13"
                      fill="none"
                      stroke="#00E87A"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="guest-splash-title-wrap">
              <h1 className="guest-splash-title">STAY HARDY</h1>
            </div>
            <p className="guest-splash-tagline">Your personal productivity assistant</p>
          </div>

          <div className="guest-splash-scroll">
            <section className="guest-splash-features" aria-labelledby="splash-what-you-get">
              <div className="guest-splash-section-label-row">
                <h2 id="splash-what-you-get" className="guest-splash-section-label">
                  WHAT YOU GET
                </h2>
              </div>
              <div className="guest-splash-grid">
                {FEATURES.map((f, i) => (
                  <article
                    key={f.title}
                    className="guest-splash-card"
                    style={
                      {
                        '--guest-card-delay': `${0.8 + i * 0.15}s`,
                        '--card-glow': f.glow,
                      } as React.CSSProperties
                    }
                  >
                    <div
                      className="guest-splash-card-icon"
                      style={{ background: f.iconBg }}
                    >
                      <span className="material-symbols-outlined" style={{ color: f.iconColor }}>
                        {f.icon}
                      </span>
                    </div>
                    <h3 className="guest-splash-card-title">{f.title}</h3>
                    <p className="guest-splash-card-desc">{f.desc}</p>
                  </article>
                ))}
              </div>
            </section>

            <div className="guest-splash-trust" role="list">
              <span className="guest-splash-trust-badge" role="listitem">
                100% Free
              </span>
              <span className="guest-splash-trust-badge" role="listitem">
                Zero Ads
              </span>
              <span className="guest-splash-trust-badge" role="listitem">
                Private &amp; Secure
              </span>
            </div>
          </div>
        </div>

        <footer className="guest-splash-footer">
          <button type="button" className="guest-splash-cta" onClick={onContinue}>
            <span className="guest-splash-cta-label">Get Started — It&apos;s Free</span>
          </button>
          <p className="guest-splash-hint">No account? Sign up in seconds</p>
        </footer>
      </div>

      <div className="guest-splash-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-label="Splash progress">
        <div className="guest-splash-progress-fill" />
      </div>

      <style>{`
        .guest-splash-root {
          position: fixed;
          inset: 0;
          z-index: 2000;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          background: #050807;
          padding: calc(48px + env(safe-area-inset-top, 0px)) 24px calc(32px + env(safe-area-inset-bottom, 0px)) 24px;
          overflow-x: visible;
          overflow-y: hidden;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        .guest-splash-bg-base {
          position: absolute;
          inset: 0;
          z-index: 0;
          background: #050807;
          pointer-events: none;
        }

        .guest-splash-bg-radial {
          position: absolute;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
          width: 400px;
          height: 400px;
          z-index: 0;
          background: radial-gradient(
            circle,
            rgba(0, 232, 122, 0.12) 0%,
            rgba(0, 232, 122, 0.04) 40%,
            transparent 70%
          );
          pointer-events: none;
          animation: guest-ambient-breathe 4s ease-in-out infinite;
        }

        @keyframes guest-ambient-breathe {
          0%,
          100% {
            opacity: 0.6;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translateX(-50%) scale(1.15);
          }
        }

        .guest-splash-bg-vignette {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 300px;
          z-index: 0;
          background: linear-gradient(to top, rgba(5, 8, 7, 0.95) 0%, transparent 100%);
          pointer-events: none;
        }

        .guest-splash-bg-noise {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 200px;
          pointer-events: none;
        }

        .guest-splash-bg-grid {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.015;
          background-image:
            linear-gradient(rgba(0, 232, 122, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 232, 122, 0.5) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .guest-splash-particles {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          overflow: hidden;
        }

        .guest-splash-particle {
          position: absolute;
          border-radius: 50%;
          background: rgba(0, 232, 122, 0.55);
          opacity: var(--particle-opacity, 0.6);
          animation: guest-particle-float linear infinite;
        }

        @keyframes guest-particle-float {
          0% {
            transform: translateY(0);
            opacity: var(--particle-opacity, 0.6);
          }
          100% {
            transform: translateY(-200px);
            opacity: 0;
          }
        }

        .guest-splash-close {
          position: absolute;
          top: calc(12px + env(safe-area-inset-top, 0px));
          right: calc(12px + env(safe-area-inset-right, 0px));
          z-index: 10;
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.65);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .guest-splash-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .guest-splash-close .material-symbols-outlined {
          font-size: 22px !important;
        }

        .guest-splash-inner {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          max-width: 420px;
          width: 100%;
          align-self: stretch;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .guest-splash-main {
          flex: 1;
          min-height: 0;
          min-width: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          overflow: visible;
        }

        .guest-splash-scroll {
          flex: 1;
          min-height: 0;
          min-width: 0;
          width: 100%;
          overflow-y: auto;
          overflow-x: visible;
          -webkit-overflow-scrolling: touch;
        }

        .guest-splash-hero-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          flex-shrink: 0;
          width: 100%;
          overflow: visible;
        }

        /* Premium 3D icon */
        .guest-premium-icon-wrap {
          width: 80px;
          height: 80px;
          position: relative;
          margin-bottom: 20px;
        }

        .guest-premium-icon-glow-base {
          position: absolute;
          inset: -4px;
          border-radius: 26px;
          background: rgba(0, 232, 122, 0.08);
          filter: blur(12px);
          animation: guest-icon-glow 3s ease-in-out infinite;
        }

        @keyframes guest-icon-glow {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        .guest-premium-icon-face {
          position: absolute;
          inset: 0;
          border-radius: 22px;
          background: linear-gradient(145deg, #1c2b24 0%, #0d1a13 50%, #091410 100%);
          border: 1px solid rgba(0, 232, 122, 0.25);
          box-shadow:
            0 0 0 1px rgba(0, 232, 122, 0.08),
            0 8px 32px rgba(0, 0, 0, 0.6),
            0 2px 8px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            inset 0 -1px 0 rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .guest-premium-icon-shine {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          border-radius: 22px 22px 0 0;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%);
          pointer-events: none;
        }

        .guest-premium-icon-svg-wrap {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: guest-tick-pop-phase 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s both;
        }

        @keyframes guest-tick-pop-phase {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        .guest-premium-tick-svg {
          display: block;
          animation: guest-tick-pulse 2.5s ease-in-out 1.15s infinite;
        }

        @keyframes guest-tick-pulse {
          0%,
          100% {
            filter: drop-shadow(0 0 4px rgba(0, 232, 122, 0.4));
          }
          50% {
            filter: drop-shadow(0 0 10px rgba(0, 232, 122, 0.8));
          }
        }

        .guest-premium-tick-path {
          stroke-dasharray: 35;
          stroke-dashoffset: 35;
          animation: guest-tick-draw 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes guest-tick-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        .guest-splash-title-wrap {
          filter: drop-shadow(0 2px 20px rgba(0, 232, 122, 0.15));
          animation: guest-title-enter 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both;
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
          padding-left: 20px;
          padding-right: 20px;
          overflow: visible;
        }

        @keyframes guest-title-enter {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .guest-splash-title {
          margin: 0 0 6px 0;
          padding: 0;
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
          font-family: 'Syne', system-ui, sans-serif;
          font-weight: 900;
          font-size: clamp(28px, 8vw, 36px);
          letter-spacing: 2px;
          text-align: center;
          line-height: 1.1;
          white-space: nowrap;
          color: transparent;
          background: linear-gradient(180deg, #ffffff 0%, rgba(255, 255, 255, 0.75) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .guest-splash-tagline {
          margin: 0;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 400;
          font-style: italic;
          color: #00e87a;
          text-align: center;
          letter-spacing: 0.3px;
          margin-bottom: 24px;
          animation: guest-fade-in 0.5s ease-out 0.7s both;
        }

        @keyframes guest-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .guest-splash-features {
          margin-top: 0;
          flex-shrink: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        .guest-splash-section-label-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .guest-splash-section-label-row::before,
        .guest-splash-section-label-row::after {
          content: '';
          width: 30px;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .guest-splash-section-label {
          margin: 0;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          text-align: center;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        .guest-splash-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          width: 100%;
        }

        .guest-splash-card {
          position: relative;
          overflow: hidden;
          border-radius: 18px;
          padding: 14px 12px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          transition: transform 0.15s ease, background 0.15s ease;
          animation: guest-card-enter 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: var(--guest-card-delay, 0.8s);
        }

        .guest-splash-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 60px;
          height: 60px;
          background: radial-gradient(circle at top left, rgba(255, 255, 255, 0.06), transparent 70%);
          pointer-events: none;
        }

        @keyframes guest-card-enter {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .guest-splash-card:active {
          transform: scale(0.97);
          background: rgba(255, 255, 255, 0.07);
        }
        @media (hover: hover) {
          .guest-splash-card:hover {
            transform: scale(0.97);
            background: rgba(255, 255, 255, 0.07);
          }
        }

        .guest-splash-card-icon {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .guest-splash-card-icon::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 12px;
          background: var(--card-glow, rgba(0, 232, 122, 0.4));
          opacity: 0.3;
          filter: blur(6px);
          z-index: -1;
          pointer-events: none;
        }

        .guest-splash-card-icon .material-symbols-outlined {
          font-size: 20px !important;
          font-variation-settings: 'FILL' 0, 'wght' 500;
        }

        .guest-splash-card-title {
          margin: 10px 0 0 0;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          line-height: 1.2;
        }

        .guest-splash-card-desc {
          margin: 0;
          margin-top: 4px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          line-height: 1.5;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.45);
        }

        .guest-splash-trust {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
          margin-bottom: 14px;
          flex-shrink: 0;
          animation: guest-fade-in 0.5s ease-out 1.4s both;
        }

        .guest-splash-trust-badge {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 500;
          color: rgba(0, 232, 122, 0.8);
          padding: 5px 10px;
          border-radius: 20px;
          background: rgba(0, 232, 122, 0.07);
          border: 1px solid rgba(0, 232, 122, 0.15);
          white-space: nowrap;
        }

        .guest-splash-footer {
          flex-shrink: 0;
          padding-top: 4px;
        }

        .guest-splash-cta {
          position: relative;
          width: 100%;
          height: 54px;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          overflow: hidden;
          background: linear-gradient(135deg, #00e87a 0%, #00d46e 50%, #00b85e 100%);
          color: #000000;
          box-shadow:
            0 8px 32px rgba(0, 232, 122, 0.4),
            0 2px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transition: transform 0.12s ease, box-shadow 0.12s ease;
          animation: guest-cta-enter 0.55s ease-out 1.5s both;
        }

        .guest-splash-cta::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
          animation: guest-shimmer 3s ease 2s infinite;
          pointer-events: none;
        }

        @keyframes guest-shimmer {
          0% {
            left: -100%;
          }
          40%,
          100% {
            left: 160%;
          }
        }

        @keyframes guest-cta-enter {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .guest-splash-cta:active {
          transform: scale(0.97);
          box-shadow: 0 4px 16px rgba(0, 232, 122, 0.3);
        }

        .guest-splash-cta-label {
          position: relative;
          z-index: 1;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.2px;
          color: #000000;
        }

        .guest-splash-hint {
          text-align: center;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
          margin: 10px 0 0 0;
          animation: guest-fade-in 0.45s ease-out 1.7s both;
        }

        .guest-splash-progress {
          flex-shrink: 0;
          height: 3px;
          margin-top: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
          position: relative;
          z-index: 2;
        }
        .guest-splash-progress-fill {
          height: 100%;
          width: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #059669, #00e87a, #6ee7b7);
          transform-origin: left;
          transform: scaleX(0);
          animation: guest-splash-progress ${GUEST_SPLASH_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes guest-splash-progress {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }

        @media (max-height: 720px) {
          .guest-splash-grid {
            gap: 8px;
          }
          .guest-splash-card {
            padding: 12px 10px;
          }
          .guest-splash-card-title {
            margin-top: 8px;
          }
          .guest-splash-features {
            margin-top: 0;
          }
          .guest-splash-trust {
            margin-top: 10px;
            margin-bottom: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .guest-splash-bg-radial,
          .guest-premium-icon-glow-base,
          .guest-premium-tick-svg,
          .guest-premium-tick-path,
          .guest-premium-icon-svg-wrap,
          .guest-splash-title-wrap,
          .guest-splash-tagline,
          .guest-splash-card,
          .guest-splash-trust,
          .guest-splash-cta,
          .guest-splash-hint,
          .guest-splash-particle,
          .guest-splash-cta::after {
            animation: none !important;
          }
          .guest-splash-title-wrap,
          .guest-splash-tagline,
          .guest-splash-card,
          .guest-splash-trust,
          .guest-splash-cta,
          .guest-splash-hint {
            opacity: 1;
            transform: none;
          }
          .guest-premium-tick-path {
            stroke-dashoffset: 0 !important;
          }
          .guest-splash-progress-fill {
            animation: none;
            transform: scaleX(1);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default GuestSplash;
