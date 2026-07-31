import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, afterEach, vi } from 'vitest';
import theme from '../../theme/theme';
import ImagesGrid from '../images/ImagesGrid';
import type { AdminImage, AdminUser, ImageSeccion } from '../../lib/api';

// Fixtures con los 9 campos exactos de `META_COLS` (el binario nunca sale por la
// API). `id` es **string**: el backend devuelve el BIGSERIAL sin castear.
const SEED: AdminImage[] = [
  {
    id: '1', seccion: 'hero', filename: 'hero.png', mime_type: 'image/png', size_bytes: 74388,
    alt: 'Panel de MaIA respondiendo un chat de WhatsApp', orden: 0,
    created_at: '2026-02-10T10:15:00.000Z', updated_at: '2026-02-10T10:15:00.000Z',
  },
  {
    id: '2', seccion: 'hero', filename: 'hero-2.png', mime_type: 'image/png', size_bytes: 93889,
    alt: 'Embudo de conversaciones calificadas por MaIA', orden: 1,
    created_at: '2026-02-10T10:16:00.000Z', updated_at: '2026-04-01T09:00:00.000Z',
  },
  {
    id: '3', seccion: 'hero', filename: 'hero-3.png', mime_type: 'image/png', size_bytes: 76613,
    alt: null, orden: 2,
    created_at: '2026-02-10T10:17:00.000Z', updated_at: '2026-02-10T10:17:00.000Z',
  },
  {
    id: '4', seccion: 'cta_final', filename: 'maia.png', mime_type: 'image/png', size_bytes: 311211,
    alt: 'Agente MaIA saludando', orden: 0,
    created_at: '2026-03-05T18:40:00.000Z', updated_at: '2026-03-05T18:40:00.000Z',
  },
];

// Las tres rutas de escritura de imágenes exigen rol admin; el editor solo lee.
const adminUser: AdminUser = { id: 1, email: 'ana.torres@maia.mx', name: 'Ana Torres', role: 'admin' };
const editorUser: AdminUser = { id: 2, email: 'bruno.diaz@maia.mx', name: 'Bruno Díaz', role: 'editor' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Backend mínimo de `/api/images` + `/api/admin/images` sobre `globalThis.fetch`
 * con `Response` reales: **no se mockea `src/lib/api.ts`**, así que el cliente
 * HTTP entra en el test y un cambio de contrato (URL, método, transporte del
 * body) lo rompe.
 *
 * El `store` en memoria hace que la recarga posterior a una escritura devuelva
 * el listado ya actualizado, como el backend real. `list` y `write` sustituyen
 * una respuesta concreta por un error.
 */
function mockImagesApi(options: { seed?: AdminImage[]; list?: () => Response; write?: () => Response } = {}) {
  let store = (options.seed ?? SEED).map(i => ({ ...i }));
  let nextId = 90;

  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = String(init?.method ?? 'GET').toUpperCase();

    if (method === 'GET') {
      if (options.list) return options.list();
      const seccion = new URL(url, 'http://localhost').searchParams.get('seccion');
      // Orden fijo del backend: `orden ASC, id ASC`.
      const rows = store
        .filter(i => !seccion || i.seccion === seccion)
        .sort((a, b) => a.orden - b.orden || Number(a.id) - Number(b.id));
      return json({ rows });
    }

    if (options.write) return options.write();

    const id = url.slice(url.lastIndexOf('/') + 1);

    if (method === 'POST') {
      // El backend solo sabe leer `multipart/form-data`: si llega otra cosa, el
      // mock responde como responderá multer.
      if (!(init?.body instanceof FormData)) return json({ error: 'Se esperaba multipart/form-data' }, 415);
      const body = init.body;
      const file = body.get('file');
      if (!(file instanceof File)) return json({ error: 'file requerido', field: 'file' }, 422);
      const alt = body.get('alt');
      const orden = body.get('orden');
      const image: AdminImage = {
        id: String(nextId++),
        seccion: String(body.get('seccion')) as ImageSeccion,
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        alt: alt ? String(alt) : null,
        orden: orden == null ? 0 : Number(orden),
        created_at: '2026-07-31T12:00:00.000Z',
        updated_at: '2026-07-31T12:00:00.000Z',
      };
      store = [...store, image];
      return json({ image }, 201);
    }

    if (method === 'PATCH') {
      const current = store.find(i => i.id === id);
      if (!current) return json({ error: 'Imagen no encontrada' }, 404);
      const patch = init?.body ? JSON.parse(String(init.body)) as Partial<AdminImage> : {};
      const image: AdminImage = {
        ...current,
        alt:     patch.alt !== undefined ? patch.alt : current.alt,
        orden:   patch.orden ?? current.orden,
        seccion: patch.seccion ?? current.seccion,
        updated_at: '2026-07-31T12:00:00.000Z',
      };
      store = store.map(i => (i.id === id ? image : i));
      return json({ image });
    }

    if (method === 'DELETE') {
      store = store.filter(i => i.id !== id);
      // El backend responde 204 **sin cuerpo**.
      return new Response(null, { status: 204 });
    }
    return json({ error: `método no soportado por el mock: ${method}` }, 500);
  });
}

type ImagesApiSpy = ReturnType<typeof mockImagesApi>;

/** Peticiones que no son el GET del listado. */
function escrituras(spy: ImagesApiSpy) {
  return spy.mock.calls
    .map(([input, init]) => ({ url: String(input), method: String(init?.method ?? 'GET').toUpperCase(), init }))
    .filter(c => c.method !== 'GET');
}

function urls(spy: ImagesApiSpy) {
  return spy.mock.calls.map(([input]) => String(input));
}

// useOutletContext exige un Outlet padre, así que montamos una Route anidada.
function renderImages(user: AdminUser = adminUser) {
  return render(
    <MemoryRouter initialEntries={['/admin/images']}>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route element={<Outlet context={user} />}>
            <Route path="/admin/images" element={<ImagesGrid />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

/** Un PNG pequeño y válido: pasa tipo, extensión y tamaño. */
function pngFile(name = 'nueva-foto.png'): File {
  return new File(['contenido-binario'], name, { type: 'image/png' });
}

/** Un PNG que declara más de 5 MB sin reservar la memoria de verdad. */
function hugePngFile(): File {
  const file = pngFile('panoramica.png');
  Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
  return file;
}

/** Abre el diálogo de subida con un archivo válido ya elegido. */
async function abrirSubidaCon(user: ReturnType<typeof userEvent.setup>, file: File = pngFile()) {
  await user.click(screen.getByRole('button', { name: 'Subir imagen' }));
  await user.upload(await screen.findByLabelText('Archivo de imagen'), file);
}

afterEach(() => vi.restoreAllMocks());

describe('ImagesGrid — listado', () => {
  it('carga con GET /api/images (endpoint público, sin cookie) y pinta filename, alt, orden, tamaño y fecha', async () => {
    const spy = mockImagesApi();
    renderImages();

    expect(await screen.findByText('hero.png')).toBeInTheDocument();
    const card = screen.getByTestId('image-card-1');
    expect(within(card).getByText('Panel de MaIA respondiendo un chat de WhatsApp')).toBeInTheDocument();
    expect(within(card).getByText('Orden 0')).toBeInTheDocument();
    expect(within(card).getByText('73 KB')).toBeInTheDocument();
    expect(within(card).getByText(/10\/2\/2026/)).toBeInTheDocument();

    // Las dos secciones del contrato, y solo esas.
    expect(screen.getByRole('heading', { name: 'Hero' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CTA final' })).toBeInTheDocument();
    expect(screen.getByText('maia.png')).toBeInTheDocument();

    // Una imagen sin alt no inventa texto alternativo.
    expect(within(screen.getByTestId('image-card-3')).getByText('Sin texto alternativo')).toBeInTheDocument();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toBe('/api/images');
    // Público: `publicJson` no manda cookie. No es `/api/admin/images`.
    expect(spy.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit' });
  });

  it('no pagina: el contrato es { rows } y la URL no lleva limit ni offset', async () => {
    const spy = mockImagesApi();
    renderImages();
    await screen.findByText('hero.png');

    expect(screen.queryByText(/por página/i)).not.toBeInTheDocument();
    expect(urls(spy)).toEqual(['/api/images']);
  });

  it('la vista previa apunta a /api/images/:id/raw, que el JSON no trae', async () => {
    mockImagesApi();
    renderImages();
    await screen.findByText('hero.png');

    const preview = within(screen.getByTestId('image-card-1')).getByRole('img', {
      name: 'Panel de MaIA respondiendo un chat de WhatsApp',
    });
    expect(preview).toHaveAttribute('src', '/api/images/1/raw');

    // Una imagen sin alt es decorativa: alt="" y la URL sigue saliendo del id.
    const sinAlt = within(screen.getByTestId('image-card-3')).getByRole('presentation');
    expect(sinAlt).toHaveAttribute('src', '/api/images/3/raw');
  });

  it('el filtro por sección se resuelve en el backend con ?seccion=', async () => {
    const user = userEvent.setup();
    const spy = mockImagesApi();
    renderImages();
    await screen.findByText('hero.png');

    await user.click(screen.getByRole('combobox', { name: 'Filtrar por sección' }));
    await user.click(await screen.findByRole('option', { name: 'CTA final' }));

    expect(await screen.findByText('maia.png')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('hero.png')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Hero' })).not.toBeInTheDocument();
    expect(urls(spy)).toEqual(['/api/images', '/api/images?seccion=cta_final']);
  });

  it('muestra el mensaje del backend si el listado falla, y lo anuncia como alerta', async () => {
    mockImagesApi({ list: () => json({ error: 'Error al listar imágenes' }, 500) });
    renderImages();

    expect(await screen.findByRole('alert')).toHaveTextContent('Error al listar imágenes');
    expect(screen.getAllByText('Sin imágenes en esta sección.')).toHaveLength(2);
  });

  it('muestra el estado vacío por sección cuando el backend no devuelve filas de esa sección', async () => {
    mockImagesApi({ seed: SEED.filter(i => i.seccion === 'hero') });
    renderImages();
    await screen.findByText('hero.png');

    // El vacío es por sección, no global: Hero conserva las suyas.
    expect(screen.getByText('Sin imágenes en esta sección.')).toBeInTheDocument();
    expect(screen.getByText('hero-2.png')).toBeInTheDocument();
  });
});

describe('ImagesGrid — subida', () => {
  it('envía POST /api/admin/images con FormData y sin fijar Content-Type, y recarga el listado', async () => {
    const user = userEvent.setup();
    const spy = mockImagesApi();
    renderImages();
    await screen.findByText('hero.png');

    await abrirSubidaCon(user);
    await user.click(screen.getByRole('combobox', { name: 'Sección' }));
    await user.click(await screen.findByRole('option', { name: 'CTA final' }));
    await user.type(screen.getByLabelText('Texto alternativo'), 'Captura del panel');
    const orden = screen.getByLabelText('Orden');
    await user.clear(orden);
    await user.type(orden, '2');
    await user.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByText('nueva-foto.png')).toBeInTheDocument();
    const card = await screen.findByTestId('image-card-90');
    expect(within(card).getByText('Captura del panel')).toBeInTheDocument();
    expect(within(card).getByText('Orden 2')).toBeInTheDocument();
    // El binario recién subido ya se sirve desde su URL pública, construida con
    // el id que devuelve el backend. (Consulta por `alt` y no por rol: el
    // diálogo aún está cerrándose y deja el fondo en `aria-hidden`.)
    expect(within(card).getByAltText('Captura del panel'))
      .toHaveAttribute('src', '/api/images/90/raw');

    const [alta] = escrituras(spy);
    expect(alta.method).toBe('POST');
    expect(alta.url).toBe('/api/admin/images');
    expect(alta.init).toMatchObject({ credentials: 'include' });

    // El body es un FormData de verdad, no un JSON serializado.
    const body = alta.init?.body;
    expect(body).toBeInstanceOf(FormData);
    const enviado = body as FormData;
    const archivo = enviado.get('file');
    expect(archivo).toBeInstanceOf(File);
    expect((archivo as File).name).toBe('nueva-foto.png');
    expect(enviado.get('seccion')).toBe('cta_final');
    expect(enviado.get('alt')).toBe('Captura del panel');
    expect(enviado.get('orden')).toBe('2');

    // Y NO se fija Content-Type: el boundary del multipart lo pone el navegador.
    expect(alta.init?.headers).toBeUndefined();
    expect(new Headers(alta.init?.headers ?? {}).get('Content-Type')).toBeNull();

    // GET inicial + POST + GET de recarga.
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('no manda el campo alt cuando se deja vacío: el backend aplica su valor por defecto', async () => {
    const user = userEvent.setup();
    const spy = mockImagesApi();
    renderImages();
    await screen.findByText('hero.png');

    await abrirSubidaCon(user);
    await user.click(screen.getByRole('combobox', { name: 'Sección' }));
    await user.click(await screen.findByRole('option', { name: 'Hero' }));
    await user.click(screen.getByRole('button', { name: 'Subir' }));

    await waitFor(() => expect(escrituras(spy)).toHaveLength(1));
    const enviado = escrituras(spy)[0].init?.body as FormData;
    expect(enviado.get('alt')).toBeNull();
    expect(enviado.get('orden')).toBe('0');
  });

  it('rechaza en cliente un archivo de tipo no permitido, sin gastar la subida, y no ofrece SVG en el accept', async () => {
    // applyAccept desactivado para simular a quien fuerza el diálogo del sistema:
    // el rechazo debe venir de nuestra validación.
    const user = userEvent.setup({ applyAccept: false });
    const spy = mockImagesApi();
    renderImages();
    await screen.findByText('hero.png');

    await user.click(screen.getByRole('button', { name: 'Subir imagen' }));
    const input = await screen.findByLabelText('Archivo de imagen');
    expect(input).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp');

    await user.upload(input, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));

    expect(await screen.findByText(/tipo de archivo no permitido/i)).toBeInTheDocument();
    expect(screen.getByText('Ningún archivo seleccionado.')).toBeInTheDocument();
    expect(escrituras(spy)).toHaveLength(0);
  });

  it('rechaza en cliente un archivo que excede los 5 MB, sin subirlo', async () => {
    const user = userEvent.setup();
    const spy = mockImagesApi();
    renderImages();
    await screen.findByText('hero.png');

    await abrirSubidaCon(user, hugePngFile());

    expect(await screen.findByText(/excede el tamaño máximo permitido \(5 MB\)/i)).toBeInTheDocument();
    expect(screen.getByText('Ningún archivo seleccionado.')).toBeInTheDocument();
    expect(escrituras(spy)).toHaveLength(0);
  });

  it('exige elegir sección antes de tocar el backend', async () => {
    const user = userEvent.setup();
    const spy = mockImagesApi();
    renderImages();
    await screen.findByText('hero.png');

    // El filtro arranca en «Todas», así que el diálogo abre sin sección elegida.
    await abrirSubidaCon(user);
    await user.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByText('seccion requerida')).toBeInTheDocument();
    expect(escrituras(spy)).toHaveLength(0);
  });

  it('rechaza en cliente un orden que no sea un entero >= 0', async () => {
    const user = userEvent.setup();
    const spy = mockImagesApi();
    renderImages();
    await screen.findByText('hero.png');

    await abrirSubidaCon(user);
    await user.click(screen.getByRole('combobox', { name: 'Sección' }));
    await user.click(await screen.findByRole('option', { name: 'Hero' }));
    const orden = screen.getByLabelText('Orden');
    await user.clear(orden);
    await user.type(orden, '-3');
    await user.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByText('orden debe ser un entero >= 0')).toBeInTheDocument();
    expect(escrituras(spy)).toHaveLength(0);
  });

  it('un 413 sin cuerpo se explica igual: el archivo es demasiado grande', async () => {
    const user = userEvent.setup();
    // Multer corta la petición antes del handler, así que el 413 puede llegar sin body.
    mockImagesApi({ write: () => new Response(null, { status: 413 }) });
    renderImages();
    await screen.findByText('hero.png');

    await abrirSubidaCon(user);
    await user.click(screen.getByRole('combobox', { name: 'Sección' }));
    await user.click(await screen.findByRole('option', { name: 'Hero' }));
    await user.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('El archivo excede el tamaño máximo permitido (5 MB)');
    // Sigue en el diálogo: no se ha subido nada.
    expect(screen.getByRole('button', { name: 'Subir' })).toBeInTheDocument();
  });

  it('un 415 del backend (magic bytes) se muestra con su mensaje, aunque el cliente lo diera por válido', async () => {
    const user = userEvent.setup();
    mockImagesApi({
      write: () => json({ error: 'El contenido del archivo no coincide con image/png' }, 415),
    });
    renderImages();
    await screen.findByText('hero.png');

    await abrirSubidaCon(user);
    await user.click(screen.getByRole('combobox', { name: 'Sección' }));
    await user.click(await screen.findByRole('option', { name: 'Hero' }));
    await user.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('El contenido del archivo no coincide con image/png');
  });

  it('un 422 con field marca el input culpable, no el aviso global', async () => {
    const user = userEvent.setup();
    mockImagesApi({
      write: () => json({ error: 'seccion inválida. Valores válidos: hero, cta_final', field: 'seccion' }, 422),
    });
    renderImages();
    await screen.findByText('hero.png');

    await abrirSubidaCon(user);
    await user.click(screen.getByRole('combobox', { name: 'Sección' }));
    await user.click(await screen.findByRole('option', { name: 'Hero' }));
    await user.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByText(/seccion inválida/i)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // El mensaje sustituye al texto de ayuda del campo Sección.
    expect(screen.queryByText('Dónde se usará la imagen en la landing.')).not.toBeInTheDocument();
  });

  it('un error sin field se muestra como aviso global del formulario', async () => {
    const user = userEvent.setup();
    mockImagesApi({ write: () => json({ error: 'Error al guardar la imagen' }, 500) });
    renderImages();
    await screen.findByText('hero.png');

    await abrirSubidaCon(user);
    await user.click(screen.getByRole('combobox', { name: 'Sección' }));
    await user.click(await screen.findByRole('option', { name: 'Hero' }));
    await user.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Error al guardar la imagen');
  });
});

describe('ImagesGrid — edición', () => {
  it('envía PATCH /api/admin/images/:id con JSON de solo alt, orden y seccion', async () => {
    const user = userEvent.setup();
    const spy = mockImagesApi();
    renderImages();
    await screen.findByText('hero.png');

    await user.click(screen.getByRole('button', { name: 'Editar hero.png' }));
    expect(await screen.findByText(/el archivo no se puede reemplazar/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reemplazar/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Archivo de imagen')).not.toBeInTheDocument();

    const alt = screen.getByLabelText('Texto alternativo');
    await user.clear(alt);
    await user.type(alt, 'Alt corregido');
    const orden = screen.getByLabelText('Orden');
    await user.clear(orden);
    await user.type(orden, '7');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    const card = await screen.findByTestId('image-card-1');
    expect(within(card).getByText('Alt corregido')).toBeInTheDocument();
    expect(within(card).getByText('Orden 7')).toBeInTheDocument();

    const [edicion] = escrituras(spy);
    expect(edicion.method).toBe('PATCH');
    // El id viaja tal cual llega del backend, sin castear.
    expect(edicion.url).toBe('/api/admin/images/1');
    expect(edicion.init).toMatchObject({ credentials: 'include' });
    expect(JSON.parse(String(edicion.init?.body))).toEqual({
      alt: 'Alt corregido',
      orden: 7,
      seccion: 'hero',
    });
  });

  it('un 422 del PATCH marca el campo que señala el backend', async () => {
    const user = userEvent.setup();
    mockImagesApi({ write: () => json({ error: 'orden debe ser un entero >= 0', field: 'orden' }, 422) });
    renderImages();
    await screen.findByText('hero.png');

    await user.click(screen.getByRole('button', { name: 'Editar hero.png' }));
    const alt = await screen.findByLabelText('Texto alternativo');
    await user.clear(alt);
    await user.type(alt, 'Otro alt');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('orden debe ser un entero >= 0')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('ImagesGrid — borrado', () => {
  it('envía DELETE /api/admin/images/:id y trata el 204 sin cuerpo como éxito', async () => {
    const user = userEvent.setup();
    const spy = mockImagesApi();
    renderImages();
    await screen.findByText('hero-3.png');

    await user.click(screen.getByRole('button', { name: 'Borrar hero-3.png' }));
    await user.click(await screen.findByRole('button', { name: 'Borrar' }));

    await waitFor(() => {
      expect(screen.queryByText('hero-3.png')).not.toBeInTheDocument();
    });
    expect(screen.getByText('hero.png')).toBeInTheDocument();

    const [borrado] = escrituras(spy);
    expect(borrado.method).toBe('DELETE');
    expect(borrado.url).toBe('/api/admin/images/3');
    expect(borrado.init).toMatchObject({ credentials: 'include' });
    // Un 204 sin cuerpo no puede leerse como error.
    expect(screen.queryByText(/no pudimos eliminar/i)).not.toBeInTheDocument();
  });

  it('un error sin cuerpo NO se confunde con el 204: la imagen sigue y se avisa', async () => {
    const user = userEvent.setup();
    mockImagesApi({ write: () => new Response(null, { status: 500 }) });
    renderImages();
    await screen.findByText('hero-3.png');

    await user.click(screen.getByRole('button', { name: 'Borrar hero-3.png' }));
    await user.click(await screen.findByRole('button', { name: 'Borrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos eliminar la imagen');
    expect(screen.getByText('hero-3.png')).toBeInTheDocument();
  });

  it('traduce el 403 de requireRole en vez de enseñar el token «forbidden»', async () => {
    const user = userEvent.setup();
    // El 403 del backend rompe la forma habitual: `error` trae el token y el
    // texto legible viaja en `message` (docs/api-contract.md §10.1).
    mockImagesApi({
      write: () => json({ ok: false, error: 'forbidden', message: 'No tienes permisos para esta acción' }, 403),
    });
    renderImages();
    await screen.findByText('hero-3.png');

    await user.click(screen.getByRole('button', { name: 'Borrar hero-3.png' }));
    await user.click(await screen.findByRole('button', { name: 'Borrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no tienes permisos/i);
    expect(screen.queryByText('forbidden')).not.toBeInTheDocument();
  });

  it('cancelar la confirmación no borra la imagen', async () => {
    const user = userEvent.setup();
    const spy = mockImagesApi();
    renderImages();
    await screen.findByText('hero-3.png');

    await user.click(screen.getByRole('button', { name: 'Borrar hero-3.png' }));
    expect(await screen.findByText('¿Borrar imagen?')).toBeInTheDocument();
    expect(screen.getByText(/no hay papelera/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByText('¿Borrar imagen?')).not.toBeInTheDocument();
    });
    expect(screen.getByText('hero-3.png')).toBeInTheDocument();
    expect(escrituras(spy)).toHaveLength(0);
  });
});

describe('ImagesGrid — permisos', () => {
  it('un editor ve la galería pero no las acciones de escritura, reservadas al rol admin', async () => {
    mockImagesApi();
    renderImages(editorUser);
    await screen.findByText('hero.png');

    expect(screen.queryByRole('button', { name: 'Subir imagen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar hero.png' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Borrar hero.png' })).not.toBeInTheDocument();
    expect(screen.getByText(/reservado al rol administrador/i)).toBeInTheDocument();
  });
});
