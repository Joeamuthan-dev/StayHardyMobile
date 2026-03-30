// src/components/BadgePopup.tsx
import React, { useEffect, useRef, useState } from 'react';
import type { EarnedBadge } from '../hooks/useBadges';
import { BadgeIcon, drawBadgeOnCanvas } from './BadgeIcons';

interface Props {
  badge: EarnedBadge;
  userName: string;
  onDismiss: () => void;
}

async function buildShareCanvas(badge: EarnedBadge, userName: string): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0A1410');
  bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Glow behind icon
  const glow = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, 280);
  glow.addColorStop(0, badge.color.replace(')', ',0.2)').replace('rgb', 'rgba'));
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Top brand accent line
  ctx.fillStyle = '#00E87A';
  ctx.fillRect(0, 0, W, 8);

  // STAY HARDY wordmark
  ctx.font = 'bold 56px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = '#00E87A';
  ctx.textAlign = 'center';
  ctx.fillText('STAY HARDY', W / 2, 108);

  // Thin divider
  ctx.strokeStyle = 'rgba(0,232,122,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 140, 128);
  ctx.lineTo(W / 2 + 140, 128);
  ctx.stroke();

  // Badge SVG icon drawn on canvas
  await drawBadgeOnCanvas(ctx, badge.key, W / 2, H * 0.41, 240);

  // Badge name
  ctx.font = 'bold 76px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(badge.name, W / 2, H * 0.60);

  // Description (word-wrapped)
  ctx.font = '40px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  const words = badge.description.split(' ');
  let line = '';
  let lineY = H * 0.67;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > W * 0.76) {
      ctx.fillText(line, W / 2, lineY);
      line = word;
      lineY += 54;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, W / 2, lineY);

  // User name
  ctx.font = 'bold 48px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText(`— ${userName || 'Soldier'}`, W / 2, H * 0.80);

  // Bottom CTA bar
  ctx.fillStyle = 'rgba(0,232,122,0.07)';
  ctx.fillRect(0, H - 140, W, 140);
  ctx.strokeStyle = 'rgba(0,232,122,0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H - 140);
  ctx.lineTo(W, H - 140);
  ctx.stroke();

  ctx.font = 'bold 36px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('Build unbreakable habits  ·  stayhardy.app', W / 2, H - 64);

  return canvas;
}

const BadgePopup: React.FC<Props> = ({ badge, userName, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 280);
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const canvas = await buildShareCanvas(badge, userName);
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(new Error('canvas empty')), 'image/png')
      );
      const file = new File([blob], 'stayhardy-badge.png', { type: 'image/png' });
      const text = `I just earned the ${badge.name} badge on Stay Hardy!\n\n${badge.description}\n\n#StayHardy #Discipline #Habits`;

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else if (navigator.share) {
        await navigator.share({ text, url: 'https://stayhardy.app' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stayhardy-badge.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Share cancelled — ignore
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) dismiss(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 20000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        background: visible ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(14px)' : 'none',
        transition: 'background 0.28s ease, backdrop-filter 0.28s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '360px',
        background: 'linear-gradient(145deg, #0B1A12 0%, #0D0D0D 100%)',
        border: `1px solid ${badge.color}33`,
        borderRadius: '28px',
        overflow: 'hidden',
        boxShadow: `0 0 80px ${badge.color}22, 0 30px 60px rgba(0,0,0,0.6)`,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(40px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease',
      }}>
        {/* Colour accent bar matching badge tier */}
        <div style={{
          height: '4px',
          background: `linear-gradient(90deg, transparent, ${badge.color}, transparent)`,
        }} />

        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)',
          width: '280px', height: '280px', borderRadius: '50%',
          background: `radial-gradient(circle, ${badge.color}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ padding: '32px 24px 24px', textAlign: 'center', position: 'relative' }}>
          {/* SVG Badge icon — crisp on all devices */}
          <div style={{
            width: '88px', height: '88px', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${badge.color}14`,
            borderRadius: '50%',
            border: `1.5px solid ${badge.color}30`,
            boxShadow: `0 0 28px ${badge.color}30`,
            animation: 'badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both',
          }}>
            <BadgeIcon badgeKey={badge.key} size={52} />
          </div>

          {/* Tier label */}
          <div style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: '99px',
            background: `${badge.color}18`, border: `1px solid ${badge.color}30`,
            fontSize: '10px', fontWeight: '800', color: badge.color,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px',
          }}>
            Achievement Unlocked
          </div>

          {/* Badge name */}
          <h2 style={{
            margin: '0 0 8px', fontSize: '24px', fontWeight: '800',
            color: '#FFFFFF', fontFamily: 'Syne, sans-serif', lineHeight: 1.2,
          }}>
            {badge.name}
          </h2>

          {/* Description */}
          <p style={{
            margin: '0 0 28px', fontSize: '14px', color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.5,
          }}>
            {badge.description}
          </p>

          {/* Share */}
          <button
            onClick={handleShare}
            disabled={sharing}
            style={{
              width: '100%', padding: '14px', marginBottom: '10px',
              borderRadius: '14px', border: 'none', cursor: 'pointer',
              background: badge.color, color: '#000',
              fontSize: '15px', fontWeight: '800',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              WebkitTapHighlightColor: 'transparent',
              opacity: sharing ? 0.7 : 1, transition: 'opacity 0.15s',
            }}
          >
            {sharing ? 'Preparing...' : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"
                    stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Share to Instagram / WhatsApp
              </>
            )}
          </button>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            style={{
              width: '100%', padding: '14px',
              borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.55)', fontSize: '15px', fontWeight: '600',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Awesome, Keep Going!
          </button>
        </div>
      </div>

      <style>{`
        @keyframes badgePop {
          from { transform: scale(0.4); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default BadgePopup;
