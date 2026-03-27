import React from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import ProBlurGate from './ProBlurGate';

interface FeatureGateProps {
  children: React.ReactNode;
  moduleName: 'Habits' | 'Stats';
  isPro?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ children, moduleName, isPro: explicitIsPro }) => {
  const { isPro: contextIsPro, loading } = useSubscription();

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

  // 3. Locked State — Teaser Blur (show page blurred)
  return (
    <ProBlurGate featureName={moduleName}>
      {children}
    </ProBlurGate>
  );
};
