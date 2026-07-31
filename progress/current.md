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

> **Empieza el cableado.** Lee los tres primeros puntos antes de tomar nada.

- **Feature 31 cerrada como `done`**, veredicto **APROBADO** en
  `progress/review_31.md` (4/4 en los `acceptance` §2 y 11/11 en los checkpoints
  §8, sin rechazo previo). El revisor **no se fió del informe**: reprodujo por su
  cuenta las **dos mutaciones** con el mismo conteo de fallos que declara
  `progress/impl_31.md` §3, verificó **9 bordes extra** del guard con un test
  temporal que **creó, ejecutó y borró**, y confirmó que el **diff de consumidores
  sale vacío**. Resumen completo al final de `progress/history.md`.
- **La 31 desbloquea las features 32, 33 y 34** (cablear **usuarios**, **imágenes**
  y **precios**). Ya **pueden ir en paralelo entre sí**: cada una vive en su propia
  carpeta (`src/admin/users/`, `src/admin/images/`, `src/admin/prices/`) y no se
  pisan. Con `field` propagado por `normalizeApi`, y como las tres maquetas ya lo
  modelan en su `MockResult`, el cableado es **mecánico**: la 31 era el único punto
  donde no lo era.
- **Nota heredada de la review (C10) — `src/admin/prices/mockPrices.ts:37`**
  todavía dice que «`normalizeApi` todavía descarta `field` — es la feature 31».
  **Ya no es cierto.** **NO lo arregles de paso:** es código de la **feature 30**,
  ya cerrada, y C10 prohíbe tocar deuda ajena. Corresponde corregirlo —o que
  desaparezca con el archivo— en la **feature 34**, que es quien elimina o reduce
  ese mock al cablear precios. La referencia equivalente de `docs/api-contract.md`
  **ya está corregida**.
- **Las features 35 y 36 (migrar la landing) llevan como `acceptance` una decisión
  explícita de fallback.** Las **tablas del backend están vacías y sin seed**, y la
  landing **no puede quedarse sin precios ni sin carrusel**: migrar `Pricing.tsx`,
  `Hero.tsx` y `CTAFinal.tsx` a pelo dejaría esas secciones **en blanco**. O se
  siembran datos —o se cargan desde el propio panel, que para eso están las
  32-34— o la feature define un fallback explícito. No es un detalle de
  implementación: es la condición para no romper producción.
- **No existe `GET /api/admin/precios`.** El listado de planes del panel sale del
  endpoint **público** `GET /api/precios`. Verificado contra el servidor: responde
  **404, no 401**, o sea que no es un problema de sesión. La descripción de la
  feature 30 en `feature_list.json` sigue diciendo lo contrario: es registro
  histórico, no contrato.
- **Discrepancia viva entre `API_READY.md` y el código del backend**
  (`docs/api-contract.md` §10.4): el handoff dice que un plan Custom trae
  `precio_mensual` en `null`, pero el backend lo pasa por `toNumber()` y devuelve
  **`0`**. **La regla segura es detectar `es_custom`, nunca el nulo.**
- **Backend completo y verificado contra el servidor vivo** (`/api/health` →
  `{"ok":true,"db":true,"mailer":true}`, puerto **3002**).
- **Observaciones no bloqueantes de `review_31.md` §9**, ninguna urgente: un
  `field` con espacios alrededor **se propaga sin recortar** —coherente con
  `readErrorMessage`—, así que si al cablear lo mapeas al `name` de un input,
  normalízalo **en el consumidor**; y `docs/architecture.md:319` describe el fallo
  como `{ ok, status, error }` sin mencionar el `field` opcional.
- **Nunca corras dos suites de test a la vez en esta máquina.** En este cierre se
  lanzaron dos `npm test` concurrentes y ambos cayeron por timeout de 15 s
  (`PricesList`, `AppRoutes`, `ContactModal`); a solas, **18/125 verde**. Es la
  misma sensibilidad a la carga de CPU ya registrada como flake de
  `AppRoutes.test.tsx`, ahora confirmada también en otros dos archivos.
- **AVISO — el árbol de trabajo NO está limpio, hay feature 32 en vuelo.** Al
  cerrar la 31, `git status` muestra **modificaciones sin commitear** en
  `src/lib/api.ts` (+85 líneas: `AdminUserRow`, `UsersListResponse`,
  `UserCreateInput`/`UserPatchInput`, `FORBIDDEN_ERROR`/`adminErrorMessage` y los
  cinco helpers `listAdminUsers`…`deleteAdminUser`) y en
  `src/admin/users/UsersList.tsx` (+42/−23). Es **cableado de usuarios = feature
  32**, todavía `pending` en `feature_list.json` y **sin ningún test nuevo**
  (`src/**/__tests__` sin cambios). Este cierre **no lo tocó**. Consecuencias que
  hay que tener presentes: (a) la verificación de abajo se midió sobre un árbol
  que **ya incluye** ese WIP, y (b) el conteo `18 / 125` **sí se va a mover** en
  cuanto la 32 traiga sus tests.
- El resto de pendientes vivos (copy obsoleto de `AdminHome.tsx`, arnés de
  suspensión H2, `tsconfig.tsbuildinfo` trackeado, preexistentes H1-H3 de la
  feature 24 y el CTA de precios, lagunas de cobertura aceptadas de la 29, y las
  observaciones de `review_30.md` §9) quedan registrados al final de
  `progress/history.md`, en las entradas de las features 27-31.

---

## Último baseline verde conocido

`2026-07-31` (feature 31 cerrada, `APROBADO` en `progress/review_31.md`) —
`npm test` **18 archivos / 125 tests** · exit 0 · `npm run typecheck` exit 0 ·
`npm run build` exit 0 (aviso esperado de chunk >500 kB).

> Sobre esa cifra: el salto `18 / 119` → `18 / 125` es **íntegramente de la
> feature 31** (+6 tests en `src/lib/__tests__/api.test.ts`, de 7 a 13; **ningún
> archivo de test nuevo**, por eso el conteo de archivos no se mueve), sin ningún
> test previo roto. Medido tres veces de forma independiente: por el implementer
> (`impl_31.md` §4), por el revisor (`review_31.md` §1) y en este cierre.
>
> **Ojo:** a diferencia de los cierres anteriores, **sí hay una feature en vuelo**
> (la **32**, sin commitear en el árbol; ver el aviso de arriba). La medición de
> este cierre se hizo **con ese WIP presente** y coincidió igualmente en `18 / 125`
> porque la 32 aún no ha añadido tests. En cuanto los añada, la cifra cambia: el
> baseline verde que hay que respetar sigue siendo el del commit `040527a`.
