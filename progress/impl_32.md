# Implementación — feature 32: Cablear la vista de usuarios a `/api/admin/users`

**Estado:** código en pie y verde. Pendiente de review.
**Fecha:** 2026-07-31.

> Nota de proceso: el líder me indicó explícitamente **no tocar**
> `feature_list.json` ni `progress/current.md` porque otro agente estaba cerrando
> la feature 31 sobre esos mismos archivos. Por eso el estado de la 32 no se
> movió a `in_progress` desde esta sesión y esta bitácora vive en
> `progress/impl_32.md` en vez de en `current.md`. El cambio de estado a `done`
> lo hará quien corresponda tras el veredicto del reviewer.

## Baseline (árbol limpio, antes de tocar nada)

```
npm test          → 18 archivos / 125 tests, exit 0
npm run typecheck → exit 0
npm run build     → exit 0 (aviso de chunk >500 kB, esperado)
```

La feature 31 ya estaba aplicada en `src/lib/api.ts` (`ApiFailure.field` y
`readErrorField`), que es la dependencia declarada de la 32.

## Archivos tocados

| Archivo | Qué |
|---|---|
| `src/lib/api.ts` | **Solo añadidos** al final del bloque de admin: sección «Admin: usuarios (feature 32)». Ni una línea existente modificada. |
| `src/admin/users/UsersList.tsx` | Cableado a `listAdminUsers` / `deleteAdminUser` vía `normalizeApi`. |
| `src/admin/users/UserDialog.tsx` | Cableado a `createAdminUser` / `updateAdminUser` vía `normalizeApi` + mapeo de `field`. |
| `src/admin/users/mockUsers.ts` | **Eliminado.** Las fixtures viven ahora en el test. |
| `src/admin/__tests__/UsersList.test.tsx` | Reescrito: 19 tests contra `globalThis.fetch`. |
| `docs/api-contract.md` | Usuarios pasa de §10.3 (maquetación) a §4 bis (endpoints vigentes). |
| `progress/impl_32.md` | Este informe. |

No se tocó `src/AppRoutes.tsx`, `src/admin/AdminLayout.tsx`, `feature_list.json`,
`progress/current.md` ni nada de `src/admin/images/` ni `src/admin/prices/`.
Infraestructura intacta (C11). No se leyó ni escribió ningún `.env*` (C8).

## Los cinco helpers (`src/lib/api.ts`)

```ts
listAdminUsers()                    // GET    /api/admin/users        → { rows }
getAdminUser(id)                    // GET    /api/admin/users/:id    → { user }
createAdminUser(payload)            // POST   /api/admin/users        → 201 { user }
updateAdminUser(id, patch)          // PATCH  /api/admin/users/:id    → { user }
deleteAdminUser(id)                 // DELETE /api/admin/users/:id    → 204 sin cuerpo
```

Todos por `apiJson`, que ya pone `credentials: 'include'`. Cero `fetch` en
componentes (C5). Tipos:

- `AdminUserRow extends AdminUser { created_at: string }` — se **deriva** de
  `AdminUser` en vez de duplicarlo, y son exactamente las columnas de
  `PUBLIC_COLS` del backend. **`password_hash` no aparece en ningún tipo.**
- `UserCreateInput = UserInput & { password: string }` → el `POST` **exige**
  `password` a nivel de tipo.
- `UserPatchInput = Partial<UserInput>` → en el `PATCH` `password` es opcional.

## Decisiones que fijan el patrón para las features 33 y 34

### 1. El `204` sin cuerpo y `normalizeApi`

`normalizeApi(call, 'ok')` mira si el payload de éxito trae la clave. Un `204`
no trae body, así que `apiJson` devuelve `data: null` y el `DELETE` se leería
como **fallo**. Se resuelve **en el helper**, no en el componente:

```ts
export async function deleteAdminUser(id: number | string): Promise<ApiResult<{ ok: true }>> {
  const res = await apiJson<{ ok: true }>(`/api/admin/users/${id}`, { method: 'DELETE' });
  return res.ok && res.data == null ? { ...res, data: { ok: true } } : res;
}
```

El `res.ok &&` es lo que impide caer en el antipatrón `if (ok || data == null)` de
`ArticlesList.tsx:43`: aquí un error sin body sigue siendo un error. (Matiz que
salió de la mutación M3, más abajo: hoy `normalizeApi` ya vuelve a comprobar `ok`,
así que para el consumidor actual esa guarda es defensa en profundidad, no la
única barrera. Se mantiene porque el helper también debe ser correcto si algún
día se consume crudo.) Los `DELETE` de imágenes (33) y precios (34) también
responden `204`: **este es el molde**.

### 2. El `403` de `requireRole` no tiene la forma habitual

Documentado en `docs/api-contract.md` §10.1 como aviso explícito «para cuando se
cablee»: el backend responde `{ ok: false, error: 'forbidden', message: '…' }`,
así que `ApiFailure.error` trae el **token** `'forbidden'`, no un texto legible.
Como el sidebar (`AdminLayout.tsx`) enseña «Usuarios» también al rol `editor`, y
los cinco endpoints son `requireRole('admin')`, el caso es alcanzable hoy: un
editor leería literalmente «forbidden».

Se añade a `src/lib/api.ts`:

```ts
export const FORBIDDEN_ERROR = 'No tienes permisos para gestionar esta sección.';
export function adminErrorMessage(res: ApiFailure): string {
  return res.status === 403 ? FORBIDDEN_ERROR : res.error;
}
```

Se usa en los tres puntos donde se pinta un error de red (listado, borrado,
aviso global del formulario). Nota: `normalizeApi` descarta el `message` del
backend, así que el texto es copy nuestro; mapear por `status` es lo único
disponible sin tocar código existente.

### 3. La búsqueda es **de cliente**, no un `?q=`

`GET /api/admin/users` **no acepta ningún parámetro de query** — verificado en
`usersRouter.js:53-61`, que llama a `listUsers(pool)` sin leer `req.query`, y en
`users.js:124-129`, un `SELECT … ORDER BY id ASC` sin `WHERE`. Mandar `?q=` sería
inventar contrato: el backend lo ignoraría y la pantalla parecería rota.

Por eso: `load` sin dependencias (una sola petición al montar, sin debounce, que
ya no pinta nada) y el filtro en un `useMemo` sobre las filas cargadas. Es
consistente con que el listado no pagine: vienen todos los usuarios.

### 4. Sin `TablePagination`

El contrato es `{ rows }` a secas — ni `total`, ni `limit`, ni `offset`. Es la
diferencia con leads y hay un test que lo congela (URL exacta sin query string +
ausencia de «Por página»).

### 5. `field` → input del formulario (primer consumidor de la feature 31)

`UserDialog` mapea el nombre que usa el backend al input:

```ts
const FORM_FIELDS = ['email', 'name', 'role', 'password'] as const;
function toFormField(field: string | undefined): FormField | null {
  return FORM_FIELDS.find(f => f === field) ?? null;
}
```

Aquí los nombres coinciden, pero el mapeo es explícito a propósito: un `field`
que esta pantalla no pinta (o un error sin `field`) cae al `<Alert role="status">`
global en vez de perderse. Cubre el `422` de `role`, el `422` de `email`/
`password` y el `409` de email duplicado, que también trae `field`.

### 6. Los dos `409` del borrado

- **Usuario propio:** la UI lo sigue deshabilitando (`disabled={isSelf}` +
  `Tooltip`), no se toca. La petición no llega a salir.
- **Último admin:** no es deducible en cliente sin contar admins de una lista que
  podría estar filtrada o desactualizada, así que **solo se conoce por
  respuesta**. Se pinta `res.error` tal cual en el `Box` de error del listado
  (patrón de `LeadsList.tsx:100`, no `Alert`: en listas el error es de una línea).
  El copy preventivo del diálogo de confirmación (feature 28) se conserva.

### 7. `id`

Se mantiene `number`, como `AdminUser` y como dice §10.3.1. La columna es
`BIGSERIAL` y `pg` no tiene `setTypeParser` configurado, así que en runtime puede
llegar como string; la comparación `u.id === sessionUserId` sigue siendo correcta
porque **ambos lados vienen del mismo driver** (`/api/auth/me` y
`/api/admin/users` leen la misma tabla). Cambiar `AdminUser.id` a `string`
tocaría `AdminGuard`, `Login` y `AdminLayout`, que no son de esta feature (C10).
Las features 33 y 34 **sí** piden explícitamente tratar el id como string.

## Tests — 20 casos en `src/admin/__tests__/UsersList.test.tsx`

`vi.spyOn(globalThis, 'fetch')` con `Response` reales. **No se mockea
`src/lib/api.ts`**: el cliente HTTP entra en el test, así que un cambio de URL,
método o forma del payload lo rompe. `mockUsersApi()` es un backend mínimo con
`store` en memoria (para que la recarga posterior a una escritura devuelva el
listado ya actualizado) y dos escotillas, `list` y `write`, para inyectar un
error concreto.

| # | Caso | Acceptance que cubre |
|---|---|---|
| 1 | GET `/api/admin/users` con `credentials: 'include'`, pinta email/nombre/rol/fecha | 1, 9 |
| 2 | Sin paginación: sin «Por página» y URL exacta sin query | 2 |
| 3 | La búsqueda filtra en cliente: **una sola** petición, ninguna con `q=` | 2 |
| 4 | Estado vacío | — |
| 5 | Mensaje del backend si el listado falla (500) | 4 |
| 6 | El `403` se traduce; no se enseña «forbidden» | §10.1 |
| 7 | POST con `{email,name,role,password}` **exactos** y recarga (3 llamadas) | 1, 7, 9 |
| 8 | La validación de cliente corta antes: **cero** escrituras | 6 |
| 9 | `422` con `field: 'role'` marca el campo Rol, no el aviso global | 6 |
| 10 | `409` `field: 'email'` marca el email (`aria-invalid="true"`) | 5, 6 |
| 11 | Error sin `field` → `<Alert role="status">`, email sin marcar | 6 |
| 12 | PATCH `/api/admin/users/2` **sin** `password` si se deja en blanco | 3, 7 |
| 13 | PATCH **con** `password` si se escribe | 7 |
| 14 | DELETE `/api/admin/users/2` y el `204` sin cuerpo se trata como éxito | 3 |
| 15 | Un error **sin cuerpo** (500) no se confunde con el `204`: la fila sigue y se avisa | 3, 4 |
| 16 | `409` del último admin con su mensaje del backend | 5 |
| 17 | Cancelar no borra: cero escrituras | — |
| 18-20 | `it.each` con tres sesiones: la fila propia deshabilitada se mueve con el id | 5 |

## Prueba de que los tests discriminan (mutación → rojo → revertido)

Cada mutación se aplicó sola sobre el código de producción, se corrió
`npx vitest run src/admin/__tests__/UsersList.test.tsx`, y se revirtió antes de la
siguiente (script en el scratchpad de la sesión, con `finally` que restaura el
archivo). El árbol quedó idéntico: `git status` solo lista los 6 archivos de la
feature.

| # | Mutación | Resultado |
|---|---|---|
| M1 | `listAdminUsers()` pide `'/api/admin/users?limit=25&offset=0'` | **ROJO — 2** (carga con GET…; no pagina…) |
| M2 | `deleteAdminUser` deja de sintetizar el `204` (`return res;`) | **ROJO — 1** (DELETE y el 204 como éxito) |
| M3 | `deleteAdminUser`: `res.ok && res.data == null` → `res.data == null` | **VERDE — no detectada** (ver abajo) |
| M3b | `deleteAdminUser` al estilo `ArticlesList`: `data == null` ⇒ `ok: true` | **ROJO — 1** (error sin cuerpo no se confunde con el 204) |
| M4 | `UserDialog` manda siempre `password` en el `PATCH` | **ROJO — 1** (PATCH sin password si se deja en blanco) |
| M5 | `UserDialog` ignora `res.field` (todo al `Alert` global) | **ROJO — 2** (422 con field…; 409 email duplicado…) |
| M6 | `adminErrorMessage` devuelve `res.error` a secas | **ROJO — 1** (traduce el 403…) |
| M7 | El `useMemo` de la búsqueda devuelve `rows` sin filtrar | **ROJO — 2** (la búsqueda filtra…; estado vacío…) |
| M8 | No se recarga el listado tras un borrado con éxito | **ROJO — 1** (DELETE y el 204 como éxito) |

### Lo que M3 destapó, y que corrige este informe

La primera versión de la suite **no detectaba M3**, y eso invalidaba una
afirmación que yo había escrito antes de comprobarla. La razón: `normalizeApi`
ya exige `ok` **además** de la clave (`if (ok && data && key in data)`), así que
degradar el `res.ok &&` del helper no cambia nada **para un consumidor que pase
por `normalizeApi`** — que es el único que hay hoy.

Dos consecuencias, las dos aplicadas:

1. Se añadió el test que faltaba: **un `500` sin cuerpo en el `DELETE`**. Ese sí
   es el riesgo real y M3b (la forma genuina del antipatrón de
   `ArticlesList.tsx:43`, que además fuerza `ok: true`) lo pone en rojo.
2. El `res.ok &&` **se mantiene** —es correcto para quien use el helper crudo,
   sin `normalizeApi`— pero ya no se vende como «lo que separa esto del
   antipatrón» sin matices: hoy es defensa en profundidad, no la única barrera.

## Salida de la verificación

```
npm test           → Test Files 18 passed (18) | Tests 133 passed (133)   exit 0
npm run typecheck  → exit 0, sin salida
npm run build      → ✓ built in 19.82s, exit 0
                     (aviso «Some chunks are larger than 500 kB»: esperado,
                      docs/verification.md §1)
```

**Conteo antes → después: 18 archivos / 125 tests → 18 archivos / 133 tests.**
Mismo número de archivos (se reescribió `UsersList.test.tsx`, no se añadió uno
nuevo); **+8 tests netos** = 20 casos nuevos menos los 12 de la maqueta.

## Nota para el líder (no lo toco yo, está fuera de mi lista de archivos)

`docs/verification.md` §1-§2 sigue anunciando el baseline **`15 archivos / 86
tests`** y `docs/architecture.md` §8 arrastra la misma cifra. Ya estaban
desfasados **antes** de esta sesión (el baseline real era 18/125 con el árbol
limpio), así que no es regresión de la 32, pero el número correcto tras esta
feature es **18 archivos / 133 tests**. Ninguno de los dos archivos está en la
lista que se me autorizó a tocar; lo dejo apuntado para que se actualice donde
corresponda.

