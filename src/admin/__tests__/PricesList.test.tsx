import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, afterEach, vi } from 'vitest';
import theme from '../../theme/theme';
import PricesList from '../prices/PricesList';
import { getAdminPlan, normalizeApi, type AdminPlan, type AdminUser } from '../../lib/api';

/**
 * Fixtures con los 14 campos exactos de `toPlan()`.
 *
 * `id` es **string**: el backend devuelve el `BIGSERIAL` sin castear. Enterprise
 * lleva a propósito un id por encima de `Number.MAX_SAFE_INTEGER` — si alguien
 * lo pasara por `Number()`, se convertiría en `…992` y la escritura iría al plan
 * equivocado.
 *
 * Enterprise reproduce además la discrepancia verificada del contrato: es Custom,
 * así que los dos **derivados** llegan en `null`, pero `precio_mensual` llega
 * como **`0`** (el `toNumber()` del backend), no como `null`.
 */
const ENTERPRISE_ID = '9007199254740993';

const SEED: AdminPlan[] = [
  {
    id: '1', nombre: 'Starter', precio_mensual: 19, descuento_pct: 10,
    precio_anual: 17, ahorro_anual: 24,
    vinetas: ['1 agente activo', '100 créditos/mes', 'Soporte por email'],
    vinetas_tachadas: ['Workflows avanzados', 'Llamadas en tiempo real'],
    destacado: false, trial_texto: '14 días de prueba gratis', es_custom: false, orden: 0,
    created_at: '2026-05-04T09:00:00.000Z', updated_at: '2026-05-04T09:00:00.000Z',
  },
  {
    id: '2', nombre: 'Team', precio_mensual: 199, descuento_pct: 10,
    precio_anual: 179, ahorro_anual: 240,
    vinetas: ['3 agentes activos', '1,000 créditos/mes', 'Dashboard de KPIs'],
    vinetas_tachadas: [],
    destacado: true, trial_texto: null, es_custom: false, orden: 1,
    created_at: '2026-05-04T09:01:00.000Z', updated_at: '2026-06-12T17:20:00.000Z',
  },
  {
    id: '3', nombre: 'Growth', precio_mensual: 599, descuento_pct: 10,
    precio_anual: 539, ahorro_anual: 720,
    vinetas: ['5 agentes activos', 'Workflows ilimitados'],
    vinetas_tachadas: [],
    destacado: false, trial_texto: null, es_custom: false, orden: 2,
    created_at: '2026-05-04T09:02:00.000Z', updated_at: '2026-05-04T09:02:00.000Z',
  },
  {
    id: ENTERPRISE_ID, nombre: 'Enterprise', precio_mensual: 0, descuento_pct: 0,
    precio_anual: null, ahorro_anual: null,
    vinetas: ['Agentes ilimitados', 'Soporte Premier'],
    vinetas_tachadas: [],
    destacado: false, trial_texto: null, es_custom: true, orden: 3,
    created_at: '2026-05-04T09:03:00.000Z', updated_at: '2026-05-04T09:03:00.000Z',
  },
];

// Las cuatro rutas de /api/admin/precios exigen rol admin; el editor solo lee.
const adminUser: AdminUser = { id: 1, email: 'ana.torres@maia.mx', name: 'Ana Torres', role: 'admin' };
const editorUser: AdminUser = { id: 2, email: 'bruno.diaz@maia.mx', name: 'Bruno Díaz', role: 'editor' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Los dos derivados del backend (`src/precios.js:64-71`), reimplementados aquí a propósito. */
function derivar(precio: number, pct: number, esCustom: boolean): Pick<AdminPlan, 'precio_anual' | 'ahorro_anual'> {
  if (esCustom) return { precio_anual: null, ahorro_anual: null };
  const anual = Math.round(precio * (1 - pct / 100));
  return { precio_anual: anual, ahorro_anual: Math.round((precio - anual) * 12) };
}

/** `parseDecimal` del backend: **`null` no es un número** y acaba en un 422. */
function parseDecimal(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type Body = Record<string, unknown>;

/** `validarPlan()` del backend, en lo que afecta a esta pantalla. */
function validar(body: Body, requireNombre: boolean): { error: string; field: string } | null {
  if (body.nombre !== undefined || requireNombre) {
    if (!String(body.nombre ?? '').trim()) return { error: 'nombre requerido', field: 'nombre' };
  }
  if (body.precio_mensual !== undefined) {
    const n = parseDecimal(body.precio_mensual);
    if (n === null) return { error: 'precio_mensual debe ser un número', field: 'precio_mensual' };
    if (n < 0) return { error: 'precio_mensual no puede ser negativo', field: 'precio_mensual' };
  }
  if (body.descuento_pct !== undefined) {
    const n = parseDecimal(body.descuento_pct);
    if (n === null || n < 0 || n > 100) {
      return { error: 'descuento_pct debe ser un número entre 0 y 100', field: 'descuento_pct' };
    }
  }
  for (const campo of ['destacado', 'es_custom']) {
    if (body[campo] !== undefined && typeof body[campo] !== 'boolean') {
      return { error: `${campo} debe ser booleano`, field: campo };
    }
  }
  if (body.orden !== undefined && !Number.isInteger(body.orden)) {
    return { error: 'orden debe ser un entero >= 0', field: 'orden' };
  }
  return null;
}

/**
 * Backend mínimo de `/api/precios` + `/api/admin/precios` sobre `globalThis.fetch`
 * con `Response` reales: **no se mockea `src/lib/api.ts`**, así que el cliente
 * HTTP entra en el test y un cambio de contrato (URL, método, payload) lo rompe.
 *
 * Reproduce tres comportamientos del backend real que esta feature tiene que
 * respetar:
 *
 * 1. **`GET /api/admin/precios` no existe**: responde `404`, como el servidor
 *    vivo. Si el panel intentara listar por ahí, la pantalla se quedaría vacía.
 * 2. **`precio_mensual: null` se rechaza con un `422`** (`parseDecimal`): en un
 *    plan a convenir hay que **omitir** las cifras, no mandarlas en nulo.
 * 3. **Los derivados se recalculan en la respuesta** y el Custom sale con
 *    `precio_mensual: 0` y los dos derivados en `null`.
 */
function mockPreciosApi(options: { seed?: AdminPlan[]; list?: () => Response; write?: () => Response } = {}) {
  let store = (options.seed ?? SEED).map(p => ({ ...p }));
  let nextId = 90;

  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = String(init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) as Body : {};
    const id = url.slice(url.lastIndexOf('/') + 1);

    if (method === 'GET') {
      if (url === '/api/precios') {
        if (options.list) return options.list();
        // Orden fijo del backend: `orden ASC, id ASC`.
        const rows = [...store].sort((a, b) => a.orden - b.orden);
        return json({ rows });
      }
      // Verificado contra el servidor vivo: el router solo declara el GET sobre
      // `/:id`, así que el listado bajo /api/admin/ devuelve 404, no 401.
      if (url === '/api/admin/precios') return json({ error: 'Not Found' }, 404);
      const plan = store.find(p => p.id === id);
      return plan ? json({ plan }) : json({ error: 'Plan no encontrado' }, 404);
    }

    if (options.write) return options.write();

    if (method === 'POST' || method === 'PATCH') {
      const invalido = validar(body, method === 'POST');
      if (invalido) return json(invalido, 422);

      const actual = method === 'PATCH' ? store.find(p => p.id === id) : undefined;
      if (method === 'PATCH' && !actual) return json({ error: 'Plan no encontrado' }, 404);

      // `withDefaults()`: lo que no llega, se hereda o cae al default de la columna.
      const precio = parseDecimal(body.precio_mensual) ?? actual?.precio_mensual ?? 0;
      const pct = parseDecimal(body.descuento_pct) ?? actual?.descuento_pct ?? 0;
      const esCustom = (body.es_custom as boolean | undefined) ?? actual?.es_custom ?? false;
      const plan: AdminPlan = {
        id: actual?.id ?? String(nextId++),
        nombre: String(body.nombre ?? actual?.nombre ?? ''),
        precio_mensual: precio,
        descuento_pct: pct,
        ...derivar(precio, pct, esCustom),
        vinetas: (body.vinetas as string[] | undefined) ?? actual?.vinetas ?? [],
        vinetas_tachadas: (body.vinetas_tachadas as string[] | undefined) ?? actual?.vinetas_tachadas ?? [],
        destacado: (body.destacado as boolean | undefined) ?? actual?.destacado ?? false,
        trial_texto: body.trial_texto !== undefined
          ? (body.trial_texto as string | null)
          : actual?.trial_texto ?? null,
        es_custom: esCustom,
        orden: (body.orden as number | undefined) ?? actual?.orden ?? 0,
        created_at: actual?.created_at ?? '2026-07-31T12:00:00.000Z',
        updated_at: '2026-07-31T12:00:00.000Z',
      };
      store = actual ? store.map(p => (p.id === id ? plan : p)) : [...store, plan];
      return json({ plan }, method === 'POST' ? 201 : 200);
    }

    if (method === 'DELETE') {
      if (!store.some(p => p.id === id)) return json({ error: 'Plan no encontrado' }, 404);
      store = store.filter(p => p.id !== id);
      // El backend responde 204 **sin cuerpo**.
      return new Response(null, { status: 204 });
    }
    return json({ error: `método no soportado por el mock: ${method}` }, 500);
  });
}

type PreciosApiSpy = ReturnType<typeof mockPreciosApi>;

function urls(spy: PreciosApiSpy) {
  return spy.mock.calls.map(([input]) => String(input));
}

/** Peticiones que no son el GET del listado. */
function escrituras(spy: PreciosApiSpy) {
  return spy.mock.calls
    .map(([input, init]) => ({ url: String(input), method: String(init?.method ?? 'GET').toUpperCase(), init }))
    .filter(c => c.method !== 'GET');
}

/** Los cuerpos JSON de todas las escrituras, ya parseados. */
function cuerpos(spy: PreciosApiSpy): Body[] {
  return escrituras(spy).map(c => JSON.parse(String(c.init?.body)) as Body);
}

// useOutletContext exige un Outlet padre, así que montamos una Route anidada.
function renderPrices(user: AdminUser = adminUser) {
  return render(
    <MemoryRouter initialEntries={['/admin/prices']}>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route element={<Outlet context={user} />}>
            <Route path="/admin/prices" element={<PricesList />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

/** Texto exacto de una celda de cifras. `toHaveTextContent` haría match parcial: «$14» en «$140». */
function celda(id: string): string {
  return screen.getByTestId(id).textContent ?? '';
}

/** Abre el diálogo de edición de un plan y espera a que esté montado. */
async function abrirEdicion(user: ReturnType<typeof userEvent.setup>, nombre: string) {
  await user.click(screen.getByRole('button', { name: `Editar ${nombre}` }));
  return screen.findByRole('dialog');
}

/** Reemplaza el contenido de un campo por `valor`. */
async function escribir(user: ReturnType<typeof userEvent.setup>, etiqueta: string, valor: string) {
  const campo = screen.getByLabelText(etiqueta);
  await user.clear(campo);
  if (valor) await user.type(campo, valor);
}

afterEach(() => vi.restoreAllMocks());

describe('PricesList — listado', () => {
  it('carga con GET /api/precios (endpoint público, sin cookie) y pinta orden, nombre, cifras, trial y viñetas', async () => {
    const spy = mockPreciosApi();
    renderPrices();

    expect(await screen.findByText('Starter')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^plan-row-/)).toHaveLength(4);

    const starter = screen.getByTestId('plan-row-1');
    expect(within(starter).getAllByRole('cell')[0].textContent).toBe('0');
    expect(celda('plan-1-mensual')).toBe('$19');
    expect(celda('plan-1-descuento')).toBe('10%');
    // Los derivados se pintan tal como los calcula el backend: (19 − 17) × 12 = 24.
    expect(celda('plan-1-anual')).toBe('$17');
    expect(celda('plan-1-ahorro')).toBe('$24');
    expect(within(starter).getByText('14 días de prueba gratis')).toBeInTheDocument();

    const team = screen.getByTestId('plan-row-2');
    expect(celda('plan-2-anual')).toBe('$179');
    expect(celda('plan-2-ahorro')).toBe('$240');
    expect(within(team).getByText('Destacado')).toBeInTheDocument();
    // Sin `trial_texto` no se inventa copy: la celda queda con el guion.
    expect(within(team).getAllByRole('cell')[6].textContent).toBe('—');

    // Las viñetas incluidas y las tachadas se pintan las dos, distinguidas por el tachado.
    const vinetas = screen.getByTestId('plan-1-vinetas');
    expect(within(vinetas).getByText('Workflows avanzados')).toHaveStyle('text-decoration: line-through');
    expect(within(vinetas).getByText('1 agente activo')).not.toHaveStyle('text-decoration: line-through');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toBe('/api/precios');
    // Público: `publicJson` no manda cookie. No es `/api/admin/precios`.
    expect(spy.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit' });
  });

  it('no lista por /api/admin/precios, que no existe, y no pagina', async () => {
    const spy = mockPreciosApi();
    renderPrices();
    await screen.findByText('Starter');

    // El contrato es `{ rows }` a secas: ni limit, ni offset, ni una segunda URL.
    expect(urls(spy)).toEqual(['/api/precios']);
    expect(screen.queryByText(/por página/i)).not.toBeInTheDocument();
    // Y no se ha comido ningún 404 en silencio.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('el detalle sí es privado: GET /api/admin/precios/:id con cookie y payload { plan }', async () => {
    const spy = mockPreciosApi();

    const res = await normalizeApi(getAdminPlan(ENTERPRISE_ID), 'plan', 'No pudimos cargar el plan');

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('el detalle debe responder');
    expect(res.data.plan.nombre).toBe('Enterprise');
    // El id viaja tal cual llega del backend: un Number() lo redondearía a …992.
    expect(String(spy.mock.calls[0][0])).toBe(`/api/admin/precios/${ENTERPRISE_ID}`);
    expect(spy.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'include' });
  });

  it('un plan a convenir no muestra ninguna cifra, aunque el backend devuelva precio_mensual 0', async () => {
    mockPreciosApi();
    renderPrices();
    await screen.findByText('Enterprise');

    // Las cuatro celdas se deciden por `es_custom`: fiarse del nulo pintaría «$0».
    expect(celda(`plan-${ENTERPRISE_ID}-mensual`)).toBe('—');
    expect(celda(`plan-${ENTERPRISE_ID}-descuento`)).toBe('—');
    expect(celda(`plan-${ENTERPRISE_ID}-anual`)).toBe('—');
    expect(celda(`plan-${ENTERPRISE_ID}-ahorro`)).toBe('—');

    const fila = screen.getByTestId(`plan-row-${ENTERPRISE_ID}`);
    expect(fila.textContent).not.toContain('$');
    expect(fila.textContent).not.toContain('%');
    expect(within(fila).getByText('A convenir')).toBeInTheDocument();
  });

  it('muestra el mensaje del backend si el listado falla, y lo anuncia como alerta', async () => {
    mockPreciosApi({ list: () => json({ error: 'Error al listar planes' }, 500) });
    renderPrices();

    expect(await screen.findByRole('alert')).toHaveTextContent('Error al listar planes');
    expect(screen.getByText(/sin planes todavía/i)).toBeInTheDocument();
  });

  it('muestra el estado vacío: las tablas del backend arrancan sin ningún plan', async () => {
    mockPreciosApi({ seed: [] });
    renderPrices();

    expect(await screen.findByText(/sin planes todavía/i)).toBeInTheDocument();
    expect(screen.queryByTestId(/^plan-row-/)).not.toBeInTheDocument();
  });
});

describe('PricesList — alta', () => {
  it('envía POST /api/admin/precios con los campos editables y recarga por el endpoint público', async () => {
    const user = userEvent.setup();
    const spy = mockPreciosApi();
    renderPrices();
    await screen.findByText('Starter');

    await user.click(screen.getByRole('button', { name: 'Nuevo plan' }));
    await screen.findByRole('dialog');
    await escribir(user, 'Nombre', 'Scale');
    await escribir(user, 'Precio mensual', '349');
    await escribir(user, 'Descuento anual', '15');
    await escribir(user, 'Viñetas incluidas', '10 agentes activos\n5,000 créditos/mes\n');
    await escribir(user, 'Orden', '4');
    await user.click(screen.getByRole('button', { name: 'Crear plan' }));

    // El listado repinta con los derivados que calcula el backend:
    // round(349 × 0.85) = 297 y (349 − 297) × 12 = 624.
    expect(await screen.findByText('Scale')).toBeInTheDocument();
    expect(celda('plan-90-anual')).toBe('$297');
    expect(celda('plan-90-ahorro')).toBe('$624');

    const [alta] = escrituras(spy);
    expect(alta.method).toBe('POST');
    expect(alta.url).toBe('/api/admin/precios');
    expect(alta.init).toMatchObject({ credentials: 'include' });
    // Igualdad estricta: un campo de más (p. ej. un derivado) rompe el test.
    expect(cuerpos(spy)[0]).toEqual({
      nombre: 'Scale',
      precio_mensual: 349,
      descuento_pct: 15,
      vinetas: ['10 agentes activos', '5,000 créditos/mes'],
      vinetas_tachadas: [],
      destacado: false,
      trial_texto: null,
      es_custom: false,
      orden: 4,
    });

    // GET público + POST admin + GET público de recarga. El listado nunca sale del admin.
    expect(urls(spy)).toEqual(['/api/precios', '/api/admin/precios', '/api/precios']);
  });

  it('un plan a convenir OMITE precio_mensual y descuento_pct: mandarlos en null sería un 422', async () => {
    const user = userEvent.setup();
    const spy = mockPreciosApi();
    renderPrices();
    await screen.findByText('Starter');

    await user.click(screen.getByRole('button', { name: 'Nuevo plan' }));
    await screen.findByRole('dialog');
    await escribir(user, 'Nombre', 'Enterprise Plus');
    // Se teclean las cifras y DESPUÉS se marca «a convenir»: el campo conserva su
    // texto, así que lo que decide es `es_custom`, no que el input esté vacío.
    await escribir(user, 'Precio mensual', '349');
    await escribir(user, 'Descuento anual', '15');
    await user.click(screen.getByLabelText('Plan a convenir'));
    expect(screen.getByLabelText('Precio mensual')).toBeDisabled();
    expect(screen.getByLabelText('Precio mensual')).toHaveValue('349');
    await user.click(screen.getByRole('button', { name: 'Crear plan' }));

    expect(await screen.findByText('Enterprise Plus')).toBeInTheDocument();

    const [enviado] = cuerpos(spy);
    expect('precio_mensual' in enviado).toBe(false);
    expect('descuento_pct' in enviado).toBe(false);
    expect(enviado.es_custom).toBe(true);
    // El plan recién creado no pinta cifras pese al `precio_mensual: 0` del backend.
    expect(celda('plan-90-mensual')).toBe('—');
    expect(celda('plan-90-anual')).toBe('—');
  });

  it('valida en cliente antes de tocar el backend: sin nombre no sale ninguna escritura', async () => {
    const user = userEvent.setup();
    const spy = mockPreciosApi();
    renderPrices();
    await screen.findByText('Starter');

    await user.click(screen.getByRole('button', { name: 'Nuevo plan' }));
    await screen.findByRole('dialog');
    await escribir(user, 'Precio mensual', '10');
    await user.click(screen.getByRole('button', { name: 'Crear plan' }));

    expect(await screen.findByText('nombre requerido')).toBeInTheDocument();
    expect(escrituras(spy)).toHaveLength(0);
  });
});

describe('PricesList — edición', () => {
  it('envía PATCH /api/admin/precios/:id sin precio_anual ni ahorro_anual, y el listado repinta lo que devuelve el backend', async () => {
    const user = userEvent.setup();
    const spy = mockPreciosApi();
    renderPrices();
    await screen.findByText('Starter');

    await abrirEdicion(user, 'Starter');
    await escribir(user, 'Precio mensual', '100');
    await escribir(user, 'Descuento anual', '25');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    // round(100 × 0.75) = 75 y (100 − 75) × 12 = 300, calculado por el backend.
    await waitFor(() => expect(celda('plan-1-mensual')).toBe('$100'));
    expect(celda('plan-1-descuento')).toBe('25%');
    expect(celda('plan-1-anual')).toBe('$75');
    expect(celda('plan-1-ahorro')).toBe('$300');

    const [edicion] = escrituras(spy);
    expect(edicion.method).toBe('PATCH');
    expect(edicion.url).toBe('/api/admin/precios/1');
    expect(edicion.init).toMatchObject({ credentials: 'include' });
    expect(cuerpos(spy)[0]).toEqual({
      nombre: 'Starter',
      precio_mensual: 100,
      descuento_pct: 25,
      vinetas: ['1 agente activo', '100 créditos/mes', 'Soporte por email'],
      vinetas_tachadas: ['Workflows avanzados', 'Llamadas en tiempo real'],
      destacado: false,
      trial_texto: '14 días de prueba gratis',
      es_custom: false,
      orden: 0,
    });

    // El descuento es POR PLAN: los demás conservan el suyo y sus derivados.
    expect(celda('plan-2-descuento')).toBe('10%');
    expect(celda('plan-2-anual')).toBe('$179');
  });

  it('el id viaja como string: un plan con BIGSERIAL fuera del rango seguro no se corrompe', async () => {
    const user = userEvent.setup();
    const spy = mockPreciosApi();
    renderPrices();
    await screen.findByText('Enterprise');

    await abrirEdicion(user, 'Enterprise');
    await escribir(user, 'Nombre', 'Enterprise');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(escrituras(spy)).toHaveLength(1));
    expect(escrituras(spy)[0].url).toBe(`/api/admin/precios/${ENTERPRISE_ID}`);
    expect(escrituras(spy)[0].url).not.toContain('9007199254740992');
  });

  it('editar las viñetas incluidas y las tachadas actualiza la vista', async () => {
    const user = userEvent.setup();
    mockPreciosApi();
    renderPrices();
    await screen.findByText('Team');

    expect(within(screen.getByTestId('plan-2-vinetas')).getByText('1,000 créditos/mes')).toBeInTheDocument();

    await abrirEdicion(user, 'Team');
    // Una viñeta por línea; la línea vacía del final se descarta.
    await escribir(user, 'Viñetas incluidas', '3 agentes activos\n2,000 créditos/mes\n');
    await escribir(user, 'Viñetas tachadas', 'Llamadas en tiempo real');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(screen.queryByText('1,000 créditos/mes')).not.toBeInTheDocument();
    });
    const celdaVinetas = screen.getByTestId('plan-2-vinetas');
    expect(within(celdaVinetas).getAllByRole('listitem')).toHaveLength(3);
    const tachada = within(celdaVinetas).getByText('Llamadas en tiempo real');
    expect(tachada).toHaveStyle('text-decoration: line-through');
    expect(within(celdaVinetas).getByText('3 agentes activos')).not.toHaveStyle('text-decoration: line-through');
  });

  it('no ofrece precio_anual ni ahorro_anual como campos editables: solo los muestra calculados', async () => {
    const user = userEvent.setup();
    mockPreciosApi();
    renderPrices();
    await screen.findByText('Starter');

    await abrirEdicion(user, 'Starter');

    // El formulario admite exactamente los campos que el backend deja escribir.
    const campos = screen.getAllByRole('textbox').map(c => c.getAttribute('aria-label'));
    expect(campos.sort()).toEqual([
      'Descuento anual', 'Nombre', 'Orden', 'Precio mensual',
      'Texto de la prueba gratis', 'Viñetas incluidas', 'Viñetas tachadas',
    ]);
    expect(screen.queryByLabelText('Precio anual')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ahorro anual')).not.toBeInTheDocument();

    // Los derivados se pintan, pero no dentro de ningún control editable.
    const derivados = screen.getByTestId('derivados');
    expect(within(derivados).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(derivados).queryAllByRole('spinbutton')).toHaveLength(0);
    expect(screen.getByTestId('derivado-precio-anual').textContent).toBe('$17');
    expect(screen.getByTestId('derivado-ahorro-anual').textContent).toBe('$24');
    expect(within(derivados).getByText(/no se editan, no se guardan y no se envían/i)).toBeInTheDocument();
  });

  it('la vista previa recalcula con el redondeo del backend al cambiar precio o descuento', async () => {
    const user = userEvent.setup();
    const spy = mockPreciosApi();
    renderPrices();
    await screen.findByText('Starter');

    await abrirEdicion(user, 'Starter');

    // 25 al 10 % → 22.5, que el backend redondea a 23 (no 22, ni «$22.5»).
    await escribir(user, 'Precio mensual', '25');
    await waitFor(() => expect(screen.getByTestId('derivado-precio-anual').textContent).toBe('$23'));
    expect(screen.getByTestId('derivado-ahorro-anual').textContent).toBe('$24'); // (25 − 23) × 12

    // 19 al 25 % → round(14.25) = 14 y (19 − 14) × 12 = 60.
    await escribir(user, 'Precio mensual', '19');
    await escribir(user, 'Descuento anual', '25');
    await waitFor(() => expect(screen.getByTestId('derivado-precio-anual').textContent).toBe('$14'));
    expect(screen.getByTestId('derivado-ahorro-anual').textContent).toBe('$60');

    // La vista previa es local: no cuesta ni una petición.
    expect(escrituras(spy)).toHaveLength(0);
  });

  it('el diálogo de un plan a convenir no calcula cifras ni deja editar precio ni descuento', async () => {
    const user = userEvent.setup();
    mockPreciosApi();
    renderPrices();
    await screen.findByText('Enterprise');

    await abrirEdicion(user, 'Enterprise');

    expect(screen.getByLabelText('Precio mensual')).toBeDisabled();
    expect(screen.getByLabelText('Descuento anual')).toBeDisabled();
    // El `precio_mensual: 0` del backend no se transcribe al campo.
    expect(screen.getByLabelText('Precio mensual')).toHaveValue('');
    expect(screen.getByTestId('derivados').textContent).toContain('Sin cifras');
    expect(screen.queryByTestId('derivado-precio-anual')).not.toBeInTheDocument();
    expect(screen.queryByTestId('derivado-ahorro-anual')).not.toBeInTheDocument();
  });

  it('ninguna escritura incluye jamás precio_anual ni ahorro_anual', async () => {
    const user = userEvent.setup();
    const spy = mockPreciosApi();
    renderPrices();
    await screen.findByText('Starter');

    await abrirEdicion(user, 'Starter');
    await escribir(user, 'Precio mensual', '30');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(celda('plan-1-mensual')).toBe('$30'));

    await user.click(screen.getByRole('button', { name: 'Nuevo plan' }));
    await screen.findByRole('dialog');
    await escribir(user, 'Nombre', 'Otro');
    await escribir(user, 'Precio mensual', '5');
    await user.click(screen.getByRole('button', { name: 'Crear plan' }));
    await screen.findByText('Otro');

    expect(cuerpos(spy)).toHaveLength(2);
    for (const body of cuerpos(spy)) {
      expect('precio_anual' in body).toBe(false);
      expect('ahorro_anual' in body).toBe(false);
    }
  });
});

describe('PricesList — errores del backend', () => {
  it('un 422 con field marca el input culpable, no el aviso global', async () => {
    const user = userEvent.setup();
    mockPreciosApi({
      write: () => json({ error: 'descuento_pct debe ser un número entre 0 y 100', field: 'descuento_pct' }, 422),
    });
    renderPrices();
    await screen.findByText('Starter');

    await abrirEdicion(user, 'Starter');
    await escribir(user, 'Descuento anual', '30');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('descuento_pct debe ser un número entre 0 y 100')).toBeInTheDocument();
    expect(screen.getByLabelText('Descuento anual')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // El mensaje sustituye al texto de ayuda del campo.
    expect(screen.queryByText('De 0 a 100. Es propio de este plan.')).not.toBeInTheDocument();
  });

  it('un 422 sobre un campo sin input propio (es_custom) cae al aviso global en vez de perderse', async () => {
    const user = userEvent.setup();
    // `es_custom` es un Switch: no tiene helperText donde pintar el error. Un cast
    // crudo (`res.field as FormField`) lo escribiría en un slot que nadie renderiza
    // y el usuario no vería nada; la tabla FIELD_BY_BACKEND lo manda al aviso.
    mockPreciosApi({ write: () => json({ error: 'es_custom debe ser booleano', field: 'es_custom' }, 422) });
    renderPrices();
    await screen.findByText('Starter');

    await abrirEdicion(user, 'Starter');
    await escribir(user, 'Nombre', 'Starter Pro');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('status')).toHaveTextContent('es_custom debe ser booleano');
  });

  it('un error sin field se muestra como aviso global del formulario', async () => {
    const user = userEvent.setup();
    mockPreciosApi({ write: () => json({ error: 'Error al actualizar plan' }, 500) });
    renderPrices();
    await screen.findByText('Starter');

    await abrirEdicion(user, 'Starter');
    await escribir(user, 'Nombre', 'Starter Pro');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Error al actualizar plan');
  });

  it('traduce el 403 de requireRole en vez de enseñar el token «forbidden»', async () => {
    const user = userEvent.setup();
    // El 403 rompe la forma habitual: `error` trae el token y el texto legible
    // viaja en `message` (docs/api-contract.md §10.1).
    mockPreciosApi({
      write: () => json({ ok: false, error: 'forbidden', message: 'No tienes permisos para esta acción' }, 403),
    });
    renderPrices();
    await screen.findByText('Starter');

    await abrirEdicion(user, 'Starter');
    await escribir(user, 'Nombre', 'Starter Pro');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/no tienes permisos/i);
    expect(screen.queryByText('forbidden')).not.toBeInTheDocument();
  });
});

describe('PricesList — borrado', () => {
  it('envía DELETE /api/admin/precios/:id y trata el 204 sin cuerpo como éxito', async () => {
    const user = userEvent.setup();
    const spy = mockPreciosApi();
    renderPrices();
    await screen.findByText('Growth');

    await user.click(screen.getByRole('button', { name: 'Borrar Growth' }));
    await user.click(await screen.findByRole('button', { name: 'Borrar' }));

    await waitFor(() => expect(screen.queryByText('Growth')).not.toBeInTheDocument());
    expect(screen.getByText('Starter')).toBeInTheDocument();

    const [borrado] = escrituras(spy);
    expect(borrado.method).toBe('DELETE');
    expect(borrado.url).toBe('/api/admin/precios/3');
    expect(borrado.init).toMatchObject({ credentials: 'include' });
    // Un 204 sin cuerpo no puede leerse como error.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('un error sin cuerpo NO se confunde con el 204: el plan sigue y se avisa', async () => {
    const user = userEvent.setup();
    mockPreciosApi({ write: () => new Response(null, { status: 500 }) });
    renderPrices();
    await screen.findByText('Growth');

    await user.click(screen.getByRole('button', { name: 'Borrar Growth' }));
    await user.click(await screen.findByRole('button', { name: 'Borrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos eliminar el plan');
    expect(screen.getByText('Growth')).toBeInTheDocument();
  });

  it('cancelar la confirmación no borra el plan', async () => {
    const user = userEvent.setup();
    const spy = mockPreciosApi();
    renderPrices();
    await screen.findByText('Growth');

    await user.click(screen.getByRole('button', { name: 'Borrar Growth' }));
    expect(await screen.findByText('¿Borrar plan?')).toBeInTheDocument();
    expect(screen.getByText(/no hay papelera/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByText('¿Borrar plan?')).not.toBeInTheDocument());
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(escrituras(spy)).toHaveLength(0);
  });
});

describe('PricesList — permisos', () => {
  it('un editor consulta los planes pero no puede crearlos, editarlos ni borrarlos', async () => {
    mockPreciosApi();
    renderPrices(editorUser);
    await screen.findByText('Starter');

    expect(screen.queryByRole('button', { name: 'Nuevo plan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar Starter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Borrar Starter' })).not.toBeInTheDocument();
    expect(screen.getByText(/reservado al rol administrador/i)).toBeInTheDocument();
    // El listado es público: el editor sigue viendo las cifras derivadas.
    expect(celda('plan-1-anual')).toBe('$17');
  });
});
