import React, { useEffect, useState } from 'react';
import { getAnimal, getTagline, getQuote } from '../utils/momentum';

interface CategoryInsightCardProps {
  categoryName: string;
  score: number; // 0-100
}

const getTierClass = (score: number): string => {
  if (score <= 9)  return "snail-tier";
  if (score <= 19) return "sloth-tier";
  if (score <= 29) return "tortoise-tier";
  if (score <= 39) return "crab-tier";
  if (score <= 49) return "dog-tier";
  if (score <= 59) return "deer-tier";
  if (score <= 69) return "wolf-tier";
  if (score <= 79) return "cheetah-tier";
  if (score <= 89) return "eagle-tier";
  if (score <= 99) return "horse-tier";
  return "dragon-tier";
};

const CategoryInsightCard: React.FC<CategoryInsightCardProps> = ({ categoryName, score }) => {
  const [offset, setOffset] = useState(251); // 2 * PI * r (r=40) => ~251
  
  const safeScore = Math.max(0, Math.min(100, score));
  const [tagline] = useState(() => getTagline(safeScore));
  const [quote] = useState(() => getQuote(safeScore));

  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const progressOffset = circumference - (safeScore / 100) * circumference;
    const timer = setTimeout(() => {
      setOffset(progressOffset);
    }, 100);
    return () => clearTimeout(timer);
  }, [safeScore, circumference]);

  const animal = getAnimal(safeScore);
  const tierClass = getTierClass(safeScore);

  return (
    <div style={{
      background: '#0D0D0D',
      borderRadius: '20px',
      padding: '16px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      borderLeft: '1px solid rgba(255,255,255,0.05)',
      boxShadow: '4px 4px 12px rgba(0,0,0,0.9), -1px -1px 4px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.03)',
      position: 'relative',
      minHeight: '220px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        
        @keyframes snail-slow {
          0%, 100% { transform: translateX(-2px); }
          50% { transform: translateX(2px); }
        }
        @keyframes sloth-droop {
          0%, 100% { transform: translateY(0px) rotate(2deg); }
          50% { transform: translateY(4px) rotate(-2deg); }
        }
        @keyframes tortoise-nod {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes crab-shuffle {
          0%, 100% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
        }
        @keyframes dog-bounce {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-8px) scaleY(0.9); }
        }
        @keyframes deer-leap {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-12px) translateX(4px); }
        }
        @keyframes wolf-prowl {
          0%, 100% { transform: translateX(-4px) translateY(0); }
          50% { transform: translateX(4px) translateY(1px); }
        }
        @keyframes cheetah-dart {
          0%, 100% { transform: translateX(-10px) skewX(5deg); }
          50% { transform: translateX(10px) skewX(-5deg); }
        }
        @keyframes eagle-glide {
          0%, 100% { transform: translateY(0) rotate(-5deg) scale(1); }
          50% { transform: translateY(-10px) rotate(5deg) scale(1.1); }
        }
        @keyframes horse-gallop {
          0%   { transform: translateY(0px) rotate(-2deg); }
          25%  { transform: translateY(-6px) rotate(2deg); }
          50%  { transform: translateY(-2px) rotate(-1deg); }
          75%  { transform: translateY(-7px) rotate(3deg); }
          100% { transform: translateY(0px) rotate(-2deg); }
        }
        @keyframes dragon-epic {
          0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 0 10px #FF6B35); }
          50% { transform: translateY(-10px) scale(1.15); filter: drop-shadow(0 0 25px #FF0000); }
        }

        .snail-tier { animation: snail-slow 4s ease-in-out infinite; }
        .sloth-tier { animation: sloth-droop 3.5s ease-in-out infinite; }
        .tortoise-tier { animation: tortoise-nod 3s ease-in-out infinite; }
        .crab-tier { animation: crab-shuffle 2.5s ease-in-out infinite; }
        .dog-tier { animation: dog-bounce 2s ease-in-out infinite; }
        .deer-tier { animation: deer-leap 1.8s ease-in-out infinite; }
        .wolf-tier { animation: wolf-prowl 1.6s ease-in-out infinite; }
        .cheetah-tier { animation: cheetah-dart 1.2s ease-in-out infinite; }
        .eagle-tier { animation: eagle-glide 2s ease-in-out infinite; }
        .horse-tier { animation: horse-gallop 1s ease-in-out infinite; }
        .dragon-tier { animation: dragon-epic 1.5s ease-in-out infinite; }

        @keyframes rimLight {
          0%, 100% { filter: drop-shadow(0 0 4px #00E87A80); }
          50%       { filter: drop-shadow(0 0 10px #00E87Aff) drop-shadow(0 2px 6px #00E5FF60); }
        }
        .progress-glow {
          animation: rimLight 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* ICON WELL & PROGRESS */}
      <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="80" height="80" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle
            cx="40" cy="40" r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
          />
          <circle
            cx="40" cy="40" r={radius}
            fill="transparent"
            stroke={safeScore === 100 ? '#FF6B35' : '#00E87A'}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1.2s ease-out',
              filter: `drop-shadow(0 0 6px ${safeScore === 100 ? '#FF6B35' : '#00E87A'})`
            }}
          />
        </svg>

        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'radial-gradient(#050505, #111)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: safeScore === 100 
            ? '0 0 20px #FF6B35, 0 0 40px #FF000050, inset 3px 3px 8px rgba(0,0,0,0.95)'
            : 'inset 3px 3px 8px rgba(0,0,0,0.95), inset -1px -1px 4px rgba(255,255,255,0.03)',
          zIndex: 1
        }}>
          <span className={tierClass} style={{ fontSize: '32px' }}>{animal}</span>
        </div>

        {/* PERCENTAGE PILL */}
        <div style={{
          position: 'absolute',
          bottom: '-4px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${safeScore === 100 ? '#FF6B35' : 'rgba(0,232,122,0.3)'}`,
          borderRadius: '20px',
          padding: '2px 8px',
          color: safeScore === 100 ? '#FF6B35' : '#00E87A',
          fontSize: '11px',
          fontWeight: '700',
          fontFamily: 'monospace',
          zIndex: 2
        }}>
          {safeScore}%
        </div>
      </div>

      {/* TYPOGRAPHY */}
      <div style={{ width: '100%', textAlign: 'center' }}>
        <h3 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '20px',
          color: '#FFFFFF',
          margin: '0 0 8px 0',
          letterSpacing: '2px',
          textTransform: 'uppercase'
        }}>
          {categoryName}
        </h3>

        <div style={{ width: '40px', height: '1px', background: `rgba(${safeScore === 100 ? '255,107,53' : '0,232,122'},0.3)`, margin: '0 auto 8px auto' }} />

        <p style={{
          fontSize: '10px',
          fontWeight: '700',
          color: safeScore === 100 ? '#FF6B35' : '#00E87A',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          margin: '0 0 10px 0'
        }}>
          {tagline}
        </p>

        {/* QUOTE PANEL */}
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '10px',
          padding: '10px 8px',
          boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.8)',
          minHeight: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <p style={{
            fontSize: '11px',
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.6)',
            margin: 0,
            lineHeight: '1.3',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            "{quote}"
          </p>
        </div>
      </div>
    </div>
  );
};

export default CategoryInsightCard;
