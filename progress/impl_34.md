# Implementación — feature 34: Cablear la vista de precios a `/api/precios` y `/api/admin/precios`

**Estado:** código en pie y verde. Pendiente de review.
**Fecha:** 2026-07-31.

> Nota de proceso: el líder me acotó explícitamente a una lista de archivos y me
> indicó **no tocar** `feature_list.json` ni `progress/current.md`, así que el
> estado de la 34 no se movió a `in_progress` desde esta sesión y la bitácora vive
> aquí. El paso a `done` lo hará quien corresponda tras el veredicto del reviewer.
> Mismo criterio que en `impl_32.md` e `impl_33.md`.

## Baseline (árbol limpio, antes de tocar nada)

```
npm test          → Test Files 18 passed (18) | Tests 144 passed (144)   exit 0 (54.3 s)
npm run typecheck → exit 0, sin salida
npm run build     → ✓ built in 12.27s, exit 0 (aviso de chunk >500 kB, esperado)
```

Coincide con lo anunciado por el líder. Ningún rojo, ni siquiera en `PricesList`,
que era uno de los tres flakes señalados; corrí una sola suite a la vez.

## Archivos tocados

| Archivo | Qué |
|---|---|
| `src/lib/api.ts` | **Solo añadidos** al final: bloque «Precios (feature 34)». Ni una línea existente modificada. |
| `src/admin/prices/PricesList.tsx` | Cableado a `listPlanes` / `deleteAdminPlan` vía `normalizeApi`; alta y borrado con confirmación; error del listado con `role="alert"`. |
| `src/admin/prices/PlanEditDialog.tsx` | Cableado a `createAdminPlan` / `updateAdminPlan`; tabla `FIELD_BY_BACKEND`; alta además de edición. |
| `src/admin/prices/mockPrices.ts` | **Eliminado** (287 líneas). Las fixtures viven ahora en el test. |
| `src/admin/__tests__/PricesList.test.tsx` | Reescrito: 24 tests contra `globalThis.fetch`. |
| `docs/api-contract.md` | Precios pasa de §10.4 (maquetación) a §4 quater (endpoints vigentes). |
| `progress/impl_34.md` | Este informe. |

No se tocó `src/AppRoutes.tsx`, `src/admin/AdminLayout.tsx`, `feature_list.json`,
`progress/current.md`, ni nada de `src/admin/users/` ni `src/admin/images/`.
**`src/components/sections/Pricing.tsx` no se tocó** (es la feature 35); lo leí
como referencia y nada más. Infraestructura intacta (C11). Ningún `.env*` leído
ni escrito (C8).

## Lo nuevo en `src/lib/api.ts`

```ts
listPlanes()                        // GET    /api/precios              → { rows }   PÚBLICO
getAdminPlan(id)                    // GET    /api/admin/precios/:id    → { plan }
createAdminPlan(payload)            // POST   /api/admin/precios        → 201 { plan }
updateAdminPlan(id, patch)          // PATCH  /api/admin/precios/:id    → 200 { plan }
deleteAdminPlan(id)                 // DELETE /api/admin/precios/:id    → 204 sin cuerpo
```

Más los tipos (`AdminPlan`, `PlanesListResponse`, `PlanInput`, `PlanPatchInput`),
la aritmética de los derivados (`calcularPrecioAnual`, `calcularAhorroAnual`,
`derivarPrecios`), `formatMoneda` y los dos límites del backend
(`PLAN_NOMBRE_MAX`, `PLAN_TRIAL_MAX`). `parseOrden` y `ORDEN_ERROR` se
**reutilizan** de la feature 33: el backend usa el mismo criterio y literalmente
el mismo mensaje (`preciosRouter.js:134` = `imagesRouter`).

## Decisiones

### 1. La asimetría: el listado es público, la escritura no

`GET /api/admin/precios` **no existe**. Verificado en la fuente del backend:
`preciosRouter.js` solo declara `router.get('/api/admin/precios/:id', …)`, así que
la ruta sin `:id` cae fuera y devuelve **404**, no 401. Por eso:

- **Listado → `publicJson`** (`credentials: 'omit'`) contra `/api/precios`.
- **Detalle y las tres escrituras → `apiJson`** (`credentials: 'include'`) contra
  `/api/admin/precios[/:id]`.

Es la misma forma que imágenes (§4 ter), pero aquí ni siquiera hay un listado
privado al que caer. El mock del test **responde 404 a `GET /api/admin/precios`**,
igual que el servidor vivo: si alguien mueve el listado al admin, la pantalla se
queda vacía y tres tests se ponen en rojo (mutación M1).

### 2. `precio_anual` y `ahorro_anual` no se envían — y no se pueden enviar

El acceptance 3 pasa de disciplina a **error de compilación**: `PlanInput` se
deriva de `AdminPlan` con `Omit<…, 'precio_anual' | 'ahorro_anual' | …>`, así que
`createAdminPlan({ …, precio_anual: 17 })` no compila. Encima hay dos aserciones
de runtime: los payloads del `POST` y del `PATCH` se comprueban con `toEqual`
(igualdad estricta: un campo de más rompe) y un test recorre **todos** los cuerpos
de escritura verificando que ninguno trae esas dos claves.

La UI los sigue mostrando: en el listado, tal como los devuelve la API (los
calcula el backend); en el formulario, recalculados en vivo con `derivarPrecios`,
dentro de un bloque `data-testid="derivados"` sin ningún control editable.

### 3. Un plan a convenir **omite** las cifras, no las manda en `null`

Hallazgo de leer la fuente del backend, y la trampa de esta feature. La maqueta
enviaba `precio_mensual: null` cuando `es_custom`. Contra el backend real eso es
un **422 seguro**: `validarPlan` pasa el valor por `parseDecimal`
(`preciosRouter.js:47-54`), que devuelve `null` para `null` y dispara
`{ error: 'precio_mensual debe ser un número', field: 'precio_mensual' }`.

Lo correcto es **omitir ambos campos**: `body.precio_mensual === undefined` se
salta la validación, el `POST` aplica el default de `withDefaults` (`0`) y el
`PATCH` conserva lo guardado. Y como `es_custom` es `true`, `toPlan()` devuelve
los dos derivados en `null` igual. Por eso `PlanInput` los declara
`Partial<Pick<AdminPlan, 'precio_mensual' | 'descuento_pct'>>`: opcionales y
**nunca `null`**.

El mock del test reproduce `parseDecimal`, así que volver a mandar `null` sale en
rojo (mutación M4), no en verde con un plan mal guardado.

### 4. Los planes Custom se detectan por `es_custom`, nunca por el nulo

Se conserva tal cual lo dejó la maqueta, que era correcto, y ahora con la fixture
real: Enterprise llega con `precio_mensual: 0`, `descuento_pct: 0` y los dos
derivados en `null`. Las cuatro celdas de cifras preguntan **primero** por
`es_custom`. El test afirma además que la fila entera no contiene ni `$` ni `%`.

Añadido al cablear: el formulario **tampoco transcribe el `0`**. Al abrir un plan
Custom, «Precio mensual» arranca vacío, no en «0»; volcar el cero del backend en
el campo sería reintroducir por la puerta de atrás el «$0» que `es_custom` existe
para evitar.

### 5. El `id` es string

`AdminPlan.id: string`. Para que el test lo pruebe de verdad y no de boquilla, la
fixture de Enterprise lleva **`id: '9007199254740993'`**, un `BIGSERIAL` por
encima de `Number.MAX_SAFE_INTEGER`: si alguien lo pasara por `Number()`, la URL
saldría con `…992` y la escritura iría a otro plan. Hay un test dedicado que
afirma la URL exacta y que **no** contiene `…992`. Cero `Number(`/`parseInt`
sobre ids en producción.

### 6. `field` → input: tabla explícita, y un test que la distingue de un cast

Se sigue el patrón de la feature 33 (`Record<string, FormField>`, no el
`FORM_FIELDS.find` de la 32), y se atiende la **observación 2 de
`review_33.md`**: allí ningún test distinguía la tabla de un cast crudo. Aquí sí.

`FIELD_BY_BACKEND` tiene los **seis** campos que el backend puede rechazar *y*
que tienen un input con `helperText`: `nombre`, `precio_mensual`,
`descuento_pct`, `vinetas`, `vinetas_tachadas`, `orden`. Faltan a propósito:

- **`trial_texto`**: el backend lo trunca a `TRIAL_MAX`, no lo rechaza
  (`preciosRouter.js:126-130`), así que nunca llega como `field`. Mismo criterio
  que el `alt` de imágenes.
- **`destacado` y `es_custom`**: son `Switch`. No tienen `helperText`, así que un
  cast crudo `res.field as FormField` escribiría el error en un slot que **nadie
  renderiza** y el usuario no vería nada. Con la tabla caen al `Alert
  role="status"`.

De ahí el test «un 422 sobre un campo sin input propio (`es_custom`) cae al aviso
global en vez de perderse». Control negativo ejecutado: sustituir la tabla por
`res.field as FormField` deja ese test **en rojo** (mutación M7), que es
exactamente lo que en la 33 salía verde.

### 7. Alta y borrado en la UI, y por qué no es scope de más

La maqueta solo tenía edición porque tenía un seed. **El backend real tiene las
tablas vacías y no hay seed** (§4 quater): sin `POST` en el panel, la pantalla no
puede llegar a mostrar nunca un solo plan, y la feature 35 —que consume
`/api/precios` desde la landing— se quedaría sin datos que consumir para siempre.
El acceptance 2 nombra el `DELETE` («devuelve 204») y el 3 nombra el `POST`
(«no se envían nunca en el POST ni en el PATCH»), así que las dos rutas están
dentro del criterio de aceptación, no fuera. El diálogo de confirmación del
borrado sigue el molde de `ArticlesList`/`ImagesGrid`.

`getAdminPlan` es el único helper sin consumidor en la UI —igual que
`getAdminUser` desde la feature 32—, pero está en el contrato y el acceptance 2 lo
menciona («el detalle»), así que se añade y se cubre con un test directo del
helper que congela URL, método y `credentials`.

### 8. El `204` del `DELETE`

Mismo molde que `deleteAdminUser` y `deleteAdminImage`: se sintetiza el
`{ ok: true }` que el 204 no trae, **solo si la respuesta fue 2xx**. Hay test del
`204` como éxito y test de un `500` **sin cuerpo** que no debe confundirse con él.

### 9. Dónde quedó lo que vivía en `mockPrices.ts`

El archivo se borró entero (287 líneas). Su contenido se repartió así:

- **Contrato y aritmética** (`AdminPlan`, `derivarPrecios`, `calcularPrecioAnual`,
  `calcularAhorroAnual`, `formatMoneda`, los dos máximos) → a `src/lib/api.ts`,
  que ya es el sitio de la validación y el formato derivados del contrato
  (`formatFileSize`, `validateImageFile`, `EMAIL_RE`/`PHONE_RE`). `formatMoneda`
  lo necesitan las dos pantallas de precios y lo necesitará la landing (35).
- **Conversión de los textarea** (`parseVinetas`, `vinetasATexto`) y el parseo de
  importes (`parseImporte`) → a `PlanEditDialog.tsx`, su único consumidor.
- **Datos semilla** → a las fixtures del test.
- **El comentario obsoleto de su línea 37** —decía que `normalizeApi` todavía
  descarta el campo `field`, falso desde la feature 31— **desaparece con el
  archivo**. No se ha reintroducido en ningún sitio: el bloque nuevo de `api.ts`
  y el JSDoc de `FIELD_BY_BACKEND` describen el comportamiento vigente (`field`
  llega en `ApiFailure` y el consumidor lo mapea).

## Tests — 24 casos en `src/admin/__tests__/PricesList.test.tsx`

`vi.spyOn(globalThis, 'fetch')` con `Response` reales. **No se mockea
`src/lib/api.ts`**. `mockPreciosApi()` es un backend mínimo con `store` en memoria
(la recarga posterior a una escritura devuelve el listado actualizado) y dos
escotillas, `list` y `write`. Reproduce tres comportamientos del backend real:
**404 en `GET /api/admin/precios`**, **`parseDecimal` rechazando `null`** y el
**recálculo de los derivados** en cada respuesta (con una implementación propia de
la aritmética, para que el test no valide `derivarPrecios` contra sí misma).

| # | Caso | Acceptance |
|---|---|---|
| 1 | GET `/api/precios` con `credentials: 'omit'`; pinta orden, nombre, cifras, trial y viñetas | 1, 8 |
| 2 | No lista por `/api/admin/precios` y no pagina: `urls(spy)` congelado a `['/api/precios']` | 1, 8 |
| 3 | El detalle sí es privado: GET `/api/admin/precios/:id`, cookie, `{ plan }` | 2, 5, 8 |
| 4 | Un plan Custom no muestra ninguna cifra pese al `precio_mensual: 0` | 4 |
| 5 | Error del listado: mensaje del backend en un `role="alert"` | — |
| 6 | Estado vacío (las tablas del backend arrancan sin planes) | — |
| 7 | POST `/api/admin/precios` con payload exacto y recarga por `/api/precios` | 2, 3, 8 |
| 8 | Un plan a convenir **omite** `precio_mensual` y `descuento_pct` | 3 |
| 9 | Validación de cliente: sin nombre, cero escrituras | 6 |
| 10 | PATCH `/api/admin/precios/1` con payload exacto sin derivados; repinta lo del backend | 2, 3 |
| 11 | El id como string: un `BIGSERIAL` fuera del rango seguro no se corrompe | 5 |
| 12 | Editar viñetas incluidas y tachadas actualiza la vista | 4 |
| 13 | El formulario no ofrece los derivados como campos; los muestra calculados | 3, 4 |
| 14 | La vista previa recalcula con el redondeo del backend, sin ninguna petición | 4 |
| 15 | El diálogo de un Custom no calcula cifras ni deja editar precio ni descuento | 4 |
| 16 | **Ninguna** escritura incluye jamás `precio_anual` ni `ahorro_anual` | 3 |
| 17 | `422` con `field` marca el input culpable (`aria-invalid`), no el aviso global | 6 |
| 18 | `422` con `field` sin input propio (`es_custom`) → aviso global | 6 |
| 19 | Error sin `field` → `Alert role="status"` | 6 |
| 20 | `403` traducido: nunca se enseña «forbidden» | 6 |
| 21 | DELETE `/api/admin/precios/3`; el `204` sin cuerpo es éxito | 2 |
| 22 | Un `500` **sin cuerpo** no se confunde con el `204` | 2 |
| 23 | Cancelar no borra: cero escrituras | — |
| 24 | Un editor consulta los planes pero no puede crear, editar ni borrar | — |

## Prueba de que los tests discriminan (mutación → rojo → revertido)

Cada mutación se aplicó **sola** sobre el código de producción, se corrió
`npx vitest run src/admin/__tests__/PricesList.test.tsx` y se **revirtió antes de
la siguiente** (script en el scratchpad de la sesión, con `finally` que restaura
los tres archivos desde copia). Las 13 salen en rojo.

| # | Mutación | Resultado |
|---|---|---|
| M1 | `listPlanes` usa `apiJson` contra `/api/admin/precios` | **ROJO — 22** (el mock responde 404, como el servidor vivo) |
| M2 | `deleteAdminPlan` deja de sintetizar el `204` | **ROJO — 1** |
| M3 | `deleteAdminPlan` al estilo `ArticlesList` (`data == null ⇒ ok: true`) | **ROJO — 1** (el `500` sin cuerpo) |
| M4 | El plan a convenir manda `precio_mensual: null` en vez de omitirlo | **ROJO — 1** (el mock reproduce `parseDecimal`) |
| M5 | El payload arrastra los dos derivados | **ROJO — 3** (POST, PATCH y el barrido de cuerpos) |
| M6 | Las celdas de cifras se fían de los nulos en vez de `es_custom` | **ROJO — 2** |
| M7 | **Cast crudo `res.field as FormField` en vez de la tabla** | **ROJO — 1** (el `422` de `es_custom`) |
| M8 | `updateAdminPlan(Number(plan.id), …)` | **ROJO — 1** (el id BIGSERIAL se corrompe) |
| M9 | El diálogo transcribe el `precio_mensual: 0` de un plan Custom | **ROJO — 1** |
| M10 | `calcularPrecioAnual` pierde el `Math.round()` del backend | **ROJO — 2** |
| M11 | No se recarga el listado tras guardar | **ROJO — 5** |
| M12 | El `Box` del error del listado pierde `role="alert"` | **ROJO — 2** |
| M13 | `cifras` pierde la guarda `!esCustom` | **ROJO — 1** *(ver abajo)* |

### Lo que M13 destapó, y que corrigió esta suite

**M13 salió VERDE en la primera pasada**, y eso invalidaba una afirmación que yo
ya había escrito. La razón: el test del plan a convenir marcaba el switch con los
campos de precio **vacíos**, así que `precioNum` era `null` y `cifras` salía vacío
por la vía equivocada — el test no distinguía «lo decide `es_custom`» de «lo
decide que el input esté en blanco».

El caso real sí existe: se teclea `349`, se marca «a convenir» y el campo
**conserva su texto** (queda deshabilitado, no vacío). Sin la guarda, ese plan
Custom viajaría con `precio_mensual: 349`.

Corregido: el test ahora teclea precio y descuento **antes** de marcar el switch,
afirma que el input sigue valiendo `'349'` y comprueba que el cuerpo no lleva
ninguna de las dos claves. Con eso M13 pasa a **ROJO**. Es el mismo tipo de
hallazgo que la M3 de la feature 32: la mutación fue lo que encontró el hueco, no
la lectura.

### Control negativo que sí cierra la observación 2 de `review_33.md`

En la 33, sustituir la tabla `FIELD_BY_BACKEND` por un cast crudo dejaba los 23
tests en **verde**: ningún test distinguía las dos implementaciones. Aquí esa
misma sustitución (**M7**) sale en **rojo**, gracias al test del
`422 { field: 'es_custom' }`. La observación queda cerrada para esta pantalla; en
`ImageUploadDialog`/`ImagesGrid` sigue abierta (no es mi feature, C10).

## Comprobaciones estáticas

```
grep "fetch(" src (sin __tests__, sin src/lib/api.ts)        → 0
grep "\bany\b" en los archivos de la feature                 → 0
grep -E "#[0-9a-fA-F]{3,8}" src/admin/prices/                → 0
grep "console\.|TODO" src/admin/prices/ + su test            → 0
grep "'rows' in|'plan' in" src/admin/prices/                 → 0  (todo por normalizeApi)
grep "Number(|parseInt" sobre ids en producción              → 0
grep -rn "mockPrices" src/                                   → 0  (ni un import residual)
git diff --numstat src/lib/api.ts                            → 142 insertions(+), 0 deletions(-)
                                                                un solo hunk @@ -603,0 +604,142 @@
```

`src/admin/prices/mockPrices.ts` eliminado; la carpeta solo tiene los dos `.tsx`.

## Salida de la verificación

```
npm test           → Test Files 18 passed (18) | Tests 159 passed (159)   exit 0 (61.2 s)
npm run typecheck  → exit 0, sin salida
npm run build      → ✓ built in 12.63s, exit 0
                     (aviso «Some chunks are larger than 500 kB»: esperado,
                      docs/verification.md §1)
```

**Conteo antes → después: 18 archivos / 144 tests → 18 archivos / 159 tests.**
Mismo número de archivos (se reescribió `PricesList.test.tsx`, no se añadió uno
nuevo); **+15 tests netos** = 24 casos nuevos menos los 9 de la maqueta.

Ningún test previo roto y **ningún rojo** en las pasadas completas, incluidos los
tres archivos que el líder señaló como flakes bajo carga (`AppRoutes`,
`ContactModal`, `PricesList`). Corrí una sola suite a la vez y no hizo falta
repetir nada aislado.

## Notas para el líder (fuera de mi lista de archivos)

1. **Una referencia cruzada se quedó a un salto de distancia.**
   `docs/api-contract.md` §4 ter (imágenes) dice «misma asimetría que precios
   (§10.4)», y §10.4 es ahora un puntero a §4 quater. Se resuelve igual, pero lo
   suyo es que apunte directo. No lo toqué porque el líder me acotó a «solo la
   sección de precios» de ese documento.
2. **`docs/api-contract.md` §1 sigue corta**, como ya avisó `impl_33.md` (nota 1):
   habla de «los tres helpers» cuando hay cuatro transportes, y su lista de
   consumidores de `normalizeApi` no menciona ni imágenes ni precios. Ahora
   además la regla «todas las peticiones con body van con `Content-Type:
   application/json`» convive con `apiUpload`.
3. **Baselines desfasados, tercera vez.** `docs/verification.md` §1-§2 y
   `docs/architecture.md` §8 siguen anunciando `15 archivos / 86 tests`; el real
   tras esta feature es **18 archivos / 159 tests**. `docs/architecture.md` §5
   tampoco lista `/api/precios` ni `/api/admin/precios`, y su §9 sigue diciendo
   que precios está «en maquetación con datos mock».
4. **`feature_list.json` no lo toqué**: la 34 sigue en `pending`, que es su estado
   real hasta el veredicto del reviewer.
5. **`tsconfig.tsbuildinfo`** vuelve a aparecer modificado en `git status`: es un
   artefacto trackeado (deuda preexistente ya registrada en `history.md`), lo
   toca cualquier `typecheck`. No lo he tocado a mano ni lo he revertido.
6. **Para la feature 35**, ya listo para reutilizar desde `src/lib/api.ts`:
   `listPlanes()`, `AdminPlan`, `formatMoneda` y `derivarPrecios`. Y el aviso que
   más pesa: **las tablas del backend están vacías**, así que la decisión de
   fallback que pide su acceptance 2 no es teórica, es el estado de hoy.
