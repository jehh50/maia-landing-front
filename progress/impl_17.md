# Implementación — feature 17: Ruta 404

**Estado al cerrar:** `in_progress` (a la espera de review; no se marcó `done`).
**Fecha:** 2026-07-27 · **Rama:** `main` (sin commits — el humano no pidió commitear).

---

## 1. Baseline

Ejecutado **antes** de tocar nada:

```
npm test          → 7 archivos / 34 tests, exit 0
npm run typecheck → exit 0
npm run build     → exit 0 (aviso esperado de chunk >500 kB)
```

Verde, así que la sesión arrancó limpia.

## 2. Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `src/pages/NotFound.tsx` | **Nuevo.** Página 404. |
| `src/AppRoutes.tsx` | **Nuevo.** Tabla de rutas extraída de `main.tsx`, con `<Route path="*" element={<NotFound />} />` como última ruta. |
| `src/main.tsx` | **Modificado.** Ahora solo hace bootstrap: `StrictMode → ThemeProvider → CssBaseline → BrowserRouter → <AppRoutes />`. |
| `src/pages/__tests__/NotFound.test.tsx` | **Nuevo.** 7 tests. |
| `feature_list.json` | Feature 17 `pending → in_progress`. |
| `progress/current.md` | Bitácora de la sesión. |
| `progress/impl_17.md` | Este informe. |

Infraestructura intacta: `package.json`, `vite.config.ts`, `tsconfig.json`,
`vercel.json` y `.gitignore` **sin modificar**. No se leyó ni escribió ningún
`.env*`. No se añadieron dependencias ni endpoints (la 404 no habla con la API).

> Nota: `tsconfig.tsbuildinfo` aparece modificado en `git status`; es el artefacto
> que regenera `tsc -b` al correr el bloque de verificación, no un cambio mío.

## 3. Qué hace la página

`src/pages/NotFound.tsx`:

- `Navbar` arriba (con su `onOpenContact`) y `Footer` abajo, dentro del layout
  `minHeight: 100vh` + `flexDirection: column` que ya usan `LegalPage` y
  `BlogIndex`, con `flex: 1` en el `<main>` para que el footer quede al fondo.
- Bloque central: "404" en grande (`color: 'primary.main'`), `h1` **"Página no
  encontrada"**, un párrafo de apoyo y un `Button` `component={RouterLink} to="/"`
  con el copy **"Volver al inicio"** y `ArrowBackIcon` (mismo patrón de vuelta a
  home que `BlogIndex`/`LegalPage`).
- `document.title = 'Página no encontrada · MaIA'` y `window.scrollTo(0, 0)` en un
  `useEffect`, igual que `LegalPage`.
- Copy 100% en español.

## 4. Decisiones

1. **Extracción de la tabla de rutas a `src/AppRoutes.tsx`.**
   El `acceptance` dice literalmente "existe `<Route path="*">` en
   `src/main.tsx`", pero `main.tsx` ejecuta `ReactDOM.createRoot(...)` en el
   momento del import: importarlo desde un test revienta (no hay `#root` en
   jsdom) y no es testeable. Siguiendo la instrucción explícita del líder, en vez
   de duplicar la tabla de rutas dentro del test se extrajo el árbol `<Routes>` a
   un componente exportable `AppRoutes`, que `main.tsx` renderiza dentro de
   `BrowserRouter`. **La ruta comodín es la misma que se ejecuta en producción y
   la que monta el test**: no hay dos fuentes de verdad. `main.tsx` sigue siendo
   el único punto donde se declara el router.
   Efecto colateral positivo: la feature 22 (code splitting), que depende de la
   17, tendrá el árbol de rutas ya aislado.

2. **`ContactModal` montado en la 404.** `Navbar` exige la prop
   `onOpenContact: () => void`. Pasar un no-op dejaría el botón "Agenda un demo"
   muerto, así que se replica el patrón mínimo de `App.tsx`: un `useState` local
   y `<ContactModal open={...} onClose={...} tipo="demo" />` al final del árbol.
   Sin state manager nuevo, sin elevar estado, sin llamadas a la API en el montaje.

3. **`404` como `<p>`, no como segundo `h1`.** La jerarquía de encabezados deja un
   único `h1` ("Página no encontrada"), que además es lo que consulta el test por
   rol accesible.

4. **Estilos solo con tokens del tema vía `sx`** (`primary.main`, `surface.soft`,
   `text.secondary`, escala de `spacing`). **Cero hex hardcodeados**, cero
   `className` de utilidad, ningún token nuevo en `theme.ts`/`globals.css`.

5. **Sin arreglar deuda vecina.** No se tocó `useReveal`, ni el flag `enabled` de
   `AdminLayout`, ni el bundle monolítico, ni los tokens duplicados: son las
   features 18, 21, 22 y 23.

## 5. Tests (`src/pages/__tests__/NotFound.test.tsx`)

Montan **`AppRoutes` real** dentro de `MemoryRouter` + `ThemeProvider`, sin
mockear `src/lib/api.ts`; el backend se simula con
`vi.spyOn(globalThis, 'fetch')` y `restoreAllMocks()` en `afterEach`.

| Test | Criterio de `acceptance` que cubre |
|------|-----------------------------------|
| `/ruta-que-no-existe` muestra `h1` "Página no encontrada" + "404" y contenido no vacío | 1 y 3 |
| El enlace "Volver al inicio" tiene `href="/"` | 2 |
| `/otra/ruta/inventada` renderiza `banner` (Navbar, con "Cómo funciona" y "Agenda un demo") y `contentinfo` (Footer) | 2 |
| `/` resuelve a `App` (h1 "Crea agentes de IA…") y no al comodín | 4 |
| `/blog` resuelve a `BlogIndex` y no al comodín | 4 |
| `/privacidad` resuelve a `LegalPage` y no al comodín | 4 |
| `/admin/login` resuelve a `Login` y no al comodín | 4 |

Dos stubs necesarios para poder montar la ruta `/` en jsdom, ambos acotados al
archivo de test y ninguno sobre código propio del repo:

- `vi.stubGlobal('IntersectionObserver', IOStub)` — jsdom no lo implementa y lo
  usan `Hero` y `useReveal`.
- `vi.mock('vanta/dist/vanta.net.min')` — el `import()` dinámico del fondo Vanta
  necesita WebGL, que jsdom tampoco tiene.

`stderr` muestra el aviso `Not implemented: window.scrollTo` de jsdom, ya presente
antes en los tests de `LegalPage`/`BlogArticle` por el mismo patrón de scroll al
tope. No es un fallo.

## 6. Verificación (bloque completo de `docs/verification.md` §1)

```
$ npm test
 Test Files  8 passed (8)
      Tests  41 passed (41)
   Duration  29.59s
exit 0            (baseline 7/34 → ahora 8/41: +1 archivo, +7 tests)

$ npm run typecheck
> tsc -b --noEmit
exit 0

$ npm run build
dist/index.html                        0.95 kB │ gzip:   0.53 kB
dist/assets/index-DnjzzLz1.css        35.12 kB │ gzip:   6.53 kB
dist/assets/vanta.net.min-COdqQwaZ.js 13.56 kB │ gzip:   4.69 kB
dist/assets/index-CjPZTqR_.js      2,524.92 kB │ gzip: 778.92 kB
(!) Some chunks are larger than 500 kB after minification.   ← esperado
✓ built in 23.27s
exit 0
```

**Verificación manual pendiente:** `docs/verification.md` §6 pide revisar a 360 px
y 1440 px los cambios visuales. La sesión es headless (sin navegador), así que no
se hizo. El layout de la 404 reutiliza el patrón responsive ya en producción
(`Container` + `maxWidth: 640` + `mx: 'auto'` + breakpoints `xs/md`), pero conviene
que el reviewer o un humano lo confirme en `npm run dev`.

## 7. Bloqueos

Ninguno.

## 8. Siguiente paso

Review contra `CHECKPOINT.md`. Si el veredicto es `APPROVED`, marcar la feature 17
como `done` en `feature_list.json` y mover el bloque de `progress/current.md` al
final de `progress/history.md`.
