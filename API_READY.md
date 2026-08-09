# API backend disponible — handoff para el front

> Generado desde `maia-landing-back` el 2026-07-30. **Actualizado el 2026-08-09**
> con el CRUD de complementos (add-ons) y paquetes. Este archivo es **lo único**
> que el backend escribe en este repo; no se ha tocado ningún otro archivo.

## Server

```
http://localhost:3002
```

**Ojo con el puerto: es el 3002, no el 3001.** La documentación del backend
(`docs/verification.md` §2) dice 3001, pero el `.env` local define otro `PORT`.
Usa el 3002.

```
GET /api/health  →  {"ok":true,"db":true,"mailer":true}
```

Base de datos local, schema `public`. Tablas: `articles`, `complementos`,
`images`, `leads`, `paquetes`, `planes`, `users`.

---

## ⚠️ Lee esto antes de integrar

**Las tablas están creadas pero VACÍAS.** `GET /api/precios`, `GET /api/images` y
`GET /api/complementos` responden `200 {"rows":[]}`. No hay ningún seed: los datos
se cargan por el panel de administración (rutas `/api/admin/*`, requieren sesión de
admin).

**El front sigue con todo hardcodeado y eso no ha cambiado.** `Hero.tsx:10-12`,
`CTAFinal.tsx:42`, `Pricing.tsx:11-37` y `Addons.tsx:20-56` mantienen sus
constantes. Migrarlos para que consuman esta API **no** se ha hecho — está fuera
del alcance del trabajo del backend, que nunca modifica este repo. Si conectas el
front hoy sin cargar datos antes, la sección de precios, la de add-ons y el
carrusel quedarían vacíos.

---

## Endpoints públicos (sin autenticación)

### `GET /api/precios`

Planes ordenados por `orden` ascendente.

```json
{ "rows": [
  { "id": "1", "nombre": "Starter",
    "precio_mensual": 19, "descuento_pct": 10,
    "precio_anual": 17, "ahorro_anual": 24,
    "vinetas": ["1 agente activo", "100 créditos/mes"],
    "vinetas_tachadas": [],
    "destacado": false, "trial_texto": "14 días de prueba gratis",
    "es_custom": false, "orden": 0 }
] }
```

Tres cosas que evitan errores de integración:

1. **`precio_anual` es el precio MENSUAL facturando anualmente**, no el total del
   año. El ahorro ya viene calculado: `(precio_mensual − precio_anual) × 12`.
   Es la misma semántica que el campo `annual` que hoy tiene hardcodeado
   `Pricing.tsx`, así que el reemplazo es directo.
2. **`precio_anual` y `ahorro_anual` son derivados y de solo lectura.** No se
   almacenan y no se pueden editar: salen de `precio_mensual` y `descuento_pct`.
3. **Los números llegan como `number`, no como string.** El driver de Postgres
   devuelve `NUMERIC` como texto y el backend lo convierte antes de responder:
   recibes `19`, no `"19.00"`.

**Planes Custom** (`es_custom: true`, el Enterprise): `precio_mensual`,
`precio_anual` y `ahorro_anual` vienen en **`null`**, no en `0`. Están así a
propósito, para que no se renderice "Ahorras $0/año". Comprueba `es_custom`
antes de pintar cifras.

`vinetas` y `vinetas_tachadas` son arrays de strings, equivalentes a `features` y
`dim` en el componente actual.

### `GET /api/complementos`

Los add-ons de la sección de precios, **con sus paquetes ya anidados**. Ordenados
por `orden` ascendente (los complementos y, dentro de cada uno, sus paquetes).
Es el reemplazo directo del array `addons` de `Addons.tsx:20-56`.

```json
{ "rows": [
  { "id": "1", "nombre": "Créditos adicionales",
    "descripcion": "Amplía tu consumo mensual sin cambiar de plan…",
    "precio": 0.2, "unidad": "/ crédito", "orden": 1,
    "paquetes": [] },
  { "id": "2", "nombre": "Packs de créditos",
    "descripcion": "Compra créditos por adelantado…",
    "precio": null, "unidad": null, "orden": 2,
    "paquetes": [
      { "id": "7", "complemento_id": "2", "nombre": "Pack S",
        "descripcion": "500 créditos", "precio": 90, "orden": 1 }
    ] }
] }
```

Cuatro cosas que evitan errores de integración:

1. **`precio: null` NO es `precio: 0`.** `null` significa "este complemento no
   publica precio unitario porque sus paquetes lo llevan" — es el caso real de
   "Packs de créditos". Un `0` significaría "gratis". Si recibes `null`, pinta
   los paquetes en lugar de una cifra; nunca renderices `$null` ni `$0`.
2. **`unidad` viene aparte del precio, y puede ser `null`.** La API devuelve
   `precio: 0.2` + `unidad: "/ crédito"`, no el string `"$0.20"` que hoy tiene
   hardcodeado el componente. El símbolo `$` y el formato los pone el front.
3. **`paquetes` siempre está presente.** Un complemento sin packs devuelve `[]`,
   nunca `null` ni el campo ausente: puedes hacer `addon.paquetes.map(...)` sin
   guardas. El `precio` de un paquete, en cambio, es **obligatorio** y nunca es
   `null`.
4. **Los importes llegan como `number`, no como string** — misma conversión que
   en `/api/precios`. Si ves `"precio": "90.00"`, es un bug del backend.

Los `id` son strings (`bigint` de Postgres serializado), igual que en el resto de
la API. `descripcion` y `unidad` pueden ser `null`.

No hay endpoint público de paquetes: vienen anidados aquí y punto. Solo el panel
los trata como recurso aparte, para poder editarlos uno a uno.

### `GET /api/images?seccion=`

Metadatos de las imágenes por sección, ordenados por `orden`. Secciones: `hero`
(carrusel) y `cta_final`. **El binario nunca viene en el JSON** — se sirve aparte:

### `GET /api/images/:id/raw`

Devuelve el binario con su `Content-Type` real. Es la URL que va en el `src` de
un `<img>`: `http://localhost:3002/api/images/1/raw`.

Formatos aceptados al subir: **PNG, JPEG y WebP**. SVG está excluido a propósito
(un SVG servido en crudo es un vector de XSS), así que no cuentes con poder subir
vectoriales.

### Otros públicos ya existentes

`GET /api/articles`, `GET /api/articles/:slug`, `POST /api/contact`.

---

## Endpoints de administración

Todos bajo `/api/admin/*`, con cookie de sesión. Sin cookie responden `401`; con
rol insuficiente, `403`.

| Recurso | Rutas | Rol |
|---|---|---|
| Precios | `POST/PATCH/DELETE /api/admin/precios[/:id]` | admin |
| Complementos | `GET/POST/PATCH/DELETE /api/admin/complementos[/:id]` | admin |
| Paquetes | `GET/POST/PATCH/DELETE /api/admin/paquetes[/:id]` | admin |
| Imágenes | `POST/PATCH/DELETE /api/admin/images[/:id]` | admin |
| Usuarios | `GET/POST/PATCH/DELETE /api/admin/users[/:id]` | admin |
| Artículos | `GET/POST/PATCH/DELETE /api/admin/articles[/:id]` | admin y **editor** |

La subida de imágenes es `multipart/form-data`. Códigos de error: `422` campo
faltante o inválido, `415` tipo de archivo no permitido, `413` archivo demasiado
grande, `409` conflicto (email duplicado, último admin).

**Roles**: `admin` accede a todo; `editor` solo al blog, donde puede ver, crear,
editar y **eliminar** publicaciones.

### Panel de add-ons: complementos y paquetes

Dos recursos separados, los dos **solo `admin`** (incluidos los `GET` de detalle).
El objeto `complemento` que devuelven tiene exactamente la misma forma que las
filas de `GET /api/complementos`, con `paquetes` incluido.

**No existe `GET /api/admin/complementos`** (listado de panel): el listado público
ya devuelve todos, con sus paquetes. No hay borradores ni add-ons ocultos.

`POST /api/admin/complementos` — `nombre` es el único obligatorio:

| Campo | Obligatorio | Reglas |
|---|---|---|
| `nombre` | **sí** | string no vacío, se trunca a 120 |
| `descripcion` | no (`null`) | string (trunca a 500) o `null` |
| `precio` | no (**`null`**) | número ≥ 0 y ≤ 99999999.99, **o `null`** |
| `unidad` | no (`null`) | string (trunca a 60) o `null` |
| `orden` | no (`0`) | entero en `[0, 2147483647]` |

`POST /api/admin/paquetes` — aquí `precio` **sí** es obligatorio y no admite
`null`, y hace falta el `complemento_id` del add-on al que cuelga. El resto de
campos son los mismos (sin `unidad`).

`PATCH` acepta cualquier subconjunto de esos campos; lo que no mandes se conserva.
En las columnas que admiten nulo (`descripcion`, `unidad`, y el `precio` del
complemento) mandar `null` **borra el valor**. Un `PATCH` vacío, o que solo traiga
campos no editables, responde `422` y no modifica nada. Mover un paquete de
complemento cambiando su `complemento_id` es válido.

> ⚠️ **Borrar un complemento borra sus paquetes en cascada**, sin aviso del
> backend y sin vuelta atrás. `DELETE /api/admin/complementos/2` se lleva por
> delante Pack S, M y L. El panel debería pedir confirmación explícita
> mencionándolo. Al revés no pasa: borrar un paquete no toca su complemento.

Errores que verás desde el panel:

```json
422 { "error": "nombre requerido", "field": "nombre" }
422 { "error": "precio debe ser un número", "field": "precio" }
422 { "error": "complemento_id debe ser el id de un complemento existente", "field": "complemento_id" }
404 { "error": "Complemento no encontrado" }
```

Los `422` traen `field`, así que puedes marcar el input concreto del formulario.
Un `complemento_id` inexistente, no numérico o desbordado es `422` —nunca un
`500`—, y un `:id` que no existe o no es numérico es siempre `404`.

**Los campos de texto ya no se coercionan.** Mandar `{"nombre": 123}` o
`{"nombre": {}}` es `422`, no una fila guardada como `'[object Object]'`. Manda
strings de verdad, o `null` en los campos que lo admiten.

### Un body inválido ahora responde 4xx, no 500

Cambio transversal a **toda** la API, relevante para el manejo de errores del
panel: hasta ahora un JSON malformado, un body que no es un objeto o uno que
supera el límite de 32 kb acababan en `500`. Ahora responden `400`, `413` o `415`
según el caso. Si tu capa de fetch reintenta ante `5xx`, ya no reintentará
peticiones que nunca iban a funcionar.

---

## Contrato completo

`../maia-landing-back/docs/api-contract.md` — es la referencia autoritativa y
está actualizada con estos endpoints.
