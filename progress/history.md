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
