/**
 * Tokens de color — ÚNICA fuente de verdad del proyecto (feature 23).
 *
 * Las dos capas de estilo derivan de aquí y ninguna define hex por su cuenta:
 *
 *   1. El tema MUI (`src/theme/theme.ts`) construye su `palette` con estos
 *      valores. Es la capa que se usa desde `sx` (`color: 'primary.main'`,
 *      `bgcolor: 'surface.soft'`).
 *   2. Las variables CSS (`--orange`, `--border`, …) se generan desde
 *      `cssVariables` y se inyectan en `:root` a través de
 *      `components.MuiCssBaseline.styleOverrides` del propio tema. Es la capa
 *      que se usa cuando el color va dentro de un string CSS crudo
 *      (gradientes, bordes compuestos, `box-shadow`).
 *
 * Cambiar un color = cambiarlo aquí, una sola vez.
 *
 * Cada hex aparece exactamente una vez en este archivo: los alias
 * (`feedback.successMain`, `text.onBrand`…) referencian al token base.
 */

/** Colores de marca: naranja MaIA y sus tintes, más el verde de "solución". */
const brand = {
  orange: '#E8440A',
  orangeHover: '#D03A08',
  orangeLight: '#FF6B35',
  orangeXL: '#FFF0EB',
  orangeXXL: '#FFF8F5',
  /** Tinte cálido de las tarjetas de `Solution`. Casi igual a `orangeXXL`. */
  orangeXXXL: '#FFF9F6',
  green: '#16A34A',
  greenLight: '#DCFCE7',
} as const;

/** Fondos: página, secciones alternas, tarjetas y el pie oscuro. */
const surface = {
  main: '#FFFFFF',
  soft: '#FAFAF9',
  tint: '#FFF5F1',
  /** Fondo oscuro del footer (`--bg-strong`). No existe en la paleta MUI. */
  strong: '#252525',
} as const;

/** Texto. `onBrand` es el texto sobre naranja/verde saturado. */
const text = {
  primary: '#1A1410',
  secondary: '#4A3F3A',
  muted: '#7A6E6A',
  disabled: '#A89E9A',
  onBrand: surface.main,
} as const;

/** Bordes y separadores. `main` es además el `divider` del tema. */
const border = {
  main: '#F0EBE8',
  strong: '#E5DDD9',
} as const;

/** Estados: éxito (reutiliza el verde de marca) y error. */
const feedback = {
  successMain: brand.green,
  successLight: brand.greenLight,
  successDark: '#14532D',
  errorMain: '#DC2626',
  errorLight: '#FEE2E2',
} as const;

/**
 * Paleta categórica decorativa: un color por tarjeta en `Pain`, `Features` y
 * `Addons`. No son colores semánticos del sistema; solo distinguen ítems entre
 * sí. Se componen con sufijo de opacidad en hex (`${accent.violet}18`).
 */
const accent = {
  coral: '#f55c2b',
  violet: '#7C3AED',
  blue: '#0369A1',
  red: '#b90f0f',
  cyan: '#0891B2',
  amber: '#D97706',
} as const;

/** Colores de marca de terceros. No se eligen aquí: los define el tercero. */
const external = {
  whatsapp: '#25D366',
  whatsappShadow: '#075E54',
} as const;

export const tokens = { brand, surface, text, border, feedback, accent, external } as const;

/**
 * Capa CSS derivada: nombre de la variable → token.
 *
 * Los nombres son los históricos de `globals.css` y se mantienen tal cual para
 * no tocar los ~90 usos de `var(--…)` repartidos por el repo. Este objeto es lo
 * único que decide qué tokens se exponen como variables CSS.
 */
export const cssVariables: Record<string, string> = {
  '--orange': brand.orange,
  '--orange-h': brand.orangeHover,
  '--orange-l': brand.orangeLight,
  '--orange-xl': brand.orangeXL,
  '--orange-xxl': brand.orangeXXL,
  '--orange-xxxl': brand.orangeXXXL,
  '--bg': surface.main,
  '--bg-soft': surface.soft,
  '--bg-strong': surface.strong,
  '--surface': surface.main,
  '--surface2': surface.tint,
  '--border': border.main,
  '--border2': border.strong,
  '--text': text.primary,
  '--text2': text.secondary,
  '--muted': text.muted,
  '--muted2': text.disabled,
  '--green': brand.green,
  '--green-l': brand.greenLight,
};

export default tokens;
