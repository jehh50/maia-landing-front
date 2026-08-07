# APROBADO — feature 30: Vista admin de precios (maqueta con datos mock)

**Veredicto:** APROBADO (`APPROVED`)
**Fecha:** 2026-07-31 · **Revisor:** agente reviewer
**Alcance revisado:** `c8dec91` (producción, otro implementer) + `fdf80c4` (tests e informe)

> Autoría partida: el código de producción lo escribió un implementer que cayó por
> límite de sesión; `progress/impl_30.md` es una **reconstrucción leída del código**,
> no testimonio del autor. Esta review no se apoya en ese informe para nada
> sustantivo: todo lo que se afirma abajo está verificado ejecutando o leyendo la
> fuente.

---

## 1. Verificación ejecutada (por el revisor, no reportada)

| Comando | Resultado |
|---|---|
| `npm test` | **18 archivos / 119 tests passed**, exit 0 (54.20 s) |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, con el aviso esperado `Some chunks are larger than 500 kB` |

Baseline previo 17 / 110 → **+1 archivo, +9 tests, ningún test previo roto**. Coincide
con el conteo del líder y con el de `impl_30.md` §6.

## 2. Los 11 `acceptance`, uno a uno

| # | Acceptance | Verificación | ✔ |
|---|---|---|---|
| 1 | Listado con nombre, mensual, descuento, anual, ahorro, destacado, trial y orden | `PricesList.tsx:88-163` pinta las 9 columnas; test «pinta los cuatro planes…» (`PricesList.test.tsx:56-97`) asserta orden (`:67`), nombre, mensual, descuento, anual, ahorro, trial (`:72`), guion sin trial (`:81`) y chip `Destacado` (`:79`) | [x] |
| 2 | Derivados **no editables** | `PlanEditDialog.tsx` no tiene ningún `TextField` de precio anual/ahorro; se pintan en la caja `data-testid="derivados"` (`:173-208`). El test (`:99-122`) asserta el **conjunto exacto** de `textbox` por `aria-label` y que dentro de `derivados` no hay `textbox` ni `spinbutton`. Refuerzo estructural: `MockPlanPatch` se deriva de `StoredPlan`, que **no tiene** esos campos (`mockPrices.ts:66-91`) → son inexpresables por tipos, no por disciplina | [x] |
| 3 | Aritmética exacta del backend | `mockPrices.ts:99-105` replica `round(mensual*(1-pct/100))` y `round((mensual-anual)*12)`. Tests con casos que **distinguen fórmula**: 25 → `$23` (`round(22.5)`, no `floor`→22 ni «$22.5»), 100 → `$90`/`$120`, 19@25 % → `$14`/`$60`. Confirmado por mutación (§4, MB y MC) | [x] |
| 4 | Descuento **POR PLAN** | No existe ningún estado de descuento global: `descuento_pct` es columna del plan (`mockPrices.ts:47`) y campo del diálogo (`PlanEditDialog.tsx:161-170`). El test `:155-183` guarda 25 % en Starter y asserta que Team y Growth **conservan** 10 %/`$179`/`$539`. Confirmado por mutación MD | [x] |
| 5 | Custom por `es_custom`, **no por el nulo** | Las cuatro celdas de cifras se deciden por `p.es_custom` (`PricesList.tsx:121-132`) y el diálogo por `esCustom` (`:70`, `:178`). El test `:185-213` primero comprueba **contra el mock** que Enterprise llega con `precio_mensual: 0` y derivados `null`, y luego que las 4 celdas dan `—` y que la fila entera **no contiene `$` ni `%`**. Confirmado por mutación MA | [x] |
| 6 | Edición de `vinetas` y `vinetas_tachadas` | Dos `TextField` multilinea (`PlanEditDialog.tsx:210-232`) + `parseVinetas`. Test `:229-255`: sustituye ambas listas, asserta 3 `listitem`, que la vieja desapareció y que la tachada se distingue por `line-through`. Confirmado por MI y MH | [x] |
| 7 | Los 14 nombres de campo reales | `MockPlan` (`mockPrices.ts:41-60`) declara exactamente los 14 en español. Test `:257-273` con `Object.keys(...).sort()` **exacto** — un campo de más o de menos rompe | [x] |
| 8 | `id` como **string** | `id: string` (`mockPrices.ts:43`), seed `'1'..'4'`. Test `:269-270` (`typeof` + valor). No es cosmético: la mutación MF (`id: Number(...)`) tumba **4** tests | [x] |
| 9 | `Pricing.tsx` **NO se toca** | `git diff c8dec91^..HEAD -- src/components/sections/Pricing.tsx` → **vacío**. Su último commit es `734732f`, anterior a `c8dec91` (verificado con `git merge-base --is-ancestor`). Su array `plans` hard-coded sigue intacto. No requiere test (`docs/verification.md` §5) | [x] |
| 10 | Ni `src/lib/api.ts` ni red | `git diff c8dec91^..HEAD -- src/lib/api.ts` → **vacío** (último cambio suyo: `25bd6b9`). `grep -nE "fetch\("` sobre los tres archivos de producción → **0 coincidencias**. Además el test espía `globalThis.fetch` y asserta `not.toHaveBeenCalled()` (`:96`) | [x] |
| 11 | Los 4 tests que la feature pide | Los cuatro están (pinta planes / recálculo ×2 / Custom sin cifras / viñetas), más 5 de refuerzo: derivados no editables, diálogo de Custom, 14 campos + id string, y rol editor de solo lectura | [x] |

**11/11.**

## 3. Fidelidad al contrato real (§10.4) — el punto crítico

Ninguno de los seis errores del mapeo antiguo que `docs/api-contract.md` §10.4 lista
como «para que nadie los reintroduzca» aparece en el código:

- **Campos en español**: los 14 exactos, sin `name`/`monthly`/`annual` por ninguna parte.
- **`id` string**: `mockPrices.ts:43`, seed `'1'`, y la mutación MF demuestra que el test lo sujeta.
- **Derivados de solo lectura**: `StoredPlan` (`:66-69`) los excluye y `MockPlanPatch` (`:91`)
  se deriva de él → el `PATCH` **no puede** llevarlos. La UI solo los muestra.
- **Aritmética exacta**: `:99-105`, idéntica a `src/precios.js:54-70`, con `Math.round`,
  y `precio_anual` tratado como **mensual facturado anualmente** (19@10 % → 17, ahorro 24;
  reproduce el «Ahorras $24/año» de la landing).
- **Descuento por plan**, no global: no existe estado de sección alguno.
- **`es_custom` como campo propio**, no `monthly: 0` = «a convenir».

Además reproduce fielmente lo que es contrato pero no es obvio: listado `{ rows }` **sin
paginación** (`PricesList.tsx:34-35`, sin `TablePagination`), orden `orden ASC, id ASC`
(`mockPrices.ts:233-235`), `422 { error, field }` modelado en `MockResult` (`:82-84`) y
mapeado a error por campo en el diálogo (`PlanEditDialog.tsx:112-114`).

## 4. La trampa del plan Custom — verificada

El mock **reproduce la discrepancia a propósito**, que es lo que hace que el test valga:
el seed guarda `precio_mensual: null` (`mockPrices.ts:181`) y `toNumber()` (`:117-119`,
copia de `src/precios.js:48-51`) lo devuelve como **`0`**, tal como hace el backend real —
no como dice `API_READY.md:69-72`. Sobre ese dato envenenado, la UI decide por `es_custom`.

Lo comprobé mutando `PricesList.tsx:122,125` para que decidiera por el nulo
(`p.precio_mensual == null`), que es exactamente el error que induciría el handoff:

```
× un plan a convenir (es_custom) no muestra ninguna cifra, aunque el backend devuelva precio_mensual 0
  AssertionError: expected '$0' to be '—'
```

El test **discrimina**. Un plan Custom no pinta ninguna cifra: ni «$0», ni «0%», ni
«Ahorras $0/año» (aserción en negativo sobre la fila completa, `:210-211`), y el diálogo
deshabilita precio y descuento y muestra «Sin cifras» en lugar de calcular (`:215-227`).

## 5. Honestidad de los tests — mutación reproducida por el revisor

**No di por buena la tabla de `impl_30.md` §5: ejecuté las nueve mutaciones yo mismo**,
una por una, corriendo `npx vitest run src/admin/__tests__/PricesList.test.tsx` tras cada
una y revirtiendo con `git checkout -- src/admin/prices/`.

| Mutación | Archivo | Resultado obtenido | Coincide con lo reportado |
|---|---|---|---|
| `Math.round` → `Math.floor` en `calcularPrecioAnual` | `mockPrices.ts` | 🔴 1 falla | ✔ (M1) |
| ahorro `* 12` → `* 1` | `mockPrices.ts` | 🔴 4 fallan | ✔ (M2) |
| celdas decididas por el nulo en vez de `es_custom` | `PricesList.tsx` | 🔴 1 falla («plan a convenir») | ✔ (M3) |
| vista previa derivada del valor guardado, no del tecleado | `PlanEditDialog.tsx` | 🔴 2 fallan | ✔ (M4) |
| viñetas tachadas sin `line-through` | `PricesList.tsx` | 🔴 2 fallan | ✔ (M5) |
| `updateMockPlan` ignora `patch.vinetas*` | `mockPrices.ts` | 🔴 1 falla | ✔ (M6) |
| se **añade** un `TextField` «Precio anual» editable | `PlanEditDialog.tsx` | 🔴 1 falla | ✔ (M7) |
| el descuento guardado se propaga a todos los planes | `mockPrices.ts` | 🔴 1 falla («propio de cada plan y no global») | ✔ (M8) |
| `id: Number(row.id)` | `mockPrices.ts` | 🔴 4 fallan | ✔ (M9) |

**Nueve de nueve reproducidas con el mismo número de fallos.** La tabla del informe es
exacta, no decorativa. Notas de calidad que confirmo por lectura:

- Se compara `textContent` **exacto** (`:31-33`), no `toHaveTextContent`, que haría match
  de subcadena («$14» dentro de «$140») — precisamente el fallo invisible en cifras derivadas.
- La no-editabilidad se asserta con el **conjunto exacto** de `aria-label` de los `textbox`,
  así que un campo prohibido añadido en el futuro rompe aunque se etiquete distinto (M7 lo prueba).
- El test del plan Custom **verifica antes contra el mock** que el dato llega envenenado
  (`precio_mensual: 0`), sin lo cual no distinguiría «detecta `es_custom`» de «se fía del
  nulo y tiene suerte».
- El `id` no es cosmético: MF tumba 4 tests porque `updateMockPlan` localiza por `p.id === id`.

**Árbol restaurado:** tras las nueve mutaciones, `diff` de los tres archivos contra la copia
previa → **IDÉNTICOS**; `git status --porcelain` solo muestra ` M tsconfig.tsbuildinfo`
(artefacto de build, ya modificado antes de esta sesión).

## 6. Fronteras, estilos y accesibilidad

- **Arquitectura (C5):** cero `fetch` en los tres archivos; ningún import de `src/lib/api.ts`
  salvo el **tipo** `AdminUser` (`PricesList.tsx:8`), que es derivar en vez de duplicar.
  Sin state manager ni librería de datos nueva; solo `useState`/`useCallback`.
- **Estilos (C4):** `grep -nE "#[0-9a-fA-F]{3,8}|className=|rgba\(|: any|as any"` sobre los
  cuatro archivos → **0 coincidencias**. Todo por `sx` + tokens (`surface.soft`, `divider`,
  `success.main`, `text.secondary`, `text.disabled`). El único color como valor JS es
  `tokens.text.disabled` dentro de un `style={{}}` nativo (`PricesList.tsx:15`), que es
  literalmente el patrón vigente en `LeadsList.tsx:135`, `UsersList.tsx:124`,
  `LeadDetailDialog.tsx:18` e `ImagesGrid.tsx:347` (conventions §3 punto 3). No hay ningún
  string CSS crudo con color, así que no hacía falta `alpha()`.
- **Accesibilidad (conventions §6):** `aria-label` en los 7 `textbox`, en los 2 `Switch`
  y en el `IconButton` de editar (`Editar ${nombre}`); los tests los localizan por rol y
  nombre accesible, no por testid, en todos los controles.
- **Validación por campo:** `errors: Partial<Record<MockPlanField, string>>` con `helperText`
  por campo y limpieza al teclear (`PlanEditDialog.tsx:62-64`), más la validación de servidor
  simulada que devuelve `{ error, field }` y se pinta en su campo (`:112-114`).
- **Ubicación:** `src/admin/__tests__/PricesList.test.tsx` es donde viven los otros seis
  tests de admin (`AdminLayout`, `ArticlesList`, `ImagesGrid`, `LeadsList`, `Login`,
  `UsersList`) y es la ruta que fija el propio `feature_list.json`.

## 7. Honestidad del informe reconstruido

`progress/impl_30.md` declara la autoría partida en el encabezado, distingue «lo que cambié
yo» (§1) de «el código de producción, reconstruido leyéndolo» (§2), y su §4 marca como **no
reconstruible** cuatro cosas sin inventarles motivación: por qué el diálogo deja alternar
`es_custom`, por qué el mock solo tiene `update` y no `create`/`delete`, por qué
`parseImporte` acepta decimales y `parseOrden` no, y si el seed se contrastó con la landing.
Las cuatro son huecos reales de documentación, verificados: en el código no hay comentario
ni nota en `docs/` que las respalde. **No hay ninguna afirmación de motivación que el código
no sostenga.** La §5 (mutación) resultó exacta al contrastarla. La §6 declara además un
flake propio de `AppRoutes.test.tsx` bajo carga sin apropiárselo ni «arreglarlo».

## 8. Checkpoints

- **C1** [x] `npm test` exit 0 — 18/119, ningún test previo roto.
- **C2** [x] los 11 `acceptance` con verificación (§2); los 9 que admiten test la tienen, y
  el 9 y el 10 se verifican por `git diff` vacío + ausencia de `fetch`, coherente con
  `docs/verification.md` §5.
- **C3** [x] typecheck 0 y build 0 (aviso de chunk, esperado).
- **C4** [x] sin `any`, sin variables sin usar (lo garantiza `noUnusedLocals` con typecheck 0),
  sin hex, sin `className` de utilidad, nombres y ubicación correctos.
- **C5** [x] ningún `fetch` fuera de `src/lib/api.ts` — de hecho ninguno en absoluto; sin
  state manager ni data-fetching nuevos; `StoredPlan`/`MockPlanPatch` derivados con
  `Omit<>`/`Partial<>` en vez de duplicados.
- **C6** [x] no se consume ningún endpoint (es maqueta); §10.4 ya estaba documentado y no
  hizo falta tocarlo.
- **C7** [x] `feature_list.json` sigue en `pending`, que es el estado real hasta este
  veredicto; `progress/current.md` documenta la feature en curso y `progress/impl_30.md`
  recoge lo hecho, la verificación y los huecos. Al cerrar corresponde al líder marcar `done`.
- **C8** [x] ningún `.env*` leído ni escrito; no hace falta variable nueva.
- **C9** [x] sin `console.log`, sin código comentado, sin `.orig`/`.bak`. El único `TODO`
  es `mockPrices.ts:33`, con referencia (`TODO(feature-30)`) y contexto de cableado futuro,
  que es el formato que exige conventions §7. `git status` limpio salvo `tsconfig.tsbuildinfo`.
- **C10** [x] solo `src/admin/prices/*` y su test. No se aprovechó para tocar `Pricing.tsx`,
  `api.ts`, `docs/`, ni el flake de `AppRoutes.test.tsx`.
- **C11** [x] `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `.gitignore`
  e `index.html`: `git diff c8dec91^..HEAD` vacío.

**11/11.** Ningún fallo en C1, C2, C3 ni C8.

## 9. Observaciones no bloqueantes (NO exigen cambio para cerrar)

1. `mockPrices.ts:219` documenta `formatMoneda` como «importe en pesos» y usa `es-MX`,
   mientras `PlanEditDialog.tsx:156` dice al usuario «En dólares, sin símbolo». La moneda
   no está definida en el contrato ni en la landing (que usa `toLocaleString()` a secas),
   así que ninguno de los dos es «incorrecto», pero el copy y el comentario se contradicen.
   Conviene unificarlo cuando se cablee el recurso.
2. Densidad de `data-testid`: 9 entre los dos componentes, frente a 1 por vista en el resto
   del admin. Está justificado (hacen falta para comparar `textContent` exacto de celdas
   numéricas, y los controles siguen siendo accesibles por rol), pero es un patrón nuevo
   que conviene no extender sin motivo.
3. El `Switch` «Plan a convenir» permite alternar `es_custom` en un plan existente y §10.4
   no dice si el `PATCH` real lo acepta. Los tests no fijan ese comportamiento más allá de
   los campos deshabilitados. **Comprobar contra el backend antes de cablear**; si no lo
   admite, el control debería desaparecer del formulario de edición.
4. El seed de Growth da `539`/`720` donde la landing tiene a mano `540`/«$708/año». Está
   documentado y asumido en `mockPrices.ts:136-144`; es la diferencia que aparecerá el día
   que la landing consuma la API, no un error de esta feature.

## 10. Para el líder, al cerrar

1. Marcar la feature 30 como `done` en `feature_list.json`.
2. Actualizar el baseline a **18 archivos / 119 tests** en `docs/verification.md` §1 y §2
   (hoy dicen `15 / 86`, desfase que ya arrastraban las features 28 y 29) y en
   `docs/architecture.md` §8 (`15 archivos, 86 tests`). No es deuda de esta feature: el
   implementer tenía `docs/` fuera de su alcance.
3. Mover el resumen de `progress/current.md` a `progress/history.md`.
