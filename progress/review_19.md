# Review — feature 19: Actualizar README.md al estado real del proyecto

**Veredicto:** APPROVED

**Fecha:** 2026-07-27 · **Revisor:** reviewer · **Rama:** `main` (sin commits)

---

## Alcance revisado

Cambios atribuibles a la feature 19 (contrastados por `mtime`, 23:16-23:18, frente a
los de las features 17/18 a las 22:48-23:01):

```
M README.md                (reescrito por completo)
M docs/architecture.md     (§10, última viñeta)
  docs/context.md          (§4, viñeta del README — archivo untracked, sin diff)
  feature_list.json        (19 → in_progress)
  progress/current.md, progress/impl_19.md
```

Lo demás que aparece en `git status` (`src/main.tsx`, `src/AppRoutes.tsx`,
`src/pages/NotFound.tsx`, `src/admin/AdminLayout.tsx`, `src/admin/__tests__/`,
`docs/verification.md`, y los borrados de los bullets "Sin ruta 404" y "flag
`enabled` muerto" de `docs/architecture.md` §10) es el diff **sin commitear de las
features 17 y 18**, ya `done` y ya aprobadas en `progress/review_17.md` y
`progress/review_18.md`. **No se computa en esta review.**

## Verificación ejecutada

Ejecutada por mí, no tomada del informe:

- `npm test`          → `Test Files 9 passed (9)` · `Tests 44 passed (44)` · 33.56 s · exit 0
- `npm run typecheck` → exit 0
- `npm run build`     → exit 0 · `index-Ctxst2tB.js` 2.524,56 kB con el aviso
  `Some chunks are larger than 500 kB` (esperado, `docs/verification.md` §1)

Coincide con el baseline de `docs/verification.md` §2 (9 archivos / 44 tests). Como
corresponde a un cambio solo de documentación, no hay delta.

## Auditoría dato por dato del README (contra la fuente, no contra el informe)

| Afirmación del README | Fuente | ¿Correcta? |
|---|---|---|
| Vite 5 / React 18 / TS 5.6 (`strict`) / MUI 6 / Emotion / Vitest + Testing Library | `package.json:14-39`, `tsconfig.json:15` | ✅ |
| "El backend no vive en este repo" | `docs/architecture.md:13`, `docs/context.md:28` | ✅ |
| `npm run dev` → `http://localhost:5174` | `vite.config.ts:7` `port: 5174` | ✅ |
| proxy `/api` → `http://localhost:3002` | `vite.config.ts:10` `target: 'http://localhost:3002'` | ✅ |
| "sin backend la app carga, las llamadas a `/api` fallan: es esperado" | `docs/verification.md:124`, `docs/context.md:71-73` | ✅ |
| Scripts: `dev`, `build`, `preview`, `test`, `typecheck` | `package.json:7-11` | ✅ los cinco reales, **ninguno inventado, ninguno omitido** |
| `build` = `tsc -b && vite build` → `dist/`, type-checked | `package.json:8`, `vite.config.ts:16` | ✅ |
| `test` = `vitest run` (jsdom) | `package.json:10`, `vite.config.ts:21` | ✅ |
| `typecheck` = `tsc -b --noEmit` | `package.json:11` | ✅ |
| "tests en `__tests__/` junto al código, no hay carpeta `tests/` en la raíz" | `ls tests` → no existe; `docs/conventions.md:22` | ✅ |
| Aviso de chunk >500 kB esperado | `docs/verification.md:32-34`, build real | ✅ |
| "Todas las rutas se declaran en `src/AppRoutes.tsx`; `main.tsx` es bootstrap puro" | `src/AppRoutes.tsx:20-46`, `src/main.tsx:9-18` | ✅ |
| `VITE_API_BASE` default `''` (rutas relativas) | `src/lib/api.ts:24` `?? ''`; `src/vite-env.d.ts:4` `VITE_API_BASE?: string` | ✅ |
| "en producción obligatoria si el hosting no proxea `/api` (`vercel.json` no lo hace)" | `vercel.json` — solo el rewrite SPA `/(.*) → /index.html`, ningún rewrite de `/api` | ✅ |
| "al ser `VITE_*` se inlinea en el bundle: es pública, nunca un secreto" | `docs/architecture.md:258`, `docs/context.md:74-76` | ✅ |
| Punteros a `AGENTS.md`, `docs/{architecture,context,conventions,verification,api-contract}.md` | `ls docs/` → los cinco existen; `AGENTS.md` existe | ✅ |

### Tabla de rutas — contrastada con `src/AppRoutes.tsx`, entrada por entrada

| README | `AppRoutes.tsx` | |
|---|---|---|
| `/` → `App` | :23 | ✅ |
| `/blog` → `BlogIndex` | :24 | ✅ |
| `/blog/:slug` → `BlogArticle` | :25 | ✅ |
| `/privacidad` · `/terminos` → `LegalPage` (ES/EN) | :26-27 | ✅ (fusionadas en una fila; mismo dato) |
| `/admin/login` → `Login`, público | :28 | ✅ (fuera del `AdminGuard`) |
| `/admin` → `AdminGuard` → `AdminLayout`, `AdminHome` de index, privado | :29-37 | ✅ |
| `/admin/leads` → `LeadsList` | :38 | ✅ |
| `/admin/articles` → `ArticlesList` | :39 | ✅ |
| `/admin/articles/new` · `/admin/articles/:id` → `ArticleEdit` | :40-41 | ✅ |
| `*` → `NotFound`, 404 | :43 | ✅ comodín de la feature 17 presente |

**Ninguna ruta de más, ninguna de menos.** La columna "Acceso" es correcta:
`/admin/login` está declarada fuera del `<Route path="/admin">` con `AdminGuard`.

### Falsedades del README viejo, todas eliminadas

Verificado con `grep -rn "5173\|:3001\|legacy.html\|No hay router" --include="*.md" .`
→ **0 coincidencias** fuera de `progress/` (donde son la bitácora histórica del propio
cambio, correcto). Confirmado además que `legacy.html` no existe en la raíz (`ls -a`).

### No contradice `docs/architecture.md`

Recorridos §1 (stack, puerto, proxy), §3 (routing), §5 (`API_BASE`), §9 (scripts,
variables de entorno) y §10. Ninguna divergencia. La cadena de bootstrap abreviada del
README (`createRoot → ThemeProvider → BrowserRouter → <AppRoutes />`) es literalmente la
de `docs/architecture.md:89-90`; §2 la detalla con `StrictMode` y `CssBaseline`, que
`src/main.tsx:10-13` confirma. Es abreviación, no contradicción.

### No duplica a medias lo que vive en `docs/`

El árbol de `src/`, la capa de datos, el sistema de estilos, el testing y el despliegue
**no** se repiten: se remiten. La única tabla derivada es la de rutas, decisión
documentada en `progress/impl_19.md` §3 y compatible con el acceptance 2, que exige
apuntar a la doc como referencia vigente — el README lo dice de forma explícita
(`README.md:64-65`). Riesgo de deriva asumido y anotado abajo como observación menor.

### Las dos correcciones autorizadas

- `docs/architecture.md:277` — la viñeta que decía "el `README.md` de la raíz describe
  el estado anterior del proyecto (one-page sin router, puertos 5173/3001)" está
  reformulada: ahora el README orienta y remite, y architecture manda si algo se
  contradice. ✅
- `docs/context.md:54-64` §4 — la viñeta del README ya no está; la lista de deuda queda
  en bundle monolítico, tokens duplicados, `useReveal` y discriminación manual de
  respuestas. Los cuatro son deuda real y ninguno está duplicado. ✅
- `grep -rn "README"` sobre `*.md` / `*.json` del repo: **ninguna** referencia
  superviviente al README como desactualizado fuera de `progress/` y de la
  `description` de la propia feature 19 en `feature_list.json`. ✅

## Checkpoints

- C1  [x] `npm test` exit 0 — 9 archivos / 44 tests, el baseline íntegro, ningún test previo roto.
- C2  [x] **No aplica en su forma habitual y se da por cumplido.** La feature no toca
  código de la app: `docs/verification.md` §5 no contempla ninguna fila que exija test
  para un cambio de documentación, y su única obligación ("el bloque completo debe
  seguir verde") se cumple. A cambio se auditó la exactitud dato por dato contra
  `package.json`, `vite.config.ts`, `src/AppRoutes.tsx`, `src/lib/api.ts`,
  `src/vite-env.d.ts` y `vercel.json` — tabla de arriba: los tres puntos del acceptance
  quedan verificados contra la fuente, no contra el informe del implementer.
- C3  [x] `npm run typecheck` exit 0 · `npm run build` exit 0 (aviso de chunk esperado).
- C4  [x] Ningún archivo de código modificado. El README nuevo tampoco arrastra hex
  hardcodeados (el viejo citaba `#E8440A` en la sección "Tema", ya eliminada).
- C5  [x] Sin cambios en `src/`: `grep -rn "fetch(" src/` sigue confinado a `src/lib/api.ts`.
  Ningún state manager ni librería de fetching nueva.
- C6  [x] No se consume ni documenta ningún endpoint nuevo. `docs/api-contract.md` intacto
  (mtime 13:16, previo a la sesión).
- C7  [x] `feature_list.json` marca la 19 como `in_progress`, que es el estado real
  (pasa a `done` tras este veredicto, y lo hace el leader, no el implementer).
  `progress/current.md` documenta plan, bitácora, verificación y "sin bloqueos".
- C8  [x] Ningún `.env*` leído ni escrito (no existen en el repo). `VITE_API_BASE` se
  documenta **por nombre, default y propósito**, nunca con un valor; el ejemplo
  `https://api.maiabuilder.ai` ya figuraba en `docs/architecture.md:177`.
- C9  [x] Sin residuos: `find` de `*.orig`/`*.bak`/`*~` → vacío; `grep console.log|console.debug src/`
  → vacío; sin `TODO` sin referencia. `tsconfig.tsbuildinfo` aparece modificado, pero lo
  reescribe `tsc -b` en cada build y es un problema preexistente (está en `.gitignore:6`
  pero fue trackeado en su día), ya registrado en `progress/review_18.md` nota 3. No es
  de esta feature.
- C10 [x] Scope respetado. Las dos ediciones fuera de `README.md` son el mismo hecho que
  la feature: retirar las afirmaciones que decían que el README estaba desactualizado, y
  estaban autorizadas. No se tocó ninguna otra deuda de `docs/architecture.md` §10 —
  bundle monolítico, tokens duplicados, `useReveal` y `'rows' in data` (feature 20)
  siguen ahí intactos.
- C11 [x] `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` y `.gitignore`
  sin modificar (`git status` no los lista).

## Detalle de los fallos

Ninguno bloqueante. Nada que corregir para aprobar.

## Observaciones menores (no bloquean, no pedir cambios ahora)

1. `README.md:40-51` — la tabla de rutas es la única duplicación deliberada respecto de
   `docs/architecture.md` §3. Hoy coinciden exactamente. Cuando una feature futura añada
   o quite una ruta tendrá que tocar **los dos** sitios; conviene recordarlo en el
   acceptance de esa feature.
2. `README.md:3-5` — la entradilla nombra landing, blog y admin, pero no las páginas
   legales, que sí aparecen luego en la tabla de rutas. Es omisión, no error: `/privacidad`
   y `/terminos` quedan documentadas.
