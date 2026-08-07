import { render, screen } from '@testing-library/react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { describe, expect, it } from 'vitest';
import { cssVariables, tokens } from '../tokens';
import theme from '../theme';

/**
 * Congela los valores que existían en las DOS capas antes de unificarlas
 * (feature 23). Si alguien cambia un color, este test falla y obliga a
 * declararlo: es la red que sustituye a "acordarse de tocar los dos archivos".
 */
const EXPECTED_CSS_VARIABLES: Record<string, string> = {
  '--orange': '#E8440A',
  '--orange-h': '#D03A08',
  '--orange-l': '#FF6B35',
  '--orange-xl': '#FFF0EB',
  '--orange-xxl': '#FFF8F5',
  '--orange-xxxl': '#FFF9F6',
  '--bg': '#FFFFFF',
  '--bg-soft': '#FAFAF9',
  '--bg-strong': '#252525',
  '--surface': '#FFFFFF',
  '--surface2': '#FFF5F1',
  '--border': '#F0EBE8',
  '--border2': '#E5DDD9',
  '--text': '#1A1410',
  '--text2': '#4A3F3A',
  '--muted': '#7A6E6A',
  '--muted2': '#A89E9A',
  '--green': '#16A34A',
  '--green-l': '#DCFCE7',
};

describe('tokens de color', () => {
  it('la capa CSS expone las mismas variables y valores que antes de unificar', () => {
    expect(cssVariables).toEqual(EXPECTED_CSS_VARIABLES);
  });

  it('el tema MUI deriva su paleta de los mismos tokens', () => {
    expect(theme.palette.primary.main).toBe(tokens.brand.orange);
    expect(theme.palette.primary.dark).toBe(tokens.brand.orangeHover);
    expect(theme.palette.primary.light).toBe(tokens.brand.orangeLight);
    expect(theme.palette.background.default).toBe(tokens.surface.main);
    expect(theme.palette.background.paper).toBe(tokens.surface.main);
    expect(theme.palette.text.primary).toBe(tokens.text.primary);
    expect(theme.palette.text.secondary).toBe(tokens.text.secondary);
    expect(theme.palette.text.disabled).toBe(tokens.text.disabled);
    expect(theme.palette.success.main).toBe(tokens.brand.green);
    expect(theme.palette.success.light).toBe(tokens.brand.greenLight);
    expect(theme.palette.divider).toBe(tokens.border.main);
    expect(theme.palette.brand).toEqual(tokens.brand);
    expect(theme.palette.surface).toEqual({
      main: tokens.surface.main,
      soft: tokens.surface.soft,
      tint: tokens.surface.tint,
    });
  });

  it('el tema y la capa CSS no pueden desincronizarse: comparten el token', () => {
    expect(cssVariables['--orange']).toBe(theme.palette.primary.main);
    expect(cssVariables['--border']).toBe(theme.palette.divider);
    expect(cssVariables['--bg']).toBe(theme.palette.background.default);
    expect(cssVariables['--bg-soft']).toBe(theme.palette.surface.soft);
    expect(cssVariables['--surface2']).toBe(theme.palette.surface.tint);
    expect(cssVariables['--text']).toBe(theme.palette.text.primary);
    expect(cssVariables['--text2']).toBe(theme.palette.text.secondary);
    expect(cssVariables['--muted2']).toBe(theme.palette.text.disabled);
    expect(cssVariables['--green']).toBe(theme.palette.success.main);
  });

  it('el tema lleva las variables a :root vía CssBaseline', () => {
    const overrides = theme.components?.MuiCssBaseline?.styleOverrides as
      | Record<string, Record<string, string>>
      | undefined;
    expect(overrides?.[':root']).toEqual(cssVariables);
  });

  it('los tokens sin variable CSS conservan sus valores originales', () => {
    // Colores que antes vivían hardcodeados en los componentes. Se congelan
    // aquí para que el barrido de la feature 23 no haya movido ningún valor.
    expect(tokens.brand.orangeXXXL).toBe('#FFF9F6');
    expect(tokens.feedback.successDark).toBe('#14532D');
    expect(tokens.feedback.errorMain).toBe('#DC2626');
    expect(tokens.feedback.errorLight).toBe('#FEE2E2');
    expect(tokens.accent).toEqual({
      coral: '#f55c2b',
      violet: '#7C3AED',
      blue: '#0369A1',
      red: '#b90f0f',
      cyan: '#0891B2',
      amber: '#D97706',
    });
    expect(tokens.external).toEqual({ whatsapp: '#25D366', whatsappShadow: '#075E54' });
  });

  it('los paths de paleta que usan los sx resuelven al color esperado', () => {
    render(
      <ThemeProvider theme={theme}>
        <Box data-testid="paper" sx={{ bgcolor: 'background.paper' }} />
        <Box data-testid="soft" sx={{ bgcolor: 'surface.soft' }} />
        <Box data-testid="warm" sx={{ bgcolor: 'brand.orangeXXXL' }} />
        <Box data-testid="white" sx={{ color: 'common.white' }} />
        <Box data-testid="black" sx={{ bgcolor: 'common.black' }} />
      </ThemeProvider>,
    );

    expect(getComputedStyle(screen.getByTestId('paper')).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(screen.getByTestId('soft')).backgroundColor).toBe('rgb(250, 250, 249)');
    expect(getComputedStyle(screen.getByTestId('warm')).backgroundColor).toBe('rgb(255, 249, 246)');
    expect(getComputedStyle(screen.getByTestId('white')).color).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(screen.getByTestId('black')).backgroundColor).toBe('rgb(0, 0, 0)');
  });

  it('al montar la app, las variables quedan declaradas en el documento', () => {
    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
      </ThemeProvider>,
    );

    const css = document.head.textContent ?? '';
    expect(css).toContain(':root');
    expect(css.replace(/\s+/g, '')).toContain(`--orange:${tokens.brand.orange}`);
    expect(css.replace(/\s+/g, '')).toContain(`--border:${tokens.border.main}`);
  });
});
