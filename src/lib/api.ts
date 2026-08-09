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
  /**
   * Campo culpable, tal cual lo nombra el backend en sus `422`/`409`
   * (`{ error, field }`). Solo está presente si el body lo trae como string no
   * vacío: un error sin `field` mantiene la forma `{ ok, status, error }` de
   * antes de la feature 31.
   */
  field?: string;
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

// El backend acompaña algunos errores de validación con el campo culpable
// (`{ error, field }`, ver docs/api-contract.md §10). Se lee con guardas sobre
// `unknown`: cualquier `field` ausente o que no sea un string no vacío se
// ignora, de modo que la forma del fallo no cambia para nadie.
function readErrorField(data: unknown): string | null {
  if (data && typeof data === 'object' && 'field' in data) {
    const { field } = data;
    if (typeof field === 'string' && field.trim()) return field;
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
 * - `4xx`/`5xx` con `{ error, field }` → además `field`, para marcar el campo
 *   culpable en el formulario (feature 31).
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
  const failure: ApiFailure = { ok: false, status, error: readErrorMessage(data) ?? fallbackError };
  const field = readErrorField(data);
  return field ? { ...failure, field } : failure;
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

// --- Admin: usuarios (feature 32) ---

/**
 * Fila de `users` tal como la expone el backend: exactamente las columnas de su
 * `PUBLIC_COLS` (`id, email, name, role, created_at`).
 *
 * `password_hash` **nunca** sale por la API y por eso no se modela aquí. El
 * resto de campos se derivan de `AdminUser` en vez de duplicarse.
 */
export interface AdminUserRow extends AdminUser {
  created_at: string;
}

/**
 * `GET /api/admin/users` responde `{ rows }` **sin paginación**: no hay `total`
 * ni `limit`/`offset`, ni acepta parámetros de query (docs/api-contract.md §4
 * bis). Sigue el patrón de artículos e imágenes, no el de leads.
 */
export interface UsersListResponse {
  rows: AdminUserRow[];
}

/** Campos escribibles de un usuario. `password` viaja en claro y solo de subida. */
export interface UserInput {
  email: string;
  name: string;
  role: AdminUser['role'];
  password?: string;
}

/** Alta: `password` es obligatorio. */
export type UserCreateInput = UserInput & { password: string };

/** Edición: todo opcional; omitir `password` conserva la actual. */
export type UserPatchInput = Partial<UserInput>;

/**
 * Mensaje presentable de un fallo de los endpoints privados de admin.
 *
 * `requireRole` del backend rompe la forma habitual del error: en un `403`
 * responde `{ ok: false, error: 'forbidden', message: '…' }`, así que el `error`
 * que llega a `normalizeApi` es el token `'forbidden'` y no un texto para el
 * usuario (docs/api-contract.md §10.1). Sin esto, un `editor` que abre Usuarios
 * lee literalmente «forbidden».
 */
export const FORBIDDEN_ERROR = 'No tienes permisos para gestionar esta sección.';

export function adminErrorMessage(res: ApiFailure): string {
  return res.status === 403 ? FORBIDDEN_ERROR : res.error;
}

export function listAdminUsers() {
  return apiJson<UsersListResponse>('/api/admin/users', { method: 'GET' });
}

export function getAdminUser(id: number | string) {
  return apiJson<{ user: AdminUserRow }>(`/api/admin/users/${id}`, { method: 'GET' });
}

export function createAdminUser(payload: UserCreateInput) {
  return apiJson<{ user: AdminUserRow }>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminUser(id: number | string, patch: UserPatchInput) {
  return apiJson<{ user: AdminUserRow }>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/**
 * `DELETE` responde **`204` sin cuerpo**, así que `apiJson` devuelve
 * `data: null` y `normalizeApi(..., 'ok')` lo leería como fallo. Se sintetiza
 * el `{ ok: true }` que el 204 no trae, y **solo cuando la respuesta fue 2xx**:
 * un error sin body sigue siendo un error (a diferencia del
 * `if (ok || data == null)` de `ArticlesList`, que sí los confunde).
 */
export async function deleteAdminUser(id: number | string): Promise<ApiResult<{ ok: true }>> {
  const res = await apiJson<{ ok: true }>(`/api/admin/users/${id}`, { method: 'DELETE' });
  return res.ok && res.data == null ? { ...res, data: { ok: true } } : res;
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

// --- Imágenes (feature 33) ---
// Contrato en docs/api-contract.md §4 ter. Es el único recurso con dos
// transportes: el LISTADO es público (`publicJson`, sin cookie) y las tres
// rutas de escritura son privadas y solo de rol `admin`. La subida no puede ir
// por `apiJson`: es `multipart/form-data` y el boundary lo pone el navegador.

/** Secciones de la landing que admiten imágenes. Enum de aplicación, no de BD. */
export const IMAGE_SECCIONES = ['hero', 'cta_final'] as const;

export type ImageSeccion = (typeof IMAGE_SECCIONES)[number];

/**
 * Fila de `images` tal como la expone la API: los 9 campos de su `META_COLS`.
 * El binario (`bytes`, `BYTEA`) **nunca** sale por la API y por eso no se modela.
 *
 * `id` es **string**: el backend devuelve el `BIGSERIAL` sin castear.
 */
export interface AdminImage {
  id: string;
  seccion: ImageSeccion;
  filename: string;
  mime_type: string;
  size_bytes: number;
  alt: string | null;
  orden: number;
  created_at: string;
  updated_at: string;
}

/** `GET /api/images` responde `{ rows }` **sin paginación**, con orden fijo `orden ASC, id ASC`. */
export interface ImagesListResponse {
  rows: AdminImage[];
}

/** Lo que viaja en el `FormData` del POST: un solo archivo en el campo `file`. */
export interface ImageUploadInput {
  file: File;
  seccion: ImageSeccion;
  alt?: string;
  orden?: number;
}

/** El `PATCH` solo admite estos tres campos: el binario es inmutable. */
export interface ImagePatchInput {
  alt?: string | null;
  orden?: number;
  seccion?: ImageSeccion;
}

/**
 * URL pública del binario de una imagen.
 *
 * **No hay CDN ni carpeta estática, y el JSON no trae ningún campo `url`**: la
 * URL pública *es* `${API_BASE}/api/images/${id}/raw` y se construye aquí, no en
 * los componentes, para que `VITE_API_BASE` se aplique en un solo sitio.
 */
export function imageRawUrl(id: string | number): string {
  return `${API_BASE}/api/images/${id}/raw`;
}

/** MIME permitidos por el backend. SVG está excluido a propósito (XSS almacenado). */
export const ACCEPTED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** Extensiones válidas por MIME: el backend exige que declaración y extensión coincidan. */
const IMAGE_EXTENSIONS_BY_MIME: Record<(typeof ACCEPTED_IMAGE_MIME_TYPES)[number], string[]> = {
  'image/png':  ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

/** 5 MB, el límite de multer en el backend. */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Longitud máxima del texto alternativo (`ALT_MAX` del backend). */
export const IMAGE_ALT_MAX = 300;

/** Mensaje del backend, reproducido literalmente para no divergir del copy. */
export const ORDEN_ERROR = 'orden debe ser un entero >= 0';

/** Tamaño legible a partir del `size_bytes` del contrato: «73 KB», «1.4 MB». */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${Number((kb / 1024).toFixed(1))} MB`;
}

function isAcceptedImageMime(mime: string): mime is (typeof ACCEPTED_IMAGE_MIME_TYPES)[number] {
  return (ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Validación de archivo **en cliente, antes de subir nada**: tipo, coherencia
 * con la extensión y tamaño. Anticipa los `415`/`413` del backend para no gastar
 * ancho de banda en una subida condenada — el archivo viaja entero antes de que
 * el handler llegue siquiera a mirar `seccion`.
 *
 * Devuelve la misma forma `{ error, field }` que un fallo del backend, así que
 * el formulario trata igual el rechazo local y el remoto. Lo que no se puede
 * comprobar aquí son los *magic bytes*: eso lo valida el servidor.
 */
export function validateImageFile(file: File | null): { error: string; field: 'file' } | null {
  if (!file) {
    return { error: 'Archivo requerido', field: 'file' };
  }
  if (!isAcceptedImageMime(file.type)) {
    return {
      error: `Tipo de archivo no permitido. Formatos aceptados: ${ACCEPTED_IMAGE_MIME_TYPES.join(', ')}`,
      field: 'file',
    };
  }
  const nombre = file.name.toLowerCase();
  if (!IMAGE_EXTENSIONS_BY_MIME[file.type].some(ext => nombre.endsWith(ext))) {
    return {
      error: `La extensión no corresponde a ${file.type}. Se esperaba ${IMAGE_EXTENSIONS_BY_MIME[file.type].join(' o ')}`,
      field: 'file',
    };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      error: `El archivo excede el tamaño máximo permitido (${formatFileSize(MAX_IMAGE_SIZE_BYTES)})`,
      field: 'file',
    };
  }
  return null;
}

/** `''` = campo ausente → `0`. Cualquier cosa que no sea un entero ≥ 0 devuelve `null`. */
export function parseOrden(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

/**
 * Listado de imágenes. Es el endpoint **público**, no hay uno bajo `/api/admin/`:
 * lo consume tanto el panel como la landing. Sin paginación y sin cookie.
 */
export function listImages(filtros: { seccion?: ImageSeccion } = {}) {
  const qs = new URLSearchParams();
  if (filtros.seccion) qs.set('seccion', filtros.seccion);
  const query = qs.toString();
  return publicJson<ImagesListResponse>(`/api/images${query ? `?${query}` : ''}`, { method: 'GET' });
}

/**
 * Subida de archivos: igual que `apiJson` (mismo `credentials: 'include'`, misma
 * forma `{ ok, status, data }`, tampoco lanza) pero **sin fijar `Content-Type`**.
 *
 * Es la razón de que exista: con un `FormData`, el navegador escribe
 * `multipart/form-data; boundary=…` con un boundary que solo él conoce. Fijar la
 * cabecera a mano —lo que hace `apiJson`— deja al backend sin boundary y multer
 * no puede parsear el body. Por eso tampoco se acepta `headers` desde fuera.
 */
async function apiUpload<T>(path: string, body: FormData): Promise<ApiResult<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body,
  });
  let data: T | { error?: string } | null = null;
  try { data = await res.json(); } catch { /* sin body */ }
  return { ok: res.ok, status: res.status, data };
}

/**
 * `POST /api/admin/images` — `multipart/form-data` con **un solo archivo** en el
 * campo `file`. `alt` y `orden` son opcionales: se omiten en vez de mandarse
 * vacíos, que es lo que el backend espera para aplicar sus valores por defecto.
 */
export function createAdminImage(input: ImageUploadInput) {
  const body = new FormData();
  body.append('file', input.file);
  body.append('seccion', input.seccion);
  if (input.alt) body.append('alt', input.alt);
  if (input.orden != null) body.append('orden', String(input.orden));
  return apiUpload<{ image: AdminImage }>('/api/admin/images', body);
}

/** `PATCH` es JSON y solo admite `alt`, `orden` y `seccion` (§4 ter). */
export function updateAdminImage(id: string | number, patch: ImagePatchInput) {
  return apiJson<{ image: AdminImage }>(`/api/admin/images/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/**
 * `DELETE` responde `204` sin cuerpo: mismo molde que `deleteAdminUser`. Se
 * sintetiza el `{ ok: true }` que el 204 no trae y **solo si la respuesta fue
 * 2xx**, para que un error sin body siga siendo un error.
 */
export async function deleteAdminImage(id: string | number): Promise<ApiResult<{ ok: true }>> {
  const res = await apiJson<{ ok: true }>(`/api/admin/images/${id}`, { method: 'DELETE' });
  return res.ok && res.data == null ? { ...res, data: { ok: true } } : res;
}

// --- Precios (feature 34) ---
// Contrato en docs/api-contract.md §4 quater. Segundo recurso con dos
// transportes, y con una asimetría propia: **no existe `GET /api/admin/precios`**
// (el servidor responde 404, no 401), así que el LISTADO del panel sale del
// endpoint público `GET /api/precios`. Solo el detalle y las tres escrituras
// viven bajo `/api/admin/precios[/:id]`.

/**
 * Objeto `plan` tal como lo devuelve la API: los 14 campos de su `toPlan()`.
 *
 * `id` es **string**: el backend devuelve el `BIGSERIAL` sin castear, y un plan
 * con id por encima de `Number.MAX_SAFE_INTEGER` se corrompería al convertirlo.
 *
 * Ojo con los dos pares de campos:
 *
 * - `precio_anual` y `ahorro_anual` son **derivados**: el backend los calcula en
 *   cada respuesta y **no se pueden escribir** (por eso `PlanInput` los omite).
 * - `precio_mensual` y `descuento_pct` llegan como **`0`** en un plan Custom, no
 *   como `null`: la columna guarda `NULL` pero `toNumber()` lo convierte en `0`.
 *   **Un plan a convenir se reconoce por `es_custom`, nunca por un nulo**, o se
 *   acaba pintando «$0» (discrepancia verificada, §4 quater).
 */
export interface AdminPlan {
  id: string;
  nombre: string;
  precio_mensual: number;
  descuento_pct: number;
  /** Derivado de solo lectura. `null` si `es_custom`. */
  precio_anual: number | null;
  /** Derivado de solo lectura. `null` si `es_custom`. */
  ahorro_anual: number | null;
  vinetas: string[];
  vinetas_tachadas: string[];
  destacado: boolean;
  trial_texto: string | null;
  es_custom: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

/** `GET /api/precios` responde `{ rows }` **sin paginación**, con orden fijo `orden ASC, id ASC`. */
export interface PlanesListResponse {
  rows: AdminPlan[];
}

/**
 * Campos escribibles de un plan: exactamente los `CAMPOS_EDITABLES` del backend.
 *
 * Se **deriva** de `AdminPlan` quitando los de auditoría y, sobre todo, los dos
 * derivados: así «no enviar nunca `precio_anual` ni `ahorro_anual`» deja de ser
 * una disciplina del consumidor y pasa a ser un error de compilación.
 *
 * `precio_mensual` y `descuento_pct` son **opcionales y nunca `null`**: el
 * backend los valida con `parseDecimal`, que rechaza `null` con un
 * `422 { error: 'precio_mensual debe ser un número', field: 'precio_mensual' }`.
 * En un plan a convenir **se omiten**, y entonces el `POST` aplica su default
 * (`0`) y el `PATCH` conserva el valor guardado.
 */
export type PlanInput =
  & Omit<AdminPlan, 'id' | 'created_at' | 'updated_at' | 'precio_anual' | 'ahorro_anual' | 'precio_mensual' | 'descuento_pct'>
  & Partial<Pick<AdminPlan, 'precio_mensual' | 'descuento_pct'>>;

/** Edición: todo opcional. Un `PATCH` sin ningún campo editable responde `422`. */
export type PlanPatchInput = Partial<PlanInput>;

/**
 * Aritmética exacta del backend (`src/precios.js:64-71`), para la vista previa
 * del formulario: la lista pinta los derivados que ya vienen en la respuesta.
 *
 * `precio_anual` es el **precio mensual facturando anualmente**, no el total del
 * año: `19` al 10 % da `17`, y de ahí el «Ahorras $24/año» de la landing. El
 * `Math.round()` es decisión deliberada del backend.
 */
export function calcularPrecioAnual(precioMensual: number, descuentoPct: number): number {
  return Math.round(precioMensual * (1 - descuentoPct / 100));
}

export function calcularAhorroAnual(precioMensual: number, precioAnual: number): number {
  return Math.round((precioMensual - precioAnual) * 12);
}

/** Los dos derivados a la vez, con la regla de `es_custom` incluida. */
export function derivarPrecios(
  plan: { precio_mensual: number; descuento_pct: number; es_custom: boolean },
): Pick<AdminPlan, 'precio_anual' | 'ahorro_anual'> {
  if (plan.es_custom) return { precio_anual: null, ahorro_anual: null };
  const precioAnual = calcularPrecioAnual(plan.precio_mensual, plan.descuento_pct);
  return { precio_anual: precioAnual, ahorro_anual: calcularAhorroAnual(plan.precio_mensual, precioAnual) };
}

/** Importe de la UI a partir de un `NUMERIC` del contrato: «$19», «$1,999». */
export function formatMoneda(importe: number): string {
  return `$${importe.toLocaleString('es-MX')}`;
}

/** Longitud máxima de `nombre` (`NOMBRE_MAX` del backend, que trunca al pasarse). */
export const PLAN_NOMBRE_MAX = 120;

/** Longitud máxima de `trial_texto` (`TRIAL_MAX` del backend, que también trunca). */
export const PLAN_TRIAL_MAX = 200;

/**
 * Listado de planes. Es el endpoint **público**: `GET /api/admin/precios` **no
 * existe** —responde `404`, no `401`— porque el router solo declara el `GET`
 * sobre `/:id`. Lo consume tanto el panel como la landing. Sin paginación y sin
 * cookie.
 */
export function listPlanes() {
  return publicJson<PlanesListResponse>('/api/precios', { method: 'GET' });
}

/** Detalle: este sí es privado y solo de rol `admin`. */
export function getAdminPlan(id: string | number) {
  return apiJson<{ plan: AdminPlan }>(`/api/admin/precios/${id}`, { method: 'GET' });
}

export function createAdminPlan(payload: PlanInput) {
  return apiJson<{ plan: AdminPlan }>('/api/admin/precios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminPlan(id: string | number, patch: PlanPatchInput) {
  return apiJson<{ plan: AdminPlan }>(`/api/admin/precios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/**
 * `DELETE` responde `204` sin cuerpo: mismo molde que `deleteAdminUser` y
 * `deleteAdminImage`. Se sintetiza el `{ ok: true }` que el 204 no trae y
 * **solo si la respuesta fue 2xx**, para que un error sin body siga siendo un
 * error.
 */
export async function deleteAdminPlan(id: string | number): Promise<ApiResult<{ ok: true }>> {
  const res = await apiJson<{ ok: true }>(`/api/admin/precios/${id}`, { method: 'DELETE' });
  return res.ok && res.data == null ? { ...res, data: { ok: true } } : res;
}

// --- Complementos / add-ons (feature 37) ---
// Contrato en docs/api-contract.md §4 quinquies. Misma asimetría que precios:
// **no existe `GET /api/admin/complementos`** (el listado del panel sale del
// endpoint público `GET /api/complementos`, sin cookie), pero el detalle y las
// tres escrituras sí son privadas, bajo `/api/admin/complementos[/:id]`.
//
// Los paquetes (Pack S/M/L) llegan **anidados** en cada complemento, siempre
// presentes (`[]` si no hay). Aquí se modelan de solo lectura: su propio CRUD
// (`/api/admin/paquetes`) es la feature 38.

/**
 * Paquete anidado dentro de un complemento, tal como lo expone la API. Solo
 * lectura en esta feature: la edición contra `/api/admin/paquetes` es la
 * feature 38.
 *
 * `id` y `complemento_id` son **string**: el backend devuelve el `BIGSERIAL`
 * sin castear, igual que en planes, imágenes y usuarios. A diferencia del
 * complemento que lo contiene, `precio` aquí **es obligatorio y nunca `null`**.
 */
export interface AdminPaquete {
  id: string;
  complemento_id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  orden: number;
}

/**
 * Objeto `complemento` tal como lo devuelve la API, con sus `paquetes` ya
 * anidados.
 *
 * `precio: null` **no** es `precio: 0`: significa que este complemento no
 * publica un precio unitario porque son sus paquetes los que lo llevan (caso
 * real: «Packs de créditos»). `unidad` viaja aparte del precio y también puede
 * ser `null`; el símbolo `$` y el formato los pone el front con `formatMoneda`,
 * nunca el backend.
 */
export interface AdminComplemento {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** `null` = "sin precio unitario propio, lo llevan los paquetes". Nunca `0`. */
  precio: number | null;
  unidad: string | null;
  orden: number;
  /** Siempre presente, `[]` si no hay: se recorre sin guardas. */
  paquetes: AdminPaquete[];
}

/** `GET /api/complementos` responde `{ rows }`, ordenado por `orden ASC`. */
export interface ComplementosListResponse {
  rows: AdminComplemento[];
}

/**
 * Campos escribibles de un complemento. Solo `nombre` es obligatorio; el
 * resto son opcionales y, salvo `orden`, admiten `null` explícito para borrar
 * el valor guardado en un `PATCH` (`docs/api-contract.md` §4 quinquies).
 * `paquetes` se omite a propósito: no se escribe desde este endpoint.
 */
export type ComplementoInput =
  & Pick<AdminComplemento, 'nombre'>
  & Partial<Pick<AdminComplemento, 'descripcion' | 'precio' | 'unidad' | 'orden'>>;

/** Edición: todo opcional. Un `PATCH` sin ningún campo editable responde `422`. */
export type ComplementoPatchInput = Partial<ComplementoInput>;

/** Longitud máxima de `nombre` (el backend lo trunca a 120). */
export const COMPLEMENTO_NOMBRE_MAX = 120;

/** Longitud máxima de `descripcion` (el backend la trunca a 500). */
export const COMPLEMENTO_DESCRIPCION_MAX = 500;

/** Longitud máxima de `unidad` (el backend la trunca a 60). */
export const COMPLEMENTO_UNIDAD_MAX = 60;

/** Rango válido de `precio`: `NUMERIC(10,2)`, igual que en planes. */
export const COMPLEMENTO_PRECIO_MAX = 99999999.99;

/** Límite superior de `orden`: entero de 32 bits con signo. */
export const COMPLEMENTO_ORDEN_MAX = 2147483647;

/**
 * Listado de complementos. Es el endpoint **público**: no existe
 * `GET /api/admin/complementos` — el listado público ya devuelve todos, con
 * sus paquetes, sin borradores ni add-ons ocultos. Lo consume el panel; la
 * landing (`Addons.tsx`) sigue sin cablear, fuera del alcance de esta feature.
 */
export function listComplementos() {
  return publicJson<ComplementosListResponse>('/api/complementos', { method: 'GET' });
}

/** Detalle: privado, solo rol `admin`. */
export function getAdminComplemento(id: string | number) {
  return apiJson<{ complemento: AdminComplemento }>(`/api/admin/complementos/${id}`, { method: 'GET' });
}

export function createAdminComplemento(payload: ComplementoInput) {
  return apiJson<{ complemento: AdminComplemento }>('/api/admin/complementos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminComplemento(id: string | number, patch: ComplementoPatchInput) {
  return apiJson<{ complemento: AdminComplemento }>(`/api/admin/complementos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/**
 * `DELETE` responde `204` sin cuerpo: mismo molde que `deleteAdminPlan`. Se
 * sintetiza el `{ ok: true }` que el 204 no trae y **solo si la respuesta fue
 * 2xx**. ⚠️ Borra el complemento **y sus paquetes en cascada**, sin aviso del
 * backend y sin vuelta atrás — la UI debe confirmarlo explícitamente.
 */
export async function deleteAdminComplemento(id: string | number): Promise<ApiResult<{ ok: true }>> {
  const res = await apiJson<{ ok: true }>(`/api/admin/complementos/${id}`, { method: 'DELETE' });
  return res.ok && res.data == null ? { ...res, data: { ok: true } } : res;
}

// --- Paquetes (feature 38) ---
// Contrato en docs/api-contract.md §4 quinquies (ampliada). Segunda mitad del
// CRUD de add-ons: los paquetes son un recurso aparte en el panel, pero SIN
// listado propio ni público (`API_READY.md`, actualizado 2026-08-09): no hay
// `GET /api/paquetes` ni `GET /api/admin/paquetes` colectivo — viajan
// anidados en cada complemento (`AdminComplemento.paquetes`) y el panel
// recarga `listComplementos()` tras cada escritura para no quedarse
// desincronizado. Detalle y las tres escrituras sí son privados, bajo
// `/api/admin/paquetes[/:id]`, solo rol `admin`.

/**
 * Campos escribibles de un paquete. Tres asimetrías respecto a
 * `ComplementoInput`, todas del contrato:
 *
 * - **`precio` es obligatorio y nunca `null`**, a diferencia del precio del
 *   complemento. Se deriva con `Pick` en vez de `Partial<Pick>`, así que
 *   mandar `precio: null` es un error de **compilación**, no un `422` de
 *   runtime.
 * - **`complemento_id` es obligatorio**: todo paquete cuelga de un
 *   complemento. Un valor inexistente, no numérico o desbordado responde
 *   `422 { field: 'complemento_id' }` — nunca un `500`.
 * - **No hay campo `unidad`.**
 */
export type PaqueteInput =
  & Pick<AdminPaquete, 'nombre' | 'complemento_id' | 'precio'>
  & Partial<Pick<AdminPaquete, 'descripcion' | 'orden'>>;

/** Edición: todo opcional. Un `PATCH` sin ningún campo editable responde `422`. */
export type PaquetePatchInput = Partial<PaqueteInput>;

/** Límites del backend, idénticos a los del complemento (`API_READY.md`: "el resto de campos son los mismos"). */
export const PAQUETE_NOMBRE_MAX = 120;
export const PAQUETE_DESCRIPCION_MAX = 500;
export const PAQUETE_PRECIO_MAX = 99999999.99;
export const PAQUETE_ORDEN_MAX = 2147483647;

/** Detalle: privado, solo rol `admin`. Sin consumidor en la UI hoy, mismo patrón que `getAdminComplemento`. */
export function getAdminPaquete(id: string | number) {
  return apiJson<{ paquete: AdminPaquete }>(`/api/admin/paquetes/${id}`, { method: 'GET' });
}

export function createAdminPaquete(payload: PaqueteInput) {
  return apiJson<{ paquete: AdminPaquete }>('/api/admin/paquetes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Admite reasignar el paquete a otro complemento cambiando `complemento_id` (el backend lo acepta). */
export function updateAdminPaquete(id: string | number, patch: PaquetePatchInput) {
  return apiJson<{ paquete: AdminPaquete }>(`/api/admin/paquetes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/**
 * `DELETE` responde `204` sin cuerpo: mismo molde que `deleteAdminComplemento`.
 * Se sintetiza el `{ ok: true }` que el 204 no trae y **solo si la respuesta
 * fue 2xx**. A diferencia de borrar un complemento, borrar un paquete **no**
 * toca nada más: no hay cascada al revés.
 */
export async function deleteAdminPaquete(id: string | number): Promise<ApiResult<{ ok: true }>> {
  const res = await apiJson<{ ok: true }>(`/api/admin/paquetes/${id}`, { method: 'DELETE' });
  return res.ok && res.data == null ? { ...res, data: { ok: true } } : res;
}
