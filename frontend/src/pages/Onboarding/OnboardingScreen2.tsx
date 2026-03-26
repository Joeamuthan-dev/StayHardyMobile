// src/pages/Onboarding/OnboardingScreen2.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, ArrowRight } from 'lucide-react';
import { storage } from '../../utils/storage';

interface OnboardingScreen2Props {
  onNext: () => void;
  onSkip?: () => void;
}

const OnboardingScreen2: React.FC<OnboardingScreen2Props> = ({ onNext, onSkip }) => {
  const navigate = useNavigate();
  const [heatmapData, setHeatmapData] = useState<number[]>([]);

  // Correct navigation on SKIP
  const handleSkipNavigation = async () => {
    // Mark onboarding as complete to prevent re-triggering
    await storage.set('onboarding_complete', 'true');
    
    if (onSkip) onSkip();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    // HARDCODED "WIN" PATTERN FOR MOTIVATIONAL HUD
    const winPattern = [
      [4,4,0,4,0,4,0,4,4,4,0,0,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [4,4,0,4,4,4,0,4,0,4,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [4,0,4,4,4,4,0,4,0,4,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [4,0,4,4,0,4,0,4,0,4,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [4,0,0,4,0,4,0,4,0,4,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [4,0,0,4,0,4,0,4,4,4,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ];

    const noiseValues = [0, 0, 0, 1, 1, 2];
    const cells: number[] = [];
    for (let col = 0; col < 52; col++) {
      for (let row = 0; row < 7; row++) {
        const patternVal = winPattern[row][col];
        if (patternVal === 0) {
          const noiseIdx = (col * 7 + row) % 6;
          cells.push(noiseValues[noiseIdx]);
        } else {
          cells.push(patternVal);
        }
      }
    }
    setHeatmapData(cells);
  }, []);

  const getCellColor = (val: number) => {
    switch (val) {
      case 4: return 'bg-[#00E676]';      // Electric Green
      case 3: return 'bg-[#26a641]';      // Bright Green
      case 2: return 'bg-[#006d32]';      // Medium Green
      case 1: return 'bg-[#003820]';      // Dim Green
      default: return 'bg-white/5';      // Baseline OLED
    }
  };

  return (
    <div className="fixed inset-0 bg-[#000000] flex flex-col pt-12 p-6 z-[999] selection:bg-[#00E676] selection:text-black">
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

      {/* Headline Section */}
      <div className="pt-8 mb-8 text-left">
        <h1 className="text-[34px] font-extrabold text-white leading-[1.1] tracking-tight m-0">
          CONSISTENCY<br/>
          THAT<br/>
          <span className="[text-shadow:0_0_20px_rgba(0,230,118,0.35)]">COMPOUNDS.</span>
        </h1>
        <p className="text-[13px] text-white/45 mt-3 leading-relaxed">
          Track your habits for a day or a year. Build unbreakable routines with real-time streak tracking.
        </p>
      </div>

      {/* Main Feature Visualization */}
      <div className="flex-1 space-y-6">
        {/* LONGEST STREAK CARD */}
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-bold text-[#00E676] tracking-widest mb-0.5 uppercase">365 DAYS</p>
            <p className="text-sm font-semibold text-white/70 tracking-widest uppercase">LONGEST STREAK</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-[#00E676] tracking-tighter">365</span>
            <Flame size={28} className="text-[#00E676]" strokeWidth={1.5} />
          </div>
        </div>

        {/* HEATMAP SIZE & BREATHING ROOM */}
        <div className="mt-4 mb-2 w-full px-2 min-h-[180px] overflow-visible">
          <div className="flex justify-between mb-1 px-0.5">
            {['JAN', 'APR', 'JUL', 'OCT'].map(m => (
              <span key={m} className="text-[10px] font-bold text-white/40 tracking-widest uppercase">{m}</span>
            ))}
          </div>
          <div className="grid grid-cols-[repeat(52,1fr)] gap-[3px] w-full items-start">
            {heatmapData.map((val, i) => (
              <div 
                key={i} 
                style={{ width: '100%', aspectRatio: '1/1' }}
                className={`rounded-[1.5px] transition-colors duration-500 ${getCellColor(val)}`} 
              />
            ))}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-2 opacity-50">
            <span className="text-[10px] text-white/30 tracking-tight">LESS</span>
            {[0, 1, 2, 3, 4].map(v => (
              <div 
                key={v} 
                className={`w-2.5 h-2.5 rounded-[1px] ${getCellColor(v)}`} 
              />
            ))}
            <span className="text-[10px] text-white/30 tracking-tight">MORE</span>
          </div>
        </div>
      </div>

      {/* 
        CHANGE — ONBOARDING SCREEN 2: DOTS + ARROW IN SAME ROW
        Premium inline layout for high-intent navigation.
      */}
      <div className="flex items-center justify-between px-6 mb-10 mt-auto">
        {/* Pagination dots — left aligned */}
        <div className="flex items-center gap-2">
          {/* dot 1 - inactive */}
          <div className="w-2 h-2 rounded-full bg-white/20" />
          {/* dot 2 - active (screen 2) */}
          <div className="w-6 h-2 rounded-full bg-[#00E676] shadow-[0_0_8px_rgba(0,230,118,0.5)]" />
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
    </div>
  );
};

export default OnboardingScreen2;
