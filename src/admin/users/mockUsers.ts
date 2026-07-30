/**
 * Datos y operaciones mock de usuarios (maqueta de la feature 28).
 *
 * La pantalla de usuarios se maqueta **sin backend**: cuando se escribió esta
 * feature el router de usuarios existía en el backend pero seguía sin commitear
 * (avisará publicando un `API_READY.md`). Por eso aquí no hay ningún `fetch` ni
 * helper de `src/lib/api.ts`: solo un almacén en memoria.
 *
 * La forma de los datos y de las respuestas es **exactamente** la de
 * `docs/api-contract.md` §10.3, para que el cableado posterior sea mecánico:
 *
 *   GET    /api/admin/users      → { rows }   (sin paginación, sin `total`)
 *   GET    /api/admin/users/:id  → { user }
 *   POST   /api/admin/users      → { user }   (`password` obligatorio)
 *   PATCH  /api/admin/users/:id  → { user }   (`password` opcional)
 *   DELETE /api/admin/users/:id  → 204, o 409 con las dos reglas de negocio
 *
 * `password_hash` no se modela nunca en el front.
 *
 * TODO(feature-28): sustituir `listMockUsers` / `createMockUser` /
 * `updateMockUser` / `deleteMockUser` por los helpers equivalentes de
 * `src/lib/api.ts` (consumidos con `normalizeApi`) cuando el backend publique
 * `API_READY.md`. El resto de la pantalla no debería necesitar cambios.
 */
import type { AdminUser } from '../../lib/api';

/** Fila de la tabla `users` tal cual la expone el backend (columnas de `PUBLIC_COLS`). */
export interface MockUser extends AdminUser {
  created_at: string;
}

/** El listado real responde `{ rows }`: sin `total` ni `limit`/`offset`. */
export interface MockUsersList {
  rows: MockUser[];
}

/** Payload de alta y de edición. `password` es obligatorio solo en el alta. */
export interface MockUserInput {
  email: string;
  name: string;
  role: MockUser['role'];
  password?: string;
}

/** Campos que el backend puede señalar en un 422/409 (`{ error, field }`). */
export type MockUserField = 'email' | 'name' | 'role' | 'password';

/** Equivalente local de `ApiSuccess | ApiFailure`: nunca lanza. */
export type MockResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: MockUserField };

const SEED: MockUser[] = [
  { id: 1, email: 'ana.torres@maia.mx',   name: 'Ana Torres',   role: 'admin',  created_at: '2026-01-15T09:30:00.000Z' },
  { id: 2, email: 'bruno.diaz@maia.mx',   name: 'Bruno Díaz',   role: 'editor', created_at: '2026-03-02T16:05:00.000Z' },
  { id: 3, email: 'carla.mena@maia.mx',   name: 'Carla Mena',   role: 'editor', created_at: '2026-05-20T11:45:00.000Z' },
  { id: 4, email: 'diego.rivas@maia.mx',  name: '',             role: 'editor', created_at: '2026-06-11T08:00:00.000Z' },
];

let store: MockUser[] = SEED.map(u => ({ ...u }));
let nextId = SEED.length + 1;

/** Devuelve el almacén a su estado inicial (lo usan los tests entre casos). */
export function resetMockUsers(): void {
  store = SEED.map(u => ({ ...u }));
  nextId = SEED.length + 1;
}

function emailTaken(email: string, exceptId?: number): boolean {
  return store.some(u => u.email === email && u.id !== exceptId);
}

export async function listMockUsers(filters: { q?: string } = {}): Promise<MockResult<MockUsersList>> {
  const q = filters.q?.trim().toLowerCase();
  const rows = store
    .filter(u => !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
    .map(u => ({ ...u }));
  return { ok: true, data: { rows } };
}

export async function createMockUser(input: MockUserInput): Promise<MockResult<{ user: MockUser }>> {
  const email = input.email.trim().toLowerCase();
  if (!email)          return { ok: false, error: 'email requerido', field: 'email' };
  if (!input.password) return { ok: false, error: 'password requerido', field: 'password' };
  if (emailTaken(email)) return { ok: false, error: 'El email ya está en uso', field: 'email' };

  const user: MockUser = {
    id: nextId++,
    email,
    name: input.name.trim(),
    role: input.role,
    created_at: new Date().toISOString(),
  };
  store = [...store, user];
  return { ok: true, data: { user: { ...user } } };
}

export async function updateMockUser(id: number, input: MockUserInput): Promise<MockResult<{ user: MockUser }>> {
  const current = store.find(u => u.id === id);
  if (!current) return { ok: false, error: 'Usuario no encontrado' };

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, error: 'email requerido', field: 'email' };
  if (emailTaken(email, id)) return { ok: false, error: 'El email ya está en uso', field: 'email' };

  const user: MockUser = { ...current, email, name: input.name.trim(), role: input.role };
  store = store.map(u => (u.id === id ? user : u));
  return { ok: true, data: { user: { ...user } } };
}

/**
 * Reproduce los dos `409` del backend: no puedes borrarte a ti mismo ni dejar
 * el panel sin ningún administrador.
 */
export async function deleteMockUser(id: number, currentUserId: number | null): Promise<MockResult<{ ok: true }>> {
  const target = store.find(u => u.id === id);
  if (!target) return { ok: false, error: 'Usuario no encontrado' };
  if (currentUserId != null && id === currentUserId) {
    return { ok: false, error: 'No puedes eliminar tu propio usuario' };
  }
  if (target.role === 'admin' && store.filter(u => u.role === 'admin').length === 1) {
    return { ok: false, error: 'No puedes eliminar al último usuario con rol admin' };
  }
  store = store.filter(u => u.id !== id);
  return { ok: true, data: { ok: true } };
}
