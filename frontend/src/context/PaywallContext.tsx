import { createContext, useContext, useState, type ReactNode } from 'react';
import { PaywallModal } from '../components/PaywallModal';

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
      {isPaywallOpen && <PaywallModal onClose={() => setPaywallOpen(false)} />}
    </PaywallContext.Provider>
  );
};

export const usePaywall = () => {
  const context = useContext(PaywallContext);
  if (!context) throw new Error('usePaywall must be used within PaywallProvider');
  return context;
};
