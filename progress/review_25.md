# Review — feature 25: Llevar los `rgba()` de marca a `tokens.ts`

**Veredicto:** APPROVED

Revisor: subagente `reviewer` · 2026-07-28 · Entrada: `progress/impl_25.md`,
`progress/current.md`, `feature_list.json` (feature 25), diff real del árbol.

> Contexto de lectura del diff: las features 17-24 están `done` pero **sin
> commitear**, así que `git diff` (HEAD → árbol) mezcla todo el backlog. Para la
> 25 se aislaron los hunks de `rgba(` de `Pain.tsx`, `Pricing.tsx` y
> `Solution.tsx`; los de `theme.ts` son de la feature 23 (ver §Recuento).

---

## Verificación ejecutada

Corrida por el revisor, no copiada del informe:

| Comando | Resultado |
|---------|-----------|
| `npm test` | **14 archivos / 80 tests, 0 fallos · exit 0** (45,76 s) |
| `npm run typecheck` | **exit 0** |
| `npm run build` | **exit 0**, chunk de entrada 1 586,50 kB, aviso `Some chunks are larger than 500 kB` (esperado, `CHECKPOINT.md` C3) |

Baseline previo: 13 archivos / 75 tests. Delta **+1 archivo / +5 tests**
(`src/theme/__tests__/brandAlpha.test.tsx`), coincide con lo declarado. Ningún
test previo roto. En esta pasada **no** reapareció el flake de
`AppRoutes.test.tsx` documentado en `progress/current.md`.

---

## 1. Equivalencia exacta, literal por literal

Valor "antes" tomado de `git show HEAD:<archivo>` (HEAD es anterior a todo el
backlog, y ninguna feature 17-24 tocó estas líneas: los `-` del diff son los
literales originales de producción). Valor "computado" obtenido ejecutando el
`alpha` real del repo (`node -e "require('@mui/material/styles').alpha(...)"`),
no copiado del informe. Tokens: `brand.orange = #E8440A` → `232,68,10`;
`brand.green = #16A34A` → `22,163,74` (`parseInt` verificado canal a canal).

| # | Ubicación HEAD → actual | Antes (literal HEAD) | Después (código actual) | `rgba` computado por `alpha()` | Veredicto |
|---|---|---|---|---|---|
| 1 | `Pain.tsx:92` → `:94` — sombra de tarjeta | `rgba(232,68,10,0.06)` | `alpha(tokens.brand.orange, 0.06)` | `rgba(232, 68, 10, 0.06)` | **IDÉNTICO** |
| 2 | `Pain.tsx:96` → `:98` — sombra `&:hover` | `rgba(232,68,10,0.16)` | `alpha(tokens.brand.orange, 0.16)` | `rgba(232, 68, 10, 0.16)` | **IDÉNTICO** |
| 3 | `Pain.tsx:135` → `:137` — gradiente, tope 0 % | `rgba(22,163,74,0.06)` | `alpha(tokens.brand.green, 0.06)` | `rgba(22, 163, 74, 0.06)` | **IDÉNTICO** |
| 4 | `Pain.tsx:135` → `:137` — gradiente, tope 100 % | `rgba(22,163,74,0.10)` | `alpha(tokens.brand.green, 0.1)` | `rgba(22, 163, 74, 0.1)` | **IDÉNTICO** (`0.10 === 0.1` → `true`) |
| 5 | `Pricing.tsx:63` → `:65` — sombra del plan destacado | `rgba(232,68,10,0.15)` | `alpha(tokens.brand.orange, 0.15)` | `rgba(232, 68, 10, 0.15)` | **IDÉNTICO** |
| 6 | `Pricing.tsx:88` → `:90` — borde del distintivo de prueba | `rgba(22,163,74,0.25)` | `alpha(tokens.brand.green, 0.25)` | `rgba(22, 163, 74, 0.25)` | **IDÉNTICO** |
| 7 | `Solution.tsx:92` → `:94` — sombra del icono del paso | `rgba(232,68,10,0.30)` | `alpha(tokens.brand.orange, 0.3)` | `rgba(232, 68, 10, 0.3)` | **IDÉNTICO** (`0.30 === 0.3` → `true`) |

Auditoría de los riesgos que se pidió descartar:

- **Redondeo de canal:** ninguno. `decomposeColor` hace `parseInt(hex, 16)` por
  par de dígitos: `E8→232`, `44→68`, `0A→10`, `16→22`, `A3→163`, `4A→74`.
  Comprobado numéricamente, no por comparación de texto.
- **Artefactos de coma flotante:** ninguno. `alpha()` solo hace `clamp(0,1)` y
  serializa el `Number` tal cual. La salida real es `0.06`, `0.16`, `0.15`,
  `0.25`, `0.3`, `0.1` — cero apariciones de `0.060000001` y similares.
- **Espaciado dentro del string CSS:** `alpha()` emite `rgba(232, 68, 10, 0.06)`
  (con espacio tras cada coma) donde el literal era `rgba(232,68,10,0.06)`.
  Es la **única** diferencia textual y **no** afecta al parseo: las comas viven
  dentro de la notación funcional, y ninguna de las 5 declaraciones tocadas es
  un `box-shadow` compuesto (multi-sombra separada por comas de nivel
  superior). Las únicas sombras compuestas del repo (`theme.ts:79-82`) no se
  tocaron. En el gradiente de `Pain` las comas de `rgba(...)` quedan anidadas
  dentro de los paréntesis del color, no del `linear-gradient`: los topes
  siguen siendo dos.
- **Cambio de rama del ternario:** `Pricing.tsx:65` conserva intacta la rama no
  destacada `'0 1px 3px rgba(0,0,0,0.04)'`.

Conclusión: **el render no cambia en ninguno de los 7 puntos**.

## 2. Cobertura completa (acceptance 3)

```
$ grep -rnE 'rgba\(232|rgba\(22, ?163' src/
(sin salida)   exit 1
```

Barrido genérico `grep -rnE 'rgba\(' src/` → 25 líneas hoy (20 de código + 5 del
nuevo test, que solo lo menciona en comentarios y en un regex). Los `rgba()`
**no** de marca siguen todos en su sitio, sin tocar:

`theme.ts:79,80,81,82` (escala `shadows`, negros) · `Navbar.tsx:40` (×2 blancos)
· `MarkdownRenderer.tsx:149` · `Pricing.tsx:65` (rama no destacada)
· `Solution.tsx:76` · `Addons.tsx:94,98` · `Hero.tsx:162,195,208,230`
· `Blog.tsx:41` · `CTAFinal.tsx:10,18,22,34` · `Features.tsx:84`.

Verificado además con `git diff -U0 src/ | grep -E '^[-+].*rgba'`: **las únicas
líneas `rgba` eliminadas son las 6 de marca de la feature 25 más las 2 de
`theme.ts` que ya había migrado la feature 23**. `CTAFinal.tsx:18` aparece
tocada, pero el cambio es `color: '#fff' → 'common.white'` (feature 23) y su
`rgba(255,255,255,0.2)` está byte a byte igual. No se llevó por delante ningún
`rgba` que no le tocaba.

Bundle: `grep -c 'rgba(232' dist/assets/index-*.js` → `0`;
`grep -c 'rgba(22,163' …` → `0`.

## 3. Recuento: ¿inventó u omitió literales?

Recontado desde cero contra HEAD:

```
$ git grep -nE 'rgba\(232|rgba\(22, ?163' HEAD -- src/
Pain.tsx:92, Pain.tsx:96, Pain.tsx:135 (×2), Pricing.tsx:63,
Pricing.tsx:88, Solution.tsx:92, theme.ts:100, theme.ts:102
```

- En los **tres archivos de la feature**: **6 líneas / 7 literales**. El informe
  dice exactamente eso. **Correcto, y los 7 están migrados.**
- Las otras **2** (`theme.ts:100,102`) también eran de marca, pero ya las había
  migrado la feature 23 — son justamente el patrón que el acceptance 1 manda
  imitar. De ahí el «8» del backlog (8 líneas con literal de marca en HEAD).
  El informe lo cubre al citar `theme.ts` como origen del patrón.
- **No hay literales de más ni de menos**: 7 encontrados = 7 migrados. No
  quedan `rgb(` de marca (las 5 coincidencias de `rgb(` son aserciones de
  `tokens.test.tsx`).

## 4. Patrón

`Pain.tsx:2,10`, `Pricing.tsx:2,4` y `Solution.tsx:2,6` importan
`{ alpha } from '@mui/material/styles'` y `{ tokens } from '../../theme/tokens'`
— exactamente lo que hace `src/theme/theme.ts:101,103`. **No** hay helper
propio, wrapper, ni lógica de opacidad duplicada: `grep -rn "alpha(" src/`
(sin tests) devuelve 8 usos, los 2 de `theme.ts` y los 6 nuevos, todos con la
misma forma. Ningún token nuevo añadido a `tokens.ts` (no hacía falta).

## 5. Interpolación

Las 5 declaraciones que viven en un string CSS crudo usan template literal y
producen CSS válido — `alpha()` devuelve `string`, no hay riesgo de
`[object Object]`, y el typecheck lo respalda:

```
box-shadow: 0 2px 16px rgba(232, 68, 10, 0.06)
box-shadow: 0 20px 44px rgba(232, 68, 10, 0.16)
background: linear-gradient(180deg, rgba(22, 163, 74, 0.06) 0%, rgba(22, 163, 74, 0.1) 100%)
box-shadow: 0 14px 40px rgba(232, 68, 10, 0.15)
border:     1px solid rgba(22, 163, 74, 0.25)
box-shadow: 0 8px 24px rgba(232, 68, 10, 0.3)
```

Los tests 3-5 de `brandAlpha.test.tsx` leen el CSS que Emotion inyecta en
`document.head` y comprueban que esas cadenas están ahí; los ejecuté y pasan.
No es un test vacío: asserta la cadena completa (`0 20px 44px …`), así que un
alfa distinto o una interpolación rota lo tumban.

## 6. Evidencia visual

El informe §6 declara **explícitamente que NO hizo la captura** con el arnés de
la feature 24, y da el motivo (4 de los 7 valores son `:hover` o gradiente, no
capturables en `--headless --screenshot`). Revisado el texto: **no insinúa en
ningún punto haber verificado píxeles**; `progress/current.md` dice lo mismo.
Declaración limpia. Con la equivalencia aritmética del §1 (canal a canal, con
el `alpha` real) más el CSS emitido en el DOM, el acceptance 2 queda cubierto
con más resolución que un diff de píxeles. **No se exige captura.**

---

## Checkpoints

- **C1** [x] `npm test` exit 0 — 14 archivos / 80 tests, 0 fallos. Baseline 13/75 + 5 tests nuevos; ningún test previo roto.
- **C2** [x] `docs/verification.md` §5 exime de test obligatorio los «cambios solo de estilos/tokens». Aun así la feature aporta 5 tests: acceptance 1 → `brandAlpha.test.tsx:74-79` (los colores salen del token, no de una copia); acceptance 2 → `:68-72` (canales congelados `[232,68,10,0.06]`…) + `:81-116` (los tres componentes lo emiten de verdad en el CSS). Acceptance 3 es un criterio de `grep`, no testeable en runtime: reejecutado por el revisor, salida vacía.
- **C3** [x] `npm run typecheck` exit 0; `npm run build` exit 0 (solo el aviso >500 kB, esperado).
- **C4** [x] Sin `any`, sin variables sin usar (`noUnusedLocals` habría roto el build), sin hex hardcodeados. Ubicación y nombre del test correctos (`src/theme/__tests__/brandAlpha.test.tsx`, `__tests__/` hermano). Cumple `docs/conventions.md` §3.4 — que es precisamente la regla que esta feature añade.
- **C5** [x] Ningún `fetch` fuera de `src/lib/api.ts` (la feature no toca red), sin state manager ni librería de fetching nueva, sin tipos duplicados (`as const` en `BEFORE`/`AFTER`).
- **C6** [x] No consume ni añade endpoints.
- **C7** [x] `feature_list.json` mantiene la 25 en `in_progress` (correcto: el implementador no la marca `done`) y `progress/current.md` documenta lo hecho, la verificación, el flake conocido y los pendientes. Ver nota N1 (inexactitud en `docs/architecture.md` §10).
- **C8** [x] No se leyó ni escribió `.env` / `.env.local`; ninguna variable de entorno nueva.
- **C9** [x] `grep -rnE 'console\.(log|debug)|TODO|FIXME|debugger'` sobre los 4 archivos → sin coincidencias. Sin `.orig` / `.bak` / `.log` / `.py` / PNG sueltos en el repo (`find` sobre el árbol: solo los 10 PNG legítimos y versionados de `public/`). El `.bak` del control negativo y los logs viven en el scratchpad de sesión, fuera del repo.
- **C10** [x] Scope de una sola feature. **Intactas las dos deudas con feature propia**: `var(--black)` sin declarar sigue en `Addons.tsx:142,150`, y el `CTAFinal` conserva su `rgba(255,255,255,0.7)` de bajo contraste (`CTAFinal.tsx:34`) más el `rgba(255,255,255,0.3)` de `:10`. Tampoco tocó lo de la feature 26 pese a editar el mismo archivo: `Pricing.tsx:68` sigue con `background: 'primary.main'` inválido y el bloque JSX comentado sigue ahí.
- **C11** [x] `git status --porcelain package.json vite.config.ts tsconfig.json vercel.json .gitignore package-lock.json` → salida vacía. (`tsconfig.tsbuildinfo` figura modificado: artefacto de build ya versionado, regenerado por cualquier `npm run build`, no está en la lista protegida de `docs/conventions.md` §8 — arrastre previo, no de esta feature.)

**Ningún `[ ]`. Veredicto: `APPROVED`.**

---

## Notas (no bloquean; ninguna es un fallo de checkpoint)

**N1 — `docs/architecture.md:306` quedó desactualizado y ahora se contradice con
su propio §6.** La feature 25 actualizó §6 (línea 217, «Por qué `alpha()` y no
`var(--…)`…») pero dejó intacta la viñeta de §10:

> «Queda fuera del barrido lo que no es un hex: los `rgba(232,68,10,…)` /
> `rgba(22,163,74,…)` de algunos `box-shadow` y gradientes **siguen escritos a
> mano** porque hoy no existen tokens de opacidad.»

Es falso desde esta feature. Como el propio documento dice ser la referencia
técnica vigente, conviene reescribir esa viñeta (o eliminarla) **antes** de
marcar la 25 `done`, o el backlog puede dar de alta una feature duplicada. Es
una edición de una línea en `docs/`, dentro del ámbito que el líder puede editar
por sí mismo; no requiere devolver la feature al implementador.

**N2 — Nit de contabilidad en `progress/impl_25.md` §2.** La tabla dice «`rgba()`
de blancos/negros: 18 líneas», pero la enumeración inmediatamente posterior
lista 20 líneas (19 puramente no-marca + la mixta `Pricing.tsx:63`). El total de
25 líneas del barrido **sí** es correcto (6 de marca + 19 no-marca), igual que
el recuento de 7 literales, que es lo que importa. Solo la celda de la tabla
está mal.

**N3 — Números de línea del informe desplazados en 1.** `impl_25.md` §3 cita
`Pain.tsx:93/97/136`, `Pricing.tsx:63/88` y `Solution.tsx:92`; las líneas reales
son `92/96/135` en HEAD y `94/98/137` tras el cambio (`Pricing` `65/90`,
`Solution` `94`). Irrelevante para el resultado, pero la tabla mezcla numeración
previa y posterior sin decirlo.

## Detalle de los fallos

Ninguno. No hay `[ ]` en la lista de checkpoints y las tres notas anteriores son
documentales.
