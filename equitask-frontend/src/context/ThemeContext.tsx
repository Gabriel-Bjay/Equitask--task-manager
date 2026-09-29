import React, { createContext, useContext, useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';

const DEFAULT_ACCENT = '#028090';

// The accent comes from localStorage, so only a #rrggbb value is trusted.
const readStoredAccent = () => {
  const stored = localStorage.getItem('accentColor');
  return stored && /^#[0-9a-f]{6}$/i.test(stored) ? stored : DEFAULT_ACCENT;
};

const hexToRgb = (hex: string) => {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

// Blend toward black (0) or white (255); `amount` is the target's share.
const mix = (rgb: number[], target: number, amount: number) =>
  '#' + rgb
    .map((c) => Math.round(c + (target - c) * amount).toString(16).padStart(2, '0'))
    .join('');

interface ThemeContextType {
  accentColor: string;
  setAccentColor: (color: string) => void;
  compactMode: boolean;
  setCompactMode: (val: boolean) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  accentColor: DEFAULT_ACCENT,
  setAccentColor: () => {},
  compactMode: false,
  setCompactMode: () => {},
  animationsEnabled: true,
  setAnimationsEnabled: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accentColor, setAccentColorState] = useState(readStoredAccent);
  const [compactMode, setCompactModeState] = useState(
    localStorage.getItem('compactMode') === 'true'
  );
  const [animationsEnabled, setAnimationsEnabledState] = useState(
    localStorage.getItem('animationsEnabled') !== 'false'
  );

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem('accentColor', color);
  };

  const setCompactMode = (val: boolean) => {
    setCompactModeState(val);
    localStorage.setItem('compactMode', String(val));
  };

  const setAnimationsEnabled = (val: boolean) => {
    setAnimationsEnabledState(val);
    localStorage.setItem('animationsEnabled', String(val));
  };

  const accentRgb = hexToRgb(accentColor);
  const accentDark = mix(accentRgb, 0, 0.26);

  const theme = createTheme({
    palette: {
      primary: { main: accentColor, dark: accentDark },
      secondary: { main: '#1A3C5E' },
      background: { default: '#F5F7FA' },
    },
    typography: {
      fontFamily: '"DM Sans", Roboto, Arial, sans-serif',
    },
    shape: { borderRadius: 10 },
    spacing: compactMode ? 6 : 8,
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            transition: animationsEnabled
              ? 'all 0.2s ease'
              : 'none',
          },
          containedPrimary: {
            backgroundColor: accentColor,
            '&:hover': { backgroundColor: accentDark },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
            borderRadius: 12,
            border: '1px solid #EEF2F6',
            transition: animationsEnabled ? 'all 0.2s ease' : 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
            borderRadius: 12,
            border: '1px solid #EEF2F6',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              backgroundColor: 'white',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500, fontSize: 12 },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{
      accentColor, setAccentColor,
      compactMode, setCompactMode,
      animationsEnabled, setAnimationsEnabled,
    }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Components style themselves with these, so the accent reaches every page. */}
        <GlobalStyles styles={{
          ':root': {
            '--accent': accentColor,
            '--accent-rgb': accentRgb.join(' '),
            '--accent-dark': accentDark,
            '--accent-soft': mix(accentRgb, 255, 0.91),
            '--accent-softer': mix(accentRgb, 255, 0.95),
          },
        }} />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};