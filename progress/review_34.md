# APROBADO

# Review — feature 34: Cablear la vista de precios a `/api/precios` y `/api/admin/precios`

**Veredicto:** APROBADO (`APPROVED`)
**Fecha:** 2026-07-31 · **Commit revisado:** `027d510` (rama `feat/admin-cruds`)
**Revisor:** no me fié del informe: reejecuté el bloque de verificación, leí la
fuente del backend (`/var/www/html/maia-landing-back`, solo lectura), probé el
`Omit` contra `tsc` y **reproduje 7 de las 13 mutaciones**, revirtiendo todas.

---

## 1. Verificación ejecutada (por mí, no copiada del informe)

| Comando | Resultado |
|---|---|
| `npm test` | **18 archivos / 159 tests passed**, exit 0 (61.74 s) |
| `npm run typecheck` | exit 0, sin salida |
| `npm run build` | ✓ built in 12.47 s, exit 0 (aviso `Some chunks are larger than 500 kB`, esperado) |

Baseline anterior: 18 / 144 → **+15 netos**, exactamente lo declarado (24 casos
nuevos − 9 de la maqueta). Corrí **una sola suite a la vez**, como pide el aviso
del flake. **Ningún rojo, ni en `PricesList` ni en `AppRoutes`/`ContactModal`**;
no hizo falta repetir nada aislado. Ningún test previo roto.

---

## 2. Los 9 acceptance criteria, uno a uno

| # | Acceptance | Veredicto | Dónde se verifica |
|---|---|---|---|
| 1 | Listado por el endpoint **público** `GET /api/precios` | **CUMPLE** | `api.ts:684-686` (`listPlanes` → `publicJson`); tests 1 y 2 (`urls(spy)` congelado a `['/api/precios']`, `credentials: 'omit'`). Mutación M1 → **ROJO 22** |
| 2 | Detalle y escrituras en `/api/admin/precios[/:id]` con `{ plan }`; `DELETE` 204 | **CUMPLE** | `api.ts:689-745`; tests 3 (GET detalle con cookie), 7 (POST), 10 (PATCH), 21 (204 = éxito), 22 (500 sin cuerpo ≠ 204) |
| 3 | `precio_anual`/`ahorro_anual` **nunca** en POST ni PATCH | **CUMPLE** | `PlanInput` con `Omit` (`api.ts:640-642`) + aserciones `toEqual` estrictas (tests 7 y 10) + barrido de **todos** los cuerpos (test 16). Mutación M5 → **ROJO 3**. Ver §4 |
| 4 | Derivados mostrados y de solo lectura; Custom por `es_custom`, nunca por el nulo | **CUMPLE** | `PricesList.tsx:169-180` (las 4 celdas preguntan primero por `es_custom`), `PlanEditDialog.tsx:238-273` (bloque `derivados`, sin control editable); tests 4, 13, 14, 15. Mutaciones M6 → **ROJO 2**, M9 → **ROJO 1**, M13 → **ROJO 1** |
| 5 | El `id` se trata como string | **CUMPLE** | `AdminPlan.id: string` (`api.ts:625`); fixture `ENTERPRISE_ID = '9007199254740993'`; test 11 afirma la URL exacta y que **no** contiene `…992`. Mutación M8 → **ROJO 1**. Cero `Number(`/`parseInt` sobre ids (el único `Number()` es `parseImporte`, sobre un importe) |
| 6 | Los `422` marcan el campo con el `field` de `ApiFailure` | **CUMPLE** | `FIELD_BY_BACKEND` (`PlanEditDialog.tsx:34-41`) y `:177-179`; tests 17 (`aria-invalid`), 18 (`es_custom` → aviso global), 19 (sin `field`), 20 (403 traducido). Mutación M7 → **ROJO 1** |
| 7 | Se elimina `mockPrices.ts` | **CUMPLE** | Borrado (287 líneas); `grep -rn "mockPrices" src/` → 0; `src/admin/prices/` solo tiene los dos `.tsx`. Las fixtures viven en el test |
| 8 | Tests con `vi.spyOn(globalThis,'fetch')` y `Response` reales | **CUMPLE** | `PricesList.test.tsx:135` — `mockPreciosApi()` con `Response` reales, `afterEach(vi.restoreAllMocks)`. **No se mockea `src/lib/api.ts`** |
| 9 | `docs/api-contract.md`: precios pasa a la zona vigente | **CUMPLE** | Nuevo **§4 quater** (5 rutas, 14 campos, aritmética, asimetría, discrepancia Custom, límites, tabla de errores); §10 y §10.4 reducidos a registro histórico sin duplicar contrato |

---

## 3. La asimetría del listado — **verificada contra la fuente del backend**

Confirmado en `/var/www/html/maia-landing-back/src/preciosRouter.js`:

- `:166` `router.get('/api/precios', …)` — **público**, sin `adminGuard`.
- `:178` `router.get('/api/admin/precios/:id', …adminGuard, …)` — el **único**
  GET bajo `/api/admin/`. **No existe `router.get('/api/admin/precios')`**, así
  que la ruta cae fuera del router: **404, no 401**. La afirmación del informe es
  correcta.
- `:191` POST → `201 { plan }`; `:204` PATCH → `200 { plan }`; `:229` DELETE →
  `res.status(204).end()`, sin cuerpo.

El front lo respeta: `listPlanes` es el **único** helper con `publicJson`
(`api.ts:685`); los otros cuatro usan `apiJson` (`:690, :694, :701, :743`). El
mock del test responde **404 a `GET /api/admin/precios`** (`:150`) igual que el
servidor vivo, y la mutación M1 (mover el listado al admin) deja **22 de 24 tests
en rojo** — reproducida por mí, no aceptada de palabra.

---

## 4. ¿El `Omit` hace lo que promete? — probado con `tsc`, con un matiz

Compilé un archivo de sonda contra `src/lib/api.ts` (`tsc --strict`, luego
borrado). Resultado:

| Caso | ¿Compila? |
|---|---|
| `createAdminPlan({ …, precio_anual: 17 })` (literal) | **NO** — `TS2561: 'precio_anual' does not exist in type 'PlanInput'` |
| `updateAdminPlan('1', { nombre, ahorro_anual: 24 })` (literal) | **NO** — `TS2353` |
| `{ …, precio_mensual: null }` | **NO** — `TS2322: 'null' is not assignable to 'number \| undefined'` |
| `createAdminPlan(varAncha)` / `createAdminPlan({ ...varAncha })` | **SÍ compila** (excess property check no aplica) |
| `updateAdminPlan('1', plan)` con un `AdminPlan` entero | **SÍ compila** |

**Conclusión:** el `Omit` sí convierte el acceptance 3 en error de compilación
**para el patrón que usa el código real** — `PlanEditDialog.tsx:156-165` construye
un **object literal** tipado `PlanInput`, y el `...cifras` que interpola es una
unión estrecha (`{precio_mensual, descuento_pct} | {}`) que no puede acarrear
derivados. Los tres huecos de arriba son la limitación estándar del tipado
estructural de TS, no un defecto de este diseño, y **no hay hoy ninguna vía por la
que `precio_anual` o `ahorro_anual` lleguen al body**: lo confirman el `toEqual`
estricto de los tests 7 y 10, el barrido del test 16 y la mutación M5 (**ROJO 3**,
que además necesitó un `as PlanInput` para siquiera compilar). Queda como
**Observación 1** para la feature 35.

---

## 5. El caso Custom — **la afirmación del autor es cierta**, contrastada en el backend

Las dos piezas del hallazgo, leídas en la fuente:

1. **`precio_mensual: null` es un 422 seguro.** `validarPlan` pasa el valor por
   `parseDecimal` (`preciosRouter.js:47-54`), que devuelve `null` para `null`
   (`return null` final, línea 53) y dispara
   `invalid('precio_mensual', 'precio_mensual debe ser un número')`
   (`preciosRouter.js:88-91`). **Confirmado.**
2. **Omitir es lo correcto.** `if (body.precio_mensual !== undefined)`
   (`:88`) salta la validación; en el POST `withDefaults` aplica `0`
   (`precios.js:126-127`) y en el PATCH `pick()` conserva lo guardado
   (`precios.js:198-205`). Y como `es_custom` es `true`, `toPlan()` devuelve los
   dos derivados en `null` igual (`precios.js:97-98`). **Confirmado.**
3. **La trampa del nulo también.** `toPlan()` pasa `precio_mensual` por
   `toNumber()` (`precios.js:48-51, 94`), que convierte `null` en **`0`**: fiarse
   del nulo pintaría «$0» en el Enterprise. `PricesList.tsx:169-180` pregunta
   **primero** por `es_custom` en las cuatro celdas, y el test 4 afirma que la
   fila entera no contiene ni `$` ni `%`.

El diálogo tampoco transcribe ese `0` (`PlanEditDialog.tsx:103`) — mutación M9
reproducida: **ROJO 1**.

---

## 6. El diff de `src/lib/api.ts` es estrictamente aditivo

```
git diff --numstat d792934 027d510 -- src/lib/api.ts  →  142  0  (0 deletions)
un solo hunk: @@ -601,3 +601,145 @@  (bloque nuevo al final del archivo)
```

**Cero deleciones** garantiza que `apiJson`, `publicJson`, `postLead`,
`normalizeApi`, `apiUpload` y los helpers de leads, artículos, usuarios e imágenes
están **intactos**. Los once consumidores actuales no cambian de comportamiento, y
los 159 tests (incluidos los de esas pantallas) siguen verdes. `parseOrden` y
`ORDEN_ERROR` se **reutilizan** de la feature 33 en vez de duplicarse —correcto:
el backend usa literalmente el mismo mensaje (`preciosRouter.js:134`).

---

## 7. Mutaciones reproducidas por mí (todas revertidas)

Aplicadas **de una en una** sobre el código de producción, con
`npx vitest run src/admin/__tests__/PricesList.test.tsx`, y restauradas desde
copia antes de la siguiente. Árbol final: `git status` solo con
`tsconfig.tsbuildinfo`.

| # | Mutación | Informe | **Mi resultado** |
|---|---|---|---|
| M1 | `listPlanes` con `apiJson` contra `/api/admin/precios` | ROJO 22 | **ROJO 22** ✔ |
| M4 | El plan a convenir manda `precio_mensual: null` | ROJO 1 | **ROJO 1** ✔ (necesitó un cast para compilar) |
| M5 | El payload arrastra los dos derivados | ROJO 3 | **ROJO 3** ✔ (POST, PATCH y el barrido) |
| M6 | Las celdas se fían de los nulos en vez de `es_custom` | ROJO 2 | **ROJO 2** ✔ |
| M7 | Cast crudo `res.field as FormField` en vez de la tabla | ROJO 1 | **ROJO 1** ✔ |
| M8 | `updateAdminPlan(Number(plan.id), …)` | ROJO 1 | **ROJO 1** ✔ |
| M13 | `cifras` pierde la guarda `!esCustom` | ROJO 1 | **ROJO 1** ✔ (ver abajo) |

### M13: la corrección es real, no está a medias

Es el punto que más me pedían verificar y **está bien cerrado**. Quité el
`!esCustom` de `PlanEditDialog.tsx:152` y el test *«un plan a convenir OMITE
precio_mensual y descuento_pct»* cae en `PricesList.test.tsx:410` con
`expected false, received true`. Lo que lo hace discriminar es exactamente lo que
el informe dice haber cambiado, y lo verifiqué leyendo el test:

- `:400-401` teclea `349` y `15` **antes** de marcar el switch;
- `:403-404` afirma que el campo queda **deshabilitado pero conserva `'349'``**;
- `:410-411` afirma que ninguna de las dos claves viaja en el cuerpo.

Es decir: `precioNum` **no** es `null` en el momento del submit, así que lo único
que puede vaciar `cifras` es `es_custom`. El test ya no confunde «lo decide
`es_custom`» con «el input está vacío». Sin la guarda, un plan Custom viajaría con
`precio_mensual: 349` — el caso real que describe el informe.

### Y cierra la observación 2 de `review_33.md`

En la 33, sustituir `FIELD_BY_BACKEND` por `res.field as FormField` dejaba los 23
tests en **verde**. Aquí la misma sustitución (**M7**) sale en **ROJO**, por el
test del `422 { field: 'es_custom' }` (`:624-638`). El razonamiento del autor es
correcto y lo confirmé en el backend: `es_custom` y `destacado` **sí** llegan como
`field` (`preciosRouter.js:118-124`) pero son `Switch` sin `helperText`, mientras
que `trial_texto` **nunca** llega como `field` porque se trunca, no se rechaza
(`preciosRouter.js:126-130`). La tabla de seis entradas es la correcta.

---

## 8. Lo aprobado en la feature 30 se conserva

- **Derivados calculados y de solo lectura:** el listado los pinta tal como los
  devuelve la API (`PricesList.tsx:175-180`); el formulario los muestra en el
  bloque `data-testid="derivados"` (`PlanEditDialog.tsx:238-273`) **sin ningún
  control editable** — el test 13 lo afirma enumerando los `textbox` del diálogo
  (los siete campos escribibles, ni uno más) y comprobando
  `queryAllByRole('textbox'|'spinbutton')` = 0 dentro de `derivados`.
- **La aritmética sigue siendo la del backend:** `calcularPrecioAnual`
  (`api.ts:664-666`) = `Math.round(pm * (1 - dp/100))` ≡ `precios.js:64-66`, y
  `calcularAhorroAnual` (`:668-670`) = `Math.round((pm - pa) * 12)` ≡
  `precios.js:69-71`. El test 14 fija el redondeo (25 al 10 % → `$23`, no `$22.5`)
  y M10 lo protege. El mock del test **reimplementa** la aritmética
  (`PricesList.test.tsx:71-75`) en vez de importarla, así que no se valida
  `derivarPrecios` contra sí misma. Correcto.
- **El descuento sigue siendo por plan:** el test 10 afirma que tras editar
  Starter al 25 %, Team conserva su 10 % y su `$179`.

---

## 9. `src/components/sections/Pricing.tsx` NO se tocó

```
git diff --name-only d792934 027d510  →  docs/api-contract.md, progress/impl_34.md,
  src/admin/__tests__/PricesList.test.tsx, src/admin/prices/PlanEditDialog.tsx,
  src/admin/prices/PricesList.tsx, src/admin/prices/mockPrices.ts, src/lib/api.ts
git diff d792934 027d510 -- src/components/sections/Pricing.tsx  →  0 líneas
```

Los 7 archivos son los 6 declarados en `feature_list.json` más el informe. La
landing sigue con su array `plans` hard-coded, que es la feature 35.

---

## 10. Checkpoints

- **C1** [x] `npm test` exit 0, **18 archivos / 159 tests**, ningún test previo roto. Reejecutado por mí.
- **C2** [x] Los 9 acceptance tienen verificación (tabla §2). 24 casos nuevos, y la discriminación está probada con 7 mutaciones reproducidas, no solo declarada.
- **C3** [x] `npm run typecheck` exit 0 y `npm run build` exit 0 (aviso de chunk esperado).
- **C4** [x] `grep -rnw any` en `api.ts` + `src/admin/prices/` + el test → **0**. Cero hex (`grep -rnE '#[0-9a-fA-F]{3,8}'` → 0); el único color literal es `tokens.text.disabled` dentro de un `style={{}}` nativo (`PricesList.tsx:20`), que es el caso 3 de conventions §3 y el molde de `LeadsList`. Nombres y ubicación correctos (`PascalCase.tsx`, `__tests__/` hermano, tipos exportados desde `lib/api.ts`). `noUnusedLocals` pasa.
- **C5** [x] `grep "fetch("` fuera de `src/lib/api.ts` y de `__tests__` → **0**. Sin state manager ni librería de fetching nueva; estado local con `useState`. Tipos **derivados**: `PlanInput` con `Omit<AdminPlan,…> & Partial<Pick<AdminPlan,…>>`, `PlanPatchInput = Partial<PlanInput>`, `PlanesListResponse` y el retorno de `derivarPrecios` con `Pick<AdminPlan,…>`. Cero `'rows' in` / `'plan' in` en los componentes: todo por `normalizeApi`.
- **C6** [x] Los 5 endpoints están en `docs/api-contract.md` **§4 quater**, actualizado en el mismo commit, y §10.4 dejó de duplicar el contrato (queda como registro).
- **C7** [x] `feature_list.json` sigue en `pending`, que es el estado real hasta este veredicto, y `progress/impl_34.md` documenta lo hecho, la verificación y **por qué** la bitácora no fue a `current.md` (acotación explícita del líder). Mismo criterio que en `review_32.md` y `review_33.md`. **Acción para el líder: mover la 34 a `done` y volcar el resumen a `history.md`.**
- **C8** [x] Ningún `.env*` leído ni escrito; ninguna variable de entorno nueva.
- **C9** [x] Sin `console.*`, sin código comentado, sin `TODO` huérfanos, sin `.orig`/`.bak`. `git status` solo muestra `tsconfig.tsbuildinfo` (artefacto trackeado preexistente que toca cualquier `typecheck`; deuda ya registrada, no de esta feature). Confirmado que mis propias mutaciones quedaron revertidas.
- **C10** [x] Scope de una sola feature: los 6 archivos declarados + su informe. No se tocaron `src/admin/users/`, `src/admin/images/`, `AppRoutes.tsx`, `AdminLayout.tsx` ni `Pricing.tsx`, y **no** se arregló de paso la deuda ajena (el `role="alert"` que falta en `UsersList`/`LeadsList`, ni la observación 2 de `review_33.md` en `ImagesGrid`): lo aplicó **solo** a sus propios archivos, que es lo correcto.
- **C11** [x] `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `index.html` y `.gitignore` intactos (no aparecen en el commit).

**Ningún `[ ]`. Ninguno en C1, C2, C3 ni C8.**

---

## 11. Detalle de los fallos

**Ninguno bloqueante.** No hay nada que corregir para cerrar esta feature.

---

## 12. Observaciones (NO bloqueantes, no se arreglan aquí)

1. **El `Omit` protege el literal, no el spread** (`src/lib/api.ts:640-642`).
   Verificado con `tsc`: `createAdminPlan({ ...unAdminPlan })` y
   `updateAdminPlan(id, plan)` **compilan** y colarían los derivados en el body.
   El código de hoy no lo hace y los tests 7/10/16 lo cazarían en runtime, pero el
   informe afirma que «lo garantiza el compilador» **sin ese matiz**. Relevante
   para la **feature 35**, que va a reutilizar `AdminPlan` desde la landing: si
   alguna vez hace falta blindarlo del todo, el patrón es un tipo con las claves
   prohibidas en `never` (`{ precio_anual?: never; ahorro_anual?: never }`).
2. **Asimetría cosmética al abrir un plan Custom** (`PlanEditDialog.tsx:103-104`):
   «Precio mensual» arranca **vacío** y «Descuento anual» arranca en **`'0'`**.
   Los dos quedan deshabilitados y el bloque de derivados dice «Sin cifras», así
   que **no se filtra ningún «$0»** ni al usuario ni al body (el test 15 y la M13
   lo cubren). Es solo incoherencia visual entre los dos campos hermanos.
3. **`getAdminPlan` sigue sin consumidor en la UI**, como `getAdminUser` desde la
   32 — pero **aquí sí tiene test directo** (test 3, que congela URL, método y
   `credentials`). La observación que `review_32.md` dejó abierta queda mejor
   resuelta que en su origen; el hueco vivo es el de `getAdminUser`.
4. **Referencia cruzada a un salto de distancia** (ya avisada por el autor):
   `docs/api-contract.md` §4 ter dice «misma asimetría que precios (§10.4)», y
   §10.4 es ahora un puntero a §4 quater. Se resuelve, pero conviene apuntar
   directo. Fuera de su acotación de archivos.
5. **Drift documental, cuarto cierre consecutivo** (ninguna review lo cuenta como
   fallo porque C6 solo exige `api-contract.md`): `docs/verification.md` §1-§2 y
   `docs/architecture.md` §8 siguen anunciando `15 archivos / 86 tests` cuando el
   real es **18 / 159**; `docs/architecture.md` §5 no lista `/api/precios` ni
   `/api/admin/precios` (ni los de usuarios/imágenes) y su §9 sigue diciendo que
   precios está «en maquetación con datos mock». `docs/api-contract.md` §1 sigue
   hablando de «los tres helpers» habiendo cuatro transportes. **Ya es candidato a
   feature propia de documentación**, no a nota al pie.
6. **El flake de la suite sigue abierto** (deuda de infraestructura, requiere que
   lo pida un humano). En esta review no se manifestó: la pasada completa y las
   7 pasadas de mutación sobre `PricesList` salieron todas consistentes,
   corriendo **una sola suite a la vez**.
