# Exploración — manual de patrones del admin (`maia-landing-front`)

**Fecha:** 2026-07-29. Fuentes normativas: `docs/context.md`, `docs/architecture.md`,
`docs/conventions.md`, `docs/api-contract.md`, `docs/verification.md`, `CHECKPOINT.md`.

Objetivo: que un implementador pueda añadir pantallas CRUD al admin (usuarios, imágenes,
precios) que parezcan escritas por la misma mano que las existentes.

---

## 0. Antes de escribir código

`docs/api-contract.md` solo documenta `/api/contact`, `/api/auth/{login,logout,me}`,
`/api/admin/leads[/:id]`, `/api/admin/articles[/:id]`, `/api/articles[/:slug]`.
**No existe ningún endpoint de usuarios, imágenes ni precios.** Regla de
`docs/conventions.md:84-87` y `docs/api-contract.md:292-299`: si el endpoint no existe en el
backend, **no se inventa**. Ver `progress/explore_backend_cruds.md` para el estado real del
backend y `docs/api-contract.md` §«Recursos en maquetación» para lo acordado.

---

## 1. Anatomía de una lista de admin

### 1.1 El patrón a imitar: `src/admin/leads/LeadsList.tsx`

| Aspecto | Dónde | Cómo |
|---|---|---|
| Estado | `:20-29` | `useState` sueltos: `rows`, `total`, `loading`, `error`, `page`, `rowsPerPage`, filtros, `selected` |
| Carga | `:31-54` | `const load = useCallback(async () => {…}, [deps de filtros])` |
| Llamada | `:34-44` | `normalizeApi(listAdminLeads({…}), 'rows', 'No pudimos cargar los leads')` |
| Disparo + debounce | `:57-60` | `useEffect(() => { const id = setTimeout(load, 300); return () => clearTimeout(id); }, [load])` |
| Derivados | `:63-67` | `useMemo` para el catálogo del filtro de país |
| Error global | `:100` | `{error && <Box sx={{ color: 'error.main', mb: 2, fontSize: 14 }}>{error}</Box>}` |
| Tabla | `:102-149` | `<Paper variant="outlined" sx={{ overflow: 'hidden' }}>` → `<Table size="small">` |
| Cabecera | `:105` | `<TableRow sx={{ bgcolor: 'surface.soft' }}>` |
| Loading | `:117-119` | fila única con `colSpan`, `align="center"`, `sx={{ py: 4 }}`, `<CircularProgress size={20} />` |
| Vacío | `:120-122` | fila única `colSpan`, `sx={{ py: 4, color: 'text.secondary' }}`, texto `"Sin leads."` |
| Filas | `:123-147` | `hover`, `key={r.id}`, `data-testid={`lead-row-${r.id}`}` |
| Paginación | `:150-159` | `<TablePagination component="div" …>` **dentro** del `Paper`, `labelRowsPerPage="Por página"`, `rowsPerPageOptions={[10, 25, 50, 100]}` |

Esqueleto canónico:

```tsx
const load = useCallback(async () => {
  setLoading(true);
  setError(null);
  const res = await normalizeApi(
    listAdminUsers({ q: q.trim() || undefined, limit: rowsPerPage, offset: page * rowsPerPage }),
    'rows',
    'No pudimos cargar los usuarios',
  );
  if (res.ok) { setRows(res.data.rows); setTotal(res.data.total); }
  else        { setError(res.error); setRows([]); setTotal(0); }
  setLoading(false);
}, [q, page, rowsPerPage]);

useEffect(() => {
  const id = setTimeout(load, 300);   // debounce de búsqueda
  return () => clearTimeout(id);
}, [load]);
```

Convenciones visibles en el mismo archivo:

- Catálogos de filtro como arrays tipados a nivel de módulo:
  `const TIPOS: { value: '' | LeadType; label: string }[] = [...]` (`:12-17`), con `''` = «todos».
- Cambiar cualquier filtro **resetea la página**:
  `onChange={e => { setQ(e.target.value); setPage(0); }}` (`:78`).
- Todo campo de búsqueda con nombre accesible explícito:
  `inputProps={{ 'aria-label': 'Buscar leads' }}` (`:80`) — sin esto el test de
  `conventions.md:100-104` es imposible.
- `IconButton` de acción con `aria-label` que incluye el id/título:
  `aria-label={`Ver lead ${r.id}`}` (`:144`), `aria-label={`Borrar ${a.title}`}`
  (`ArticlesList.tsx:102`).
- Chips de estado:
  `<Chip size="small" label={…} color={cond ? 'primary' : 'default'} variant={cond ? 'filled' : 'outlined'} />`
  (`:141`, `ArticlesList.tsx:87-92`).
- Fechas: `new Date(r.created_at).toLocaleDateString('es-MX')` (`:133`); en detalle,
  `toLocaleString('es-MX')` (`LeadDetailDialog.tsx:54`).
- Celda vacía: `{r.empresa || '—'}`; caso enfatizado
  `<em style={{ color: tokens.text.disabled }}>—</em>` (`:135`) — `style={{}}` nativo es el caso
  legítimo de import directo de `tokens` (`conventions.md:57-59`).
- Título de página:
  `<Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Leads</Typography>` (`:71`).

### 1.2 `src/admin/articles/ArticlesList.tsx` — mismo esqueleto, capa de datos vieja

Idéntico en: forma del estado (`:17-21`), `load` en `useCallback` (`:23-34`), error global
(`:62`), `Paper variant="outlined"` + `Table size="small"` + `TableHead` con `surface.soft`
(`:64-74`), filas loading/vacío con `colSpan={5}` (`:76-81`),
`data-testid={`article-row-${a.id}`}` (`:83`), chips y fechas.

Diferencias y qué hacer con cada una:

| Diferencia | `LeadsList` | `ArticlesList` | Qué imitar |
|---|---|---|---|
| Capa de datos | `normalizeApi(...)` (`:34`) | `ok && data && 'rows' in data` (`:26`) | **`normalizeApi`** — §4 |
| Paginación | `TablePagination` server-side | ninguna | `TablePagination` si el endpoint acepta `limit/offset` |
| Búsqueda/filtros | sí, debounce 300 ms | no | añádela si el endpoint la soporta |
| Rol | no lo lee | `const user = useOutletContext<AdminUser>()`; `canDelete = user?.role === 'admin'` (`:16`, `:51`) | **imitar** para acciones destructivas |
| Cabecera | solo título | título + botón «Nuevo X» en `Box` con `justifyContent: 'space-between'` (`:55-60`) | **imitar** si hay creación |
| Detalle | modal (`LeadDetailDialog`) | ruta propia (`ArticleEdit`) | según §2 |
| Borrado | no aplica | `Dialog` de confirmación (`:113-124`) | **imitar** |

**Patrón más reciente = `LeadsList`** (migrado en la feature 20, `docs/api-contract.md:83-86`).
`ArticlesList.tsx:26` está citado como deuda de adopción en `docs/architecture.md:313`.
Lo ideal para una pantalla nueva: **estructura de `ArticlesList` (rol, botón nuevo, confirmación
de borrado) + capa de datos de `LeadsList` (`normalizeApi`)**.

Cabecera con acción primaria:

```tsx
<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
  <Typography variant="h5" fontWeight={700}>Usuarios</Typography>
  <Button component={RouterLink} to="/admin/users/new" variant="contained" startIcon={<AddIcon />}>
    Nuevo usuario
  </Button>
</Box>
```

---

## 2. Anatomía de detalle / edición

Hay **dos formas legítimas** y el criterio es el uso.

### A. Diálogo modal de solo lectura — `src/admin/leads/LeadDetailDialog.tsx`

- Props locales, no exportadas:
  `interface Props { open; lead: AdminLead | null; onClose: () => void }` (`:8-12`).
- Guarda temprana `if (!lead) return null;` (`:24`); el padre lo monta siempre:
  `<LeadDetailDialog open={!!selected} lead={selected} onClose={() => setSelected(null)} />`
  (`LeadsList.tsx:162`).
- `<Dialog open maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>` (`:28`).
- Botón cerrar:
  `<IconButton aria-label="Cerrar" … sx={{ position: 'absolute', right: 12, top: 12 }}>` (`:37`).
- Subcomponente `Field` local al archivo (`:14-21`), coherente con `conventions.md:30`.
- Grid de dos columnas:
  `sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}` (`:43`).
- Usar `Dialog` cuando no hay formulario: solo lectura o pocos campos.

### B. Página propia con formulario — `src/admin/articles/ArticleEdit.tsx`

- Una misma ruta sirve crear y editar:
  `const { id } = useParams<{ id: string }>(); const isNew = !id || id === 'new';` (`:18-19`),
  con dos `<Route>` al mismo componente (`AppRoutes.tsx:67-68`).
- Objeto vacío a nivel de módulo: `const empty: ArticleInput = { … }` (`:15`).
- Estado: `form`, `loading` (`= !isNew`), `saving`, `errorMsg`, `success` (`:22-26`).
- Carga inicial en `useEffect` con `return` temprano si `isNew` (`:28-47`).
- Handler de campo currificado:
  ```tsx
  const onChange = (k: keyof ArticleInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
  };
  ```
- Submit: `e.preventDefault()` → limpia estado → valida → `setSaving(true)` → payload con
  `.trim() || undefined` → create/update → discrimina (`:57-86`).
- Loading de página:
  `if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;` (`:88`).
- Botón «Volver»:
  `<Button component={RouterLink} to="/admin/articles" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>` (`:92`).
- Tras crear: `navigate(`/admin/articles/${data.article.id}`, { replace: true })` (`:80`).
- Botón submit con texto dependiente:
  `{saving ? 'Guardando…' : isNew ? 'Crear artículo' : 'Guardar cambios'}` (`:213`) — con
  **puntos suspensivos tipográficos `…`**, no `...`.

### Validación de formularios: usa el estilo de `Login`

- `ArticleEdit.tsx:61-62` valida inline en un único `errorMsg`; los campos no se marcan en rojo.
  Suficiente para 2 reglas, pobre para un CRUD.
- `src/admin/Login.tsx:21-28` es el patrón bueno, **cópialo**:

```tsx
const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

const validate = (): boolean => {
  const next: { email?: string; password?: string } = {};
  if (!email.trim())                     next.email = 'Email requerido';
  else if (!EMAIL_RE.test(email.trim())) next.email = 'Email inválido';
  if (!password)                         next.password = 'Contraseña requerida';
  setErrors(next);
  return Object.keys(next).length === 0;
};
```

Error de campo con limpieza al teclear (`Login.tsx:85-95`):

```tsx
<TextField
  label="Email"
  value={email}
  onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
  error={!!errors.email}
  helperText={errors.email}
  inputProps={{ 'aria-label': 'Email', autoComplete: 'username' }}
  disabled={submitting}
/>
```

Error/éxito **global**: `<Alert>`, nunca un `Box` rojo dentro de un formulario.

- `Login.tsx:19` + `:117-121`: un solo estado
  `status: { kind: 'error' | 'success'; text } | null` y `<Alert severity={status.kind} role="status">`.
- `ArticleEdit.tsx:208-209`: `{errorMsg && <Alert severity="error">{errorMsg}</Alert>}` /
  `{success && !errorMsg && <Alert severity="success">Guardado correctamente.</Alert>}`.
- En **listas** el error global sí es el `Box` de una línea (`LeadsList.tsx:100`), no un `Alert`.
  Respeta la distinción.
- `<Box component="form" onSubmit={onSubmit} noValidate>` (`Login.tsx:83`) y todos los campos con
  `disabled={saving}`.

### Confirmación de borrado — `ArticlesList.tsx:20-21, 38-49, 113-124`

Estado `toDelete: T | null` + `deleting: boolean`; `Dialog` al final del árbol:

```tsx
<Dialog open={!!toDelete} onClose={() => setToDelete(null)}>
  <DialogTitle>¿Borrar artículo?</DialogTitle>
  <DialogContent>
    Esta acción no se puede deshacer. Se eliminará "<b>{toDelete?.title}</b>".
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setToDelete(null)} disabled={deleting}>Cancelar</Button>
    <Button onClick={confirmDelete} color="error" variant="contained" disabled={deleting}>
      {deleting ? 'Borrando…' : 'Borrar'}
    </Button>
  </DialogActions>
</Dialog>
```

Tras borrar con éxito: `setToDelete(null); await load();` (`:44-45`).

⚠️ Ojo con `ArticlesList.tsx:43` — `if (ok || (data == null))` trata un fallo sin body como
éxito. **No lo copies.**

---

## 3. Routing y navegación

### 3.1 `src/AppRoutes.tsx`

- `main.tsx` es bootstrap puro; la tabla vive aquí para ser montable en tests (`:42-45`,
  `architecture.md:89-92`).
- Cada página de admin es `lazy` con **ruta literal** en el `import()` para que Rollup emita un
  chunk (`:21-29`, comentario `:9-20`):
  ```tsx
  const UsersList = lazy(() => import('./admin/users/UsersList'));
  ```
- Los hijos del admin se envuelven **individualmente** en `AdminPage` (`:38-40`), que es un
  `<Suspense fallback={<RouteFallback minHeight={320} />}>`. Es lo que evita que la guardia y el
  sidebar se desmonten al navegar (`:31-37`).
- Registro de una ruta nueva (dentro del `<Route path="/admin">` de `:56-69`):
  ```tsx
  <Route path="users"      element={<AdminPage><UsersList /></AdminPage>} />
  <Route path="users/new"  element={<AdminPage><UserEdit  /></AdminPage>} />
  <Route path="users/:id"  element={<AdminPage><UserEdit  /></AdminPage>} />
  ```
- **La ruta comodín `*` (`:70`) va siempre última.** No insertar nada después.
- `App`, `LegalPage` y `NotFound` siguen con import estático a propósito (`:9-20`): no
  convertirlos a `lazy`.

### 3.2 Guardia de sesión — `src/admin/AdminGuard.tsx`

- Máquina de estados `type Status = 'loading' | 'auth' | 'guest'` (`:6`), coherente con
  `conventions.md:96-98`.
- `getMe()` en `useEffect` con bandera `cancelled` (`:21-34`); discriminación
  `res.ok && res.data && 'user' in res.data` (`:26`).
- Sin sesión: `<Navigate to="/admin/login" replace state={{ from: location }} />` (`:45`);
  `Login.tsx:13` lo lee para volver.
- Inyecta el usuario por **render prop**: `children: (user: AdminUser) => ReactNode` (`:9`),
  consumido en `AppRoutes.tsx:59-62`.
- `AdminLayout` lo reparte con `<Outlet context={user} />` (`AdminLayout.tsx:95`) y cada página lo
  lee con `useOutletContext<AdminUser>()` (`ArticlesList.tsx:16`, `AdminHome.tsx:6`).
- **No tocar `AdminGuard`** al añadir pantallas: cualquier ruta anidada bajo `/admin` ya queda
  protegida.

### 3.3 Entrada nueva en el sidebar — `src/admin/AdminLayout.tsx`

Un solo array a nivel de módulo (`:6-10`). Añadir una sección = añadir una línea:

```tsx
const NAV_ITEMS = [
  { to: '/admin',          label: 'Inicio',   end: true  },
  { to: '/admin/leads',    label: 'Leads',    end: false },
  { to: '/admin/articles', label: 'Blog',     end: false },
  { to: '/admin/users',    label: 'Usuarios', end: false },   // ← nuevo
];
```

`end: true` solo para `/admin`. El `map` (`:57-75`) usa `NavLink` con
`style={({ isActive }) => …}` — función `style` nativa, **no `sx`**, porque `NavLink` no lo
acepta; de ahí el import directo de `tokens` (caso 3 de `conventions.md:57-59`). El
`<Stack component="nav" aria-label="Navegación admin">` (`:56`) es lo que los tests localizan; el
`aria-current="page"` lo pone `NavLink` solo.

> ⚠️ **Al añadir ítems hay que actualizar `src/admin/__tests__/AdminLayout.test.tsx:37-40`**: ese
> test congela la lista exacta con `toEqual(['Inicio', 'Leads', 'Blog'])` y **fallará**.
> Revisar también el texto de `AdminHome.tsx:26-32` si deja de ser cierto.
> **Nunca** reintroducir ítems deshabilitados tipo «próximamente»: la feature 18 los eliminó y
> `AdminLayout.test.tsx:51-56` lo vigila.

---

## 4. Capa de datos (`src/lib/api.ts`)

### 4.1 Reglas duras

- Es la **única** frontera con el backend: cero `fetch` en componentes
  (`conventions.md:80-82`, C5 en `CHECKPOINT.md:27-30`).
- Los helpers **no lanzan**: `{ ok, status, data }` con `data: null` si no hay body (`:52-56`).
- Transporte correcto: `apiJson` (`:124-133`, `credentials: 'include'`, todo `/api/admin/*`),
  `publicJson` (`:265-274`, `credentials: 'omit'`), `postLead` (`:26-39`).
- **Prohibido `any`**; derivar tipos con `Pick<>` (`:253-256`) en vez de duplicarlos.

### 4.2 Helper nuevo — anatomía (`:181-190` y `:231-247`)

```ts
// --- Admin: usuarios (feature N) ---

export interface AdminUserRow { id: number; email: string; name: string; role: 'admin' | 'editor'; created_at: string; }
export interface UsersListResponse { rows: AdminUserRow[]; total: number; limit: number; offset: number; }
export interface UsersListFilters { q?: string; limit?: number; offset?: number; }

export function listAdminUsers(filters: UsersListFilters = {}) {
  const qs = new URLSearchParams();
  if (filters.q) qs.set('q', filters.q);
  if (filters.limit  != null) qs.set('limit',  String(filters.limit));
  if (filters.offset != null) qs.set('offset', String(filters.offset));
  const query = qs.toString();
  return apiJson<UsersListResponse>(`/api/admin/users${query ? `?${query}` : ''}`, { method: 'GET' });
}

export function createAdminUser(payload: UserInput) {
  return apiJson<{ user: AdminUserRow }>('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) });
}
export function deleteAdminUser(id: number | string) {
  return apiJson<{ ok: true }>(`/api/admin/users/${id}`, { method: 'DELETE' });
}
```

Notas: strings opcionales solo si son truthy; numéricos con `!= null` (para no perder el `0`);
texto libre con `encodeURIComponent` (`:294`); el `?` solo si hay query. Sin `try/catch`: ya está
dentro de `apiJson`.

### 4.3 `normalizeApi()` vs el patrón manual

**Nuevo (usar SIEMPRE)** — `api.ts:106-122`, ejemplo canónico `LeadsList.tsx:34-52`:

```ts
const res = await normalizeApi(listAdminUsers({ limit, offset }), 'rows', 'No pudimos cargar los usuarios');
if (res.ok) { setRows(res.data.rows); setTotal(res.data.total); }
else        { setError(res.error); setRows([]); setTotal(0); }
```

- Firma: `normalizeApi<T, K extends keyof T & string>(call: Promise<ApiResult<T>>, key: K, fallbackError?: string)`.
  Se le pasa la promesa **sin `await`**.
- `key` es la clave del payload de éxito: `'rows'`, `'article'`, `'user'`, `'lead'`, `'ok'`.
- Devuelve `ApiSuccess<T> | ApiFailure` (`:65-77`); `status: 0` = fallo de red. **Nunca lanza.**
- Consumidores hoy: `LeadsList.tsx:34` (privado) y `BlogIndex.tsx:20` (público).

**Viejo (NO usar en código nuevo)** — `ArticlesList.tsx:25-33`:

```ts
const { ok, data } = await listAdminArticles();
if (ok && data && 'rows' in data) { setRows(data.rows); setError(null); }
else { setError(data && 'error' in data && data.error ? data.error : 'Error al cargar artículos'); setRows([]); }
```

Sigue vivo en `ArticlesList.tsx:26`, `ArticleEdit.tsx:32,77`, `AdminGuard.tsx:26`,
`Login.tsx:42`, `BlogArticle.tsx:42`, `sections/Blog.tsx:97`, `ContactModal.tsx:98`. Es **deuda
de adopción documentada** (`architecture.md:313`, `context.md:66-67`). **No migrarla de paso**
(C10) pero tampoco reproducirla.

Todo endpoint nuevo va documentado en `docs/api-contract.md` **antes** de consumirse (C6), y su
test con `vi.spyOn(globalThis, 'fetch')` (`api-contract.md:292-299`).

---

## 5. Estilos (`conventions.md` §3, `architecture.md` §6)

Escalera de decisión, en orden:

1. **`sx` con tokens del tema** (por defecto). Paths en `theme.ts:29-65`:
   `primary.main|dark|light`, `text.primary|secondary|disabled`, `error.main`,
   `success.main|light|dark`, `background.paper|default`, `divider`, y los aumentados
   `surface.main|soft|tint` y `brand.*`.
   ```tsx
   sx={{ bgcolor: 'surface.soft', color: 'text.secondary', borderColor: 'divider' }}
   ```
2. **`var(--…)`** solo dentro de un string CSS crudo: `border: '1px solid var(--border)'`
   (`ArticleEdit.tsx:160`), `background: 'var(--bg-soft)'` (`:168`). Las 19 variables están en
   `tokens.ts:96-116`.
3. **Import directo de `tokens`** cuando el color es un valor JS sin `sx`:
   `style={{ color: tokens.text.disabled }}` (`LeadsList.tsx:135`) o el `style` de `NavLink`
   (`AdminLayout.tsx:62-71`).
4. **`alpha()` sobre el token** cuando hay opacidad dentro de un string CSS crudo (feature 25):
   ```tsx
   import { alpha } from '@mui/material/styles';
   boxShadow: `0 2px 16px ${alpha(tokens.brand.orange, 0.06)}`
   ```
   **Nunca un `rgba()` de marca a mano**; los `rgba(0,0,0,…)` neutros sí se dejan literales
   (`conventions.md:63-65`).

Prohibido:

- **Cualquier hex en un componente** (`conventions.md:66-70`, C4). Si el color falta, se agrega a
  `src/theme/tokens.ts` y se anota en `progress/current.md`; nunca en `globals.css`.
- `className` con clases de utilidad — **no hay Tailwind** (`conventions.md:72-74`). Las únicas
  clases propias son `.reveal`, `.fade-up-1..4`, `.gradient-text`.
- Píxeles sueltos donde hay escala MUI: usar `spacing` (`mb: 2`, `p: 2.5`, `py: 4`, `gap: 2`) y el
  `borderRadius: 12` del tema. Se tolera `fontSize: 13|14`, `minWidth: 180`, `maxWidth: 1100`.
- Bordes: `border: '1px solid'` + `borderColor: 'divider'` (`AdminLayout.tsx:36-37`) o
  `<Paper variant="outlined">`. No inventar un color de borde.

El admin es responsive con objetos de breakpoint: `p: { xs: 3, md: 5 }` (`AdminLayout.tsx:94`),
`direction={{ xs: 'column', md: 'row' }}` (`LeadsList.tsx:73`).

---

## 6. Tests

### 6.1 Receta (`docs/verification.md` §4 y `src/admin/__tests__/LeadsList.test.tsx`)

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';      // ← /styles, no '@mui/material'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import theme from '../../theme/theme';
import UsersList from '../users/UsersList';

function mockListResponse(rows: unknown[], total = rows.length) {
  return new Response(JSON.stringify({ rows, total, limit: 25, offset: 0 }), { status: 200 }) as Response;
}

function renderList() {
  return render(
    <MemoryRouter><ThemeProvider theme={theme}><UsersList /></ThemeProvider></MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockListResponse([{ id: 1, name: 'Ana' }]));
});
afterEach(() => vi.restoreAllMocks());
```

Reglas no negociables:

- **`vi.spyOn(globalThis, 'fetch')` devolviendo `Response` reales.** **No se mockea
  `src/lib/api.ts`** (`verification.md:75-76`, `architecture.md:262`).
- Aserciones sobre `fetch.mock.calls` para URL/método/payload (`LeadsList.test.tsx:57-61`):
  ```tsx
  await waitFor(() => {
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.find(c => String(c[0]).includes('q=ana'))).toBeTruthy();
  });
  ```
- `ThemeProvider` siempre; `MemoryRouter` cuando hay navegación.
- `restoreAllMocks()` en `afterEach`.
- Si la pantalla usa `useOutletContext`, montar una `Route` anidada real
  (`ArticlesList.test.tsx:18-32`):
  ```tsx
  <Routes>
    <Route element={<Outlet context={user} />}>
      <Route path="/admin/users" element={<UsersList />} />
    </Route>
  </Routes>
  ```
- Ubicación: `src/admin/__tests__/<Sujeto>.test.tsx`. **No hay carpeta `tests/` en la raíz.**
- Consultas por rol accesible: `getByRole('button', { name: /borrar/i })`,
  `getByLabelText(/buscar/i)`. Los `data-testid` de fila solo para clics ambiguos.
- `await screen.findByText(...)` para esperar la carga; `userEvent.setup()` dentro de cada `it`
  que interactúa.
- Se testea **comportamiento por la UI**, nunca estado interno.

Casos a replicar por pantalla: carga y pinta filas (`LeadsList.test.tsx:46-50`), la búsqueda
dispara `?q=` (`:52-62`), el clic abre el detalle (`:64-71`), permisos por rol
(`ArticlesList.test.tsx:55-66`), confirmación + cancelar no borra (`:68-78`). Para una ruta
nueva, además el patrón de `src/__tests__/AppRoutes.test.tsx:29-53` (un `mockImplementation` que
enruta por URL) y `:113-142` (guardia + sidebar intactos al navegar).

### 6.2 Qué exige y qué exime el proyecto (`verification.md` §5, líneas 109-116)

**Obligatorio (C2, `CHECKPOINT.md:15-18`):** lógica en `src/lib/`; **formularios, flujos de admin
y estados de carga/error**; toda llamada nueva a la API desde un componente (con aserción sobre
`fetch.mock.calls`); routing nuevo y guardias de acceso.

**Exento:** secciones presentacionales de la landing (copy, layout, `sx`) y cambios solo de
estilos/tokens.

**Las pantallas de admin NO están exentas** — son la fila explícitamente marcada «Sí». Tres
pantallas CRUD nuevas activan cuatro filas del «Sí» a la vez (flujo de admin + llamadas nuevas +
routing nuevo + formularios). Presupuestar **al menos un archivo de test por pantalla**.

### 6.3 Bloque de verificación

```bash
npm test && npm run typecheck && npm run build && echo "VERDE"
```

Baseline vigente: **15 archivos / 85 tests** verdes, typecheck 0, build 0. Iterar con
`npx vitest run src/admin/__tests__/UsersList.test.tsx`, pero el bloque completo se corre antes de
cerrar. `npm test` tarda ~40 s (`testTimeout` 15000 ms). El aviso
`Some chunks are larger than 500 kB` es **esperado**. Si cambia el conteo de tests, actualizar
`docs/verification.md` §1-§2 **y** `docs/architecture.md` §8.

---

## 7. Qué NO hacer

**Capa de datos**

1. No llamar a `fetch` desde un componente (C5). Todo helper va en `src/lib/api.ts`.
2. No reintroducir `ok && data && 'rows' in data` — usar `normalizeApi` (§4.3).
3. No copiar `if (ok || (data == null))` de `ArticlesList.tsx:43`: enmascara fallos sin body.
4. No inventar endpoints. Sin entrada en `docs/api-contract.md` respaldada por el backend, la
   feature es `blocked` (`conventions.md:84-87`).
5. No usar `publicJson` para `/api/admin/*`: sin cookie es 401 garantizado.
6. No meter `try/catch` alrededor de los helpers: no lanzan (`architecture.md:153`).

**Estilos**

7. Cero hex en componentes; cero `rgba()` de marca a mano — `alpha(tokens.…, x)`.
8. Cero `className` de utilidad: no hay Tailwind.
9. No añadir colores a `globals.css`: ya no declara ninguno (`architecture.md:204`).
10. No usar `var(--…)` cuando hay `sx` disponible, ni tokens del tema dentro de un string CSS
    crudo (no resuelven).

**Arquitectura y estado**

11. No añadir Redux/Zustand/React Query ni contextos globales (`conventions.md:91-94`, C5).
    Estado local; si dos hermanos lo comparten, se eleva al padre.
12. Estado de carga = máquina explícita `'loading' | 'ok' | 'error'` o el par `loading`/`error` de
    las listas, no un `isLoading` suelto (`conventions.md:96-98`).
13. No duplicar tipos: `Pick<>` sobre el tipo fuente (C5).
14. No tocar `AdminGuard` para «proteger» una ruta nueva: ya está protegida por anidamiento.
15. No convertir `App`/`LegalPage`/`NotFound` a `lazy` (decisión de la feature 22).
16. No sacar el `<Suspense>` interno del `AdminPage`: sin él el sidebar parpadea al navegar
    (`AppRoutes.tsx:31-37`, cubierto por `AppRoutes.test.tsx:131-142`).
17. No poner rutas después del comodín `*` (`AppRoutes.tsx:70`).
18. No usar `import()` con path calculado: Rollup no puede analizarlo y no emite chunk.

**TypeScript / residuos**

19. `any` está prohibido; usar `unknown` y discriminar (`conventions.md:37`). Ojo:
    `LeadsList.test.tsx:23` usa `any[]` en un helper de test — es preexistente, **no es licencia**;
    `NotFound.tsx` fue rechazado por eso (`review_17.md`).
20. `noUnusedLocals`/`noUnusedParameters` activos: una variable sin usar **rompe el build**.
21. Sin `React.FC`: `export default function Foo({ a }: Props)`. `interface Props` local, no
    exportada salvo necesidad.
22. Sin `console.log`, sin código comentado «por si acaso», sin `TODO` sin
    `// TODO(feature-N): …` (C9).

**Proceso**

23. **No arreglar deuda ajena de paso** (C10): la migración de `ArticlesList`/`Blog.tsx` a
    `normalizeApi`, el doble `useReveal`, el peso del chunk de `three`.
24. No tocar `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` ni `.gitignore`
    (C11). No añadir dependencias ni un script de lint.
25. No leer ni escribir `.env*` (C8).
26. Actualizar `AdminLayout.test.tsx:37-40` al añadir ítems al sidebar: congela la lista exacta y
    romperá.
27. No reintroducir ítems de nav «próximamente»/deshabilitados: la feature 18 los borró y hay un
    test que lo vigila (`AdminLayout.test.tsx:51-56`).
28. Copy **en español**, con `…` tipográfico y `¿…?` completos. Commits en español imperativo,
    rama `feat/<id>-<slug>`, nunca directo a `main`, sin `push` ni PR salvo petición explícita.
29. Documentar en `progress/current.md` mientras se trabaja, no al final.
