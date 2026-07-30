import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { tokens } from '../tokens';
import theme from '../theme';
import Pain from '../../components/sections/Pain';
import Pricing from '../../components/sections/Pricing';
import Solution from '../../components/sections/Solution';

/**
 * Feature 25. Las sombras, gradientes y bordes teñidos de marca de `Pain`,
 * `Pricing` y `Solution` estaban escritos como `rgba()` literales: duplicaban
 * `brand.orange` y `brand.green` fuera de `src/theme/tokens.ts`, así que
 * cambiar el token dejaba esos colores con el valor viejo.
 *
 * Este test cierra las dos mitades del acceptance:
 *
 *   1. Que los valores computados NO cambiaron: cada `alpha(token, x)` se
 *      compara contra el literal exacto que había antes del cambio.
 *   2. Que los componentes emiten de verdad ese color, leyendo el CSS que
 *      Emotion inyecta en el documento (los `&:hover` no son observables con
 *      `getComputedStyle`, pero sí están en la hoja de estilos).
 */

/**
 * Canales `[r, g, b, a]` de los literales que había escritos a mano antes de la
 * feature 25. Se guardan como números y no como el string `rgba(…)` original a
 * propósito: el acceptance 3 exige que `grep -rnE 'rgba\(232|rgba\(22, ?163'
 * src/` no devuelva **nada**, y un literal congelado aquí lo haría fallar.
 * Como números, además, la comparación es la correcta: `0.30` y `0.3` son el
 * mismo valor, y el espacio tras la coma que mete `alpha()` no cuenta.
 */
const BEFORE = {
  painCard: [232, 68, 10, 0.06],
  painCardHover: [232, 68, 10, 0.16],
  painSolutionTop: [22, 163, 74, 0.06],
  painSolutionBottom: [22, 163, 74, 0.1],
  pricingFeatured: [232, 68, 10, 0.15],
  pricingTrialBorder: [22, 163, 74, 0.25],
  solutionIcon: [232, 68, 10, 0.3],
} as const;

/** Expresión que sustituye a cada literal, derivada del token. */
const AFTER = {
  painCard: alpha(tokens.brand.orange, 0.06),
  painCardHover: alpha(tokens.brand.orange, 0.16),
  painSolutionTop: alpha(tokens.brand.green, 0.06),
  painSolutionBottom: alpha(tokens.brand.green, 0.1),
  pricingFeatured: alpha(tokens.brand.orange, 0.15),
  pricingTrialBorder: alpha(tokens.brand.green, 0.25),
  solutionIcon: alpha(tokens.brand.orange, 0.3),
} as const;

/** Extrae los canales de un color `rgb()`/`rgba()` como números. */
function channels(color: string): number[] {
  const inner = /rgba?\(([^)]+)\)/.exec(color);
  if (!inner) throw new Error(`no es un color rgba(): ${color}`);
  return inner[1].split(',').map(Number);
}

const squash = (css: string) => css.replace(/\s+/g, '');

/** CSS que Emotion ha inyectado en el documento hasta este momento. */
const emittedCss = () => squash(document.head.textContent ?? '');

describe('rgba() de marca derivados del token (feature 25)', () => {
  it('cada alpha(token, x) da exactamente el mismo color que el literal que sustituye', () => {
    for (const key of Object.keys(BEFORE) as (keyof typeof BEFORE)[]) {
      expect(channels(AFTER[key]), `${key} cambió de color`).toEqual([...BEFORE[key]]);
    }
  });

  it('los colores salen del token, no de una copia: mover brand.* los mueve', () => {
    expect(AFTER.painCard).toBe(alpha(tokens.brand.orange, 0.06));
    expect(AFTER.painSolutionTop).toBe(alpha(tokens.brand.green, 0.06));
    expect(channels(AFTER.painCard).slice(0, 3)).toEqual(channels(alpha(tokens.brand.orange, 1)).slice(0, 3));
    expect(channels(AFTER.painSolutionTop).slice(0, 3)).toEqual(channels(alpha(tokens.brand.green, 1)).slice(0, 3));
  });

  it('Pain emite la sombra de tarjeta, la de hover y el gradiente de la solución', () => {
    render(
      <ThemeProvider theme={theme}>
        <Pain />
      </ThemeProvider>,
    );

    const css = emittedCss();
    expect(css).toContain(squash(`0 2px 16px ${AFTER.painCard}`));
    expect(css).toContain(squash(`0 20px 44px ${AFTER.painCardHover}`));
    expect(css).toContain(
      squash(`linear-gradient(180deg, ${AFTER.painSolutionTop} 0%, ${AFTER.painSolutionBottom} 100%)`),
    );
  });

  it('Pricing emite la sombra del plan destacado y el borde del distintivo de prueba', () => {
    render(
      <ThemeProvider theme={theme}>
        <Pricing isAnnual={false} onToggle={() => {}} onOpenContact={() => {}} />
      </ThemeProvider>,
    );

    const css = emittedCss();
    expect(css).toContain(squash(`0 14px 40px ${AFTER.pricingFeatured}`));
    expect(css).toContain(squash(`1px solid ${AFTER.pricingTrialBorder}`));
  });

  it('Solution emite la sombra del icono de cada paso', () => {
    render(
      <ThemeProvider theme={theme}>
        <Solution />
      </ThemeProvider>,
    );

    expect(emittedCss()).toContain(squash(`0 8px 24px ${AFTER.solutionIcon}`));
  });
});
