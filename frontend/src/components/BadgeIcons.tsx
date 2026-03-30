// src/components/BadgeIcons.tsx
// Premium SVG badge icons — no emoji, crisp on all Android/iOS devices.
// Each icon: 24×24 viewBox, filled paths, unique brand color per tier.

import React from 'react';

export interface BadgeIconProps {
  size?: number;
  color?: string;        // override earned color
  locked?: boolean;      // renders in muted grey
}

const LOCKED_COLOR = 'rgba(255,255,255,0.18)';

// ─── 7-Day · FLAME ───────────────────────────────────────────────────────────
export const FlameIcon: React.FC<BadgeIconProps> = ({ size = 32, color = '#FF6B35', locked }) => {
  const c = locked ? LOCKED_COLOR : color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* outer flame */}
      <path fill={c}
        d="M12 2C12 2 7 8 7 14C7 18 9.2 22 12 22C14.8 22 17 18 17 14C17 10 14.5 7 12.8 5C12.8 7.5 11.5 9.5 9.8 11C10.2 7.5 12 2 12 2Z"
      />
      {/* inner glow teardrop */}
      <path fill={locked ? 'transparent' : 'rgba(255,255,255,0.35)'}
        d="M12 12C12 12 10 14 10 15.8C10 17 10.9 18 12 18C13.1 18 14 17 14 15.8C14 14 12 12 12 12Z"
      />
    </svg>
  );
};

// ─── 15-Day · BOLT ───────────────────────────────────────────────────────────
export const BoltIcon: React.FC<BadgeIconProps> = ({ size = 32, color = '#A78BFA', locked }) => {
  const c = locked ? LOCKED_COLOR : color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fill={c}
        d="M13 2L4 14H11L11 22L20 10H13L13 2Z"
      />
    </svg>
  );
};

// ─── 30-Day · TROPHY ─────────────────────────────────────────────────────────
export const TrophyIcon: React.FC<BadgeIconProps> = ({ size = 32, color = '#F59E0B', locked }) => {
  const c = locked ? LOCKED_COLOR : color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* cup body */}
      <path fill={c}
        d="M5 3H19V13C19 17.4 15.9 21 12 21C8.1 21 5 17.4 5 13V3Z"
      />
      {/* left handle */}
      <path fill={c}
        d="M5 6H3C1.9 6 1 6.9 1 8V10C1 11.1 1.9 12 3 12H5V6Z"
      />
      {/* right handle */}
      <path fill={c}
        d="M19 6H21C22.1 6 23 6.9 23 8V10C23 11.1 22.1 12 21 12H19V6Z"
      />
      {/* stand */}
      <rect fill={c} x="10" y="21" width="4" height="2" rx="0.5"/>
      {/* base */}
      <rect fill={c} x="7" y="22.5" width="10" height="1.5" rx="0.5"/>
      {/* star detail */}
      <path fill={locked ? 'transparent' : 'rgba(255,255,255,0.35)'}
        d="M12 8L12.9 10.7H15.7L13.5 12.3L14.3 15L12 13.4L9.7 15L10.5 12.3L8.3 10.7H11.1L12 8Z"
      />
    </svg>
  );
};

// ─── 50-Day · LIGHTNING ──────────────────────────────────────────────────────
export const LightningIcon: React.FC<BadgeIconProps> = ({ size = 32, color = '#60A5FA', locked }) => {
  const c = locked ? LOCKED_COLOR : color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* thick double bolt */}
      <path fill={c}
        d="M14.5 2L6 14H12L9.5 22L18 10H12L14.5 2Z"
      />
      <path fill={locked ? 'transparent' : 'rgba(255,255,255,0.3)'}
        d="M12.5 9H15.5L10.5 16H13L11.5 20L14 14.5H11.5L12.5 9Z"
      />
    </svg>
  );
};

// ─── 100-Day · CROWN ─────────────────────────────────────────────────────────
export const CrownIcon: React.FC<BadgeIconProps> = ({ size = 32, color = '#00E87A', locked }) => {
  const c = locked ? LOCKED_COLOR : color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* crown silhouette */}
      <path fill={c}
        d="M3 18L5 10L9 14L12 6L15 14L19 10L21 18H3Z"
      />
      {/* base band */}
      <rect fill={c} x="3" y="18" width="18" height="3" rx="1"/>
      {/* jewel dots */}
      <circle fill={locked ? 'transparent' : 'rgba(255,255,255,0.5)'} cx="12" cy="9" r="1.5"/>
      <circle fill={locked ? 'transparent' : 'rgba(255,255,255,0.3)'} cx="7" cy="13" r="1"/>
      <circle fill={locked ? 'transparent' : 'rgba(255,255,255,0.3)'} cx="17" cy="13" r="1"/>
    </svg>
  );
};

// ─── 150-Day · STAR ──────────────────────────────────────────────────────────
export const StarIcon: React.FC<BadgeIconProps> = ({ size = 32, color = '#F472B6', locked }) => {
  const c = locked ? LOCKED_COLOR : color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 6-pointed star (two overlapping triangles) */}
      <polygon fill={c}
        points="12,2 14.5,8 21,8 15.5,12 17.5,18.5 12,15 6.5,18.5 8.5,12 3,8 9.5,8"
      />
      {/* inner shine */}
      <polygon fill={locked ? 'transparent' : 'rgba(255,255,255,0.3)'}
        points="12,6 13.2,9.5 17,9.5 14,11.5 15.1,15 12,13 8.9,15 10,11.5 7,9.5 10.8,9.5"
      />
    </svg>
  );
};

// ─── 200-Day · SHIELD ────────────────────────────────────────────────────────
export const ShieldIcon: React.FC<BadgeIconProps> = ({ size = 32, color = '#FB923C', locked }) => {
  const c = locked ? LOCKED_COLOR : color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* shield body */}
      <path fill={c}
        d="M12 2L20 6V12C20 17.5 16.5 22 12 23C7.5 22 4 17.5 4 12V6L12 2Z"
      />
      {/* inner trident / cross */}
      <path fill={locked ? 'transparent' : 'rgba(255,255,255,0.35)'}
        d="M12 8V16M9 10H15M9 8H11M13 8H15"
        stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  );
};

// ─── 250-Day · ROCKET ────────────────────────────────────────────────────────
export const RocketIcon: React.FC<BadgeIconProps> = ({ size = 32, color = '#22D3EE', locked }) => {
  const c = locked ? LOCKED_COLOR : color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* rocket body */}
      <path fill={c}
        d="M12 2C9 2 6.5 5.5 6 10L3 13H7V18L10 20V16H14V20L17 18V13H21L18 10C17.5 5.5 15 2 12 2Z"
      />
      {/* window */}
      <circle fill={locked ? 'transparent' : 'rgba(255,255,255,0.4)'} cx="12" cy="10" r="2"/>
      {/* flames */}
      <path fill={locked ? 'transparent' : 'rgba(255,200,0,0.8)'}
        d="M10 20C10 21.5 11 23 12 24C13 23 14 21.5 14 20L12 21L10 20Z"
      />
    </svg>
  );
};

// ─── 300-Day · DIAMOND ───────────────────────────────────────────────────────
export const DiamondIcon: React.FC<BadgeIconProps> = ({ size = 32, color = '#E879F9', locked }) => {
  const c = locked ? LOCKED_COLOR : color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* top facets */}
      <path fill={c} d="M7 4H17L21 10H3L7 4Z"/>
      {/* bottom gem body */}
      <path fill={c} fillOpacity={locked ? 1 : 0.85} d="M3 10L12 22L21 10H3Z"/>
      {/* left facet shine */}
      <path fill={locked ? 'transparent' : 'rgba(255,255,255,0.25)'} d="M7 4L3 10L9 10L7 4Z"/>
      {/* top center shine */}
      <path fill={locked ? 'transparent' : 'rgba(255,255,255,0.4)'} d="M9 10L12 22L15 10H9Z"/>
    </svg>
  );
};

// ─── Icon map ─────────────────────────────────────────────────────────────────
export type BadgeIconKey =
  | 'streak_7' | 'streak_15' | 'streak_30' | 'streak_50' | 'streak_100'
  | 'streak_150' | 'streak_200' | 'streak_250' | 'streak_300';

export const BADGE_COLORS: Record<string, string> = {
  streak_7:   '#FF6B35',
  streak_15:  '#A78BFA',
  streak_30:  '#F59E0B',
  streak_50:  '#60A5FA',
  streak_100: '#00E87A',
  streak_150: '#F472B6',
  streak_200: '#FB923C',
  streak_250: '#22D3EE',
  streak_300: '#E879F9',
};

const ICON_MAP: Record<string, React.FC<BadgeIconProps>> = {
  streak_7:   FlameIcon,
  streak_15:  BoltIcon,
  streak_30:  TrophyIcon,
  streak_50:  LightningIcon,
  streak_100: CrownIcon,
  streak_150: StarIcon,
  streak_200: ShieldIcon,
  streak_250: RocketIcon,
  streak_300: DiamondIcon,
};

export const BadgeIcon: React.FC<BadgeIconProps & { badgeKey: string }> = ({
  badgeKey, size = 32, locked,
}) => {
  const Icon = ICON_MAP[badgeKey] ?? FlameIcon;
  const color = BADGE_COLORS[badgeKey] ?? '#00E87A';
  return <Icon size={size} color={color} locked={locked} />;
};

// ─── SVG string for canvas (share card) ─────────────────────────────────────
// Returns an SVG string rendered in full color, ready to be drawn on a canvas.
export function getBadgeSVGString(badgeKey: string, size = 200): string {
  const color = BADGE_COLORS[badgeKey] ?? '#00E87A';
  const white35 = 'rgba(255,255,255,0.35)';
  const white40 = 'rgba(255,255,255,0.4)';
  const white30 = 'rgba(255,255,255,0.3)';

  const paths: Record<string, string> = {
    streak_7: `
      <path fill="${color}" d="M12 2C12 2 7 8 7 14C7 18 9.2 22 12 22C14.8 22 17 18 17 14C17 10 14.5 7 12.8 5C12.8 7.5 11.5 9.5 9.8 11C10.2 7.5 12 2 12 2Z"/>
      <path fill="${white35}" d="M12 12C12 12 10 14 10 15.8C10 17 10.9 18 12 18C13.1 18 14 17 14 15.8C14 14 12 12 12 12Z"/>`,
    streak_15: `
      <path fill="${color}" d="M13 2L4 14H11L11 22L20 10H13L13 2Z"/>`,
    streak_30: `
      <path fill="${color}" d="M5 3H19V13C19 17.4 15.9 21 12 21C8.1 21 5 17.4 5 13V3Z"/>
      <path fill="${color}" d="M5 6H3C1.9 6 1 6.9 1 8V10C1 11.1 1.9 12 3 12H5V6Z"/>
      <path fill="${color}" d="M19 6H21C22.1 6 23 6.9 23 8V10C23 11.1 22.1 12 21 12H19V6Z"/>
      <rect fill="${color}" x="10" y="21" width="4" height="2" rx="0.5"/>
      <rect fill="${color}" x="7" y="22.5" width="10" height="1.5" rx="0.5"/>
      <path fill="${white35}" d="M12 8L12.9 10.7H15.7L13.5 12.3L14.3 15L12 13.4L9.7 15L10.5 12.3L8.3 10.7H11.1L12 8Z"/>`,
    streak_50: `
      <path fill="${color}" d="M14.5 2L6 14H12L9.5 22L18 10H12L14.5 2Z"/>
      <path fill="${white30}" d="M12.5 9H15.5L10.5 16H13L11.5 20L14 14.5H11.5L12.5 9Z"/>`,
    streak_100: `
      <path fill="${color}" d="M3 18L5 10L9 14L12 6L15 14L19 10L21 18H3Z"/>
      <rect fill="${color}" x="3" y="18" width="18" height="3" rx="1"/>
      <circle fill="${white40}" cx="12" cy="9" r="1.5"/>
      <circle fill="${white30}" cx="7" cy="13" r="1"/>
      <circle fill="${white30}" cx="17" cy="13" r="1"/>`,
    streak_150: `
      <polygon fill="${color}" points="12,2 14.5,8 21,8 15.5,12 17.5,18.5 12,15 6.5,18.5 8.5,12 3,8 9.5,8"/>
      <polygon fill="${white30}" points="12,6 13.2,9.5 17,9.5 14,11.5 15.1,15 12,13 8.9,15 10,11.5 7,9.5 10.8,9.5"/>`,
    streak_200: `
      <path fill="${color}" d="M12 2L20 6V12C20 17.5 16.5 22 12 23C7.5 22 4 17.5 4 12V6L12 2Z"/>
      <line x1="12" y1="8" x2="12" y2="16" stroke="${white35}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="9" y1="10" x2="15" y2="10" stroke="${white35}" stroke-width="1.5" stroke-linecap="round"/>`,
    streak_250: `
      <path fill="${color}" d="M12 2C9 2 6.5 5.5 6 10L3 13H7V18L10 20V16H14V20L17 18V13H21L18 10C17.5 5.5 15 2 12 2Z"/>
      <circle fill="${white40}" cx="12" cy="10" r="2"/>
      <path fill="rgba(255,200,0,0.8)" d="M10 20C10 21.5 11 23 12 24C13 23 14 21.5 14 20L12 21L10 20Z"/>`,
    streak_300: `
      <path fill="${color}" d="M7 4H17L21 10H3L7 4Z"/>
      <path fill="${color}" fill-opacity="0.85" d="M3 10L12 22L21 10H3Z"/>
      <path fill="${white35}" d="M7 4L3 10L9 10L7 4Z"/>
      <path fill="${white40}" d="M9 10L12 22L15 10H9Z"/>`,
  };

  const body = paths[badgeKey] ?? paths['streak_7'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">${body}</svg>`;
}

export async function drawBadgeOnCanvas(
  ctx: CanvasRenderingContext2D,
  badgeKey: string,
  cx: number,
  cy: number,
  size: number,
): Promise<void> {
  const svgStr = getBadgeSVGString(badgeKey, size);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
  URL.revokeObjectURL(url);
}
