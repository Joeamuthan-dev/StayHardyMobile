import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import React from 'react';
import { Capacitor } from '@capacitor/core';

// Lazy load paywall modals — they're rarely shown and are heavy components
const PaywallModal = React.lazy(() => import('../components/PaywallModal').then(m => ({ default: m.PaywallModal })));
const WebPaywallModal = React.lazy(() => import('../components/WebPaywallModal').then(m => ({ default: m.WebPaywallModal })));

type PaywallContextType = {
  isPaywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
};

const PaywallContext = createContext<PaywallContextType | undefined>(undefined);

export const PaywallProvider = ({ children }: { children: ReactNode }) => {
  const [isPaywallOpen, setPaywallOpen] = useState(false);

  const openPaywall = useCallback(async () => {
    try {
      setPaywallOpen(true);
    } catch (err: any) {
      console.warn('[PaywallContext] openPaywall error:', err?.message);
    }
  }, []);

  const closePaywall = useCallback(() => setPaywallOpen(false), []);

  const contextValue = useMemo(() => ({
    isPaywallOpen,
    openPaywall,
    closePaywall,
  }), [isPaywallOpen, openPaywall, closePaywall]);

  return (
    <PaywallContext.Provider value={contextValue}>
      {children}
      {/* The Global Modal mounts here, above all routes */}
      {isPaywallOpen && (
        <React.Suspense fallback={null}>
          {Capacitor.isNativePlatform()
            ? <PaywallModal onClose={closePaywall} />
            : <WebPaywallModal onClose={closePaywall} />}
        </React.Suspense>
      )}
    </PaywallContext.Provider>
  );
};

export const usePaywall = () => {
  const context = useContext(PaywallContext);
  if (!context) throw new Error('usePaywall must be used within PaywallProvider');
  return context;
};
