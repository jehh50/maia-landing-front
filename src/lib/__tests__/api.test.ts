import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  normalizeApi,
  GENERIC_API_ERROR,
  createAdminArticle,
  listAdminLeads,
  listPublicArticles,
  type AdminLead,
} from '../api';

afterEach(() => vi.restoreAllMocks());

function mockFetch(response: Response | Error) {
  return response instanceof Error
    ? vi.spyOn(globalThis, 'fetch').mockRejectedValue(response)
    : vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
}

const lead = (id: number): AdminLead => ({
  id,
  nombre: `Lead ${id}`,
  empresa: 'Acme',
  email: `lead${id}@test.com`,
  telefono: '+584242848748',
  pais: 'México',
  pais_iso: 'MX',
  industria: 'Tecnología / SaaS',
  mensaje: 'msg',
  tipo: 'demo',
  created_at: new Date(2026, 4, 1).toISOString(),
});

describe('normalizeApi', () => {
  it('200 con body: devuelve { ok: true, data } con el payload tipado', async () => {
    mockFetch(new Response(
      JSON.stringify({ rows: [lead(1)], total: 1, limit: 25, offset: 0 }),
      { status: 200 },
    ));

    const res = await normalizeApi(listAdminLeads({ limit: 25 }), 'rows');

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('esperaba éxito');
    expect(res.status).toBe(200);
    expect(res.data.rows).toHaveLength(1);
    expect(res.data.total).toBe(1);
  });

  it('200 sin body: devuelve { ok: false, error } con el mensaje por defecto', async () => {
    mockFetch(new Response(null, { status: 200 }));

    const res = await normalizeApi(listAdminLeads(), 'rows');

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('esperaba fallo');
    expect(res.status).toBe(200);
    expect(res.error).toBe(GENERIC_API_ERROR);
  });

  it('200 con body que no trae la clave esperada: se trata como fallo', async () => {
    mockFetch(new Response(JSON.stringify({}), { status: 200 }));

    const res = await normalizeApi(listAdminLeads(), 'rows');

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('esperaba fallo');
    expect(res.error).toBe(GENERIC_API_ERROR);
  });

  it('4xx con { error }: propaga el mensaje del backend', async () => {
    mockFetch(new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 }));

    const res = await normalizeApi(
      listAdminLeads(),
      'rows',
      'No pudimos cargar los leads',
    );

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('esperaba fallo');
    expect(res.status).toBe(401);
    expect(res.error).toBe('No autorizado');
  });

  it('5xx sin body: usa el mensaje de fallback recibido', async () => {
    mockFetch(new Response(null, { status: 500 }));

    const res = await normalizeApi(
      listPublicArticles({ limit: 50 }),
      'rows',
      'No se pudieron cargar los artículos',
    );

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('esperaba fallo');
    expect(res.status).toBe(500);
    expect(res.error).toBe('No se pudieron cargar los artículos');
  });

  it('no lanza si falla la red: devuelve { ok: false, status: 0 }', async () => {
    mockFetch(new TypeError('Failed to fetch'));

    const res = await normalizeApi(
      listPublicArticles(),
      'rows',
      'Sin conexión',
    );

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('esperaba fallo');
    expect(res.status).toBe(0);
    expect(res.error).toBe('Sin conexión');
  });

  it('no cambia el contrato HTTP de los helpers existentes', async () => {
    const fetchSpy = mockFetch(new Response(
      JSON.stringify({ rows: [], total: 0, limit: 25, offset: 0 }),
      { status: 200 },
    ));

    // Forma antigua intacta para los consumidores no migrados.
    const raw = await listAdminLeads({ q: 'ana' });
    expect(raw).toEqual({ ok: true, status: 200, data: { rows: [], total: 0, limit: 25, offset: 0 } });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe('/api/admin/leads?q=ana');
    expect(init).toMatchObject({ method: 'GET', credentials: 'include' });
  });
});

// El backend acompaña sus 422 (y algún 409) con el campo culpable:
// `{ error, field }`. Ver docs/api-contract.md §1 y §10.
describe('normalizeApi — field de los errores de validación', () => {
  const article = { title: 'Sin cuerpo', body_md: '' };

  it('422 con field: lo propaga junto al mensaje del backend', async () => {
    mockFetch(new Response(
      JSON.stringify({ error: 'El cuerpo es obligatorio', field: 'body_md' }),
      { status: 422 },
    ));

    const res = await normalizeApi(createAdminArticle(article), 'article');

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('esperaba fallo');
    expect(res.status).toBe(422);
    expect(res.error).toBe('El cuerpo es obligatorio');
    expect(res.field).toBe('body_md');
  });

  it('422 sin field: conserva exactamente la forma { ok, status, error }', async () => {
    mockFetch(new Response(
      JSON.stringify({ error: 'Nada que actualizar' }),
      { status: 422 },
    ));

    const res = await normalizeApi(createAdminArticle(article), 'article');

    expect(res).toEqual({ ok: false, status: 422, error: 'Nada que actualizar' });
    expect('field' in res).toBe(false);
  });

  it('422 con un field que no es string: se ignora', async () => {
    mockFetch(new Response(
      JSON.stringify({ error: 'Orden inválido', field: 7 }),
      { status: 422 },
    ));

    const res = await normalizeApi(createAdminArticle(article), 'article');

    expect(res).toEqual({ ok: false, status: 422, error: 'Orden inválido' });
    expect('field' in res).toBe(false);
  });

  it('422 con un field vacío: se ignora', async () => {
    mockFetch(new Response(
      JSON.stringify({ error: 'Validación fallida', field: '   ' }),
      { status: 422 },
    ));

    const res = await normalizeApi(createAdminArticle(article), 'article');

    expect(res).toEqual({ ok: false, status: 422, error: 'Validación fallida' });
    expect('field' in res).toBe(false);
  });

  it('500 sin body: sigue sin field', async () => {
    mockFetch(new Response(null, { status: 500 }));

    const res = await normalizeApi(createAdminArticle(article), 'article', 'Error del servidor');

    expect(res).toEqual({ ok: false, status: 500, error: 'Error del servidor' });
    expect('field' in res).toBe(false);
  });

  it('fallo de red: sigue sin field', async () => {
    mockFetch(new TypeError('Failed to fetch'));

    const res = await normalizeApi(createAdminArticle(article), 'article', 'Sin conexión');

    expect(res).toEqual({ ok: false, status: 0, error: 'Sin conexión' });
    expect('field' in res).toBe(false);
  });
});
