# API backend disponible — handoff para el front

> Generado desde `maia-landing-back` el 2026-07-30. Este archivo es **lo único**
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

Base de datos local, schema `public`. Tablas: `articles`, `images`, `leads`,
`planes`, `users`.

---

## ⚠️ Lee esto antes de integrar

**Las tablas están creadas pero VACÍAS.** `GET /api/precios` y `GET /api/images`
responden `200 {"rows":[]}`. No hay ningún seed: los datos se cargan por el panel
de administración (rutas `/api/admin/*`, requieren sesión de admin).

**El front sigue con todo hardcodeado y eso no ha cambiado.** `Hero.tsx:10-12`,
`CTAFinal.tsx:42` y `Pricing.tsx:11-37` mantienen sus constantes. Migrarlos para
que consuman esta API **no** se ha hecho — está fuera del alcance del trabajo del
backend, que nunca modifica este repo. Si conectas el front hoy sin cargar datos
antes, la sección de precios y el carrusel quedarían vacíos.

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
| Imágenes | `POST/PATCH/DELETE /api/admin/images[/:id]` | admin |
| Usuarios | `GET/POST/PATCH/DELETE /api/admin/users[/:id]` | admin |
| Artículos | `GET/POST/PATCH/DELETE /api/admin/articles[/:id]` | admin y **editor** |

La subida de imágenes es `multipart/form-data`. Códigos de error: `422` campo
faltante o inválido, `415` tipo de archivo no permitido, `413` archivo demasiado
grande, `409` conflicto (email duplicado, último admin).

**Roles**: `admin` accede a todo; `editor` solo al blog, donde puede ver, crear,
editar y **eliminar** publicaciones.

---

## Contrato completo

`../maia-landing-back/docs/api-contract.md` — es la referencia autoritativa y
está actualizada con estos endpoints.
