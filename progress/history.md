# Historial de sesiones

> Bitácora **append-only**. Cada cierre de sesión añade su bloque al final,
> copiado de `progress/current.md`. Nunca se edita ni se borra lo anterior.

Formato de cada entrada:

```markdown
## <fecha> — Feature <id>: <nombre>

**Estado final:** done | blocked | parcial
**Rama / commit:** <rama> · <sha corto>

**Qué se hizo:** 2-4 bullets.
**Decisiones:** las que un futuro agente no podría deducir del diff.
**Verificación:** test / typecheck / build.
**Pendiente:** lo que quedó abierto, si algo.
```

---

## 2026-07-27 — Arnés: documentación de soporte

**Estado final:** done
**Rama / commit:** `main` · (sin commitear)

**Qué se hizo:**

- Se crearon los documentos que `AGENTS.md` referenciaba pero no existían:
  `docs/context.md`, `docs/conventions.md`, `docs/verification.md`,
  `docs/api-contract.md`, `feature_list.json` y `progress/`.
- Se reescribió `CHECKPOINT.md`, que contenía criterios de otro proyecto
  (Laravel/PHP: `node init.js`, `php artisan test`, Pest, controllers/Services).
- Se corrigieron desalineaciones de `AGENTS.md` con el código real (Tailwind →
  MUI + Emotion, carpeta `tests/` → `__tests__/` junto al código, skill
  `react-specialist` → `vercel-react-best-practices`).
- Se alinearon las definiciones de `.claude/agents/*` con los comandos y agentes
  que existen de verdad.

**Decisiones:**

- El backlog de `feature_list.json` arranca en el id 17: los ids 1-16 son la
  construcción original de la app, ya en producción, y se documentan en
  `docs/architecture.md` en vez de re-listarse como tareas.
- Las features `pending` salen de la deuda ya documentada en
  `docs/architecture.md` §10, no de deseos inventados.

**Verificación:** `npm test` 34/34 · `npm run typecheck` 0 · `npm run build` 0.
Sin cambios en `src/`.

**Pendiente:** feature 17 (ruta 404) es la siguiente `pending` de menor id.

---

## 2026-07-27 — Feature 17: Ruta 404

**Estado final:** done (`APPROVED` en `progress/review_17.md`, sin ningún
checkpoint de `CHECKPOINT.md` en `[ ]`)
**Rama / commit:** `main` · (sin commitear)

**Qué se hizo:**

- Nueva página `src/pages/NotFound.tsx`: `Navbar` + bloque 404 (`404` grande, `h1`
  "Página no encontrada", copy en español) + `Footer`, con un botón
  `component={RouterLink} to="/"` "Volver al inicio".
- Se extrajo la tabla de rutas de `src/main.tsx` a `src/AppRoutes.tsx` y se añadió
  `<Route path="*" element={<NotFound />} />` como última ruta. `main.tsx` queda
  reducido al bootstrap (`StrictMode → ThemeProvider → CssBaseline →
  BrowserRouter → <AppRoutes />`).
- Nuevo `src/pages/__tests__/NotFound.test.tsx` (7 tests) que monta el `AppRoutes`
  real en `MemoryRouter`: cubre el 404 en `/ruta-que-no-existe`, el enlace de
  vuelta a `/`, la presencia de Navbar (`banner`) y Footer (`contentinfo`), y que
  `/`, `/blog`, `/privacidad` y `/admin/login` siguen resolviendo a su página y no
  al comodín.
- Informe completo en `progress/impl_17.md`; review en `progress/review_17.md`.

**Decisiones:**

- El `acceptance` pedía el `<Route path="*">` dentro de `main.tsx`, pero ese
  archivo ejecuta `ReactDOM.createRoot(...)` al importarse y no se puede montar en
  jsdom. Se extrajo el árbol de `<Routes>` a un componente exportable en vez de
  duplicar la tabla de rutas en el test: una sola fuente de verdad, la misma que
  corre en producción. Desvío aceptado explícitamente por el reviewer. Efecto
  colateral útil: la feature 22 (code splitting) ya encuentra el árbol de rutas
  aislado.
- `Navbar` exige `onOpenContact`, así que `NotFound` monta su propio
  `ContactModal` con `useState` local, replicando el patrón de `App.tsx`, para no
  dejar muerto el botón "Agenda un demo". Sin state manager nuevo.
- Estilos solo con tokens del tema vía `sx` (`primary.main`, `surface.soft`,
  `text.secondary`): cero hex hardcodeados y ningún token nuevo, así que no hubo
  que tocar `theme.ts` ni `globals.css`.
- El `404` se renderiza como `<p>` decorativo para dejar un único `h1` en la
  página.
- Para montar la ruta `/` en jsdom el test necesita dos stubs acotados al propio
  archivo: `IntersectionObserver` (lo usan `Hero` y `useReveal`) y el módulo
  `vanta/dist/vanta.net.min` (requiere WebGL). No se mockeó `src/lib/api.ts`.
- No se tocó deuda de otras features (18 flag `enabled`, 21 `useReveal`,
  22 code splitting, 23 tokens duplicados) ni infraestructura.

**Verificación:** `npm test` 8 archivos / 41 tests (baseline 7/34 + 7 nuevos),
exit 0 · `npm run typecheck` exit 0 · `npm run build` exit 0 (con el aviso
esperado de chunk >500 kB). Ejecutada también de forma independiente por el
reviewer.

**Pendiente:**

- Comprobación visual de la 404 a **360 px y 1440 px** con `npm run dev`: quedó
  sin hacer por ser sesión headless (`docs/verification.md` §6). El layout
  reutiliza el patrón responsive ya en producción, pero conviene que un humano lo
  confirme.
- Siguiente `pending` de menor id: feature 18 (eliminar el flag muerto `enabled`
  de `AdminLayout`).

---

## 2026-07-27 — Feature 18: Eliminar el flag muerto `enabled` de AdminLayout

**Estado final:** done (`APPROVED` en `progress/review_18.md`, sin ningún
checkpoint de `CHECKPOINT.md` en `[ ]`)
**Rama / commit:** `main` · (sin commitear)

**Qué se hizo:**

- Se eliminó el campo `enabled` de los tres items de `NAV_ITEMS` en
  `src/admin/AdminLayout.tsx` y el ternario `item.enabled ? … : …` del `.map`. La
  rama `else` (un `<Box aria-disabled="true">` con un `<Typography>próximamente`)
  era inalcanzable porque los tres items venían con `enabled: true`. El `.map`
  devuelve ahora directamente el `<NavLink>`, con el mismo `key`, `to`, `end` y el
  mismo callback `style`. Neto: −25 líneas, cero cambio de render.
- Se actualizó el JSDoc del componente, que describía las secciones "Leads" y
  "Blog" como placeholders deshabilitados pendientes de las features 16 y 13, y se
  quitaron los comentarios `// feature 16` / `// feature 13` de `NAV_ITEMS`: eran
  documentación del código muerto que se estaba borrando.
- Nuevo `src/admin/__tests__/AdminLayout.test.tsx` (3 tests): los tres enlaces con
  su label, orden y `href`; `aria-current="page"` solo en el item de la ruta
  actual; y ausencia de cualquier item "próximamente" / `aria-disabled`.
- Se sincronizaron las docs que describían lo eliminado o los contadores que
  cambiaron: `docs/architecture.md` §8 y §10, `docs/context.md` §4,
  `docs/verification.md` §1 y §2. Informe en `progress/impl_18.md`; review en
  `progress/review_18.md`.

**Decisiones:**

- Antes de borrar se comprobó con `grep -rn "enabled" src/` que el flag solo vivía
  en `AdminLayout.tsx` (4 coincidencias: las tres del array más la condición).
  Ningún otro archivo lo leía y ningún test cubría la rama muerta — no existía
  `AdminLayout.test.tsx` ni ningún test buscaba "próximamente".
- El `acceptance` no exigía test (`docs/verification.md` §5 no pide test para
  eliminar código muerto sin cambio de comportamiento), pero el criterio 2 ("con
  el mismo marcado activo") no tenía ninguna red. El test que más valor aporta es
  el de `aria-current`: es lo único que ancla el `end: true` de "Inicio", sin el
  cual "Inicio" quedaría activo en toda ruta `/admin/*` sin que nadie se enterara.
  El reviewer marcó el tercer test (ausencia de "próximamente") como guardia
  tautológica: pasaba igual antes del cambio, solo protege contra reintroducción.
- **Los hex `#E8440A` / `#1A1410` / `#FFF0EB` de `AdminLayout.tsx:66-67` se dejaron
  intactos a propósito.** Violan `docs/conventions.md` §3 en abstracto y aparecen
  como líneas añadidas en el diff, pero solo porque colapsar el ternario reindentó
  el bloque: el contenido es byte a byte el de la rama viva anterior. Van dentro
  del callback `style` de `NavLink` (CSS inline, no `sx`), así que sustituirlos
  exigiría `useTheme()` y cambiaría el render — justo lo que esta feature prohíbe.
  Además la feature 23 los reclama de forma explícita. Tocarlos habría sido un
  fallo de C10.
- Actualizar los contadores de `docs/verification.md` se consideró housekeeping,
  no scope creep: el número cambia *porque* esta feature añade un archivo de test.
  Matiz del reviewer para la próxima vez: cambiar el contador, pero dejar la
  etiqueta "tras la feature N" para el cierre, no antes del veredicto.
- No se tocó deuda de otras features (21 `useReveal`, 22 code splitting, 23 tokens
  duplicados) ni infraestructura.

**Verificación:** `npm test` 9 archivos / 44 tests (baseline 8/41 + 3 nuevos),
exit 0 · `npm run typecheck` exit 0 · `npm run build` exit 0 (con el aviso
esperado de chunk >500 kB). Ejecutada también de forma independiente por el
reviewer.

**Pendiente:**

- `tsconfig.tsbuildinfo` sigue apareciendo modificado en `git status` pese a estar
  en `.gitignore`: está trackeado desde antes, así que cualquier `npm run build`
  lo ensucia. Deuda del repo ya señalada en `progress/review_17.md`; requiere un
  `git rm --cached`, que es decisión de un humano.
- Sigue pendiente de la feature 17 la comprobación visual de la 404 a 360 px y
  1440 px.
- Siguiente `pending` de menor id: feature 19 (actualizar `README.md` al estado
  real del proyecto).

---

## 2026-07-27 — Feature 19: Actualizar `README.md` al estado real del proyecto

**Estado final:** done (`APPROVED` en `progress/review_19.md`, sin ningún
checkpoint de `CHECKPOINT.md` en `[ ]`)
**Rama / commit:** `main` · (sin commitear)

**Qué se hizo:**

- Se reescribió `README.md` por completo. El anterior describía el proyecto previo
  al router y **todos** sus datos operativos eran falsos: puerto `5173` (real
  `5174`, `vite.config.ts:7`), proxy a `:3001` (real `:3002`, `vite.config.ts:11`),
  "la landing es one-page, no hay router" (hoy `src/AppRoutes.tsx` declara 12
  rutas), árbol con raíz `client/`, `lib/api.ts` "con `postLead` y `EMAIL_RE`" (hoy
  también `apiJson`, `publicJson` y los tipos), sin `pages/` ni `admin/`, sin el
  script `preview`, remitiendo a un `../server/` inexistente y a un `legacy.html`
  que no está en el repo.
- El README nuevo tiene seis bloques cortos: qué es (3 líneas), puesta en marcha
  (`npm install` + `npm run dev` → `http://localhost:5174`, proxy `/api` → `:3002`,
  backend fuera del repo), los cinco scripts reales de `package.json`, la tabla de
  rutas real (incluida la comodín `*` → `NotFound`), `VITE_API_BASE` con su default
  y el aviso de que se inlinea en el bundle, y punteros a `AGENTS.md`,
  `docs/architecture.md`, `docs/context.md`, `docs/conventions.md`,
  `docs/verification.md` y `docs/api-contract.md`.
- Se retiraron las dos afirmaciones que este cambio volvía falsas:
  `docs/architecture.md` §10 (última viñeta, reformulada: el README orienta y
  remite, architecture manda si algo se contradice) y `docs/context.md` §4 (viñeta
  "README desactualizado", sustituida por la discriminación manual de respuestas).
- Informe en `progress/impl_19.md`; review en `progress/review_19.md`.

**Decisiones:**

- **Cada dato se contrastó contra la fuente, no contra el encargo ni contra
  `docs/architecture.md`**: scripts desde `package.json:6-12`, puerto y proxy desde
  `vite.config.ts`, tabla de rutas transcrita de `src/AppRoutes.tsx` línea por
  línea. Coincide con architecture §1, §3 y §9, pero por verificación, no por copia.
- El `acceptance` permitía **o** incluir la tabla de rutas **o** remitir a
  `docs/architecture.md` §3, sin duplicar a medias. Se eligió incluirla: es lo
  primero que busca un humano al entrar. Todo lo demás (árbol de `src/`, capa de
  datos, estilos, testing, deploy) se remite y **no** se repite. Coste asumido y
  señalado por el reviewer: una feature futura que añada o quite una ruta deberá
  tocar los dos sitios, y conviene ponerlo en su `acceptance`.
- **Sin cifras volátiles en el README**: no se pusieron "9 archivos / 44 tests" ni
  el tamaño del bundle. Envejecen a la primera feature; viven en
  `docs/verification.md` §2 y `docs/architecture.md`, que sí se actualizan por
  feature. Es la causa raíz de que el README anterior se desincronizara.
- Se eliminó la sección "Tema" del README viejo en vez de reescribirla:
  `docs/conventions.md` §3 y `docs/architecture.md` §6 la cubren mejor. Efecto
  colateral: desaparece el hex `#E8440A` que el README hardcodeaba.
- En `docs/context.md` §4 la viñeta se **sustituyó** en lugar de solo borrarse: la
  sección es una lista de deuda conocida y la nueva viñeta (`'rows' in data`) es
  deuda real ya documentada en architecture §10 y origen de la feature 20. Se
  evitó duplicar la de bundle monolítico, que ya encabeza la lista.
- Feature de solo documentación: no aporta tests (`docs/verification.md` §5 no
  exige test para cambios fuera de `src/`), pero el bloque completo se ejecutó
  igual, antes y después. Como red adicional se corrió
  `grep -rn "5173\|3001\|legacy.html\|No hay router\|client/" README.md docs/*.md AGENTS.md`
  → sin coincidencias.
- No se tocó `src/`, ni infraestructura (`package.json`, `vite.config.ts`,
  `tsconfig.json`, `vercel.json`, `.gitignore`), ni deuda de las features 20-23.
  Ningún `.env*` leído ni escrito.

**Verificación:** `npm test` 9 archivos / 44 tests, exit 0 · `npm run typecheck`
exit 0 · `npm run build` exit 0 (con el aviso esperado de chunk >500 kB). Sin
delta respecto al baseline, como corresponde a un cambio solo de documentación.
Ejecutada dos veces por el implementer (baseline y post-cambio) y una tercera de
forma independiente por el reviewer.

**Pendiente:**

- Observación menor del reviewer: la entradilla del README nombra landing, blog y
  admin pero no las páginas legales; quedan documentadas en la tabla de rutas.
- La tabla de rutas del README duplica deliberadamente `docs/architecture.md` §3:
  recordarlo en el `acceptance` de cualquier feature que cambie rutas.
- Sigue abierta la deuda del repo con `tsconfig.tsbuildinfo` (trackeado pese a
  estar en `.gitignore`); requiere un `git rm --cached`, decisión de un humano.
- Sigue pendiente de la feature 17 la comprobación visual de la 404 a 360 px y
  1440 px.
- Siguiente `pending` de menor id: feature 20 (helper de normalización de
  respuestas de la API).

---

## 2026-07-27 — Feature 20: Helper de normalización de respuestas de la API

**Estado final:** done (`APPROVED` en `progress/review_20.md`, sin ningún
checkpoint de `CHECKPOINT.md` en `[ ]`)
**Rama / commit:** `main` · (sin commitear)

**Qué se hizo:**

- `src/lib/api.ts` **añade** `normalizeApi(call, key, fallbackError?)`, que
  convierte la forma cruda `{ ok, status, data }` en la unión discriminada
  `{ ok: true, status, data } | { ok: false, status, error }`. Con ella van los
  tipos `ApiSuccess<T>` / `ApiFailure` / `ApiOutcome<T>`, la constante
  `GENERIC_API_ERROR` y el helper interno `readErrorMessage()`. `ApiResult<T>`
  pasa de `interface` privada a `export interface` (cambio de visibilidad, no de
  forma: aparece en la firma pública del helper).
- Migrados **dos consumidores reales**: `src/pages/BlogIndex.tsx` (vía
  `publicJson`) y `src/admin/leads/LeadsList.tsx` (vía `apiJson`). Sus tests
  siguen verdes **sin tocar una línea**, incluidas las aserciones sobre
  `fetch.mock.calls` (`/api/articles` en `BlogIndex.test.tsx`, `?q=ana` en
  `LeadsList.test.tsx`).
- Nuevo `src/lib/__tests__/api.test.ts` (7 tests) con `vi.spyOn(globalThis,
  'fetch')` y `Response` reales: 200 con body, 200 sin body, 200 con body sin la
  clave esperada, 401 con `{ error }`, 500 sin body, rechazo de `fetch`, y un
  candado que fija que `listAdminLeads` conserva la forma cruda y el contrato
  HTTP (`GET /api/admin/leads?q=ana` con `credentials: 'include'`).
- `docs/api-contract.md` §1 documenta la forma normalizada (firma, tabla de casos
  y nota de aditividad). Informe en `progress/impl_20.md`; review en
  `progress/review_20.md`.

**Decisiones:**

- **El helper recibe la promesa, no el resultado ya resuelto.** Permite
  `await normalizeApi(listAdminLeads({…}), 'rows')` en una línea y le deja
  capturar también el rechazo de `fetch`.
- **`key` obligatoria en vez de "si hay body, es éxito".** Es la generalización
  literal del patrón repetido `ok && data && 'rows' in data`. Sin ella, un `200`
  con body `{}` contaría como éxito y `res.data.rows` sería `undefined` →
  `rows.map` reventaría en `BlogIndex`. `K extends keyof T & string` valida la
  clave contra el tipo del payload: `'rowss'` no compila. `T` y `K` se infieren
  en el call site.
- **`200` sin body ⇒ `{ ok: false }`**, que es exactamente lo que hacen hoy los
  consumidores (`data` es `null` ⇒ caen al `else` de error). Se prefirió preservar
  el comportamiento observable antes que "mejorarlo".
- **El helper captura el rechazo de `fetch`** (fallo de red) y devuelve
  `{ ok: false, status: 0 }` — `status: 0` = no hubo respuesta HTTP.
  `docs/context.md` §3 fija que la capa de datos no lanza, y hoy un fallo de red
  produce un rechazo no manejado dentro del `useEffect` que deja el spinner
  colgado. Es la única diferencia de comportamiento respecto al código anterior, y
  solo en un camino que ya estaba roto. Se señaló explícitamente al reviewer como
  el punto discutible; lo aprobó.
- **`GENERIC_API_ERROR` exportado** para que el mensaje por defecto sea uno solo y
  testeable. Los consumidores con copy propio lo pasan como `fallbackError`, así
  que no cambia ni una palabra de lo que ve el usuario: `BlogIndex` mantiene su
  mensaje fijo e ignora el del backend, `LeadsList` sigue prefiriendo el `error`
  del backend con "No pudimos cargar los leads" de respaldo.
- **Por qué esos dos consumidores:** cubren los dos transportes distintos
  (`publicJson` con `credentials: 'omit'` y `apiJson` con `'include'`), los dos
  estilos de manejo de error del repo, y **ambos ya tenían test con aserciones
  sobre `fetch.mock.calls`** — que es justo la prueba de que la migración es
  transparente a nivel HTTP. Descartados: `ContactModal` (flujo crítico de
  captación de leads y su `{ ok, id }` no encaja igual de limpio con la
  comprobación por clave), `AdminGuard` (afecta al acceso de toda el área privada)
  y `ArticleEdit` (tres llamadas en el mismo componente, migración mayor de la que
  pide "al menos dos consumidores").
- **Aditividad confirmada por el reviewer sobre las 13 firmas existentes**
  (`postLead`, `login`, `logout`, `getMe`, `listAdminLeads`, `getAdminLead`,
  `listAdminArticles`, `getAdminArticle`, `createAdminArticle`,
  `updateAdminArticle`, `deleteAdminArticle`, `listPublicArticles`,
  `getPublicArticleBySlug`): todas siguen devolviendo `{ ok, status, data }`, y
  los consumidores no migrados (`ContactModal`, `Login`, `AdminGuard`,
  `AdminLayout`, `ArticlesList`, `ArticleEdit`, `BlogArticle`, `sections/Blog`) no
  se tocaron. Sin cambios en URLs, métodos, headers ni política de cookies.
- Se dejó `PublicApiResult<T>` intacto: es estructuralmente idéntico a
  `ApiResult<T>`, así que `publicJson` encaja en `normalizeApi` sin tocarlo.
  Unificarlos sería refactor fuera de scope.
- No se tocó infraestructura (`package.json`, `vite.config.ts`, `tsconfig.json`,
  `vercel.json`, `.gitignore`) ni la deuda de las features 21/22/23. Ningún
  `.env*` leído ni escrito.

**Verificación:** `npm test` 10 archivos / 51 tests (baseline 9/44 + 7 nuevos),
exit 0 · `npm run typecheck` exit 0 · `npm run build` exit 0 (con el aviso
esperado de chunk >500 kB). Ningún test existente modificado ni saltado.
Ejecutada también de forma independiente por el reviewer.

**Pendiente:**

- Observación no bloqueante del reviewer (a): **migrar el resto de consumidores a
  `normalizeApi` queda para futuras features** — la migración es incremental por
  diseño, y el `acceptance` de la 20 solo exigía dos.
- Observación no bloqueante del reviewer (b): **`BlogIndex.test.tsx` no fija
  `credentials: 'omit'` en su aserción**, así que el transporte público se queda
  sin un candado equivalente al que sí tiene `apiJson` en
  `src/lib/__tests__/api.test.ts`.
- Sigue abierta la deuda del repo con `tsconfig.tsbuildinfo` (trackeado pese a
  estar en `.gitignore`); requiere un `git rm --cached`, decisión de un humano.
- Sigue pendiente de la feature 17 la comprobación visual de la 404 a 360 px y
  1440 px.
- Siguiente `pending` de menor id: feature 21 (`useReveal` observa contenido
  montado después del primer render).

---

## 2026-07-27 — Feature 21: `useReveal` observa contenido montado después del primer render

**Estado final:** done (`APPROVED` en `progress/review_21.md`, sin ningún
checkpoint de `CHECKPOINT.md` en `[ ]`)
**Rama / commit:** `main` · (sin commitear)

**Qué se hizo:**

- `src/hooks/useReveal.ts` añade un `MutationObserver` sobre `document.body` con
  `{ childList: true, subtree: true }` que recoge los `.reveal` montados después
  del primer render. Antes solo se hacía un `querySelectorAll('.reveal')` en el
  montaje, así que cualquier nodo insertado más tarde (listados asíncronos,
  secciones condicionales) se quedaba con el `opacity: 0` de `.reveal`
  (`globals.css:102`) **para siempre**, porque nunca recibía `.visible`.
- El `IntersectionObserver` queda **intacto**: mismas opciones
  (`threshold: 0.08`, `rootMargin: '0px 0px -30px 0px'`), misma callback y el
  mismo `io.unobserve(e.target)` tras revelar — revelar sigue siendo de una sola
  vez y no se re-oculta al salir del viewport. Un `WeakSet<Element>` evita
  re-observar y el selector pasa a `.reveal:not(.visible)`. El cleanup del efecto
  desconecta **los dos** observers (`mo.disconnect(); io.disconnect();`).
- Nuevo `src/hooks/__tests__/useReveal.test.tsx` (10 tests) con un stub de
  `IntersectionObserver` disparable a mano: 4 de no-regresión del primer render
  (observa lo inicial, conserva las opciones, añade `.visible` + `unobserve`, no
  toca lo ya `.visible`), 4 de contenido diferido (nodo anidado en un subárbol
  insertado, su revelado, nodo insertado que él mismo es el `.reveal`, y no
  observar dos veces) y 2 de limpieza (`disconnect` del IO y, tras `unmount()`,
  un `.reveal` nuevo en el `body` que **no** llega al observer).
- Informe en `progress/impl_21.md`; review en `progress/review_21.md`.

**Decisiones:**

- **Por qué `MutationObserver`.** Descartados: *polling* con `setInterval`
  (coste constante y perpetuo en la página pública para un DOM que casi nunca
  muta, más latencia visible antes de animar) y exponer un `register(el)` que
  llamara cada sección (obliga a tocar todas las secciones, cambia la superficie
  del hook, y el bug volvería en el próximo listado asíncrono que se olvidara de
  llamarlo). `MutationObserver` es la única opción pasiva (coste cero sin
  mutaciones), automática y local al hook: no cambia su API ni obliga a tocar
  `App.tsx`.
- **Cómo se acotó el coste**, que era la preocupación real por correr en la
  landing pública: (1) solo `childList` + `subtree`, sin `attributes` ni
  `characterData` — con `attributes` la callback saltaría en cada cambio de estilo
  de Emotion y en cada tick de los contadores animados del `Hero`; (2) **nunca se
  re-escanea el documento entero**: el `querySelectorAll` global ocurre una sola
  vez, en el montaje, y en cada mutación el trabajo es proporcional a lo que
  cambió (solo `addedNodes` y sus subárboles); (3) descarte temprano de nodos que
  no son `Element` — la mayoría de las mutaciones de React son nodos de texto;
  (4) `WeakSet` de observados, que además no retiene nodos ya eliminados.
- `scanAdded` comprueba `el.matches(...)` **además** de `el.querySelectorAll(...)`
  porque `querySelectorAll` no incluye la raíz: el nodo insertado puede ser él
  mismo el `.reveal`.
- **`.reveal:not(.visible)` se aplicó también al escaneo inicial.** Es el único
  punto donde difiere del original (antes `.reveal` a secas) y es equivalente en
  comportamiento observable: nada en el proyecto quita `.visible`, y para un nodo
  que ya la tuviera la ruta antigua se limitaba a añadírsela otra vez (no-op) y
  desobservarlo. Se aplicó porque la feature pide explícitamente no revelar
  nodos ya `.visible` y porque abarata el escaneo inicial.
- **Comprobación anti-falso-positivo:** se restauró temporalmente el hook
  original con `git checkout src/hooks/useReveal.ts` y se corrió el archivo de
  test: **5 de los 10 fallan** (los cuatro de contenido diferido y el de
  `.visible` previo) y los 5 de no-regresión pasan. Es decir, los tests nuevos
  capturan el bug de verdad y los de no-regresión describen el comportamiento que
  ya existía.
- **No se tocó `src/styles/globals.css`**: `.reveal` / `.reveal.visible` ya eran
  correctos; el defecto estaba solo en el hook. Tampoco `App.tsx`, ni
  infraestructura (`package.json`, `vite.config.ts`, `tsconfig.json`,
  `vercel.json`, `.gitignore`), ni la deuda de las features 22/23. Ningún `.env*`
  leído ni escrito.
- No aplica el §6 de `docs/verification.md` (verificación manual a 360/1440 px):
  el cambio no toca marcado, copy ni `sx` de ninguna sección — es lógica de un
  hook, y el comportamiento visible del primer render queda protegido por los
  cuatro tests de no-regresión.

**Verificación:** `npm test` 11 archivos / 61 tests (baseline 10/51 + 10 nuevos),
exit 0 · `npm run typecheck` exit 0 · `npm run build` exit 0 (con el aviso
esperado de chunk >500 kB; el bundle pasa de 2 524.92 kB a 2 525.23 kB, +0.31 kB
por el `MutationObserver`). Ningún test existente modificado ni saltado.
Ejecutada también de forma independiente por el reviewer.

**Pendiente:**

- Observación no bloqueante del reviewer (a): **`useReveal()` se invoca desde
  `src/App.tsx:32` y también desde `src/components/sections/Blog.tsx:107`**, así
  que si ambos llegan a estar montados a la vez hay **dos pares de observers
  sobre los mismos nodos**. Es preexistente y el resultado observable es idéntico
  (añadir `.visible` una vez), pero ahora cuesta también un `MutationObserver` de
  más. Candidato a una feature futura que decida un único punto de invocación.
- Observación no bloqueante del reviewer (b): el `IntersectionObserver` puede
  **retener targets ya desprendidos del DOM** si nunca llegan a intersecar.
  Mitigable tratando los `removedNodes` de las mutaciones para desobservarlos;
  queda para backlog futuro.
- Sigue abierta la deuda del repo con `tsconfig.tsbuildinfo` (trackeado pese a
  estar en `.gitignore`); requiere un `git rm --cached`, decisión de un humano.
- Sigue pendiente de la feature 17 la comprobación visual de la 404 a 360 px y
  1440 px.
- `docs/architecture.md` §4 y §10 siguen describiendo "`useReveal` solo observa
  el DOM inicial" como deuda vigente: el líder se encarga de actualizarlo.
- Siguiente `pending` de menor id: feature 22 (code splitting por ruta).

---

## 2026-07-27 — Feature 22: Code splitting por ruta

**Estado final:** done (`APPROVED` en `progress/review_22.md`, sin ningún
checkpoint de `CHECKPOINT.md` en `[ ]`; el reviewer contrastó la tabla de
tamaños contra su propio `npm run build`)
**Rama / commit:** `main` · (sin commitear)

**Qué se hizo:**

- `src/AppRoutes.tsx` pasa **9 rutas a `React.lazy`** con ruta literal en cada
  `import()`: las dos páginas del blog (`BlogIndex`, `BlogArticle`) y todo el
  admin (`Login`, `AdminGuard`, `AdminLayout`, `AdminHome`, `LeadsList`,
  `ArticlesList`, `ArticleEdit`). `App` (la landing y todas sus secciones),
  `LegalPage` y `NotFound` **siguen estáticos a propósito**.
- Nuevo `src/components/RouteFallback.tsx`: fallback compartido de `<Suspense>`
  con `role="status"` + `aria-label="Cargando"` + `aria-live="polite"`,
  `bgcolor: 'surface.soft'` y spinner en `primary.main` (tokens del tema, cero
  hex), y `minHeight` configurable para reservar alto.
- **Dos niveles de `<Suspense>`**: uno alrededor de `<Routes>` (rutas de primer
  nivel, `minHeight: '100vh'`) y otro por cada hijo del `<Outlet />` del admin
  (`AdminPage`, `minHeight: 320`).
- Nuevo `src/__tests__/AppRoutes.test.tsx` (7 tests): fallback presente en el
  primer render con un `progressbar` dentro, `/` sin pasar por el fallback,
  sustitución del fallback por la página real, `/blog/:slug` perezoso pidiendo
  `/api/articles/:slug`, `AdminGuard` + `AdminLayout` perezosos inyectando el
  usuario por el `Outlet`, redirección de la guardia sin sesión, y sidebar que
  sobrevive a la navegación interna del panel.
- `docs/architecture.md` §3 y §10 y `docs/context.md` §4 dejan de describir el
  bundle monolítico como deuda vigente. Informe en `progress/impl_22.md`; review
  en `progress/review_22.md`.

**Cifras reales antes / después (`npm run build`):**

| Artefacto de entrada | Antes | Después | Δ |
|----------------------|-------|---------|---|
| JS de entrada | 2 525,23 kB (gzip 779,07) | **1 584,84 kB** (gzip 450,43) | **−940,39 kB (−37,2 %)**; gzip −328,64 kB (−42,2 %) |
| CSS de entrada | 35,12 kB (gzip 6,53) | **1,27 kB** (gzip 0,63) | −33,85 kB (−96,4 %) |
| Total de entrada | 2 560,35 kB (gzip 785,60) | **1 586,11 kB** (gzip 451,06) | −974,24 kB (−38,1 %) |

Chunks emitidos después: `index` 1 584,84 · `ArticleEdit` 896,69 (+ su CSS
33,84) · `vanta.net.min` 13,56 · `LeadsList` 12,00 · `TableRow` 6,39 ·
`BlogArticle` 5,81 · `AdminLayout` 5,36 · `ArticlesList` 4,11 · `BlogIndex`
3,98 · `MarkdownRenderer` 3,23 · `Login` 2,28 · `AdminHome` 1,15 · `AdminGuard`
0,65 kB. Antes solo había `index` 2 525,23 + `vanta.net.min` 13,56.

**Decisiones:**

- **`App` no se hizo perezosa.** Es la ruta crítica de captación de leads
  (`docs/context.md` §1): un `import()` ahí añadiría un round-trip justo donde
  la feature quiere mejorar. Lo mismo con `NotFound` (destino del comodín) y
  `LegalPage`, que además el `acceptance` no menciona.
- **El peso gordo era `@uiw/react-md-editor`**: 896,69 kB de JS + 33,84 kB de
  CSS que ahora solo se descargan al abrir `/admin/articles/new` o
  `/admin/articles/:id`. Eso explica por sí solo el grueso de la mejora y que el
  CSS de entrada caiga a 1,27 kB (lo que queda es `globals.css`, 1 604 bytes; el
  resto de estilos los genera Emotion en runtime).
- **Por qué dos niveles de `Suspense`.** React busca el límite *más cercano*: si
  el único estuviera sobre `<Routes>`, navegar de `/admin/leads` a
  `/admin/articles` desmontaría `AdminGuard` y el sidebar entero, perdiendo el
  estado del guard y disparando otro `GET /api/auth/me`. El límite interno va en
  el `element` de cada hijo, es decir **por debajo** del
  `<Outlet context={user} />`, así que `useOutletContext()` sigue viendo el
  usuario (lo fija el test del saludo "Bienvenido, Ana").
- **`sections/Blog.tsx` (el `BlogCard` compartido) cae dentro del chunk de
  `BlogIndex`**, no en el de entrada. Verificado sobre el `dist/` real buscando
  la cadena `Leer artículo`: 1 coincidencia en `BlogIndex-*.js`, 0 en
  `index-*.js`. La razón es que `<Blog />` está comentado en `App.tsx:47` y su
  único importador real es `BlogIndex`. **Es frágil**: si alguien reactiva la
  sección en la landing, el módulo pasará a tener un importador estático y
  Rollup lo devolverá al chunk de entrada.
- **Coste asumido en el admin**: la primera entrada a una ruta anidada encadena
  dos saltos (chunk de `AdminGuard`/`AdminLayout` → chunk de la página). Es un
  panel interno, no la ruta crítica del negocio, y a cambio el chunk que
  descarga el visitante de la landing queda estrictamente más pequeño.
- **No se activó `future={{ v7_startTransition: true }}`** en el
  `BrowserRouter`. Sería la mejora canónica contra el flash (React mantendría la
  página anterior visible mientras llega el chunk), pero cambia la semántica de
  actualización del router en toda la app, toca `src/main.tsx` y es una decisión
  de arquitectura que no estaba en el `acceptance`. Queda como observación.
- **`vite.config.ts` no se tocó**: el split por ruta bastó y no hizo falta
  `manualChunks`, que además estaba marcado como bloqueo a escalar.
- **De `NotFound.test.tsx` solo se tocó el wrapper.** `renderAt` pasa a `async`
  y espera con `waitForElementToBeRemoved` a que desaparezca el fallback; cada
  `it` se marca `async` y hace `await renderAt(...)`. **Ninguna aserción cambió**
  (mismas queries síncronas, mismos matchers). Antes del ajuste fallaba
  exactamente 1 de los 7 (`/admin/login`), lo que confirma que el resto no
  dependía del cambio.
- El `acceptance` decía "los 34 tests existentes" y `files: ["src/main.tsx"]`;
  ambos venían desactualizados (baseline real 61 tests, y la tabla de rutas vive
  en `src/AppRoutes.tsx` desde la feature 17). Se trabajó sobre el estado real y
  no se editó `feature_list.json` más allá del `status`.
- No se tocó infraestructura (`package.json`, `vite.config.ts`, `tsconfig.json`,
  `vercel.json`, `.gitignore`) ni la deuda de la feature 23. Ningún `.env*`
  leído ni escrito.

**Verificación:** `npm test` 12 archivos / 68 tests (baseline 11/61 + 7 nuevos),
exit 0 · `npm run typecheck` exit 0 · `npm run build` exit 0. El aviso de chunk
>500 kB **sigue apareciendo y es esperado**: lo que queda dentro de la entrada es
`three`, importado de forma **estática** en `src/components/sections/Hero.tsx:5`
(`import * as THREE from 'three'`) aunque el efecto Vanta se cargue con
`import()`. Ejecutada también de forma independiente por el reviewer, que
contrastó las cifras de la tabla contra su propio build.

**Pendiente:**

- **El punto 3 del `acceptance` ("no hay flash ni pantalla en blanco al navegar
  entre rutas") quedó razonado de forma estructural, NO verificado en
  navegador**: la sesión es headless. El argumento es que cada ruta perezosa de
  primer nivel es una página completa sustituida por un placeholder de página
  completa con `minHeight: '100vh'` y colores del tema (sin colapso de alto ni
  rectángulo blanco), y que el límite interno del admin deja el sidebar montado.
  **Hace falta que un humano lo confirme con `npm run dev`** navegando
  `/` → `/blog` → `/blog/:slug` → `/admin/login` → `/admin` → `/admin/leads` →
  `/admin/articles/new`, según `docs/verification.md` §6.
- `sections/Blog.tsx` seguirá fuera del chunk de entrada **solo mientras
  `<Blog />` siga comentado en `App.tsx`**. Si una feature futura reactiva la
  sección, conviene mover `BlogCard` a `src/components/` o asumir que vuelve a
  la entrada.
- Sacar `three` del chunk de entrada (importado estáticamente por `Hero.tsx`) es
  lo único que queda para bajar del aviso de 500 kB; no estaba en este
  `acceptance` y quedó anotado en `docs/architecture.md` §10.
- `docs/architecture.md` §8 sigue diciendo "9 archivos de test, 44 tests":
  desactualizado desde antes de esta sesión.
- Sigue abierta la deuda del repo con `tsconfig.tsbuildinfo` (trackeado pese a
  estar en `.gitignore`); requiere un `git rm --cached`, decisión de un humano.
- Sigue pendiente de la feature 17 la comprobación visual de la 404 a 360 px y
  1440 px.
- Siguiente `pending` de menor id: feature 23 (unificar los tokens de color
  duplicados).

---

## 2026-07-28 — Feature 23: Unificar los tokens de color duplicados

**Estado final:** done (`APPROVED` en `progress/review_23.md`, sin ningún
checkpoint de `CHECKPOINT.md` en `[ ]`; el reviewer recalculó contra `HEAD` los
18 valores de las variables CSS, las 18 claves de paleta y los 7 overrides de
`MuiButton`, y destacó que el acceptance 3 se declarara pendiente en vez de
fingirse)
**Rama / commit:** `main` · (sin commitear)

**Qué se hizo:**

- Nuevo `src/theme/tokens.ts`: **única fuente de verdad** de los colores, con los
  grupos `brand`, `surface`, `text`, `border`, `feedback`, `accent` (paleta
  categórica decorativa de las tarjetas de `Pain`/`Features`/`Addons`) y
  `external` (marca de WhatsApp). Cada hex literal aparece **una sola vez**: los
  alias (`feedback.successMain`, `text.onBrand`) referencian al token base.
  Exporta además `cssVariables`, el mapa `'--nombre' → token`.
- `src/theme/theme.ts` construye toda su `palette` y los overrides de
  `MuiButton` desde `tokens`, y emite la capa CSS en
  `components.MuiCssBaseline.styleOverrides[':root']`. Los dos `rgba(232,68,10,…)`
  de las sombras del botón pasan a `alpha(tokens.brand.orange, 0.25/0.35)`.
- `src/styles/globals.css` pierde el bloque `:root` y **ya no declara ningún
  color**: solo reset, `body`, `.gradient-text` y las animaciones.
- Barrido de hex hardcodeados en 22 componentes/páginas (`Solution`, `Features`,
  `Pain`, `Addons`, `Pricing`, `Testimonials`, `Integrations`, `Trust`, `ROI`,
  `FAQ`, `Hero`, `CTAFinal`, `Blog`, `Navbar`, `WhatsAppFloat`,
  `MarkdownRenderer`, `LegalPage`, `BlogIndex`, `BlogArticle`, `AdminLayout`,
  `LeadsList`, `LeadDetailDialog`): 60 coincidencias sustituidas por tokens del
  tema, `var(--…)` o import de `tokens`, según el caso.
- Nuevo `src/theme/__tests__/tokens.test.tsx` (7 tests). Docs sincronizadas:
  `docs/architecture.md` §2, §6 (reescrita), §8 y §10; `docs/conventions.md` §3;
  `docs/context.md` §4. Informe en `progress/impl_23.md`; review en
  `progress/review_23.md`.

**Inventario previo (lo que motivó el resto de decisiones):**

Comparadas las dos capas token a token **antes de tocar nada**: **no había
ninguna discrepancia de valor**. Los 15 tokens presentes a la vez en `theme.ts` y
en `globals.css` tenían el mismo hex. Lo único asimétrico era la *cobertura*:
`--bg-strong` (`#252525`) y `--muted` (`#7A6E6A`) existían solo como variable
CSS, y `error.main`, `error.light`, `success.dark` y `primary.contrastText` solo
en el tema. **Esa asimetría se preservó tal cual** — no se inventaron variables
`--error-*` ni se metió `#252525` en la paleta.

**Decisiones:**

- **Dirección de la derivación: TS → CSS**, y por razones técnicas, no de gusto.
  El tema se construye como objeto JS antes de que exista DOM y MUI necesita hex
  reales: `alpha()` y `augmentColor` hacen `decomposeColor`, que **lanza** con
  `var(--x)`. Derivar del CSS obligaría a `getComputedStyle` en tiempo de módulo
  —imposible en los tests, que importan `theme.ts` sin DOM ni `globals.css`— o a
  migrar a `createTheme({ cssVariables: true })`, que renombra todo a
  `--mui-palette-*` y forzaría reescribir los ~90 `var(--…)` del repo.
- **Los nombres de las variables no cambiaron** (`--orange`, `--orange-h`,
  `--bg-soft`, `--border2`, `--muted2`…). Por eso los dos casos de uso siguen
  servidos sin reescribir un solo `sx`: los gradientes y bordes compuestos siguen
  con `var(--…)` y los `sx` que ya usaban `'primary.main'` / `'surface.soft'` no
  se tocaron.
- **Orden de carga analizado**: las variables ahora llegan con el primer render
  (`CssBaseline`) en vez de con el `<link>` del CSS. No hay flash porque el único
  consumidor de `var(--…)` previo al montaje es
  `body { background: var(--bg); color: var(--text) }` y `index.html` sirve un
  `<div id="root">` **vacío** — no hay nada pintado que pueda cambiar de color; y
  desde el primer render el propio `CssBaseline` fija el `body` con
  `background.default` / `text.primary`, que salen de los mismos tokens.
  Contrapartida documentada en architecture §6: un árbol sin `ThemeProvider` +
  `CssBaseline` no tendrá las variables — el caso de los tests, donde tampoco las
  tenía antes.
- **Casi-duplicados detectados y NO unificados por cuenta propia**: `#FFF8F5`
  (`--orange-xxl`) vs `#FFF9F6` (tarjetas de `Solution`, difieren 1/255 por
  canal), y `#FF6B35` (`--orange-l`) vs `#f55c2b` (acento de `Pain`). Se
  conservaron ambos valores de cada par; el segundo del primer par entró como
  token propio `brand.orangeXXXL`. Unificarlos es decisión de diseño.
- **Criterio del barrido**: valor de color suelto en `sx` → token del tema
  (`bgcolor: 'background.paper'`, `color: 'common.white'`, `bgcolor:
  'surface.soft'`, `bgcolor: 'common.black'`); color dentro de string CSS crudo →
  `var(--…)`; valor JS puro (`style={{}}` nativo, arrays de datos, `` `${x}18` ``)
  → import de `tokens`.
- **Hex dejados a propósito**: (a) el `color: '#fff'` de `Pricing.tsx:120`, que
  vive dentro del bloque de CTA **comentado** (líneas 103-132) — código muerto de
  otra tarea; (b) los literales `rgba(...)`, sobre todo `rgba(232,68,10,x)` y
  `rgba(22,163,74,x)` de sombras y gradientes: no son hex y hoy no existen tokens
  de opacidad, así que convertirlos exigiría inventar tokens o pasar esos `sx` a
  la forma callback con `alpha()`.
- **`var(--black)` de `Addons.tsx:141,149` se dejó intacto**: esa variable
  **nunca existió**, ni antes ni ahora. Hoy la declaración es inválida en tiempo
  de cómputo y el color se hereda. Declararla cambiaría el render de "heredado" a
  "explícito" y no se puede confirmar la equivalencia sin navegador. Bug
  preexistente, tarea propia.
- **`background: '#fff'` → `bgcolor: 'background.paper'`** cambia la declaración
  de shorthand a `background-color`. Se revisó que ningún elemento afectado tenga
  `background-image`/`background-position` compitiendo (en modo claro MUI `Paper`
  no pinta `backgroundImage`). La alternativa —`background: 'var(--surface)'`—
  habría conservado el shorthand pero contradice `docs/conventions.md` §3.1.
- **`--orange-xxxl` se emite aunque hoy nadie la consuma**, por simetría: si un
  token existe en la fuente, ambas capas lo exponen. Hay precedente —`--surface` y
  `--surface2` llevan sin uso desde antes de esta feature.
- Los tests nuevos no solo congelan valores: el quinto **renderiza un `Box` por
  cada path de paleta introducido y comprueba con `getComputedStyle` que da el
  `rgb()` esperado**. Cubre el riesgo real del cambio —que un path no resolviera y
  MUI dejara pasar el string tal cual— que ningún test de igualdad de objetos
  detectaría.
- No se tocó infraestructura (`package.json`, `vite.config.ts`, `tsconfig.json`,
  `vercel.json`, `.gitignore`). Ningún `.env*` leído ni escrito.

**Verificación:** `npm test` 13 archivos / 75 tests (baseline 12/68 + 7 nuevos),
exit 0 · `npm run typecheck` exit 0 · `npm run build` exit 0 (con el aviso
esperado de chunk >500 kB). Chunk de entrada 1 586,47 kB (antes 1 584,84 kB,
**+1,63 kB** porque el mapa de variables pasó del CSS al JS) y CSS de entrada
933 B (antes ~1,3 kB, al salir el bloque `:root`): saldo neto ≈ +1,2 kB.
Comprobación adicional de variables usadas contra declaradas: la única
usada-y-no-declarada es `--black`, que tampoco lo estaba antes. Ejecutada también
de forma independiente por el reviewer.

**Pendiente:**

- **El acceptance 3 (revisar landing, blog y admin a 360 px y 1440 px) sigue SIN
  HACER**: sesión headless, sin navegador. No se dio por hecho en ningún momento.
  En su lugar se verificó equivalencia 1:1 de cada sustitución, igualdad de los
  valores computados en jsdom y que el conjunto de variables emitidas es idéntico
  salvo la aditiva `--orange-xxxl`. Falta que un humano abra `npm run dev` y
  compare landing, `/blog`, `/blog/:slug`, `/privacidad` y `/admin/*` a 360 px y
  1440 px, con foco en lo que pasó de `background` (shorthand) a
  `background-color`: tarjetas blancas de `Pain`, `Features`, `Addons`,
  `Pricing`, `Testimonials`, `ROI`, `Trust`, `Integrations`, acordeones de `FAQ`,
  menú móvil de `Navbar`, cabeceras de blog y legales, carrusel del `Hero` y
  tarjetas de `Solution`.
- Candidatas a tarea propia, fuera del scope de la 23: declarar o eliminar
  `var(--black)` en `Addons.tsx`; unificar `#FFF9F6` con `--orange-xxl` si diseño
  confirma que era el mismo color; tokens de opacidad para los
  `rgba(232,68,10,x)` / `rgba(22,163,74,x)`; limpiar el bloque de CTA comentado
  de `Pricing.tsx:103-132`.
- `docs/architecture.md` §8 quedó con el recuento actualizado pero la lista de
  archivos de test sigue incompleta: lo corrige el líder.
- Sigue abierta la deuda del repo con `tsconfig.tsbuildinfo` (trackeado pese a
  estar en `.gitignore`); requiere un `git rm --cached`, decisión de un humano.
- Siguen pendientes las comprobaciones visuales heredadas: la 404 de la feature
  17 a 360/1440 px y la ausencia de flash al navegar de la feature 22.
- **No quedan features `pending` en `feature_list.json`**: el backlog 17-23 está
  cerrado.

---

## 2026-07-28 — Feature 24: Verificación visual del backlog 17-23 a 360 y 1440 px

**Estado final:** done (`APPROVED` en `progress/review_24.md`, **2.ª vuelta**). La
1.ª vuelta se cerró con `CHANGES_REQUESTED` por **alcance sobredeclarado** —no por
la conclusión— con cinco fallos F1-F5. En la 2.ª vuelta el reviewer rehízo por su
cuenta los 8 diffs de página completa, validó el control negativo, comprobó que la
verificación del sidebar es del implementer y confirmó de forma independiente,
sondeando contra `HEAD`, que el desborde del admin a 360 px es preexistente: no
obliga a reabrir ninguna feature cerrada.
**Rama / commit:** `main` · (sin commitear) · **archivos de `src/` modificados: ninguno**

**Qué se hizo:**

- **El acceptance visual de las features 17, 22 y 23 queda CUMPLIDO con evidencia
  medida, no con argumento estructural.** Es el punto entero de esta feature:
  aquellas tres cerraron con su criterio visual sin comprobar, y aquí se sustituye
  el razonamiento sobre el papel por imagen y píxeles.
  - **17 (404):** bloque centrado (centro del bloque 967,5 vs centro del `<main>`
    970,0 @1440; 777,0 vs 781,5 @360), la Navbar (`y 0..64`) no tapa el glifo
    "404" (`y 820..889` @1440, `y 638..690` @360) y el Footer no se solapa con el
    CTA (760 px de aire @1440, 582 px @360). En `HEAD` esa ruta renderizaba una
    página en blanco absoluto, capturada como contraste.
  - **22 (code splitting):** ninguna captura de ruta pública salió con el
    `RouteFallback`; forzando el retardo del chunk se fotografió qué ve el usuario
    (fondo `#FAFAF9` = `surface.soft` + spinner `#E8440A` = `primary.main`, **no**
    pantalla en blanco). Y el trozo que la 1.ª vuelta declaró no verificable —"sin
    parpadeo del sidebar del admin al moverse dentro del panel"— **sí lo era**:
    diff de la franja del sidebar entre el estado en vuelo y el final →
    **`bbox=None`, 0 px distintos, a 1440 y a 360 px**.
  - **23 (tokens de color):** los 8 pares (`/`, `/blog`, `/privacidad`,
    `/admin/login` × 360 y 1440 px) capturados **a página completa** contra el
    código pre-backlog dan **`bbox=None`**: cero píxeles distintos.
- **Metodología, para que sea reproducible.** Firefox headless captura justo tras
  `load`, cuando las animaciones `.fade-up` siguen corriendo: las capturas
  directas mienten sobre el color (el CTA del héroe salía salmón pálido y los
  contadores del héroe daban valores distintos en cada toma, un *count-up* a
  medias). Se montó un proxy en el scratchpad que retrasa el evento `load`
  inyectando un `<img>` lento, manteniendo el documento de nivel superior. Como
  referencia se usó `git archive HEAD` (el backlog 17-23 está sin commitear, así
  que `HEAD` **es** el estado pre-backlog) servido en un vite aparte, con dos
  proxies independientes y diff por `PIL.ImageChops`.
- **Hallazgos: 2 preexistentes (H1, H2), ninguno corregido** —el encargo era
  verificar y reportar—, más un tercero (H3) que solo apareció al poder renderizar
  el panel admin con sesión. Detalle en `progress/impl_24.md` §8 y en "Pendiente".

**Decisiones:**

- **La sesión del admin se simuló sin una sola credencial.** `AdminGuard` solo
  exige que `GET /api/auth/me` devuelva `{ user: {...} }`, y el proxy del arnés ya
  intercepta todo, así que se estubó ese endpoint con un usuario ficticio. **Ningún
  `.env*` leído** (de hecho no existe ninguno en el repo). El camino contrario
  —iniciar sesión de verdad— no habría funcionado: el proxy no reenvía la cabecera
  `Cookie`.
- **La transición se congela retrasando el chunk hijo**, no intentando
  "fotografiar un movimiento". `SLOW=LeadsList SLOWD=8` + un click inyectado sobre
  `a[href="/admin/leads"]` a los 4 s + el blocker de `load` a los 8 s: la captura
  cae con la navegación ya hecha y el chunk todavía en vuelo. Es la misma técnica
  que ya se había usado para el `RouteFallback` de `/blog`.
- **Un `bbox=None` no vale nada sin control negativo.** Se mutó `--bg-strong` en
  la copia del scratchpad (nunca en el repo) y se recapturó: la página completa
  detecta `bbox=(0,8319,1440,8644)`, **464 389 px distintos**, mientras que **el
  mismo par recortado a 2 600 px da `bbox=None`**. Eso prueba a la vez que el
  método ve las diferencias cuando las hay y que el recorte de la 1.ª vuelta era
  ciego a todo lo que hay por debajo de `Pain`.
- **Por qué la 1.ª vuelta se rechazó, en una línea:** afirmaba "idénticas píxel a
  píxel" sobre recortes de 2600/2200 px de alto en páginas de hasta 14 303 px —
  30,1 % de cobertura en `/`@1440 y **18,2 %** en `/`@360—, dejando fuera
  `Solution`, `Features`, `Pricing`, `Addons`, `FAQ`, `CTAFinal` y `Footer`, justo
  lo que tocó la feature 23. La conclusión era correcta; la evidencia entregada no
  la sostenía. Lección transferible: **declarar el alcance de la evidencia, no
  solo su resultado.**
- **La vía del `<iframe>` se probó y se descartó**: introducía artefactos propios
  (carrusel del héroe ausente, contadores clavados en 0, secciones sin revelar).
- Las coordenadas de la 404 de la 1.ª vuelta estaban ~10 % desviadas porque se
  leyeron sobre la vista reducida a la que se muestra una imagen de 1440 px de
  ancho (factor 1,10), no sobre el PNG. Remedidas sobre el original.
- El contraste de H2 se recalculó desde el alpha real del código
  (`rgba(255,255,255,0.7)`, `CTAFinal.tsx:34`): **2,82:1** medido y 2,81:1
  teórico. El 2,38:1 anterior venía de suponer alpha 0,6.
- Scripts y las ~60 capturas viven en el scratchpad de sesión, **ninguno dentro
  del repo**. Todos los servidores auxiliares levantados (`:5178` con el código
  pre-backlog y los proxies `:8993`-`:8999`) quedaron detenidos; el proceso ajeno
  de `:5174` intacto. No se tocó `src/`, ni `docs/`, ni infraestructura
  (`package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`,
  `.gitignore`). Sin commits.

**Limitación que sigue en pie:**

- **El fondo Vanta del héroe no llega al PNG en headless.** `Hero.tsx` inicializa
  `vanta.net` con `backgroundColor: 0xFFDACD` y la malla en `#E8440A`, pero la
  franja del héroe sale **`#FFFFFF` al 100 %** (2 700 puntos muestreados, un solo
  color) y **no hay ni un píxel de `#FFDACD`** en toda la banda. La sonda descarta
  la explicación fácil: el `<canvas>` **sí** existe y está dimensionado
  (1440×1330) y **sí** hay contexto WebGL disponible; lo que no ocurre es que su
  contenido se componga en la captura. La causa exacta no se puede afirmar; el
  hecho observable sí. **Esa capa WebGL queda fuera de la verificación de color**,
  y es el elemento con más carga cromática de la landing. Efecto colateral que
  conviene saber: al no haber capa aleatoria, el pipeline de captura es
  determinista hasta el byte, y sin eso ningún `bbox=None` sería reproducible.
  Anotado también en el docstring de `delay_proxy.py` para quien reutilice el
  arnés.

**Verificación:** `npm test` 13 archivos / 75 tests · exit 0 · `npm run typecheck`
exit 0 · `npm run build` exit 0 (chunk de entrada 1 586,47 kB, aviso esperado de
chunk >500 kB). Corrido al abrir y al cerrar **cada una de las dos vueltas**, y
además por el reviewer por su cuenta. La 1.ª vuelta reportó honestamente una
ejecución con **1 test fallado de 75** (64,6 s frente a 29,9 s, `load average` en
10,27 por las capturas y builds) sin conservar el nombre del test; en la 2.ª
vuelta se guardó la salida completa con `npm test 2>&1 | tee <log>` y las dos
ejecuciones fueron verdes con log en disco. Sigue encajando solo la hipótesis de
timeout por carga (`testTimeout` = 15 000 ms): **no se tocó ningún archivo de
`src/`** en ninguna de las dos vueltas.

**Pendiente:**

Tres candidatos a feature nueva salidos de esta verificación. **Los tres son
preexistentes** —aparecen igual en el render o en el código de `HEAD`, luego
ninguno es regresión de 17, 22 ni 23— y ninguno debía corregirse aquí (habría
violado el scope). El líder se encarga de darlos de alta en el backlog:

- **H1 — `var(--black)` no está declarada.** `src/components/sections/Addons.tsx:142`
  y `:150` usan `color: 'var(--black)'` y esa variable no existe en ninguna capa
  de tokens (`grep -rn -- "--black" src/` no encuentra declaración). Confirmado el
  efecto: la declaración es inválida, el color se hereda y esos dos precios
  renderizan a `#1A1410`, el `--text` del `body`. **Hoy sin síntoma visible**; el
  riesgo es latente: si alguien declara `--black: #000`, cambian de tono sin que
  ningún test lo note. Ya se había detectado y dejado intacto en
  `progress/impl_23.md` §2.6, entonces sin poder confirmar el efecto. Decidir si
  la intención de diseño era `#000` o `text.primary`.
- **H2 — contraste insuficiente en la línea legal del `CTAFinal`** (accesibilidad,
  severidad baja). `src/components/sections/CTAFinal.tsx:34` pone "Al registrarte
  aceptas nuestros Términos y Privacidad." en `rgba(255,255,255,0.7)` sobre el
  naranja `#DE4009`: medido `#F6C6B5` → **2,82:1**, muy por debajo del **4,5:1**
  que pide WCAG AA para texto pequeño. Dato de apoyo: incluso el blanco puro sobre
  ese naranja da 4,34:1, también por debajo. Es de la familia de literales
  `rgba(255,255,255,x)` que `progress/impl_23.md` §2.5 excluyó a propósito del
  barrido, y `git show HEAD` confirma que la línea es idéntica antes del backlog.
- **H3 — el panel admin desborda a 360 px** (apareció solo al poder renderizar el
  panel con sesión, es decir, gracias a la corrección de F1). `/admin/leads` da
  `scrollWidth=853` vs `clientWidth=360`, `overflowX=SÍ` (a 1440 px: 1440/1440,
  NO): el sidebar se lleva 220 px fijos y la tabla no colapsa, así que la tabla de
  Leads y el texto de bienvenida quedan cortados por la derecha. **No lo introdujo
  el backlog**, verificado por código y confirmado de forma independiente por el
  reviewer contra `HEAD`: `AdminLayout.tsx:33` declara `width: { xs: 220, md: 260 }`
  idéntico en `HEAD`, y el único cambio del backlog en `LeadsList.tsx` es la
  migración a `normalizeApi` (feature 20) más un literal `#A89E9A` →
  `tokens.text.disabled` (feature 23): ni una línea de layout.

Además, heredado y todavía abierto:

- Sigue la deuda del repo con `tsconfig.tsbuildinfo` (trackeado pese a estar en
  `.gitignore`); requiere un `git rm --cached`, decisión de un humano.
- Quedan `pending` en `feature_list.json` las features 25 (llevar los `rgba()` de
  marca a `tokens.ts`) y 26 (limpiar residuos preexistentes de `Pricing.tsx`).

---

## 2026-07-28 — Feature 25: Llevar los `rgba()` de marca a `tokens.ts`

**Estado final:** done (`APPROVED` a la primera en `progress/review_25.md`, sin
ningún checkpoint en `[ ]`). El reviewer no se fio del informe: recalculó los
siete colores ejecutando el `alpha` real del repo, tomó los valores "antes" de
`git show HEAD:<archivo>` y recontó los literales por su cuenta.
**Rama / commit:** `main` · (sin commitear) · **archivos de `src/` modificados: 3 + 1 test nuevo**

**Qué se hizo:**

- **Los siete `rgba()` de marca que la feature 23 no vio pasan a derivar del
  token.** La 23 unificó los colores en `src/theme/tokens.ts`, pero su barrido
  buscaba **hex**: los `rgba()` escritos a mano repetían los canales de
  `brand.orange` (`#E8440A` → `232,68,10`) y `brand.green` (`#16A34A` →
  `22,163,74`) fuera de la fuente única. Cambiar el token habría dejado esas
  sombras, ese gradiente y ese borde con el color viejo, en silencio. Ahora los
  seis puntos usan `alpha(tokens.brand.*, x)`, el patrón que ya usaba
  `theme.ts:101` para las sombras de `MuiButton`:
  - `Pain.tsx` — sombra de tarjeta (0,06), sombra de `&:hover` (0,16) y los dos
    topes del gradiente verde de "La solución con MaIA" (0,06 y 0,10).
  - `Pricing.tsx` — sombra del plan destacado (0,15) y borde del distintivo de
    prueba gratis (0,25).
  - `Solution.tsx` — sombra del icono de cada paso (0,30).
- **El render no cambia en ninguno de los siete puntos**, verificado canal a
  canal como números y no como texto. Las dos únicas diferencias son de
  escritura: `alpha()` mete un espacio tras cada coma, y serializa `0.10`→`0.1`
  y `0.30`→`0.3` (el mismo `Number`; `0.30 === 0.3` es `true`). Sin artefactos
  de coma flotante: `alpha()` solo aplica un `clamp(0,1)`, no redondea.
- **Test nuevo `src/theme/__tests__/brandAlpha.test.tsx`** (5 casos, +5 sobre el
  baseline): congela los siete colores y comprueba que `Pain`, `Pricing` y
  `Solution` los emiten de verdad.
- **Regla documentada donde vive**, para que no vuelva a colarse un literal:
  fila nueva en la tabla "Cómo usar los tokens" de `docs/architecture.md` §6 con
  el porqué, y punto 4 nuevo en `docs/conventions.md` §3.

**Decisiones:**

- **El backlog decía «8 literales» y en los tres archivos de la feature hay 7.**
  Se contaron desde cero en vez de dar por bueno el número, y el reviewer
  cerró el descuadre: en `HEAD` había **8 líneas** con literal de marca, pero
  dos de ellas (`theme.ts:100,102`) ya las había migrado la feature 23 — son
  justamente el patrón que el acceptance mandaba imitar. En los tres archivos
  restantes: **6 líneas / 7 literales**, porque el gradiente de `Pain` lleva dos
  en la misma línea. 7 encontrados = 7 migrados, ni de más ni de menos.
  Lección transferible: **el recuento que hereda una feature de la review de
  otra se verifica, no se copia.**
- **Los `rgba()` que no son de marca se dejaron intactos, a propósito.** Las
  otras 19 líneas del barrido (`Navbar`, `Hero`, `CTAFinal`, `MarkdownRenderer`,
  `Addons`, `Blog`, `Features`, `Solution:76`, la rama no destacada del ternario
  de `Pricing:65` y la escala `shadows` del tema) son blancos y negros
  translúcidos: **no duplican ningún token**, y sacarlos exige antes decidir si
  `rgba(0,0,0,0.08)` merece ser un token de sombra. Otra discusión, otra feature.
- **`alpha()` y no una variable CSS nueva.** Una `var(--…)` lleva el color opaco
  y no hay forma de teñirla al 6 % sin `color-mix()` ni sin partir el token en
  canales sueltos. Es la excepción al punto 2 de `conventions.md` §3, y por eso
  se escribió como punto propio en vez de dejarla implícita.
- **El test lee la hoja de estilos de Emotion, no `getComputedStyle`.** Cuatro
  de los siete valores viven en un `&:hover` o dentro de un `linear-gradient`,
  que `getComputedStyle` en jsdom no resuelve; el CSS inyectado en
  `document.head` sí los contiene. Mismo truco que el último test de
  `tokens.test.tsx`.
- **Control negativo, porque un test verde no prueba nada por sí solo.** Mutando
  `Solution.tsx` a `alpha(…, 0.31)` el test falla señalando el
  `rgba(232,68,10,0.31)` que aparece en el CSS. Revertido acto seguido.
- **El propio test estuvo a punto de romper el acceptance 3.** La primera
  versión congelaba los valores viejos como strings `rgba(…)`, y eso hacía que
  `grep -rnE 'rgba\(232|rgba\(22, ?163' src/` devolviera **siete coincidencias
  del archivo de test**. Se reescribió para guardarlos como canales
  `[232, 68, 10, 0.06]`, que además es la comparación correcta. Detectado al
  ejecutar el criterio en vez de darlo por cumplido.
- **Evidencia visual con navegador: NO se hizo, y se declaró así en el informe.**
  Había arnés disponible (el de la feature 24), pero cuatro de los siete valores
  son `:hover` o gradiente y **no son capturables** en
  `--headless --screenshot`: un diff de píxeles habría dejado sin verificar
  justo los casos delicados. El reviewer revisó explícitamente que el informe no
  insinuara lo contrario y dio por cubierto el acceptance 2 con la equivalencia
  aritmética más el CSS emitido en el DOM.
- **Scope respetado pese a editar un archivo compartido.** `Pricing.tsx` es
  también el objeto de la feature 26: se tocaron sus líneas 63 y 88 y **no** el
  bloque JSX comentado ni el `background: 'primary.main'` inválido. Intactas
  igualmente las dos deudas con feature propia (`var(--black)` de `Addons.tsx` y
  el contraste del `CTAFinal`). Sin `.env*`, sin infraestructura, sin commits.

**Verificación:** `npm test` **14 archivos / 80 tests** · exit 0 (baseline previo
13 / 75; delta +1 archivo / +5 tests, ningún test previo roto) · `npm run
typecheck` exit 0 · `npm run build` exit 0 (chunk de entrada 1 586,50 kB frente a
1 586,47 kB del baseline, +30 bytes; aviso esperado de chunk >500 kB). Corrido al
abrir y al cerrar, y de nuevo por el reviewer por su cuenta (45,76 s).

**El flake de `AppRoutes.test.tsx` reaparece, ahora con nombre.** En una de las
tres ejecuciones completas (`load average` 9,86) falló **1 test de 80**:
`src/__tests__/AppRoutes.test.tsx > AppRoutes — admin perezoso tras la guardia >
navegar entre páginas del admin no desmonta el sidebar`, con
`TestingLibraryElementError: Unable to find role="heading" and name /leads/i`.
Es la incidencia que la feature 24 reportó sin poder conservar el nombre del
test: **queda identificada aquí**. Aislado el archivo pasa entero (ese test en
763 ms frente a 1 528 ms en la pasada que falló), y las otras dos ejecuciones
completas dieron 80/80, igual que la del reviewer. Encaja con un `React.lazy`
que no resuelve dentro del `findBy` cuando la máquina va cargada
(`testTimeout` = 15 000 ms). No lo causa esta feature —ese archivo no se tocó y
el cambio son tres valores de color en `sx`—, pero conviene saber que **la
hipótesis de "timeout por carga" ya tiene un sospechoso concreto** y que el
candidato natural a arreglo es ese `findBy`, no el runner.

**Pendiente:**

- **`docs/architecture.md` §10 quedó contradiciendo a su propio §6** (nota N1 de
  la review). La viñeta de deuda sigue diciendo que los `rgba(232,68,10,…)` /
  `rgba(22,163,74,…)` "siguen escritos a mano porque hoy no existen tokens de
  opacidad", y eso es falso desde esta feature. Es una edición de una línea en
  `docs/`, ámbito del líder; **el implementador no la hizo por instrucción
  expresa de no tocar `docs/` al cerrar**. Conviene resolverla antes de que el
  backlog dé de alta una feature duplicada.
- Dos nits documentales de la review, sin efecto en el resultado y anotados como
  errata al final de `progress/impl_25.md`: una celda de recuento mal en §2
  (dice 18 líneas no-marca donde son 19) y los números de línea de la tabla §3,
  desplazados en 1 por mezclar numeración previa y posterior al cambio.
- Siguen abiertos, sin cambios: la deuda de `tsconfig.tsbuildinfo` trackeado, y
  los tres candidatos a feature nueva de la 24 (H1 `var(--black)`, H2 contraste
  del `CTAFinal`, H3 desborde del admin a 360 px).
- Queda `pending` en `feature_list.json` la feature **26** (limpiar residuos
  preexistentes de `Pricing.tsx`).

---

## 2026-07-28 — Feature 26: Limpiar residuos preexistentes de `Pricing.tsx`

**Estado final:** done (`APROBADO` a la primera en `progress/review_26.md`, con
los checkpoints C1-C11 todos en `[x]` y "Ninguno en `[ ]`. Sin fallos que
corregir."). El reviewer no heredó nada del informe: rehízo la arqueología de
`git`, reconstruyó en un directorio temporal el componente con la clave
`background` reintroducida para leer el CSS que emitía Emotion, corrió los 5
tests nuevos contra esa versión vieja y acotó el alcance del cambio por `mtime`.
**Rama / commit:** `main` · (sin commitear) · **archivos de `src/` modificados: 1 + 1 test nuevo**

**Qué se hizo:**

- **Se eliminó el bloque JSX comentado de `src/components/sections/Pricing.tsx`**
  (28 líneas al final del `.map()` de planes: el CTA por tarjeta "Hablar con
  ventas →"). Con él se va **el último `#fff` hardcodeado del repo**, que era la
  excepción 1 de `progress/impl_23.md` §2.5. El archivo pasa de 149 a 118 líneas.
- **Se eliminó la declaración inválida `background: 'primary.main'`** del `sx` del
  badge "Más popular", que convivía con un `bgcolor: 'primary.main'` hermano. No
  se sustituyó por nada: el `bgcolor` ya aportaba el color.
- **Nuevo `src/components/sections/__tests__/Pricing.test.tsx`** (5 tests, +5
  sobre el baseline): color computado del badge, ausencia de paths de paleta sin
  resolver en el CSS emitido, las cuatro tarjetas de plan en pie tras el borrado,
  el CTA superviviente ("Contactanos" → `onOpenContact`) y el switch anual. Es el
  **primer test de una sección de la landing** del proyecto.
- Informe en `progress/impl_26.md`; review en `progress/review_26.md`.

**Decisiones:**

- **Borrar el bloque comentado en vez de parar a preguntar**, razonado en
  `impl_26.md` §2 y verificado de forma independiente por el reviewer
  (`review_26.md` §3). Lo comentó el commit `eda76c4` (2026-07-24, "update"), que
  **en el mismo cambio** ya le había quitado el deep link
  `https://app.maiabuilder.ai/login?plan=…` sustituyéndolo por
  `onClick={onOpenContact}`. Es decir: **restaurar el comentario tal cual no
  devolvería el alta self-service**, solo duplicaría un CTA hacia el mismo
  `onOpenContact` que ya sirve el enlace "Contactanos" del pie de la sección. El
  reviewer confirmó `git rev-parse eda76c4^` → `587e9a3` (padre e hijo) y leyó
  ambas versiones: en `587e9a3` el bloque está **activo** con el deep link y el
  copy `Elegir plan →`; en `eda76c4` está comentado y ya sin deep link. Se fue
  entero, sin dejar un comentario "aquí había un CTA": git lo conserva.
- **La clave `background` se verificó en la fuente de MUI, no de oídas.**
  `node_modules/@mui/system/esm/styleFunctionSx/defaultSxConfig.js` declara solo
  tres entradas de color (`color`, `bgcolor`, `backgroundColor`, todas con
  `themeKey: 'palette'`); **no existe `background`**, así que la clave caía sin
  transformar y Emotion serializaba `background:primary.main`, que el navegador
  descarta. Comprobado además en el CSS emitido —por el implementer y otra vez
  por el reviewer sobre una copia con la clave reintroducida—: la regla llevaba
  `background:primary.main; background-color:#E8440A;` y el computado era
  `rgb(232, 68, 10)` **antes y después**.
- **Acceptance 3 medido, no supuesto.** Firefox headless + el arnés de retraso
  del evento `load` de la feature 24, comparando con
  `PIL.ImageChops.difference(...).getbbox()`: la sección `Pricing` a 1440 px da
  `bbox=None` y la página entera a 360 px también. Salvedad declarada
  explícitamente: el diff de la página **entera** a 1440 px marca
  `(175,716)-(1265,1239)`, la franja del carrusel del `Hero`, que aparece igual
  al comparar **dos capturas del mismo código** — no determinismo previo, no
  efecto del cambio. Se validó primero el determinismo del arnés (3 capturas
  seguidas, `bbox=None`). Todas las capturas viven en el scratchpad, ninguna en
  el repo.
- **El test 2 es el único discriminante y se comprobó como tal**: contra el
  código anterior falla con `expected '.css-a0nkt9{…}' not to match
  /primary\.main/`. El reviewer reprodujo el fallo por su cuenta. Los tests 1 y 3
  pasan antes y después **a propósito**: son de invariancia y de no-regresión, que
  es justo lo que exige un acceptance que dice "el render no cambia".
- **El ahorro es de legibilidad, no de peso**: chunk de entrada 1 586,48 kB
  frente a 1 586,50 kB (−~30 bytes). El bloque comentado no viajaba al bundle,
  esbuild ya lo tiraba; lo único que pesaba era la declaración inválida.
- **Scope respetado.** Verificado por el reviewer por `mtime`: dentro de la
  ventana de la sesión solo se tocaron `Pricing.tsx` y su test nuevo. Sin tocar
  `var(--black)` de `Addons.tsx`, el contraste del `CTAFinal`, el desborde del
  admin a 360 px, `docs/` ni infraestructura (`package.json`, `vite.config.ts`,
  `tsconfig.json`, `vercel.json`, `.gitignore`). Ningún `.env*` leído ni escrito.
  Sin commit ni push.

**Verificación:** `npm test` **15 archivos / 85 tests** · exit 0 (baseline previo
14 / 80 de la feature 25; delta +1 archivo / +5 tests, ningún test previo roto) ·
`npm run typecheck` exit 0 · `npm run build` exit 0 (aviso esperado de chunk
>500 kB; chunk de entrada 1 586,48 kB). Ejecutado por el implementer al abrir y
al cerrar, de forma independiente por el reviewer, y una tercera vez por el
líder al cerrar la sesión: verde en las tres.

**Pendiente:**

- **Candidata a feature nueva, levantada y deliberadamente NO arreglada**
  (`impl_26.md` §2 final, nota N4 de la review): al irse el bloque comentado
  queda por escrito que **ninguna tarjeta de plan tiene botón**; el único CTA de
  la sección de precios es el enlace de texto "Contactanos"
  (`Pricing.tsx:109-114`). Lo apagó `eda76c4` junto con el deep link
  `app.maiabuilder.ai/login?plan=…`. Puede ser deliberado, pero en una landing
  cuyo objetivo declarado es la captación de leads merece una decisión explícita.
  **No es una restauración mecánica del comentario** (ese comentario ya no
  contenía el deep link): exige diseño, copy y destino.
- **Docs desactualizadas por esta feature, ámbito del líder** (nota N2 de la
  review, más el punto 4 de `impl_26.md` §8): `docs/architecture.md` §8 dice «13
  archivos de test, 75 tests», no lista `Pricing.test.tsx` y afirma «sin tests de
  las secciones de la landing»; `docs/verification.md` §1 arrastra la misma cifra
  vieja. La cifra vigente es **15 archivos / 85 tests** y sí existe un test de
  sección. El implementer no lo tocó por instrucción expresa de no salirse del
  scope.
- **Nota N1 de la review, sin cambios exigidos:** el test 4 (`no hay un CTA por
  tarjeta`) pasa igual con el código anterior, porque el JSX comentado tampoco
  llegaba al DOM. Es un test válido de estado, pero **no** es la evidencia de que
  el bloque se haya ido; esa evidencia es el grep del acceptance 4 y la lectura
  del archivo.
- **El flake de tests, ya con nombre y sospechoso:** `src/__tests__/AppRoutes.test.tsx
  > AppRoutes — admin perezoso tras la guardia > navegar entre páginas del admin
  no desmonta el sidebar`, que falla de forma intermitente solo con la máquina
  cargada (`Unable to find role="heading" and name /leads/i`) y aislado pasa. No
  es regresión: es un `findBy` que se queda corto esperando un `React.lazy`. Si
  reaparece, el arreglo va en ese test, no en el runner.
- **Pendientes de dar de alta en el backlog** (los da de alta el líder), heredados
  de la feature 24 y todos preexistentes: **H1** `var(--black)` sin declarar en
  `Addons.tsx:142,150`; **H2** contraste 2,82:1 en la línea legal del `CTAFinal`,
  por debajo del 4,5:1 de WCAG AA; **H3** el panel admin desborda a 360 px
  (`scrollWidth=853` vs `clientWidth=360`).
- **Higiene del repo** (nota N5 de la review): todo el trabajo de las features
  17-26 sigue **sin commitear** sobre `main`, lo que impide aislar el diff de una
  feature con `git diff` (el reviewer tuvo que recurrir a `mtime`). No es
  responsabilidad del implementer —`docs/conventions.md` §8 le prohíbe commitear
  sin que lo pida el humano—, pero conviene resolverlo antes de que el árbol
  crezca más.
- Sigue abierta la deuda de `tsconfig.tsbuildinfo` (trackeado pese a estar en
  `.gitignore`): requiere un `git rm --cached`, decisión de un humano.
- **No quedan features `pending` ni `in_progress` en `feature_list.json`:** el
  backlog 17-26 queda cerrado por completo.

---

## 2026-07-29 — Feature 27: Andamiaje admin para usuarios, imágenes y precios

**Estado final:** done (`APROBADO` a la primera en `progress/review_27.md`: los 6
acceptance criteria cumplidos, checkpoints C1-C11 todos en `[x]`, "Detalle de los
fallos: Ninguno"). El reviewer no heredó la verificación del informe: la rehízo,
leyó los tres puntos de `AppRoutes.tsx` en la fuente, acotó el scope por `mtime`
archivo por archivo y **midió** el límite del test nuevo montando en un directorio
temporal una réplica de la tabla de rutas sin `AdminPage`.
**Rama / commit:** `feat/admin-cruds` · (sin commitear al cerrar la sesión; el
commit por feature lo hace el humano) · **archivos de `src/` modificados: 4 + 3 nuevos**

**Qué se hizo:**

- **Tres componentes de anclaje nuevos, deliberadamente mínimos**
  (`src/admin/users/UsersList.tsx`, `src/admin/images/ImagesGrid.tsx`,
  `src/admin/prices/PricesList.tsx`): `Box` + título `variant="h5" fontWeight={700}
  sx={{ mb: 3 }}` (patrón de `LeadsList.tsx:71`) + un párrafo de «en construcción».
  **Cero `fetch`, cero estado, cero mock, cero tabla**: las features 28-30 los
  reescriben completos. Cada uno lleva un JSDoc que nombra la feature que lo
  sustituirá, en vez de un `// TODO` suelto (`conventions.md` §7).
- **`src/AppRoutes.tsx`:** tres `lazy` con **ruta literal** en el `import()`, tres
  `<Route>` dentro del `<Route path="/admin">` **cada una con su propio
  `<AdminPage>`**, y el comodín `*` sigue siendo la última ruta del `<Routes>`. El
  build emite los tres chunks esperados (`UsersList-*.js`, `ImagesGrid-*.js`,
  `PricesList-*.js`), que es la prueba de que el `import()` es analizable por Rollup.
- **`src/admin/AdminLayout.tsx`:** `NAV_ITEMS` pasa de 3 a 6 ítems, los tres nuevos
  con `end: false`; `Inicio` sigue siendo el único `end: true`. Se actualizó también
  el JSDoc del componente, que enumeraba las tres secciones y habría quedado falso.
- **Tests:** `AdminLayout.test.tsx` actualiza el `toEqual(['Inicio','Leads','Blog'])`
  que congelaba la lista vieja **y añade** las tres aserciones de `href` que
  faltaban (el test acabó más estricto: 3 labels → 6 labels + 6 hrefs, sigue siendo
  `toEqual` sobre la lista completa y ordenada, no un `toContain`).
  `AppRoutes.test.tsx` suma **+1 test** que navega por clic a Imágenes → Precios →
  Usuarios y comprueba en cada salto `toBe(nav)` sobre el nodo capturado una sola vez.
- Informe en `progress/impl_27.md`; review en `progress/review_27.md`.

**Decisiones:**

- **Esta feature existe para que las 28-30 puedan ir en paralelo.** Es la única del
  grupo que toca archivos compartidos (`AppRoutes.tsx`, `AdminLayout.tsx` y sus
  tests); las 28-30 se limitan a su propia carpeta. Nota para quien las tome: los
  archivos de anclaje **se reescriben completos**, no se les añade encima; lo único
  que hay que conservar es el nombre del `export default` y la ruta del archivo,
  porque es lo que `AppRoutes.tsx` importa por literal — renombrarlos obliga a tocar
  otra vez el archivo compartido.
- **«Imágenes» con tilde, contra el «Imagenes» de `feature_list.json`.** El reviewer
  validó la decisión con evidencia, no por gusto: el JSON entero tiene **un solo**
  carácter acentuado en ~17 kB mientras acumula «anade», «comodin», «minimo»,
  «seccion», «busqueda» — es un artefacto de codificación del archivo, no una
  decisión de copy. `conventions.md` §6 manda copy en español correcto y el panel ya
  escribe «Cerrar sesión» y «Navegación admin» con tilde.
- **Orden del sidebar: `Inicio · Leads · Blog · Imágenes · Precios · Usuarios`.** El
  enunciado dejaba el orden al criterio del implementer: contenido y negocio
  primero, gestión de accesos (Usuarios) al final.
- **Un solo test con bucle para las tres rutas, no tres tests.** Validado por el
  reviewer como patrón ya existente en el repo (`Pricing.test.tsx:49`,
  `brandAlpha.test.tsx:69`), y ni `CHECKPOINT.md` C2 ni `verification.md` §5 cuentan
  tests: exigen que cada punto del acceptance tenga verificación, y el acceptance 5
  es un punto con tres rutas de contrato idéntico. Peaje asumido y declarado: un
  fallo en «Imágenes» corta el `it` y deja Precios y Usuarios sin ejecutar.
- **Límite del test nuevo, medido por el reviewer (§6 de `review_27.md`):** el
  `toBe(nav)` sí distingue «el sidebar sigue ahí» de «se destruyó y se volvió a
  crear», pero **no falla si se quita un `AdminPage`**, porque React 18 no destruye
  el subárbol al re-suspender: lo oculta con `display:none` y lo revela con los
  mismos nodos, y la aserción ocurre **después** de que resuelva el `findByRole`. La
  réplica sin `AdminPage` pasó el bucle en verde. Es una limitación heredada del
  patrón que el propio acceptance mandaba seguir (viene del test de la feature 22),
  no de esta implementación.
- **Docs (H1 del review), fuera del scope del implementer y resuelto por el líder en
  el mismo cierre:** `docs/architecture.md` quedó desactualizado en cuatro sitios que
  esta feature cambió (`:9` el resumen del panel, `:72-78` el mapa de `src/admin/`
  sin `users/`/`images/`/`prices/`, `:94-107` la tabla de rutas y `:111` la
  enumeración de componentes con `React.lazy`). El implementer sí actualizó lo que se
  le pedía explícitamente (conteo 85 → 86 en `docs/verification.md` §1-§2 y
  `docs/architecture.md` §8) y `architecture.md` no estaba en el campo `files` de la
  feature; el resto lo corrigió el líder al cerrar, antes de lanzar las 28-30, porque
  es lo que van a leer.
- **Scope respetado, verificado por `mtime`:** exactamente los 7 archivos del campo
  `files`, ni uno más. `src/lib/api.ts` **intacto** (comprobado por tres vías:
  `mtime` del 27-jul, diff que solo contiene el `normalizeApi` de la feature 20, y
  superficie exportada sin un solo helper de los tres recursos nuevos). Sin tocar
  `AdminGuard.tsx`, `AdminHome.tsx`, la landing ni infraestructura (`git diff --stat`
  de `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `.gitignore`,
  `index.html` → salida vacía). Cero dependencias nuevas. Ningún `.env*` leído ni
  escrito; no hace falta ninguna variable nueva.

**Verificación:** `npm test` **15 archivos / 86 tests** · exit 0 (baseline previo
15 / 85 de la feature 26; delta +1 test, ningún archivo de test nuevo, ningún test
previo roto) · `npm run typecheck` exit 0 · `npm run build` exit 0 (aviso esperado
de chunk >500 kB; entrada 1 586,87 kB, +0,39 kB; módulos 1 738 → 1 741). Ejecutado
por el implementer al abrir y al cerrar, de forma independiente por el reviewer,
por el líder, y una cuarta vez al cerrar la sesión: verde en todas.

**Pendiente:**

- **Features 28, 29 y 30 quedan `pending` y ya pueden ir en paralelo:** cada una
  toca solo su carpeta (`admin/users/`, `admin/images/`, `admin/prices/`) y su test.
  Es precisamente lo que este andamiaje habilita.
- **Copy de `AdminHome.tsx`, candidata a feature nueva** (levantada por el
  implementer en `impl_27.md` §6.a y confirmada por el reviewer en H3, **no**
  arreglada por C10): `:18` («podrás gestionar leads y contenido del blog») queda
  **incompleto** con seis secciones pero no falso; `:26-32` («la sección de Leads y
  el mantenedor del blog llegarán en las próximas iteraciones») **ya era falso antes
  de esta feature** — ambas existen desde las features 19-20 y el archivo no se toca
  desde el 26 de mayo. Recomendación de ambos: reescribir el bloque «Próximos pasos»
  entero de una vez cuando cierren las 28-30, incluida la mención a
  `node scripts/create-user.js` que la feature 28 sustituirá por UI.
- **H2 del review, feature de arnés por su cuenta:** para tener un test que **sí**
  rompa al quitar un `AdminPage` hay que asertar **dentro** de la ventana de
  suspensión — retardar el `lazy` y comprobar `queryAllByRole('navigation')` = 1
  mientras el fallback está en pantalla (con `AdminPage` da 1, sin él da 0, medido).
  Ese arnés no existe hoy en el repo y ninguna convención lo pide.
- **Pendientes de dar de alta en el backlog** (los da de alta el líder), heredados
  de las features 24-26 y todos preexistentes: CTA por tarjeta ausente en la sección
  de precios (exige diseño, copy y destino); **H1** `var(--black)` sin declarar en
  `Addons.tsx:142,150`; **H2** contraste 2,82:1 en la línea legal del `CTAFinal`,
  por debajo del 4,5:1 de WCAG AA; **H3** el panel admin desborda a 360 px
  (`scrollWidth=853` vs `clientWidth=360`).
- **El flake conocido de tests, sin cambios:** `src/__tests__/AppRoutes.test.tsx >
  navegar entre páginas del admin no desmonta el sidebar` falla de forma
  intermitente solo con la máquina cargada (`Unable to find role="heading"`) y
  aislado pasa. Es un `findBy` que se queda corto esperando un `React.lazy`; si
  reaparece, el arreglo va en ese test, no en el runner. El test nuevo de esta
  feature usa el mismo patrón, así que hereda el mismo riesgo.
- Sigue abierta la deuda de `tsconfig.tsbuildinfo` (trackeado pese a estar en
  `.gitignore`, y cada `npm run build` lo vuelve a marcar como `M`): requiere un
  `git rm --cached`, decisión de un humano. `conventions.md` §8: no commitearlo.
- Deuda ajena confirmada intacta (C10): `ArticlesList.tsx` sin migrar a
  `normalizeApi`, `App`/`LegalPage`/`NotFound` con import estático, el doble
  `useReveal`, y el peso del chunk de `three` / `ArticleEdit` (896,69 kB).

---

## 2026-07-30 — Feature 28: Vista admin de usuarios (maqueta con datos mock)

**Estado final:** done (`APROBADO` en `progress/review_28.md`: los 10 acceptance
criteria cumplidos, C1-C11 con **solo C7 en rojo**, que era puramente documental y
se resuelve en este cierre). El reviewer no heredó la verificación de ningún
informe —**no había informe**— y la rehízo entera, además de acotar el scope con
`git show --stat dc97090` y de leer el código con el CHECKPOINT delante.
**Rama / commit:** `feat/admin-cruds` · código en `dc97090` · **4 archivos de
`src/`** (3 nuevos + la reescritura del anclaje de la feature 27).

**Anomalía de proceso de esta feature — léase antes que nada:** el implementer
original **cayó por un fallo de sesión** después de commitear y antes de escribir
`progress/impl_28.md` y antes del veredicto. Consecuencias: (a) `current.md` nunca
llegó a documentar la 28 (siguió con la plantilla vacía y el baseline de la 27),
que es exactamente el C7 en rojo; (b) `progress/impl_28.md` **existe pero es una
reconstrucción a posteriori**, escrita en el cierre por otro agente y marcada como
tal desde su primera línea — no es el informe del autor y no debe leerse como si
lo fuera; (c) las decisiones de diseño quedaron sin justificar por quien las tomó,
y lo que hay es la inferencia del revisor (`review_28.md` §5) y la del cierre
(`impl_28.md` §4). El trabajo técnico no es imputable por esto: se aprobó por el
código, no por la narrativa.

**Qué se hizo:**

- **`src/admin/users/mockUsers.ts` (nuevo):** almacén en memoria con `SEED` de 4
  filas y `resetMockUsers()`. `MockUser extends AdminUser { created_at }` —**tipo
  derivado, no duplicado**—, así que son exactamente las 5 columnas del contrato
  (`api-contract.md` §10.3) y `password_hash` no aparece jamás. `MockUsersList`
  solo tiene `rows`: **no existe el dato para paginar**. `MockResult<T>` imita la
  unión `ApiSuccess | ApiFailure` (no lanza). `deleteMockUser` reproduce **los dos
  409 del backend** en la capa de datos, no solo en el copy. Las 5 rutas del
  contrato están transcritas **como comentario**: ni una URL construida.
- **`src/admin/users/UsersList.tsx` (reescrito sobre el anclaje de la 27):** tabla
  email/nombre/rol/alta, búsqueda con debounce 300 ms, estados de carga, vacío y
  error del patrón `LeadsList`, y `Dialog` de confirmación al estilo
  `ArticlesList` (sin copiar su bug `if (ok || data == null)`). **Sin
  `TablePagination`.** El id del usuario en sesión sale de
  `useOutletContext<AdminUser>()` —**cero ids literales en el archivo**— y apaga el
  borrado de su propia fila con `Tooltip` explicando el motivo.
- **`src/admin/users/UserDialog.tsx` (nuevo):** validación **por campo** calcada de
  `Login.tsx` (`error` + `helperText`, limpieza al teclear), `Alert` global
  reservado a errores **sin** `field`, y catálogo `ROLES` con solo `admin`/`editor`
  más el hint «Solo accede a la sección de Blog».
- **`src/admin/__tests__/UsersList.test.tsx` (nuevo):** 10 tests en el commit
  original, **12 tras el endurecimiento del cierre**. Monta una `Route` anidada con
  `<Outlet context={user} />` real (no mockea `useOutletContext`) y **espía
  `globalThis.fetch` para afirmar `not.toHaveBeenCalled()`**: si alguien cablea un
  `fetch` a medias, el test se pone rojo.
- **Cambio hecho en el cierre, no por el autor:** el test de la fila propia se
  endureció. Antes, `renderUsers(user)` declaraba un parámetro que **ningún test
  ejercía con un valor distinto del de por defecto**, así que una implementación
  con `const sessionUserId = 1` hardcodeado habría pasado los 10 tests (era la
  §4.2 del review). Ahora es un `it.each` sobre **tres sesiones distintas** (`id`
  1, 2 y 4) que recorre **las cuatro filas del seed** y comprueba que la
  deshabilitada es la del usuario en sesión y el resto están habilitadas.
  **Verificado por mutación:** con `sessionUserId = 1` hardcodeado, los casos
  `id 2` e `id 4` fallan; la mutación se revirtió en el mismo comando y
  `git status -- src/admin/users/` quedó vacío. **No se tocó comportamiento
  aprobado: solo el test.**

**Decisiones (inferidas, no declaradas por el autor — ver `impl_28.md` §1 y §4):**

- **Modal `UserDialog.tsx` en lugar de la página `UserEdit.tsx`** que anticipaban
  el backlog y el manual. Es la decisión más grande y la que menos rastro dejó. Lo
  único sostenible: una página habría exigido dos rutas nuevas en `AppRoutes.tsx`,
  y la 27 dejó dicho que las features 28-30 no vuelven a tocar archivos
  compartidos. **En el cierre se corrigió el campo `files` de la feature 28**
  (`UserEdit.tsx` → `UserDialog.tsx`) para que el backlog no mienta.
- **Almacén mutable a nivel de módulo** (`let store`), con el acoplamiento entre
  tests mitigado por `resetMockUsers()` en `beforeEach`. Aceptable en una maqueta
  que muere al llegar `API_READY.md`.
- **`deleteMockUser(id, currentUserId)`** toma un parámetro que el helper real no
  tendrá (el backend saca el usuario de la cookie): deliberado para simular el 409
  en local, pero es una línea extra al cablear.
- **`name: string` con `''`** mientras el contrato tipa `string | null`: deriva de
  `AdminUser` como pide C5, pero `u.name.toLowerCase()` del filtro reventaría con
  un `null` real. Hay que blindarlo al cablear.
- **Asimetrías del mock sin regla en el contrato:** `updateMockUser` descarta el
  `password` en silencio (choca con el `helperText` «Déjala vacía para conservar
  la actual») y permite degradar al único `admin` a `editor`, esquivando por
  `PATCH` la regla que el `DELETE` sí protege. Pregunta para backend, no
  incumplimiento.

**Verificación (rehecha en el cierre, con mis propios ojos):** baseline
`npm test` **17 archivos / 106 tests** · exit 0 → tras el endurecimiento,
`npm test` **17 archivos / 110 tests** · exit 0 · `npm run typecheck` exit 0 ·
`npm run build` exit 0 (aviso esperado de chunk >500 kB). Aislado,
`npx vitest run src/admin/__tests__/UsersList.test.tsx` → **12 tests**, exit 0.
Del delta `106 → 110`, **+2 son de este cierre** (10 → 12 en `UsersList.test.tsx`)
y **+2 son de la feature 29**, que otro agente implementaba en paralelo durante
esta sesión: el conteo total no es atribuible solo a la 28.

**Pendiente:**

- **`normalizeApi` no propaga el campo `field` de los errores 422** (hallazgo del
  review §5.4, **no es deuda de esta feature**): `MockResult` modela
  `{ ok:false, error, field? }` y `UserDialog.tsx:78-80` marca el campo culpable,
  pero `ApiFailure` de `src/lib/api.ts` es `{ ok, status, error }`. Por tanto el
  `TODO(feature-28)` («el resto de la pantalla no debería necesitar cambios») es
  **optimista**: es el único punto donde el cableado de la API real **no** será
  mecánico. Ya dado de alta como **feature 31** en `feature_list.json`; aquí solo
  se enlaza, no se arregla (C10).
- **Lagunas de cobertura conocidas y aceptadas** (`review_28.md` §4.3, ninguna
  obligatoria según `verification.md` §5): el estado de error de la lista es
  inalcanzable desde el listado (`listMockUsers` nunca devuelve `ok:false`), el
  estado de carga no tiene aserción propia, la rama del último `admin` de
  `mockUsers.ts:121-123` no tiene test (con el seed actual solo se alcanza
  degradando a Ana a `editor`, creando otro `admin` y borrándolo) y el copy
  «editor solo accede a Blog» está en pantalla sin aserción.
- **Conteos desactualizados en `docs/`, fuera del alcance autorizado de este
  cierre:** `docs/verification.md` §1-§2 y `docs/architecture.md:252` siguen
  diciendo `15 archivos / 86 tests`. La 28 lo dejó en 16/96 y hoy el árbol va por
  17/110 con la 29 en vuelo. Lo señala `review_28.md` §7.2-§7.3; se actualiza
  cuando cierre la 29, con una sola cifra estable.
- **La feature 29 estaba en vuelo mientras se cerraba esta**, en otra sesión: su
  estado, sus archivos y su cierre documental **no se tocaron aquí**.
- Siguen abiertos, sin cambios, los pendientes heredados de la feature 27:
  **copy de `AdminHome.tsx`** (`:26-32` ya era falso antes; recomendación de
  reescribir «Próximos pasos» entero cuando cierren las 28-30, incluida la mención
  a `node scripts/create-user.js` que esta feature sustituye por UI), el **arnés de
  suspensión (H2)**, el **flake de `AppRoutes.test.tsx`**, `tsconfig.tsbuildinfo`
  trackeado (el commit `dc97090` vuelve a arrastrarlo; deuda previa, no imputable
  a la 28) y los preexistentes **H1-H3** de la feature 24 más el CTA de precios.
- Deuda ajena confirmada intacta (C10): `ArticlesList.tsx` y `Blog.tsx` sin migrar
  a `normalizeApi`, y el doble `useReveal`.

---

## 2026-07-31 — Feature 29: Vista admin de imágenes (maqueta con datos mock)

**Estado final:** done — **APROBADO** en `progress/review_29.md` §12.7 (re-review).
**Hubo un rechazo previo:** el primer veredicto (§1-§11, sobre el commit `339752c`)
fue `CHANGES_REQUESTED` **solo por C2**, cobertura: dos cláusulas del `acceptance`
alcanzables desde la UI no tenían ningún test — el **estado vacío**
(`ImagesGrid.tsx:288-291`, acceptance 1) y la **obligatoriedad de `seccion`**
(`ImageUploadDialog.tsx:82`, acceptance 2, alcanzable en el flujo por defecto con el
filtro en «Todas»). El revisor dejó por escrito que no pedía tocar código de
producción («el código de producción está bien como está», §10) y exceptuó de forma
argumentada los estados de `carga` y `error` (§3.1: `error` es hoy inalcanzable desde
la UI). Se cerró con **dos tests y nada más**, y el revisor lo comprobó él mismo:
`git diff --stat 339752c..HEAD -- src/admin/images/` → **salida vacía**, es decir los
tres archivos de producción quedaron **byte a byte** como los aprobó en §4-§7. El
arreglo fue exclusivamente de cobertura.
**Rama / commit:** `feat/admin-cruds` · código en `339752c` · tests del arreglo en
`86e795f` · veredicto en `1e8fa38` · **4 archivos de `src/`** (3 nuevos + la
reescritura del anclaje de la feature 27).

**Qué se hizo:**

- **`src/admin/images/mockImages.ts` (nuevo):** almacén en memoria con
  `resetMockImages()` y los **9 campos exactos** de `META_COLS`
  (`api-contract.md` §10.2), **sin `bytes`** y **sin inventar un campo `url`**.
  `Seccion` es un tipo **derivado** de `SECCIONES` (`as const`), no una unión
  duplicada, y `SECCION_ERROR` se construye del mismo catálogo. Listado
  `{ rows }` sin paginación y orden `orden ASC, id ASC`. Mensajes de error
  **copiados literalmente del backend** para que el cableado no reescriba copy.
- **`src/admin/images/ImageUploadDialog.tsx` (nuevo):** un solo
  `input[type=file]`, `accept` de png/jpeg/webp (**SVG excluido a propósito y
  explicado en el copy**), límite de 5 MB, `seccion` obligatoria, `alt` opcional
  con `maxLength=300`, `orden` entero ≥ 0 con default 0. Valida además la
  coherencia extensión↔MIME para evitar un 415 gratuito.
- **`src/admin/images/ImagesGrid.tsx` (reescrito sobre el anclaje de la 27):**
  galería por sección con estados de carga/error/vacío, filtro, edición limitada a
  `alt`/`orden`/`seccion` y borrado con `Dialog` de confirmación. **No ofrece
  «reemplazar imagen»** y el copy dice *qué hacer en su lugar*, en dos sitios.
  Conserva nombre de archivo y `export default`, así que el `lazy()` de
  `AppRoutes.tsx` sigue emitiendo su chunk propio (`ImagesGrid-*.js`, 15,26 kB).
- **`src/admin/__tests__/ImagesGrid.test.tsx` (nuevo):** 10 tests en `339752c`,
  **12 tras el arreglo del rechazo**. Cero red de verdad: espía
  `globalThis.fetch` y afirma `not.toHaveBeenCalled()`.

**Decisiones (declaradas por el autor en `impl_29.md` §4, confirmadas por el review):**

- **`mockPreviewUrl()` en vez de un campo `url`/`preview` en la fila**, para que la
  fila conserve los 9 campos exactos. Las previews son estáticos de `public/`; lo
  subido en sesión no tiene binario y se pinta con «Vista previa no disponible».
  Se evitó `URL.createObjectURL` a propósito: jsdom no lo implementa.
- **Escritura reservada al rol `admin`**: el contrato manda `requireRole('admin')`
  en POST/PATCH/DELETE de imágenes y un `editor` recibiría 403, así que no se le
  ofrece un botón que va a fallar; ve la galería y un `Alert` informativo.
- **`aria-label` fuera de los `TextField select`**: MUI produce nombres accesibles
  duplicados («Filtrar por sección Filtrar por sección») y rompe un `getByRole` con
  string exacto. La etiqueta visible queda como única fuente del nombre. Nota
  heredada útil: el test de `UserDialog` (feature 28) solo pasa porque usa la regex
  `/rol/i`, que tolera «Rol Rol».
- **`mime_type` guarda el MIME declarado**, no el detectado por *magic bytes* como
  hace el backend: en el navegador no hay forma de hacerlo mejor y el diálogo lo
  advierte en el copy. No es un fallo; que no sorprenda al cablear.

**Verificación (rehecha en este cierre, con mis propios ojos, no copiada de ningún
informe):** `npm test && npm run typecheck && npm run build` → **exit 0** los tres ·
`npm test` **17 archivos / 110 tests**, 0 fallos · `npm run typecheck` exit 0 ·
`npm run build` exit 0 con el aviso esperado `Some chunks are larger than 500 kB`
(`✓ built in 34.72s`). Coincide con lo que midió el revisor en §12.1 (110 tests,
`ImagesGrid.test.tsx` 12/12 en aislado). **Sobre el conteo:** el salto `106 → 110`
son +4 y **solo +2 son de la 29** (`ImagesGrid.test.tsx` 10 → 12); los otros +2
vienen de `UsersList.test.tsx` en `cd803cb`, cierre de la feature **28**. Tanto el
autor como el revisor declararon esa atribución en vez de apuntársela.

**Pendiente:**

- **Feature 30 (`pending`) — en curso ahora mismo en otra sesión.** Su código de
  producción ya está commiteado (`c8dec91`, «WIP») y le faltan los tests. En este
  cierre **no se ha tocado** ni su entrada de `feature_list.json` ni
  `src/admin/prices/`, `src/admin/__tests__/PricesList.test.tsx` o
  `progress/impl_30.md`. Si el conteo de tests sube por encima de 110, es suyo, no
  una regresión de la 29.
- **Feature 31 (`pending`) — `normalizeApi` descarta el campo `field` de los 422.**
  Hallazgo de la review de la 28, confirmado por la de la 29 (§4:
  `MockResult<T>` ya modela `field?`). Con **los tres CRUD del backend ya
  publicados**, es **lo primero que hará falta** para cablear de verdad: sin ella el
  marcado por campo se pierde y todo cae al `Alert` global. Es el único punto donde
  el cableado no será mecánico.
- **El backend está completo y verificado contra el servidor vivo**
  (`/api/health` → `{"ok":true,"db":true,"mailer":true}`), **pero las tablas están
  vacías y sin seed**: cablear la landing hoy dejaría precios y carrusel **en
  blanco**. Antes de cualquier feature de integración hace falta sembrar datos.
- **No existe `GET /api/admin/precios`.** El listado de planes del panel sale del
  endpoint **público** `GET /api/precios`. Verificado contra el servidor: responde
  **404, no 401**, así que no es un problema de sesión. Ojo, porque la descripción
  de la feature 30 en `feature_list.json` todavía dice «la ruta es
  /api/admin/precios».
- **Conteos desactualizados en `docs/`** (`review_28.md` §7.2-§7.3):
  `docs/verification.md` §1-§2 y `docs/architecture.md:252` siguen diciendo
  `15 archivos / 86 tests`; el árbol va por **17 / 110**. Se aplazó otra vez a
  propósito: la 30 está en vuelo y escribir la cifra hoy vuelve a dejarla mal.
  Además, este cierre tenía `docs/` fuera de su alcance autorizado.
- **Laguna de cobertura conocida y aceptada** (`review_29.md` §3.1, no obligatoria
  según `verification.md` §5): los estados de **carga** y **error** de la galería no
  se testean. `error` es hoy **inalcanzable desde la UI** (`listMockImages` solo
  falla con una `seccion` fuera del enum, que el `select` no puede producir) y
  probarlo exigiría inyectar un fallo en el mock; `carga` es un `CircularProgress`
  que se resuelve en el mismo tick. También queda sin aserción el `maxLength=300`
  del alt, marcado por el revisor como **no bloqueante** y deliberadamente no
  añadido para no salirse del encargo del rechazo (C10).
- **Nota de scope, no imputable a la 29** (`review_29.md` §7): el filtro
  `minWidth: 220` cae dentro de la franja que **H3** ya desborda a 360 px (la causa
  es el sidebar de `AdminLayout.tsx`, que esta feature no toca). No crea una clase
  nueva de desborde y **no debe arreglarse aquí**; pertenece a H3.
- Siguen abiertos, sin cambios, los pendientes heredados de las features 27 y 28:
  **copy de `AdminHome.tsx`** (reescribir «Próximos pasos» cuando cierre la 30,
  incluida la mención a `node scripts/create-user.js` que la UI ya sustituye), el
  **arnés de suspensión (H2)**, el **flake de `AppRoutes.test.tsx`**,
  `tsconfig.tsbuildinfo` trackeado pese a estar en `.gitignore` (`339752c` vuelve a
  arrastrarlo; deuda del arranque del repo, no de esta feature) y los preexistentes
  **H1-H3** de la feature 24 más el CTA de precios.
- Deuda ajena confirmada intacta (C10): `ArticlesList.tsx` y `Blog.tsx` sin migrar
  a `normalizeApi`, y el doble `useReveal`.

---

## 2026-07-31 — Feature 30: Vista admin de precios (maqueta con datos mock)

**Estado final:** done — **APROBADO** en `progress/review_30.md` (veredicto
`APPROVED`, §2 los 11 `acceptance`, §8 los 11 checkpoints, 11/11 en ambos, sin
rechazo previo).
**Autoría partida, y conviene saberlo al leer el informe:** el **código de
producción lo escribió un implementer que cayó por límite de sesión** antes de
documentarlo (commit `c8dec91`, «feat(admin): maqueta la vista de precios contra
el contrato real (WIP)»). Un **segundo agente** escribió los tests y
**reconstruyó `progress/impl_30.md` leyendo el código**, no de memoria: el propio
informe lo declara en su encabezado, separa «lo que cambié yo» (§1) de «el código
de producción, reconstruido leyéndolo» (§2) y deja en §4 cuatro cosas marcadas
como **no reconstruibles** en vez de inventarles motivación. El revisor **no se
apoyó en ese informe** para nada sustantivo: verificó ejecutando y leyendo la
fuente, y **reprodujo él mismo las nueve mutaciones** con el mismo número de
fallos cada una (§5).
**Rama / commits:** `feat/admin-cruds` · producción en `c8dec91` · tests e informe
en `fdf80c4` · **3 archivos de producción + 1 de test**, ninguno preexistente
modificado.

**Qué se hizo:**

- **`src/admin/prices/mockPrices.ts` (nuevo):** almacén en memoria con
  `resetMockPlanes()` y los **14 campos exactos** del contrato
  (`docs/api-contract.md` §10.4) en español, con `id` como **`string`** (el
  `BIGSERIAL` sin castear). `StoredPlan` = `MockPlan` **sin** `precio_anual` ni
  `ahorro_anual`, y `MockPlanPatch` se deriva de él: los derivados son
  **inexpresables en el PATCH por tipos**, no por disciplina. La aritmética
  (`round(mensual × (1 − pct/100))`, `round((mensual − anual) × 12)`) replica
  `src/precios.js:54-70` del backend. Listado `{ rows }` **sin paginación**,
  orden `orden ASC, id ASC`, y `422 { error, field }` modelado en `MockResult`.
- **`src/admin/prices/PricesList.tsx` (nuevo):** tabla de 9 columnas con chips
  `Destacado` / `A convenir`, viñetas tachadas con `line-through` y el botón de
  editar solo para `role === 'admin'`.
- **`src/admin/prices/PlanEditDialog.tsx` (nuevo):** edita los campos
  almacenados; `precio_anual` y `ahorro_anual` **no son campos**, se pintan en una
  caja `data-testid="derivados"` recalculada en vivo con la misma aritmética.
- **`src/admin/__tests__/PricesList.test.tsx` (nuevo):** **9 tests** que cubren
  los 11 `acceptance`. Cero red: espía `globalThis.fetch` y afirma
  `not.toHaveBeenCalled()`.

**Decisiones que importan:**

- **La trampa del plan Custom se reproduce a propósito.** El seed guarda
  `precio_mensual: null` en Enterprise y `toNumber()` lo devuelve como **`0`**,
  igual que el backend real y **al contrario de lo que dice `API_READY.md`**.
  Sobre ese dato envenenado, la UI decide por **`es_custom`**, nunca por el nulo.
  El test verifica **antes, contra el mock**, que el dato llega como `0`; sin eso
  no distinguiría «detecta `es_custom`» de «se fía del nulo y tiene suerte». El
  revisor lo mutó a `p.precio_mensual == null` y el test cayó (`expected '$0' to
  be '—'`): **discrimina de verdad**.
- **Tests con casos que distinguen fórmulas**, no que solo pasan: `25` al 10 % →
  `$23` (`round(22.5)`; `floor` daría 22), ahorro `(100 − 90) × 12 = 120` (un
  `× 1` no lo simula), y comparación de `textContent` **exacto** en vez de
  `toHaveTextContent`, que hace match de subcadena («$14» dentro de «$140»).
- **La no-editabilidad de los derivados se asserta con el conjunto exacto de
  `textbox`**, así que un «Precio anual» futuro rompe el test aunque se etiquete
  de otra forma. Se demostró con una mutación **aditiva** (M7): la única manera de
  probar que un test detecta algo prohibido es introducir lo prohibido.
- **El seed de Growth da `539`/`720` donde la landing tiene a mano `540`/«$708/año».**
  Está documentado y asumido en el propio mock: es la diferencia que aparecerá el
  día que la landing consuma la API, no un error de esta feature.
- **`Pricing.tsx` no se tocó** (`git diff` vacío, verificado por el revisor), ni
  `src/lib/api.ts`, ni `AppRoutes.tsx`, ni `docs/`.

**Verificación (rehecha en este cierre, con mis propios ojos):**
`npm test && npm run typecheck && npm run build` → **exit 0 los tres** ·
`npm test` **18 archivos / 119 tests**, 0 fallos (52,81 s) · `npm run typecheck`
exit 0 · `npm run build` exit 0 con el aviso esperado `Some chunks are larger
than 500 kB` (`✓ built in 13.84s`). Coincide con lo medido por el implementer
(`impl_30.md` §6) y por el revisor (`review_30.md` §1). Baseline `17 / 110` →
**`18 / 119`**: +1 archivo y +9 tests, **todos atribuibles a esta feature**,
ningún test previo roto.

**Cierre de la tanda de vistas admin (28, 29, 30):**

Con esta feature se cierra el encargo del humano de las **tres vistas**:
**28 usuarios**, **29 imágenes** y **30 precios**. Las tres están **maquetadas con
datos mock y cerradas**, y **ninguna consume el backend**: fue **decisión
explícita del humano**, no una limitación. El siguiente paso natural es el
cableado, y para eso ver los pendientes de abajo — hay tres cosas que hay que
hacer **antes**, en ese orden.

**Pendiente:**

- **Feature 31 (`pending`) — `normalizeApi` descarta el campo `field` de los
  errores 422.** Es **lo primero que hace falta para cablear**: los **tres CRUD
  del backend devuelven `{ error, field }`** en sus 422, y sin esta feature el
  marcado por campo se pierde y todo cae al `Alert` global. Las tres maquetas ya
  modelan `field` en sus `MockResult`, así que el resto del cableado es mecánico;
  este es el único punto donde no lo es.
- **El backend está completo y verificado contra el servidor vivo**
  (`/api/health` → `{"ok":true,"db":true,"mailer":true}`, puerto **3002**), **pero
  las tablas están vacías y sin seed**. Migrar la landing (`Pricing.tsx`,
  `Hero.tsx`, `CTAFinal.tsx`) antes de cargar datos por el panel dejaría la
  **sección de precios y el carrusel en blanco**. Sembrar datos —o cargarlos desde
  el propio panel— antes de cualquier feature de integración.
- **No existe `GET /api/admin/precios`.** El listado de planes del panel sale del
  endpoint **público** `GET /api/precios`. Verificado contra el servidor: responde
  **404, no 401**, así que no es un problema de sesión. La descripción de la
  feature 30 en `feature_list.json` sigue diciendo lo contrario; queda como
  registro histórico, no como contrato.
- **Discrepancia viva entre `API_READY.md` y el código del backend** (recogida en
  `docs/api-contract.md` §10.4): el handoff dice que un plan Custom trae
  `precio_mensual` en `null`, pero el backend lo pasa por `toNumber()` y devuelve
  **`0`**. **La regla segura es detectar `es_custom`, nunca el nulo.** La maqueta
  de precios ya lo hace así y su test lo sujeta.
- **Copy de `AdminHome.tsx`, deuda preexistente y candidata a feature nueva:**
  sigue diciendo que Leads y el mantenedor del blog «llegarán en próximas
  iteraciones», lo cual es **falso desde las features 19-20**, y menciona
  `node scripts/create-user.js`, que **la feature 28 ya reemplazó por UI**. No es
  deuda de la 30.
- **Conteos de test desactualizados en `docs/`**: `docs/verification.md` §1-§2 y
  `docs/architecture.md:252` siguen citando `15 archivos / 86 tests`; el árbol va
  por **18 / 119**. Este cierre tenía `docs/` **fuera de su alcance autorizado**,
  así que se vuelve a aplazar — pero ahora **ya no hay features en vuelo**, luego
  la cifra `18 / 119` es estable y se puede escribir sin que nazca vieja.
- **Observaciones no bloqueantes del revisor** (`review_30.md` §9), a resolver al
  cablear, no antes: el comentario de `formatMoneda` dice «pesos» y usa `es-MX`
  mientras el diálogo dice al usuario «En dólares» (la moneda no está definida ni
  en el contrato ni en la landing); la densidad de `data-testid` (9 entre los dos
  componentes) es un patrón nuevo justificado aquí que conviene no extender; y el
  `Switch` «Plan a convenir» permite alternar `es_custom` sin que §10.4 diga si el
  `PATCH` real lo acepta — **comprobarlo contra el backend antes de cablear** y, si
  no lo admite, quitar el control del formulario.
- **Huecos de documentación declarados, no inventados** (`impl_30.md` §4): por qué
  el mock solo tiene `update` y no `create`/`delete` teniendo el contrato `POST` y
  `DELETE` (se lee como scope deliberado, pero no hay nada escrito), y por qué
  `parseImporte` acepta decimales y `parseOrden` no.
- Siguen abiertos, sin cambios, los pendientes heredados: el **arnés de suspensión
  (H2)**, el **flake de `AppRoutes.test.tsx`** (`findByRole` agotando el timeout
  bajo carga; el archivo pasa 8/8 aislado y no se tocó por C10),
  `tsconfig.tsbuildinfo` trackeado pese a estar en `.gitignore`, los preexistentes
  **H1-H3** de la feature 24 más el CTA de precios, las **lagunas de cobertura
  aceptadas de la 29** (estados de carga y error de la galería), y la deuda ajena
  confirmada intacta: `ArticlesList.tsx` y `Blog.tsx` sin migrar a `normalizeApi`,
  y el doble `useReveal`.

---

## 2026-07-31 — Feature 31: `normalizeApi` propaga el campo `field` de los errores 422

**Estado final:** done — **APROBADO** en `progress/review_31.md` (veredicto
`APPROVED`, §2 los 4 `acceptance` uno a uno, §8 los 11 checkpoints, **11/11**, sin
rechazo previo). Informe del implementer en `progress/impl_31.md`.
**Rama / commit:** `feat/admin-cruds` · `040527a` (padre `a3fe70a`) · **4 archivos**:
`src/lib/api.ts`, `src/lib/__tests__/api.test.ts`, `docs/api-contract.md` y el
propio informe.

**Qué se hizo:**

- **`src/lib/api.ts`:** `ApiFailure` gana `field?: string` (con docblock), nueva
  función privada `readErrorField(data: unknown): string | null` —hermana de
  `readErrorMessage`— y `normalizeApi` propaga el valor con
  `return field ? { ...failure, field } : failure`.
- **`src/lib/__tests__/api.test.ts`:** `describe` nuevo con **6 tests** (422 con
  `field`, 422 sin `field`, `field` no-string, `field` vacío, 5xx sin body y fallo
  de red). Los **7 tests previos quedaron intactos**, ni una línea tocada: el único
  cambio fuera del bloque nuevo es `+ createAdminArticle` en el import.
- **`docs/api-contract.md` §1 «Forma normalizada»:** firma actualizada, fila nueva
  en la tabla de casos y subsección propia con las reglas de `field`.

**Decisiones que importan:**

- **La clave se omite, no se emite como `undefined`.** Un error sin `field`
  devuelve literalmente `{ ok: false, status, error }`, byte a byte lo de antes.
  Por eso el test del caso «sin `field`» no se limita a `toEqual` —que **ignora
  las claves `undefined`**— sino que añade `expect('field' in res).toBe(false)`.
  Esa aserción es la única que discrimina, y quedó demostrado por mutación.
- **Guardas sobre `unknown`, cero `any` y cero aserciones de tipo:** el
  estrechamiento por `'field' in data` basta para desestructurar en TS 5.6. Un
  `field` que no sea string, o en blanco, **se ignora**: propagar un número como
  si fuera el nombre de un input rompería en silencio al consumidor de la 32-36.
- **Aditivo de verdad, no de palabra:**
  `git diff a3fe70a 040527a -- src/admin src/pages src/components src/hooks src/theme`
  → **salida vacía**. Los dos consumidores de `normalizeApi` (`LeadsList.tsx:34` y
  `BlogIndex.tsx:20`) no cambian ni de forma ni de comportamiento.
- **No se amplió el scope:** se dejó intacto el `as { error?: unknown }`
  preexistente de `readErrorMessage`, no se tocó el `403 { error, message }` de
  §10.1 ni `mockPrices.ts`. Se señalaron en `impl_31.md` §2 en vez de arreglarlas,
  que es exactamente lo que pide C10.

**Sobre la review:** el revisor **no se fió del informe**. Reprodujo por su cuenta
las **dos mutaciones** (quitar la propagación → 1 fallo; propagar sin guardas → 4
fallos) con el mismo conteo y los mismos tests caídos que declara `impl_31.md` §3,
restaurando después con `md5sum` idéntico al original. Añadió un test temporal con
**9 bordes extra** del guard (body string, array, number, `null`, ausente,
`field: null`, objeto, en blanco, y `field` sin `error`) que **creó, ejecutó y
borró**, dejando `git status` limpio.

**Verificación (rehecha en este cierre, con mis propios ojos):**
`npm test` **18 archivos / 125 tests**, `Test Files 18 passed (18)`, exit **0**
(88,56 s) · `npm run typecheck` (`tsc -b --noEmit`) exit **0** · `npm run build`
exit **0** con el aviso esperado `Some chunks are larger than 500 kB`
(`✓ built in 12.53s`). Baseline `18 / 119` → **`18 / 125`**: **+6 tests, 0 archivos
nuevos, 0 tests previos rotos**, todos atribuibles a esta feature. Coincide con lo
medido por el implementer (`impl_31.md` §4) y por el revisor (`review_31.md` §1).

> **Salvedad honesta sobre esa medición:** el árbol **no estaba limpio** al
> cerrar. `git status` mostraba modificaciones **sin commitear** en
> `src/lib/api.ts` (+85 líneas de helpers de usuarios) y
> `src/admin/users/UsersList.tsx` (+42/−23): es **WIP de la feature 32**, lanzada
> en paralelo y todavía `pending`. Este cierre **no tocó nada de `src/`**. La cifra
> `18 / 125` se midió con ese WIP presente y coincide igualmente porque **la 32 aún
> no ha añadido tests**; el baseline limpio de esta feature es el del commit
> `040527a`.

> **Nota de método sobre el flake conocido:** en este cierre lancé por error dos
> `npm test` **concurrentes**, y ambos fallaron por timeout de 15 s —uno en
> `PricesList`, el otro además en `AppRoutes` y `ContactModal`—. Repetido **una
> sola ejecución a solas**: 18/125 verde. No es un fallo del árbol; es la misma
> sensibilidad a la carga de CPU ya registrada como flake de `AppRoutes.test.tsx`,
> y ahora se sabe que **alcanza también a `PricesList` y `ContactModal`**. Regla
> práctica: **nunca correr dos suites a la vez** en esta máquina.

**Qué desbloquea:**

Esta era **la pieza que faltaba para cablear**. Con `field` propagado, las
features **32 (usuarios), 33 (imágenes) y 34 (precios)** pueden ir **en paralelo
entre sí**: cada una vive en su propia carpeta (`src/admin/users/`,
`src/admin/images/`, `src/admin/prices/`) y las tres maquetas ya modelan `field`
en su `MockResult`, así que el cableado es mecánico. Este era el único punto donde
no lo era.

**Pendiente:**

- **`src/admin/prices/mockPrices.ts:37`** dice que «`normalizeApi` todavía descarta
  `field` — es la feature 31». **Ya no es cierto.** **No se arregla aquí:** es
  código de la **feature 30**, ya cerrada, y **C10 prohíbe tocar deuda ajena de
  paso**. Corresponde corregirlo —o que desaparezca con el archivo— en la
  **feature 34**, que es quien elimina o reduce ese mock al cablear precios. La
  referencia equivalente de `docs/api-contract.md` §10.4 **ya está corregida**.
- **Las features 35 y 36 (migrar la landing) exigen una decisión explícita de
  fallback**, y va en su `acceptance`: **las tablas del backend están vacías y sin
  seed**, y la landing **no puede quedarse sin precios ni sin carrusel**. O se
  siembran datos —o se cargan desde el propio panel, que para eso están las
  32-34— o la migración define un fallback explícito. No es un detalle de
  implementación: es la condición para que 35 y 36 no rompan producción.
- **No existe `GET /api/admin/precios`**: el listado de planes del panel sale del
  endpoint **público** `GET /api/precios` (verificado: responde 404, no 401). La
  descripción de la feature 30 en `feature_list.json` dice lo contrario; es
  registro histórico, no contrato.
- **Discrepancia viva `API_READY.md` vs backend** (`docs/api-contract.md` §10.4):
  un plan Custom trae `precio_mensual` como **`0`**, no `null`. **Detectar
  `es_custom`, nunca el nulo.**
- **Observaciones no bloqueantes de `review_31.md` §9**, ninguna urgente:
  `docs/architecture.md:319` describe el fallo como `{ ok, status, error }` sin
  mencionar el `field` opcional (correcto, pero incompleto); un `field` con
  espacios alrededor **se propaga sin recortar** —coherente con
  `readErrorMessage`—, así que si las 32-36 lo mapean al `name` de un input,
  conviene normalizar **en el consumidor**; y un `2xx` sin la `key` esperada pero
  con `field` en el body también lo propagaría (caso irreal contra este backend).
- Siguen abiertos, sin cambios, los pendientes heredados de las features 27-30:
  el **copy obsoleto de `AdminHome.tsx`** (candidato a feature nueva), el **arnés
  de suspensión (H2)**, `tsconfig.tsbuildinfo` trackeado pese a estar en
  `.gitignore`, los preexistentes **H1-H3** de la feature 24 más el CTA de precios,
  las **lagunas de cobertura aceptadas de la 29**, las observaciones de
  `review_30.md` §9 (moneda `es-MX` vs «dólares», densidad de `data-testid`, el
  `Switch` de `es_custom` sin respaldo en §10.4) y la deuda ajena confirmada
  intacta: `ArticlesList.tsx` y `Blog.tsx` sin migrar a `normalizeApi`, y el doble
  `useReveal`.

---

## 2026-07-31 — Feature 32: Cablear la vista de usuarios a `/api/admin/users`

**Estado final:** done — **APROBADO** en `progress/review_32.md` (los **10
`acceptance`** uno a uno con archivo y línea, y los **11 checkpoints** C1-C11 en
verde, sin rechazo previo). Informe del implementer en `progress/impl_32.md`.
**Rama / commit:** `feat/admin-cruds` · `ba232e7` · **7 archivos**:
`src/lib/api.ts`, `src/admin/users/UsersList.tsx`, `src/admin/users/UserDialog.tsx`,
`src/admin/users/mockUsers.ts` (**eliminado**), `src/admin/__tests__/UsersList.test.tsx`,
`docs/api-contract.md` y el propio informe.

**Qué se hizo:**

- **`src/lib/api.ts`** (diff **estrictamente aditivo**: 85 líneas insertadas, **0
  eliminadas**, verificado por el revisor sobre el diff y no sobre el informe):
  bloque «Admin: usuarios (feature 32)» con los cinco helpers `listAdminUsers`,
  `getAdminUser`, `createAdminUser`, `updateAdminUser` y `deleteAdminUser`, todos
  por `apiJson` (que ya pone `credentials: 'include'`), más
  `FORBIDDEN_ERROR`/`adminErrorMessage` y los tipos `AdminUserRow extends
  AdminUser`, `UserCreateInput` (exige `password`) y `UserPatchInput =
  Partial<UserInput>` (lo deja opcional). **`password_hash` no aparece en ningún
  tipo del front.**
- **`UsersList.tsx` / `UserDialog.tsx`:** cableados vía `normalizeApi`. Cero
  `fetch` en componentes y cero `'rows' in data` manual en `src/admin/users/`.
- **`mockUsers.ts` eliminado** (126 líneas); las fixtures viven en el test con la
  forma exacta de `PUBLIC_COLS` del backend.
- **`UsersList.test.tsx` reescrito:** **20 casos** con `vi.spyOn(globalThis,
  'fetch')` y `Response` reales, sin mockear `src/lib/api.ts`.
- **`docs/api-contract.md`:** usuarios pasa de §10.3 (maquetación) al nuevo
  **§4 bis** (endpoints vigentes), con rutas, tipos, tabla de errores, las tres
  asimetrías con leads y las dos reglas del borrado.

**Decisiones que importan (fijan el patrón de las features 33 y 34):**

- **El `204` se resuelve en el helper, no en el componente:**
  `res.ok && res.data == null ? { ...res, data: { ok: true } } : res`. El
  `res.ok &&` delante es lo contrario del `if (ok || data == null)` de
  `ArticlesList.tsx:43`: un `500` sin cuerpo sigue siendo un error. El revisor lo
  señaló como **el molde a replicar**.
- **La búsqueda es de cliente, no un `?q=`.** Verificado en el backend
  (`usersRouter.js:53-61` llama a `listUsers(pool)` sin leer `req.query`;
  `users.js:124-129` es un `SELECT … ORDER BY id ASC` sin `WHERE`): mandar `?q=`
  sería inventar contrato. Filtro en `useMemo` y **sin `TablePagination`**, porque
  el contrato es `{ rows }` a secas.
- **El `403` de `requireRole` no tiene la forma habitual:** el backend manda
  `{ ok:false, error:'forbidden', message:'…' }`, así que `ApiFailure.error` trae
  el **token**, no un texto legible. `adminErrorMessage` lo traduce por `status`
  para que un `editor` no lea literalmente «forbidden».
- **`field` → input:** whitelist `FORM_FIELDS.find(f => f === field) ?? null`, de
  modo que un `field` no previsto cae al `<Alert role="status">` global en vez de
  marcar un input inexistente. Primer consumidor de la feature 31.
- **Los dos `409`:** el del usuario propio se sigue **previniendo en la UI**
  (`disabled={isSelf}` + `Tooltip`), y el del último admin **solo se conoce por
  respuesta** —no es deducible en cliente—, así que se pinta `res.error` tal cual.
- **`id` se mantiene `number`** en usuarios: cambiarlo a `string` tocaría
  `AdminGuard`, `Login` y `AdminLayout`, que no son de esta feature (C10). Las
  features 33 y 34 **sí** piden tratarlo como string.

**Honestidad del informe:** la mutación **M3** salió **verde** —degradar el
`res.ok &&` no lo detectaba la suite, porque `normalizeApi` ya revalida `ok`— y el
implementer **lo escribió en vez de taparlo**: añadió el test que faltaba (un
`500` sin cuerpo en el `DELETE`, que **M3b** sí pone en rojo) y dejó de vender esa
guarda como «la única barrera».

**Sobre la review:** el revisor **no se fió del informe**. Leyó el backend real
(`/var/www/html/maia-landing-back`) y confirmó línea a línea que no hay paginación
ni `?q=`, que los `422` traen `field: 'email'|'password'|'role'` —los tres
cubiertos por el whitelist—, los dos `409` y el `res.status(204).end()`. Aplicó
además **seis mutaciones propias**, una a una, restaurando con `git checkout --`
entre cada una: ignorar `res.field` (**rojo, 2**), no sintetizar el `204`
(**rojo, 1**), mandar siempre `password` en el `PATCH` (**rojo, 1**), pedir
`?limit=25&offset=0` (**rojo, 2**), `adminErrorMessage` a secas (**rojo, 1**) y un
`useMemo` que no filtra (**rojo, 2**). **Ninguna pasó desapercibida.**

**Verificación:** `npm test` **18 archivos / 133 tests** exit **0** ·
`npm run typecheck` exit **0** · `npm run build` exit **0** (aviso esperado de
chunk >500 kB). Baseline `18 / 125` → **`18 / 133`**: **+8 tests netos** (20 casos
nuevos − 12 de la maqueta), **0 archivos nuevos** (se reescribió el test, no se
añadió), **0 tests previos rotos**. Medido tres veces: implementer, revisor y este
cierre (que ya lo mide sobre el árbol con la 33 encima: **18 / 144**).

**Pendiente que deja:**

- **`getAdminUser` es hoy código muerto:** lo pedía el acceptance 1 y respeta el
  patrón de `getAdminArticle`, pero **no lo llama ningún componente ni lo cubre
  ningún test**. Si la 33 y la 34 copian el molde, acabarán tres helpers de
  detalle sin consumidor.
- **El error del listado no se anuncia:** `UsersList.tsx:118` pinta el error en un
  `Box` **sin `role="alert"`**, así que un lector de pantalla no se entera del
  `409` del último admin. Es el patrón heredado de `LeadsList.tsx:100`, no una
  regresión, pero es justo donde aterriza el único error imprevisible.
- **El whitelist de `field` se apoya en una coincidencia de nombres.** Hoy los
  tres del backend coinciden con los del formulario; si en la 34 el backend nombra
  un campo distinto al del input, hará falta un `Record` explícito.
- **Drift documental:** `docs/architecture.md:9` sigue diciendo que usuarios está
  «en maquetación… con datos mock» y su §5 no lista `/api/admin/users`.

---

## 2026-07-31 — Feature 33: Cablear la vista de imágenes a `/api/images` y `/api/admin/images`

**Estado final:** done — **APROBADO** en `progress/review_33.md` (los **10
`acceptance`** con archivo y línea en §2, los **11 checkpoints** C1-C11 en verde,
sin rechazo previo). Informe del implementer en `progress/impl_33.md`.
**Rama / commit:** `feat/admin-cruds` · `af2613e` · **7 archivos**:
`src/lib/api.ts`, `src/admin/images/ImagesGrid.tsx`,
`src/admin/images/ImageUploadDialog.tsx`, `src/admin/images/mockImages.ts`
(**eliminado**), `src/admin/__tests__/ImagesGrid.test.tsx`, `docs/api-contract.md`
y el propio informe.

**Qué se hizo:**

- **`src/lib/api.ts`** (diff **estrictamente aditivo**: `198 insertions(+), 0
  deletions(-)`, un único hunk al final del archivo; el revisor comprobó que
  `postLead`, `apiJson`, `publicJson`, `normalizeApi`, `readErrorMessage`/
  `readErrorField`, `adminErrorMessage` y los helpers de leads, artículos y
  usuarios siguen **intactos byte a byte**): `imageRawUrl`, `listImages`,
  `createAdminImage`, `updateAdminImage`, `deleteAdminImage`, el helper privado
  `apiUpload`, los tipos (`AdminImage`, `ImageSeccion`, `ImagesListResponse`,
  `ImageUploadInput`, `ImagePatchInput`) y la validación de cliente
  (`validateImageFile`, `parseOrden`, `formatFileSize`,
  `ACCEPTED_IMAGE_MIME_TYPES`, `MAX_IMAGE_SIZE_BYTES`, `IMAGE_ALT_MAX`).
- **`ImagesGrid.tsx` / `ImageUploadDialog.tsx`:** cableados vía `normalizeApi`,
  previews con `imageRawUrl`, mapeo de `field` por tabla y los 413/415/422 del
  backend.
- **`mockImages.ts` eliminado** (291 líneas): el contrato y la validación se
  mudaron a `lib/api.ts`, el copy de las secciones a `ImagesGrid.tsx` (con un
  `Record<ImageSeccion, string>` que **obliga a dar etiqueta** a cualquier sección
  nueva) y los datos semilla a las fixtures del test.
- **`ImagesGrid.test.tsx` reescrito:** **23 casos**; el mock incluso responde
  `415` si el POST no llega como `FormData`, imitando a multer.
- **`docs/api-contract.md`:** imágenes pasa de §10.2 al nuevo **§4 ter**.

**Decisiones que importan:**

- **`apiUpload`, y por qué `apiJson` no servía.** `apiJson` fija
  `Content-Type: application/json`; con un `FormData` eso es fatal, porque el
  `Content-Type` correcto es `multipart/form-data; boundary=…` y **el boundary
  solo lo conoce el navegador**. El helper es literalmente
  `{ method, credentials: 'include', body }`, **sin `headers` de ningún tipo**;
  devuelve la misma forma `{ ok, status, data }` que `apiJson` y tampoco lanza.
  **No acepta `headers` desde fuera** —la firma es `(path, body: FormData)`, sin
  parámetro `init`— y **no se exporta**: la puerta no está entreabierta, está
  tapiada. Es el **cuarto transporte** del módulo.
- **Dos transportes en el mismo recurso.** El **listado va por `publicJson`**
  (`credentials: 'omit'`) contra el endpoint **público** `GET /api/images?seccion=`
  —no existe ninguno bajo `/api/admin/` para leer, misma asimetría que precios— y
  las tres escrituras por `apiJson`/`apiUpload` con `credentials: 'include'`.
- **A diferencia de usuarios, el filtro SÍ viaja al backend** (`?seccion=`): aquí
  el endpoint lo acepta. No es un filtro de cliente disfrazado.
- **La URL pública se construye, no llega.** El JSON no trae ningún campo `url`;
  `imageRawUrl(id)` es el **único sitio** donde se aplica `VITE_API_BASE`.
- **`id` como string** (`BIGSERIAL` sin castear): cero `Number(`/`parseInt` sobre
  ids en producción. Al mutarlo a `number`, `typecheck` cae con 6 errores.
- **El `204` con el molde de la 32**, guarda `res.ok &&` incluida, con test del
  `204` como éxito **y** de un `500` sin cuerpo que no debe confundirse con él.
- **`field` → input por tabla, no por whitelist** (atendida la observación 3 de
  `review_32.md`): `FIELD_BY_BACKEND` en el diálogo de subida (`file`, `seccion`,
  `orden`) y `EDIT_FIELD_BY_BACKEND` en el de edición (`alt`, `orden`, `seccion`).
  **Dos tablas y no una** porque son formularios con inputs distintos: el `PATCH`
  no tiene campo `file` y el `POST` no puede recibir un `422` de `alt`. `alt`
  queda fuera de la de subida **a propósito**: el backend lo trunca, no lo rechaza.
- **La validación de cliente se mantiene además de los códigos remotos**, no en su
  lugar: subir 5 MB para recibir un rechazo es tirar ancho de banda. Los `413`/
  `415` se marcan en el campo de archivo; si el backend manda mensaje se muestra
  el suyo, y si llega **sin cuerpo legible** —lo típico de un `413`, porque multer
  corta antes del handler— se usa el copy propio de `STATUS_COPY`.
- **El error del listado ahora sí se anuncia** con `role="alert"` (observación 4
  de `review_32.md`), aplicado **solo a su propio archivo**: no se tocaron
  `UsersList.tsx` ni `LeadsList.tsx` (C10).

**Sobre la review:** el revisor verificó **13 mutaciones propias** (M1-M13 más el
control de tipos), cada una sola sobre el árbol y restaurada desde copia antes de
la siguiente, con la suite aislada: `Content-Type` fijado a mano (**rojo**), el
archivo en `archivo` en vez de `file` (**rojo**), el listado por `apiJson` contra
`/api/admin/images` (**rojo, 3**), `imageRawUrl` a otra ruta (**rojo, 2**), el
`204` sin la guarda `res.ok` (**rojo**, el 500 sin cuerpo), sin comprobar tamaño
(**rojo**), admitir `image/svg+xml` (**rojo**), `filename` de más en el `PATCH`
(**rojo**), ignorar `res.field` (**rojo**), ignorar `STATUS_COPY` (**rojo**), el
filtro sin viajar al backend (**rojo**), borrar el copy de «no se puede
reemplazar» (**rojo**), `apiUpload` sin `credentials` (**rojo**) y `id: number`
(**typecheck rojo, 6 errores**). **Ninguna pasó desapercibida**; el revisor lo
resume como «el estándar que faltó en la 29 y aquí sí está».

**Verificación:** `npm test` **18 archivos / 144 tests** exit **0** ·
`npm run typecheck` exit **0** · `npm run build` exit **0** (aviso esperado de
chunk >500 kB). Baseline `18 / 133` → **`18 / 144`**: **+11 tests netos** (23
casos nuevos − 12 de la maqueta), **0 archivos nuevos** (test reescrito), **0
tests previos rotos**. Medido tres veces: implementer, revisor y este cierre.

**Pendiente que deja:**

- **La ventaja de la tabla sobre el whitelist NO está testeada.** El revisor lo
  probó con un control negativo (**N1**): sustituir `FIELD_BY_BACKEND[res.field]`
  por un cast crudo `res.field as FormField` **pasa los 23 tests en verde**. Un
  caso con `field: 'section'` que deba caer al `Alert role="status"` cerraría el
  círculo. **Aplíquese también a la 34.**
- **`ImagePatchInput` no se deriva de `AdminImage`:** reescribe a mano lo que es
  `Partial<Pick<AdminImage,'alt'|'orden'|'seccion'>>`. Hoy coinciden, pero si
  `AdminImage` cambia el patch deriva en silencio. Es de una línea.
- **`loading` sigue siendo un booleano** y no la máquina `'loading'|'ok'|'error'`
  de `conventions.md` §5. Patrón heredado de `LeadsList`/`UsersList`; si se quiere
  la máquina, es una feature de refactor propia para las tres pantallas.
- **`docs/api-contract.md` §1 se quedó corta:** anuncia «los tres helpers» y
  afirma que «todas las peticiones con body van con `Content-Type:
  application/json`». Con `apiUpload` hay un cuarto transporte y esa frase ya no
  es universal; la lista de consumidores de `normalizeApi` tampoco menciona
  imágenes. El implementer lo detectó y lo dejó escrito en vez de salirse de su
  acotación.
- **Drift documental, tercer cierre consecutivo:** `docs/architecture.md:9` sigue
  diciendo que imágenes está «en maquetación con datos mock», su §5 no lista
  `/api/images` ni `/api/admin/images`, y `docs/verification.md` §1-§2 más
  `docs/architecture.md` §8 siguen anunciando `15 archivos / 86 tests` cuando el
  real es **18 / 144**.

---

## 2026-07-31 — Feature 34: Cablear la vista de precios a `/api/precios` y `/api/admin/precios`

**Estado final:** done — **APROBADO** en `progress/review_34.md` (los **9
`acceptance`** con archivo y línea en su §2, los **11 checkpoints** C1-C11 en
verde, sin rechazo previo). Informe del implementer en `progress/impl_34.md`.
**Rama / commit:** `feat/admin-cruds` · `027d510` · **7 archivos**:
`src/lib/api.ts`, `src/admin/prices/PricesList.tsx`,
`src/admin/prices/PlanEditDialog.tsx`, `src/admin/prices/mockPrices.ts`
(**eliminado**), `src/admin/__tests__/PricesList.test.tsx`,
`docs/api-contract.md` y el propio informe.

**Con esta feature queda CERRADO el cableado del admin.** Los tres CRUD
—usuarios (32), imágenes (33) y precios (34)— consumen ya la API real. Lo que
queda abierto del backlog son las dos features de la landing, 35 y 36.

**Qué se hizo:**

- **`src/lib/api.ts`** (diff **estrictamente aditivo**: `142 insertions(+), 0
  deletions(-)`, un único hunk al final del archivo, verificado por el revisor con
  `git diff --numstat`; `apiJson`, `publicJson`, `postLead`, `normalizeApi`,
  `apiUpload` y los helpers de leads, artículos, usuarios e imágenes quedan
  intactos): `listPlanes`, `getAdminPlan`, `createAdminPlan`, `updateAdminPlan`,
  `deleteAdminPlan`, los tipos (`AdminPlan`, `PlanesListResponse`, `PlanInput`,
  `PlanPatchInput`), la aritmética de los derivados (`calcularPrecioAnual`,
  `calcularAhorroAnual`, `derivarPrecios`), `formatMoneda` y los límites
  `PLAN_NOMBRE_MAX` / `PLAN_TRIAL_MAX`. `parseOrden` y `ORDEN_ERROR` se
  **reutilizan** de la 33: el backend usa literalmente el mismo mensaje
  (`preciosRouter.js:134`).
- **`PricesList.tsx` / `PlanEditDialog.tsx`:** cableados vía `normalizeApi`, con
  alta, edición y borrado con confirmación, tabla `FIELD_BY_BACKEND` para los
  `422` y error del listado con `role="alert"`.
- **`mockPrices.ts` eliminado** (287 líneas): contrato, aritmética y formato a
  `lib/api.ts`; parseo de textarea e importes a `PlanEditDialog.tsx`; datos
  semilla a las fixtures del test. **El comentario obsoleto de su línea 37**
  —decía que `normalizeApi` descarta `field`, falso desde la 31— desaparece con el
  archivo y no se reintrodujo en ningún sitio.
- **`PricesList.test.tsx` reescrito:** **24 casos** con `vi.spyOn(globalThis,
  'fetch')` y `Response` reales, sin mockear `src/lib/api.ts`. El mock reproduce
  tres comportamientos del servidor vivo: **404 en `GET /api/admin/precios`**,
  `parseDecimal` rechazando `null` y el recálculo de los derivados (con
  aritmética propia, para no validar `derivarPrecios` contra sí misma).
- **`docs/api-contract.md`:** precios pasa de §10.4 (maquetación) al nuevo
  **§4 quater** (5 rutas, 14 campos, aritmética, asimetría, límites y tabla de
  errores); §10 y §10.4 quedan como registro histórico sin duplicar contrato.

**Decisiones que importan:**

- **La asimetría del listado, confirmada en la fuente del backend por el revisor:**
  `preciosRouter.js:166` declara `GET /api/precios` **sin `adminGuard`**, y
  `:178` es el **único** GET bajo `/api/admin/` (`/:id`). **No existe
  `router.get('/api/admin/precios')`**, así que la ruta cae fuera del router y
  responde **404, no 401**. Por eso `listPlanes` es el único helper con
  `publicJson` (`credentials: 'omit'`) y los otros cuatro van con `apiJson`.
  Misma forma que imágenes (§4 ter), pero aquí ni siquiera hay listado privado al
  que caer.
- **`precio_anual` y `ahorro_anual` no se pueden enviar:** `PlanInput` se deriva
  con `Omit<AdminPlan, 'precio_anual' | 'ahorro_anual' | …>`, de modo que el
  acceptance 3 pasa de disciplina a error de compilación. Además hay red de
  runtime: `toEqual` estricto sobre los cuerpos de POST y PATCH más un test que
  barre **todos** los cuerpos de escritura.
- **Un plan a convenir OMITE las cifras, no las manda en `null`.** Hallazgo de
  leer el backend y la trampa de la feature: `validarPlan` pasa el valor por
  `parseDecimal` (`preciosRouter.js:47-54`), que devuelve `null` para `null` y
  dispara un **422 seguro**. Omitir es lo correcto: `body.precio_mensual ===
  undefined` salta la validación, el POST aplica el default `0` de `withDefaults`
  y el PATCH conserva lo guardado; y con `es_custom: true`, `toPlan()` devuelve
  los dos derivados en `null` igual.
- **Custom se detecta por `es_custom`, nunca por el nulo.** `toPlan()` pasa
  `precio_mensual` por `toNumber()`, que convierte `null` en **`0`**: fiarse del
  nulo pintaría «$0» en el Enterprise. Las cuatro celdas preguntan primero por
  `es_custom` y el diálogo **tampoco transcribe ese `0`** (el campo arranca
  vacío).
- **El `id` es string**, y el test lo prueba de verdad: la fixture de Enterprise
  usa `id: '9007199254740993'`, un `BIGSERIAL` por encima de
  `Number.MAX_SAFE_INTEGER`, y hay un caso que afirma que la URL **no** contiene
  `…992`.
- **`field` → input por tabla, con un test que la distingue de un cast.**
  `FIELD_BY_BACKEND` lleva los seis campos que el backend rechaza *y* tienen input
  con `helperText`. Fuera a propósito: `trial_texto` (el backend lo **trunca**, no
  lo rechaza) y `destacado`/`es_custom` (son `Switch` sin `helperText`, así que un
  cast crudo escribiría el error en un slot que nadie renderiza). **Esto cierra la
  observación 2 de `review_33.md`**: allí el control negativo N1 pasaba en verde;
  aquí la misma sustitución sale en **rojo** por el test del
  `422 { field: 'es_custom' }`.
- **Alta y borrado en la UI, y no es scope de más:** el backend tiene las tablas
  **vacías y sin seed**, así que sin `POST` en el panel la pantalla no podría
  mostrar nunca un plan y la feature 35 se quedaría sin datos que consumir. El
  acceptance 2 nombra el `DELETE` y el 3 nombra el `POST`.
- **`src/components/sections/Pricing.tsx` NO se tocó** (verificado por el revisor:
  0 líneas de diff): la landing sigue con su array `plans` hard-coded, que es la
  feature 35. Tampoco se arregló de paso deuda ajena (el `role="alert"` de
  `UsersList`/`LeadsList`, ni la observación 2 de la 33 en `ImagesGrid`): el
  patrón se aplicó **solo** a los archivos propios (C10).

**Sobre la review:** el revisor **no se fió del informe**. Reejecutó el bloque
completo, leyó la fuente del backend en solo lectura (`preciosRouter.js`,
`precios.js`) para contrastar el 404 del listado, el 422 de `precio_mensual:
null`, el `toNumber()` que convierte el nulo en `0` y la aritmética de los
derivados; compiló una **sonda con `tsc --strict`** para medir el alcance real del
`Omit`; y **reprodujo 7 mutaciones** (M1 → rojo 22, M4, M5 → rojo 3, M6 → rojo 2,
M7, M8 y M13), una a una y revertidas desde copia antes de la siguiente. **La M13
es la que más importaba**: el implementer la había encontrado en **verde** en su
primera pasada —el test marcaba el switch con el campo de precio vacío, así que no
distinguía «lo decide `es_custom`» de «lo decide que el input esté en blanco»— y
reescribió el caso para teclear `349` **antes** de marcar «a convenir». El revisor
confirmó que **la corrección es real y no está a medias**: quitar el `!esCustom`
tumba el test con `expected false, received true`.

**Verificación:** `npm test` **18 archivos / 159 tests** exit **0** ·
`npm run typecheck` exit **0** · `npm run build` exit **0** (aviso esperado de
chunk >500 kB). Baseline `18 / 144` → **`18 / 159`**: **+15 tests netos** (24
casos nuevos − 9 de la maqueta), **0 archivos nuevos** (se reescribió el test, no
se añadió), **0 tests previos rotos**. Medido tres veces: implementer, revisor y
este cierre. **Ningún rojo** en `PricesList` pese a ser uno de los tres archivos
señalados como flakes; se corrió **una sola suite a la vez** en las tres pasadas.

**Pendiente que deja:**

- **El `Omit` bloquea el literal, pero NO el spread.** Verificado con `tsc` por el
  revisor: `createAdminPlan({ ...unAdminPlan })` y `updateAdminPlan(id, plan)`
  **compilan** y colarían los derivados en el body, porque el excess property
  check no aplica al spread ni a las variables. Hoy no pasa —el código construye
  un object literal tipado (`PlanEditDialog.tsx:156-165`) y los tests 7/10/16 lo
  cazarían en runtime—, pero **el informe afirma que «lo garantiza el compilador»
  sin ese matiz**. Es **relevante para la feature 35**, que reutiliza `AdminPlan`
  desde la landing; si hace falta blindarlo, el patrón es un tipo con las claves
  prohibidas en `never` (`{ precio_anual?: never; ahorro_anual?: never }`).
- **Asimetría cosmética al abrir un plan Custom** (`PlanEditDialog.tsx:103-104`):
  «Precio mensual» arranca vacío y «Descuento anual» arranca en `'0'`. Los dos
  quedan deshabilitados y el bloque de derivados dice «Sin cifras», así que no se
  filtra ningún «$0» ni al usuario ni al body. Solo incoherencia visual.
- **`getAdminPlan` sigue sin consumidor en la UI**, como `getAdminUser` desde la
  32 — pero **aquí sí tiene test directo** (URL, método y `credentials`
  congelados). El hueco vivo es el de `getAdminUser`.
- **Referencia cruzada a un salto:** `docs/api-contract.md` §4 ter dice «misma
  asimetría que precios (§10.4)» y §10.4 es ahora un puntero a §4 quater.
- **Drift documental, cuarto cierre consecutivo** (ninguna review lo cuenta como
  fallo porque C6 solo exige `api-contract.md`): `docs/verification.md` §1-§2 y
  `docs/architecture.md` §8 siguen anunciando `15 archivos / 86 tests` cuando el
  real es **18 / 159**; `docs/architecture.md` §5 no lista `/api/precios` ni
  `/api/admin/precios` (ni los de usuarios/imágenes) y su §9 sigue diciendo que
  precios está «en maquetación con datos mock». **Ya es candidato a feature propia
  de documentación**, no a nota al pie.

---

## 2026-07-31 — Feature 35: La sección de precios de la landing consume `/api/precios`

**Estado final:** done — **APROBADO** en `progress/review_35.md` (los **8
`acceptance`** con archivo y línea en su §1, los **11 checkpoints** C1-C11 en
verde, sin rechazo previo). Informe del implementer en `progress/impl_35.md`.
**Rama / commit:** `feat/admin-cruds` · `3332924` · **5 archivos**:
`src/components/sections/Pricing.tsx`,
`src/components/sections/__tests__/Pricing.test.tsx` (reescrito),
`src/theme/__tests__/brandAlpha.test.tsx`, `docs/api-contract.md` y el propio
informe. **`src/lib/api.ts` NO se tocó** (`git diff --stat` vacío): los helpers de
la 34 (`listPlanes`, `AdminPlan`, `formatMoneda`, `normalizeApi`) bastaban.

**Qué se hizo:**

- **`Pricing.tsx` cableado a `GET /api/precios`** vía
  `normalizeApi(listPlanes(), 'rows', …)`, con máquina de estados
  `'loading' | 'ok' | 'error'` (`conventions.md` §5, no un booleano) y guarda
  `vigente` contra `setState` tras desmontar. **Cero `fetch` en el componente**, y
  no por disciplina: `apiJson`/`publicJson` **no se exportan** de `api.ts`, así que
  la frontera la garantiza el módulo.
- **El array `plans` (4 planes, 27 líneas) y su `interface Plan` se ELIMINARON.**
  No quedan como valor por defecto ni como constante muerta. El componente importa
  `AdminPlan` de `api.ts` en vez de redeclarar un tipo local.
- **El fallback decidido por el humano, aplicado tal cual:** `rows: []`, `4xx`,
  `5xx`, body sin `rows` y fallo de red convergen en el mismo
  `if (estado !== 'ok' || planes.length === 0) return null;`.
- **El chip «Ahorra 10%» hard-codeado murió:** la etiqueta sale de
  `descuento_pct`, que es **por plan** — sin descuentos no hay chip, iguales →
  «Ahorra X%», distintos → «Ahorra **hasta** X%», y los `es_custom` se excluyen del
  cálculo (su `descuento_pct: 0` convertiría un «Ahorra 10%» honesto en un «hasta
  10%» falso).
- **`Pricing.test.tsx` reescrito: 22 casos** con `vi.spyOn(globalThis, 'fetch')` y
  `Response` reales, sin mockear `src/lib/api.ts`. Los 5 tests anteriores no se
  borraron sin sustituto (tabla de equivalencias en `review_35.md` §9).
- **`docs/api-contract.md`:** §4 quater suma la landing como consumidora del
  endpoint público y registra el fallback; §10.4 pasa a histórico.

**Decisiones que importan:**

- **Por qué NO hay esqueleto de carga.** Los acceptance 3 y 7 tiran en direcciones
  opuestas: un placeholder con la altura de la sección tendría que **retirarse** en
  los tres casos de fallback —que hoy, con las tablas vacías, son el caso
  *normal*—, y eso **es** el parpadeo «se pinta y desaparece» que el acceptance 3
  prohíbe. Se eligió una sola transición visible: nada → sección definitiva. El
  reflujo cae fuera del viewport (la sección arranca en `pricingTop=4668` a 1440 px
  y `7504` a 360 px, medición de `impl_26.md` §5; CLS solo puntúa desplazamientos
  visibles), y los `.reveal` tardíos siguen animando por el `MutationObserver` de
  `useReveal`.
- **`es_custom` decide, nunca el nulo.** Una sola línea (`Pricing.tsx:123`):
  `const importe = p.es_custom ? null : (isAnnual ? p.precio_anual : p.precio_mensual);`
  El backend manda `precio_mensual: 0` (no `null`) en un plan a convenir, así que
  fiarse del nulo pintaría «$0» en el Enterprise. El test 16 manda `es_custom: true`
  **con las cifras rellenas** (349/314/420) y exige que no aparezca ninguna.
- **`precio_anual` es el mensual facturando anual, no el total del año.** No se
  recalcula ni se usa `derivarPrecios` (reservado a la vista previa del panel): el
  test 7 afirma que aparecen `17`/`179` y que **no** aparecen `204` ni `2,148`.
- **Se borró una guarda inalcanzable en vez de declarar «doble protección».** La
  mutación M8 (quitar el `es_custom` del cálculo del ahorro) salió **verde** con
  razón: dentro de la rama `importe !== null`, `es_custom` ya es `false` por
  construcción. El implementer borró el código muerto en vez de inventarse una
  protección que ningún test honesto podía distinguir. Mismo tipo de hallazgo que
  la M13 de la feature 34.
- **Rejilla adaptativa:** las columnas pasan de `repeat(4, 1fr)` fijo a
  `min(planes.length, 4)` con `maxWidth` centrado. Con 4 o más planes el render es
  **idéntico**; es consecuencia directa de que el número de planes deje de ser una
  constante, no un rediseño.

**El archivo fuera de la lista, declarado y no colado:**
`src/theme/__tests__/brandAlpha.test.tsx` (feature 25) **renderiza `Pricing`** para
leer el CSS que Emotion inyecta, y sus dos aserciones exigen una tarjeta
`destacado` y un `trial_texto`. Sin datos no hay tarjeta, sin tarjeta no hay CSS:
el test pasó a rojo por la propia feature. El implementer lo adaptó al mínimo
(fixture por `fetch`, `await` del heading, `afterEach(vi.restoreAllMocks)`), **con
las dos aserciones de color idénticas byte a byte**, y lo declaró en el commit y en
`impl_35.md`. El revisor lo juzgó **inevitable y andamiaje puro** (las tres
alternativas eran peores, incluida la prohibida por el acceptance 2) y **lo
comprobó mutando el color del borde del distintivo: `brandAlpha` sale ROJO**, o sea
que el test adaptado sigue detectando deriva de color. C10 sigue `[x]`.

**Sobre la review:** el revisor **no se fió del informe**. Reejecutó el bloque
completo, repitió las comprobaciones estáticas una a una, y buscó respaldo
hard-codeado en **las cuatro formas posibles** (constante en el componente, valor
por defecto del `useState`, mock importado en producción y rastro en el resto de
`src/`): cero en las cuatro. Aplicó **8 mutaciones**, cada una sola, con la suite
aislada y `git checkout --` entre ellas: **las 8 en rojo**, incluida **M10**
(reintroducir un `RESPALDO: AdminPlan[]` cuando `rows` viene vacío o la API falla)
→ **ROJO, 4 tests**, y **M2** (esqueleto de carga que luego hay que quitar) →
**ROJO, 4 tests**. El acceptance 2 está protegido por tests, no por buena voluntad.

**Verificación:** `npm test` **18 archivos / 176 tests** exit **0** ·
`npm run typecheck` exit **0** · `npm run build` exit **0** (aviso esperado de
chunk >500 kB). Baseline `18 / 159` → **`18 / 176`**: **+17 netos** (22 casos
nuevos − 5 anteriores), **0 archivos nuevos** (se reescribió el test), **0 tests
previos rotos**. Ningún flake se manifestó; una sola suite a la vez.

**Pendiente que deja:**

- **Los enlaces `#pricing` se quedan sin destino cuando no hay planes**
  (`Navbar.tsx:10`, `Footer.tsx:8`): el clic no hace nada. Es consecuencia directa
  del fallback decidido, no un defecto; el implementer lo **levantó** en vez de
  arreglarlo por su cuenta (habría roto C10). Feature propia.
- **`key={v}` con el texto de la viñeta** (`Pricing.tsx:172,175`): las dos listas
  se pintan como hermanas en el mismo `<ul>`, así que un admin que repita una
  cadena produce claves duplicadas. Era inocuo con datos constantes; ahora los
  teclea una persona en el panel. Arreglo de una línea.
- **Sin validación de forma de la respuesta y sin `ErrorBoundary` en `main.tsx`:**
  una fila con `vinetas: null` —imposible según contrato— se llevaría por delante
  **toda la landing**, no solo la sección. Es el patrón de todo el repo, pero en la
  ruta crítica merece feature propia.
- **Verificación manual pendiente y justificada:** hoy `GET /api/precios` responde
  `{"rows":[]}`, así que lo correcto según el acceptance 2 es **no ver nada**. En
  cuanto se den de alta planes conviene una pasada a 360 px y 1440 px, sobre todo a
  la rejilla con 1, 2 y 3 planes, que ningún test mide en píxeles.

---

## 2026-07-31 — Feature 36: El Hero y el CTA final consumen las imágenes de la API

**Estado final:** done — **APROBADO** en `progress/review_36.md` (los **6
`acceptance`** con archivo y línea en su §1, los **11 checkpoints** C1-C11 en
verde, sin rechazo previo). Informe del implementer en `progress/impl_36.md`.
**Rama / commit:** `feat/admin-cruds` · `7e9c200` · **6 archivos**:
`src/components/sections/Hero.tsx`, `src/components/sections/CTAFinal.tsx`,
`src/components/sections/__tests__/Hero.test.tsx` (**nuevo**),
`src/components/sections/__tests__/CTAFinal.test.tsx` (**nuevo**),
`docs/api-contract.md` y el propio informe. **`src/lib/api.ts` NO se tocó** pese a
estar en el `files` de la feature: los helpers de la 33 (`listImages`,
`imageRawUrl`, `AdminImage`) bastaban. **Ningún archivo fuera de la lista**: no se
repitió el caso `brandAlpha.test.tsx` de la 35.

**Con esta feature queda CERRADO todo el cableado del front contra la API:** los
tres CRUD del admin (32-34) y las dos secciones de la landing (35 y 36). **No queda
ninguna feature en `pending`** en `feature_list.json`.

**Qué se hizo:**

- **`Hero.tsx`** consume `listImages({ seccion: 'hero' })` y **`CTAFinal.tsx`**
  `listImages({ seccion: 'cta_final' })`, los dos vía `normalizeApi`. El filtro va
  **al servidor** (`?seccion=`), no un `filter()` en cliente. Cero `fetch` en los
  componentes. **`HERO_SLIDES` eliminado** (`grep` → 0).
- **Tres estados, iguales en las dos secciones:** *cargando* → el marco con su
  `aspectRatio` final y **ninguna `<img>`**; *con datos* → una `<img>` por fila en
  el orden del backend (CTAFinal pinta `imagenes[0]`); *`rows: []` / 4xx-5xx /
  fallo de red* → **una sola** estática (`/hero.png`, `/maia.png`), sin flechas ni
  puntos.
- **Contrato:** el `src` se **construye** con `imageRawUrl(id)` (no hay campo `url`
  en el JSON: 9 campos exactos), el `alt` sale de la API y `alt: null` → `alt=""`
  (decorativa, `conventions.md` §6), el `id` es **string** (fixtures con
  `'9007199254740993'`, por encima de `MAX_SAFE_INTEGER`).
- **Los controles solo existen con ≥2 imágenes**, y el `setInterval` de 5 s no se
  arma con `total <= 1`: ni flechas que no llevan a ningún sitio ni un temporizador
  girando sobre una sola diapositiva.
- **18 tests nuevos** en dos archivos (`Hero.test.tsx` 10, `CTAFinal.test.tsx` 8)
  con `vi.spyOn(globalThis, 'fetch')` y `Response` reales, sin mockear
  `src/lib/api.ts`.

**Decisiones que importan:**

- **Degradar a un estático y no ocultar el carrusel** (una de las **dos ramas que
  el propio acceptance 2 preautorizaba**). El argumento decisivo y sólido: **una
  imagen vieja no engaña como un precio viejo**. El fallback de la 35 no se decidió
  por layout sino por verdad del dato («no mostrar precios obsoletos como si fueran
  vigentes»); una captura de producto es material ilustrativo y no afirma nada
  falso. Lo que **sí** trasladaba de la 35 —no inventar datos ni mezclar respaldo
  con filas reales— se respeta: es un `if/else` excluyente que jamás concatena.
  Además, ocultar el marco sería CLS **visible**: mide ~540 px de alto dentro del
  primer viewport, al revés que precios (~4 700 px bajo el pliegue).
- **Una sola estática, no las tres de antes.** Conservar `HERO_SLIDES` habría
  dejado en el componente el mismo array hard-codeado que la 35 borró de `Pricing`,
  y un fallo total de la API se vería **idéntico** a la landing de ayer. El revisor
  matizó el argumento: la señal «modo degradado» **no la percibe el visitante**
  (el canal correcto es monitorización); el beneficio real es de **mantenibilidad**,
  y la contrapartida —tres capturas pasan a una en la ruta crítica— el informe no la
  contabiliza. No cambia la decisión.
- **Cero flip: el respaldo nunca se pinta para ser sustituido.** Pintar el estático
  desde el primer render habría quitado el marco vacío inicial, pero produce el
  parpadeo que la 35 prohibió. El marco pasa de vacío a su contenido definitivo en
  **una sola** transición, con un `MutationObserver` que anota el `src` de toda
  `<img>` que llegue a montarse y exige que `/hero.png` **nunca** aparezca cuando
  hay datos.
- **`CTAFinal` reserva la proporción.** El `<img>` iba con `height: 'auto'`, o sea
  que su alto lo decidía la imagen: con una imagen de otra proporción la tarjeta
  entera cambiaba de alto al cargar. Ahora es un `Box` con `aspectRatio: '408 / 612'`
  y la imagen en `contain`. Con `/maia.png` el render es **idéntico** (340×510 en
  ambos casos) y el `borderRadius: 20` se conserva con `overflow: 'hidden'`.
- **Rendimiento medido, no razonado a ojo, y NO se inventó caché.** El backend
  local ya tenía las 4 imágenes cargadas por el panel (3 en `hero`, 1 en
  `cta_final`). Coste por petición irrelevante (2-13 ms); el problema real es que
  **sin `Cache-Control` ni `ETag` cada carga y cada recarga se lleva los ≈556 KB**,
  donde antes `public/` iba por el CDN de Vercel, y que **el LCP gana dos viajes en
  serie** (HTML → JS → listado → binario) contra el servidor de aplicación. La
  recomendación va **al backend**, en prosa: el binario es inmutable por `id`, así
  que `max-age=31536000, immutable` + `ETag` es seguro.

**Sobre la review:** el revisor **no se fió del informe**. Reejecutó el bloque,
repitió las estáticas, y **contrastó la medición contra el servidor real**: los
`size_bytes` suman **556 101 B exactos** (no un redondeo a ojo) y son la cifra
correcta «por carga de landing» porque el Hero **monta las tres `<img>` a la vez**
(las inactivas van con `opacity: 0`); confirmó con `curl -D-` que **no hay
`Cache-Control`, `ETag` ni `Last-Modified`**; y verificó que no se coló ninguna
caché en cliente (`grep localStorage|sessionStorage|Cache` → 0, una sola petición
por montaje). Aplicó **14 mutaciones**, cada una sola, una suite a la vez y
revirtiendo antes de la siguiente (`git diff` final vacío): **13 en rojo**.

**Verificación:** `npm test` **20 archivos / 194 tests** exit **0** ·
`npm run typecheck` exit **0** · `npm run build` exit **0** (aviso esperado de
chunk >500 kB). Baseline `18 / 176` → **`20 / 194`**: **+18 netos**, 2 archivos
nuevos, **0 tests previos tocados ni rotos** — `AppRoutes.test.tsx` y
`NotFound.test.tsx` montan la ruta `/` completa pero ya interceptaban `fetch` con
`{ rows: [] }`, así que hoy ejercitan el camino de respaldo y siguen verdes solos.
**Esa es la diferencia práctica del fallback elegido:** una sección que nunca
desaparece no arrastra a quien la renderice, al revés que la 35. Medido tres veces
(implementer, revisor y este cierre), sin un solo flake.

**Pendiente que deja (los dos primeros son los hallazgos vivos de la review):**

- **`Hero.tsx:236-247` — el marco vacío del estado de carga se vuelve PERMANENTE
  si el backend de Render está dormido.** Es la ruta crítica: la cadena es HTML →
  JS → `GET /api/images` → binario, y con el servicio frío la primera petición
  puede tardar **decenas de segundos** con el primer viewport enseñando un marco de
  ~540 px **completamente vacío**. No incumple el acceptance 2 y la alternativa
  obvia (pintar el estático desde el primer render) reintroduce el parpadeo que
  prohibió la 35, pero la mitigación es barata y **no está**: `timeout` corto (2-3 s)
  → estado `error` → respaldo, o un placeholder con `/hero.png` difuminada.
  **Feature propia; decisión del humano.** Es el hallazgo más importante de esta
  tanda.
- **`Hero.test.tsx:40-46` no discrimina:** de las 14 mutaciones del revisor, 13
  salieron rojas y **H1 (ordenar por `id` en cliente) salió VERDE**, porque los tres
  `id` de la fixture están en orden ascendente y coinciden con `orden`. El
  acceptance 4 sí tiene verificación discriminante en la otra mitad
  (`CTAFinal.test.tsx:28-29` pone a propósito un `id` mayor en la primera fila, y
  C1 sale en rojo) y el componente no contiene ningún `sort`: es laguna de fixture,
  no de comportamiento. **Arreglo de una línea:** dar a `SEGUNDA` un `id` menor que
  el de `PRIMERA`.
- **`public/hero-2.png` y `public/hero-3.png` quedan sin referenciar desde `src/`**
  pero siguen viajando a `dist/` (Vite copia `public/` tal cual): ~170 KB muertos
  por despliegue. El implementer hizo bien en no borrarlos (fuera de su lista).
  Limpieza aparte.
- **Sin `onError` en las `<img>`** (`Hero.tsx:248-264`, `CTAFinal.tsx:114-121`): si
  el listado responde 200 pero el binario de un `id` da 404 —imagen borrada por el
  panel entre el listado y la descarga— sí saldría el glifo de imagen partida.
  Carrera estrecha, anotada por completitud.
- **Pasada visual a 360 px y 1440 px pendiente** (`verification.md` §6), y ahora
  **sí es significativa** porque el backend tiene las cuatro imágenes cargadas:
  mirar que el marco del Hero no parpadee al llegar la respuesta y que el CTA no
  cambie de alto.
