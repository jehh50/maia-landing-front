import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import theme from '../../../theme/theme';
import Hero from '../Hero';
import type { AdminImage } from '../../../lib/api';

// El backend entra en el test: se intercepta `globalThis.fetch` con `Response`
// reales y NUNCA se mockea `src/lib/api.ts` (`docs/verification.md` §4).

// El Hero usa IntersectionObserver (contadores) y el efecto Vanta; jsdom no
// implementa ninguno de los dos. Mismo apaño que `src/__tests__/AppRoutes.test.tsx`.
class IOStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

vi.mock('vanta/dist/vanta.net.min', () => ({
  default: () => ({ destroy: () => {} }),
}));

/** Fila de `images` con los 9 campos del contrato (§4 ter). */
function imagen(over: Partial<AdminImage> & Pick<AdminImage, 'id'>): AdminImage {
  return {
    seccion: 'hero',
    filename: 'captura.png',
    mime_type: 'image/png',
    size_bytes: 12_345,
    alt: 'Captura de la plataforma',
    orden: 1,
    created_at: '2026-07-31T10:00:00.000Z',
    updated_at: '2026-07-31T10:00:00.000Z',
    ...over,
  };
}

const PRIMERA = imagen({ id: '4', alt: 'Panel de agentes de MaIA', orden: 1 });
const SEGUNDA = imagen({ id: '7', alt: 'Conversaciones de tus agentes', orden: 2 });
// `BIGSERIAL` por encima de `Number.MAX_SAFE_INTEGER`: el `id` es string y se usa
// tal cual para construir la URL, sin pasar por `Number()`.
const TERCERA = imagen({ id: '9007199254740993', alt: 'Integraciones sin código', orden: 3 });

const IMAGENES = [PRIMERA, SEGUNDA, TERCERA];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockImagenes(rows: AdminImage[]) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ rows }));
}

function renderHero() {
  const onOpenContact = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <Hero onOpenContact={onOpenContact} />
    </ThemeProvider>,
  );
  return { onOpenContact };
}

/**
 * Espera a que la carga termine en un sentido o en otro. Hace falta un helper
 * propio porque en los casos de fallo no aparece nada nuevo a lo que agarrarse
 * con un `findBy`: se espera a la petición y se vacía la cola de microtareas
 * dentro de `act`, para que el `setState` del efecto ya esté aplicado.
 */
async function esperarResolucion() {
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  await act(async () => { await new Promise(res => setTimeout(res, 0)); });
}

const carrusel = () => screen.getByRole('group', { name: /capturas de la plataforma/i });

const imgs = () => Array.from(carrusel().querySelectorAll('img'));

const srcs = () => imgs().map(el => el.getAttribute('src'));

/**
 * Registra el `src` de **toda** imagen que llegue a montarse dentro del
 * carrusel, aunque se sustituya después. Sirve para distinguir «se pintó la
 * imagen de la API» de «se pintó el respaldo y luego se cambió», que es el
 * parpadeo que prohíbe el acceptance 2.
 */
function vigilarImagenes() {
  const vistos: string[] = [];
  const anotar = (n: Node) => {
    if (!(n instanceof HTMLElement)) return;
    if (n instanceof HTMLImageElement) vistos.push(n.getAttribute('src') ?? '');
    n.querySelectorAll('img').forEach(el => vistos.push(el.getAttribute('src') ?? ''));
  };
  const mo = new MutationObserver(records => {
    for (const r of records) r.addedNodes.forEach(anotar);
  });
  mo.observe(document.body, { childList: true, subtree: true });
  observadores.push(mo);
  return vistos;
}

const observadores: MutationObserver[] = [];

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', IOStub);
});

afterEach(() => {
  observadores.splice(0).forEach(mo => mo.disconnect());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Hero — consumo de GET /api/images?seccion=hero', () => {
  it('pide las imágenes de su sección al endpoint público, una sola vez y sin cookie', async () => {
    const spy = mockImagenes(IMAGENES);
    renderHero();

    await esperarResolucion();

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe('/api/images?seccion=hero');
    expect(init).toEqual(expect.objectContaining({ method: 'GET', credentials: 'omit' }));
    // El listado de imágenes no existe bajo /api/admin/: es el mismo público
    // que usa el panel (§4 ter).
    expect(spy.mock.calls.every(([u]) => !String(u).includes('/api/admin/'))).toBe(true);
  });

  it('pinta una imagen por fila, con la URL construida a partir del id y en el orden del backend', async () => {
    mockImagenes(IMAGENES);
    renderHero();

    await waitFor(() => expect(imgs()).toHaveLength(3));

    // El JSON no trae ningún campo `url`: la URL pública ES /api/images/:id/raw.
    expect(srcs()).toEqual([
      '/api/images/4/raw',
      '/api/images/7/raw',
      '/api/images/9007199254740993/raw',
    ]);
    // El backend ya devuelve `orden ASC, id ASC`: aquí no se reordena nada.
    expect(imgs().map(el => el.getAttribute('alt'))).toEqual([
      'Panel de agentes de MaIA',
      'Conversaciones de tus agentes',
      'Integraciones sin código',
    ]);
    // Y ni rastro de los estáticos que consumía antes.
    expect(srcs().some(s => s?.includes('hero-2.png') || s?.includes('hero-3.png'))).toBe(false);
  });

  it('una imagen sin alt en la API se pinta como decorativa (alt="")', async () => {
    mockImagenes([imagen({ id: '11', alt: null })]);
    renderHero();

    await waitFor(() => expect(imgs()).toHaveLength(1));
    expect(imgs()[0].getAttribute('alt')).toBe('');
  });

  it('con dos o más imágenes hay controles y navegar cambia la diapositiva visible', async () => {
    mockImagenes(IMAGENES);
    renderHero();

    await waitFor(() => expect(imgs()).toHaveLength(3));

    expect(screen.getByRole('button', { name: 'Imagen anterior' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Ir a la imagen/ })).toHaveLength(3);
    expect(imgs().map(el => el.getAttribute('aria-hidden'))).toEqual(['false', 'true', 'true']);

    await userEvent.click(screen.getByRole('button', { name: 'Imagen siguiente' }));
    expect(imgs().map(el => el.getAttribute('aria-hidden'))).toEqual(['true', 'false', 'true']);

    await userEvent.click(screen.getByRole('button', { name: 'Ir a la imagen 3' }));
    expect(imgs().map(el => el.getAttribute('aria-hidden'))).toEqual(['true', 'true', 'false']);
  });

  it('con una sola imagen no hay flechas ni puntos: no es un carrusel de uno', async () => {
    mockImagenes([PRIMERA]);
    renderHero();

    await waitFor(() => expect(imgs()).toHaveLength(1));

    expect(screen.queryByRole('button', { name: 'Imagen anterior' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Imagen siguiente' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /^Ir a la imagen/ })).toHaveLength(0);
  });
});

describe('Hero — fallback sin imágenes de la API (acceptance 2)', () => {
  it('con rows vacío cae al respaldo estático y la sección sigue entera', async () => {
    mockImagenes([]);
    renderHero();

    await esperarResolucion();

    // El encabezado NO desaparece: titular, copy y CTA siguen ahí.
    expect(screen.getByRole('heading', { level: 1, name: /crea agentes de ia/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /agenda un demo/i })).toBeInTheDocument();

    // Y el hueco de la imagen no queda vacío: una sola estática, sin controles.
    expect(srcs()).toEqual(['/hero.png']);
    expect(srcs().every(s => !s?.includes('/api/images/'))).toBe(true);
    expect(screen.queryByRole('button', { name: 'Imagen siguiente' })).not.toBeInTheDocument();
  });

  it('con un fallo de red cae al mismo respaldo, sin pedir nada de la API', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    renderHero();

    await esperarResolucion();

    expect(screen.getByRole('heading', { level: 1, name: /crea agentes de ia/i })).toBeInTheDocument();
    expect(srcs()).toEqual(['/hero.png']);
    expect(srcs().every(s => !s?.includes('/api/images/'))).toBe(true);
  });

  it('con un 500 del backend cae al mismo respaldo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'boom' }, 500));
    renderHero();

    await esperarResolucion();

    expect(screen.getByRole('heading', { level: 1, name: /crea agentes de ia/i })).toBeInTheDocument();
    expect(srcs()).toEqual(['/hero.png']);
  });
});

describe('Hero — sin hueco roto ni salto de layout (acceptance 2)', () => {
  it('mientras carga, el marco ya está montado y no hay ninguna imagen', async () => {
    let resolver: (r: Response) => void = () => {};
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(res => { resolver = res; }));
    renderHero();

    // El encabezado se pinta desde el primer render, sin esperar a la API.
    expect(screen.getByRole('heading', { level: 1, name: /crea agentes de ia/i })).toBeInTheDocument();
    const marco = carrusel();
    // Ni una <img>: no puede salir el icono de imagen partida.
    expect(imgs()).toHaveLength(0);
    // El marco ya reserva su proporción final (jsdom normaliza los espacios).
    expect(getComputedStyle(marco).getPropertyValue('aspect-ratio')).toBe('1381/677');
    expect(screen.queryByRole('button', { name: 'Imagen siguiente' })).not.toBeInTheDocument();

    await act(async () => { resolver(jsonResponse({ rows: IMAGENES })); });
    await waitFor(() => expect(imgs()).toHaveLength(3));

    // El marco reserva el espacio: es el MISMO nodo antes y después, así que la
    // respuesta de la API no monta ni desmonta el bloque.
    expect(carrusel()).toBe(marco);
  });

  it('con datos de la API el respaldo estático no llega a pintarse ni un instante', async () => {
    const vistos = vigilarImagenes();
    mockImagenes(IMAGENES);
    renderHero();

    await waitFor(() => expect(imgs()).toHaveLength(3));

    expect(vistos.some(s => s.includes('/hero.png'))).toBe(false);
    expect(vistos.filter(s => s.includes('/api/images/'))).toHaveLength(3);
  });
});
