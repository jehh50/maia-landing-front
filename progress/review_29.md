**Veredicto: RECHAZADO** (`CHANGES_REQUESTED`)

# Review — feature 29: Vista admin de imágenes (maqueta con datos mock)

Revisor: reviewer. Fecha: 2026-07-30. Commit revisado: `339752c` (rama `feat/admin-cruds`).
Informe del autor: `progress/impl_29.md` (leído entero).

> **Resumen en una línea.** La fidelidad al contrato — que es el punto crítico de esta
> feature — es **impecable**: 9 campos exactos, sin `bytes`, enum de dos valores, sin
> paginación, orden `orden ASC, id ASC`, `PATCH` limitado a tres campos y ausencia total
> de «reemplazar imagen». El rechazo es por **C2**: dos cláusulas del `acceptance` que son
> alcanzables desde la UI no tienen ningún test. Son ~15 líneas de test, no un rediseño.

---

## 1. Verificación ejecutada (repetida por el revisor, no copiada del informe)

| Comando | Resultado |
|---------|-----------|
| `npm test` | **exit 0** — 17 archivos / **106 tests** (baseline previo 16 / 96) |
| `npm run typecheck` | **exit 0** |
| `npm run build` | **exit 0** — `ImagesGrid-DTAz6RrB.js` 15,26 kB; aviso `Some chunks are larger than 500 kB` **esperado**, no es fallo |
| `npx vitest run src/admin/__tests__/ImagesGrid.test.tsx` | **exit 0** — 10/10 |

Las cifras del informe (§6, §7) coinciden con lo que mido yo. Ningún test previo roto.

### 1.1 Prueba de mutación — los tests de rechazo **no** son decorado

Encargo explícito del líder. Copié el árbol a un scratchpad, neutralicé las dos guardas
de `validateImageFile` (`mockImages.ts:180` tipo y `:193` tamaño) con `if (false && …)` y
volví a correr el archivo de test:

```
× rechaza en cliente un archivo de tipo no permitido y no ofrece SVG en el accept
× rechaza en cliente un archivo que excede los 5 MB
Tests  2 failed | 8 passed (10)
```

**Los dos fallan.** No son aserciones tautológicas. Mérito adicional del autor: el test de
tipo usa `userEvent.setup({ applyAccept: false })` (`ImagesGrid.test.tsx:90`) — sin eso el
propio `userEvent` descartaría el SVG por el atributo `accept` y el test verificaría a
`userEvent`, no a nuestro código. Está bien razonado y bien comentado.

---

## 2. Los 8 acceptance criteria, uno a uno

| # | Acceptance | Implementado | Verificado |
|---|---|---|---|
| 1 | Galería por sección con filename, alt, orden, tamaño y fecha + estados carga/error/vacío | **Sí** (`ImagesGrid.tsx:279-376`; carga `:275-277`, error `:273`, vacío `:288-291`) | **Parcial** — ver §3.1 |
| 2 | Formulario de subida fiel al contrato (`accept`, 5 MB, `seccion` obligatoria, `alt` máx 300, `orden` entero ≥ 0) | **Sí** (`ImageUploadDialog.tsx:126-197`) | **Parcial** — ver §3.2 |
| 3 | La UI **no** ofrece «reemplazar imagen», y el copy lo explica | **Sí** | **Sí** |
| 4 | Edición solo de `alt`, `orden` y `seccion` | **Sí** | **Sí** |
| 5 | Borrado con `Dialog` de confirmación | **Sí** | **Sí** |
| 6 | Mock propio, `TODO(feature-29)`, 9 campos de `META_COLS`, sin `bytes` | **Sí** | **Sí** (typecheck + lectura) |
| 7 | No se toca `src/lib/api.ts` ni se construye URL contra el backend | **Sí** | **Sí** |
| 8 | Tests: galería, filtro, rechazo por tipo, rechazo por >5 MB | **Sí** | **Sí** (los 4, mutados y caídos) |

Detalle de los que están bien y no vuelvo a mencionar:

- **3 — sin «reemplazar imagen».** No existe ningún control de archivo en la edición y el
  test lo fija por tres vías (`ImagesGrid.test.tsx:169-170`: ni botón `/reemplazar/i` ni
  `Archivo de imagen`). El copy aparece **dos veces**, como pide el acceptance: en el
  subtítulo de la pantalla (`ImagesGrid.tsx:247-251`) y dentro del diálogo de edición
  (`:112-115`, «El archivo no se puede reemplazar… sube la nueva y borra esta»). Ambos
  explican el *porqué* operativo, no solo la prohibición. **Cumplido de sobra.**
- **4 — edición limitada.** `MockImagePatch` (`mockImages.ts:97-101`) tiene exactamente
  `alt?`, `orden?`, `seccion?`; `ImageEditDialog` (`ImagesGrid.tsx:78-82`) manda esos tres y
  nada más. El typecheck impide colar un cuarto campo.
- **5 — borrado.** `Dialog` de confirmación (`ImagesGrid.tsx:387-404`) con el copy del
  borrado físico sin papelera; tests de cancelar (no borra) y confirmar (borra).
- **8 — los cuatro tests exigidos**, más seis: subida válida, `orden` inválido, edición sin
  reemplazo, cancelar, confirmar y rol editor.

---

## 3. Los dos huecos que motivan el rechazo (C2)

### 3.1 Acceptance 1 — el **estado vacío** no se ejerce en ningún test

`src/admin/images/ImagesGrid.tsx:288-291` pinta «Sin imágenes en esta sección.». Grep sobre
`src/admin/__tests__/ImagesGrid.test.tsx`: la cadena **no aparece**, y ninguno de los 10
tests deja una sección a cero. El test de borrado (`:202-214`) elimina `hero-3.png`, pero
Hero conserva los ids 1 y 2. Esa rama nunca se renderiza.

Es reachable y trivial de cubrir: borrar `maia.png` (id 4, la única de `cta_final`) y
afirmar el texto. Y hay **precedente directo en la feature hermana**, aprobada ayer:
`src/admin/__tests__/UsersList.test.tsx:71` — «muestra el estado vacío cuando la búsqueda
no encuentra nada». La 28 y la 29 tienen la misma cláusula en el acceptance; la 28 la
testeó, la 29 no.

**No exijo test de `carga` ni de `error`**, y quiero dejar por escrito por qué, para que no
se lea como un olvido mío:

- `error` (`:273`) es hoy **inalcanzable desde la UI**: `listMockImages` solo falla con una
  `seccion` fuera del enum (`mockImages.ts:229`) y el `<TextField select>` no puede
  producirla; `deleteMockImage` solo falla con un id inexistente (`:288`). Probarlo obligaría
  a inyectar un fallo en el mock. La rama es correcta como forma que sobrevive al cableado.
- `carga` es un `CircularProgress` transitorio que se resuelve en el mismo tick del `await`.

Lo que pido es **solo el estado vacío**.

### 3.2 Acceptance 2 — «`seccion` (obligatorio)» no tiene test, y sí es alcanzable

`ImageUploadDialog.tsx:82` (`if (!seccion) next.seccion = 'seccion requerida';`) reproduce
el `422 { error: "seccion requerida", field: "seccion" }` del contrato. Ese camino se
alcanza en el flujo **por defecto**: `filtro` arranca en `''` (`ImagesGrid.tsx:184`), se
pasa como `seccionInicial` (`:380`), el diálogo abre con `seccion=''` (`ImageUploadDialog.tsx:36,47`)
y un usuario que sube sin filtrar y no toca el select se come el error. Los cinco tests que
usan el diálogo eligen sección a mano o dan por buena la del filtro, así que la validación
obligatoria nunca se ejerce.

Un test: abrir «Subir imagen» sin filtrar, cargar el PNG válido, pulsar «Subir», afirmar
`seccion requerida` y que la tarjeta no aparece.

> Cláusula menor de la misma bala, **no bloqueante**: `alt` máx 300 se garantiza solo con el
> atributo `maxLength` (`:185`) y la guarda de `:83`; ninguna de las dos se testea. Lo dejo
> como recomendación, no como condición para aprobar.

`docs/verification.md` §5 marca «Formularios, flujos de admin, estados de carga/error» como
**test obligatorio**, y el `acceptance` nombra las dos cosas de forma explícita. Por eso
C2 va a `[ ]`, y C2 es rechazo automático según `CHECKPOINT.md`.

---

## 4. Fidelidad al contrato real — revisada campo a campo (lo mejor de la entrega)

Contrastado contra `docs/api-contract.md` §10.2 y `progress/explore_backend_cruds.md` §2.

**Los 9 campos, exactos.** `MockImage` (`mockImages.ts:63-73`) declara `id`, `seccion`,
`filename`, `mime_type`, `size_bytes`, `alt`, `orden`, `created_at`, `updated_at`. Ni uno
más, ni uno menos. **`bytes` no aparece en ningún archivo de la feature** — verificado por
grep. Tampoco se inventa un campo `url`, que es el error fácil aquí: la preview vive en una
función aparte (`mockPreviewUrl`, `:148-150`) precisamente para no contaminar la fila. Es la
decisión correcta y está justificada en el informe §4.

**`seccion` = enum de dos valores.** `SECCIONES` (`:35-38`) con `as const` y
`type Seccion = (typeof SECCIONES)[number]['value']` (`:40`) — tipo **derivado**, no
duplicado, que es el patrón que exige `conventions.md` §2 y C5. Añadir `'hero'`/`'cta_final'`
a mano en una unión habría sido la forma perezosa. `SECCION_ERROR` (`:59`) se construye desde
el mismo catálogo, así que el mensaje del backend («Valores válidos: hero, cta_final») no se
puede desincronizar.

**Listado sin paginación y orden fijo.** `MockImagesList = { rows }` (`:76-78`), sin `total`
ni `limit`/`offset`; `ordenar()` (`:224-226`) implementa `a.orden - b.orden || a.id - b.id`,
que es literalmente `ORDER BY orden ASC, id ASC`. No se pinta `TablePagination` en ninguna
parte, y el `doc comment` de `ImagesGrid.tsx:173-174` deja dicho por qué.

**Edición limitada a `alt`, `orden`, `seccion`.** Ya cubierto en §2. Además `alt: alt.trim() || null`
(`ImagesGrid.tsx:79`) respeta el «`null` explícito lo borra» del contrato, y el `helperText`
de `:123` se lo dice al usuario («Déjalo vacío para borrarlo»).

**Detalles que no pedía nadie y que ahorran trabajo al cablear:**

- Mensajes de error **copiados literalmente** del backend: `'seccion requerida'`,
  `'orden debe ser un entero >= 0'`, `'Nada que actualizar: se esperaba alt, orden o seccion'`,
  `'Imagen no encontrada'`, `Tipo de archivo no permitido. Formatos aceptados: …`.
- `MockResult<T>` (`:84-86`) imita `ApiSuccess | ApiFailure` con `field?`, incluido el
  `field` que hoy `normalizeApi` todavía no propaga (feature 31 del backlog).
- `parseOrden('')` → `0` (`:203-208`), que es el «cadena vacía = ausente → default 0» del POST.
- `sanitizeFilename` (`:211-215`) reproduce el saneado del `originalname` (basename, sin
  comillas ni caracteres de control, 255).
- El `TODO(feature-29)` de `:25-31` anticipa las dos trampas del cableado: `id` `BIGSERIAL`
  que `pg` puede devolver como string, y la preview que pasará a `/api/images/:id/raw`.

**Nota menor (informativa).** `createMockImage` guarda `mime_type: input.file.type`, el MIME
*declarado*; el backend guarda el **detectado por magic bytes** (`explore_backend_cruds.md` §2.3).
En el navegador no hay forma de hacerlo mejor y el diálogo lo advierte en el copy
(`ImageUploadDialog.tsx:156-157`). No es un fallo; solo conviene que no sorprenda después.

---

## 5. «No ofrecer reemplazar» y validación en cliente

**Reemplazo: ausente y explicado.** Ver §2, punto 3. Cumple el acceptance en la letra y en
el espíritu (el copy dice *qué hacer en su lugar*, no solo que no se puede).

**Tipo:** `ACCEPTED_MIME_TYPES = ['image/png','image/jpeg','image/webp']` (`mockImages.ts:43`),
`accept={ACCEPTED_MIME_TYPES.join(',')}` (`ImageUploadDialog.tsx:131`). **SVG no aparece en
ningún sitio**, y el test lo congela con string exacto (`ImagesGrid.test.tsx:96`), así que
añadirlo por descuido rompe la suite. El copy explica el motivo («El SVG no se admite por
seguridad», `:155-156`) — bien, porque es una decisión de seguridad, no un capricho.

**Coherencia extensión↔MIME** (`mockImages.ts:186-192`): valor añadido, evita un 415 gratuito.

**Tamaño:** `MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024` (`:53`), comprobado en `:193`. El test
usa `Object.defineProperty(file,'size',{value: 6*1024*1024})` (`ImagesGrid.test.tsx:38`)
en vez de reservar 6 MB de verdad: correcto y barato.

Ambas validaciones corren **dos veces** — al elegir archivo (`onPickFile`, `:65`) y al
enviar (`onSubmit`, `:80`) — y `createMockImage` las repite (`:237`), que es donde vivirá el
415/413 real. Bien estratificado.

---

## 6. Maqueta aislada — confirmado

Grep de `fetch|API_BASE|http` sobre los cuatro archivos: **cero llamadas**. Las tres
apariciones de `${API_BASE}/api/images/…` son **comentarios** (`mockImages.ts:31` y `:143`,
dentro de bloques `/** */`) que documentan la URL futura, más una mención en prosa en
`ImagesGrid.tsx:170`. **Confirmo la lectura del líder.** El único `fetch` del test es el
espía de `beforeEach` (`:44`) cuyo propósito es la aserción `expect(globalThis.fetch).not.toHaveBeenCalled()`
(`:69`) — es decir, la ausencia de red está *testeada*, no solo prometida.

De `src/lib/api.ts` se importa **solo el tipo** `AdminUser` (`ImagesGrid.tsx:12`, `import type`),
que no genera runtime. Las previews salen de `public/`: `mockPreviewUrl` devuelve
`/${filename}` para los cuatro estáticos que ya existen (`hero.png`, `hero-2.png`,
`hero-3.png`, `maia.png`) y `null` para lo subido en sesión, que se pinta con «Vista previa
no disponible» (`ImagesGrid.tsx:334-339`). Verifiqué que los cuatro archivos existen en
`public/`. Evitar `URL.createObjectURL` fue buena decisión: jsdom no lo implementa.

**Separación de la capa de datos:** las cuatro funciones `async` de `mockImages.ts` devuelven
`MockResult<…>` con la misma envoltura que la API (`{ rows }`, `{ image }`) y ningún
componente asume el almacén en memoria. Sustituirlas por helpers de `lib/api.ts` es cambiar
cuatro imports y el TODO lo dice. **No es una reescritura.** Objetivo cumplido.

---

## 7. Estilos, responsive y accesibilidad

**Estilos — limpio.** Grep de hex sobre `src/admin/images/`: **cero**. Grep de `className`:
**cero**. Todo por `sx` + tokens (`surface.soft`, `divider`, `text.secondary`, `text.disabled`,
`error.main`, `primary`). Un solo color con opacidad, con `alpha()` sobre el token, en un
string CSS crudo: `boxShadow: \`0 4px 16px ${alpha(tokens.brand.orange, 0.1)}\``
(`ImagesGrid.tsx:312`) — exactamente el caso 4 de `conventions.md` §3. El único import
directo de `tokens` es `style={{ color: tokens.text.disabled }}` en el `<em>` de `:347`,
que es el caso 3 documentado (`style` nativo, sin `sx` de por medio). Copy en español con
`…` y `¿…?`.

**Responsive de la galería — no introduce desborde.** La rejilla es
`gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }` (`:296`), es
decir **una columna a 360 px**; la tarjeta lleva `wordBreak: 'break-all'` en el filename
(`:343`, `:109`) y los chips van en un contenedor con `flexWrap: 'wrap'` (`:349`); la
cabecera colapsa `column→row` (`:232`). Nada de esto puede desbordar.

**Distinción respecto a H3, como pidió el líder.** H3 (`progress/history.md:885-895`) es
**preexistente y ajeno**: `/admin/leads` da `scrollWidth=853` vs `clientWidth=360` porque
`AdminLayout.tsx:39` reserva `width: { xs: 220, md: 260 }` de sidebar y la `<Table>` no
colapsa. La feature 29 **no toca `AdminLayout.tsx`** y no usa `<Table>`. El único elemento
de ancho fijo que añade es el filtro con `sx={{ minWidth: 220 }}` (`ImagesGrid.tsx:267`),
40 px más ancho que el precedente más ancho del repo (`LeadsList.tsx:85`, `minWidth: 180`).
Cae dentro de la franja que H3 ya desborda — a 360 px el área de contenido son ~90 px, así
que incluso 140 desbordaría —, de modo que **no crea una clase nueva de desborde**, solo
suma unos píxeles al `scrollWidth` que H3 ya provoca. Es lectura de código, no medición:
jsdom no hace layout y no monté navegador. **No es motivo de rechazo** y no debe arreglarse
aquí (sería C10); pertenece a H3.

**Accesibilidad — correcta.** `aria-label` en los dos `IconButton`, con el filename dentro
para que sean inequívocos con varias tarjetas (`Editar hero.png` / `Borrar hero.png`,
`:361`, `:364`). El input de archivo lleva `aria-label="Archivo de imagen"` (`ImageUploadDialog.tsx:132`),
va oculto con el patrón de MUI y **es operable por teclado** porque lo envuelve un
`<Button component="label">`, que es `ButtonBase` con `tabIndex=0`. Consultable: el test lo
alcanza con `findByLabelText` (`:95`) — correcto, porque `input[type=file]` **no tiene rol
ARIA implícito**, así que el nombre accesible por label es la única vía; no es un atajo.
`<img alt={img.alt ?? ''}>` (`:331`): una imagen sin alt queda como decorativa,
que es lo que permite `conventions.md` §6. Los errores de campo llevan `role="alert"`
(`:161`) y los `Alert` de estado `role="status"` (`:199`).

El hallazgo del informe §4 sobre `aria-label` en `TextField select` (MUI produce nombres
duplicados tipo «Rol Rol» y rompe un `getByRole` con string exacto) es correcto, está bien
diagnosticado y la solución — dejar la etiqueta visible como única fuente del nombre — es la
buena. La nota sobre `UserDialog` de la 28 es útil y está en el sitio correcto: un informe,
no un parche fuera de scope.

---

## 8. Scope

`git show --stat 339752c`:

```
progress/impl_29.md                     | 165 +
src/admin/__tests__/ImagesGrid.test.tsx | 225 +
src/admin/images/ImageUploadDialog.tsx  | 211 +
src/admin/images/ImagesGrid.tsx         | 405 +-
src/admin/images/mockImages.ts          | 291 +
tsconfig.tsbuildinfo                    |   2 +-
```

Los **cuatro archivos autorizados + su informe**. Nada de `src/lib/api.ts`, `src/AppRoutes.tsx`,
`src/admin/AdminLayout.tsx`, `docs/`, `src/admin/users/`, `src/admin/prices/` ni la landing.
La reescritura de `ImagesGrid.tsx` conserva nombre de archivo y `export default`, así que el
`lazy()` con ruta literal de `AppRoutes.tsx` sigue funcionando — el build lo confirma con el
chunk propio `ImagesGrid-DTAz6RrB.js` (15,26 kB).

`tsconfig.tsbuildinfo` está en `.gitignore:6` pero **trackeado desde el commit inicial**
(`e423472`), así que el ignore no le aplica y se cuela en cada commit: también en `675f9e5`
(feature 27) y `dc97090` (feature 28). **Preexistente y del líder, no del implementer**; ya
está registrado como pendiente en `progress/current.md:53`. No cuenta contra esta feature.

---

## 9. Checkpoints

- **C1** `[x]` — `npm test` exit 0, 17 archivos / 106 tests, ningún test previo roto.
- **C2** `[ ]` — **falla.** Acceptance 1: el estado vacío (`ImagesGrid.tsx:288-291`) no se
  ejerce en ninguno de los 10 tests. Acceptance 2: la obligatoriedad de `seccion`
  (`ImageUploadDialog.tsx:82`), alcanzable en el flujo por defecto, tampoco. Ver §3.
- **C3** `[x]` — `npm run typecheck` exit 0 y `npm run build` exit 0 (aviso de chunk esperado).
- **C4** `[x]` — nombres y ubicación correctos (`PascalCase.tsx` de componente,
  `camelCase.ts` de datos, test en `__tests__/` hermano); cero `any`; cero variables sin usar
  (lo garantiza `noUnusedLocals` con el build en 0); cero hex; cero `className`.
- **C5** `[x]` — cero `fetch` fuera de `src/lib/api.ts` (las URLs son comentarios, §6); sin
  state manager ni librería de fetching nueva; `useState` local y `useOutletContext` ya
  existente; tipos derivados (`Seccion` desde `SECCIONES`, `MockImageField`, `MockImagePatch`).
- **C6** `[x]` — no se consume ningún endpoint. El contrato ya estaba en `docs/api-contract.md`
  §10.2 y la maqueta lo respeta sin necesidad de tocarlo.
- **C7** `[x]` con observación — `impl_29.md` documenta lo hecho, la verificación y el
  razonamiento; `feature_list.json` sigue en `pending` porque el implementer tiene prohibido
  tocarlo. Pero `progress/current.md` está en plantilla vacía («sin sesión abierta») y no
  refleja ni la 28 ni la 29: **deuda del líder**, ya señalada en `review_28.md`, no del autor.
- **C8** `[x]` — ningún `.env` leído ni escrito, ninguna variable de entorno nueva. La única
  mención (`IMAGES_MAX_FILE_SIZE_BYTES`) queda como nombre en la documentación del contrato.
- **C9** `[x]` — sin `console.log`, sin código comentado «por si acaso», sin temporales. Los
  cuatro `TODO` llevan `TODO(feature-29)`.
- **C10** `[x]` — una sola feature; no se arregló de paso H1-H3 ni el CTA de precios.
- **C11** `[x]` — `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` y
  `.gitignore` sin tocar.

**Un `[ ]` en C2 ⇒ `CHANGES_REQUESTED` automático** (`CHECKPOINT.md:6`).

---

## 10. Qué hay que hacer para aprobar

Dos tests en `src/admin/__tests__/ImagesGrid.test.tsx`. **Nada más**: no toques ningún otro
archivo, el código de producción está bien como está.

1. **Estado vacío.** Borrar `maia.png` (id 4, única de `cta_final`) y afirmar
   «Sin imágenes en esta sección.». Puede ser una aserción extra sobre el test de borrado
   ya existente (`:202`) apuntando a la 4 en vez de a la 3, o un test propio. Precedente
   literal: `src/admin/__tests__/UsersList.test.tsx:71`.
2. **`seccion` obligatoria.** Sin tocar el filtro, abrir «Subir imagen», cargar `pngFile()`,
   pulsar «Subir» y afirmar `seccion requerida` y que `nueva-foto.png` no aparece.

Opcional, no bloqueante: una aserción de que el campo de alt lleva `maxLength=300`.

No pido test del estado de error ni del de carga, por lo argumentado en §3.1.

---

## 11. Veredicto

**RECHAZADO — `CHANGES_REQUESTED`.**

Quiero que quede claro para el líder: esto **no** es un rechazo de calidad. El eje crítico de
la feature — la fidelidad al contrato de imágenes, para que el cableado sea mecánico — está
resuelto mejor de lo que pedía el acceptance: 9 campos exactos sin `bytes` ni `url`, enum
derivado del catálogo, sin paginación, orden `orden ASC, id ASC`, `PATCH` de tres campos,
mensajes de error literales del backend, SVG excluido y explicado, «reemplazar imagen»
ausente con copy que dice qué hacer en su lugar, cero red y previews de `public/`. Los cuatro
tests exigidos son load-bearing, comprobado con mutación.

Lo que falta son **dos tests de ~8 líneas** para dos cláusulas del acceptance que hoy no
tienen ninguna verificación y que la feature hermana sí cubrió. C2 es rechazo automático y no
tengo margen para interpretarlo a la baja. Con esos dos tests, esto es un `APROBADO` directo.
