# Sesión actual

> Plantilla viva. Se rellena **mientras** trabajas, no al final.
> Al cerrar sesión: mueve el bloque completo al final de `progress/history.md` y
> deja este archivo con la plantilla vacía de abajo.

---

## Estado

**Feature en curso:** —
**Estado:** sin sesión abierta
**Inicio:** —
**Rama:** —

## Plan

- (3-5 bullets al tomar la feature)

## Bitácora

- (se rellena mientras trabajas, no al final)

## Verificación

| Comando | Resultado |
|---------|-----------|
| `npm test` | — |
| `npm run typecheck` | — |
| `npm run build` | — |

## Bloqueos

- Ninguno.

## Observaciones fuera de scope (NO tocadas, C10)

- (deuda vista al lado que NO se arregla en esta feature)

## Variables de entorno necesarias

- Ninguna.

## Pendiente para la siguiente sesión

> **El cableado del front contra la API está COMPLETO.** Los tres CRUD del admin
> (32 usuarios, 33 imágenes, 34 precios) y las dos secciones de la landing (35
> precios, 36 Hero + CTA final) están cerradas como `done`. **`feature_list.json`
> no tiene ninguna feature en `pending`, `in_progress` ni `blocked`: 20 de 20 en
> `done`.** Lo que sigue vivo es lo de abajo, y **nada de ello es una feature
> tomada: todo requiere que lo pida un humano.**

- **Feature 35 cerrada como `done`, APROBADA** (`progress/review_35.md`),
  commiteada en `feat/admin-cruds` (`3332924`). El revisor buscó respaldo
  hard-codeado en **las cuatro formas posibles** (constante en el componente, valor
  por defecto del `useState`, mock importado en producción y rastro en el resto de
  `src/`) y verificó con la **mutación M10** que reintroducirlo sale en **rojo, 4
  tests**. Resumen completo en `progress/history.md`.
- **Feature 36 cerrada como `done`, APROBADA** (`progress/review_36.md`),
  commiteada en `feat/admin-cruds` (`7e9c200`). El revisor **contrastó la medición
  de rendimiento contra el servidor real** (556 101 B exactos sumando `size_bytes`,
  y `curl -D-` confirmando que no hay `Cache-Control` ni `ETag`) y aplicó **14
  mutaciones**. Resumen completo en `progress/history.md`.

### Los dos hallazgos de la review de la 36, SIN ARREGLAR

1. **`src/components/sections/Hero.tsx:236-247` — el marco vacío del estado de
   carga se vuelve PERMANENTE si el backend de Render está dormido.** Es el
   hallazgo más importante que deja esta tanda y está en la **ruta crítica**: la
   cadena pasó a ser HTML → JS → `GET /api/images` → binario, así que con el
   servicio frío **un visitante puede ver un hueco vacío de ~540 px en el
   encabezado durante decenas de segundos** mientras el servicio despierta. No
   incumple ningún acceptance —la sección sigue entera, sin salto ni icono
   partido— y la alternativa obvia (pintar el estático desde el primer render) es
   justo el parpadeo que prohibió la 35. **Mitigación barata y no implementada:**
   `timeout` corto (2-3 s) tras el cual el estado pasa a `error` y cae al respaldo,
   o un placeholder con `/hero.png` difuminada. **Feature propia; decisión del
   humano.** (`review_36.md` §4.2 y hallazgo 1.)
2. **`src/components/sections/__tests__/Hero.test.tsx:40-46` no discrimina.** De las
   14 mutaciones del revisor, **13 salieron rojas** y la que no —**H1: ordenar por
   `id` en cliente**— quedó **verde**, porque los tres `id` de la fixture están en
   orden ascendente y coinciden con `orden`. El acceptance 4 sí tiene verificación
   discriminante en la otra mitad de la feature (`CTAFinal.test.tsx:28-29` pone a
   propósito un `id` mayor en la primera fila) y el componente no contiene ningún
   `sort`: es laguna de **fixture**, no de comportamiento. **Arreglo de una línea:**
   dar a `SEGUNDA` un `id` menor que el de `PRIMERA`. (`review_36.md` §8.1.)

### Antes de desplegar: hay que cargar datos por el panel

- **Las tablas del backend siguen vacías en lo que importa, y con el fallback
  decidido por el humano eso significa una landing SIN SECCIÓN DE PRECIOS.**
  `GET /api/precios` responde `{"rows":[]}`, y el acceptance 2 de la 35 manda **no
  renderizar la sección** en ese caso: desplegar hoy dejaría la landing sin precios
  y con los enlaces `#pricing` de `Navbar.tsx:10` y `Footer.tsx:8` sin destino.
  **Hay que cargar los planes por el panel —que ya funciona— antes de desplegar.**
- **Matiz medido, no supuesto:** en las imágenes ya se dio ese paso. El
  implementer y el revisor de la 36 comprobaron contra `:3002` que `GET /api/images`
  devuelve **4 filas** (3 en `hero`, 1 en `cta_final`), los cuatro PNG de `public/`
  subidos desde el panel. O sea: **imágenes cargadas, precios NO**. Conviene
  repetir la comprobación contra el entorno que se vaya a desplegar, que no tiene
  por qué coincidir con el local.
- **Verificación visual pendiente y ahora sí significativa** (`verification.md` §6):
  pasada a 360 px y 1440 px, mirando que el marco del Hero no parpadee al llegar la
  respuesta, que el CTA no cambie de alto, y —en cuanto haya planes— la rejilla de
  precios con 1, 2 y 3 planes (`Pricing.tsx:109-115`), que es código nuevo que
  ningún test mide en píxeles.

### Coste medido y no resuelto: es del equipo de BACKEND

- **`GET /api/images/:id/raw` sirve el binario desde Postgres sin `Cache-Control`
  ni `ETag`: ≈556 KB (556 101 B exactos) por carga de landing**, y también por cada
  recarga, donde antes `public/` iba por el CDN de Vercel con hash y caché
  inmutable. Además el LCP gana dos viajes en serie contra el servidor de
  aplicación. **La recomendación —`Cache-Control: public, max-age=31536000,
  immutable` + `ETag`, segura porque el binario es inmutable por `id` (el `PATCH`
  solo toca `alt`, `orden` y `seccion`)— es PARA EL EQUIPO DE BACKEND. El front no
  inventa caché**, y deliberadamente no la inventó: `grep
  localStorage|sessionStorage|Cache` en los dos componentes → 0.

### Observaciones menores heredadas y sin arreglar

- **`getAdminUser` sigue sin consumidor ni test** (feature 32): lo pedía su
  acceptance y respeta el patrón de `getAdminArticle`, pero no lo llama nadie.
  `getAdminPlan` tampoco tiene consumidor en la UI, pero **sí tiene test directo**
  desde la 34, así que el hueco vivo es solo el de `getAdminUser`.
- **El error del listado de usuarios no tiene `role="alert"`**
  (`UsersList.tsx:118`): un lector de pantalla no se entera del `409` del último
  admin. Las features 33 y 34 lo arreglaron **en sus propios archivos**;
  `UsersList.tsx` y `LeadsList.tsx` siguen con el patrón viejo.
- **`FIELD_BY_BACKEND` ya tiene test propio desde la 34** (el caso del
  `422 { field: 'es_custom' }`), que cerró la observación 2 de `review_33.md` **en
  la pantalla de precios**. En imágenes (`ImagesGrid`/`ImageUploadDialog`) ningún
  test distingue todavía la tabla de un cast crudo: sigue abierto.
- **El flake de la suite bajo carga de CPU sigue siendo deuda de infraestructura.**
  Alcanza a cualquier test pesado de MUI + `userEvent` (`AppRoutes`, `ContactModal`,
  `PricesList`), con `testTimeout` de 15 s. Regla práctica: **nunca correr dos
  suites a la vez** y, si sale un rojo, **repetirlo aislado antes de reportarlo**.
  Tocar la configuración de tests **requiere que lo pida un humano**; no se
  manifestó en las reviews de la 35 ni la 36 ni en este cierre.
- **Otros hallazgos vivos de las dos features cerradas** (detalle en las entradas
  de `progress/history.md`): los enlaces `#pricing` sin destino, el `key={v}` con el
  texto de la viñeta en `Pricing.tsx:172,175`, la ausencia de `ErrorBoundary` en
  `main.tsx` (una fila con `vinetas: null` se llevaría toda la landing), las `<img>`
  sin `onError`, y `public/hero-2.png` / `hero-3.png` sin referenciar pero viajando
  a `dist/` (~170 KB por despliegue).
- **Drift documental, sexto cierre consecutivo, ya candidato claro a feature
  propia** (ninguna review lo cuenta como fallo porque C6 solo exige
  `api-contract.md`): `docs/verification.md` §1-§2 y `docs/architecture.md` §8
  siguen anunciando `15 archivos / 86 tests` cuando el real es **20 / 194**;
  `docs/architecture.md` §5 no lista `/api/precios`, `/api/admin/precios`,
  `/api/admin/users`, `/api/images` ni `/api/admin/images`, y su §9 (y la línea 9)
  siguen diciendo que usuarios, imágenes y precios están «en maquetación con datos
  mock». **En este cierre no se tocó `docs/` por indicación expresa.**
- El resto de pendientes vivos (copy obsoleto de `AdminHome.tsx`, arnés de
  suspensión H2, `tsconfig.tsbuildinfo` trackeado pese a estar en `.gitignore`,
  preexistentes H1-H3 de la feature 24, lagunas de cobertura aceptadas de la 29,
  `ImagePatchInput` sin derivar de `AdminImage`, la asimetría cosmética del diálogo
  de un plan Custom, el `Omit` que bloquea el literal pero no el *spread*,
  `loading` como booleano en las cuatro pantallas del admin, y las observaciones de
  `review_30.md` §9 y `review_31.md` §9) quedan registrados al final de
  `progress/history.md`, en las entradas de las features 27-36.

---

## Último baseline verde conocido

`2026-07-31` (features 35 y 36 cerradas, `APROBADO` en `progress/review_35.md` y
`progress/review_36.md`) — `npm test` **20 archivos / 194 tests** · exit 0 ·
`npm run typecheck` exit 0 · `npm run build` exit 0 (aviso esperado de chunk
>500 kB).

> Sobre esa cifra: el recorrido fue `18 / 159` → **`18 / 176`** (feature 35: +17
> netos, 22 casos nuevos − 5 anteriores, **0 archivos nuevos** porque
> `Pricing.test.tsx` se reescribió) → **`20 / 194`** (feature 36: +18 netos y **2
> archivos nuevos**, `Hero.test.tsx` y `CTAFinal.test.tsx`). **Ningún test previo
> roto** en ninguna de las dos. Medido tres veces en cada feature: implementer,
> revisor y este cierre; sin un solo flake y corriendo una sola suite a la vez.
>
> Las cinco features del cableado están commiteadas (`ba232e7`, `af2613e`,
> `027d510`, `3332924` y `7e9c200`) y **el árbol no tiene features en vuelo**:
> `git status` solo muestra `tsconfig.tsbuildinfo`, artefacto trackeado que toca
> cualquier `typecheck` (deuda preexistente, ya registrada).
