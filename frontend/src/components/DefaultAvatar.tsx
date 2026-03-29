import React from 'react';

/**
 * Default human avatar SVG — shown when user has no profile picture.
 * Pass `size` in px; the SVG renders at exactly that dimension.
 */
const DefaultAvatar: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 40, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block', flexShrink: 0, ...style }}
  >
    {/* Background */}
    <circle cx="50" cy="50" r="50" fill="#1C2231" />

    {/* Shoulders / body */}
    <path d="M50 62C30 62 8 76 6 106H94C92 76 70 62 50 62Z" fill="#3A4D66" />

    {/* Left ear */}
    <ellipse cx="31" cy="38" rx="4" ry="5.5" fill="#3A4D66" />
    {/* Right ear */}
    <ellipse cx="69" cy="38" rx="4" ry="5.5" fill="#3A4D66" />

    {/* Head */}
    <circle cx="50" cy="37" r="19" fill="#4B5E7C" />

    {/* Subtle forehead highlight */}
    <ellipse cx="43" cy="29" rx="9" ry="6" fill="rgba(255,255,255,0.07)" />
  </svg>
);

export default DefaultAvatar;
