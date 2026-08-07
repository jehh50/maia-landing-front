# Informe de implementación — Feature 22: Code splitting por ruta

**Estado:** implementada y verificada · **pendiente de review** (no marcada `done`).
**Rama:** `main`, sin commits (el humano no los pidió).

---

## 1. Baseline comprobado antes de tocar nada

```
npm test          → 11 archivos / 61 tests, exit 0
npm run typecheck → exit 0
npm run build     → exit 0
```

Salida del build de baseline:

```
dist/index.html                          0.95 kB │ gzip:   0.53 kB
dist/assets/index-DnjzzLz1.css          35.12 kB │ gzip:   6.53 kB
dist/assets/vanta.net.min-Ce_xm0LW.js   13.56 kB │ gzip:   4.69 kB
dist/assets/index-C6hpBOR8.js        2,525.23 kB │ gzip: 779.07 kB   ← chunk de entrada
```

---

## 2. Qué cambié

| Archivo | Cambio |
|---------|--------|
| `src/AppRoutes.tsx` | 9 rutas pasan a `React.lazy`; dos niveles de `<Suspense>` |
| `src/components/RouteFallback.tsx` | **Nuevo**: fallback compartido con tokens del tema |
| `src/__tests__/AppRoutes.test.tsx` | **Nuevo**: 7 tests del routing perezoso |
| `src/pages/__tests__/NotFound.test.tsx` | Solo el *wrapper* `renderAt` (ver §5) |
| `docs/architecture.md` §3 y §10 | Documenta el split y qué queda en la entrada |
| `docs/context.md` §4 | La deuda "bundle monolítico" ya no dice ~2,5 MB |
| `feature_list.json` | 22 → `in_progress` |
| `progress/current.md` | Bitácora, tamaños y verificación |

**Perezosas** (`React.lazy` con ruta literal en el `import()`, regla
`bundle-analyzable-paths` de la skill): `BlogIndex`, `BlogArticle`, `Login`,
`AdminGuard`, `AdminLayout`, `AdminHome`, `LeadsList`, `ArticlesList`,
`ArticleEdit`.

**Estáticas a propósito**: `App` (+ todas sus secciones), `LegalPage`,
`NotFound`, `legalDocs`. `App` es la ruta crítica de captación de leads: hacerla
perezosa añadiría un round-trip justo donde más duele y empeoraría lo que la
feature quiere mejorar.

**Fuera de scope, no tocado:** `package.json`, `vite.config.ts` (sin
`manualChunks`: no hizo falta), `tsconfig.json`, `vercel.json`, `.gitignore`.
Ningún `.env*` leído ni escrito.

---

## 3. Punto 2 del acceptance — antes / después (números reales del build)

| Artefacto de entrada | Antes | Después | Δ |
|----------------------|-------|---------|---|
| **JS de entrada** | 2 525,23 kB (gzip 779,07 kB) | **1 584,84 kB** (gzip 450,43 kB) | **−940,39 kB (−37,2 %)** · gzip −328,64 kB (−42,2 %) |
| **CSS de entrada** | 35,12 kB (gzip 6,53 kB) | **1,27 kB** (gzip 0,63 kB) | −33,85 kB (−96,4 %) |
| **Total de entrada** | 2 560,35 kB (gzip 785,60 kB) | **1 586,11 kB** (gzip 451,06 kB) | −974,24 kB (−38,1 %) |

Salida completa del build después:

```
dist/index.html                            0.95 kB │ gzip:   0.53 kB
dist/assets/index-DLhTnPmU.css             1.27 kB │ gzip:   0.63 kB
dist/assets/ArticleEdit-PCqDfw_U.css      33.84 kB │ gzip:   6.03 kB
dist/assets/AdminGuard-BsjxcbRG.js         0.65 kB │ gzip:   0.45 kB
dist/assets/AdminHome-kyu4OLgj.js          1.15 kB │ gzip:   0.64 kB
dist/assets/Login-DNY_hs_0.js              2.28 kB │ gzip:   1.23 kB
dist/assets/MarkdownRenderer-CHmeKVS5.js   3.23 kB │ gzip:   1.53 kB
dist/assets/BlogIndex-bZBT8Ski.js          3.98 kB │ gzip:   1.85 kB
dist/assets/ArticlesList-CSz0lgZG.js       4.11 kB │ gzip:   1.92 kB
dist/assets/AdminLayout-BmfdsjpE.js        5.36 kB │ gzip:   2.02 kB
dist/assets/BlogArticle-CEkxwlw7.js        5.81 kB │ gzip:   2.47 kB
dist/assets/TableRow-Cf2zCu35.js           6.39 kB │ gzip:   2.14 kB
dist/assets/LeadsList-D9UyMqze.js         12.00 kB │ gzip:   4.54 kB
dist/assets/vanta.net.min-ChF0uP-v.js     13.56 kB │ gzip:   4.69 kB
dist/assets/ArticleEdit-CbkJMn6t.js      896.69 kB │ gzip: 316.48 kB
dist/assets/index-DPYmTf_f.js          1,584.84 kB │ gzip: 450.43 kB   ← chunk de entrada
```

Lecturas de la lista:

- **`@uiw/react-md-editor` era el peso gordo**: los 896,69 kB del chunk
  `ArticleEdit` (+ 33,84 kB de CSS propio) ya no los descarga un visitante de la
  landing; solo se piden al abrir `/admin/articles/new` o `/admin/articles/:id`.
- El CSS de entrada cae de 35,12 kB a 1,27 kB porque esos 35 kB eran casi todos
  la hoja de estilos del editor; lo que queda es `src/styles/globals.css`
  (1 604 bytes en disco). El resto de estilos los genera Emotion en runtime.
- Rollup extrajo dos chunks compartidos por su cuenta: `MarkdownRenderer`
  (`BlogArticle` + `ArticleEdit`) y `TableRow` (`LeadsList` + `ArticlesList`).
- **El aviso `Some chunks are larger than 500 kB` sigue apareciendo** y es
  esperado: lo que queda dentro de la entrada es `three`, importado de forma
  **estática** en `src/components/sections/Hero.tsx:5`
  (`import * as THREE from 'three'`) aunque el efecto Vanta se cargue con
  `import()`. Sacar `three` no está en el `acceptance` de esta feature; lo dejé
  anotado en `docs/architecture.md` §10.

---

## 4. Decisiones de diseño

### 4.1 Dónde van los límites de `Suspense` (y punto 3 del acceptance)

**No pude verificarlo en navegador: la sesión es headless.** Lo que sigue es un
argumento estructural sobre dónde quedan los límites, no una comprobación visual.

Hay **dos** niveles:

1. **Alrededor de `<Routes>`** — cubre las rutas de primer nivel. Todas las
   rutas perezosas de primer nivel (`/blog`, `/blog/:slug`, `/admin/login`,
   `/admin`) renderizan una página completa con su propia cabecera y pie, así
   que al suspender no queda "media página": se sustituye una página entera por
   un placeholder de página entera. `RouteFallback` usa `minHeight: '100vh'`, o
   sea que el documento conserva el alto del viewport y la barra de scroll no
   salta cuando entra el contenido real. Y pinta `bgcolor: 'surface.soft'` +
   spinner en `primary.main`, de modo que el intervalo de carga es un lienzo del
   tema y no un rectángulo blanco del `body`.
2. **Dentro del `/admin`, en la posición del `<Outlet />`** — cada hijo va
   envuelto en `<AdminPage>` (`<Suspense fallback={<RouteFallback minHeight={320} />}>`).
   Este es el límite que evita el parpadeo real del panel: React busca **el
   `Suspense` más cercano**, así que al ir de `/admin/leads` a
   `/admin/articles` suspende solo el área de contenido; `AdminGuard` y el
   sidebar de `AdminLayout` siguen montados. Si el único límite fuera el
   exterior, el layout entero se desmontaría en cada navegación interna, se
   perdería el estado del guard y se dispararía otro `GET /api/auth/me`.
   El `minHeight={320}` es menor que `100vh` porque el placeholder vive dentro
   del `<main>` del layout, y aun así reserva alto suficiente para que el
   contenido no empuje el layout al llegar.

Que no haya **pantalla en blanco** se apoya en dos hechos comprobables: el
`fallback` se monta de forma síncrona en el primer render de una ruta perezosa
(lo verifica el test "una ruta perezosa muestra el fallback de Suspense en el
primer render") y el `fallback` contiene un `progressbar`, es decir hay algo
pintado, no un contenedor vacío.

Lo que **no** he hecho, y conviene que el reviewer lo sepa: no activé
`future={{ v7_startTransition: true }}` en el `BrowserRouter`. Con ese flag
react-router envolvería la navegación en `startTransition` y React mantendría la
página anterior visible mientras llega el chunk, en vez de mostrar el fallback.
Es la mejora canónica contra el flash, pero cambia la semántica de actualización
del router en toda la app y toca `src/main.tsx` con una decisión de arquitectura
que no está en el `acceptance`. Lo dejo como observación, no lo implementé.

### 4.2 Dónde acabó `BlogCard` (`src/components/sections/Blog.tsx`)

Era el acoplamiento a vigilar: `BlogIndex` importa `BlogCard` de una sección de
la landing. Comprobado sobre el `dist/` real, buscando la cadena `Leer artículo`:

```
dist/assets/BlogIndex-bZBT8Ski.js: 1
dist/assets/index-DPYmTf_f.js:     0
```

`sections/Blog.tsx` cae **dentro del chunk de `BlogIndex`**, no en el de entrada.
La razón es que `<Blog />` está comentado en `App.tsx:47`, así que el módulo
tiene un único importador real (`BlogIndex`, perezoso) y Rollup lo coloca en ese
chunk. **Es una propiedad frágil**: si alguien reactiva la sección `Blog` en la
landing, el módulo pasará a tener un importador estático desde el chunk de
entrada y Rollup lo devolverá ahí (arrastrando `BlogCard` y su formateo de
fechas). No lo he movido a `src/components/` porque eso es refactor de
ubicación, fuera del `acceptance` de esta feature; queda anotado como riesgo.

### 4.3 `lazy` + `AdminGuard` (render prop) + `<Outlet context={user} />`

Verificado que la combinación sigue funcionando, y con test:

- `AdminGuard` perezoso conserva el tipo de sus props (`children: (user) => ReactNode`),
  así que `<AdminGuard>{user => <AdminLayout user={user} />}</AdminGuard>`
  typechequea igual: `React.lazy` no altera la firma.
- El `<Suspense>` que añadí queda **por debajo** del `<Outlet context={user} />`
  (está en el `element` del hijo), o sea dentro del provider de contexto del
  outlet. `useOutletContext()` en `AdminHome` sigue leyendo el usuario: el test
  "AdminGuard y AdminLayout perezosos siguen inyectando el usuario por el
  Outlet" comprueba que aparece el saludo "Bienvenido, Ana".
- La redirección de la guardia sin sesión (`/admin/leads` → `/admin/login`)
  también está cubierta.

**Coste asumido:** en la *primera* entrada a una ruta anidada del admin hay una
cascada de dos saltos (chunk de `AdminGuard`/`AdminLayout` → chunk de la
página). Es un panel interno y no la ruta crítica del negocio; a cambio, el
chunk de entrada que descarga el visitante de la landing queda estrictamente más
pequeño.

### 4.4 El fallback y `docs/conventions.md` §3

`RouteFallback` no lleva ningún hex ni color suelto: `bgcolor: 'surface.soft'` y
`color: 'primary.main'`, ambos tokens del tema. Vive en `src/components/` porque
lo usan dos sitios (el límite exterior y el del admin), según la tabla de
`docs/conventions.md` §1. Expone nombre accesible (`role="status"` +
`aria-label="Cargando"` + `aria-live="polite"`) para ser alcanzable por rol,
como pide §6.

---

## 5. Tests

**Nuevo — `src/__tests__/AppRoutes.test.tsx` (7 tests):**

1. Una ruta perezosa muestra el fallback de `Suspense` en el primer render, con
   un `progressbar` dentro (no una pantalla en blanco).
2. La landing `/` **no** es perezosa: renderiza sin pasar por el fallback.
3. El fallback se sustituye por la página real cuando llega el chunk.
4. `/blog/:slug` carga `BlogArticle` perezosamente y pide `/api/articles/:slug`.
5. `AdminGuard` + `AdminLayout` perezosos siguen inyectando el usuario por el
   `Outlet` (`AdminHome` saluda por nombre).
6. Sin sesión, la guardia perezosa sigue redirigiendo a `/admin/login`.
7. Navegar entre páginas del admin no desmonta el sidebar.

Convenciones de `docs/verification.md` §4 respetadas: `vi.spyOn(globalThis, 'fetch')`
devolviendo `Response` reales, **sin mockear `src/lib/api.ts`**, `ThemeProvider` +
`MemoryRouter`, `restoreAllMocks()` en `afterEach`.

**Modificado — `src/pages/__tests__/NotFound.test.tsx`:** solo el *wrapper*.
`renderAt` pasa a ser `async` y espera a que desaparezca el fallback de
`<Suspense>` antes de devolver el control:

```tsx
async function renderAt(path: string) {
  const utils = render(/* … MemoryRouter + ThemeProvider + AppRoutes … */);
  if (fallback()) await waitForElementToBeRemoved(fallback);
  return utils;
}
```

Cada `it` se marca `async` y hace `await renderAt(...)`. **Ninguna aserción
cambió**: siguen siendo las mismas queries síncronas (`getByRole`, `queryByRole`,
`getByText`) con los mismos matchers. Los 61 tests previos siguen verdes.

---

## 6. Verificación (salida real)

```
$ npm test && npm run typecheck && npm run build

 Test Files  12 passed (12)
      Tests  68 passed (68)
   Duration  34.61s

> maia-landing-client@0.1.0 typecheck
> tsc -b --noEmit
(exit 0)

> maia-landing-client@0.1.0 build
> tsc -b && vite build
vite v5.4.21 building for production...
✓ 1737 modules transformed.
[ … lista de chunks de §3 … ]
(!) Some chunks are larger than 500 kB after minification.
✓ built in 14.52s
(exit 0)
```

61 tests previos + 7 nuevos = 68, en 12 archivos. `npm run typecheck` y
`npm run build` en 0. El aviso de chunk >500 kB es el esperado por
`docs/verification.md` §1.

Sin verificación en navegador (sesión headless). Sin `console.log` de debug, sin
archivos temporales.

---

## 7. Para el reviewer

- **Acceptance 1** — cumplido: `/admin/*` y páginas del blog con `React.lazy` +
  `Suspense`, fallback `RouteFallback` con tokens del tema.
- **Acceptance 2** — cumplido y medido: 2 525,23 kB → 1 584,84 kB en el JS de
  entrada (−37,2 %), más 35,12 kB → 1,27 kB de CSS. Tabla en §3 y en
  `progress/current.md`.
- **Acceptance 3** — argumentado estructuralmente en §4.1, **no verificado
  visualmente**.
- **Acceptance 4** — cumplido: los 61 tests previos verdes, solo se ajustó el
  wrapper de `NotFound.test.tsx`, ninguna aserción.
- El texto del `acceptance` dice "los 34 tests existentes"; el baseline vigente
  eran 61. No he tocado `feature_list.json` más allá del `status`.
- No he marcado la feature `done`.
