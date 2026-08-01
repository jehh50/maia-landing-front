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

> **El cableado del admin está COMPLETO.** Las features 32 (usuarios), 33
> (imágenes) y 34 (precios) están cerradas como `done` y **los tres CRUD consumen
> ya la API real**. Lo único que queda del backlog son las **dos features de la
> landing, la 35 y la 36** — y ninguna de las dos se puede tomar sin leer antes el
> punto de la decisión de fallback, porque **está a la espera de un humano**.

- **Feature 34 cerrada como `done`, APROBADA** (`progress/review_34.md`),
  commiteada en `feat/admin-cruds` (`027d510`). El revisor **no se fió del
  informe**: reejecutó el bloque completo, **reprodujo 7 mutaciones** (todas en
  rojo y revertidas, incluida la **M13**, cuya corrección confirmó como real y no
  a medias), contrastó contra la fuente del backend el **404** de
  `GET /api/admin/precios` y el **422** de `precio_mensual: null`, y midió con
  `tsc` el alcance real del `Omit`. Resumen completo al final de
  `progress/history.md`.
- **Aviso de la review de la 34, importante para la feature 35:** **el `Omit` de
  los tipos de escritura bloquea el literal, pero NO el *spread*.** Verificado con
  `tsc`: `createAdminPlan({ ...unAdminPlan })` y `updateAdminPlan(id, plan)`
  **compilan** y colarían `precio_anual` / `ahorro_anual` en el body, porque el
  excess property check no aplica ni al spread ni a las variables. Hoy no ocurre
  —el código construye un object literal tipado— pero **quien construya un payload
  esparciendo un objeto puede colar los campos derivados sin que el compilador se
  lo impida**. Si hace falta blindarlo, el patrón es declarar las claves prohibidas
  en `never` (`{ precio_anual?: never; ahorro_anual?: never }`).
- **Features 35 y 36: hay una decisión de producto pendiente, y es de un humano.**
  Migran `Pricing.tsx` (35) y `Hero.tsx` + `CTAFinal.tsx` (36) a consumir
  `/api/precios` y `/api/images`. Las dos llevan como `acceptance` una **decisión
  explícita de fallback** porque **las tablas del backend están vacías y sin
  seed**: cablearlas sin más dejaría **la sección de precios y el carrusel del
  Hero en blanco para cualquier visitante**. No es un detalle de implementación,
  es la condición para no romper producción. Las salidas posibles son sembrar
  datos, cargarlos desde el propio panel —que para eso están las 32-34— o definir
  un fallback explícito en el código. **La decisión la toma el humano, no el
  implementador**: está planteada y a la espera.
- **Observaciones no bloqueantes heredadas y sin arreglar:**
  - **`getAdminUser` sigue sin consumidor ni test** (feature 32): lo pedía su
    acceptance y respeta el patrón de `getAdminArticle`, pero no lo llama nadie.
    `getAdminPlan` tampoco tiene consumidor en la UI, pero **sí tiene test
    directo** desde la 34 (URL, método y `credentials` congelados), así que el
    hueco vivo es solo el de `getAdminUser`.
  - **El error del listado de usuarios no tiene `role="alert"`**
    (`UsersList.tsx:118`), así que un lector de pantalla no se entera del `409`
    del último admin. Las features 33 y 34 lo arreglaron **en sus propios
    archivos**; `UsersList.tsx` y `LeadsList.tsx` siguen con el patrón viejo.
  - **El flake de la suite bajo carga de CPU sigue abierto.** Alcanza a cualquier
    test pesado de MUI + `userEvent` (`AppRoutes`, `ContactModal`, `PricesList`),
    con `testTimeout` de 15 s. Regla práctica: **nunca correr dos suites a la vez**
    y, si sale un rojo, **repetirlo aislado antes de reportarlo**. Es **deuda de
    infraestructura** (toca configuración de tests), así que **requiere que lo pida
    un humano**; no se manifestó ni en la review de la 34 ni en este cierre.
  - **Ningún test de `ImagesGrid`/`ImageUploadDialog` distingue la tabla
    `FIELD_BY_BACKEND` de un cast crudo** (observación 2 de `review_33.md`). La 34
    cerró el círculo **en su pantalla** con el caso del `422 { field: 'es_custom' }`;
    en imágenes sigue abierto.
  - **Drift documental, cuarto cierre consecutivo, ya candidato a feature propia**
    (ninguna review lo cuenta como fallo porque C6 solo exige `api-contract.md`):
    `docs/verification.md` §1-§2 y `docs/architecture.md` §8 siguen anunciando
    `15 archivos / 86 tests` cuando el real es **18 / 159**;
    `docs/architecture.md` §5 no lista `/api/precios`, `/api/admin/precios`,
    `/api/admin/users`, `/api/images` ni `/api/admin/images`, y su §9 (y la
    línea 9) siguen diciendo que usuarios, imágenes y precios están «en maquetación
    con datos mock»; `docs/api-contract.md` §1 anuncia «los tres helpers» cuando
    con `apiUpload` hay **cuatro transportes**, y su §4 ter remite a §10.4, que hoy
    es solo un puntero a §4 quater.
- El resto de pendientes vivos (copy obsoleto de `AdminHome.tsx`, arnés de
  suspensión H2, `tsconfig.tsbuildinfo` trackeado pese a estar en `.gitignore`,
  preexistentes H1-H3 de la feature 24 y el CTA de precios, lagunas de cobertura
  aceptadas de la 29, `ImagePatchInput` sin derivar de `AdminImage`, la asimetría
  cosmética del diálogo de un plan Custom, `loading` como booleano en vez de
  máquina de estados en las cuatro pantallas, y las observaciones de
  `review_30.md` §9 y `review_31.md` §9) quedan registrados al final de
  `progress/history.md`, en las entradas de las features 27-34.

---

## Último baseline verde conocido

`2026-07-31` (feature 34 cerrada, `APROBADO` en `progress/review_34.md`) —
`npm test` **18 archivos / 159 tests** · exit 0 · `npm run typecheck` exit 0 ·
`npm run build` exit 0 (aviso esperado de chunk >500 kB).

> Sobre esa cifra: el salto `18 / 144` → **`18 / 159`** es íntegramente de la
> feature 34 (**+15 netos**: 24 casos nuevos − 9 de la maqueta de precios).
> **Ningún archivo de test nuevo** —`PricesList.test.tsx` se reescribió, por eso el
> conteo de archivos no se mueve— y **ningún test previo roto**. Medido tres veces:
> por el implementer, por el revisor y en este cierre.
>
> Las tres features del cableado del admin están commiteadas (`ba232e7`, `af2613e`
> y `027d510`) y **el árbol no tiene features en vuelo**: `git status` solo muestra
> `tsconfig.tsbuildinfo`, artefacto trackeado que toca cualquier `typecheck` (deuda
> preexistente, ya registrada).
