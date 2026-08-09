import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, afterEach, vi } from 'vitest';
import theme from '../../theme/theme';
import AdminLayout from '../AdminLayout';
import type { AdminUser } from '../../lib/api';

const user: AdminUser = { id: 1, email: 'ana@maia.ai', name: 'Ana', role: 'admin' };

// AdminLayout renderiza un <Outlet />, así que necesita rutas hijas reales.
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route path="/admin" element={<AdminLayout user={user} />}>
            <Route index element={<div>contenido inicio</div>} />
            <Route path="leads" element={<div>contenido leads</div>} />
            <Route path="articles" element={<div>contenido blog</div>} />
          </Route>
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

const nav = () => screen.getByRole('navigation', { name: /navegación admin/i });

afterEach(() => vi.restoreAllMocks());

describe('AdminLayout — navegación', () => {
  it('muestra las siete secciones como enlaces a su ruta, en orden', () => {
    renderAt('/admin');

    const links = within(nav()).getAllByRole('link');
    expect(links.map(l => l.textContent)).toEqual([
      'Inicio', 'Leads', 'Blog', 'Imágenes', 'Precios', 'Complementos', 'Usuarios',
    ]);
    expect(links[0]).toHaveAttribute('href', '/admin');
    expect(links[1]).toHaveAttribute('href', '/admin/leads');
    expect(links[2]).toHaveAttribute('href', '/admin/articles');
    expect(links[3]).toHaveAttribute('href', '/admin/images');
    expect(links[4]).toHaveAttribute('href', '/admin/prices');
    expect(links[5]).toHaveAttribute('href', '/admin/complementos');
    expect(links[6]).toHaveAttribute('href', '/admin/users');
  });

  it('marca como activo solo el ítem de la ruta actual', () => {
    renderAt('/admin/leads');

    expect(within(nav()).getByRole('link', { name: 'Leads' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav()).getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
    expect(within(nav()).getByRole('link', { name: 'Blog' })).not.toHaveAttribute('aria-current');
  });

  it('no renderiza ningún ítem deshabilitado de tipo "próximamente"', () => {
    renderAt('/admin');

    expect(within(nav()).queryByText(/próximamente/i)).not.toBeInTheDocument();
    expect(nav().querySelector('[aria-disabled="true"]')).toBeNull();
  });
});
