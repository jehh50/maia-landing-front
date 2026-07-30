# Review — feature 20: Helper de normalización de respuestas de la API

**Veredicto:** APPROVED

Revisor: agente `reviewer`. Fecha: 2026-07-27.
Entrada: `progress/impl_20.md`, `progress/current.md`, `feature_list.json` (id 20),
y el `git diff` real del árbol de trabajo.

---

## Verificación ejecutada

Ejecutada por mí, no tomada del informe (`docs/verification.md` §1):

- `npm test`          → **10 archivos / 51 tests passed**, exit 0
- `npm run typecheck` → exit 0
- `npm run build`     → exit 0, `built in 17.08s`, `dist/assets/index-B5JKLXXe.js 2,524.92 kB`
  con el aviso esperado `Some chunks are larger than 500 kB` (no invalida C3)

Delta contra el baseline previo a la 20 (9 archivos / 44 tests): **+1 archivo, +7 tests**.
Coincide con lo reportado. Ningún test previo roto ni saltado.

---

## Checkpoints

- C1  [x] `npm test` exit 0, 51/51. Los 44 tests previos siguen verdes.
- C2  [x] Los 4 puntos del `acceptance` tienen verificación (detalle abajo).
- C3  [x] `npm run typecheck` y `npm run build` exit 0.
- C4  [x] `src/lib/__tests__/api.test.ts` en `__tests__/` hermano y con nombre `<sujeto>.test.ts`; `api.ts` sigue siendo `camelCase.ts` en `src/lib/` con exports nombrados. Cero `any` (el helper usa `unknown` en `readErrorMessage`, `src/lib/api.ts:83`), cero hex nuevos, cero variables sin usar (lo confirma `noUnusedLocals` en el build).
- C5  [x] Ninguna llamada a `fetch` fuera de `src/lib/api.ts` (líneas 31, 125, 266 — las tres preexistentes). Sin state manager ni librería de fetching nueva. Tipos derivados: `ApiOutcome<T> = ApiSuccess<T> | ApiFailure`, y `K extends keyof T & string` deriva la clave del propio payload en vez de duplicarla.
- C6  [x] No se añade ningún endpoint. `docs/api-contract.md` §1 documenta la forma normalizada y es coherente con el código (una imprecisión menor, ver Observaciones).
- C7  [x] `feature_list.json` id 20 en `in_progress` (correcto: el implementer no la marca `done`). `progress/current.md` documenta plan, bitácora, decisiones y verificación.
- C8  [x] Ningún `.env` leído ni escrito; sin variables de entorno nuevas (`progress/current.md` → "Ninguna"). `VITE_API_BASE` se menciona solo por nombre en la doc preexistente.
- C9  [x] Sin `console.log`/`console.debug`, sin código comentado, sin `TODO`, sin `.orig`/`.bak`.
- C10 [x] Scope de una sola feature. No se tocó `src/hooks/useReveal.ts` (21), ni `React.lazy`/`src/AppRoutes.tsx` (22), ni `theme.ts`/`globals.css` (23).
- C11 [x] `git status` de `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `.gitignore`: vacío. Intactos.

---

## 1. Aditividad (acceptance 3) — verificado en el diff, uno por uno

`git diff src/lib/api.ts` produce **un solo hunk**, `@@ -49,12 +49,78 @@`. Todo lo
que contiene son **líneas añadidas**, salvo una modificada:

```
-interface ApiResult<T> {
+export interface ApiResult<T> {
```

Cambio de **visibilidad**, no de forma: los tres campos (`ok`, `status`, `data`)
son idénticos. Necesario porque `ApiResult<T>` aparece en la firma pública de
`normalizeApi`.

Ninguna de las 13 firmas públicas está dentro del hunk, luego ninguna cambió:

| Helper | Línea | Retorno |
|--------|-------|---------|
| `postLead` | `src/lib/api.ts:26` | forma propia `{ ok, status, data }`, intacta |
| `login` | `:135` | `ApiResult` vía `apiJson` |
| `logout` | `:142` | `ApiResult` vía `apiJson` |
| `getMe` | `:146` | `ApiResult` vía `apiJson` |
| `listAdminLeads` | `:181` | `ApiResult<LeadsListResponse>` |
| `getAdminLead` | `:192` | `ApiResult<{ lead }>` |
| `listAdminArticles` | `:223` | `ApiResult<{ rows }>` |
| `getAdminArticle` | `:227` | `ApiResult<{ article }>` |
| `createAdminArticle` | `:231` | `ApiResult<{ article }>` |
| `updateAdminArticle` | `:238` | `ApiResult<{ article }>` |
| `deleteAdminArticle` | `:245` | `ApiResult<{ ok: true }>` |
| `listPublicArticles` | `:281` | `PublicApiResult<{ rows }>` |
| `getPublicArticleBySlug` | `:292` | `PublicApiResult<{ article }>` |

Mismo nombre, mismos parámetros, mismo tipo de retorno. Los consumidores **no**
migrados (`ContactModal`, `Login`, `AdminGuard`, `AdminLayout`, `ArticlesList`,
`ArticleEdit`, `BlogArticle`, `sections/Blog`) no aparecen en `git status` para
esta feature: no se tocó ni una línea suya. La migración es incremental de verdad.

`PublicApiResult<T>` se dejó intacto y encaja en `normalizeApi` por
compatibilidad estructural — lo confirma el typecheck y el test 5, que pasa
`listPublicArticles(...)` al helper.

## 2. Contrato HTTP intacto — verificado en el diff

Los cuerpos de los tres transportes están **fuera** del hunk modificado:

- `postLead` (`:31-33`): `fetch(\`${API_BASE}/api/contact\`)`, `method: 'POST'`,
  `Content-Type: application/json`, **sin `credentials`** ⇒ política por defecto. Sin cambios.
- `apiJson` (`:125-127`): `credentials: 'include'` aparece como **línea de contexto**
  del diff, no como línea añadida ni eliminada. Sin cambios.
- `publicJson` (`:266-268`): `credentials: 'omit'`. Fuera del hunk. Sin cambios.

Ninguna URL, método o header se movió. `normalizeApi` no toca `fetch`: recibe la
promesa ya construida por el helper y solo transforma el resultado en el cliente.
Test que lo fija: `src/lib/__tests__/api.test.ts:114-127` comprueba sobre
`fetchSpy.mock.calls[0]` que la llamada sigue siendo `/api/admin/leads?q=ana` con
`{ method: 'GET', credentials: 'include' }`, **y** que `listAdminLeads` devuelve
la forma cruda `{ ok: true, status: 200, data: {...} }`.

## 3. Aserciones de los tests preexistentes (acceptance 2)

`git diff --name-only -- src/pages/__tests__/BlogIndex.test.tsx src/admin/__tests__/LeadsList.test.tsx`
→ **0 archivos**. `git status` no los lista. Son byte a byte idénticos a HEAD:
**cero cambios, ni siquiera mecánicos**.

Las aserciones sobre `fetch.mock.calls` que siguen vigentes y verdes:

- `src/pages/__tests__/BlogIndex.test.tsx:62-64` — `calls.some(c => String(c[0]).includes('/api/articles'))`.
- `src/admin/__tests__/LeadsList.test.tsx:58-60` — `calls.find(c => String(c[0]).includes('q=ana'))`.

Son exactamente los dos consumidores migrados, y su aserción HTTP pasa sin haber
sido tocada. Es la prueba que pedía el acceptance 2.

Los otros dos archivos de test que aparecen como no rastreados
(`src/admin/__tests__/AdminLayout.test.tsx`, `src/pages/__tests__/NotFound.test.tsx`)
son de las features 17/18, ya `done` y sin commitear. No son de esta revisión.

## 4. El helper no lanza

`normalizeApi` (`src/lib/api.ts:106-124`) envuelve el `await call` en `try/catch`
y **retorna** en el `catch`; no re-lanza. Los cuatro casos del acceptance 1 tienen
test real, y ninguno necesita `try/catch` en el llamador — ni `BlogIndex.tsx:20`
ni `LeadsList.tsx:33` tienen uno:

| Caso del acceptance | Test | Línea |
|---|---|---|
| 200 con body | `200 con body: devuelve { ok: true, data } con el payload tipado` | `api.test.ts:33` |
| 200 sin body | `200 sin body: devuelve { ok: false, error } con el mensaje por defecto` | `:48` |
| 4xx con error | `4xx con { error }: propaga el mensaje del backend` (401 → `'No autorizado'`) | `:69` |
| 5xx sin body | `5xx sin body: usa el mensaje de fallback recibido` (500) | `:84` |

Extras que también verifiqué:

- `200` con body `{}` sin la clave → fallo (`:59`). Blinda el falso positivo que
  reventaría en `rows.map`.
- **`fetch` rechaza (fallo de red)**: sí hay test, `:99-112`. `mockRejectedValue(new TypeError('Failed to fetch'))`
  y se asserta `res.ok === false`, `res.status === 0`, `res.error === 'Sin conexión'`.
  El test no usa `expect(...).rejects`: si `normalizeApi` lanzara, el test fallaría.
  Confirmado que la promesa se resuelve, no se rechaza.

Esto es coherente con `docs/context.md` §3 ("Helpers que no lanzan"): la feature
no revisita la decisión, la extiende al único camino que hoy la incumplía de facto
(un rechazo de red se propagaba fuera del `useEffect`).

## 5. Comportamiento de cara al usuario en los dos consumidores migrados

Comparado contra `git show HEAD:` de cada archivo:

- **`src/pages/BlogIndex.tsx`** — `loading` se pone a `true` antes y a `false`
  después, en la misma posición (`:19`, `:29`); el guard `if (!alive) return;`
  sigue justo tras el `await` (`:21`). La condición de éxito
  `ok && data && 'rows' in data && Array.isArray(data.rows)` pasa a
  `res.ok && Array.isArray(res.data.rows)`: **equivalente**, el helper ya hizo
  `ok && data && 'rows' in data`. El mensaje de error es literalmente el mismo
  string (`:27`, `'No se pudieron cargar los artículos. Inténtalo de nuevo más tarde.'`),
  y por eso no se le pasa `fallbackError`: el consumidor ignora el mensaje del
  backend, igual que antes.
- **`src/admin/leads/LeadsList.tsx`** — `setLoading(true)`/`setError(null)` al
  entrar (`:31-32`) y `setLoading(false)` al final (`:52`), en la misma posición.
  El `else` sigue haciendo `setRows([])` y `setTotal(0)`. La preferencia
  "mensaje del backend, si no el propio" se preserva: `readErrorMessage(data) ?? fallbackError`
  con `fallbackError: 'No pudimos cargar los leads'` (`:42`), el mismo copy que
  el `msg` anterior. Las dependencias del `useCallback` no cambian, así que el
  debounce de 300 ms sigue igual.

Diferencias de comportamiento, ambas intencionadas y documentadas:

1. Un rechazo de `fetch` ya no deja el spinner colgado: muestra el mensaje de
   error. Solo afecta a los dos consumidores migrados y solo en un camino que hoy
   estaba roto.
2. `readErrorMessage` exige `typeof error === 'string' && error.trim()`; antes
   bastaba con que `data.error` fuera truthy. Solo cambia el caso de un `error`
   de solo espacios o no-string, donde ahora se ve el copy propio en vez de basura.

Ninguna de las dos altera un estado o un mensaje que el usuario viera en el
camino feliz ni en el de error del backend.

## 6. `docs/api-contract.md`

§1 "Forma normalizada (`normalizeApi`, feature 20)", líneas 48-86: firma, los tres
tipos, la tabla de los cinco casos y tres notas (no lanza / no cambia el contrato
HTTP / es aditivo, con los dos consumidores migrados nombrados). Contrastado con
`src/lib/api.ts:106-124`: **no contradice al código**. La tabla de cookies de
`:29-33` sigue siendo la correcta y coincide con lo verificado en el punto 2.

---

## Detalle de los fallos

Ninguno bloqueante. No hay `[ ]` en la lista de checkpoints.

## Observaciones no bloqueantes (para el backlog, no para esta feature)

1. `docs/api-contract.md:72` — la fila "`2xx` sin body, o body sin `key`" promete
   siempre `fallbackError`, pero `src/lib/api.ts:123` aplica
   `readErrorMessage(data) ?? fallbackError` también en ese camino: un `200` con
   body `{ error: 'algo' }` devolvería `'algo'`, no el fallback. Es un caso
   esquina que el backend no produce hoy y el comportamiento es el deseable;
   la imprecisión está en la doc, no en el código. Vale la pena afinar la
   redacción cuando se toque el documento.
2. `src/pages/__tests__/BlogIndex.test.tsx:62` solo asserta que la URL contiene
   `/api/articles`; no fija `credentials: 'omit'` para `publicJson`. El nuevo
   `api.test.ts:114` sí lo hace para `apiJson`. `publicJson` no se modificó (lo
   prueba el diff), así que no es un riesgo de esta feature, pero el transporte
   público se queda sin candado equivalente.
3. `tsconfig.tsbuildinfo` aparece modificado en `git status`. Es un artefacto que
   regenera `npm run build` y ya venía sucio de las features 17-19; no es uno de
   los cinco archivos de infraestructura de C11 y el implementer no lo editó a mano.
