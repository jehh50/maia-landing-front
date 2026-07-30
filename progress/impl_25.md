# Informe de implementación — Feature 25

**Llevar los `rgba()` de marca a `tokens.ts`**
Fecha: 2026-07-28 · Rama: `main` (sin commits) · Estado: **pendiente de review**

---

## 1. Qué se arreglaba

La feature 23 dejó `src/theme/tokens.ts` como fuente única de color, pero su
barrido buscaba **hex**. Los `rgba()` escritos a mano quedaron fuera: repetían
los canales de `brand.orange` (`#E8440A` → `232,68,10`) y `brand.green`
(`#16A34A` → `22,163,74`) en tres secciones de la landing. Cambiar el token en
`tokens.ts` habría dejado esas sombras, ese gradiente y ese borde con el color
viejo, sin que nada avisara.

## 2. El barrido: son **7** literales, no 8

El backlog y el encargo hablan de «8 literales / 6 ubicaciones». **Conté yo, y
son 7 literales en 6 líneas.** El descuadre viene de que `Pain.tsx:136` lleva
**dos** literales en la misma línea (los dos topes del gradiente), y quien
contó ubicaciones (6, correcto) probablemente sumó mal los literales.

Barrido completo (`grep -rnE 'rgba\(' src/`): **25 líneas**. Desglose:

| Grupo | Nº | Decisión |
|---|---|---|
| Literales de **marca** (naranja/verde) | 7 (en 6 líneas) | **Migrados** a `alpha(tokens.brand.*, x)` |
| `rgba()` de blancos / negros translúcidos | 18 líneas | **Intactos** — no duplican ningún token |

Los que **no** se tocan, para que quede constancia de que fue una decisión y no
un olvido: `MarkdownRenderer.tsx:149`, `Navbar.tsx:40` (×2 en la línea),
`Addons.tsx:94,98`, `Blog.tsx:41`, `CTAFinal.tsx:10,18,22,34`,
`Features.tsx:84`, `Hero.tsx:162,195,208,230`, `Solution.tsx:74`,
`Pricing.tsx:63` (la rama **no** destacada del ternario) y las 4 líneas de la
escala `shadows` de `theme.ts`. Son negros/blancos con opacidad: sacarlos a
tokens es otra discusión (habría que decidir si `rgba(0,0,0,0.08)` es un token
de sombra), y desde luego no es esta feature.

Comprobado además que **no hay literales `rgb(`** de marca en `src/` (las 5
coincidencias de `rgb(` son aserciones de `tokens.test.tsx`).

## 3. Tabla literal por literal

`alpha()` de MUI descompone el hex, fija el canal alfa y recompone. Verificado
con el `alpha` real del repo (`node_modules/@mui/material`) y comparando
**canal a canal como números**, no como texto:

| # | Ubicación (línea original) | Antes | Después | `rgba` computado | Veredicto |
|---|---|---|---|---|---|
| 1 | `Pain.tsx:93` — sombra de tarjeta | `rgba(232,68,10,0.06)` | `alpha(tokens.brand.orange, 0.06)` | `rgba(232, 68, 10, 0.06)` | **IGUAL** |
| 2 | `Pain.tsx:97` — sombra en `:hover` | `rgba(232,68,10,0.16)` | `alpha(tokens.brand.orange, 0.16)` | `rgba(232, 68, 10, 0.16)` | **IGUAL** |
| 3 | `Pain.tsx:136` — gradiente, tope 0 % | `rgba(22,163,74,0.06)` | `alpha(tokens.brand.green, 0.06)` | `rgba(22, 163, 74, 0.06)` | **IGUAL** |
| 4 | `Pain.tsx:136` — gradiente, tope 100 % | `rgba(22,163,74,0.10)` | `alpha(tokens.brand.green, 0.1)` | `rgba(22, 163, 74, 0.1)` | **IGUAL** (`0.10 === 0.1`) |
| 5 | `Pricing.tsx:63` — sombra del plan destacado | `rgba(232,68,10,0.15)` | `alpha(tokens.brand.orange, 0.15)` | `rgba(232, 68, 10, 0.15)` | **IGUAL** |
| 6 | `Pricing.tsx:88` — borde del distintivo de prueba | `rgba(22,163,74,0.25)` | `alpha(tokens.brand.green, 0.25)` | `rgba(22, 163, 74, 0.25)` | **IGUAL** |
| 7 | `Solution.tsx:92` — sombra del icono del paso | `rgba(232,68,10,0.30)` | `alpha(tokens.brand.orange, 0.3)` | `rgba(232, 68, 10, 0.3)` | **IGUAL** (`0.30 === 0.3`) |

**Las dos únicas diferencias son de escritura, no de color:**

1. `alpha()` inserta un espacio tras cada coma. CSS lo permite igual; el color
   resultante es el mismo (así lo confirma la comparación numérica canal a
   canal, y así lo parsea el navegador).
2. `0.10` → `0.1` y `0.30` → `0.3`. Es el mismo `Number` de JavaScript
   (`0.10 === 0.1` es `true`); la diferencia solo existe en el texto fuente.

**No hay artefactos de coma flotante.** `alpha()` pasa el valor por un
`clamp(0, 1)` que no redondea ni multiplica, así que `0.06` sigue siendo
exactamente `0.06`: no aparece ningún `0.060000001`. Comprobado en el DOM (§5).

## 4. Cambios

| Archivo | Qué |
|---|---|
| `src/components/sections/Pain.tsx` | `import { alpha } from '@mui/material/styles'`; literales 1-4 → `alpha()`. Ya importaba `tokens` (lo usa para `accent.*`). |
| `src/components/sections/Pricing.tsx` | Nuevos imports de `alpha` y `tokens`; literales 5-6. |
| `src/components/sections/Solution.tsx` | Nuevos imports de `alpha` y `tokens`; literal 7. |
| `src/theme/__tests__/brandAlpha.test.tsx` | **Nuevo.** 5 tests, ver §5. |
| `docs/architecture.md` §6 | Fila nueva en la tabla «Cómo usar los tokens» + por qué `alpha()` y no `var(--…)` cuando hay opacidad. |
| `docs/conventions.md` §3 | Punto 4 nuevo con la misma regla (los puntos posteriores se renumeran). |

Los tres literales dentro de strings CSS crudos quedaron interpolados con
template literals, que es lo que ya hacía `theme.ts:101`:

```tsx
boxShadow: `0 2px 16px ${alpha(tokens.brand.orange, 0.06)}`,
background: `linear-gradient(180deg, ${alpha(tokens.brand.green, 0.06)} 0%, ${alpha(tokens.brand.green, 0.1)} 100%)`,
border: `1px solid ${alpha(tokens.brand.green, 0.25)}`,
```

## 5. Decisiones tomadas

**`alpha(tokens.brand.*)` y no una variable CSS nueva.** Lo pide el acceptance,
pero además es lo único que funciona: una `var(--…)` lleva el color opaco y no
hay forma de teñirla al 6 % sin `color-mix()` (soporte irregular) o sin partir
el token en canales sueltos. `alpha()` ya estaba en uso en `theme.ts` para las
sombras de `MuiButton`: se siguió ese patrón exacto, incluido el
`from '@mui/material/styles'`.

**El test lee la hoja de estilos, no `getComputedStyle`.** Cuatro de los siete
valores viven en `&:hover` o dentro de un `linear-gradient`, que
`getComputedStyle` en jsdom no resuelve. `src/theme/__tests__/brandAlpha.test.tsx`
renderiza `Pain`, `Pricing` y `Solution` y busca las declaraciones en el CSS que
Emotion inyecta en el documento — el mismo truco que ya usa el último test de
`tokens.test.tsx`. Confirmado en el CSS emitido:

```
box-shadow:0 2px 16px rgba(232, 68, 10, 0.06)
box-shadow:0 20px 44px rgba(232, 68, 10, 0.16)
background:linear-gradient(180deg, rgba(22, 163, 74, 0.06) 0%, rgba(22, 163, 74, 0.1) 100%)
box-shadow:0 14px 40px rgba(232, 68, 10, 0.15)
border:1px solid rgba(22, 163, 74, 0.25)
box-shadow:0 8px 24px rgba(232, 68, 10, 0.3)
```

**El test no es vacío: hay control negativo.** Mutando `Solution.tsx` a
`alpha(tokens.brand.orange, 0.31)` el test falla y señala el
`rgba(232,68,10,0.31)` que apareció en el CSS. Revertido acto seguido (`git
diff` de `Solution.tsx` solo muestra el cambio de la feature).

**Se colocó en `src/theme/__tests__/`** y no junto a las secciones porque el
sujeto es la derivación de color del tema, no el comportamiento de las
secciones; es la continuación natural de la red que dejó la feature 23 en
`tokens.test.tsx`. `docs/verification.md` §5 no exige test para cambios de
estilo, pero aquí el acceptance 2 («los valores no cambian») es justo lo que un
test puede congelar, así que se escribió.

**Evidencia extra en el bundle.** `alpha()` se resuelve en runtime, así que en
`dist/` no hay strings `rgba` inlineados sino la llamada:
`` boxShadow:`0 2px 16px ${ht(rt.brand.orange,.06)}` ``. Es exactamente lo que
se buscaba: el color lo decide el token en el momento de renderizar. Cero
ocurrencias de `rgba(232,68,10,…)` o `rgba(22,163,74,…)` en el bundle.

## 6. Verificación visual con navegador: **NO se hizo**

Se ofrecía la vía de Firefox headless + `delay_proxy.py` + `PIL.ImageChops`.
**No la usé, y no insinúo lo contrario.** Motivos:

- Cuatro de los siete valores son `:hover` o gradiente sobre tarjeta; el
  `:hover` **no es capturable** en `--headless --screenshot`, así que un diff de
  píxeles habría dejado sin verificar precisamente los casos delicados.
- La equivalencia numérica (§3) más la comprobación del CSS emitido en el DOM
  (§5) cubren el acceptance 2 con más resolución que una captura: se compara el
  valor exacto de cada canal, no la apariencia de una franja de píxeles.

Si el reviewer considera imprescindible el diff de píxeles para los tres valores
que sí son visibles en reposo (nº 1, 5 y 6), es un encargo acotado y razonable;
queda dicho que hoy **no está hecho**.

## 7. Acceptance

| # | Criterio | Estado |
|---|---|---|
| 1 | Los literales usan `alpha(tokens.brand.*, x)`, el patrón de `theme.ts` | **Cumplido** — los 7 (no 8, ver §2) |
| 2 | Los valores computados no cambian, verificados uno por uno | **Cumplido** — tabla §3, canal a canal, + CSS emitido §5 |
| 3 | `grep -rnE 'rgba\(232\|rgba\(22, ?163' src/` no devuelve nada | **Cumplido** — exit 1, salida vacía |

Sobre el criterio 3: la primera versión del test congelaba los valores viejos
como strings `rgba(…)` y **hacía fallar ese grep desde el propio test**. Se
reescribió para guardarlos como canales `[232, 68, 10, 0.06]`, que además es la
comparación correcta (`0.30` y `0.3` son el mismo número). El grep queda limpio
en todo `src/`.

## 8. Fuera de scope (no tocado, a propósito)

- `var(--black)` sin declarar en `Addons.tsx:142,150` — feature propia.
- Contraste 2,82:1 del `CTAFinal` — feature propia. Su `rgba(255,255,255,0.7)`
  se dejó tal cual: es blanco translúcido, no marca.
- `Pricing.tsx:103-132` (bloque JSX comentado con el último `#fff`) y
  `Pricing.tsx:68` (`background: 'primary.main'` inválido) — **feature 26**.
  Se editaron las líneas 63 y 88 de ese mismo archivo sin rozar las suyas.
- Infraestructura (`package.json`, `vite.config.ts`, `tsconfig.json`,
  `vercel.json`, `.gitignore`): intacta. No se leyó ni escribió ningún `.env*`.
- No se hizo commit ni push. Los `.log` y el `.bak` del control negativo viven en
  el scratchpad de sesión, fuera del repo.

## 9. Salida de la verificación

```
$ npm test
 Test Files  14 passed (14)
      Tests  80 passed (80)
   Duration  44.22s
TEST EXIT: 0

$ npm run typecheck
> tsc -b --noEmit
TYPECHECK EXIT: 0

$ npm run build
dist/assets/index-DwqNmvg2.js   1,586.50 kB │ gzip: 451.11 kB
(!) Some chunks are larger than 500 kB after minification.   ← esperado
✓ built in 19.22s
BUILD EXIT: 0
```

### Flake conocido, esta vez con nombre

Se corrió `npm test` completo **tres veces**. Dos verdes (80/80, a las 10:48 y a
las 10:56) y **una roja a las 10:54**, con `load average` en 9,86:

```
× src/__tests__/AppRoutes.test.tsx > AppRoutes — admin perezoso tras la guardia >
  navegar entre páginas del admin no desmonta el sidebar
  TestingLibraryElementError: Unable to find role="heading" and name /leads/i
```

Es la misma incidencia que la feature 24 documentó sin conservar el nombre del
test; queda registrado aquí. En aislado el archivo pasa entero (7/7, y ese test
en 763 ms frente a los 1 528 ms de la pasada que falló): un `React.lazy` que no
resuelve dentro del `findBy` cuando la máquina va cargada. **No lo causa esta
feature** — `AppRoutes.test.tsx` no se tocó y el cambio son tres valores de
color en `sx`; lo único que aporta la 25 es un archivo de test más compitiendo
por CPU. Logs completos en el scratchpad de sesión (`i25_test.log`,
`i25_test_final.log` con el fallo, `i25_test_final2.log`).

**Baseline previo a la sesión** (medido antes de tocar nada): `npm test`
13 archivos / 75 tests · exit 0 (67,71 s); `typecheck` exit 0; `build` exit 0
con chunk de entrada 1 586,47 kB. El delta es **+1 archivo / +5 tests** (los
nuevos) y **+30 bytes** en el chunk de entrada.

## 10. Para el reviewer

- El punto que más merece una segunda mirada es el **descuadre 8 vs 7**: §2 trae
  el barrido entero para que se pueda recontar sin fiarse de mí.
- El acceptance 3 usa el patrón `rgba\(22, ?163`, que **no** cubriría un
  `rgba(22,  163, …)` con dos espacios. No hay ninguno (el grep genérico de §2
  lo confirma), pero conviene saber que el criterio literal del backlog es más
  estrecho que el barrido real que se hizo.
- La feature **no** se ha marcado `done`: sigue en `in_progress` en
  `feature_list.json`, a la espera del veredicto.

## 11. Errata (tras la review — `APPROVED`, `progress/review_25.md`)

Dos inexactitudes documentales que el reviewer detectó (N2 y N3). No afectan al
código ni al resultado, pero se corrigen aquí para que el archivo no quede mal:

- **§2, celda de la tabla:** dice «`rgba()` de blancos/negros: **18** líneas».
  Son **19** (la enumeración posterior ya las lista bien). El total del barrido,
  25 líneas = 6 de marca + 19 no-marca, sí era correcto, igual que el recuento
  de 7 literales.
- **§3, números de línea:** la tabla cita `Pain.tsx:93/97/136`,
  `Pricing.tsx:63/88` y `Solution.tsx:92` mezclando numeración previa y
  posterior al cambio sin decirlo. Las reales son **`92/96/135`, `63/88`, `92`
  en `HEAD`** y **`94/98/137`, `65/90`, `94` tras el cambio**.

El reviewer resolvió además el descuadre «8 vs 7» de §2: en `HEAD` había 8
líneas con literal de marca, pero **dos eran `theme.ts:100,102`**, ya migradas
por la feature 23 — el patrón que el acceptance mandaba imitar. En los tres
archivos de esta feature: 6 líneas / 7 literales, todos migrados.

Queda abierta la nota **N1** de la review, que **no** es del implementador:
`docs/architecture.md` §10 sigue afirmando que estos `rgba()` «siguen escritos a
mano», lo que contradice al §6 desde esta feature. Corrección de una línea en
`docs/`, a cargo del líder.
