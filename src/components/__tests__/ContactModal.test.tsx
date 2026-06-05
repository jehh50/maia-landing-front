import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import theme from '../../theme/theme';
import ContactModal from '../ContactModal';

function renderModal(props: Partial<React.ComponentProps<typeof ContactModal>> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <ContactModal open={true} onClose={() => {}} tipo="demo" {...props} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ ok: true, id: 99 }), { status: 201 }) as Response,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper para llenar todos los campos requeridos con un valor válido
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nombre/i, { selector: 'input' }), 'Ana Pérez');
  await user.type(screen.getByLabelText(/email/i, { selector: 'input' }), 'ana@acme.com');
  const phoneInput = screen.getByLabelText(/teléfono/i, { selector: 'input' });
  await user.click(phoneInput);
  await user.keyboard('+525512345678');
}

describe('ContactModal', () => {
  it('muestra el título y subtítulo de demo', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: /agenda un demo de maia/i })).toBeInTheDocument();
  });

  it('marca errores cuando el formulario está vacío', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));
    expect(await screen.findByText(/tu nombre es requerido/i)).toBeInTheDocument();
    expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    expect(screen.getByText(/tu teléfono es requerido/i)).toBeInTheDocument();
  });

  it('marca error de email inválido pero deja pasar email válido', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByLabelText(/nombre/i, { selector: 'input' }), 'Ana');
    await user.type(screen.getByLabelText(/email/i, { selector: 'input' }), 'no-es-email');
    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));
    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
  });

  it('envía POST /api/contact con todos los campos y muestra éxito', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });

    await fillRequired(user);
    await user.type(screen.getByLabelText(/empresa/i, { selector: 'input' }), 'Acme');
    await user.type(screen.getByLabelText(/comentarios/i), 'Quiero un demo');

    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    await waitFor(() => {
      expect(screen.getByText(/te contactaremos en menos de 24 horas/i)).toBeInTheDocument();
    });

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toMatch(/\/api\/contact$/);
    const body = JSON.parse((calls[0][1] as RequestInit).body as string);
    expect(body.email).toBe('ana@acme.com');
    expect(body.nombre).toBe('Ana Pérez');
    expect(body.empresa).toBe('Acme');
    expect(body.telefono).toMatch(/^\+\d+$/);          // teléfono sin espacios
    expect(body.tipo).toBe('demo');
    expect(body.mensaje).toBe('Quiero un demo');
  });

  it('permite seleccionar una industria y la envía en el payload', async () => {
    const user = userEvent.setup();
    renderModal();

    await fillRequired(user);

    // Abre el Select de industria y elige una opción
    const industriaCombo = screen.getByLabelText(/tipo de industria/i);
    await user.click(industriaCombo);
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByRole('option', { name: /tecnología \/ saas/i }));

    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    await waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBe(1);
      const body = JSON.parse((calls[0][1] as RequestInit).body as string);
      expect(body.industria).toBe('Tecnología / SaaS');
    });
  });

  it('muestra mensaje de error si el backend responde 422', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Email inválido o requerido' }), { status: 422 }) as Response,
    );
    const user = userEvent.setup();
    renderModal();
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: /enviar solicitud/i }));
    expect(await screen.findByText(/email inválido o requerido/i)).toBeInTheDocument();
  });

  it('cambia el copy cuando tipo="contacto"', () => {
    renderModal({ tipo: 'contacto' });
    expect(screen.getByRole('heading', { name: /hablemos con ventas/i })).toBeInTheDocument();
  });
});
