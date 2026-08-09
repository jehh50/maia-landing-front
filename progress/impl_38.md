# Implementación — Feature 38: Editar los paquetes de cada complemento contra `/api/admin/paquetes`

**Estado:** implementación completa, `CHANGES_REQUESTED` de la primera review
(`progress/review_38.md`) atendido, verificación en verde. **No marcada
`done`**: pendiente de re-veredicto de un `reviewer` contra `CHECKPOINT.md`.

**Rama:** `feat/37-admin-complementos` (la misma que la 37; no se creó rama nueva,
no se hizo commit, siguiendo la instrucción explícita del encargo).

## Qué se cambió

### `src/lib/api.ts`

Añadido el bloque `// --- Paquetes (feature 38) ---` al final del archivo, justo
después de `deleteAdminComplemento`:

- `PaqueteInput` = `Pick<AdminPaquete, 'nombre' | 'complemento_id' | 'precio'> & Partial<Pick<AdminPaquete, 'descripcion' | 'orden'>>`.
  Al derivarlo con `Pick` (no `Partial<Pick>`) para `precio` y `complemento_id`,
  mandar `precio: null` o construir el payload sin `complemento_id` **no
  compila** — cumple el acceptance de "error de compilación, no un 422 en
  runtime". Sin campo `unidad`.
- `PaquetePatchInput = Partial<PaqueteInput>`.
- Constantes `PAQUETE_NOMBRE_MAX` (120), `PAQUETE_DESCRIPCION_MAX` (500),
  `PAQUETE_PRECIO_MAX` (99999999.99), `PAQUETE_ORDEN_MAX` (2147483647) — los
  mismos límites que el complemento, según `API_READY.md` ("el resto de
  campos son los mismos, sin unidad").
- `getAdminPaquete(id)`, `createAdminPaquete(payload)`,
  `updateAdminPaquete(id, patch)` (admite reasignar `complemento_id`),
  `deleteAdminPaquete(id)` (sintetiza `{ ok: true }` del `204` sin cuerpo,
  solo si la respuesta fue 2xx, mismo molde que `deleteAdminComplemento`).
- **No se añadió `listPaquetes`**: no existe ese endpoint, ni público ni de
  panel. Los paquetes se leen siempre anidados de `listComplementos()`.

### `src/admin/addons/PaqueteEditDialog.tsx` (nuevo)

Alta y edición de un paquete. Diferencias deliberadas respecto a
`ComplementoEditDialog.tsx`:

- `precio` es **obligatorio**: un campo vacío es un error de cliente
  (`'precio requerido'`), nunca un `null` legítimo.
- Selector `TextField select` "Complemento" (mismo patrón que el `Rol` de
  `UserDialog.tsx`), poblado con la lista de complementos que ya tiene cargada
  `ComplementosList`. Permite reasignar el paquete a otro add-on.
- **Guardia de "sin cambios"**: al abrir, toma una instantánea (`initial`) de
  los cinco campos. `dirty` compara el formulario actual contra esa
  instantánea; si no hay diferencia, el botón "Guardar cambios" queda
  deshabilitado y `onSubmit` hace un early-return por si acaso. Así el
  formulario nunca manda un `PATCH` vacío, que el backend rechazaría con
  `422`.
- Mismo patrón `FIELD_BY_BACKEND` que `ComplementoEditDialog`/`PlanEditDialog`
  para mapear el `field` de un `422` (incluido `complemento_id`) al input
  correspondiente.

### `src/admin/addons/ComplementosList.tsx`

- La celda "Paquetes" pasa de una lista `<ul>` de solo lectura a filas con
  `IconButton` de editar/borrar por paquete (`aria-label="Editar paquete <nombre>"` /
  `"Borrar paquete <nombre>"`), más un botón "Agregar paquete" por fila de
  complemento (`aria-label="Agregar paquete a <complemento>"` para
  desambiguar entre filas en los tests).
- Nuevo estado: `editingPaquete`, `creatingPaqueteFor` (guarda el complemento
  que abrió el alta, para preseleccionarlo), `paqueteToDelete`,
  `deletingPaquete`. Handlers `cerrarPaqueteDialogo`, `onSavedPaquete` (cierra
  y llama a `load()`), `confirmDeletePaquete`.
- Nuevo `<Dialog>` de confirmación "¿Borrar paquete?" **sin ninguna mención de
  cascada** (a diferencia del de complemento, que sí la menciona): borrar un
  paquete no toca a su complemento.
- Tras crear, editar o borrar un paquete se llama a `load()`, que vuelve a
  pedir `GET /api/complementos` completo — no hay endpoint para refrescar un
  solo complemento sin re-listar, así que es la misma estrategia que ya usa
  el resto de la pantalla para complementos.
- Copy introductorio actualizado ("los paquetes se muestran aquí de solo
  lectura" → "cada paquete se edita desde su propia fila").

### `src/admin/addons/ComplementoEditDialog.tsx`

Corregido el copy y el docstring que apuntaban a "su propia pantalla, no
aquí" (observación menor de la review de la 37, `progress/review_37.md`):
ahora dicen que los paquetes se editan desde la fila del complemento en
`ComplementosList`, no desde este formulario de complemento. No se tocó nada
más de este archivo.

### `docs/api-contract.md` §4 quinquies

Renombrada a "Complementos y paquetes". Sustituida la sección "Los paquetes
son de solo lectura en esta feature" por la documentación completa de
`/api/admin/paquetes`: las 4 rutas, `PaqueteInput`, las tres asimetrías
respecto a `ComplementoInput` (precio obligatorio, `complemento_id`
obligatorio con su `422`/`404`, sin `unidad`), la reasignación de
`complemento_id`, la guardia de "PATCH sin cambios" y la tabla de errores.

### Tests

- `src/admin/__tests__/ComplementosList.test.tsx`: el mock de `fetch` ahora
  también sirve `/api/admin/paquetes[/:id]` (`validarPaquete()` reproduce el
  validador real: precio obligatorio, `complemento_id` debe existir en el
  store, `PATCH` vacío → `422` sin `field`). 10 tests nuevos repartidos en
  tres `describe` (`paquetes: alta`, `paquetes: edición`, `paquetes:
  borrado`): alta manda `complemento_id` y `precio`; precio obligatorio
  bloquea el envío en cliente; edición manda los campos editables; un
  formulario sin cambios deja "Guardar cambios" deshabilitado y no dispara
  ningún `fetch` de escritura; reasignación de `complemento_id` mueve el
  paquete de fila; `complemento_id` inexistente marca el selector con un
  `422`; un `:id` de paquete inexistente se muestra como `404`; el borrado no
  menciona cascada; el `DELETE` de un paquete no dispara ningún `DELETE` de
  complemento; cancelar no borra. Dos tests existentes ajustados (la celda de
  paquetes ahora incluye el botón "Agregar paquete"; el test de permisos gana
  tres aserciones sobre los controles de paquete ocultos a un `editor`).
  Total del archivo: 18 → 28 tests (luego 29, ver ronda de arreglo abajo).
- `src/lib/__tests__/api.test.ts`: 6 tests nuevos para
  `getAdminPaquete`/`createAdminPaquete`/`updateAdminPaquete`/`deleteAdminPaquete`,
  incluido el `422 { field: 'complemento_id' }` y el `204` sin cuerpo
  sintetizando `{ ok: true }`. Total del archivo: 18 → 24 tests.

## Ronda de arreglo — `CHANGES_REQUESTED` (`progress/review_38.md`)

**Veredicto:** `CHANGES_REQUESTED`, C2 (rechazo automático). Un único fallo,
de cobertura de test, no de código de producción.

**Diagnóstico del reviewer:** `PaqueteEditDialog.tsx:142`
(`if (paquete && !dirty) return;`) es la única línea que impide un `PATCH`
vacío si el formulario se envía por una vía distinta al clic en "Guardar
cambios" (el botón queda `disabled`, pero eso no cubre un envío implícito del
`<form>`: Enter con foco en un campo, `form.submit()`, tecnología de
asistencia). El test más cercano
(`ComplementosList.test.tsx:649-660`, "un formulario sin cambios no envía
ningún PATCH…") solo comprobaba `disabled` + `escrituras(spy)` en 0 **antes**
de intentar ningún envío — cierto con o sin la guardia. El reviewer lo
confirmó quitando la línea 142 y viendo la suite completa seguir en 28/28
verde.

**Arreglo — solo test, ningún cambio en código de producción.** Nuevo test en
`ComplementosList.test.tsx` (`describe('ComplementosList — paquetes:
edición')`): abre el diálogo de edición de "Pack S" sin tocar ningún campo,
obtiene el `<form>` real del diálogo (`dialog.querySelector('form')`) y
dispara `fireEvent.submit(form)` directamente — bypaseando el `disabled` del
botón para ejercer la guardia real del `onSubmit`. Verifica
`escrituras(spy)` en 0 **después** del intento.

**Verificación de que el test es mutación-resistente (hecha por mí, mismo
protocolo pedido):**

1. Comenté la línea 142 (`if (paquete && !dirty) return;`) en
   `PaqueteEditDialog.tsx`.
2. Corrí el test nuevo en aislado: **ROJO** —
   `expected [ { …(3) } ] to have a length of +0 but got 1` (un
   `PATCH /api/admin/paquetes/7` real salió).
3. Reverti la mutación y confirmé `git diff src/admin/addons/PaqueteEditDialog.tsx`
   **sin diferencias** (byte a byte igual al original).
4. Corrí el test de nuevo: **verde**.

El test cumple el criterio: detecta la ausencia de la guardia, y con la
guardia puesta pasa limpio.

**Verificación completa tras el arreglo:**

```
npm test           # 21 archivos / 234 tests — exit 0 (+1 sobre 233: el test nuevo)
npm run typecheck   # exit 0
npm run build        # exit 0 (mismo aviso de chunk >500 kB esperado)
```

`git status` limpio, sin residuos de la mutación temporal ni archivos ad-hoc.

## Decisiones

1. **Se expone la reasignación de `complemento_id` en la UI** (el acceptance
   dejaba elegir). `ComplementosList` ya carga todos los complementos en
   `rows` para pintar la tabla, así que pasárselos a `PaqueteEditDialog` para
   poblar el selector no tiene coste adicional relevante, y el acceptance
   describe explícitamente que el backend lo admite.
2. **La guardia de "PATCH sin cambios" se resuelve enteramente en cliente**
   (deshabilitando el botón + early-return), no enviando un `PATCH` parcial
   con solo los campos modificados. El formulario siempre construye el
   `PaqueteInput` completo cuando sí hay cambios — igual que
   `ComplementoEditDialog` — así que la única forma de garantizar "no se
   envía cuando no hay cambios" es no disparar la petición en absoluto.
3. **Recarga completa (`listComplementos()`) tras cada escritura de
   paquete**, no una recarga parcial de un complemento. No existe un
   `GET /api/complementos/:id` público al que apuntar una recarga selectiva
   (el único `GET` de detalle es privado, `/api/admin/complementos/:id`, y
   habría que resolver el `complemento_id` correcto tanto en alta como en
   reasignación); reusar `load()` es además el mismo patrón que ya usa la
   pantalla para las escrituras de complemento.
4. **Límites (`PAQUETE_*`) se definen como constantes propias**, aunque su
   valor coincide con las del complemento, para mantener el patrón del repo
   de una constante por recurso (mismo criterio que `IMAGE_ALT_MAX` frente a
   `COMPLEMENTO_DESCRIPCION_MAX`) y no acoplar un recurso a los símbolos del
   otro.

## Verificación (implementación inicial, antes de la ronda de arreglo)

```
npm test           # 21 archivos / 233 tests — exit 0
npm run typecheck   # exit 0
npm run build        # exit 0 (aviso "Some chunks are larger than 500 kB" — esperado)
```

Ejecutado de forma aislada (sin otra suite en paralelo), sin flake. La
verificación final, tras atender el `CHANGES_REQUESTED`, está en la sección
anterior (21 archivos / 234 tests).

## Observaciones fuera de scope (no tocadas)

- `src/components/sections/Addons.tsx` sigue con su array hardcodeado, a
  propósito y fuera de backlog (confirmado en `docs/api-contract.md` §4
  quinquies).
- `getAdminPaquete` queda sin consumidor en la UI — mismo patrón que
  `getAdminComplemento` (feature 37), `getAdminPlan` (feature 34) y
  `getAdminUser` (feature 32); no es deuda nueva de esta feature.
- El resto de la deuda heredada de la 37 (documental, `UsersList.tsx`/
  `LeadsList.tsx` sin `role="alert"`, etc.) no se tocó — detalle en
  `progress/current.md` y `progress/history.md`.

## Archivos tocados

```
src/lib/api.ts
src/admin/addons/ComplementosList.tsx
src/admin/addons/ComplementoEditDialog.tsx
src/admin/addons/PaqueteEditDialog.tsx        (nuevo)
src/admin/__tests__/ComplementosList.test.tsx
src/lib/__tests__/api.test.ts
docs/api-contract.md
feature_list.json                              (status → in_progress)
progress/current.md
```
