import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import theme from '../../theme/theme';
import BlogIndex from '../BlogIndex';
import type { PublicArticle } from '../../lib/api';

const article = (id: number, over: Partial<PublicArticle> = {}): PublicArticle => ({
  id,
  slug: over.slug ?? `articulo-${id}`,
  title: over.title ?? `Artículo ${id}`,
  excerpt: over.excerpt ?? `Resumen del artículo ${id}`,
  body_md: over.body_md ?? `# Cuerpo del artículo ${id}`,
  cover_url: over.cover_url ?? null,
  published_at: over.published_at ?? new Date(2026, 4, 1).toISOString(),
  created_at: over.created_at ?? new Date(2026, 4, 1).toISOString(),
  updated_at: over.updated_at ?? new Date(2026, 4, 1).toISOString(),
});

function mockListResponse(rows: PublicArticle[]) {
  return new Response(JSON.stringify({ rows }), { status: 200 }) as Response;
}

function renderBlogIndex() {
  return render(
    <MemoryRouter initialEntries={['/blog']}>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route path="/blog" element={<BlogIndex />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    mockListResponse([article(1, { title: 'Cómo escalar tu soporte' }), article(2, { title: 'Buenas prácticas con MaIA' })]),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BlogIndex', () => {
  it('renderiza el título "Blog" y el hero "Ideas y guías"', async () => {
    renderBlogIndex();
    expect(screen.getAllByText(/blog/i).length).toBeGreaterThan(0);
    expect(
      await screen.findByRole('heading', { level: 1, name: /ideas y guías de maia/i }),
    ).toBeInTheDocument();
  });

  it('lista las cards con datos mockeados', async () => {
    renderBlogIndex();
    expect(await screen.findByText('Cómo escalar tu soporte')).toBeInTheDocument();
    expect(screen.getByText('Buenas prácticas con MaIA')).toBeInTheDocument();
    // Verifica que llamó al endpoint público
    await waitFor(() => {
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.some(c => String(c[0]).includes('/api/articles'))).toBe(true);
    });
  });

  it('muestra estado vacío cuando rows: [] desde la API', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReset().mockResolvedValue(
      mockListResponse([]),
    );
    renderBlogIndex();
    // Esperar a que termine de cargar (puede mostrar spinner inicialmente).
    const spinners = document.querySelectorAll('[role="progressbar"]');
    if (spinners.length > 0) {
      await waitForElementToBeRemoved(spinners[0]);
    }
    expect(await screen.findByText(/aún no hay artículos publicados/i)).toBeInTheDocument();
  });
});
