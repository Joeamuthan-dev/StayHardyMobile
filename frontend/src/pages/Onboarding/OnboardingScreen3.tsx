// src/pages/Onboarding/OnboardingScreen3.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target } from 'lucide-react';
import { storage } from '../../utils/storage';

interface OnboardingScreen3Props {
  onNext: () => void;
  onSkip?: () => void;
}

const OnboardingScreen3: React.FC<OnboardingScreen3Props> = ({ onNext, onSkip }) => {
  const navigate = useNavigate();

  // Unified navigation target for Stay Hardy protocol
  const handleFinalNavigate = async () => {
    // Mark onboarding as complete to prevent re-triggering
    await storage.set('onboarding_complete', 'true');
    
    if (onNext) onNext();
    navigate('/login', { replace: true });
  };

  const handleSkipNavigation = async () => {
    // Mark onboarding as complete to prevent re-triggering
    await storage.set('onboarding_complete', 'true');
    
    if (onSkip) onSkip();
    navigate('/login', { replace: true });
  };

  return (
    <div className="fixed inset-0 bg-[#000000] flex flex-col pt-12 p-6 z-[999] overflow-hidden selection:bg-[#00E676] selection:text-black">
      {/* 
        FIX 1 — "STAY HARDY" BRAND LABEL CONSISTENCY
        Pinned top-bar layout shared across the entire protocol sequence.
      */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-[#00E676] text-xs font-bold tracking-[0.25em] uppercase mt-0 mb-3">STAY HARDY</p>
        <div 
          onClick={handleSkipNavigation} 
          className="text-[13px] font-bold text-white/30 cursor-pointer p-2 tracking-widest uppercase active:text-white transition-colors"
        >
          SKIP
        </div>
      </div>

      <style>{`
        @keyframes ringGlow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(0, 230, 118, 0.5)); }
          50% { filter: drop-shadow(0 0 24px rgba(0, 230, 118, 0.9)) drop-shadow(0 0 48px rgba(0, 230, 118, 0.3)); }
        }
        @keyframes bloomPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(0, 230, 118, 0.2), 0 0 60px rgba(0, 230, 118, 0.1); }
          50% { box-shadow: 0 0 50px rgba(0, 230, 118, 0.4), 0 0 100px rgba(0, 230, 118, 0.2); }
        }
      `}</style>

      {/* CONTENT AREA — no vertical scroll, fits within screen */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="pt-2 mb-3">
          <h1 className="text-[28px] font-black text-white leading-[1.1] tracking-[-1.5px] uppercase">YOUR GRIND,<br/>VISUALIZED.</h1>
          <p className="text-[12px] text-white/40 leading-relaxed mt-1.5">
            Deep insights into your performance. Track goals, master tasks, and see your productivity score climb. No ads. Pure focus.
          </p>
        </div>

        {/* PROGRESS RING INTERACTIVE WIDGET */}
        <div className="relative flex flex-col items-center mb-3">
          <div className="relative w-32 h-32 mb-3">
            <div className="absolute inset-0 rounded-full animate-bloomPulse duration-[3s]" />
            <svg
              width="128"
              height="128"
              viewBox="0 0 128 128"
              className="drop-shadow-[0_0_15px_rgba(0, 230, 118, 0.5)] animate-ringGlow duration-[3s]"
            >
              <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(0, 230, 118, 0.1)" strokeWidth="7"/>
              <circle
                cx="64"
                cy="64"
                r="54"
                fill="none"
                stroke="#00E676"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - 0.85)}`}
                transform="rotate(-90 64 64)"
                style={{ filter: 'drop-shadow(0 0 8px rgba(0, 230, 118, 0.8))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="text-3xl font-black text-[#00E676] leading-none tracking-tighter [text-shadow:0_0_20px_rgba(0,230,118,0.6)]">85%</span>
              <span className="text-[8px] font-bold text-white/40 tracking-[0.15em] uppercase">STAY HARDY</span>
            </div>
          </div>

          <div className="flex gap-2 w-full">
            {/* GOAL CARD */}
            <div className="flex-1 bg-[#121212] border border-white/5 rounded-2xl p-3 flex items-center gap-2 shadow-lg">
              <Target size={24} className="text-[#00E676]" strokeWidth={1.5} />
              <div>
                <p className="text-[9px] font-bold text-white/50 tracking-widest mb-0.5 uppercase">GOAL</p>
                <p className="text-[12px] font-extrabold text-white leading-tight">12 DAYS<br/>LEFT</p>
              </div>
            </div>
            {/* TASKS CARD */}
            <div className="flex-1 bg-[#121212] border border-white/5 rounded-2xl p-3 flex items-center gap-2 shadow-lg">
              <div className="w-7 h-7 rounded-lg bg-[#00E676]/10 border border-[#00E676]/20 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 16 16" className="fill-none stroke-[#00E676]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8l3 3 7-7"/>
                </svg>
              </div>
              <div>
                <p className="text-[9px] font-bold text-white/50 tracking-widest mb-0.5 uppercase">TASKS</p>
                <p className="text-[12px] font-extrabold text-[#00E676] leading-tight">12/15<br/>DONE</p>
              </div>
            </div>
          </div>
        </div>

        {/* COMPACT REVENUE CARD */}
        <div className="bg-[#00E676]/5 border-2 border-[#00E676]/20 rounded-[2rem] py-3 px-5 text-center mt-3">
          <div className="inline-flex items-center gap-1.5 bg-[#00E676]/12 border border-[#00E676]/25 rounded-full px-3 py-1 mb-2">
            <span className="text-[9px] font-black text-[#00E676] tracking-widest uppercase">
              ⚡ JOIN THE 1%
            </span>
          </div>
          <p className="text-lg font-black text-white leading-tight tracking-tight mb-1 uppercase">Start for Free.</p>
          <p className="text-[12px] text-white/40 leading-relaxed">Upgrade anytime, when you're ready.</p>
        </div>
      </div>

      {/* 
        BOTTOM NAVIGATION SEQUENCE
        Centrally aligned pagination indicators and hardware-like primary trigger.
      */}
      <div className="w-full flex flex-col items-center bg-black mt-auto pb-6">
        {/* Pagination indicators (centered) */}
        <div className="flex gap-2 justify-center mt-2 mb-4 z-10">
          <div className="h-2 w-2 bg-white/20 rounded-full transition-all duration-300" />
          <div className="h-2 w-2 bg-white/20 rounded-full transition-all duration-300" />
          <div className="h-2 w-7 bg-[#00E676] rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(0,232,122,0.5)]" />
        </div>

        {/* 
          CHANGE 2 — REPLACE "ENTER COMMAND CENTER" WITH "Get Started"
          Professional floating CTA with softer track-style rounded edges.
        */}
        <div className="w-full px-4">
          <button
            onClick={handleFinalNavigate}
            className="w-full py-4 rounded-3xl bg-[#00E676] text-black font-bold text-base tracking-wide shadow-[0_0_24px_rgba(0,230,118,0.35)] active:scale-95 transition-all duration-150"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen3;
