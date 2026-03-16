import React, { useEffect, useState } from 'react';
import SupportModal from './SupportModal';

interface WhyStayHardyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstTime?: boolean;
}

const WhyStayHardyModal: React.FC<WhyStayHardyModalProps> = ({ isOpen, onClose, isFirstTime }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [showSupport, setShowSupport] = useState(false);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  if (!shouldRender) return null;

  const features = [
    {
      id: 'tasks',
      title: 'Task Management',
      icon: 'checklist',
      color: '#3b82f6',
      desc: 'Users can create and manage their personal tasks.',
      bullets: [
        'Create tasks',
        'Organize tasks by priority',
        'Track pending and completed tasks',
        'Focus on what matters today'
      ]
    },
    {
      id: 'goals',
      title: 'Personal Goals',
      icon: 'star',
      color: '#ef4444',
      desc: 'Users can create long-term personal goals.',
      bullets: [
        'Track goals with deadlines',
        'See how many days remain',
        'Stay focused on long-term progress'
      ]
    },
    {
      id: 'routine',
      title: 'Daily Routine Tracking',
      icon: 'calendar_check',
      color: '#10b981',
      desc: 'Users can create unlimited routines and habits.',
      bullets: [
        'Track routines daily',
        'Only current day updates allowed',
        'Prevents future editing',
        'Helps build real consistency'
      ]
    },
    {
      id: 'insights',
      title: 'Routine Insights',
      icon: 'insights',
      color: '#a855f7',
      desc: 'See category-wise routine insights.',
      bullets: [
        'Last 7 days, month, or year',
        'Understand your strengths',
        'Visualize consistency trends'
      ]
    },
    {
      id: 'dashboard',
      title: 'Productivity Dashboard',
      icon: 'dashboard',
      color: '#0ea5e9',
      desc: 'A complete productivity overview.',
      bullets: [
        'Productivity score',
        'Pending tasks & Reminders',
        'Routine progress',
        'Active goals'
      ]
    },
    {
      id: 'stats',
      title: 'Productivity Statistics',
      icon: 'analytics',
      color: '#f59e0b',
      desc: 'Detailed statistics about your productivity.',
      bullets: [
        'Score tracking & Trends',
        'Task & Goal insights',
        'Category-wise analysis'
      ]
    },
    {
      id: 'motivation',
      title: 'Motivation System',
      icon: 'auto_awesome',
      color: '#ec4899',
      desc: 'Stay disciplined with a dynamic feedback loop.',
      bullets: [
        'Dynamic quotes & feedback',
        'Motivates and sometimes roasts',
        'Designed to keep you on track'
      ]
    }
  ];

  return (
    <div 
      className={`why-modal-overlay ${isOpen ? 'open' : ''}`}
      onAnimationEnd={() => { if (!isOpen) setShouldRender(false); }}
      onClick={onClose}
    >
      <div className="why-modal-content" onClick={e => e.stopPropagation()}>
        <button className="why-modal-close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>

        <header className="why-header">
          <div className="why-badge">WHY STAY HARDY?</div>
          <h1 className="why-title">Stay Hardy — Your Personal Productivity System</h1>
          <p className="why-subtitle">A simple personal productivity app to manage your tasks, goals, and daily routines.</p>
          <p className="why-desc">This is a personal project built to help people stay consistent, focused, and productive every day.</p>
        </header>

        <div className="why-grid">
          {features.map((f) => (
            <div key={f.id} className="feature-card">
              <div className="feature-icon-wrapper" style={{ background: `${f.color}15`, color: f.color }}>
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-text">{f.desc}</p>
              <ul className="feature-bullets">
                {f.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <footer className="why-footer">
          <p>Stay Hardy is a personal project created to help people stay consistent with their goals, tasks, and routines.</p>
          {isFirstTime && (
             <button className="why-start-btn" onClick={onClose}>
               Get Started — Let's Grind
             </button>
          )}
          <div className="why-closing">
            <span>Enjoying the app?</span>
            <div className="closing-actions">
              <button onClick={() => { onClose(); window.location.href='/feedback'; }}>Share feedback</button>
              <span className="dot"></span>
              <button onClick={() => setShowSupport(true)}>Support the project</button>
            </div>
          </div>
        </footer>
      </div>

      <SupportModal isOpen={showSupport} onClose={() => setShowSupport(false)} />

      <style>{`
        .why-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(12px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          opacity: 0;
          visibility: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .why-modal-overlay.open {
          opacity: 1;
          visibility: visible;
        }
        .why-modal-content {
          background: #020617;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          border-radius: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          overflow-y: auto;
          padding: 3rem 2rem;
          transform: translateY(20px) scale(0.98);
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
        }
        .why-modal-overlay.open .why-modal-content {
          transform: translateY(0) scale(1);
        }
        .why-modal-close {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: #94a3b8;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .why-modal-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        
        .why-header {
          text-align: center;
          margin-bottom: 3.5rem;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }
        .why-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 900;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          padding: 0.4rem 1rem;
          border-radius: 2rem;
          letter-spacing: 0.15em;
          margin-bottom: 1.25rem;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .why-title {
          font-size: 2.25rem;
          font-weight: 950;
          color: white;
          margin: 0 0 1rem;
          line-height: 1.1;
        }
        .why-subtitle {
          font-size: 1.1rem;
          color: #e2e8f0;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .why-desc {
          color: #94a3b8;
          line-height: 1.6;
          font-size: 0.95rem;
          margin: 0;
        }

        .why-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
          margin-bottom: 4rem;
        }
        .feature-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1.75rem;
          border-radius: 1.5rem;
          transition: all 0.3s ease;
        }
        .feature-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-5px);
        }
        .feature-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }
        .feature-icon-wrapper span {
          font-size: 24px;
        }
        .feature-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: white;
          margin: 0 0 0.75rem;
        }
        .feature-text {
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.5;
          margin: 0 0 1.25rem;
        }
        .feature-bullets {
          padding: 0;
          margin: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .feature-bullets li {
          font-size: 0.75rem;
          color: #e2e8f0;
          font-weight: 600;
          padding-left: 1.25rem;
          position: relative;
        }
        .feature-bullets li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: 900;
        }

        .why-footer {
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 3rem;
        }
        .why-footer p {
          color: #94a3b8;
          font-size: 0.9rem;
          margin-bottom: 2rem;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }
        .why-start-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 1rem 2.5rem;
          border-radius: 1.25rem;
          font-weight: 950;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);
          margin-bottom: 2.5rem;
        }
        .why-start-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(16, 185, 129, 0.3);
          background: #34d399;
        }
        
        .why-closing {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
        }
        .why-closing span {
          font-size: 0.75rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .closing-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .closing-actions button {
          background: transparent;
          border: none;
          color: #10b981;
          font-weight: 800;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .closing-actions button:hover {
          text-decoration: underline;
        }
        .dot {
          width: 4px;
          height: 4px;
          background: #334155;
          border-radius: 50%;
        }

        @media (max-width: 600px) {
          .why-modal-content {
            padding: 2.5rem 1.25rem;
            border-radius: 1.5rem;
          }
          .why-title {
            font-size: 1.75rem;
          }
          .why-grid {
            grid-template-columns: 1fr;
          }
          .feature-card {
            padding: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default WhyStayHardyModal;
