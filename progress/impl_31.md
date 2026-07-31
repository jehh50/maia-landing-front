# Implementación — feature 31: `normalizeApi` propaga el campo `field` de los errores 422

**Estado:** implementada, pendiente de review. **No** se marcó `done` ni se tocó
`feature_list.json` ni `progress/current.md` (instrucción explícita del líder).

**Rama:** `main` (working tree). **Sin commits ni push**, por instrucción.

---

## 1. Qué cambié

Tres archivos, ninguno más:

### `src/lib/api.ts`

1. `ApiFailure` gana `field?: string`, con docblock que explica que solo está
   presente si el body del error lo trae.
2. Nueva función privada `readErrorField(data: unknown): string | null`, hermana
   de la ya existente `readErrorMessage`. Lee `field` con guardas sobre
   `unknown` (`data && typeof data === 'object' && 'field' in data`, luego
   `typeof field === 'string' && field.trim()`). Devuelve `null` en cualquier
   otro caso.
3. `normalizeApi` construye el fallo en una variable tipada `ApiFailure` y solo
   añade la clave si hay `field`:

   ```ts
   const failure: ApiFailure = { ok: false, status, error: readErrorMessage(data) ?? fallbackError };
   const field = readErrorField(data);
   return field ? { ...failure, field } : failure;
   ```

### `src/lib/__tests__/api.test.ts`

Nuevo `describe('normalizeApi — field de los errores de validación')` con 6
tests. Los 7 tests previos quedan **intactos** (ni una línea tocada); lo único
que cambió fuera del bloque nuevo es añadir `createAdminArticle` al import.

### `docs/api-contract.md`

Solo §1 («Forma normalizada»): la firma de `ApiFailure` ahora es
`{ ok, status, error, field?: string }`, una fila nueva en la tabla de casos
(`4xx/5xx` con `{ error, field }`) y una subsección que documenta las reglas de
`field` (opcional, solo si el body lo trae, valor sin traducir, aditivo).

---

## 2. Decisiones

- **La clave se omite, no se pone a `undefined`.** Un `422` sin `field` devuelve
  literalmente `{ ok: false, status, error }`. Así `toEqual` de cualquier test
  existente sigue pasando y `'field' in res` es `false`, que es la comprobación
  más honesta de que el cambio es aditivo.
- **Guardas, cero aserciones de tipo y cero `any`.** Tras `'field' in data`, TS
  5.6 estrecha `data` a `object & Record<'field', unknown>`, así que `field` se
  desestructura directamente sin `as`. (`readErrorMessage` conserva su `as
  { error?: unknown }` original: **no lo toqué**, no es mi feature.)
- **Un `field` que no sea string, o en blanco, se ignora.** El backend es la
  fuente pero el body llega como `unknown`; propagar un número como si fuera el
  nombre de un input rompería al consumidor de la 32-36 de forma silenciosa.
  Mismo criterio de `trim()` que ya aplica `readErrorMessage` al mensaje.
- **El fallo de red no gana `field`**: sigue el `return` temprano, sin body que
  leer.
- **No toqué ningún consumidor.** `LeadsList.tsx` y `BlogIndex.tsx` no cambian
  ni de forma ni de comportamiento: `error` sigue llegando siempre y ellos
  ignoran `field`. Que no haya hecho falta tocarlos es la prueba de que el
  cambio es aditivo.
- **No amplié el scope al `403` de `requireRole`** (§10.1: `error: "forbidden"`,
  mensaje legible en `message`). Es un problema distinto, con su propio campo, y
  no está en el `acceptance` de esta feature.

### Nota para el líder (fuera de scope, no lo cambié)

`docs/api-contract.md` §10.4 dice: «El `field` refuerza la necesidad de la
**feature 31** (`normalizeApi` hoy lo descarta)». Esa frase queda desactualizada
con este cambio, pero §10.4 no es «la parte que describe `ApiFailure`» y mi
permiso de edición era explícitamente §1. Lo dejo señalado para que se corrija
en la 32-36, que ya van a reescribir esa sección.

---

## 3. Prueba de que los tests son honestos (mutación y reversión)

Se mutó la implementación dos veces y se comprobó que los tests nuevos se ponen
en rojo. **Ambas mutaciones fueron revertidas**; el código final es el del §1.

**Mutación A — quitar la propagación** (`return failure;` a secas):

```
❯ src/lib/__tests__/api.test.ts (13 tests | 1 failed)
   × 422 con field: lo propaga junto al mensaje del backend
 Tests  1 failed | 12 passed (13)
```

**Mutación B — propagar sin guarda** (`return String(field)` y
`{ ...failure, field: field ?? undefined }`, es decir: siempre la clave):

```
❯ src/lib/__tests__/api.test.ts (13 tests | 4 failed)
   × 422 sin field: conserva exactamente la forma { ok, status, error }
   × 422 con un field que no es string: se ignora
   × 422 con un field vacío: se ignora
   × 500 sin body: sigue sin field
 Tests  4 failed | 9 passed (13)
```

La B no rompe «fallo de red», y es correcto: ese caso sale por el `return`
temprano, antes de tocar el body.

Tras revertir: `13 passed (13)` en ese archivo.

---

## 4. Verificación

Baseline con el árbol tal como lo dejó la feature 30:

| Comando | Antes | Después |
|---|---|---|
| `npm test` | **18 archivos / 119 tests**, exit 0 | **18 archivos / 125 tests**, exit 0 |
| `npm run typecheck` | exit 0 | exit 0 |
| `npm run build` | exit 0 | exit 0 |

+6 tests, todos en `src/lib/__tests__/api.test.ts` (de 7 a 13). **Ningún archivo
de test nuevo**, así que el conteo de archivos no se mueve. Cero tests previos
tocados o rotos.

Salida del bloque completo (`npm test && npm run typecheck && npm run build`):

```
 Test Files  18 passed (18)
      Tests  125 passed (125)

> tsc -b --noEmit          → exit 0

(!) Some chunks are larger than 500 kB after minification.
✓ built in 17.51s          → exit 0
VERDE
```

El aviso de chunk >500 kB es el esperado (`docs/verification.md` §1), no es un
fallo.

> Si esta feature se aprueba, el nuevo baseline de `docs/verification.md` §2 es
> **18 / 125**. No lo edité: esa actualización va con el cierre de la feature.

---

## 5. Checklist de cierre

- [x] `npm test` verde, con los tests del `acceptance` incluidos.
- [x] `npm run typecheck` exit 0.
- [x] `npm run build` exit 0.
- [x] Sin `console.log`, sin `any`, sin variables sin usar, sin archivos
      temporales. Los únicos archivos tocados son los tres del `files` de la
      feature + este informe.
- [x] No se leyó ni escribió `.env` / `.env.local`. Ninguna variable de entorno
      nueva.
- [x] No se inventó ningún endpoint: `field` está documentado en §10.2, §10.3 y
      §10.4 del contrato como parte de los `422` reales del backend.
- [x] Infraestructura intacta (`package.json`, `vite.config.ts`,
      `tsconfig.json`, `vercel.json`, `.gitignore`).
- [ ] Review pendiente. **No** marco `done`.

## 6. Cobertura del `acceptance`

| Criterio | Dónde |
|---|---|
| `ApiFailure` incluye `field?: string` y `normalizeApi` lo propaga | `src/lib/api.ts:71-82` (tipo), `:100-106` (guarda), `:142-144` (propagación) |
| Aditivo: ningún consumidor cambia de forma ni se rompe | Ningún componente tocado; tests `422 sin field` / `500 sin body` / `fallo de red` con `toEqual` exacto + `'field' in res === false`; los 3 tests de `LeadsList` y los de `BlogIndex` siguen verdes |
| Test del `422` **con** `field` y del `422` **sin** `field` | `src/lib/__tests__/api.test.ts`, describe nuevo (+ los casos `field` no-string, `field` vacío, `5xx` sin body y red caída) |
| `docs/api-contract.md` documenta la forma actualizada | §1, «Forma normalizada» + subsección «`field` — el campo culpable…» |
