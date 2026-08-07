# Review — feature 21: `useReveal` observa contenido montado después del primer render

**Veredicto:** APPROVED

**Fecha:** 2026-07-27 · **Revisor:** reviewer · Archivos revisados:
`src/hooks/useReveal.ts` (M), `src/hooks/__tests__/useReveal.test.tsx` (A).

---

## Verificación ejecutada

Ejecutada por el revisor desde la raíz del repo, no copiada del informe:

| Comando | Resultado |
|---------|-----------|
| `npm test` | **11 archivos / 61 tests passed**, exit 0 (31.80 s) |
| `npm run typecheck` | exit 0, sin salida |
| `npm run build` | exit 0, `✓ built in 17.04s`, `index-C6hpBOR8.js` 2 525.23 kB |

Baseline previo declarado: 10 archivos / 51 tests → **+1 archivo / +10 tests**,
ningún test previo roto ni modificado. El aviso `Some chunks are larger than
500 kB` aparece y es el esperado (`docs/verification.md` §1): no invalida C3.

---

## Acceptance → verificación

| # | Acceptance | Cubierto por | Veredicto |
|---|-----------|--------------|-----------|
| 1 | Los `.reveal` insertados tras el montaje quedan observados y reciben `.visible` al entrar en viewport | `useReveal.test.tsx:126` (queda observado), `:136` (**recibe `.visible`**), `:149` (el propio nodo insertado es el `.reveal`) | ✅ |
| 2 | El observer se desconecta en el cleanup del efecto, sin fugas | `useReveal.test.tsx:175` (`io.disconnected`), `:183` (**test de comportamiento**: tras `unmount()` se inserta un `.reveal` en `body` y no llega al observer) | ✅ |
| 3 | Test que monta contenido `.reveal` de forma diferida y verifica que se observa | `useReveal.test.tsx:126-147` con `rerender(<Harness diferido />)` | ✅ |

El acceptance 1 **no** se queda en "se llamó a `observe`": `useReveal.test.tsx:143-145`
dispara `enterViewport(anidado)` y asserta `expect(anidado).toHaveClass('visible')`
más `unobserved === [anidado]`. Es la aserción que exige el criterio.

---

## Revisión dirigida (los 4 puntos de riesgo)

### 1. No regresión del primer render — OK

Diff línea a línea de `src/hooks/useReveal.ts`:

- `{ threshold: 0.08, rootMargin: '0px 0px -30px 0px' }` — **byte a byte idéntico**
  al original (`useReveal.ts:27`). Bloqueado además por el test `:98`.
- `classList.add('visible')` + `io.unobserve(e.target)` dentro del callback
  (`:22-23`) — intactos. Revelar sigue siendo **de una sola vez**: el nodo no
  vuelve a ocultarse al salir del viewport, no hay rama `else` que quite la clase.
- Única diferencia en el escaneo inicial: `.reveal` → `.reveal:not(.visible)`
  (`:4`, `:40`). **Verificado que es equivalente en comportamiento observable**:
  `grep -rn "visible" src/` solo devuelve `globals.css:108` (`.reveal.visible`) —
  ningún componente renderiza `className="reveal visible"` de partida y ningún
  código hace `classList.remove('visible')`. Los 26 usos de `className="reveal…"`
  siguen entrando por la misma ruta.
- `src/App.tsx` y `src/styles/globals.css` **sin tocar** (`git status` vacío para
  ambos), así que la landing entera conserva su composición.

### 2. Cleanup completo — OK

- Ambos observers se crean **dentro** del `useEffect` (`:18` y `:49`); no hay
  nada a nivel de módulo salvo la constante `REVEAL_SELECTOR` (un string).
- El `return` desconecta los dos: `mo.disconnect(); io.disconnect();` (`:61-64`).
- No hay `addEventListener`, `setTimeout`, `setInterval` ni `requestAnimationFrame`
  en el archivo: nada más que desmontar.
- `observed` es un `WeakSet<Element>` local al efecto (`:32`): no retiene nodos
  eliminados del DOM y muere con el closure.
- El test `:183` lo comprueba por comportamiento, no por espía: tras `unmount()`
  una inserción real en `document.body` no produce ninguna observación.

**Nota no bloqueante (no forma parte del acceptance):** un nodo insertado tras el
montaje, observado, y **eliminado del DOM antes de entrar en viewport** queda
retenido por el `IntersectionObserver` hasta el `disconnect` del desmontaje,
porque su `unobserve` solo ocurre al revelar (`:23`). Como `useReveal()` vive lo
que vive `App`, en una sesión larga con listados que montan/desmontan mucho puede
acumular targets desprendidos. Es inherente al patrón `IntersectionObserver` y de
magnitud pequeña; si algún día molesta, la mitigación es tratar `removedNodes` en
el mismo callback con `io.unobserve`. **No se exige en esta feature.**

### 3. Coste en runtime — OK, la justificación del informe es real

Contrastado contra el código, no contra el informe:

- El `querySelectorAll` sobre el documento ocurre **una sola vez**, en el montaje
  (`:40`). **No** hay re-escaneo global por mutación: el callback recorre
  `record.addedNodes` y aplica `matches` + `querySelectorAll` **acotados al
  subárbol añadido** (`:44-47`, `:49-55`). Esto es exactamente el antipatrón que
  se pedía cazar (`subtree: true` + `document.querySelectorAll` completo en cada
  callback) y **no** está presente.
- `{ childList: true, subtree: true }` sin `attributes` ni `characterData`
  (`:59`): los `sx` de Emotion y los contadores animados del `Hero` no disparan
  el callback.
- Descarte temprano de no-`Element` por `nodeType` (`:52`) antes de construir
  ningún selector.
- Coste por mutación = O(tamaño del subárbol insertado), no O(DOM).

Consecuencia asumida y correcta para el scope: un nodo que **gane** la clase
`.reveal` por cambio de `className` después de montarse no se recoge (no se
observan `attributes`). No ocurre hoy en el repo y el acceptance habla de nodos
*insertados*, no *reclasificados*.

### 4. Idempotencia — OK

- `observe()` (`:34-38`) corta con el `WeakSet` antes de llamar a `io.observe`:
  un nodo no se observa dos veces aunque aparezca en varios records.
- `REVEAL_SELECTOR = '.reveal:not(.visible)'` se aplica **en las dos rutas**
  (inicial `:40` e incremental `:45-46`): un nodo ya revelado no vuelve a
  observarse ni a procesarse.
- Cubierto por `useReveal.test.tsx:114` (nodo que ya llega con `.visible`) y
  `:161` (segunda mutación en el mismo subárbol no re-observa).

### Sobre el test y el stub

- El stub `IOStub` está **declarado dentro del archivo de test** (`:7-50`), se
  inyecta con `vi.stubGlobal` en `beforeEach` (`:83`) y se limpia con
  `vi.unstubAllGlobals()` + `vi.restoreAllMocks()` en `afterEach` (`:86-89`).
  `IOStub.instances` se resetea en cada `beforeEach` (`:82`), así que no hay
  estado que se filtre entre tests ni a otros archivos.
- El helper `io()` (`:53-56`) asserta que el hook creó **exactamente una**
  instancia: protege contra observers duplicados.
- Confirmado por lectura que los tests diferidos fallarían con el hook original
  (sin `MutationObserver`, `everObserved` nunca llegaría a contener `anidado` y
  el `waitFor` agotaría el timeout), coherente con la comprobación
  anti-falso-positivo que reporta `progress/impl_21.md` §3.

---

## Checkpoints

- C1  [x] `npm test` exit 0 — 11 archivos / 61 tests, baseline 51 intacto, ningún test previo roto.
- C2  [x] Los 3 puntos del `acceptance` tienen test propio (tabla arriba). El acceptance 1 se verifica por comportamiento (`.visible`), no por "se llamó a `observe`".
- C3  [x] `npm run typecheck` exit 0 y `npm run build` exit 0 (aviso de chunk >500 kB, esperado).
- C4  [x] `useReveal.ts` es hook con export nombrado en `src/hooks/`; test en `src/hooks/__tests__/useReveal.test.tsx`. Sin `any` (el stub usa `as unknown as`, no `any`), sin variables muertas (`noUnusedLocals` pasa), sin hex hardcodeados, sin `className` de utilidad.
- C5  [x] Ningún `fetch` (grep: cero fuera de `src/lib/api.ts`), sin state manager ni librería de fetching nueva, sin tipos duplicados; el hook no cambia su superficie pública.
- C6  [x] N/A — la feature no consume ningún endpoint; `docs/api-contract.md` sin cambios.
- C7  [x] `feature_list.json` mantiene la 21 en `in_progress` (correcto: `done` lo marca el líder tras este `APPROVED`); `progress/current.md` documenta plan, bitácora, verificación y "sin bloqueos"; `progress/impl_21.md` detalla el cambio.
- C8  [x] Ningún acceso a `.env` / `.env.local`; no se introducen variables de entorno (`current.md` §variables: "Ninguna").
- C9  [x] `grep` de `console.`/`TODO`/hex en los dos archivos de la feature: cero coincidencias. Sin código comentado "por si acaso" ni `.orig`/`.bak`.
- C10 [x] Scope limitado a `src/hooks/useReveal.ts` + su test. Deuda de la 22 (bundle monolítico, sigue en 2 525 kB) y de la 23 (tokens duplicados) **no** tocada. El resto de archivos modificados del árbol (`src/admin/AdminLayout.tsx`, `src/admin/leads/LeadsList.tsx`, `src/lib/api.ts`, `src/main.tsx`, `src/pages/BlogIndex.tsx`, `docs/architecture.md`) son el diff sin commitear de las features 17-20; verificado que `docs/architecture.md` no contiene ningún cambio relativo a `reveal`.
- C11 [x] `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `.gitignore` y `src/styles/globals.css` **sin modificar** (`git status --porcelain` vacío para los seis). `tsconfig.tsbuildinfo` aparece modificado, pero es artefacto de build regenerado por `npm run build` (también por el mío) y es una condición preexistente del repo, no un cambio de la feature.

## Detalle de los fallos

Ninguno bloqueante.

## Observaciones para el líder (no bloquean el cierre)

1. `docs/architecture.md:129` y `docs/architecture.md:275` siguen afirmando que
   "`useReveal` **solo observa los nodos existentes en el primer render**" y lo
   listan como deuda vigente en §10. Con esta feature esa afirmación **queda
   obsoleta**. El implementer lo señaló y no la tocó porque `docs/architecture.md`
   no está en la lista `files` de la 21. Recomiendo actualizar esas dos líneas al
   marcar la feature `done`, o el próximo agente leerá una arquitectura falsa.
2. `useReveal()` se invoca desde `src/App.tsx:32` **y** desde
   `src/components/sections/Blog.tsx:107`. Si ambas se montan a la vez hay dos
   pares de observers sobre los mismos nodos. Es preexistente y el resultado
   observable no cambia (añadir `.visible` es idempotente), pero ahora cada
   invocación cuesta también un `MutationObserver`. Candidato a nota de backlog,
   fuera del scope de la 21.
3. Retención de targets desprendidos por el `IntersectionObserver` (detalle en
   §2 de esta revisión). Mitigable tratando `removedNodes`; no exigido aquí.
