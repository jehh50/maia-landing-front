# Feature 24 — Verificación visual del backlog 17-23 a 360 y 1440 px

**Fecha:** 2026-07-28 · **Estado:** 2.ª pasada, **pendiente de re-review** (NO marcada `done`)
**Rama:** `main`, sin commits · **Archivos de `src/` modificados: ninguno** (esta feature no escribe código de la app)

> **Este informe es la corrección del `CHANGES_REQUESTED` de `progress/review_24.md`.**
> El reviewer rechazó la 1.ª pasada por **alcance sobredeclarado**, no por la
> conclusión. Los cinco fallos (F1-F5) se cierran aquí y cada corrección está
> marcada con `[F#]`. Lo que la 1.ª pasada afirmaba de más queda **retirado
> explícitamente**, no reescrito en silencio: §9 lleva la lista de lo que se
> declaró mal y de lo que ahora se declara.
>
> Toda la evidencia de esta 2.ª pasada la produje y la miré yo, con servidores
> propios (`:5178` para el código base, proxies `:8993`-`:8998`). Las capturas de
> la 1.ª pasada y las del reviewer se citan como tales cuando se citan.

---

## 1. Resumen ejecutivo

Las tres features cuyo criterio visual quedó sin comprobar (17, 22, 23) **están
cumplidas**. La afirmación fuerte, ahora con su alcance bien declarado:

> Las renderizaciones actuales de `/`, `/blog`, `/privacidad` y `/admin/login`, a
> 360 px y a 1440 px, **capturadas de arriba abajo a página completa**, son
> idénticas píxel a píxel a las del código previo al backlog (`HEAD`, sin 17-23).
> `ImageChops.difference` devuelve `bbox=None` en los **8 pares completos**:
> cero píxeles distintos. Con una salvedad medida, no supuesta: **el canvas de
> Vanta del héroe no llega al PNG** y por tanto esa capa queda fuera de la
> comparación (§5).

Y el trozo del acceptance 2 que la 1.ª pasada declaró no verificable **sí lo era**
y queda verificado con imagen: durante la navegación interna del panel admin, el
sidebar es **idéntico píxel a píxel** al estado final mientras carga el chunk hijo
(§4, `bbox=None` sobre la franja del sidebar en los dos anchos).

**Hallazgos: 2, ambos de severidad baja y ambos preexistentes** (aparecen igual en
el render de `HEAD`, luego no son regresiones de 17/22/23). No se corrigen aquí:
son candidatos a feature nueva. Detalle en §7.

---

## 2. Cómo se verificó (y dos trampas que conviene documentar)

### 2.1. La receta base

```bash
timeout 200 firefox --headless --screenshot="/ruta/ABSOLUTA/x.png" \
  --window-size=ANCHO,ALTO "http://localhost:PUERTO/ruta"
```

Dev server del líder en `http://localhost:5175` (200 OK) y backend en `:3002`
(`GET /api/articles` → 200): blog y admin se vieron con datos reales, no en
estado de error. El proceso ajeno de `:5174` no se tocó (sigue vivo, pid 205452).

### 2.2. Trampa 1: las capturas directas mienten sobre el color

Las primeras capturas de la 1.ª pasada mostraban el CTA del héroe en salmón
pálido, las métricas casi invisibles y la tarjeta del `CTAFinal` en `#E5754E` en
vez de naranja de marca. **Parecía exactamente una regresión de color.** No lo
era: Firefox captura justo tras el evento `load`, y ahí las animaciones de
entrada siguen corriendo (`.fade-up` = `animation: fadeUp 0.6s ease both` con
retardos escalonados, `src/styles/globals.css:52-70`). La pista definitiva fueron
los contadores del héroe: `26+ / 0.3M / 18%` en una captura y `48+ / 0.5M / 32%`
en otra — un *count-up* fotografiado a medias.

El reviewer auditó este episodio de forma independiente y lo confirmó: el diff
entre la captura sin harness y la asentada da **311 321 px** distintos dentro de
`bbox=(127,130,1313,1581)`, justo la banda del badge, el CTA, los contadores y el
dashboard; los contadores pasan de `48+ / 0.5M / 32% / 1.2×` a
`100+ / 1.0M / 68% / 2.5×`. **Reportar aquello como regresión habría sido
inventarse un defecto.** Queda escrito porque es el modo de fallo natural de esta
técnica.

### 2.3. Trampa 2: el canvas de Vanta no llega al PNG **[F3]**

Medido, no supuesto — ver §5. Toda la verificación de color de este informe
excluye esa capa.

### 2.4. El harness: retrasar el evento `load`

Firefox headless no tiene flag de retardo. El harness es un proxy que reenvía
todo al dev server e inyecta en el HTML un `<img>` de 1×1 px que tarda N segundos
en responder, de modo que `load` (y con él la captura) ocurre con las animaciones
ya asentadas. El documento sigue siendo **de nivel superior**: mismo viewport,
mismo `IntersectionObserver`. Lo único que se inyecta es ese `<img>`
(`opacity:0`, `position:fixed`, `pointer-events:none`); no toca CSS, ni clases,
ni atributos.

La vía del `<iframe>` se probó en la 1.ª pasada y **se descartó**: introducía
artefactos propios (carrusel del héroe ausente, contadores clavados en 0,
secciones sin revelar). `settled-landing-1440.png` queda como descarte, no como
evidencia.

Scripts, todos en el scratchpad y **fuera del repo**:

| Script | Para qué |
|---|---|
| `delay_proxy.py` | retardo de `load`, retardo selectivo de un módulo (`SLOW_MATCH`), sonda de overflow (`PROBE=1`). **Docstring corregido en esta pasada [F3]**: ahora declara las tres limitaciones reales (Vanta ausente, solo `do_GET`, no reenvía `Cookie`). |
| `rv_admin.py` | arnés del admin: stub de `GET /api/auth/me`, retardo del chunk hijo y click inyectado (§4). |
| `rv_probe.py` | imprime `scrollHeight` / `clientHeight` en la propia página (§3.2). |
| `i2_vanta_probe.py` | cuenta `<canvas>` y consulta el contexto WebGL (§5). |
| `i2_admin_probe.py` | `rv_admin.py` + sonda de `scrollWidth`, para medir el desbordamiento del panel a 360 px (nota de §4). |
| `i2_full_diff.sh`, `i2_admin.sh`, `i2_probe_heights.sh`, `i2_measure.py` | los drivers de esta 2.ª pasada. |
| `wrap_server.py` | la vía del iframe, **descartada**. |

---

## 3. Tabla de veredictos: ruta × ancho

| Ruta | 360 px | 1440 px | Qué se ve |
|---|---|---|---|
| `/` (landing) | ✅ OK | ✅ OK | Render completo de **todas** las secciones (verificado a página completa, §3.2): héroe, carrusel del dashboard, `Pain`, "3 pasos", `Features`, `Integrations`, `Pricing`, `Addons`, `FAQ`, `CTAFinal` y `Footer`. Naranja de marca y verde en su sitio. **El fondo Vanta del héroe no aparece en la captura** (§5): esa capa no se juzga. |
| `/ruta-que-no-existe` (404) | ✅ OK | ✅ OK | Bloque "404" naranja + `h1` "Página no encontrada" + botón "Volver al inicio", centrado. Navbar arriba sin tapar nada, footer al fondo sin solaparse. |
| `/blog` | ✅ OK | ✅ OK | Contenido real (1 artículo, backend arriba). Etiqueta "BLOG" y "Leer artículo →" en naranja. **No** salió el `RouteFallback`. |
| `/admin/login` | ✅ OK | ✅ OK | Tarjeta "Acceso administradores" centrada sobre `surface.soft`, botón "Iniciar sesión" naranja. **No** salió el `RouteFallback`. |
| `/privacidad` (control) | ✅ OK | ✅ OK | Cabecera "LEGAL" naranja, selector ES/EN con píldora activa naranja, enlace de correo naranja, cuerpo legible. |
| `/admin`, `/admin/leads` (**sesión simulada**) | ✅ OK | ✅ OK | Panel completo con sidebar, "Bienvenido, …", "Cerrar sesión"; y la tabla de Leads tras navegar. Ver §4. |

> **[F3]** La 1.ª pasada escribía aquí *"héroe con Vanta"*. **Retirado**: es falso,
> ver §5.

**Extras capturados** (no exigidos por el acceptance): `/admin` sin sesión →
redirige a la tarjeta de login sin pantalla en blanco intermedia;
`/blog/como-ia-automatiza-proceso-de-venta` a 360 px → artículo con imagen,
título y markdown correctos.

### 3.1. Scroll horizontal a 360 px: medido, no estimado

Sonda que imprime `document.documentElement.scrollWidth` vs `clientWidth` en la
propia página, fotografiada (`crop-probe-*.png`):

| Ruta @360 | scrollWidth | clientWidth | overflowX |
|---|---|---|---|
| `/` | 360 | 360 | **NO** |
| `/ruta-que-no-existe` | 360 | 360 | **NO** |
| `/blog` | 360 | 360 | **NO** |
| `/admin/login` | 360 | 360 | **NO** |
| `/privacidad` | 360 | 360 | **NO** |

La sonda lista además elementos con `left < 0`: aparecen varios
`div.MuiGrid-root.MuiGrid-container` en `[-8..336]` y `[-16..336]`. Son los
márgenes negativos normales de `Grid` con `spacing`, compensados por el padding
del contenedor; no generan overflow, y así lo confirma `scrollWidth == clientWidth`.
En `/admin/login` la sonda no encuentra **ningún** elemento fuera del viewport.

### 3.2. Alto real de cada documento — el alcance que faltaba declarar **[F2]**

Medido con `rv_probe.py` **usando el mismo `--window-size` que la 1.ª pasada**,
para poder decir exactamente qué cubrían aquellos recortes:

| Ruta | `scrollHeight` real | Alto capturado en la 1.ª pasada | Cobertura |
|---|---|---|---|
| `/` @1440 | **8 644 px** | 2 600 px | **30,1 %** |
| `/` @360 | **14 303 px** | 2 600 px | **18,2 %** |
| `/privacidad` @1440 | **5 770 px** | 2 200 px | **38,1 %** |
| `/privacidad` @360 | **10 263 px** | 2 200 px | **21,4 %** |
| `/blog` @1440 | 2 200 px (doc ≤ viewport) | 2 200 px | 100 % |
| `/blog` @360 | 2 200 px | 2 200 px | 100 % |
| `/admin/login` @1440 | 2 200 px | 2 200 px | 100 % |
| `/admin/login` @360 | 2 200 px | 2 200 px | 100 % |

Es decir: **4 de los 8 pares de la 1.ª pasada eran recortes superiores**, no
páginas completas, y en la landing el recorte llegaba solo hasta `Pain`, dejando
fuera `Solution`, `Features`, `Integrations`, `Pricing`, `Addons`, `FAQ`,
`CTAFinal` y `Footer` — justo los archivos que tocó la migración de tokens de la
feature 23. La afirmación de la 1.ª pasada era correcta pero **la evidencia
entregada no la sostenía**. §6 sustituye esos 8 pares por diffs de página
completa.

---

## 4. Feature 22 — el sidebar del admin: SÍ era verificable **[F1]**

La 1.ª pasada declaró no verificable *"sin parpadeo del sidebar del admin al
moverse dentro del panel"* por dos razones. **Retiro las dos: eran falsas.**

- *"Requiere sesión iniciada — credenciales que no debo obtener"*. No requiere
  ninguna credencial. `AdminGuard.tsx:22-32` solo comprueba que
  `GET /api/auth/me` devuelva `{ user: {...} }`; con eso pone `status='auth'` y
  monta el layout. El proxy del arnés ya intercepta todas las peticiones, así que
  basta con **responder ese endpoint con un usuario ficticio**
  (`{"user":{"id":1,"email":"rev@example.test","name":"Reviewer","role":"admin"}}`).
  **Cero credenciales, ningún `.env` leído, ningún secreto en juego.** De hecho el
  camino contrario —iniciar sesión de verdad— no habría funcionado: el proxy no
  reenvía la cabecera `Cookie`.
- *"Observar una transición, que una captura estática no puede mostrar"*. Se
  congela la transición **retrasando el chunk hijo**, exactamente la técnica que
  la propia 1.ª pasada ya había aplicado a `/blog` para fotografiar el
  `RouteFallback`. `LeadsList` es `lazy(() => import('./admin/leads/LeadsList'))`
  (`src/AppRoutes.tsx:27`), así que `SLOW=LeadsList SLOWD=8` lo retiene 8 s.

Receta completa (`i2_admin.sh`, ~5 min): stub de `GET /api/auth/me` + `SLOW=LeadsList
SLOWD=8` + `<script>` inyectado que a los 4 s hace
`document.querySelector('a[href="/admin/leads"]').click()` (react-router la
resuelve del lado cliente, sin recarga) + blocker de `load` a los 8 s. La captura
cae a t≈8 s: el click ya ocurrió (t=4 s) y el chunk aún no ha llegado (t=12 s).

**Reproducido por mí de punta a punta**, con mis propias capturas en
`i2shots/` (las del reviewer, `rvshots/adm-*.png`, coinciden):

| Captura | Qué demuestra |
|---|---|
| `adm-home-1440.png` / `adm-home-360.png` | El panel entero renderiza con sesión simulada: sidebar (logo `maia` + `ADMIN`, Inicio/Leads/Blog con **"Inicio" activo en naranja**), bloque de usuario "Reviewer · rev@example.test", botón "Cerrar sesión", y el contenido "PANEL / Bienvenido, Reviewer / Próximos pasos". |
| `adm-midflight-1440.png` / `adm-midflight-360.png` | **La prueba que faltaba.** Tras el click en "Leads", con el chunk de `LeadsList` retenido: el sidebar sigue **íntegro** y ya marca **"Leads" activo en naranja**; **solo el área de contenido** muestra el spinner. |
| `adm-final-1440.png` / `adm-final-360.png` | Resuelto el chunk, `/admin/leads` renderiza (buscador, filtros Tipo/País, tabla Fecha/Nombre/Email/…, "Sin leads.", paginador) y el sidebar es el mismo. |

**Y no me quedo en "se ve igual": lo medí.** Diff de la franja del sidebar
(x 0..259 a 1440 px; x 0..220 a 360 px) entre los tres estados:

| Comparación (franja del sidebar) | 1440 px | 360 px |
|---|---|---|
| **en vuelo vs final** | **`bbox=None` — 0 px distintos** | **`bbox=None` — 0 px distintos** |
| inicio vs en vuelo | `bbox=(20,72,239,158)` — 17 824 px | `bbox=(20,72,199,158)` — 14 544 px |
| *(el mismo par, área de contenido)* | `bbox=(41,48,1141,328)` — 161 173 px | `bbox=(24,32,140,424)` — 19 237 px |

Lectura, literal: mientras el chunk hijo está en vuelo el sidebar es **idéntico
hasta el bit** al que se ve una vez resuelto — no se desmonta, no parpadea, no se
repinta. Lo único que cambia entre "inicio" y "en vuelo" es la caja
`y 72..158`, que son exactamente las dos píldoras `Inicio`/`Leads`: se mueve el
resaltado del ítem activo y **nada más** (logo, bloque de usuario y "Cerrar
sesión" quedan intactos). Todo el cambio real ocurre en el área de contenido.

Y lo que el usuario ve en ese hueco **no es una pantalla en blanco**: el área de
contenido en vuelo es **99,7 % `#FAFAF9`** (`surface.soft`) con el spinner en
**`#E8440A`** (`primary.main`) — mismo resultado a 360 px (99,9 %).

**El acceptance 2 queda cubierto entero**, con imagen y con medición, no apoyado
en el test `AppRoutes.test.tsx`.

> **Observación nueva, fuera del acceptance: el panel admin desborda a 360 px.**
> Al poder por fin renderizar el panel con sesión, vi algo que la 1.ª pasada no
> podía ver: a 360 px el sidebar ocupa 220 px fijos y el contenido no cabe. Lo
> medí con la sonda (`crop2-adm-probe-360.png`), no lo estimé:
>
> | Ruta | scrollWidth | clientWidth | overflowX |
> |---|---|---|---|
> | `/admin/leads` @360 | **853** | 360 | **SÍ** |
> | `/admin/leads` @1440 | 1440 | 1440 | NO |
>
> Se ve en `adm-final-360.png`: la tabla de Leads y el texto de bienvenida quedan
> cortados por la derecha.
>
> **No lo introdujo el backlog 17-23**, y esto sí lo puedo afirmar por código:
> `AdminLayout.tsx:33` declara `width: { xs: 220, md: 260 }` **byte a byte igual
> en `HEAD`**, y el único cambio del backlog en `LeadsList.tsx` es la migración a
> `normalizeApi` (feature 20) más un literal `#A89E9A` → `tokens.text.disabled`
> (feature 23): **ni una línea de layout**. Es estructural y preexistente.
>
> Tampoco pertenece a esta feature: el acceptance 24 pide 404, ausencia de flash y
> ausencia de cambio de color, y la sonda de `scrollWidth` de §3.1 solo cubría
> rutas públicas (el panel exigía sesión). Lo dejo escrito como **candidato a
> feature nueva** — "el panel admin no es usable a 360 px: el sidebar debería
> colapsar" — y no lo toco.

### 4.1. El resto del acceptance 2, ya cubierto en la 1.ª pasada

- **Ninguna de las capturas de rutas públicas salió con el `RouteFallback`.**
  `/blog` y `/admin/login` mostraron su contenido real: en condiciones de red
  local el usuario no llega a ver el placeholder.
- **Qué se ve mientras carga el chunk de `/blog`**: retrasando 8 s *solo* el
  módulo de `BlogIndex` (`s-blog-fallback-1440.png`, `s-blog-fallback-360.png`):
  fondo **`#FAFAF9`** = `surface.soft` y spinner **`#E8440A`** = `primary.main`.
  Remedido por el reviewer, correcto.
- **`/admin` sin sesión** redirige a la tarjeta de login sin blanco intermedio
  (`s-admin-root-1440.png`).

---

## 5. El fondo Vanta del héroe no llega a la captura **[F3]**

`Hero.tsx:50-70` inicializa `vanta.net` con `backgroundColor: 0xFFDACD`
(melocotón) y `color: 0xE8440A`. **Eso no aparece en ninguna captura.** Medido por
mí sobre `s-landing-1440.png`:

- Franja izquierda del héroe (x 10-260, y 100-620), 2 700 puntos muestreados:
  **un único color, `#FFFFFF` puro (100 %)**.
- Todo el bloque del héroe (x 0-1440, y 70-700), 18 540 puntos: 90,2 % `#FFFFFF`,
  2,1 % `#1A1410` (el texto), 1,4 % `#E8440A` (el CTA y el badge). Ni malla ni
  fondo melocotón.
- Búsqueda exhaustiva de `#FFDACD` en toda la franja del héroe: **0 píxeles**.

Sonda adicional de esta pasada (`i2_vanta_probe.py`), para no quedarme en la
suposición de *"headless no tiene WebGL"*:

```
canvas en el DOM: 1  [canvas#0 1440x1330]
WebGL context: SI    renderer: Intel(R) HD Graphics, or similar
```

O sea: **el `<canvas>` sí existe y está dimensionado, y sí hay contexto WebGL**;
lo que no ocurre es que su contenido se componga en el PNG que emite
`firefox --headless --screenshot`. La causa exacta no la puedo afirmar; el hecho
observable sí, y es el que importa.

Consecuencias, escritas en vez de escondidas:

1. **El acceptance 3 queda sin verificar para la capa de fondo del héroe**, que
   es el elemento con más carga cromática de la landing. Es una limitación
   legítima de la técnica, del mismo tipo que la de §2.2, y merece el mismo trato
   honesto.
2. Explica por qué el pipeline es determinista hasta el byte: **no hay capa
   aleatoria en el render**. Sin eso, ningún `bbox=None` sería reproducible.
3. `delay_proxy.py:7` afirmaba *"mismo canvas de Vanta"*. **Corregido** en esta
   pasada; el docstring ahora declara las tres limitaciones reales.

---

## 6. Feature 23 — tokens de color: diff de píxeles a **página completa** **[F2]**

El árbol de trabajo tiene las features 17-23 **sin commitear**: `HEAD` (`484b6a3`)
es literalmente el estado previo al backlog. Método:

1. `git archive HEAD | tar -x -C <scratchpad>/base` — **no toca el repo**: ni
   worktree, ni checkout, ni metadatos de `.git`.
2. `node_modules` enlazado por symlink; `npx vite --port 5178 --strictPort`.
3. Dos proxies de retardo **independientes**, uno por servidor (`:8994` → actual,
   `:8995` → base), mismas rutas y mismos `--window-size`.
4. Diff con `PIL.ImageChops.difference`.

**Comprobado que los dos servidores sirven código realmente distinto** (si no, el
`bbox=None` no valdría nada):

| Sonda | Base `:5178` (pre-backlog) | Actual `:5175` |
|---|---|---|
| `GET /src/styles/globals.css` | `:root { --orange: #E8440A; --bg-strong: #252525; … }` — **declara los colores** | solo un comentario: *"Este archivo NO define colores… se declaran desde `tokens.ts`"* |
| `GET /src/theme/tokens.ts` | fallback HTML del SPA (**el módulo no existe**) | módulo JS real: `const brand = { orange: "#E8440A", … }` |
| `GET /src/main.tsx` — menciones de `AppRoutes` | **0** | 2 |

### 6.1. Los 8 pares, a página completa

Capturas nuevas, con el `--window-size` por encima del `scrollHeight` de cada
documento, de modo que **entra la página entera, footer incluido**:

| Par (base = pre-backlog) | Tamaño comparado | Resultado |
|---|---|---|
| `landing` @1440 | 1440 × 9 600 | **`bbox=None`** — 0 px distintos de 13 824 000 |
| `landing` @360 | 360 × 15 200 | **`bbox=None`** — 0 px distintos de 5 472 000 |
| `privacidad` @1440 | 1440 × 6 400 | **`bbox=None`** — 0 px de 9 216 000 |
| `privacidad` @360 | 360 × 11 200 | **`bbox=None`** — 0 px de 4 032 000 |
| `blog` @1440 | 1440 × 2 400 | **`bbox=None`** |
| `blog` @360 | 360 × 2 400 | **`bbox=None`** |
| `admin/login` @1440 | 1440 × 2 400 | **`bbox=None`** |
| `admin/login` @360 | 360 × 2 400 | **`bbox=None`** |

(La 404 no es comparable: en `HEAD` esa ruta no existe. En `HEAD`
`/ruta-que-no-existe` renderiza **una página en blanco absoluto** —
`base-404-1440.png`—, que es el contraste que justifica la feature 17.)

**Verificado que la captura completa contiene de verdad lo que faltaba**: en
`cur-landing-1440.png` la banda `#252525` del footer está en `y 8319..8643` y la
tarjeta del `CTAFinal` alrededor de `y 8051`. Miré el recorte `y 2600..8644`
(`view-landing-below-crop.png`) y ahí están, renderizadas y en color: "3 pasos",
`Features`, `Integrations`, `Pricing` (con la píldora "Más popular" naranja sobre
el plan Team), `Addons`, `FAQ`, `CTAFinal` y `Footer`.

### 6.2. Control negativo — y por qué el recorte de la 1.ª pasada no bastaba

Un `bbox=None` solo vale si el método detecta diferencias cuando las hay. Muté
**una sola variable en la copia del scratchpad** (`--bg-strong: #252525` →
`#204020`, que es la que usa `Footer.tsx:29`), recapturé la landing a página
completa y revertí la mutación:

```
CONTROL NEGATIVO, página completa (1440×9600) : bbox=(0, 8319, 1440, 8644)  464 389 px distintos
EL MISMO par recortado a 1440×2600            : bbox=None
```

Esto es, de una vez, las dos cosas que hacían falta:

1. **El método no es ciego**: ve 464 389 px cuando hay un cambio de color real.
   (El reviewer aportó además otro control negativo, con la captura sin harness:
   311 321 px.)
2. **Y demuestra F2 con números**: esa misma regresión, mirada con el recorte de
   2 600 px de la 1.ª pasada, habría dado `bbox=None`. El recorte era ciego a
   todo lo que hay por debajo de `Pain`. Por eso los 8 pares se rehicieron.

### 6.3. Muestreo directo de tokens (comprobación redundante)

| Elemento | Color medido | Token esperado |
|---|---|---|
| Botón "Ingresar" de la Navbar | `#E8440A` | `primary.main` / `--orange` |
| CTA "Agenda un demo" del héroe | `#E8440A` | `primary.main` |
| Fondo del footer | `#252525` | `--bg-strong` |
| Burbuja de WhatsApp | `#25D366` | `tokens.external.whatsapp` |
| Fondo del `RouteFallback` (blog y admin) | `#FAFAF9` | `surface.soft` |
| Spinner del `RouteFallback` | `#E8440A` | `primary.main` |
| Precios de `Addons` | `#1A1410` | heredado de `--text` (ver hallazgo H1) |

Remedidos por el reviewer uno a uno: todos correctos.

**Ni un solo bloque gris, negro o transparente donde debería haber naranja o
verde.** Ninguna `var(--x)` sin definir con efecto visible (H1 es la única
variable no declarada y hoy no tiene síntoma).

---

## 7. Feature 17 — la 404: coordenadas remedidas **[F5]**

Capturas `s-404-1440.png` (1440×2200) y `s-404-360.png` (360×2200). **Las cifras
de la 1.ª pasada estaban ~10 % desviadas**: se leyeron sobre la vista reducida a
la que se muestra una imagen de 1440 px de ancho (factor 1,10), no sobre el PNG.
Remedidas por mí sobre el original, píxel a píxel:

| Medida (sobre el PNG original) | @1440 | @360 | Declarado en la 1.ª pasada @1440 |
|---|---|---|---|
| Navbar (banda superior blanca) | `y 0..64` | `y 0..64` | "y 0..60" |
| `<main>` (fondo `#FAFAF9`) | `y 65..1874` | `y 65..1497` | "y 60..1690" |
| Glifo "404" (`#E8440A`) | `y 820..889` | `y 638..690` | — |
| Botón "Volver al inicio" (`#E8440A`) | `y 1060..1115` | `y 861..916` | "y ≈ 990" ❌ |
| Footer (banda `#252525`) | **empieza en `y 1875`** | **empieza en `y 1498`** | "y ≈ 1690" ❌ |

Con las cifras buenas, las tres afirmaciones del acceptance 1 **se sostienen en
los dos anchos** (y las verifiqué también mirando las capturas):

- **Bloque centrado.** @1440: el bloque va de `y 820` a `y 1115`, centro **967,5**;
  el `<main>` va de `65` a `1875`, centro **970,0** → desviación de 2,5 px.
  @360: bloque `638..916`, centro **777,0**; `<main>` `65..1498`, centro **781,5**
  → desviación de 4,5 px. Horizontalmente el bloque está limitado y centrado con
  `mx: 'auto'`.
- **La Navbar fija no tapa el "404".** La Navbar ocupa `y 0..64` y el glifo
  empieza en `y 820` (@1440) / `y 638` (@360). Sin solapamiento.
- **El Footer no se solapa con el CTA.** Botón hasta `y 1115` y footer desde
  `y 1875` → **760 px de aire** @1440; hasta `y 916` y footer desde `y 1498` →
  **582 px** @360.

---

## 8. Hallazgos

Los dos son **preexistentes**: aparecen igual en el render de `HEAD`, luego
**ninguno es una regresión de las features 17, 22 o 23**. Ninguno se ha corregido
—el encargo era verificar y reportar, y corregirlos aquí violaría el scope— y
ambos se proponen como feature nueva.

### H1 — `var(--black)` no está declarada (severidad: **baja**, latente)

`src/components/sections/Addons.tsx:142` y `:150` usan `color: 'var(--black)'`,
pero `--black` no existe en ninguna capa de tokens (`grep -rn -- "--black" src/`
no encuentra ninguna declaración). Ya lo había detectado y dejado intacto
`progress/impl_23.md` §2.6, sin poder confirmar el efecto visual.

**Confirmado ahora**: la declaración es inválida, el color se hereda y esos precios
renderizan a **`#1A1410`** (562 px exactos de `#1A1410` en el recorte de "$0.20",
453 px en el de "$60"), que es el `--text` del `body`. **Hoy no tiene síntoma
visible**: se ve como texto oscuro normal y es consistente con el resto. El riesgo
es latente: si alguien declara `--black: #000`, esos dos precios cambiarán de tono
sin que ningún test lo note. El reviewer confirmó con `git show HEAD` que es
idéntico en el código pre-backlog.

Propuesta: feature "declarar o eliminar `var(--black)` en `Addons.tsx`", decidiendo
si la intención de diseño era `#000` o `text.primary`.

### H2 — contraste insuficiente en la línea legal del `CTAFinal` (severidad: **baja**, accesibilidad)

**Cifra corregida [F4].** El origen es `src/components/sections/CTAFinal.tsx:34`:
`color: 'rgba(255,255,255,0.7)'`. La 1.ª pasada reportó **2,38:1** partiendo de un
`#F2B19A` que corresponde a **alpha 0,6**, que no es el alpha del código. Lo
recalculé yo desde cero sobre `s-landing-bottom.png`, aislando la línea "Al
registrarte aceptas nuestros Términos y Privacidad.":

| Dato | Valor |
|---|---|
| Fondo local dominante bajo esa línea | `#DE4009` (222, 64, 9) |
| Píxel de texto más claro, medido | `#F6C6B5` (246, 198, 181) |
| **Contraste medido** | **2,82:1** |
| Composición teórica `rgba(255,255,255,0.7)` sobre `#DE4009` | `#F5C6B5` (245, 198, 181) → **2,81:1** |
| Referencia: blanco puro sobre `#DE4009` | **4,34:1** |
| *(la cifra vieja, alpha 0,6)* | *`#F2B39D` → 2,42:1 — descartada* |

Medición y teoría concuerdan (2,82 vs 2,81). **El hallazgo sigue plenamente
vigente**: 2,82:1 está muy por debajo del **4,5:1** que pide WCAG AA para texto
pequeño. Y el dato de apoyo también: incluso el cuerpo en blanco puro sobre ese
naranja da 4,34:1, también por debajo del umbral.

Es de la familia de literales `rgba(255,255,255,x)` que `progress/impl_23.md` §2.5
excluyó deliberadamente del barrido, y el reviewer confirmó con `git show HEAD`
que `CTAFinal.tsx:34` es idéntico en el código pre-backlog: **la feature 23 no lo
introdujo ni debía tocarlo**. Propuesta: feature de accesibilidad sobre el
`CTAFinal`.

### Observaciones que NO son hallazgos

- **Los párrafos del artículo del blog se pegan entre sí** ("…cerrar acuerdos.A
  continuación…") en `/blog/como-ia-automatiza-proceso-de-venta`. Es el
  contenido/`MarkdownRenderer`, no color ni layout, y no entra en el scope de
  17/22/23.
- **La burbuja de WhatsApp se superpone al contenido a 360 px**: es un botón
  flotante `fixed`, comportamiento intencionado.
- **El panel admin desborda a 360 px** (`scrollWidth` 853 vs `clientWidth` 360 en
  `/admin/leads`; el sidebar se lleva 220 px fijos). **Preexistente y no
  introducido por el backlog** — ver la nota medida de §4. Es el único candidato
  a feature nueva que aparece por primera vez en esta 2.ª pasada, y aparece
  precisamente porque F1 permitió renderizar el panel.
- **`--surface` y `--surface2` siguen declaradas y sin consumidores**, igual que
  antes de la 23. No es un defecto visual.

---

## 9. Qué se declaró mal en la 1.ª pasada y qué se declara ahora

Tabla explícita, para que el reviewer no tenga que diffear dos informes:

| # | Lo que decía la 1.ª pasada | Estado | Lo que se declara ahora |
|---|---|---|---|
| F1 | *"Lo que NO pude verificar: el sin parpadeo del sidebar del admin… requiere sesión (credenciales que no debo obtener) y observar una transición, que una captura estática no puede mostrar."* | **RETIRADO** | Era verificable con un stub de `GET /api/auth/me` (cero credenciales) y el retardo del chunk hijo. Verificado y medido: sidebar en vuelo vs final `bbox=None` en los dos anchos (§4). |
| F2 | *"idénticas píxel a píxel"* sobre 8 comparaciones de 2600/2200 px de alto | **CORREGIDO** | Aquellos 4 pares de landing/privacidad cubrían 18-38 % del documento. Los 8 pares se rehicieron **a página completa**: `bbox=None` en los 8 (§6.1), con control negativo que prueba que el recorte viejo era ciego (§6.2). |
| F3 | Tabla §3: *"héroe con Vanta"*; `delay_proxy.py:7`: *"mismo canvas de Vanta"* | **RETIRADO** | El canvas existe (1440×1330) y hay WebGL, pero su contenido no llega al PNG: la franja del héroe es `#FFFFFF` al 100 % y no hay ni un píxel de `#FFDACD`. Esa capa queda **fuera** de la verificación de color. Docstring corregido (§5). |
| F4 | Contraste de H2 = **2,38:1**, texto `#F2B19A` | **CORREGIDO** | **2,82:1** medido / 2,81:1 teórico, texto `#F6C6B5` (`rgba(255,255,255,0.7)` sobre `#DE4009`). El `#F2B19A` era alpha 0,6. Hallazgo vigente (§8/H2). |
| F5 | 404 @1440: botón en `y ≈ 990`, footer en `y ≈ 1690` | **CORREGIDO** | Botón `y 1060..1115`, footer desde `y 1875`. Las cifras viejas se leyeron sobre la vista reducida (factor 1,10). Las tres afirmaciones del acceptance 1 se sostienen (§7). |

Lo que el reviewer auditó y **sí se sostiene**, y por tanto no se ha tocado: el
episodio de §2.2 y su explicación; la limpieza de `delay_proxy.py` (no contamina
el render); H1 y H2 como preexistentes; los muestreos de token de §6.3; la tabla
de veredictos de §3 salvo Vanta; la sonda de `scrollWidth`.

---

## 10. Dónde están las capturas

Todas en el scratchpad de sesión, **ninguna dentro del repo** (verificado:
`git status --porcelain -uall | grep -E '\.(png|jpg|py|sh|log)$'` → vacío):

```
/tmp/claude-1000/-var-www-html-maia-landing-front/1fd8db25-f8aa-491a-b6bf-82b801cd0b68/scratchpad/
```

| Carpeta / prefijo | Qué es |
|---|---|
| **`i2shots/adm-{home,midflight,final}-{1440,360}.png`** | **[F1]** El sidebar del admin: panel completo, transición congelada y estado final, en los dos anchos. Producidas por mí. |
| **`i2shots/{cur,bas}-*.png`** | **[F2]** Los 8 pares **a página completa** (actual vs pre-backlog). |
| **`i2shots/neg-landing-1440.png`** | **[F2]** Control negativo: `--bg-strong` mutado en la copia del scratchpad. |
| `i2shots/view-landing-below-crop.png` | Lo que el recorte de la 1.ª pasada dejaba fuera (`y 2600..8644`), para mirarlo. |
| `i2shots/{hprobe,crop-hprobe}-*.png` | **[F2]** Sonda de `scrollHeight` por ruta y ancho. |
| `i2shots/crop-vanta-probe.png` | **[F3]** Sonda de `<canvas>` + WebGL. |
| `i2shots/crop2-adm-probe-360.png`, `crop-adm-probe-1440.png` | Sonda de `scrollWidth` **dentro del panel admin** (nota de §4). |
| `rvshots/adm-*.png`, `rvshots/full-*.png` | Las capturas equivalentes del reviewer. Coinciden con las mías. |
| `shots/s-*.png` | Evidencia de la 1.ª pasada, estado asentado: `s-landing-{360,1440}.png`, `s-404-*`, `s-blog-*`, `s-adminlogin-*`, `s-privacidad-*`, `s-landing-1440-tall.png` y los recortes `s-landing-{mid,bottom}.png`. **Recortes superiores: leerlos con el alcance de §3.2.** |
| `shots/s-blog-fallback-*.png` | El `RouteFallback` de `/blog` en pleno vuelo. |
| `shots/base-*.png` | El render desde `HEAD` de la 1.ª pasada. `base-404-1440.png` es la página en blanco de antes de la feature 17. |
| `shots/probe-*.png` / `crop-probe-*.png` | Sonda de `scrollWidth` a 360 px. |
| `shots/landing-*.png` (sin prefijo `s-`) | Primeras capturas **sin** harness, animaciones a medias. Solo ilustran §2.2; **no usarlas para juzgar color**. |
| `shots/settled-landing-1440.png` | Intento vía iframe, **descartado**. |

**Servidores.** Los que levanté yo (`:5178` con el código pre-backlog y los
proxies `:8993`-`:8998`) están **todos detenidos** (comprobado con `ss` al
cerrar). El dev server del líder en `:5175` sigue vivo, el backend de `:3002`
sigue vivo y el **proceso ajeno de `:5174` quedó intacto** (pid 205452, sigue
corriendo). Para reproducir: `bash i2_full_diff.sh` y `bash i2_admin.sh`.

---

## 11. Verificación (bloque de `docs/verification.md` §1)

Esta feature no modifica `src/`, pero el bloque se corrió **antes** (baseline de
esta 2.ª pasada) y **después**:

```
Baseline 2.ª pasada (10:04)                    Cierre 2.ª pasada
npm test  → 13 archivos / 75 tests, exit 0     npm test  → 13 archivos / 75 tests, exit 0
npm run typecheck → exit 0                     npm run typecheck → exit 0
npm run build → exit 0                         npm run build → exit 0
```

Aviso `Some chunks are larger than 500 kB`: el esperado. Chunk de entrada
`index-*.js` **1 586,47 kB** (gzip 451,08 kB), sin cambios respecto al baseline
del backlog.

**Incidencia heredada de la 1.ª pasada, cerrada aquí.** Aquella sesión reportó
que en una ejecución `npm test` falló 1 test de 75 (64,6 s frente a 29,9 s, con
`load average` en 10,27 por las capturas y builds) y **no conservó el nombre del
test**. En esta pasada seguí la recomendación del reviewer y guardé la salida
completa con `npm test 2>&1 | tee <log>`:

- `scratchpad/i2_test_baseline.log` — 75/75, exit 0, 58,35 s.
- `scratchpad/i2_test_cierre.log` — 75/75, exit 0.

Las dos ejecuciones de esta sesión fueron verdes, con los logs conservados y
re-comprobables. El reviewer también corrió el bloque por su cuenta: 75/75, exit
0. La hipótesis de timeout por carga (`testTimeout` = 15 000 ms) sigue siendo la
única que encaja: **no se ha tocado ni un archivo de `src/`** en ninguna de las
dos pasadas.

---

## 12. Estado y siguiente paso

- `feature_list.json`: la 24 sigue en `in_progress`. **No la he marcado `done`** —
  vuelve a review.
- `progress/current.md` actualizado y **coherente con este informe** (mismas
  cifras: 2,82:1, coordenadas de la 404, alcance de los diffs, sidebar
  verificado).
- Archivos de la app modificados: **ninguno**. Nada de `src/`, ni `docs/`, ni
  infraestructura (`package.json`, `vite.config.ts`, `tsconfig.json`,
  `vercel.json`, `.gitignore` intactos). Sin commits. Ningún `.env*` leído — de
  hecho no existe ninguno en el repo, y la sesión del admin se simuló con un
  usuario ficticio en el proxy.
- Para el reviewer: los dos hallazgos de §8 (H1 y H2) son candidatos a feature
  nueva, **no** correcciones pendientes de esta sesión. Corregirlos aquí violaría
  el scope (C10). Se suma un tercer candidato, aparecido en esta 2.ª pasada al
  poder renderizar el panel: **el admin desborda a 360 px** (`scrollWidth` 853 vs
  360), preexistente y ajeno al backlog 17-23 (§4).
