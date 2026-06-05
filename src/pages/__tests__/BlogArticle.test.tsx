import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, afterEach, vi } from 'vitest';
import theme from '../../theme/theme';
import BlogArticle from '../BlogArticle';
import type { PublicArticle } from '../../lib/api';

const article = (over: Partial<PublicArticle> = {}): PublicArticle => ({
  id: 1,
  slug: over.slug ?? 'mi-articulo',
  title: over.title ?? 'Mi gran artículo',
  excerpt: over.excerpt ?? 'Resumen',
  body_md: over.body_md ?? '## Subtitulo\n\nCuerpo del artículo con detalles.',
  cover_url: over.cover_url ?? null,
  published_at: over.published_at ?? new Date(2026, 4, 10).toISOString(),
  created_at: over.created_at ?? new Date(2026, 4, 10).toISOString(),
  updated_at: over.updated_at ?? new Date(2026, 4, 10).toISOString(),
});

function mockArticleResponse(a: PublicArticle) {
  return new Response(JSON.stringify({ article: a }), { status: 200 }) as Response;
}

function renderBlogArticleAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogArticle />} />
          <Route path="/blog" element={<div>BLOG INDEX PAGE</div>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BlogArticle', () => {
  it('renderiza el título y convierte un "## Subtitulo" en <h2>', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockArticleResponse(article({ title: 'Mi gran artículo', body_md: '## Subtitulo\n\nCuerpo...' })),
    );
    renderBlogArticleAt('/blog/mi-articulo');

    expect(
      await screen.findByRole('heading', { level: 1, name: /mi gran artículo/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: /subtitulo/i }),
    ).toBeInTheDocument();
  });

  it('muestra "Artículo no encontrado" cuando la API responde 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404 }) as Response,
    );
    renderBlogArticleAt('/blog/no-existe');

    expect(await screen.findByText(/artículo no encontrado/i)).toBeInTheDocument();
  });

  it('el botón "Volver al blog" apunta a /blog (link de router)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockArticleResponse(article()),
    );
    const user = userEvent.setup();
    renderBlogArticleAt('/blog/mi-articulo');

    const links = await screen.findAllByRole('link', { name: /volver al blog/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute('href')).toBe('/blog');

    // Click navega a /blog (RouterLink intercepta).
    await user.click(links[0]);
    await waitFor(() => {
      expect(screen.getByText('BLOG INDEX PAGE')).toBeInTheDocument();
    });
  });
});
