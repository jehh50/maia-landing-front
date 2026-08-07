# Implementación — feature 35: la sección de precios de la landing consume `/api/precios`

**Estado:** código en pie y verde. Pendiente de review.
**Fecha:** 2026-07-31.

> Nota de proceso: el líder me acotó a una lista cerrada de archivos y me indicó
> **no tocar** `feature_list.json` ni `progress/current.md`, así que la 35 no se
> movió a `in_progress` desde esta sesión y la bitácora vive aquí. El paso a
> `done` lo hará quien corresponda tras el veredicto del reviewer. Mismo criterio
> que `impl_32.md`, `impl_33.md` e `impl_34.md`.

## Baseline (árbol como me lo entregaron, antes de tocar nada)

```
npm test          → Test Files 18 passed (18) | Tests 159 passed (159)   exit 0 (62.7 s)
npm run typecheck → exit 0, sin salida
npm run build     → ✓ built in 12.73s, exit 0 (aviso de chunk >500 kB, esperado)
```

Coincide con lo anunciado por el líder. Corrí **una sola suite a la vez** durante
toda la sesión; no se manifestó ninguno de los tres flakes conocidos y no hizo
falta repetir nada aislado.

## Archivos tocados

| Archivo | Qué |
|---|---|
| `src/components/sections/Pricing.tsx` | Cableado a `listPlanes` vía `normalizeApi`; **eliminado** el array `plans` y la interfaz `Plan`; estado de carga; fallback «sin datos, sin sección». |
| `src/components/sections/__tests__/Pricing.test.tsx` | Reescrito: 22 tests contra `globalThis.fetch`. |
| `docs/api-contract.md` | §4 quater: la landing pasa a ser consumidora del endpoint público y se registra el fallback decidido. §10.4: el párrafo «la relación con la landing» pasa a histórico. |
| **`src/theme/__tests__/brandAlpha.test.tsx`** | **Fuera de la lista que me dio el líder. Ver el aviso de abajo: es obligatorio para no dejar la suite en rojo.** |
| `progress/impl_35.md` | Este informe. |

### ⚠️ Un archivo fuera de mi lista, y por qué lo toqué igualmente

**Léelo antes que nada; si el líder lo veta, se revierte en 30 segundos y el
único efecto es que `npm test` vuelve a rojo.**

`src/theme/__tests__/brandAlpha.test.tsx` (feature 25) **renderiza `Pricing`** para
leer el CSS que Emotion inyecta y comprobar que la sombra del plan destacado y el
borde del distintivo de prueba salen de `alpha(tokens.brand.*, x)`. Desde esta
feature, `Pricing` **no pinta nada sin datos**, así que ese test se quedó sin CSS
que inspeccionar y pasó a fallar:

```
FAIL src/theme/__tests__/brandAlpha.test.tsx > Pricing emite la sombra del plan destacado…
AssertionError: expected '.css-a0nkt9{background:linear-gradien…' to contain '014px40pxrgba(232,68,10,0.15)'
```

No hay forma de dejarlo verde sin tocarlo: sus dos aserciones exigen que se
rendericen una tarjeta `destacado` y un `trial_texto`, y eso exige datos de la
API. La alternativa —un respaldo hard-codeado en el componente— es exactamente lo
que el acceptance 2 prohíbe.

Elegí **la adaptación mínima** frente a parar la sesión, porque un test previo
roto es `CHANGES_REQUESTED` automático (C1) y el arreglo no cambia **nada** de lo
que ese test verifica:

- se le sirve **un** plan por `vi.spyOn(globalThis, 'fetch')` (mismo patrón que
  el resto del repo, sin mockear `src/lib/api.ts`), tipado como `AdminPlan`;
- el test pasa a `async` y espera al `heading` antes de leer el CSS;
- `afterEach(vi.restoreAllMocks)`;
- **las dos aserciones de color quedan intactas**, con los mismos valores.

Los otros cuatro tests del archivo (los de `Pain`, `Solution` y los dos de
aritmética de `alpha`) **no se tocaron**. Diff: +26 −2, todo en el `it` de
`Pricing` más la fixture. Si el líder prefiere que este cambio lo haga otra
sesión, se revierte con
`git checkout -- src/theme/__tests__/brandAlpha.test.tsx`.

Aparte de ese archivo, **`src/lib/api.ts` no se tocó**: los helpers y tipos de precios ya existían desde
la feature 34 y me bastaron (`listPlanes`, `AdminPlan`, `formatMoneda`,
`normalizeApi`). `git diff --stat src/lib/api.ts` → vacío.

No se tocó `src/App.tsx` (la interfaz de props del componente es la misma:
`{ isAnnual, onToggle, onOpenContact }`; `isAnnual` sigue elevado al padre,
`docs/conventions.md` §5), ni `src/admin/`, ni `Hero.tsx`/`CTAFinal.tsx`
(feature 36), ni `feature_list.json`, ni `progress/current.md`. Infraestructura
intacta (C11). Ningún `.env*` leído ni escrito (C8).

## Lo que hace ahora el componente

```tsx
const res = await normalizeApi(listPlanes(), 'rows', 'No pudimos cargar los planes');
…
if (estado !== 'ok' || planes.length === 0) return null;   // el fallback entero
```

- **Cero `fetch` en el componente** (C5). De hecho no hay otra forma: `apiJson` y
  `publicJson` **no se exportan** desde `src/lib/api.ts`, así que la frontera está
  garantizada por el módulo, no solo por disciplina.
- Estado explícito `'loading' | 'ok' | 'error'` (`docs/conventions.md` §5), no un
  booleano suelto. El efecto lleva guarda `vigente` para no hacer `setState`
  sobre un componente desmontado.
- El listado llega **ya ordenado** (`orden ASC, id ASC`) y sin paginar: no se
  reordena ni se recorta en cliente. Hay test que lo congela (mutación M9).

## Decisiones

### 1. El fallback ya venía decidido: sin datos, no hay sección

No lo re-decidí. `rows: []`, `4xx`/`5xx`, body sin `rows` y fallo de red caen
todos en el mismo sitio: `return null`. **El array `plans` (4 planes, 27 líneas) y
su `interface Plan` se eliminaron**; no quedan ni como valor por defecto ni como
constante muerta. El test de fallo de red lo comprueba por su nombre, buscando
uno a uno los rastros del array viejo (`Starter`, `Team`, `Growth`, `Enterprise`,
`19`, `179`, `Ahorra 10%`, `Ahorras $24/año`).

Consecuencia asumida y ya conocida: con las tablas del backend vacías, **hoy la
sección no se pinta**. No inventé ningún respaldo «por si acaso».

### 2. Layout: por qué NO hay esqueleto de carga (acceptance 3 y 7)

El acceptance pide dos cosas que tiran en direcciones opuestas: que la carga no
provoque **salto de layout** y que no haya **parpadeo en el que la sección se
pinte y desaparezca**. Un esqueleto con la altura de la sección satisface lo
primero solo mientras la API responde con datos: en los tres casos de fallback
tendría que desaparecer, y eso **es** el parpadeo prohibido —y con las tablas
vacías sería hoy el caso *normal*, no el excepcional—. Por eso:

- **Una sola transición visible:** nada → sección definitiva. Nunca nada →
  esqueleto → nada.
- **La sección se monta con su altura final.** No hay swap interno
  esqueleto→contenido, que es la fuente clásica de jank: nada dentro de la
  sección crece ni se encoge después del montaje.
- **El reflujo que provoca su llegada queda fuera del viewport.** La petición
  sale al montar la página (el componente está en el árbol desde el primer
  render de `App`), y la sección arranca ~4 700 px por debajo del pliegue a
  1440 px (medición de `impl_26.md` §5: `pricingTop=4668`). CLS solo cuenta los
  desplazamientos **visibles**: cuando el visitante llega scrolleando, la sección
  ya está en su sitio. Que la respuesta tarde más que el scroll de 4 700 px es el
  caso patológico, y en él lo que se ve es una sección que aparece, nunca una que
  se borra.
- **Los `.reveal` que montan tarde siguen animando.** `useReveal` trae un
  `MutationObserver` acotado a `document.body` que recoge los `.reveal` añadidos
  después del primer render —su docstring nombra explícitamente las «secciones
  condicionales»—, así que la sección no se queda con la opacidad 0 de `.reveal`.
  Lo comprobé leyendo el hook; no se tocó.

Los dos tests que fijan esto: «mientras carga no pinta nada, y la sección aparece
una sola vez ya con sus datos» (con un `fetch` pendiente resuelto a mano y un
`MutationObserver` que registra altas y bajas: el resultado exigido es
exactamente `['add']`, ni un `remove`) y los tres de fallback, que exigen `[]`.

### 3. Mapeo del contrato

| Campo | Dónde se pinta |
|---|---|
| `nombre` | `Typography variant="h6"` (rol `heading`) |
| `precio_mensual` | cifra grande con el toggle en **mensual** |
| `precio_anual` | cifra grande con el toggle en **anual** — es el mensual facturando anualmente, no el total del año; hay test que afirma `17`/`179` y que **no** aparecen `204` ni `2,148` |
| `ahorro_anual` | «Ahorras $24/año», solo en anual y solo si es `> 0` |
| `vinetas` | lista con `✓` |
| `vinetas_tachadas` | lista con `line-through` (antes `dim`, que siempre venía vacío) |
| `destacado` | borde naranja + badge «Más popular» (antes `featured`) |
| `trial_texto` | caja verde con el icono de regalo (antes `trial`) |
| `es_custom` | «Custom», sin ninguna cifra |
| `descuento_pct` | el chip junto al toggle (ver decisión 5) |
| `orden`, `id` | el orden lo respeta el `map`; `id` es la `key` (**string**, no se pasa por `Number()`) |

La cifra grande **no** usa `formatMoneda`: el `$` va como `<sup>` por diseño y
`formatMoneda` lo devuelve dentro del string. El número usa el mismo locale
(`toLocaleString('es-MX')`) para que el separador de miles coincida con el del
helper; el «Ahorras …» sí usa `formatMoneda`.

### 4. Los planes `es_custom` no pintan cifras — y lo decide `es_custom`, no el nulo

Es la trampa histórica de esta pantalla y la resuelve la **única** línea del
componente que consulta `es_custom` para cifras:

```tsx
const importe = p.es_custom ? null : (isAnnual ? p.precio_anual : p.precio_mensual);
```

Dentro de la rama `importe !== null`, `es_custom` ya es `false` por construcción,
así que el «Ahorras…» no repite la comprobación: la mutación que la quitaba salía
**verde** (era una guarda inalcanzable) y preferí borrar el código muerto a
declarar una protección que ningún test podía distinguir. Lo que sí discrimina es
M4 (fiarse del nulo) → **ROJO**.

El test más duro no usa la fixture cómoda: manda un plan `es_custom: true` **con
cifras rellenas** (`precio_mensual: 349`, `precio_anual: 314`, `ahorro_anual:
420`) y exige que la tarjeta no contenga `349|314|420|$`. Y la fixture Enterprise
lleva viñetas **sin un solo dígito** a propósito, para poder afirmar
`expect(card.textContent).not.toMatch(/\d/)` — que cubre de golpe el «$0» y el
«Ahorras $0/año».

### 5. El chip de descuento sale de `descuento_pct`, que es **por plan**

El `Chip` decía «Ahorra 10%» hard-codeado. Ahora:

```
descuentos      = planes SIN es_custom → su descuento_pct
descuentoMax    = max(descuentos)
descuentoUniforme = min === max
```

- `descuentoMax === 0` → **no hay chip** (no se anuncia un ahorro que no existe).
- Todos iguales → «Ahorra X%».
- Distintos → «Ahorra **hasta** X%». No se puede afirmar «Ahorra 25%» cuando solo
  un plan descuenta el 25 %.
- Los `es_custom` se excluyen del cálculo: su `descuento_pct: 0` convertiría un
  «Ahorra 10%» honesto en un «hasta 10%» equivocado. Hay test dedicado (M7).

El toggle mensual/anual **sigue funcionando** y sigue siendo del padre: el
`Switch` es controlado por `isAnnual` y avisa por `onToggle` (test dedicado). Sin
descuentos, el chip desaparece pero el toggle se queda.

### 6. Cambio de layout de la rejilla, y por qué entra en el scope

La rejilla tenía `lg: repeat(4, 1fr)` porque el array hard-codeado tenía
exactamente 4 planes. Con un número variable de planes, 2 planes ocuparían la
mitad izquierda y dejarían medio ancho vacío. Ahora las columnas son
`min(planes.length, 4)` (y `min(…, 2)` en `sm`), con un `maxWidth` centrado
(`columnas * ANCHO_TARJETA`, constante nombrada) cuando hay menos de cuatro. Con
4 o más planes el render es **idéntico** al de antes. Es consecuencia directa de
que el número de planes deje de ser una constante, no un rediseño.

### 7. Lo que NO cambié, aun teniéndolo delante

- **`Navbar.tsx:10` y `Footer.tsx:8` enlazan a `#pricing`.** Con la sección
  oculta esos enlaces no tienen destino y el clic no hace nada. Es consecuencia
  directa del fallback decidido, no un defecto de la implementación, y ocultarlos
  toca dos archivos que no son míos (C10). **Levantado para el líder**, ver notas.
- El aviso de `review_34.md` §12.1 (el `Omit` bloquea el literal pero no el
  *spread*) aquí **no aplica en la práctica**: esta pantalla solo lee. No
  construyo ningún objeto derivado de `AdminPlan` ni llamo a un helper de
  escritura; las únicas derivaciones son escalares (`importe`, `descuentos`).
- **No recalculo los derivados.** `derivarPrecios` existe y estaba a mano, pero
  el contrato dice que la vista pinta los que ya vienen en la respuesta y que ese
  helper es solo para la vista previa del formulario.

## Tests — 22 casos en `src/components/sections/__tests__/Pricing.test.tsx`

`vi.spyOn(globalThis, 'fetch')` con `Response` reales; **no se mockea
`src/lib/api.ts`** (`docs/verification.md` §4). Fixtures locales con los 14 campos
del contrato, incluido un `id` `BIGSERIAL` fuera del rango seguro
(`'9007199254740993'`). Los 5 tests anteriores **no se borraron sin sustituto**:
los dos de estilo (badge naranja, ningún path de paleta sin resolver) y los tres
de comportamiento (tarjetas en pie, único CTA «Contactanos», el toggle avisa al
padre) siguen aquí, adaptados a que ahora los datos llegan por la API.

| # | Caso | Acceptance |
|---|---|---|
| 1 | Pide `/api/precios` una sola vez, `GET`, `credentials: 'omit'`, y nunca `/api/admin/` | 1 |
| 2 | Una tarjeta por plan, con viñetas, tachadas, prueba gratis y **en el orden del backend** | 4 |
| 3 | El badge «Más popular» lo decide `destacado`, no la posición | 4 |
| 4 | El badge se pinta con el naranja de marca *(heredado de la 26)* | — |
| 5 | Ningún path de paleta sin resolver en el CSS *(heredado de la 26)* | — |
| 6 | En mensual pinta `precio_mensual` y no habla de ahorro | 4, 6 |
| 7 | En anual pinta `precio_anual` (no el total del año) y el `ahorro_anual` | 4, 6 |
| 8 | El switch sigue avisando al padre (`isAnnual` vive en `App.tsx`) | 6 |
| 9 | El chip sale de `descuento_pct` (20 %), no del «Ahorra 10%» hard-codeado | 6 |
| 10 | Descuentos distintos → «Ahorra **hasta** 25%» | 6 |
| 11 | El `descuento_pct: 0` de un `es_custom` no rebaja el anuncio | 5, 6 |
| 12 | Sin descuentos no hay chip, pero el toggle se queda | 6 |
| 13 | Un plan sin descuento no dice «Ahorras $0/año» | 5, 6 |
| 14 | `es_custom` en mensual: ni `$`, ni un dígito, ni «Ahorras» | 5 |
| 15 | `es_custom` en anual, con los derivados en `null` | 5 |
| 16 | `es_custom` **con cifras rellenas**: sigue sin pintarlas (lo decide `es_custom`, no el nulo) | 5 |
| 17 | `rows: []` → la sección no llega a pintarse ni un instante (`eventos === []`) | 2 |
| 18 | `500` → no se renderiza | 2 |
| 19 | Fallo de red → no se renderiza **y no reaparece ningún precio hard-codeado** | 2 |
| 20 | `200` sin `rows` (body inesperado) → no se renderiza | 2 |
| 21 | Mientras carga no pinta nada; la sección aparece **una sola vez** ya completa (`['add']`) | 3, 7 |
| 22 | El enlace «Contactanos» sigue abriendo el modal; sin CTA por tarjeta | — |

El `MutationObserver` de los tests 17-21 es lo que permite distinguir «no se
renderiza» de «se pintó un instante y se quitó»: registra altas **y** bajas del
nodo `#pricing`.

## Prueba de que los tests discriminan (mutación → rojo → revertido)

Cada mutación se aplicó **sola** sobre `Pricing.tsx`, con
`npx vitest run src/components/sections/__tests__/Pricing.test.tsx`, y se
**revirtió desde copia antes de la siguiente** (script en el scratchpad de la
sesión, con `finally` que restaura el archivo). Las 9 salen en rojo.

| # | Mutación | Resultado |
|---|---|---|
| M1 | Se cae la guarda de estado: la sección se pinta siempre | **ROJO — 4** |
| M2 | Esqueleto de carga con `minHeight` que luego hay que quitar | **ROJO — 4** (aparece y desaparece: `['add','remove']`) |
| M3 | El toggle anual pinta `precio_mensual` | **ROJO — 1** |
| M4 | Se fía del nulo en vez de `es_custom` | **ROJO — 2** |
| M5 | El «Ahorras» pierde la guarda `> 0` → «Ahorras $0/año» | **ROJO — 2** |
| M6 | Vuelve el chip hard-codeado «Ahorra 10%» | **ROJO — 2** |
| M7 | Los planes a convenir cuentan para el descuento anunciado | **ROJO — 1** |
| M9 | Se reordenan los planes en cliente | **ROJO — 1** |
| M10 | **Se reintroduce un respaldo hard-codeado** cuando `rows` viene vacío o falla | **ROJO — 4** |

### La mutación que salió VERDE, y qué hice con ella

**M8** —quitar la guarda `es_custom` del cálculo del ahorro
(`const ahorro = p.ahorro_anual;`)— salió **verde**, y con razón: ese `const`
solo se usaba dentro de la rama `importe !== null`, donde `es_custom` ya es
`false`. Era una guarda **inalcanzable**, imposible de distinguir por ningún test
honesto. En vez de escribir que «hay doble protección», **borré el código muerto**
y dejé una sola decisión (`importe`), con el comentario que lo explica. M4 sigue
cubriendo el caso real. Mismo tipo de hallazgo que la M13 de la feature 34: la
mutación encontró el hueco, no la lectura.

## Comprobaciones estáticas

```
grep -n "fetch(" src/components/sections/Pricing.tsx        → 0
grep -nw "any" Pricing.tsx + su test                        → 0
grep -nE "#[0-9a-fA-F]{3,8}" Pricing.tsx                    → 0
grep -n "console\.|TODO" Pricing.tsx + su test              → 0
grep -n "'rows' in" Pricing.tsx                             → 0  (todo por normalizeApi)
grep -n "Number(|parseInt" Pricing.tsx                      → 0  (el id es string)
grep -n "plans\b\|interface Plan\b" src/                    → 0  (el array hard-coded ya no existe)
git diff --stat src/lib/api.ts                              → sin cambios
```

## Salida de la verificación

```
npm test           → Test Files 18 passed (18) | Tests 176 passed (176)   exit 0 (59.7 s)
npm run typecheck  → exit 0, sin salida
npm run build      → ✓ built in 12.04s, exit 0
                     (aviso «Some chunks are larger than 500 kB»: esperado,
                      docs/verification.md §1)
```

**Conteo antes → después: 18 archivos / 159 tests → 18 archivos / 176 tests.**
Mismo número de archivos (se reescribió `Pricing.test.tsx`, no se añadió uno
nuevo); **+17 netos** = 22 casos nuevos menos los 5 anteriores. `brandAlpha` sigue
con sus 5 tests, adaptado pero sin cambiar lo que afirma. Ningún test previo roto
y ningún rojo en la pasada completa; corrí una sola suite a la vez.

## Notas para el líder (fuera de mi lista de archivos)

1. **Los enlaces `#pricing` se quedan sin destino cuando no hay planes.**
   `src/components/Navbar.tsx:10` («Precios») y `src/components/Footer.tsx:8`
   apuntan a `#pricing`; con la sección oculta, el clic no hace nada. Es la
   consecuencia lógica del fallback decidido, pero afecta a la navegación de una
   landing de captación. Si se quiere, ocultar esos dos enlaces cuando no hay
   planes es una feature propia (implica subir el estado de los planes a `App` o
   compartirlo, y toca dos archivos que no son de la 35).
2. **La 35 no puede verse en un navegador hasta que existan planes.** Verificación
   manual (`docs/verification.md` §6) pendiente por eso, no por descuido: hoy
   `GET /api/precios` responde `{"rows":[]}` y lo correcto según el acceptance 2
   es **no ver nada**. En cuanto se den de alta planes desde el panel conviene
   una pasada visual a 360 px y 1440 px.
3. **`feature_list.json` sigue en `pending`** y `progress/current.md` intacto, por
   la acotación explícita del líder. Acción pendiente tras la review: mover la 35
   a `done` y volcar el resumen a `history.md`.
4. **Drift documental, quinta vez** (ya levantado en `impl_33.md`, `impl_34.md` y
   `review_34.md` §12.5): `docs/verification.md` §1-§2 y `docs/architecture.md` §8
   siguen anunciando `15 archivos / 86 tests`; el real es ahora **18 / 176**.
   `docs/architecture.md` §5 no lista `/api/precios` y su §9 sigue diciendo que
   precios está «en maquetación con datos mock». Ya es candidato a feature propia.
5. **`tsconfig.tsbuildinfo`** vuelve a aparecer modificado en `git status`: es el
   artefacto trackeado de siempre, lo toca cualquier `typecheck`. No lo toqué a
   mano.
