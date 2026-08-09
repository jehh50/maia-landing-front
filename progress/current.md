# Sesión actual

> Plantilla viva. Se rellena **mientras** trabajas, no al final.
> Al cerrar sesión: mueve el bloque completo al final de `progress/history.md` y
> deja este archivo con la plantilla vacía de abajo.

---

## Bitácora de restauración de la feature 38 (git, no producto) — 2026-08-09

Tarea puramente de git: restaurar la feature 38 (aprobada por el reviewer en
`tmp/addons-snapshot`, 1bc3dc5) sobre `feat/37-admin-complementos`, que solo
tenía commiteada la feature 37. Restaurado con `git checkout tmp/addons-snapshot
-- <rutas>` (sin reescribir código a mano) y commiteado.

- **Hashes finales de la rama `feat/37-admin-complementos`:**
  - `c6a23b6` — `feat(admin): añade el panel de complementos del CRUD de add-ons` (feature 37)
  - `9cf8991` — `docs(api): recoge el handoff del backend con el CRUD de add-ons`
  - `991a1c4` — `feat(admin): hace editables los paquetes de cada complemento` (feature 38, este commit)
- **Verificación previa al commit:** `npm test` → **21 archivos / 234 tests**,
  exit 0 · `npm run typecheck` exit 0 · `npm run build` exit 0 (aviso esperado
  de chunk >500 kB). Cada comando ejecutado por separado, sin flake.
- **Comprobación final** `git diff tmp/addons-snapshot feat/37-admin-complementos`
  → **vacío**. La rama es byte a byte el estado 37+38 verificado y aprobado
  por el reviewer.
- `tsconfig.tsbuildinfo` quedó fuera del commit (no trackeable según §8),
  modificado en el working tree.
- Rama temporal `tmp/addons-snapshot` borrada tras confirmar el diff vacío.

Este bloque sustituye al informe de bloqueo que había antes en este archivo
(quedó obsoleto en cuanto se restauró la feature 38 y se commiteó).

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

> **Feature 38 cerrada `done` el 2026-08-09** (`APPROVED` en
> `progress/review_38.md` tras una ronda de `CHANGES_REQUESTED` ya resuelta).
> **`feature_list.json` no tiene ninguna feature `pending`, `in_progress` ni
> `blocked`**: las 22 features del backlog abierto (17-38) están `done`. No
> hay sesión abierta ni trabajo en vuelo — un líder que retome este repo debe
> confirmarlo con `AGENTS.md` §4 antes de asumir que hay algo que tomar.

### El CRUD de add-ons del panel está completo, pero la landing sigue sin consumirlo

- **`src/components/sections/Addons.tsx` sigue con el array hardcodeado**
  (líneas 20-56). El panel (`/admin/complementos`, features 37 y 38) ya
  permite dar de alta, editar y borrar complementos y sus paquetes contra
  `/api/complementos` + `/api/admin/complementos` + `/api/admin/paquetes`,
  pero **cablear la landing a `GET /api/complementos`** —el equivalente
  exacto de lo que la feature 35 hizo con `Pricing.tsx` y precios— **no está
  en el backlog y requiere que lo pida un humano**. No es deuda de la 37/38:
  fue una decisión de scope explícita de ambas.
- **`GET /api/complementos` responde hoy `{"rows":[]}`**: las tablas
  `complementos`/`paquetes` están creadas pero vacías y sin seed. Hay que
  cargar los add-ons **desde el panel nuevo** antes de que la landing pueda
  mostrar nada, incluso si se cablea `Addons.tsx`. Mismo caso exacto que
  precios (`GET /api/precios` → `{"rows":[]}`), que sigue igual de vacío.

### Nada está commiteado

- La feature 37 y la feature 38 conviven sin commitear en la rama
  `feat/37-admin-complementos` (working tree con ambas mezcladas: `src/lib/api.ts`,
  `src/admin/AdminLayout.tsx`, `src/AppRoutes.tsx`, `src/admin/addons/`,
  `docs/api-contract.md`, tests, etc.). Ningún agente de esta cadena hizo
  `git commit` — queda a la espera de que un humano decida cómo commitear
  (¿un commit por feature, replicando `docs/conventions.md` §8, o uno solo
  que cierre ambas?) y si corresponde abrir PR.

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
  features 27-38 de `progress/history.md`.

---

## Último baseline verde conocido

`2026-08-09` — tras cerrar la feature 38 (`APPROVED` en
`progress/review_38.md`): `npm test` **21 archivos / 234 tests** · exit 0 ·
`npm run typecheck` exit 0 · `npm run build` exit 0 (aviso esperado de chunk
>500 kB). Medido por el implementer y reejecutado de forma independiente por
el reviewer en dos pasadas (la de `CHANGES_REQUESTED` y la de re-revisión),
sin flake, una sola suite a la vez. **No hay ninguna feature `pending` en el
backlog abierto (17-38): todas `done`.**
