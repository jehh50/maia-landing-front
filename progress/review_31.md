# Review — feature 31: `normalizeApi` propaga el campo `field` de los errores 422

**Veredicto: APROBADO** (equivale a `APPROVED` en la plantilla de `CHECKPOINT.md`).

Revisor: agente `reviewer`. Fecha: 2026-07-31. Rama `feat/admin-cruds`, commit
`040527a` (padre `a3fe70a`). No se editó ni una línea de código del implementer.

---

## 1. Verificación ejecutada por el revisor (no tomada del informe)

| Comando | Resultado |
|---|---|
| `npm test` | **18 archivos / 125 tests**, `Test Files 18 passed (18)`, exit **0** |
| `npm run typecheck` | `tsc -b --noEmit`, exit **0** |
| `npm run build` | `✓ built in 15.05s`, exit **0** |

El aviso `Some chunks are larger than 500 kB` aparece y es el esperado
(`docs/verification.md` §1): no invalida C3.

Delta contra el baseline real del árbol (feature 30 cerrada, `18 / 119`): **+6
tests, 0 archivos nuevos, 0 tests previos rotos**. Coincide con lo que declara
`progress/impl_31.md` §4 y con la medición del líder.

---

## 2. Los 4 `acceptance`, uno a uno

**A1 — «`ApiFailure` incluye `field?: string`, y `normalizeApi` lo propaga cuando
el body del error lo trae». CUMPLE.**
`src/lib/api.ts:81` añade `field?: string` con docblock (`:75-80`).
`src/lib/api.ts:100-106` lee el valor; `:142-144` lo propaga.
Verificado por test (`api.test.ts:136-149`) **y por mutación reproducida por mí**
(ver §5): al quitar la propagación el test cae.

**A2 — «El cambio es aditivo: ningún consumidor existente de `normalizeApi`
cambia de forma ni se rompe». CUMPLE.** Detalle en §3.

**A3 — «Test del caso 422 con `field` y del caso 422 sin `field`». CUMPLE.**
`api.test.ts:136` (con `field`) y `:151` (sin `field`). El segundo no se limita a
mirar el valor: usa `toEqual` exacto **más** `expect('field' in res).toBe(false)`,
que es la única aserción capaz de detectar un `field: undefined` (ver §5,
mutación B: `toEqual` por sí solo ignora las claves `undefined`).
Además cubre 4 bordes no exigidos: `field` no-string (`:163`), `field` en blanco
(`:175`), `5xx` sin body (`:187`) y fallo de red (`:196`).

**A4 — «`docs/api-contract.md` documenta la forma actualizada de `ApiFailure`».
CUMPLE.** Detalle en §7.

Por `docs/verification.md` §5, la lógica de `src/lib/` exige test obligatorio y lo
tiene; el punto documental (A4) no requiere test.

---

## 3. ¿Es de verdad ADITIVO? Sí, comprobado a mano

- `git diff a3fe70a 040527a -- src/admin src/pages src/components src/hooks src/theme`
  → **salida vacía**. Ningún consumidor tocado. `git show --stat 040527a` lista
  exactamente 4 archivos: `src/lib/api.ts`, `src/lib/__tests__/api.test.ts`,
  `docs/api-contract.md` y `progress/impl_31.md`.
- **Los dos consumidores de `normalizeApi`** son `src/admin/leads/LeadsList.tsx:34`
  y `src/pages/BlogIndex.tsx:20` (verificado con `grep -rn "normalizeApi" src`).
  Ninguno cambia de forma: `error` sigue llegando siempre y ambos ignoran `field`,
  que además **ni siquiera existe como clave** en sus casos. Sus tests siguen
  verdes (`LeadsList.test.tsx` 3/3, más los de `BlogIndex`).
- **Los consumidores de la forma cruda** (`AdminGuard`, `Login`, `ArticlesList`,
  `ArticleEdit`, `BlogArticle`, `sections/Blog`, `ContactModal`) no pueden verse
  afectados: el diff de `src/lib/api.ts` son **3 hunks**, todos dentro del tipo
  `ApiFailure`, de la nueva `readErrorField` y del cuerpo de `normalizeApi`.
  `postLead`, `apiJson`, `publicJson` y todos los helpers quedan intactos. Lo
  sujeta además el test previo «no cambia el contrato HTTP de los helpers
  existentes» (`api.test.ts:115-128`), que sigue verde sin tocarse.
- La clave **se omite**, no se emite como `undefined`: `return field ? { ...failure, field } : failure`
  (`api.ts:144`). Un error sin `field` devuelve literalmente
  `{ ok: false, status, error }`, idéntico a antes de la feature.

---

## 4. La guarda de lectura de `field`: correcta, sin `any` ni aserciones

`src/lib/api.ts:100-106`:

```ts
if (data && typeof data === 'object' && 'field' in data) {
  const { field } = data;
  if (typeof field === 'string' && field.trim()) return field;
}
return null;
```

Cero `any`, **cero aserciones de tipo** (`docs/conventions.md` §2, C4): el
estrechamiento por `'field' in data` basta para desestructurar. Correctamente
**no** tocó el `as { error?: unknown }` preexistente de `readErrorMessage`
(`api.ts:90`): no es su feature (C10).

Bordes comprobados por mí con un test temporal (creado, ejecutado y **borrado**;
`git status` limpio después). Los 9 casos pasan sin lanzar y sin emitir la clave:

| Caso probado | Resultado |
|---|---|
| body string JSON (`"nope"`) | `{ ok, status, error }`, `'field' in res === false` |
| body array `[1,2]` | sin `field` |
| body number `7` | sin `field` |
| body `null` explícito y body ausente | sin `field` |
| `field: null` | sin `field` |
| `field: { a: 1 }` / no-string | sin `field` |
| `field: '   '` | sin `field` |
| `{ field: 'email' }` **sin** `error` | `{ ok, status, error: fallback, field: 'email' }` — coherente |

---

## 5. Honestidad de los tests: mutaciones reproducidas por el revisor

No me fié del informe. Muté el código dos veces y **restauré** con
`git checkout -- src/lib/api.ts`, verificando `md5sum` idéntico al original
(`d8a51f9e…`) y `diff` vacío contra la copia de respaldo.

**Mutación A — `return failure;` (sin propagar):**
```
× 422 con field: lo propaga junto al mensaje del backend
  AssertionError: expected undefined to be 'body_md'
Tests  1 failed | 12 passed (13)
```

**Mutación B — propagar sin guardas (`String(field)` + clave siempre presente):**
```
× 422 sin field: conserva exactamente la forma { ok, status, error }
× 422 con un field que no es string: se ignora
× 422 con un field vacío: se ignora
× 500 sin body: sigue sin field
Tests  4 failed | 9 passed (13)
```

**Coincide exactamente con lo declarado en `impl_31.md` §3, incluidos los
conteos y qué test cae en cada caso.** El informe es honesto.
Confirmo también su matiz: la mutación B **no** rompe «fallo de red», y es
correcto — ese caso sale por el `return` temprano de `api.ts:136`, antes de leer
body. La discriminación real del caso «500 sin body» bajo la mutación B la aporta
`expect('field' in res).toBe(false)`, no el `toEqual`: los tests no son
decorativos.

**`normalizeApi` sigue sin lanzar nunca** (`docs/context.md` §3): el `try/catch`
de `:133-137` está intacto y `readErrorField` no puede lanzar sobre ningún
`unknown` (tabla de §4). Fallo de red → `{ ok: false, status: 0, error }` sin
`field`; 5xx sin body → ídem.

---

## 6. Los 7 tests previos: intactos y verdes

`git show 040527a -- src/lib/__tests__/api.test.ts` confirma que el bloque
`describe('normalizeApi')` (`:33-129`) **no tiene ni una línea modificada**. El
único cambio fuera del `describe` nuevo es `+  createAdminArticle,` en el import
(`:5`). No se relajó ningún `toEqual` ni se acomodó ninguna aserción: señal
adicional de que el cambio es aditivo de verdad.

---

## 7. Documentación

`docs/api-contract.md` §1 «Forma normalizada»:
- `:56` firma actualizada: `type ApiFailure = { ok: false; status: number; error: string; field?: string }`.
- `:74` fila nueva en la tabla de casos.
- `:78-96` subsección propia: deja explícito que `field` es **opcional**, que la
  clave solo aparece si el body la trae como string no vacío, que un `422` sin
  `field` / `5xx` sin body / fallo de red devuelven `{ ok, status, error }` sin
  `field: undefined`, que el valor es el nombre crudo del backend y que el mapeo
  al input es del consumidor.

**No contradice a §10**, que es donde viven los `422 { error, field }` reales:
§10.2 (`file`/`seccion`/`orden`, `:393-394`), §10.3 (`email`/`password`/`role` y
el `409` de email duplicado, `:427-431`) y §10.4 (precios, `:564`). Los nombres
que enumera §1:91-92 salen literalmente de ahí.

Salvedad, ver §9.1: `docs/api-contract.md:565` sigue diciendo que «`normalizeApi`
hoy lo descarta». No la considero incumplimiento de A4 —esa frase describe *la
necesidad de la feature 31*, que hasta este veredicto seguía `pending`, y §10.4 no
es la sección que define `ApiFailure`—, pero **debe corregirse al cerrar**.

---

## 8. Checkpoints (C1-C11)

- **C1** [x] `npm test` exit 0, 18/125, ningún test previo roto (verificado por mí).
- **C2** [x] Los 4 puntos del `acceptance` tienen verificación: A1 y A3 con tests
  que **discriminan** (mutaciones A y B reproducidas), A2 con `git diff` vacío de
  consumidores + tests de forma exacta, A4 por lectura (`docs/verification.md` §5
  no exige test para documentación).
- **C3** [x] `typecheck` exit 0 y `build` exit 0; el aviso de chunk es el esperado.
- **C4** [x] `docs/conventions.md` §1: `src/lib/api.ts` (camelCase en `lib/`) y el
  test en `__tests__/` hermano. §2: sin `any`, sin aserciones de tipo nuevas, sin
  variables sin usar (lo prueba `noUnusedLocals` con typecheck en 0). §3: no
  aplica, cero estilos y cero hex.
- **C5** [x] `docs/architecture.md` §5: **ningún `fetch` nuevo**, y ninguno fuera
  de `src/lib/api.ts`. Sin state manager ni librería de fetching nueva. El tipo
  no se duplica: se extiende `ApiFailure`, la única fuente.
- **C6** [x] Ningún endpoint nuevo consumido. El `{ error, field }` que se lee ya
  estaba documentado en §10.2/§10.3/§10.4 antes de esta feature: no se inventó
  contrato (AGENTS.md §3).
- **C7** [x] con acción de cierre pendiente. `feature_list.json` dice `pending`, que
  es el estado real mientras la review no cierra; `progress/impl_31.md` documenta
  qué se hizo, la verificación y las decisiones. `progress/current.md` todavía
  contiene el bloque de cierre de la feature 30 — el implementer **no debía**
  tocarlo (instrucción explícita del líder, `impl_31.md` §Estado), así que no es
  fallo suyo. Ver §9.3.
- **C8** [x] Ningún acceso a `.env` / `.env.local` en el diff; ninguna variable de
  entorno nueva.
- **C9** [x] Sin `console.log`, sin `debugger`, sin código comentado, sin `TODO`
  sin referencia, sin `.orig`/`.bak`. `git status` solo muestra
  `tsconfig.tsbuildinfo`, artefacto trackeado **preexistente** (ya estaba modificado
  antes de mi sesión, deuda registrada en `progress/history.md`) y que reescriben
  `typecheck`/`build`. No lo introdujo esta feature.
- **C10** [x] Scope de una sola feature. No arregló deuda ajena teniéndola a mano
  y a la vista: dejó intacto el `as { error?: unknown }` de `readErrorMessage`, no
  amplió al `403 { error: 'forbidden', message }` de §10.1 y no tocó
  `mockPrices.ts`. Las señaló en `impl_31.md` §2 en vez de arreglarlas: es
  exactamente el comportamiento que pide C10.
- **C11** [x] `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`,
  `.gitignore` e `index.html` sin tocar (`git diff --name-only` vacío).

**11/11.** Ningún `[ ]`, y en particular ninguno en C1, C2, C3 ni C8.

---

## 9. Observaciones NO bloqueantes (no invalidan el veredicto)

**9.1 — Frase desactualizada, corregir al cerrar.**
`docs/api-contract.md:564-565`: «El `field` refuerza la necesidad de la **feature
31** (`normalizeApi` hoy lo descarta)». En cuanto esta review cierre, el paréntesis
es falso y contradice a §1:78-96. Mismo caso en
`src/admin/prices/mockPrices.ts:37` («`normalizeApi` todavía descarta `field` — es
la feature 31»). El implementer lo dejó anotado a propósito en `impl_31.md` §2
(«Nota para el líder») en vez de ampliar scope. Debe limpiarlo el cierre de la 31 o
la primera de las 32-36.

**9.2 — `docs/architecture.md:319`** describe el fallo como
`{ ok: false, status, error }`. No es incorrecto (el `field` es opcional), pero
conviene añadir la mención cuando se toque esa sección.

**9.3 — Acciones de cierre (del líder, no del implementer):** marcar la 31 como
`done` en `feature_list.json`, registrar la sesión en `progress/current.md` →
`progress/history.md`, y actualizar el baseline de `docs/verification.md` §2 (hoy
dice `15 archivos / 86 tests`, ya obsoleto antes de esta feature) a **18 / 125**,
junto con `docs/architecture.md` §8.

**9.4 — Comportamiento sin cobertura, aceptable:** un `field` con espacios
alrededor (`' email '`) se propaga **sin recortar** (`api.ts:103` usa `trim()` solo
para decidir, no para el valor). Es coherente con `readErrorMessage`, que tampoco
recorta el mensaje. Si las features 32-36 mapean `field` al `name` de un input,
conviene normalizarlo **en el consumidor** o añadir el `trim()` aquí en su momento.

**9.5 — Un `2xx` sin la `key` esperada pero con `field` en el body también
propagaría `field`.** La tabla de §1:74 lo enuncia solo para `4xx`/`5xx`. Es un
caso irreal contra este backend y no afecta a nada hoy.

---

## 10. Detalle de los fallos

Ninguno. No hay defecto bloqueante que citar: implementación correcta y guardada,
tests que discriminan (probado por mutación independiente), cambio estrictamente
aditivo con diff de consumidores vacío, e informe del implementer honesto en cada
cifra que comprobé.

**La feature 31 puede cerrarse como `done`.**
