import { createContext, useContext, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { PaywallModal } from '../components/PaywallModal';
import { WebPaywallModal } from '../components/WebPaywallModal';

type PaywallContextType = {
  isPaywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
};

const PaywallContext = createContext<PaywallContextType | undefined>(undefined);

export const PaywallProvider = ({ children }: { children: ReactNode }) => {
  const [isPaywallOpen, setPaywallOpen] = useState(false);

  const openPaywall = async () => {
    try {
      setPaywallOpen(true);
    } catch (err: any) {
      console.warn('[PaywallContext] openPaywall error:', err?.message);
    }
  };

  const closePaywall = () => setPaywallOpen(false);

  return (
    <PaywallContext.Provider
      value={{
        isPaywallOpen,
        openPaywall,
        closePaywall
      }}
    >
      {children}
      {/* The Global Modal mounts here, above all routes */}
      {isPaywallOpen && (
        Capacitor.isNativePlatform()
          ? <PaywallModal onClose={() => setPaywallOpen(false)} />
          : <WebPaywallModal onClose={() => setPaywallOpen(false)} />
      )}
    </PaywallContext.Provider>
  );
};

export const usePaywall = () => {
  const context = useContext(PaywallContext);
  if (!context) throw new Error('usePaywall must be used within PaywallProvider');
  return context;
};
