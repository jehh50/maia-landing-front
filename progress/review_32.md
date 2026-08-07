**Veredicto: APROBADO**

# Review — feature 32: Cablear la vista de usuarios a `/api/admin/users`

Commit revisado: `ba232e7` (rama `feat/admin-cruds`). Fecha: 2026-07-31.

## Verificación ejecutada (por mí, no reportada)

```
npm test          → Test Files 18 passed (18) | Tests 133 passed (133)   exit 0   (56.4 s)
npm run typecheck → exit 0, sin salida
npm run build     → ✓ built in 15.62s, exit 0
                    («Some chunks are larger than 500 kB»: esperado, docs/verification.md §1)
```

Coincide con el baseline anunciado por el líder (18 / 133). Ningún test previo
roto; **no hubo ningún rojo** en mi pasada, ni siquiera en los tres archivos que
el líder señaló como flakes bajo carga (`AppRoutes`, `ContactModal`,
`PricesList`). Corrí una sola suite a la vez.

Comprobaciones estáticas:

- `grep -rn "fetch(" src --exclude __tests__` fuera de `src/lib/api.ts` → **0 resultados**.
- `any` en los archivos de la feature → **0**. Hex hardcodeados en `src/admin/users/` → **0**.
- `TablePagination` en `src/admin/users/` → solo la mención del comentario de `UsersList.tsx:26`.
- `'rows' in data` / `'user' in data` en `src/admin/users/` → **0** (todo por `normalizeApi`).
- `src/admin/users/mockUsers.ts` → eliminado; no queda ni un import.
- `password_hash` en `src/` → solo en tres comentarios que documentan su ausencia.
- `console.log` / `TODO` / residuos en los archivos de la feature → **0**.
  `git status` limpio salvo `tsconfig.tsbuildinfo` (artefacto trackeado, deuda
  preexistente registrada en `history.md`, no lo tocó esta feature: el commit
  son 7 archivos y no lo incluye).

## Contraste con el backend real

No me fié del informe ni del contrato: leí `/var/www/html/maia-landing-back`.

- `src/usersRouter.js:53-61` → `listUsers(pool)` sin `req.query`; `src/users.js:124-129`
  → `SELECT ... ORDER BY id ASC` sin `WHERE`. **Confirmado**: ni paginación ni `?q=`.
  La búsqueda en cliente (`UsersList.tsx:61-66`) y la ausencia de `TablePagination`
  son lo correcto, no una omisión.
- `usersRouter.js:80,83,88,136,142,150` → los `422` traen `field: 'email' | 'password' | 'role'`.
  Los tres están en el whitelist `FORM_FIELDS` de `UserDialog.tsx:34`. Cobertura completa.
- `usersRouter.js:107,164` → `409 { error: 'El email ya está en uso', field: 'email' }`.
- `usersRouter.js:180` → `409` propio; `:192` → `409` último admin; `:189` → `res.status(204).end()`.
- Las cinco rutas bajo `requireAuth + requireRole('admin')` (`usersRouter.js:51`).

Todo lo que afirma el nuevo §4 bis de `docs/api-contract.md` es verificable en el
backend. No hay contrato inventado.

## Los 10 acceptance criteria

| # | Criterio | Veredicto | Evidencia |
|---|---|---|---|
| 1 | Cinco helpers con `apiJson` + `credentials: 'include'` | **OK** | `src/lib/api.ts:323-355`. Los cinco pasan por `apiJson` (`:147-156`), que ya pone `credentials: 'include'`. Test 1 (`UsersList.test.tsx:146`) lo afirma explícitamente sobre `fetch.mock.calls`. |
| 2 | `{ rows }` sin paginación, sin `TablePagination` | **OK** | `UsersListResponse` (`api.ts:290-292`) no tiene `total`/`limit`/`offset`. Test `UsersList.test.tsx:149-156` congela la URL exacta (`toEqual(['/api/admin/users'])`) y la ausencia de «Por página». |
| 3 | Detalle y escritura con `{ user }`; `DELETE` 204 sin cuerpo | **OK con matiz** | `api.ts:327-343` usan `{ user }`; `deleteAdminUser` (`:352-355`) sintetiza el `{ ok: true }`. Tests `:314-358` (PATCH) y `:362-382` (DELETE 204). **Matiz**: `getAdminUser` no lo consume nadie ni lo cubre ningún test — ver Observación 2. |
| 4 | Todo por `normalizeApi`; nada de `ok && data && 'rows' in data` | **OK** | `UsersList.tsx:48,85` y `UserDialog.tsx:93,98`. Grep del patrón manual en `src/admin/users/` → 0. |
| 5 | Los dos `409` con su mensaje del backend | **OK** | Propio: `UsersList.tsx:159-171` (`disabled={isSelf}` + `Tooltip`), cubierto por el `it.each` de tres sesiones (`:432-442`). Último admin: `UsersList.tsx:90` pinta `res.error` y el test `:397-408` afirma el texto literal del backend. |
| 6 | Los `422` marcan el campo culpable vía `field` | **OK** | `UserDialog.tsx:108-110`. Tests `:262-279` (`field: 'role'`), `:281-295` (`field: 'email'`, `aria-invalid="true"`) y `:297-310` (sin `field` → `role="status"`). |
| 7 | Sin `password_hash`; `password` en el POST y opcional en el PATCH | **OK** | `AdminUserRow` (`api.ts:281-283`) = `AdminUser + created_at`. `UserCreateInput` exige `password` a nivel de tipo (`:303`), `UserPatchInput` lo deja opcional (`:306`). `UserDialog.tsx:92-102` omite la clave si el input está vacío. Tests `:233-238` (POST con los 4 campos exactos), `:332-336` (PATCH sin `password`), `:352-357` (PATCH con `password`). |
| 8 | `mockUsers.ts` eliminado | **OK** | Borrado (126 líneas). Las fixtures viven en `UsersList.test.tsx:13-18` con la forma exacta de `PUBLIC_COLS`. |
| 9 | `vi.spyOn(globalThis,'fetch')` + `Response` reales + aserciones sobre `mock.calls`; sin mockear `src/lib/api.ts` | **OK** | `UsersList.test.tsx:61` (`spyOn`), `:33-38` y `:97` (`Response` reales, incluido `new Response(null, {status:204})`), `:106-110` (helper `escrituras` sobre `spy.mock.calls`). Cero `vi.mock('../../lib/api')` en el archivo. |
| 10 | Usuarios pasa de §10 (maquetación) a endpoints vigentes | **OK** | Nuevo `docs/api-contract.md` §4 bis (rutas, tipos, tabla de errores, las tres asimetrías con leads, las dos reglas del borrado). §10.3 queda como puntero sin duplicar contenido, y la tabla de §10 marca usuarios como «ya cableado». |

## Lo que se pidió juzgar del patrón

**a) Anatomía de los helpers y frontera única (`src/lib/api.ts`).**
El diff de `api.ts` es **estrictamente aditivo**: 85 líneas insertadas, **0
eliminadas**, todas entre `deleteAdminArticle` (`:270`) y el bloque de blog
público (`:357`). Ni una línea existente modificada — lo verifiqué sobre el diff,
no sobre el informe. Sigue la anatomía del repo: bloque `// --- Admin: usuarios
(feature 32) ---` con la feature entre paréntesis, tipos derivados
(`AdminUserRow extends AdminUser`, `role: AdminUser['role']`,
`UserPatchInput = Partial<UserInput>`), sin `try/catch` porque no lanzan, y el
único `async` es el que necesita sintetizar el `204`.

**b) El molde del `204` para las features 33 y 34.** `deleteAdminUser`
(`api.ts:352-355`) resuelve el vacío del `204` **en el helper**, no en el
componente, y con `res.ok &&` delante: un `500` sin cuerpo sigue siendo un error.
Es lo contrario del `if (ok || data == null)` de `ArticlesList.tsx:43`. Es el
molde correcto para replicar. Además el informe (`impl_32.md` §«Lo que M3
destapó») documenta con honestidad que hoy `normalizeApi` ya revalida `ok`, así
que esa guarda es defensa en profundidad y no la única barrera: prefiero un
informe que se corrige a sí mismo a uno que vende de más.

**c) `field` → input.** El mapeo de `UserDialog.tsx:34-46` es un whitelist
explícito con caída a `null`, y es lo que hace que un `field` desconocido acabe
en el `<Alert role="status">` en vez de perderse. Los tres nombres que el backend
puede mandar están cubiertos. Ver Observación 3 sobre la forma del mapeo.

**d) Los tests discriminan — verificado por mí con mutaciones.** No me fié de la
tabla de `impl_32.md`: apliqué seis mutaciones **yo mismo**, una a una, corriendo
solo `UsersList.test.tsx` y restaurando con `git checkout --` entre cada una
(árbol final idéntico, comprobado con `git status`):

| Mutación | Resultado |
|---|---|
| `UserDialog`: ignora `res.field` (`const field = null`) | **ROJO — 2 tests** |
| `deleteAdminUser`: `return res;` (no sintetiza el `204`) | **ROJO — 1 test** |
| `UserDialog`: manda siempre `password` en el `PATCH` | **ROJO — 1 test** |
| `listAdminUsers`: pide `?limit=25&offset=0` | **ROJO — 2 tests** |
| `adminErrorMessage`: devuelve `res.error` a secas | **ROJO — 1 test** |
| `UsersList`: el `useMemo` no filtra | **ROJO — 2 tests** |

Ninguna mutación pasó desapercibida. Los tests cubren lo que dicen cubrir; esta
suite sí discrimina.

**e) Nada de lo aprobado en la feature 28 se perdió.** El diff lo confirma:
validación por campo (`UserDialog.tsx:69-78`), `clearError` al escribir
(`:65-67`), `Dialog` de confirmación con su copy sobre artículos huérfanos y el
último admin (`UsersList.tsx:187-205`), `aria-label` en los cuatro inputs, en los
iconos de fila (`:156,166`) y en el buscador (`:114`), y estilos por tokens
(`tokens.text.disabled` en `:143`, `bgcolor: 'surface.soft'`, `color: 'error.main'`).
Lo único que cambió de comportamiento es el debounce de búsqueda → filtro en
`useMemo`, y es un cambio **obligado por el contrato**, no una regresión.

## Checkpoints

- C1  [x] `npm test` exit 0, 18 archivos / 133 tests, ningún test previo roto.
- C2  [x] Cada punto del `acceptance` tiene test (tabla arriba). El único hueco es
  `getAdminUser`, que `docs/verification.md` §5 no obliga a testear al no tener
  consumidor — queda como observación, no como fallo.
- C3  [x] `typecheck` 0 y `build` 0.
- C4  [x] Sin `any`, sin variables muertas, sin hex, nombres y ubicación correctos
  (`UsersList.test.tsx` en `src/admin/__tests__/`, tipos exportados desde `lib/api.ts`).
- C5  [x] Cero `fetch` fuera de `src/lib/api.ts`; sin state manager ni librería de
  fetching nueva; tipos derivados (`extends AdminUser`, `Partial<>`, `AdminUser['role']`).
- C6  [x] Los cinco endpoints en `docs/api-contract.md` §4 bis, actualizado en el
  mismo commit y contrastado contra el backend.
- C7  [x] `feature_list.json` sigue en `pending`, que es el estado real hasta este
  veredicto; `progress/impl_32.md` documenta lo hecho, la verificación y por qué la
  bitácora no fue a `current.md` (instrucción del líder por conflicto con el cierre
  de la 31). Ver Observación 1 para lo que le toca al líder al cerrar.
- C8  [x] Ningún `.env*` leído ni escrito; ninguna variable de entorno nueva.
- C9  [x] Sin `console.log`, sin código comentado, sin `TODO` huérfanos, sin
  temporales. El único `TODO` que había (el de `mockUsers.ts`) se fue con el archivo.
- C10 [x] Scope de una sola feature: 7 archivos, todos de la 32 (los 6 declarados +
  su informe). No se tocó `src/admin/images/`, `src/admin/prices/`, `AppRoutes.tsx`
  ni `AdminLayout.tsx`, ni se arregló de paso deuda ajena.
- C11 [x] `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` y
  `.gitignore` intactos.

## Observaciones (ninguna bloquea; para el líder)

1. **`docs/architecture.md` queda desfasado por esta feature.** La línea 9 sigue
   diciendo que usuarios está «en maquetación… con datos mock», y la lista de
   «Endpoints consumidos» de §5 (`:163-174`) no incluye `/api/admin/users`. `CHECKPOINT.md`
   C6 solo exige `api-contract.md`, así que no lo cuento como fallo, pero es drift
   introducido hoy. Súmalo al pendiente que el implementer ya dejó apuntado: el
   baseline de `docs/verification.md` §1-§2 y `docs/architecture.md` §8 sigue
   anunciando `15 archivos / 86 tests` cuando el real es **18 / 133**. Ninguno de
   los tres archivos estaba en la lista de la feature; te toca a ti.
2. **`getAdminUser` es hoy código muerto**: no lo llama ningún componente (la
   edición reutiliza la fila del listado) ni lo cubre ningún test. Lo pedía el
   acceptance 1 y respeta el patrón de `getAdminArticle`, así que lo dejo pasar,
   pero si la 33 y la 34 copian el molde acabarás con tres helpers de detalle sin
   consumidor. Decide si quieres exigirles un test directo en
   `src/lib/__tests__/api.test.ts` o no pedir el helper hasta que haya pantalla.
3. **El mapeo de `field` es un whitelist, no una tabla.** `toFormField`
   (`UserDialog.tsx:44-46`) hace `FORM_FIELDS.find(f => f === field)`: es explícito
   en el sentido que importa (un nombre no previsto cae al aviso global en vez de
   marcar un input inexistente) y está documentado en su JSDoc, y hoy los tres
   nombres del backend coinciden con los del formulario. Pero sigue apoyándose en
   esa coincidencia. Si en la 33/34 el backend nombra un campo distinto al del
   input (p. ej. `seccion` → `section`), un `Record<string, FormField>` explícito
   será obligatorio. Conviene decirlo al lanzar esas features.
4. **El error del listado no se anuncia.** `UsersList.tsx:118` pinta el error en un
   `Box` sin `role="alert"`, así que un lector de pantalla no se entera del `409`
   del último admin. Es el patrón heredado de `LeadsList.tsx:100`, no una regresión
   de esta feature, pero es el sitio donde aterriza el único error que el usuario
   no puede prever.

## Detalle de los fallos

Ninguno. No hay `[ ]` en la lista de checkpoints.
