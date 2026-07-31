# Implementación — feature 30: Vista admin de precios (maqueta con datos mock)

> **Aviso de autoría, primero de todo.** El **código de producción de esta feature
> no lo escribí yo**: lo escribió otro implementer y está commiteado en `c8dec91`
> («feat(admin): maqueta la vista de precios contra el contrato real (WIP)»), que
> cayó por un límite de sesión antes de escribir los tests y este informe. Mi
> sesión aporta **solo** `src/admin/__tests__/PricesList.test.tsx` y este archivo.
>
> Todo lo que este informe cuenta sobre `PricesList.tsx`, `PlanEditDialog.tsx` y
> `mockPrices.ts` está **reconstruido leyendo el código y sus comentarios**, no
> recordado. Donde no he podido reconstruir la motivación de una decisión, lo digo
> explícitamente en §4 en vez de inventarla.

**Fecha:** 2026-07-31 · **Estado:** implementada y verificada, **pendiente de review**
(no marco `done`; tampoco he tocado `feature_list.json` ni `progress/current.md`:
quedan para el líder según las instrucciones de esta sesión).

---

## 1. Qué cambié yo

| Archivo | Estado | Qué es |
|---|---|---|
| `src/admin/__tests__/PricesList.test.tsx` | **nuevo** | 9 tests que cubren los 11 `acceptance` de la feature |
| `progress/impl_30.md` | **nuevo** | este informe |

**No modifiqué ningún archivo de producción.** Leí `src/admin/prices/*` y
`src/components/sections/Pricing.tsx` buscando un fallo de comportamiento que
justificara tocarlos (la sesión me autorizaba a arreglarlo y declararlo) y **no
encontré ninguno**: los 9 tests pasaron contra el código tal cual está commiteado,
sin un solo ajuste de producción. `git status` de `src/admin/prices/` queda limpio.

Tampoco se tocaron `src/AppRoutes.tsx`, `src/admin/AdminLayout.tsx`,
`src/lib/api.ts`, `docs/`, `src/components/sections/Pricing.tsx`, `src/admin/users/`
ni `src/admin/images/`. La ruta `/admin/prices` y el enlace del sidebar ya existían
desde la feature 27 y ya tienen cobertura en `src/__tests__/AppRoutes.test.tsx`
(«las secciones nuevas (Imágenes, Precios y Usuarios) montan bajo la guardia»).

## 2. El código de producción, reconstruido leyéndolo

Lo que sigue es descripción, no autoría. Sirve para que el reviewer no tenga que
reconstruirlo por su cuenta y para dejar por escrito qué es lo que mis tests fijan.

**`mockPrices.ts`** — almacén en memoria, sin `fetch` ni helpers de `src/lib/api.ts`:

- `MockPlan` declara los **14 campos del contrato real** (`docs/api-contract.md`
  §10.4) con nombres en español, y el `id` como **`string`** (el `BIGSERIAL` sin
  castear).
- `StoredPlan` = `MockPlan` **sin** `precio_anual` ni `ahorro_anual` y con los dos
  `NUMERIC` nulables. `MockPlanPatch` se deriva de `StoredPlan`, así que **los dos
  derivados son inexpresables en el PATCH por tipos**, no por disciplina. Esa es,
  leyendo el código, la decisión estructural de la maqueta.
- `calcularPrecioAnual` / `calcularAhorroAnual` / `derivarPrecios` replican
  `src/precios.js:54-70` del backend: `round(mensual × (1 − pct/100))` y
  `round((mensual − anual) × 12)`, con ambos a `null` si `es_custom`.
- `toNumber()` reproduce a propósito la **discrepancia documentada en §10.4**: el
  seed guarda `precio_mensual: null` en Enterprise y `toPlan()` devuelve **`0`**,
  no `null`. Es lo que hace que el test del plan Custom valga de algo: si la UI se
  fiara del nulo, pintaría «$0».
- El seed está alineado con los cuatro planes de `Pricing.tsx`. Con `descuento_pct:
  10`, Growth da `539`/`720` donde la landing tiene escrito a mano `540`/«$708/año»;
  el comentario del archivo asume esa diferencia y la justifica en que aquí las
  cifras se calculan. Mis tests fijan **los valores calculados** (539/720), que son
  los que dará el backend.

**`PricesList.tsx`** — tabla con `orden`, nombre (+ chips `Destacado` / `A convenir`),
mensual, descuento, anual, ahorro, trial y viñetas. Las cuatro celdas de cifras se
deciden por `p.es_custom`, no por el nulo. Sin `TablePagination` (el listado real es
`{ rows }` sin paginar). El botón de editar solo aparece con `role === 'admin'`.

**`PlanEditDialog.tsx`** — edita `nombre`, `precio_mensual`, `descuento_pct`,
`vinetas`, `vinetas_tachadas`, `trial_texto`, `orden`, `destacado` y `es_custom`.
`precio_anual` y `ahorro_anual` **no son campos**: se pintan en una caja
`data-testid="derivados"` recalculada en vivo con la misma aritmética.

## 3. Los tests que escribí

`src/admin/__tests__/PricesList.test.tsx` — 9 tests. Receta de
`docs/verification.md` §4 y `progress/explore_admin_patterns.md` §6.1:
`ThemeProvider` + `MemoryRouter` + `Route` anidada con `Outlet context` (la vista usa
`useOutletContext`), `userEvent`, `vi.spyOn(globalThis, 'fetch')`,
`vi.restoreAllMocks()` en `afterEach`, `resetMockPlanes()` en `beforeEach`. **No se
mockea `src/lib/api.ts`.** Modelo de referencia: `ImagesGrid.test.tsx`.

Mapa `acceptance` → test:

| # | Acceptance | Test |
|---|---|---|
| 1 | Listado con nombre, mensual, descuento, derivados, destacado, trial y orden | «pinta los cuatro planes…» |
| 2 | Derivados **no editables** | «no ofrece precio_anual ni ahorro_anual como campos editables…» |
| 3 | Aritmética exacta del backend | «recalcula … al cambiar el precio mensual, con el redondeo…» + «…al cambiar el descuento…» |
| 4 | Descuento **por plan**, no global | «…que es propio de cada plan y no global» (asserta que Team y Growth no se mueven) |
| 5 | Custom por `es_custom`, **no por el nulo** | «un plan a convenir … aunque el backend devuelva precio_mensual 0» + «el diálogo de un plan a convenir…» |
| 6 | Edición de `vinetas` y `vinetas_tachadas` | «editar las viñetas incluidas y las tachadas actualiza la vista» |
| 7 | Nombres de campo reales (14) | «el mock reproduce los 14 campos reales…» (`Object.keys` exacto) |
| 8 | `id` como string | mismo test (`typeof id === 'string'`, `'1'`) |
| 9 | `Pricing.tsx` no se toca | no aparece en el diff; verificable con `git status` |
| 10 | Ni `api.ts` ni red | `expect(globalThis.fetch).not.toHaveBeenCalled()` en el primer test |
| 11 | Los 4 casos que la feature pide explícitamente | los cuatro están, más 5 de refuerzo |

Detalles deliberados, por si parecen rarezas:

- **Comparo `textContent` exacto, no `toHaveTextContent`.** `toHaveTextContent('$14')`
  hace match de subcadena y pasaría con `$140`. Con importes derivados eso es
  precisamente el error que hay que poder ver.
- **Aritmética con casos que distinguen fórmulas.** `25` al 10 % → `22.5`, que
  redondea a **23**: `Math.floor` daría 22 y quitar el redondeo daría «$22.5». El
  ahorro se comprueba con `(100 − 90) × 12 = 120`, que un `× 1` no puede simular.
- **La no-editabilidad se asserta con el conjunto exacto de `textbox`**, no con un
  `queryByLabelText` negativo suelto: así un campo «Precio anual» añadido en el
  futuro rompe el test aunque se etiquete de otra forma, y además se comprueba que
  dentro de `data-testid="derivados"` no hay ningún control.
- **La fila del plan Custom se asserta en negativo sobre toda la fila**
  (`not.toContain('$')`, `not.toContain('%')`), además de las cuatro celdas con
  guion. Y antes se comprueba **contra el mock** que ese plan llega con
  `precio_mensual: 0` y los derivados en `null`: sin eso, el test no distinguiría
  «detecta `es_custom`» de «se fía del nulo y tiene suerte».
- **La viñeta tachada se distingue por su estilo** (`toHaveStyle('text-decoration:
  line-through')`), no solo por estar presente; verificado que la aserción es real
  con la mutación M5.

## 4. Lo que NO he podido reconstruir (y no invento)

- **Por qué el diálogo permite alternar `es_custom` con un `Switch`.** El contrato
  §10.4 no dice si el backend acepta ese cambio en un `PATCH`; el código lo ofrece y
  su mock lo soporta, pero no hay comentario que lo justifique ni nota en `docs/`.
  Mis tests **no fijan** ese comportamiento más allá de que, con `es_custom` activo,
  los campos de cifras quedan deshabilitados y no se calcula nada.
- **Por qué solo hay `update` en el mock y no `create`/`delete`,** teniendo el
  contrato `POST` y `DELETE`. El `acceptance` de la feature no los pide, así que lo
  leo como scope deliberado, pero es una lectura mía: no hay nada escrito.
- **Por qué `parseImporte` acepta decimales y `parseOrden` no.** Es coherente con
  `NUMERIC` vs entero, y el comentario lo insinúa, pero no está argumentado.
- **Si las cifras del seed se contrastaron con la landing una a una.** El comentario
  documenta la diferencia de Growth (539/720 vs 540/708) y la asume; del resto no
  hay constancia.

Ninguno de los tres primeros puntos es un fallo: son huecos de documentación que
señalo para que el reviewer no los lea como decisiones respaldadas.

## 5. Honestidad de los tests: mutación con reversión

Cada test se comprobó mutando **la lógica de producción que dice cubrir** y
verificando que se pone en rojo. Todas las mutaciones se revirtieron con
`git checkout -- <archivo>`; `git status --short src/admin/prices/` queda **vacío**
al final (comprobado).

| # | Archivo | Mutación | Resultado | Tests que cayeron |
|---|---|---|---|---|
| M1 | `mockPrices.ts` | `Math.round` → `Math.floor` en `calcularPrecioAnual` | 🔴 1 falla | «recalcula … precio mensual» ($22 ≠ $23) |
| M2 | `mockPrices.ts` | `ahorro = (mensual − anual) * 12` → `* 1` | 🔴 4 fallan | «pinta los cuatro planes», los dos de recálculo, «no ofrece … editables» |
| M3 | `PricesList.tsx` | celdas mensual/descuento decididas por `=== null` en vez de `es_custom` | 🔴 1 falla | «un plan a convenir…» (pinta «$0» y «0%») |
| M4 | `PlanEditDialog.tsx` | la vista previa deriva de `plan.*` (valor guardado) en vez de lo tecleado | 🔴 2 fallan | los dos de recálculo |
| M5 | `PricesList.tsx` | viñetas tachadas sin `textDecoration: 'line-through'` | 🔴 2 fallan | «pinta los cuatro planes», «editar las viñetas…» |
| M6 | `mockPrices.ts` | `updateMockPlan` ignora `patch.vinetas` / `patch.vinetas_tachadas` | 🔴 1 falla | «editar las viñetas…» |
| M7 | `PlanEditDialog.tsx` | se **añade** un `TextField` «Precio anual» editable | 🔴 1 falla | «no ofrece … como campos editables» |
| M8 | `mockPrices.ts` | el descuento guardado se propaga a **todos** los planes (descuento global) | 🔴 1 falla | «…propio de cada plan y no global» |
| M9 | `mockPrices.ts` | `toPlan()` devuelve `id: Number(row.id)` | 🔴 4 fallan | «14 campos … id como string» y los tres que localizan filas por `id` |

Lecturas de esto que me importan:

- M3 y M9 son las dos que separan un test honesto de uno decorativo aquí: M3 prueba
  que la detección del plan Custom se comprueba de verdad contra la discrepancia de
  §10.4, y M9 que el `id` string no es un detalle cosmético del mock.
- M7 es una mutación **aditiva** a propósito: el `acceptance` 2 prohíbe algo, y la
  única forma de demostrar que el test lo detecta es introducir lo prohibido.
- M5 confirma que `toHaveStyle` resuelve los estilos de Emotion en jsdom y no está
  pasando por vacío.

## 6. Verificación

Baseline **antes** (medido en esta sesión, sobre `c8dec91` limpio):

```
npm test          → Test Files 17 passed (17) · Tests 110 passed (110) · exit 0
npm run typecheck → exit 0
npm run build     → exit 0 (aviso «Some chunks are larger than 500 kB», esperado)
```

> Incidencia del baseline, sin impacto: la **primera** ejecución de `npm test` falló
> 1 test (`src/__tests__/AppRoutes.test.tsx:159`, `findByRole` agotando el timeout
> con la máquina cargada: `collect 75 s`, `tests 133 s`). Ese archivo pasa aislado
> (8/8) y la re-ejecución completa dio 110/110. Es **flakiness por timeout bajo
> carga**, no una regresión, y no lo toqué: no es mi feature. Lo dejo anotado por si
> reaparece.

Bloque completo **después**:

```
$ npm test && npm run typecheck && npm run build && echo "VERDE"
 Test Files  18 passed (18)
      Tests  119 passed (119)
   Duration  51.37s

> tsc -b --noEmit          (exit 0)

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
...
✓ built in 13.12s
VERDE
```

**Conteo: 17 archivos / 110 tests → 18 archivos / 119 tests.** +1 archivo, +9 tests,
ninguno previo roto. El aviso de chunk es el esperado (`docs/verification.md` §1).

> `docs/verification.md` §1-§2 y `docs/architecture.md` §8 siguen citando el
> baseline viejo. **No los he actualizado**: esta sesión tiene `docs/` fuera de los
> archivos que puedo tocar. Queda para el líder al cerrar la feature.

## 7. Autoevaluación contra `CHECKPOINT.md`

- **C1** ✅ 119/119, exit 0, sin tests previos rotos.
- **C2** ✅ los 11 `acceptance` mapeados en §3, y la honestidad de cada uno
  demostrada por mutación en §5.
- **C3** ✅ typecheck 0, build 0.
- **C4** ✅ test en `src/admin/__tests__/`, sin `any`, sin variables sin usar, sin
  hex (no aporta estilos).
- **C5** ✅ ningún `fetch` fuera de `src/lib/api.ts`; el test **asserta** que no sale
  ninguna petición. Sin state manager ni librería de datos nueva.
- **C6** ✅ no se consume ningún endpoint: es una maqueta. El contrato §10.4 ya
  estaba documentado antes de esta sesión.
- **C7** ⚠️ **parcial y a propósito**: `feature_list.json` sigue en `pending` y
  `progress/current.md` sin tocar, porque esta sesión los tenía excluidos. La
  documentación de lo hecho está aquí.
- **C8** ✅ no se leyó ni escribió `.env*`. No hace falta ninguna variable nueva.
- **C9** ✅ sin `console.log`, sin código comentado, sin `.orig`/`.bak`. Todas las
  mutaciones revertidas y verificadas con `git status`.
- **C10** ✅ una sola feature. No arreglé de paso el flake de `AppRoutes.test.tsx`
  (§6) ni nada de `docs/`.
- **C11** ✅ `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` y
  `.gitignore` intactos.

## 8. Para quien cierre la feature

1. Falta el review. No marco `done`.
2. Al cerrar: `feature_list.json` a `done`, resumen de `progress/current.md` a
   `progress/history.md`, y actualizar el baseline a **18 / 119** en
   `docs/verification.md` §1-§2 y `docs/architecture.md` §8.
3. Sin commitear por instrucción explícita: los commits los hace el humano.
