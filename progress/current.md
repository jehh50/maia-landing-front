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

- **Feature 29 cerrada como `done`**, veredicto **APROBADO** en
  `progress/review_29.md` §12.7. Hubo un **rechazo previo** (`CHANGES_REQUESTED`,
  §1-§11) **solo por C2/cobertura**: faltaban tests del estado vacío y de la
  obligatoriedad de `seccion`. Se cerró con **dos tests y nada más**; el revisor
  verificó por su cuenta, con mutación y con
  `git diff --stat 339752c..HEAD -- src/admin/images/` (salida vacía), que el
  código de producción quedó **byte a byte** como lo aprobó. El resumen completo
  está al final de `progress/history.md`.
- **Feature 30 (`pending`) — en curso ahora mismo en otra sesión.** Código de
  producción commiteado en `c8dec91` (WIP); le faltan los tests. No tocar su
  entrada ni `src/admin/prices/`, `src/admin/__tests__/PricesList.test.tsx` ni
  `progress/impl_30.md`. Si el conteo de tests sube por encima de **110**, es
  suyo: no leerlo como regresión.
- **Feature 31 (`pending`) — `normalizeApi` descarta el campo `field` de los
  errores 422.** Con **los tres CRUD del backend ya publicados**, es **lo primero
  que hará falta** para cablear de verdad: sin ella, el marcado por campo se
  pierde y todo cae al `Alert` global. Único punto donde el cableado no es
  mecánico.
- **Backend completo y verificado contra el servidor vivo**
  (`/api/health` → `{"ok":true,"db":true,"mailer":true}`), **pero las tablas
  están vacías y sin seed**: cablear la landing hoy dejaría **precios y carrusel
  en blanco**. Sembrar datos antes de cualquier feature de integración.
- **No existe `GET /api/admin/precios`.** El listado de planes del panel sale del
  endpoint **público** `GET /api/precios`. Verificado contra el servidor:
  responde **404, no 401**. La descripción de la feature 30 en
  `feature_list.json` todavía dice lo contrario.
- **Conteos de test desactualizados en `docs/`**: `docs/verification.md` §1-§2 y
  `docs/architecture.md:252` siguen diciendo `15 archivos / 86 tests`; el árbol
  va por **17 / 110**. Se aplaza otra vez a propósito, con la 30 en vuelo, para
  no volver a escribir una cifra que nace vieja. Actualizar al cerrar la 30.
- El resto de pendientes vivos (lagunas de cobertura aceptadas de la 29, copy de
  `AdminHome.tsx`, arnés de suspensión H2, flake de `AppRoutes.test.tsx`,
  `tsconfig.tsbuildinfo` trackeado, y los preexistentes H1-H3 de la feature 24
  más el CTA de precios) quedan registrados al final de `progress/history.md`, en
  las entradas de las features 27, 28 y 29.

---

## Último baseline verde conocido

`2026-07-31` (feature 29 cerrada, `APROBADO` en `progress/review_29.md`) —
`npm test` **17 archivos / 110 tests** · exit 0 · `npm run typecheck` exit 0 ·
`npm run build` exit 0 (aviso esperado de chunk >500 kB).

> Aviso sobre esa cifra: **no es atribuible solo a la 29**. De los `106 → 110`,
> **+2 son de la 29** (`ImagesGrid.test.tsx` 10 → 12) y **+2 del cierre de la 28**
> (`UsersList.test.tsx`, commit `cd803cb`). Y va a subir en breve: la **feature
> 30** está escribiendo sus tests en paralelo. Si ves más de 110, compáralo con el
> estado de la 30 antes de leerlo como regresión.
