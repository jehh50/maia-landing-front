# Review — feature 36: «El Hero y el CTA final consumen las imagenes de la API» — **APROBADO**

**Veredicto:** APROBADO
**Fecha:** 2026-07-31 · **Commit revisado:** `7e9c200` (rama `feat/admin-cruds`)
**Revisor:** reviewer (verificación ejecutada de nuevo, sin fiarme del informe)

Listón aplicado: **ruta crítica de negocio**, no pantalla de admin. Con ese listón
el cableado se sostiene: el Hero no queda roto en ninguno de los cuatro
escenarios, el `src` y el `alt` salen de donde dice el contrato y los controles
del carrusel desaparecen cuando sobran. Lo que encontré es de nivel observación;
nada bloquea. Dos observaciones sí quiero que lleguen al humano: el **hueco vacío
mientras carga con backend dormido** (§4.2) y una **fixture de orden que no
discrimina** en `Hero.test.tsx` (§8.1).

---

## Verificación ejecutada por mí

| Comando | Resultado |
|---|---|
| `npm test` | **20 archivos / 194 tests, 0 fallos, exit 0** (64.7 s) — coincide con lo anunciado (antes 18 / 176) |
| `npm run typecheck` | exit 0, sin salida |
| `npm run build` | `✓ built in 13.06s`, exit 0. Solo el aviso `Some chunks are larger than 500 kB`, esperado (`docs/verification.md` §1) |
| `git status --short` | solo ` M tsconfig.tsbuildinfo`, artefacto trackeado preexistente (misma nota que `review_30..35`) |

Ningún rojo en la pasada completa: `AppRoutes`, `ContactModal` y `PricesList`
pasaron a la primera y no hizo falta repetir ninguna suite aislada. Corrí una
sola suite a la vez durante toda la sesión de mutación.

Comprobaciones estáticas repetidas una a una sobre los 4 archivos de código:

```
grep -E "fetch\(" Hero.tsx CTAFinal.tsx                       → 0
grep -w any     los 4 archivos                                → 0
grep -E "#[0-9a-fA-F]{3,8}" Hero.tsx CTAFinal.tsx             → 0
grep -E "console\.|TODO" los 4 archivos                       → 0
grep -E "localStorage|sessionStorage" Hero.tsx CTAFinal.tsx   → 0  (no hay caché inventada)
grep -rn "HERO_SLIDES|hero-2|hero-3" src/ (sin tests)         → 0  (el array murió)
git show --stat 7e9c200                                       → 6 archivos, ninguno fuera de la lista
```

---

## 1. Los 6 acceptance, uno a uno

| # | Acceptance | Veredicto | Evidencia |
|---|---|---|---|
| 1 | Hero → `hero`, CTAFinal → `cta_final`, vía helper, cero `fetch` | **CUMPLE** | `Hero.tsx:139` y `CTAFinal.tsx:51` llaman `normalizeApi(listImages({ seccion: … }), 'rows')`. `grep fetch(` en ambos → 0; además `publicJson` ni siquiera se exporta desde `api.ts`, así que no había otra vía. Tests `Hero.test.tsx:120-133` y `CTAFinal.test.tsx:67-78` congelan URL, método, `credentials: 'omit'` y **una sola llamada** por montaje |
| 2 | Fallback: sin imágenes de la API no se pintan imágenes de la API; el Hero no puede quedar como hueco roto; sin salto de layout | **CUMPLE** | `Hero.tsx:149-154` y `CTAFinal.tsx:60-65`. Ver el juicio detallado en §2 y §4 |
| 3 | `src` = `${API_BASE}/api/images/${id}/raw`, `alt` del campo `alt` | **CUMPLE** | `Hero.tsx:153` y `CTAFinal.tsx:64` usan `imageRawUrl(img.id)` (`api.ts:463-465`), nunca una ruta a mano ni un campo `url` inexistente. `alt: img.alt ?? ''`. Tests `Hero.test.tsx:141-152`, `157-163`; `CTAFinal.test.tsx:86-89`, `103-109` |
| 4 | Se respeta el orden del backend (`orden ASC, id ASC`) | **CUMPLE, con la fixture del Hero mejorable** | No hay `sort`, `reverse` ni `slice` en ninguno de los dos componentes. `CTAFinal.test.tsx:92-101` es la aserción fuerte: la primera fila lleva un `id` **mayor** que la segunda, así que ordenar por `id` en cliente saldría en rojo. La de `Hero.test.tsx:40-46` no llega a tanto → §8.1 |
| 5 | Ojo al rendimiento; si el coste es inaceptable, documentarlo en vez de inventar una caché | **CUMPLE, y la medición se sostiene** | Contrastada por mí contra `:3002`, ver §6. Cero caché en el cliente |
| 6 | Tests con `vi.spyOn(globalThis,'fetch')`: datos, `rows` vacío y fallo de red | **CUMPLE, y con margen** | Los tres casos exigidos están (`Hero.test.tsx:135`, `195`, `211`; `CTAFinal.test.tsx:80`, `113`, `125`) y además `500`, estado de carga y no-parpadeo. `Response` reales, `src/lib/api.ts` sin mockear (`docs/verification.md` §4) |

---

## 2. El fallback: juicio sobre la latitud concedida

**Punto de partida que cambia el marco de la discusión:** la latitud no fue solo
del líder. El propio `acceptance` 2 de la feature 36 dice, literalmente, «hay que
decidir y justificar en el informe **si se degrada a una sola imagen estática de
public/** o si el carrusel se oculta entero». Es decir: la opción elegida es
**una de las dos que el humano puso sobre la mesa**, con su justificación como
única condición. No estamos ante una excepción tomada por el implementer a una
regla del humano, sino ante la elección de una de dos ramas preautorizadas. Eso
mueve el listón: no hay que juzgar «¿podía?», sino «¿eligió bien y lo argumentó
honestamente?».

**Argumento 1 (una imagen vieja no engaña como un precio viejo): se sostiene.**
El fallback de la 35 no se decidió por razones de layout, se decidió por una
razón de verdad del dato: su acceptance dice «el criterio es no mostrar nunca
precios obsoletos como si fueran vigentes». Un precio es una afirmación
contractual; una captura de producto es material ilustrativo, y `/hero.png` es
además la misma imagen que hoy vive en la BD (verificado: `filename: hero.png`,
`size_bytes: 74388`, `id: 1`). Enseñarla no afirma nada falso. El principio de la
35 que **sí** trasladaba —no inventar datos de la API, no mezclar respaldo con
filas reales— se respeta: `Hero.tsx:149-154` es un `if/else` excluyente, jamás
concatena, y la mutación M7 del informe (respaldo sumado a las filas) la reproduje
como H3/H5 y sale en rojo.

**Argumento 2 (una sola estática hace que el modo degradado «se vea como tal»):
es el flojo, y conviene decirlo.** Un visitante no percibe «una imagen sin
flechas» como un modo degradado: no conoce la landing de ayer y no cuenta
diapositivas. El destinatario real de esa señal es el equipo, y el canal correcto
para enterarse de que la API está caída es monitorización, no la ausencia de dos
flechas en producción. Dicho eso, el argumento **tiene un efecto real que sí vale**
y que el informe expresa mal: borrar `HERO_SLIDES` elimina del componente el
mismo tipo de array hard-codeado que la 35 obligó a borrar de `Pricing`, y evita
que el carrusel siga «funcionando» de mentira cuando el cableado esté roto. Es un
argumento de mantenibilidad, no de percepción del visitante, y como tal es sólido.

**Contrapartida que el informe no contabiliza:** con la API caída, el visitante ve
hoy **una** captura donde antes veía tres. Es una degradación real de la ruta
crítica a cambio de un beneficio que solo percibe el equipo. Me parece un
intercambio razonable —el escenario es excepcional y la sección queda presentable—
pero es un coste, no un puro beneficio, y el informe lo presenta solo como lo
segundo. **Observación, no bloqueo.**

**Veredicto sobre el fallback: correcto y suficientemente justificado.** No es una
excepción cómoda: es la rama que el acceptance nombraba, con el argumento decisivo
(naturaleza del dato) bien traído y el secundario sobrevendido.

---

## 3. El Hero nunca queda roto: los cuatro escenarios

Recorridos uno a uno sobre el código y sobre los tests:

| Escenario | Qué se ve | Dónde se comprueba |
|---|---|---|
| **Datos** (`rows` con 1..n filas) | una `<img>` por fila en el orden del backend, dentro del marco de siempre | `Hero.test.tsx:135-155` |
| **`rows: []`** | `/hero.png`, sin flechas ni puntos, y h1 + copy + CTA en pie | `Hero.test.tsx:195-209` (afirma `heading level 1` y el botón «Agenda un demo») |
| **4xx/5xx** | idéntico al anterior | `Hero.test.tsx:222-230` (500) |
| **Fallo de red** | idéntico | `Hero.test.tsx:211-220` (`fetch` rechaza con `TypeError`) |

- **Sin hueco vacío permanente:** imposible llegar a `slides.length === 0` una vez
  resuelta la petición (`Hero.tsx:149-154`: la rama `else` siempre devuelve
  `[HERO_RESPALDO]`). Mutación H3 (`: []`) → **ROJO, 3 tests**.
- **Sin icono de imagen partida:** mientras carga **no se monta ninguna `<img>`**
  (`Hero.tsx:150`), y el navegador no puede pintar el glifo de imagen rota sobre
  un elemento que no existe. `Hero.test.tsx:243` lo afirma.
- **Sin salto de layout:** el marco (`Hero.tsx:230-247`) ya traía
  `aspectRatio: '1381 / 677'` y **no** está condicionado a nada, así que se monta
  en el primer render y no se desmonta nunca. `Hero.test.tsx:245` lee el
  `aspect-ratio` computado antes de la respuesta y `:253` comprueba que el nodo
  es **el mismo objeto** después: no hay remonte.
- **Sin parpadeo respaldo → API:** `Hero.test.tsx:256-265` usa un
  `MutationObserver` sobre `document.body` que anota el `src` de toda `<img>` que
  llegue a montarse, y exige que `/hero.png` **nunca** aparezca cuando hay datos.
  Mutación H5 (pintar el respaldo también en `loading`) → **ROJO, 2 tests**.
- **El titular, el copy y el CTA no dependen de la API** en ningún camino: están
  fuera del bloque de imagen (`Hero.tsx:186-211`) y ninguna rama devuelve `null`.
  Mutación «el Hero se oculta mientras carga» (M10 del informe) la reproduje como
  H3/H5 con el mismo resultado rojo.
- **Regresión ajena descartada:** `src/__tests__/AppRoutes.test.tsx:51` y
  `src/pages/__tests__/NotFound.test.tsx:40-41` montan la ruta `/` completa y ya
  devolvían `{ rows: [] }` por defecto, así que hoy ejercitan el camino de
  respaldo y siguen verdes **sin haber sido tocados**. Ver §7.

---

## 4. Dos matices sobre el estado de carga (observaciones, no bloqueo)

**4.1. Tensión interna del propio argumento.** `impl_36.md` §1.1 rechaza reservar
el hueco vacío diciendo que «un marco con borde, sombra y fondo, y nada dentro, es
literalmente el hueco roto del enunciado»… y eso es exactamente lo que se pinta
mientras la petición está en vuelo (`Hero.tsx:236-247`, `bgcolor: 'surface.soft'`
+ `border` + `boxShadow`, sin hijos). La distinción que salva el diseño es
**transitorio vs permanente**, y es válida, pero el informe no la enuncia.

**4.2. Y esa distinción se rompe con el backend dormido.** Es la observación que
quiero que llegue al humano. La cadena es ahora HTML → JS → `GET /api/images` →
`GET /api/images/:id/raw`. Si el servicio de Render está frío —escenario que el
propio humano puso por escrito en la descripción de la feature 35: «o el servicio
de Render esté dormido»— la primera petición puede tardar **decenas de segundos**,
y durante todo ese tiempo el primer viewport de la landing enseña **un marco de
~540 px de alto completamente vacío**. El caso «transitorio» se vuelve, de hecho,
el caso permanente que el implementer rechazó. No incumple ningún acceptance (la
sección sigue entera, no hay salto ni icono partido) y la alternativa obvia
—pintar el estático desde el primer render— es justo el parpadeo que la 35
prohibió en su acceptance 3, así que **la decisión es defendible**. Pero la
mitigación es barata y no está: un `timeout` corto (2-3 s) tras el cual el estado
pasa a `error` y cae al respaldo, o un placeholder con la propia `/hero.png`
difuminada. **Sugerido como feature propia, no como cambio en esta.**

**4.3. LCP.** El informe lo documenta bien (§Rendimiento.3) y no lo maquilla: el
Hero deja de salir del CDN de Vercel y pasa a depender de dos viajes en serie
contra el servidor de aplicación. Confirmo además que `index.html` **no** tenía
ningún `<link rel="preload">` de `/hero.png`, así que no se ha perdido un preload
existente. Queda como riesgo declarado.

---

## 5. Construcción del `src`, `alt` y orden

- **`src`:** `imageRawUrl(id)` (`api.ts:463-465`) es el único constructor, y aplica
  `VITE_API_BASE` en un solo sitio. Verificado contra el backend real: el JSON de
  `GET /api/images` **no trae ningún campo `url`** (9 campos exactos), así que
  construirlo es obligado, no una preferencia. Mutación H6 (`/uploads/${filename}`)
  → **ROJO, 2 tests**.
- **`id` como string:** ni `Number()` ni `parseInt` en los componentes; las
  fixtures usan `'9007199254740993'` (por encima de `MAX_SAFE_INTEGER`) y el test
  exige la URL literal `…/9007199254740993/raw`, que es la aserción que reventaría
  con cualquier cast.
- **`alt`:** sale de la API y `null` → `alt=""` (decorativa, `conventions.md` §6).
  Mutaciones H7 y C5 (texto inventado) → **ROJO**.
- **Orden:** cero `sort`/`reverse`/`slice`. Mutación H2 (invertir) → **ROJO**;
  C1 (última fila en vez de la primera) → **ROJO**. El filtro va al servidor:
  mutación H8 (`listImages()` sin `seccion`) → **ROJO**, y C4 (CTAFinal pidiendo
  `seccion: 'hero'`) → **ROJO**.
- **`CTAFinal` pinta `imagenes[0]`** (`CTAFinal.tsx:59`), que es la primera del
  orden del backend, no la de `id` menor: `CTAFinal.test.tsx:92-101` lo blinda con
  la fixture invertida por `id`. Correcto: la sección tiene un solo hueco.

---

## 6. La medición de rendimiento: la contrasté, y es correcta

No me fié del informe. Repetí las mediciones contra `http://localhost:3002`:

```
GET /api/images                     → 4 filas: 3 en `hero` (ids 1,2,3) + 1 en `cta_final` (id 4)
size_bytes                          → 74 388 + 93 889 + 76 613 + 311 211 = 556 101 B
curl -D- /api/images/1/raw          → Content-Type, Content-Length, X-Content-Type-Options
                                      SIN Cache-Control, SIN ETag, SIN Last-Modified
/api/images/4/raw (311 KB) ×3       → 9,0 / 8,7 / 13,2 ms
/api/images?seccion=hero            → 3,6 ms, 780 B
```

- **La cifra de ≈556 KB es exacta, no redondeada a ojo:** son los `size_bytes` de
  las cuatro filas sumados (556 101 B). Y es la cifra correcta para «por carga de
  landing», porque el Hero **monta las tres `<img>` a la vez** (las inactivas van
  con `opacity: 0`, `Hero.tsx:260`), así que las tres se descargan aunque solo se
  vea una. El implementer no infló ni desinfló el número.
- **La ausencia de cabeceras de caché es verdad**, verificada con `curl -D-` por mi
  cuenta: ni `Cache-Control`, ni `ETag`, ni `Last-Modified`. La conclusión
  («cada carga y cada recarga se lleva los 556 KB») se sigue de ahí.
- **Los tiempos son del mismo orden** que los reportados (2-9 ms él, 3-13 ms yo,
  con la máquina cargada por la suite de mutación). Nada sospechoso.
- **El dato «el backend ya tiene imágenes» es cierto y corrige la doc:** son los
  cuatro PNG de `public/` subidos por el panel. `docs/api-contract.md` §10.4 se
  actualizó en el mismo cambio (C6).
- **Y no se inventó ninguna caché:** `grep localStorage|sessionStorage|Cache` en
  los dos componentes → 0; no hay `useMemo` de datos, ni módulo con estado, ni
  `staleTime` de ningún tipo. Cada montaje hace exactamente **una** petición
  (`toHaveBeenCalledTimes(1)` en ambos tests). La recomendación
  (`Cache-Control: public, max-age=31536000, immutable` + `ETag`) queda en prosa,
  dirigida al backend, en `api-contract.md` §4 ter y en `impl_36.md`. Es además
  técnicamente correcta: el binario es inmutable por `id` (el `PATCH` solo toca
  `alt`, `orden` y `seccion`), así que `immutable` no puede servir contenido viejo.

**Conclusión: medición creíble, bien obtenida y bien usada. Acceptance 5 cumplido
en su letra («documentarlo en vez de inventar una caché») y en su espíritu.**

---

## 7. Archivos fuera de la lista: ninguno

`git show --stat 7e9c200` → exactamente 6 archivos: los 4 de código, `api-contract.md`
y `progress/impl_36.md`. **No se repitió el caso `brandAlpha.test.tsx` de la 35**, y
lo verifiqué yo, no por el informe:

- Los únicos tests previos que montan estos componentes son
  `src/__tests__/AppRoutes.test.tsx` (ruta `/` completa) y
  `src/pages/__tests__/NotFound.test.tsx`. Ambos ya interceptaban `fetch` con un
  `{ rows: [] }` por defecto (`AppRoutes.test.tsx:51`, `NotFound.test.tsx:40-41`),
  así que el Hero cae al respaldo y el único aserto que hacen sobre él —el `<h1>`—
  sigue siendo cierto. Ninguno afirma un conteo estricto de llamadas a `fetch`
  (`AppRoutes.test.tsx:108` usa `.some()`), así que las peticiones nuevas no los
  rompen.
- `src/admin/__tests__/ImagesGrid.test.tsx` y `src/pages/__tests__/BlogIndex.test.tsx`
  aparecen en un `grep hero` pero por otras cadenas; no montan estos componentes.
- Los 20 archivos de test pasan sin tocar ninguno. **Esta es la diferencia
  práctica del fallback elegido**: una sección que nunca desaparece no arrastra a
  quien la renderice, al revés que la 35.
- `src/lib/api.ts` **no** se tocó pese a estar en el `files` de la feature: los
  helpers de la 33 bastaban. Es lo correcto, no una omisión.

---

## 8. Los tests nuevos: los muté yo, uno a uno

14 mutaciones, cada una aplicada **sola** sobre el componente, corriendo **una
sola suite a la vez** y **revirtiendo desde copia antes de la siguiente** (script
con `finally` que restaura pase lo que pase). Árbol restaurado y comprobado al
final: `git diff 7e9c200 -- src/components/sections/` → **vacío**.

| # | Mutación | Resultado |
|---|---|---|
| H1 | Hero ordena por `id` en cliente (`[...imagenes].sort(…)`) | **VERDE — no discrimina** (§8.1) |
| H2 | Hero invierte el orden | ROJO (1) |
| H3 | Hero sin respaldo: `rows: []` deja el marco vacío | ROJO (3) |
| H4 | Hero pinta controles con una sola imagen (`total > 0`) | ROJO (2) |
| H5 | Hero pinta el respaldo también mientras carga (flip) | ROJO (2) |
| H6 | Hero construye el `src` con un campo inventado | ROJO (2) |
| H7 | Hero inventa un `alt` cuando la API manda `null` | ROJO (1) |
| H8 | Hero pide el listado completo, sin `?seccion=` | ROJO (1) |
| C1 | CTAFinal usa la **última** fila | ROJO (1) |
| C2 | CTAFinal sin respaldo | ROJO (3) |
| C3 | CTAFinal pierde la reserva de proporción | ROJO (1) |
| C4 | CTAFinal pide `seccion: 'hero'` | ROJO (1) |
| C5 | CTAFinal inventa `alt` | ROJO (1) |
| C6 | CTAFinal pinta el respaldo mientras carga | ROJO (2) |

**13 de 14 discriminan.** Las 15 mutaciones que declara `impl_36.md` son
consistentes con lo que observé; ninguna afirmación del informe resultó falsa.

### 8.1. La única fixture que no discrimina — `Hero.test.tsx:40-46`

Los tres `id` de la fixture del Hero (`'4'`, `'7'`, `'9007199254740993'`) están en
orden ascendente y coinciden con el orden de `orden` (1, 2, 3). Consecuencia: si
alguien metiese un `sort` por `id` en cliente en `Hero.tsx:153`, **la suite
seguiría verde** (mutación H1, comprobado). El test detecta cualquier reordenación
que cambie la secuencia (H2 → rojo), pero no la clase concreta de bug que el
acceptance 4 nombra.

- **Por qué no lo bloqueo:** el acceptance 4 sí tiene verificación discriminante en
  la otra mitad de la feature —`CTAFinal.test.tsx:28-29` pone a propósito un `id`
  mayor en la primera fila, y C1 sale en rojo—, el componente no contiene ningún
  `sort`, y el daño real de ordenar por `id` solo aparece cuando `orden` y `id`
  divergen. Es una laguna de fixture, no de comportamiento.
- **Arreglo de una línea, para quien toque el archivo:** dar a `SEGUNDA` un `id`
  menor que el de `PRIMERA` (p. ej. `id: '2'` con `orden: 2`), como ya hace
  `CTAFinal.test.tsx`. **No lo pido como condición de aprobación.**

### 8.2. Lo que sí está bien resuelto en los tests

- `Response` reales, `src/lib/api.ts` sin mockear, `restoreAllMocks()` en
  `afterEach` (`Hero.test.tsx:113-117`, `CTAFinal.test.tsx:62-64`), y los
  `MutationObserver` se desconectan (`:114`) — sin fugas entre casos.
- El helper `esperarResolucion()` (`Hero.test.tsx:75-78`) resuelve bien el problema
  real de los casos de fallo, donde no aparece nada nuevo a lo que agarrarse con un
  `findBy`.
- El `IntersectionObserver` y Vanta se apagan con el mismo apaño que ya usaba
  `AppRoutes.test.tsx`: no se inventa una convención nueva.
- El caso «una sola imagen no tiene flechas ni puntos» (`Hero.test.tsx:182-191`)
  es el que pedía el líder y **discrimina** (H4 → rojo). En el código, además, el
  `setInterval` tampoco se arma con `total <= 1` (`Hero.tsx:162`), así que no queda
  un temporizador girando sobre una sola diapositiva.

---

## 9. Fronteras y convenciones

- **`docs/architecture.md`:** cero `fetch` fuera de `src/lib/api.ts`; ningún state
  manager global nuevo (dos `useState` locales por componente); ninguna librería de
  data fetching; el tipo de la API se **importa** (`AdminImage`), no se duplica.
  Los `interface Slide` / `interface Imagen` locales son modelos de vista
  (`{ key, src, alt }`), no copias del tipo de la API: no aplica `Pick<>`.
- **`docs/conventions.md`:** §1 ubicación y nombres correctos (`__tests__/` hermano);
  §2 sin `any`, sin variables muertas (el build lo garantiza con `noUnusedLocals`);
  §3 sin hex hardcodeados —el `0xE8440A` de Vanta (`Hero.tsx:105-106`) es
  preexistente y ajeno a esta feature—; §5 máquina de estados
  `'loading' | 'ok' | 'error'`, no un booleano; §6 `alt=""` solo para decorativas y
  controles con nombre accesible; §7 sin residuos.
- **`data-testid="cta-imagen"`** (`CTAFinal.tsx:104`) tiene precedente amplio en el
  repo (`PlanEditDialog.tsx:239`, `ImagesGrid.tsx:333`, `LeadsList.tsx:130`…) y
  cuelga de un contenedor no interactivo, así que no hay rol accesible que usar.
- **`role="group"` + `aria-label`** añadidos al marco del Hero (`Hero.tsx:232-233`):
  cambio mínimo, dentro del alcance y con sentido propio (agrupa las capturas).
- **CTAFinal, cambio visual real y controlado:** el `<img>` pasa de `height: 'auto'`
  + `objectFit: 'fill'` a un contenedor con `aspectRatio: '408 / 612'` y la imagen
  en `contain`. Con `/maia.png` (408×612) el render es idéntico al de hoy —340 px
  de ancho ⇒ 510 px de alto en ambos casos— y el `borderRadius: 20` se conserva con
  `overflow: 'hidden'`. Con una imagen de otra proporción se ajusta dentro en vez
  de mover el CTA. Mutación C3 → rojo.

---

## Checkpoints

- **C1** [x] `npm test` exit 0: **20 archivos / 194 tests**, ningún test previo roto ni modificado (verificado con `git show --stat`).
- **C2** [x] Cada acceptance tiene su verificación (§1). El 5 (rendimiento) es de los que la tabla de `docs/verification.md` §5 no obliga a testear, y aun así tiene aserción indirecta: una sola llamada por montaje. Salvedad de fixture en §8.1, no bloqueante.
- **C3** [x] `npm run typecheck` exit 0 y `npm run build` exit 0; solo el aviso de chunk >500 kB.
- **C4** [x] `conventions.md` §1, §2, §3, §5, §6 y §7 respetadas (§9).
- **C5** [x] Cero `fetch` fuera de `src/lib/api.ts`; sin state manager ni librería de fetching nueva; tipos importados, no duplicados.
- **C6** [x] `GET /api/images?seccion=` ya estaba en `docs/api-contract.md` §4 ter desde la 33; la feature añadió la subsección de consumidores de la landing y corrigió §10.4 («tablas vacías» ya no vale para imágenes) en el mismo commit.
- **C7** [x] `feature_list.json` sigue en `pending`, que es el estado real hasta este veredicto; la bitácora vive en `progress/impl_36.md` porque el líder acotó al implementer. **Con la salvedad de §Notas 1**: `progress/current.md` está dos features por detrás.
- **C8** [x] Ningún `.env*` leído ni escrito; ninguna variable de entorno nueva (`VITE_API_BASE` ya existía y no aparece su valor en ningún sitio).
- **C9** [x] Sin `console.log`, sin código comentado nuevo, sin `TODO` huérfanos, sin `.orig`/`.bak`. `git status` solo con `tsconfig.tsbuildinfo` (deuda preexistente).
- **C10** [x] Una sola feature. No se arregló de paso el drift documental que el propio informe levanta, ni se tocaron `public/`, `Pricing.tsx` ni el admin.
- **C11** [x] `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` y `.gitignore` intactos.

**Ningún `[ ]`. Ninguno en C1, C2, C3 ni C8.**

---

## Detalle de los fallos

Ninguno bloqueante. Las observaciones, ordenadas por importancia, con archivo y línea:

1. `src/components/sections/Hero.tsx:236-247` — **el marco vacío durante la carga
   se vuelve el caso permanente si el backend está frío** (Render dormido). No
   incumple el acceptance 2 y la alternativa obvia reintroduce el parpadeo que
   prohibió la 35, pero la mitigación (timeout corto → respaldo) es barata y no
   está. **Feature propia; decisión del humano.** (§4.2)
2. `src/components/sections/__tests__/Hero.test.tsx:40-46` — la fixture de orden no
   discrimina un `sort` por `id` en cliente (mutación H1 en verde). Arreglo de una
   línea: dar a `SEGUNDA` un `id` menor que el de `PRIMERA`. (§8.1)
3. `progress/impl_36.md` §2 — el argumento «una sola estática hace que el modo
   degradado se vea como tal» está sobrevendido: el visitante no percibe esa señal.
   El beneficio real es de mantenibilidad (matar el array hard-codeado), y la
   contrapartida —tres capturas pasan a una en la ruta crítica— no se contabiliza.
   No cambia la decisión, que era una de las dos ramas del propio acceptance. (§2)
4. `public/hero-2.png` y `public/hero-3.png` quedan **sin referenciar desde `src/`**
   pero siguen viajando a `dist/` (Vite copia `public/` tal cual): ~170 KB muertos
   en cada despliegue. El implementer hizo bien en no borrarlos (fuera de su lista).
   Limpieza aparte.
5. `progress/current.md` — sigue anunciando el baseline `18 / 159` (feature 34) y no
   menciona ni la 35 ni la 36. No es responsabilidad del implementer (el líder le
   prohibió tocarlo), pero **hay que ponerlo al día al cerrar**: el real es
   **20 / 194**. Mismo drift que `docs/verification.md` §1-§2 y
   `docs/architecture.md` §5, §8 y §9, levantado ya por sexta vez consecutiva:
   **ya es candidato claro a feature propia**, no a nota al pie.
6. Sin `onError` en las `<img>` (`Hero.tsx:248-264`, `CTAFinal.tsx:114-121`): si el
   listado responde 200 pero el binario de un `id` da 404 —imagen borrada por el
   panel entre el listado y la descarga— sí saldría el glifo de imagen partida. Es
   una carrera estrecha y ninguno de los cuatro escenarios del encargo la cubre;
   la anoto por completitud, no como fallo.

## Recomendación de cierre

**APROBADO.** Antes de marcar la 36 como `done` queda pendiente lo único que el
implementer declara no haber hecho y no podía hacer: la **pasada visual a 360 px y
1440 px** con `npm run dev` (`docs/verification.md` §6), que ahora **sí es
significativa** porque el backend tiene las cuatro imágenes cargadas (lo verifiqué
yo contra `:3002`). Mirar en concreto que el marco del Hero no parpadee al llegar
la respuesta y que el CTA no cambie de alto.
