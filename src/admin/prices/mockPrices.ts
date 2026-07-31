/**
 * Datos y operaciones mock de los planes de precios (maqueta de la feature 30).
 *
 * La pantalla se maqueta **sin backend**, por decisión explícita del humano: aquí
 * no hay ningún `fetch`, ningún helper de `src/lib/api.ts` y ninguna URL contra
 * el backend real, solo un almacén en memoria.
 *
 * La forma de los datos es **exactamente** la del contrato real leído de la
 * fuente en `docs/api-contract.md` §10.4 (commit `f878d0b` del backend), para que
 * el cableado posterior sea mecánico:
 *
 *   GET    /api/precios            → { rows }   (pública, orden ASC)
 *   GET    /api/admin/precios/:id  → { plan }
 *   POST   /api/admin/precios      → 201 { plan }
 *   PATCH  /api/admin/precios/:id  → 200 { plan }
 *   DELETE /api/admin/precios/:id  → 204 sin cuerpo
 *
 * Tres cosas del contrato que este módulo reproduce a propósito:
 *
 * 1. **`precio_anual` y `ahorro_anual` son DERIVADOS**: no se guardan en la tabla
 *    `planes` ni viajan en el `PATCH`. Por eso `StoredPlan` no los tiene y
 *    `MockPlanPatch` tampoco: es imposible «editarlos» sin cambiar este archivo.
 * 2. **El descuento es POR PLAN** (`descuento_pct`), no un porcentaje global de
 *    la sección.
 * 3. **Los planes Custom se detectan por `es_custom`, nunca por el nulo.** El
 *    handoff del backend (`API_READY.md`) dice que un Custom trae tres campos en
 *    `null`, pero su código solo anula `precio_anual` y `ahorro_anual`:
 *    `precio_mensual` pasa por `toNumber()`, que convierte `null` en **`0`**. Un
 *    front que se fíe del nulo pinta «$0» en el plan Enterprise. La discrepancia
 *    está verificada en `docs/api-contract.md` §10.4 y aquí se reproduce tal cual
 *    para que el test la vea: el seed guarda `null` y `toPlan()` devuelve `0`.
 *
 * TODO(feature-30): sustituir `listMockPlanes` / `updateMockPlan` por los helpers
 * equivalentes de `src/lib/api.ts` (consumidos con `normalizeApi`) cuando se
 * cablee el recurso. Al cablear, ojo con dos cosas: (1) el `id` llega como
 * **string** (`BIGSERIAL` sin castear), como aquí; (2) los 422 traen `{ error,
 * field }` y `normalizeApi` todavía descarta `field` — es la feature 31.
 */

/** Objeto `plan` tal cual lo devuelve la API: los 14 campos de `toPlan()`. */
export interface MockPlan {
  /** El backend devuelve el `BIGSERIAL` sin castear: llega como string. */
  id: string;
  nombre: string;
  /** `0` en los planes Custom, no `null`: es el `toNumber()` del backend. */
  precio_mensual: number;
  descuento_pct: number;
  /** Derivado, de solo lectura. `null` si `es_custom`. */
  precio_anual: number | null;
  /** Derivado, de solo lectura. `null` si `es_custom`. */
  ahorro_anual: number | null;
  vinetas: string[];
  vinetas_tachadas: string[];
  destacado: boolean;
  trial_texto: string | null;
  es_custom: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

/**
 * Lo que la tabla `planes` guarda de verdad: el plan **sin** los dos derivados y
 * con las columnas `NUMERIC` nulables, que es como quedan en un plan Custom.
 */
type StoredPlan = Omit<MockPlan, 'precio_mensual' | 'descuento_pct' | 'precio_anual' | 'ahorro_anual'> & {
  precio_mensual: number | null;
  descuento_pct: number | null;
};

/** El listado responde `{ rows }`: sin `total` ni `limit`/`offset`. */
export interface MockPlanesList {
  rows: MockPlan[];
}

/** Campos que el backend puede señalar en un `422 { error, field }`. */
export type MockPlanField =
  | 'nombre' | 'precio_mensual' | 'descuento_pct' | 'vinetas'
  | 'vinetas_tachadas' | 'destacado' | 'trial_texto' | 'es_custom' | 'orden';

/** Equivalente local de `ApiSuccess | ApiFailure`: nunca lanza. */
export type MockResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: MockPlanField };

/**
 * Lo que admite el `PATCH`. **No incluye `precio_anual` ni `ahorro_anual`**: el
 * backend los deriva, así que ofrecerlos como campos editables contradice el
 * modelo.
 */
export type MockPlanPatch = Partial<Omit<StoredPlan, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Aritmética exacta del backend (`src/precios.js:54-70`).
 *
 * `precio_anual` es el **precio mensual facturando anualmente**, no el total del
 * año: `19` al 10 % da `17`, y de ahí el «Ahorras $24/año» de la landing.
 */
export function calcularPrecioAnual(precioMensual: number, descuentoPct: number): number {
  return Math.round(precioMensual * (1 - descuentoPct / 100));
}

export function calcularAhorroAnual(precioMensual: number, precioAnual: number): number {
  return Math.round((precioMensual - precioAnual) * 12);
}

/** Los dos derivados a la vez, con la regla de `es_custom` incluida. */
export function derivarPrecios(
  plan: { precio_mensual: number; descuento_pct: number; es_custom: boolean },
): { precio_anual: number | null; ahorro_anual: number | null } {
  if (plan.es_custom) return { precio_anual: null, ahorro_anual: null };
  const precioAnual = calcularPrecioAnual(plan.precio_mensual, plan.descuento_pct);
  return { precio_anual: precioAnual, ahorro_anual: calcularAhorroAnual(plan.precio_mensual, precioAnual) };
}

/** `toNumber()` del backend (`src/precios.js:48-51`): un `NUMERIC NULL` sale como `0`. */
function toNumber(value: number | null): number {
  return value == null ? 0 : value;
}

/** `toPlan()` del backend: añade los dos derivados a la fila almacenada. */
function toPlan(row: StoredPlan): MockPlan {
  const precioMensual = toNumber(row.precio_mensual);
  const descuentoPct = toNumber(row.descuento_pct);
  return {
    ...row,
    precio_mensual: precioMensual,
    descuento_pct: descuentoPct,
    ...derivarPrecios({ precio_mensual: precioMensual, descuento_pct: descuentoPct, es_custom: row.es_custom }),
    vinetas: [...row.vinetas],
    vinetas_tachadas: [...row.vinetas_tachadas],
  };
}

/**
 * Seed alineado con los cuatro planes que la landing tiene hard-codeados en
 * `src/components/sections/Pricing.tsx` (que **no se toca** en esta feature).
 *
 * Ojo con Growth: la landing muestra `540` y «Ahorras $708/año», cifras escritas
 * a mano. Con `descuento_pct: 10` la aritmética del backend da `539` y `720`
 * (`Math.round(599 × 0.9) = 539`). Se deja el descuento redondo y se acepta la
 * diferencia: aquí las cifras se **calculan**, no se transcriben, y es
 * exactamente lo que pasará el día que la landing consuma la API.
 */
const SEED: StoredPlan[] = [
  {
    id: '1', nombre: 'Starter', precio_mensual: 19, descuento_pct: 10,
    vinetas: [
      '1 agente activo', '100 créditos/mes', '50 MB knowledge base',
      'WhatsApp + Web chat', 'Soporte por email',
    ],
    vinetas_tachadas: ['Workflows avanzados', 'Llamadas en tiempo real'],
    destacado: false, trial_texto: '14 días de prueba gratis', es_custom: false, orden: 0,
    created_at: '2026-05-04T09:00:00.000Z', updated_at: '2026-05-04T09:00:00.000Z',
  },
  {
    id: '2', nombre: 'Team', precio_mensual: 199, descuento_pct: 10,
    vinetas: [
      '3 agentes activos', '1,000 créditos/mes', '500 MB knowledge base',
      'Todos los canales', '3 workflows avanzados', 'Dashboard de KPIs',
      'Centro de actividades', 'Soporte prioritario (ticket)',
    ],
    vinetas_tachadas: [],
    destacado: true, trial_texto: null, es_custom: false, orden: 1,
    created_at: '2026-05-04T09:01:00.000Z', updated_at: '2026-06-12T17:20:00.000Z',
  },
  {
    id: '3', nombre: 'Growth', precio_mensual: 599, descuento_pct: 10,
    vinetas: [
      '5 agentes activos', '2,500 créditos/mes', '1 GB knowledge base',
      'Todos los canales', 'Workflows ilimitados', 'Llamadas en tiempo real',
      'Dashboard de KPIs', 'Centro de monitoreo', 'Soporte dedicado',
    ],
    vinetas_tachadas: [],
    destacado: false, trial_texto: null, es_custom: false, orden: 2,
    created_at: '2026-05-04T09:02:00.000Z', updated_at: '2026-05-04T09:02:00.000Z',
  },
  {
    // El plan Custom: la tabla guarda `NULL` en los dos `NUMERIC`, y `toPlan()`
    // devuelve `precio_mensual: 0`. Detectarlo por `es_custom`, nunca por el nulo.
    id: '4', nombre: 'Enterprise', precio_mensual: null, descuento_pct: null,
    vinetas: [
      'Agentes ilimitados', 'Créditos a convenir', 'Integraciones avanzadas',
      'Autenticación avanzada', 'Soporte Premier',
    ],
    vinetas_tachadas: [],
    destacado: false, trial_texto: null, es_custom: true, orden: 3,
    created_at: '2026-05-04T09:03:00.000Z', updated_at: '2026-05-04T09:03:00.000Z',
  },
];

function clonar(row: StoredPlan): StoredPlan {
  return { ...row, vinetas: [...row.vinetas], vinetas_tachadas: [...row.vinetas_tachadas] };
}

let store: StoredPlan[] = SEED.map(clonar);

/** Devuelve el almacén a su estado inicial (lo usan los tests entre casos). */
export function resetMockPlanes(): void {
  store = SEED.map(clonar);
}

/** `''` o texto no numérico → `null`. Acepta decimales: la columna es `NUMERIC`. */
export function parseImporte(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** El orden es un entero >= 0, como en imágenes. */
export function parseOrden(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** Importe en pesos para la UI: «$19», «$1,999». Mismo criterio que la landing. */
export function formatMoneda(importe: number): string {
  return `$${importe.toLocaleString('es-MX')}`;
}

/** Una viñeta por línea; se descartan los espacios y las líneas vacías. */
export function parseVinetas(raw: string): string[] {
  return raw.split('\n').map(v => v.trim()).filter(Boolean);
}

export function vinetasATexto(vinetas: string[]): string {
  return vinetas.join('\n');
}

/** Orden del backend: `orden ASC, id ASC`. */
function ordenar(rows: StoredPlan[]): StoredPlan[] {
  return [...rows].sort((a, b) => a.orden - b.orden || Number(a.id) - Number(b.id));
}

export async function listMockPlanes(): Promise<MockResult<MockPlanesList>> {
  return { ok: true, data: { rows: ordenar(store).map(toPlan) } };
}

export async function updateMockPlan(id: string, patch: MockPlanPatch): Promise<MockResult<{ plan: MockPlan }>> {
  const current = store.find(p => p.id === id);
  if (!current) return { ok: false, error: 'Plan no encontrado' };

  const nombre = (patch.nombre ?? current.nombre).trim();
  if (!nombre) return { ok: false, error: 'Nombre requerido', field: 'nombre' };

  const esCustom = patch.es_custom ?? current.es_custom;
  const orden = patch.orden ?? current.orden;
  if (!Number.isInteger(orden) || orden < 0) {
    return { ok: false, error: 'El orden debe ser un entero mayor o igual que 0', field: 'orden' };
  }

  // Un plan Custom no guarda cifras: la tabla deja los dos `NUMERIC` en `NULL`.
  let precioMensual: number | null = null;
  let descuentoPct: number | null = null;

  if (!esCustom) {
    precioMensual = patch.precio_mensual !== undefined ? patch.precio_mensual : current.precio_mensual;
    descuentoPct = patch.descuento_pct !== undefined ? patch.descuento_pct : current.descuento_pct;
    if (precioMensual == null || !Number.isFinite(precioMensual) || precioMensual < 0) {
      return { ok: false, error: 'El precio mensual debe ser un número mayor o igual que 0', field: 'precio_mensual' };
    }
    if (descuentoPct == null || !Number.isFinite(descuentoPct) || descuentoPct < 0 || descuentoPct > 100) {
      return { ok: false, error: 'El descuento debe ser un número entre 0 y 100', field: 'descuento_pct' };
    }
  }

  const trial = patch.trial_texto !== undefined ? patch.trial_texto : current.trial_texto;

  const row: StoredPlan = {
    ...current,
    nombre,
    precio_mensual: precioMensual,
    descuento_pct: descuentoPct,
    vinetas: [...(patch.vinetas ?? current.vinetas)],
    vinetas_tachadas: [...(patch.vinetas_tachadas ?? current.vinetas_tachadas)],
    destacado: patch.destacado ?? current.destacado,
    trial_texto: trial ? trial.trim() : null,
    es_custom: esCustom,
    orden,
    updated_at: new Date().toISOString(),
  };

  store = store.map(p => (p.id === id ? row : p));
  return { ok: true, data: { plan: toPlan(row) } };
}
