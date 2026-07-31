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

> **La siguiente es la feature 34 (cablear precios).** Lee los dos primeros
> puntos antes de tomarla: los dos cambian lo que el `feature_list.json` da por
> supuesto.

- **Features 32 y 33 cerradas como `done`**, ambas **APROBADAS**
  (`progress/review_32.md` y `progress/review_33.md`), commiteadas en
  `feat/admin-cruds` (`ba232e7` y `af2613e`). Los revisores **no se fiaron de los
  informes**: en la 32 se contrastó el contrato contra el backend real y se
  verificaron **6 mutaciones**; en la 33, **13 mutaciones**, todas en rojo y
  revertidas. Resúmenes completos al final de `progress/history.md`.
- **Feature 34 (cablear precios) es la siguiente**, y arrastra dos avisos:
  - **NO existe `GET /api/admin/precios`.** Verificado contra el servidor:
    responde **404, no 401**, o sea que no es un problema de sesión. El listado de
    planes del panel sale del endpoint **público** `GET /api/precios`. Es la misma
    asimetría que ya resolvió imágenes en la 33 (`publicJson` para leer,
    `apiJson` para escribir): **hay molde que copiar**. La descripción de la
    feature 30 en `feature_list.json` sigue diciendo lo contrario: es registro
    histórico, no contrato.
  - **`src/admin/prices/mockPrices.ts:37`** todavía dice que «`normalizeApi`
    descarta `field`». **Ya es falso** desde la feature 31. Se corrige —o
    desaparece con el archivo— **en la propia feature 34**, que es quien elimina
    o reduce ese mock; no se arregló antes porque C10 prohíbe tocar deuda ajena.
    La referencia equivalente de `docs/api-contract.md` ya está corregida.
- **Discrepancia viva para la 34** (`docs/api-contract.md` §10.4): `API_READY.md`
  dice que un plan Custom trae `precio_mensual` en `null`, pero el backend lo pasa
  por `toNumber()` y devuelve **`0`**. **La regla segura es detectar `es_custom`,
  nunca el nulo.**
- **Las features 35 y 36 (migrar la landing) llevan como `acceptance` una decisión
  explícita de fallback.** Las **tablas del backend están vacías y sin seed**, y la
  landing **no puede quedarse sin precios ni sin carrusel**: migrar `Pricing.tsx`,
  `Hero.tsx` y `CTAFinal.tsx` a pelo dejaría esas secciones **en blanco**. O se
  siembran datos —o se cargan desde el propio panel, que para eso están las
  32-34— o la feature define un fallback explícito. No es un detalle de
  implementación: es la condición para no romper producción.
- **Observaciones no bloqueantes heredadas de las dos reviews, sin arreglar:**
  - **`getAdminUser` quedó sin consumidor ni test** (feature 32): lo pedía el
    acceptance y respeta el patrón de `getAdminArticle`, pero no lo llama nadie.
    Si la 34 copia el molde, serán tres helpers de detalle sin consumidor: decide
    si exigirle un test directo en `src/lib/__tests__/api.test.ts` o no pedir el
    helper hasta que haya pantalla.
  - **El error del listado de usuarios no tiene `role="alert"`**
    (`UsersList.tsx:118`), así que un lector de pantalla no se entera del `409`
    del último admin. La 33 sí lo arregló **en su propio archivo**;
    `UsersList.tsx` y `LeadsList.tsx` siguen con el patrón viejo.
  - **Ningún test distingue la tabla `FIELD_BY_BACKEND` de un cast crudo**
    (feature 33): el control negativo N1 del revisor —sustituirla por
    `res.field as FormField`— pasa los 23 tests en verde. Un caso con un `field`
    desconocido (p. ej. `section`) que deba caer al `Alert role="status"` cerraría
    el círculo. **Aplícalo también a la 34.**
- **El flake de la suite bajo carga de CPU es deuda real y sigue abierta.** No es
  solo `AppRoutes.test.tsx`: alcanza a **cualquier test pesado de MUI +
  `userEvent`** (confirmado también en `ContactModal` y `PricesList`), con
  `testTimeout` de 15 s. Regla práctica mientras no se arregle: **nunca correr dos
  suites a la vez**, y si sale un rojo, **repetirlo aislado antes de reportarlo**.
  Es candidato a feature propia, pero **toca configuración de tests
  (infraestructura)**, así que **requiere que lo pida un humano**.
- **Drift documental, tercer cierre consecutivo y ya mayor** (ninguna review lo
  cuenta como fallo porque C6 solo exige `api-contract.md`): `docs/architecture.md:9`
  sigue diciendo que usuarios e imágenes están «en maquetación con datos mock» y
  su §5 no lista `/api/admin/users`, `/api/images` ni `/api/admin/images`;
  `docs/verification.md` §1-§2 y `docs/architecture.md` §8 siguen anunciando
  `15 archivos / 86 tests` cuando el real es **18 / 144**; y
  `docs/api-contract.md` §1 anuncia «los tres helpers» y afirma que «todas las
  peticiones con body van con `Content-Type: application/json`», que con
  `apiUpload` (cuarto transporte) ya no es universal.
- El resto de pendientes vivos (copy obsoleto de `AdminHome.tsx`, arnés de
  suspensión H2, `tsconfig.tsbuildinfo` trackeado pese a estar en `.gitignore`,
  preexistentes H1-H3 de la feature 24 y el CTA de precios, lagunas de cobertura
  aceptadas de la 29, `ImagePatchInput` sin derivar de `AdminImage`, `loading`
  como booleano en vez de máquina de estados en las tres pantallas, y las
  observaciones de `review_30.md` §9 y `review_31.md` §9) quedan registrados al
  final de `progress/history.md`, en las entradas de las features 27-33.

---

## Último baseline verde conocido

`2026-07-31` (features 32 y 33 cerradas, `APROBADO` en `progress/review_32.md` y
`progress/review_33.md`) — `npm test` **18 archivos / 144 tests** · exit 0 ·
`npm run typecheck` exit 0 · `npm run build` exit 0 (aviso esperado de chunk
>500 kB).

> Sobre esa cifra: el salto `18 / 125` → `18 / 133` → **`18 / 144`** es
> íntegramente de las features 32 (**+8 netos**: 20 casos nuevos − 12 de la
> maqueta de usuarios) y 33 (**+11 netos**: 23 casos nuevos − 12 de la maqueta de
> imágenes). **Ningún archivo de test nuevo** —los dos existentes se reescribieron,
> por eso el conteo de archivos no se mueve— y **ningún test previo roto**.
> Medido de forma independiente por cada implementer, por cada revisor y en este
> cierre.
>
> A diferencia del cierre de la 31, **el árbol ya no tiene features en vuelo**:
> las dos están commiteadas (`ba232e7` y `af2613e`) y `git status` solo muestra
> `tsconfig.tsbuildinfo`, artefacto trackeado que toca cualquier `typecheck`
> (deuda preexistente, ya registrada).
