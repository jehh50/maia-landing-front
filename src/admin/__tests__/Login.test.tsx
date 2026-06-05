import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import theme from '../../theme/theme';
import Login from '../Login';

function renderLogin() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/admin/login']}>
        <Login />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ ok: true, user: { id: 1, email: 'admin@maia.test', name: 'Admin' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ) as Response,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Login (admin)', () => {
  it('muestra el formulario con email y contraseña', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /acceso administradores/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('marca errores cuando email y contraseña están vacíos', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(await screen.findByText(/email requerido/i)).toBeInTheDocument();
    expect(screen.getByText(/contraseña requerida/i)).toBeInTheDocument();
    // No debe haber llamado al backend si la validación falló.
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('marca error si el email es inválido', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/email/i, { selector: 'input' }), 'no-es-email');
    await user.type(screen.getByLabelText(/contraseña/i, { selector: 'input' }), 'abc');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('envía POST /api/auth/login con credentials:include en submit válido', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i, { selector: 'input' }), 'admin@maia.test');
    await user.type(screen.getByLabelText(/contraseña/i, { selector: 'input' }), 'Secret-123!');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    });

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toMatch(/\/api\/auth\/login$/);
    const init = calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ email: 'admin@maia.test', password: 'Secret-123!' });
  });

  it('muestra error cuando el backend responde 401', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Credenciales inválidas' }), { status: 401 }) as Response,
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i, { selector: 'input' }), 'admin@maia.test');
    await user.type(screen.getByLabelText(/contraseña/i, { selector: 'input' }), 'wrong');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText(/credenciales inválidas/i)).toBeInTheDocument();
  });
});
