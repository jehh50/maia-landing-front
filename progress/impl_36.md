# Implementación — feature 36: el Hero y el CTA final consumen las imágenes de la API

**Estado:** código en pie y verde. Pendiente de review.
**Fecha:** 2026-07-31.

> Nota de proceso: el líder me acotó a una lista cerrada de archivos y me indicó
> **no tocar** `feature_list.json` ni `progress/current.md`, así que la 36 no se
> movió a `in_progress` desde esta sesión y la bitácora vive aquí. El paso a
> `done` lo hará quien corresponda tras el veredicto del reviewer. Mismo criterio
> que `impl_32.md`, `impl_33.md`, `impl_34.md` e `impl_35.md`.

## Baseline (árbol como me lo entregaron, antes de tocar nada)

```
npm test          → Test Files 18 passed (18) | Tests 176 passed (176)   exit 0 (64.8 s)
npm run typecheck → exit 0, sin salida
npm run build     → ✓ built in 12.65s, exit 0 (aviso de chunk >500 kB, esperado)
```

Coincide con lo anunciado por el líder. Corrí **una sola suite a la vez** durante
toda la sesión; no se manifestó ninguno de los tres flakes conocidos (`AppRoutes`,
`ContactModal`, `PricesList`) y no hizo falta repetir nada aislado.

## Archivos tocados

| Archivo | Qué |
|---|---|
| `src/components/sections/Hero.tsx` | Carrusel cableado a `listImages({ seccion: 'hero' })` vía `normalizeApi`; eliminado el array `HERO_SLIDES`; estado de carga explícito; respaldo estático; controles solo con ≥2 imágenes. |
| `src/components/sections/CTAFinal.tsx` | Imagen cableada a `listImages({ seccion: 'cta_final' })`; hueco con proporción reservada; respaldo estático. |
| `src/components/sections/__tests__/Hero.test.tsx` | **Nuevo**: 10 tests contra `globalThis.fetch`. |
| `src/components/sections/__tests__/CTAFinal.test.tsx` | **Nuevo**: 8 tests contra `globalThis.fetch`. |
| `docs/api-contract.md` | §4 ter: subsección «Qué hace la landing con estas imágenes» (consumidores, mapeo, fallback y el aviso de coste medido). §10.4: la nota de «tablas vacías» ya no es cierta para imágenes. |
| `progress/impl_36.md` | Este informe. |

**`src/lib/api.ts` no se tocó.** Los helpers y tipos de imágenes ya existían desde
la feature 33 y me bastaron (`listImages`, `imageRawUrl`, `AdminImage`,
`normalizeApi`). `git diff --stat src/lib/api.ts` → vacío.

No se tocó `src/App.tsx` (ninguno de los dos componentes cambió de props:
`Hero` sigue recibiendo `{ onOpenContact }` y `CTAFinal` ninguna), ni `src/admin/`,
ni `Pricing.tsx` (feature 35), ni `feature_list.json`, ni `progress/current.md`.
Infraestructura intacta (C11). Ningún `.env*` leído ni escrito (C8).

### Ningún test previo renderiza `Hero` ni `CTAFinal` de forma que se rompa

El líder pidió comprobarlo por lo que pasó en la 35 con `brandAlpha.test.tsx`.
Lo verifiqué antes de escribir código: los únicos tests que montan estas dos
secciones son `src/__tests__/AppRoutes.test.tsx` y
`src/pages/__tests__/NotFound.test.tsx`, que renderizan la ruta `/` completa. Los
dos ya interceptan `fetch` con un `{ rows: [] }` por defecto y lo único que
afirman del Hero es el `<h1>` («Crea agentes de IA…»), que **esta feature no
toca**: con `rows: []` la sección sigue entera por diseño. **No hice falta
tocarlos y no los toqué**; siguen verdes en la pasada completa. Esta es
exactamente la diferencia práctica entre el fallback de la 35 (la sección
desaparece y arrastra a quien la renderice) y el de la 36 (la sección nunca
desaparece).

## La decisión que se me pidió justificar: el tratamiento del hueco vacío

El acceptance 2 fija el qué («si la API no devuelve imágenes, no se pintan
imágenes de la API») y me deja el cómo, con dos límites: **el Hero no puede
desaparecer** y **no vale un hueco roto, un icono de imagen partida ni un salto de
layout**. Lo resolví en tres estados, iguales en las dos secciones:

| Estado | Hero | CTAFinal |
|---|---|---|
| **Cargando** | el marco del carrusel, ya con su `aspectRatio` final, **sin ninguna `<img>`** y sin controles | el hueco de la imagen, ya con su proporción, **sin ninguna `<img>`** |
| **`rows` con datos** | una `<img>` por fila, en el orden del backend | la **primera** fila |
| **`rows: []`, 4xx/5xx o fallo de red** | **una sola** imagen estática, `/hero.png`, sin flechas ni puntos | **una sola** imagen estática, `/maia.png` |

### 1. Por qué degradar a un estático y no ocultar el carrusel

Las dos opciones que ofrecía el acceptance son legítimas; elegí el estático por
tres razones, en este orden:

1. **Ocultar el carrusel sí provoca el salto de layout que se me prohíbe, y en el
   peor sitio.** El marco mide `maxWidth: 1100` con `aspectRatio: 1381/677`: unos
   **540 px de alto** en escritorio, dentro o al borde del primer viewport. Un
   bloque que aparece o desaparece ahí es CLS *visible*, no como en precios
   (~4 700 px por debajo del pliegue, `impl_26.md` §5). Reservar el hueco vacío
   para evitar el salto sería peor todavía: un marco con borde, sombra y fondo, y
   nada dentro, es literalmente «el hueco roto» del enunciado.
2. **El argumento de la 35 no traslada.** Allí no se pinta el respaldo porque **un
   precio viejo mostrado como vigente miente**. Una captura de producto no es un
   dato con fecha de caducidad contractual: enseñar `/hero.png` no afirma nada
   falso sobre el servicio. Lo que sí sería incoherente con la 35 —y **no** hago—
   es inventar datos de la API o mezclar respaldo con filas reales.
3. **Es la ruta crítica del negocio.** El Hero es lo primero que ve un visitante y
   el marco es su único elemento visual. Ante un `500` momentáneo del backend, la
   alternativa «sin imagen» convierte un incidente de API en una landing rota.

### 2. Por qué **una sola** estática y no las tres de antes

El acceptance sugería «una sola imagen estática», y coincide con lo que quiere la
feature: **el carrusel de varias imágenes pasa a ser función exclusiva de lo que
se publique en el panel**. Conservar `HERO_SLIDES` con sus tres entradas habría
dejado en el componente el mismo tipo de array hard-codeado que la 35 borró de
`Pricing`, y con él la tentación de que nadie note nunca si el cableado se rompe:
con tres estáticos de respaldo, un fallo total de la API se ve **idéntico** a la
landing de ayer. Con uno solo, el respaldo es visiblemente un modo degradado
(imagen fija, sin flechas ni puntos) sin dejar de ser presentable.

`HERO_RESPALDO` conserva el `src` y el `alt` de la primera diapositiva de hoy,
así que el respaldo no cambia ni una palabra del copy existente.

**`public/hero-2.png` y `public/hero-3.png` quedan sin referenciar** en el código.
No los borro: `public/` no está en mi lista de archivos y borrar assets es una
decisión de limpieza aparte (además, hoy esas dos imágenes ya están cargadas en la
BD y siguen sirviendo de original). Levantado en las notas para el líder.

### 3. Los controles solo existen con dos o más imágenes

Flechas y puntos se renderizan bajo `total > 1`, y el `setInterval` de 5 s no se
arma con `total <= 1`. Un carrusel de una imagen con flechas que no llevan a
ningún sitio y un punto único es ruido, y con la sección cargando serían controles
sobre un marco vacío. El índice va acotado (`slide % total`) y `go()` no hace nada
con `total === 0`, así que no hay forma de apuntar fuera del array.

### 4. Cero flip: el respaldo nunca se pinta para ser sustituido

Podría haber pintado el estático desde el primer render y cambiarlo al llegar la
respuesta —eso quitaría el marco vacío inicial—, pero produce exactamente lo que
la 35 llamó parpadeo: el visitante ve una imagen y, medio segundo después, otra
distinta en el mismo sitio (y con el binario de la API aún descargando, un
parpadeo a blanco entre medias). El marco pasa de vacío a su contenido definitivo
en **una sola** transición, y hay un test con `MutationObserver` que registra
cada `src` que llega a montarse para demostrarlo.

### 5. `CTAFinal`: por qué la primera fila y por qué reservo la proporción

- La sección tiene **un solo** hueco de imagen y el contrato admite varias filas
  por sección. Se pinta `imagenes[0]`, es decir la primera del orden del backend
  (`orden ASC, id ASC`); no se elige por `id` ni se reordena. La fixture del test
  lo blinda: la primera fila tiene un `id` **mayor** que la segunda, así que
  ordenar por `id` en cliente saldría en rojo.
- El `<img>` de antes iba con `height: 'auto'`, o sea que **su alto lo decidía la
  imagen**: con una imagen de la API de otra proporción, la tarjeta entera
  cambiaba de alto al cargar. Ahora el hueco es un `Box` con la proporción natural
  de `/maia.png` (`408 / 612`) y la imagen va dentro con `objectFit: 'contain'`.
  Con el estático el render es **idéntico** al de hoy (la imagen llena el hueco
  exacto); con una imagen de otra proporción se ajusta dentro en vez de deformar
  la tarjeta o moverla. El `borderRadius: 20` del `sx` (240 px reales) se conserva
  en el contenedor, con `overflow: 'hidden'`, así que el recorte se ve igual.

### 6. Detalles de contrato que respeta el código

- **El `src` se construye**: `imageRawUrl(id)`, nunca un campo `url` (que no
  existe) ni una ruta a mano — así `VITE_API_BASE` se aplica en un solo sitio.
- **El `alt` sale de la API**, y `alt: null` se pinta como `alt=""` (imagen
  decorativa, `conventions.md` §6). No se inventa un texto de relleno.
- **El filtro va al servidor** (`?seccion=`), no un `filter()` sobre el listado
  completo: el endpoint lo acepta y hay test de la URL exacta.
- **El `id` es string** (`BIGSERIAL` sin castear): no pasa por `Number()` en
  ningún sitio y las fixtures usan uno por encima de `Number.MAX_SAFE_INTEGER`.
- **Cero `fetch` en los componentes** (C5). De hecho no hay otra forma:
  `publicJson` no se exporta desde `src/lib/api.ts`.
- El mensaje de error de `normalizeApi` **no se muestra**: una landing no le
  enseña al visitante un aviso de API en el encabezado; le enseña el respaldo. Por
  eso no se pasa el tercer argumento (sería copy muerto).

## Rendimiento: medido, no razonado a ojo (acceptance 5)

El backend **está levantado y ya tiene datos** (novedad respecto a `impl_35.md`,
que trabajó con las tablas vacías): 3 filas en `hero` y 1 en `cta_final`, que son
justamente los cuatro estáticos de `public/` subidos por el panel. Medido contra
`http://localhost:3002` el 2026-07-31:

```
GET /api/images?seccion=hero        HTTP 200   780 B     6,7 ms
GET /api/images/1/raw   (hero.png)   74 388 B   2,7-3,7 ms
GET /api/images/4/raw   (maia.png)  311 211 B   6,2-8,7 ms
50 × /api/images/4/raw, 10 en paralelo  →  0,41 s en total (≈120 req/s, ≈38 MB/s)
```

Cabeceras de `/api/images/:id/raw`: `Content-Type`, `Content-Length`,
`X-Content-Type-Options`. **Ni `Cache-Control`, ni `ETag`, ni `Last-Modified`**,
confirmado con `curl -D-`.

Qué significa para la landing:

1. **Coste por petición: irrelevante.** Leer el `BYTEA` y servirlo cuesta
   milisegundos y aguanta de sobra el tráfico de una landing. **No hay coste
   inaceptable que justifique inventar nada**, y no he introducido ninguna caché
   en cliente: sería otra feature (y, en el front, una mala: la caché correcta es
   una cabecera del backend).
2. **Lo que sí empeora es el ancho de banda y la repetición.** Sin cabeceras de
   caché el navegador no puede ni reutilizar ni revalidar: **cada carga y cada
   recarga se lleva los ≈556 KB** de las cuatro imágenes, donde antes `public/`
   iba por el CDN de Vercel con hash y caché inmutable. En una segunda visita eso
   pasa de 0 KB a 556 KB.
3. **La cadena crítica del LCP gana un salto.** Antes: HTML → `/hero.png`. Ahora:
   HTML → JS → `GET /api/images?seccion=hero` → `GET /api/images/:id/raw`. Son dos
   viajes en serie antes de que empiece a bajar el primer píxel del Hero, y el
   segundo ya no sale del CDN sino del servidor de aplicación. En local no se nota;
   con latencia real es la parte que hay que vigilar.
4. **Lo que le tocaría al backend, y es barato:** el binario de una imagen es
   **inmutable por `id`** —el `PATCH` solo toca `alt`, `orden` y `seccion`, y
   cambiar la imagen es `POST` nuevo + `DELETE`, §4 ter—, así que
   `Cache-Control: public, max-age=31536000, immutable` es seguro sin riesgo de
   servir contenido viejo, y un `ETag` sobre el `updated_at` cerraría el resto.
   **Lo dejo documentado como recomendación, no implementado**: no es este repo.

Anotado también en `docs/api-contract.md` §4 ter.

## Tests — 18 casos nuevos en dos archivos

`vi.spyOn(globalThis, 'fetch')` con `Response` reales; **no se mockea
`src/lib/api.ts`** (`docs/verification.md` §4). Fixtures locales con los 9 campos
del contrato. El Hero necesita, además, el `IntersectionObserver` de sus
contadores y el efecto Vanta apagados: mismo apaño que ya usa
`src/__tests__/AppRoutes.test.tsx`.

### `Hero.test.tsx` (10)

| # | Caso | Acceptance |
|---|---|---|
| 1 | Pide `/api/images?seccion=hero` una sola vez, `GET`, `credentials: 'omit'`, y nunca `/api/admin/` | 1 |
| 2 | Una `<img>` por fila, `src` = `/api/images/:id/raw`, `alt` de la API y **orden del backend**; ni rastro de `hero-2/3.png` | 1, 3, 4 |
| 3 | `alt: null` → `alt=""` (decorativa) | 3 |
| 4 | Con ≥2 imágenes hay flechas y puntos, y navegar cambia la diapositiva visible | 1 |
| 5 | Con **una** imagen no hay flechas ni puntos | 2 |
| 6 | `rows: []` → respaldo `/hero.png`, **sección entera en pie** (h1 y CTA), sin controles y sin ninguna URL de la API | 2, 6 |
| 7 | **Fallo de red** → mismo respaldo, sección en pie | 2, 6 |
| 8 | `500` → mismo respaldo | 2, 6 |
| 9 | Mientras carga: h1 ya pintado, marco montado con su `aspect-ratio`, **cero `<img>`**, y el marco es el **mismo nodo** después de la respuesta (no se monta ni desmonta ⇒ no hay salto) | 2 |
| 10 | Con datos de la API el respaldo **no llega a pintarse ni un instante** (`MutationObserver` sobre cada `src` montado) | 2 |

### `CTAFinal.test.tsx` (8)

| # | Caso | Acceptance |
|---|---|---|
| 1 | Pide `/api/images?seccion=cta_final` una sola vez, `GET`, `credentials: 'omit'`, nunca `/api/admin/` | 1 |
| 2 | Pinta la imagen de la API con `src` construido y su `alt`; sin rastro de `maia.png` | 1, 3 |
| 3 | Con varias filas usa **la primera** del backend, no la de `id` menor | 4 |
| 4 | `alt: null` → `alt=""` | 3 |
| 5 | `rows: []` → respaldo `/maia.png`, con el titular y el CTA intactos | 2, 6 |
| 6 | **Fallo de red** → mismo respaldo | 2, 6 |
| 7 | `500` → mismo respaldo | 2, 6 |
| 8 | Mientras carga: texto y CTA pintados, hueco reservado con `aspect-ratio: 408/612`, **cero `<img>`**, y mismo nodo tras la respuesta | 2 |

## Prueba de que los tests discriminan (mutación → rojo → revertido)

Cada mutación se aplicó **sola** sobre el componente, se corrió su suite y se
**revirtió desde copia antes de la siguiente** (script en el scratchpad de la
sesión, con `trap` que restaura el archivo pase lo que pase). Las 15 salen en
rojo; el script avisa si el patrón no se encuentra, para que ninguna cuente como
«verde» por no haberse aplicado.

| # | Mutación | Resultado |
|---|---|---|
| M1 | `listImages()` sin `seccion`: pide el listado entero y filtra (o no) en cliente | **ROJO — 1** |
| M2 | El `src` sale de un campo inventado (`/uploads/:filename`) en vez de `imageRawUrl` | **ROJO — 2** |
| M3 | Se reordenan las imágenes en cliente | **ROJO — 1** |
| M4 | `alt: null` cae a un texto inventado en vez de `''` | **ROJO — 1** |
| M5 | El respaldo se pinta también mientras carga (flip respaldo → API) | **ROJO — 2** |
| M6 | Sin datos no se pinta nada: el marco queda vacío | **ROJO — 3** |
| M7 | El respaldo se **suma** a las imágenes de la API | **ROJO — 6** |
| M8 | El fallo de red se traga sin cambiar de estado (marco en blanco para siempre) | **ROJO — 2** |
| M9 | Los controles se pintan con una sola imagen | **ROJO — 2** |
| M10 | El Hero se oculta mientras carga (`total === 0 ⇒ null`) | **ROJO — 1** |
| M10b | Se aplica el fallback de la 35 tal cual: sin datos, sin sección | **ROJO — 4** |
| M11 | `CTAFinal` pide `seccion: 'hero'` | **ROJO — 1** |
| M12 | `CTAFinal` coge la última fila en vez de la primera | **ROJO — 1** |
| M13 | `CTAFinal` sin respaldo: hueco vacío sin datos | **ROJO — 3** |
| M14 | `CTAFinal` pinta el respaldo también mientras carga | **ROJO — 1** |
| M15 | `CTAFinal` pierde la reserva de proporción (salto de layout) | **ROJO — 1** |

Árbol comprobado tras la última mutación: `git status` solo lista los archivos de
la feature y ningún marcador quedó en el código.

## Comprobaciones estáticas

```
grep -n "fetch(" Hero.tsx CTAFinal.tsx                      → 0
grep -nw "any" los 4 archivos de la feature                 → 0
grep -nE "#[0-9a-fA-F]{3,8}" Hero.tsx CTAFinal.tsx          → 0
grep -nE "console\.|TODO" los 4 archivos                    → 0
grep -n "'rows' in" Hero.tsx CTAFinal.tsx                   → 0  (todo por normalizeApi)
grep -nE "Number\(|parseInt" Hero.tsx CTAFinal.tsx          → 0  (el id es string)
grep -rn "HERO_SLIDES" src/                                 → 0  (el array ya no existe)
git diff --stat src/lib/api.ts                              → sin cambios
git status --short (infraestructura)                        → sin cambios
```

## Salida de la verificación

```
npm test           → Test Files 20 passed (20) | Tests 194 passed (194)   exit 0 (64.6 s)
npm run typecheck  → exit 0, sin salida
npm run build      → ✓ built in 12.23s, exit 0
                     (aviso «Some chunks are larger than 500 kB»: esperado,
                      docs/verification.md §1)
```

**Conteo antes → después: 18 archivos / 176 tests → 20 archivos / 194 tests.**
Dos archivos nuevos (`Hero.test.tsx`, `CTAFinal.test.tsx`) y **+18 tests netos**;
ningún test previo modificado ni roto, y **ningún rojo** en la pasada completa,
incluidos los tres archivos señalados como flakes. Corrí una sola suite a la vez.

## Notas para el líder (fuera de mi lista de archivos)

1. **El backend ya tiene imágenes cargadas.** `GET /api/images` devuelve 3 filas
   en `hero` y 1 en `cta_final` (los mismos cuatro PNG de `public/`, subidos por
   el panel). Es un cambio respecto a lo que documentaba `impl_35.md`, y hace que
   **esta feature sí sea verificable a ojo** en `npm run dev`, al revés que la 35.
   Yo no he hecho la pasada visual a 360 px y 1440 px (`verification.md` §6): la
   dejo recomendada como último paso antes de dar la 36 por cerrada, con especial
   atención a que el marco del Hero no parpadee al llegar la respuesta.
2. **`public/hero-2.png` y `public/hero-3.png` quedan sin referenciar** desde el
   código (`/hero.png` y `/maia.png` siguen usándose como respaldo). Borrarlas es
   una limpieza de assets aparte; `public/` no estaba en mi lista y no las toqué.
3. **Cabeceras de caché en `/api/images/:id/raw`: feature del backend.** El
   binario es inmutable por `id`, así que `Cache-Control: public, max-age=31536000,
   immutable` + `ETag` es seguro y elimina los ≈556 KB por carga. Números en la
   sección de rendimiento de arriba.
4. **Drift documental, sexta vez** (ya levantado en `impl_33.md`, `impl_34.md`,
   `review_34.md` §12.5 e `impl_35.md`): `docs/verification.md` §1-§2 y
   `docs/architecture.md` §8 siguen anunciando `15 archivos / 86 tests`; el real
   es ahora **20 / 194**. `docs/architecture.md` §5 no lista `/api/images` ni
   `/api/precios`, y su §9 sigue diciendo que imágenes y precios están «en
   maquetación con datos mock». Es candidato claro a feature propia.
5. **`tsconfig.tsbuildinfo`** vuelve a aparecer modificado en `git status`: es el
   artefacto trackeado de siempre, lo toca cualquier `typecheck`. No lo toqué a
   mano.
