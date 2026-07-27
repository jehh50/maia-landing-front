# Arquitectura — MaIA Landing (frontend)

> Última actualización: 27 de julio de 2026 · Repo: `maia-landing-front` (`maia-landing-client` en `package.json`)

SPA de React que sirve tres productos en un solo bundle:

1. **Landing pública** one-page (`/`) con captación de leads.
2. **Blog público** (`/blog`, `/blog/:slug`) alimentado por la API.
3. **Panel de administración** privado (`/admin/*`) para leads y artículos.

Más un par de páginas legales estáticas bilingües (`/privacidad`, `/terminos`).

El backend es un servicio Node aparte (no vive en este repo); aquí solo existe el cliente HTTP en `src/lib/api.ts`.

---

## 1. Stack

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Build / dev server | Vite 5 | `vite.config.ts`, puerto 5174, proxy `/api` → `http://localhost:3002` |
| UI | React 18 + TypeScript 5.6 (`strict`) | `jsx: react-jsx`, `noEmit`, `noUnusedLocals/Parameters` |
| Design system | MUI 6 + Emotion | Tema propio en `src/theme/theme.ts`, estilos vía `sx` |
| Routing | react-router-dom 6 | `BrowserRouter` declarado en `src/main.tsx` |
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
├── main.tsx                  # Bootstrap: StrictMode → ThemeProvider → CssBaseline → BrowserRouter → Routes
├── App.tsx                   # Landing one-page: composición de secciones + estado del ContactModal
├── vite-env.d.ts             # Tipos de import.meta.env + declaración del módulo `vanta/dist/vanta.net.min`
│
├── theme/theme.ts            # createTheme + augmentación de Palette (brand.*, surface.*)
├── styles/globals.css        # Variables CSS (--orange, --border, …) + animaciones fadeUp/blink/reveal
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
│   └── legal/legalDocs.ts    # Contenido markdown de privacidad y términos (ES + EN)
│
├── admin/                    # Área privada
│   ├── Login.tsx             # /admin/login
│   ├── AdminGuard.tsx        # Verifica sesión con GET /api/auth/me
│   ├── AdminLayout.tsx       # Sidebar + <Outlet context={user} />
│   ├── AdminHome.tsx
│   ├── leads/                # LeadsList.tsx + LeadDetailDialog.tsx
│   └── articles/             # ArticlesList.tsx + ArticleEdit.tsx
│
└── test/setup.ts             # import '@testing-library/jest-dom/vitest'
```

Los tests viven junto al código en carpetas `__tests__/` (`components/`, `pages/`, `admin/`).

---

## 3. Routing

Todas las rutas se declaran en `src/main.tsx:25-46`.

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

Notas:

- No hay code splitting por ruta: todo se resuelve con imports estáticos en `main.tsx`. El único `import()` dinámico del proyecto es el efecto Vanta del Hero.
- No existe ruta `*` (404). Cualquier path desconocido cae en el rewrite de Vercel a `index.html` y renderiza una pantalla vacía.
- La navegación dentro de la landing es por anclas (`#solution`, `#features`, `#integrations`, `#pricing`, `#faq`, `#addons`, `#cta-final`), con `scroll-behavior: smooth` en `globals.css`.

### Guardia de rutas privadas

`AdminGuard` (`src/admin/AdminGuard.tsx:16`) mantiene tres estados — `loading` / `auth` / `guest` — resueltos con un `GET /api/auth/me`. Si no hay sesión redirige a `/admin/login` guardando el destino original en `location.state.from`, que `Login` usa para volver tras autenticar. Usa el patrón *render prop* (`children: (user) => ReactNode`) para inyectar el `AdminUser` en `AdminLayout`, que a su vez lo propaga a las páginas hijas por `<Outlet context={user} />`.

La autenticación real es por **cookie de sesión**: no se guarda token en el cliente, todas las llamadas privadas van con `credentials: 'include'`.

---

## 4. La landing (`App.tsx`)

`App` es un componente de composición con tres piezas de estado:

- `contactOpen` / `contactTipo` — controlan el `ContactModal`, montado **una sola vez** al final del árbol. Cualquier sección lo dispara con su prop `onOpenContact`, y el `tipo` (`'demo' | 'contacto'`) cambia los textos del modal y viaja al backend como clasificación del lead.
- `isAnnual` — toggle mensual/anual, elevado a `App` porque originalmente lo compartían `Pricing` y `ROI`.

`useReveal()` se invoca una vez desde `App`: registra un `IntersectionObserver` sobre todos los `.reveal` presentes en el DOM al montar y les añade `.visible` al entrar en viewport (`src/hooks/useReveal.ts`). **Solo observa los nodos existentes en el primer render**, así que contenido montado después no se anima.

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

Todos devuelven la misma forma `{ ok, status, data }` y nunca lanzan: el `res.json()` va en `try/catch` y `data` cae a `null` si no hay body. La consecuencia es que **cada llamador discrimina el resultado con `'x' in data`** — un patrón repetido en todo el admin y las páginas del blog.

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

Conviven dos fuentes de tokens con los mismos valores:

1. **Tema MUI** (`src/theme/theme.ts`) — `palette` con augmentación de módulo para `brand.*` (naranja `#E8440A`, verde, tintes) y `surface.*`; tipografía Inter; `borderRadius: 12`; escala de sombras reducida a 4 niveles; overrides de `MuiButton` (píldora, `textTransform: none`), `MuiContainer` (`max-width: 1140px`) y `MuiTextField` (`fullWidth`, `size: small` por defecto).
2. **Variables CSS** (`src/styles/globals.css`) — `--orange`, `--border`, `--bg-soft`, `--text`… usadas cuando el `sx` necesita color dentro de un `background: linear-gradient(...)` o un `border` en string, donde los tokens del tema no son cómodos.

Regla práctica: preferir tokens del tema (`color: 'primary.main'`, `bgcolor: 'surface.soft'`); recurrir a `var(--…)` solo en gradientes, bordes compuestos y strings CSS crudos. **Si se cambia un color hay que tocarlo en los dos sitios.**

`globals.css` aporta además el reset de `box-sizing`, `.gradient-text` y las animaciones `fadeUp` (con delays `.fade-up-1..4`), `blink` y `reveal/visible`.

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

`vitest run` con entorno jsdom. 7 archivos de test:

```
components/__tests__/ContactModal.test.tsx      pages/__tests__/BlogIndex.test.tsx
components/__tests__/MarkdownRenderer.test.tsx  pages/__tests__/BlogArticle.test.tsx
admin/__tests__/Login.test.tsx                  admin/__tests__/LeadsList.test.tsx
admin/__tests__/ArticlesList.test.tsx
```

Convenciones observadas:

- Se testea comportamiento a través de la UI con `userEvent`, nunca implementación.
- El backend se simula con `vi.spyOn(globalThis, 'fetch')` devolviendo `Response` reales; las aserciones inspeccionan `fetch.mock.calls` para verificar URL, método y payload. **No se mockea `src/lib/api.ts`** — el cliente HTTP entra en el test.
- Los componentes se envuelven en `ThemeProvider` (y `MemoryRouter` cuando hay navegación).
- `restoreAllMocks()` en `afterEach`. `testTimeout: 15000` porque las interacciones con MUI + `userEvent` son lentas.

Sin cobertura configurada, sin tests E2E, sin tests de las secciones de la landing (son mayormente presentacionales).

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

- **Tokens duplicados** entre tema MUI y variables CSS: todo cambio de color va en dos sitios.
- **Bundle monolítico**: el admin (con `@uiw/react-md-editor`) y `three`/`vanta` se resuelven estáticamente salvo el efecto Vanta. Un visitante de la landing descarga también el código del panel. Es el candidato natural a `React.lazy` por ruta.
- **Sin ruta 404**: un path inválido renderiza en blanco.
- **`useReveal` solo observa el DOM inicial**: contenido montado tras el primer render no recibe la animación.
- **Discriminación manual de respuestas** (`'rows' in data`) repetida en cada consumidor; un helper que normalizara a `{ ok, data } | { ok: false, error }` recortaría bastante ruido.
- **`AdminLayout` tiene un flag `enabled` muerto**: los tres ítems de navegación están en `true` y la rama "próximamente" ya no se alcanza.
- El `README.md` de la raíz describe el estado anterior del proyecto (one-page sin router, puertos 5173/3001); este documento es la referencia vigente.
