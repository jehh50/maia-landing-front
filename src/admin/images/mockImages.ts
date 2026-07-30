/**
 * Datos y operaciones mock de imágenes (maqueta de la feature 29).
 *
 * La pantalla de imágenes se maqueta **sin backend**: cuando se escribió esta
 * feature los cinco endpoints existían en el árbol de trabajo del backend pero
 * seguían **sin commitear, sin tests y sin desplegar**. Por eso aquí no hay
 * ningún `fetch`, ningún helper de `src/lib/api.ts` y ninguna URL construida
 * contra el backend real: solo un almacén en memoria.
 *
 * La forma de los datos y de las respuestas es **exactamente** la de
 * `docs/api-contract.md` §10.2, para que el cableado posterior sea mecánico:
 *
 *   GET    /api/images?seccion=      → { rows }  (sin paginación, orden ASC, id ASC)
 *   GET    /api/images/:id/raw       → el binario; es la «URL pública»
 *   POST   /api/admin/images         → 201 { image }  (multipart, campo `file`)
 *   PATCH  /api/admin/images/:id     → 200 { image }  (JSON: alt, orden, seccion)
 *   DELETE /api/admin/images/:id     → 204 sin cuerpo
 *
 * El binario (`bytes`, `BYTEA`) **nunca** sale por la API y por eso tampoco se
 * modela aquí: el objeto tiene los 9 campos de `META_COLS` y ni uno más.
 *
 * Las tres rutas de escritura exigen rol `admin` (`editor` recibe 403), a
 * diferencia del CRUD de artículos.
 *
 * TODO(feature-29): sustituir `listMockImages` / `createMockImage` /
 * `updateMockImage` / `deleteMockImage` por los helpers equivalentes de
 * `src/lib/api.ts` (consumidos con `normalizeApi`) cuando el backend commitee y
 * despliegue el router de imágenes. Al cablear hay que tener en cuenta dos
 * cosas: (1) `id` es `BIGSERIAL` y `pg` puede devolverlo como string, así que
 * conviene normalizarlo con `Number()`; (2) la vista previa pasará a ser
 * `${API_BASE}/api/images/${id}/raw` — ver `mockPreviewUrl()`.
 */

/** Secciones de la landing que admiten imágenes. Enum de aplicación, no de BD. */
export const SECCIONES = [
  { value: 'hero',      label: 'Hero' },
  { value: 'cta_final', label: 'CTA final' },
] as const;

export type Seccion = (typeof SECCIONES)[number]['value'];

/** MIME permitidos por el backend. SVG está excluido a propósito (XSS almacenado). */
export const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** Extensiones válidas por MIME: el backend exige que declaración y extensión coincidan. */
const EXTENSIONS_BY_MIME: Record<(typeof ACCEPTED_MIME_TYPES)[number], string[]> = {
  'image/png':  ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

/** 5 MB, el límite de multer en el backend. */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Longitud máxima del texto alternativo (`ALT_MAX` del backend). */
export const ALT_MAX = 300;

/** Mensajes del backend, reproducidos literalmente para que el cableado no cambie el copy. */
export const SECCION_ERROR = `seccion inválida. Valores válidos: ${SECCIONES.map(s => s.value).join(', ')}`;
export const ORDEN_ERROR = 'orden debe ser un entero >= 0';

/** Fila de la tabla `images` tal cual la expone la API: los 9 campos de `META_COLS`. */
export interface MockImage {
  id: number;
  seccion: Seccion;
  filename: string;
  mime_type: string;
  size_bytes: number;
  alt: string | null;
  orden: number;
  created_at: string;
  updated_at: string;
}

/** El listado real responde `{ rows }`: sin `total` ni `limit`/`offset`. */
export interface MockImagesList {
  rows: MockImage[];
}

/** Campos que el backend puede señalar en un 413/415/422 (`{ error, field }`). */
export type MockImageField = 'file' | 'seccion' | 'alt' | 'orden';

/** Equivalente local de `ApiSuccess | ApiFailure`: nunca lanza. */
export type MockResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: MockImageField };

/** Lo que viaja en el `FormData` del POST: un solo archivo en el campo `file`. */
export interface MockImageInput {
  file: File;
  seccion: Seccion;
  alt?: string;
  orden?: number;
}

/** El PATCH solo admite estos tres campos; el binario es inmutable. */
export interface MockImagePatch {
  alt?: string | null;
  orden?: number;
  seccion?: Seccion;
}

const SEED: MockImage[] = [
  {
    id: 1, seccion: 'hero', filename: 'hero.png', mime_type: 'image/png', size_bytes: 74388,
    alt: 'Panel de MaIA respondiendo un chat de WhatsApp', orden: 0,
    created_at: '2026-02-10T10:15:00.000Z', updated_at: '2026-02-10T10:15:00.000Z',
  },
  {
    id: 2, seccion: 'hero', filename: 'hero-2.png', mime_type: 'image/png', size_bytes: 93889,
    alt: 'Embudo de conversaciones calificadas por MaIA', orden: 1,
    created_at: '2026-02-10T10:16:00.000Z', updated_at: '2026-04-01T09:00:00.000Z',
  },
  {
    id: 3, seccion: 'hero', filename: 'hero-3.png', mime_type: 'image/png', size_bytes: 76613,
    alt: null, orden: 2,
    created_at: '2026-02-10T10:17:00.000Z', updated_at: '2026-02-10T10:17:00.000Z',
  },
  {
    id: 4, seccion: 'cta_final', filename: 'maia.png', mime_type: 'image/png', size_bytes: 311211,
    alt: 'Agente MaIA saludando', orden: 0,
    created_at: '2026-03-05T18:40:00.000Z', updated_at: '2026-03-05T18:40:00.000Z',
  },
];

let store: MockImage[] = SEED.map(i => ({ ...i }));
let nextId = SEED.length + 1;

/** Devuelve el almacén a su estado inicial (lo usan los tests entre casos). */
export function resetMockImages(): void {
  store = SEED.map(i => ({ ...i }));
  nextId = SEED.length + 1;
}

/**
 * Vista previa de una imagen.
 *
 * Mientras esto sea una maqueta, las únicas imágenes con preview son los
 * estáticos que ya viven en `public/`; lo que se sube durante la sesión no
 * tiene binario que enseñar y se pinta con un marcador.
 *
 * TODO(feature-29): al cablear, devolver siempre
 * `${API_BASE}/api/images/${image.id}/raw`, que es la URL pública real (el JSON
 * no trae ningún campo `url`).
 */
const ESTATICOS_LOCALES = new Set(['hero.png', 'hero-2.png', 'hero-3.png', 'maia.png']);

export function mockPreviewUrl(image: MockImage): string | null {
  return ESTATICOS_LOCALES.has(image.filename) ? `/${image.filename}` : null;
}

/** Tamaño legible para la UI: «73 KB», «1.4 MB». */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${Number((kb / 1024).toFixed(1))} MB`;
}

function isSeccion(value: string): value is Seccion {
  return SECCIONES.some(s => s.value === value);
}

function isAcceptedMime(mime: string): mime is (typeof ACCEPTED_MIME_TYPES)[number] {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Validación de archivo **en cliente, antes de subir nada**: tipo, coherencia
 * con la extensión y tamaño. Reproduce los 415/413/422 del backend para no
 * gastar ancho de banda en una subida condenada.
 *
 * Lo que no se puede comprobar aquí son los *magic bytes*: el backend lee el
 * contenido real, así que un `.jpg` renombrado a `.png` se rechaza allí.
 */
export function validateImageFile(file: File | null): { error: string; field: MockImageField } | null {
  if (!file) {
    return { error: 'Archivo requerido', field: 'file' };
  }
  if (!isAcceptedMime(file.type)) {
    return {
      error: `Tipo de archivo no permitido. Formatos aceptados: ${ACCEPTED_MIME_TYPES.join(', ')}`,
      field: 'file',
    };
  }
  const nombre = file.name.toLowerCase();
  if (!EXTENSIONS_BY_MIME[file.type].some(ext => nombre.endsWith(ext))) {
    return {
      error: `La extensión no corresponde a ${file.type}. Se esperaba ${EXTENSIONS_BY_MIME[file.type].join(' o ')}`,
      field: 'file',
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      error: `El archivo excede el tamaño máximo permitido (${formatFileSize(MAX_FILE_SIZE_BYTES)})`,
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

/** El backend sanea el `originalname`: basename, sin control ni comillas, máx 255. */
function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const limpio = [...base].filter(c => c !== '"' && c.charCodeAt(0) >= 32).join('').trim().slice(0, 255);
  return limpio || 'imagen';
}

function normalizeAlt(alt: string | null | undefined): string | null {
  if (alt == null) return null;
  const trimmed = alt.trim().slice(0, ALT_MAX);
  return trimmed || null;
}

/** Orden fijo del backend: `orden ASC, id ASC`. */
function ordenar(rows: MockImage[]): MockImage[] {
  return [...rows].sort((a, b) => a.orden - b.orden || a.id - b.id);
}

export async function listMockImages(filtros: { seccion?: Seccion } = {}): Promise<MockResult<MockImagesList>> {
  if (filtros.seccion && !isSeccion(filtros.seccion)) {
    return { ok: false, error: SECCION_ERROR, field: 'seccion' };
  }
  const rows = ordenar(store.filter(i => !filtros.seccion || i.seccion === filtros.seccion)).map(i => ({ ...i }));
  return { ok: true, data: { rows } };
}

export async function createMockImage(input: MockImageInput): Promise<MockResult<{ image: MockImage }>> {
  const fileError = validateImageFile(input.file);
  if (fileError) return { ok: false, ...fileError };

  if (!input.seccion) return { ok: false, error: 'seccion requerida', field: 'seccion' };
  if (!isSeccion(input.seccion)) return { ok: false, error: SECCION_ERROR, field: 'seccion' };

  const orden = input.orden ?? 0;
  if (!Number.isInteger(orden) || orden < 0) return { ok: false, error: ORDEN_ERROR, field: 'orden' };

  const now = new Date().toISOString();
  const image: MockImage = {
    id: nextId++,
    seccion: input.seccion,
    filename: sanitizeFilename(input.file.name),
    mime_type: input.file.type,
    size_bytes: input.file.size,
    alt: normalizeAlt(input.alt),
    orden,
    created_at: now,
    updated_at: now,
  };
  store = [...store, image];
  return { ok: true, data: { image: { ...image } } };
}

export async function updateMockImage(id: number, patch: MockImagePatch): Promise<MockResult<{ image: MockImage }>> {
  const current = store.find(i => i.id === id);
  if (!current) return { ok: false, error: 'Imagen no encontrada' };

  if (patch.alt === undefined && patch.orden === undefined && patch.seccion === undefined) {
    return { ok: false, error: 'Nada que actualizar: se esperaba alt, orden o seccion' };
  }
  if (patch.orden !== undefined && (!Number.isInteger(patch.orden) || patch.orden < 0)) {
    return { ok: false, error: ORDEN_ERROR, field: 'orden' };
  }
  if (patch.seccion !== undefined && !isSeccion(patch.seccion)) {
    return { ok: false, error: SECCION_ERROR, field: 'seccion' };
  }

  const image: MockImage = {
    ...current,
    alt: patch.alt !== undefined ? normalizeAlt(patch.alt) : current.alt,
    orden: patch.orden ?? current.orden,
    seccion: patch.seccion ?? current.seccion,
    updated_at: new Date().toISOString(),
  };
  store = store.map(i => (i.id === id ? image : i));
  return { ok: true, data: { image: { ...image } } };
}

export async function deleteMockImage(id: number): Promise<MockResult<{ ok: true }>> {
  if (!store.some(i => i.id === id)) return { ok: false, error: 'Imagen no encontrada' };
  store = store.filter(i => i.id !== id);
  return { ok: true, data: { ok: true } };
}
