# Contexto — MaIA Landing (frontend)

> Léelo **antes** de `docs/architecture.md`: aquí está el *porqué*; allí, el *qué*.
> Última actualización: 27 de julio de 2026.

---

## 1. Qué es este proyecto

`maia-landing-front` es la **cara pública de MaIA**, una plataforma para crear y
administrar agentes de IA. Un solo SPA de React sirve tres productos distintos:

| Producto | Rutas | Para quién |
|----------|-------|-----------|
| **Landing** one-page | `/` | Visitante frío → convertirlo en lead |
| **Blog** | `/blog`, `/blog/:slug` | Tráfico orgánico / contenido |
| **Panel admin** | `/admin/*` | Equipo interno: leer leads, escribir artículos |

Más dos páginas legales bilingües (`/privacidad`, `/terminos`).

**El objetivo de negocio del repo es la captación de leads.** Todo lo demás
(blog, admin) existe para alimentar o gestionar ese flujo. Cuando dudes de una
prioridad: lo que rompe el formulario de contacto es urgente; lo que afecta al
admin, no tanto.

## 2. Qué NO es

- **No es el backend.** El servidor vive en otro repo/servicio (Node, escucha en
  `:3002` en desarrollo). Aquí solo existe el cliente HTTP `src/lib/api.ts`. No
  puedes cambiar la forma de una respuesta: solo consumirla o escalar.
- **No es el producto MaIA.** La aplicación donde el cliente administra sus
  agentes es otra cosa; esta landing solo la vende y muestra capturas
  (`public/hero*.png`).
- **No es multi-idioma.** El copy va en español. Las páginas legales son la
  única excepción (ES/EN con toggle persistido en `localStorage`).

## 3. Decisiones ya tomadas (no las revisites sin escalar)

Cada una fue deliberada. Cambiarlas es una decisión de arquitectura, no una
tarea de implementación — si tu feature parece exigirlo, **escala**.

| Decisión | Por qué | Consecuencia que aceptamos |
|----------|---------|---------------------------|
| **MUI 6 + Emotion, sin Tailwind** | Design system completo y accesible sin construirlo; el equipo ya lo conoce | Estilos vía `sx`, no clases de utilidad |
| **Sin state manager global** | El proyecto es pequeño; el estado es local o se eleva un nivel | Props drilling puntual (`onOpenContact`) |
| **Sin librería de data fetching** | Hay ~10 endpoints y ninguna necesidad de caché/revalidación | Cada consumidor maneja su propio `loading/error` |
| **`src/lib/api.ts` como frontera única** | Cambiar host, auth o forma de error se hace en un archivo | Ningún componente llama a `fetch` directo |
| **Helpers que no lanzan** (`{ ok, status, data }`) | Evita `try/catch` en cada componente | Cada llamador discrimina con `'rows' in data` — verboso y repetido |
| **Auth por cookie de sesión** | El token nunca toca el cliente; `httpOnly` lo protege de XSS | Todas las llamadas privadas necesitan `credentials: 'include'` |
| **Tipos derivados con `Pick<>`** | Una sola fuente de verdad (`AdminArticle`) | `PublicArticle` cambia solo si cambia el original |
| **Deploy en Vercel con rewrite SPA** | Routing client-side sobrevive a recargas directas | `vercel.json` no proxea `/api`: producción **exige** `VITE_API_BASE` |
| **Copy hardcodeado en cada sección** | No hay presupuesto ni necesidad de CMS para la landing | Cambiar un precio es tocar `Pricing.tsx` |

## 4. Deuda conocida y aceptada

Está documentada con detalle en `docs/architecture.md` §10. Resumen para que **no
la confundas con un bug tuyo**:

- **Chunk de entrada pesado** (~1,6 MB tras la feature 22, que sacó el admin y el
  blog con `React.lazy`): lo que queda es `three`, importado estáticamente por el
  Hero. El build sigue avisando de chunks >500 kB. Es esperado.
- **Tokens de color**: ya no están duplicados. Desde la feature 23 la única
  fuente es `src/theme/tokens.ts` y las variables CSS se emiten desde el tema
  (`docs/architecture.md` §6).
- **`useReveal` se invoca dos veces** (desde `App.tsx` y desde `sections/Blog.tsx`): observers duplicados sobre los mismos nodos, sin efecto observable pero con coste.
- **Discriminación manual de respuestas** (`'rows' in data`) repetida en cada
  consumidor de `src/lib/api.ts`.

Estos puntos son el origen natural de las features `pending` de
`feature_list.json`. Arreglar uno **fuera** de su feature es salirse del scope.

## 5. Entorno

- **Dev server:** `npm run dev` → `http://localhost:5174`, con proxy
  `/api` → `http://localhost:3002`. Si el backend no está levantado, las
  llamadas fallan: es esperado, no es tu feature.
- **Única variable de entorno:** `VITE_API_BASE` (default `''` = rutas
  relativas). Al ser `VITE_*` se **inlinea en el bundle**: es pública y **nunca**
  debe contener un secreto.
- **Nunca leas ni escribas `.env` / `.env.local`.** Si necesitas una variable
  nueva, documenta nombre y propósito en `progress/current.md` y que la agregue
  un humano.

## 6. Código de referencia externo

En `/var/www/html/bulkapp/` vive **BULKSALES**, una app CRM/call center en PHP +
jQuery, con su propio `ANALISIS.md`. Es un proyecto **distinto** de MaIA, no una
versión anterior de esta landing. Solo es relevante si una tarea pide
explícitamente migrar un comportamiento de UI desde ahí.

Reglas si la consultas: **solo lectura**, nunca copiar su código tal cual (stack
incompatible), nunca modificarla.

## 7. Cómo se trabaja aquí

El flujo completo está en `AGENTS.md`. En corto: una feature `pending` de
`feature_list.json` a la vez, escrita según `docs/conventions.md`, verificada con
el bloque de `docs/verification.md`, documentada en `progress/current.md` y
aprobada por un `reviewer` contra `CHECKPOINT.md` antes de marcarse `done`.
