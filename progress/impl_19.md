# Implementación — feature 19: Actualizar README.md al estado real del proyecto

**Fecha:** 2026-07-27 · **Rama:** `main` (sin commits; el humano no los pidió)
**Estado:** implementada, **pendiente de review**. No la marqué `done`.

---

## 1. Baseline (antes de tocar nada)

```
npm test          → Test Files 9 passed (9) · Tests 44 passed (44)
npm run typecheck → exit 0
npm run build     → exit 0 · index-Ctxst2tB.js 2.524,56 kB (aviso >500 kB, esperado)
```

Coincide con `docs/verification.md` §2. Verde, así que la sesión podía arrancar.

## 2. Qué cambié

| Archivo | Cambio |
|---------|--------|
| `README.md` | Reescrito por completo |
| `docs/architecture.md` §10 | Última viñeta reformulada (decía que el README describía el estado anterior) |
| `docs/context.md` §4 | Viñeta "README desactualizado" sustituida por deuda real |
| `feature_list.json` | Feature 19 → `in_progress` |
| `progress/current.md` | Bitácora de la sesión |

No se tocó nada de `src/`, ni `package.json`, `vite.config.ts`, `tsconfig.json`,
`vercel.json` o `.gitignore`. No se leyó ni escribió ningún `.env*`.

### 2.1 Contraste de datos contra el código (no contra el encargo)

Cada afirmación del README viejo se verificó contra el archivo fuente. **Todas
eran falsas hoy:**

| Afirmación del README viejo | Realidad verificada |
|-----------------------------|---------------------|
| `npm run dev` en `http://localhost:5173` | `vite.config.ts:7` → `port: 5174` |
| proxy `/api` → `http://localhost:3001` | `vite.config.ts:11` → `target: 'http://localhost:3002'` |
| "La landing es one-page … **No hay router**" | `src/main.tsx` monta `BrowserRouter` → `<AppRoutes />`; `src/AppRoutes.tsx` declara 12 rutas |
| Árbol con raíz `client/` | La raíz del repo es `maia-landing-front`, con `index.html` en la raíz |
| `lib/api.ts` = "cliente del backend (postLead, EMAIL_RE)" | Hoy expone además `apiJson`, `publicJson` y los tipos compartidos (`docs/architecture.md` §5) |
| Árbol de `src/` sin `pages/`, `admin/`, `MarkdownRenderer.tsx` | Ambas carpetas existen (`ls src/`) |
| Scripts: faltaba `preview` | `package.json:9` → `"preview": "vite preview"` |
| "El backend Node debe estar arriba en `:3001` … Ver `../server/`" | `:3002`, y el backend es un servicio aparte que no cuelga de este repo |
| "El antiguo `index.html` monolítico está conservado … como `legacy.html`" | **`legacy.html` no existe** en el repo |

La tabla de rutas del README nuevo se transcribió de `src/AppRoutes.tsx`
(no copiada de `docs/architecture.md`), y coincide con §3 de architecture,
incluida la comodín `*` → `NotFound` que aportó la feature 17.

Scripts del README nuevo, transcritos de `package.json:6-12`:
`dev`, `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`),
`typecheck` (`tsc -b --noEmit`). Los cinco, ni uno más ni uno menos.

### 2.2 Estructura del README nuevo

1. **Qué es** — 2 párrafos: los tres productos en un bundle, el stack, y que el
   backend no vive en este repo.
2. **Puesta en marcha** — `npm install` + `npm run dev` → `http://localhost:5174`,
   proxy `/api` → `:3002`, y qué pasa si el backend no está levantado.
3. **Scripts** — los cinco reales, con lo que hace cada uno.
4. **Rutas** — tabla real, con la nota de que se declaran en `src/AppRoutes.tsx`
   y que `main.tsx` es bootstrap puro.
5. **Variables de entorno** — solo `VITE_API_BASE`, con el default `''` y el aviso
   de que al ser `VITE_*` se inlinea en el bundle: pública, nunca un secreto.
6. **Dónde seguir leyendo** — punteros a `AGENTS.md` (cómo se trabaja),
   `docs/architecture.md` (el qué técnico), `docs/context.md` (el porqué) y los
   tres docs restantes.

## 3. Decisiones

- **Incluir la tabla de rutas en vez de remitir a `docs/architecture.md` §3.**
  El acceptance permitía cualquiera de las dos, pidiendo no duplicar a medias.
  Elegí incluirla: es lo primero que busca un humano al entrar y es barata de
  mantener. Todo lo demás (mapa de directorios, capa de datos, estilos, testing,
  deploy) **no** se duplica: se remite.
- **No repetir el árbol de `src/`.** Era la mitad del README viejo y es justo lo
  que `docs/architecture.md` §2 mantiene actualizado. Duplicarlo garantiza que se
  vuelva a desincronizar.
- **Sin cifras volátiles.** No puse "9 archivos / 44 tests" ni el tamaño del
  bundle en el README: envejecen a la primera feature. Esos números viven en
  `docs/verification.md` §2 y `docs/architecture.md`, que sí se actualizan por
  feature.
- **Sección "Tema" del README viejo eliminada**, no reescrita: `docs/conventions.md`
  §3 y `docs/architecture.md` §6 la cubren mejor y con más detalle.
- **`docs/architecture.md` §10, última viñeta: reformulada, no eliminada.**
  Ahora dice que el README orienta y remite, y que architecture sigue siendo la
  referencia técnica vigente si algo se contradice. Mantiene la jerarquía de
  documentos sin afirmar algo falso.
- **`docs/context.md` §4: viñeta sustituida.** La sección es una lista de deuda
  conocida; el README ya no es deuda. La reemplacé por la discriminación manual de
  respuestas (`'rows' in data`), que sí es deuda real, ya está en architecture §10
  y es el origen de la feature 20. Evité repetir la viñeta de bundle monolítico
  que ya encabeza la lista.

## 4. Tests

Esta feature **no cambia código de la app**, así que no aporta tests. Es el caso
explícito de `docs/verification.md` §5: los cambios que no son lógica de `src/`
no requieren test propio, pero el bloque completo debe seguir verde.

Comprobación adicional que sí hice, por si algún dato quedaba suelto:

```bash
grep -rn "5173\|3001\|legacy.html\|No hay router\|client/" README.md docs/*.md AGENTS.md
# → sin coincidencias
```

## 5. Verificación (después de los cambios)

```
$ npm test
 Test Files  9 passed (9)
      Tests  44 passed (44)
   Duration  34.65s

$ npm run typecheck
> tsc -b --noEmit
TC_EXIT=0

$ npm run build
> tsc -b && vite build
dist/index.html                            0.95 kB │ gzip:   0.52 kB
dist/assets/index-DnjzzLz1.css            35.12 kB │ gzip:   6.53 kB
dist/assets/vanta.net.min-BAc7Uhof.js     13.56 kB │ gzip:   4.68 kB
dist/assets/index-Ctxst2tB.js          2,524.56 kB │ gzip: 778.83 kB
(!) Some chunks are larger than 500 kB after minification.   ← esperado, §1 de verification
✓ built in 16.29s
BUILD_EXIT=0
```

Idéntico al baseline, como corresponde a un cambio solo de documentación.

## 6. Notas para el reviewer

- `git status` muestra `src/main.tsx`, `src/admin/AdminLayout.tsx` y los archivos
  nuevos de `src/pages/NotFound.tsx` como modificados/sin trackear: **son de las
  features 17 y 18**, ya `done`, no de esta sesión. Mis cambios son `README.md`,
  `docs/architecture.md`, `docs/context.md`, `feature_list.json` y `progress/`.
- `tsconfig.tsbuildinfo` aparece modificado: lo reescribe `tsc -b` en cada build,
  también en el baseline. No se commitea (`docs/conventions.md` §8).
- Sin commits ni push: el humano no los pidió.
- La feature sigue en `in_progress`. Pasa a `done` solo con veredicto APPROVED.
