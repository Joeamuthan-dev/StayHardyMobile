import React, { useEffect, useState } from 'react';

const MESSAGES = [
  'Stay Hardy! 💪',
  'Locking in... 🔒',
  'Champions are made here.',
  'Building your discipline.',
  'No excuses. Only results. ⚡',
  'One step closer to greatness.',
];

interface Props {
  visible: boolean;
}

const CreatingSpinner: React.FC<Props> = ({ visible }) => {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (!visible) { setMsgIdx(0); return; }
    const t = setInterval(() => setMsgIdx(i => (i + 1) % MESSAGES.length), 1400);
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      {/* Spinner rings + icon */}
      <div style={{ position: 'relative', width: '90px', height: '90px', marginBottom: '28px' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid rgba(0,232,122,0.12)',
          borderTop: '3px solid #00E87A',
          animation: 'csSpin 0.9s linear infinite',
        }} />
        <div style={{
          position: 'absolute',
          inset: '14px',
          borderRadius: '50%',
          border: '2px solid rgba(0,232,122,0.08)',
          borderBottom: '2px solid rgba(0,229,204,0.45)',
          animation: 'csSpin 1.5s linear infinite reverse',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '30px',
          animation: 'csPulse 1.8s ease-in-out infinite',
        }}>
          ⚡
        </div>
      </div>

      {/* Rotating motivational message */}
      <p style={{
        margin: 0,
        fontSize: '17px',
        fontWeight: '800',
        color: '#00E87A',
        letterSpacing: '0.02em',
        textAlign: 'center',
        padding: '0 40px',
        transition: 'opacity 0.35s ease',
      }}>
        {MESSAGES[msgIdx]}
      </p>

      <style>{`
        @keyframes csSpin { to { transform: rotate(360deg); } }
        @keyframes csPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(0.86); }
        }
      `}</style>
    </div>
  );
};

export default CreatingSpinner;
