# Implementación — feature 33: Cablear la vista de imágenes a `/api/images` y `/api/admin/images`

**Estado:** código en pie y verde. Pendiente de review.
**Fecha:** 2026-07-31.

> Nota de proceso: el líder me indicó explícitamente **no tocar**
> `feature_list.json` ni `progress/current.md` (los está gestionando él), así que
> el estado de la 33 no se movió a `in_progress` desde esta sesión y la bitácora
> vive aquí. El cambio a `done` lo hará quien corresponda tras el veredicto del
> reviewer.

## Baseline (árbol limpio, antes de tocar nada)

```
npm test          → Test Files 18 passed (18) | Tests 133 passed (133)   exit 0 (55.2 s)
npm run typecheck → exit 0, sin salida
npm run build     → ✓ built in 14.15s, exit 0 (aviso de chunk >500 kB, esperado)
```

Coincide con lo anunciado por el líder. Ningún rojo, ni siquiera en los tres
archivos señalados como flakes bajo carga; corrí una sola suite a la vez.

## Archivos tocados

| Archivo | Qué |
|---|---|
| `src/lib/api.ts` | **Solo añadidos** al final: bloque «Imágenes (feature 33)». Ni una línea existente modificada. |
| `src/admin/images/ImagesGrid.tsx` | Cableado a `listImages` / `updateAdminImage` / `deleteAdminImage` vía `normalizeApi`; previews con `imageRawUrl`; error del listado con `role="alert"`. |
| `src/admin/images/ImageUploadDialog.tsx` | Cableado a `createAdminImage` (multipart); mapeo explícito de `field`; 413/415/422 del backend. |
| `src/admin/images/mockImages.ts` | **Eliminado** (292 líneas). Las fixtures viven ahora en el test. |
| `src/admin/__tests__/ImagesGrid.test.tsx` | Reescrito: 23 tests contra `globalThis.fetch`. |
| `docs/api-contract.md` | Imágenes pasa de §10.2 (maquetación) a §4 ter (endpoints vigentes). |
| `progress/impl_33.md` | Este informe. |

No se tocó `src/AppRoutes.tsx`, `src/admin/AdminLayout.tsx`, `feature_list.json`,
`progress/current.md`, ni nada de `src/admin/users/` ni `src/admin/prices/`.
Infraestructura intacta (C11). Ningún `.env*` leído ni escrito (C8).

## Lo nuevo en `src/lib/api.ts`

```ts
imageRawUrl(id)                     // `${API_BASE}/api/images/${id}/raw`
listImages({ seccion? })            // GET    /api/images[?seccion=]   → { rows }   PÚBLICO
createAdminImage(input)             // POST   /api/admin/images        → 201 { image }  multipart
updateAdminImage(id, patch)         // PATCH  /api/admin/images/:id    → { image }   JSON
deleteAdminImage(id)                // DELETE /api/admin/images/:id    → 204 sin cuerpo
```

Más los tipos (`AdminImage`, `ImageSeccion`, `ImagesListResponse`,
`ImageUploadInput`, `ImagePatchInput`) y la validación de cliente
(`validateImageFile`, `parseOrden`, `formatFileSize`, `ACCEPTED_IMAGE_MIME_TYPES`,
`MAX_IMAGE_SIZE_BYTES`, `IMAGE_ALT_MAX`, `ORDEN_ERROR`, `IMAGE_SECCIONES`).

## Decisiones

### 1. `apiUpload`: el helper de subida, y por qué `apiJson` no sirve

`apiJson` fija `headers: { 'Content-Type': 'application/json', … }`. Con un
`FormData` eso es fatal: el `Content-Type` correcto es
`multipart/form-data; boundary=…` y **el boundary solo lo conoce el navegador**,
que lo genera al serializar el `FormData`. Si se fija la cabecera a mano, el body
sale con un boundary que la cabecera no declara y multer no puede parsearlo.

```ts
async function apiUpload<T>(path: string, body: FormData): Promise<ApiResult<T>> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', credentials: 'include', body });
  let data: T | { error?: string } | null = null;
  try { data = await res.json(); } catch { /* sin body */ }
  return { ok: res.ok, status: res.status, data };
}
```

Mismo `credentials: 'include'` y misma forma `{ ok, status, data }` que `apiJson`,
y tampoco lanza. **No acepta `headers` desde fuera**: dejar esa puerta abierta es
exactamente el error que el helper existe para evitar. Cero `fetch` en
componentes (C5).

### 2. Dos transportes en el mismo recurso

- **Listado → `publicJson`** (`credentials: 'omit'`): el endpoint es
  `GET /api/images?seccion=`, público, y **no existe ninguno bajo `/api/admin/`**
  (misma asimetría que precios). Devuelve `{ rows }` sin paginación, orden fijo
  `orden ASC, id ASC`, así que la pantalla no pinta `TablePagination`. Test que
  congela la URL exacta y `credentials: 'omit'`.
- **Escritura → `apiJson` / `apiUpload`** (`credentials: 'include'`), las tres
  bajo `requireRole('admin')`.

A diferencia de usuarios, **el filtro sí va al backend** (`?seccion=`): aquí el
endpoint lo acepta, y el test afirma la URL con la query. No es un filtro de
cliente disfrazado.

### 3. La URL pública se construye, no llega

El JSON no trae ningún campo `url` y no hay CDN. `imageRawUrl(id)` vive en
`lib/api.ts` para que `VITE_API_BASE` se aplique en un solo sitio; el componente
solo pinta `src={imageRawUrl(img.id)}`. Desaparece el estado «Vista previa no
disponible» de la maqueta: ahora toda fila del backend tiene binario servible.

### 4. `id` como string

`AdminImage.id: string` (BIGSERIAL sin castear). Los helpers aceptan
`string | number` por comodidad de llamada, pero las fixtures del test son
strings (`'1'`) y el test afirma `'/api/admin/images/1'` y `'/api/images/1/raw'`.
No se hace `Number()` en ningún sitio del código de producción.

### 5. El `204` del `DELETE`

Mismo molde que `deleteAdminUser` (feature 32): se sintetiza el `{ ok: true }` que
el 204 no trae, **solo si la respuesta fue 2xx**. Hay test del `204` como éxito y
test de un `500` **sin cuerpo** que no debe confundirse con él.

### 6. `field` → input: **tabla explícita**, no whitelist

Atendida la observación 3 de `progress/review_32.md`. En vez de
`FORM_FIELDS.find(f => f === field)`, un `Record<string, FormField>`:

```ts
const FIELD_BY_BACKEND: Record<string, FormField> = {
  file: 'file', seccion: 'seccion', orden: 'orden',
};
```

Ventaja concreta: si el backend renombra `seccion` → `section`, la tabla es el
sitio donde se ve que falta una entrada, y el nombre desconocido cae al aviso
global (`<Alert role="status">`) en vez de marcar un input inexistente o
perderse. Los tres nombres son los que documenta el contrato; **`alt` no está a
propósito**: el backend lo trunca a `IMAGE_ALT_MAX` en vez de rechazarlo, así que
nunca llega como `field`. El diálogo de edición tiene su propia tabla
(`EDIT_FIELD_BY_BACKEND`, con `alt`, `orden`, `seccion`) porque sus inputs son
otros: el `PATCH` no tiene campo `file`.

### 7. Los códigos propios del backend (413 / 415 / 422)

La validación de cliente **se mantiene** (tipo, coherencia extensión↔MIME y
5 MB): subir 5 MB para recibir un rechazo es tirar ancho de banda, y el archivo
viaja entero antes de que el backend valide siquiera `seccion`. Movida tal cual
de `mockImages.ts` a `lib/api.ts` (`validateImageFile`), sin cambiar el copy.

Encima de eso se muestran los códigos remotos:

- **`413` y `415` siempre hablan del archivo**, así que su mensaje se marca en el
  campo de archivo, no en un aviso suelto.
- Si el backend manda su mensaje, **se muestra el suyo** (test del `415` por
  magic bytes, el caso que el cliente no puede anticipar).
- Si llega **sin cuerpo legible** —multer corta la petición antes del handler, y
  eso es justo lo típico de un `413`— se usa el copy de `STATUS_COPY`. La
  detección es `res.error === SUBIDA_ERROR`, es decir «`normalizeApi` cayó al
  fallback porque no había body». Hay test de las dos ramas.
- **`422` con `field`** → tabla del punto 6. Sin `field` → `Alert role="status"`.
- **`403`** → `adminErrorMessage` (feature 32), para no enseñar el token
  `forbidden`.

### 8. El error del listado ahora se anuncia

Atendida la observación 4 de `progress/review_32.md`, que era aplicable aquí
porque es mi propio archivo: el `Box` de error del listado lleva `role="alert"`.
Es donde aterrizan los fallos que el usuario no puede prever (un `403`
sobrevenido, un borrado rechazado), así que un lector de pantalla debe
anunciarlos. **No** toqué `UsersList.tsx` ni `LeadsList.tsx`, que arrastran el
patrón sin `role` (C10: no es mi feature).

### 9. Dónde quedó lo que vivía en `mockImages.ts`

El archivo se borró entero. Su contenido se repartió así:

- **Contrato y validación** (`IMAGE_SECCIONES`, MIME permitidos, 5 MB, `ALT_MAX`,
  `ORDEN_ERROR`, `validateImageFile`, `parseOrden`, `formatFileSize`) → a
  `src/lib/api.ts`, que ya es el sitio de la validación compartida del repo
  (`EMAIL_RE`/`PHONE_RE`, `api-contract.md` §7). Son reglas derivadas del
  contrato, y las necesitan los dos componentes.
- **Copy** (las etiquetas «Hero» / «CTA final») → a `ImagesGrid.tsx`, como manda
  `conventions.md` §6, en un `Record<ImageSeccion, string>` que **obliga a dar
  etiqueta** a cualquier sección que el contrato añada. `ImagesGrid` se lo pasa a
  `ImageUploadDialog` por prop `secciones`, para no cruzar imports entre
  componentes hermanos.
- **Datos semilla** → a las fixtures del test.

## Tests — 23 casos en `src/admin/__tests__/ImagesGrid.test.tsx`

`vi.spyOn(globalThis, 'fetch')` con `Response` reales. **No se mockea
`src/lib/api.ts`**. `mockImagesApi()` es un backend mínimo con `store` en memoria
(la recarga posterior a una escritura devuelve el listado actualizado) y dos
escotillas, `list` y `write`. El mock **responde `415` si el POST no llega como
`FormData`**, igual que multer.

| # | Caso | Acceptance |
|---|---|---|
| 1 | GET `/api/images` con `credentials: 'omit'`; pinta filename, alt, orden, tamaño y fecha | 1, 9 |
| 2 | Sin paginación: URL exacta y sin «Por página» | 1 |
| 3 | La preview es `/api/images/:id/raw`; la imagen sin alt lleva `alt=""` | 5, 6 |
| 4 | El filtro pide `?seccion=cta_final` al backend | 1 |
| 5 | Error del listado: mensaje del backend en un `role="alert"` | 7 |
| 6 | Estado vacío por sección | — |
| 7 | POST `FormData` (file/seccion/alt/orden), `credentials: 'include'`, **sin `Content-Type`**, y recarga | 2, 9 |
| 8 | `alt` vacío **no se envía**; `orden` va como `'0'` | 2 |
| 9 | Tipo no permitido rechazado en cliente, `accept` sin SVG, **cero escrituras** | 7, 9 |
| 10 | >5 MB rechazado en cliente, **cero escrituras** | 7 |
| 11 | Sección obligatoria antes de tocar el backend | 7 |
| 12 | `orden` no entero rechazado en cliente | 7 |
| 13 | `413` **sin cuerpo** → copy propio en el campo de archivo | 7 |
| 14 | `415` **con** mensaje del backend (magic bytes) → se muestra el suyo | 7 |
| 15 | `422` con `field: 'seccion'` marca el select, no el aviso global | 7 |
| 16 | Error sin `field` → `Alert role="status"` | 7 |
| 17 | PATCH `/api/admin/images/1` con JSON de **solo** alt/orden/seccion; sin «reemplazar» ni input de archivo | 3, 6 |
| 18 | `422` del PATCH marca el campo del backend | 7 |
| 19 | DELETE `/api/admin/images/3`, el `204` sin cuerpo es éxito | 4, 6 |
| 20 | Un `500` **sin cuerpo** no se confunde con el `204` | 4 |
| 21 | `403` traducido: nunca se enseña «forbidden» | 7 |
| 22 | Cancelar no borra: cero escrituras | — |
| 23 | Un editor ve la galería pero no las acciones de escritura | — |

## Prueba de que los tests discriminan (mutación → rojo → revertido)

Cada mutación se aplicó **sola** sobre el código de producción, se corrió
`npx vitest run src/admin/__tests__/ImagesGrid.test.tsx` y se **revirtió antes de
la siguiente** (script en el scratchpad de la sesión, con `finally` que restaura
el archivo desde una copia previa). Las 12 salieron en rojo; ninguna pasó
desapercibida.

| # | Mutación | Resultado |
|---|---|---|
| M1 | `apiUpload` fija `headers: { 'Content-Type': 'multipart/form-data' }` | **ROJO — 1** (POST con FormData y sin Content-Type) |
| M2 | `createAdminImage` manda `JSON.stringify(...)` en vez del `FormData` | **ROJO — 2** (el mock responde `415`, como multer) |
| M3 | `listImages` ignora el filtro: nunca añade `?seccion=` | **ROJO — 1** (el filtro se resuelve en el backend) |
| M4 | `listImages` usa `apiJson` contra `/api/admin/images` | **ROJO — 3** (carga con GET público; filtro; no pagina) |
| M5 | `imageRawUrl` devuelve otra ruta (`/imagen-:id.png`) | **ROJO — 2** (preview del listado y de la recién subida) |
| M6 | `deleteAdminImage` deja de sintetizar el `204` | **ROJO — 1** |
| M7 | `deleteAdminImage` al estilo `ArticlesList` (`data == null ⇒ ok: true`) | **ROJO — 1** (el `500` sin cuerpo) |
| M8 | El `PATCH` manda además `filename` | **ROJO — 1** (JSON de solo alt/orden/seccion) |
| M9 | `ImageUploadDialog` ignora `res.field` (todo al aviso global) | **ROJO — 1** (el `422` con field) |
| M10 | `mensajeDeSubida` devuelve `res.error` a secas (sin `STATUS_COPY`) | **ROJO — 1** (el `413` sin cuerpo) |
| M11 | `validateImageFile` deja de comprobar el tamaño | **ROJO — 1** (los 5 MB) |
| M12 | El `Box` del error del listado pierde `role="alert"` | **ROJO — 3** (listado, borrado sin cuerpo y `403`) |

Árbol restaurado y comprobado tras la última mutación: ningún marcador
(`void filtros`, `false as boolean`, `multipart/form-data'` en `api.ts`…) quedó
en el código, y `git status` solo lista los archivos de la feature.

## Comprobaciones estáticas

```
grep "fetch(" src (sin __tests__, sin src/lib/api.ts)        → 0
grep "\bany\b" en los archivos de la feature                 → 0
grep -E "#[0-9a-fA-F]{3,8}" src/admin/images/                → 0
grep "console\.|TODO" src/admin/images/ + su test            → 0
grep "'rows' in|'image' in" src/admin/images/                → 0  (todo por normalizeApi)
```

`src/admin/images/mockImages.ts` eliminado; no queda ni un import suyo en el
árbol (era el test el único consumidor externo).

## Salida de la verificación

```
npm test           → Test Files 18 passed (18) | Tests 144 passed (144)   exit 0 (53.3 s)
npm run typecheck  → exit 0, sin salida
npm run build      → ✓ built in 13.22s, exit 0
                     (aviso «Some chunks are larger than 500 kB»: esperado,
                      docs/verification.md §1)
```

**Conteo antes → después: 18 archivos / 133 tests → 18 archivos / 144 tests.**
Mismo número de archivos (se reescribió `ImagesGrid.test.tsx`, no se añadió uno
nuevo); **+11 tests netos** = 23 casos nuevos menos los 12 de la maqueta.

Ningún test previo roto y **ningún rojo** en las pasadas completas, incluidos los
tres archivos que el líder señaló como flakes bajo carga (`AppRoutes`,
`ContactModal`, `PricesList`). Corrí una sola suite a la vez.

## Notas para el líder (fuera de mi lista de archivos)

1. **`docs/api-contract.md` §1** anuncia «Los tres helpers y sus cookies»
   (`postLead`, `apiJson`, `publicJson`) y dice «Todas las peticiones con body van
   con `Content-Type: application/json`». Con la feature 33 hay un **cuarto**
   transporte, `apiUpload` (`credentials: 'include'`, sin cabeceras), y esa frase
   ya no es universal. Lo documenté entero en el nuevo **§4 ter**, pero la tabla
   de §1 se queda corta; el líder me acotó a «solo la sección de imágenes» de ese
   documento, así que no la toqué. Misma nota para la lista de consumidores de
   `normalizeApi` de §1, que no menciona la pantalla de imágenes.
2. **`docs/architecture.md`** sigue diciendo que imágenes está «en maquetación con
   datos mock» y su §5 no lista `/api/images`. Es el mismo drift que dejó la 32
   (observación 1 de `review_32.md`), ahora también con imágenes.
3. **Baselines desfasados**: `docs/verification.md` §1-§2 y `docs/architecture.md`
   §8 siguen anunciando `15 archivos / 86 tests`. El real tras esta feature es
   **18 archivos / 144 tests**.
4. **`tsconfig.tsbuildinfo`** vuelve a aparecer modificado en `git status`: es un
   artefacto trackeado (deuda preexistente ya registrada en `history.md`), lo
   toca cualquier `typecheck`. No lo he tocado a mano ni lo he revertido.
