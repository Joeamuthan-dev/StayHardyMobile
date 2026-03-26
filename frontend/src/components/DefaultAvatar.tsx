import React from 'react';

interface DefaultAvatarProps {
  size?: number;
  showGlow?: boolean;
  borderColor?: string;
  tickColor?: string;
  fillColor?: string;
  backgroundGradient?: string;
}

const DefaultAvatar: React.FC<DefaultAvatarProps> = ({
  size = 40,
  showGlow = true,
  borderColor = 'rgba(0,232,122,0.4)',
  tickColor = '#00E87A',
  fillColor = 'rgba(0,232,122,0.15)',
  backgroundGradient = 'linear-gradient(135deg, #0D2B1A 0%, #1A3D28 50%, #0A1F12 100%)',
}) => {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: backgroundGradient,
        border: `2px solid ${borderColor}`,
        boxShadow: showGlow
          ? `0 0 16px ${tickColor}33, inset 0 1px 0 rgba(255,255,255,0.05)`
          : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '75%',
          height: '75%',
          borderRadius: '50%',
          border: `1px solid ${tickColor}22`,
          pointerEvents: 'none',
        }}
      />

      <svg
        width={size * 0.45}
        height={size * 0.45}
        viewBox="0 0 24 24"
        fill="none"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <circle cx="12" cy="12" r="10" fill={fillColor} stroke={tickColor} strokeWidth="1.5" />
        <path
          d="M7 12.5L10.5 16L17 9"
          stroke={tickColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(circle at center, ${tickColor}14 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default DefaultAvatar;

