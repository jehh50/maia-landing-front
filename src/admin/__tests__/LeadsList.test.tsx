import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import theme from '../../theme/theme';
import LeadsList from '../leads/LeadsList';

const lead = (id: number, over: Partial<{ nombre: string; email: string; empresa: string; tipo: string; pais: string; pais_iso: string; }> = {}) => ({
  id,
  nombre: over.nombre ?? `Lead ${id}`,
  empresa: over.empresa ?? 'Acme',
  email: over.email ?? `lead${id}@test`,
  telefono: '+584242848748',
  pais: over.pais ?? 'México',
  pais_iso: over.pais_iso ?? 'MX',
  industria: 'Tecnología / SaaS',
  mensaje: 'msg',
  tipo: over.tipo ?? 'demo',
  created_at: new Date(2026, 4, 1).toISOString(),
});

function mockListResponse(rows: any[], total = rows.length) {
  return new Response(JSON.stringify({ rows, total, limit: 25, offset: 0 }), { status: 200 }) as Response;
}

function renderList() {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <LeadsList />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    mockListResponse([lead(1, { nombre: 'Ana' }), lead(2, { nombre: 'Bruno' })]),
  );
});

afterEach(() => vi.restoreAllMocks());

describe('LeadsList', () => {
  it('carga y muestra leads en la tabla', async () => {
    renderList();
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Bruno')).toBeInTheDocument();
  });

  it('cambiar la búsqueda dispara fetch con ?q=...', async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findByText('Ana');
    await user.type(screen.getByLabelText(/buscar leads/i), 'ana');
    await waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const matched = calls.find(c => String(c[0]).includes('q=ana'));
      expect(matched).toBeTruthy();
    });
  });

  it('click en una fila abre el modal con detalle', async () => {
    const user = userEvent.setup();
    renderList();
    const row = await screen.findByTestId('lead-row-1');
    await user.click(row);
    // El Dialog del detalle tiene una etiqueta "Comentarios" única que no aparece en la tabla.
    expect(await screen.findByText('Comentarios')).toBeInTheDocument();
  });
});
