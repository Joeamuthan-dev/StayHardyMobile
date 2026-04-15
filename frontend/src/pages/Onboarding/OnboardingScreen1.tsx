// src/pages/Onboarding/OnboardingScreen1.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { storage } from '../../utils/storage';

interface OnboardingScreen1Props {
  onNext: () => void;
  onSkip?: () => void;
}

const OnboardingScreen1: React.FC<OnboardingScreen1Props> = ({ onNext, onSkip }) => {
  const navigate = useNavigate();

  // Unified navigation target for Stay Hardy protocol
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

      {/* Main Copywriting Section */}
      <div className="pt-8 mb-10 text-left">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-[1.1] tracking-[-1.5px]">
          ESCAPE<br/>THE LATER<br/>TRAP.
        </h1>
        <p className="text-sm md:text-base text-white/45 leading-relaxed">
          Turn 'I'll do it tomorrow' into 'Done today.' Relentless task management for the disciplined.
        </p>
      </div>

      {/* Interactive Widget Display (Visual Mockups) */}
      <div className="flex-1 relative -mx-2">
        {/* BACKGROUND CARD: OVERDUE WIDGET */}
        <div className="absolute left-0 top-0 w-[48%] bg-[#0A0A0A] border border-white/5 rounded-2xl p-3.5 opacity-60 transition-opacity">
          <p className="text-[9px] font-extrabold text-red-500/80 tracking-[0.15em] mb-3 uppercase">OVERDUE</p>
          {['Gym... Maybe', 'Start Project', 'Pay Bill', 'Read Book', 'Call Mom'].map((task, i) => (
            <div key={i} className="p-2 bg-red-500/5 rounded-lg mb-1.5 flex items-center gap-1.5 border border-white/5">
              <div className="w-3.5 h-3.5 rounded-[3px] border-[1.5px] border-red-500/40 flex-shrink-0" />
              <span className="text-[11px] text-red-500/80 line-through font-medium whitespace-nowrap overflow-hidden">
                {task}
              </span>
            </div>
          ))}
        </div>

        {/* FOREGROUND CARD: TODAY WIDGET */}
        <div className="absolute right-0 top-5 w-[52%] bg-[#121212] border border-[#00E676]/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-10">
          <p className="text-[9px] font-extrabold text-[#00E676] tracking-[0.15em] mb-1 uppercase">TODAY</p>
          <p className="text-lg font-black text-[#00E676] mb-3 tracking-[-0.5px]">2 TASKS</p>
          
          {[{ t: 'Morning workout', done: true }, { t: 'Review proposal', done: true }, { t: 'Team standup', done: false }].map((item, i) => (
            <div 
              key={i} 
              className={`p-2 rounded-lg mb-1.5 flex items-center gap-1.5 transition-colors ${item.done ? 'bg-[#00E676]/5' : 'bg-white/5'}`}
            >
              <div 
                className={`w-3.5 h-3.5 rounded-[3px] flex items-center justify-center flex-shrink-0 shadow-sm
                  ${item.done ? 'bg-[#00E676]' : 'bg-transparent border border-white/20'}`}
              >
                {item.done && (
                  <svg width="8" height="8" viewBox="0 0 8 8" className="fill-none stroke-black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 4l2 2 4-4" />
                  </svg>
                )}
              </div>
              <span className={`text-[10px] font-bold ${item.done ? 'line-through text-white/40' : 'text-white/70'}`}>
                {item.t}
              </span>
            </div>
          ))}

          {/* FLOATING GREEN CHECKMARK CIRCLE */}
          <div className="absolute -top-4 -right-2 w-9 h-9 rounded-full bg-[#00E676] text-black flex items-center justify-center shadow-[0_0_15px_rgba(0,230,118,0.4)] animate-bounce-subtle z-20 transition-transform active:scale-90">
            <svg width="18" height="18" viewBox="0 0 18 18" className="fill-none stroke-black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l4 4 8-8" />
            </svg>
          </div>
        </div>
      </div>

      {/* 
        CHANGE 1 — ONBOARDING SCREEN 1: DOTS + ARROW IN SAME ROW
        Premium inline layout for high-intent navigation.
      */}
      <div className="flex items-center justify-between px-6 mb-10 mt-auto">
        {/* Pagination dots — left aligned */}
        <div className="flex items-center gap-2">
          {/* dot 1 - active */}
          <div className="w-6 h-2 rounded-full bg-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.5)]" />
          {/* dot 2 - inactive */}
          <div className="w-2 h-2 rounded-full bg-white/20" />
          {/* dot 3 - inactive */}
          <div className="w-2 h-2 rounded-full bg-white/20" />
        </div>

        {/* Circle arrow button — right aligned */}
        <button
          onClick={onNext}
          className="w-14 h-14 rounded-full bg-[#00E676] flex items-center justify-center shadow-[0_0_20px_rgba(0,230,118,0.35)] active:scale-90 transition-all duration-150"
        >
          <ArrowRight size={24} strokeWidth={2.5} className="text-black" />
        </button>
      </div>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default OnboardingScreen1;
