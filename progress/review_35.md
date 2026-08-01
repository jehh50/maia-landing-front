# Review — feature 35: «La seccion de precios de la landing consume /api/precios» — **APROBADO**

**Veredicto:** APROBADO
**Fecha:** 2026-07-31 · **Commit revisado:** `3332924` (rama `feat/admin-cruds`)
**Revisor:** reviewer (verificación ejecutada de nuevo, sin fiarme del informe)

Listón aplicado: ruta crítica de negocio, no pantalla de admin. Aun así, todo lo
que encontré es de nivel observación; nada bloquea.

---

## Verificación ejecutada por mí

| Comando | Resultado |
|---|---|
| `npm test` | **18 archivos / 176 tests, 0 fallos, exit 0** (60.5 s) — coincide con el baseline anunciado (antes 159) |
| `npm run typecheck` | exit 0, sin salida |
| `npm run build` | `✓ built in 12.36s`, exit 0. Solo el aviso `Some chunks are larger than 500 kB`, esperado (`docs/verification.md` §1) |
| `git status --short` | solo ` M tsconfig.tsbuildinfo`, artefacto trackeado preexistente (misma nota que `review_30..34`) |

Ningún rojo en la pasada completa: no hizo falta repetir aislada ninguna suite
(`AppRoutes`, `ContactModal`, `PricesList` pasaron a la primera).

Comprobaciones estáticas que repetí una a una:

```
grep "fetch(" src/components/sections/Pricing.tsx            → 0
grep -w any  Pricing.tsx + Pricing.test.tsx + brandAlpha     → 0
grep -E "#[0-9a-fA-F]{3,8}" Pricing.tsx                      → 0
grep "console\.|TODO" Pricing.tsx + su test                  → 0
grep -rn "Growth|interface Plan|const plans" src/ (sin tests)→ 0
grep -rn "Starter|Ahorra 10%" src/ (sin tests)               → 0
```

El único `Growth` que queda en `src/` es prosa de `FAQ.tsx:28` («planes Team y
Growth»), preexistente y ajena a esta feature.

---

## 1. Los 8 acceptance, uno a uno

| # | Acceptance | Veredicto | Evidencia |
|---|---|---|---|
| 1 | Consume `GET /api/precios` vía helper de `src/lib/api.ts` con `normalizeApi`; cero `fetch` en el componente | **CUMPLE** | `Pricing.tsx:60` `normalizeApi(listPlanes(), 'rows', …)`; `grep fetch(` → 0. Refuerzo estructural real: `publicJson`/`apiJson` **no se exportan** de `api.ts` (`api.ts:147,373`), así que la frontera la garantiza el módulo. Test 1 fija URL `/api/precios`, `method: 'GET'`, `credentials: 'omit'`, **una sola llamada** y que ninguna pega a `/api/admin/` |
| 2 | Fallback: `rows` vacío / fallo / sin respuesta → **no se renderiza**; el array `plans` se **elimina**, sin respaldo | **CUMPLE** | `Pricing.tsx:74` `if (estado !== 'ok' \|\| planes.length === 0) return null;`. Ver §2 de esta review, que lo audité aparte |
| 3 | Sin salto de layout ni parpadeo «aparece y desaparece» | **CUMPLE** | Test 21 + mutación M2 verificada por mí. Ver §4 |
| 4 | Mapeo del contrato: `nombre`, `precio_mensual`, `precio_anual` (mensual facturando anual), `ahorro_anual`, `vinetas`, `vinetas_tachadas`, `destacado`, `trial_texto` | **CUMPLE** — los 8 campos con test | Ver §5. `vinetas_tachadas` se comprueba por `getComputedStyle(...).textDecoration` (test 2), `destacado` por que el badge cae en la tarjeta correcta y no por posición (test 3), `trial_texto` por texto (test 2) |
| 5 | `es_custom` no pinta cifras: ni `$0` ni «Ahorras $0/año» | **CUMPLE** | Ver §6 |
| 6 | Toggle sigue vivo y el descuento sale de `descuento_pct`, no del Chip fijo | **CUMPLE** | Ver §7 |
| 7 | Estado de carga en una sección hoy instantánea, sin salto de layout | **CUMPLE** | Máquina `'loading' \| 'ok' \| 'error'` (`Pricing.tsx:9,54`), como exige `conventions.md` §5; no un `isLoading` suelto. Guarda `vigente` (`:58,61,70`) contra `setState` tras desmontar |
| 8 | Tests con `vi.spyOn(globalThis,'fetch')`: con datos, `rows` vacío y fallo de red | **CUMPLE Y SE PASA** | Los tres exigidos + `500` + `200` sin `rows`. `Response` reales, **sin mockear `src/lib/api.ts`** (`docs/verification.md` §4) |

---

## 2. El fallback no negociable — auditoría dedicada

Busqué respaldo hard-codeado en **las cuatro formas** que pediste:

- **Constante en el componente:** no existe. El array `plans` (4 planes) y la
  `interface Plan` desaparecieron del archivo; `git show 3332924^:…/Pricing.tsx`
  los tenía en las líneas 6-37 y ahora no hay nada equivalente.
- **Valor por defecto:** `useState<AdminPlan[]>([])` (`Pricing.tsx:55`) arranca
  **vacío**, y la rama de error hace `setPlanes([])` (`:66`), no una lista de cortesía.
- **Mock importado en producción:** los imports de `Pricing.tsx:1-6` son React,
  MUI, el icono, `tokens` y `api.ts`. Ningún fixture. `src/admin/prices/` ya no
  tiene `mockPrices.ts` (lo eliminó la 34).
- **Rastro en el resto de `src/`:** `grep -rn "Starter\|Growth\|Ahorra 10%"` sin
  tests → **0** resultados en código de producción.

Los cuatro caminos de fallo convergen en el mismo `return null`: `rows: []`,
`500`, fallo de red y `200` con body sin `rows` (los cuatro con test, 17-20). Los
tests 17-19 no se conforman con «no está»: un `MutationObserver` sobre
`document.body` (`Pricing.test.tsx:80-94`) registra altas **y** bajas del nodo
`#pricing` y exige `eventos === []`.

**Mutación M10 aplicada por mí** (reintroducir un `RESPALDO: AdminPlan[]` y
servirlo cuando `rows` viene vacío o la API falla): **ROJO, 4 tests**. El
acceptance 2 está protegido por tests, no por buena voluntad. Revertida.

Que la sección desaparezca hoy con las tablas vacías queda **correctamente
tratado como esperado**, no como defecto, tanto en el código (docstring
`Pricing.tsx:36-41`) como en `docs/api-contract.md` §4 quater.

---

## 3. El cambio fuera de alcance: `src/theme/__tests__/brandAlpha.test.tsx`

**Juicio: era inevitable, y es andamiaje puro. No debilita nada.** Coincido
contigo.

**¿Inevitable?** Sí. Ese test de la feature 25 (`brandAlpha.test.tsx:111-129`)
renderiza `Pricing` y lee el CSS que Emotion inyecta para verificar dos colores
que **solo existen en una tarjeta `destacado` y en la caja de `trial_texto`**
(`Pricing.tsx:130` y `:163`). Sin datos no hay tarjeta, sin tarjeta no hay CSS.
Las alternativas para dejarlo verde sin tocarlo son exactamente tres, y las tres
son peores:
1. respaldo hard-codeado en el componente → prohibido por el acceptance 2;
2. montar la tarjeta a mano en el test extrayendo el markup del componente →
   dejaría de verificar que *`Pricing`* emite el color, que es lo que el test
   afirma en su nombre;
3. relajar las aserciones a `tokens`/`alpha` sin render → convierte un test de
   integración de estilos en una tautología.

**¿Debilita?** No. Diff `+26 −2`, todo dentro del `it` de `Pricing` más la
fixture. Las **dos** aserciones de color son idénticas byte a byte a las de
antes (`:127-128`): `0 14px 40px ${AFTER.pricingFeatured}` y
`1px solid ${AFTER.pricingTrialBorder}`. `BEFORE`/`AFTER` (`:35-54`) intactos.
Los otros cuatro tests del archivo (aritmética de `alpha`, derivación del token,
`Pain`, `Solution`) no se tocaron. La fixture `PLAN_DESTACADO` lleva
`destacado: true` **y** `trial_texto` a propósito: si alguien la aflojara, el
test caería, no pasaría de largo.

**No me fié de leerlo: lo comprobé.** Mutando `Pricing.tsx` para desviar el borde
del distintivo (`alpha(tokens.brand.green, 0.25)` → `0.35`),
`brandAlpha.test.tsx` sale **ROJO (1 de 5)**. El test adaptado sigue detectando
deriva de color. Revertido.

Añadidos accesorios correctos: `afterEach(vi.restoreAllMocks)` (`:77`) — el
archivo no tenía otros mocks, así que no altera a nadie — y el `await
screen.findByRole('heading', { name: 'Team' })` antes de leer el CSS. El
implementer **lo declaró en el commit y en `impl_35.md` §«Un archivo fuera de mi
lista»** en vez de colarlo. Eso es lo que corresponde: se apunta como
consecuencia forzosa, no como scope creep (C10 sigue `[x]`).

---

## 4. El salto de layout y el parpadeo

La explicación **se sostiene**, y además está fijada por tests.

- **No hay esqueleto, y el motivo es correcto, no pereza.** Un placeholder con la
  altura de la sección tendría que retirarse en los tres casos de fallback —que
  hoy, con las tablas vacías, son el caso *normal*—, y eso **es** el parpadeo
  «se pinta y desaparece» que prohíbe el acceptance 3. Los dos requisitos del
  acceptance (3 y 7) tiran en direcciones opuestas y la resolución elegida
  prioriza la correcta.
- **Una sola transición visible:** nada → sección definitiva. El test 21
  (`Pricing.test.tsx:395-416`) resuelve el `fetch` a mano y exige
  `eventos === ['add']` — ni un solo `remove` — y que las tres tarjetas lleguen
  en el mismo commit (`getAllByRole('heading', { level: 6 })` → 3). O sea: se
  monta ya completa, sin swap interno esqueleto→contenido, que es la fuente
  clásica de jank.
- **El reflujo cae fuera del viewport.** Verifiqué la premisa en vez de creerla:
  `App.tsx:44` monta `Pricing` en el primer render de la landing (la petición
  sale al montar la página, no al hacer scroll), y la medición de `impl_26.md`
  §5 sitúa la sección en `pricingTop=4668` a 1440 px y `7504` a 360 px. Lo que se
  desplaza al llegar los datos es lo que va **debajo** (`Addons`, `FAQ`,
  `CTAFinal`, `Footer`), a ~4 700 px del pliegue. CLS solo puntúa
  desplazamientos visibles.
- **Los `.reveal` tardíos animan.** Comprobado en la fuente, no en el informe:
  `useReveal.ts` monta un `MutationObserver` sobre `document.body` con
  `scanAdded` que además mira la **raíz** añadida (`el.matches(...)`), no solo
  sus descendientes. La sección no se queda en opacidad 0.

**Mutación M2 aplicada por mí** (esqueleto `#pricing` con `minHeight: 600`
durante `loading`): **ROJO, 4 tests** — el `MutationObserver` de los tests lo
caza como `add` prematuro. El anti-parpadeo está blindado. Revertida.

Único residuo honesto, ya asumido: si la respuesta tarda más que el scroll de
4 700 px, se ve **aparecer** una sección; nunca desaparecer. Es el lado correcto
del fallo.

---

## 5. El mapeo del contrato (el riesgo de multiplicar por doce)

**Correcto.** `Pricing.tsx:123` toma `p.precio_anual` tal como llega y
`Pricing.tsx:146` lo pinta; **no** se recalcula ni se multiplica por 12. El
componente **no** usa `derivarPrecios` (que existe y estaba a mano): el contrato
reserva ese helper a la vista previa del formulario del panel, y aquí la vista
pinta los derivados del backend. `api.ts:675-677` confirma la semántica:
«`precio_anual` es el precio mensual facturando anualmente, no el total del año».

El test 7 (`:217-232`) es el que hay que tener: con `precio_mensual 19/199` y
`precio_anual 17/179` afirma que aparecen `17` y `179`, **y explícitamente que NO
aparecen `204` ni `2,148`** (los totales del año), y que los mensuales
desaparecen. `Ahorras $24/año` y `Ahorras $240/año` salen de `ahorro_anual`, vía
`formatMoneda` (`Pricing.tsx:152`).

**Mutación M3 por mí** (el toggle anual pinta `precio_mensual`): **ROJO**.
Revertida. La cifra grande usa `toLocaleString('es-MX')`, el mismo locale de
`formatMoneda`, porque el `$` va como `<sup>` por diseño: separador de miles
coherente entre las dos cifras de la tarjeta.

---

## 6. `es_custom` no pinta cifras

**Correcto, y por el motivo correcto.** Una sola decisión, en `Pricing.tsx:123`:
`const importe = p.es_custom ? null : (isAnnual ? p.precio_anual : p.precio_mensual);`
Es la trampa histórica de esta pantalla (el backend manda `precio_mensual: 0`, no
`null`, en un plan a convenir — `api.ts:622-625`), y aquí la decide `es_custom`,
nunca el nulo.

El test 16 (`:326-343`) es el bueno: manda `es_custom: true` **con las cifras
rellenas** (`349 / 314 / 420`) y exige `not.toMatch(/349|314|420|\$/)`. Y la
fixture `ENTERPRISE` lleva viñetas **sin un solo dígito** a propósito, lo que
permite el `expect(card.textContent).not.toMatch(/\d/)` de los tests 14-15: cubre
de un golpe el «$0» y el «Ahorras $0/año».

**Mutaciones por mí:** M4 (fiarse del nulo: `precio_mensual === 0 ? null : …`) →
**ROJO**; M5 (quitar la guarda `ahorro_anual > 0` de `Pricing.tsx:150`, que
resucita el «Ahorras $0/año») → **ROJO, 2 tests**. Ambas revertidas.

Acepto además la decisión de **borrar la guarda inalcanzable** (M8 del informe) en
vez de declarar una «doble protección» que ningún test podía distinguir: dentro
de la rama `importe !== null`, `es_custom` ya es `false` por construcción. Es la
lectura honesta del resultado de la mutación.

---

## 7. Descuento desde `descuento_pct` y toggle vivo

**Correcto.** El `Chip` fijo «Ahorra 10%» (antes `Pricing.tsx:56`) ya no existe:
la etiqueta se calcula en `:79-81,99-106` a partir de `descuento_pct`, que es
**por plan**, con tres reglas que apruebo sin reservas:

- `descuentoMax === 0` → **no hay chip**: no se anuncia un ahorro inexistente.
- Todos iguales → «Ahorra X%»; distintos → «Ahorra **hasta** X%». Afirmar
  «Ahorra 25%» cuando solo un plan descuenta el 25 % sería publicidad engañosa en
  la ruta crítica.
- Los `es_custom` se **excluyen** del cálculo (`:79`): su `descuento_pct: 0`
  convertiría un «Ahorra 10%» honesto en un «hasta 10%» falso.

Tests 9-12 cubren los cuatro casos. El toggle sigue siendo del padre: `Switch`
controlado por `isAnnual` y aviso por `onToggle` (`Pricing.tsx:98`), con test 8
(`userEvent.click` → `onToggle` 1 vez) y test 12, que exige que **sin descuentos
el chip desaparezca pero el toggle siga en pie**.

**Mutaciones por mí:** M6 (volver al chip literal «Ahorra 10%») → **ROJO, 3
tests**; M7 (que los `es_custom` cuenten para el descuento anunciado) → **ROJO**.
Revertidas.

---

## 8. `App.tsx` intacto e interfaz de props respetada

El commit `3332924` toca **5 archivos** y `src/App.tsx` no está entre ellos
(`git show --stat`). `PricingProps` sigue siendo
`{ isAnnual: boolean; onToggle: () => void; onOpenContact: () => void }`
(`Pricing.tsx:18`), idéntica a la anterior; `App.tsx:44` compila sin cambios y
`isAnnual` sigue elevado al padre (`conventions.md` §5). No se introdujo ningún
state manager ni librería de data fetching: `useState` + `useEffect` y nada más.
`src/lib/api.ts` **no se tocó** (`git show --stat` no lo lista): los helpers de la
34 bastaban, que es lo correcto.

---

## 9. Los tests: ¿sustituidos o borrados? ¿Discriminan?

**Sustituidos, no borrados.** Comparé el archivo anterior
(`git show 3332924^:…/Pricing.test.tsx`, 5 tests) con el actual (22):

| Test anterior | Dónde está ahora |
|---|---|
| badge «Más popular» en naranja de marca | test 4, intacto salvo el `await` |
| ningún path de paleta sin resolver | test 5, intacto salvo el `await` |
| «las cuatro tarjetas siguen en pie» | test 2, generalizado a «una tarjeta por plan del backend» (ya no hay «cuatro» que afirmar) |
| único CTA «Contactanos», sin CTA por tarjeta | último test, intacto |
| el switch anual muestra el descuento y avisa al padre | dividido en tests 7 y 8 |

Cobertura exigida por el acceptance 8: **datos** (tests 1-16), **`rows` vacío**
(test 17), **fallo de red** (test 19), más `500` (18) y `200` sin `rows` (20).

**Discriminación verificada por mí, no leída del informe.** Apliqué **7
mutaciones**, cada una sola, sobre `Pricing.tsx`, corriendo la suite aislada y
restaurando con `git checkout --` entre una y otra:

| Mutación | Resultado |
|---|---|
| M3 — el toggle anual pinta `precio_mensual` | **ROJO (1)** |
| M4 — se fía del nulo en vez de `es_custom` | **ROJO (1)** |
| M5 — el «Ahorras» pierde la guarda `> 0` | **ROJO (2)** |
| M6 — vuelve el chip hard-codeado «Ahorra 10%» | **ROJO (3)** |
| M7 — los `es_custom` cuentan para el descuento | **ROJO (1)** |
| M10 — respaldo hard-codeado cuando falla o viene vacío | **ROJO (4)** |
| M2 — esqueleto de carga que luego hay que quitar | **ROJO (4)** |
| (extra) deriva de color en el borde del distintivo | **ROJO (1) en `brandAlpha.test.tsx`** |

Las 8 en rojo. Árbol restaurado y comprobado: `git status --short src/` → vacío.
Los tests **discriminan de verdad**; no son tests de humo.

---

## Checkpoints (C1-C11)

- **C1** [x] `npm test` exit 0, 18 archivos / 176 tests. Ningún test previo roto:
  los 5 de `Pricing` fueron sustituidos con equivalente y `brandAlpha` conserva
  sus 5 con las mismas aserciones.
- **C2** [x] Los 8 puntos del `acceptance` tienen verificación propia (tabla §1);
  ninguno queda apoyado solo en la lectura.
- **C3** [x] `typecheck` exit 0 y `build` exit 0 (solo el aviso de chunk >500 kB).
- **C4** [x] `conventions.md`: ubicación y nombres correctos (§1: sección en
  `src/components/sections/`, test en `__tests__/` hermano); cero `any`, cero
  variables sin usar (§2); `interface PricingProps` local sin exportar y sin
  `React.FC` (§2); cero hex, colores por tokens/`sx`/`alpha()`/`var(--…)` (§3);
  `ANCHO_TARJETA` es constante nombrada, no un píxel suelto anónimo.
- **C5** [x] Frontera respetada: cero `fetch` en `Pricing.tsx`, todo por
  `listPlanes` + `normalizeApi`; sin state manager ni librería de fetching nueva;
  tipos **derivados** — se importa `AdminPlan` de `api.ts` en vez de redeclarar
  una `interface Plan` local (la vieja se eliminó).
- **C6** [x] `docs/api-contract.md` §4 quater añade a la landing como consumidora
  del público, registra el fallback y los dos detalles del mapeo; §10.4 pasa a
  histórico («cerrada en la feature 35») en vez de quedarse mintiendo.
- **C7** [x] `feature_list.json` sigue en `pending`, que es el estado real hasta
  este veredicto, y `progress/impl_35.md` documenta lo hecho, la verificación y
  **por qué** la bitácora no fue a `current.md` (acotación explícita del líder).
  Mismo criterio que `review_32/33/34`. **Acción para el líder: mover la 35 a
  `done` y volcar el resumen a `history.md`.**
- **C8** [x] Ningún `.env*` leído ni escrito; ninguna variable de entorno nueva.
- **C9** [x] Sin `console.*`, sin código comentado «por si acaso», sin `TODO`
  huérfanos, sin `.orig`/`.bak`. `git status` solo muestra
  `tsconfig.tsbuildinfo`, artefacto trackeado preexistente. Confirmado que mis 8
  mutaciones quedaron revertidas.
- **C10** [x] Una sola feature. El quinto archivo (`brandAlpha.test.tsx`) es
  consecuencia forzosa de la propia feature —no deuda ajena arreglada de paso—,
  está declarado en el commit y en el informe, y su alcance es andamiaje (§3). No
  se tocaron `Hero.tsx`/`CTAFinal.tsx` (feature 36), ni `src/admin/`, ni
  `Navbar`/`Footer` pese a tener el enlace `#pricing` delante: se **levantó**
  como nota en vez de arreglarse.
- **C11** [x] `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` y
  `.gitignore` sin tocar.

Ningún `[ ]`. Ninguno en C1/C2/C3/C8.

---

## Observaciones (no bloquean, para el backlog del líder)

1. **`Pricing.tsx:172,175` — `key={v}` con el texto de la viñeta.** Las dos listas
   (`vinetas` y `vinetas_tachadas`) se pintan como hermanas dentro del **mismo**
   `<ul>` (`:170-177`): si un admin escribe la misma cadena dos veces, o repite un
   texto en ambas listas, React ve claves duplicadas entre hermanos. El patrón se
   hereda **literal** del código anterior, donde era inocuo porque los datos eran
   una constante con `dim: []`; ahora los teclea una persona en el panel. Arreglo
   de una línea (`key={`${p.id}-v-${i}`}`) cuando toque, no en esta feature.
2. **Sin validación de forma de la respuesta.** Una fila con `vinetas: null`
   —imposible según el contrato, que garantiza JSONB array— lanzaría en render, y
   no hay `ErrorBoundary` en `main.tsx`: se llevaría por delante toda la landing,
   no solo la sección. Es el patrón de todo el repo, no un desliz de la 35, pero
   en la ruta crítica de captación merece una feature propia.
3. **`Pricing.tsx:123` + `:156-157`** — un plan **no** `es_custom` con
   `precio_anual: null` pintaría «Custom». Imposible según contrato y está
   documentado en el comentario (`:117-122`); prefiero esto a inventar una cifra.
   Queda anotado, no exigido.
4. **Los enlaces `#pricing` sin destino** (`Navbar.tsx:10`, `Footer.tsx:8`) cuando
   no hay planes: consecuencia directa del fallback decidido, correctamente
   levantada por el implementer en vez de arreglada por su cuenta (habría roto
   C10). Feature propia.
5. **Drift documental, quinta vez:** `docs/verification.md` §1-§2 y
   `docs/architecture.md` §8 siguen diciendo «15 archivos / 86 tests» (real: 18 /
   176), y `architecture.md` §5/§9 no listan `/api/precios` y siguen dando precios
   por «en maquetación con datos mock». Ya no es una nota: es una feature.
6. **Verificación manual pendiente y justificada:** hoy `GET /api/precios`
   responde `{"rows":[]}`, así que lo correcto según el acceptance 2 es **no ver
   nada**. En cuanto se den de alta planes desde el panel conviene una pasada
   visual a 360 px y 1440 px, sobre todo a la rejilla con 1, 2 y 3 planes
   (`Pricing.tsx:109-115`), que es código nuevo que ningún test mide en píxeles.
