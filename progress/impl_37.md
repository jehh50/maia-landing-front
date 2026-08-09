# Informe de implementación — Feature 37

**Vista admin de complementos (add-ons) cableada a `/api/complementos` y `/api/admin/complementos`**

Estado al cierre de esta sesión: `in_progress` en `feature_list.json` (queda a la
espera de veredicto del `reviewer`; no me corresponde marcarla `done`).

## Qué cambié

### `src/lib/api.ts`

Añadido un bloque nuevo, `// --- Complementos / add-ons (feature 37) ---`, al
final del archivo (después del bloque de precios), siguiendo el molde exacto
de §4 quater:

- Tipos: `AdminPaquete` (paquete anidado, solo lectura en esta feature —
  `precio: number` obligatorio, nunca `null`, a diferencia del complemento),
  `AdminComplemento` (`id`, `nombre`, `descripcion`, `precio: number | null`,
  `unidad`, `orden`, `paquetes: AdminPaquete[]` siempre presente),
  `ComplementosListResponse`, `ComplementoInput` (derivado con
  `Pick<'nombre'> & Partial<Pick<'descripcion'|'precio'|'unidad'|'orden'>>` —
  solo `nombre` obligatorio, el resto opcional y nulable donde el backend lo
  permite) y `ComplementoPatchInput = Partial<ComplementoInput>`.
- Constantes de límites exportadas: `COMPLEMENTO_NOMBRE_MAX` (120),
  `COMPLEMENTO_DESCRIPCION_MAX` (500), `COMPLEMENTO_UNIDAD_MAX` (60),
  `COMPLEMENTO_PRECIO_MAX` (99999999.99), `COMPLEMENTO_ORDEN_MAX`
  (2147483647).
- Helpers: `listComplementos()` → `publicJson('/api/complementos')`, sin
  cookie (no existe `GET /api/admin/complementos`, misma asimetría que
  precios). `getAdminComplemento`, `createAdminComplemento`,
  `updateAdminComplemento` → `apiJson` sobre `/api/admin/complementos[/:id]`.
  `deleteAdminComplemento` sintetiza `{ ok: true }` del `204` sin cuerpo
  **solo si la respuesta fue 2xx**, mismo molde exacto que `deleteAdminPlan`.

### `src/admin/AdminLayout.tsx`

`NAV_ITEMS` gana `{ to: '/admin/complementos', label: 'Complementos', end:
false }`, entre "Precios" y "Usuarios". Actualizado también el comentario que
documenta el orden de la navegación.

### `src/AppRoutes.tsx`

`ComplementosList` se importa con `lazy()` (ruta literal
`'./admin/addons/ComplementosList'`) y se monta en `<Route path="complementos"
element={<AdminPage><ComplementosList /></AdminPage>} />`, entre `prices` y
`users`, mismo molde que el resto de rutas del admin.

### `src/admin/addons/ComplementosList.tsx` (nuevo)

Calca la estructura de `PricesList.tsx`: `useOutletContext<AdminUser>()` para
resolver permisos (`puedeEditar = role === 'admin'`), estado de carga/vacío/
error, tabla con columnas Orden / Complemento (nombre + descripción) / Precio
/ Paquetes / Acciones.

Decisiones de UI concretas:

- **Columna Precio**: si `precio !== null` pinta `formatMoneda(precio)` +
  `unidad` (con un espacio de separación, p. ej. `$0.2 / crédito`); si es
  `null`, pinta un guion — nunca `$0` ni `$null`.
- **Columna Paquetes**: siempre presente, se recorre `paquetes` sin guardas
  (`paquetes.map(...)`, nunca `paquetes?.map`). Si está vacía, un guion. Es de
  **solo lectura**: ningún botón de crear/editar/borrar paquete (eso es la
  feature 38).
- **Confirmación de borrado**: además del texto estándar ("no se puede
  deshacer"), un párrafo en `color="error"` que dice explícitamente
  `Se eliminarán también sus N paquetes, sin vuelta atrás` (con singular/plural
  correcto) cuando el complemento tiene paquetes, o `Este complemento no tiene
  paquetes asociados` cuando no. Refleja la cascada del backend, que no avisa
  por su cuenta.
- El error del listado usa `role="alert"` (no repite la omisión de
  `UsersList.tsx:118` que señala el acceptance).

### `src/admin/addons/ComplementoEditDialog.tsx` (nuevo)

Calca `PlanEditDialog.tsx`, pero sin campos derivados (no hay aritmética que
recalcular en complementos). Campos: Nombre (obligatorio, `maxLength`
`COMPLEMENTO_NOMBRE_MAX`), Descripción (multiline, opcional), Precio
(opcional, vacío → `null`), Unidad (opcional, vacío → `null`), Orden (entero
≥0, `maxLength` implícito por `COMPLEMENTO_ORDEN_MAX`).

- **`FIELD_BY_BACKEND`** mapea los cinco campos (`nombre`, `descripcion`,
  `precio`, `unidad`, `orden`) al campo del formulario — a diferencia de
  precios, aquí **todos** tienen `TextField` con `helperText`, así que no hace
  falta excluir ninguno (no hay `Switch` como `destacado`/`es_custom`).
- **Vacío ⇒ `null`, nunca `0`**: `precio: precioNum` donde `precioNum` es
  `null` si el campo está vacío; `descripcion`/`unidad` con el mismo patrón
  `trim() || null` que ya usa `PlanEditDialog` para `trial_texto`.
- Si el complemento en edición tiene paquetes, un `Alert` informativo avisa
  que se editan desde su propia pantalla (no aquí), sin ofrecer ningún control
  para ellos.

### Tests

- **`src/admin/__tests__/ComplementosList.test.tsx`** (nuevo, 18 tests): mock
  mínimo de `/api/complementos` + `/api/admin/complementos` sobre
  `globalThis.fetch` con `Response` reales (nunca se mockea `src/lib/api.ts`).
  Cubre: listado público (URL, `credentials: 'omit'`), que `GET
  /api/admin/complementos` no se llama nunca, un complemento con `precio:
  null` pintando sus paquetes y no una cifra (ni `$null` ni `$0`), estado de
  error con `role="alert"`, estado vacío, alta con precio vacío → `null` en el
  `POST`, validación cliente sin `nombre`, edición con `PATCH`, vaciar el
  precio manda `null`, aviso de paquetes en el diálogo, `422` con `field`
  marcando el input, `403 forbidden` traducido, confirmación de borrado con el
  conteo de paquetes (con y sin paquetes), `DELETE` con `204` tratado como
  éxito, error sin cuerpo no confundido con `204`, cancelar no borra, permisos
  de `editor` (solo lectura).
- **`src/lib/__tests__/api.test.ts`**: añadido un bloque de tests directos
  (sin componente) para `listComplementos` (URL pública, sin cookie, paquetes
  siempre presentes), `getAdminComplemento` (privado, con cookie) y
  `deleteAdminComplemento` (síntesis del `204` y no confusión con un `500` sin
  cuerpo).
- **`src/admin/__tests__/AdminLayout.test.tsx`**: el test "muestra las seis
  secciones..." pasa a "muestra las siete secciones...", con "Complementos"
  insertado entre "Precios" y "Usuarios" en la lista esperada y su `href`.

### `docs/api-contract.md`

Nueva sección **"4 quinquies. Complementos (`/api/complementos` +
`/api/admin/complementos`) — vigente"**, insertada justo antes de "## 5. Admin
— artículos", con el mismo formato que §4 quater: tabla de rutas, aviso de la
asimetría del listado (no existe `GET /api/admin/complementos`), los tipos
`AdminPaquete`/`AdminComplemento`/`ComplementoInput`/`ComplementoPatchInput`,
la regla `precio: null` ≠ `precio: 0`, límites y normalización, tabla de
errores, el aviso de la cascada al borrar, una nota explícita de que los
paquetes son de solo lectura en esta feature (CRUD propio en la 38), y el
recordatorio de que `Addons.tsx` sigue sin cablear (fuera de alcance).

## Decisiones tomadas

1. **`ComplementoInput` se deriva con `Pick`+`Partial`, no con `Omit` como
   `PlanInput`.** En precios, la mayoría de campos son obligatorios y solo dos
   (`precio_mensual`, `descuento_pct`) son opcionales, así que `Omit` +
   `Partial<Pick<...>>` tiene sentido. En complementos es al revés: solo
   `nombre` es obligatorio y el resto son opcionales, así que
   `Pick<'nombre'> & Partial<Pick<resto>>` expresa la misma idea con menos
   ruido y sigue derivando de `AdminComplemento` en vez de duplicar los tipos
   de los campos.
2. **Reutilicé `ORDEN_ERROR` y `parseOrden`** (ya exportados desde el bloque
   de imágenes) en vez de duplicarlos para complementos. El mensaje genérico
   ("orden debe ser un entero >= 0") ya es compartido por imágenes y precios;
   añadí solo el límite superior específico (`COMPLEMENTO_ORDEN_MAX`) como
   comprobación extra en el formulario, reutilizando el mismo mensaje.
3. **Separé "Precio" y "Paquetes" en dos columnas de la tabla**, en vez de
   fusionarlas en una sola celda condicional. Así el guion de "sin precio
   unitario" es siempre visible en su propia columna, y los paquetes se listan
   siempre (estén o no presentes, con o sin precio propio) sin que el lector
   tenga que inferir de un layout condicional dónde está la información.
4. **La celda de precio con unidad lleva un espacio** (`$0.2 / crédito`) en
   vez de pegado (`$0.2/ crédito`). No lo especifica el acceptance; es una
   decisión cosmética menor sin impacto en el contrato ni en los tests de
   `fetch.mock.calls`.
5. **No creé ningún `mockComplementos.ts`.** Las fixtures (`SEED`) viven solo
   dentro de `ComplementosList.test.tsx` y `api.test.ts`, tal como pide el
   acceptance explícitamente.

## Verificación

Bloque completo corrido al final de la sesión, una sola suite a la vez:

```
npm test            → 21 archivos / 217 tests, exit 0
npm run typecheck   → exit 0
npm run build       → exit 0 (aviso de chunk >500 kB esperado;
                       ComplementosList-CFWKMhJP.js: 8.61 kB en su propio
                       chunk lazy)
```

Recorrido de cifras: baseline `20 / 194` → esta feature `21 / 217` (+1
archivo, `ComplementosList.test.tsx`; +23 tests netos: 18 nuevos en
`ComplementosList.test.tsx` + 5 nuevos en `api.test.ts`, sin tocar el conteo
de `AdminLayout.test.tsx`, que sigue en 3 tests, solo renombrado uno).

Ningún test previo se rompió. Corrí también subconjuntos aislados
(`ComplementosList.test.tsx`, `api.test.ts` + `AdminLayout.test.tsx`) antes
del bloque completo, sin señales de flake.

## Observaciones fuera de scope

Registradas en `progress/current.md` § "Observaciones fuera de scope":
`Addons.tsx` sigue hardcodeado (no está en el backlog), la edición de
paquetes es la feature 38, `getAdminComplemento` sin consumidor en la UI
(mismo patrón que `getAdminPlan`/`getAdminUser`), y las tablas de
`complementos` siguen vacías en el backend hasta que se carguen desde este
panel nuevo.
