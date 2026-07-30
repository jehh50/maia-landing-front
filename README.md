# MaIA Landing — Frontend

SPA de React que sirve la cara pública de MaIA en un solo bundle: la **landing**
de captación de leads, el **blog** público y el **panel de administración**
interno.

Stack: Vite 5 + React 18 + TypeScript 5.6 (`strict`) + MUI 6 + Emotion, con tests
en Vitest + Testing Library. **El backend no vive en este repo** — es un servicio
Node aparte; aquí solo está el cliente HTTP `src/lib/api.ts`.

## Puesta en marcha

```bash
npm install
npm run dev      # http://localhost:5174
```

El dev server de Vite proxea `/api` → `http://localhost:3002`. Si no tienes el
backend levantado en ese puerto la app carga igual, pero las llamadas a `/api`
fallan: es esperado.

## Scripts

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Vite en `:5174`, con proxy `/api` → `http://localhost:3002` |
| `npm run build` | `tsc -b && vite build` → `dist/`. El build es type-checked: un error de TypeScript lo rompe |
| `npm run preview` | Sirve el `dist/` ya construido |
| `npm test` | `vitest run` (jsdom). Los tests viven en `__tests__/` junto al código, no hay carpeta `tests/` en la raíz |
| `npm run typecheck` | `tsc -b --noEmit` |

El build emite el aviso `Some chunks are larger than 500 kB`. Es esperado hoy
(bundle monolítico, ver `docs/architecture.md` §10) y no es un fallo.

## Rutas

Todas se declaran en `src/AppRoutes.tsx`; `main.tsx` es bootstrap puro
(`createRoot` → `ThemeProvider` → `BrowserRouter` → `<AppRoutes />`).

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/` | `App` | Público — landing one-page |
| `/blog` | `BlogIndex` | Público |
| `/blog/:slug` | `BlogArticle` | Público |
| `/privacidad` · `/terminos` | `LegalPage` (ES/EN) | Público |
| `/admin/login` | `Login` | Público |
| `/admin` | `AdminGuard` → `AdminLayout`, con `AdminHome` de index | **Privado** |
| `/admin/leads` | `LeadsList` | Privado |
| `/admin/articles` | `ArticlesList` | Privado |
| `/admin/articles/new` · `/admin/articles/:id` | `ArticleEdit` | Privado |
| `*` | `NotFound` | Público — 404 |

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VITE_API_BASE` | `''` (rutas relativas) | Base absoluta del backend, p. ej. `https://api.maiabuilder.ai`. En desarrollo se deja vacía y la resuelve el proxy de Vite; en producción es obligatoria si el hosting no proxea `/api` (`vercel.json` no lo hace). |

Al ser `VITE_*` se **inlinea en el bundle** en build time: es pública y **nunca**
debe contener un secreto.

## Dónde seguir leyendo

Este README solo orienta; el detalle vive en la documentación, que es la
referencia vigente:

- **`AGENTS.md`** — cómo se trabaja en este repo: flujo por features, verificación
  y reglas duras. Punto de entrada obligatorio si vas a tocar código.
- **`docs/architecture.md`** — el *qué* técnico: mapa de directorios, routing,
  capa de datos, sistema de estilos, testing, build y despliegue.
- **`docs/context.md`** — el *porqué*: qué es y qué no es el proyecto, decisiones
  ya tomadas y deuda conocida.
- **`docs/conventions.md`**, **`docs/verification.md`**, **`docs/api-contract.md`** —
  estilo y convención de Git, cómo verificar, y contratos de los endpoints.
