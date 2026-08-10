# Review — feature 39: La seccion de add-ons de la landing consume /api/complementos

**Veredicto:** APPROVED

## Verificación ejecutada

- `npm test` → **22 archivos / 246 tests**, exit 0 (baseline previo 21/234, delta +1 archivo / +12 tests — coincide con lo declarado en `progress/impl_39.md`). Ejecutado también en aislado `src/components/sections/__tests__/Addons.test.tsx` (12/12), `src/components/sections/__tests__/Pricing.test.tsx` (22/22) y `src/admin/__tests__/PricesList.test.tsx` (24/24) para confirmar que ningún test previo de precios se rompió — clave dado que el implementer decidió NO tocar `formatMoneda`.
- `npm run typecheck` → exit 0.
- `npm run build` → exit 0 (aviso esperado `Some chunks are larger than 500 kB`, sin cambio de tamaño relevante).

## Verificación por mutación (los cinco puntos críticos)

Se mutó `src/components/sections/Addons.tsx` cinco veces, una a la vez, ejecutando `Addons.test.tsx` tras cada mutación y revirtiendo con el backup del scratchpad antes de la siguiente. Tras la última reversión, `diff` contra el backup dio **vacío** y la suite completa (`npm test`, 246/246) y `npm run typecheck` volvieron a estar en verde.

1. **Respaldo hard-codeado reintroducido** (en la rama `else` del `useEffect`, sustituyendo el `setEstado('error')` por un array con nombres/precios del antiguo `addons`): **3 tests se pusieron rojos**, incluido el explícito "con fallo de red la sección no se renderiza y NO reaparece el array hard-codeado". Búsqueda adicional confirmó que no existe el array en ninguna de las cuatro formas (constante en componente, default de `useState`, mock importado en producción, rastro en `src/`): `grep -rln "Créditos adicionales|Cerebro Extendido|Workflows adicionales" src/` solo devuelve archivos de test (`Addons.test.tsx`, `ComplementosList.test.tsx`, `api.test.ts`).
2. **Decimales**: se mutó `formatImporte` para que se comportara como `formatMoneda` (sin forzar 2 decimales) → **1 test rojo** (`'$0.20'` no encontrado). Confirmado que `src/lib/api.ts` no cambió (`git diff -- src/lib/api.ts` vacío) y que `formatMoneda` sigue devolviendo `"$0.2"` para `0.2` — el formateador es local y privado a `Addons.tsx`, como declara el implementer.
3. **Icono/color por nombre** (se sustituyó el índice `i % length` por `c.nombre.length % length`): **2 tests rojos** (el de ciclo al 5º y el de "no sigue al nombre" al intercambiar nombres entre dos posiciones).
4. **`precio: null` tratado como `0`** (se forzó la rama de precio con `c.precio ?? 0`): **2 tests rojos** (pinta `$0` en vez de paquetes, y pinta `$0` en el caso límite sin paquetes).
5. **Parpadeo** (se añadió un `return` intermedio con `id="addons"` mientras `estado === 'loading'`): **4 tests rojos**, incluido el que vigila `MutationObserver` para las tres ramas de fallback y el de "carga sin salto ni parpadeo".

Los cinco mecanismos anti-regresión funcionan: si alguien reintroduce cualquiera de estos bugs, la suite se pone roja.

## Checkpoints

- C1  [x] — `npm test` 22/246 exit 0, sin test previo roto (confirmado aislando `Pricing.test.tsx` y `PricesList.test.tsx`).
- C2  [x] — Los 11 puntos del `acceptance` tienen verificación: 1 (test "pide los complementos..."), 2 (describe "fallback heredado", 4 tests + mutación #1), 3 (describe "carga sin salto ni parpadeo" + mutación #5), 4 (describe "icono y color de acento por posición", 2 tests + mutación #3), 5 (test "precio: null pinta sus paquetes" + caso límite sin paquetes + mutación #4), 6 (test de decimales + mutación #2, sin tocar `formatMoneda`), 7 (mismo test de paquetes: nombre/descripción/precio), 8 (explícitamente delegado a verificación visual por el propio acceptance — no requiere test, mismo criterio que la rejilla de `Pricing.tsx`/feature 26, que tampoco lo testea), 9 (`key={c.id}` verificado por lectura de código — no hay precedente en el repo de testear `key` vía RTL, tampoco lo hace `Pricing.test.tsx` con `key={p.id}`), 10 (test explícito de fallo de red que comprueba ausencia de rastros del array hard-codeado, verificado con mutación), 11 (`docs/api-contract.md` §4 quinquies actualizado, diff revisado).
- C3  [x] — `npm run typecheck` y `npm run build` exit 0.
- C4  [x] — `Addons.tsx` en `src/components/sections/`, test en `__tests__/` hermano (`docs/conventions.md` §1). Sin `any` (`grep` vacío), sin variable sin usar (typecheck con `noUnusedLocals` estricto pasa). Colores: `tokens.accent.red/violet/blue` y `tokens.brand.green` importados directos (`ESTILO_POR_POSICION` es un array de datos JS, exactamente el caso de uso que documenta `docs/conventions.md` §3.3 — "arrays de datos (`accent: tokens.accent.violet`)"), cero hex literal en el componente (`grep -n "#[0-9A-Fa-f]{3,6}"` solo matcheó parcialmente el ancla `#addons` en un comentario, no un color). Máquina de estados explícita `'loading'|'ok'|'error'` (§5).
- C5  [x] — Cero `fetch` fuera de `src/lib/api.ts` (`grep -rln "fetch(" src/ | grep -v lib/api.ts | grep -v __tests__` vacío). Sin state manager nuevo. `AdminComplemento`/`AdminPaquete` reutilizados de `src/lib/api.ts` (feature 37), ningún tipo duplicado en `Addons.tsx`.
- C6  [x] — `GET /api/complementos` ya documentado en `docs/api-contract.md` §4 quinquies desde la feature 37; esta feature añade la subsección "Qué hace la landing con estos datos (feature 39, 2026-08-09)", mismo formato que §4 quater (35) y §4 ter (36).
- C7  [x] — `feature_list.json` mantiene `status: "in_progress"` para la 39 (correcto, no le corresponde al implementer ni al reviewer marcar `done`). `progress/current.md` documenta la sesión completa, decisiones, verificación y bloqueos (ninguno).
- C8  [x] — Ningún `.env`/`.env.local` leído o escrito. Sin variables de entorno nuevas.
- C9  [x] — Sin `console.log`/`console.debug` en `Addons.tsx` ni en el test nuevo. Sin código comentado "por si acaso" (los comentarios son documentación de decisiones, con referencias a features y archivos). `git status` sin residuos ajenos a la 39 (`tsconfig.tsbuildinfo` está fuera del scope de esta revisión, según indicación explícita de la tarea).
- C10 [x] — El cambio toca exactamente `src/components/sections/Addons.tsx`, su test nuevo, `docs/api-contract.md` y las bitácoras de `progress/`. No tocó `formatMoneda` (deuda compartida con `ComplementosList.tsx`) ni otra deuda documentada en `docs/architecture.md` §10 — documentado explícitamente como "fuera de scope" en `progress/impl_39.md` y `progress/current.md`.
- C11 [x] — `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `.gitignore` sin modificar (`git status` no los lista).

## Pendiente de verificación visual (no lo mide ningún test)

- Acceptance punto 8: la rejilla `gridTemplateColumns` clamada a `Math.min(columnas, 4)` con `maxWidth` centrado para menos de 4 tarjetas, comportamiento con 1..N complementos a 360 px y 1440 px. El implementer documenta en `progress/impl_39.md` que no pudo levantar el backend (`GET /api/complementos` responde `{"rows":[]}` en el entorno real, sin seed) y razona el `sx` por comparación línea a línea con `Pricing.tsx` (ya verificado visualmente en la feature 35). Un humano debe confirmarlo a ojo cuando haya complementos cargados desde `/admin/complementos`.

## Detalle de los fallos

Ninguno. Los cinco puntos de ruptura señalados en la tarea (respaldo hard-codeado, decimales, icono/color por posición, `precio: null`, parpadeo) se verificaron por mutación y todos ponen la suite en rojo cuando se reintroduce el bug correspondiente; el árbol quedó restaurado byte a byte tras cada mutación.
