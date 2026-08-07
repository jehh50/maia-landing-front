# Informe de implementación — Feature 20

**Feature:** 20 — Helper de normalización de respuestas de la API
**Fecha:** 2026-07-27
**Estado:** implementada, **pendiente de review** (no marcada `done`)
**Rama:** `main` (sin commits; el humano no pidió commitear)

---

## 1. Baseline verificado antes de tocar nada

```
npm test           → 9 archivos / 44 tests   ✅
npm run typecheck  → exit 0                  ✅
npm run build      → exit 0 (aviso esperado de chunk >500 kB) ✅
```

Coincide con el baseline declarado en `docs/verification.md` §2 tras las
features 17/18/19.

## 2. Qué cambié

| Archivo | Cambio |
|---------|--------|
| `src/lib/api.ts` | **Añade** `normalizeApi()`, los tipos `ApiSuccess<T>` / `ApiFailure` / `ApiOutcome<T>`, la constante `GENERIC_API_ERROR` y el helper interno `readErrorMessage()`. `ApiResult<T>` pasa de `interface` privada a `export interface` (solo visibilidad; la forma no cambia). |
| `src/lib/__tests__/api.test.ts` | **Nuevo.** 7 tests del helper. |
| `src/pages/BlogIndex.tsx` | Migrado a `normalizeApi`. |
| `src/admin/leads/LeadsList.tsx` | Migrado a `normalizeApi`. |
| `docs/api-contract.md` | Documenta la forma normalizada en §1 (tabla de casos, firma, notas). |
| `feature_list.json` | 20 → `in_progress`. |
| `progress/current.md` | Plan, bitácora y verificación. |

**Nada más.** No se tocó `package.json`, `vite.config.ts`, `tsconfig.json`,
`vercel.json` ni `.gitignore`.

### Firma del helper

```ts
normalizeApi<T extends object, K extends keyof T & string>(
  call: Promise<ApiResult<T>>,   // la promesa del helper existente, sin await
  key: K,                        // clave que debe traer el payload de éxito
  fallbackError?: string,        // default: GENERIC_API_ERROR
): Promise<ApiOutcome<T>>
```

`T` y `K` se **infieren** en el call site: `normalizeApi(listAdminLeads({…}), 'rows')`.

| Caso | Resultado |
|------|-----------|
| `2xx` con body que contiene `key` | `{ ok: true, status, data }` |
| `2xx` sin body, o body sin `key` | `{ ok: false, status, error: fallbackError }` |
| `4xx`/`5xx` con `{ error: string }` | `{ ok: false, status, error }` (mensaje del backend) |
| `4xx`/`5xx` sin body | `{ ok: false, status, error: fallbackError }` |
| `fetch` rechaza (fallo de red) | `{ ok: false, status: 0, error: fallbackError }` |

## 3. Decisiones tomadas

1. **El helper recibe la promesa, no el resultado ya resuelto.** Permite
   `await normalizeApi(listAdminLeads({…}), 'rows')` en una sola línea y le deja
   capturar también el rechazo de `fetch`.
2. **`key` obligatoria en vez de "si hay body, es éxito".** Es la generalización
   literal del patrón repetido `ok && data && 'rows' in data`. Sin ella, un `200`
   con body `{}` se tomaría como éxito y `res.data.rows` sería `undefined` →
   `rows.map` reventaría en `BlogIndex`. `K extends keyof T & string` hace que la
   clave se valide contra el tipo del payload: `'rowss'` no compila.
3. **`200` sin body ⇒ `{ ok: false }`.** Es exactamente lo que hacen hoy los
   consumidores (`data` es `null` ⇒ cae al `else` de error). Elegí preservar el
   comportamiento observable antes que "mejorarlo".
4. **El helper captura el rechazo de `fetch`** (fallo de red) y devuelve
   `{ ok: false, status: 0 }`. `docs/context.md` §3 fija que la capa de datos no
   lanza; hoy un fallo de red produce un rechazo no manejado dentro del `useEffect`
   y deja el spinner colgado. `status: 0` = no hubo respuesta HTTP. Es la única
   diferencia de comportamiento respecto al código anterior, y solo en un camino
   que hoy está roto.
5. **`GENERIC_API_ERROR` exportado** para que el mensaje por defecto sea uno solo
   y testeable; los consumidores que ya tenían su propio copy lo pasan como
   `fallbackError` y no cambian ni una palabra de lo que ve el usuario.
6. **`ApiResult<T>` se exporta** porque aparece en la firma pública del helper.
   Es un cambio de visibilidad, no de forma. Dejé `PublicApiResult<T>` intacto
   (es estructuralmente idéntico, así que `publicJson` encaja en `normalizeApi`
   sin tocarlo); unificarlos sería refactor fuera de scope.

## 4. Consumidores migrados y por qué esos dos

**`src/pages/BlogIndex.tsx`** y **`src/admin/leads/LeadsList.tsx`**.

Criterios:

- **Cubren los dos transportes distintos**: `BlogIndex` va por `publicJson`
  (`credentials: 'omit'`) y `LeadsList` por `apiJson` (`credentials: 'include'`).
  Migrar dos consumidores del mismo transporte no habría probado nada sobre el
  otro.
- **Cubren los dos estilos de manejo de error del repo**: `BlogIndex` siempre
  muestra un mensaje fijo del cliente e ignora el del backend; `LeadsList` prefiere
  el `error` del backend y cae a un mensaje propio. El helper tenía que soportar
  ambos sin que cambiara el copy — de ahí el parámetro `fallbackError`.
- **Ambos ya tenían test con aserciones sobre `fetch.mock.calls`**
  (`BlogIndex.test.tsx` comprueba que se llama a `/api/articles`;
  `LeadsList.test.tsx` comprueba `?q=ana`). Eso es justo lo que pide el
  acceptance 2: son la prueba de que la migración es transparente a nivel HTTP.
- `BlogIndex` es además el consumidor con la discriminación más larga del repo
  (`ok && data && 'rows' in data && Array.isArray(data.rows)`), y `LeadsList` el
  que más ruido tenía en la rama de error.

**No se tocó ni una línea de los tests de esos dos consumidores.** Siguen verdes
tal cual estaban (verificado: los archivos no aparecen modificados en
`git status`).

Descartados: `ContactModal` (es el flujo de negocio crítico — captación de leads —
y su respuesta `{ ok, id }` no encaja igual de limpio con la comprobación por
clave); `AdminGuard` (afecta al acceso de todo el área privada); `ArticleEdit`
(tres llamadas distintas en el mismo componente, migración más grande de lo que
pide una feature de "al menos dos consumidores").

## 5. Helpers cuya firma **NO** cambió

Todos siguen devolviendo `{ ok, status, data }` exactamente igual, y sus
consumidores no migrados compilan y funcionan sin cambios:

| Helper | Transporte | Consumidor no migrado que lo usa |
|--------|-----------|--------------------------------|
| `postLead` | `fetch` directo, cookies por defecto | `ContactModal` |
| `login` | `apiJson` | `Login` |
| `logout` | `apiJson` | `AdminLayout` |
| `getMe` | `apiJson` | `AdminGuard` |
| `listAdminLeads` | `apiJson` | *(migrado en `LeadsList`, pero la firma no cambia)* |
| `getAdminLead` | `apiJson` | — |
| `listAdminArticles` | `apiJson` | `ArticlesList` |
| `getAdminArticle` | `apiJson` | `ArticleEdit` |
| `createAdminArticle` | `apiJson` | `ArticleEdit` |
| `updateAdminArticle` | `apiJson` | `ArticleEdit` |
| `deleteAdminArticle` | `apiJson` | `ArticlesList` |
| `listPublicArticles` | `publicJson` | `sections/Blog` |
| `getPublicArticleBySlug` | `publicJson` | `BlogArticle` |

También intactos: `apiJson`, `publicJson`, `EMAIL_RE`, `PHONE_RE`, `API_BASE` y
todos los tipos (`AdminUser`, `AdminLead`, `AdminArticle`, `PublicArticle`,
`LeadType`, `ArticleStatus`, `ArticleInput`, `LeadsListResponse`, …).

**Contrato HTTP sin cambios**: mismas URLs, métodos, headers y política de
cookies. Hay un test explícito que lo fija
(`no cambia el contrato HTTP de los helpers existentes`): comprueba que
`listAdminLeads({ q: 'ana' })` devuelve la forma cruda `{ ok, status, data }` y
que la llamada sigue siendo `GET /api/admin/leads?q=ana` con
`credentials: 'include'`.

## 6. Tests añadidos (`src/lib/__tests__/api.test.ts`, 7)

Con `vi.spyOn(globalThis, 'fetch')` y `Response` reales; **no se mockea
`src/lib/api.ts`** (`docs/verification.md` §4):

1. `200` con body → `{ ok: true, data }` con el payload tipado.
2. `200` sin body → `{ ok: false, error }` con `GENERIC_API_ERROR`.
3. `200` con body sin la clave esperada → fallo (blinda el caso `{}`).
4. `401` con `{ error: 'No autorizado' }` → propaga el mensaje del backend.
5. `500` sin body → usa el `fallbackError` recibido.
6. `fetch` rechaza → no lanza; `{ ok: false, status: 0 }`.
7. El contrato HTTP y la forma cruda de los helpers existentes siguen igual.

## 7. Verificación

```
npm test           → Test Files 10 passed (10) · Tests 51 passed (51)   ✅
npm run typecheck  → exit 0                                             ✅
npm run build      → exit 0, built in 17.57s                            ✅
                     (aviso esperado "Some chunks are larger than 500 kB")
```

Delta respecto al baseline: **+1 archivo de test, +7 tests** (44 → 51). Ningún
test existente modificado ni saltado.

`git status`: no hay archivos temporales, ni `console.log` de debug, ni TODOs
sin contexto. El único artefacto tocado indirectamente es
`tsconfig.tsbuildinfo`, que regenera `npm run build` (comportamiento previo, no
lo modifiqué a mano).

## 8. Acceptance

| # | Criterio | Estado |
|---|----------|--------|
| 1 | `src/lib/api.ts` expone el helper, con test propio de 200 con body / 200 sin body / 4xx con error / 5xx sin body | ✅ los 4 casos + 3 extra |
| 2 | Dos consumidores reales migrados y sus tests verdes sin tocar las aserciones sobre `fetch.mock.calls` | ✅ `BlogIndex` y `LeadsList`, tests intactos |
| 3 | La forma pública de los helpers existentes no cambia | ✅ ver §5, con test que lo fija |
| 4 | `docs/api-contract.md` documenta la forma normalizada | ✅ §1, "Forma normalizada" |

## 9. Notas para el reviewer

- La feature sigue en `in_progress`. **No la marqué `done`**: falta el veredicto
  del reviewer contra `CHECKPOINT.md`.
- Punto discutible que quiero que mires: la captura del rechazo de `fetch`
  (decisión 4). Es la única diferencia de comportamiento respecto al código
  anterior. Si consideras que se sale del scope, quitarla es borrar el `try/catch`
  de `normalizeApi` y su test; no afecta a nada más.
- Fuera de scope y **no tocado**: migrar el resto de consumidores, y la deuda de
  las features 21/22/23.
