// src/pages/ComingSoon.tsx
import React from 'react';

const GooglePlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.22 0.454C0.972 0.706 0.828 1.097 0.828 1.608V22.392C0.828 22.903 0.972 23.294 1.22 23.546L1.284 23.608L12.652 12.24V11.76L1.284 0.392L1.22 0.454Z" fill="url(#gp1)"/>
    <path d="M16.46 16.08L12.652 12.24V11.76L16.462 7.92L16.544 7.966L21.094 10.566C22.392 11.302 22.392 12.498 21.094 13.236L16.544 15.834L16.46 16.08Z" fill="url(#gp2)"/>
    <path d="M16.544 15.834L12.652 12L1.22 23.546C1.638 23.988 2.33 24.044 3.108 23.608L16.544 15.834Z" fill="url(#gp3)"/>
    <path d="M16.544 8.166L3.108 0.392C2.33 -0.044 1.638 0.012 1.22 0.454L12.652 12L16.544 8.166Z" fill="url(#gp4)"/>
    <defs>
      <linearGradient id="gp1" x1="11.616" y1="1.483" x2="-2.744" y2="15.843" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00A0FF"/>
        <stop offset="0.007" stopColor="#00A1FF"/>
        <stop offset="0.26" stopColor="#00BEFF"/>
        <stop offset="0.512" stopColor="#00D2FF"/>
        <stop offset="0.76" stopColor="#00DFFF"/>
        <stop offset="1" stopColor="#00E3FF"/>
      </linearGradient>
      <linearGradient id="gp2" x1="23.034" y1="12" x2="0.558" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFE000"/>
        <stop offset="0.409" stopColor="#FFBD00"/>
        <stop offset="0.775" stopColor="#FFA500"/>
        <stop offset="1" stopColor="#FF9C00"/>
      </linearGradient>
      <linearGradient id="gp3" x1="14.296" y1="14.254" x2="-4.868" y2="33.418" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF3A44"/>
        <stop offset="1" stopColor="#C31162"/>
      </linearGradient>
      <linearGradient id="gp4" x1="-1.786" y1="-5.162" x2="7.396" y2="4.02" gradientUnits="userSpaceOnUse">
        <stop stopColor="#32A071"/>
        <stop offset="0.069" stopColor="#2DA771"/>
        <stop offset="0.476" stopColor="#15CF74"/>
        <stop offset="0.801" stopColor="#06E775"/>
        <stop offset="1" stopColor="#00F076"/>
      </linearGradient>
    </defs>
  </svg>
);

const features = [
  {
    icon: '🔥',
    title: 'Habit Streaks',
    desc: 'Build daily habits and maintain streaks that push you further every day. Your consistency becomes your competitive edge.',
  },
  {
    icon: '✅',
    title: 'Smart Task Manager',
    desc: 'Priority-based task management with High, Medium, and Low tiers. Never lose track of what matters most.',
  },
  {
    icon: '🎯',
    title: 'Goal Tracking',
    desc: 'Set ambitious goals, break them into milestones, and watch your progress bar move. No goal too big.',
  },
  {
    icon: '⚡',
    title: 'Productivity Score',
    desc: 'A daily score calculated from your habits, tasks, and goals. Know exactly how hard you\'re working.',
  },
  {
    icon: '📊',
    title: 'Deep Analytics',
    desc: 'Heatmaps, weekly patterns, category radars, and insight trends — know yourself like never before.',
  },
  {
    icon: '🏆',
    title: 'Leaderboard',
    desc: 'Compete with others, climb the ranks, and let friendly rivalry fuel your discipline.',
  },
];

const ComingSoon: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#ffffff',
      overflowX: 'hidden',
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .hero-title {
          animation: fadeUp 0.9s ease both;
        }
        .hero-sub {
          animation: fadeUp 0.9s 0.15s ease both;
        }
        .hero-cta {
          animation: fadeUp 0.9s 0.3s ease both;
        }
        .hero-logo {
          animation: float 5s ease-in-out infinite;
        }
        .feature-card {
          transition: transform 0.25s ease, border-color 0.25s ease;
        }
        .feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(0,232,122,0.3) !important;
        }
        .play-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .play-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 0 60px rgba(255,193,7,0.5), 0 0 120px rgba(255,193,7,0.2) !important;
        }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            #FFD700 0%,
            #FFF8DC 40%,
            #FFD700 60%,
            #FFA000 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/stayhardy-icon.svg" alt="StayHardy" width={32} height={32} style={{ borderRadius: '8px' }} />
          <span style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.3px' }}>StayHardy</span>
        </div>
        <a
          href="https://play.google.com/store/apps/details?id=com.stayhardy.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            background: 'rgba(255,193,7,0.12)',
            border: '1px solid rgba(255,193,7,0.4)',
            borderRadius: '100px',
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#FFD700',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          <GooglePlayIcon />
          Download Free
        </a>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 80px',
        position: 'relative',
        textAlign: 'center',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '30%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px', height: '700px',
          background: 'radial-gradient(circle, rgba(0,232,122,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(255,193,7,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* App icon with pulse ring */}
        <div className="hero-logo" style={{ position: 'relative', marginBottom: '32px' }}>
          <div style={{
            position: 'absolute', inset: '-12px',
            borderRadius: '36px',
            border: '1px solid rgba(0,232,122,0.2)',
            animation: 'pulse-ring 2.5s ease-out infinite',
          }} />
          <img
            src="/stayhardy-icon.svg"
            alt="StayHardy"
            width={96}
            height={96}
            style={{ borderRadius: '28px', display: 'block', boxShadow: '0 0 60px rgba(0,232,122,0.25)' }}
          />
        </div>

        {/* Headline */}
        <h1 className="hero-title" style={{
          fontSize: 'clamp(40px, 7vw, 80px)',
          fontWeight: 900,
          margin: '0 0 20px',
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
          maxWidth: '820px',
        }}>
          Your discipline,{' '}
          <span style={{
            background: 'linear-gradient(135deg, #00E87A 0%, #00b85e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            tracked.
          </span>
          <br />Your potential,{' '}
          <span style={{
            background: 'linear-gradient(135deg, #00E87A 0%, #00b85e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            unleashed.
          </span>
        </h1>

        {/* Sub */}
        <p className="hero-sub" style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          color: 'rgba(255,255,255,0.5)',
          maxWidth: '560px',
          lineHeight: 1.7,
          margin: '0 0 48px',
        }}>
          StayHardy turns your daily habits, tasks, and goals into a productivity machine.
          Build streaks, crush targets, and rise on the leaderboard — one day at a time.
        </p>

        {/* Google Play CTA — GOLD HIGHLIGHT */}
        <div className="hero-cta">
          <a
            href="https://play.google.com/store/apps/details?id=com.stayhardy.app"
            target="_blank"
            rel="noopener noreferrer"
            className="play-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '14px',
              background: 'linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)',
              borderRadius: '18px',
              padding: '18px 36px',
              textDecoration: 'none',
              boxShadow: '0 0 40px rgba(255,193,7,0.35), 0 0 80px rgba(255,193,7,0.15), inset 0 1px 0 rgba(255,255,255,0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />
            <GooglePlayIcon />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(0,0,0,0.65)', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1 }}>
                Get it on
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#000000', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                Google Play
              </div>
            </div>
            <div style={{
              marginLeft: '8px',
              background: 'rgba(0,0,0,0.12)',
              borderRadius: '100px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#000',
              letterSpacing: '0.05em',
            }}>
              FREE
            </div>
          </a>

          <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
            Available now on Android · iOS coming soon
          </p>
        </div>
      </section>


      {/* ── FEATURES GRID ───────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px, 8vw, 120px) clamp(16px, 5vw, 80px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(0,232,122,0.1)',
            border: '1px solid rgba(0,232,122,0.2)',
            borderRadius: '100px',
            padding: '5px 16px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#00E87A',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}>
            Everything you need
          </div>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 48px)',
            fontWeight: 900,
            margin: 0,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
          }}>
            One app. Total control<br />over your daily life.
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          maxWidth: '1080px',
          margin: '0 auto',
        }}>
          {features.map(f => (
            <div
              key={f.title}
              className="feature-card"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '24px',
                padding: '28px',
              }}
            >
              <div style={{
                width: '52px', height: '52px',
                borderRadius: '16px',
                background: 'rgba(0,232,122,0.1)',
                border: '1px solid rgba(0,232,122,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '18px',
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.2px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.65 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURE CALLOUT 1 — Habit Streaks ──────────────── */}
      <section style={{
        padding: 'clamp(48px, 6vw, 96px) clamp(16px, 5vw, 80px)',
        background: 'rgba(0,232,122,0.03)',
        borderTop: '1px solid rgba(0,232,122,0.08)',
        borderBottom: '1px solid rgba(0,232,122,0.08)',
      }}>
        <div style={{
          maxWidth: '1080px', margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '48px',
          alignItems: 'center',
        }}>
          <div>
            <div style={{
              display: 'inline-block',
              background: 'rgba(0,232,122,0.1)',
              border: '1px solid rgba(0,232,122,0.2)',
              borderRadius: '100px',
              padding: '5px 16px',
              fontSize: '11px', fontWeight: 700,
              color: '#00E87A', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: '20px',
            }}>
              Habit Engine
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
              Streaks that keep you<br />coming back every day.
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 24px' }}>
              Schedule habits for specific days, track your completion rate, and protect your streak.
              The habit heatmap shows exactly where you've been consistent — and where to improve.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['Daily scheduling with flexible day selection', 'Visual streak heatmap — 30D, 90D, 1Y', 'Habit categories: Health, Mindset, Comeback & more'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.65)' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00E87A', flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(0,232,122,0.15)',
            borderRadius: '28px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Your Streak
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '48px' }}>🔥</span>
              <div>
                <div style={{ fontSize: '52px', fontWeight: 900, lineHeight: 1, color: '#fff' }}>47</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.08em' }}>DAYS CURRENT</div>
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(14, 1fr)',
              gap: '3px',
              marginTop: '8px',
            }}>
              {Array.from({ length: 42 }).map((_, i) => {
                const intensity = i < 5 ? 0 : i < 15 ? 1 : i < 28 ? 2 : i < 35 ? 3 : 4;
                const colors = ['rgba(255,255,255,0.05)', 'rgba(0,232,122,0.15)', 'rgba(0,232,122,0.35)', 'rgba(0,232,122,0.6)', '#00E87A'];
                return (
                  <div key={i} style={{ aspectRatio: '1', borderRadius: '2px', background: colors[intensity] }} />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE CALLOUT 2 — Productivity Score ─────────── */}
      <section style={{ padding: 'clamp(48px, 6vw, 96px) clamp(16px, 5vw, 80px)' }}>
        <div style={{
          maxWidth: '1080px', margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '48px',
          alignItems: 'center',
        }}>
          {/* Visual */}
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '28px',
            padding: '32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '20px' }}>
              Today's Score
            </div>
            <div style={{
              width: '140px', height: '140px',
              borderRadius: '50%',
              background: 'conic-gradient(#00E87A 0deg, #00E87A 270deg, rgba(255,255,255,0.07) 270deg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 40px rgba(0,232,122,0.2)',
              position: 'relative',
            }}>
              <div style={{
                width: '110px', height: '110px',
                borderRadius: '50%',
                background: '#000',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: '36px', fontWeight: 900, lineHeight: 1 }}>75%</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.1em', marginTop: '2px' }}>SCORE</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              {[{ label: 'Tasks', v: '67%' }, { label: 'Habits', v: '83%' }, { label: 'Goals', v: '75%' }].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#00E87A' }}>{s.v}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{
              display: 'inline-block',
              background: 'rgba(124,77,255,0.1)',
              border: '1px solid rgba(124,77,255,0.25)',
              borderRadius: '100px',
              padding: '5px 16px',
              fontSize: '11px', fontWeight: 700,
              color: '#A855F7', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: '20px',
            }}>
              Productivity Score
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
              One number tells you<br />how hard you worked today.
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 24px' }}>
              Your Productivity Score combines tasks completed, habits done, and goals progressed into
              a single daily metric. Watch it grow as you show up consistently.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['Calculated from tasks, habits & goals daily', 'Historical trend over 7D, 30D, 90D windows', 'Category radar to spot your strengths & gaps'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.65)' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A855F7', flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(80px, 10vw, 140px) 24px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(255,193,7,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <img
          src="/stayhardy-icon.svg"
          alt="StayHardy"
          width={72}
          height={72}
          style={{ borderRadius: '20px', marginBottom: '28px', boxShadow: '0 0 40px rgba(0,232,122,0.2)' }}
        />

        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 60px)',
          fontWeight: 900,
          margin: '0 0 16px',
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
        }}>
          Ready to{' '}
          <span className="shimmer-text">StayHardy?</span>
        </h2>

        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', maxWidth: '440px', margin: '0 auto 48px', lineHeight: 1.7 }}>
          Join thousands of warriors building unstoppable habits.
          Free to download. No excuses.
        </p>

        <a
          href="https://play.google.com/store/apps/details?id=com.stayhardy.app"
          target="_blank"
          rel="noopener noreferrer"
          className="play-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '14px',
            background: 'linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)',
            borderRadius: '18px',
            padding: '20px 40px',
            textDecoration: 'none',
            boxShadow: '0 0 50px rgba(255,193,7,0.4), 0 0 100px rgba(255,193,7,0.15), inset 0 1px 0 rgba(255,255,255,0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <GooglePlayIcon />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(0,0,0,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1 }}>
              Download free on
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#000', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              Google Play
            </div>
          </div>
        </a>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/stayhardy-icon.svg" alt="StayHardy" width={22} height={22} style={{ borderRadius: '5px' }} />
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
            © {new Date().getFullYear()} StayHardy
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
          Built for warriors who never quit.
        </p>
      </footer>
    </div>
  );
};

export default ComingSoon;
