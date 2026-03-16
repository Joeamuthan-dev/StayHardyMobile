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
      desc: 'Create and manage personal tasks and stay focused on what matters today.'
    },
    {
      id: 'goals',
      title: 'Goal Tracking',
      icon: 'star',
      color: '#ef4444',
      desc: 'Set personal goals and track how many days remain to complete them.'
    },
    {
      id: 'routine',
      title: 'Routine & Habit Tracking',
      icon: 'calendar_check',
      color: '#10b981',
      desc: 'Create daily routines and track habits consistently with daily updates.'
    },
    {
      id: 'insights',
      title: 'Productivity Insights',
      icon: 'insights',
      color: '#a855f7',
      desc: 'Understand your productivity score, trends, and category performance.'
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
          <h1 className="why-title">Stay Hardy</h1>
          <p className="why-subtitle">Your personal productivity assistant</p>
          <p className="why-desc">A simple productivity system designed to help you manage tasks, track goals, and build consistent daily routines.</p>
        </header>

        <div className="why-grid">
          {features.map((f) => (
            <div key={f.id} className="feature-card">
              <div className="feature-icon-wrapper" style={{ background: `${f.color}10`, color: f.color }}>
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <div className="feature-info">
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-text">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <footer className="why-footer">
          <p className="footer-message">
            Enjoy using Stay Hardy.<br/>
            Share your feedback and support the project if you find it useful.
          </p>
          
          {isFirstTime && (
             <button className="why-start-btn" onClick={onClose}>
               Get Started — Let's Grind
             </button>
          )}

          <div className="why-closing">
            <span>Enjoying the app?</span>
            <div className="closing-actions">
              <button onClick={() => { onClose(); window.location.href='/feedback'; }}>Give Feedback</button>
              <span className="dot"></span>
              <button onClick={() => setShowSupport(true)}>Support the project</button>
            </div>
          </div>

          <div className="developer-info-section">
            <h4 className="developer-label">About the Developer</h4>
            <a 
              href="https://www.linkedin.com/in/joeamuthan?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="developer-card-link"
            >
              <img 
                src="https://tiavhmbpplerffdjmodw.supabase.co/storage/v1/object/public/avatars/admin.PNG" 
                alt="Joe Amuthan" 
                className="developer-avatar"
              />
              <div className="developer-details">
                <div className="developer-name">
                  Joe Amuthan
                  <span className="material-symbols-outlined">open_in_new</span>
                </div>
                <div className="developer-motto">Building What I Wish Existed</div>
              </div>
            </a>
          </div>
        </footer>
      </div>

      <SupportModal isOpen={showSupport} onClose={() => setShowSupport(false)} />

      <style>{`
        .why-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.92);
          backdrop-filter: blur(20px);
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
          background: #000000;
          width: 100%;
          max-width: 720px;
          max-height: 90vh;
          border-radius: 2.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          overflow-y: auto;
          padding: 4rem 3rem;
          transform: translateY(20px) scale(0.98);
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 40px 80px rgba(0,0,0,0.8);
          scrollbar-width: none;
        }
        .why-modal-content::-webkit-scrollbar { display: none; }
        
        .why-modal-overlay.open .why-modal-content {
          transform: translateY(0) scale(1);
        }
        .why-modal-close {
          position: absolute;
          top: 2rem;
          right: 2.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: #94a3b8;
          width: 36px;
          height: 36px;
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
          transform: scale(1.1);
        }
        
        .why-header {
          text-align: center;
          margin-bottom: 3.5rem;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }
        .why-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: white;
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }
        .why-subtitle {
          font-size: 1.15rem;
          color: #10b981;
          font-weight: 700;
          margin-bottom: 1.25rem;
        }
        .why-desc {
          color: #94a3b8;
          line-height: 1.6;
          font-size: 0.95rem;
          font-weight: 500;
          margin: 0;
        }

        .why-grid {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 3.5rem;
        }
        .feature-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1.5rem 2rem;
          border-radius: 1.75rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .feature-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateX(5px);
        }
        .feature-icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .feature-icon-wrapper span {
          font-size: 26px;
        }
        .feature-info {
          flex: 1;
        }
        .feature-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
          margin: 0 0 0.25rem;
        }
        .feature-text {
          font-size: 0.9rem;
          color: #94a3b8;
          line-height: 1.4;
          margin: 0;
          font-weight: 500;
        }

        .why-footer {
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 2.5rem;
        }
        .footer-message {
          color: #94a3b8;
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 2rem;
          font-weight: 500;
        }
        .why-start-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 1.1rem 2.5rem;
          border-radius: 1.5rem;
          font-weight: 800;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 20px rgba(16, 185, 129, 0.15);
          margin-bottom: 2rem;
          width: 100%;
        }
        .why-start-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(16, 185, 129, 0.25);
          filter: brightness(1.1);
        }
        
        .why-closing {
          margin-bottom: 2rem;
        }
        .why-closing span {
          display: block;
          color: #64748b;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
          letter-spacing: 0.05em;
        }
        
        .closing-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }
        .closing-actions button {
          background: transparent;
          border: none;
          color: #10b981;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .closing-actions button:hover {
          opacity: 0.8;
          text-decoration: underline;
        }
        .dot {
          width: 4px;
          height: 4px;
          background: #334155;
          border-radius: 50%;
        }
        .developer-info-section {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          text-align: left;
        }
        .developer-label {
          font-size: 10px;
          fontWeight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1rem;
        }
        .developer-card-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          text-decoration: none;
          transition: transform 0.2s;
        }
        .developer-card-link:hover {
          transform: translateX(5px);
        }
        .developer-avatar {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          border: 2px solid #10b981;
          object-fit: cover;
        }
        .developer-name {
          font-weight: 800;
          font-size: 1rem;
          color: white;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .developer-name .material-symbols-outlined {
          font-size: 1rem;
          color: #10b981;
        }
        .developer-motto {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
        }

        @media (max-width: 600px) {
          .why-modal-content {
            padding: 3rem 1.5rem;
            border-radius: 2rem;
          }
          .why-title {
            font-size: 2rem;
          }
          .feature-card {
            padding: 1.25rem 1.5rem;
            gap: 1.25rem;
          }
          .why-modal-close {
            right: 1.5rem;
            top: 1.5rem;
          }
          .feature-icon-wrapper {
            width: 44px;
            height: 44px;
          }
          .feature-title {
             font-size: 1rem;
          }
          .feature-text {
             font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
};

export default WhyStayHardyModal;
