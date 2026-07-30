# Exploración — contrato real del backend para los CRUD de usuarios, imágenes y precios

**Fecha:** 2026-07-29 · **Repo explorado:** `/var/www/html/maia-landing-back` (solo lectura,
nada modificado, ningún valor de `.env*` leído) · **HEAD:** `13f5ab5 "update"`, rama única `main`.

> **Corrección de ruta:** el encargo original decía `/var/www/html/maia-landing-backend`.
> Esa ruta **no existe**. El backend real es **`/var/www/html/maia-landing-back`**.

**Stack del backend:** Node ESM + Express 4 + Postgres (`pg`). Sin TypeScript, sin ORM,
sin herramienta de migraciones: todo el DDL vive en `ensureSchema()` (`src/db.js`).

---

## 0. Resumen ejecutivo — madurez real

| Recurso | Estado real | ¿Consumible hoy? |
|---|---|---|
| **Imágenes** | Código completo en el árbol de trabajo, **sin commitear**, **sin tests**, **sin documentar**. `feature_list.json:20` → `in_progress` | **No en producción** (no está en git → no desplegado en Render). Sí maquetable: el contrato está cerrado |
| **Usuarios** | **No existe ningún endpoint.** Solo capa de datos (`src/users.js`) usada por el login, y dos scripts CLI. `feature_list.json:44` → `pending` | **No.** Rutas y envolturas por definir |
| **Precios** | **No existe nada**: ni tabla, ni módulo, ni router, ni diseño. `feature_list.json:51` → `pending`, descripción de una línea | **No.** Modelo de datos entero por decidir |

Fuentes que valen más que los controladores:

- `maia-landing-back/docs/api-contract.md` — contrato acordado con el front, **desactualizado**: no menciona imágenes (líneas 127-159 solo cubren artículos y leads).
- `maia-landing-back/feature_list.json:15-53` — features 7 (imágenes), 8 (usuarios), 9 (precios), con campo `decision_humano`.
- `maia-landing-back/progress/current.md:7-9,11-22` — sesión en curso sobre imágenes, checklist a medio marcar.
- `maia-landing-back/docs/architecture.md` §5 (endpoints, 217-249), §7 (esquema, 284-347), §8 (auth, 349-405).
- `maia-landing-back/docs/database.md` §5 (tablas, 67-75).
- **No hay** OpenAPI/Swagger, ni colección de Postman, ni carpeta de migraciones.

---

## 1. Autenticación del área admin

Idéntica a la que ya consumimos para leads y artículos. **Nada distinto** para estos tres
recursos, salvo el rol exigido.

- Sesión: JWT HS256 en cookie `httpOnly` **`maia_session`**, 7 días (`src/auth.js:7-9`).
- Cookie: `httpOnly: true`, `sameSite: 'none'` + `secure: true` en producción, `'lax'` sin
  `secure` en dev, `path: '/'` (`src/auth.js:36-45`). El front debe usar
  `credentials: 'include'` — ya lo hace (`src/lib/api.ts:126`).
- Payload del token: `{ sub, email }` — **no lleva el rol**. `requireAuth` recarga el usuario
  de la BD en cada request, así que un cambio de rol surte efecto inmediato
  (`src/auth.js:79,97-107`).
- `requireAuth` → `401 { "error": "No autenticado" }` (`src/auth.js:130`).
- Renovación transparente: cualquier `/api/admin/*` puede devolver `Set-Cookie` si al token le
  queda menos de `AUTH_REFRESH_WINDOW_MS` (nombre de variable; default 1 día)
  (`src/auth.js:119-125`). El front no necesita cambiar nada.
- Roles: modelo plano `admin` | `editor` (`src/roles.js:9-12`).
- `user` público = `{ id: number, email: string, name: string, role: 'admin'|'editor' }`
  (`src/auth.js:47-50`). **Nunca** incluye `password_hash`.
- Base URL: todo bajo `/api`. Convención: lectura pública en `/api/<recurso>`, escritura en
  `/api/admin/<recurso>`.
- Rate limit: solo `POST /api/contact` y `POST /api/auth/login`. **Ninguna ruta admin está
  limitada** (`src/app.js:84-85,141`).

### ⚠️ Discrepancia real en el formato de error de 403

Hay **dos formas distintas** de error, y esto sí afecta al código del front:

| Origen | Forma | Fuente |
|---|---|---|
| Casi todo (401, 404, 409, 413, 415, 422, 500) | `{ "error": "<mensaje en español>" }` + opcional `"field": "<campo>"` | `docs/api-contract.md:8-9` |
| **403 de `requireRole`** | `{ "ok": false, "error": "forbidden", "message": "No tienes permisos para realizar esta acción." }` | `src/roles.js:43-47` |

En un 403 el campo `error` trae el token `"forbidden"`, **no** un mensaje legible: el texto
para el usuario está en `message`. Si el front pinta `res.error` sin más, en un 403 mostrará
literalmente «forbidden». **A tener en cuenta cuando se cablee de verdad.**

Otros errores globales:

- Ruta desconocida: `404 { "error": "Not found" }` (`src/app.js:224`).
- Excepción no capturada: `500 { "error": "Error interno del servidor" }`, nunca stack ni SQL
  (`src/app.js:69-73`).
- Body JSON > 32 kb → error del parser de Express, canalizado a 500 JSON (`src/app.js:102`).

---

## 2. IMÁGENES — implementado, pero **no commiteado ni testeado**

### 2.1 Estado exacto

| Hecho | Evidencia |
|---|---|
| Los 5 endpoints existen y están montados | `src/imagesRouter.js:138,153,174,224,263`; montaje en `src/app.js:125-129` |
| Tabla `images` creada en `ensureSchema()` | `src/db.js:110-124` |
| `multer` instalado | `package.json:20` (`"multer": "^2.2.0"`) |
| **Nada de esto está en git** | `git show HEAD:src/db.js \| grep -c images` → `0`; `git show HEAD:src/app.js \| grep -c imagesRouter` → `0`; `src/images.js` y `src/imagesRouter.js` aparecen como `??` en `git status` |
| **No existe `tests/images.test.js`** | El acceptance lo exige (`feature_list.json:35`) |
| **`docs/api-contract.md` no documenta imágenes** | Su sección Admin (127-159) solo tiene Artículos y Leads |
| **`docs/database.md` no lista la tabla `images`** | §5, 69-73: solo `leads`, `users`, `articles` |
| `src/images.js:23` remite a un «§7.1» de `architecture.md` que **aún no existe** | — |
| La suite no se ha corrido en esta sesión | `progress/current.md:20` → `npm test → (pendiente)` |

**Conclusión operativa:** el backend desplegado en Render (que sirve `main`) **no tiene** los
endpoints de imágenes. Solo existen en la copia de trabajo local del backend. El contrato es
fiable para maquetar; **no** para integrar de verdad hasta que aparezca commiteado.

### 2.2 Endpoints

| Método | Ruta | Auth | Rol | Estado |
|---|---|---|---|---|
| `GET` | `/api/images?seccion=` | pública | — | Implementado (sin commitear) |
| `GET` | `/api/images/:id/raw` | pública | — | Implementado (sin commitear) |
| `POST` | `/api/admin/images` | cookie | **solo `admin`** | Implementado (sin commitear) |
| `PATCH` | `/api/admin/images/:id` | cookie | **solo `admin`** | Implementado (sin commitear) |
| `DELETE` | `/api/admin/images/:id` | cookie | **solo `admin`** | Implementado (sin commitear) |

Guard: `const adminGuard = [requireAuth, requireRole('admin')]` (`src/imagesRouter.js:134`).
**Ojo: `editor` recibe 403** en las tres rutas de escritura, a diferencia del CRUD de artículos
que admite `('admin','editor')`.

### 2.3 Tabla `images` (`src/db.js:110-124`)

| Columna | Tipo SQL | Notas |
|---|---|---|
| `id` | `BIGSERIAL PRIMARY KEY` | ⚠️ **NO CONFIRMADO**: `pg` devuelve `BIGINT` como **string** por defecto. `src/images.js` no hace `Number()` sobre `id` (a diferencia de `src/auth.js:49`). Asumir que `image.id` puede llegar como `"12"` |
| `seccion` | `TEXT NOT NULL` | Enum de aplicación, no de BD: `'hero' \| 'cta_final'` (`src/images.js:15`) |
| `filename` | `TEXT NOT NULL` | Saneado del `originalname` (basename, sin caracteres de control ni `"`, máx 255) — `src/imagesRouter.js:57-67` |
| `mime_type` | `TEXT NOT NULL` | El MIME **real detectado por magic bytes**, no el declarado (`src/imagesRouter.js:192-195`) |
| `bytes` | `BYTEA NOT NULL` | **Nunca sale por la API**: no está en `META_COLS` (`src/images.js:36`) |
| `size_bytes` | `INTEGER NOT NULL DEFAULT 0` | `req.file.buffer.length` |
| `alt` | `TEXT` nullable | Máx 300 (`ALT_MAX`, `src/imagesRouter.js:22`) |
| `orden` | `INTEGER NOT NULL DEFAULT 0` | Entero ≥ 0 |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Se refresca en el PATCH (`src/images.js:176`) |

Índice: `images_seccion_orden_idx (seccion, orden)` (`src/db.js:124`).

**Objeto de respuesta** (`META_COLS`, `src/images.js:36`) — exactamente estos 9 campos:

```
id, seccion, filename, mime_type, size_bytes, alt, orden, created_at, updated_at
```

### 2.4 `GET /api/images` — listado público

Query param único y opcional: `seccion` (`'hero'` | `'cta_final'`). Cadena vacía = sin filtro
(`src/imagesRouter.js:139-145`).

**No hay paginación** (ni `limit`, ni `offset`, ni `total`). Orden fijo:
`ORDER BY orden ASC, id ASC` (`src/images.js:150`).

Envoltura: **`{ rows: [...] }`** (`src/imagesRouter.js:146`) — como artículos, a diferencia de
leads que añade `total/limit/offset`.

```json
200 { "rows": [ { "id": 1, "seccion": "hero", "filename": "hero.png",
                  "mime_type": "image/png", "size_bytes": 84213, "alt": "MaIA en acción",
                  "orden": 0, "created_at": "…", "updated_at": "…" } ] }
422 { "error": "seccion inválida. Valores válidos: hero, cta_final", "field": "seccion" }
500 { "error": "Error al listar imágenes" }
```

### 2.5 `GET /api/images/:id/raw` — el binario (la «URL pública»)

`src/imagesRouter.js:153-170`.

- **No hay CDN, ni bucket, ni carpeta estática.** La URL pública de una imagen **es**
  `${API_BASE}/api/images/${id}/raw`. Hay que construirla en el front concatenando
  `VITE_API_BASE` (ya existe: `src/vite-env.d.ts:4`). **El JSON no devuelve ningún campo `url`.**
- Responde el buffer crudo con `Content-Type` = `mime_type` real, `Content-Length` y
  `X-Content-Type-Options: nosniff`.
- Ruta pública: usable directamente en un `<img src>` sin cookie.
- `id` no numérico → `404` sin tocar Postgres (`parseId`, `src/imagesRouter.js:39-43`).
- `404 { "error": "Imagen no encontrada" }` · `500 { "error": "Error al cargar imagen" }`.
- ⚠️ Sin `Cache-Control` ni `ETag` → el navegador revalidará; cada carga es un hit a la BD
  leyendo el `BYTEA`.

### 2.6 `POST /api/admin/images` — subida (esto condiciona la UI)

`src/imagesRouter.js:174-222`.

- **Formato: `multipart/form-data`.** No base64, no JSON.
- **Nombre del campo de archivo: `file`** (`FILE_FIELD`, `src/imagesRouter.js:12`),
  `upload.single('file')`. Otro nombre → `422 { error: "Archivo inválido", field: "file" }`.
- **Un solo archivo por request** (`files: 1`), máximo 10 campos de texto
  (`src/imagesRouter.js:89`).
- **No pongas `Content-Type` a mano** en el `fetch`: deja que el navegador genere el boundary
  del `FormData`.
- `credentials: 'include'` obligatorio.

Campos del `FormData`:

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `file` | File | **sí** | Whitelist abajo. Buffer vacío → 422 |
| `seccion` | string | **sí** | `'hero'` \| `'cta_final'`. Vacío o fuera del enum → 422 `field: "seccion"` |
| `orden` | string/number | no | Entero ≥ 0. Default `0`. Cadena vacía = ausente. No entero o negativo → 422 `field: "orden"` |
| `alt` | string | no | Trim + truncado a 300. Ausente → `null` |

**No existe** `filename`, `mime_type` ni `size_bytes` en el request: los deriva el servidor.

**Límites y tipos:**

- Tamaño máximo: **5 MB** (`src/imagesRouter.js:19`). Override por la variable
  `IMAGES_MAX_FILE_SIZE_BYTES` (solo el nombre), que ⚠️ **no está en `.env.example`** todavía.
- MIME permitidos: **`image/png`, `image/jpeg`, `image/webp`** y nada más. Extensiones válidas
  por MIME: `.png` / `.jpg`,`.jpeg` / `.webp` (`src/images.js:25-31`).
- **SVG está excluido a propósito** (vector de XSS almacenado) — `src/images.js:19-24`.
  No ofrecer SVG en el `accept` del input.
- **Doble validación**: (1) MIME declarado + coherencia con la extensión
  (`src/imagesRouter.js:90-100`); (2) **magic bytes** del buffer real, que además deben
  **coincidir** con el MIME declarado (`sniffMime`, `src/images.js:74-94`, comprobado en
  `src/imagesRouter.js:192-195`). Consecuencia para la UI: un `.jpg` renombrado a `.png` se
  rechaza con 415.
- **No hay redimensionado, ni recorte, ni optimización, ni thumbnails.** El binario se guarda
  tal cual; los previews se sirven a tamaño completo.

Respuestas:

```json
201 { "image": { …los 9 campos de META_COLS, sin `bytes`… } }
401 { "error": "No autenticado" }
403 { "ok": false, "error": "forbidden", "message": "No tienes permisos para realizar esta acción." }
413 { "error": "El archivo excede el tamaño máximo permitido (5242880 bytes)", "field": "file" }
415 { "error": "Tipo de archivo no permitido. Formatos aceptados: image/png, image/jpeg, image/webp", "field": "file" }
422 { "error": "Archivo requerido", "field": "file" }
422 { "error": "seccion requerida", "field": "seccion" }
422 { "error": "seccion inválida. Valores válidos: hero, cta_final", "field": "seccion" }
422 { "error": "orden debe ser un entero >= 0", "field": "orden" }
422 { "error": "Archivo inválido", "field": "file" }
500 { "error": "Error al crear imagen" }
```

Envoltura de detalle: **`{ image }`** (singular), coherente con `{ article }` / `{ lead }`.

⚠️ **Orden de validación, relevante para la UX:** multer corre **antes** del handler, así que el
archivo se sube **completo** por la red antes de validar `seccion`. Un 422 por `seccion`
inválida llega después de consumir el ancho de banda. Y el 413/415 se emiten desde el
middleware, así que en esos casos **`seccion` no se valida**.

### 2.7 `PATCH /api/admin/images/:id`

`src/imagesRouter.js:224-261`. Body **JSON** (no multipart). Tres campos editables, todos
opcionales pero al menos uno requerido:

| Campo | Tipo | Reglas |
|---|---|---|
| `alt` | `string \| null` | `null` explícito lo borra; string se trimea y trunca a 300 |
| `orden` | number | Entero ≥ 0 |
| `seccion` | string | `'hero'` \| `'cta_final'` |

**No se puede reemplazar el binario con un PATCH.** `bytes`, `mime_type`, `filename` y
`size_bytes` son inmutables: cambiar la imagen = `POST` nuevo + `DELETE` del viejo
(`src/images.js:157-162`). **Esto define la UI: no hay «reemplazar imagen», hay «subir otra y
borrar la anterior».**

```json
200 { "image": { … } }
404 { "error": "Imagen no encontrada" }
422 { "error": "Nada que actualizar: se esperaba alt, orden o seccion" }
422 { "error": "orden debe ser un entero >= 0", "field": "orden" }
422 { "error": "seccion inválida. Valores válidos: hero, cta_final", "field": "seccion" }
500 { "error": "Error al actualizar imagen" }
```

### 2.8 `DELETE /api/admin/images/:id`

`src/imagesRouter.js:263-274`. Sin body. `204` sin cuerpo ·
`404 { "error": "Imagen no encontrada" }` · `500 { "error": "Error al borrar imagen" }`.
Borrado físico, sin soft-delete y sin papelera.

### 2.9 Contexto de front que el backend ya dio por escrito

`feature_list.json:22`: hoy las imágenes son estáticos en `maia-landing-front/public/`
(`hero.png`, `hero-2.png`, `hero-3.png` en `src/components/sections/Hero.tsx:10-12`;
`maia.png` en `src/components/sections/CTAFinal.tsx:42`). El backend declara que **migrar el
front para consumir esta API queda fuera de su alcance** — es trabajo nuestro. Las secciones
soportadas hoy son exactamente esas dos; añadir una tercera es añadir un string a `SECCIONES`
(`src/images.js:15`), no un cambio de esquema.

---

## 3. USUARIOS — **no existe como API**

### 3.1 Qué hay y qué no

| Elemento | Existe |
|---|---|
| `GET/POST/PATCH/DELETE /api/admin/users` | **NO.** Cero ocurrencias de la ruta en todo el repo |
| `src/usersRouter.js` | **NO existe** |
| Router esbozado, comentado o con TODO | **NO.** No hay ni el esqueleto |
| Capa de datos parcial | Sí: `src/users.js`, 3 funciones |
| Tabla `users` | Sí, ya existe (la creó la feature de login) |
| Tests | **NO** hay `tests/users.test.js` |
| Documentación | `docs/api-contract.md` no tiene sección de usuarios |

`src/app.js:114-129` monta exactamente cuatro routers (auth, articles, leads, images). No hay
hueco para usuarios.

**Lo único que existe** (`src/users.js`):

- `createUser(pool, { email, password, name }, { schema })` (línea 14). Hashea con bcrypt 12
  rounds. `RETURNING id, email, name, created_at`. ⚠️ **No acepta `role`**: el usuario creado se
  queda con el default `'editor'`. Lanza `Error('email_required')`, `Error('password_required')`
  o `Error('email_taken')` con `code = 'email_taken'` sobre el `23505` de Postgres.
- `findUserByEmail(pool, email, { schema })` (línea 43). Case-insensitive.
- `verifyPassword(user, password)` (línea 60).

Estas funciones **solo las consume el login** (`src/auth.js:4`) y los tests.

### 3.2 Cómo se crean usuarios hoy: por CLI, no por UI

- `scripts/create-user.js` — `node scripts/create-user.js <email> <password> [name]`. Crea con
  rol default `editor`. Comentario en la línea 6: *«Útil para crear el primer admin manualmente
  cuando aún no hay UI de alta»*.
- `scripts/seed-users.js` — crea o **promueve a `admin`**, con un `UPDATE` de `role` a mano
  porque `createUser` no soporta el campo (líneas 58-62). Lee `MAIA_ADMIN_PASSWORD` (solo el
  nombre).

### 3.3 Tabla `users` (`src/db.js:56-78`) — la forma que tendrá el CRUD

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `BIGSERIAL PK` | `publicUser()` lo castea a `Number` (`src/auth.js:49`) |
| `email` | `TEXT UNIQUE NOT NULL` | Siempre lowercase + trim (`src/users.js:5-7`) |
| `password_hash` | `TEXT NOT NULL` | bcrypt, 12 rounds. **Nunca sale por la API** (invariante I3, `docs/database.md:80`) |
| `name` | `TEXT` nullable | Truncado a 120 en escritura (`src/users.js:26`) |
| `role` | `TEXT NOT NULL DEFAULT 'editor'` | Añadida por `ALTER … ADD COLUMN IF NOT EXISTS` (`src/db.js:73-75`). **Sin CHECK constraint**: la BD acepta cualquier string; el enum se valida solo en código (`src/roles.js:9-12`) |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | |

No hay `updated_at`, ni `active`/`deleted_at`, ni `last_login`.

FK relevante: `articles.author_id → users(id) ON DELETE SET NULL` (`src/db.js:90`) — borrar un
usuario **no** borra sus artículos, les pone el autor a `NULL`.

### 3.4 Lo que el backend ya decidió sobre esta feature

`feature_list.json:43` (descripción) y `:45` (`decision_humano`, 2026-07-29):

- Alcance: crear, editar, eliminar y **listar** usuarios. Dos roles: `admin` (acceso a todo) y
  `editor` (solo la sección de blog: ver, crear, editar y eliminar publicaciones).
- **Cambio de permisos aprobado y todavía NO aplicado**: hoy `DELETE /api/admin/articles/:id`
  exige `requireRole('admin')` a secas (`src/articlesRouter.js:105`, verificado) mientras el
  resto del CRUD de artículos admite `('admin','editor')`. La feature 8 debe relajarlo a
  `requireRole('admin','editor')` y actualizar `docs/api-contract.md:139`.
  → **Implicación para nuestra UI:** si mostramos «eliminar publicación» a un `editor`, **hoy
  recibe 403**. Cuando cierren la feature 8 empezará a funcionar sin que cambiemos nada.
  Conviene no ocultar el botón por rol de forma permanente, o dejarlo tras un flag.

### 3.5 Forma del contrato futuro — ❓ NO CONFIRMADO

Nada de lo siguiente está escrito en el backend; es inferencia por convención del repo. **No es
contrato.**

- ❓ Rutas `GET/POST /api/admin/users`, `GET/PATCH/DELETE /api/admin/users/:id`, todas con
  `requireRole('admin')`.
- ❓ Listado envuelto en `{ rows }` (por analogía con artículos e imágenes) y detalle en
  `{ user }`. Si copian el patrón de leads sería `{ rows, total, limit, offset }`; **la asimetría
  entre ambos patrones ya existe y está documentada como intencional** en
  `docs/api-contract.md:157-159`, así que no es predecible cuál elegirán.
- ❓ `409 { error: "Email ya existe", field: "email" }` sobre el `23505` (el mapeo 23505→409 ya
  existe para slugs, `src/articlesRouter.js:97-99`, y `docs/database.md:96` lo anticipa para
  email).
- ❓ Campos de request `{ email, password, name, role }`; `password` opcional en el PATCH.

**Recomendación de maquetación:** construir la vista contra un mock propio y aislar el acceso a
datos para poder reescribir solo esa capa cuando publiquen el contrato.

---

## 4. PRECIOS — **no existe absolutamente nada**

### 4.1 Búsqueda exhaustiva

`grep -rniE "precio|price|plan|tarifa|pricing"` sobre todo el repo (excluyendo `node_modules` y
`package-lock.json`): **cero coincidencias funcionales**. Los únicos hits son
`feature_list.json:49-51` (la feature en sí) y falsos positivos: «plantilla» (correo), «plan
free de Render», `price` en ejemplos de las skills de `.agents/skills/`, y «Planner» en la
documentación de Postgres.

Concretamente:

- **No hay tabla** `precios`/`prices`/`plans`: `ensureSchema` crea exactamente 4 tablas
  (`leads`, `users`, `articles`, `images`).
- **No hay** `src/prices.js` ni `src/pricesRouter.js`.
- **No hay ninguna ruta** `/api/prices` ni `/api/admin/prices`, ni implementada, ni comentada,
  ni en un TODO, ni esbozada.
- **No hay tests** ni documentación.
- **No hay rama** donde pueda estar: `git branch -a` → solo `main` y `origin/main`.

### 4.2 Todo lo que existe sobre precios

`maia-landing-back/feature_list.json:47-52`:

```json
{ "id": 9,
  "name": "CRUD de precios.",
  "description": "hay que dar mantenimiento a la sección de precios, incluyendo el porcentaje de descuento.",
  "status": "pending" }
```

Sin `acceptance`, sin `decision_humano`, sin `contexto_front` — a diferencia de las features 7 y
8, que sí los tienen. **El modelo de datos de precios está entero por diseñar.** Ninguna
decisión tomada sobre moneda, periodicidad ni estructura de las features de cada plan.

### 4.3 Relación con la landing hard-coded

La única pista es la palabra «descuento». Contrastado con
`maia-landing-front/src/components/sections/Pricing.tsx`:

- Interfaz `Plan` (líneas 6-9): `{ name: string; monthly: number; annual: number; saving: string;
  features: string[]; dim: string[]; featured?: boolean; trial?: string }`.
- Array `plans` (líneas 11-37): 4 planes hard-coded — `Starter` (19/17), `Team` (199/179,
  `featured: true`), `Growth` (599/540), `Enterprise` (0/0, precio «a convenir»).
- Ya existe concepto de **mensual vs anual**: el toggle `isAnnual` (línea 39, prop del
  componente) y el `Switch` de la línea 55.
- Ya existe concepto de **descuento**: el `Chip` «Ahorra 10%» hard-coded en la línea 56, más el
  string libre `saving` por plan (`'Ahorras $24/año'`, etc.).
- Moneda: implícita en los strings (`$`); **no hay campo `currency`**.

**Lectura del encargo (❓ NO CONFIRMADO en su totalidad):** que la feature 9 mencione «el
porcentaje de descuento» encaja demasiado bien con ese `Chip` «Ahorra 10%» y con los
`monthly`/`annual` como para ser casualidad, así que **es razonable suponer que la intención es
alimentar esta sección desde la BD**. Pero:

- ❓ NO CONFIRMADO que los precios de la BD vayan a alimentar `Pricing.tsx`. El backend **no lo
  dice en ninguna parte**. Compárese con la feature 7, donde sí escribieron un `contexto_front`
  citando `Hero.tsx:10-12` y `CTAFinal.tsx:42`; para precios ese campo **no existe**, lo que
  sugiere que aún no han mirado el front.
- ❓ NO CONFIRMADO si el descuento será un porcentaje global, uno por plan, o el string libre
  `saving` actual.
- ❓ NO CONFIRMADO si habrá campo de moneda.
- ❓ NO CONFIRMADO cómo modelarán `features: string[]` y `dim: string[]` (tabla hija, columna
  `TEXT[]`, o `JSONB`). El repo **no usa `JSONB` en ninguna tabla** hoy.
- ❓ NO CONFIRMADO qué es `dim` (vacío en los 4 planes; presumiblemente «features atenuadas / no
  incluidas»).
- ❓ NO CONFIRMADO cómo representarán el caso `Enterprise` (precio 0 = «a convenir»).

**Recomendación fuerte:** no maquetar la vista de precios contra un contrato inventado. Es el
recurso con más riesgo de retrabajo. Merece la pena que el backend escriba el `acceptance` de la
feature 9 (con `contexto_front` apuntando a `Pricing.tsx:6-37`) **antes** de integrar, o que
nosotros propongamos el shape partiendo de nuestra interfaz `Plan`, que es la mejor
especificación disponible hoy.

---

## 5. Diferencias frente a lo que ya consumimos (leads y artículos)

| Aspecto | Leads / Artículos | Imágenes | Usuarios | Precios |
|---|---|---|---|---|
| Auth | Cookie `maia_session` | Igual | — | — |
| Rol de escritura | `admin, editor` (salvo DELETE de artículo: `admin`) | **solo `admin`** en las 3 rutas de escritura | ❓ `admin` presumiblemente | — |
| Content-Type de escritura | `application/json` | **`multipart/form-data`** en el POST; JSON en el PATCH | ❓ JSON | — |
| Envoltura de listado | `{ rows, total, limit, offset }` (leads) / `{ rows }` (artículos) | **`{ rows }`**, sin paginación | ❓ | — |
| Paginación | `limit`/`offset` (solo leads) | **ninguna** | ❓ | — |
| Documentado en `api-contract.md` | Sí | **No** | No | No |
| Tests | Sí | **No** | No | No |
| Commiteado / desplegado | Sí | **No** | — | — |

---

## 6. Deuda y avisos del propio backend

- **Credenciales expuestas, sin rotar** (`progress/current.md:70-107`, `feature_list.json:67`):
  el repo `maia-landing-back` es **público** en GitHub y su `.env` estuvo trackeado. Los valores
  siguen en el historial de git. Pendiente de que un humano rote `DATABASE_URL`, `SMTP_PASS`,
  `SMTP_USER`, `AUTH_SECRET`, `MAIA_ADMIN_PASSWORD` (solo nombres; ningún valor leído). No nos
  bloquea, pero es la deuda #1 de ese repo y afecta al entorno contra el que integraremos.
- `ensureSchema()` corre en cada arranque y es fail-fast: si falla, el proceso muere
  (`feature_list.json:74`, decisión deliberada). Un despliegue con la tabla `images` a medias
  tira el servicio entero, no solo esa ruta.
- El backend corre en Render **plan free**: el servicio se duerme por inactividad y el primer
  request tras el sueño tarda (`docs/architecture.md:536`, `docs/context.md:43`). Relevante para
  los spinners del panel admin.
- Baseline de tests declarada: 10 archivos / 117 tests (`feature_list.json:37`). La feature 7
  debe subirlo y aún no lo ha hecho.

---

## 7. Qué se puede maquetar hoy, en orden de confianza

1. **Imágenes** — contrato completo y estable. Riesgo bajo: lo único que puede cambiar es que
   aparezca `tests/images.test.js` y ajusten un mensaje de error. **Pero no está desplegado**,
   así que la integración real debe esperar al commit. Al maquetar: subida `multipart` campo
   `file`, máx 5 MB, PNG/JPEG/WebP (**sin SVG**), **sin «reemplazar imagen»** (borrar + subir),
   URL pública `${API_BASE}/api/images/${id}/raw`, y `editor` no puede escribir.
2. **Usuarios** — la tabla y los roles están definidos, así que los **campos** son fiables
   (`id`, `email`, `name`, `role`, `created_at`; nunca `password_hash`). Las **rutas y
   envolturas no existen**. Maquetar contra mock y aislar la capa de datos.
3. **Precios** — no maquetar contra un contrato: no hay ninguno. Si hay que avanzar, proponer el
   shape partiendo de `Pricing.tsx:6-37` y que el backend lo confirme.
