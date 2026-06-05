import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import theme from '../../theme/theme';
import ArticlesList from '../articles/ArticlesList';
import type { AdminUser } from '../../lib/api';

const article = (id: number, status: 'draft' | 'published' = 'draft') => ({
  id, slug: `slug-${id}`, title: `Artículo ${id}`,
  excerpt: '', body_md: 'cuerpo', cover_url: null, status,
  author_id: null, published_at: null,
  created_at: new Date(2026, 4, 1).toISOString(),
  updated_at: new Date(2026, 4, 1).toISOString(),
});

// useOutletContext requiere un Outlet padre, así que envolvemos en una Route nested.
import { Outlet } from 'react-router-dom';
function WithUser({ user }: { user: AdminUser }) {
  return (
    <MemoryRouter initialEntries={['/admin/articles']}>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route element={<Outlet context={user} />}>
            <Route path="/admin/articles" element={<ArticlesList />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ rows: [article(1, 'draft'), article(2, 'published')] }), { status: 200 }) as Response,
  );
});

afterEach(() => vi.restoreAllMocks());

describe('ArticlesList', () => {
  const editor: AdminUser = { id: 1, email: 'editor@test', name: 'Editor', role: 'editor' };
  const admin:  AdminUser = { id: 2, email: 'admin@test',  name: 'Admin',  role: 'admin' };

  it('renderiza artículos con su badge de estado', async () => {
    render(<WithUser user={editor} />);
    expect(await screen.findByText('Artículo 1')).toBeInTheDocument();
    expect(screen.getByText('Artículo 2')).toBeInTheDocument();
    // status chips
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
  });

  it('no muestra botón borrar para role=editor', async () => {
    render(<WithUser user={editor} />);
    await screen.findByText('Artículo 1');
    expect(screen.queryAllByRole('button', { name: /borrar/i })).toHaveLength(0);
  });

  it('muestra botón borrar para role=admin', async () => {
    render(<WithUser user={admin} />);
    await screen.findByText('Artículo 1');
    const deleteButtons = screen.getAllByRole('button', { name: /borrar/i });
    expect(deleteButtons.length).toBe(2);  // uno por artículo
  });

  it('abrir confirmación + Cancelar deja el artículo intacto', async () => {
    const user = userEvent.setup();
    render(<WithUser user={admin} />);
    await screen.findByText('Artículo 1');
    await user.click(screen.getAllByRole('button', { name: /borrar artículo 1/i })[0]);
    expect(await screen.findByRole('button', { name: /^cancelar$/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^cancelar$/i })).not.toBeInTheDocument();
    });
  });
});
