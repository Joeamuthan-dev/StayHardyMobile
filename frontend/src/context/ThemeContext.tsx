import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { mergeAppSettings, getAppSettings } from '../lib/cacheManager';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'dark';
  });

  useEffect(() => {
    void (async () => {
      const s = await getAppSettings<{ theme?: Theme }>();
      if (s?.theme === 'light' || s?.theme === 'dark') {
        setTheme(s.theme);
      }
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    void mergeAppSettings({ theme });
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark')), []);

  const contextValue = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
