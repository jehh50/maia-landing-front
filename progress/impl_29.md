# impl_29 — Vista admin de imágenes (maqueta con datos mock)

**Feature:** 29 · **Estado:** implementada, pendiente de review (no marco `done` ni toco
`feature_list.json`) · **Fecha:** 2026-07-30 · **Rama:** `main` (sin commitear: los commits los
hace el líder en `feat/admin-cruds`).

---

## 1. Baseline confirmado antes de tocar nada

Árbol tal cual me lo dejó el líder:

| Comando | Resultado |
|---|---|
| `npm test` | **16 archivos / 96 tests**, exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, con el aviso esperado `Some chunks are larger than 500 kB` |

---

## 2. Archivos tocados (ninguno fuera de la lista autorizada)

| Archivo | Qué |
|---|---|
| `src/admin/images/mockImages.ts` | **nuevo** — almacén en memoria + validaciones, calcado del contrato §10.2 |
| `src/admin/images/ImageUploadDialog.tsx` | **nuevo** — subida de un archivo con validación en cliente |
| `src/admin/images/ImagesGrid.tsx` | **reescrito** (el andamiaje de la 27 era un título) — galería, filtro, edición y borrado. `export default function ImagesGrid()` y nombre de archivo intactos, que es lo que importa `AppRoutes.tsx` |
| `src/admin/__tests__/ImagesGrid.test.tsx` | **nuevo** — 10 tests |
| `progress/impl_29.md` | este informe |

No se ha tocado `src/AppRoutes.tsx`, `src/admin/AdminLayout.tsx`, `src/lib/api.ts`, `docs/`,
`feature_list.json`, `progress/current.md`, `src/admin/users/` ni `src/admin/prices/`. Cero
`fetch`, cero endpoints nuevos, cero variables de entorno, `.env*` no leído.

---

## 3. Cómo se cumple cada acceptance

1. **Galería por sección con filename, alt, orden, tamaño y fecha + estados.** `ImagesGrid`
   pinta un bloque por sección (`Hero`, `CTA final`) con un `Chip` de conteo y una rejilla
   responsive (`1 / 2 / 3` columnas en `xs / sm / lg`). Cada tarjeta es un
   `Paper variant="outlined"` con preview, `filename`, `alt` (o «Sin texto alternativo» en `em`
   con `tokens.text.disabled`), chips de `Orden N`, tamaño legible y sección, y la fecha con
   `toLocaleDateString('es-MX')`. Carga: `CircularProgress`. Error: el `Box` de una línea en
   `error.main` (patrón de listas, no `Alert`). Vacío: `Paper` con «Sin imágenes en esta sección.»
   por cada sección visible.
2. **Formulario de subida fiel al contrato.** `ImageUploadDialog`: un solo `input[type=file]`
   (campo conceptual `file`), `accept="image/png,image/jpeg,image/webp"` — **SVG no aparece**,
   límite de 5 MB validado en cliente, `seccion` obligatoria, `alt` opcional con `maxLength=300`,
   `orden` entero ≥ 0 con default `0`.
3. **La UI no ofrece «reemplazar imagen».** No existe ningún control de archivo en la edición
   (el test lo verifica con `queryByLabelText('Archivo de imagen')`), y el copy lo dice dos
   veces: en el subtítulo de la pantalla y dentro del diálogo de edición («El archivo no se
   puede reemplazar… sube la nueva y borra esta»).
4. **Edición solo de `alt`, `orden` y `seccion`.** `ImageEditDialog` (componente local de
   `ImagesGrid.tsx`, no exportado) manda exactamente ese `MockImagePatch`.
5. **Borrado con `Dialog` de confirmación**, con el copy del borrado físico sin papelera.
6. **Mock propio con los 9 campos de `META_COLS`.** `mockImages.ts` marcado con
   `TODO(feature-29)`; `bytes` **no** se modela. Cuatro filas semilla que reproducen los
   estáticos reales de `public/`.
7. **Ni `src/lib/api.ts` ni URLs contra el backend.** Del módulo `lib/api` solo se importa el
   **tipo** `AdminUser`. Las previews son estáticos locales (`/hero.png`, `/hero-2.png`,
   `/hero-3.png`, `/maia.png`) resueltos por `mockPreviewUrl()`; lo que se sube en la sesión no
   tiene binario y se pinta con un marcador «Vista previa no disponible».
8. **Tests:** galería, filtro por sección, rechazo por tipo y rechazo por >5 MB, más otros seis.

---

## 4. Decisiones que tomé (y por qué)

- **`mockPreviewUrl()` en vez de un campo `url` o `preview` en la fila.** El acceptance exige
  los 9 campos exactos, así que la fila queda intacta y la preview vive en una función aparte,
  con el `TODO` que dice que al cablear devuelve `${API_BASE}/api/images/${id}/raw`. Evité
  `URL.createObjectURL` a propósito: jsdom no lo implementa y habría hecho el test frágil.
- **Mensajes de error copiados literalmente del backend** (`orden debe ser un entero >= 0`,
  `Tipo de archivo no permitido. Formatos aceptados: …`, `seccion requerida`, `Nada que
  actualizar: se esperaba alt, orden o seccion`) para que al cablear no haya que reescribir el
  copy. Es el mismo criterio que siguió `mockUsers.ts` en la feature 28.
- **Validación de coherencia extensión↔MIME en cliente**, además de tipo y tamaño: el backend
  la exige y así se evita un 415 gratuito. Los *magic bytes* no se pueden comprobar en el
  navegador y el diálogo lo advierte en el copy («renombrar un .jpg como .png no funciona»).
- **Escritura reservada al rol `admin`.** El contrato es explícito: `POST`/`PATCH`/`DELETE` de
  imágenes pasan por `requireRole('admin')` y un `editor` recibe **403** (a diferencia del CRUD
  de artículos). Aplico el mismo principio que la feature 28 usó con el 409 de auto-borrado: no
  ofrecer un botón que va a fallar. Un editor ve la galería y un `Alert severity="info"` que lo
  explica. El rol sale de `useOutletContext<AdminUser>()`.
- **Sin `TablePagination`**: el listado real es `{ rows }` sin paginación, orden fijo
  `orden ASC, id ASC` (reproducido en `ordenar()`).
- **`aria-label` fuera de los `TextField select`.** Descubierto depurando: MUI pone
  `aria-labelledby="<label> <self>"` en el `div[role=combobox]`, y el `aria-label` del
  `inputProps` se cuela como nombre del propio nodo, produciendo nombres duplicados
  («Filtrar por sección Filtrar por sección»). Con eso, un `getByRole('combobox', { name: … })`
  con string exacto falla. Dejo la etiqueta visible como única fuente del nombre accesible:
  filtro = «Filtrar por sección», selects de los diálogos = «Sección». En los `TextField` de
  texto sí conservo `inputProps.aria-label`, donde sí gana y es el patrón del repo.
  (Nota para quien toque `UserDialog`: su test pasa porque usa regex `/rol/i`, que tolera el
  nombre duplicado «Rol Rol». No es un bug de la 28, pero conviene saberlo.)
- **Botones con nombres distintos** para que las consultas por rol sean inequívocas: el de la
  cabecera es «Subir imagen» y el de submit del diálogo, «Subir».

## 5. Estilo

`sx` + tokens en todo (`surface.soft`, `divider`, `text.secondary`, `error.main`,
`primary`), **cero hex** y cero `className` de utilidad. Un único color con opacidad, con
`alpha()` sobre el token, en la sombra de hover de la tarjeta:
`boxShadow: 0 4px 16px ${alpha(tokens.brand.orange, 0.1)}`. Import directo de `tokens` solo en
el `style={{}}` nativo del `<em>` del alt vacío, que es el caso legítimo documentado. Copy en
español con `…` y `¿…?`. Responsive: cabecera `column→row`, rejilla `1/2/3` columnas.

## 6. Verificación

Iteración: `npx vitest run src/admin/__tests__/ImagesGrid.test.tsx` → **10/10**.

Bloque completo (`npm test && npm run typecheck && npm run build`) — resultado en §7.

### Conteo de tests

| | Archivos | Tests |
|---|---|---|
| Antes (baseline) | 16 | 96 |
| Después | 17 | 106 |

`docs/verification.md` §1-§2 y `docs/architecture.md` §8 congelan el conteo viejo, pero `docs/`
está fuera de mi lista de archivos: **queda para el líder** actualizar esas dos cifras cuando
cierre el grupo 28-30.

## 7. Salida del bloque de verificación

`npm test && npm run typecheck && npm run build` — los tres en **exit 0**:

```
 Test Files  17 passed (17)
      Tests  106 passed (106)
   Duration  56.72s

> tsc -b --noEmit          → exit 0

dist/assets/ImagesGrid-DTAz6RrB.js    15.26 kB │ gzip:  5.69 kB
dist/assets/index-DNjfDwwz.js      1,587.15 kB │ gzip: 451.34 kB
(!) Some chunks are larger than 500 kB after minification.   ← aviso esperado, no es fallo
✓ built in 17.24s
```

Comprobación de códigos de salida por separado: `test exit=0`, `typecheck exit=0`,
`build exit=0`. La pantalla sigue emitiendo su propio chunk perezoso
(`ImagesGrid-*.js`, 15.26 kB), así que el `lazy()` con ruta literal de `AppRoutes.tsx` sigue
funcionando tras la reescritura.

## 8. Estado del árbol

Modificado/creado exactamente lo autorizado:

```
 M src/admin/images/ImagesGrid.tsx
?? src/admin/images/ImageUploadDialog.tsx
?? src/admin/images/mockImages.ts
?? src/admin/__tests__/ImagesGrid.test.tsx
?? progress/impl_29.md
```

(`tsconfig.tsbuildinfo` aparece modificado por el propio `build`; ya venía así del baseline.)

Sin commits, sin push, sin residuos: ni `console.log`, ni archivos temporales, ni `TODO` sin
`TODO(feature-29)`. **Falta el veredicto del `reviewer`**; hasta entonces la feature 29 no se
marca `done`.
