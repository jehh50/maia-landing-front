# Contrato de API — backend consumido por el frontend

> Fuente de verdad para el frontend: **este documento + `src/lib/api.ts`**.
> El backend vive fuera de este repo (Node, `:3002` en desarrollo).
>
> **No inventes endpoints ni campos.** Si necesitas algo que no está aquí,
> documenta la necesidad en `progress/current.md` y marca la feature `blocked`
> (ver `AGENTS.md` §6). Mockear una forma de datos arbitraria genera trabajo que
> luego hay que deshacer.
>
> Última verificación contra `src/lib/api.ts`: 27 de julio de 2026.

---

## 1. Base URL y transporte

```
API_BASE = import.meta.env.VITE_API_BASE ?? ''
```

Vacío por defecto ⇒ rutas relativas. En dev las resuelve el proxy de Vite hacia
`http://localhost:3002`; en producción hace falta `VITE_API_BASE` absoluto
porque `vercel.json` **no** proxea `/api`.

Todas las peticiones con body van con `Content-Type: application/json`.

### Los tres helpers y sus cookies

| Helper | `credentials` | Usado por |
|--------|--------------|-----------|
| `postLead` | por defecto (`same-origin`) | Formulario público de contacto |
| `apiJson<T>` | `'include'` | Auth y todo `/api/admin/*` |
| `publicJson<T>` | `'omit'` | Blog público (`/api/articles`) |

### Forma de retorno (uniforme)

```ts
{ ok: boolean, status: number, data: T | { error?: string } | null }
```

- `ok` y `status` vienen de la `Response`.
- **Los helpers nunca lanzan.** `res.json()` va en `try/catch`; si no hay body,
  `data` es `null`.
- Por eso **cada consumidor discrimina el éxito inspeccionando la forma**:
  `'rows' in data`, `'article' in data`, `'user' in data`. Es el patrón vigente
  del repo (y su deuda conocida, ver `docs/architecture.md` §10).

### Forma normalizada (`normalizeApi`, feature 20)

Sobre la forma cruda de arriba, `src/lib/api.ts` expone un normalizador que
convierte cualquier resultado en una **unión discriminada**, para no repetir el
`'rows' in data` en cada consumidor:

```ts
type ApiSuccess<T> = { ok: true;  status: number; data: T };
type ApiFailure    = { ok: false; status: number; error: string; field?: string };
type ApiOutcome<T> = ApiSuccess<T> | ApiFailure;

normalizeApi<T, K extends keyof T & string>(
  call: Promise<ApiResult<T>>,   // la promesa del helper existente, sin await
  key: K,                        // clave que debe traer el payload de éxito
  fallbackError?: string,        // default: GENERIC_API_ERROR
): Promise<ApiOutcome<T>>
```

`key` es la misma comprobación que hoy hace el consumidor a mano (`'rows'`,
`'article'`, `'user'`, `'lead'`, `'ok'`), hecha una vez y tipada contra `T`.

| Caso | Resultado |
|------|-----------|
| `2xx` con body que contiene `key` | `{ ok: true, status, data }` |
| `2xx` sin body, o body sin `key` | `{ ok: false, status, error }` — el `error` del body si lo trae, si no `fallbackError` |
| `4xx`/`5xx` con `{ error: string }` | `{ ok: false, status, error }` (mensaje del backend) |
| `4xx`/`5xx` con `{ error, field }` | `{ ok: false, status, error, field }` |
| `4xx`/`5xx` sin body | `{ ok: false, status, error: fallbackError }` |
| `fetch` rechaza (fallo de red) | `{ ok: false, status: 0, error: fallbackError }` |

#### `field` — el campo culpable de un error de validación (feature 31)

`field` es **opcional** en `ApiFailure` (`field?: string`). Existe porque el
backend acompaña sus `422` —y algún `409`, como el email duplicado de §10.3— con
el nombre del campo rechazado: `{ error: 'email requerido', field: 'email' }`.
Sin él, una pantalla solo puede marcar en rojo lo que valide su propio cliente.

Reglas:

- **Solo aparece la clave si el body la trae** como string no vacío. Un `422` sin
  `field`, un `5xx` sin body y un fallo de red devuelven exactamente
  `{ ok, status, error }`, sin `field: undefined`. Un `field` que no sea string
  (o que venga en blanco) se ignora.
- El valor es el **nombre que usa el backend**, sin traducir: `'email'`,
  `'password'`, `'role'`, `'file'`, `'seccion'`, `'orden'`… Mapearlo al input del
  formulario es responsabilidad del consumidor.
- **Es aditivo**: `error` sigue llegando siempre, así que un consumidor que solo
  pinte `error` no cambia de comportamiento. Hoy lo son `BlogIndex` y
  `LeadsList`, que ignoran `field`. El primero que lo aprovecha es `UserDialog`
  (feature 32), que lo mapea al input del formulario.

Notas:

- **No lanza**, igual que los helpers que envuelve (`docs/context.md` §3).
  `status: 0` significa que no hubo respuesta HTTP.
- **No cambia el contrato HTTP**: mismas URLs, métodos, headers y cookies. Solo
  normaliza la forma del resultado en el cliente.
- **Es aditivo**: los helpers de la tabla anterior conservan su firma
  `{ ok, status, data }`. La migración de consumidores es **incremental**; hoy
  usan `normalizeApi` `BlogIndex` (`publicJson`), `LeadsList` y la pantalla de
  usuarios (`apiJson`), y el resto sigue con la forma cruda.

### Autenticación

Cookie de sesión emitida por el backend en `POST /api/auth/login`. **No se
guarda ningún token en el cliente.** Los endpoints privados responden `401` si
la cookie falta o expiró; `AdminGuard` traduce eso en una redirección a
`/admin/login`.

---

## 2. Público

### `POST /api/contact` — crear lead

Helper: `postLead(payload)`. Sin cookies.

Request:

```ts
{
  nombre?:   string
  empresa?:  string
  email:     string     // ÚNICO obligatorio. Valida contra EMAIL_RE
  telefono?: string     // formato E.164: PHONE_RE = /^\+\d{7,15}$/
  industria?: string    // valor del catálogo de src/lib/industries.ts
  mensaje?:  string
  tipo?:     'demo' | 'email' | 'contacto'
}
```

Respuestas:

| Status | Body | Significado |
|--------|------|-------------|
| `200`/`201` | `{ ok: true, id: number }` | Lead creado |
| `422` | `{ error: string }` | Validación rechazada por el backend |
| `5xx` | `{ error: string }` o sin body | Error del servidor |

Notas: el teléfono se **normaliza en el cliente** (se quitan espacios, guiones y
paréntesis) antes de validar contra `PHONE_RE`. El país (`pais`, `pais_iso`) no
se envía: lo deriva el backend del teléfono y aparece luego en `AdminLead`.

### `GET /api/articles` — artículos publicados

Helper: `listPublicArticles({ limit?, offset? })`. `credentials: 'omit'`.

Query: `limit`, `offset` (ambos opcionales, se omiten si son `null`/`undefined`).

`200` → `{ rows: PublicArticle[] }`

Solo devuelve artículos con `status = 'published'`. El filtro es del backend: el
frontend no lo aplica ni debe asumir lo contrario.

### `GET /api/articles/:slug` — artículo público por slug

Helper: `getPublicArticleBySlug(slug)`. El slug va `encodeURIComponent`.

| Status | Body |
|--------|------|
| `200` | `{ article: PublicArticle }` |
| `404` | `{ error: string }` |

---

## 3. Auth (`/api/auth/*`)

Todos vía `apiJson` → `credentials: 'include'`.

| Método | Ruta | Helper | Request | `200` |
|--------|------|--------|---------|-------|
| `POST` | `/api/auth/login` | `login(email, password)` | `{ email, password }` | `{ ok: true, user: AdminUser }` |
| `POST` | `/api/auth/logout` | `logout()` | — | `{ ok: true }` |
| `GET` | `/api/auth/me` | `getMe()` | — | `{ user: AdminUser }` |

Errores: `401` con `{ error: string }` (credenciales inválidas o sesión ausente).

`login` establece la cookie de sesión; `logout` la invalida. `getMe` es la
comprobación que hace `AdminGuard` en cada montaje del área privada.

---

## 4. Admin — leads (`/api/admin/leads`)

Privados (`credentials: 'include'`). `401` si no hay sesión.

### `GET /api/admin/leads` — listado filtrable

Helper: `listAdminLeads(filters)`. Los parámetros vacíos **no se envían**.

| Query | Tipo | Nota |
|-------|------|------|
| `q` | string | Búsqueda libre |
| `tipo` | `'demo' \| 'email' \| 'contacto'` | |
| `pais_iso` | string | ISO del país |
| `limit` | number | Se envía también si es `0` |
| `offset` | number | Se envía también si es `0` |

`200` → `{ rows: AdminLead[], total: number, limit: number, offset: number }`

La paginación es responsabilidad del servidor: `total` es el total **sin**
paginar.

### `GET /api/admin/leads/:id` — detalle

`200` → `{ lead: AdminLead }` · `404` → `{ error: string }`

---

## 4 bis. Admin — usuarios (`/api/admin/users`) — **vigente**

Privados y **solo rol `admin`**: las cinco rutas pasan por
`requireAuth + requireRole('admin')`. Un `editor` recibe `403` (ojo con su forma,
§10.1). Consumidos desde la **feature 32**.

| Método | Ruta | Helper | Request | OK |
|--------|------|--------|---------|-----|
| `GET` | `/api/admin/users` | `listAdminUsers()` | — | `200 { rows: AdminUserRow[] }` |
| `GET` | `/api/admin/users/:id` | `getAdminUser(id)` | — | `200 { user }` |
| `POST` | `/api/admin/users` | `createAdminUser(payload)` | `UserCreateInput` | `201 { user }` |
| `PATCH` | `/api/admin/users/:id` | `updateAdminUser(id, patch)` | `UserPatchInput` | `200 { user }` |
| `DELETE` | `/api/admin/users/:id` | `deleteAdminUser(id)` | — | `204` **sin cuerpo** |

```ts
interface AdminUserRow extends AdminUser { created_at: string }   // id, email, name, role, created_at

interface UserInput { email: string; name: string; role: 'admin' | 'editor'; password?: string }
type UserCreateInput = UserInput & { password: string }   // password OBLIGATORIO
type UserPatchInput  = Partial<UserInput>                 // password OPCIONAL: omitirlo conserva la actual
```

**`password_hash` nunca sale por la API** y no se modela en el front.
`password` solo viaja de subida.

Tres asimetrías respecto a `/api/admin/leads`, todas verificadas en el backend:

1. **El listado es `{ rows }` sin paginación.** No hay `total`, `limit` ni
   `offset`; el orden es fijo (`id ASC`). Una pantalla de usuarios **no** lleva
   `TablePagination`.
2. **`GET /api/admin/users` no acepta ningún parámetro de query.** No hay `?q=`:
   `usersRouter.js` no lee `req.query` y `listUsers` es un `SELECT` sin `WHERE`.
   La búsqueda de la pantalla filtra **en cliente** sobre las filas ya cargadas.
3. **`DELETE` responde `204` sin cuerpo**, así que `apiJson` devuelve
   `data: null` y `normalizeApi(…, 'ok')` lo leería como fallo. El helper
   `deleteAdminUser` sintetiza el `{ ok: true }` que el `204` no trae, **y solo
   si la respuesta fue 2xx** — un error sin body sigue siendo un error. Mismo
   molde para los `DELETE` de imágenes y precios.

Errores, con `field` cuando aplica (lo propaga `ApiFailure`, ver §1):

| Status | Body | Nota |
|--------|------|------|
| `422` | `{ error: 'email requerido', field: 'email' }` | ídem `password`, ídem `role` |
| `422` | `{ error: 'Nada que actualizar: se esperaba email, name, role o password' }` | sin `field` |
| `409` | `{ error: 'El email ya está en uso', field: 'email' }` | alta y edición |
| `409` | `{ error: 'No puedes eliminar tu propio usuario' }` | ver abajo |
| `409` | `{ error: 'No puedes eliminar al último usuario con rol admin' }` | ver abajo |
| `404` | `{ error: 'Usuario no encontrado' }` | también con un `:id` no numérico o desbordado |
| `403` | `{ ok: false, error: 'forbidden', message }` | forma anómala, §10.1 |

**Las dos reglas de negocio del borrado, y qué le toca a cada lado:**

1. **Usuario propio** — la UI lo **previene**: deshabilita el borrado de la fila
   del usuario en sesión (`useOutletContext<AdminUser>()` da su `id`). La
   petición no llega a salir.
2. **Último admin** — la UI **no puede saberlo** de antemano de forma fiable, así
   que se muestra el mensaje del `409` cuando llega. El copy del diálogo de
   confirmación lo advierte de antemano.

`articles.author_id → users(id) ON DELETE SET NULL`: borrar un usuario **no**
borra sus artículos, les deja el autor a `NULL`. El copy del borrado lo dice.

## 4 ter. Imágenes (`/api/images` + `/api/admin/images`) — **vigente**

Consumidas desde la **feature 33**. Tabla `images`; el objeto de respuesta tiene
**exactamente estos 9 campos** (el `bytes` con el binario **nunca** sale por la
API):

```
id, seccion, filename, mime_type, size_bytes, alt, orden, created_at, updated_at
```

| Método | Ruta | Helper | Auth | OK |
|---|---|---|---|---|
| `GET` | `/api/images?seccion=` | `listImages({ seccion? })` | **pública** | `200 { rows: AdminImage[] }` |
| `GET` | `/api/images/:id/raw` | `imageRawUrl(id)` (solo la URL) | **pública** | el binario |
| `POST` | `/api/admin/images` | `createAdminImage(input)` | cookie, **solo `admin`** | `201 { image }` |
| `PATCH` | `/api/admin/images/:id` | `updateAdminImage(id, patch)` | cookie, **solo `admin`** | `200 { image }` |
| `DELETE` | `/api/admin/images/:id` | `deleteAdminImage(id)` | cookie, **solo `admin`** | `204` **sin cuerpo** |

```ts
type ImageSeccion = 'hero' | 'cta_final';   // enum de aplicación, no de BD

interface AdminImage {
  id: string;                 // BIGSERIAL sin castear: llega como string
  seccion: ImageSeccion;
  filename: string; mime_type: string; size_bytes: number;
  alt: string | null;
  orden: number;
  created_at: string; updated_at: string;
}

interface ImageUploadInput { file: File; seccion: ImageSeccion; alt?: string; orden?: number }
interface ImagePatchInput  { alt?: string | null; orden?: number; seccion?: ImageSeccion }
```

**El listado es el endpoint público.** No existe ninguno bajo `/api/admin/`, así
que el panel usa el mismo `GET /api/images` que la landing —misma asimetría que
precios (§10.4)—, vía `publicJson` (`credentials: 'omit'`). Responde `{ rows }`
**sin paginación**, con orden fijo `orden ASC, id ASC`; el parámetro `seccion`
filtra en el servidor. Una pantalla de imágenes **no** lleva `TablePagination`.

**No hay CDN ni carpeta estática, y el JSON no trae ningún campo `url`.** La URL
pública de una imagen **es** `${API_BASE}/api/images/${id}/raw`, y la construye
`imageRawUrl(id)` en `src/lib/api.ts` para que `VITE_API_BASE` se aplique en un
solo sitio. Sin `Cache-Control` ni `ETag`: cada carga es un hit a la BD leyendo
el `BYTEA`.

### El `POST` es `multipart/form-data`, y por eso `apiJson` no vale

Campo de archivo **`file`**, un solo archivo. Campos: `file` (obligatorio),
`seccion` (obligatorio), `alt` (opcional, máx 300), `orden` (opcional, entero
≥ 0, default 0). `alt` y `orden` se **omiten** del `FormData` si no se rellenan,
en vez de mandarse vacíos.

`apiJson` fija `Content-Type: application/json`; el `Content-Type` correcto aquí
es `multipart/form-data; boundary=…` y **el boundary solo lo conoce el
navegador**, que lo genera al serializar el `FormData`. Fijar la cabecera a mano
deja al backend sin boundary y multer no puede parsear el body. Por eso
`src/lib/api.ts` tiene un cuarto transporte, `apiUpload`: mismo
`credentials: 'include'` y misma forma `{ ok, status, data }` que `apiJson`,
tampoco lanza, y **no fija ninguna cabecera** (ni acepta `headers` desde fuera).
Nunca un `fetch` suelto en el componente.

**Límites:** 5 MB por archivo; MIME permitidos `image/png`, `image/jpeg`,
`image/webp`. **SVG está excluido a propósito** (XSS almacenado) — no ofrecerlo en
el `accept`. Doble validación en el servidor: MIME declarado + coherencia con la
extensión, y además **magic bytes** que deben coincidir con el MIME declarado (un
`.jpg` renombrado a `.png` se rechaza con `415`). El cliente valida tipo,
extensión y tamaño **antes de subir** (`validateImageFile`) para no gastar ancho
de banda en un envío condenado; los magic bytes solo se comprueban allí.

**El `PATCH` es JSON y solo admite `alt`, `orden` y `seccion`.** El binario,
`mime_type`, `filename` y `size_bytes` son **inmutables**: cambiar la imagen es
`POST` nuevo + `DELETE` del viejo. **Por eso la UI no ofrece «reemplazar
imagen».** El `DELETE` responde `204` sin cuerpo (borrado físico, sin papelera),
así que `deleteAdminImage` sintetiza el `{ ok: true }` con el mismo molde que
`deleteAdminUser` (§4 bis, asimetría 3).

Errores:

| Status | Body | Nota |
|--------|------|------|
| `413` | `{ error }` o **sin cuerpo** | Archivo demasiado grande. Multer corta antes del handler, así que puede llegar vacío |
| `415` | `{ error }` | Tipo no permitido, incluido el desajuste de magic bytes |
| `422` | `{ error, field }` con `field` en `file` \| `seccion` \| `orden` | `alt` no aparece: se trunca, no se rechaza |
| `404` | `{ error: 'Imagen no encontrada' }` | |
| `403` | `{ ok: false, error: 'forbidden', message }` | forma anómala, §10.1 → `adminErrorMessage` |

⚠️ El archivo se sube **completo** antes de validar `seccion` (multer corre antes
del handler), así que un `422` por `seccion` llega tras consumir el ancho de banda.

⚠️ **El rol `editor` no puede escribir imágenes.** Las tres rutas de escritura
exigen `requireRole('admin')` a secas, a diferencia del CRUD de artículos.

## 4 quater. Precios (`/api/precios` + `/api/admin/precios`) — **vigente**

Consumidos desde la **feature 34**. Tabla `planes`; el objeto `plan` (`toPlan()`,
`src/precios.js:91-116`) tiene **exactamente estos 14 campos**:

```
id, nombre, precio_mensual, descuento_pct, precio_anual, ahorro_anual,
vinetas, vinetas_tachadas, destacado, trial_texto, es_custom, orden,
created_at, updated_at
```

| Método | Ruta | Helper | Auth | OK |
|---|---|---|---|---|
| `GET` | `/api/precios` | `listPlanes()` | **pública** | `200 { rows: AdminPlan[] }` |
| `GET` | `/api/admin/precios/:id` | `getAdminPlan(id)` | cookie, **solo `admin`** | `200 { plan }` |
| `POST` | `/api/admin/precios` | `createAdminPlan(input)` | cookie, **solo `admin`** | `201 { plan }` |
| `PATCH` | `/api/admin/precios/:id` | `updateAdminPlan(id, patch)` | cookie, **solo `admin`** | `200 { plan }` |
| `DELETE` | `/api/admin/precios/:id` | `deleteAdminPlan(id)` | cookie, **solo `admin`** | `204` **sin cuerpo** |
| ~~`GET`~~ | ~~`/api/admin/precios`~~ | — | — | **NO EXISTE** (ver aviso) |

> ⚠️ **No hay listado bajo `/api/admin/`.** Verificado contra el servidor vivo el
> 2026-07-31 y en la fuente (`preciosRouter.js` solo declara el `GET` sobre
> `/:id`): `GET /api/admin/precios` responde **`404`**, no `401` — la ruta no
> existe, no es un problema de sesión. **Para listar planes en el panel se usa el
> endpoint público `GET /api/precios`**, igual que la landing, vía `publicJson`
> (`credentials: 'omit'`). Misma asimetría que imágenes (§4 ter), pero aquí ni
> siquiera hay un listado privado al que caer. Responde `{ rows }` **sin
> paginación**, con orden fijo `orden ASC, id ASC`, así que la pantalla de precios
> **no** lleva `TablePagination`.

```ts
interface AdminPlan {
  id: string;                 // BIGSERIAL sin castear: llega como string
  nombre: string;
  precio_mensual: number;     // 0 en un plan Custom, NO null (ver discrepancia)
  descuento_pct: number;
  precio_anual: number | null;   // DERIVADO, solo lectura. null si es_custom
  ahorro_anual: number | null;   // DERIVADO, solo lectura. null si es_custom
  vinetas: string[]; vinetas_tachadas: string[];   // columnas JSONB
  destacado: boolean;
  trial_texto: string | null;
  es_custom: boolean;
  orden: number;
  created_at: string; updated_at: string;
}

// Campos escribibles = los CAMPOS_EDITABLES del backend. Los dos derivados se
// OMITEN del tipo: enviarlos no compila.
type PlanInput =
  & Omit<AdminPlan, 'id' | 'created_at' | 'updated_at' | 'precio_anual' | 'ahorro_anual'
                  | 'precio_mensual' | 'descuento_pct'>
  & Partial<Pick<AdminPlan, 'precio_mensual' | 'descuento_pct'>>;

type PlanPatchInput = Partial<PlanInput>;
```

### Los dos campos derivados, y su aritmética exacta (`src/precios.js:64-71`)

- `precio_anual = Math.round(precio_mensual * (1 - descuento_pct / 100))`.
  **Es el precio mensual facturando anualmente, no el total del año.**
- `ahorro_anual = Math.round((precio_mensual - precio_anual) * 12)`.
- **Si `es_custom` es `true`, ambos son `null`.** Ese es el caso `Enterprise`.

Reproduce la aritmética que la landing muestra hoy: `(19 − 17) × 12 = 24`, el
«Ahorras $24/año» de `Pricing.tsx`. El `Math.round()` es decisión deliberada del
backend. `src/lib/api.ts` lo reimplementa en `derivarPrecios()` **solo** para la
vista previa del formulario: el listado pinta los derivados que ya vienen en la
respuesta.

**`precio_anual` y `ahorro_anual` no se editan y no se envían nunca**, ni en el
`POST` ni en el `PATCH`. Se editan `precio_mensual` y `descuento_pct`, y los otros
dos se muestran calculados. Un formulario que los ofrezca como campos editables
está contradiciendo el modelo; un helper que los mande está inventando campos de
escritura que no existen. El `PATCH` los ignora, y un body que **solo** los traiga
responde `422 { error: 'Nada que actualizar: se esperaba …' }` sin `field`.

> ⚠️ **Discrepancia entre `API_READY.md` y el código del backend, verificada en la
> fuente.** El handoff dice que en un plan Custom vienen en `null` **tres**
> campos: `precio_mensual`, `precio_anual` y `ahorro_anual`. El código solo anula
> **dos** (`src/precios.js:97-98`); `precio_mensual` pasa por `toNumber()`
> (`:48-51`), que convierte `null` en **`0`**.
>
> **Regla segura para el front: no te fíes de los nulos, comprueba `es_custom`
> antes de pintar cualquier cifra.** Fiarse del nulo pinta «$0» en el plan
> Enterprise, justo lo que el handoff dice querer evitar. Vale también para los
> formularios: volcar ese `0` en el campo «precio mensual» reintroduce el «$0» por
> la puerta de atrás.

### Un plan a convenir **omite** las cifras, no las manda en `null`

`validarPlan` pasa `precio_mensual` y `descuento_pct` por `parseDecimal`
(`preciosRouter.js:47-54`), que **rechaza `null`**: mandar
`{ precio_mensual: null }` devuelve
`422 { error: 'precio_mensual debe ser un número', field: 'precio_mensual' }`.

Lo correcto es **omitir ambos campos** cuando `es_custom` es `true`: un campo
`undefined` se salta la validación, el `POST` aplica el default de `withDefaults`
(`0`) y el `PATCH` conserva lo guardado. Por eso `PlanInput` los declara
opcionales y **nunca nulables**.

**Límites y normalización del backend:** `nombre` obligatorio en el `POST` y
truncado a 120 (`PLAN_NOMBRE_MAX`); `trial_texto` truncado a 200
(`PLAN_TRIAL_MAX`) y nulable; `precio_mensual` entre `0` y `99999999.99`
(`NUMERIC(10,2)`); `descuento_pct` entre `0` y `100`; `orden` entero ≥ 0, con
literalmente el mismo mensaje que imágenes (`ORDEN_ERROR`); `vinetas` y
`vinetas_tachadas` deben ser arrays de strings (las columnas son `JSONB` y
aceptarían cualquier cosa sin esta validación).

Errores:

| Status | Body | Nota |
|---|---|---|
| `422` | `{ error, field }` con `field` en `nombre` \| `precio_mensual` \| `descuento_pct` \| `vinetas` \| `vinetas_tachadas` \| `destacado` \| `es_custom` \| `orden` | `trial_texto` **no** aparece: se trunca, no se rechaza |
| `422` | `{ error: 'Nada que actualizar: se esperaba …' }` | `PATCH` sin ningún campo editable; sin `field` |
| `404` | `{ error: 'Plan no encontrado' }` | también con un `:id` no numérico o desbordado |
| `403` | `{ ok: false, error: 'forbidden', message }` | forma anómala, §10.1 → `adminErrorMessage` |

⚠️ **`destacado` y `es_custom` llegan como `field` pero son `Switch` en la UI**:
no tienen `helperText` donde pintar el mensaje. El consumidor los deja caer al
aviso global en vez de escribirlos en un slot que nadie renderiza — es la razón de
que el mapeo `field → input` sea una **tabla explícita** y no un cast (§1).

El `DELETE` responde `204` sin cuerpo, así que `deleteAdminPlan` sintetiza el
`{ ok: true }` con el mismo molde que `deleteAdminUser` (§4 bis, asimetría 3).

⚠️ **Las tablas están creadas pero VACÍAS y no hay seed**: `GET /api/precios`
responde `200 { "rows": [] }` hasta que se carguen planes **desde el panel**. Por
eso la pantalla de admin ofrece alta y borrado además de edición: sin `POST` no
hay forma de que la landing (feature 35) llegue a tener precios que mostrar.

## 5. Admin — artículos (`/api/admin/articles`)

Privados (`credentials: 'include'`).

| Método | Ruta | Helper | Request | `200` |
|--------|------|--------|---------|-------|
| `GET` | `/api/admin/articles` | `listAdminArticles()` | — | `{ rows: AdminArticle[] }` |
| `GET` | `/api/admin/articles/:id` | `getAdminArticle(id)` | — | `{ article: AdminArticle }` |
| `POST` | `/api/admin/articles` | `createAdminArticle(input)` | `ArticleInput` | `{ article: AdminArticle }` |
| `PATCH` | `/api/admin/articles/:id` | `updateAdminArticle(id, patch)` | `Partial<ArticleInput>` | `{ article: AdminArticle }` |
| `DELETE` | `/api/admin/articles/:id` | `deleteAdminArticle(id)` | — | `{ ok: true }` |

`ArticleInput`:

```ts
{
  slug?:      string   // si se omite, lo deriva el backend del title
  title:      string   // obligatorio
  excerpt?:   string
  body_md:    string   // obligatorio (Markdown con GFM)
  cover_url?: string
  status?:    'draft' | 'published'
}
```

Errores esperados: `401` sin sesión, `404` id inexistente, `409` slug duplicado,
`422` validación.

---

## 6. Modelos

```ts
type LeadType      = 'demo' | 'email' | 'contacto';
type ArticleStatus = 'draft' | 'published';

interface AdminUser {
  id: number; email: string; name: string;
  role: 'admin' | 'editor';
}

interface AdminLead {
  id: number;
  nombre: string; empresa: string; email: string; telefono: string;
  pais: string; pais_iso: string;      // derivados por el backend
  industria: string; mensaje: string;
  tipo: LeadType;
  created_at: string;                   // ISO 8601
}

interface AdminArticle {               // ← fuente de verdad de artículos
  id: number;
  slug: string; title: string;
  excerpt: string | null;
  body_md: string;
  cover_url: string | null;
  status: ArticleStatus;
  author_id: number | null;
  published_at: string | null;          // ISO 8601
  created_at: string; updated_at: string;
}

// Subconjunto expuesto públicamente: omite status, author_id y author.
type PublicArticle = Pick<AdminArticle,
  'id' | 'slug' | 'title' | 'excerpt' | 'body_md' |
  'cover_url' | 'published_at' | 'created_at' | 'updated_at'
>;
```

**`PublicArticle` se deriva, no se duplica.** Si el backend cambia
`AdminArticle`, se toca un solo tipo.

---

## 7. Validación compartida

Exportadas desde `src/lib/api.ts` y usadas por `ContactModal` y `Login`:

```ts
EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
PHONE_RE = /^\+\d{7,15}$/          // E.164, tras normalizar
```

El cliente valida para dar feedback inmediato; **el backend valida de verdad**.
Un `422` siempre debe mostrarse al usuario, nunca asumirse imposible.

---

## 8. Cómo se testea este contrato

No se mockea `src/lib/api.ts`: los tests interceptan `globalThis.fetch` con
`vi.spyOn` y devuelven `Response` reales, comprobando URL, método y payload en
`fetch.mock.calls`. Así, un cambio de contrato rompe el test. Detalle en
`docs/verification.md` §4.

---

## 9. Añadir un endpoint

1. Confirma que **existe en el backend**. Si no, es un bloqueo: documéntalo en
   `progress/current.md` y marca la feature `blocked`.
2. Documéntalo aquí (ruta, método, request, respuestas, errores).
3. Añade el helper en `src/lib/api.ts` usando `apiJson` o `publicJson` según
   necesite cookie. Nunca un `fetch` suelto en un componente.
4. Añade el test con `vi.spyOn(globalThis, 'fetch')`.

---

## 10. Recursos en maquetación (usuarios, imágenes, precios)

> **Ya no queda nada en maquetación.** Usuarios se cableó en la feature 32
> (→ §4 bis), imágenes en la 33 (→ §4 ter) y precios en la 34 (→ §4 quater). Las
> features 27-30 maquetaron los tres con **datos mock locales** y **sin tocar
> `src/lib/api.ts`**, por decisión explícita del humano (2026-07-29); esta sección
> se conserva como registro de qué se acordó y qué se dio por supuesto antes de
> cablear, no como contrato vigente.
>
> Estado del backend verificado en `/var/www/html/maia-landing-back` el 2026-07-29;
> informe completo con rutas y líneas en `progress/explore_backend_cruds.md`.

| Recurso | Endpoints en el backend | ¿Consumible? |
|---|---|---|
| **Imágenes** | Los 5 existen | **Sí, ya cableado (feature 33) — contrato en §4 ter** |
| **Usuarios** | Los 5 existen | **Sí, ya cableado (feature 32) — contrato en §4 bis** |
| **Precios** | Los 5 existen (uno de ellos, el listado, **público**) | **Sí, ya cableado (feature 34) — contrato en §4 quater** |

### 10.1 Dos avisos que afectan al código del front cuando se cablee

**El 403 no tiene la forma habitual.** `requireRole` responde
`{ "ok": false, "error": "forbidden", "message": "No tienes permisos…" }`
(`src/roles.js:43-47`), mientras el resto del backend usa `{ "error": "<mensaje>" }`.
Es decir: en un 403 el campo `error` trae el token `"forbidden"`, no un mensaje
legible, y el texto para el usuario está en `message`. Un
`normalizeApi(...)` pintando `res.error` mostrará literalmente «forbidden». Hay que
tratarlo al añadir los helpers.

> Resuelto en la **feature 32**: `src/lib/api.ts` exporta
> `adminErrorMessage(res: ApiFailure)`, que traduce el `403` a `FORBIDDEN_ERROR` y
> devuelve `res.error` en cualquier otro caso. Úsalo al pintar errores de los
> endpoints privados en vez de repetir la comprobación de `status`.

**El rol `editor` no puede escribir imágenes.** Las tres rutas de escritura de
imágenes exigen `requireRole('admin')` a secas, a diferencia del CRUD de artículos
que admite `('admin','editor')`.

### 10.2 Imágenes — **movido al §4 ter**

El contrato de imágenes dejó de ser «en maquetación» el 2026-07-31: la
**feature 33** lo cableó y su descripción vigente (las cinco rutas, los tipos, el
`multipart` y por qué necesita su propio transporte, la URL pública construida a
partir del `id`, los límites y la tabla de errores) vive ahora en **§4 ter**,
junto al resto de endpoints que el front consume de verdad. No dupliques aquí
nada de aquello: si algo cambia, se cambia en §4 ter.

Lo que decía esta sección era exacto y se verificó punto por punto al cablear;
las dos únicas cosas que no se sabían de antemano fueron que un `413` puede
llegar **sin cuerpo** (multer corta antes del handler) y que el `id` llega como
**string**, igual que en precios.

### 10.3 Usuarios — **movido al §4 bis**

El contrato de usuarios dejó de ser «en maquetación» el 2026-07-31: la
**feature 32** lo cableó y su descripción vigente (rutas, tipos, errores, las tres
asimetrías con leads y las dos reglas del borrado) vive ahora en **§4 bis**, junto
al resto de endpoints que el front consume de verdad. No dupliques aquí nada de
aquello: si algo cambia, se cambia en §4 bis.

Se conservan abajo, como registro, las notas de cuando el router estaba en vuelo.

### 10.3.1 Usuarios — lo que decía antes (histórico)

La tabla existe, así que **los campos son fiables**:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | número | |
| `email` | string | único, siempre lowercase + trim |
| `name` | string \| null | truncado a 120 |
| `role` | `'admin' \| 'editor'` | default `'editor'`. **Sin CHECK en la BD**: el enum se valida solo en código |
| `created_at` | ISO string | |

**`password_hash` nunca sale por la API** y no debe modelarse en el front. No hay
`updated_at`, ni `active`/`deleted_at`, ni `last_login`.

`articles.author_id → users(id) ON DELETE SET NULL`: borrar un usuario **no** borra
sus artículos, les pone el autor a `NULL`. La UI de borrado debe decirlo.

**Todo esto ya está resuelto por §10.3** y se deja solo como registro de lo que se
inferió antes de que el backend escribiera el router: las rutas
`/api/admin/users[/:id]` existen, el listado es `{ rows }` sin paginación, el `409`
por email duplicado está, y `password` es opcional en el `PATCH`. Las cuatro
inferencias resultaron correctas; lo que **no** se anticipó fueron las dos reglas de
negocio del borrado (usuario propio y último `admin`).

**Permisos, decisión del backend ya tomada pero no aplicada:** el rol `editor` debe
poder eliminar publicaciones, pero hoy `DELETE /api/admin/articles/:id` sigue
exigiendo `admin` (ver §5). Cuando el backend lo relaje, empezará a funcionar sin
cambios en el front. **No conviene ocultar ese botón por rol de forma permanente.**

### 10.4 Precios — **movido al §4 quater**

El contrato de precios dejó de ser «en maquetación» el 2026-07-31: la
**feature 34** lo cableó y su descripción vigente (las cinco rutas, los 14 campos,
los dos derivados con su aritmética, la asimetría del listado público, la
discrepancia del plan Custom, los límites y la tabla de errores) vive ahora en
**§4 quater**, junto al resto de endpoints que el front consume de verdad. No
dupliques aquí nada de aquello: si algo cambia, se cambia en §4 quater.

Se conserva abajo, como registro, lo que se creyó antes de cablear.

#### 10.4.1 Errores de la propuesta original, para que nadie los reintroduzca

Esta sección llegó a proponer un mapeo inventado, escrito cuando en el backend no
existía nada de precios. El contrato real (commit `f878d0b`, leído de la fuente el
2026-07-30) difiere en puntos de fondo:

| Se propuso | La realidad |
|---|---|
| Campos en inglés (`name`, `monthly`, `annual`) | **Campos en español**: `nombre`, `precio_mensual`, `precio_anual` |
| Ruta `/api/admin/prices` | **`/api/admin/precios`**, y la pública `/api/precios` |
| `discount_pct` **global** para toda la sección | **`descuento_pct` es POR PLAN** |
| `annual` y `saving` **almacenados** | **`precio_anual` y `ahorro_anual` son DERIVADOS**, no se guardan ni se envían |
| `Enterprise` como `monthly: 0` = «a convenir» | **`es_custom: boolean`**, un campo propio |
| `features` / `dim` como `string[]` sueltos | **`vinetas` / `vinetas_tachadas`, columnas `JSONB`** |

#### 10.4.2 Lo que se anticipó bien, y lo que no

Se anticiparon correctamente la asimetría del listado (el `404` de
`GET /api/admin/precios`, verificado contra el servidor vivo), el `id` como
**string** (`BIGSERIAL` sin castear), los precios como `number` y no como
`"19.00"`, y la discrepancia del plan Custom (`precio_mensual: 0`, no `null`).

Lo que **no** se anticipó y salió al leer la fuente al cablear: que
`precio_mensual: null` **se rechaza con un `422`** (`parseDecimal`), así que un
plan a convenir tiene que **omitir** las cifras en vez de mandarlas nulas
(detalle en §4 quater).

Siguen vigentes dos datos de contexto que no son contrato:

- **Las tablas están creadas pero VACÍAS y no hay seed.** `GET /api/precios` y
  `GET /api/images` responden `200 { "rows": [] }`; los datos se cargan desde el
  panel de administración. Conectar la landing sin cargarlos antes dejaría la
  sección de precios y el carrusel del Hero **en blanco** (features 35 y 36).
- El servidor local es el **:3002** (no el 3001 que dice la doc del backend), y el
  rol `editor` ya puede eliminar publicaciones (la relajación de permisos que
  §10.3 daba por pendiente).

**La relación con la landing:** `src/components/sections/Pricing.tsx` sigue con su
array `plans` hard-coded y **no se tocó** en la feature 34. Conectarla es la
feature 35; el mapeo contra el contrato real sería `nombre → name`,
`precio_mensual → monthly`, `precio_anual → annual`, `ahorro_anual → saving` (hoy
un string libre en el front), `vinetas → features`, `vinetas_tachadas → dim`,
`destacado → featured`, `trial_texto → trial`, y `es_custom` como el caso sin
precio.
