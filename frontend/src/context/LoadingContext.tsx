import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

interface LoadingContextType {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  loadingText: string;
  setLoadingText: (text: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoadingState] = useState<boolean>(true); // Default to true for app startup
  const [loadingText, setLoadingTextState] = useState<string>("Stay Hardy Protocol Initializing...");

  const setLoading = useCallback((v: boolean) => setLoadingState(v), []);
  const setLoadingText = useCallback((t: string) => setLoadingTextState(t), []);

  const contextValue = useMemo(() => ({
    loading, setLoading, loadingText, setLoadingText,
  }), [loading, setLoading, loadingText, setLoadingText]);

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
