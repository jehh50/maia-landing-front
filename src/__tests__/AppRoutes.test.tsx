import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import theme from '../theme/theme';
import AppRoutes from '../AppRoutes';
import type { AdminUser } from '../lib/api';

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

const user: AdminUser = { id: 1, email: 'ana@maia.ai', name: 'Ana', role: 'admin' };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status }) as Response;

/** Responde a cada endpoint que tocan las rutas bajo prueba. */
function mockBackend(session: AdminUser | null) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = String(input);
    if (url.includes('/api/auth/me')) {
      return session ? json({ user: session }) : json({ error: 'unauthorized' }, 401);
    }
    if (url.includes('/api/admin/leads')) return json({ rows: [], total: 0, limit: 25, offset: 0 });
    if (url.includes('/api/articles/')) {
      return json({
        article: {
          id: 7,
          slug: 'hola-mundo',
          title: 'Hola mundo',
          excerpt: 'Resumen',
          body_md: 'Contenido del artículo.',
          cover_url: null,
          published_at: new Date(2026, 4, 1).toISOString(),
          created_at: new Date(2026, 4, 1).toISOString(),
          updated_at: new Date(2026, 4, 1).toISOString(),
        },
      });
    }
    return json({ rows: [] });
  });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider theme={theme}>
        <AppRoutes />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

const loader = () => screen.queryByRole('status', { name: /cargando/i });

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', IOStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AppRoutes — carga perezosa de rutas', () => {
  it('una ruta perezosa muestra el fallback de Suspense en el primer render, no una pantalla en blanco', () => {
    mockBackend(null);
    renderAt('/admin/login');

    const placeholder = screen.getByRole('status', { name: /cargando/i });
    expect(placeholder).toBeInTheDocument();
    // Hay un indicador pintado, no un contenedor vacío.
    expect(within(placeholder).getByRole('progressbar')).toBeInTheDocument();
  });

  it('la landing "/" no es perezosa: renderiza su contenido sin pasar por el fallback', () => {
    mockBackend(null);
    renderAt('/');

    expect(loader()).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /crea agentes de ia/i })).toBeInTheDocument();
  });

  it('sustituye el fallback por la página real cuando el chunk llega', async () => {
    mockBackend(null);
    renderAt('/admin/login');

    expect(await screen.findByRole('heading', { level: 1, name: /acceso administradores/i })).toBeInTheDocument();
    expect(loader()).not.toBeInTheDocument();
  });

  it('"/blog/:slug" carga BlogArticle de forma perezosa y pide el artículo a la API', async () => {
    const fetchSpy = mockBackend(null);
    renderAt('/blog/hola-mundo');

    expect(await screen.findByRole('heading', { level: 1, name: /hola mundo/i })).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/api/articles/hola-mundo'))).toBe(true);
  });
});

describe('AppRoutes — admin perezoso tras la guardia', () => {
  it('AdminGuard y AdminLayout perezosos siguen inyectando el usuario por el Outlet', async () => {
    mockBackend(user);
    renderAt('/admin');

    // AdminHome lee el usuario con useOutletContext: si el context se perdiera
    // al meter Suspense entre el Outlet y la página, este saludo no existiría.
    expect(await screen.findByRole('heading', { level: 1, name: /bienvenido, ana/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /navegación admin/i })).toBeInTheDocument();
  });

  it('sin sesión, la guardia perezosa sigue redirigiendo a /admin/login', async () => {
    mockBackend(null);
    renderAt('/admin/leads');

    expect(await screen.findByRole('heading', { level: 1, name: /acceso administradores/i })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /navegación admin/i })).not.toBeInTheDocument();
  });

  it('navegar entre páginas del admin no desmonta el sidebar: el límite de Suspense vive dentro del layout', async () => {
    mockBackend(user);
    renderAt('/admin');
    const nav = await screen.findByRole('navigation', { name: /navegación admin/i });

    await userEvent.click(within(nav).getByRole('link', { name: 'Leads' }));

    expect(screen.getByRole('navigation', { name: /navegación admin/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /leads/i })).toBeInTheDocument();
    // El fallback de la página anidada nunca sustituye al layout completo.
    expect(screen.getByRole('navigation', { name: /navegación admin/i })).toBeInTheDocument();
  });

  it('las secciones nuevas (Imágenes, Precios y Usuarios) montan bajo la guardia sin desmontar el sidebar', async () => {
    mockBackend(user);
    renderAt('/admin');
    const nav = await screen.findByRole('navigation', { name: /navegación admin/i });

    const secciones = [
      { label: 'Imágenes', heading: /imágenes/i },
      { label: 'Precios',  heading: /precios/i  },
      { label: 'Usuarios', heading: /usuarios/i },
    ] as const;

    for (const seccion of secciones) {
      await userEvent.click(within(nav).getByRole('link', { name: seccion.label }));

      // El chunk perezoso llega y pinta su título…
      expect(await screen.findByRole('heading', { name: seccion.heading })).toBeInTheDocument();
      // …sin que el sidebar se haya remontado: `nav` sigue siendo el mismo nodo.
      expect(nav).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /navegación admin/i })).toBe(nav);
    }
  });
});
