# Feature 26 — Limpiar residuos preexistentes de `Pricing.tsx`

**Fecha:** 2026-07-28 · **Estado:** implementada, pendiente de review (NO marcada `done`)
**Archivos tocados:** `src/components/sections/Pricing.tsx`,
`src/components/sections/__tests__/Pricing.test.tsx` (nuevo)

---

## 1. Baseline (antes de tocar nada)

```
npm test           → 14 archivos / 80 tests · exit 0
npm run typecheck  → exit 0
npm run build      → exit 0 (aviso esperado de chunk >500 kB; entrada 1 586,50 kB)
```

Coincide con el baseline que dejó la feature 25 en `progress/current.md`.

**Discrepancia de cifras, para que no se lea como regresión:** el encargo y
`docs/verification.md` §1 hablan de «13 archivos / 75 tests». Ese es el baseline
que dejó la **feature 23**; la 24 añadió un archivo de tests y la cifra vigente
es 14/80. No he tocado `docs/verification.md` (no es de esta feature), pero
conviene actualizar esa línea.

---

## 2. N1 — El bloque JSX comentado: qué era y por qué concluí que es residuo

### Qué era

El CTA por tarjeta de plan: un `<Box sx={{ mt: 'auto', pt: 2.5 }}>` con dos
ramas, un `<button>` para el plano `Enterprise` y un `<a>` para el resto, ambas
con el copy **"Hablar con ventas →"**. 28 líneas al final del `.map()` de planes.

### Arqueología (`git log --follow` + `git show`)

Lo comentó el commit **`eda76c4`** (2026-07-24, mensaje "update"), que en el
mismo cambio hizo tres cosas sobre este bloque:

| Antes de `eda76c4` | Después |
|---|---|
| `href={`https://app.maiabuilder.ai/login?plan=${…}`}` | `onClick={onOpenContact}` |
| Copy `Elegir plan →` | Copy `Hablar con ventas →` |
| Bloque **activo** | Bloque **comentado** |

y, fuera del bloque, cambió el copy del pie de la sección de "Agenda una demo
gratuita de 30 min" a **"Contactanos"** (ese enlace sigue vivo y llama al mismo
`onOpenContact`).

### Por qué es residuo y no algo apagado a propósito que haya que preservar

Me tomé en serio la posibilidad de parar aquí. Descarto que sea código
"dormido y recuperable" por cuatro razones, en orden de peso:

1. **No queda nada que recuperar de él.** Lo único que el bloque tenía y que hoy
   no existe en ninguna otra parte de la app era el deep link
   `https://app.maiabuilder.ai/login?plan=…`. Y ese deep link **ya se había
   eliminado del bloque antes de comentarlo**, en ese mismo commit: lo que quedó
   comentado es la versión que ya solo abría el modal de contacto. Restaurar el
   comentario tal cual **no** devolvería el alta self-service; solo duplicaría un
   CTA que ya existe.
2. **Su comportamiento sigue servido.** La acción que ejecutaba
   (`onOpenContact`) la ofrece el enlace "Contactanos" del pie de la sección, que
   el mismo commit puso en su sitio. No hay funcionalidad perdida, solo una
   afordancia distinta: el commit lee como "quito el CTA por tarjeta y dejo un
   único punto de entrada al formulario".
3. **No contiene información de negocio.** No es una variante de precios ni una
   promoción estacional: los precios, ahorros y features viven en el array
   `plans`, que está **vivo** y no lo he tocado. El bloque era presentación pura
   (un botón y sus estilos).
4. **Lleva cuatro días y tres commits apagado** (`eda76c4` → `3812d59` →
   `484b6a3`) sin que nadie lo reactive, incumple `docs/conventions.md` §7
   ("código comentado por si acaso"; la única excepción tolerada son las
   secciones de `App.tsx`), y el backlog lo tipifica explícitamente como residuo
   (feature 26, detectada además por la review de la 23 como N1).

Se va **entero**, sin dejar un comentario "aquí había un CTA". Si alguien lo
quiere de vuelta, está íntegro en git:

```bash
git show eda76c4:src/components/sections/Pricing.tsx        # versión comentada
git show 587e9a3:src/components/sections/Pricing.tsx        # última versión ACTIVA, con el deep link
```

### Lo que sí levanto para un humano (no lo arreglo yo: sería otra feature)

Hoy **ninguna tarjeta de plan tiene botón**: el único CTA de la sección de
precios es el enlace de texto "Contactanos" del pie. Puede ser exactamente lo
que se quería, pero en una landing cuyo objetivo declarado es la captación de
leads (`docs/context.md` §1) merece una decisión explícita, no heredarse de un
commit "update". **Si se decide recuperar el CTA por tarjeta, es una feature
nueva** (diseño + copy + destino: modal de contacto vs. alta en
`app.maiabuilder.ai`), no una restauración mecánica de este comentario.

---

## 3. N4 — `background: 'primary.main'`

### Verificado en la fuente, no de oídas

`sx` solo traduce a la paleta las claves que declara su configuración. En
`node_modules/@mui/system/esm/styleFunctionSx/defaultSxConfig.js` y en
`esm/palette/palette.js` las entradas de color son exactamente tres:

| Clave `sx` | Propiedad CSS | `themeKey` |
|---|---|---|
| `color` | `color` | `palette` |
| `bgcolor` | `backgroundColor` | `palette` |
| `backgroundColor` | `backgroundColor` | `palette` |

**No existe una entrada `background`.** Al no estar en la configuración, la clave
cae sin transformar y Emotion la serializa literal.

### Verificado también en el CSS emitido

Reintroduje la clave a propósito un momento y capturé la regla que Emotion
inserta para el badge:

```css
.css-ip1ggx{ … border-radius:1200px;
             background:primary.main;      /* ← declaración inválida */
             background-color:#E8440A;     /* ← el bgcolor hermano, este sí pinta */
             color:#fff; font-size:11px; font-weight:700; }
```

Y el color computado del badge en Firefox, **antes y después** del cambio, es el
mismo: `backgroundColor: rgb(232, 68, 10)`, `backgroundImage: none`. Es decir, el
navegador descartaba `background: primary.main` (valor inválido) y el color
venía enteramente de `bgcolor`.

### La corrección

Quitar la clave inválida. **No** convertirla en otra cosa: `bgcolor:
'primary.main'` ya está en la línea siguiente y aporta el color; añadir un
`background` "arreglado" sería una declaración redundante que además volvería a
mezclar shorthand con `background-color`. Diff neto:

```diff
-                  px: 1.5, py: 0.5, borderRadius: 100, background: 'primary.main',
-                  bgcolor: 'primary.main', color: 'common.white', fontSize: 11, fontWeight: 700,
+                  px: 1.5, py: 0.5, borderRadius: 100,
+                  bgcolor: 'primary.main', color: 'common.white', fontSize: 11, fontWeight: 700,
```

El otro `background:` que queda en el archivo (línea 43, el
`linear-gradient(…var(--orange-xxl)…)` de la sección) es legítimo: es un string
CSS crudo, el caso 2 de `docs/conventions.md` §3.

---

## 4. Acceptance 4 — el grep de hex

```bash
grep -rnE '#[0-9a-fA-F]{3,8}' src/
```

Devuelve hoy **solo** esto, contrastado una a una con `progress/impl_23.md`:

| Resultado | ¿Justificado? |
|---|---|
| `src/theme/tokens.ts` (30 líneas) | Sí: es la **fuente de verdad** de los colores (impl_23 §2.1). Por definición los hex viven ahí. |
| `src/theme/__tests__/tokens.test.tsx` (28 líneas) | Sí: el test que **congela** esos valores (impl_23 §4). |
| `src/components/Navbar.tsx:8` `'#features'` | No es un color: es un ancla de scroll. Falso positivo del regex (`#fea`). |
| `src/components/Footer.tsx:6` `'#features'` | Ídem. |

**El `#fff` de `Pricing.tsx` —la excepción 1 de `impl_23.md` §2.5, el último hex
hardcodeado del repo— ha desaparecido con el bloque comentado.** No apareció
ningún hex nuevo fuera de esa lista, así que no hay nada que reportar por esta
vía.

Las otras dos excepciones de `impl_23.md` §2.5 (literales `rgba()` de marca y
sombras neutras) no aplican ya o quedan fuera: los `rgba()` de marca los cerró la
feature 25, y las sombras neutras (`rgba(0,0,0,0.04)` de la tarjeta no destacada)
no son hex ni duplican token alguno.

---

## 5. Acceptance 3 — el render no cambia (medido, no supuesto)

Arnés: Firefox headless + el proxy de retraso del evento `load` de la feature 24
(variante en el scratchpad, `i26_proxy.py`: retrasa `load` 7 s con un `<img>`
lento para que las animaciones `.reveal`/`.fade-up` estén asentadas, y reporta
por `fetch` la geometría y el color computado de la sección). Dev server en
`:5175`; el proceso ajeno de `:5174` no se tocó. Todos los PNG y scripts viven en
el scratchpad de la sesión, ninguno en el repo.

Método: capturar → aplicar el cambio → capturar, y comparar con
`PIL.ImageChops.difference(...).getbbox()` (`None` = cero píxeles distintos).
Para el "antes" a 360 px reconstruí el archivo previo, capturé y restauré,
comprobando por `md5sum` que el archivo volvía exactamente al estado nuevo.

| Comprobación | Resultado |
|---|---|
| **Determinismo del arnés**: 3 capturas seguidas sin tocar código, recorte de `Pricing` a 1440 px | `bbox=None` entre todas |
| **`Pricing` a 1440 px, antes vs después** (recorte `y ∈ [4650, 5590]`) | **`bbox=None`** |
| **Página entera a 360 px, antes vs después** (12 000 px de alto, incluye `Pricing` completo) | **`bbox=None`** |
| Geometría de la sección, antes vs después | idéntica: `pricingTop=4668`, `height=909`, `docHeight=8644` (1440 px); `7504 / 2145 / 14303` (360 px) |
| `backgroundColor` computado del badge "Más popular" | `rgb(232, 68, 10)` antes y después; `backgroundImage: none` |

**Una salvedad honesta sobre el 1440 px:** el diff de la página **entera** a
1440 px no da `None`, sino un rectángulo `(175, 716)-(1265, 1239)` — la franja
del carrusel del Hero. Ese mismo rectángulo aparece al comparar **dos capturas
consecutivas del mismo código**, así que es la no-determinación conocida del
Hero, no un efecto de este cambio. A 360 px ni siquiera eso: la página completa
sale idéntica al píxel. La sección `Pricing`, que es lo que toca esta feature,
sale idéntica en ambos anchos.

Capturas en
`…/scratchpad/i26shots/` (`pre_tall_*.png`, `post_tall_*.png`, `pre360.png`,
`post360.png`, y los recortes `pre_pricing.png` / `post_pricing.png`).

---

## 6. Tests

Nuevo: `src/components/sections/__tests__/Pricing.test.tsx` (5 tests).
`docs/verification.md` §5 no exige tests para una sección presentacional, pero el
acceptance 3 es una afirmación sobre el render y no quería que dependiera solo de
mis capturas: estos tests la dejan verificable en CI.

1. **`pinta el badge "Más popular" con el naranja de marca`** — `getComputedStyle`
   del badge = `rgb(232, 68, 10)`. Es el acceptance 3 en su punto crítico: prueba
   que el color lo aportaba el `bgcolor` y que sigue ahí sin el `background`.
2. **`no emite ningún path de paleta sin resolver en el CSS de la sección`** —
   ninguna regla emitida contiene `primary.main`. **Comprobé que este test falla
   con el código anterior** (`expected '.css-a0nkt9{…}' not to match
   /primary\.main/`), o sea que no es un test vacío: es el guardián de N4 y de
   cualquier reincidencia del mismo error en el archivo.
3. **`las cuatro tarjetas de plan siguen en pie tras la limpieza`** — borrar 28
   líneas de JSX dentro de un `.map()` es el momento típico para llevarse una
   llave de más.
4. **`no hay un CTA por tarjeta: el único de la sección es "Contactanos"`** — fija
   el estado real de la sección (§2) y comprueba con `userEvent` que el enlace
   superviviente sigue llamando a `onOpenContact`.
5. **`el switch anual muestra el precio con descuento y avisa al padre`** — el
   estado `isAnnual` se eleva a `App.tsx` (`docs/conventions.md` §5); esta era la
   única lógica no trivial del componente y no estaba cubierta.

Convenciones de `docs/verification.md` §4 respetadas: `ThemeProvider` con el tema
real, `userEvent` para la interacción, `vi.restoreAllMocks()` en `afterEach`,
test en un `__tests__/` hermano. **No hay `fetch` ni mock de `src/lib/api.ts`**:
este componente no habla con el backend.

---

## 7. Verificación final

```
npm test           → 15 archivos / 85 tests · exit 0   (antes 14/80: +1 archivo, +5 tests)
npm run typecheck  → exit 0
npm run build      → exit 0 (aviso esperado de chunk >500 kB)
```

Chunk de entrada **1 586,48 kB** (antes 1 586,50 kB). El bloque comentado no
viajaba al bundle —esbuild ya lo tiraba—, así que el ahorro real son los ~30
bytes de la declaración inválida: **la limpieza es de legibilidad, no de peso.**

Fuera del alcance y sin tocar, como pedía el encargo: `var(--black)` de
`Addons.tsx`, el contraste del `CTAFinal`, el desborde del admin a 360 px, y toda
la infraestructura (`package.json`, `vite.config.ts`, `tsconfig.json`,
`vercel.json`, `.gitignore`). Sin commit ni push. No se leyó ni escribió ningún
`.env*`.

## 8. Para el reviewer

1. **La decisión de borrar el bloque en vez de parar** está razonada en §2. Si el
   criterio del proyecto es que *cualquier* código comentado por un humano exige
   confirmación previa, este es el punto a discutir; mi lectura es que aquí no se
   pierde nada (git lo conserva y el deep link ya no estaba en él).
2. **El CTA por tarjeta ausente** (§2, último apartado) es una observación de
   producto que dejo levantada, no arreglada. Candidata a feature nueva si el
   líder la quiere dar de alta.
3. **Tests 4 y 5** rozan el borde del scope: el 4 documenta el estado tras la
   limpieza y el 5 cubre lógica del componente que ya existía. Si se considera
   scope creep, el 5 es el prescindible.
4. `docs/verification.md` §1 sigue diciendo «13 archivos, 75 tests»; con esta
   feature son **15 / 85**. No lo he tocado por no salirme del scope.
