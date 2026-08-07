# Review — feature 23: Unificar los tokens de color duplicados

**Veredicto:** APPROVED

> Revisión con criterio rector "el render debe ser idéntico píxel a píxel".
> Cada valor se recalculó contra `git show HEAD:src/theme/theme.ts` y
> `git show HEAD:src/styles/globals.css`; **no** se dio por bueno el informe del
> implementer. Resultado: **ningún color computado cambia**.

---

## Verificación ejecutada

Ejecutada por el reviewer, no copiada del informe:

- `npm test`          → **13 archivos / 75 tests**, exit 0 (baseline previo 12/68; +1 archivo, +7 tests, 0 tests previos rotos)
- `npm run typecheck` → exit 0
- `npm run build`     → exit 0. Chunk de entrada `index-JkIBH-og.js` 1 586,47 kB; CSS de entrada 0,93 kB. Aviso `Some chunks are larger than 500 kB` presente y **esperado** (`CHECKPOINT.md` C3).

Comprobaciones extra sobre el artefacto:

- `grep -c -- '--orange-h' dist/assets/index-JkIBH-og.js` → 3 ⇒ las variables viajan en el JS.
- `grep -c ':root' dist/assets/index-D8RNylfL.css` → 0 ⇒ `globals.css` ya no declara colores.
- `node_modules/@mui/material/CssBaseline/CssBaseline.js:75-77` confirma que MUI 6.5.0 concatena `theme.components.MuiCssBaseline.styleOverrides` a los estilos globales ⇒ la clave `':root'` se emite de verdad.

---

## Checkpoints

- C1  [x] 75/75 en verde, exit 0, ningún test previo roto.
- C2  [x] `docs/verification.md` §5 exime de test obligatorio los "cambios solo de estilos/tokens", y §6 manda la comprobación visual a revisión manual. Aun así la feature aporta 7 tests: acceptance 1 queda cubierto por 4 de ellos (`tokens.test.tsx:35,39,59,71`) y el riesgo real —que un path de paleta no resuelva— por `tokens.test.tsx:96` y `:114`.
- C3  [x] typecheck 0, build 0.
- C4  [x] Sin `any`, sin variables sin usar (`noUnusedLocals` habría roto el build), nombres/ubicación conformes (`src/theme/tokens.ts` camelCase junto a su vecino `theme.ts`, test en `__tests__/` hermano). Cero hex hardcodeados en componentes (ver §Hex).
- C5  [x] Ningún `fetch` nuevo fuera de `src/lib/api.ts`; sin state manager ni librería de fetching nueva; tipos derivados con `as const` + `typeof` (patrón de `src/lib/industries.ts`), sin duplicar formas.
- C6  [x] La feature no consume ni añade endpoints.
- C7  [x] `feature_list.json` mantiene la 23 en `in_progress` (correcto: el review no había ocurrido) y `progress/current.md` documenta plan, bitácora, verificación y el acceptance 3 como pendiente. Ver nota N2 abajo (inexactitud menor en `docs/architecture.md` §8).
- C8  [x] No se leyó ni escribió `.env` / `.env.local`. Variables de entorno nuevas: ninguna.
- C9  [x] `grep -rnE 'console\.(log|debug)|TODO|FIXME|debugger' src/` → sin coincidencias. `git status` sin `.orig` / `.bak` / temporales.
- C10 [x] El cambio se ciñe a la capa de tokens + barrido de hex + docs. Los demás hunks del `git diff` pertenecen a las features 17-22 (`done`, sin commitear): `normalizeApi` (f20), `AppRoutes`/`React.lazy` (f22), `MutationObserver` de `useReveal` (f21), flag `enabled` de `AdminLayout` (f18), `NotFound` (f17), `README` (f19). La 23 **no** arregló deuda ajena: dejó intactos `var(--black)`, la unificación `#FFF9F6`/`#FFF8F5`, los tokens de opacidad y el bloque comentado de `Pricing`.
- C11 [x] `git status --porcelain package.json vite.config.ts tsconfig.json vercel.json .gitignore package-lock.json` → salida vacía. `tsconfig.tsbuildinfo` sí aparece modificado, pero es un artefacto ya versionado que regenera cualquier `npm run build`; no está en la lista protegida de `docs/conventions.md` §8.

---

## Tabla token a token — capa de variables CSS

Antes: `:root` en `git show HEAD:src/styles/globals.css`.
Después: `cssVariables` en `src/theme/tokens.ts:96-116`, inyectado vía `src/theme/theme.ts:87-91`.

| Variable | Antes | Después (derivado) | Valor computado después | Veredicto |
|---|---|---|---|---|
| `--orange`     | `#E8440A` | `brand.orange`      | `#E8440A` | ✅ idéntico |
| `--orange-h`   | `#D03A08` | `brand.orangeHover` | `#D03A08` | ✅ idéntico |
| `--orange-l`   | `#FF6B35` | `brand.orangeLight` | `#FF6B35` | ✅ idéntico |
| `--orange-xl`  | `#FFF0EB` | `brand.orangeXL`    | `#FFF0EB` | ✅ idéntico |
| `--orange-xxl` | `#FFF8F5` | `brand.orangeXXL`   | `#FFF8F5` | ✅ idéntico |
| `--orange-xxxl`| *(no existía)* | `brand.orangeXXXL` | `#FFF9F6` | ✅ aditiva, 0 consumidores (`grep var(--orange-xxxl)` → 0) |
| `--bg`         | `#FFFFFF` | `surface.main`      | `#FFFFFF` | ✅ idéntico |
| `--bg-soft`    | `#FAFAF9` | `surface.soft`      | `#FAFAF9` | ✅ idéntico |
| `--bg-strong`  | `#252525` | `surface.strong`    | `#252525` | ✅ idéntico (sigue sin equivalente en la paleta, como antes) |
| `--surface`    | `#FFFFFF` | `surface.main`      | `#FFFFFF` | ✅ idéntico (sin uso, igual que antes) |
| `--surface2`   | `#FFF5F1` | `surface.tint`      | `#FFF5F1` | ✅ idéntico (sin uso, igual que antes) |
| `--border`     | `#F0EBE8` | `border.main`       | `#F0EBE8` | ✅ idéntico |
| `--border2`    | `#E5DDD9` | `border.strong`     | `#E5DDD9` | ✅ idéntico |
| `--text`       | `#1A1410` | `text.primary`      | `#1A1410` | ✅ idéntico |
| `--text2`      | `#4A3F3A` | `text.secondary`    | `#4A3F3A` | ✅ idéntico |
| `--muted`      | `#7A6E6A` | `text.muted`        | `#7A6E6A` | ✅ idéntico |
| `--muted2`     | `#A89E9A` | `text.disabled`     | `#A89E9A` | ✅ idéntico |
| `--green`      | `#16A34A` | `brand.green`       | `#16A34A` | ✅ idéntico |
| `--green-l`    | `#DCFCE7` | `brand.greenLight`  | `#DCFCE7` | ✅ idéntico |

18 variables antes → 18 conservadas + 1 aditiva. **Ninguna huérfana, ninguna perdida, ningún dígito ni caja de letra alterados.**

## Tabla token a token — paleta MUI

| Clave | Antes (`HEAD:theme.ts`) | Después | Valor | Veredicto |
|---|---|---|---|---|
| `primary.main`         | `#E8440A` | `tokens.brand.orange` | `#E8440A` | ✅ |
| `primary.dark`         | `#D03A08` | `tokens.brand.orangeHover` | `#D03A08` | ✅ |
| `primary.light`        | `#FF6B35` | `tokens.brand.orangeLight` | `#FF6B35` | ✅ |
| `primary.contrastText` | `#FFFFFF` | `tokens.text.onBrand` → `surface.main` | `#FFFFFF` | ✅ alias, mismo valor |
| `secondary.main`       | `#1A1410` | `tokens.text.primary` | `#1A1410` | ✅ |
| `background.default`   | `#FFFFFF` | `tokens.surface.main` | `#FFFFFF` | ✅ |
| `background.paper`     | `#FFFFFF` | `tokens.surface.main` | `#FFFFFF` | ✅ |
| `text.primary`         | `#1A1410` | `tokens.text.primary` | `#1A1410` | ✅ |
| `text.secondary`       | `#4A3F3A` | `tokens.text.secondary` | `#4A3F3A` | ✅ |
| `text.disabled`        | `#A89E9A` | `tokens.text.disabled` | `#A89E9A` | ✅ |
| `success.main`         | `#16A34A` | `feedback.successMain` → `brand.green` | `#16A34A` | ✅ alias |
| `success.light`        | `#DCFCE7` | `feedback.successLight` → `brand.greenLight` | `#DCFCE7` | ✅ alias |
| `success.dark`         | `#14532D` | `feedback.successDark` | `#14532D` | ✅ |
| `error.main`           | `#DC2626` | `feedback.errorMain` | `#DC2626` | ✅ |
| `error.light`          | `#FEE2E2` | `feedback.errorLight` | `#FEE2E2` | ✅ |
| `divider`              | `#F0EBE8` | `tokens.border.main` | `#F0EBE8` | ✅ |
| `brand.*` (7 claves)   | mismos 7 hex | `{ ...tokens.brand }` | idénticos + `orangeXXXL` nuevo | ✅ aditivo |
| `surface.main/soft/tint` | `#FFFFFF`/`#FAFAF9`/`#FFF5F1` | `tokens.surface.*` | idénticos | ✅ |

### Overrides de `MuiButton` (el punto con alfa, el de mayor riesgo de redondeo)

| Regla | Antes | Después | Computado | Veredicto |
|---|---|---|---|---|
| `containedPrimary.boxShadow` | `0 4px 16px rgba(232,68,10,0.25)` | `` `0 4px 16px ${alpha(tokens.brand.orange, 0.25)}` `` | `0 4px 16px rgba(232, 68, 10, 0.25)` | ✅ **verificado con node**: `alpha('#E8440A',0.25)` → `rgba(232, 68, 10, 0.25)`. Solo cambian espacios; CSS los ignora. |
| `containedPrimary:hover.boxShadow` | `0 6px 20px rgba(232,68,10,0.35)` | `alpha(..., 0.35)` | `rgba(232, 68, 10, 0.35)` | ✅ verificado con node, sin redondeo |
| `containedPrimary:hover.backgroundColor` | `#D03A08` | `tokens.brand.orangeHover` | `#D03A08` | ✅ |
| `outlined.borderColor` | `#E5DDD9` | `tokens.border.strong` | `#E5DDD9` | ✅ |
| `outlined.color` | `#1A1410` | `tokens.text.primary` | `#1A1410` | ✅ |
| `outlined:hover.borderColor` | `#E8440A` | `tokens.brand.orange` | `#E8440A` | ✅ |
| `outlined:hover.backgroundColor` | `#FFF8F5` | `tokens.brand.orangeXXL` | `#FFF8F5` | ✅ |

## Tabla token a token — sustituciones en componentes

Equivalencias verificadas contra la fuente de MUI 6.5.0, no contra el informe:
`common = {"black":"#000","white":"#fff"}` (`@mui/material/colors/common`), y
`createTheme({}).palette.background.paper === '#fff'`.

| Archivo:línea | Antes | Después | Computado antes → después | Veredicto |
|---|---|---|---|---|
| `Navbar.tsx:83` | `background: '#fff'` | `bgcolor: 'background.paper'` | `#fff` → `#FFFFFF` | ✅ mismo color |
| `Pain.tsx:91`, `Features.tsx:76`, `Addons.tsx:92`, `Pricing.tsx:61`, `Testimonials.tsx:22`, `Trust.tsx:13`, `ROI.tsx:40`, `FAQ.tsx:46`, `Blog.tsx:39`, `BlogIndex.tsx:42`, `BlogArticle.tsx:61`, `LegalPage.tsx:49,127`, `Solution.tsx:104` | `background: '#fff'` | `bgcolor: 'background.paper'` | `#fff` → `#FFFFFF` | ✅ |
| `CTAFinal.tsx:9,18,19,31`, `Blog.tsx:57`, `Pain.tsx:101`, `Pricing.tsx:70`, `Solution.tsx:92`, `LegalPage.tsx:75`, `Hero.tsx:198,211` | `'#fff'` | `'common.white'` | `#fff` → `#fff` | ✅ literalmente el mismo string |
| `MarkdownRenderer.tsx:54` | `background: '#000'` | `bgcolor: 'common.black'` | `#000` → `#000` | ✅ |
| `Hero.tsx:165` | `background: '#FAFAF9'` | `bgcolor: 'surface.soft'` | `#FAFAF9` → `#FAFAF9` | ✅ |
| `MarkdownRenderer.tsx:122,131` | `background: '#FAFAF9'` | `background: 'var(--bg-soft)'` | `#FAFAF9` → `#FAFAF9` | ✅ |
| `Solution.tsx:58` | `background: '#FFF9F6'` | `bgcolor: 'brand.orangeXXXL'` | `#FFF9F6` → `#FFF9F6` | ✅ **casi-duplicado preservado, no unificado con `#FFF8F5`** — correcto |
| `Hero.tsx:96`, `Solution.tsx:38`, `Integrations.tsx:11`, `Testimonials.tsx:12` | `#FFFFFF` dentro de `linear-gradient` | `var(--bg)` | `#FFFFFF` → `#FFFFFF` | ✅ |
| `WhatsAppFloat.tsx:17` | `bgcolor: '#25D366'` | `tokens.external.whatsapp` | `#25D366` → `#25D366` | ✅ |
| `WhatsAppFloat.tsx:19` | `boxShadow: '0 4px 16px #075E54'` | template con `tokens.external.whatsappShadow` | `#075E54` → `#075E54` | ✅ |
| `AdminLayout.tsx:77-78` (`style={{}}` de `NavLink`) | `#E8440A` / `#1A1410` / `#FFF0EB` | `tokens.brand.orange` / `tokens.text.primary` / `tokens.brand.orangeXL` | idénticos | ✅ |
| `LeadDetailDialog.tsx:19,53,60`, `LeadsList.tsx:136` | `style={{ color: '#A89E9A' }}` | `tokens.text.disabled` | `#A89E9A` → `#A89E9A` | ✅ |
| `Pain.tsx:35,42,49,56,63` | `#f55c2b`,`#7C3AED`,`#0369A1`,`#b90f0f`,`#0891B2` | `tokens.accent.coral/violet/blue/red/cyan` | idénticos, minúsculas incluidas | ✅ |
| `Features.tsx:24,30,36,42,48,54` | `#E8440A`,`#7C3AED`,`#0369A1`,`#16A34A`,`#D97706`,`#E8440A` | `brand.orange`/`accent.violet`/`accent.blue`/`brand.green`/`accent.amber`/`brand.orange` | idénticos | ✅ |
| `Addons.tsx:26,34,45,53` | `#b90f0f`,`#7C3AED`,`#0369A1`,`#16A34A` | `accent.red`/`accent.violet`/`accent.blue`/`brand.green` | idénticos | ✅ |

Sobre los `accent`: se consumen con concatenación de alfa (`` `${accent}18` ``).
Como los valores son string-idénticos (incluida la caja de letra), la
concatenación produce exactamente el mismo hex de 8 dígitos que antes.

Riesgo revisado y descartado: `background` (shorthand) → `background-color`
(`bgcolor`). El shorthand también reseteaba `background-image`/`position`, pero
ningún elemento afectado los declara, y `Paper`/`Accordion` en MUI 6 solo pintan
`backgroundImage` en modo oscuro (aquí `mode: 'light'`). Resultado computado
idéntico. `tokens.test.tsx:96-112` lo confirma en jsdom para
`background.paper`, `surface.soft`, `brand.orangeXXXL`, `common.white` y
`common.black`.

---

## Cobertura: variables huérfanas y `var(--…)` sin definir

`grep -rhoE 'var\(--[a-z0-9-]+\)' src/ index.html | sort -u` → 17 variables usadas.

- **Usadas y definidas (16):** `--bg`, `--bg-soft`, `--bg-strong`, `--border`, `--border2`, `--green`, `--green-l`, `--muted`, `--muted2`, `--orange`, `--orange-h`, `--orange-l`, `--orange-xl`, `--orange-xxl`, `--text`, `--text2`. ✅
- **Usada y NO definida (1):** `--black` en `Addons.tsx:142` y `:150`. **Tampoco estaba definida en `HEAD:globals.css`** (verificado): es un bug preexistente. El implementer lo dejó intacto a propósito, que es lo correcto — declararla habría *cambiado* el render (esos dos precios pasan hoy de heredado a explícito). Sin regresión.
- **Definidas y sin consumidor (3):** `--surface`, `--surface2` (ya sin uso antes de la feature) y `--orange-xxxl` (nueva, aditiva). Ninguna afecta al render.

**Orden de definición.** Correcto y sin ventana de flash:
`src/main.tsx:11-12` monta `<ThemeProvider><CssBaseline />` y MUI 6.5.0 emite
`:root { … }` como estilo global de Emotion, comprobado en
`tokens.test.tsx:114-125` (`document.head` contiene `:root` y `--orange:#E8440A`).
El único consumidor previo al montaje es
`globals.css:20-22` (`body { background: var(--bg); color: var(--text) }`), y
`index.html:14` sirve un `<div id="root">` **vacío**: no hay nada pintado en ese
intervalo, y el fondo cae al blanco por defecto del navegador, idéntico a
`--bg: #FFFFFF`. No es inyección en runtime "tardía" con contenido a la vista.

---

## Hex hardcodeados (acceptance 2)

`grep -rnE '#[0-9a-fA-F]{3,8}' src/` ejecutado por el reviewer. Todas las
coincidencias, sin excepción, contrastadas una a una:

| Coincidencia | Justificación | ¿Válida? |
|---|---|---|
| `src/theme/tokens.ts:23-84` (29 hex) | Es la fuente de verdad. Cada hex aparece **una sola vez**; verificado que no hay repetidos (los alias referencian al token base: `feedback.successMain → brand.green`, `text.onBrand → surface.main`). | ✅ por diseño |
| `src/theme/__tests__/tokens.test.tsx:13-93` | Test que **congela** los valores. Debe llevar literales o no prueba nada. | ✅ |
| `src/components/Navbar.tsx:8`, `src/components/Footer.tsx:6` | `'#features'` — ancla de navegación, falso positivo del regex. | ✅ no es color |
| `src/components/sections/Pricing.tsx:120` — `color: '#fff'` | Verificado: está dentro del bloque JSX comentado `Pricing.tsx:105-132`, código muerto **anterior** a esta feature. No se renderiza ni se compila. | ✅ aceptable; ver N1 |

**Cero hex de color activos fuera de la capa de tokens.** Acceptance 2 cumplido
en su barrido de hex.

Literales `rgba()` restantes (21, listados en el informe §2.5 y anotados como
deuda en `docs/architecture.md` §10): no son hex y quedan fuera del barrido
pedido; ninguno se introdujo en esta feature. Se aceptan como deuda documentada,
con la observación N3.

---

## Discrepancias preexistentes: cómo se resolvieron

Se pidió expresamente **no** resolverlas eligiendo un valor. Verificado uno a uno:

1. **Tema vs variables CSS.** Recalculado el inventario contra `HEAD`: los 15
   tokens presentes en ambas capas tenían el mismo hex. **No había ninguna
   discrepancia de valor**; el informe es exacto en este punto.
2. **Asimetría de cobertura preservada.** `--bg-strong` (`#252525`) y `--muted`
   (`#7A6E6A`) siguen existiendo solo como variable CSS (no se colaron en la
   paleta MUI); `error.main`, `error.light`, `success.dark` y
   `primary.contrastText` siguen solo en el tema (no se crearon variables
   `--error-*`). Superficie sin cambios en ninguna dirección.
3. **`#FFF8F5` (`--orange-xxl`) vs `#FFF9F6` (`Solution.tsx`).** Difieren en 1/255
   por canal. **No se unificaron**: el segundo vive ahora como `brand.orangeXXXL`
   con su valor exacto. Ambos consumidores conservan su aspecto. ✅ resolución
   correcta.
4. **`#FF6B35` (`--orange-l`) vs `#f55c2b` (`accent.coral`).** Conservados los dos
   como tokens distintos. ✅
5. **`var(--black)` inexistente.** Preservado el bug, no "arreglado". ✅ es lo que
   preserva el render.

En los cinco casos la resolución **no cambia lo que ve el usuario por ninguno de
los dos caminos**.

---

## Acceptance 3 — PENDIENTE DE UN HUMANO (no cumplido, no fallido)

> "El aspecto visual no cambia: revisar landing, blog y admin a 360 px y 1440 px
> y anotarlo en `progress/current.md`."

**No es cumplible en sesión headless y este review no lo da por cumplido.**
`docs/verification.md` §6 lo clasifica como verificación manual con `npm run dev`.

**Veracidad del informe: correcta.** El implementer **no** afirma haberlo hecho.
`progress/impl_23.md:241-243` y `progress/current.md:76-78` dicen literalmente
"No he revisado la landing, el blog ni el admin a 360 px y 1440 px: no tengo
navegador en este entorno. No lo doy por hecho." Eso es exactamente lo que se
esperaba y no penaliza C1-C3.

**Queda abierto para un humano**, con la lista de puntos calientes del informe
(§4) que este review considera bien elegida: tarjetas blancas de `Pain`,
`Features`, `Addons`, `Pricing`, `Testimonials`, `ROI`, `Trust`, `Integrations`;
acordeones de `FAQ`; menú móvil de `Navbar`; cabeceras sticky de `/blog`,
`/blog/:slug` y `/privacidad`; carrusel del `Hero`; tarjetas de `Solution`.
Añadir a esa lista: **el FAB de WhatsApp** (`box-shadow` reconstruido con
template string) y **el sidebar del admin** (`style={{}}` nativo del `NavLink`
activo, fuera del sistema `sx`).

---

## Detalle de los fallos

**Ninguno bloqueante.** Ningún criterio C1-C11 queda en `[ ]`.

Observaciones no bloqueantes, para corregir cuando toque:

- **N1** — `src/components/sections/Pricing.tsx:105-132`: bloque JSX comentado
  que arrastra el último `#fff` del repo. Viola `docs/conventions.md` §7
  ("código comentado por si acaso"), pero es **preexistente** y limpiarlo aquí
  habría violado C10. Correctamente dejado fuera de scope y anotado en
  `progress/current.md:109`.
- **N2** — `docs/architecture.md:243`: dice "13 archivos de test, **73 tests**";
  el recuento real es **75** (`npm test` de este review). Además el bloque de
  código de :246-250 lista 9 de los 13 archivos y **omite
  `src/theme/__tests__/tokens.test.tsx`**, que es justamente el que aporta esta
  feature (faltan también `hooks/__tests__/useReveal.test.tsx`,
  `lib/__tests__/api.test.ts` y `__tests__/AppRoutes.test.tsx`). El informe
  declara haber actualizado §8; la actualización quedó incompleta. Sin impacto
  en código ni en render.
- **N3** — `src/components/sections/Pain.tsx:93,97,136`,
  `Pricing.tsx:63,88`, `Solution.tsx:92`: 8 literales `rgba(232,68,10,x)` /
  `rgba(22,163,74,x)` siguen duplicando el naranja y el verde de marca fuera de
  `tokens.ts`. No son hex (fuera del acceptance 2 tal como está redactado) y no
  se introdujeron aquí, pero **erosionan la fuente única**: cambiar
  `brand.orange` dejaría esas sombras con el naranja viejo. El patrón para
  resolverlo ya existe y está probado en `src/theme/theme.ts:101`
  (`alpha(tokens.brand.orange, 0.25)`). Queda como deuda en
  `docs/architecture.md:301`; merece feature propia.
- **N4** — `src/components/sections/Pricing.tsx:69`: `background: 'primary.main'`
  convive con `bgcolor: 'primary.main'`. El sistema `sx` de MUI **no** mapea la
  clave `background` a la paleta, así que emite `background: primary.main`, una
  declaración inválida que el navegador descarta. Es **preexistente** (está igual
  en `HEAD`) y el render lo salva el `bgcolor` de al lado; no es regresión de
  esta feature, pero conviene borrarlo.

---

## Por qué se aprueba

1. **Equivalencia demostrada, no asumida.** Los 18 valores de la capa CSS, las 18
   claves de paleta y los 7 overrides de `MuiButton` se recalcularon contra
   `HEAD`. Ningún dígito, ninguna caja de letra, ningún hex de 3 vs 6 dígitos y
   ningún valor con alfa cambian: `alpha('#E8440A',0.25)` se verificó en node y
   devuelve `rgba(232, 68, 10, 0.25)`.
2. **Cobertura cerrada.** Cero variables perdidas, cero `var(--…)` nuevas sin
   definir, el único caso sin declarar (`--black`) es preexistente e intacto.
3. **Las discrepancias preexistentes se preservaron**, no se resolvieron, en los
   cinco casos.
4. **La honestidad del informe se sostiene** en el punto que más importa: el
   acceptance 3 se declara pendiente en vez de fingirse cumplido.
5. **La feature no debe marcarse `done` hasta que un humano haga la pasada
   visual a 360 px y 1440 px** y lo anote en `progress/current.md`. La aprobación
   cubre C1-C11; el acceptance 3 sigue abierto.
