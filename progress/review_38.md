# Review — feature 38: Editar los paquetes de cada complemento contra `/api/admin/paquetes`

**Veredicto:** CHANGES_REQUESTED

**Rama revisada:** `feat/37-admin-complementos` (sin commitear, 37+38 mezcladas en el working tree) · **Revisor:** no me fié del informe del implementer: reejecuté `npm test`/`typecheck`/`build`, contrasté `docs/api-contract.md` línea a línea contra `API_READY.md`, y reproduje con mutación los cinco puntos críticos que se me pidió verificar (revirtiendo cada mutación y confirmando `git status`/`diff` sin residuos después de cada una).

## Verificación ejecutada (por mí)

- `npm test` → **21 archivos / 233 tests, exit 0** (103.47 s, una sola suite a la vez, sin flake). Coincide exacto con lo declarado (+16 sobre el baseline 21/217 de la 37, 0 archivos nuevos).
- `npm run typecheck` → exit 0, sin salida.
- `npm run build` → exit 0 en 20.42 s (`ComplementosList-_c1FOlPt.js`: 13.99 kB, chunk propio lazy; aviso `Some chunks are larger than 500 kB` esperado, no invalida C3).

## Mutaciones reproducidas (los cinco puntos que se pidió verificar sin fiarse de la lectura)

1. **`precio` obligatorio y `complemento_id` obligatorio a nivel de tipo.** Creé un archivo temporal `src/lib/__tsc_check_paquete.ts` (dentro de `src/`, recogido por `include` de `tsconfig.json`) con tres literales: uno con `precio: null`, otro sin `complemento_id`, y un control positivo válido. `npx tsc -p tsconfig.json --noEmit` da **2 errores** exactamente en esas dos líneas (`TS2322: Type 'null' is not assignable to type 'number'` y `Property 'complemento_id' is missing`), y el control positivo compila limpio. Confirma que `PaqueteInput` usa `Pick` (no `Partial<Pick>`) para ambos campos — es error de compilación, no un `422` de runtime. Archivo borrado tras la prueba; `git status` no lo muestra.
2. **`ComplementoInput` no contaminado.** Leído `src/lib/api.ts:790` (`precio: number | null`) y `:808-810` (`ComplementoInput = Pick<'nombre'> & Partial<Pick<'descripcion'|'precio'|'unidad'|'orden'>>`): sigue admitiendo `null` en `precio`, sin tocar. No hizo falta mutar: es lectura directa, sin ambigüedad.
3. **Sin `listPaquetes` + recarga tras escritura.** `grep -n "export function list" src/lib/api.ts` no devuelve ningún `listPaquetes`. Mutado `onSavedPaquete`/`confirmDeletePaquete` en `ComplementosList.tsx` para que no llamen a `load()` tras crear/borrar un paquete: **4 tests rojos** (alta, edición con reasignación, borrado). Revertido, `diff` contra copia previa sin diferencias, suite vuelve a 28/28 verde.
4. **Borrado de paquete sin cascada y sin tocar el complemento.** Mutado el copy de la confirmación de borrado de paquete (`ComplementosList.tsx`, diálogo `¿Borrar paquete?`) para mencionar "cascada", y mutado `deleteAdminPaquete` (`src/lib/api.ts`) para pegar contra `/api/admin/complementos/${id}` en vez de `/api/admin/paquetes/${id}`: **2 tests rojos** (`la confirmación de borrar un paquete NO menciona ninguna cascada` y `envía DELETE /api/admin/paquetes/:id y no dispara ningún DELETE de complemento`). Revertido, `diff` limpio, suite vuelve a verde.
5. **`PATCH` sin cambios no se envía — mutación NO detectada por la suite existente.** Mutado `PaqueteEditDialog.tsx` quitando el `if (paquete && !dirty) return;` de `onSubmit` (línea 142). Ejecuté `ComplementosList.test.tsx` completo: **28/28 siguen en verde**. El único test relacionado (`'un formulario sin cambios no envía ningún PATCH: "Guardar cambios" queda deshabilitado'`, línea 649-660) solo comprueba que el botón está `disabled` y que `escrituras(spy)` tiene longitud 0 **sin haber intentado enviar el formulario**: esa aserción es trivialmente cierta con o sin la guardia, porque nunca se dispara el submit. Escribí un test ad-hoc (`src/admin/__tests__/__scratch_patch_guard.test.tsx`, borrado tras la prueba) que abre el diálogo de edición y dispara `fireEvent.submit(form)` directamente sobre el `<form>` (bypaseando el `disabled` del botón, que es justo el vector por el que un envío implícito de formulario — Enter en un campo, disparo programático, herramienta de accesibilidad — podría colarse): **con la guardia mutada (quitada), sale un `PATCH /api/admin/paquetes/7` real con el payload sin cambios**; con el código original (revertido), el mismo test da `WRITES: []` — la guardia sí funciona, pero **ningún test del `acceptance` la ejerce**. Revertido `PaqueteEditDialog.tsx` (`diff` contra copia previa sin diferencias) y borrado el archivo ad-hoc; `git status` final idéntico al de partida.

Los tres archivos mutados (`ComplementosList.tsx`, `src/lib/api.ts`, `PaqueteEditDialog.tsx`) se restauraron byte a byte (`diff` contra copia previa → sin diferencias) y `npm test` completo volvió a dar 21/233 exit 0 tras revertir todo.

## Reasignación de `complemento_id` (decisión del implementer, expuesta en la UI)

Test `'reasigna un paquete a otro complemento cambiando el selector "Complemento"'` (línea 662-679) sí es mutación-resistente: verifica que `addon-1-paquetes` gana "Pack S" y `addon-2-paquetes` lo pierde tras el `PATCH`, no solo que se llamó al endpoint. El test de `complemento_id` inválido (línea 681-696) marca el campo (no `role="status"` global) — mismo nivel de rigor que el resto del panel.

## Checkpoints

- C1  [x] — `npm test` 21/233 exit 0, ningún test previo roto (reejecutado, no solo leído).
- C2  [ ]  ← El acceptance 6 ("Un PATCH vacío… el formulario no envía cuando no hay cambios") **no tiene un test que sobreviva a la mutación de su propia guardia**: `src/admin/addons/PaqueteEditDialog.tsx:142` (`if (paquete && !dirty) return;`) es la única línea que impide un envío real si el formulario se dispara por una vía distinta al clic del botón deshabilitado (Enter, `form.submit()`, tecnología de asistencia); quitarla no rompe ningún test de `src/admin/__tests__/ComplementosList.test.tsx:649-660`, cuya única aserción de "no se envía" (`escrituras(spy)).toHaveLength(0)`) se ejecuta **sin haber intentado enviar el formulario**, así que es cierta con o sin la guardia. El resto del `acceptance` (1, 2, 3, 4, 5, 7, 8, 9) sí tiene verificación mutación-resistente, confirmada arriba.
- C3  [x] — `typecheck` y `build` exit 0.
- C4  [x] — Ubicación correcta (`src/admin/addons/PaqueteEditDialog.tsx`, test en `src/admin/__tests__/`); sin `any` (`grep` limpio en los archivos nuevos/tocados); sin hex hardcodeado (`grep` limpio); tipos derivados con `Pick`/`Partial` sobre `AdminPaquete` (`api.ts:893-895`), no duplicados.
- C5  [x] — Ningún `fetch` fuera de `src/lib/api.ts` (`grep` limpio en `src/admin/addons/` y en los tests); sin state manager ni librería de fetching nueva; sin `listPaquetes` (confirmado por `grep`, punto 3 de las mutaciones).
- C6  [x] — `docs/api-contract.md` §4 quinquies ("Paquetes (`/api/admin/paquetes`) — feature 38", líneas 674-745) contrastada contra `API_READY.md` (rutas, `PaqueteInput`, las tres asimetrías, reasignación, guardia de PATCH vacío, tabla de errores): coincide, no es invención.
- C7  [x] — `feature_list.json` sigue `in_progress` (correcto, a la espera de este veredicto); `progress/current.md` documenta lo hecho, la verificación y los bloqueos (ninguno declarado).
- C8  [x] — Sin secretos leídos ni escritos; sin variables de entorno nuevas.
- C9  [x] — Sin `console.log`/`console.debug`, sin `TODO` sin contexto, sin archivos `.orig`/`.bak`; `git status` tras revertir todas mis mutaciones queda **idéntico** al de partida (solo los archivos declarados por el implementer más `API_READY.md`/`feature_list.json`/`tsconfig.tsbuildinfo`, que no son suyos).
- C10 [x] — Scope limitado a la 38: `ComplementoEditDialog.tsx` solo cambia el copy de la línea 201-202 (ya no promete "su propia pantalla"), confirmado por lectura completa del archivo, sin más diferencias; `src/AppRoutes.tsx`/`src/admin/AdminLayout.tsx`/`AdminLayout.test.tsx` no mencionan "paquete" en ningún punto (son cambios heredados de la 37, ya aprobados en `progress/review_37.md`, no tocados por la 38); `src/components/sections/Addons.tsx` sin tocar (último commit `24be8db9`, anterior a esta rama), sigue hardcodeado a propósito.
- C11 [x] — `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `.gitignore` sin modificar.

## Detalle de los fallos

`src/admin/addons/PaqueteEditDialog.tsx:142` — la guardia `if (paquete && !dirty) return;` es el único código que impide un `PATCH` vacío si el formulario se envía por una vía que no sea el clic del botón "Guardar cambios" (que sí queda `disabled`, pero eso no cubre un envío implícito del `<form>`). No hay ningún test en `src/admin/__tests__/ComplementosList.test.tsx` que la ejerza de verdad: el test más cercano (línea 649-660) solo comprueba `disabled` + 0 escrituras *antes* de intentar ningún envío, aserción que es trivialmente cierta con o sin la guardia (lo verifiqué mutando la línea 142 y viendo la suite completa seguir en 28/28 verde; solo un `fireEvent.submit(form)` ad-hoc, que no existe en la suite real, detecta la regresión). Falta un test que dispare el submit del formulario (clic forzado, `fireEvent.submit`, o Enter con foco en un campo) sin cambios y compruebe `escrituras(spy)` en 0 **después** del intento. Viola C2 (acceptance 6 sin verificación mutación-resistente), que es rechazo automático.

---

# Re-revisión (2026-08-09) — arreglo del gap de C2

**Veredicto actualizado:** APPROVED

## Qué cambió

El implementer añadió un test nuevo en `src/admin/__tests__/ComplementosList.test.tsx:662-681`
(`'un envío directo del <form> sin cambios (bypaseando el botón deshabilitado)
tampoco dispara PATCH'`), que abre el diálogo de edición de un paquete y hace
`fireEvent.submit(form)` directamente sobre el `<form>` del diálogo — sin pasar
por el botón `disabled` — para ejercer la guardia real de
`PaqueteEditDialog.tsx:142` (`if (paquete && !dirty) return;`). No tocó ningún
archivo de producción.

## Verificación ejecutada (por mí, no me fié del informe)

1. **Repetí la mutación que destapó el fallo la vez pasada**: comenté/borré
   `if (paquete && !dirty) return;` en `src/admin/addons/PaqueteEditDialog.tsx:142`
   y corrí `src/admin/__tests__/ComplementosList.test.tsx` completo (29 tests).
   Resultado: **1 rojo, exactamente el test nuevo**
   (`ComplementosList — paquetes: edición > un envío directo del <form> sin
   cambios (bypaseando el botón deshabilitado) tampoco dispara PATCH`,
   `expected [...] to have a length of +0 but got 1`), los otros 28 siguen en
   verde. Confirma que el test es sensible a la guardia y no rompe nada más al
   mutarla.
2. **Reverti la mutación** y comprobé `diff` contra la copia que ya había
   revisado en la pasada anterior (`PaqueteEditDialog.tsx.bak`, tomada antes de
   que existiera el arreglo): **sin diferencias**. Confirma que el arreglo es
   solo de test, cero cambios en código de producción.
3. **Bloque completo, una suite a la vez:**
   - `npm test` → **21 archivos / 234 tests, exit 0** (101.55 s, sin flake) —
     coincide con lo declarado (+1 sobre 233), y los 233 anteriores siguen
     verdes (no hay ningún rojo en la salida completa).
   - `npm run typecheck` → exit 0.
   - `npm run build` → exit 0 en 21.08 s (mismo aviso esperado de chunk >500 kB,
     `ComplementosList-_c1FOlPt.js` sin cambio de tamaño relevante).
4. `git status` tras revertir mi mutación queda idéntico al de antes de
   empezar (solo mi propio `progress/review_38.md` añadido).

## Checkpoints (actualización)

- C2  [x]  ← Resuelto: el acceptance 6 ahora tiene un test mutación-resistente
  (`ComplementosList.test.tsx:662-681`), verificado por mí con la misma
  mutación que lo destapó en la pasada anterior.
- Resto de checkpoints (C1, C3-C11): sin cambios respecto a la revisión
  anterior, siguen `[x]`. No se repitió su verificación completa porque el
  arreglo no tocó nada de lo que cubrían (instrucción explícita del
  coordinador: re-check acotado).

## Detalle de los fallos

Ninguno. Sin observaciones bloqueantes.
