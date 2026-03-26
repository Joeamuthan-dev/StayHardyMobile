import React from 'react';
import { Repeat, Activity, Lock } from 'lucide-react';
import { usePaywall } from '../context/PaywallContext';
import { useSubscription } from '../context/SubscriptionContext';

interface FeatureGateProps {
  children: React.ReactNode;
  moduleName: 'Habits' | 'Stats';
  isPro?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ children, moduleName, isPro: explicitIsPro }) => {
  const { isPro: contextIsPro, loading } = useSubscription();
  const { openPaywall } = usePaywall();

  // Safety: use explicit prop if provided, otherwise context
  const isPro = explicitIsPro !== undefined ? explicitIsPro : contextIsPro;

  // 1. Loading State - Dark Mode Skeleton Loader
  if (loading && explicitIsPro === undefined) {
    return (
      <div className="flex-1 w-full min-h-[80vh] flex flex-col items-center justify-center px-6 animate-pulse"
        style={{ background: '#080C0A' }}
      >
        <div className="w-24 h-24 rounded-3xl bg-white/5 mb-8" />
        <div className="h-8 w-48 bg-white/5 rounded-lg mb-3" />
        <div className="h-4 w-64 bg-white/5 rounded-lg mb-10" />
        <div className="h-[54px] w-full max-w-[240px] bg-white/5 rounded-2xl" />
      </div>
    );
  }

  // 2. Pro Access
  if (isPro) {
    return <>{children}</>;
  }

  // 3. Locked State - Premium Fallback UI
  const moduleConfig = {
    Habits: {
      icon: Repeat,
      copy: "Habit Tracking Locked. Unlock deep analytics, completion trends, and streak tracking."
    },
    Stats: {
      icon: Activity,
      copy: "Advanced Telemetry Locked. Unlock heatmaps, productivity index, and detailed visual reports."
    }
  };

  const { icon: ModuleIcon, copy } = moduleConfig[moduleName];

  return (
    <div className="flex-1 w-full min-h-[80vh] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'radial-gradient(circle at center, #1A1C1E 0%, #080C0A 100%)' }}
    >
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center relative">
          <ModuleIcon className="w-12 h-12 text-white/40" />
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#00E676] border-4 border-[#080C0A] flex items-center justify-center shadow-lg">
            <Lock className="w-3.5 h-3.5 text-black" />
          </div>
        </div>
        <div className="absolute inset-0 bg-[#00E676]/10 blur-3xl rounded-full" />
      </div>

      <h2 className="text-2xl font-black text-white/90 mb-3 tracking-tight">
        {moduleName.toUpperCase()} LOCKED
      </h2>
      
      <p className="max-w-xs text-gray-400 font-medium mb-10 leading-relaxed text-sm">
        {copy}
      </p>

      <button
        onClick={openPaywall}
        className="w-full max-w-[240px] h-[54px] bg-[#00E676] hover:bg-[#00FF81] transform active:scale-95 transition-all rounded-2xl text-black font-black tracking-tight text-sm shadow-[0_10px_30px_rgba(0,230,118,0.2)]"
      >
        UNLOCK {moduleName.toUpperCase()}
      </button>
    </div>
  );
};
