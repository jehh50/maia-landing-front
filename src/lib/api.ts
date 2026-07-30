export type LeadType = 'demo' | 'email' | 'contacto';

export interface LeadPayload {
  nombre?: string;
  empresa?: string;
  email: string;
  telefono?: string;
  industria?: string;
  mensaje?: string;
  tipo?: LeadType;
}

export const PHONE_RE = /^\+\d{7,15}$/;

export interface LeadResponseOk {
  ok: true;
  id: number;
}

export interface LeadResponseError {
  error: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export async function postLead(payload: LeadPayload): Promise<{
  ok: boolean;
  status: number;
  data: LeadResponseOk | LeadResponseError | null;
}> {
  const res = await fetch(`${API_BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let data: LeadResponseOk | LeadResponseError | null = null;
  try { data = await res.json(); } catch { /* sin body */ }
  return { ok: res.ok, status: res.status, data };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- Auth admin (feature 14) ---

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | { error?: string } | null;
}

// --- Normalización de respuestas (feature 20) ---
// Los helpers de abajo devuelven { ok, status, data } y nunca lanzan, así que
// cada consumidor discrimina el éxito a mano con `ok && data && 'rows' in data`.
// `normalizeApi` hace esa discriminación una sola vez y devuelve una unión
// discriminada. Es aditivo: ningún helper existente cambia de forma, la
// migración de consumidores es incremental.

export interface ApiSuccess<T> {
  ok: true;
  status: number;
  data: T;
}

export interface ApiFailure {
  ok: false;
  status: number;   // 0 si la petición ni siquiera obtuvo respuesta (fallo de red)
  error: string;
}

export type ApiOutcome<T> = ApiSuccess<T> | ApiFailure;

export const GENERIC_API_ERROR = 'No pudimos completar la solicitud. Inténtalo de nuevo.';

function readErrorMessage(data: unknown): string | null {
  if (data && typeof data === 'object' && 'error' in data) {
    const { error } = data as { error?: unknown };
    if (typeof error === 'string' && error.trim()) return error;
  }
  return null;
}

/**
 * Normaliza el resultado de cualquier helper de este módulo a
 * `{ ok: true, status, data } | { ok: false, status, error }`.
 *
 * `key` es la clave que el payload de éxito debe contener (`'rows'`,
 * `'article'`, `'user'`…): es la misma comprobación que hoy hace cada
 * consumidor con `'rows' in data`, hecha una sola vez y con tipos.
 *
 * Casos:
 * - `2xx` con body que contiene `key` → `{ ok: true, data }`.
 * - `2xx` sin body (o sin `key`)     → `{ ok: false, error }`, igual que hoy.
 * - `4xx`/`5xx` con `{ error }`      → `{ ok: false, error }` con ese mensaje.
 * - `4xx`/`5xx` sin body             → `{ ok: false, error: fallbackError }`.
 * - Fallo de red (fetch rechaza)     → `{ ok: false, status: 0, error: fallbackError }`.
 *
 * Nunca lanza (ver `docs/context.md` §3).
 */
export async function normalizeApi<T extends object, K extends keyof T & string>(
  call: Promise<ApiResult<T>>,
  key: K,
  fallbackError: string = GENERIC_API_ERROR,
): Promise<ApiOutcome<T>> {
  let result: ApiResult<T>;
  try {
    result = await call;
  } catch {
    return { ok: false, status: 0, error: fallbackError };
  }
  const { ok, status, data } = result;
  if (ok && data && typeof data === 'object' && key in data) {
    return { ok: true, status, data: data as T };
  }
  return { ok: false, status, error: readErrorMessage(data) ?? fallbackError };
}

async function apiJson<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  let data: T | { error?: string } | null = null;
  try { data = await res.json(); } catch { /* sin body */ }
  return { ok: res.ok, status: res.status, data };
}

export function login(email: string, password: string) {
  return apiJson<{ ok: true; user: AdminUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return apiJson<{ ok: true }>('/api/auth/logout', { method: 'POST' });
}

export function getMe() {
  return apiJson<{ user: AdminUser }>('/api/auth/me', { method: 'GET' });
}

// --- Admin: leads (feature 16) ---

export interface AdminLead {
  id: number;
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  pais: string;
  pais_iso: string;
  industria: string;
  mensaje: string;
  tipo: LeadType;
  created_at: string;
}

export interface LeadsListResponse {
  rows: AdminLead[];
  total: number;
  limit: number;
  offset: number;
}

export interface LeadsListFilters {
  q?: string;
  tipo?: string;
  pais_iso?: string;
  limit?: number;
  offset?: number;
}

export function listAdminLeads(filters: LeadsListFilters = {}) {
  const qs = new URLSearchParams();
  if (filters.q)        qs.set('q',        filters.q);
  if (filters.tipo)     qs.set('tipo',     filters.tipo);
  if (filters.pais_iso) qs.set('pais_iso', filters.pais_iso);
  if (filters.limit  != null) qs.set('limit',  String(filters.limit));
  if (filters.offset != null) qs.set('offset', String(filters.offset));
  const query = qs.toString();
  return apiJson<LeadsListResponse>(`/api/admin/leads${query ? `?${query}` : ''}`, { method: 'GET' });
}

export function getAdminLead(id: number | string) {
  return apiJson<{ lead: AdminLead }>(`/api/admin/leads/${id}`, { method: 'GET' });
}

// --- Admin: articles (feature 13) ---

export type ArticleStatus = 'draft' | 'published';

export interface AdminArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_url: string | null;
  status: ArticleStatus;
  author_id: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleInput {
  slug?: string;
  title: string;
  excerpt?: string;
  body_md: string;
  cover_url?: string;
  status?: ArticleStatus;
}

export function listAdminArticles() {
  return apiJson<{ rows: AdminArticle[] }>('/api/admin/articles', { method: 'GET' });
}

export function getAdminArticle(id: number | string) {
  return apiJson<{ article: AdminArticle }>(`/api/admin/articles/${id}`, { method: 'GET' });
}

export function createAdminArticle(payload: ArticleInput) {
  return apiJson<{ article: AdminArticle }>('/api/admin/articles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminArticle(id: number | string, patch: Partial<ArticleInput>) {
  return apiJson<{ article: AdminArticle }>(`/api/admin/articles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteAdminArticle(id: number | string) {
  return apiJson<{ ok: true }>(`/api/admin/articles/${id}`, { method: 'DELETE' });
}

// --- Blog público (feature 7) ---
// Subset del Article expuesto en endpoints públicos (status='published').
// Reutiliza el shape de AdminArticle.

export type PublicArticle = Pick<AdminArticle,
  'id' | 'slug' | 'title' | 'excerpt' | 'body_md' | 'cover_url' |
  'published_at' | 'created_at' | 'updated_at'
>;

interface PublicApiResult<T> {
  ok: boolean;
  status: number;
  data: T | { error?: string } | null;
}

// Igual que apiJson pero sin enviar cookie (endpoints abiertos al público).
async function publicJson<T>(path: string, init: RequestInit = {}): Promise<PublicApiResult<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  let data: T | { error?: string } | null = null;
  try { data = await res.json(); } catch { /* sin body */ }
  return { ok: res.ok, status: res.status, data };
}

export interface PublicArticlesQuery {
  limit?: number;
  offset?: number;
}

export function listPublicArticles(opts: PublicArticlesQuery = {}) {
  const qs = new URLSearchParams();
  if (opts.limit  != null) qs.set('limit',  String(opts.limit));
  if (opts.offset != null) qs.set('offset', String(opts.offset));
  const query = qs.toString();
  return publicJson<{ rows: PublicArticle[] }>(
    `/api/articles${query ? `?${query}` : ''}`,
    { method: 'GET' },
  );
}

export function getPublicArticleBySlug(slug: string) {
  return publicJson<{ article: PublicArticle }>(
    `/api/articles/${encodeURIComponent(slug)}`,
    { method: 'GET' },
  );
}
