# Feature 23 — Unificar los tokens de color duplicados

**Fecha:** 2026-07-28 · **Estado:** implementada, pendiente de review (NO marcada `done`)
**Baseline previo verificado:** `npm test` 12 archivos / 68 tests · `typecheck` 0 · `build` 0 (chunk de entrada 1 584,84 kB)

---

## 1. Inventario ANTES: ¿coincidían de verdad las dos capas?

Comparación token a token de `src/styles/globals.css` (`:root`) contra
`src/theme/theme.ts`, hecha **antes** de tocar nada:

| Variable CSS | Valor | Equivalente en el tema | ¿Coincidían? |
|---|---|---|---|
| `--orange` | `#E8440A` | `brand.orange`, `primary.main` | ✅ idénticos |
| `--orange-h` | `#D03A08` | `brand.orangeHover`, `primary.dark`, hover de `MuiButton.containedPrimary` | ✅ |
| `--orange-l` | `#FF6B35` | `brand.orangeLight`, `primary.light` | ✅ |
| `--orange-xl` | `#FFF0EB` | `brand.orangeXL` | ✅ |
| `--orange-xxl` | `#FFF8F5` | `brand.orangeXXL`, hover de `MuiButton.outlined` | ✅ |
| `--bg` | `#FFFFFF` | `background.default`, `background.paper`, `surface.main`, `primary.contrastText` | ✅ |
| `--bg-soft` | `#FAFAF9` | `surface.soft` | ✅ |
| `--bg-strong` | `#252525` | — (no existe en el tema) | solo capa CSS |
| `--surface` | `#FFFFFF` | `surface.main` | ✅ (variable sin ningún uso, ya antes) |
| `--surface2` | `#FFF5F1` | `surface.tint` | ✅ (variable sin ningún uso, ya antes) |
| `--border` | `#F0EBE8` | `divider` | ✅ |
| `--border2` | `#E5DDD9` | `MuiButton.outlined.borderColor` | ✅ |
| `--text` | `#1A1410` | `text.primary`, `secondary.main`, `MuiButton.outlined.color` | ✅ |
| `--text2` | `#4A3F3A` | `text.secondary` | ✅ |
| `--muted` | `#7A6E6A` | — (no existe en el tema) | solo capa CSS |
| `--muted2` | `#A89E9A` | `text.disabled` | ✅ |
| `--green` | `#16A34A` | `brand.green`, `success.main` | ✅ |
| `--green-l` | `#DCFCE7` | `brand.greenLight`, `success.light` | ✅ |
| — | `#14532D` / `#DC2626` / `#FEE2E2` | `success.dark`, `error.main`, `error.light` | solo capa tema |

**Conclusión: NO había ninguna discrepancia de valor.** Los 15 tokens presentes
en ambas capas tenían exactamente el mismo hex. Lo único asimétrico era la
*cobertura*: 2 valores existían solo como variable CSS (`--bg-strong`,
`--muted`) y 4 solo en el tema (los de `error`/`success.dark` y el
`contrastText`). **Esa asimetría se ha preservado tal cual**: no he añadido
variables `--error-*` ni he metido `#252525`/`#7A6E6A` en la paleta MUI, porque
nadie los consume por ahí y hacerlo sería cambiar la superficie sin motivo.

### Casi-duplicados detectados (NO tocados, decisión para un humano)

- `#FFF8F5` (`--orange-xxl` / `brand.orangeXXL`) vs **`#FFF9F6`**, hardcodeado en
  `Solution.tsx:58`. Difieren en 1/255 por canal: casi seguro la misma intención
  de diseño, pero **son valores distintos y hoy se ven distintos**. No he elegido
  uno: he conservado los dos, el segundo como token propio
  `brand.orangeXXXL`. Unificarlos es una decisión de diseño, no de refactor.
- `#FF6B35` (`--orange-l`) vs `#f55c2b` (acento de la primera tarjeta de `Pain`).
  Dos naranjas distintos y deliberados. Conservados los dos.

---

## 2. Qué cambié

### 2.1. Fuente de verdad única: `src/theme/tokens.ts` (nuevo)

Contiene **todos** los hex del proyecto, agrupados en `brand`, `surface`, `text`,
`border`, `feedback`, `accent` y `external`. Cada hex literal aparece **una sola
vez** en el archivo: los alias (`feedback.successMain`, `text.onBrand`)
referencian al token base. Exporta además `cssVariables`, el mapa
`'--nombre' → token` con las 19 variables de la capa CSS.

### 2.2. Dirección de la derivación: **TS → CSS** (y por qué)

```
src/theme/tokens.ts
  ├── tokens.*      → theme.ts (palette MUI)      → sx: bgcolor: 'surface.soft'
  └── cssVariables  → theme.components.MuiCssBaseline.styleOverrides[':root']
                                                  → var(--orange), var(--border), …
```

Descarté la dirección contraria (CSS → tema) por razones técnicas, no de gusto:

- El tema se construye como objeto JS **antes** de que exista DOM, y MUI necesita
  hex reales: `alpha()` y `augmentColor` hacen `decomposeColor`, que **lanza** con
  `var(--x)`. Derivar del CSS obligaría a `getComputedStyle(document.documentElement)`
  en tiempo de módulo — imposible en los tests, que importan `theme.ts` sin DOM y
  sin `globals.css` — o a migrar a `createTheme({ cssVariables: true })`, que
  renombra todo a `--mui-palette-*` y forzaría reescribir los ~90 `var(--…)` del
  repo. Eso sí sería un cambio de riesgo alto.
- Al revés no hay fricción: un `Record<'--nombre', string>` se inyecta tal cual
  como estilo global.

**Los dos casos de uso siguen servidos y ningún `sx` existente hubo que
reescribirlo**: los nombres de las variables no han cambiado (`--orange`,
`--orange-h`, `--bg-soft`, `--border2`, `--muted2`…), así que los ~90 usos de
`var(--…)` en gradientes y bordes compuestos siguen funcionando igual, y los `sx`
que ya usaban `'primary.main'` / `'surface.soft'` tampoco se tocaron.

### 2.3. Orden de carga y flash de estilos

`globals.css` se importa desde `main.tsx` y viaja en el `<link>` del bundle; las
variables ahora las monta `<CssBaseline />` en el primer render de React. Es
decir, **las variables llegan más tarde que antes**. Analizado:

- El único consumidor de `var(--…)` que se evalúa antes de montar React es
  `body { background: var(--bg); color: var(--text) }` de `globals.css`.
- `index.html` sirve `<div id="root"></div>` **vacío**: no hay texto ni cajas
  pintadas en ese intervalo. El fondo de página cae al blanco por defecto del
  navegador, que es el mismo `#FFFFFF` que declara `--bg`.
- Desde el primer render, el propio `CssBaseline` fija `body` con
  `background.default` / `text.primary`, que salen de los mismos tokens (y ya lo
  hacía antes, ganándole a `globals.css` en el orden de inserción de Emotion).

Conclusión: **no hay flash de estilos sin token**. La contrapartida, documentada
en `docs/architecture.md` §6: un árbol montado sin `ThemeProvider` + `CssBaseline`
no tendrá las variables — que es el caso de los tests, donde tampoco las tenía
antes (jsdom nunca cargó `globals.css`).

### 2.4. Barrido de hex hardcodeados (acceptance 2)

`grep -rnE '#[0-9a-fA-F]{3,8}' src/` daba **60 coincidencias fuera de las capas de
token**. Criterio de sustitución, en este orden:

| Caso | Sustitución | Ejemplo |
|---|---|---|
| Valor de color suelto en `sx` | token del tema | `background: '#fff'` → `bgcolor: 'background.paper'` |
| Color dentro de string CSS crudo | variable CSS | `linear-gradient(…, #FFFFFF, …)` → `linear-gradient(…, var(--bg), …)` |
| Valor JS puro (`style={{}}`, arrays de datos, `` `${x}18` ``) | import de `tokens` | `accent: '#7C3AED'` → `accent: tokens.accent.violet` |

Archivos tocados: `Solution`, `Features`, `Pain`, `Addons`, `Pricing`,
`Testimonials`, `Integrations`, `Trust`, `ROI`, `FAQ`, `Hero`, `CTAFinal`,
`Blog`, `Navbar`, `WhatsAppFloat`, `MarkdownRenderer`, `LegalPage`, `BlogIndex`,
`BlogArticle`, `AdminLayout`, `LeadsList`, `LeadDetailDialog`.

Equivalencias usadas y su valor computado (todas verificadas, ver §4):

| Antes | Después | Valor |
|---|---|---|
| `#fff` / `#FFFFFF` (fondo) | `bgcolor: 'background.paper'` | `rgb(255,255,255)` |
| `#fff` (texto/hover) | `color`/`bgcolor: 'common.white'` | `rgb(255,255,255)` |
| `#FFFFFF` (dentro de gradiente) | `var(--bg)` | `#FFFFFF` |
| `#FAFAF9` | `bgcolor: 'surface.soft'` / `var(--bg-soft)` | `rgb(250,250,249)` |
| `#FFF9F6` | `bgcolor: 'brand.orangeXXXL'` (token nuevo, mismo valor) | `rgb(255,249,246)` |
| `#000` (letterbox de video) | `bgcolor: 'common.black'` | `rgb(0,0,0)` |
| `#A89E9A` (en `style={{}}`) | `tokens.text.disabled` | `#A89E9A` |
| `#E8440A` / `#1A1410` / `#FFF0EB` (en `style={{}}` de `NavLink`) | `tokens.brand.orange` / `tokens.text.primary` / `tokens.brand.orangeXL` | idénticos |
| `#7C3AED`, `#0369A1`, `#0891B2`, `#D97706`, `#b90f0f`, `#f55c2b` | `tokens.accent.*` | idénticos |
| `#16A34A`, `#E8440A` (acentos de tarjeta) | `tokens.brand.green`, `tokens.brand.orange` | idénticos |
| `#25D366`, `#075E54` (WhatsApp) | `tokens.external.*` | idénticos |
| `rgba(232,68,10,0.25/0.35)` en `theme.ts` | `alpha(tokens.brand.orange, 0.25/0.35)` | `rgba(232, 68, 10, 0.25)` — comprobado con node |

### 2.5. Hex que dejé sin tocar (y por qué)

1. **`src/components/sections/Pricing.tsx:120` — `color: '#fff'`.** Está dentro
   del bloque de CTA **comentado** (líneas 103-132), código muerto anterior a
   esta feature. No se renderiza y limpiarlo (o resucitarlo) es una decisión de
   otra tarea; tocar código comentado solo para satisfacer un grep no aporta.
2. **Literales `rgba(...)`**, sobre todo `rgba(232,68,10,x)` (5 `box-shadow` en
   `Pain`, `Pricing`, `Solution`) y `rgba(22,163,74,x)` (3 en `Pain`, `Pricing`),
   más los `rgba(0,0,0,x)` de sombras y los `rgba(255,255,255,x)` de `CTAFinal` y
   `Hero`. No son hex (fuera del barrido pedido) y **hoy no existe un token de
   opacidad**: convertirlos exigiría o inventar tokens `--orange-a06`… o pasar
   esos `sx` a la forma callback `sx={(theme) => …}` con `alpha()`, un refactor
   de riesgo desproporcionado para esta feature. Anotado como deuda en
   `docs/architecture.md` §10.
3. **Sombras neutras del tema** (`rgba(0,0,0,0.06)`…, escala de `shadows`): no
   son color de marca, viven en la capa de token y las consume MUI. Sin cambios.

### 2.6. Hallazgo aparte: `var(--black)` no existe (no lo he "arreglado")

`Addons.tsx:141` y `:149` usan `color: 'var(--black)'`, pero **`--black` nunca
estuvo declarada** — ni antes ni ahora. Hoy la declaración es inválida en tiempo
de cómputo y el color se hereda (acaba siendo el `--text` del `body`). Lo he
dejado **exactamente igual** para no alterar el render: si declarase la variable,
esos dos precios pasarían de "heredado" a "explícito" y, aunque el valor
resultante probablemente coincida, no puedo confirmarlo sin navegador. Es un bug
preexistente que merece su propia tarea.

### 2.7. Documentación

- `docs/architecture.md` §6 reescrita: fuente única, diagrama de derivación,
  justificación de la dirección TS→CSS, análisis del orden de carga y tabla de
  "cómo usar los tokens". También actualizados §2 (mapa de directorios), §8
  (recuento de tests) y §10 (la deuda de tokens duplicados pasa a resuelta, con
  la deuda residual de los `rgba`).
- `docs/conventions.md` §3: la regla "agrégalo en los dos sitios" ya no aplica;
  ahora se añade en `tokens.ts` y, si hace falta en strings CSS, en
  `cssVariables`. Añadido el tercer caso (import directo de `tokens`).
- `docs/context.md` §4: la deuda "tokens duplicados" queda marcada como resuelta.

---

## 3. Archivos

**Nuevos**

- `src/theme/tokens.ts`
- `src/theme/__tests__/tokens.test.tsx` (7 tests)

**Modificados (capa de tokens):** `src/theme/theme.ts`, `src/styles/globals.css`
(pierde el bloque `:root`; conserva reset, `body`, `.gradient-text` y
animaciones).

**Modificados (barrido de hex):** los 22 componentes/páginas listados en §2.4.

**Docs:** `docs/architecture.md`, `docs/conventions.md`, `docs/context.md`.

---

## 4. Verificación

```
npm test           → 13 archivos / 75 tests · exit 0
npm run typecheck  → exit 0
npm run build      → exit 0 (aviso esperado de chunk >500 kB)
```

Detalle del build: chunk de entrada **1 586,47 kB** (antes 1 584,84 kB; +1,63 kB
porque el mapa de variables pasó del CSS al JS) y CSS de entrada **933 B** (antes
~1,3 kB, al salir el bloque `:root`). Saldo neto ≈ +1,2 kB, sin cambio de
comportamiento.

### Tests nuevos (`src/theme/__tests__/tokens.test.tsx`)

1. **Congela las 19 variables CSS** (nombre → valor) contra el inventario previo:
   si alguien mueve un color, el test lo dice.
2. Comprueba que la paleta MUI deriva de `tokens` (primary, background, text,
   success, divider, `brand.*`, `surface.*`).
3. Comprueba que tema y capa CSS **comparten el mismo token** (`--orange ===
   palette.primary.main`, `--border === palette.divider`, …): la desincronización
   deja de ser posible por construcción.
4. Congela los tokens sin variable CSS (`accent.*`, `external.*`,
   `brand.orangeXXXL`, `feedback.*`), que son los hex que estaban hardcodeados en
   componentes.
5. **Valores computados**: renderiza `Box` con cada path de paleta que introduje
   (`background.paper`, `surface.soft`, `brand.orangeXXXL`, `common.white`,
   `common.black`) y verifica con `getComputedStyle` que dan
   `rgb(255,255,255)`, `rgb(250,250,249)`, `rgb(255,249,246)`, `rgb(255,255,255)`
   y `rgb(0,0,0)` — exactamente los hex que sustituyeron. Esto cubre el riesgo
   real del cambio: que un path de paleta no resolviera y MUI dejara pasar el
   string tal cual.
6. `CssBaseline` inyecta de verdad `:root { --orange: … }` en el documento.

Convenciones de `docs/verification.md` §4 respetadas: no hay mock de
`src/lib/api.ts` (esta feature no toca red), los componentes van envueltos en
`ThemeProvider`, y el test vive en un `__tests__/` hermano.

### Acceptance 3 — comprobación visual: **PENDIENTE DE UN HUMANO**

**No he revisado la landing, el blog ni el admin a 360 px y 1440 px: no tengo
navegador en este entorno.** No lo doy por hecho. Lo que sí pude verificar:

- Cada sustitución es 1:1 y con el mismo valor (tabla de §2.4).
- Los valores computados coinciden en jsdom (test 5).
- El conjunto de variables CSS emitidas es idéntico al anterior, salvo la nueva
  `--orange-xxxl` (aditiva, hoy sin consumidores).
- Cruce de `var(--…)` usadas contra declaradas: la única usada-y-no-declarada es
  `--black`, que tampoco lo estaba antes (§2.6); `--surface` y `--surface2` siguen
  declaradas y sin uso, igual que antes.

Queda para el humano: abrir `npm run dev` y comparar landing, `/blog`,
`/blog/:slug`, `/privacidad` y `/admin/*` a 360 px y 1440 px. Puntos donde
mirar con más atención, por ser los que cambiaron de propiedad CSS
(`background` shorthand → `background-color`): tarjetas blancas de `Pain`,
`Features`, `Addons`, `Pricing`, `Testimonials`, `ROI`, `Trust`,
`Integrations`, acordeones de `FAQ`, menú móvil de `Navbar`, cabeceras de
`/blog`, `/blog/:slug` y `/privacidad`, el carrusel del `Hero` (`surface.soft`) y
las tarjetas de `Solution` (`brand.orangeXXXL`).

---

## 5. Decisiones que puede querer revisar el reviewer

1. **`--orange-xxxl` se emite aunque nadie la use.** La añadí por simetría: si un
   token existe en la fuente, ambas capas lo exponen (hay precedente:
   `--surface` y `--surface2` llevan sin uso desde antes). Si se prefiere no
   emitir variables sin consumidor, se borra una línea de `cssVariables` y otra
   del test.
2. **`background: '#fff'` → `bgcolor: 'background.paper'`** cambia la
   declaración de shorthand a `background-color`. Revisé que ningún elemento
   afectado tenga `background-image`/`background-position` compitiendo (en modo
   claro MUI `Paper` no pinta `backgroundImage`), así que el resultado computado
   es el mismo. La alternativa —`background: 'var(--surface)'`— habría conservado
   el shorthand pero contradice `docs/conventions.md` §3.1.
3. **Los acentos categóricos** (`accent.coral/violet/blue/red/cyan/amber`) son
   ahora tokens. Se puede discutir si merecen estar en el sistema de diseño, pero
   dejarlos hardcodeados incumplía el acceptance 2. Están documentados como
   "paleta decorativa, no semántica" y viven solo en TS (no generan variable CSS
   porque solo se consumen desde JS).
4. `tsconfig.tsbuildinfo` aparece modificado en `git status`: es un artefacto de
   build que el repo tiene versionado desde antes; lo toca cualquier `npm run
   build`. No lo he alterado a mano.
