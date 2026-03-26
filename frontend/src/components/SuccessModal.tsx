import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SuccessModalProps {
  onClose: () => void;
  userName?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ onClose, userName }) => {
  const navigate = useNavigate();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
      animation: 'fade-in 0.3s ease-out'
    }}>
      <div style={{
        background: '#121212',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '32px',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
        boxShadow: '0 0 40px rgba(0,230,118,0.2)',
        animation: 'scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(0,230,118,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#00E676' }}>task_alt</span>
        </div>
        
        <h2 style={{
          fontSize: '24px',
          fontWeight: '900',
          color: '#FFFFFF',
          letterSpacing: '0.05em',
          margin: '0 0 8px 0',
          textTransform: 'uppercase'
        }}>
          PRO ACTIVATED
        </h2>
        
        <p style={{
          fontSize: '15px',
          color: 'rgba(255,255,255,0.5)',
          margin: 0,
          lineHeight: 1.5
        }}>
          StayHardy Pro Activated! Welcome to the elite {userName ? `, ${userName}` : ''}.
        </p>
        
        <button
          onClick={() => {
            onClose();
            navigate('/home', { replace: true });
          }}
          style={{
            width: '100%',
            height: '54px',
            background: '#00E676',
            border: 'none',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: '900',
            color: '#000000',
            marginTop: '28px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            boxShadow: '0 10px 20px rgba(0,230,118,0.3)'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          ENTER THE COMMAND CENTER
        </button>
      </div>
      <style>{`
        @keyframes fade-in { 
          0% { opacity: 0; } 
          100% { opacity: 1; } 
        }
        @keyframes scale-up { 
          0% { transform: scale(0.9) translateY(10px); opacity: 0; } 
          100% { transform: scale(1) translateY(0); opacity: 1; } 
        }
      `}</style>
    </div>
  );
};
