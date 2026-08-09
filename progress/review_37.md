# Review — feature 37: Vista admin de complementos (add-ons)

**Veredicto:** APPROVED

**Rama revisada:** `feat/37-admin-complementos` (sin commitear) · **Revisor:** no me fié del informe: reejecuté `npm test`/`typecheck`/`build`, leí `API_READY.md` como fuente autoritativa, y reproduje con mutación los cuatro puntos críticos que se me pidió verificar (revirtiendo todas después de comprobarlas).

## Verificación ejecutada (por mí)

- `npm test` → **21 archivos / 217 tests, exit 0** (100.65 s, una sola suite a la vez, sin flake). Baseline previo 20/194 → delta declarado (+1 archivo, +23 tests) confirmado exacto.
- `npm run typecheck` → exit 0, sin salida.
- `npm run build` → exit 0 en 20.22 s (`ComplementosList-CFWKMhJP.js`: 8.61 kB en chunk propio lazy; aviso `Some chunks are larger than 500 kB` esperado, no invalida C3).

## Mutaciones reproducidas (los cuatro puntos que se pidió verificar sin fiarse de la lectura)

1. **`precio` vacío → `0` en vez de `null`** (`parsePrecio`, `ComplementoEditDialog.tsx:34`): mutado `return { value: null, ... }` → `{ value: 0, ... }`. Resultado: **2 tests rojos** en `ComplementosList.test.tsx` (alta con precio vacío y edición vaciando el precio), incluida la celda pintando `"$0 / crédito"` en vez de `"—"`. Revertido y confirmado verde de nuevo.
2. **Listado desde `/api/admin/complementos` en vez del público** (`listComplementos`, `src/lib/api.ts:836-838`): mutado `publicJson('/api/complementos', ...)` → `apiJson('/api/admin/complementos', ...)`. Resultado: **18 de 18 tests rojos** entre `ComplementosList.test.tsx` y `api.test.ts` — la aserción de URL literal (`expect(String(url)).toBe('/api/complementos')`) discrimina de verdad. Revertido.
3. **Quitar el número de paquetes del aviso de cascada** (`ComplementosList.tsx:219`): mutado el mensaje a un texto genérico sin el conteo. Resultado: **1 test rojo** (`la confirmación menciona la cascada y cuántos paquetes se llevan por delante`). El caso de 0 paquetes tiene su propio test separado (`'no tiene paquetes asociados'` / no debe aparecer `'se eliminarán también'`), no tocado por esta mutación y confirmado que ya pasaba antes. Revertido.
4. **Paquetes de solo lectura**: no hace falta mutar, es ausencia estructural — `grep -rn "admin/paquetes" src/` solo aparece en comentarios/JSDoc de `api.ts` y `ComplementosList.tsx` (nunca en una llamada real), y no existe ningún botón de crear/editar/borrar paquete en `ComplementosList.tsx` ni `ComplementoEditDialog.tsx` (el diálogo solo muestra un `Alert` informativo, sin controles).

Los tres archivos mutados se restauraron byte a byte (`diff` contra copia previa → sin diferencias) y `npm test` completo volvió a dar 21/217 exit 0 tras revertir.

## Checkpoints

- C1  [x] — `npm test` 21/217 exit 0, ningún test previo roto (verificado, no solo leído el informe).
- C2  [x] — Los 15 puntos del `acceptance` tienen verificación: nav (`AdminLayout.test.tsx`), ruta (compila/lazy, mismo nivel de cobertura que `prices`, que tampoco tiene test directo de ruta), tipos/helpers (`api.test.ts` + `ComplementosList.test.tsx`), asimetría pública/privada (URL literal, mutación 2), `id` string (URLs con `/1`, `/2`), `precio: null` ≠ `0` (mutación 1), `unidad` aparte (celda `"$0.2 / crédito"`), `paquetes` siempre presente y solo lectura (test + grep estructural), cascada con conteo (mutación 3, con y sin paquetes), límites como constantes (`maxLength` + `COMPLEMENTO_*_MAX` en el formulario), `422` con `field` (test dedicado + `FIELD_BY_BACKEND`), strings/`null` sin coerción (payload siempre `string`/`null`), sin `mockComplementos.ts` (confirmado, no existe), tests con `fetch` real (confirmado, `Response` reales), `docs/api-contract.md` actualizado (confirmado contra `API_READY.md`).
- C3  [x] — `typecheck` y `build` exit 0.
- C4  [x] — Ubicación (`src/admin/addons/`, test en `src/admin/__tests__/`, mismo patrón que `prices`/`images`/`users`), sin `any` (`grep` limpio), sin hex hardcodeado (`grep` limpio, reutiliza `tokens`/`formatMoneda`), tipos derivados con `Pick`/`Partial` sobre `AdminComplemento` en vez de duplicarse.
- C5  [x] — Ningún `fetch` fuera de `src/lib/api.ts` (`grep` limpio en los archivos nuevos/tocados); sin state manager ni librería de fetching nueva.
- C6  [x] — `docs/api-contract.md` gana §4 quinquies, contrastada línea a línea contra `API_READY.md` (rutas, los 6 campos exactos, límites, cascada, asimetría del listado): coincide, no es invención.
- C7  [x] — `feature_list.json` sigue `in_progress` (correcto, a la espera de este veredicto) y `progress/current.md` documenta lo hecho, la verificación y los bloqueos (ninguno).
- C8  [x] — Sin secretos leídos ni escritos; sin variables de entorno nuevas.
- C9  [x] — Sin `console.log`/`console.debug`, sin `TODO` sin contexto, sin archivos `.orig`/`.bak`; `git status` solo muestra los archivos declarados por el implementer (más `API_READY.md`/`feature_list.json`/`tsconfig.tsbuildinfo`, que no son suyos).
- C10 [x] — Scope limitado a la 37: `src/components/sections/Addons.tsx` no se tocó (sigue hardcodeado, documentado como fuera de alcance); ningún helper ni UI de `/api/admin/paquetes` (eso es la 38); `getAdminComplemento` sin consumidor en la UI es deuda ya documentada, mismo patrón que `getAdminPlan`/`getAdminUser`, no se "arregló" de paso.
- C11 [x] — `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `.gitignore` sin modificar.

## Detalle de los fallos

Ninguno. Sin observaciones bloqueantes.

## Observación menor no bloqueante

`src/admin/addons/ComplementoEditDialog.tsx:200` — el aviso al editar un complemento con paquetes dice "Se editan desde su propia pantalla, no aquí", pero esa pantalla (feature 38) todavía no existe: hoy no hay ningún lugar del panel donde editar un paquete. No viola ningún punto del `acceptance` (que solo exige que aquí no haya controles de edición, cosa que se cumple) ni ningún checkpoint C1-C11, pero conviene ajustar el copy cuando se implemente la 38 para no dejar una referencia a una pantalla inexistente.
