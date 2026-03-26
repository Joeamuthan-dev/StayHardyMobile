import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

type CelebrationType = 'task' | 'goal';

export const triggerCelebration = (type: CelebrationType, goalName?: string) => {
  window.dispatchEvent(new CustomEvent('trigger_celebration', { detail: { type, goalName } }));
};

// ─── Task (lightweight, non-blocking) ───────────────────────────────────────
// Note: Task completions now use the inline top pill toast in Dashboard.tsx
// This component is kept but no longer mounted for tasks.
const TaskCelebration: React.FC = () => {
  const messages = ['Task Completed', 'Nice Work!', 'Crushed It!', 'Well Done!'];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#1C1C1E',
      borderRadius: '24px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
      zIndex: 9999,
      pointerEvents: 'none',
      border: '1px solid rgba(255,255,255,0.1)',
      animation: 'taskPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
    }}>
      <style>{`
        @keyframes taskPop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: '#00E87A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <CheckCircle2 color="#000" size={32} strokeWidth={3} />
      </div>
      <span style={{ color: '#FFF', fontSize: '18px', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {msg}
      </span>
    </div>
  );
};

// ─── Goal — Premium Cinematic Achievement Modal ───────────────────────────────
const GoalCelebration: React.FC<{ onClose: () => void; goalName?: string }> = ({ onClose, goalName }) => {
  return (
    <>
      <style>{`
        @keyframes goalModalIn {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.82); }
          60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.03); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes goldGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.3), 0 0 40px rgba(255,215,0,0.1); }
          50%       { box-shadow: 0 0 35px rgba(255,215,0,0.5), 0 0 70px rgba(255,215,0,0.2); }
        }
        @keyframes starFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-6px) scale(1.04); }
        }
        .goal-onward-btn {
          width: 100%;
          padding: 16px;
          background: #FFD700;
          border: none;
          border-radius: 16px;
          color: #000;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 0 20px rgba(255,215,0,0.35), 0 8px 24px rgba(0,0,0,0.4);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .goal-onward-btn:active {
          transform: scale(0.97);
          box-shadow: 0 0 10px rgba(255,215,0,0.5);
        }
      `}</style>

      {/* Modal card */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(340px, calc(100vw - 40px))',
          background: 'rgba(18, 18, 18, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 215, 0, 0.45)',
          borderRadius: '28px',
          padding: '36px 28px 28px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0',
          boxShadow: '0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,215,0,0.1)',
          zIndex: 9999,
          animation: 'goalModalIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        {/* Radial ambient glow behind star */}
        <div style={{
          position: 'relative',
          width: '100px',
          height: '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}>
          {/* Glow layer */}
          <div style={{
            position: 'absolute',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,215,0,0.25) 0%, rgba(255,215,0,0) 70%)',
            animation: 'goldGlow 3s ease-in-out infinite',
          }} />
          {/* Star icon */}
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #FFD700, #FFA500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(255,215,0,0.4)',
            animation: 'starFloat 3s ease-in-out infinite',
            zIndex: 1,
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="#000" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
        </div>

        {/* Headline */}
        <h2 style={{
          fontSize: '22px',
          fontWeight: '900',
          color: '#FFFFFF',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          margin: '0 0 10px 0',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          MISSION ACCOMPLISHED
        </h2>

        {/* Divider line */}
        <div style={{
          width: '48px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
          borderRadius: '2px',
          marginBottom: '14px',
        }} />

        {/* Goal name */}
        <p style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.02em',
          margin: '0 0 28px 0',
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          You conquered:{' '}
          <span style={{ color: '#FFD700', fontWeight: 700 }}>
            {goalName || 'your goal'}
          </span>
        </p>

        {/* ONWARD button */}
        <button className="goal-onward-btn" onClick={onClose}>
          ONWARD →
        </button>
      </div>
    </>
  );
};

export const CelebrationOverlay: React.FC = () => {
  const [activeCelebration, setActiveCelebration] = useState<CelebrationType | null>(null);
  const [goalName, setGoalName] = useState<string | undefined>(undefined);

  useEffect(() => {
    let timeout: any;

    const handleTrigger = (e: any) => {
      const type = e.detail.type as CelebrationType;
      setActiveCelebration(type);
      if (type === 'goal') setGoalName(e.detail.goalName ?? undefined);

      // Clear existing timeout if multiple trigger rapidly
      if (timeout) clearTimeout(timeout);

      // For task: auto-dismiss. For goal: user must click the ONWARD button.
      if (type === 'task') {
        timeout = setTimeout(() => setActiveCelebration(null), 2000);
      }
    };

    window.addEventListener('trigger_celebration', handleTrigger);
    return () => {
      window.removeEventListener('trigger_celebration', handleTrigger);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  if (!activeCelebration) return null;

  const handleClose = () => {
    setActiveCelebration(null);
    setGoalName(undefined);
  };

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        backgroundColor: activeCelebration === 'goal' ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.3)',
        backdropFilter: activeCelebration === 'goal' ? 'blur(15px)' : 'none',
        WebkitBackdropFilter: activeCelebration === 'goal' ? 'blur(15px)' : 'none',
        transition: 'background-color 0.3s ease',
        pointerEvents: activeCelebration === 'goal' ? 'auto' : 'none',
      }} />
      {activeCelebration === 'task'
        ? <TaskCelebration />
        : <GoalCelebration onClose={handleClose} goalName={goalName} />
      }
    </>
  );
};
