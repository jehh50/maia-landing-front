import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { afterEach, describe, expect, it, vi } from 'vitest';
import theme from '../../../theme/theme';
import Pricing from '../Pricing';
import type { AdminPlan } from '../../../lib/api';

// El backend entra en el test: se intercepta `globalThis.fetch` con `Response`
// reales y NUNCA se mockea `src/lib/api.ts` (`docs/verification.md` §4).

/** Plan con los 14 campos del contrato (§4 quater); el test solo cambia lo suyo. */
function plan(over: Partial<AdminPlan> & Pick<AdminPlan, 'id' | 'nombre'>): AdminPlan {
  return {
    precio_mensual: 19,
    descuento_pct: 10,
    precio_anual: 17,
    ahorro_anual: 24,
    vinetas: [],
    vinetas_tachadas: [],
    destacado: false,
    trial_texto: null,
    es_custom: false,
    orden: 1,
    created_at: '2026-07-31T10:00:00.000Z',
    updated_at: '2026-07-31T10:00:00.000Z',
    ...over,
  };
}

const STARTER = plan({
  id: '1',
  nombre: 'Starter',
  precio_mensual: 19, descuento_pct: 10, precio_anual: 17, ahorro_anual: 24,
  trial_texto: '14 días de prueba gratis',
  vinetas: ['1 agente activo', '100 créditos/mes'],
  vinetas_tachadas: ['Llamadas en tiempo real'],
  orden: 1,
});

const TEAM = plan({
  id: '2',
  nombre: 'Team',
  precio_mensual: 199, descuento_pct: 10, precio_anual: 179, ahorro_anual: 240,
  destacado: true,
  vinetas: ['3 agentes activos', 'Todos los canales'],
  orden: 2,
});

// `BIGSERIAL` por encima de `Number.MAX_SAFE_INTEGER`: el `id` es string y se usa
// tal cual como clave. Sus viñetas no llevan ni un dígito a propósito, para poder
// afirmar que la tarjeta de un plan a convenir no contiene NINGUNA cifra.
const ENTERPRISE = plan({
  id: '9007199254740993',
  nombre: 'Enterprise',
  es_custom: true,
  precio_mensual: 0, descuento_pct: 0, precio_anual: null, ahorro_anual: null,
  vinetas: ['Agentes ilimitados', 'Créditos a convenir'],
  orden: 3,
});

const PLANES = [STARTER, TEAM, ENTERPRISE];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockPrecios(rows: AdminPlan[]) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ rows }));
}

/**
 * Registra cada alta y cada baja de la sección en el DOM. Sirve para distinguir
 * «no se renderiza» de «se pintó un instante y se quitó», que es el parpadeo que
 * prohíbe el acceptance 3.
 */
function vigilarSeccion() {
  const eventos: string[] = [];
  const esSeccion = (n: Node) =>
    n instanceof HTMLElement && (n.id === 'pricing' || n.querySelector('#pricing') !== null);

  const mo = new MutationObserver(records => {
    for (const r of records) {
      r.addedNodes.forEach(n => { if (esSeccion(n)) eventos.push('add'); });
      r.removedNodes.forEach(n => { if (esSeccion(n)) eventos.push('remove'); });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  observadores.push(mo);
  return eventos;
}

const observadores: MutationObserver[] = [];

afterEach(() => {
  observadores.splice(0).forEach(mo => mo.disconnect());
  vi.restoreAllMocks();
});

function renderPricing(overrides: Partial<Parameters<typeof Pricing>[0]> = {}) {
  const props = {
    isAnnual: false,
    onToggle: vi.fn(),
    onOpenContact: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <Pricing {...props} />
    </ThemeProvider>,
  );
  return props;
}

/**
 * Espera a que la carga termine en un sentido o en otro. Hace falta un helper
 * propio porque en los casos de fallo NO aparece nada en pantalla a lo que
 * agarrarse con un `findBy`: se espera a la petición y se vacía la cola de
 * microtareas dentro de `act`, para que el `setState` del efecto ya se haya
 * aplicado cuando se afirme que no hay sección.
 */
async function esperarResolucion() {
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  await act(async () => { await new Promise(res => setTimeout(res, 0)); });
}

function tarjeta(id: string): HTMLElement {
  return screen.getByTestId(`plan-${id}`);
}

describe('Pricing — consumo de GET /api/precios', () => {
  it('pide los planes al endpoint público, una sola vez y sin cookie', async () => {
    const spy = mockPrecios(PLANES);
    renderPricing();

    await screen.findByRole('heading', { name: 'Starter' });

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe('/api/precios');
    expect(init).toEqual(expect.objectContaining({ method: 'GET', credentials: 'omit' }));
    // No hay listado bajo /api/admin/precios: allí el backend responde 404.
    expect(spy.mock.calls.every(([u]) => !String(u).includes('/api/admin/'))).toBe(true);
  });

  it('pinta una tarjeta por plan del backend, con sus viñetas, tachadas y prueba gratis', async () => {
    mockPrecios(PLANES);
    renderPricing();

    for (const nombre of ['Starter', 'Team', 'Enterprise']) {
      expect(await screen.findByRole('heading', { name: nombre })).toBeInTheDocument();
    }
    expect(screen.getByText('1 agente activo')).toBeInTheDocument();
    expect(screen.getByText('100 créditos/mes')).toBeInTheDocument();
    expect(screen.getByText('14 días de prueba gratis')).toBeInTheDocument();

    const tachada = screen.getByText('Llamadas en tiempo real');
    expect(getComputedStyle(tachada).textDecoration).toContain('line-through');

    // Ni un rastro de los planes que estaban hard-codeados y ya no existen.
    expect(screen.queryByRole('heading', { name: 'Growth' })).not.toBeInTheDocument();

    // El backend ya devuelve `orden ASC, id ASC`: aquí no se reordena nada.
    expect(screen.getAllByRole('heading', { level: 6 }).map(h => h.textContent))
      .toEqual(['Starter', 'Team', 'Enterprise']);
  });

  it('el badge "Más popular" lo decide `destacado`, no la posición de la tarjeta', async () => {
    mockPrecios(PLANES);
    renderPricing();

    await screen.findByRole('heading', { name: 'Team' });

    const badges = screen.getAllByText('Más popular');
    expect(badges).toHaveLength(1);
    expect(tarjeta(TEAM.id)).toContainElement(badges[0]);
  });

  it('pinta el badge "Más popular" con el naranja de marca', async () => {
    mockPrecios(PLANES);
    renderPricing();

    // `rgb(232, 68, 10)` es `tokens.brand.orange` = `palette.primary.main`, el
    // color que aporta el `bgcolor` del badge. El valor del token lo congela
    // `src/theme/__tests__/tokens.test.tsx`; aquí solo se comprueba que llega.
    const badge = await screen.findByText('Más popular');
    expect(getComputedStyle(badge).backgroundColor).toBe('rgb(232, 68, 10)');
  });

  it('no emite ningún path de paleta sin resolver en el CSS de la sección', async () => {
    mockPrecios(PLANES);
    renderPricing();
    await screen.findByRole('heading', { name: 'Starter' });

    // `sx` solo traduce a la paleta las claves que conoce (`color`, `bgcolor`,
    // `backgroundColor`). Cualquier otra —`background`, por ejemplo— deja pasar
    // el string tal cual y el navegador descarta la declaración.
    const css = document.head.textContent ?? '';
    expect(css).not.toMatch(/primary\.main/);
  });

});

describe('Pricing — toggle mensual/anual', () => {
  it('en mensual pinta `precio_mensual` y no habla de ahorro', async () => {
    mockPrecios(PLANES);
    renderPricing({ isAnnual: false });

    expect(await screen.findByText('19')).toBeInTheDocument();
    expect(screen.getByText('199')).toBeInTheDocument();
    expect(screen.queryByText(/Ahorras/)).not.toBeInTheDocument();
  });

  it('en anual pinta `precio_anual` (mensual facturando anual) y el `ahorro_anual`', async () => {
    mockPrecios(PLANES);
    renderPricing({ isAnnual: true });

    expect(await screen.findByText('17')).toBeInTheDocument();
    expect(screen.getByText('179')).toBeInTheDocument();
    // El anual NO es el total del año: 17 y 179, no 204 ni 2 148.
    expect(screen.queryByText('204')).not.toBeInTheDocument();
    expect(screen.queryByText('2,148')).not.toBeInTheDocument();
    // Y ya no se muestran los mensuales.
    expect(screen.queryByText('19')).not.toBeInTheDocument();
    expect(screen.queryByText('199')).not.toBeInTheDocument();

    expect(screen.getByText('Ahorras $24/año')).toBeInTheDocument();
    expect(screen.getByText('Ahorras $240/año')).toBeInTheDocument();
  });

  it('el switch sigue avisando al padre (el estado vive en App.tsx)', async () => {
    mockPrecios(PLANES);
    const { onToggle } = renderPricing({ isAnnual: true });

    await screen.findByRole('heading', { name: 'Starter' });
    await userEvent.click(screen.getByRole('checkbox', { name: /anual/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('el chip de descuento sale de `descuento_pct`, no del "Ahorra 10%" hard-codeado', async () => {
    mockPrecios([
      plan({ id: '1', nombre: 'Starter', descuento_pct: 20, precio_anual: 15, ahorro_anual: 48 }),
      plan({ id: '2', nombre: 'Team', descuento_pct: 20, precio_mensual: 199, precio_anual: 159, ahorro_anual: 480 }),
    ]);
    renderPricing({ isAnnual: true });

    expect(await screen.findByText('Ahorra 20%')).toBeInTheDocument();
    expect(screen.queryByText('Ahorra 10%')).not.toBeInTheDocument();
  });

  it('con descuentos distintos por plan, el chip anuncia "hasta" el mayor', async () => {
    mockPrecios([
      plan({ id: '1', nombre: 'Starter', descuento_pct: 10 }),
      plan({ id: '2', nombre: 'Team', descuento_pct: 25, precio_mensual: 199, precio_anual: 149, ahorro_anual: 600 }),
      ENTERPRISE, // `es_custom`: su `descuento_pct: 0` no cuenta para el anuncio.
    ]);
    renderPricing({ isAnnual: true });

    expect(await screen.findByText('Ahorra hasta 25%')).toBeInTheDocument();
  });

  it('el `descuento_pct: 0` de un plan a convenir no rebaja el anuncio', async () => {
    // Todos los planes con precio descuentan el 10 %, así que el anuncio es «10%»
    // a secas. El Enterprise llega con `descuento_pct: 0` —el backend anula sus
    // cifras— y no debe convertir el mensaje en un «hasta 10%».
    mockPrecios([plan({ id: '1', nombre: 'Starter', descuento_pct: 10 }), ENTERPRISE]);
    renderPricing({ isAnnual: true });

    expect(await screen.findByText('Ahorra 10%')).toBeInTheDocument();
    expect(screen.queryByText('Ahorra hasta 10%')).not.toBeInTheDocument();
  });

  it('sin descuento en ningún plan no se anuncia ahorro alguno, pero el toggle sigue', async () => {
    mockPrecios([
      plan({ id: '1', nombre: 'Starter', descuento_pct: 0, precio_anual: 19, ahorro_anual: 0 }),
    ]);
    renderPricing({ isAnnual: true });

    await screen.findByRole('heading', { name: 'Starter' });
    expect(screen.queryByText(/Ahorra/)).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /anual/i })).toBeInTheDocument();
  });

  it('un plan sin descuento no dice «Ahorras $0/año»', async () => {
    mockPrecios([
      plan({ id: '1', nombre: 'Starter', descuento_pct: 0, precio_anual: 19, ahorro_anual: 0 }),
      plan({ id: '2', nombre: 'Team', precio_mensual: 199, precio_anual: 179, ahorro_anual: 240 }),
    ]);
    renderPricing({ isAnnual: true });

    await screen.findByRole('heading', { name: 'Starter' });
    expect(tarjeta('1').textContent).not.toMatch(/Ahorras/);
    expect(tarjeta('2').textContent).toContain('Ahorras $240/año');
  });
});

describe('Pricing — planes a convenir (`es_custom`)', () => {
  it('no pinta ninguna cifra: ni «$0» ni «Ahorras $0/año», en mensual', async () => {
    mockPrecios(PLANES);
    renderPricing({ isAnnual: false });

    await screen.findByRole('heading', { name: 'Enterprise' });
    const card = tarjeta(ENTERPRISE.id);

    expect(card.textContent).toContain('Custom');
    expect(card.textContent).not.toMatch(/\$/);
    expect(card.textContent).not.toMatch(/\d/);
    expect(card.textContent).not.toMatch(/Ahorras/);
  });

  it('tampoco en anual, donde sus derivados llegan en `null`', async () => {
    mockPrecios(PLANES);
    renderPricing({ isAnnual: true });

    await screen.findByRole('heading', { name: 'Enterprise' });
    const card = tarjeta(ENTERPRISE.id);

    expect(card.textContent).toContain('Custom');
    expect(card.textContent).not.toMatch(/\$/);
    expect(card.textContent).not.toMatch(/\d/);
  });

  it('lo decide `es_custom`, no el nulo: un Custom con cifras en el body sigue sin pintarlas', async () => {
    // El backend real manda `precio_mensual: 0` en un plan a convenir (su
    // `toNumber()` convierte el NULL en 0). Aquí se exagera el caso: si alguien
    // se fiara de los nulos, esta tarjeta enseñaría «$349».
    mockPrecios([
      plan({
        id: '7', nombre: 'Enterprise', es_custom: true,
        precio_mensual: 349, descuento_pct: 10, precio_anual: 314, ahorro_anual: 420,
        vinetas: ['Agentes ilimitados'],
      }),
    ]);
    renderPricing({ isAnnual: true });

    await screen.findByRole('heading', { name: 'Enterprise' });
    const card = tarjeta('7');
    expect(card.textContent).toContain('Custom');
    expect(card.textContent).not.toMatch(/349|314|420|\$/);
  });
});

describe('Pricing — fallback decidido por el humano: sin datos no hay sección', () => {
  it('con `rows` vacío la sección no llega a pintarse ni un instante', async () => {
    const eventos = vigilarSeccion();
    mockPrecios([]);
    renderPricing();

    await esperarResolucion();

    expect(document.querySelector('#pricing')).toBeNull();
    expect(screen.queryByText('Transparente. Sin sorpresas.')).not.toBeInTheDocument();
    expect(eventos).toEqual([]);
  });

  it('con un 500 del backend la sección no se renderiza', async () => {
    const eventos = vigilarSeccion();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'boom' }, 500));
    renderPricing();

    await esperarResolucion();

    expect(document.querySelector('#pricing')).toBeNull();
    expect(eventos).toEqual([]);
  });

  it('con fallo de red la sección no se renderiza y NO reaparecen los precios hard-codeados', async () => {
    const eventos = vigilarSeccion();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    renderPricing({ isAnnual: true });

    await esperarResolucion();

    expect(document.querySelector('#pricing')).toBeNull();
    expect(eventos).toEqual([]);
    // Los cuatro planes del array eliminado, y sus cifras.
    for (const rastro of ['Starter', 'Team', 'Growth', 'Enterprise', '19', '179', 'Ahorra 10%', 'Ahorras $24/año']) {
      expect(screen.queryByText(rastro)).not.toBeInTheDocument();
    }
  });

  it('con un 200 sin `rows` (body inesperado) tampoco se renderiza', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    renderPricing();

    await esperarResolucion();
    expect(document.querySelector('#pricing')).toBeNull();
  });
});

describe('Pricing — carga sin salto ni parpadeo', () => {
  it('mientras carga no pinta nada, y la sección aparece una sola vez ya con sus datos', async () => {
    const eventos = vigilarSeccion();
    let resolver!: (r: Response) => void;
    const pendiente = new Promise<Response>(res => { resolver = res; });
    vi.spyOn(globalThis, 'fetch').mockReturnValue(pendiente);

    renderPricing();

    // Nada de esqueleto, cabecera ni tarjetas vacías: cero altura reservada que
    // luego habría que quitar si la API viene vacía o falla.
    expect(document.querySelector('#pricing')).toBeNull();
    expect(screen.queryByText('Transparente. Sin sorpresas.')).not.toBeInTheDocument();
    expect(eventos).toEqual([]);

    resolver(jsonResponse({ rows: PLANES }));
    await screen.findByRole('heading', { name: 'Starter' });

    // Una sola alta y ninguna baja: la sección no se pinta para desaparecer.
    expect(eventos).toEqual(['add']);
    // Y se monta ya completa: las tres tarjetas en el mismo commit.
    expect(screen.getAllByRole('heading', { level: 6 })).toHaveLength(3);
  });

  it('el enlace del pie sigue abriendo el modal de contacto, y no hay CTA por tarjeta', async () => {
    mockPrecios(PLANES);
    const { onOpenContact } = renderPricing();

    await screen.findByRole('heading', { name: 'Starter' });
    expect(screen.queryByText(/hablar con ventas/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Contactanos'));
    expect(onOpenContact).toHaveBeenCalledTimes(1);
  });
});
