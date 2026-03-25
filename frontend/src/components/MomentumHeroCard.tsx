import React, { useEffect, useState } from 'react';
import { TAGLINES, QUOTES, getAnimal } from '../utils/momentum';

interface MomentumHeroCardProps {
  overallScore: number; // 0–100, avg of all categories
}

const MomentumHeroCard: React.FC<MomentumHeroCardProps> = ({ overallScore }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [arcOffset, setArcOffset] = useState(251.3); // PI * r (r=80) 
  const [pillOpacity, setPillOpacity] = useState(0);
  const [cardOpacity, setCardOpacity] = useState(0);
  
  const radius = 80;
  const circumference = Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, overallScore));
  
  // Animation Sequence
  useEffect(() => {
    // 1. Card fade in
    setTimeout(() => setCardOpacity(1), 100);

    // 2. Arc drawing + Score count up
    const targetOffset = circumference - (safeScore / 100) * circumference;
    setTimeout(() => {
      setArcOffset(targetOffset);
      
      // Count up score
      const duration = 1200;
      const startTime = performance.now();
      
      const animateCount = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease out
        setDisplayScore(Math.round(safeScore * eased));
        if (progress < 1) requestAnimationFrame(animateCount);
      };
      requestAnimationFrame(animateCount);
    }, 400);

    // 3. Pill + Quote fade in
    setTimeout(() => setPillOpacity(1), 1800);
  }, [safeScore, circumference]);

  const animal = getAnimal(safeScore);
  const tagline = TAGLINES[Math.floor(safeScore)];
  const quote = QUOTES[Math.floor(safeScore)];

  // Calculate tip point coordinates for the glowing head
  // 180 deg is left (start), 0 deg is right (end)
  // Angle = 180 - (progress * 180)
  const angleDeg = 180 - (safeScore * 180 / 100);
  const angleRad = (angleDeg * Math.PI) / 180;
  // cx=100, cy=100
  const tipX = 100 + radius * Math.cos(angleRad);
  const tipY = 100 - radius * Math.sin(angleRad); // SVG y is down

  return (
    <div style={{
      background: 'rgba(18, 18, 18, 0.85)',
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
      borderRadius: '28px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderTop: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      padding: '32px 24px 28px',
      margin: '16px',
      width: 'calc(100% - 32px)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      opacity: cardOpacity,
      transition: 'opacity 0.4s ease-out',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @keyframes headPulse {
          0%, 100% { r: 6; opacity: 1; }
          50% { r: 8; opacity: 0.8; }
        }
        .glowing-head {
          animation: headPulse 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* MOMENTUM ARCH */}
      <div style={{ position: 'relative', width: '200px', height: '110px', marginBottom: '8px' }}>
        <svg width="200" height="110" viewBox="0 0 200 110">
          <defs>
            <linearGradient id="momentumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#004D40" />
              <stop offset="100%" stopColor="#00E87A" />
            </linearGradient>
          </defs>

          {/* TRACK */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* FILL */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#momentumGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={arcOffset}
            style={{
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          />

          {/* GLOWING HEAD */}
          {cardOpacity === 1 && (
            <circle
              className="glowing-head"
              cx={tipX}
              cy={tipY}
              r="6"
              fill="#00E87A"
              style={{
                filter: 'drop-shadow(0 0 8px #00E87A) drop-shadow(0 0 16px #00E87A80)',
                transition: 'cx 1.5s cubic-bezier(0.34, 1.56, 0.64, 1), cy 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            />
          )}
        </svg>

        {/* CENTER TEXT */}
        <div style={{
          position: 'absolute',
          top: '55px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '52px',
            fontWeight: '900',
            color: '#FFFFFF',
            letterSpacing: '-2px',
            textShadow: '0 0 30px rgba(0, 232, 122, 0.3)',
            marginBottom: '-5px'
          }}>
            {displayScore}
          </div>
          <div style={{
            fontSize: '10px',
            fontWeight: '900',
            color: 'rgba(255, 255, 255, 0.3)',
            letterSpacing: '0.2em',
            margin: 0
          }}>
            SCORE
          </div>
        </div>
      </div>

      {/* MOMENTUM PILL */}
      <div style={{
        opacity: pillOpacity,
        transform: `translateY(${pillOpacity === 1 ? 0 : 10}px)`,
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 105, 180, 0.4)',
          borderRadius: '999px',
          padding: '6px 16px',
          boxShadow: '0 0 12px rgba(255, 105, 180, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '14px' }}>{animal}</span>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '2px',
            color: '#FFFFFF',
            textTransform: 'uppercase'
          }}>
            {tagline}
          </span>
        </div>

        {/* SUBTEXT */}
        <p style={{
          color: '#A0A0A0',
          fontSize: '13px',
          fontWeight: '400',
          textAlign: 'center',
          margin: 0,
          maxWidth: '240px',
          lineHeight: '1.4',
          fontStyle: 'italic'
        }}>
          "{quote}"
        </p>
      </div>
    </div>
  );
};

export default MomentumHeroCard;
