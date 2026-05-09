export type ThemeMode = 'dark' | 'light';

export const themeColors = {
  dark: {
    bg: '#000000',
    bgPage: '#080C0A',
    surface: '#0A0A0A',
    surfaceElevated: '#111111',
    surfaceCard: '#121212',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.45)',
    textTertiary: 'rgba(255,255,255,0.25)',
    border: 'rgba(255,255,255,0.08)',
    borderSubtle: 'rgba(255,255,255,0.05)',
    inputBg: '#0A0A0A',
    inputBorder: 'rgba(255,255,255,0.10)',
  },
  light: {
    bg: '#F2F2F7',
    bgPage: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceElevated: '#F8F8F8',
    surfaceCard: '#FFFFFF',
    text: '#0A0A0A',
    textSecondary: 'rgba(0,0,0,0.65)',
    textTertiary: 'rgba(0,0,0,0.50)',
    border: 'rgba(0,0,0,0.08)',
    borderSubtle: 'rgba(0,0,0,0.05)',
    inputBg: '#FFFFFF',
    inputBorder: 'rgba(0,0,0,0.12)',
  },
} as const;

export const getTheme = (mode: ThemeMode) => themeColors[mode];
