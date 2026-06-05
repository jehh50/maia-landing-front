import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    brand: {
      orange: string;
      orangeHover: string;
      orangeLight: string;
      orangeXL: string;
      orangeXXL: string;
      green: string;
      greenLight: string;
    };
    surface: {
      main: string;
      soft: string;
      tint: string;
    };
  }
  interface PaletteOptions {
    brand?: Palette['brand'];
    surface?: Palette['surface'];
  }
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#E8440A',
      dark: '#D03A08',
      light: '#FF6B35',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1A1410',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1410',
      secondary: '#4A3F3A',
      disabled: '#A89E9A',
    },
    success: {
      main: '#16A34A',
      light: '#DCFCE7',
      dark: '#14532D',
    },
    error: {
      main: '#DC2626',
      light: '#FEE2E2',
    },
    divider: '#F0EBE8',
    brand: {
      orange: '#E8440A',
      orangeHover: '#D03A08',
      orangeLight: '#FF6B35',
      orangeXL: '#FFF0EB',
      orangeXXL: '#FFF8F5',
      green: '#16A34A',
      greenLight: '#DCFCE7',
    },
    surface: {
      main: '#FFFFFF',
      soft: '#FAFAF9',
      tint: '#FFF5F1',
    },
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.025em' },
    h3: { fontWeight: 600, lineHeight: 1.3 },
    h4: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
    '0 12px 40px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)',
    ...Array(21).fill('0 12px 40px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)'),
  ] as never,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 100,
          padding: '11px 22px',
          fontSize: 15,
          fontWeight: 600,
        },
        containedPrimary: {
          boxShadow: '0 4px 16px rgba(232,68,10,0.25)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(232,68,10,0.35)',
            backgroundColor: '#D03A08',
          },
        },
        outlined: {
          borderColor: '#E5DDD9',
          color: '#1A1410',
          '&:hover': {
            borderColor: '#E8440A',
            backgroundColor: '#FFF8F5',
          },
        },
        sizeLarge: { padding: '14px 28px', fontSize: 16 },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: { maxWidth: '1140px !important', paddingLeft: 24, paddingRight: 24 },
      },
    },
    MuiTextField: {
      defaultProps: { fullWidth: true, size: 'small' },
    },
  },
});

export default theme;
