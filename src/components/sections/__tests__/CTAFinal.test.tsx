import { act, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { afterEach, describe, expect, it, vi } from 'vitest';
import theme from '../../../theme/theme';
import CTAFinal from '../CTAFinal';
import type { AdminImage } from '../../../lib/api';

// El backend entra en el test: se intercepta `globalThis.fetch` con `Response`
// reales y NUNCA se mockea `src/lib/api.ts` (`docs/verification.md` §4).

/** Fila de `images` con los 9 campos del contrato (§4 ter). */
function imagen(over: Partial<AdminImage> & Pick<AdminImage, 'id'>): AdminImage {
  return {
    seccion: 'cta_final',
    filename: 'maia.png',
    mime_type: 'image/png',
    size_bytes: 311_211,
    alt: 'Asistente MaIA',
    orden: 1,
    created_at: '2026-07-31T10:00:00.000Z',
    updated_at: '2026-07-31T10:00:00.000Z',
    ...over,
  };
}

// `BIGSERIAL` por encima de `Number.MAX_SAFE_INTEGER`: el `id` es string y se
// usa tal cual para construir la URL, sin pasar por `Number()`.
const PRIMERA = imagen({ id: '9007199254740993', alt: 'Asistente MaIA saludando', orden: 1 });
const SEGUNDA = imagen({ id: '12', alt: 'Otra variante', orden: 2 });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockImagenes(rows: AdminImage[]) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ rows }));
}

function renderCTA() {
  render(
    <ThemeProvider theme={theme}>
      <CTAFinal />
    </ThemeProvider>,
  );
}

/** Ver `Hero.test.tsx`: en los casos de fallo no aparece nada nuevo en pantalla. */
async function esperarResolucion() {
  await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  await act(async () => { await new Promise(res => setTimeout(res, 0)); });
}

const hueco = () => screen.getByTestId('cta-imagen');

const imgs = () => Array.from(hueco().querySelectorAll('img'));

const srcs = () => imgs().map(el => el.getAttribute('src'));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CTAFinal — consumo de GET /api/images?seccion=cta_final', () => {
  it('pide las imágenes de su sección al endpoint público, una sola vez y sin cookie', async () => {
    const spy = mockImagenes([PRIMERA]);
    renderCTA();

    await esperarResolucion();

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe('/api/images?seccion=cta_final');
    expect(init).toEqual(expect.objectContaining({ method: 'GET', credentials: 'omit' }));
    expect(spy.mock.calls.every(([u]) => !String(u).includes('/api/admin/'))).toBe(true);
  });

  it('pinta la imagen de la API con la URL construida a partir del id y su alt', async () => {
    mockImagenes([PRIMERA]);
    renderCTA();

    await waitFor(() => expect(imgs()).toHaveLength(1));

    // El JSON no trae ningún campo `url`: la URL pública ES /api/images/:id/raw.
    expect(srcs()).toEqual(['/api/images/9007199254740993/raw']);
    expect(imgs()[0].getAttribute('alt')).toBe('Asistente MaIA saludando');
    expect(srcs().some(s => s?.includes('maia.png'))).toBe(false);
  });

  it('con varias filas usa la primera que da el backend, y solo esa', async () => {
    mockImagenes([PRIMERA, SEGUNDA]);
    renderCTA();

    await waitFor(() => expect(imgs()).toHaveLength(1));

    // El listado llega `orden ASC, id ASC`: no se reordena ni se elige por id
    // (el de la primera es mayor que el de la segunda a propósito).
    expect(srcs()).toEqual(['/api/images/9007199254740993/raw']);
  });

  it('una imagen sin alt en la API se pinta como decorativa (alt="")', async () => {
    mockImagenes([imagen({ id: '3', alt: null })]);
    renderCTA();

    await waitFor(() => expect(imgs()).toHaveLength(1));
    expect(imgs()[0].getAttribute('alt')).toBe('');
  });
});

describe('CTAFinal — fallback sin imágenes de la API (acceptance 2)', () => {
  it('con rows vacío cae al respaldo estático y el CTA sigue entero', async () => {
    mockImagenes([]);
    renderCTA();

    await esperarResolucion();

    expect(screen.getByRole('heading', { level: 2, name: /empieza hoy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /iniciar ahora/i })).toBeInTheDocument();
    expect(srcs()).toEqual(['/maia.png']);
    expect(srcs().every(s => !s?.includes('/api/images/'))).toBe(true);
  });

  it('con un fallo de red cae al mismo respaldo', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    renderCTA();

    await esperarResolucion();

    expect(screen.getByRole('heading', { level: 2, name: /empieza hoy/i })).toBeInTheDocument();
    expect(srcs()).toEqual(['/maia.png']);
    expect(srcs().every(s => !s?.includes('/api/images/'))).toBe(true);
  });

  it('con un 500 del backend cae al mismo respaldo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'boom' }, 500));
    renderCTA();

    await esperarResolucion();

    expect(srcs()).toEqual(['/maia.png']);
  });
});

describe('CTAFinal — sin hueco roto ni salto de layout (acceptance 2)', () => {
  it('mientras carga, el hueco ya está reservado y no hay ninguna imagen', async () => {
    let resolver: (r: Response) => void = () => {};
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(res => { resolver = res; }));
    renderCTA();

    // El texto y el CTA se pintan desde el primer render, sin esperar a la API.
    expect(screen.getByRole('heading', { level: 2, name: /empieza hoy/i })).toBeInTheDocument();
    const marco = hueco();
    // Ni una <img>: no puede salir el icono de imagen partida.
    expect(imgs()).toHaveLength(0);
    // El hueco reserva su proporción, así que la respuesta no cambia el alto.
    // (jsdom normaliza el valor quitando los espacios del `408 / 612` del `sx`.)
    expect(getComputedStyle(marco).getPropertyValue('aspect-ratio')).toBe('408/612');

    await act(async () => { resolver(jsonResponse({ rows: [PRIMERA] })); });
    await waitFor(() => expect(imgs()).toHaveLength(1));

    // Es el MISMO nodo antes y después: no se monta ni se desmonta el bloque.
    expect(hueco()).toBe(marco);
  });
});
