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

> **La tanda de vistas admin está cerrada.** Lee esto entero antes de tomar nada:
> el orden de los tres primeros puntos importa.

- **Feature 30 cerrada como `done`**, veredicto **APROBADO** en
  `progress/review_30.md` (11/11 en los `acceptance` §2 y 11/11 en los checkpoints
  §8, sin rechazo previo). La escribieron **dos agentes**: el código de producción
  es de un implementer que **cayó por un límite de sesión** antes de documentarlo
  (`c8dec91`), y un segundo agente escribió los tests y **reconstruyó
  `progress/impl_30.md` leyendo el código** (`fdf80c4`). El revisor no se apoyó en
  ese informe: **reprodujo por su cuenta las nueve mutaciones** y confirmó que el
  test del plan Custom **discrimina de verdad**. Resumen completo al final de
  `progress/history.md`.
- **Las tres vistas están maquetadas con datos mock y cerradas:** **28 usuarios**,
  **29 imágenes**, **30 precios**. **Ninguna consume el backend** — fue **decisión
  explícita del humano**, no una limitación ni un pendiente olvidado. No las
  «arregles» cableándolas sin encargo.
- **Feature 31 (`pending`) — `normalizeApi` descarta el campo `field` de los
  errores 422.** Es **lo primero que hace falta para cablear**: los **tres CRUD del
  backend devuelven `{ error, field }`** en sus 422 y, sin esta feature, el marcado
  por campo se pierde y todo cae al `Alert` global. Las tres maquetas ya modelan
  `field` en su `MockResult`, así que el resto del cableado es mecánico; este es el
  único punto donde no lo es.
- **Backend completo y verificado contra el servidor vivo** (`/api/health` →
  `{"ok":true,"db":true,"mailer":true}`, puerto **3002**), **pero las tablas están
  vacías y sin seed**. Migrar la landing (`Pricing.tsx`, `Hero.tsx`,
  `CTAFinal.tsx`) **antes** de cargar datos por el panel dejaría la **sección de
  precios y el carrusel en blanco**. Sembrar datos —o cargarlos desde el propio
  panel— antes de cualquier feature de integración.
- **No existe `GET /api/admin/precios`.** El listado de planes del panel sale del
  endpoint **público** `GET /api/precios`. Verificado contra el servidor: responde
  **404, no 401**, o sea que no es un problema de sesión. La descripción de la
  feature 30 en `feature_list.json` todavía dice lo contrario: es registro
  histórico, no contrato.
- **Discrepancia viva entre `API_READY.md` y el código del backend**
  (`docs/api-contract.md` §10.4): el handoff dice que un plan Custom trae
  `precio_mensual` en `null`, pero el backend lo pasa por `toNumber()` y devuelve
  **`0`**. **La regla segura es detectar `es_custom`, nunca el nulo.** La maqueta de
  precios ya lo hace así y su test lo sujeta con una mutación reproducida por el
  revisor.
- **Copy de `AdminHome.tsx` — deuda preexistente, candidata a feature nueva:**
  sigue diciendo que Leads y el mantenedor del blog «llegarán en próximas
  iteraciones», lo cual es **falso desde las features 19-20**, y menciona
  `node scripts/create-user.js`, que **la feature 28 ya reemplazó por UI**. No es
  deuda de la 30 ni de la tanda.
- **Conteos de test desactualizados en `docs/`**: `docs/verification.md` §1-§2 y
  `docs/architecture.md:252` siguen diciendo `15 archivos / 86 tests`; el árbol va
  por **18 / 119**. Este cierre tenía `docs/` fuera de su alcance, pero **ya no hay
  features en vuelo**, así que la cifra es estable y por fin se puede escribir sin
  que nazca vieja.
- El resto de pendientes vivos (observaciones no bloqueantes de `review_30.md` §9
  —moneda `es-MX` vs «dólares», densidad de `data-testid`, el `Switch` de
  `es_custom` sin respaldo en §10.4—, lagunas de cobertura aceptadas de la 29,
  arnés de suspensión H2, flake de `AppRoutes.test.tsx`, `tsconfig.tsbuildinfo`
  trackeado, preexistentes H1-H3 de la feature 24 y el CTA de precios) quedan
  registrados al final de `progress/history.md`, en las entradas de las features
  27, 28, 29 y 30.

---

## Último baseline verde conocido

`2026-07-31` (feature 30 cerrada, `APROBADO` en `progress/review_30.md`) —
`npm test` **18 archivos / 119 tests** · exit 0 · `npm run typecheck` exit 0 ·
`npm run build` exit 0 (aviso esperado de chunk >500 kB).

> Sobre esa cifra: el salto `17 / 110` → `18 / 119` es **íntegramente de la
> feature 30** (`src/admin/__tests__/PricesList.test.tsx`, +1 archivo y +9 tests),
> sin ningún test previo roto. Medido tres veces de forma independiente: por el
> implementer (`impl_30.md` §6), por el revisor (`review_30.md` §1) y en este
> cierre. **No hay features en vuelo**, así que este número no debería moverse solo.
