# Review — feature 24: Verificación visual del backlog 17-23 a 360 y 1440 px

**Veredicto:** APPROVED

> **2.ª vuelta.** Este archivo **sustituye** al `CHANGES_REQUESTED` de la 1.ª vuelta
> (que listaba los fallos F1-F5). Los cinco quedan cerrados; el detalle del cierre
> está en la sección "Auditoría de F1-F5". Quedan dos imprecisiones menores, no
> bloqueantes, en "Observaciones".
>
> **Encuadre: esta feature no modifica `src/`.** No hay diff de código que revisar.
> Su entregable es un informe con evidencia visual, así que **C2, C4 y C5 se juzgan
> adaptados** — sobre el informe, las capturas y los scripts auxiliares, no sobre
> componentes. Lo digo explícitamente en cada uno de los tres criterios.

---

## Verificación ejecutada

Ejecutada por mí, no leída del informe:

- `npm test`          → **13 archivos / 75 tests, exit 0**
- `npm run typecheck` → **exit 0**
- `npm run build`     → **exit 0**, chunk de entrada `index-JkIBH-og.js` 1 586,47 kB
  (gzip 451,08 kB), aviso `Some chunks are larger than 500 kB` — esperado, no es fallo.

Coincide con lo declarado en §11 del informe.

### Re-verificación independiente de la evidencia visual

No me fié de ningún `bbox=None`. Recalculé todo con `PIL.ImageChops` y, en el punto
crítico, **volví a levantar el código de `HEAD` y a capturar por mi cuenta**.

**1. Los 8 pares a página completa** (`i2shots/cur-*.png` vs `i2shots/bas-*.png`):

| Par | Tamaño cur | Tamaño bas | ¿Mismo tamaño? | bbox |
|---|---|---|---|---|
| landing-1440 | 1440×9600 | 1440×9600 | sí | **None** |
| landing-360  | 360×15200 | 360×15200 | sí | **None** |
| priv-1440    | 1440×6400 | 1440×6400 | sí | **None** |
| priv-360     | 360×11200 | 360×11200 | sí | **None** |
| blog-1440    | 1440×2400 | 1440×2400 | sí | **None** |
| blog-360     | 360×2400  | 360×2400  | sí | **None** |
| adm-1440     | 1440×2400 | 1440×2400 | sí | **None** |
| adm-360      | 360×2400  | 360×2400  | sí | **None** |

Descarté los modos de fallo que había que descartar:

- **¿Se comparó una imagen contra sí misma?** No. Los 16 archivos tienen **inodos
  distintos** y `%h`=1 (sin hardlink). Los pares son byte a byte iguales (mismo
  md5) porque el pipeline es determinista, no porque sean el mismo archivo.
- **¿Se comparó cada captura contra el otro servidor?** Sí. `i2_full_diff.sh:10-13`
  levanta **dos proxies independientes** (`:8994`→`:5175` actual, `:8995`→`:5178`
  base) y `i2_full_diff.sh:22-23` dispara `shot $PC cur` / `shot $PB bas`. Verifiqué
  además que la copia base es realmente pre-backlog: `scratchpad/base/src/theme/`
  contiene **solo `theme.ts`** (no existe `tokens.ts`) y `base/src/styles/globals.css:1-11`
  **sí declara los colores** (`--orange: #E8440A`, `--bg-strong: #252525`).
- **¿La captura completa contiene de verdad lo que faltaba?** Sí. En
  `cur-landing-1440.png` la franja `y 2600..8644` es **65,6 % no-blanca**; el
  píxel (700, 8400) es `(37,37,37)` = `#252525` (footer). Miré el recorte
  `y 7900..8700`: están el `CTAFinal` naranja y el footer completos. El alcance
  declarado en §6.1 coincide con lo capturado.

**2. El control negativo** (la pieza que sostiene el método). Reproducido:

```
cur-landing-1440.png vs neg-landing-1440.png (1440×9600) → bbox=(0, 8319, 1440, 8644), 464 389 px
el mismo par recortado a 1440×2600                        → bbox=None
píxel (700,8400): cur=(37,37,37)  neg=(32,64,32)  ← #252525 vs #204020
```

Las dos comprobaciones que pedía la auditoría:

- **La mutación se hizo sobre la copia del scratchpad, no sobre el repo.**
  `git diff -- src/styles/globals.css | grep 204020` → **vacío**;
  `base/src/styles/globals.css:9` está en `#252525` (revertida). El
  `i2_base_vite.log` registra dos `hmr update /src/styles/globals.css` a las
  10:15:18 y 10:15:34 — mutación y reversión, ambas sobre `:5178`. Los 8 pares se
  capturaron **antes** (10:12-10:14), así que la mutación no los contaminó.
- **La zona afectada caía FUERA del recorte de 2 600 px.** `--bg-strong` tiene
  **un único consumidor** en el árbol base: `base/src/components/Footer.tsx:29`.
  El footer vive en `y 8319..8643`, muy por debajo de 2 600. Luego el control
  demuestra exactamente lo que dice demostrar: (a) el método ve 464 389 px cuando
  hay un cambio real, y (b) el recorte viejo era ciego a esa región. No hay
  contaminación de la zona cubierta por el recorte.

**3. El sidebar del admin** (recalculado sobre `i2shots/adm-*.png`, franja `x 0..259`
a 1440 px y `x 0..219` a 360 px):

| Comparación (franja del sidebar) | 1440 px | 360 px |
|---|---|---|
| en vuelo vs final | **bbox=None, 0 px** | **bbox=None, 0 px** |
| inicio vs en vuelo | `(20,72,239,158)` — 17 824 px | `(20,72,199,158)` — 14 544 px |

Idénticos a los del informe. Miré `adm-home-1440.png` y `adm-midflight-1440.png`:
en vuelo el sidebar está íntegro (logo, `ADMIN`, Inicio/Leads/Blog con **"Leads"
ya activo en naranja**, "Reviewer · rev@example.test", "Cerrar sesión") y **solo el
área de contenido** muestra el spinner naranja sobre `surface.soft`. El delta
`y 72..158` son las dos píldoras `Inicio`/`Leads`, tal como se declara.

**4. `/blog` y la 404** (acceptance 1 y parte del 2). Remedidos por mí sobre los PNG
originales:

| Medida | @1440 | @360 |
|---|---|---|
| Navbar / banda naranja superior | `y 7..56` | — |
| `<main>` `#FAFAF9` | `y 65..1874` | `y 65..1496` |
| Glifo "404" `#E8440A` | `y 820..889` | `y 638..690` |
| Botón "Volver al inicio" | `y 1060..1115` | `y 861..916` |
| Footer `#252525` empieza en | **`y 1875`** | **`y 1498`** |

Centro del bloque 967,5 vs centro del `<main>` 970,0 (@1440) y 777,0 vs 781,5
(@360): centrado. Sin solapamiento Navbar/glifo ni footer/CTA. `s-blog-fallback-1440.png`
muestra el `RouteFallback` en `#FAFAF9` con spinner `#E8440A` — **no** es una
pantalla en blanco.

---

## Checkpoints

- **C1  [x]** — `npm test` exit 0, **13 archivos / 75 tests**. Ejecutado por mí.
- **C2  [x]** — *adaptado*: aquí "test" = evidencia visual reproducible
  (`docs/verification.md` §5 exime de test a los cambios solo de estilos/tokens, y
  §6 remite a verificación manual). **Cada punto del `acceptance` tiene su
  verificación, y la audité entera**:
  - *acc. 1 (404 centrada, Navbar no tapa, Footer no solapa)* → §7, coordenadas
    remedidas; las revalidé píxel a píxel (tabla de arriba) y miré `s-404-360.png`.
  - *acc. 2 (sin flash ni blanco en `/blog` y `/admin/*`, sin parpadeo del sidebar)*
    → §4. Cubierto **con imagen y con medición**, ya no apoyado en `AppRoutes.test.tsx`:
    `bbox=None` en vuelo vs final en los dos anchos, reproducido por mí.
  - *acc. 3 (sin cambio de color)* → §6. 8 pares **a página completa**, `bbox=None`
    en los 8, con control negativo válido. La única capa excluida (el canvas de
    Vanta) queda **declarada y medida**, no escondida (§5).
  - *acc. 4 (anotado en `progress/current.md`)* → §12; `current.md:71-106,128-163`
    coincide en cifras con el informe (2,82:1, `y 1875`, `bbox=None`, 464 389, 853).
- **C3  [x]** — `npm run typecheck` y `npm run build` exit 0.
- **C4  [x]** — *adaptado*: **no hay archivos de `src/` que juzgar** por nombres,
  ubicación, `any` o hex hardcodeados. Lo aplicable es la higiene de residuos:
  `git status --porcelain -uall | grep -E '\.(png|jpg|py|sh|log)$'` → **vacío**.
  Las 47 capturas de `i2shots/`, las de `rvshots/`, `shots/` y los scripts
  (`delay_proxy.py`, `rv_admin.py`, `i2_*.py|sh`, `wrap_server.py`) viven **todos en
  el scratchpad**.
- **C5  [x]** — *adaptado*: no se añadió ninguna llamada a `fetch`, ni state manager,
  ni librería de data fetching, ni tipo duplicado, **porque no se tocó `src/`**.
  Los stubs de `/api/auth/me` y `/api/admin/*` viven en `i2_admin_probe.py:19-20`
  y `rv_admin.py`, arneses externos al repo que no se despliegan.
- **C6  [x]** — no se consume ningún endpoint nuevo desde la app;
  `docs/api-contract.md` no requería cambios.
- **C7  [x]** — `feature_list.json` marca la 24 como **`in_progress`** (correctamente
  **no** `done`); `progress/current.md` documenta lo hecho, el bloque de verificación
  y los tres candidatos a feature nueva, y es coherente con `impl_24.md`.
- **C8  [x]** — **no existe ningún `.env*` en el repo**, luego no se pudo leer
  ninguno. La sesión del admin se simuló con un usuario ficticio
  (`{"id":1,"email":"rev@example.test",...}`) inyectado por el proxy: cero
  credenciales, cero secretos. Ninguna variable de entorno nueva.
- **C9  [x]** — sin residuos en el repo. Servidores auxiliares del implementer
  (`:5178`, proxies `:8993`-`:8998`) **detenidos**; los míos (`:5188`, `:8977`)
  también. Siguen vivos solo el dev server del líder (`:5175`), el backend
  (`:3002`) y **el proceso ajeno de `:5174`, intacto (pid 205452, verificado con
  `ps` al cerrar)**. `M tsconfig.tsbuildinfo` es artefacto de `tsc -b`, no residuo.
- **C10 [x]** — scope respetado: **cero archivos de la app tocados**. Los `mtime` lo
  confirman: el `src/` más reciente es `MarkdownRenderer.tsx` a las **00:20** del
  28-jul, mientras que la sesión de la feature 24 arranca a las **09:15**. H1
  (`var(--black)`) y H2 (contraste del `CTAFinal`) **siguen SIN corregir**, como
  debían: `Addons.tsx:142,150` mantienen `color: 'var(--black)'` y
  `CTAFinal.tsx:34` mantiene `rgba(255,255,255,0.7)` — ambos byte a byte iguales a
  `HEAD` (`Addons.tsx:141,149` y `CTAFinal.tsx:34`). Quedan propuestos como
  features nuevas, no arreglados aquí.
- **C11 [x]** — infraestructura intacta, verificado por `mtime`: `package.json`
  (4-jun), `vite.config.ts` (27-may), `tsconfig.json` (26-may). `vercel.json` y
  `.gitignore` sin modificar.

**Ningún `[ ]`. Veredicto: `APPROVED`.**

---

## Auditoría de F1-F5 (los fallos de la 1.ª vuelta)

| # | Estado | Comprobación mía |
|---|---|---|
| **F1** | **CERRADO** | La verificación del sidebar **es suya, no una copia**. Prueba dura: `i2shots/adm-midflight-1440.png` **difiere** de `rvshots/adm-nav-midflight.png` en `bbox=(829,180,870,217)` — exactamente la caja del spinner, capturado en otro ángulo de rotación. Los fotogramas estáticos (`adm-home`, `adm-final`) sí coinciden md5 con los del reviewer, que es lo esperable de un pipeline determinista sobre contenido sin animación. Timestamps distintos (10:17-10:18 vs 09:58-09:59) y driver propio (`i2_admin.sh`). Reproduje sus números: `bbox=None` en vuelo vs final en los dos anchos. |
| **F2** | **CERRADO** | Los 8 pares rehechos a página completa, mismo tamaño en cada par, `bbox=None` en los 8, recalculados por mí. El alcance declarado en §6.1 **coincide con lo capturado** (verifiqué que el tramo `y 2600..8644` contiene `CTAFinal` y `Footer` renderizados). `scrollHeight` corroborado en las sondas: `crop-hprobe-landing-1440.png` dice `scrollHeight=8644`, `crop-hprobe-blog-1440.png` dice `2200` — la fila "2 200 px (doc ≤ viewport)" de §3.2 es un valor medido real, no un relleno. |
| **F3** | **CERRADO** | Remedido sobre `s-landing-1440.png`: la franja izquierda del héroe (x 10-260, y 100-620) es **100 % `#FFFFFF`** en 2 600 puntos muestreados. `delay_proxy.py:9-14` ya declara las limitaciones reales. La tabla §3 ya no dice "héroe con Vanta". |
| **F4** | **CERRADO** | Recalculado desde cero: `#F6C6B5` sobre `#DE4009` → **2,821:1**; composición teórica de `rgba(255,255,255,0.7)` → `(245,198,181)` → **2,814:1**; blanco puro → **4,336:1**; y la cifra vieja `#F2B19A` → 2,381:1, que en efecto corresponde a alpha 0,6 → `(242,179,157)` → 2,418:1. Todo cuadra con §8/H2. |
| **F5** | **CERRADO** | Coordenadas remedidas por mí sobre los PNG originales: coinciden con §7 dentro de ±1 px. Nota curiosa que confirma la explicación del factor 1,10: al abrir `s-404-360.png` la propia herramienta avisa *"original 360x2200, displayed at 327x2000, multiply by 1.10"*. |

**§9 no maquilla.** Contrasté las cinco filas de la tabla de `impl_24.md:504-510`
con las citas literales que la 1.ª vuelta dejó en el histórico del rechazo
(`review_24.md` anterior, secciones F1-F5): las cinco reproducen fielmente lo que
el informe de la 1.ª pasada afirmaba —incluido el `"idénticas píxel a píxel"` sobre
recortes, el `"héroe con Vanta"` y el `2,38:1`—, marcan cuáles se **retiran** y
cuáles se **corrigen**, y no reescriben ninguna en silencio.

---

## El hallazgo nuevo: el panel admin desborda a 360 px — atribución CORRECTA

Es el punto más delicado de la revisión, así que no me limité al `git diff`:
**levanté el código de `HEAD` y lo capturé yo**.

1. **Por código.** `AdminLayout.tsx:33` declara `width: { xs: 220, md: 260 }`, y
   `git show HEAD:src/admin/AdminLayout.tsx` trae esa misma línea en `:33`, byte a
   byte. El diff de `AdminLayout.tsx` toca **solo** `NAV_ITEMS` (retira el campo
   muerto `enabled` y la rama `Box` deshabilitada, que en `HEAD` ya era código
   inalcanzable porque los tres ítems tenían `enabled: true`) y sustituye los
   literales por tokens **de idéntico valor** (`tokens.brand.orange` = `#E8440A`,
   `tokens.text.primary` = `#1A1410`, `tokens.brand.orangeXL` = `#FFF0EB`).
   **Ni una línea de layout.** El diff de `LeadsList.tsx` es exactamente lo que
   declara el informe: `normalizeApi` (feature 20) más `#A89E9A` →
   `tokens.text.disabled` (feature 23). Revisé también `theme.ts`: cambia paleta y
   `MuiCssBaseline`, **no toca breakpoints, spacing ni typography**.
2. **Empíricamente, que es lo que zanja el asunto.** `git archive HEAD` →
   `scratchpad/base`, `npx vite --port 5188`, y capturé `/admin` con el mismo arnés
   de sonda a 360 y 1440 px. Resultado:

   ```
   head-adm-leads-360.png   md5 32e1af0e...  ==  i2shots/adm-probe-360.png   md5 32e1af0e...
   head-adm-leads-1440.png  md5 6884b7ed...  ==  i2shots/adm-probe-1440.png  md5 6884b7ed...
   ImageChops.difference → bbox=None en los dos anchos
   ```

   El render del panel con el código de `HEAD` es **byte a byte idéntico** al del
   código actual. Y la sonda sobre `HEAD` imprime, leída en la captura:
   `SONDA ADMIN scrollWidth=853 clientWidth=360 overflowX=SI`.

**Conclusión: el desbordamiento es preexistente. NO lo introdujo el backlog 17-23.**
La atribución del informe es correcta y no obliga a reabrir ninguna feature cerrada.
Queda bien clasificado como candidato a feature nueva, y se ve en
`adm-final-360.png` (el buscador y la cabecera `Fecha / Nom…` cortados por la derecha).

---

## Observaciones (menores, no bloqueantes, no exigen nueva vuelta)

Ninguna cambia una conclusión ni afecta a un checkpoint. Se anotan para que no se
arrastren si estas cifras acaban citadas en otra feature.

1. **`progress/impl_24.md:215` — fila mal etiquetada.** La fila
   *"(el mismo par, área de contenido)"* cuelga de *"inicio vs en vuelo"*, pero sus
   números son los de **"en vuelo vs final"**: reproduje `161 173` px @1440 y
   `19 237` px @360 comparando `adm-midflight` con `adm-final`. El par realmente
   etiquetado (`adm-home` vs `adm-midflight`, área de contenido) da `116 672` px
   @1440 y `47 864` px @360. La tesis *"todo el cambio real ocurre en el área de
   contenido"* se sostiene con cualquiera de los dos pares — de hecho el par
   correcto para esa fila es aún más elocuente: sidebar `bbox=None` con 161 173 px
   cambiando al lado.
2. **`progress/impl_24.md:281` — "0 píxeles" de `#FFDACD`.** Barriendo
   `s-landing-1440.png` en `y 70..700`, `x 0..1439` encuentro **3 píxeles** exactos
   de `#FFDACD` (antialiasing), no 0. Sobre 908 640 píxeles la conclusión de §5
   —que el fondo melocotón de Vanta no llega al PNG— es incontestable; solo el
   adjetivo "exhaustiva … 0" es literalmente inexacto.

---

## Lo que sostiene esta aprobación, en una línea

Los tres criterios visuales que quedaron sin comprobar en las features 17, 22 y 23
**están ahora verificados con evidencia que yo mismo he reproducido**: 8 diffs de
página completa con `bbox=None` y un control negativo válido (mutación fuera del
recorte, sobre la copia del scratchpad, con el repo limpio), el sidebar del admin
medido `bbox=None` entre el estado en vuelo y el final, y la 404 remedida al píxel.
El único hueco —el canvas de Vanta— está **declarado, medido y acotado**, que es
justo lo que se le pedía a la 2.ª vuelta. El hallazgo nuevo del panel admin a
360 px está correctamente atribuido a código preexistente, confirmado por mí
levantando `HEAD`. H1 y H2 siguen sin corregir, como debían.
