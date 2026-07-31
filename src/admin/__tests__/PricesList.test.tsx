import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import theme from '../../theme/theme';
import PricesList from '../prices/PricesList';
import { listMockPlanes, resetMockPlanes } from '../prices/mockPrices';
import type { AdminUser } from '../../lib/api';

// Las tres rutas de escritura de precios exigen rol admin; el editor solo lee.
const adminUser: AdminUser = { id: 1, email: 'ana.torres@maia.mx', name: 'Ana Torres', role: 'admin' };
const editorUser: AdminUser = { id: 2, email: 'bruno.diaz@maia.mx', name: 'Bruno Díaz', role: 'editor' };

// useOutletContext exige un Outlet padre, así que montamos una Route anidada.
function renderPrices(user: AdminUser = adminUser) {
  return render(
    <MemoryRouter initialEntries={['/admin/prices']}>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route element={<Outlet context={user} />}>
            <Route path="/admin/prices" element={<PricesList />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

/** Texto exacto de una celda de cifras. `toHaveTextContent` haría match parcial: «$14» en «$140». */
function celda(id: string): string {
  return screen.getByTestId(id).textContent ?? '';
}

/** Abre el diálogo de edición de un plan y espera a que esté montado. */
async function abrirEdicion(user: ReturnType<typeof userEvent.setup>, nombre: string) {
  await user.click(screen.getByRole('button', { name: `Editar ${nombre}` }));
  return screen.findByRole('dialog');
}

/** Reemplaza el contenido de un campo por `valor`. */
async function escribir(user: ReturnType<typeof userEvent.setup>, etiqueta: string, valor: string) {
  const campo = screen.getByLabelText(etiqueta);
  await user.clear(campo);
  if (valor) await user.type(campo, valor);
}

beforeEach(() => {
  resetMockPlanes();
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }) as Response);
});

afterEach(() => vi.restoreAllMocks());

describe('PricesList (maqueta con datos mock)', () => {
  it('pinta los cuatro planes con orden, nombre, mensual, descuento, derivados, trial y destacado, sin tocar el backend', async () => {
    renderPrices();

    expect(await screen.findByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^plan-row-/)).toHaveLength(4);

    // Starter: 19 al 10 % → anual round(17.1) = 17 y ahorro (19 − 17) × 12 = 24.
    const starter = screen.getByTestId('plan-row-1');
    expect(within(starter).getAllByRole('cell')[0].textContent).toBe('0');
    expect(celda('plan-1-mensual')).toBe('$19');
    expect(celda('plan-1-descuento')).toBe('10%');
    expect(celda('plan-1-anual')).toBe('$17');
    expect(celda('plan-1-ahorro')).toBe('$24');
    expect(within(starter).getByText('14 días de prueba gratis')).toBeInTheDocument();

    // Team: 199 al 10 % → round(179.1) = 179 y (199 − 179) × 12 = 240. Es el destacado.
    const team = screen.getByTestId('plan-row-2');
    expect(celda('plan-2-mensual')).toBe('$199');
    expect(celda('plan-2-anual')).toBe('$179');
    expect(celda('plan-2-ahorro')).toBe('$240');
    expect(within(team).getByText('Destacado')).toBeInTheDocument();
    // Sin `trial_texto` no se inventa copy: la celda queda con el guion.
    expect(within(team).getAllByRole('cell')[6].textContent).toBe('—');

    // Growth: 599 al 10 % → round(539.1) = 539 y (599 − 539) × 12 = 720.
    expect(celda('plan-3-mensual')).toBe('$599');
    expect(celda('plan-3-anual')).toBe('$539');
    expect(celda('plan-3-ahorro')).toBe('$720');
    expect(screen.queryByText('Destacado')).toBe(within(team).getByText('Destacado'));

    // Las viñetas incluidas y las tachadas se pintan las dos, distinguidas por el tachado.
    const vinetasStarter = screen.getByTestId('plan-1-vinetas');
    expect(within(vinetasStarter).getByText('1 agente activo')).toBeInTheDocument();
    expect(within(vinetasStarter).getByText('Workflows avanzados')).toHaveStyle('text-decoration: line-through');
    expect(within(vinetasStarter).getByText('1 agente activo')).not.toHaveStyle('text-decoration: line-through');

    // Es una maqueta: no debe salir ninguna petición.
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('no ofrece precio_anual ni ahorro_anual como campos editables: solo los muestra calculados', async () => {
    const user = userEvent.setup();
    renderPrices();
    await screen.findByText('Starter');

    await abrirEdicion(user, 'Starter');

    // El formulario admite exactamente los campos que el PATCH acepta.
    const campos = screen.getAllByRole('textbox').map(c => c.getAttribute('aria-label'));
    expect(campos.sort()).toEqual([
      'Descuento anual', 'Nombre', 'Orden', 'Precio mensual',
      'Texto de la prueba gratis', 'Viñetas incluidas', 'Viñetas tachadas',
    ]);
    expect(screen.queryByLabelText('Precio anual')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ahorro anual')).not.toBeInTheDocument();

    // Los derivados se pintan, pero no dentro de ningún control editable.
    const derivados = screen.getByTestId('derivados');
    expect(within(derivados).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(derivados).queryAllByRole('spinbutton')).toHaveLength(0);
    expect(screen.getByTestId('derivado-precio-anual').textContent).toBe('$17');
    expect(screen.getByTestId('derivado-ahorro-anual').textContent).toBe('$24');
    expect(within(derivados).getByText(/no se editan ni se guardan/i)).toBeInTheDocument();
  });

  it('recalcula los derivados al cambiar el precio mensual, con el redondeo del backend', async () => {
    const user = userEvent.setup();
    renderPrices();
    await screen.findByText('Starter');

    await abrirEdicion(user, 'Starter');

    // 25 al 10 % → 22.5, que el backend redondea a 23 (no 22, ni «$22.5»).
    await escribir(user, 'Precio mensual', '25');
    await waitFor(() => {
      expect(screen.getByTestId('derivado-precio-anual').textContent).toBe('$23');
    });
    expect(screen.getByTestId('derivado-ahorro-anual').textContent).toBe('$24'); // (25 − 23) × 12

    // 100 al 10 % → 90 y (100 − 90) × 12 = 120.
    await escribir(user, 'Precio mensual', '100');
    await waitFor(() => {
      expect(screen.getByTestId('derivado-precio-anual').textContent).toBe('$90');
    });
    expect(screen.getByTestId('derivado-ahorro-anual').textContent).toBe('$120');

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    // El listado repinta las cifras recalculadas, no las que traía el seed.
    await waitFor(() => {
      expect(celda('plan-1-mensual')).toBe('$100');
    });
    expect(celda('plan-1-anual')).toBe('$90');
    expect(celda('plan-1-ahorro')).toBe('$120');
  });

  it('recalcula los derivados al cambiar el descuento, que es propio de cada plan y no global', async () => {
    const user = userEvent.setup();
    renderPrices();
    await screen.findByText('Starter');

    await abrirEdicion(user, 'Starter');

    // 19 al 25 % → round(14.25) = 14 y (19 − 14) × 12 = 60.
    await escribir(user, 'Descuento anual', '25');
    await waitFor(() => {
      expect(screen.getByTestId('derivado-precio-anual').textContent).toBe('$14');
    });
    expect(screen.getByTestId('derivado-ahorro-anual').textContent).toBe('$60');

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(celda('plan-1-descuento')).toBe('25%');
    });
    expect(celda('plan-1-anual')).toBe('$14');
    expect(celda('plan-1-ahorro')).toBe('$60');

    // El descuento es POR PLAN: los demás conservan el suyo y sus derivados.
    expect(celda('plan-2-descuento')).toBe('10%');
    expect(celda('plan-2-anual')).toBe('$179');
    expect(celda('plan-2-ahorro')).toBe('$240');
    expect(celda('plan-3-descuento')).toBe('10%');
    expect(celda('plan-3-anual')).toBe('$539');
  });

  it('un plan a convenir (es_custom) no muestra ninguna cifra, aunque el backend devuelva precio_mensual 0', async () => {
    renderPrices();
    await screen.findByText('Enterprise');

    // La discrepancia del contrato (§10.4): solo los dos derivados llegan en `null`,
    // `precio_mensual` llega como 0. Fiarse del nulo pintaría «$0».
    const res = await listMockPlanes();
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('el mock debe listar');
    const enterprise = res.data.rows.find(p => p.nombre === 'Enterprise');
    expect(enterprise).toBeDefined();
    expect(enterprise?.es_custom).toBe(true);
    expect(enterprise?.precio_mensual).toBe(0);
    expect(enterprise?.descuento_pct).toBe(0);
    expect(enterprise?.precio_anual).toBeNull();
    expect(enterprise?.ahorro_anual).toBeNull();

    // Aun así, las cuatro celdas de cifras quedan con el guion.
    expect(celda('plan-4-mensual')).toBe('—');
    expect(celda('plan-4-descuento')).toBe('—');
    expect(celda('plan-4-anual')).toBe('—');
    expect(celda('plan-4-ahorro')).toBe('—');

    // Ni «$0» ni «0%» en ninguna parte de la fila.
    const fila = screen.getByTestId('plan-row-4');
    expect(fila.textContent).not.toContain('$');
    expect(fila.textContent).not.toContain('%');
    expect(within(fila).getByText('A convenir')).toBeInTheDocument();
  });

  it('el diálogo de un plan a convenir no calcula cifras ni deja editar precio ni descuento', async () => {
    const user = userEvent.setup();
    renderPrices();
    await screen.findByText('Enterprise');

    await abrirEdicion(user, 'Enterprise');

    expect(screen.getByLabelText('Precio mensual')).toBeDisabled();
    expect(screen.getByLabelText('Descuento anual')).toBeDisabled();
    expect(screen.getByTestId('derivados').textContent).toContain('Sin cifras');
    expect(screen.queryByTestId('derivado-precio-anual')).not.toBeInTheDocument();
    expect(screen.queryByTestId('derivado-ahorro-anual')).not.toBeInTheDocument();
  });

  it('editar las viñetas incluidas y las tachadas actualiza la vista', async () => {
    const user = userEvent.setup();
    renderPrices();
    await screen.findByText('Team');

    const antes = screen.getByTestId('plan-2-vinetas');
    expect(within(antes).getByText('1,000 créditos/mes')).toBeInTheDocument();

    await abrirEdicion(user, 'Team');
    // Una viñeta por línea; la línea vacía del final se descarta.
    await escribir(user, 'Viñetas incluidas', '3 agentes activos\n2,000 créditos/mes\n');
    await escribir(user, 'Viñetas tachadas', 'Llamadas en tiempo real');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(screen.queryByText('1,000 créditos/mes')).not.toBeInTheDocument();
    });
    const celdaVinetas = screen.getByTestId('plan-2-vinetas');
    expect(within(celdaVinetas).getByText('3 agentes activos')).toBeInTheDocument();
    expect(within(celdaVinetas).getByText('2,000 créditos/mes')).toBeInTheDocument();
    expect(within(celdaVinetas).getAllByRole('listitem')).toHaveLength(3);

    // La tachada se distingue de las incluidas, no se pinta como una más.
    const tachada = within(celdaVinetas).getByText('Llamadas en tiempo real');
    expect(tachada).toHaveStyle('text-decoration: line-through');
    expect(within(celdaVinetas).getByText('3 agentes activos')).not.toHaveStyle('text-decoration: line-through');
  });

  it('el mock reproduce los 14 campos reales del contrato y el id como string', async () => {
    const res = await listMockPlanes();
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('el mock debe listar');

    const [primero] = res.data.rows;
    expect(Object.keys(primero).sort()).toEqual([
      'ahorro_anual', 'created_at', 'descuento_pct', 'destacado', 'es_custom',
      'id', 'nombre', 'orden', 'precio_anual', 'precio_mensual', 'trial_texto',
      'updated_at', 'vinetas', 'vinetas_tachadas',
    ]);
    // El backend devuelve el BIGSERIAL sin castear.
    expect(typeof primero.id).toBe('string');
    expect(primero.id).toBe('1');
    // Orden `orden ASC`: el listado no depende del orden del almacén.
    expect(res.data.rows.map(p => p.orden)).toEqual([0, 1, 2, 3]);
  });

  it('un editor consulta los planes pero no puede editarlos, reservado al rol admin', async () => {
    renderPrices(editorUser);
    await screen.findByText('Starter');

    expect(screen.queryByRole('button', { name: 'Editar Starter' })).not.toBeInTheDocument();
    expect(screen.getByText(/reservado al rol administrador/i)).toBeInTheDocument();
    // Sigue viendo las cifras derivadas.
    expect(celda('plan-1-anual')).toBe('$17');
  });
});
