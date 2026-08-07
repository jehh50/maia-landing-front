# Review — feature 28: Vista admin de usuarios (maqueta con datos mock)

**Veredicto: APROBADO**

Revisor: reviewer. Fecha: 2026-07-30. Commit revisado: `dc97090` (rama `feat/admin-cruds`).

> **Aviso de contexto.** El implementer murió por un fallo de sesión antes de escribir
> `progress/impl_28.md`, así que **no existe informe del autor**. Esta review juzga el
> código por sí mismo, sin poder contrastar contra el razonamiento original. Por eso el
> §5 («Decisiones de diseño sin justificar») es más largo de lo normal: recoge por escrito
> lo que habría ido en el `impl_28.md` que falta. Ninguno de esos puntos es motivo de
> rechazo, pero quedan registrados.
>
> La feature 29 (commit `339752c`, ya en el árbol) **no** entra en esta review.

---

## 1. Verificación ejecutada (repetida por el revisor, no copiada del informe)

| Comando | Resultado |
|---------|-----------|
| `npm test` | **exit 0** — 17 archivos / 106 tests (el árbol ya incluye la feature 29) |
| `npx vitest run src/admin/__tests__/UsersList.test.tsx` | **exit 0** — 1 archivo / **10 tests** |
| `npm run typecheck` | **exit 0** |
| `npm run build` | **exit 0** (aviso esperado `Some chunks are larger than 500 kB`) |

Coincide con lo reportado por el líder para el momento del cierre de la 28 (16 / 96);
el delta hasta 17 / 106 es de la feature 29.

**Scope verificado con `git show --stat dc97090`:**

```
src/admin/__tests__/UsersList.test.tsx | 171 +
src/admin/users/UserDialog.tsx         | 149 +
src/admin/users/UsersList.tsx          | 187 +-
src/admin/users/mockUsers.ts           | 126 +
tsconfig.tsbuildinfo                   |   2 +-
```

`src/lib/api.ts`, `src/AppRoutes.tsx`, `src/admin/AdminLayout.tsx`, `docs/` y la landing:
**intactos**. Confirmado también que `git show dc97090 -- src/lib/api.ts src/AppRoutes.tsx
src/admin/AdminLayout.tsx docs/` no devuelve nada.

---

## 2. Los 10 acceptance criteria, uno a uno

| # | Criterio | ¿Cumple? | Evidencia |
|---|----------|----------|-----------|
| 1 | Columnas email/nombre/rol/alta + búsqueda + estados carga/error/vacío al estilo `LeadsList` | **Sí, con matiz** | `UsersList.tsx:105-109` (columnas), `:88-97` (búsqueda con debounce 300 ms `:50-53`), `:113-115` (loading `CircularProgress size={20}` + `colSpan` + `py: 4`), `:116-118` (vacío «Sin usuarios.»), `:99` (error `Box` de una línea, idéntico a `LeadsList.tsx:100`). Matiz en §4.1 |
| 2 | Alta/edición con validación **por campo** estilo `Login.tsx`, no mensaje global | **Sí** | `UserDialog.tsx:48-57` (`validate()` calcado de `Login.tsx:21-28`), `:96-97,106-107,116-117,128-133` (`error` + `helperText` por campo), `:44-46` + `:95,105,115,127` (limpieza al teclear). El `Alert` global (`:137`) queda solo para errores **sin** `field`, que es exactamente la distinción de `Login.tsx:19,117-121` |
| 3 | Borrado con `Dialog` de confirmación estilo `ArticlesList.tsx:113-124` | **Sí** | `UsersList.tsx:168-186`: mismo `open={!!toDelete}`, mismo par `Cancelar`/`Borrar` con `disabled={deleting}` y `{deleting ? 'Borrando…' : 'Borrar'}`. No copia el bug `if (ok \|\| data == null)` que el manual §2 marca con ⚠️ |
| 4 | Rol solo `admin`/`editor` + copy «editor solo accede a Blog» | **Sí** | `UserDialog.tsx:20-23` (catálogo tipado a nivel de módulo, patrón del manual §1.1), `UsersList.tsx:83-86` (copy en la cabecera), `UserDialog.tsx:22` (hint del rol en el `helperText`). Test `UsersList.test.tsx:107-109` congela las opciones a `['Administrador','Editor']` |
| 5 | Mock propio del recurso, `TODO(feature-28)`, forma exacta de la tabla | **Sí** | `mockUsers.ts:20-23` (`TODO(feature-28)` con referencia y plan de cableado), `:28-30` forma exacta. Ver §3 |
| 6 | No se toca `src/lib/api.ts` ni se inventa endpoint | **Sí** | `git show` confirma cero cambios en `api.ts`; solo importa el **tipo** `AdminUser` (`mockUsers.ts:25`, `UsersList.tsx:11`) y la constante `EMAIL_RE` (`UserDialog.tsx:6`). Cero `fetch` en los cuatro archivos (grep) |
| 7 | Tests: pinta filas / búsqueda filtra / formulario valida / cancelar no borra | **Sí, los cuatro** | `:38`, `:58`, `:81`, `:133`. Y seis más: vacío `:71`, catálogo de roles + alta `:97`, edición `:118`, borrado efectivo `:150`, sin paginación `:52`, fila propia deshabilitada `:164` |
| 8 | Borrado deshabilitado en la fila del usuario en sesión; id desde `useOutletContext<AdminUser>()` | **Sí** | `UsersList.tsx:24-25` `useOutletContext<AdminUser>()` — **sin hardcodeo**, verificado por lectura. `:120` `isSelf`, `:146` `disabled={isSelf}`, `:140` `Tooltip` con el motivo. Contrastado contra `AdminLayout.tsx:101` `<Outlet context={user} />` con `user: AdminUser`: el tipo del contexto es **el real**, no uno inventado para el test. Debilidad del test en §4.2 |
| 9 | El copy contempla el 409 del último `admin` | **Sí** | `UsersList.tsx:174-178`. Además cubre el otro requisito de `api-contract.md` §10.3.1: «Sus artículos no se borran: se quedan sin autor». Test `:140`. Matiz en §4.3 |
| 10 | **NO** pinta paginación | **Sí** | Cero `TablePagination` en el archivo (grep). `UsersList.tsx:19-21` documenta el porqué. Test negativo real en `:52-56` (`queryByText(/por página/i)` — la etiqueta que `LeadsList.tsx` sí emite vía `labelRowsPerPage="Por página"`, así que la aserción discrimina de verdad). El mock devuelve `{ rows }` sin `total` (`mockUsers.ts:32-35,78`), así que **ni siquiera existe el dato** para paginar |

**10 / 10 cumplidos.**

---

## 3. Los cuatro puntos críticos que pediste auditar

### 3.1 Reglas de negocio del backend (`api-contract.md` §10.3)

**(a) No ofrecer el borrado de la fila propia — verificado, no es decorado.**
- Código: `UsersList.tsx:24` `const sessionUser = useOutletContext<AdminUser>()` → `:25`
  `sessionUserId` → `:120` `isSelf` → `:146` `disabled={isSelf}`. **No hay ningún `1` ni
  ningún id literal en el archivo.**
- Defensa en profundidad: `mockUsers.ts:115-120` reproduce además el 409 en la capa de
  datos, así que aunque el botón se habilitara, la operación se rechazaría con el mensaje
  literal del contrato («No puedes eliminar tu propio usuario»).
- El harness del test (`UsersList.test.tsx:16-28`) monta una `Route` anidada con
  `<Outlet context={user} />` real, que es el patrón exigido por el manual §6.1 — no
  mockea `useOutletContext`.
- **Debilidad del test, no del código:** ver §4.2.

**(b) Copy del 409 del último `admin` — verificado.**
`UsersList.tsx:174-178` lo dice explícitamente, y `mockUsers.ts:121-123` reproduce la
regla. El test `:140` (`/último\s+usuario con rol admin/i`) es una aserción sobre el copy
que **efectivamente falla si el párrafo desaparece**: no es decorado. Lo que sí queda sin
test es la *rama de lógica* de `mockUsers.ts:121-123` (§4.3).

### 3.2 Nada de paginación

Correcto y bien argumentado en el propio código (`UsersList.tsx:19-21`,
`mockUsers.ts:12,32-35`). El tipo `MockUsersList` **solo** tiene `rows`: la forma del dato
hace imposible reintroducir paginación por descuido. Es la decisión correcta frente al
contrato, y la diferencia con leads está explicada donde toca.

### 3.3 Forma del mock y ausencia de `password_hash`

```ts
export interface MockUser extends AdminUser { created_at: string; }   // mockUsers.ts:28-30
```
`AdminUser` (`api.ts:45-50`) = `{ id, email, name, role: 'admin'|'editor' }` → `MockUser`
= **exactamente** `id, email, name, role, created_at`, las cinco columnas de `PUBLIC_COLS`.
Es **tipo derivado, no duplicado** (C5, `conventions.md` §2): resiste un cambio en
`AdminUser` y no reintroduce el `AdminUserRow` duplicado que el manual §4.2 proponía.

`password_hash`: **cero apariciones** en los cuatro archivos (grep). `password` aparece
solo como campo de formulario (`MockUserInput.password?`, `UserDialog.tsx:123-136`),
que es justo lo que el contrato permite (obligatorio en `POST`, opcional en `PATCH`).
El seed (`mockUsers.ts:53-58`) tiene 4 filas con `created_at` ISO y una con `name: ''`
para ejercitar la celda vacía. Correcto.

### 3.4 Maqueta de verdad y aislada

- **Cero `fetch`** en los cuatro archivos, y el test lo **asegura activamente**:
  `UsersList.test.tsx:32,49` espía `globalThis.fetch` y afirma `not.toHaveBeenCalled()`.
  Esto es mejor que una simple ausencia: si alguien cablea un `fetch` a medias, el test
  se pone rojo.
- Cero endpoints inventados: `mockUsers.ts:12-16` transcribe las rutas del contrato en un
  comentario, sin construir ni una sola URL.
- Separación de capas: la pantalla solo habla con `listMockUsers` / `createMockUser` /
  `updateMockUser` / `deleteMockUser`, y `MockResult<T>` (`:49-51`) imita la unión
  discriminada `ApiSuccess | ApiFailure`. El cableado será mayormente mecánico —
  **con una excepción real documentada en §5.4**.

---

## 4. Estilos, accesibilidad y calidad de los tests

### 4.0 Estilos — limpio

- **Cero hex, cero `rgba()` de marca, cero `className` de utilidad, cero `var(--…)`
  innecesario** en los cuatro archivos (grep `#[0-9a-fA-F]{3,8}`, `className`, `rgba(`:
  sin resultados).
- Todo por `sx` + tokens del tema: `bgcolor: 'surface.soft'` (`UsersList.tsx:104`),
  `color: 'error.main'` (`:99`), `color: 'text.secondary'` (`:83,117,133`).
- El único `style={{}}` nativo (`UsersList.tsx:124`, `<em style={{ color:
  tokens.text.disabled }}>—</em>`) es **el caso legítimo** del import directo de `tokens`
  (`conventions.md` §3.3) y es copia literal de `LeadsList.tsx:135`. `tokens.text.disabled`
  existe (`tokens.ts:48`). Correcto.
- No hace falta `alpha()` en ningún punto: no hay ninguna opacidad sobre color de marca.
- `…` tipográfico en `'Guardando…'` y `'Borrando…'`, `¿…?` completos. Copy en español.

### 4.1 Accesibilidad — cumple el §1.1 del manual

- Búsqueda: `inputProps={{ 'aria-label': 'Buscar usuarios' }}` (`UsersList.tsx:95`).
- Acciones con el email en el nombre accesible: `aria-label={`Editar ${u.email}`}` (`:137`)
  y `aria-label={`Borrar ${u.email}`}` (`:147`).
- El `IconButton` deshabilitado va envuelto en `<span>` dentro del `Tooltip` (`:141-151`):
  detalle correcto de MUI, sin él el tooltip del caso «no puedes borrarte» no se mostraría.
- Campos del diálogo con `aria-label` propio (`UserDialog.tsx:98,108,118,134`) y `<Alert
  role="status">` (`:137`).
- **Todos los tests consultan por rol accesible** (`getByRole('button', { name: … })`,
  `getByLabelText`, `getByRole('combobox'|'option'|'listbox')`). Los dos `data-testid` de
  fila se usan solo donde el clic sería ambiguo, que es lo que autoriza el manual §6.1.

### 4.2 Debilidad real: el test de la fila propia no discrimina un hardcodeo

`UsersList.test.tsx:16` declara `renderUsers(user: AdminUser = sessionUser)`, **pero
ningún test invoca `renderUsers` con un usuario distinto del de por defecto (`id: 1`)**.
Consecuencia: una implementación con `const sessionUserId = 1` hardcodeado **pasaría los
10 tests**. El código real sí lee el contexto (verificado por lectura, §3.1a), así que el
acceptance 8 se cumple; pero el parámetro con default sin usar delata un segundo caso
(`renderUsers({ id: 2, … })` → fila 2 deshabilitada, fila 1 habilitada) que quedó sin
escribir, probablemente por el fallo de sesión. **No bloqueante, pero recomendado añadirlo
en la primera feature que vuelva a tocar este archivo.**

### 4.3 Otras lagunas de cobertura (no bloqueantes)

- **Estado de error de la lista** (`UsersList.tsx:99`) sin test, y en la práctica
  inalcanzable desde el listado: `listMockUsers` (`mockUsers.ts:73-79`) **nunca** devuelve
  `ok: false`. Solo se pinta tras un borrado rechazado. Es coherente con una maqueta y con
  el patrón de `LeadsList`, pero conviene saber que ese camino está sin ejercitar.
- **Estado de carga** (`:113-115`) sin aserción propia; se atraviesa implícitamente en cada
  `findByText`.
- **Rama del último `admin`** (`mockUsers.ts:121-123`) sin test, y con el seed actual es
  casi inalcanzable por UI: la única `admin` es Ana, que es la usuaria en sesión y por tanto
  tiene el borrado deshabilitado. Para llegar al 409 hay que degradar a Ana a `editor`,
  crear otro `admin` y borrarlo. El **copy** sí está testeado, que es lo que pide el
  acceptance 9.
- El copy «editor solo accede a Blog» (acceptance 4) está en pantalla pero no tiene
  aserción; sí la tiene el catálogo de roles.

Ninguna de estas lagunas incumple `docs/verification.md` §5 ni el acceptance 7, que
enumera de forma cerrada los cuatro tests exigidos —los cuatro están, más seis extra.

---

## 5. Decisiones de diseño sin justificar (esto es lo que habría ido en `impl_28.md`)

Ninguna es motivo de rechazo. Se dejan por escrito porque no hay informe del autor.

**5.1 `UserDialog.tsx` en lugar del `UserEdit.tsx` que anticipaban el backlog y el manual.**
`feature_list.json` §28 `files` lista `src/admin/users/UserEdit.tsx`, y el manual §3.1
llegaba a mostrar las rutas `users/new` y `users/:id` → `UserEdit`. El implementer eligió
un **modal**. Es la decisión que más justificación necesitaba y no la tiene. Mi juicio:
**defendible y probablemente correcta** — (i) el manual §2 admite las dos formas y da como
criterio «`Dialog` cuando … pocos campos», y aquí son cuatro; (ii) `progress/current.md`
dejó dicho que las features 28-30 no debían volver a tocar `AppRoutes.tsx`, y una página
`UserEdit` habría exigido dos rutas nuevas, saliéndose del scope; (iii) el acceptance 2 solo
exige «formulario con validación por campo», no una ruta. **Acción para el líder:**
corregir `files` en `feature_list.json` (`UserEdit.tsx` → `UserDialog.tsx`) al cerrar, para
que el backlog no mienta.

**5.2 Almacén mutable a nivel de módulo (`mockUsers.ts:60-61`, `let store` / `let nextId`).**
Es estado global de módulo, con acoplamiento entre tests mitigado por `resetMockUsers()`
(`:64-67`) llamado en `beforeEach`. **No** viola C5 —no es un state manager de la app: el
estado de UI sigue en `useState` locales y no hay contexto nuevo— pero es una decisión que
merecía dos líneas de justificación. La alternativa (una factoría por instancia) habría
evitado el `reset`. Aceptable para una maqueta que va a morir en cuanto llegue `API_READY.md`.

**5.3 `updateMockUser` acepta `password` y lo descarta en silencio.**
`UserDialog.tsx:68` envía `password` en el `payload` de edición, y `mockUsers.ts:106`
construye el usuario actualizado **sin usarlo**. Es correcto en el fondo (no se modela
`password_hash`, así que no hay dónde guardarlo), pero produce un desajuste con el
`helperText` «Déjala vacía para conservar la actual» (`UserDialog.tsx:132`), que insinúa
que rellenarla la cambia. En la maqueta no se nota; al cablear el `PATCH` real dejará de
ser un problema. Merecía un comentario en el mock.

**5.4 `MockResult` lleva `field`, pero `ApiFailure` de `src/lib/api.ts` no.**
`mockUsers.ts:51` modela `{ ok: false, error, field? }` —fiel al contrato §10.3, que sí
devuelve `field` en los 422/409— y `UserDialog.tsx:78-80` mapea ese `field` al error del
campo correspondiente. Pero `ApiFailure` (`api.ts:71-75`) es `{ ok, status, error }`:
**`normalizeApi` descarta `field`**. Es decir, el TODO de `mockUsers.ts:20-23` («el resto
de la pantalla no debería necesitar cambios») es **optimista**: al cablear la API real,
o se amplía `normalizeApi`/`api.ts` para propagar `field`, o se pierde el marcado por
campo de los errores del backend y todo cae al `Alert` global. Es el único punto donde el
cableado **no** será mecánico, y debería quedar anotado en la feature de integración.

**5.5 `deleteMockUser(id, currentUserId)` toma un parámetro que el helper real no tendrá.**
`deleteAdminUser(id)` no recibirá el usuario en sesión (lo sabe la cookie). Es una firma
deliberadamente distinta para poder simular el 409 en local; razonable, pero implica una
línea de cambio extra en el cableado. Sin documentar.

**5.6 `name` como `string`, con `''` para «sin nombre».**
`api-contract.md` §10.3.1 tipa `name` como `string | null`. `MockUser` hereda `name: string`
de `AdminUser`, y el seed usa `''` (`mockUsers.ts:57`). Es **coherente con el repo**
(derivar de `AdminUser` es lo que pide C5) y la celda vacía se resuelve con
`{u.name || <em>—</em>}` (`UsersList.tsx:124`), pero conviene saber que si el backend
manda `null`, `u.name.toLowerCase()` en el filtro (`mockUsers.ts:76`) **reventaría**. Hoy
es inalcanzable; al cablear, hay que blindarlo.

**5.7 `updateMockUser` permite degradar al único `admin` a `editor`.**
Se puede dejar el panel sin ningún administrador por la vía del `PATCH`, esquivando la
regla que el `DELETE` sí protege. El contrato **no** documenta ninguna regla del backend
sobre esto, así que no es un incumplimiento —pero es una asimetría que valía la pena
mencionar y, si acaso, consultar con backend.

**5.8 `sessionUser?.id ?? null` sobre un tipo no nulable (`UsersList.tsx:25`).**
El `?.` es redundante según los tipos. Es defensivo y **replica `ArticlesList.tsx:16`
(`user?.role === 'admin'`)**, así que es consistente con el repo. Sin objeción.

**5.9 Tras crear o editar, `load()` reaplica el filtro `q` vigente.**
Si el usuario recién creado no casa con la búsqueda activa, no aparece en la tabla y da
sensación de que no se guardó. Es el mismo comportamiento que tendría la pantalla real
contra el backend; se anota como detalle de UX, no como fallo.

---

## 6. Checkpoints (C1-C11)

- **C1** `[x]` — `npm test` exit 0: 17 archivos / 106 tests, ningún test previo roto. El
  archivo de la feature aporta 10 tests que pasan aislados.
- **C2** `[x]` — cada punto del acceptance tiene verificación; los cuatro tests exigidos
  por el acceptance 7 están, más seis. Lagunas menores (estado de carga, estado de error,
  rama del último `admin`, copy del rol editor) documentadas en §4.2-§4.3: ninguna es de
  las que `docs/verification.md` §5 marca como obligatoria y no cubierta.
- **C3** `[x]` — `npm run typecheck` exit 0 y `npm run build` exit 0 (aviso de chunk
  >500 kB, esperado).
- **C4** `[x]` — `conventions.md` §1 (ubicación y `PascalCase.tsx` en `src/admin/users/`,
  `camelCase.ts` para el módulo de datos, test en `__tests__/` hermano), §2 (**cero `any`**,
  sin variables sin usar —el build lo garantiza—, `interface Props` local no exportada,
  sin `React.FC`, tipos derivados), §3 (cero hex, `sx` + tokens, `style={{}}` nativo solo
  en el caso legítimo).
- **C5** `[x]` — cero `fetch` fuera de `src/lib/api.ts` (de hecho cero `fetch` a secas);
  sin state manager global ni librería de data fetching nueva; `MockUser extends AdminUser`
  en vez de duplicar el tipo.
- **C6** `[x]` — no se consume ningún endpoint. `docs/api-contract.md` §10.3 ya documentaba
  el contrato provisional (feature 27) y no hacía falta tocarlo.
- **C7** `[ ]` — **el único checkpoint incumplido, y no es auto-rechazo.** Detalle en §7.
- **C8** `[x]` — ni `.env` ni `.env.local` leídos o escritos; cero referencias a
  `process.env` / `import.meta.env` en los cuatro archivos (grep). Ninguna variable nueva.
- **C9** `[x]` — sin `console.log`, sin código comentado «por si acaso», sin `.orig`/`.bak`.
  El único `TODO` lleva referencia de feature (`TODO(feature-28)`, `mockUsers.ts:20`), que
  es exactamente lo que exige el criterio. *Observación:* el commit arrastra
  `tsconfig.tsbuildinfo`, que `conventions.md` §8 pide no commitear; el archivo está
  **tracked desde antes** y ya figura como deuda conocida en `progress/history.md`
  (feature 27), así que no se imputa a esta feature.
- **C10** `[x]` — una sola feature: cuatro archivos, todos de la 28. No se arregló deuda
  ajena de paso (`ArticlesList`/`Blog.tsx` siguen sin migrar a `normalizeApi`, el doble
  `useReveal` intacto).
- **C11** `[x]` — `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` y
  `.gitignore` sin tocar.

**10 de 11. C1, C2, C3 y C8 en verde → no hay rechazo automático.**

---

## 7. Detalle del único fallo (C7)

`progress/current.md` **no documenta la feature 28**: sigue con la plantilla vacía
(«Estado: sin sesión abierta») y con el baseline de la 27. No existe `progress/impl_28.md`.
Causa conocida y no imputable al trabajo técnico: **el implementer cayó por un fallo de
sesión antes del cierre**, tal como registra el propio cuerpo del commit `dc97090`.

Como el cierre documental es responsabilidad del líder, **no bloqueo por esto**, pero al
marcar la feature `done` hay que dejar consistente:

1. `feature_list.json` §28 → `status: "done"`, y corregir `files`:
   `src/admin/users/UserEdit.tsx` → `src/admin/users/UserDialog.tsx` (§5.1).
2. `docs/verification.md` §1 y §2 → el baseline sigue diciendo `15 archivos / 86 tests`.
   La 28 lo dejó en **16 / 96** (y la 29 lo ha llevado a 17 / 106). El manual §6.3 lo exige
   explícitamente al cambiar el conteo.
3. `docs/architecture.md:252` → mismo conteo desactualizado (`15 archivos de test, 86 tests`).
4. `progress/current.md` → volcar la entrada de la 28 a `progress/history.md` con la
   verificación ejecutada, y anotar como pendientes vivos los puntos §4.2 (test que no
   discrimina el hardcodeo) y §5.4 (`normalizeApi` no propaga `field`), que son los dos
   que tendrá que resolver la feature de integración cuando aparezca `API_READY.md`.

---

## 8. Veredicto

**APROBADO.** La feature cumple los 10 acceptance criteria, respeta las dos reglas de
negocio del backend con código **y** con datos (no solo con copy), no pinta paginación,
modela el mock con la forma exacta del contrato sin rastro de `password_hash`, valida por
campo al estilo de `Login.tsx`, no rompe ninguna frontera de arquitectura ni convención de
estilo, y es una maqueta genuinamente aislada —con un test que impide que deje de serlo sin
que nadie se entere. Los 10 tests que aporta cubren los cuatro casos exigidos y seis más.

El único checkpoint en rojo es **C7**, puramente documental y consecuencia del fallo de
sesión, resoluble por el líder en el cierre. Lo señalado en §4.2, §4.3 y §5 queda
registrado como sustituto del `impl_28.md` inexistente: nada de eso justifica devolver la
feature, pero §5.4 debe viajar hasta la feature de integración, porque es el único punto
donde el cableado de la API real **no** será mecánico.
