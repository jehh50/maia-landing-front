import { render, screen, within, waitForElementToBeRemoved } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import theme from '../../theme/theme';
import AppRoutes from '../../AppRoutes';

// El Hero de la landing usa IntersectionObserver y el efecto Vanta; jsdom no
// implementa ninguno de los dos, así que se sustituyen para poder montar '/'.
class IOStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

vi.mock('vanta/dist/vanta.net.min', () => ({
  default: () => ({ destroy: () => {} }),
}));

const fallback = () => screen.queryByRole('status', { name: /cargando/i });

// Desde la feature 22 las rutas del admin y del blog son `React.lazy`, así que
// suspenden en el primer render. El wrapper espera a que el fallback de
// <Suspense> desaparezca; las aserciones de cada test no cambian.
async function renderAt(path: string) {
  const utils = render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider theme={theme}>
        <AppRoutes />
      </ThemeProvider>
    </MemoryRouter>,
  );
  if (fallback()) await waitForElementToBeRemoved(fallback);
  return utils;
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', IOStub);
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ rows: [] }), { status: 200 }) as Response,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('NotFound', () => {
  it('muestra el contenido 404 en una ruta desconocida, no una pantalla vacía', async () => {
    const { container } = await renderAt('/ruta-que-no-existe');

    expect(screen.getByRole('heading', { level: 1, name: /página no encontrada/i })).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('ofrece un enlace de vuelta a la home', async () => {
    await renderAt('/ruta-que-no-existe');

    const back = screen.getByRole('link', { name: /volver al inicio/i });
    expect(back).toHaveAttribute('href', '/');
  });

  it('renderiza la Navbar y el Footer', async () => {
    await renderAt('/otra/ruta/inventada');

    // Navbar: AppBar con los enlaces de la landing y el CTA "Agenda un demo".
    const navbar = screen.getByRole('banner');
    expect(within(navbar).getByRole('link', { name: /cómo funciona/i })).toBeInTheDocument();
    expect(within(navbar).getByRole('button', { name: /agenda un demo/i })).toBeInTheDocument();
    // Footer.
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /política de privacidad/i })).toBeInTheDocument();
  });
});

describe('Rutas existentes', () => {
  it('la landing "/" sigue resolviendo a App y no al comodín', async () => {
    await renderAt('/');

    expect(screen.getByRole('heading', { level: 1, name: /crea agentes de ia/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /página no encontrada/i })).not.toBeInTheDocument();
  });

  it('"/blog" sigue resolviendo a BlogIndex y no al comodín', async () => {
    await renderAt('/blog');

    expect(await screen.findByRole('heading', { level: 1, name: /ideas y guías de maia/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /página no encontrada/i })).not.toBeInTheDocument();
  });

  it('"/privacidad" sigue resolviendo a LegalPage y no al comodín', async () => {
    await renderAt('/privacidad');

    expect(screen.getByRole('heading', { level: 1, name: /política de privacidad/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /página no encontrada/i })).not.toBeInTheDocument();
  });

  it('"/admin/login" sigue resolviendo a Login y no al comodín', async () => {
    await renderAt('/admin/login');

    expect(screen.getByRole('heading', { level: 1, name: /acceso administradores/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /página no encontrada/i })).not.toBeInTheDocument();
  });
});
