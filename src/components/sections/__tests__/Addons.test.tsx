import { act, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { afterEach, describe, expect, it, vi } from 'vitest';
import theme from '../../../theme/theme';
import Addons from '../Addons';
import type { AdminComplemento } from '../../../lib/api';

// El backend entra en el test: se intercepta `globalThis.fetch` con `Response`
// reales y NUNCA se mockea `src/lib/api.ts` (`docs/verification.md` §4).

/** Complemento con los 7 campos del contrato (§4 quinquies); el test solo cambia lo suyo. */
function complemento(over: Partial<AdminComplemento> & Pick<AdminComplemento, 'id' | 'nombre'>): AdminComplemento {
  return {
    descripcion: null,
    precio: 10,
    unidad: null,
    orden: 1,
    paquetes: [],
    ...over,
  };
}

const CREDITOS = complemento({
  id: '1',
  nombre: 'Créditos adicionales',
  descripcion: 'Amplía tu consumo mensual sin cambiar de plan.',
  precio: 0.2,
  unidad: '/ crédito',
  orden: 1,
});

const PACKS = complemento({
  id: '2',
  nombre: 'Packs de créditos',
  descripcion: 'Compra créditos por adelantado.',
  precio: null,
  unidad: null,
  orden: 2,
  paquetes: [
    { id: '10', complemento_id: '2', nombre: 'Pack S', descripcion: '500 créditos', precio: 90, orden: 1 },
    { id: '11', complemento_id: '2', nombre: 'Pack M', descripcion: '1.000 créditos', precio: 160, orden: 2 },
  ],
});

const CEREBRO = complemento({
  id: '3',
  nombre: 'Cerebro Extendido',
  precio: 60,
  unidad: '/ GB adicional',
  orden: 3,
});

const WORKFLOWS = complemento({
  id: '4',
  nombre: 'Workflows adicionales',
  precio: 190,
  unidad: '/ mes',
  orden: 4,
});

const COMPLEMENTOS = [CREDITOS, PACKS, CEREBRO, WORKFLOWS];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockComplementos(rows: AdminComplemento[]) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ rows }));
}

/**
 * Registra cada alta y cada baja de la sección en el DOM. Sirve para distinguir
 * «no se renderiza» de «se pintó un instante y se quitó», el parpadeo que
 * prohíbe el acceptance.
 */
function vigilarSeccion() {
  const eventos: string[] = [];
  const esSeccion = (n: Node) =>
    n instanceof HTMLElement && (n.id === 'addons' || n.querySelector('#addons') !== null);

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

function renderAddons() {
  render(
    <ThemeProvider theme={theme}>
      <Addons />
    </ThemeProvider>,
  );
}

/**
 * Espera a que la carga termine en un sentido o en otro. Hace falta un helper
 * propio porque en los casos de fallo NO aparece nada en pantalla a lo que
 * agarrarse con un `findBy`.
 */
async function esperarResolucion() {
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  await act(async () => { await new Promise(res => setTimeout(res, 0)); });
}

function tarjeta(id: string): HTMLElement {
  return screen.getByTestId(`addon-${id}`);
}

describe('Addons — consumo de GET /api/complementos', () => {
  it('pide los complementos al endpoint público, una sola vez y sin cookie', async () => {
    const spy = mockComplementos(COMPLEMENTOS);
    renderAddons();

    await screen.findByRole('heading', { name: 'Créditos adicionales' });

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe('/api/complementos');
    expect(init).toEqual(expect.objectContaining({ method: 'GET', credentials: 'omit' }));
    // No hay listado bajo /api/admin/complementos: allí el backend no expone nada público.
    expect(spy.mock.calls.every(([u]) => !String(u).includes('/api/admin/'))).toBe(true);
  });

  it('pinta una tarjeta por complemento del backend, con nombre y descripción', async () => {
    mockComplementos(COMPLEMENTOS);
    renderAddons();

    for (const nombre of ['Créditos adicionales', 'Packs de créditos', 'Cerebro Extendido', 'Workflows adicionales']) {
      expect(await screen.findByRole('heading', { name: nombre })).toBeInTheDocument();
    }
    expect(screen.getByText('Amplía tu consumo mensual sin cambiar de plan.')).toBeInTheDocument();

    // El backend ya devuelve `orden ASC`: aquí no se reordena nada.
    expect(screen.getAllByRole('heading', { level: 6 }).map(h => h.textContent))
      .toEqual(['Créditos adicionales', 'Packs de créditos', 'Cerebro Extendido', 'Workflows adicionales']);
  });

  it('conserva los dos decimales cuando el importe los tiene, sin la regresión de `formatMoneda`', async () => {
    mockComplementos(COMPLEMENTOS);
    renderAddons();

    await screen.findByRole('heading', { name: 'Créditos adicionales' });

    // `formatMoneda(0.2)` devolvería "$0.2"; la landing debe seguir mostrando "$0.20".
    expect(within(tarjeta('1')).getByText('$0.20')).toBeInTheDocument();
    expect(within(tarjeta('1')).getByText('/ crédito')).toBeInTheDocument();

    // Los importes enteros no arrastran decimales de sobra.
    expect(within(tarjeta('3')).getByText('$60')).toBeInTheDocument();
    expect(within(tarjeta('4')).getByText('$190')).toBeInTheDocument();
  });

  it('un complemento con `precio: null` pinta sus paquetes, nunca `$null` ni `$0`', async () => {
    mockComplementos(COMPLEMENTOS);
    renderAddons();

    await screen.findByRole('heading', { name: 'Packs de créditos' });
    const card = tarjeta('2');

    expect(within(card).getByText('Pack S')).toBeInTheDocument();
    expect(within(card).getByText('500 créditos')).toBeInTheDocument();
    expect(within(card).getByText('$90')).toBeInTheDocument();
    expect(within(card).getByText('Pack M')).toBeInTheDocument();
    expect(within(card).getByText('$160')).toBeInTheDocument();

    expect(card.textContent).not.toMatch(/\$null/);
    expect(card.textContent).not.toMatch(/\$0(?!\d)/);
  });

  it('un complemento con `precio: null` y sin paquetes no pinta ninguna cifra', async () => {
    mockComplementos([
      ...COMPLEMENTOS,
      complemento({ id: '5', nombre: 'Sin precio ni paquetes', precio: null, unidad: null, orden: 5, paquetes: [] }),
    ]);
    renderAddons();

    await screen.findByRole('heading', { name: 'Sin precio ni paquetes' });
    const card = tarjeta('5');
    expect(card.textContent).not.toMatch(/\$/);
  });
});

describe('Addons — icono y color de acento por posición', () => {
  it('los asigna por índice de la fila ordenada, no por nombre, y cicla al llegar al quinto', async () => {
    const quinto = complemento({ id: '5', nombre: 'Quinto complemento', precio: 5, orden: 5 });
    mockComplementos([...COMPLEMENTOS, quinto]);
    renderAddons();

    await screen.findByRole('heading', { name: 'Quinto complemento' });

    // Cuatro entradas en la tabla fija: la quinta tarjeta cicla de vuelta al
    // primer icono/color, el mismo que la primera tarjeta.
    const sufijo = (el: HTMLElement) => el.getAttribute('data-testid')?.replace(/^addon-\d+-icon-/, '');
    const iconoPrimero = screen.getByTestId(/^addon-1-icon-/);
    const iconoQuinto = screen.getByTestId(/^addon-5-icon-/);
    expect(sufijo(iconoQuinto)).toBe(sufijo(iconoPrimero));
  });

  it('el icono sigue la posición aunque el nombre cambie (no se mapea por `nombre`)', async () => {
    // Mismos complementos que el set base, pero con los nombres de las dos
    // primeras filas intercambiados: si el icono se mapeara por nombre,
    // "Packs de créditos" pasaría a llevar el icono de "Créditos adicionales".
    mockComplementos([
      complemento({ ...CREDITOS, id: '1', nombre: 'Packs de créditos', orden: 1 }),
      complemento({ ...PACKS, id: '2', nombre: 'Créditos adicionales', orden: 2 }),
    ]);
    renderAddons();

    await screen.findByRole('heading', { name: 'Packs de créditos' });

    // La fila en la posición 0 sigue llevando el icono/color de la posición 0,
    // sin importar que ahora se llame "Packs de créditos".
    const iconoPosicion0 = screen.getByTestId(/^addon-1-icon-/);
    expect(iconoPosicion0.getAttribute('data-testid')).toMatch(/-bolt$/);
  });
});

describe('Addons — fallback heredado de la 35: sin datos no hay sección', () => {
  it('con `rows` vacío la sección no llega a pintarse ni un instante', async () => {
    const eventos = vigilarSeccion();
    mockComplementos([]);
    renderAddons();

    await esperarResolucion();

    expect(document.querySelector('#addons')).toBeNull();
    expect(screen.queryByText('Potencia tu plan cuando lo necesites')).not.toBeInTheDocument();
    expect(eventos).toEqual([]);
  });

  it('con un 500 del backend la sección no se renderiza', async () => {
    const eventos = vigilarSeccion();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'boom' }, 500));
    renderAddons();

    await esperarResolucion();

    expect(document.querySelector('#addons')).toBeNull();
    expect(eventos).toEqual([]);
  });

  it('con fallo de red la sección no se renderiza y NO reaparece el array hard-codeado', async () => {
    const eventos = vigilarSeccion();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    renderAddons();

    await esperarResolucion();

    expect(document.querySelector('#addons')).toBeNull();
    expect(eventos).toEqual([]);
    // Los cuatro add-ons del array eliminado, y sus precios/unidades hard-codeados.
    for (const rastro of ['Créditos adicionales', 'Cerebro Extendido', 'Workflows adicionales', '$0.20', '/ crédito', '$60', '$190']) {
      expect(screen.queryByText(rastro)).not.toBeInTheDocument();
    }
  });

  it('con un 200 sin `rows` (body inesperado) tampoco se renderiza', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    renderAddons();

    await esperarResolucion();
    expect(document.querySelector('#addons')).toBeNull();
  });
});

describe('Addons — carga sin salto ni parpadeo', () => {
  it('mientras carga no pinta nada, y la sección aparece una sola vez ya con sus datos', async () => {
    const eventos = vigilarSeccion();
    let resolver!: (r: Response) => void;
    const pendiente = new Promise<Response>(res => { resolver = res; });
    vi.spyOn(globalThis, 'fetch').mockReturnValue(pendiente);

    renderAddons();

    // Nada de esqueleto, cabecera ni tarjetas vacías: cero altura reservada que
    // luego habría que quitar si la API viene vacía o falla.
    expect(document.querySelector('#addons')).toBeNull();
    expect(screen.queryByText('Potencia tu plan cuando lo necesites')).not.toBeInTheDocument();
    expect(eventos).toEqual([]);

    resolver(jsonResponse({ rows: COMPLEMENTOS }));
    await screen.findByRole('heading', { name: 'Créditos adicionales' });

    // Una sola alta y ninguna baja: la sección no se pinta para desaparecer.
    expect(eventos).toEqual(['add']);
    // Y se monta ya completa: las cuatro tarjetas en el mismo commit.
    expect(screen.getAllByRole('heading', { level: 6 })).toHaveLength(4);
  });
});
