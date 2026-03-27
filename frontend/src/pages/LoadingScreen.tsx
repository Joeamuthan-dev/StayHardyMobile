import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SplashScreen } from '@capacitor/splash-screen';
import { supabase } from '../supabase';
import { storage } from '../utils/storage';

const LoadingScreen = () => {
  const navigate = useNavigate();
  const [fillProgress, setFillProgress] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [phase, setPhase] = useState<'fill' | 'title' | 'tagline' | 'bars'>('fill');

  const tagline = 'The 1% starts here.';

  // Aesthetic Animations (User Logic)
  useEffect(() => {
    // Phase 1: Fill 1% symbol:
    let fillVal = 0;
    const fillTimer = setInterval(() => {
      fillVal += 2;
      setFillProgress(fillVal);
      if (fillVal >= 100) {
        clearInterval(fillTimer);
        setPhase('title');

        // Phase 2: Type tagline:
        setTimeout(() => {
          setPhase('tagline');
          let i = 0;
          const typeTimer = setInterval(() => {
            setTypedText(tagline.slice(0, i + 1));
            i++;
            if (i >= tagline.length) {
              clearInterval(typeTimer);
              setPhase('bars');
            }
          }, 60);
        }, 400);
      }
    }, 20);

    // Cursor blink:
    const cursorTimer = setInterval(() => setShowCursor((p) => !p), 500);

    return () => {
      clearInterval(fillTimer);
      clearInterval(cursorTimer);
    };
  }, []);

  // Boot Sequence Logic (Navigation & Splash Hiding)
  useEffect(() => {
    const init = async () => {
      // 1. Instantly kill native splash
      await SplashScreen.hide().catch(() => {});
      
      const startTime = Date.now();

      try {
        // Add small delay to let Supabase restore session or for branding
        const elapsed = Date.now() - startTime;
        const brandDelay = Math.max(2500 - elapsed, 0); 
        await new Promise((resolve) => setTimeout(resolve, brandDelay));

        // Get current Supabase session (Primary source of truth)
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.user) {
          // Has valid session → home
          await storage.remove('pending_verification_email');
          navigate('/home', { replace: true });
          return;
        }

        // No session → check local storage
        const savedLogin = await storage.get('user_session');

        if (savedLogin && savedLogin !== '') {
          // Has local session but no Supabase session
          // = session expired or logged out
          // Clear stale local session
          await storage.remove('user_session');
          navigate('/login', { replace: true });
          return;
        }

        // No session anywhere → onboarding or login
        const onboardingComplete =
          await storage.get('onboarding_complete');

        if (onboardingComplete === 'true') {
          navigate('/login', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      } catch (err) {
        console.error('Boot failure:', err);
        navigate('/onboarding', { replace: true });
      }
    };

    // Show loading for minimum duration then route
    const timer = setTimeout(init, 500); 
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes vignetteAnim {
          0%,100% { opacity: 1 }
          50% { opacity: 0.8 }
        }
        @keyframes auraHeartbeat {
          0%,100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.7;
          }
        }
        @keyframes titleRimLight {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes taglineSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bar1Pulse {
          0%,100% { height: 8px; opacity: 0.3 }
          33% { height: 20px; opacity: 1 }
        }
        @keyframes bar2Pulse {
          0%,100% { height: 8px; opacity: 0.3 }
          50% { height: 28px; opacity: 1 }
        }
        @keyframes bar3Pulse {
          0%,100% { height: 8px; opacity: 0.3 }
          66% { height: 20px; opacity: 1 }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%) }
          100% { transform: translateY(100vh) }
        }
        @keyframes fillGlow {
          0%,100% {
            filter: drop-shadow(0 0 8px rgba(0,232,122,0.6));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(0,232,122,1)) drop-shadow(0 0 40px rgba(0,232,122,0.4));
          }
        }
      `}</style>

      {/* Vignette corners */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Scanline — subtle OLED feel */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Moving scanline */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '60px',
          background: 'linear-gradient(transparent, rgba(0,232,122,0.015), transparent)',
          animation: 'scanline 4s linear infinite',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0',
        }}
      >
        {/* POWER AURA — radial glow */}
        <div
          style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,232,122,0.08) 0%, transparent 70%)',
            animation: 'auraHeartbeat 2s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        {/* CENTERPIECE — "1%" symbol */}
        <div
          style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            marginBottom: '24px',
            animation: 'fillGlow 2s ease-in-out infinite',
          }}
        >
          <svg viewBox="0 0 120 120" width="120" height="120">
            <defs>
              {/* Fill gradient */}
              <linearGradient id="fillGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#00E87A" />
                <stop offset="100%" stopColor="#00FF88" />
              </linearGradient>

              {/* Clip for fill progress */}
              <clipPath id="fillClip">
                <rect
                  x="0"
                  y={120 - (fillProgress / 100) * 120}
                  width="120"
                  height={(fillProgress / 100) * 120}
                  style={{ transition: 'y 0.05s linear, height 0.05s linear' }}
                />
              </clipPath>

              {/* Glow filter */}
              <filter id="textGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outline text */}
            <text
              x="60"
              y="80"
              textAnchor="middle"
              style={{
                fontSize: '64px',
                fontWeight: '900',
                fill: 'none',
                stroke: 'rgba(0,232,122,0.2)',
                strokeWidth: '1',
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '-2px',
              }}
            >
              1%
            </text>

            {/* Filled text */}
            <text
              x="60"
              y="80"
              textAnchor="middle"
              clipPath="url(#fillClip)"
              style={{
                fontSize: '64px',
                fontWeight: '900',
                fill: 'url(#fillGrad)',
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '-2px',
                filter: 'url(#textGlow)',
              }}
            >
              1%
            </text>

            {/* Rim light edge */}
            <text
              x="60"
              y="80"
              textAnchor="middle"
              style={{
                fontSize: '64px',
                fontWeight: '900',
                fill: 'none',
                stroke: fillProgress >= 100 ? 'rgba(0,232,122,0.6)' : 'rgba(0,232,122,0.15)',
                strokeWidth: '0.5',
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '-2px',
                transition: 'stroke 0.5s ease',
              }}
            >
              1%
            </text>
          </svg>

          {/* Liquid fill shimmer line */}
          {fillProgress < 100 && fillProgress > 0 && (
            <div
              style={{
                position: 'absolute',
                left: '10px',
                right: '10px',
                top: `${120 - (fillProgress / 100) * 120}px`,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, rgba(0,232,122,0.8), transparent)',
                borderRadius: '2px',
                transition: 'top 0.05s linear',
              }}
            />
          )}
        </div>

        {/* STAY HARDY title */}
        <div
          style={{
            opacity: phase === 'fill' ? 0 : 1,
            animation: phase !== 'fill' ? 'titleRimLight 0.6s ease' : 'none',
            transition: 'opacity 0.4s ease',
            marginBottom: '8px',
          }}
        >
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '900',
              color: '#FFFFFF',
              margin: 0,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textShadow: '0 0 1px #FFFFFF, 0 0 8px rgba(0,232,122,0.5), 0 0 16px rgba(0,232,122,0.2)',
              WebkitTextStroke: '0.5px rgba(0,232,122,0.4)',
            }}
          >
            Stay Hardy
          </h1>
        </div>

        {/* TAGLINE — typewriter */}
        <div style={{ height: '20px', display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
          {phase === 'tagline' || phase === 'bars' ? (
            <p
              style={{
                fontSize: '12px',
                fontWeight: '400',
                color: '#00E87A',
                margin: 0,
                fontFamily: 'monospace',
                letterSpacing: '0.08em',
                animation: 'taglineSlide 0.4s ease',
              }}
            >
              {typedText}
              {phase === 'tagline' && showCursor && (
                <span style={{ color: '#00E87A', opacity: showCursor ? 1 : 0, fontWeight: '300' }}>▌</span>
              )}
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: 'transparent', margin: 0, fontFamily: 'monospace' }}>&nbsp;</p>
          )}
        </div>

        {/* SYNCING BARS indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '5px',
            height: '32px',
            opacity: phase === 'bars' ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          {[
            { anim: 'bar1Pulse 1s ease-in-out infinite 0s' },
            { anim: 'bar2Pulse 1s ease-in-out infinite 0.15s' },
            { anim: 'bar3Pulse 1s ease-in-out infinite 0.3s' },
            { anim: 'bar2Pulse 1s ease-in-out infinite 0.45s' },
            { anim: 'bar1Pulse 1s ease-in-out infinite 0.6s' },
          ].map((b, i) => (
            <div
              key={i}
              style={{
                width: '4px',
                borderRadius: '4px',
                background: '#00E87A',
                boxShadow: '0 0 8px rgba(0,232,122,0.6)',
                animation: b.anim,
                alignSelf: 'flex-end',
              }}
            />
          ))}
        </div>

        {/* SYNCING label */}
        {phase === 'bars' && (
          <p
            style={{
              fontSize: '9px',
              fontWeight: '700',
              color: 'rgba(0,232,122,0.4)',
              letterSpacing: '0.2em',
              margin: '8px 0 0 0',
              fontFamily: 'monospace',
            }}
          >
            INITIALIZING...
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
