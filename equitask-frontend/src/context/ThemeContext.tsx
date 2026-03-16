import React, { createContext, useContext, useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

interface ThemeContextType {
  accentColor: string;
  setAccentColor: (color: string) => void;
  compactMode: boolean;
  setCompactMode: (val: boolean) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  accentColor: '#028090',
  setAccentColor: () => {},
  compactMode: false,
  setCompactMode: () => {},
  animationsEnabled: true,
  setAnimationsEnabled: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accentColor, setAccentColorState] = useState(
    localStorage.getItem('accentColor') || '#028090'
  );
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

  const theme = createTheme({
    palette: {
      primary: { main: accentColor },
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
            '&:hover': {
              backgroundColor: accentColor,
              filter: 'brightness(0.88)',
            },
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
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};