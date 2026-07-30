import { alpha, createTheme } from '@mui/material/styles';
import { cssVariables, tokens } from './tokens';

declare module '@mui/material/styles' {
  interface Palette {
    brand: {
      orange: string;
      orangeHover: string;
      orangeLight: string;
      orangeXL: string;
      orangeXXL: string;
      orangeXXXL: string;
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
      main: tokens.brand.orange,
      dark: tokens.brand.orangeHover,
      light: tokens.brand.orangeLight,
      contrastText: tokens.text.onBrand,
    },
    secondary: {
      main: tokens.text.primary,
    },
    background: {
      default: tokens.surface.main,
      paper: tokens.surface.main,
    },
    text: {
      primary: tokens.text.primary,
      secondary: tokens.text.secondary,
      disabled: tokens.text.disabled,
    },
    success: {
      main: tokens.feedback.successMain,
      light: tokens.feedback.successLight,
      dark: tokens.feedback.successDark,
    },
    error: {
      main: tokens.feedback.errorMain,
      light: tokens.feedback.errorLight,
    },
    divider: tokens.border.main,
    brand: { ...tokens.brand },
    surface: {
      main: tokens.surface.main,
      soft: tokens.surface.soft,
      tint: tokens.surface.tint,
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
    // Capa CSS: las variables de `globals.css` se emiten aquí, derivadas de los
    // mismos tokens que la paleta de arriba (ver src/theme/tokens.ts).
    MuiCssBaseline: {
      styleOverrides: {
        ':root': cssVariables,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 100,
          padding: '11px 22px',
          fontSize: 15,
          fontWeight: 600,
        },
        containedPrimary: {
          boxShadow: `0 4px 16px ${alpha(tokens.brand.orange, 0.25)}`,
          '&:hover': {
            boxShadow: `0 6px 20px ${alpha(tokens.brand.orange, 0.35)}`,
            backgroundColor: tokens.brand.orangeHover,
          },
        },
        outlined: {
          borderColor: tokens.border.strong,
          color: tokens.text.primary,
          '&:hover': {
            borderColor: tokens.brand.orange,
            backgroundColor: tokens.brand.orangeXXL,
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
