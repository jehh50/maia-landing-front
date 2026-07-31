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
  `LeadsList`, que ignoran `field`.

Notas:

- **No lanza**, igual que los helpers que envuelve (`docs/context.md` §3).
  `status: 0` significa que no hubo respuesta HTTP.
- **No cambia el contrato HTTP**: mismas URLs, métodos, headers y cookies. Solo
  normaliza la forma del resultado en el cliente.
- **Es aditivo**: los helpers de la tabla anterior conservan su firma
  `{ ok, status, data }`. La migración de consumidores es **incremental**; hoy
  usan `normalizeApi` `BlogIndex` (`publicJson`) y `LeadsList` (`apiJson`), y el
  resto sigue con la forma cruda.

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

> **Nada de esta sección se consume todavía.** Las features 27-30 maquetan las tres
> vistas del admin con **datos mock locales** y **sin tocar `src/lib/api.ts`**, por
> decisión explícita del humano (2026-07-29). Esta sección existe para que el
> cableado futuro sea mecánico y para dejar por escrito qué está acordado y qué no.
>
> Estado del backend verificado en `/var/www/html/maia-landing-back` el 2026-07-29;
> informe completo con rutas y líneas en `progress/explore_backend_cruds.md`.

| Recurso | Endpoints en el backend | ¿Consumible? |
|---|---|---|
| **Imágenes** | Los 5 existen y funcionan, pero **sin commitear, sin tests y sin desplegar** | No todavía; contrato **cerrado** |
| **Usuarios** | **Ninguno.** Solo la tabla `users` y dos scripts CLI | No; campos fiables, rutas por definir |
| **Precios** | **Nada**: ni tabla, ni módulo, ni modelo de datos decidido | No; propuesta nuestra, sin confirmar |

### 10.1 Dos avisos que afectan al código del front cuando se cablee

**El 403 no tiene la forma habitual.** `requireRole` responde
`{ "ok": false, "error": "forbidden", "message": "No tienes permisos…" }`
(`src/roles.js:43-47`), mientras el resto del backend usa `{ "error": "<mensaje>" }`.
Es decir: en un 403 el campo `error` trae el token `"forbidden"`, no un mensaje
legible, y el texto para el usuario está en `message`. Un
`normalizeApi(...)` pintando `res.error` mostrará literalmente «forbidden». Hay que
tratarlo al añadir los helpers.

**El rol `editor` no puede escribir imágenes.** Las tres rutas de escritura de
imágenes exigen `requireRole('admin')` a secas, a diferencia del CRUD de artículos
que admite `('admin','editor')`.

### 10.2 Imágenes — contrato real (cerrado, aún no desplegado)

Tabla `images`; el objeto de respuesta tiene **exactamente estos 9 campos** (el
`bytes` con el binario **nunca** sale por la API):

```
id, seccion, filename, mime_type, size_bytes, alt, orden, created_at, updated_at
```

| Método | Ruta | Auth | Rol |
|---|---|---|---|
| `GET` | `/api/images?seccion=` | pública | — |
| `GET` | `/api/images/:id/raw` | pública | — |
| `POST` | `/api/admin/images` | cookie | **solo `admin`** |
| `PATCH` | `/api/admin/images/:id` | cookie | **solo `admin`** |
| `DELETE` | `/api/admin/images/:id` | cookie | **solo `admin`** |

- `seccion` es un enum de aplicación: **`'hero'` | `'cta_final'`**. Añadir una tercera
  es añadir un string en el backend, no un cambio de esquema.
- Listado envuelto en **`{ rows }`**, **sin paginación**, orden fijo
  `orden ASC, id ASC`. Detalle en **`{ image }`**.
- **No hay CDN ni carpeta estática.** La URL pública de una imagen **es**
  `${API_BASE}/api/images/${id}/raw`, construida en el front con `VITE_API_BASE`.
  El JSON **no devuelve ningún campo `url`**. Sin `Cache-Control` ni `ETag`: cada
  carga es un hit a la BD leyendo el `BYTEA`.
- **`POST` es `multipart/form-data`**, campo de archivo **`file`**, un solo archivo.
  No fijar `Content-Type` a mano: el navegador genera el boundary del `FormData`.
  Campos: `file` (obligatorio), `seccion` (obligatorio), `alt` (opcional, máx 300),
  `orden` (opcional, entero ≥ 0, default 0).
- **Límites:** 5 MB por archivo; MIME permitidos `image/png`, `image/jpeg`,
  `image/webp`. **SVG está excluido a propósito** (XSS almacenado) — no ofrecerlo en
  el `accept`. Doble validación: MIME declarado + coherencia con la extensión, y
  además **magic bytes** que deben coincidir con el MIME declarado (un `.jpg`
  renombrado a `.png` se rechaza con 415).
- **`PATCH` es JSON y solo admite `alt`, `orden` y `seccion`.** El binario,
  `mime_type`, `filename` y `size_bytes` son **inmutables**: cambiar la imagen es
  `POST` nuevo + `DELETE` del viejo. **Por eso la UI no ofrece «reemplazar
  imagen».**
- `DELETE` → `204` sin cuerpo. Borrado físico, sin papelera.
- Errores propios: `413` (excede tamaño), `415` (tipo no permitido), `422` con
  `field` en `file` / `seccion` / `orden`, `404` «Imagen no encontrada».
- ⚠️ El archivo se sube **completo** antes de validar `seccion` (multer corre antes
  del handler), así que un `422` por `seccion` llega tras consumir el ancho de banda.

### 10.3 Usuarios — contrato en vuelo (leído el 2026-07-29, sin commitear)

> **Actualización.** Cuando se escribió §10.2 el backend no tenía **ningún**
> endpoint de usuarios. Horas después `src/usersRouter.js` ya existe con los cinco
> endpoints. Sigue **sin commitear** y el backend avisará de que está terminado
> creando un archivo **`API_READY.md`** (que a 2026-07-29 **no existe todavía**).
> Tratar esto como **contrato provisional**: es código en vuelo que puede cambiar.

| Método | Ruta | Respuesta OK |
|---|---|---|
| `GET` | `/api/admin/users` | `200 { rows }` — **sin paginación, sin `total`** |
| `GET` | `/api/admin/users/:id` | `200 { user }` |
| `POST` | `/api/admin/users` | `201 { user }` |
| `PATCH` | `/api/admin/users/:id` | `200 { user }` |
| `DELETE` | `/api/admin/users/:id` | `204` sin cuerpo |

Las cinco pasan por `adminGuard`. El listado viene como **`{ rows }` sin
paginación** — se resolvió la duda que §10.3 dejaba abierta: sigue el patrón de
artículos e imágenes, **no** el de leads.

Columnas expuestas (`PUBLIC_COLS` en `src/users.js:19`), sin `SELECT *`:

```
id, email, name, role, created_at
```

`password_hash` **nunca** sale por la API. `password` **sí** se envía en el `POST`
(obligatorio) y en el `PATCH` (opcional).

Errores, con `field` cuando aplica:

- `422` `{ error: 'email requerido', field: 'email' }` · ídem `password` · ídem `role`.
- `422` `{ error: 'Nada que actualizar: se esperaba email, name, role o password' }`.
- `409` `{ error: 'El email ya está en uso', field: 'email' }`.
- `404` usuario no encontrado (también para un `:id` no numérico o desbordado).

**Dos reglas de negocio que la UI debe respetar, no descubrir a base de 409:**

1. **`409` — «No puedes eliminar tu propio usuario».** La pantalla debe deshabilitar
   el borrado de la fila del usuario en sesión (`useOutletContext<AdminUser>()` ya
   da su `id`), no ofrecerlo y fallar.
2. **`409` — «No puedes eliminar al último usuario con rol admin».** Hay que
   contemplar el caso en el copy: si queda un solo `admin`, su borrado se rechaza.

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

### 10.4 Precios — contrato REAL (commit `f878d0b` del backend, 2026-07-30)

> **Esta sección sustituye por completo al mapeo que este documento proponía
> antes.** Aquella propuesta se escribió cuando en el backend no existía nada de
> precios; el backend ya commiteó su CRUD y **su modelo difiere del propuesto en
> puntos de fondo**. Lo que sigue está leído de la fuente, no inferido.
>
> Sigue **sin** existir `API_READY.md`, así que el backend aún no lo da por
> cerrado.

**Errores de la propuesta anterior, para que nadie los reintroduzca:**

| Se propuso | La realidad |
|---|---|
| Campos en inglés (`name`, `monthly`, `annual`) | **Campos en español**: `nombre`, `precio_mensual`, `precio_anual` |
| Ruta `/api/admin/prices` | **`/api/admin/precios`**, y la pública `/api/precios` |
| `discount_pct` **global** para toda la sección | **`descuento_pct` es POR PLAN** |
| `annual` y `saving` **almacenados** | **`precio_anual` y `ahorro_anual` son DERIVADOS**, no se guardan ni se envían |
| `Enterprise` como `monthly: 0` = «a convenir» | **`es_custom: boolean`**, un campo propio |
| `features` / `dim` como `string[]` sueltos | **`vinetas` / `vinetas_tachadas`, columnas `JSONB`** |

| Método | Ruta | Auth | Respuesta OK |
|---|---|---|---|
| `GET` | `/api/precios` | pública | `200 { rows }` |
| `GET` | `/api/admin/precios/:id` | cookie + admin | `200 { plan }` |
| ~~`GET`~~ | ~~`/api/admin/precios`~~ | — | **NO EXISTE** (ver aviso) |
| `POST` | `/api/admin/precios` | cookie + admin | `201 { plan }` |
| `PATCH` | `/api/admin/precios/:id` | cookie + admin | `200 { plan }` |
| `DELETE` | `/api/admin/precios/:id` | cookie + admin | `204` |

> ⚠️ **No hay listado bajo `/api/admin/`.** Verificado contra el servidor vivo el
> 2026-07-31: `GET /api/admin/precios` responde **`404`**, no `401` — la ruta no
> existe, no es un problema de sesión. El router solo declara `GET` sobre
> `/:id`. **Para listar planes en el panel hay que usar el endpoint público
> `GET /api/precios`**, a diferencia de usuarios, imágenes y artículos, que sí
> tienen su listado bajo `/api/admin/*`. `API_READY.md` es coherente con esto (su
> tabla lista solo `POST/PATCH/DELETE` para precios), pero la asimetría es fácil
> de pasar por alto y cuesta un rato de depuración contra un 404 que parece de
> autenticación.

**Objeto `plan`** (`toPlan()`, `src/precios.js:91-116`) — 14 campos:

```
id, nombre, precio_mensual, descuento_pct, precio_anual, ahorro_anual,
vinetas, vinetas_tachadas, destacado, trial_texto, es_custom, orden,
created_at, updated_at
```

**Los dos campos derivados, y su aritmética exacta** (`src/precios.js:54-70`):

- `precio_anual = Math.round(precio_mensual * (1 - descuento_pct / 100))`.
  **Es el precio mensual facturando anualmente, no el total del año.**
- `ahorro_anual = Math.round((precio_mensual - precio_anual) * 12)`.
- **Si `es_custom` es `true`, ambos son `null`.** Ese es el caso `Enterprise`.

> ⚠️ **Discrepancia entre `API_READY.md` y el código del backend, verificada en la
> fuente el 2026-07-30.** El handoff dice que en un plan Custom vienen en `null`
> **tres** campos: `precio_mensual`, `precio_anual` y `ahorro_anual`. El código
> solo anula **dos**: `src/precios.js:97-98` pone a `null` `precio_anual` y
> `ahorro_anual`, mientras `precio_mensual` pasa por `toNumber()`
> (`src/precios.js:48-51`), que convierte `null` en **`0`**. El propio comentario
> del código (línea 85) dice «los dos».
>
> **Consecuencia práctica:** si la UI se fía del handoff y espera `null` en
> `precio_mensual`, un plan Custom pintará **«$0»** — justo lo que el handoff dice
> querer evitar («para que no se renderice "Ahorras $0/año"»).
> **Regla segura para el front: no te fíes de los nulos, comprueba `es_custom`
> antes de pintar cualquier cifra.** Es además lo que el propio handoff recomienda.

**Otros datos que solo están en `API_READY.md`:**

- **El `id` de un plan llega como string** (`"id": "1"`), no como número — es el
  `BIGSERIAL` de Postgres sin castear. Lo mismo cabe esperar de imágenes.
- Los **precios sí llegan como `number`** (`19`, no `"19.00"`): el backend
  convierte los `NUMERIC` antes de responder.
- **Las tablas están creadas pero VACÍAS y no hay seed.** `GET /api/precios` y
  `GET /api/images` responden `200 { "rows": [] }`. Los datos se cargan desde el
  panel de administración. Conectar la landing hoy dejaría la sección de precios y
  el carrusel del Hero **en blanco**.
- El servidor local es el **:3002** (no el 3001 que dice la doc del backend).
- **El rol `editor` ya puede eliminar publicaciones**: la relajación de permisos
  que estaba aprobada pero sin aplicar (ver §10.3) ya está en el backend.

Reproduce la aritmética que la landing ya muestra: `(19 − 17) × 12 = 24`, el
«Ahorras $24/año» de `Pricing.tsx`. El `Math.round()` es decisión deliberada del
backend.

**Consecuencia directa para la UI del admin:** `precio_anual` y `ahorro_anual`
**no se editan**. Se editan `precio_mensual` y `descuento_pct`, y los otros dos se
muestran calculados. Un formulario que los ofrezca como campos editables está
contradiciendo el modelo.

**Errores:** `422 { error, field }` en validación, `404` no encontrado, `500`. El
`field` ya llega al consumidor: la **feature 31** lo propaga en `ApiFailure`
(ver §1), así que el formulario puede marcar en rojo el campo que el backend
rechaza.

**Guardar la relación con la landing:** `src/components/sections/Pricing.tsx` sigue
con su array `plans` hard-coded y **no se toca**. Conectarla es una feature futura;
el mapeo contra el contrato real sería `nombre → name`, `precio_mensual → monthly`,
`precio_anual → annual`, `ahorro_anual → saving` (hoy un string libre en el front),
`vinetas → features`, `vinetas_tachadas → dim`, `destacado → featured`,
`trial_texto → trial`, y `es_custom` como el caso sin precio.
