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

- **Feature 28 cerrada como `done`**, veredicto **APROBADO** en
  `progress/review_28.md` (10/10 acceptance; único checkpoint en rojo, **C7**,
  documental, resuelto en el cierre). El resumen completo está al final de
  `progress/history.md`. Ojo con dos cosas al leer esa feature:
  `progress/impl_28.md` **es una reconstrucción a posteriori** —el implementer
  original cayó por un fallo de sesión antes de escribirlo— y lo marca desde su
  primera línea; y el test de «no puedes borrarte a ti mismo» se **endureció en el
  cierre** (`it.each` sobre tres sesiones distintas, validado por mutación), sin
  tocar el comportamiento ya aprobado.
- **Feature 29 en vuelo en otra sesión** mientras se cerraba la 28: su estado en
  `feature_list.json`, sus archivos y su cierre documental **no se tocaron**. Su
  informe y su review ya existen (`progress/impl_29.md`, `progress/review_29.md`);
  el cierre lo hace quien la lleva.
- **Feature 30 (`pending`)**: precios. Sigue tocando solo `src/admin/prices/` y su
  test; no necesita `AppRoutes.tsx` ni `AdminLayout.tsx`.
- **Feature 31 (`pending`) — `normalizeApi` no propaga `field`**: hallazgo de la
  review de la 28 (`progress/review_28.md` §5.4) que **no es deuda de la 28**. El
  backend devuelve `{ error, field }` en sus 422, pero `ApiFailure` de
  `src/lib/api.ts` es `{ ok, status, error }` y `normalizeApi` descarta `field`.
  Hoy no rompe nada (las tres vistas nuevas son maquetas con mock), pero es **el
  único punto donde el cableado de la API real no será mecánico**: sin ella, el
  marcado por campo de los errores del backend se pierde y todo cae al `Alert`
  global. Debe resolverse antes de la feature de integración que traiga
  `API_READY.md`.
- **Dato nuevo, sin verificar por mí:** durante esta sesión ha aparecido un
  `API_READY.md` sin trackear en la raíz del repo. Si es el aviso que el backend
  prometió, la feature de cableado deja de ser hipotética y la **31** pasa a ser
  bloqueante para ella. No lo he leído ni actuado sobre él: queda para el líder.
- **Conteos de test desactualizados en `docs/`** (`review_28.md` §7.2-§7.3):
  `docs/verification.md` §1-§2 y `docs/architecture.md:252` siguen diciendo
  `15 archivos / 86 tests`. Se actualizan cuando cierre la 29, con una cifra ya
  estable — hacerlo con la 29 en vuelo garantizaba dejarlos mal otra vez.
- El resto de pendientes vivos (copy de `AdminHome.tsx`, arnés de suspensión H2,
  flake de `AppRoutes.test.tsx`, `tsconfig.tsbuildinfo` trackeado, y los
  preexistentes H1-H3 de la feature 24 más el CTA de precios) quedan registrados
  al final de `progress/history.md`, en las entradas de las features 27 y 28.

---

## Último baseline verde conocido

`2026-07-30` (feature 28 cerrada, `APROBADO` en `progress/review_28.md`) —
`npm test` **17 archivos / 110 tests** · exit 0 · `npm run typecheck` exit 0 ·
`npm run build` exit 0 (aviso esperado de chunk >500 kB).

> Aviso sobre esa cifra: **no es atribuible solo a la 28**. El cierre de la 28
> partió de `17 / 106`, sumó **+2** al endurecer `UsersList.test.tsx` (10 → 12) y
> los otros **+2** son de la feature 29, que se estaba implementando en paralelo.
> Si al empezar tu sesión ves un número distinto, compáralo contra el estado de la
> 29 antes de leerlo como regresión.
