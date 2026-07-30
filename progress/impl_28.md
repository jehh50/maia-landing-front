# RECONSTRUCCIÓN — feature 28: Vista admin de usuarios (maqueta con datos mock)

> ⚠️ **Esto NO es el informe del implementer original.** Es una reconstrucción
> escrita **a posteriori, durante el cierre de la feature** (2026-07-30), por un
> agente distinto del que escribió el código. El implementer original cayó por un
> **fallo de sesión** después de commitear (`dc97090`) y antes de escribir
> `progress/impl_28.md`; el propio cuerpo del commit lo registra. Por eso el
> checkpoint **C7** quedó en rojo en `progress/review_28.md` §7.
>
> **Qué se puede confiar y qué no:** todo lo que sigue está reconstruido leyendo
> (a) el código de los cuatro archivos, (b) los tests, (c) el cuerpo del commit
> `dc97090` y (d) `progress/review_28.md`. **Donde no hay evidencia, se dice
> explícitamente «no reconstruible»** en vez de inventar una motivación. Las
> secciones §4 y §5 recogen decisiones cuyo *efecto* es verificable en el código,
> pero cuya *intención* solo se puede inferir; van marcadas como tales.
>
> La única parte de este documento escrita desde la experiencia directa de quien
> lo firma es la **§6 (endurecimiento del test)** y la **§7 (verificación)**:
> ambas se ejecutaron en el cierre, no las hizo el autor original.

**Feature:** 28 · **Rama:** `feat/admin-cruds` · **Commit del código:** `dc97090`
(«feat(admin): maqueta la vista de usuarios con datos mock», 2026-07-30)
**Review:** `progress/review_28.md` → **APROBADO** (10/10 acceptance, C1-C11 con
solo C7 —documental— en rojo).

---

## 1. Lo que NO se puede reconstruir

Se deja constancia para que nadie lo lea como si estuviera documentado:

- **El baseline que midió el autor antes de tocar nada.** No hay registro suyo.
  `progress/current.md` seguía con el baseline de la feature 27 (`15 / 86`). El
  cuerpo del commit `dc97090` dice que **el líder** verificó el resultado
  (`16 archivos / 96 tests`, typecheck 0, build 0), no el implementer.
- **Las alternativas que consideró y descartó.** En particular en §4.1
  (modal vs. página `UserEdit.tsx`): el resultado se ve, el razonamiento no.
- **Si las lagunas de test de `review_28.md` §4.2-§4.3 fueron una decisión
  consciente o simplemente lo que no llegó a escribir antes de caerse.** La §4.2
  (el parámetro `renderUsers(user)` declarado y nunca ejercido con un valor
  distinto) apunta a lo segundo, pero es una inferencia.
- **Verificación manual en navegador** (`docs/verification.md` §6). No consta que
  se hiciera. La feature es de panel admin y no de landing, así que no era
  obligatoria, pero tampoco hay constancia de lo contrario.

## 2. Qué cambió (verificable: `git show --stat dc97090`)

```
src/admin/__tests__/UsersList.test.tsx | 171 +   (archivo nuevo, 10 tests)
src/admin/users/UserDialog.tsx         | 149 +   (archivo nuevo)
src/admin/users/UsersList.tsx          | 187 +-  (reescribe el anclaje de la feature 27)
src/admin/users/mockUsers.ts           | 126 +   (archivo nuevo)
tsconfig.tsbuildinfo                   |   2 +-  (residuo trackeado, deuda previa)
```

`src/lib/api.ts`, `src/AppRoutes.tsx`, `src/admin/AdminLayout.tsx` y `docs/`:
**cero cambios** (`git show dc97090 -- …` no devuelve nada). Cero dependencias
nuevas. Ningún `.env*` leído ni escrito; ninguna variable de entorno nueva.

### 2.1 `mockUsers.ts` — la capa de datos falsa

- Almacén en memoria (`store` / `nextId` a nivel de módulo) con `SEED` de 4 filas
  y `resetMockUsers()` para los tests.
- `MockUser extends AdminUser { created_at: string }`: **tipo derivado, no
  duplicado**, así que son exactamente las 5 columnas del contrato
  (`docs/api-contract.md` §10.3). `password_hash` no aparece en ninguna parte.
- `MockUsersList` solo tiene `rows` — **no** hay `total`: la forma del dato hace
  imposible reintroducir paginación por descuido (acceptance 10).
- `MockResult<T>` imita la unión discriminada `ApiSuccess | ApiFailure`: las
  funciones no lanzan, devuelven `{ ok }` y el llamador discrimina.
- `deleteMockUser` reproduce **los dos 409 del backend**: borrarse a uno mismo y
  borrar al último `admin`.
- Cabecera del módulo con las 5 rutas del contrato transcritas **como comentario**
  (ni una URL construida) y el `TODO(feature-28)` del plan de cableado.

### 2.2 `UsersList.tsx` — la pantalla

Tabla email / nombre / rol / alta / acciones, búsqueda con debounce de 300 ms
(patrón de `LeadsList`), estados de carga, vacío y error, `UserDialog` para alta y
edición, y `Dialog` de confirmación de borrado con el copy de las dos reglas de
negocio. Sin `TablePagination`.

El punto crítico: `const sessionUser = useOutletContext<AdminUser>()` →
`sessionUserId` → `isSelf` → `disabled={isSelf}` + `Tooltip` con el motivo. **No
hay ningún id literal en el archivo**; el contexto es el real que inyecta
`AdminLayout.tsx:101` (`<Outlet context={user} />`).

### 2.3 `UserDialog.tsx` — el formulario

`validate()` calcado de `Login.tsx`, `error` + `helperText` **por campo**, limpieza
del error al teclear, y `Alert` global reservado a los errores **sin** `field`.
Catálogo `ROLES` tipado a nivel de módulo con solo `admin` y `editor`, y el hint
«Solo accede a la sección de Blog» como `helperText` del selector.

## 3. Cómo se cumplió cada acceptance

El desglose criterio a criterio, con referencias de línea, ya está hecho por el
revisor en `progress/review_28.md` §2 (**10/10**). No se duplica aquí: esa tabla
es más fiable que una reconstrucción, porque se escribió leyendo el código con el
CHECKPOINT delante. Este informe no la contradice en ningún punto.

## 4. Decisiones de diseño (intención **inferida**, no documentada por el autor)

Reconstruidas a partir del código y contrastadas con `review_28.md` §5, que las
recogió por escrito precisamente porque este informe no existía. Se marcan como
inferencias: nadie puede afirmar hoy cuál fue el razonamiento real.

1. **Modal (`UserDialog.tsx`) en vez de la página `UserEdit.tsx` que anticipaba el
   backlog.** Es la decisión más grande y la que menos rastro dejó. Lo único
   sostenible leyendo el repo: una página habría exigido dos rutas nuevas en
   `AppRoutes.tsx`, y `progress/current.md` de la feature 27 dejó dicho que las
   features 28-30 **no** debían volver a tocar archivos compartidos. Es coherente,
   pero **es una racionalización a posteriori, no la razón declarada del autor.**
   Consecuencia práctica: el campo `files` de la feature 28 mentía
   (`UserEdit.tsx`); se corrige en el cierre.
2. **Almacén mutable a nivel de módulo** (`let store`), con acoplamiento entre
   tests mitigado por `resetMockUsers()` en `beforeEach`. Aceptable en una maqueta
   que muere al llegar `API_READY.md`; una factoría por instancia habría evitado el
   `reset`. Sin justificar por el autor.
3. **`deleteMockUser(id, currentUserId)` toma un parámetro que el helper real no
   tendrá** (el backend saca el usuario de la cookie). Es deliberado para poder
   simular el 409 en local, pero implica una línea extra de cambio al cablear.
4. **`name: string` con `''` para «sin nombre»**, mientras el contrato tipa
   `name: string | null`. Deriva de `AdminUser`, que es lo que pide el repo, pero
   `u.name.toLowerCase()` del filtro **reventaría** con un `null` real. Hay que
   blindarlo al cablear.
5. **`updateMockUser` acepta `password` y lo descarta en silencio**, lo que choca
   con el `helperText` «Déjala vacía para conservar la actual». Inocuo en la
   maqueta; desaparece al cablear el `PATCH` real.
6. **`updateMockUser` permite degradar al único `admin` a `editor`**, esquivando
   por `PATCH` la regla que el `DELETE` sí protege. El contrato no documenta nada
   al respecto, así que no es un incumplimiento: es una pregunta para backend.

## 5. El punto que **no** es de esta feature y hay que llevarse

`MockResult` modela `{ ok: false, error, field? }` —fiel al contrato— y
`UserDialog.tsx:78-80` mapea ese `field` al campo culpable. Pero `ApiFailure` de
`src/lib/api.ts` es `{ ok, status, error }`: **`normalizeApi` descarta `field`**.
Es decir, el `TODO(feature-28)` («el resto de la pantalla no debería necesitar
cambios») es **optimista**: al cablear la API real, o se amplía `normalizeApi`, o
se pierde el marcado por campo y todo cae al `Alert` global.

Dado de alta como **feature 31** en `feature_list.json`. **No se arregla aquí**
(C10: es deuda de otra feature).

## 6. Endurecimiento del test de la fila propia (hecho en el cierre, 2026-07-30)

Único cambio de código de esta sesión de cierre, y el único que quien firma este
documento sí hizo de primera mano. Responde a `review_28.md` §4.2.

**El problema.** `UsersList.test.tsx:16` declaraba
`renderUsers(user: AdminUser = sessionUser)`, pero **ningún test lo invocaba con
un usuario distinto del de por defecto (`id: 1`)**. El test «no ofrece borrar la
fila del usuario en sesión» afirmaba sobre dos filas fijas, así que una
implementación con `const sessionUserId = 1` hardcodeado **habría pasado los 10
tests**. Justo la regla de negocio que más importa aquí (el backend responde 409
al intentar borrarse a uno mismo) era la peor cubierta.

**El arreglo.** Solo en `src/admin/__tests__/UsersList.test.tsx`:

- `SESIONES`: **tres** usuarios en sesión distintos —`id 1` (primera fila),
  `id 2` (fila intermedia) y `id 4` (última fila, además la de `name: ''`)—.
- El caso pasa a ser un `it.each(SESIONES)` que, para cada sesión, recorre **las
  cuatro filas del seed** y afirma que **la deshabilitada es la del usuario en
  sesión y todas las demás están habilitadas**. Ya no hay ninguna fila fija: la
  aserción se mueve con el contexto.
- El test sigue consultando por rol accesible (`getByRole('button', { name:
  'Borrar <email>' })`), sin `data-testid` nuevos ni acceso a estado interno.

**Prueba de que el test ahora discrimina (mutación → rojo → revertida).** Se
mutó temporalmente `UsersList.tsx:25` a `const sessionUserId = 1;` y se corrió
solo este archivo:

```
× no ofrece borrar la fila del usuario en sesión (id 2)  → expect(element).toBeEnabled()
× no ofrece borrar la fila del usuario en sesión (id 4)  → expect(element).toBeEnabled()
  Tests  2 failed | 10 passed (12)
```

Con el test **anterior**, esa misma mutación pasaba en verde. La mutación se
revirtió en el mismo comando; `git status --porcelain -- src/admin/users/` quedó
**vacío**, así que `UsersList.tsx`, `UserDialog.tsx` y `mockUsers.ts` siguen
exactamente como los aprobó el reviewer. **No se tocó ningún comportamiento**:
esta sesión solo endurece el test.

Efecto en el conteo: el archivo pasa de **10 a 12 tests**.

## 7. Verificación (ejecutada en el cierre, 2026-07-30)

| Comando | Resultado |
|---------|-----------|
| `npm test` (antes de tocar nada, baseline) | **exit 0** — 17 archivos / **106** tests |
| `npx vitest run src/admin/__tests__/UsersList.test.tsx` | **exit 0** — 1 archivo / **12** tests |
| `npm test` (después) | **exit 0** — 17 archivos / **110** tests |
| `npm run typecheck` | **exit 0** |
| `npm run build` | **exit 0** (aviso esperado `Some chunks are larger than 500 kB`) |

Sobre el delta `106 → 110`: **+2 son míos** (el `it.each` de §6, 10 → 12 en
`UsersList.test.tsx`) y **+2 vienen de la feature 29**, que otro agente estaba
implementando en paralelo durante esta sesión (`src/admin/__tests__/ImagesGrid.test.tsx`
aparece modificado en `git status` y no lo he tocado). Por eso el conteo total no
es un número estable atribuible solo a esta feature.

## 8. Estado

Feature **28 → `done`** en `feature_list.json`, con el veredicto **APROBADO** de
`progress/review_28.md`. El resumen de sesión se vuelca a `progress/history.md`.
