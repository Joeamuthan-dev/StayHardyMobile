import React, { useState } from 'react';
import DefaultAvatar from './DefaultAvatar';

interface UserAvatarProps {
  src?: string | null;
  size: number;
  style?: React.CSSProperties;
}

/**
 * Shows the user's profile image if available and loads correctly.
 * Falls back to DefaultAvatar on missing URL or broken image.
 */
const UserAvatar: React.FC<UserAvatarProps> = ({ src, size, style }) => {
  const [failed, setFailed] = useState(false);

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'block',
    ...style,
  };

  if (!src || failed) {
    return (
      <div style={containerStyle}>
        <DefaultAvatar size={size} />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <img
        src={src}
        alt="Profile"
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
};

export default UserAvatar;
