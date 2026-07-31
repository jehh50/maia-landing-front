import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, afterEach, vi } from 'vitest';
import theme from '../../theme/theme';
import UsersList from '../users/UsersList';
import type { AdminUser, AdminUserRow } from '../../lib/api';

// Fixtures con la forma exacta de `PUBLIC_COLS` del backend
// (id, email, name, role, created_at). `password_hash` no aparece: nunca sale
// por la API y no se modela en el front.
const SEED: AdminUserRow[] = [
  { id: 1, email: 'ana.torres@maia.mx',  name: 'Ana Torres', role: 'admin',  created_at: '2026-01-15T09:30:00.000Z' },
  { id: 2, email: 'bruno.diaz@maia.mx',  name: 'Bruno Díaz', role: 'editor', created_at: '2026-03-02T16:05:00.000Z' },
  { id: 3, email: 'carla.mena@maia.mx',  name: 'Carla Mena', role: 'editor', created_at: '2026-05-20T11:45:00.000Z' },
  { id: 4, email: 'diego.rivas@maia.mx', name: '',           role: 'editor', created_at: '2026-06-11T08:00:00.000Z' },
];

const EMAILS_DEL_SEED = SEED.map(u => u.email);

const sessionUser: AdminUser = { id: 1, email: 'ana.torres@maia.mx', name: 'Ana Torres', role: 'admin' };

// Tres usuarios en sesión distintos (primera fila, fila intermedia y última).
// Se prueban los tres a propósito: con un solo caso, una implementación que
// hardcodease el id del usuario en sesión pasaría igual el test.
const SESIONES: AdminUser[] = [
  sessionUser,
  { id: 2, email: 'bruno.diaz@maia.mx', name: 'Bruno Díaz', role: 'editor' },
  { id: 4, email: 'diego.rivas@maia.mx', name: '', role: 'editor' },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Body de escritura tal como lo manda el front (nunca lleva `password_hash`). */
interface WriteBody {
  email?: string;
  name?: string;
  role?: AdminUserRow['role'];
  password?: string;
}

/**
 * Backend mínimo de `/api/admin/users` sobre `globalThis.fetch` con `Response`
 * reales: **no se mockea `src/lib/api.ts`**, así que el cliente HTTP entra en el
 * test y un cambio de contrato (URL, método, forma del payload) lo rompe.
 *
 * Mantiene un `store` en memoria para que el recargado posterior a una
 * escritura devuelva el listado ya actualizado, igual que el backend real.
 * `list` y `write` permiten sustituir una respuesta concreta por un error.
 */
function mockUsersApi(options: { seed?: AdminUserRow[]; list?: () => Response; write?: () => Response } = {}) {
  let store = (options.seed ?? SEED).map(u => ({ ...u }));
  let nextId = 90;

  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = String(init?.method ?? 'GET').toUpperCase();

    if (method === 'GET') return options.list ? options.list() : json({ rows: store });
    if (options.write) return options.write();

    const id = Number(url.slice(url.lastIndexOf('/') + 1));
    const body: WriteBody = init?.body ? JSON.parse(String(init.body)) : {};

    if (method === 'POST') {
      const user: AdminUserRow = {
        id: nextId++,
        email: body.email ?? '',
        name: body.name ?? '',
        role: body.role ?? 'editor',
        created_at: '2026-07-31T12:00:00.000Z',
      };
      store = [...store, user];
      return json({ user }, 201);
    }
    if (method === 'PATCH') {
      const current = store.find(u => u.id === id);
      if (!current) return json({ error: 'Usuario no encontrado' }, 404);
      const user: AdminUserRow = {
        ...current,
        email: body.email ?? current.email,
        name:  body.name  ?? current.name,
        role:  body.role  ?? current.role,
      };
      store = store.map(u => (u.id === id ? user : u));
      return json({ user });
    }
    if (method === 'DELETE') {
      store = store.filter(u => u.id !== id);
      // El backend responde 204 **sin cuerpo**.
      return new Response(null, { status: 204 });
    }
    return json({ error: `método no soportado por el mock: ${method}` }, 500);
  });
}

type UsersApiSpy = ReturnType<typeof mockUsersApi>;

/** Peticiones que no son el GET del listado. */
function escrituras(spy: UsersApiSpy) {
  return spy.mock.calls
    .map(([input, init]) => ({ url: String(input), method: String(init?.method ?? 'GET').toUpperCase(), body: init?.body }))
    .filter(c => c.method !== 'GET');
}

// useOutletContext exige un Outlet padre, así que montamos una Route anidada.
function renderUsers(user: AdminUser = sessionUser) {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route element={<Outlet context={user} />}>
            <Route path="/admin/users" element={<UsersList />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

const email = () => screen.getByLabelText(/^email$/i, { selector: 'input' });
const password = () => screen.getByLabelText(/^contraseña$/i, { selector: 'input' });

afterEach(() => vi.restoreAllMocks());

describe('UsersList — listado', () => {
  it('carga con GET /api/admin/users (con cookie) y pinta email, nombre, rol y fecha', async () => {
    const spy = mockUsersApi();
    renderUsers();

    expect(await screen.findByText('ana.torres@maia.mx')).toBeInTheDocument();
    expect(screen.getByText('bruno.diaz@maia.mx')).toBeInTheDocument();
    expect(screen.getByText('Bruno Díaz')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getAllByText('editor').length).toBe(3);
    expect(within(screen.getByTestId('user-row-2')).getByText('2/3/2026')).toBeInTheDocument();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toBe('/api/admin/users');
    expect(spy.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'include' });
  });

  it('no pagina: el contrato es { rows } sin total, y la URL no lleva limit ni offset', async () => {
    const spy = mockUsersApi();
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    expect(screen.queryByText(/por página/i)).not.toBeInTheDocument();
    expect(spy.mock.calls.map(([input]) => String(input))).toEqual(['/api/admin/users']);
  });

  it('la búsqueda filtra en cliente: el endpoint no acepta ?q=, así que no hay segunda petición', async () => {
    const user = userEvent.setup();
    const spy = mockUsersApi();
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    await user.type(screen.getByLabelText(/buscar usuarios/i), 'bruno');

    expect(await screen.findByText('bruno.diaz@maia.mx')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('ana.torres@maia.mx')).not.toBeInTheDocument();
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls.every(([input]) => !String(input).includes('q='))).toBe(true);
  });

  it('muestra el estado vacío cuando la búsqueda no encuentra nada', async () => {
    const user = userEvent.setup();
    mockUsersApi();
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    await user.type(screen.getByLabelText(/buscar usuarios/i), 'zzz-no-existe');

    expect(await screen.findByText(/sin usuarios\./i)).toBeInTheDocument();
  });

  it('muestra el mensaje del backend si el listado falla', async () => {
    mockUsersApi({ list: () => json({ error: 'Error al listar usuarios' }, 500) });
    renderUsers();

    expect(await screen.findByText('Error al listar usuarios')).toBeInTheDocument();
    expect(await screen.findByText(/sin usuarios\./i)).toBeInTheDocument();
  });

  it('traduce el 403 de requireRole en vez de enseñar el token «forbidden»', async () => {
    // El 403 del backend rompe la forma habitual: `error` trae el token y el
    // texto legible viaja en `message` (docs/api-contract.md §10.1).
    mockUsersApi({
      list: () => json({ ok: false, error: 'forbidden', message: 'No tienes permisos para esta acción' }, 403),
    });
    renderUsers();

    expect(await screen.findByText(/no tienes permisos/i)).toBeInTheDocument();
    expect(screen.queryByText('forbidden')).not.toBeInTheDocument();
  });
});

describe('UsersList — alta', () => {
  it('envía POST /api/admin/users con email, name, role y password, y recarga el listado', async () => {
    const user = userEvent.setup();
    const spy = mockUsersApi();
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await user.type(await screen.findByLabelText(/^email$/i, { selector: 'input' }), 'elena.paz@maia.mx');
    await user.type(screen.getByLabelText(/^nombre$/i, { selector: 'input' }), 'Elena Paz');
    await user.type(password(), 'secreto-123');

    await user.click(screen.getByRole('combobox', { name: /rol/i }));
    const opciones = within(await screen.findByRole('listbox')).getAllByRole('option');
    expect(opciones.map(o => o.textContent)).toEqual(['Administrador', 'Editor']);
    await user.click(screen.getByRole('option', { name: 'Administrador' }));

    await user.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(await screen.findByText('elena.paz@maia.mx')).toBeInTheDocument();
    expect(screen.getAllByText('admin').length).toBe(2);

    const [alta] = escrituras(spy);
    expect(alta.method).toBe('POST');
    expect(alta.url).toBe('/api/admin/users');
    // El payload lleva exactamente los cuatro campos escribibles: `password`
    // sube en el alta y `password_hash` no existe en el front.
    expect(JSON.parse(String(alta.body))).toEqual({
      email: 'elena.paz@maia.mx',
      name: 'Elena Paz',
      role: 'admin',
      password: 'secreto-123',
    });
    // Y el listado se recarga: GET inicial + POST + GET de recarga.
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('valida por campo antes de tocar el backend', async () => {
    const user = userEvent.setup();
    const spy = mockUsersApi();
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await user.click(await screen.findByRole('button', { name: /crear usuario/i }));

    expect(await screen.findByText(/email requerido/i)).toBeInTheDocument();
    expect(screen.getByText(/contraseña requerida/i)).toBeInTheDocument();

    await user.type(email(), 'no-es-un-email');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));
    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();

    expect(escrituras(spy)).toHaveLength(0);
  });

  it('un 422 con field marca el input culpable, no el aviso global', async () => {
    const user = userEvent.setup();
    mockUsersApi({
      write: () => json({ error: 'role inválido. Valores válidos: admin, editor', field: 'role' }, 422),
    });
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await user.type(await screen.findByLabelText(/^email$/i, { selector: 'input' }), 'elena.paz@maia.mx');
    await user.type(password(), 'secreto-123');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(await screen.findByText(/role inválido/i)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    // El mensaje aterriza en el campo Rol: sustituye a su texto de ayuda.
    expect(screen.queryByText('Solo accede a la sección de Blog.')).not.toBeInTheDocument();
  });

  it('un 409 de email duplicado marca el campo email', async () => {
    const user = userEvent.setup();
    mockUsersApi({ write: () => json({ error: 'El email ya está en uso', field: 'email' }, 409) });
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await user.type(await screen.findByLabelText(/^email$/i, { selector: 'input' }), 'ana.torres@maia.mx');
    await user.type(password(), 'secreto-123');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(await screen.findByText('El email ya está en uso')).toBeInTheDocument();
    expect(email()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('un error sin field se muestra como aviso global del formulario', async () => {
    const user = userEvent.setup();
    mockUsersApi({ write: () => json({ error: 'Error al crear usuario' }, 500) });
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await user.type(await screen.findByLabelText(/^email$/i, { selector: 'input' }), 'elena.paz@maia.mx');
    await user.type(password(), 'secreto-123');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Error al crear usuario');
    expect(email()).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('UsersList — edición', () => {
  it('envía PATCH /api/admin/users/:id sin password cuando se deja en blanco', async () => {
    const user = userEvent.setup();
    const spy = mockUsersApi();
    renderUsers();
    await screen.findByText('bruno.diaz@maia.mx');

    await user.click(screen.getByRole('button', { name: /editar bruno\.diaz@maia\.mx/i }));
    const nombre = await screen.findByLabelText(/^nombre$/i, { selector: 'input' });
    await user.clear(nombre);
    await user.type(nombre, 'Bruno Actualizado');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText('Bruno Actualizado')).toBeInTheDocument();
    expect(screen.queryByText('Bruno Díaz')).not.toBeInTheDocument();

    const [edicion] = escrituras(spy);
    expect(edicion.method).toBe('PATCH');
    expect(edicion.url).toBe('/api/admin/users/2');
    expect(JSON.parse(String(edicion.body))).toEqual({
      email: 'bruno.diaz@maia.mx',
      name: 'Bruno Actualizado',
      role: 'editor',
    });
  });

  it('envía PATCH con password solo cuando se escribe una nueva', async () => {
    const user = userEvent.setup();
    const spy = mockUsersApi();
    renderUsers();
    await screen.findByText('bruno.diaz@maia.mx');

    await user.click(screen.getByRole('button', { name: /editar bruno\.diaz@maia\.mx/i }));
    await user.type(await screen.findByLabelText(/^contraseña$/i, { selector: 'input' }), 'nueva-clave');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(escrituras(spy)).toHaveLength(1));
    const [edicion] = escrituras(spy);
    expect(edicion.method).toBe('PATCH');
    expect(JSON.parse(String(edicion.body))).toEqual({
      email: 'bruno.diaz@maia.mx',
      name: 'Bruno Díaz',
      role: 'editor',
      password: 'nueva-clave',
    });
  });
});

describe('UsersList — borrado', () => {
  it('envía DELETE /api/admin/users/:id y trata el 204 sin cuerpo como éxito', async () => {
    const user = userEvent.setup();
    const spy = mockUsersApi();
    renderUsers();
    await screen.findByText('bruno.diaz@maia.mx');

    await user.click(screen.getByRole('button', { name: /borrar bruno\.diaz@maia\.mx/i }));
    await user.click(await screen.findByRole('button', { name: /^borrar$/i }));

    await waitFor(() => {
      expect(screen.queryByText('bruno.diaz@maia.mx')).not.toBeInTheDocument();
    });
    expect(screen.getByText('ana.torres@maia.mx')).toBeInTheDocument();

    const [borrado] = escrituras(spy);
    expect(borrado.method).toBe('DELETE');
    expect(borrado.url).toBe('/api/admin/users/2');
    // Un 204 sin cuerpo no puede leerse como error: la fila desaparece y no se
    // pinta ningún mensaje.
    expect(screen.queryByText(/no pudimos eliminar/i)).not.toBeInTheDocument();
  });

  it('un error sin cuerpo NO se confunde con el 204: la fila sigue y se avisa', async () => {
    const user = userEvent.setup();
    mockUsersApi({ write: () => new Response(null, { status: 500 }) });
    renderUsers();
    await screen.findByText('bruno.diaz@maia.mx');

    await user.click(screen.getByRole('button', { name: /borrar bruno\.diaz@maia\.mx/i }));
    await user.click(await screen.findByRole('button', { name: /^borrar$/i }));

    expect(await screen.findByText(/no pudimos eliminar el usuario/i)).toBeInTheDocument();
    expect(screen.getByText('bruno.diaz@maia.mx')).toBeInTheDocument();
  });

  it('muestra el 409 del último admin, que solo se conoce por respuesta', async () => {
    const user = userEvent.setup();
    mockUsersApi({ write: () => json({ error: 'No puedes eliminar al último usuario con rol admin' }, 409) });
    renderUsers(SESIONES[1]);
    await screen.findByText('ana.torres@maia.mx');

    await user.click(screen.getByRole('button', { name: /borrar ana\.torres@maia\.mx/i }));
    await user.click(await screen.findByRole('button', { name: /^borrar$/i }));

    expect(await screen.findByText('No puedes eliminar al último usuario con rol admin')).toBeInTheDocument();
    expect(screen.getByText('ana.torres@maia.mx')).toBeInTheDocument();
  });

  it('cancelar la confirmación no borra, y el copy advierte del último admin', async () => {
    const user = userEvent.setup();
    const spy = mockUsersApi();
    renderUsers();
    await screen.findByText('bruno.diaz@maia.mx');

    await user.click(screen.getByRole('button', { name: /borrar bruno\.diaz@maia\.mx/i }));
    expect(await screen.findByText(/¿borrar usuario\?/i)).toBeInTheDocument();
    expect(screen.getByText(/último\s+usuario con rol admin/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^cancelar$/i })).not.toBeInTheDocument();
    });
    expect(screen.getByText('bruno.diaz@maia.mx')).toBeInTheDocument();
    expect(escrituras(spy)).toHaveLength(0);
  });

  // El id del usuario en sesión sale de `useOutletContext`, así que la fila
  // deshabilitada tiene que moverse con él: se comprueba con tres sesiones
  // distintas y afirmando el estado de las cuatro filas en cada una.
  it.each(SESIONES)('no ofrece borrar la fila del usuario en sesión (id $id)', async enSesion => {
    mockUsersApi();
    renderUsers(enSesion);
    await screen.findByText('ana.torres@maia.mx');

    for (const correo of EMAILS_DEL_SEED) {
      const boton = screen.getByRole('button', { name: `Borrar ${correo}` });
      if (correo === enSesion.email) expect(boton).toBeDisabled();
      else expect(boton).toBeEnabled();
    }
  });
});
