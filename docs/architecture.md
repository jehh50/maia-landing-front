# Arquitectura — MaIA Landing (frontend)

> Última actualización: 27 de julio de 2026 · Repo: `maia-landing-front` (`maia-landing-client` en `package.json`)

SPA de React que sirve tres productos en un solo bundle:

1. **Landing pública** one-page (`/`) con captación de leads.
2. **Blog público** (`/blog`, `/blog/:slug`) alimentado por la API.
3. **Panel de administración** privado (`/admin/*`): leads y artículos ya operativos, más usuarios, imágenes y precios **en maquetación** (features 27-30, con datos mock a la espera de que el backend publique sus endpoints — ver `docs/api-contract.md` §10).

Más un par de páginas legales estáticas bilingües (`/privacidad`, `/terminos`).

El backend es un servicio Node aparte (no vive en este repo); aquí solo existe el cliente HTTP en `src/lib/api.ts`.

---

## 1. Stack

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Build / dev server | Vite 5 | `vite.config.ts`, puerto 5174, proxy `/api` → `http://localhost:3002` |
| UI | React 18 + TypeScript 5.6 (`strict`) | `jsx: react-jsx`, `noEmit`, `noUnusedLocals/Parameters` |
| Design system | MUI 6 + Emotion | Tema propio en `src/theme/theme.ts`, estilos vía `sx` |
| Routing | react-router-dom 6 | `BrowserRouter` declarado en `src/main.tsx`; tabla de rutas en `src/AppRoutes.tsx` |
| Markdown | `react-markdown` + `remark-gfm` (lectura), `@uiw/react-md-editor` (edición) | |
| Fondo animado | `vanta` (net) + `three` | Solo en el Hero, cargado con `import()` dinámico |
| Teléfonos | `mui-tel-input` | Selector de país en el formulario de contacto |
| Tests | Vitest 2 + Testing Library + jsdom | `globals: true`, setup en `src/test/setup.ts` |
| Deploy | Vercel (`vercel.json`) | `framework: vite`, rewrite SPA `/(.*) → /index.html` |

Sin Tailwind, sin state manager global, sin data-fetching library: el estado es local por componente y las llamadas son `fetch` directo.

---

## 2. Mapa de directorios

```
src/
├── main.tsx                  # Bootstrap: StrictMode → ThemeProvider → CssBaseline → BrowserRouter → AppRoutes
├── AppRoutes.tsx             # Tabla de rutas (fuera de main.tsx: ese archivo tiene createRoot y no es montable en un test)
├── App.tsx                   # Landing one-page: composición de secciones + estado del ContactModal
├── vite-env.d.ts             # Tipos de import.meta.env + declaración del módulo `vanta/dist/vanta.net.min`
│
├── theme/tokens.ts           # ÚNICA fuente de verdad de los colores (ver §6)
├── theme/theme.ts            # createTheme desde tokens + augmentación de Palette (brand.*, surface.*)
├── styles/globals.css        # Reset, body, .gradient-text y animaciones fadeUp/blink/reveal (sin colores)
│
├── lib/
│   ├── api.ts                # ÚNICO punto de contacto con el backend (todas las llamadas HTTP)
│   └── industries.ts         # Catálogo de industrias del formulario (const assertion + tipo derivado)
│
├── hooks/useReveal.ts        # IntersectionObserver global que activa `.reveal → .visible`
│
├── components/
│   ├── Navbar.tsx            # AppBar fija, anclas (#solution, #features, …) + menú móvil + "Ingresar"
│   ├── Footer.tsx            # Columnas Producto / Empresa / Soporte, links legales y redes
│   ├── WhatsAppFloat.tsx     # FAB flotante de WhatsApp
│   ├── ContactModal.tsx      # Dialog con formulario validado → POST /api/contact
│   ├── MarkdownRenderer.tsx  # Renderer MD compartido (blog público + preview del admin)
│   └── sections/             # Una sección = un componente autónomo de la landing
│       ├── Hero.tsx  Pain.tsx  Solution.tsx  Features.tsx  Integrations.tsx
│       ├── Pricing.tsx  Addons.tsx  FAQ.tsx  CTAFinal.tsx
│       └── Trust.tsx  ROI.tsx  Testimonials.tsx  Blog.tsx   ← desactivadas hoy (ver §4)
│
├── pages/                    # Rutas públicas fuera de la landing
│   ├── BlogIndex.tsx         # Listado /blog (reutiliza BlogCard de sections/Blog.tsx)
│   ├── BlogArticle.tsx       # Detalle /blog/:slug con máquina de estados de carga
│   ├── LegalPage.tsx         # Shell bilingüe ES/EN con persistencia en localStorage
│   ├── NotFound.tsx          # 404 de la ruta comodín: Navbar + CTA de vuelta a / + Footer
│   └── legal/legalDocs.ts    # Contenido markdown de privacidad y términos (ES + EN)
│
├── admin/                    # Área privada
│   ├── Login.tsx             # /admin/login
│   ├── AdminGuard.tsx        # Verifica sesión con GET /api/auth/me
│   ├── AdminLayout.tsx       # Sidebar + <Outlet context={user} />
│   ├── AdminHome.tsx
│   ├── leads/                # LeadsList.tsx + LeadDetailDialog.tsx
│   ├── articles/             # ArticlesList.tsx + ArticleEdit.tsx
│   ├── users/                # UsersList.tsx        ← maqueta (features 27-28)
│   ├── images/               # ImagesGrid.tsx       ← maqueta (features 27-29)
│   └── prices/               # PricesList.tsx       ← maqueta (features 27-30)
│
└── test/setup.ts             # import '@testing-library/jest-dom/vitest'
```

Los tests viven junto al código en carpetas `__tests__/` (`components/`, `pages/`, `admin/`).

---

## 3. Routing

Todas las rutas se declaran en `src/AppRoutes.tsx`. `main.tsx` es bootstrap puro
(`createRoot` → `ThemeProvider` → `BrowserRouter` → `<AppRoutes />`): la tabla se
extrajo para poder montarla en un test, porque `main.tsx` ejecuta
`createRoot(document.getElementById('root')!)` al importarse y revienta en jsdom.

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/` | `App` | Público — landing one-page |
| `/blog` | `BlogIndex` | Público |
| `/blog/:slug` | `BlogArticle` | Público |
| `/privacidad` | `LegalPage doc={legalDocs.privacidad}` | Público |
| `/terminos` | `LegalPage doc={legalDocs.terminos}` | Público |
| `/admin/login` | `Login` | Público |
| `/admin` | `AdminGuard` → `AdminLayout` | **Privado** |
| `/admin` (index) | `AdminHome` | Privado |
| `/admin/leads` | `LeadsList` | Privado |
| `/admin/articles` | `ArticlesList` | Privado |
| `/admin/articles/new` · `/admin/articles/:id` | `ArticleEdit` | Privado |
| `/admin/images` | `ImagesGrid` | Privado — maqueta |
| `/admin/prices` | `PricesList` | Privado — maqueta |
| `/admin/users` | `UsersList` | Privado — maqueta |
| `*` | `NotFound` | Público — 404 |

Notas:

- **Code splitting por ruta** (feature 22): las páginas del blog (`BlogIndex`, `BlogArticle`) y todo el admin (`Login`, `AdminGuard`, `AdminLayout`, `AdminHome`, `LeadsList`, `ArticlesList`, `ArticleEdit`, y desde la feature 27 `UsersList`, `ImagesGrid` y `PricesList`) se declaran con `React.lazy` en `AppRoutes.tsx` y Rollup emite un chunk por ruta. El `import()` debe llevar **ruta literal**: si el path se calcula, Rollup no puede analizarlo y no emite chunk. `App` (la landing), `LegalPage` y `NotFound` siguen con import estático a propósito: son la ruta crítica del negocio o dependencias del comodín. El fallback compartido es `src/components/RouteFallback.tsx`.
- Hay dos niveles de `<Suspense>`: uno alrededor de `<Routes>` para las rutas de primer nivel, y otro por cada hijo del `<Outlet />` del admin, de modo que la guardia y el sidebar no se desmontan al navegar dentro del panel.
- El otro `import()` dinámico del proyecto es el efecto Vanta del Hero.
- La ruta comodín `*` (última de la tabla) renderiza `NotFound`: un path desconocido cae en el rewrite de Vercel a `index.html` y react-router lo resuelve a la 404, con `Navbar`, `Footer` y un CTA de vuelta a `/`.
- La navegación dentro de la landing es por anclas (`#solution`, `#features`, `#integrations`, `#pricing`, `#faq`, `#addons`, `#cta-final`), con `scroll-behavior: smooth` en `globals.css`.

### Guardia de rutas privadas

`AdminGuard` (`src/admin/AdminGuard.tsx:16`) mantiene tres estados — `loading` / `auth` / `guest` — resueltos con un `GET /api/auth/me`. Si no hay sesión redirige a `/admin/login` guardando el destino original en `location.state.from`, que `Login` usa para volver tras autenticar. Usa el patrón *render prop* (`children: (user) => ReactNode`) para inyectar el `AdminUser` en `AdminLayout`, que a su vez lo propaga a las páginas hijas por `<Outlet context={user} />`.

La autenticación real es por **cookie de sesión**: no se guarda token en el cliente, todas las llamadas privadas van con `credentials: 'include'`.

---

## 4. La landing (`App.tsx`)

`App` es un componente de composición con tres piezas de estado:

- `contactOpen` / `contactTipo` — controlan el `ContactModal`, montado **una sola vez** al final del árbol. Cualquier sección lo dispara con su prop `onOpenContact`, y el `tipo` (`'demo' | 'contacto'`) cambia los textos del modal y viaja al backend como clasificación del lead.
- `isAnnual` — toggle mensual/anual, elevado a `App` porque originalmente lo compartían `Pricing` y `ROI`.

`useReveal()` se invoca una vez desde `App`: registra un `IntersectionObserver` sobre todos los `.reveal` presentes en el DOM al montar y les añade `.visible` al entrar en viewport (`src/hooks/useReveal.ts`). Desde la feature 21 un `MutationObserver` (`childList` + `subtree` sobre `document.body`) recoge además los `.reveal` montados **después** del primer render, inspeccionando solo los nodos añadidos en cada mutación. Revelar es de una sola vez: tras añadir `.visible` se hace `unobserve`, y un `WeakSet` evita observar dos veces el mismo nodo.

Secciones actualmente comentadas en `App.tsx:38-47`: `Trust`, `ROI`, `Testimonials` y `Blog`. Los componentes siguen en el repo y compilan; están apagados a nivel de composición, no eliminados. `sections/Blog.tsx` sigue vivo de todos modos porque `BlogIndex` importa su `BlogCard`.

`Hero.tsx` es la sección más pesada y concentra la lógica de animación:
- Contadores animados con `requestAnimationFrame` y easing cúbico (`useCounter`), disparados por un `IntersectionObserver` propio al 50% de visibilidad.
- Carrusel de 3 capturas con autoplay de 5 s, pausa en hover, flechas y dots.
- Fondo Vanta NET cargado dinámicamente y destruido en el cleanup del efecto.

---

## 5. Capa de datos (`src/lib/api.ts`)

Único módulo que habla con el backend. Define tres helpers y todos los tipos compartidos:

| Helper | Cookies | Uso |
|--------|---------|-----|
| `postLead` | por defecto | `POST /api/contact` — formulario público |
| `apiJson<T>` | `credentials: 'include'` | Auth y endpoints `/api/admin/*` |
| `publicJson<T>` | `credentials: 'omit'` | Blog público (`/api/articles`) |

Todos devuelven la misma forma `{ ok, status, data }` y nunca lanzan: el `res.json()` va en `try/catch` y `data` cae a `null` si no hay body.

Sobre esa forma cruda hay un normalizador, **`normalizeApi`** (feature 20), que convierte el resultado en la unión discriminada `{ ok: true, status, data } | { ok: false, status, error, field? }`, para no repetir el `'x' in data` en cada llamador. El `field` opcional lo añadió la **feature 31**: es el nombre del campo que el backend rechaza en sus `422`, y permite marcar en rojo el input concreto en vez de mostrar un mensaje global.

**El estado de la migración es incremental.** Usan `normalizeApi` `BlogIndex`, `LeadsList` y la pantalla de usuarios (feature 32, el primer cableado completo de un CRUD). El resto —`AdminGuard`, `Login`, `ArticlesList`, `ArticleEdit`, `BlogArticle`, `sections/Blog` y `ContactModal`— sigue discriminando a mano con `'x' in data`. Esa es la deuda de adopción que documenta §10: el helper existe, lo que falta es adoptarlo.

Detalle del contrato de cada endpoint en `docs/api-contract.md`.

Endpoints consumidos:

```
POST   /api/contact                  → postLead
POST   /api/auth/login  /logout      → login, logout
GET    /api/auth/me                  → getMe            (usado por AdminGuard)
GET    /api/admin/leads[?q&tipo&pais_iso&limit&offset]
GET    /api/admin/leads/:id
GET    /api/admin/articles           POST /api/admin/articles
GET    /api/admin/articles/:id       PATCH /api/admin/articles/:id
DELETE /api/admin/articles/:id
GET    /api/articles[?limit&offset]  (público, solo status='published')
GET    /api/articles/:slug           (público)
```

Modelo de tipos: `AdminArticle` es la fuente de verdad y `PublicArticle` se deriva con `Pick<>` — el subconjunto expuesto públicamente omite `status`, `author_id` y `body_md` interno de borrador. `LeadType = 'demo' | 'email' | 'contacto'` viaja del formulario al filtro del admin.

Validación compartida: `EMAIL_RE` y `PHONE_RE` (`^\+\d{7,15}$`) se exportan desde aquí y las usan `ContactModal` y `Login`; el teléfono se normaliza quitando espacios, guiones y paréntesis antes de validar.

### Base URL

```
API_BASE = import.meta.env.VITE_API_BASE ?? ''
```

Vacío por defecto ⇒ rutas relativas. En dev las resuelve el proxy de Vite hacia `:3002`; en producción deben resolverlas el hosting o un `VITE_API_BASE` absoluto (`https://api.maiabuilder.ai`). `vercel.json` **no** define rewrites de `/api`, así que un deploy en Vercel requiere `VITE_API_BASE` apuntando al backend.

---

## 6. Sistema de estilos

### Una sola fuente de verdad de color: `src/theme/tokens.ts` (feature 23)

Hasta la feature 23 los mismos hex vivían dos veces: en la `palette` del tema MUI y en el `:root` de `src/styles/globals.css`. Cambiar un color obligaba a tocar dos archivos y nada impedía que se desincronizaran. Hoy **los valores existen una sola vez**, en `src/theme/tokens.ts`, y las dos capas de consumo derivan de él:

```
src/theme/tokens.ts        ← ÚNICA fuente de verdad (hex literales)
  ├── tokens.*             → src/theme/theme.ts  → palette MUI  → sx: bgcolor: 'surface.soft'
  └── cssVariables         → theme.components.MuiCssBaseline.styleOverrides[':root']
                                                 → var(--orange), var(--border), …
```

Los grupos de tokens son `brand`, `surface`, `text`, `border`, `feedback`, `accent` (paleta categórica decorativa de las tarjetas de `Pain`/`Features`/`Addons`) y `external` (marca de terceros, WhatsApp). Cada hex aparece **una vez**: los alias (`feedback.successMain`, `text.onBrand`) referencian al token base.

**Dirección de la derivación: TS → CSS.** Se eligió el módulo TypeScript como origen y no `globals.css` porque:

- El tema tiene que existir como objeto JS antes de renderizar (`createTheme`) y MUI necesita hex reales: `alpha()` y `augmentColor` no saben operar sobre `var(--x)`, así que "CSS → tema" obligaría a `getComputedStyle` en tiempo de módulo (imposible en los tests, que importan `theme.ts` sin DOM ni `globals.css`) o a migrar todo a `createTheme({ cssVariables: true })`, que renombraría las variables a `--mui-*` y forzaría reescribir los ~90 `var(--…)` del repo.
- Al revés funciona sin fricción: un objeto `Record<'--nombre', valor>` se inyecta tal cual como estilos globales.

**Los nombres de las variables no cambiaron** (`--orange`, `--orange-h`, `--bg-soft`, `--border2`, `--muted2`…), precisamente para no tocar sus usos repartidos por el repo. `src/styles/globals.css` ya **no declara ningún color**: solo el reset de `box-sizing`, `body`, `.gradient-text` y las animaciones `fadeUp` (con delays `.fade-up-1..4`), `blink` y `reveal/visible`.

**Orden de carga.** Las variables se emiten desde el tema y las monta `<CssBaseline />` (`src/main.tsx`), es decir, en el primer render de React, no en el `<link>` del CSS. No hay flash: el único consumidor de `var(--…)` que existe antes de montar React es la regla `body { background: var(--bg); color: var(--text) }` de `globals.css`, y `index.html` sirve un `<div id="root">` vacío — no hay nada pintado que pueda cambiar de color. Desde el primer render, el propio `CssBaseline` fija `body` con `background.default` / `text.primary`, que salen de los mismos tokens. Consecuencia a tener presente: **cualquier árbol montado sin `ThemeProvider` + `CssBaseline` no tendrá las variables** (es el caso de los tests, donde tampoco las tenía antes porque `globals.css` no se importa en jsdom).

### Cómo usar los tokens

| Caso | Qué usar | Ejemplo |
|------|----------|---------|
| Valor de color suelto en `sx` | Token del tema | `bgcolor: 'background.paper'`, `color: 'primary.main'`, `bgcolor: 'surface.soft'` |
| Color dentro de un string CSS crudo (gradiente, borde compuesto, `box-shadow`) | Variable CSS | `background: 'linear-gradient(180deg, var(--bg-soft) 0%, var(--bg) 100%)'` |
| Valor en JS puro: `style={{}}` nativo, arrays de datos, concatenación (`${accent}18`) | Import del módulo | `import { tokens } from '…/theme/tokens'` |
| Color **con opacidad** dentro de un string CSS crudo (sombra teñida, gradiente translúcido, borde) | `alpha()` sobre el token | `` boxShadow: `0 2px 16px ${alpha(tokens.brand.orange, 0.06)}` `` |

**Por qué `alpha()` y no `var(--…)` cuando hay opacidad de por medio (feature 25).** Una variable CSS lleva el color opaco: no hay forma de teñirla al 6 % sin `color-mix()` ni sin reescribirla como triplete suelto. Hasta la feature 25 eso se resolvía escribiendo el `rgba()` a mano — siete literales en `Pain`, `Pricing` y `Solution` que repetían los canales de `brand.orange` y `brand.green` fuera de `tokens.ts`. No eran hex, así que el barrido de la feature 23 no los vio. Hoy salen del token vía `alpha()`, la misma utilidad que ya usaba `theme.ts` para las sombras de `MuiButton`. `src/theme/__tests__/brandAlpha.test.tsx` congela los siete colores y comprueba en el DOM que los tres componentes los emiten.

Ningún componente declara hex. El tema conserva el resto de decisiones: tipografía Inter, `borderRadius: 12`, escala de sombras reducida a 4 niveles y overrides de `MuiButton` (píldora, `textTransform: none`), `MuiContainer` (`max-width: 1140px`) y `MuiTextField` (`fullWidth`, `size: small`).

`src/theme/__tests__/tokens.test.tsx` congela nombres y valores de las 19 variables CSS, comprueba que la paleta y la capa CSS salen del mismo token y verifica que los paths de paleta usados en los `sx` resuelven al color esperado.

La fuente Inter se carga por `<link>` a Google Fonts desde `index.html`, con `preconnect`.

---

## 7. Contenido

- **Copy y datos de secciones**: hardcodeados como arrays tipados en cada componente (`plans` en `Pricing.tsx`, features, FAQ, integraciones…). No hay CMS para la landing.
- **Blog**: contenido dinámico desde la API, escrito en el admin con `@uiw/react-md-editor` y renderizado con `MarkdownRenderer`.
- **Legales**: markdown embebido en `src/pages/legal/legalDocs.ts` (~500 líneas), estructura `{ slug, es: {...}, en: {...} }`. `LegalPage` alterna idioma con un `ToggleButtonGroup` y persiste la elección en `localStorage` bajo `maia-legal-lang`; renderiza con `react-markdown` directo (no con `MarkdownRenderer`).

### `MarkdownRenderer`

Componente compartido entre la vista pública del artículo y el preview en vivo del editor. Aporta:

- GFM (tablas, autolinks, listas de tareas).
- **Auto-embed de video**: si un párrafo contiene un único link a YouTube o Vimeo, se sustituye por un `<iframe>` responsivo 16:9 (`getEmbedUrl`, exportada y testeada).
- Links externos con `target="_blank" rel="noopener noreferrer"`; imágenes con `loading="lazy"`.
- Modo `compact` que escala títulos y tipografía (usado en el preview del admin).

---

## 8. Testing

`vitest run` con entorno jsdom. 15 archivos de test, 86 tests:

```
__tests__/AppRoutes.test.tsx                    pages/__tests__/BlogIndex.test.tsx
components/__tests__/ContactModal.test.tsx      pages/__tests__/BlogArticle.test.tsx
components/__tests__/MarkdownRenderer.test.tsx  pages/__tests__/NotFound.test.tsx
components/sections/__tests__/Pricing.test.tsx  admin/__tests__/Login.test.tsx
hooks/__tests__/useReveal.test.tsx              admin/__tests__/LeadsList.test.tsx
lib/__tests__/api.test.ts                       admin/__tests__/ArticlesList.test.tsx
theme/__tests__/tokens.test.tsx                 admin/__tests__/AdminLayout.test.tsx
theme/__tests__/brandAlpha.test.tsx
```

Convenciones observadas:

- Se testea comportamiento a través de la UI con `userEvent`, nunca implementación.
- El backend se simula con `vi.spyOn(globalThis, 'fetch')` devolviendo `Response` reales; las aserciones inspeccionan `fetch.mock.calls` para verificar URL, método y payload. **No se mockea `src/lib/api.ts`** — el cliente HTTP entra en el test.
- Los componentes se envuelven en `ThemeProvider` (y `MemoryRouter` cuando hay navegación).
- `restoreAllMocks()` en `afterEach`. `testTimeout: 15000` porque las interacciones con MUI + `userEvent` son lentas.

Sin cobertura configurada y sin tests E2E. Las secciones de la landing son
mayormente presentacionales y siguen mayormente sin test; la excepción es
`Pricing` (feature 26), donde el test fija el color de marca del badge y vigila
que no reaparezcan paths de paleta sin resolver en el `sx`.

---

## 9. Build y despliegue

```bash
npm run dev        # Vite :5174, proxy /api → localhost:3002
npm test           # vitest run
npm run typecheck  # tsc -b --noEmit
npm run build      # tsc -b && vite build → dist/ (con sourcemaps)
npm run preview    # sirve dist/
```

`build` es **type-checked**: un error de TypeScript rompe el build antes de que Vite empaquete.

Despliegue en Vercel con `vercel.json`: `framework: vite`, `outputDirectory: dist`, y el rewrite `/(.*) → /index.html` que hace funcionar el routing client-side en recargas directas (`/blog/mi-post`, `/admin/leads`).

`dist/` existe localmente pero está ignorado por git (`.gitignore`); el artefacto lo genera Vercel en cada deploy.

### Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VITE_API_BASE` | `''` (rutas relativas) | Base absoluta del backend. Necesaria en producción si el hosting no proxea `/api`. |

Al ser `VITE_*`, se **inlinea en el bundle** en build time: es pública y debe cambiarse por entorno, nunca contener secretos.

---

## 10. Decisiones y consecuencias

**Lo que se ganó**

- Cero dependencias de estado/fetching: el proyecto es pequeño y el estado local basta.
- `src/lib/api.ts` como frontera única con el backend hace trivial cambiar host, auth o forma de error.
- Tipos derivados (`Pick`, `const assertion`) evitan duplicar la forma de los datos.
- Secciones desacopladas: activar o reordenar la landing es editar `App.tsx`.

**Lo que hay que tener presente**

- **Tokens de color unificados** desde la feature 23: `src/theme/tokens.ts` es la única fuente y las variables CSS se emiten desde el tema (§6). Los `rgba(232,68,10,…)` / `rgba(22,163,74,…)` de `box-shadow` y gradientes, que la 23 no vio por no ser hex, los cerró la **feature 25**: hoy salen del token vía `alpha()` y `src/theme/__tests__/brandAlpha.test.tsx` los congela (detalle en §6). Lo único que queda a mano son sombras neutras (`rgba(0,0,0,…)`), que no duplican ningún token de marca.
- **Peso del chunk de entrada**: desde la feature 22 el admin y el blog salen del chunk de entrada por `React.lazy` (2 525 kB → 1 585 kB; el CSS de entrada, 35 kB → 1,3 kB). Lo que queda dentro es `three`, importado de forma **estática** por `Hero.tsx` (`import * as THREE from 'three'`) aunque el efecto Vanta se cargue con `import()`. Por eso el build sigue avisando de chunks >500 kB.
- **`useReveal` se invoca dos veces**: desde `App.tsx` y desde `sections/Blog.tsx`. Si ambos se montan hay dos pares de observers sobre los mismos nodos. El resultado es idéntico (añadir `.visible` es idempotente), pero cuesta un `MutationObserver` de más.
- **Discriminación manual de respuestas** (`'rows' in data`): el helper que la centraliza ya existe desde la **feature 20** — `normalizeApi()` en `src/lib/api.ts`, que devuelve `{ ok: true, status, data } | { ok: false, status, error }`. La migración de los consumidores quedó a medias: `admin/articles/ArticlesList.tsx:26` y `components/sections/Blog.tsx:97` siguen discriminando a mano. Es deuda de adopción, no de diseño: **no hace falta una feature de "crear el helper"**.
- El `README.md` de la raíz es la puerta de entrada para humanos: orienta (arranque, scripts, rutas, `VITE_API_BASE`) y remite aquí. **Este documento sigue siendo la referencia técnica vigente**; si algo se contradice, manda este.
