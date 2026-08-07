# Review — feature 17: Ruta 404

**Veredicto:** APPROVED

Revisor: agente `reviewer` · Fecha: 2026-07-27 · Rama: `main` (sin commits)

---

## Verificación ejecutada

Ejecutada por el revisor, no copiada del informe del implementer
(`docs/verification.md` §1, desde `/var/www/html/maia-landing-front`):

| Comando | Resultado |
|---------|-----------|
| `npm test` | **8 archivos / 41 tests passed**, exit 0 (baseline 7/34 → +1 archivo, +7 tests) |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 — `✓ built in 22.09s`, `index-CjPZTqR_.js 2,524.92 kB` con el aviso `Some chunks are larger than 500 kB` (**esperado**, no es fallo) |

Ruido no bloqueante en `stderr`: `React Router Future Flag Warning` (v7_startTransition /
v7_relativeSplatPath) y `Not implemented: window.scrollTo`, ambos ya presentes en el
baseline (`BlogArticle`, `BlogIndex`, `LeadsList`).

---

## Checkpoints

- C1  [x] `npm test` exit 0, 8 archivos / 41 tests, ningún test del baseline roto.
- C2  [x] Los 4 puntos del `acceptance` tienen verificación (ver §"Cobertura del acceptance").
- C3  [x] `npm run typecheck` exit 0 y `npm run build` exit 0.
- C4  [x] Convenciones respetadas: `PascalCase.tsx` con `export default function`
      (`src/pages/NotFound.tsx:9`, `src/AppRoutes.tsx:20`), test en `__tests__/` hermano
      (`src/pages/__tests__/NotFound.test.tsx`), cero `any`, cero variables sin usar
      (`noUnusedLocals` habría roto el build), cero hex hardcodeados — solo tokens del
      tema (`primary.main:41`, `surface.soft:29`, `text.secondary:52`) y escala de
      `spacing`/breakpoints `xs/md`. Copy 100 % en español.
- C5  [x] Sin `fetch` fuera de `src/lib/api.ts` (`NotFound` no habla con el backend; el
      `ContactModal` que monta usa `postLead`). Sin state manager global nuevo, sin
      librería de data fetching, sin tipos duplicados (la feature no introduce tipos).
- C6  [x] No se consume ningún endpoint nuevo. `docs/api-contract.md` no requería cambios.
- C7  [x] `feature_list.json` mantiene la feature 17 en `in_progress` (correcto: el
      implementer no debe marcar `done`); `progress/current.md` documenta plan, bitácora,
      desvío, verificación, bloqueos (ninguno) y pendientes; informe en `progress/impl_17.md`.
- C8  [x] Ningún `.env*` leído ni escrito; `progress/current.md:74-78` declara "ninguna"
      variable de entorno nueva. Ningún valor de secreto en los archivos de progreso.
- C9  [x] Sin `console.log`/`console.debug`, sin `TODO` sin referencia, sin código comentado
      nuevo, sin `.orig`/`.bak`. `git status` limpio de residuos del implementer
      (los untracked `.agents/`, `.claude/skills/`, `skills-lock.json`, `docs/*`,
      `progress/*`, `feature_list.json` son el arnés, no la feature).
- C10 [x] Scope de una sola feature: `src/main.tsx` (modificado), `src/AppRoutes.tsx`,
      `src/pages/NotFound.tsx`, `src/pages/__tests__/NotFound.test.tsx` (nuevos).
      Sin tocar deuda ajena: `src/admin/AdminLayout.tsx` (feature 18),
      `src/hooks/useReveal.ts` (feature 21), ningún `React.lazy`/`manualChunks`
      (feature 22), `src/theme/theme.ts` y `src/styles/globals.css` intactos (feature 23).
- C11 [x] `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` y `.gitignore`
      **sin modificar** (verificado con `git status`/`git diff`).

---

## Cobertura del acceptance (C2 en detalle)

| # | Acceptance | Verificación |
|---|-----------|--------------|
| 1 | `<Route path="*">` que renderiza `NotFound` | `src/AppRoutes.tsx:43` (última ruta) + test `NotFound.test.tsx:44-50`. Desvío de ubicación evaluado abajo. |
| 2 | Usa `Navbar` y `Footer` y ofrece enlace de vuelta a `/` | `NotFound.test.tsx:52-70`: `getByRole('link', {name:/volver al inicio/i})` con `href="/"`, `getByRole('banner')` y `getByRole('contentinfo')`. |
| 3 | `MemoryRouter` con `initialEntries=['/ruta-que-no-existe']` muestra 404 y no pantalla vacía | `NotFound.test.tsx:44-50`, incluye `container.textContent?.trim().length > 0`. |
| 4 | Las rutas existentes siguen resolviendo (ninguna cae en el comodín) | 4 tests (`NotFound.test.tsx:73-101`) para `/`, `/blog`, `/privacidad`, `/admin/login`, cada uno con la aserción negativa `queryByRole(...página no encontrada...)` → `not.toBeInTheDocument()`. |

Observación no bloqueante sobre el punto 4: se cubre un representante por familia de ruta,
pero no se asertan directamente `/terminos`, `/blog/:slug` ni el árbol `/admin/*` anidado.
Es aceptable — el ranking de react-router v6 pone el splat al final y `/blog` y `/privacidad`
ejercitan los dos patrones (estático y con `doc`); `/admin/*` exigiría simular sesión y
metería ruido de `AdminGuard`. No lo trato como fallo de C2.

---

## Puntos evaluados de forma explícita

### 1. `<Route path="*">` en `src/AppRoutes.tsx` y no en `src/main.tsx` — **desvío justificado, aceptado**

El `acceptance` 1 pide literalmente la ruta comodín "en `src/main.tsx`". El implementer
extrajo el árbol `<Routes>` a `src/AppRoutes.tsx` y dejó `main.tsx` como bootstrap puro
(`src/main.tsx:9-18`).

Razones por las que lo apruebo:

- **El motivo técnico es real, no una excusa.** `src/main.tsx:9` ejecuta
  `ReactDOM.createRoot(document.getElementById('root')!)` en el momento del import: en jsdom
  no hay `#root`, así que `import '../main'` desde un test revienta con un TypeError antes de
  llegar a ninguna aserción. El archivo es literalmente no montable.
- **La alternativa era peor.** Mantener las rutas en `main.tsx` obligaba a redeclarar la tabla
  de rutas dentro del test. Eso crea exactamente la patología que el acceptance 3 y 4 quieren
  evitar: el test verificaría una copia y podría estar verde con producción sin comodín.
- **Se cumple el espíritu: una sola fuente de verdad.** El `git diff` de `main.tsx` muestra que
  las 12 rutas se movieron **sin alterar una línea**; el único cambio de comportamiento es el
  `<Route path="*">` añadido al final (`src/AppRoutes.tsx:43`). No hay dos tablas de rutas en
  el repo, y el test monta el `AppRoutes` real (`NotFound.test.tsx:6,26`), o sea la misma
  ruta comodín que se ejecuta en producción.
- **No rompe ninguna frontera de C5.** Lo que `docs/architecture.md` protege como frontera es
  otra cosa: `fetch` solo en `src/lib/api.ts`, sin state manager global, sin librería de
  fetching, tipos derivados. "Las rutas se declaran en `main.tsx`" es una **descripción del
  estado del código**, no una restricción de diseño. `main.tsx` sigue siendo el único lugar
  donde se instancia `BrowserRouter` y el bootstrap; solo delega el contenido del router.
- Efecto colateral favorable: la feature 22 (code splitting por ruta) encuentra el árbol ya
  aislado.

**Consecuencia documental de aprobarlo (obligatoria):** `docs/architecture.md` **queda
desactualizado y hay que corregirlo** en un cambio de docs aparte, no dentro de esta feature:

- §3, línea 86 — "Todas las rutas se declaran en `src/main.tsx:25-46`" → ahora se declaran en
  `src/AppRoutes.tsx:22-44`; `main.tsx` solo monta `<BrowserRouter><AppRoutes /></BrowserRouter>`.
- §3, línea 105 — "No existe ruta `*` (404). Cualquier path desconocido … renderiza una
  pantalla vacía" → ya no es cierto.
- §3, tabla de rutas (líneas 88-100) — falta la fila `*` → `NotFound` (público).
- §2, mapa de directorios, línea 39 y línea 63 — falta `src/AppRoutes.tsx` y falta
  `pages/NotFound.tsx`.
- §10, línea 268 — "**Sin ruta 404**: un path inválido renderiza en blanco" → deuda resuelta,
  quitar de la lista.
- §1, línea 24 — "`BrowserRouter` declarado en `src/main.tsx`" sigue siendo correcto, no tocar.
- §8, línea 209 y `docs/verification.md:15,46` — el baseline pasa de 7 archivos / 34 tests a
  8 / 41.
- Nota menor: `feature_list.json` lista `files: ["src/main.tsx"]` para la feature 22; ese
  puntero ahora apunta a `src/AppRoutes.tsx`.

### 2. `ContactModal` propio dentro de `NotFound` — **correcto, no es duplicación problemática**

`Navbar` exige `onOpenContact: () => void` y su CTA "Agenda un demo" es un `button` real, así
que un no-op dejaría un control muerto en la página. `NotFound` replica el patrón de `App.tsx`
en su versión mínima: `useState` local (`src/pages/NotFound.tsx:10`) y `<ContactModal>` montado
una sola vez al final del árbol (`src/pages/NotFound.tsx:72`), igual que `src/App.tsx:52`.

Lo que **no** se duplica es lo que importa: toda la lógica de formulario, validación
(`EMAIL_RE`/`PHONE_RE`) y el `POST /api/contact` siguen viviendo dentro de `ContactModal` y
`src/lib/api.ts`. `NotFound` solo aporta un booleano de apertura. Frente a `App.tsx` la única
simplificación es que no hay estado `contactTipo`: se fija `tipo="demo"`, que es exactamente
el valor con el que `App.tsx:35` invoca el modal desde la `Navbar`. Coherente, sin state
manager nuevo, sin elevar estado y sin llamada a la API en el montaje.

### 3. Stubs de `IntersectionObserver` y `vanta/dist/vanta.net.min` — **acotados, no filtran**

- `vi.mock('vanta/dist/vanta.net.min', …)` (`NotFound.test.tsx:17-19`) es hoisted **por
  archivo**: el registro de módulos mockeados de Vitest es por módulo de test, no global.
- `vi.stubGlobal('IntersectionObserver', IOStub)` (`NotFound.test.tsx:32`) se revierte con
  `vi.unstubAllGlobals()` en el `afterEach` (`NotFound.test.tsx:39`), junto a
  `vi.restoreAllMocks()` como manda `docs/verification.md` §4.
- Además `vite.config.ts:19-25` no fija `pool` ni `isolate`, así que rige el aislamiento por
  defecto de Vitest 2 (un entorno por archivo de test): ni el mock de módulo ni el global
  pueden alcanzar otro archivo aunque el `afterEach` no existiera.
- Comprobación empírica: en mi ejecución completa los 7 archivos del baseline siguen en verde
  (34 tests) junto a los 7 nuevos. Ningún test previo cambió de resultado.
- Ninguno de los dos stubs sustituye código propio del repo (`Hero`, `useReveal` y
  `src/lib/api.ts` entran de verdad en el test), así que no se viola la regla de
  "no se mockea `src/lib/api.ts`".

---

## Detalle de los fallos

Ninguno bloqueante. No hay ningún `[ ]`.

## Observaciones no bloqueantes (no cambian el veredicto)

1. `tsconfig.tsbuildinfo` aparece como modificado en `git status`. Está en `.gitignore:6`
   pero fue commiteado en su día, así que sigue rastreado; lo regenera cualquier `tsc -b`
   (yo mismo lo volví a tocar al ejecutar la verificación). No es un cambio del implementer y
   no entra en la lista de C11, pero **no debe incluirse en el commit de la feature 17**
   (`docs/conventions.md` §8). Limpiarlo del índice es una tarea de `chore/`, no de esta feature.
2. `src/components/Navbar.tsx:7-10` navega con anclas (`#solution`, `#features`, …) que no
   existen en la página 404: desde `/ruta-inexistente` esos enlaces no llevan a ninguna parte,
   y el logo (`Navbar.tsx:49`, `href="#"`) tampoco vuelve a la home. El `acceptance` solo pide
   `Navbar` + `Footer` + enlace a `/`, y eso está cumplido con el botón "Volver al inicio",
   así que no lo bloqueo; queda como mejora de UX para un backlog futuro (haría falta que
   `Navbar` aceptara un prefijo `/` en las anclas cuando no está en la landing).
3. `src/pages/NotFound.tsx:13` fija `document.title` y no lo restaura al desmontar. Es
   exactamente el mismo patrón de `src/pages/LegalPage.tsx:31`, así que es consistencia con el
   repo, no una regresión; el efecto (título obsoleto tras navegar a `/` por client-side) ya
   existía antes de esta feature.

## Pendiente para un humano

**Verificación manual a 360 px y 1440 px (`docs/verification.md` §6): no realizada.** La
sesión del implementer y la mía son headless, sin navegador. **No la cuento como fallo de
C1-C3** (los tres son comandos y están en 0), pero sí la dejo anotada: la 404 es una página
visual nueva y `docs/verification.md` §6 la pide. El riesgo es bajo — reutiliza `Container`
+ `maxWidth: 640` + `mx:'auto'` y breakpoints `xs/md` ya en producción
(`src/pages/NotFound.tsx:27,33,37,48,52`) — pero conviene que un humano abra
`npm run dev` → `http://localhost:5174/ruta-que-no-existe` y confirme a ambos anchos que el
bloque central queda centrado, que el `Footer` no se solapa con el CTA y que la `Navbar` fija
no tapa el "404" (el `pt: { xs: 14, md: 18 }` está para eso).

## Siguiente paso para el leader

1. Corregir `docs/architecture.md` (§1 no, §2 líneas 39/63, §3 líneas 86/88-100/105, §8
   línea 209, §10 línea 268) y el baseline de `docs/verification.md` (líneas 15 y 46) a
   8 archivos / 41 tests. Es trabajo de documentación, fuera del código de la app.
2. Marcar la feature 17 como `done` en `feature_list.json`.
3. Mover el bloque de `progress/current.md` al final de `progress/history.md`.
4. Encargar a un humano la comprobación visual a 360/1440 px.
