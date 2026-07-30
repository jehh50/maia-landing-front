import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import theme from '../../theme/theme';
import UsersList from '../users/UsersList';
import { resetMockUsers } from '../users/mockUsers';
import type { AdminUser } from '../../lib/api';

// El usuario en sesión coincide con la primera fila del mock: sirve para
// comprobar que su propio borrado queda deshabilitado.
const sessionUser: AdminUser = { id: 1, email: 'ana.torres@maia.mx', name: 'Ana Torres', role: 'admin' };

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

beforeEach(() => {
  resetMockUsers();
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }) as Response);
});

afterEach(() => vi.restoreAllMocks());

describe('UsersList (maqueta con datos mock)', () => {
  it('carga y pinta las filas con email, nombre, rol y fecha, sin tocar el backend', async () => {
    renderUsers();

    expect(await screen.findByText('ana.torres@maia.mx')).toBeInTheDocument();
    expect(screen.getByText('bruno.diaz@maia.mx')).toBeInTheDocument();
    expect(screen.getByText('Bruno Díaz')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getAllByText('editor').length).toBe(3);
    expect(within(screen.getByTestId('user-row-2')).getByText('2/3/2026')).toBeInTheDocument();

    // Es una maqueta: no debe salir ninguna petición.
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('no pinta paginación: el contrato devuelve { rows } sin total', async () => {
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');
    expect(screen.queryByText(/por página/i)).not.toBeInTheDocument();
  });

  it('la búsqueda filtra el listado', async () => {
    const user = userEvent.setup();
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    await user.type(screen.getByLabelText(/buscar usuarios/i), 'bruno');

    expect(await screen.findByText('bruno.diaz@maia.mx')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('ana.torres@maia.mx')).not.toBeInTheDocument();
    });
  });

  it('muestra el estado vacío cuando la búsqueda no encuentra nada', async () => {
    const user = userEvent.setup();
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    await user.type(screen.getByLabelText(/buscar usuarios/i), 'zzz-no-existe');

    expect(await screen.findByText(/sin usuarios\./i)).toBeInTheDocument();
  });

  it('el formulario de alta valida por campo', async () => {
    const user = userEvent.setup();
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await user.click(await screen.findByRole('button', { name: /crear usuario/i }));

    expect(await screen.findByText(/email requerido/i)).toBeInTheDocument();
    expect(screen.getByText(/contraseña requerida/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^email$/i, { selector: 'input' }), 'no-es-un-email');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));
    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
  });

  it('el rol solo ofrece administrador y editor, y crear añade la fila', async () => {
    const user = userEvent.setup();
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await user.type(await screen.findByLabelText(/^email$/i, { selector: 'input' }), 'elena.paz@maia.mx');
    await user.type(screen.getByLabelText(/^nombre$/i, { selector: 'input' }), 'Elena Paz');
    await user.type(screen.getByLabelText(/^contraseña$/i, { selector: 'input' }), 'secreto-123');

    await user.click(screen.getByRole('combobox', { name: /rol/i }));
    const opciones = within(await screen.findByRole('listbox')).getAllByRole('option');
    expect(opciones.map(o => o.textContent)).toEqual(['Administrador', 'Editor']);
    await user.click(screen.getByRole('option', { name: 'Administrador' }));

    await user.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(await screen.findByText('elena.paz@maia.mx')).toBeInTheDocument();
    expect(screen.getAllByText('admin').length).toBe(2);
  });

  it('editar un usuario actualiza su fila', async () => {
    const user = userEvent.setup();
    renderUsers();
    await screen.findByText('bruno.diaz@maia.mx');

    await user.click(screen.getByRole('button', { name: /editar bruno\.diaz@maia\.mx/i }));
    const nombre = await screen.findByLabelText(/^nombre$/i, { selector: 'input' });
    await user.clear(nombre);
    await user.type(nombre, 'Bruno Actualizado');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText('Bruno Actualizado')).toBeInTheDocument();
    expect(screen.queryByText('Bruno Díaz')).not.toBeInTheDocument();
  });

  it('cancelar la confirmación no borra, y el copy advierte del último admin', async () => {
    const user = userEvent.setup();
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
  });

  it('confirmar el borrado quita la fila del listado', async () => {
    const user = userEvent.setup();
    renderUsers();
    await screen.findByText('bruno.diaz@maia.mx');

    await user.click(screen.getByRole('button', { name: /borrar bruno\.diaz@maia\.mx/i }));
    await user.click(await screen.findByRole('button', { name: /^borrar$/i }));

    await waitFor(() => {
      expect(screen.queryByText('bruno.diaz@maia.mx')).not.toBeInTheDocument();
    });
    expect(screen.getByText('ana.torres@maia.mx')).toBeInTheDocument();
  });

  it('no ofrece borrar la fila del usuario en sesión', async () => {
    renderUsers();
    await screen.findByText('ana.torres@maia.mx');

    expect(screen.getByRole('button', { name: /borrar ana\.torres@maia\.mx/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /borrar bruno\.diaz@maia\.mx/i })).toBeEnabled();
  });
});
