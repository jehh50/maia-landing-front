# Implementación — feature 39: la sección de add-ons de la landing consume `/api/complementos`

**Rama:** `feat/39-addons-api` (sobre `feat/37-admin-complementos`, sin commitear —
mismo criterio heredado que el resto de features de esta rama, ver
`progress/current.md`).

## Qué cambié

- `src/components/sections/Addons.tsx` — reescrito por completo:
  - Consume `GET /api/complementos` vía `listComplementos()` +
    `normalizeApi(…, 'rows', …)` (`src/lib/api.ts`, ya existente desde la
    feature 37). Cero `fetch` en el componente, ningún helper nuevo.
  - Máquina de estados explícita `'loading' | 'ok' | 'error'`
    (`docs/conventions.md` §5), igual patrón que `Pricing.tsx` (feature 35):
    `useEffect` con guarda `vigente` para no hacer `setState` tras desmontar.
  - **Fallback heredado de la 35, sin cambios**: si `rows` viene vacío, la
    petición falla o no responde, `estado !== 'ok' || complementos.length === 0`
    devuelve `null` — la sección entera no se renderiza. El array `addons`
    hard-codeado (antes líneas 20-56) se eliminó, no quedó como valor por
    defecto ni como respaldo.
  - **Icono y color de acento por posición**: tabla fija `ESTILO_POR_POSICION`
    (4 entradas — `BoltIcon`/rojo, `Inventory2Icon`/violeta,
    `PsychologyIcon`/azul, `AccountTreeIcon`/verde, los mismos cuatro pares
    del array eliminado) indexada por `i % ESTILO_POR_POSICION.length` sobre
    el índice de la fila ya ordenada por `orden` (el orden lo garantiza el
    backend). Nunca se mapea por `nombre`. Añadí `data-testid` al icono
    (`addon-<id>-icon-<slug>`) exclusivamente para poder testear el mapeo
    posicional desde la UI.
  - **`precio: null` no es `precio: 0`**: si `c.precio === null` se pintan los
    `paquetes` anidados (siempre presentes, se recorren sin guardas); si no,
    se pinta el precio + `unidad` (si la trae). Nunca `$null` ni `$0`.
  - **Decimales preservados**: formateador local `formatImporte()` — dos
    decimales solo cuando el importe no es entero (`0.2 → "$0.20"`, `190 →
    "$190"`). Ver "Decisión clave" abajo.
  - `key={c.id}` (string) en cada tarjeta y en cada paquete (`key={p.id}`), no
    `nombre`.
  - Rejilla clonada del patrón de `Pricing.tsx`: `columnas = Math.min(length,
    4)`, `gridTemplateColumns` clamado por breakpoint, `maxWidth` centrado
    cuando hay menos de 4 complementos, para que 1..N complementos no dejen
    huecos raros ni tarjetas desproporcionadas (código revisado, no medido en
    píxeles — ver "Verificación visual" abajo).
- `src/components/sections/__tests__/Addons.test.tsx` — nuevo, 12 tests
  (molde `Pricing.test.tsx`), con `vi.spyOn(globalThis, 'fetch')` y `Response`
  reales, nunca mockeando `src/lib/api.ts`:
  - Petición pública, una sola vez, sin cookie, y nunca a `/api/admin/`.
  - Pintado de nombre/descripción de cada complemento, en el orden del
    backend.
  - Decimales preservados: `$0.20` + `/ crédito` para `precio: 0.2`, `$60` y
    `$190` para importes enteros (sin `.00` de sobra).
  - Complemento con `precio: null` que pinta sus paquetes (nombre,
    descripción, precio formateado) y nunca `$null`/`$0` en el texto de la
    tarjeta.
  - Complemento con `precio: null` y `paquetes: []` (caso límite): no pinta
    ninguna cifra.
  - Icono/color por posición: cicla al quinto complemento (mismo slug que el
    primero) y **no** sigue al `nombre` cuando se intercambian los nombres de
    dos posiciones.
  - Fallback: `rows` vacío, `500`, fallo de red (con verificación explícita de
    que ningún rastro del array hard-codeado — nombres, `$0.20`, `/ crédito`,
    `$60`, `$190` — reaparece) y `200` sin `rows`. Cada caso comprueba también,
    con un `MutationObserver`, que la sección nunca llega a añadirse al DOM
    (0 eventos `add`/`remove`).
  - Carga sin parpadeo: mientras la promesa está pendiente no hay nada en el
    DOM; al resolver, una sola alta (`['add']`) y las 4 tarjetas en el mismo
    commit.
- `docs/api-contract.md` §4 quinquies — añadida la sección "Qué hace la
  landing con estos datos (feature 39, 2026-08-09)", mismo formato que la nota
  de la 35 en §4 quater (precios) y la 36 en §4 ter (imágenes): mapeo por
  posición, `precio: null`, decimales, orden, fallback heredado.
- `feature_list.json` — feature 39 marcada `in_progress` al tomarla (no la
  marco `done`: corresponde al `reviewer`).
- `progress/current.md` — bitácora completa de la sesión, incluida la
  verificación manual del test de regresión y la observación fuera de scope.

## Decisiones

### 1. NO toqué `formatMoneda` en `src/lib/api.ts`

El acceptance advierte que `formatMoneda(0.2)` devuelve `"$0.2"` (regresión
visible frente al `"$0.20"` que muestra hoy la landing) y permite tocar el
helper compartido "si los tests de Pricing y PricesList siguen verdes". Antes
de decidir, revisé **todos** los consumidores de `formatMoneda`:

- `Pricing.tsx` (landing) — no lo usa para el precio principal (comentario en
  el propio código: el `$` va como `sup` por diseño), solo para "Ahorras
  $X/año", siempre un entero (`Math.round()` del backend).
- `PricesList.tsx` / `PlanEditDialog.tsx` (panel de precios) — mismo caso,
  importes derivados siempre enteros.
- **`ComplementosList.tsx`** (panel de add-ons, feature 37, ya `done`) — SÍ lo
  usa directamente para pintar `precio` de complementos y de paquetes, y
  `src/admin/__tests__/ComplementosList.test.tsx:299` y `:566` fijan
  literalmente `celda('addon-1-precio')` como `'$0.2 / crédito'` — el mismo
  bug que se me pide corregir en la landing, pero congelado en un test de una
  feature ya aprobada.

Cambiar `formatMoneda` globalmente habría puesto en rojo esos dos tests de
`ComplementosList.test.tsx`, fuera de los archivos listados en el `acceptance`
de la 39 y fuera del `files` de la feature. Tocar o tests de otra feature
`done` no es una decisión que me corresponda tomar sin que lo pida un humano
(`AGENTS.md` §3, `docs/conventions.md`). En su lugar, `Addons.tsx` define un
formateador **local y privado** (`formatImporte`), que preserva dos decimales
solo cuando el importe no es entero. Documentado como "Observaciones fuera de
scope" en `progress/current.md`: el mismo defecto sigue vivo en el panel.

### 2. Icono/color por posición, con tabla y `%` para ciclar

El objeto `AdminComplemento` no trae ningún campo de presentación. Reutilicé
los mismos cuatro pares icono/color que llevaba el array eliminado (mismo
lenguaje visual que ya conocía el usuario), en un array `ESTILO_POR_POSICION`
indexado por `i % length` sobre el `map()` del array ya ordenado por el
backend (`orden ASC`). Verificado con un test que fuerza un 5º complemento
(cicla de vuelta al primer icono/color) y otro que intercambia los `nombre`
de las dos primeras filas (el icono se queda en su posición, no sigue al
nombre).

### 3. `key` desde `id`, nunca `nombre`

`key={c.id}` en cada tarjeta y `key={p.id}` en cada paquete. El `id` es
`string` (`BIGSERIAL` sin castear, igual que el resto del contrato).

### 4. Sin esqueleto de carga, mismo razonamiento que `Pricing.tsx`/`Hero.tsx`

Un placeholder con la altura de la sección tendría que desaparecer en los
casos de "sin datos" o "error", que es justo el parpadeo prohibido por el
acceptance. La sección solo tiene una transición visible (nada → sección
definitiva) y se monta ya con su altura final.

## Verificación

```
npm test           → 22 archivos / 246 tests (234 base + 12 nuevos), exit 0
npm run typecheck  → exit 0
npm run build      → exit 0 (aviso esperado de chunk >500 kB, sin cambio relevante de tamaño)
```

Cada comando ejecutado por separado (una sola suite a la vez, sin flake, tal
como pide `progress/current.md`/histórico de esta rama). Baseline previo a mis
cambios: 21 archivos / 234 tests, también en verde.

**Test de regresión verificado manualmente**: reintroduje temporalmente un
`return` con nombres, precios y unidades hard-codeados dentro de la rama de
fallback de `Addons.tsx` (sin llamar a la API) y confirmé que el test "con
fallo de red la sección no se renderiza y NO reaparece el array hard-codeado"
se pone en rojo (`AssertionError: expected <section id="addons">…​ to be
null`). Revertí el archivo a la versión correcta (diff contra un backup en
el scratchpad: idéntico) y reconfirmé que la suite completa de
`Addons.test.tsx` vuelve a estar en verde (12/12).

**Verificación visual (`docs/verification.md` §6), limitada por el entorno**:
`npm run dev` arranca sin errores de consola, pero el backend de `:3002` no
está levantado en esta sesión (y, aunque lo estuviera, `GET /api/complementos`
responde hoy `{"rows":[]}` en el entorno real — tablas vacías, sin seed, según
`docs/api-contract.md` §4 quinquies), así que no hay forma de ver la rejilla
pintada con datos reales en esta sesión. Revisé el `sx` de la rejilla línea
por línea contra el de `Pricing.tsx` (mismo patrón, ya verificado a ojo en la
feature 35) para razonar que se comporta igual con 1..N complementos; queda
pendiente que un humano lo confirme a 360/1440 px cuando haya add-ons
cargados desde `/admin/complementos`.

## Observaciones fuera de scope (no tocadas)

- `formatMoneda(0.2)` sigue devolviendo `"$0.2"` en el panel
  (`ComplementosList.tsx`, `PricesList.tsx`, `PlanEditDialog.tsx`): mismo
  defecto que motivó esta feature en la landing, corregirlo ahí requeriría
  tocar tests de las features 34/37 (`done`) — fuera del `acceptance` de la
  39.
- La verificación visual a 360/1440 px con datos reales no se pudo completar
  en esta sesión por falta de backend levantado; documentado arriba.
