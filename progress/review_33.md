# Review — feature 33: Cablear la vista de imágenes a `/api/images` y `/api/admin/images`

**Veredicto: APROBADO**

Revisado sobre el commit `af2613e` de `feat/admin-cruds`. No he editado ni una
línea de código del implementador: las mutaciones de la sección 4 se aplicaron y
se revirtieron con restauración desde copia, y el árbol quedó como estaba
(`git status` → solo `tsconfig.tsbuildinfo`, artefacto trackeado preexistente).

---

## 1. Verificación ejecutada (por mí, no reportada)

Suites de una en una, como avisó el líder por el flake de CPU.

```
npm test           → Test Files 18 passed (18) | Tests 144 passed (144)   exit 0 (53.03 s)
npm run typecheck  → exit 0, sin salida
npm run build      → exit 0, ✓ built in 12.72s
                     («Some chunks are larger than 500 kB»: esperado, docs/verification.md §1)
npx vitest run src/admin/__tests__/ImagesGrid.test.tsx  → 23 passed, exit 0
```

Coincide con lo anunciado: **133 → 144 tests**, mismo número de archivos (el test
de imágenes se reescribió, no se añadió uno nuevo). **Ningún rojo, ni siquiera
intermitente**, en ninguna de las pasadas; no hizo falta repetir nada aislado.

Estáticas:

```
fetch( fuera de src/lib/api.ts (sin __tests__)      → 0
any en los archivos de la feature                   → 0
hex en src/admin/images/                            → 0
console.* / TODO en src/admin/images/ + su test     → 0
src/admin/images/mockImages.ts                      → no existe; ni un import suyo en el árbol
```

---

## 2. Los 10 acceptance criteria

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Listado por el endpoint **público** `GET /api/images?seccion=`, `{ rows }` sin paginación | **OK** | `api.ts:546-551` usa `publicJson` contra `/api/images`; `ImagesGrid.tsx:217-218`. Tests `:175-198` (URL exacta + `credentials: 'omit'`), `:200-207` (`urls(spy)` congelado a `['/api/images']`, sin «por página»), `:224-239` (`?seccion=cta_final`). **No hay ninguna ruta inventada bajo `/api/admin/` para leer**: el único `/api/admin/images*` del árbol son POST/PATCH/DELETE. |
| 2 | `POST /api/admin/images` multipart, campo **`file`**, sin `Content-Type` a mano, helper en `lib/api.ts` y no un `fetch` en el componente | **OK** | `apiUpload` en `api.ts:562-571`, `createAdminImage` en `:578-585` con `body.append('file', input.file)`. Test `:291-304`: body `toBeInstanceOf(FormData)`, `get('file')` es `File`, `init.headers` **undefined** y `Headers(...).get('Content-Type')` **null**. Detalle en §3. |
| 3 | `PATCH` JSON con solo `alt`, `orden`, `seccion`; sin «reemplazar imagen» | **OK** | `api.ts:588-593`; `ImagePatchInput` (`:450-454`) no admite otra cosa. `ImagesGrid.tsx:100-104` manda exactamente esos tres. Test `:461-494` afirma `toEqual({ alt, orden, seccion })` —igualdad estricta, no `toMatchObject`, así que un campo de más rompe— y comprueba que no hay botón `/reemplazar/i` ni input `Archivo de imagen` en el diálogo de edición, y que sigue el copy «El archivo no se puede reemplazar…» (`ImagesGrid.tsx:135-137`). |
| 4 | `DELETE` con `204` sin cuerpo | **OK** | `api.ts:600-603`, con la guarda `res.ok &&` antes de sintetizar. Tests `:514-534` (204 = éxito) y `:536-547` (un `500` **sin cuerpo** no se confunde con él). |
| 5 | Previews a `${API_BASE}/api/images/${id}/raw`, construida en el front; el JSON no trae `url` | **OK** | `imageRawUrl` en `api.ts:463-465`, único sitio donde se aplica `API_BASE`; `ImagesGrid.tsx:355-360` solo pinta `src={imageRawUrl(img.id)}`. **No se inventó ningún campo `url`**: `AdminImage` (`:424-434`) tiene los 9 campos del contrato y ni uno más. Tests `:209-222` (listado, incluido el `alt=""` de la imagen sin alt) y `:283-284` (la recién subida, con el id que devuelve el backend). |
| 6 | `id` como string | **OK** | `AdminImage.id: string` (`api.ts:427`); los helpers aceptan `string \| number` solo por comodidad de llamada. **Cero `Number(`/`parseInt` sobre ids** en producción (los dos `Number(` del bloque son `formatFileSize` y `parseOrden`). Fixtures `'1'`…`'4'`, y el POST devuelve `'90'`. Discriminación comprobada: al mutar a `id: number`, `typecheck` cae con 6 errores en el test (líneas 24, 29, 88, 103, 113, 118). |
| 7 | `413`/`415`/`422 con field` con su mensaje, **más** validación en cliente de tipo y tamaño | **OK** | `validateImageFile` (`api.ts:508-533`: MIME, coherencia extensión↔MIME y 5 MB) se llama al elegir archivo (`ImageUploadDialog.tsx:111`) **y** al enviar (`:126`). Remotos en `:52-68` y `:150-155`. Tests `:327-344` (tipo, `accept` sin SVG, **cero escrituras**), `:346-357` (>5 MB, cero escrituras), `:373-389` (orden), `:391-407` (413 sin cuerpo), `:409-424` (415 con mensaje propio), `:426-443` (422 con `field`), `:496-510` (422 del PATCH). |
| 8 | `mockImages.ts` eliminado o reducido a fixtures | **OK** | Archivo borrado entero (291 líneas en el diff); `src/admin/images/` solo tiene los dos `.tsx`. Las semillas viven en el test (`:12-33`) y el contrato/validación en `lib/api.ts`. Ni un import residual. |
| 9 | Tests con `vi.spyOn(globalThis,'fetch')` y `Response` reales; POST con FormData y sin `Content-Type` | **OK** | `ImagesGrid.test.tsx:60` es el único punto de intercepción; `json()` (`:39-44`) y `new Response(null, {status})` son `Response` de verdad. **No se mockea `src/lib/api.ts`** (cero `vi.mock` en el archivo). Aserciones en `:293-304`. El mock incluso responde `415` si el POST no llega como `FormData` (`:81`), imitando a multer. |
| 10 | `api-contract.md` mueve imágenes a la zona de endpoints vigentes | **OK** | Nueva **§4 ter** con las 5 rutas, tipos, `multipart`, URL construida, límites y tabla de errores; §10.2 queda como puntero sin duplicar; la tabla de §10 y su encabezado se actualizan («Sí, ya cableado (feature 33)»). Todo en el mismo commit. |

---

## 3. `apiUpload`, punto por punto

`src/lib/api.ts:562-571`. Lo pedido, comprobado en el código y con mutación:

- **No fija `Content-Type`**: el `RequestInit` es literalmente `{ method, credentials, body }`. Sin `headers` de ningún tipo, así que el navegador escribe `multipart/form-data; boundary=…`. Mutación **M1** (añadirle `headers: { 'Content-Type': 'multipart/form-data' }`) → **rojo**.
- **`credentials: 'include'`**: `:564`. Mutación **M13** (quitarlo) → **rojo**, el test lo afirma con `toMatchObject`.
- **Misma forma `{ ok, status, data }`** que `apiJson`: `:570` devuelve exactamente los mismos tres campos, y el consumidor lo pasa por `normalizeApi` igual que el resto (`ImageUploadDialog.tsx:139-143`).
- **No lanza**: el `res.json()` va en `try/catch` (`:568-569`), idéntico a `apiJson:153-154`. Matiz honesto: si el propio `fetch` rechaza (red caída), la promesa rechaza — **exactamente como `apiJson` y `postLead`**, y `normalizeApi:127-131` lo captura y devuelve `{ ok: false, status: 0 }`. No es una desviación de esta feature: es el contrato del módulo.
- **No acepta `headers` desde fuera**: la firma es `(path: string, body: FormData)`. No hay parámetro `init`, así que la puerta no está entreabierta, está tapiada. Además **no se exporta** (`:562`, sin `export`): fuera de `lib/api.ts` nadie puede usarlo mal. Cierre correcto y bien argumentado en el JSDoc `:553-561`.
- **El archivo viaja en `file`**: `api.ts:580`. Mutación **M2** (renombrarlo a `archivo`) → **rojo**.

---

## 4. Prueba de que los tests discriminan (mutación → rojo → revertido)

Las corrí yo, una a una, cada una sola sobre el árbol y restaurada desde copia
antes de la siguiente, con `npx vitest run src/admin/__tests__/ImagesGrid.test.tsx`
(baseline aislado: 23 verdes). No me fío del informe: estas son mis pasadas.

| # | Mutación | Resultado |
|---|---|---|
| M1 | `apiUpload` fija `Content-Type: multipart/form-data` | **ROJO — 1** |
| M2 | `createAdminImage` manda el archivo en `archivo`, no en `file` | **ROJO — 1** |
| M3 | `listImages` pasa a `apiJson` contra `/api/admin/images` | **ROJO — 3** |
| M4 | `imageRawUrl` devuelve `/uploads/:id.png` | **ROJO — 2** |
| M5 | `deleteAdminImage` sintetiza el 204 **sin** la guarda `res.ok` | **ROJO — 1** (el 500 sin cuerpo) |
| M6 | `validateImageFile` deja de comprobar el tamaño | **ROJO — 1** |
| M7 | `ACCEPTED_IMAGE_MIME_TYPES` admite `image/svg+xml` | **ROJO — 1** |
| M8 | El `PATCH` añade `filename` al JSON | **ROJO — 1** |
| M9 | El diálogo de subida ignora `res.field` | **ROJO — 1** |
| M10 | Se ignora `STATUS_COPY` (413 sin cuerpo) | **ROJO — 1** |
| M11 | El filtro no viaja al backend (`listImages({})`) | **ROJO — 1** |
| M12 | Se borra el copy «El archivo no se puede reemplazar…» | **ROJO — 1** |
| M13 | `apiUpload` sin `credentials: 'include'` | **ROJO — 1** |
| tipos | `AdminImage.id: string` → `number` | **typecheck ROJO**, 6 errores en las fixtures |

Ninguna pasó desapercibida. Es el estándar que faltó en la 29 y aquí sí está.

Un control negativo, para ser exacto sobre **qué** cubren (ver Observación 2):

| # | Control | Resultado |
|---|---|---|
| N1 | Sustituir la tabla `FIELD_BY_BACKEND[res.field]` por un cast crudo `res.field as FormField` | **VERDE, 23/23** |

---

## 5. El mapeo del `field` (lo que pediste juzgar)

**Hizo lo que se le pidió y la justificación se sostiene, con una limitación de
cobertura que no bloquea.**

Hay dos tablas, no un whitelist: `FIELD_BY_BACKEND` en `ImageUploadDialog.tsx:38-42`
(`file`, `seccion`, `orden`) y `EDIT_FIELD_BY_BACKEND` en `ImagesGrid.tsx:47-51`
(`alt`, `orden`, `seccion`). Separarlas es correcto y no es duplicación
gratuita: **son formularios con inputs distintos** —el `PATCH` no tiene campo
`file` y el `POST` no puede recibir un `422` de `alt`—, así que una tabla única
mapearía `file` a un input inexistente en el diálogo de edición.

Sobre `alt` fuera de la tabla de subida: el argumento («el backend lo trunca a
`ALT_MAX`, no lo rechaza») está respaldado por el contrato, que dice literalmente
«`alt` no aparece: se trunca, no se rechaza» (§4 ter). Y si llegara igualmente,
cae al `Alert role="status"` en vez de romper: degradación correcta.

La ventaja real frente al whitelist de la 32 —que un `field` desconocido, p. ej.
`section`, caiga al aviso global en vez de marcar un input inexistente— es cierta
en el código (`Record` no indexado + `?? null` → `null` → `setStatus`), pero
**ningún test la ejerce**: por eso N1 sale verde. No lo cuento como fallo porque
el acceptance 7 solo exige que un `422` **con `field`** marque el campo, y eso sí
tiene dos tests (`:426-443` y `:496-510`). Queda como observación.

---

## 6. `src/lib/api.ts` — ¿el diff es aditivo?

**Sí, estrictamente.** `git show af2613e -- src/lib/api.ts` es
`198 insertions(+), 0 deletions(-)`, un único hunk `@@ -403,3 +403,201 @@`: todo
lo nuevo entra **después** de la última línea del archivo previo. Cero líneas
existentes tocadas.

Comprobado además que siguen intactos, byte a byte: `postLead`, `apiJson`
(`:147-156`, conserva su `Content-Type: application/json`), `publicJson`,
`normalizeApi`, `readErrorMessage`/`readErrorField`, `adminErrorMessage` y los
helpers de leads, artículos y usuarios. Los diez consumidores de la frontera no
se enteran de esta feature: lo nuevo son símbolos nuevos, no cambios de forma.

---

## 7. Lo aprobado en la feature 29, ¿se conservó?

- **`PATCH` limitado a `alt`/`orden`/`seccion`** — sí, y reforzado por el tipo `ImagePatchInput`, que no deja mandar otra cosa sin romper `typecheck`.
- **Sin «reemplazar imagen»** — sí. El diálogo de edición no tiene input de archivo ni botón; el test lo afirma en negativo (`:469-470`).
- **El copy que lo explica sigue ahí** — dos veces: en el diálogo (`ImagesGrid.tsx:135-137`) y en la cabecera de la pantalla (`:273-277`). Mutación M12 lo confirma cubierto.
- **Validación en cliente PNG/JPEG/WebP con SVG excluido** — `ACCEPTED_IMAGE_MIME_TYPES` (`api.ts:468`) y `accept` (`ImageUploadDialog.tsx:179`). El test desactiva `applyAccept` a propósito para probar que el rechazo viene de **nuestra** validación y no del atributo (`:330`), que es el caso real de quien fuerza el diálogo del sistema. Buen detalle.
- **Tamaño 5 MB** — `MAX_IMAGE_SIZE_BYTES` (`:478`) y test `:346-357`, ambos con «cero escrituras».
- **Además de los 413/415/422** — sí, no en su lugar: los cuatro tests remotos conviven con los dos locales.

Se conservan también el `accept` sin SVG, el aviso de magic bytes en el copy
(`ImageUploadDialog.tsx:202-206`) y la comprobación de coherencia
extensión↔MIME, que ni el acceptance pedía.

---

## 8. Checkpoints

- **C1** [x] `npm test` exit 0, 18 archivos / 144 tests. Ningún test previo roto: los 133 anteriores siguen ahí (+11 netos = 23 nuevos − 12 de la maqueta).
- **C2** [x] Los 10 puntos del `acceptance` tienen test propio; tabla de §2 con archivo y línea, y §4 prueba que discriminan.
- **C3** [x] `typecheck` exit 0 y `build` exit 0 (solo el aviso esperado de chunk).
- **C4** [x] Sin `any`, sin variables muertas (lo forzaría `noUnusedLocals`), sin hex —el único color es `alpha(tokens.brand.orange, 0.1)` en `ImagesGrid.tsx:339` y `tokens.text.disabled` en `:368`, ambos vía token—, nombres y ubicación correctos (test en `src/admin/__tests__/`, tipos exportados desde `lib/api.ts`, componentes `PascalCase` con `export default`).
- **C5** [x] Cero `fetch` fuera de `src/lib/api.ts`, incluido el caso delicado de esta feature: la subida va por `apiUpload` y no por un `fetch` suelto. Sin state manager ni librería de fetching nueva. Tipos: `ImageSeccion` derivado con `const assertion` + `typeof` (`:414-416`), `ImagesListResponse` sobre `AdminImage`. Ver Observación 1 sobre `ImagePatchInput`.
- **C6** [x] Los 5 endpoints están en `docs/api-contract.md` §4 ter, actualizado en el mismo commit, y §10.2 dejó de duplicar el contrato.
- **C7** [x] `feature_list.json` sigue en `pending`, que es el estado real hasta este veredicto; `progress/impl_33.md` documenta lo hecho, la verificación y por qué la bitácora no fue a `current.md` (instrucción explícita del líder). Mismo criterio que en `review_32.md`.
- **C8** [x] Ningún `.env*` leído ni escrito; ninguna variable de entorno nueva (`VITE_API_BASE` ya existía y se usa por nombre).
- **C9** [x] Sin `console.log`, sin código comentado, sin `TODO` huérfanos, sin `.orig`/`.bak`. `git status` solo muestra `tsconfig.tsbuildinfo`, artefacto trackeado preexistente que toca cualquier `typecheck` (deuda ya registrada, no de esta feature).
- **C10** [x] Scope de una sola feature: los 6 archivos declarados + su informe. No se tocaron `src/admin/users/`, `src/admin/prices/`, `AppRoutes.tsx` ni `AdminLayout.tsx`, y **no** se arregló de paso el `role="alert"` que falta en `UsersList`/`LeadsList` (correcto: no es su feature; lo aplicó solo a su propio archivo).
- **C11** [x] `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` y `.gitignore` intactos.

## Detalle de los fallos

Ninguno. No hay `[ ]` en la lista.

---

## 9. Observaciones (ninguna bloquea; para el líder)

1. **`ImagePatchInput` no se deriva de `AdminImage`.** `api.ts:450-454` reescribe
   a mano `alt: string | null`, `orden: number` y `seccion: ImageSeccion`, que es
   exactamente `Partial<Pick<AdminImage, 'alt' | 'orden' | 'seccion'>>`. Hoy los
   tipos coinciden y `typecheck` está verde, pero si `AdminImage` cambia, el
   patch deriva en silencio. La feature 32 sí usó el molde
   (`UserPatchInput = Partial<UserInput>`, `AdminUserRow extends AdminUser`).
   `ImageUploadInput` no puede derivarse —lleva `file: File`, que no existe en la
   fila—, así que solo aplica a uno de los dos. Es de una línea; no lo cuento
   como C5 porque la derivación esencial (`ImageSeccion` compartido, `rows:
   AdminImage[]`) sí está.
2. **La ventaja de la tabla sobre el whitelist no está testeada.** Ver §5: N1
   demuestra que un cast crudo pasa los 23 tests. Un caso con
   `field: 'section'` que debe caer al `Alert role="status"` cerraría el círculo
   de la observación 3 de `review_32.md`. Aplícalo también a la 34.
3. **Drift documental, ya heredado y ahora mayor.** `docs/architecture.md:9`
   sigue diciendo que imágenes está «en maquetación con datos mock» y su §5 no
   lista `/api/images` ni `/api/admin/images`; `docs/verification.md` §1-§2 y
   `docs/architecture.md` §8 siguen anunciando `15 archivos / 86 tests` cuando el
   real es **18 / 144**. C6 solo exige `api-contract.md`, así que no es fallo del
   implementer —ninguno de esos archivos estaba en su lista—, pero es el tercer
   cierre consecutivo que lo arrastra.
4. **`docs/api-contract.md` §1 se quedó corta.** Anuncia «Los tres helpers y sus
   cookies» y afirma que «todas las peticiones con body van con
   `Content-Type: application/json`». Con `apiUpload` hay un **cuarto**
   transporte y esa frase ya no es universal; la lista de consumidores de
   `normalizeApi` tampoco menciona imágenes. El implementer lo detectó y lo dejó
   escrito (`impl_33.md`, nota 1) en vez de salirse de su acotación: correcto,
   pero alguien tiene que actualizar §1.
5. **`loading` sigue siendo un booleano** (`ImagesGrid.tsx:206`) y no la máquina
   `'loading' | 'ok' | 'error'` que pide `conventions.md` §5. Es el patrón
   heredado de `LeadsList.tsx:22` y `UsersList.tsx:37`, y §5 también dice «imita
   el archivo vecino», así que no es regresión de esta feature. Si quieres la
   máquina de estados, es una feature de refactor propia para las tres pantallas.

---

## 10. Nota de proceso

Este veredicto **no** cambia `feature_list.json`: la 33 sigue en `pending` y el
paso a `done` le toca al líder, junto con la actualización de `progress/current.md`
y los baselines del punto 3 de las observaciones.
