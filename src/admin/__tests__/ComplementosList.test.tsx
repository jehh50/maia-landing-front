import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, afterEach, vi } from 'vitest';
import theme from '../../theme/theme';
import ComplementosList from '../addons/ComplementosList';
import type { AdminComplemento, AdminPaquete, AdminUser } from '../../lib/api';

/**
 * Fixtures con los 6 campos exactos de `GET /api/complementos`
 * (`API_READY.md`, actualizado 2026-08-09): `id, nombre, descripcion, precio,
 * unidad, orden, paquetes`.
 *
 * «Créditos adicionales» tiene precio unitario propio y sin paquetes.
 * «Packs de créditos» reproduce el caso real del contrato: `precio: null` +
 * `unidad: null` porque son sus paquetes los que llevan el precio.
 */
const SEED: AdminComplemento[] = [
  {
    id: '1', nombre: 'Créditos adicionales',
    descripcion: 'Amplía tu consumo mensual sin cambiar de plan.',
    precio: 0.2, unidad: '/ crédito', orden: 1,
    paquetes: [],
  },
  {
    id: '2', nombre: 'Packs de créditos',
    descripcion: 'Compra créditos por adelantado.',
    precio: null, unidad: null, orden: 2,
    paquetes: [
      { id: '7', complemento_id: '2', nombre: 'Pack S', descripcion: '500 créditos', precio: 90, orden: 1 },
      { id: '8', complemento_id: '2', nombre: 'Pack M', descripcion: '1200 créditos', precio: 190, orden: 2 },
    ],
  },
];

const adminUser: AdminUser = { id: 1, email: 'ana.torres@maia.mx', name: 'Ana Torres', role: 'admin' };
const editorUser: AdminUser = { id: 2, email: 'bruno.diaz@maia.mx', name: 'Bruno Díaz', role: 'editor' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Body = Record<string, unknown>;

/** `validarComplemento()` del backend, en lo que afecta a esta pantalla. */
function validar(body: Body, requireNombre: boolean): { error: string; field: string } | null {
  if (body.nombre !== undefined || requireNombre) {
    if (typeof body.nombre !== 'string' || !body.nombre.trim()) {
      return { error: 'nombre requerido', field: 'nombre' };
    }
  }
  if (body.precio !== undefined && body.precio !== null) {
    if (typeof body.precio !== 'number' || Number.isNaN(body.precio)) {
      return { error: 'precio debe ser un número', field: 'precio' };
    }
    if (body.precio < 0 || body.precio > 99999999.99) {
      return { error: 'precio debe ser un número', field: 'precio' };
    }
  }
  if (body.orden !== undefined && !Number.isInteger(body.orden)) {
    return { error: 'orden debe ser un entero >= 0', field: 'orden' };
  }
  return null;
}

/**
 * `validarPaquete()` del backend (`API_READY.md`, actualizado 2026-08-09): a
 * diferencia del complemento, `precio` es obligatorio y hace falta un
 * `complemento_id` que apunte a un complemento existente en `store`. Un
 * `PATCH` que no traiga ningún campo editable responde `422` sin `field`.
 */
function validarPaquete(
  body: Body,
  method: 'POST' | 'PATCH',
  store: AdminComplemento[],
): { error: string; field?: string } | null {
  const editables = ['nombre', 'descripcion', 'precio', 'orden', 'complemento_id'];
  if (method === 'PATCH' && !editables.some(k => body[k] !== undefined)) {
    return { error: 'Nada que actualizar: se esperaba nombre, descripcion, precio, orden o complemento_id' };
  }
  if (method === 'POST' || body.nombre !== undefined) {
    if (typeof body.nombre !== 'string' || !body.nombre.trim()) {
      return { error: 'nombre requerido', field: 'nombre' };
    }
  }
  if (method === 'POST' || body.precio !== undefined) {
    if (typeof body.precio !== 'number' || Number.isNaN(body.precio) || body.precio < 0 || body.precio > 99999999.99) {
      return { error: 'precio debe ser un número', field: 'precio' };
    }
  }
  if (method === 'POST' || body.complemento_id !== undefined) {
    const raw = body.complemento_id;
    const existe = typeof raw === 'string' && /^\d+$/.test(raw) && store.some(c => c.id === raw);
    if (!existe) {
      return { error: 'complemento_id debe ser el id de un complemento existente', field: 'complemento_id' };
    }
  }
  if (body.orden !== undefined && !Number.isInteger(body.orden)) {
    return { error: 'orden debe ser un entero >= 0', field: 'orden' };
  }
  return null;
}

/**
 * Backend mínimo de `/api/complementos` + `/api/admin/complementos` +
 * `/api/admin/paquetes` sobre `globalThis.fetch` con `Response` reales:
 * **no se mockea `src/lib/api.ts`**.
 *
 * Reproduce varios comportamientos del contrato real:
 *
 * 1. **`GET /api/admin/complementos` no existe**: responde `404`, igual que
 *    precios. El listado del panel sale siempre del endpoint público.
 * 2. **El borrado de un complemento es en cascada**: se lleva sus paquetes
 *    por delante, sin que el mock necesite modelarlos aparte porque viven
 *    anidados en la misma fila.
 * 3. **Los paquetes no tienen listado propio**: viven dentro de `paquetes` de
 *    cada complemento en `store`, y las escrituras de `/api/admin/paquetes`
 *    los mueven de ahí a ahí (incluida la reasignación de `complemento_id`).
 *    Borrar un paquete solo lo saca de su complemento, nunca borra la fila.
 */
function mockComplementosApi(options: { seed?: AdminComplemento[]; list?: () => Response; write?: () => Response } = {}) {
  let store = (options.seed ?? SEED).map(c => ({ ...c, paquetes: c.paquetes.map(p => ({ ...p })) }));
  let nextId = 90;
  let nextPaqueteId = 900;

  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = String(init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) as Body : {};
    const id = url.slice(url.lastIndexOf('/') + 1);

    if (method === 'GET') {
      if (url === '/api/complementos') {
        if (options.list) return options.list();
        const rows = [...store].sort((a, b) => a.orden - b.orden);
        return json({ rows });
      }
      if (url === '/api/admin/complementos') return json({ error: 'Not Found' }, 404);
      const c = store.find(c => c.id === id);
      return c ? json({ complemento: c }) : json({ error: 'Complemento no encontrado' }, 404);
    }

    if (options.write) return options.write();

    if (url.startsWith('/api/admin/paquetes')) {
      const localizar = (paqueteId: string) => {
        for (const c of store) {
          const p = c.paquetes.find(p => p.id === paqueteId);
          if (p) return { complemento: c, paquete: p };
        }
        return null;
      };

      if (method === 'POST') {
        const invalido = validarPaquete(body, 'POST', store);
        if (invalido) return json(invalido, 422);
        const complementoId = String(body.complemento_id);
        const nuevo: AdminPaquete = {
          id: String(nextPaqueteId++),
          complemento_id: complementoId,
          nombre: body.nombre as string,
          descripcion: (body.descripcion as string | null | undefined) ?? null,
          precio: body.precio as number,
          orden: (body.orden as number | undefined) ?? 0,
        };
        store = store.map(c => (c.id === complementoId ? { ...c, paquetes: [...c.paquetes, nuevo] } : c));
        return json({ paquete: nuevo }, 201);
      }

      if (method === 'PATCH') {
        const encontrado = localizar(id);
        if (!encontrado) return json({ error: 'Paquete no encontrado' }, 404);
        const invalido = validarPaquete(body, 'PATCH', store);
        if (invalido) return json(invalido, 422);
        const { paquete: actual, complemento: origen } = encontrado;
        const destinoId = body.complemento_id !== undefined ? String(body.complemento_id) : actual.complemento_id;
        const actualizado: AdminPaquete = {
          id: actual.id,
          complemento_id: destinoId,
          nombre: (body.nombre as string | undefined) ?? actual.nombre,
          descripcion: body.descripcion !== undefined ? (body.descripcion as string | null) : actual.descripcion,
          precio: (body.precio as number | undefined) ?? actual.precio,
          orden: (body.orden as number | undefined) ?? actual.orden,
        };
        store = store.map(c => {
          if (c.id === origen.id && c.id !== destinoId) {
            return { ...c, paquetes: c.paquetes.filter(p => p.id !== actual.id) };
          }
          if (c.id === destinoId) {
            return { ...c, paquetes: [...c.paquetes.filter(p => p.id !== actual.id), actualizado] };
          }
          return c;
        });
        return json({ paquete: actualizado });
      }

      if (method === 'DELETE') {
        const encontrado = localizar(id);
        if (!encontrado) return json({ error: 'Paquete no encontrado' }, 404);
        store = store.map(c => (
          c.id === encontrado.complemento.id ? { ...c, paquetes: c.paquetes.filter(p => p.id !== id) } : c
        ));
        return new Response(null, { status: 204 });
      }

      return json({ error: `método no soportado por el mock: ${method}` }, 500);
    }

    if (method === 'POST' || method === 'PATCH') {
      const invalido = validar(body, method === 'POST');
      if (invalido) return json(invalido, 422);

      const actual = method === 'PATCH' ? store.find(c => c.id === id) : undefined;
      if (method === 'PATCH' && !actual) return json({ error: 'Complemento no encontrado' }, 404);

      const c: AdminComplemento = {
        id: actual?.id ?? String(nextId++),
        nombre: (body.nombre as string | undefined) ?? actual?.nombre ?? '',
        descripcion: body.descripcion !== undefined ? (body.descripcion as string | null) : actual?.descripcion ?? null,
        precio: body.precio !== undefined ? (body.precio as number | null) : actual?.precio ?? null,
        unidad: body.unidad !== undefined ? (body.unidad as string | null) : actual?.unidad ?? null,
        orden: (body.orden as number | undefined) ?? actual?.orden ?? 0,
        paquetes: actual?.paquetes ?? [],
      };
      store = actual ? store.map(x => (x.id === id ? c : x)) : [...store, c];
      return json({ complemento: c }, method === 'POST' ? 201 : 200);
    }

    if (method === 'DELETE') {
      if (!store.some(c => c.id === id)) return json({ error: 'Complemento no encontrado' }, 404);
      // Cascada: los paquetes anidados desaparecen con la fila, sin aviso propio.
      store = store.filter(c => c.id !== id);
      return new Response(null, { status: 204 });
    }
    return json({ error: `método no soportado por el mock: ${method}` }, 500);
  });
}

type ComplementosApiSpy = ReturnType<typeof mockComplementosApi>;

function urls(spy: ComplementosApiSpy) {
  return spy.mock.calls.map(([input]) => String(input));
}

function escrituras(spy: ComplementosApiSpy) {
  return spy.mock.calls
    .map(([input, init]) => ({ url: String(input), method: String(init?.method ?? 'GET').toUpperCase(), init }))
    .filter(c => c.method !== 'GET');
}

function cuerpos(spy: ComplementosApiSpy): Body[] {
  return escrituras(spy).map(c => JSON.parse(String(c.init?.body)) as Body);
}

// useOutletContext exige un Outlet padre, así que montamos una Route anidada.
function renderComplementos(user: AdminUser = adminUser) {
  return render(
    <MemoryRouter initialEntries={['/admin/complementos']}>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route element={<Outlet context={user} />}>
            <Route path="/admin/complementos" element={<ComplementosList />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

function celda(id: string): string {
  return screen.getByTestId(id).textContent ?? '';
}

async function abrirEdicion(user: ReturnType<typeof userEvent.setup>, nombre: string) {
  await user.click(screen.getByRole('button', { name: `Editar ${nombre}` }));
  return screen.findByRole('dialog');
}

async function escribir(user: ReturnType<typeof userEvent.setup>, etiqueta: string, valor: string) {
  const campo = screen.getByLabelText(etiqueta);
  await user.clear(campo);
  if (valor) await user.type(campo, valor);
}

afterEach(() => vi.restoreAllMocks());

describe('ComplementosList — listado', () => {
  it('carga con GET /api/complementos (endpoint público, sin cookie) y pinta orden, nombre, precio y unidad', async () => {
    const spy = mockComplementosApi();
    renderComplementos();

    expect(await screen.findByText('Créditos adicionales')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^addon-row-/)).toHaveLength(2);

    expect(celda('addon-1-precio')).toBe('$0.2 / crédito');
    // La celda de paquetes también trae el botón "Agregar paquete" (feature 38).
    expect(within(screen.getByTestId('addon-1-paquetes')).getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar paquete a Créditos adicionales' })).toBeInTheDocument();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toBe('/api/complementos');
    expect(spy.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit' });
  });

  it('no lista por /api/admin/complementos, que no existe', async () => {
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Créditos adicionales');

    expect(urls(spy)).toEqual(['/api/complementos']);
    expect(screen.queryByText(/por página/i)).not.toBeInTheDocument();
  });

  it('un complemento con precio null pinta sus paquetes y no una cifra: nunca $null ni $0', async () => {
    mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    expect(celda('addon-2-precio')).toBe('—');
    const paquetes = screen.getByTestId('addon-2-paquetes');
    expect(within(paquetes).getByText('Pack S — $90')).toBeInTheDocument();
    expect(within(paquetes).getByText('Pack M — $190')).toBeInTheDocument();
    expect(paquetes.textContent).not.toContain('$null');
    expect(paquetes.textContent).not.toContain('$0');
  });

  it('muestra el mensaje del backend si el listado falla, y lo anuncia como alerta', async () => {
    mockComplementosApi({ list: () => json({ error: 'Error al listar complementos' }, 500) });
    renderComplementos();

    expect(await screen.findByRole('alert')).toHaveTextContent('Error al listar complementos');
    expect(screen.getByText(/sin complementos todavía/i)).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay complementos', async () => {
    mockComplementosApi({ seed: [] });
    renderComplementos();

    expect(await screen.findByText(/sin complementos todavía/i)).toBeInTheDocument();
    expect(screen.queryByTestId(/^addon-row-/)).not.toBeInTheDocument();
  });
});

describe('ComplementosList — alta', () => {
  it('envía POST /api/admin/complementos y un precio vacío manda null, no 0', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Créditos adicionales');

    await user.click(screen.getByRole('button', { name: 'Nuevo complemento' }));
    await screen.findByRole('dialog');
    await escribir(user, 'Nombre', 'Soporte prioritario');
    await escribir(user, 'Orden', '3');
    await user.click(screen.getByRole('button', { name: 'Crear complemento' }));

    expect(await screen.findByText('Soporte prioritario')).toBeInTheDocument();

    const [alta] = escrituras(spy);
    expect(alta.method).toBe('POST');
    expect(alta.url).toBe('/api/admin/complementos');
    expect(alta.init).toMatchObject({ credentials: 'include' });
    expect(cuerpos(spy)[0]).toEqual({
      nombre: 'Soporte prioritario',
      descripcion: null,
      precio: null,
      unidad: null,
      orden: 3,
    });

    expect(urls(spy)).toEqual(['/api/complementos', '/api/admin/complementos', '/api/complementos']);
  });

  it('valida en cliente antes de tocar el backend: sin nombre no sale ninguna escritura', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Créditos adicionales');

    await user.click(screen.getByRole('button', { name: 'Nuevo complemento' }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Crear complemento' }));

    expect(await screen.findByText('nombre requerido')).toBeInTheDocument();
    expect(escrituras(spy)).toHaveLength(0);
  });
});

describe('ComplementosList — edición', () => {
  it('envía PATCH /api/admin/complementos/:id con los campos editables', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Créditos adicionales');

    await abrirEdicion(user, 'Créditos adicionales');
    await escribir(user, 'Precio', '0.35');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(celda('addon-1-precio')).toBe('$0.35 / crédito'));

    const [edicion] = escrituras(spy);
    expect(edicion.method).toBe('PATCH');
    expect(edicion.url).toBe('/api/admin/complementos/1');
    expect(edicion.init).toMatchObject({ credentials: 'include' });
    expect(cuerpos(spy)[0]).toEqual({
      nombre: 'Créditos adicionales',
      descripcion: 'Amplía tu consumo mensual sin cambiar de plan.',
      precio: 0.35,
      unidad: '/ crédito',
      orden: 1,
    });
  });

  it('vaciar el precio de un complemento con precio propio lo manda a null en el PATCH', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Créditos adicionales');

    await abrirEdicion(user, 'Créditos adicionales');
    await escribir(user, 'Precio', '');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(celda('addon-1-precio')).toBe('—'));
    expect(cuerpos(spy)[0].precio).toBeNull();
  });

  it('el diálogo de un complemento con paquetes avisa que se editan en su propia pantalla', async () => {
    const user = userEvent.setup();
    mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await abrirEdicion(user, 'Packs de créditos');
    expect(screen.getByText(/tiene 2 paquetes asociados/i)).toBeInTheDocument();
    // Los paquetes no son campos editables de este formulario.
    expect(screen.queryByLabelText('Pack S')).not.toBeInTheDocument();
  });
});

describe('ComplementosList — errores del backend', () => {
  it('un 422 con field marca el input culpable, no el aviso global', async () => {
    const user = userEvent.setup();
    mockComplementosApi({
      write: () => json({ error: 'precio debe ser un número', field: 'precio' }, 422),
    });
    renderComplementos();
    await screen.findByText('Créditos adicionales');

    await abrirEdicion(user, 'Créditos adicionales');
    await escribir(user, 'Precio', '5');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('precio debe ser un número')).toBeInTheDocument();
    expect(screen.getByLabelText('Precio')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('traduce el 403 de requireRole en vez de enseñar el token «forbidden»', async () => {
    const user = userEvent.setup();
    mockComplementosApi({
      write: () => json({ ok: false, error: 'forbidden', message: 'No tienes permisos para esta acción' }, 403),
    });
    renderComplementos();
    await screen.findByText('Créditos adicionales');

    await abrirEdicion(user, 'Créditos adicionales');
    await escribir(user, 'Nombre', 'Créditos Pro');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/no tienes permisos/i);
    expect(screen.queryByText('forbidden')).not.toBeInTheDocument();
  });
});

describe('ComplementosList — borrado', () => {
  it('la confirmación menciona la cascada y cuántos paquetes se llevan por delante', async () => {
    const user = userEvent.setup();
    mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Borrar Packs de créditos' }));

    expect(await screen.findByText('¿Borrar complemento?')).toBeInTheDocument();
    expect(screen.getByText(/se eliminarán también sus 2 paquetes/i)).toBeInTheDocument();
  });

  it('un complemento sin paquetes no anuncia una cascada inexistente', async () => {
    const user = userEvent.setup();
    mockComplementosApi();
    renderComplementos();
    await screen.findByText('Créditos adicionales');

    await user.click(screen.getByRole('button', { name: 'Borrar Créditos adicionales' }));

    expect(await screen.findByText('¿Borrar complemento?')).toBeInTheDocument();
    expect(screen.getByText(/no tiene paquetes asociados/i)).toBeInTheDocument();
    expect(screen.queryByText(/se eliminarán también/i)).not.toBeInTheDocument();
  });

  it('envía DELETE /api/admin/complementos/:id y trata el 204 sin cuerpo como éxito', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Borrar Packs de créditos' }));
    await user.click(await screen.findByRole('button', { name: 'Borrar' }));

    await waitFor(() => expect(screen.queryByText('Packs de créditos')).not.toBeInTheDocument());
    expect(screen.getByText('Créditos adicionales')).toBeInTheDocument();

    const [borrado] = escrituras(spy);
    expect(borrado.method).toBe('DELETE');
    expect(borrado.url).toBe('/api/admin/complementos/2');
    expect(borrado.init).toMatchObject({ credentials: 'include' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cancelar la confirmación no borra el complemento', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Borrar Packs de créditos' }));
    expect(await screen.findByText('¿Borrar complemento?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByText('¿Borrar complemento?')).not.toBeInTheDocument());
    expect(screen.getByText('Packs de créditos')).toBeInTheDocument();
    expect(escrituras(spy)).toHaveLength(0);
  });

  it('un error sin cuerpo NO se confunde con el 204: el complemento sigue y se avisa', async () => {
    const user = userEvent.setup();
    mockComplementosApi({ write: () => new Response(null, { status: 500 }) });
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Borrar Packs de créditos' }));
    await user.click(await screen.findByRole('button', { name: 'Borrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos eliminar el complemento');
    expect(screen.getByText('Packs de créditos')).toBeInTheDocument();
  });
});

describe('ComplementosList — permisos', () => {
  it('un editor consulta los complementos pero no puede crearlos, editarlos ni borrarlos', async () => {
    mockComplementosApi();
    renderComplementos(editorUser);
    await screen.findByText('Créditos adicionales');

    expect(screen.queryByRole('button', { name: 'Nuevo complemento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar Créditos adicionales' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Borrar Créditos adicionales' })).not.toBeInTheDocument();
    expect(screen.getByText(/reservado al rol administrador/i)).toBeInTheDocument();
    expect(celda('addon-1-precio')).toBe('$0.2 / crédito');

    // Tampoco puede tocar los paquetes: ni editarlos, ni borrarlos, ni agregar uno nuevo.
    expect(screen.queryByRole('button', { name: 'Editar paquete Pack S' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Borrar paquete Pack S' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agregar paquete/i })).not.toBeInTheDocument();
  });
});

describe('ComplementosList — paquetes: alta', () => {
  it('envía POST /api/admin/paquetes con complemento_id y precio, y recarga el listado', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Agregar paquete a Packs de créditos' }));
    await screen.findByRole('dialog');
    await escribir(user, 'Nombre', 'Pack L');
    await escribir(user, 'Precio', '350');
    await user.click(screen.getByRole('button', { name: 'Crear paquete' }));

    await waitFor(() => expect(screen.getByTestId('addon-2-paquetes')).toHaveTextContent('Pack L — $350'));

    const [alta] = escrituras(spy);
    expect(alta.method).toBe('POST');
    expect(alta.url).toBe('/api/admin/paquetes');
    expect(alta.init).toMatchObject({ credentials: 'include' });
    expect(cuerpos(spy)[0]).toEqual({
      nombre: 'Pack L',
      complemento_id: '2',
      precio: 350,
      descripcion: null,
      orden: 0,
    });

    // Tras la escritura se vuelve a pedir el listado público completo.
    expect(urls(spy)).toEqual(['/api/complementos', '/api/admin/paquetes', '/api/complementos']);
  });

  it('el precio es obligatorio: sin él no sale ninguna escritura', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Créditos adicionales');

    await user.click(screen.getByRole('button', { name: 'Agregar paquete a Créditos adicionales' }));
    await screen.findByRole('dialog');
    await escribir(user, 'Nombre', 'Pack único');
    await user.click(screen.getByRole('button', { name: 'Crear paquete' }));

    expect(await screen.findByText('precio requerido')).toBeInTheDocument();
    expect(escrituras(spy)).toHaveLength(0);
  });
});

describe('ComplementosList — paquetes: edición', () => {
  it('envía PATCH /api/admin/paquetes/:id con los campos editables', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Editar paquete Pack S' }));
    await screen.findByRole('dialog');
    await escribir(user, 'Precio', '99');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.getByTestId('addon-2-paquetes')).toHaveTextContent('Pack S — $99'));

    const [edicion] = escrituras(spy);
    expect(edicion.method).toBe('PATCH');
    expect(edicion.url).toBe('/api/admin/paquetes/7');
    expect(edicion.init).toMatchObject({ credentials: 'include' });
    expect(cuerpos(spy)[0]).toEqual({
      nombre: 'Pack S',
      complemento_id: '2',
      precio: 99,
      descripcion: '500 créditos',
      orden: 1,
    });
  });

  it('un formulario sin cambios no envía ningún PATCH: "Guardar cambios" queda deshabilitado', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Editar paquete Pack S' }));
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(escrituras(spy)).toHaveLength(0);
  });

  it('un envío directo del <form> sin cambios (bypaseando el botón deshabilitado) tampoco dispara PATCH', async () => {
    // El botón "Guardar cambios" queda `disabled`, pero eso no cubre un envío
    // implícito del formulario (Enter con foco en un campo, `form.submit()`,
    // tecnología de asistencia): la guardia real está en el `onSubmit` del
    // componente (`if (paquete && !dirty) return;`), y es esa la que hay que
    // ejercer aquí para que este test sea sensible a que alguien la borre.
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Editar paquete Pack S' }));
    const dialog = await screen.findByRole('dialog');
    const form = dialog.querySelector('form');
    if (!form) throw new Error('no se encontró el <form> del diálogo de edición');

    fireEvent.submit(form);

    expect(escrituras(spy)).toHaveLength(0);
  });

  it('reasigna un paquete a otro complemento cambiando el selector "Complemento"', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Editar paquete Pack S' }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('combobox', { name: /complemento/i }));
    await screen.findByRole('listbox');
    await user.click(screen.getByRole('option', { name: 'Créditos adicionales' }));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.getByTestId('addon-1-paquetes')).toHaveTextContent('Pack S — $90'));
    expect(screen.getByTestId('addon-2-paquetes')).not.toHaveTextContent('Pack S');

    expect(cuerpos(spy)[0]).toMatchObject({ complemento_id: '1' });
  });

  it('un complemento_id inexistente responde 422 y marca el selector, no el aviso global', async () => {
    const user = userEvent.setup();
    mockComplementosApi({
      write: () => json({ error: 'complemento_id debe ser el id de un complemento existente', field: 'complemento_id' }, 422),
    });
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Editar paquete Pack S' }));
    await screen.findByRole('dialog');
    await escribir(user, 'Precio', '77');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('complemento_id debe ser el id de un complemento existente')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('un :id de paquete inexistente responde 404 y se muestra como tal', async () => {
    const user = userEvent.setup();
    mockComplementosApi({ write: () => json({ error: 'Paquete no encontrado' }, 404) });
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Editar paquete Pack S' }));
    await screen.findByRole('dialog');
    await escribir(user, 'Precio', '77');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Paquete no encontrado');
  });
});

describe('ComplementosList — paquetes: borrado', () => {
  it('la confirmación de borrar un paquete NO menciona ninguna cascada', async () => {
    const user = userEvent.setup();
    mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Borrar paquete Pack S' }));

    expect(await screen.findByText('¿Borrar paquete?')).toBeInTheDocument();
    expect(screen.getByText(/se eliminará/i)).toBeInTheDocument();
    expect(screen.queryByText(/cascada/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/paquetes asociados/i)).not.toBeInTheDocument();
  });

  it('envía DELETE /api/admin/paquetes/:id y no dispara ningún DELETE de complemento', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Borrar paquete Pack S' }));
    await user.click(await screen.findByRole('button', { name: 'Borrar' }));

    await waitFor(() => expect(screen.getByTestId('addon-2-paquetes')).not.toHaveTextContent('Pack S'));
    // El complemento sigue intacto: no fue un borrado en cascada.
    expect(screen.getByText('Packs de créditos')).toBeInTheDocument();
    expect(screen.getByTestId('addon-2-paquetes')).toHaveTextContent('Pack M — $190');

    const escritos = escrituras(spy);
    expect(escritos).toHaveLength(1);
    expect(escritos[0]).toMatchObject({ method: 'DELETE', url: '/api/admin/paquetes/7' });
    expect(escritos.some(e => e.url.startsWith('/api/admin/complementos'))).toBe(false);
  });

  it('cancelar la confirmación no borra el paquete', async () => {
    const user = userEvent.setup();
    const spy = mockComplementosApi();
    renderComplementos();
    await screen.findByText('Packs de créditos');

    await user.click(screen.getByRole('button', { name: 'Borrar paquete Pack S' }));
    expect(await screen.findByText('¿Borrar paquete?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByText('¿Borrar paquete?')).not.toBeInTheDocument());
    expect(screen.getByTestId('addon-2-paquetes')).toHaveTextContent('Pack S — $90');
    expect(escrituras(spy)).toHaveLength(0);
  });
});
