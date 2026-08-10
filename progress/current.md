# Sesión actual

> Plantilla viva. Se rellena **mientras** trabajas, no al final.
> Al cerrar sesión: mueve el bloque completo al final de `progress/history.md` y
> deja este archivo con la plantilla vacía de abajo.

---

## Estado

**Feature en curso:** —
**Estado:** sin sesión abierta
**Inicio:** —
**Rama:** —

## Plan

- (3-5 bullets al tomar la feature)

## Bitácora

- (se rellena mientras trabajas, no al final)

## Verificación

| Comando | Resultado |
|---------|-----------|
| `npm test` | — |
| `npm run typecheck` | — |
| `npm run build` | — |

## Bloqueos

- Ninguno.

## Observaciones fuera de scope (NO tocadas, C10)

- (deuda vista al lado que NO se arregla en esta feature)

## Variables de entorno necesarias

- Ninguna.

## Pendiente para la siguiente sesión

> **Feature 39 cerrada `done` el 2026-08-09** (`APPROVED` en
> `progress/review_39.md`, sin ninguna ronda de `CHANGES_REQUESTED`).
> **`feature_list.json` no tiene ninguna feature `pending`, `in_progress` ni
> `blocked`**: las 23 features del backlog abierto (17-39) están `done`. No
> hay sesión abierta ni trabajo en vuelo — un líder que retome este repo debe
> confirmarlo con `AGENTS.md` §4 antes de asumir que hay algo que tomar.

### El cableado de add-ons queda completo de punta a punta

- **Panel (feature 37 complementos, feature 38 paquetes) y landing
  (feature 39) ya consumen `/api/complementos` de verdad.**
  `src/components/sections/Addons.tsx` ya no tiene el array hard-codeado: usa
  `listComplementos()` + `normalizeApi(…, 'rows')`, con el mismo fallback
  heredado de la feature 35 (sin `rows`, con error o sin respuesta, la
  sección no se renderiza) y una tabla fija de icono/color mapeada por
  posición, no por dato del backend.
- **`GET /api/complementos` responde hoy `{"rows":[]}`**: las tablas
  `complementos`/`paquetes` están creadas pero vacías y sin seed. Con el
  fallback heredado de la 35, la sección de add-ons de la landing **no se
  pinta** hasta que se carguen complementos desde `/admin/complementos`.
  **Lo mismo sigue pasando con precios** (`GET /api/precios` → `{"rows":[]}`).
  **Hay que cargar datos por el panel antes de desplegar.**

### Verificación visual pendiente y ahora significativa

- La rejilla `repeat(4, 1fr)` (clamada a `Math.min(columnas, 4)`) de
  `Addons.tsx` con **1, 2, 3 y 5+ complementos**, a 360 px y 1440 px.
  Ningún test la mide en píxeles — lo dice el propio acceptance de la
  feature 39 — y el implementer no pudo verla con datos reales porque el
  backend no está levantado en este entorno (y en el real las tablas siguen
  vacías). El reviewer lo dejó anotado en `progress/review_39.md`. Queda
  para que un humano la confirme a ojo cuando haya add-ons cargados.

### Estado de ramas

- **La 37 y la 38 están commiteadas** en `feat/37-admin-complementos`
  (`c6a23b6`, `9cf8991`, `991a1c4`).
- **La 39 está SIN COMMITEAR** en `feat/39-addons-api`, que cuelga de
  `feat/37-admin-complementos` (rama apilada: hay que integrar primero la
  rama del CRUD de add-ons antes que esta).
- **Nada está empujado a `origin`.**

### Deuda viva heredada, ninguna es una feature tomada — todo requiere que lo pida un humano

- **Antes de desplegar sigue haciendo falta cargar planes de precios por el
  panel**: `GET /api/precios` responde `{"rows":[]}` y el acceptance de la 35
  manda no renderizar la sección de precios en ese caso (enlaces `#pricing`
  de `Navbar`/`Footer` sin destino mientras tanto).
- **`src/components/sections/Hero.tsx:236-247`** — el marco vacío del estado
  de carga se vuelve permanente si el backend de Render está dormido (hallazgo
  de la review de la 36, feature propia pendiente de decisión del humano).
- **`GET /api/images/:id/raw` sin `Cache-Control` ni `ETag`** (~556 KB por
  carga de landing): recomendación para el equipo de BACKEND, el front no
  inventa caché.
- **El error del listado de usuarios sigue sin `role="alert"`**
  (`UsersList.tsx:118`); las features 33, 34, 37 y 38 lo arreglaron en sus
  propios archivos pero `UsersList.tsx`/`LeadsList.tsx` no se tocaron.
- **`getAdminPaquete` y `getAdminComplemento` quedan sin consumidor en la
  UI**, mismo patrón heredado que `getAdminPlan` (feature 34) y
  `getAdminUser` (feature 32): los cuatro `GET .../:id` privados existen y
  están testeados directamente, pero ninguna pantalla navega a un detalle
  propio (todo se edita desde el listado con los datos ya cargados).
- **`formatMoneda(0.2)` sigue devolviendo `"$0.2"` en el panel**
  (`ComplementosList.tsx`, `PricesList.tsx`, `PlanEditDialog.tsx`): el mismo
  defecto que motivó la feature 39 en la landing sigue vivo en el panel,
  porque corregirlo ahí tocaría tests de las features 34/37 (`done`) —
  requiere que lo pida un humano.
- **El flake de la suite bajo carga de CPU sigue siendo deuda de
  infraestructura**: no correr dos suites a la vez, y repetir aislado antes de
  reportar un rojo. Tocar la configuración de tests requiere que lo pida un
  humano.
- **Drift documental**: `docs/verification.md` §1-§2 y `docs/architecture.md`
  §5/§8/§9 siguen sin reflejar el estado real (contadores de tests
  desactualizados, endpoints de usuarios/imágenes/precios/complementos/paquetes
  no listados, "en maquetación con datos mock" ya no es cierto). No se ha
  tocado `docs/` fuera de `api-contract.md` en las últimas features por
  indicación expresa.
- Resto de pendientes menores (copy obsoleto de `AdminHome.tsx`,
  `tsconfig.tsbuildinfo` trackeado pese a `.gitignore`, `ImagePatchInput` sin
  derivar de `AdminImage`, `loading` como booleano en las pantallas del admin,
  enlaces `#pricing` sin destino, `key={v}` en viñetas de `Pricing.tsx`,
  ausencia de `ErrorBoundary` en `main.tsx`, `<img>` sin `onError`, PNGs de
  `public/` sin referenciar) — detalle completo en las entradas de las
  features 27-39 de `progress/history.md`.

---

## Último baseline verde conocido

`2026-08-09` — tras cerrar la feature 39 (`APPROVED` en
`progress/review_39.md`): `npm test` **22 archivos / 246 tests** · exit 0 ·
`npm run typecheck` exit 0 · `npm run build` exit 0 (aviso esperado de chunk
>500 kB). Medido por el implementer y reejecutado de forma independiente por
el reviewer (que además aisló `Pricing.test.tsx` y `PricesList.test.tsx` para
confirmar que no se rompió nada), sin flake, una sola suite a la vez. **No
hay ninguna feature `pending` en el backlog abierto (17-39): todas `done`.**
