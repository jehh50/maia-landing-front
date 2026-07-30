APROBADO

# Review — feature 27: Andamiaje admin para usuarios, imágenes y precios

**Veredicto:** APPROVED (APROBADO) · Revisor: agente `reviewer` · Fecha: 2026-07-29

Los 6 acceptance criteria se cumplen y verifican. Dos hallazgos **menores y no
bloqueantes** al final (§Hallazgos): documentación desactualizada en
`docs/architecture.md` y un límite real —medido— del alcance del test nuevo. Ninguno
de los dos incumple un criterio de `CHECKPOINT.md`, ninguno de los dos es scope de
la 27, y ninguno de los dos justifica devolver la feature.

---

## 1. Verificación ejecutada (por mí, no heredada del informe)

| Comando | Resultado |
|---------|-----------|
| `npm test` | **exit 0 — 15 archivos / 86 tests**, 0 fallos, 0 skipped (58 s) |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, 1741 módulos, aviso `Some chunks are larger than 500 kB` (esperado, no cuenta) |

Chunks nuevos emitidos, uno por vista perezosa — prueba de que los `import()` son
analizables por Rollup:

```
dist/assets/ImagesGrid-BOZciv22.js   0.40 kB │ gzip: 0.32 kB
dist/assets/PricesList-CKlk5EiD.js   0.41 kB │ gzip: 0.33 kB
dist/assets/UsersList-CUlatpAJ.js    0.42 kB │ gzip: 0.33 kB
dist/assets/index-CG5gF4cx.js    1 586.87 kB   (entrada, +0,39 kB)
dist/assets/AdminLayout-C7mz6tZx.js  5.52 kB   (+0,13 kB)
```

Coincide con lo reportado por el implementer y por el líder. C1 y C3 verdes.

## 2. Acceptance criteria, uno a uno

| # | Criterio | Veredicto | Evidencia |
|---|----------|-----------|-----------|
| 1 | Rutas `/admin/users`, `/admin/images`, `/admin/prices` con `React.lazy`, ruta literal, envueltas en `AdminPage`, comodín `*` último | **Cumple** | `src/AppRoutes.tsx:30-32` (tres `lazy` con string literal, nada calculado), `:72-74` (una `<AdminPage>` por ruta, no una compartida), `:76` `<Route path="*">` es la **última** ruta del `<Routes>` y queda fuera del `</Route>` del admin (`:75`). Los tres chunks del build confirman la analizabilidad |
| 2 | `NAV_ITEMS` añade Usuarios, Imágenes y Precios con `end: false` | **Cumple** | `src/admin/AdminLayout.tsx:10-12`; los tres con `end: false`, `Inicio` sigue siendo el único `end: true` (`:7`) |
| 3 | `AdminLayout.test.tsx` se actualiza (el `toEqual` viejo congelaba 3 ítems) | **Cumple, y reforzado** | `src/admin/__tests__/AdminLayout.test.tsx:37-39`: sigue siendo `toEqual` sobre la **lista completa y ordenada** de 6 labels. Ver §4 |
| 4 | Un componente mínimo por recurso con su título, que renderiza sin errores | **Cumple** | `src/admin/users/UsersList.tsx`, `src/admin/images/ImagesGrid.tsx`, `src/admin/prices/PricesList.tsx`. Ver §5 |
| 5 | Un test cubre que las tres rutas montan bajo la guardia sin desmontar el sidebar, siguiendo el patrón de `AppRoutes.test.tsx:113-142` | **Cumple** (con el límite medido de §6) | `src/__tests__/AppRoutes.test.tsx:144-164` |
| 6 | No se toca `src/lib/api.ts` | **Cumple** | Ver §7 |

## 3. `AppRoutes.tsx` — los tres puntos que pediste mirar en la fuente

1. **`import()` literal.** `:30-32` son tres literales de string
   (`'./admin/images/ImagesGrid'`, `'./admin/prices/PricesList'`,
   `'./admin/users/UsersList'`). Cero interpolación, cero variable, cero mapa de
   rutas calculado. Es el patrón exacto de `:21-29`.
2. **`AdminPage` individual por ruta.** `:72-74` — cada `element` es
   `<AdminPage><X /></AdminPage>`, no hay un `<AdminPage>` que envuelva varias
   rutas ni un `<Suspense>` reaprovechado. El límite queda en la posición del
   `<Outlet />`, que es lo que mantiene montada la guardia y el sidebar.
3. **Comodín último.** `:76` es la última línea antes de `</Routes>` (`:77`). Las
   tres rutas nuevas van dentro del `<Route path="/admin">` y cierran en `:75`, o
   sea **antes** del comodín. Ningún path nuevo queda a la sombra del `*`, y el `*`
   no queda a la sombra de nada.

## 4. `AdminLayout.test.tsx` — el test **no** está degradado

Confirmado, y es el punto que más miré:

- `:36-39` sigue siendo `expect(links.map(l => l.textContent)).toEqual([...])` con
  las **seis** etiquetas en orden. **No** es `toContain`, ni
  `expect.arrayContaining`, ni un `toHaveLength`, ni un subconjunto. Si mañana
  alguien añade, quita o reordena un ítem de `NAV_ITEMS`, este test rompe — que es
  exactamente la propiedad que tenía el `toEqual` viejo.
- Además **añadió** tres aserciones que antes no existían: `:43-45` congelan el
  `href` de Imágenes, Precios y Usuarios. El test acabó **más** estricto que antes
  (3 labels → 6 labels + 6 hrefs), no menos.
- Los otros dos tests del archivo (`:48-54` ítem activo, `:56-61` sin ítems
  "próximamente") siguen intactos y en verde.
- El helper `renderAt` (`:12-26`) no declara stubs para las rutas nuevas. Correcto:
  ningún test de este archivo navega a ellas, y `NavLink` no necesita que la ruta
  destino exista para pintar su `href`. Añadirlas sería ruido, como argumenta el
  informe §4.5.

## 5. Los tres componentes de anclaje son mínimos de verdad

Los tres son idénticos en estructura: `Box` > `Typography variant="h5"
fontWeight={700} sx={{ mb: 3 }}` con el título + `Typography variant="body2"
color="text.secondary"` con el copy de «en construcción». 20-21 líneas cada uno.

Comprobado por grep sobre `src/admin/{users,images,prices}`:

- **Cero `fetch`**, cero import de `src/lib/api.ts`, cero `useState`/`useEffect`,
  cero mock, cero tabla, cero diálogo. **No adelantan nada de las features 28-30.**
- Cero hex hardcodeados, cero `rgba()`, cero `var(--…)`: solo tokens del tema
  (`color="text.secondary"`) y la escala de spacing de MUI. Cumple `conventions.md` §3.
- `PascalCase.tsx`, un componente por archivo, `export default function`, sin
  `React.FC`, sin props ni `any`. Carpeta por recurso, replicando `admin/leads/` y
  `admin/articles/`. Cumple `conventions.md` §1 y §2.
- El JSDoc de cada uno nombra la feature que lo reescribirá (28/29/30). No hay
  `// TODO` suelto, así que no dispara `conventions.md` §7 / C9.
- El título copia el patrón de `LeadsList.tsx`, así que `getByRole('heading')` los
  encuentra igual que las pantallas existentes: el punto de anclaje es usable por
  los tests de las 28-30 sin tocarlo.

## 6. El test nuevo de `AppRoutes.test.tsx` — qué verifica y qué no (medido, no razonado)

Lo que hace (`src/__tests__/AppRoutes.test.tsx:144-164`): monta `/admin` con sesión,
captura la `<nav>` **una vez** (`:147`), y por cada sección hace clic en su enlace,
espera el `heading` del chunk perezoso (`:159`) y comprueba
`expect(screen.getByRole('navigation', …)).toBe(nav)` (`:162`).

**Confirmado: es el mismo nodo del DOM, no "alguna nav".** `toBe` sobre la
referencia capturada es estrictamente más fuerte que el `toBeInTheDocument()` del
test vecino (`:138`, `:141`). Cubre el acceptance 5 y la fila «routing nuevo y
guardias de acceso» de `verification.md` §5.

**Pero no falla si se rompe el `<Suspense>` por hijo.** Lo probé, no lo razoné.
Monté en un archivo de prueba temporal (ya borrado, `git status` limpio) una réplica
de la tabla de rutas **sin** `AdminPage`, con `lazy` fresco por pasada para que el
caché de `lazy()` no falsee el resultado, y medí el DOM en mitad de la suspensión:

| Variante | En mitad de la suspensión | Tras resolver |
|----------|---------------------------|---------------|
| **Con** `AdminPage` | `queryAllByRole('navigation')` = **1** (sidebar visible), fallback interno `role=status` presente | mismo nodo |
| **Sin** `AdminPage` | `queryAllByRole('navigation')` = **0** (React oculta el layout con `display:none` y muestra el fallback **exterior**), pero el nodo **sigue en `document.body`** | **mismo nodo** |

Consecuencia: React 18 no destruye el subárbol al re-suspender, lo **oculta** y lo
vuelve a revelar con los mismos nodos. Como el test asierta **después** de que el
`findByRole('heading')` resuelva, tanto `toBe(nav)` como `expect(nav).toBeInTheDocument()`
pasan igual con `AdminPage` y sin él: la réplica sin `AdminPage` pasó el bucle
completo en verde.

**Por qué no es motivo de rechazo:**

- El acceptance 5 pide literalmente «sin desmontar el sidebar, **siguiendo el
  patrón de `AppRoutes.test.tsx:113-142`**». El implementer siguió el patrón
  mandado y lo endureció; la propiedad "no se remonta" sí queda verificada.
- El límite es de las semánticas de `<Suspense>` en React 18, no de la
  implementación: lo hereda el test de la feature 22, que se aprobó con la misma
  cobertura. Cazar la regresión exige asertar **dentro** de la ventana de
  suspensión (retardar el `lazy` y comprobar que hay 1 nav mientras el fallback
  está en pantalla), un arnés que hoy no existe en el repo y que ninguna
  convención pide.
- El informe §2 no afirma que el test detecte un `AdminPage` roto; afirma que
  distingue «el sidebar sigue ahí» de «se destruyó y se volvió a crear». Eso es
  cierto tal como está escrito.

Queda como sugerencia para quien endurezca el arnés (H2), no como deuda de la 27.

## 7. Scope — `src/lib/api.ts`, landing e infraestructura

**`src/lib/api.ts`: intacto, verificado por tres vías independientes.**

1. **mtime:** `2026-07-27 23:28`. La ventana de trabajo de la feature 27 es
   `2026-07-29 23:39-23:46`. No está dentro: está **dos días antes** (corresponde a
   la feature 20). Ojo, líder: tu nota decía «23:28 cae dentro de la ventana» — la
   hora coincide, el día no.
2. **Contenido:** `git diff --stat` da `67 insertions(+), 1 deletion(-)`, y el diff
   completo es **solo** el bloque `normalizeApi` de la feature 20 (`ApiSuccess`,
   `ApiFailure`, `ApiOutcome`, `GENERIC_API_ERROR`, `readErrorMessage`,
   `normalizeApi`) más la única línea borrada, que es `interface ApiResult<T>` →
   `export interface ApiResult<T>`, necesaria para la firma de `normalizeApi`.
3. **Superficie exportada:** los mismos 12 helpers de función que antes
   (`postLead`, `normalizeApi`, `login`, `logout`, `getMe`, `listAdminLeads`,
   `getAdminLead`, `listAdminArticles`, `getAdminArticle`, `createAdminArticle`,
   `updateAdminArticle`, `deleteAdminArticle`, más `listPublicArticles` y
   `getPublicArticleBySlug`). `grep -niE "user|image|price|imagen|precio"` no
   devuelve **ni un** helper, tipo o endpoint de los tres recursos nuevos: solo
   `AdminUser` y `/api/auth/me`, que ya existían.

Tu conclusión se confirma: **el implementer no metió nada en `api.ts`.** Acceptance 6
cumplido.

**El resto del scope, por mtime en la ventana `29-jul 23:39-23:46`:**

```
src/AppRoutes.tsx                        23:42
src/admin/AdminLayout.tsx                23:42
src/admin/users/UsersList.tsx            23:42   (nuevo)
src/admin/images/ImagesGrid.tsx          23:42   (nuevo)
src/admin/prices/PricesList.tsx          23:42   (nuevo)
src/admin/__tests__/AdminLayout.test.tsx 23:43
src/__tests__/AppRoutes.test.tsx         23:43
docs/architecture.md · docs/verification.md · feature_list.json · progress/*
```

Son **exactamente** los 7 archivos del campo `files` de la feature 27, ni uno más.
`find src -newermt` no encuentra ningún otro archivo de `src/` tocado.

- `src/components/sections/Pricing.tsx`: `28-jul 11:18` (feature 26). Intacto.
- `src/admin/AdminHome.tsx`: `26-may 23:34`. **No tocado**, correcto (ver H3).
- `src/admin/AdminGuard.tsx`: `26-may 23:34`. Intacto; las rutas nuevas quedan
  protegidas por anidamiento.
- Infraestructura: `git diff --stat package.json tsconfig.json vite.config.ts
  vercel.json index.html .gitignore` → **salida vacía**. mtimes de mayo/junio.
  Cero dependencias nuevas.
- Deuda ajena no tocada: `ArticlesList.tsx` sigue sin migrar a `normalizeApi`,
  `App`/`LegalPage`/`NotFound` siguen con import estático, el doble `useReveal`
  sigue ahí. C10 limpio.

## 8. Las dos decisiones de §4 que pediste validar como revisor

**(a) «Imágenes» con tilde, contra el «Imagenes» de `feature_list.json` → decisión
correcta, la valido.** No es cuestión de gusto y se puede comprobar: el archivo
`feature_list.json` completo tiene **un solo** carácter acentuado en sus ~17 kB,
mientras acumula «anade», «comodin», «minimo», «seccion», «tamano», «busqueda»,
«borrado con Dialog de confirmacion»… Es un artefacto de codificación del archivo,
no una decisión de copy: el propio JSON escribe «imagenes» en el `name` de la
feature 29, que nadie defendería como label de UI. En el lado opuesto,
`conventions.md` §6 manda copy en español y el panel ya escribe «Cerrar sesión» y
«Navegación admin» con tilde (`AdminLayout.tsx:57-96`). Poner «Imagenes» en el
sidebar habría sido una falta de ortografía en producción para respetar un mojibake.
El acceptance 2 pide que el ítem exista en `NAV_ITEMS` con `end: false`, y eso se
cumple.

**(b) Un test con bucle para las tres rutas en vez de tres tests → aceptable, la
valido.** Motivos objetivos, no de estilo:

- **Es el patrón del repo, no una invención.** `components/sections/__tests__/Pricing.test.tsx:49`
  (`for (const plan of ['Starter','Team','Growth','Enterprise'])`) y
  `theme/__tests__/brandAlpha.test.tsx:69` ya recorren casos homogéneos dentro de un
  único `it`. No hay convención que exija un `it` por caso.
- Ni `CHECKPOINT.md` C2 ni `verification.md` §5 cuentan tests: exigen que **cada
  punto del acceptance** tenga verificación. El acceptance 5 es **un** punto («las
  tres rutas nuevas montan bajo la guardia»), y las tres rutas comparten un
  contrato idéntico.
- El coste que evita es real: montar el árbol completo del admin ronda 1 s por
  render en jsdom; el archivo entero (8 tests) tarda ~5 s.
- El diagnóstico no se pierde: cada iteración consulta por el label
  (`getByRole('link', { name: 'Precios' })`) y por el heading, así que el mensaje de
  fallo identifica la sección.
- **Único peaje, y lo asumo:** un fallo en «Imágenes» corta el `it` y deja Precios y
  Usuarios sin ejecutar, así que no hay señal independiente por sección. Con tres
  rutas de contrato idéntico es un precio razonable; si el bucle creciera a 6-8
  casos heterogéneos, la recomendación cambiaría a `it.each`.

## 9. Checkpoints (C1-C11)

- **C1** `[x]` — `npm test` exit 0, 15 archivos / 86 tests, ningún test previo roto (85 → 86, +1).
- **C2** `[x]` — cada punto del acceptance tiene verificación: 1 → `AppRoutes.test.tsx:144-164` + los 3 chunks del build; 2 y 3 → `AdminLayout.test.tsx:37-45`; 4 → los `findByRole('heading')` de `:159`; 5 → el test nuevo; 6 → constraint negativa, comprobada por inspección (`verification.md` §5 no pide test para "no tocar un archivo").
- **C3** `[x]` — `typecheck` exit 0, `build` exit 0; el aviso de chunk >500 kB es el esperado.
- **C4** `[x]` — `conventions.md` §1 (PascalCase, carpeta por recurso en `src/admin/`, tests en `__tests__/` hermano), §2 (cero `any`, cero variables sin usar — lo prueba `noUnusedLocals` en verde), §3 (cero hex, cero `rgba()` a mano, solo tokens y spacing de MUI).
- **C5** `[x]` — cero `fetch` fuera de `src/lib/api.ts` (grep sobre las tres carpetas nuevas: 0 resultados), sin state manager ni librería de fetching nueva, sin tipos duplicados (los componentes no declaran ninguno).
- **C6** `[x]` — n/a bien resuelto: no se consume ni se declara ningún endpoint, `docs/api-contract.md` no necesitaba cambio y no se tocó.
- **C7** `[x]` — `feature_list.json` id 27 en `in_progress` (correcto: el implementer no se autoaprueba), `progress/current.md` documenta plan, bitácora, verificación con cifras, bloqueos («ninguno») y observaciones fuera de scope.
- **C8** `[x]` — ningún `.env` leído ni escrito; «Variables de entorno necesarias: Ninguna» en `current.md`; ningún valor de secreto en los informes.
- **C9** `[x]` — grep sobre los 7 archivos: cero `console.log`/`console.debug`, cero `TODO`/`FIXME`, cero código comentado "por si acaso", cero `.orig`/`.bak`. `git status` sin residuos de la feature (verifiqué también que mis propios archivos de prueba temporales quedaron borrados).
- **C10** `[x]` — 7 archivos de `src/` en la ventana, exactamente los del campo `files`. Ninguna deuda de `architecture.md` §10 arreglada de paso.
- **C11** `[x]` — `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `.gitignore`, `index.html`: diff vacío.

*(Nota sobre `tsconfig.tsbuildinfo`, que aparece como `M`: es un artefacto de build ya
modificado antes de esta sesión y que mi propio `npm run build` vuelve a tocar. No lo
introduce la feature 27 y no es infraestructura en el sentido de C11; solo recordar
`conventions.md` §8: no commitearlo.)*

## Hallazgos (ninguno bloqueante)

**H1 — `docs/architecture.md` queda desactualizado en tres sitios que esta feature
cambió.** Menor, pero real: el documento se autodeclara «la referencia técnica
vigente» (`:314`) y es lo que leerá quien tome las features 28-30.

- `docs/architecture.md:72-78` — el mapa de `src/admin/` lista `leads/` y
  `articles/`; faltan `users/`, `images/` y `prices/`, que ya existen.
- `docs/architecture.md:94-107` — la tabla de rutas no incluye `/admin/users`,
  `/admin/images` ni `/admin/prices`.
- `docs/architecture.md:111` — la enumeración de componentes con `React.lazy`
  termina en `ArticleEdit`; faltan los tres nuevos.
- `docs/architecture.md:9` — «Panel de administración privado para leads y
  artículos», ya incompleto.

El implementer **sí** actualizó lo que el manual le pedía explícitamente (§8:
conteo 85 → 86, `docs/verification.md` §1-§2 con histórico), así que no es
negligencia: es que ni `CHECKPOINT.md` ni `explore_admin_patterns.md` §6.3 exigen
más que el conteo, y `architecture.md` no está en el campo `files` de la feature 27.
Por eso **no bloqueo**: C7 se refiere a `feature_list.json` y `current.md`, y ambos
están al día. Recomendación al líder: es un cambio de cuatro líneas, y el mejor
momento es **ahora** (mientras el andamiaje está fresco) o en la misma feature de
copy que ya hace falta para `AdminHome` (H3).

**H2 — Sugerencia para endurecer el arnés (no de esta feature).** Si se quiere un
test que **sí** rompa al quitar un `AdminPage`, hay que asertar dentro de la ventana
de suspensión, no después: retardar el `lazy` y comprobar
`queryAllByRole('navigation', …)` = 1 mientras el fallback está en pantalla (con
`AdminPage` da 1; sin él da 0, medido en §6). Es una feature de arnés por su cuenta,
no algo que se le pueda pedir a la 27.

**H3 — Confirmo la lectura del implementer en su §6.a.** `AdminHome.tsx:18` queda
**incompleto** con seis secciones pero no es falso, y `AdminHome.tsx:26-32` («la
sección de Leads y el mantenedor del blog llegarán en las próximas iteraciones») ya
era **falso antes** de esta feature: ambas existen desde las features 19-20, y el
archivo no se ha tocado desde el 26 de mayo. Es deuda de copy preexistente; tocarla
aquí habría sido una infracción de C10. **Hizo lo correcto al no tocarla** y al
reportarla. Su recomendación (feature pequeña de copy para `AdminHome` cuando cierren
las 28-30, reescribiendo el bloque «Próximos pasos» entero, incluida la mención a
`node scripts/create-user.js` que la 28 va a sustituir por UI) es sensata y la
suscribo; agrupar ahí H1 sería eficiente.

## Detalle de los fallos

Ninguno. No hay incumplimientos de `CHECKPOINT.md` C1-C11 ni de los acceptance
criteria de la feature 27. La feature puede pasar a `done`.
