// src/components/ProGateModal.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { GatedResource } from '../hooks/useProGate';
import { PRO_LIMITS } from '../hooks/useProGate';

interface ProGateModalProps {
  open: boolean;
  resource: GatedResource;
  onClose: () => void;
}

const RESOURCE_LABEL: Record<GatedResource, string> = {
  tasks:  'Tasks',
  goals:  'Goals',
  habits: 'Habits',
};

const ProGateModal: React.FC<ProGateModalProps> = ({ open, resource, onClose }) => {
  const navigate = useNavigate();

  if (!open) return null;

  const label = RESOURCE_LABEL[resource];
  const limit = PRO_LIMITS[resource];

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 19000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 0 calc(env(safe-area-inset-bottom, 0px) + 24px)',
      }}
    >
      {/* Card — stop propagation so tap inside doesn't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          margin: '0 16px',
          background: '#0A0A0A',
          border: '1px solid rgba(0,230,118,0.3)',
          borderRadius: '24px',
          padding: '28px 20px 24px',
          textAlign: 'center',
          boxShadow: '0 0 40px rgba(0,230,118,0.1), 0 20px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* Lock icon */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="#00E676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        {/* Label */}
        <p style={{
          fontFamily: 'Syne, sans-serif', fontSize: '11px', fontWeight: 700,
          color: '#00E676', letterSpacing: '0.18em', textTransform: 'uppercase',
          margin: '0 0 8px',
        }}>
          Limit Reached
        </p>

        {/* Heading */}
        <h3 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '22px',
          color: '#FFFFFF', lineHeight: 1.25, margin: '0 0 10px',
        }}>
          {label} limit reached
        </h3>

        {/* Body */}
        <p style={{
          fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px',
          color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 22px',
        }}>
          Free plan allows up to <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{limit} {label.toLowerCase()}</strong>.
          Upgrade to Pro for unlimited {label.toLowerCase()} and all elite modules.
        </p>

        {/* CTA */}
        <button
          onClick={() => { onClose(); navigate('/paywall'); }}
          style={{
            width: '100%', height: '52px', borderRadius: '16px',
            border: 'none', background: '#00E676', cursor: 'pointer',
            boxShadow: '0 0 24px rgba(0,230,118,0.4)',
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '14px', letterSpacing: '0.06em', color: '#000',
            WebkitTapHighlightColor: 'transparent',
          }}
          onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
          onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        >
          The 1% starts here
        </button>

        {/* Dismiss */}
        <button
          onClick={onClose}
          style={{
            marginTop: '12px', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.3)', fontSize: '13px',
            cursor: 'pointer', width: '100%', padding: '4px',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};

export default ProGateModal;
