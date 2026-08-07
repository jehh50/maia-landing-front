# Review — feature 22: Code splitting por ruta

**Veredicto:** APPROVED

Revisado sobre el árbol de trabajo (features 17-21 `done` pero sin commitear, así
que `src/AppRoutes.tsx`, `src/components/RouteFallback.tsx`,
`src/__tests__/AppRoutes.test.tsx` y `src/pages/__tests__/NotFound.test.tsx`
figuran como *untracked*: no hay `git diff` de ellos y se han verificado por
lectura, por `mtime` y por *mutation testing* en una copia fuera del repo).

---

## Verificación ejecutada (por mí, no la del informe)

- `npm test`          → **12 archivos / 68 tests, exit 0** (baseline previo 11/61 → +1 archivo, +7 tests)
- `npm run typecheck` → exit 0
- `npm run build`     → exit 0, con el aviso esperado `Some chunks are larger than 500 kB`

## Checkpoints

- C1  [x] `npm test` exit 0, 68/68. Ningún test previo roto.
- C2  [x] Cada punto del `acceptance` tiene verificación (detalle abajo).
- C3  [x] `typecheck` y `build` en exit 0. El aviso >500 kB es el esperado por `docs/verification.md` §1.
- C4  [x] `src/components/RouteFallback.tsx` PascalCase en `src/components/` (se usa desde dos sitios, `docs/conventions.md` §1), `export default function`, `interface Props` local no exportada, sin `React.FC`. Cero `any` y cero hex en `AppRoutes.tsx` y `RouteFallback.tsx` (`grep` limpio). Solo tokens del tema: `bgcolor: 'surface.soft'` (`RouteFallback.tsx:30`) y `color: 'primary.main'` (`RouteFallback.tsx:33`).
- C5  [x] Ningún `fetch` fuera de `src/lib/api.ts` (`grep -rn "fetch(" src` sin resultados fuera de `api.ts` y de los tests). Sin state manager ni librería de fetching nueva. No se duplican tipos: el test reutiliza `AdminUser` de `src/lib/api.ts` (`AppRoutes.test.tsx:8`).
- C6  [x] La feature no consume endpoints nuevos; `docs/api-contract.md` sin cambios (mtime anterior a la sesión).
- C7  [x] `feature_list.json` → 22 en `in_progress` (no marcada `done`). `progress/current.md` documenta plan, bitácora, tabla antes/después, verificación y "sin bloqueos".
- C8  [x] Ningún `.env*` leído ni escrito. Sin variables de entorno nuevas.
- C9  [x] Sin `console.log`/`console.debug`, sin `TODO`, sin `.orig`/`.bak`. `git status` sin basura (`tsconfig.tsbuildinfo` aparece modificado: artefacto de build regenerado también por mi verificación, condición preexistente del repo ya anotada en `review_20` y `review_21`).
- C10 [x] Scope de una sola feature. Archivos tocados en la ventana de la 22 (`find -newermt`): `src/AppRoutes.tsx`, `src/components/RouteFallback.tsx`, `src/pages/__tests__/NotFound.test.tsx`, `src/__tests__/AppRoutes.test.tsx`, `docs/architecture.md`, `docs/context.md`. No se arregló de paso ninguna otra deuda de §10 (p. ej. `three` estático en `Hero.tsx`, correctamente dejado fuera).
- C11 [x] `git diff` vacío para `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` y `.gitignore`. Sin `manualChunks`: el split por ruta bastó, no hubo que escalar.

---

## Punto por punto del `acceptance`

### 1. `/admin/*` y blog con `React.lazy` + `Suspense` y fallback coherente con el tema — **cumplido**

`src/AppRoutes.tsx:21-29` declara las 9 rutas perezosas con ruta literal en el
`import()`. Dos límites de `Suspense`: `AppRoutes.tsx:48` (rutas de primer nivel)
y `AppRoutes.tsx:38-40` (`AdminPage`, en la posición del `<Outlet />`).
`RouteFallback` sin hex, con `minHeight` configurable (`100vh` / `320`) para
reservar alto y no provocar salto de layout, y con nombre accesible
(`role="status"` + `aria-label="Cargando"`, `RouteFallback.tsx:22-24`), lo que
además lo hace consultable desde los tests.
Cubierto por `AppRoutes.test.tsx:77`, `:95`, `:103`, `:113`.

### 2. El chunk de entrada baja de forma medible — **cumplido y comprobado por mí**

Ejecuté `npm run build` y la salida coincide **exactamente**, chunk a chunk y
hash a hash, con la tabla de `progress/impl_22.md` §3:

```
dist/assets/index-DLhTnPmU.css      1.27 kB
dist/assets/ArticleEdit-PCqDfw_U.css   33.84 kB
dist/assets/ArticleEdit-CbkJMn6t.js   896.69 kB
dist/assets/index-DPYmTf_f.js       1,584.84 kB   ← chunk de entrada
(+ AdminGuard 0.65 · AdminHome 1.15 · Login 2.28 · MarkdownRenderer 3.23 ·
   BlogIndex 3.98 · ArticlesList 4.11 · AdminLayout 5.36 · BlogArticle 5.81 ·
   TableRow 6.39 · LeadsList 12.00 · vanta.net.min 13.56)
```

El **baseline** también lo verifiqué en vez de creérmelo: reconstruí la tabla de
rutas pre-22 (imports estáticos, sin `Suspense`) en una copia del proyecto fuera
del repo y la construí. Resultado: `index-C0JQvih7.js` **2 525,24 kB** y
`index-DnjzzLz1.css` **35,12 kB** — el mismo tamaño y el **mismo hash de CSS**
que el baseline declarado (`2 525,23` / `35,12`; los 10 bytes de diferencia en el
JS son de mi reconstrucción del archivo). Las cifras del informe son reales.

Δ real: **−940 kB (−37,2 %) de JS de entrada** y **−33,85 kB (−96,4 %) de CSS de
entrada**. El peso que sale es `@uiw/react-md-editor` (897 kB) más su hoja de
estilos, que ya no descarga un visitante de `/`.

### 3. Sin flash ni pantalla en blanco — **argumentado, parcialmente testeado, no verificado visualmente**

El implementer **no** afirma haberlo comprobado en navegador: lo dice de forma
explícita en `impl_22.md:108` y en `current.md:79`. Eso es lo correcto en sesión
headless, y se agradece que no lo maquille.

El argumento estructural no es palabrería, lo he verificado por *mutation
testing*: sustituí `AdminPage` por un passthrough (`return <>{children}</>`) en
una copia del proyecto y el test `AppRoutes.test.tsx:131` **falla** en la línea
138 (`getByRole('navigation')` deja de encontrar el sidebar, y el DOM que imprime
el error es el `CircularProgress` del fallback exterior). O sea: el límite interno
de `Suspense` es lo único que impide que la navegación dentro del panel desmonte
`AdminGuard` + `AdminLayout`, y el test lo prueba de verdad, no solo compila.

Lo que **no** cubre este acceptance, y el leader debería tener presente: en las
rutas perezosas de primer nivel (`/` → `/blog`, `/` → `/admin/login`) sí hay una
sustitución de la página entera por un `RouteFallback` de `100vh` mientras llega
el chunk. No es una pantalla en blanco (hay `progressbar` y `bgcolor` del tema, y
el test `AppRoutes.test.tsx:77` lo comprueba), pero es una transición visible. El
informe identifica correctamente la mitigación canónica —
`future={{ v7_startTransition: true }}` en el `BrowserRouter` — y la deja fuera
por tocar `src/main.tsx` con una decisión de arquitectura ajena al `acceptance`
(`impl_22.md:140-146`). Coincido con la decisión; queda como candidata a feature
propia, no como fallo de esta.

### 4. Los tests existentes siguen verdes sin tocar aserciones — **cumplido**

- `git diff --stat -- 'src/**/__tests__/*'` **vacío**: ningún archivo de test
  trackeado (`ContactModal`, `MarkdownRenderer`, `Login`, `LeadsList`,
  `ArticlesList`, `BlogIndex`, `BlogArticle`) fue modificado.
- Los tests untracked de las features 17-21 conservan su `mtime` original salvo
  `NotFound.test.tsx` (23:55, ventana de la 22). En él, el único cambio es el
  wrapper: `renderAt` pasa a `async` y espera con `waitForElementToBeRemoved` a
  que desaparezca el fallback (`NotFound.test.tsx:26-36`). Las 7 pruebas y sus
  aserciones siguen siendo las que `progress/review_17.md:64-67` inventarió:
  `getByRole('link', {name:/volver al inicio/i})` con `href="/"` (:62-63),
  `getByRole('banner')` / `getByRole('contentinfo')` (:70,:74),
  `container.textContent?.trim().length > 0` (:56) y las cuatro negativas
  `queryByRole(/página no encontrada/i) → not.toBeInTheDocument()` (:85, :92,
  :99, :106). Ninguna se relajó ni se borró. El único cambio dentro de un `it` es
  `getByRole` → `findByRole` en `:91` (`/blog`), que es exactamente el ajuste por
  asincronía que el `acceptance` autoriza: misma query, mismo matcher.

---

## Comprobaciones extra que pediste

**La landing no empeoró.** `src/App.tsx:1-20` conserva todos los imports
estáticos de sus secciones (`Hero`, `Pain`, `Solution`, …): no se tocó.
`AppRoutes.tsx:3-7` importa `App`, `LegalPage`, `NotFound` y `legalDocs` de forma
estática. Verificado sobre el `dist/` real, no solo por lectura: las cadenas
`Crea agentes de IA` (landing), `Página no encontrada` / `Volver al inicio` (404)
y `maia-legal-lang` (`LegalPage`) están **todas** en `index-DPYmTf_f.js`, el
chunk de entrada. Ni `/`, ni `/privacidad`, ni `/terminos`, ni el comodín
introducen un round-trip. El test `AppRoutes.test.tsx:87` fija la regla:
`/` renderiza su `h1` sin pasar por el fallback.

**`AdminGuard` sigue funcionando.** La cadena guardia → layout → página está
ejercitada, no solo compilada: `AppRoutes.test.tsx:113` monta `/admin` con sesión
y espera el saludo `Bienvenido, Ana`, que `AdminHome` obtiene por
`useOutletContext` — si el `Suspense` interno hubiera quedado por encima del
`<Outlet context={user} />` en vez de por debajo, ese saludo no existiría.
`AppRoutes.test.tsx:123` cubre la redirección a `/admin/login` sin sesión, y
`:131` la persistencia del sidebar (mutation-testeado arriba). El render prop
sobrevive porque `React.lazy` no altera la firma de las props
(`AppRoutes.tsx:59-61` typecheca en exit 0).

**Docs.** `docs/architecture.md` §3 (líneas 110-111) y §10 (línea 276) y
`docs/context.md` §4 describen lo que el código hace de verdad: los 9 componentes
perezosos, los dos niveles de `Suspense`, las tres excepciones estáticas y los
números 2 525 → 1 585 kB / 35 → 1,3 kB, todos ellos confirmados por mi build.

---

## Observaciones (no bloquean, para el leader)

1. `README.md:32-33` y `docs/verification.md:31-33` siguen justificando el aviso
   `>500 kB` con "bundle monolítico, ver `docs/architecture.md` §10", y
   `docs/architecture.md:5` sigue diciendo "sirve tres productos **en un solo
   bundle**". La instrucción operativa (el aviso es esperado, no es fallo) sigue
   siendo válida, pero la causa ya no es esa: ahora el aviso lo produce `three`,
   estático en `Hero.tsx:5`. Son tres frases obsoletas, ninguna en los archivos
   que la feature declaró tocar. Conviene una pasada `docs/` en la próxima
   feature de documentación, no un rework de la 22.
2. `docs/architecture.md` §8 sigue diciendo "9 archivos de test, 44 tests" cuando
   la realidad es 12 / 68. Es staleness **anterior** a esta feature (ya estaba mal
   con 11/61) y el implementer la señala en `current.md:101-103`; la anoto para
   que no se pierda.
3. Riesgo estructural bien identificado en `impl_22.md` §4.2: `sections/Blog.tsx`
   cae hoy dentro del chunk de `BlogIndex` **solo porque `<Blog />` está comentado
   en `App.tsx:47`**. Si alguien reactiva esa sección, `BlogCard` vuelve al chunk
   de entrada sin que nada avise. No es deuda que esta feature debiera resolver
   (mover el componente es refactor de ubicación), pero merece una feature propia.
4. La primera entrada a una ruta anidada del admin encadena dos saltos de red
   (`AdminGuard`/`AdminLayout` → página). Coste asumido y declarado; el admin no
   es la ruta crítica del negocio.

## Detalle de los fallos

Ninguno bloqueante. No hay incumplimientos de C1-C11.
