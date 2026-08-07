# Informe de implementación — Feature 21

**Feature:** 21 — `useReveal` observa contenido montado después del primer render
**Fecha:** 2026-07-27
**Estado al cerrar:** `in_progress` (pendiente de veredicto del `reviewer`; **no** marcada `done`)
**Rama:** `main`, sin commits — el humano no pidió commitear.

---

## 1. Problema

`src/hooks/useReveal.ts` hacía un único `document.querySelectorAll('.reveal')` en
el montaje. `globals.css:102` deja `.reveal { opacity: 0; transform: translateY(20px) }`
y solo `.reveal.visible` lo devuelve a `opacity: 1`, así que **cualquier nodo
`.reveal` insertado después del primer render quedaba invisible para siempre**:
nunca se observaba, nunca recibía `.visible`, y el CSS lo mantenía a opacidad 0.

## 2. Baseline

Comprobado **antes** de tocar nada:

| Comando | Resultado |
|---------|-----------|
| `npm test` | 10 archivos / 51 tests, verde |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 (`index-B5JKLXXe.js` 2 524.92 kB, aviso esperado de chunk >500 kB) |

## 3. Qué cambié

### `src/hooks/useReveal.ts` (modificado)

- Se conserva **intacto** el `IntersectionObserver`: mismas opciones
  (`threshold: 0.08`, `rootMargin: '0px 0px -30px 0px'`), misma callback, mismo
  `io.unobserve(e.target)` tras revelar (revelar sigue siendo de una sola vez).
- Se conserva el escaneo inicial del documento, ahora con el selector
  `.reveal:not(.visible)`.
- Se añade un `MutationObserver` sobre `document.body` con
  `{ childList: true, subtree: true }` que, por cada record, recorre **solo sus
  `addedNodes`**: si el nodo añadido es un `Element`, comprueba si él mismo
  encaja con `.reveal:not(.visible)` (`querySelectorAll` no incluye la raíz) y
  luego escanea su subárbol.
- Un `WeakSet<Element>` de nodos ya observados evita re-observar (un mismo
  elemento puede aparecer en varios records).
- El `return` del `useEffect` desconecta **los dos** observers:
  `mo.disconnect(); io.disconnect();`.

### `src/hooks/__tests__/useReveal.test.tsx` (nuevo, 10 tests)

Stub de `IntersectionObserver` (jsdom no lo implementa) siguiendo el patrón de
`src/pages/__tests__/NotFound.test.tsx`, pero ampliado para poder **disparar las
entradas a mano** (`enterViewport(...)`) y para registrar qué se observó, qué se
dejó de observar y si se desconectó. Se inyecta con
`vi.stubGlobal('IntersectionObserver', IOStub)` y se limpia con
`vi.unstubAllGlobals()` + `vi.restoreAllMocks()` en `afterEach`.

Cobertura, por criterio de `acceptance`:

| Test | Criterio |
|------|----------|
| observa los `.reveal` presentes al montar | no-regresión del primer render |
| conserva las opciones del `IntersectionObserver` | restricción explícita |
| añade `.visible` y deja de observar al entrar en viewport | no-regresión (`unobserve`) |
| no revela ni observa un nodo que ya tiene `.visible` | restricción explícita |
| **observa un `.reveal` anidado en un nodo insertado tras el montaje** | **acceptance 1 y 3** |
| **le añade `.visible` cuando entra en viewport** | **acceptance 1** |
| observa el nodo insertado cuando él mismo es el `.reveal` | acceptance 1 (raíz, no solo subárbol) |
| no observa dos veces el mismo nodo aunque haya varias mutaciones | restricción explícita |
| desconecta el `IntersectionObserver` al desmontar | **acceptance 2** |
| deja de observar mutaciones al desmontar (sin fugas) | **acceptance 2** — comprobación *de comportamiento*: tras `unmount()` se inserta un `.reveal` en el `body` y se verifica que **no** llega al observer |

**Comprobación anti-falso-positivo:** restauré temporalmente el hook original con
`git checkout src/hooks/useReveal.ts` y corrí el archivo de test: **5 de los 10
tests fallan** (los cuatro de contenido diferido y el de `.visible` previo) y los
5 de no-regresión pasan. Es decir, los tests nuevos realmente capturan el bug y
los de no-regresión describen el comportamiento que ya existía. Después se
restauró la implementación nueva.

No se tocó ningún otro archivo de `src/`: ni `App.tsx`, ni `globals.css`, ni
infraestructura (`package.json`, `vite.config.ts`, `tsconfig.json`,
`vercel.json`, `.gitignore`).

## 4. Decisiones

### Por qué `MutationObserver`

Alternativas consideradas:

| Opción | Por qué se descartó |
|--------|---------------------|
| *Polling* (`setInterval` + re-escaneo) | Coste constante y perpetuo en la página pública para un DOM que muta muy de vez en cuando; además añade latencia visible entre el montaje y la animación. |
| Exponer un `register(el)` que llame cada sección | Obliga a tocar todas las secciones de la landing y a que cualquier código futuro se acuerde de llamarlo: el bug volvería en el próximo listado asíncrono. Además sería un cambio de superficie del hook, fuera del scope de esta feature. |
| Re-escanear en cada render de `App` | `useReveal()` no se re-ejecuta (dependencias `[]`) y hacerlo dependiente del render acopla el hook al ciclo de un componente concreto; tampoco cubre inserciones fuera de React. |

`MutationObserver` es la única opción que es **pasiva** (coste cero mientras no
haya mutaciones), **automática** (ninguna sección tiene que colaborar) y
**local al hook** (no cambia su API ni obliga a tocar `App.tsx`).

### Cómo acoté el coste

La landing tiene bastante DOM y esto corre en la página pública, así que:

1. **Solo `childList` + `subtree`.** Sin `attributes` ni `characterData`, que
   dispararían la callback en cada cambio de estilo o de texto (los `sx` de
   Emotion y los contadores animados del `Hero` mutarían constantemente).
2. **Nunca se re-escanea el documento entero.** El `querySelectorAll` global
   ocurre **una sola vez**, en el montaje. En cada mutación el trabajo es
   proporcional a lo que cambió: se recorren únicamente los `addedNodes` del
   record y sus subárboles.
3. **Descarte temprano de nodos no-`Element`** (`node.nodeType === Node.ELEMENT_NODE`):
   la mayoría de las mutaciones de React son nodos de texto, y así ni se
   construye el selector para ellos.
4. **`WeakSet` de observados**: los nodos que ya pasaron por el observer no
   vuelven a entrar; al ser *weak*, no retiene nodos ya eliminados del DOM.
5. **Selector `.reveal:not(.visible)`**: los nodos ya revelados quedan fuera del
   filtro, tanto en el escaneo inicial como en el incremental.

### Sobre `.reveal:not(.visible)` en el escaneo inicial

Es el único punto donde el escaneo del primer render difiere del original
(antes era `.reveal` a secas). Es **equivalente en comportamiento observable**:
nada en el proyecto quita la clase `.visible`, y para un nodo que ya la tuviera
la ruta antigua se limitaba a añadírsela otra vez (no-op) y desobservarlo. Lo
apliqué porque la restricción de la feature lo pide explícitamente ("no debe
revelar nodos que ya tienen `.visible`") y porque abarata el escaneo inicial.

### Nota sobre las dos invocaciones del hook

`useReveal()` se llama desde `src/App.tsx:32` y también desde
`src/components/sections/Blog.tsx:107`. No hay estado a nivel de módulo: cada
invocación crea su propio `IntersectionObserver` + `MutationObserver` + `WeakSet`
y los limpia en su propio cleanup. Si ambas están montadas a la vez, un mismo
`.reveal` puede quedar observado por dos observers, exactamente igual que antes
de este cambio; el resultado sigue siendo añadir `.visible` una vez. No lo
modifiqué: cambiar la composición de `App.tsx`/`Blog.tsx` está fuera del scope.

### `globals.css`

No se tocó. `.reveal` / `.reveal.visible` ya son correctos; el defecto estaba
únicamente en el hook.

## 5. Verificación

Bloque completo de `docs/verification.md` §1, desde la raíz del repo:

```
$ npm test
 Test Files  11 passed (11)
      Tests  61 passed (61)
   Duration  30.73s

$ npm run typecheck
> tsc -b --noEmit
(exit 0, sin salida)

$ npm run build
dist/index.html                            0.95 kB │ gzip:   0.53 kB
dist/assets/index-DnjzzLz1.css            35.12 kB │ gzip:   6.53 kB
dist/assets/vanta.net.min-Ce_xm0LW.js     13.56 kB │ gzip:   4.69 kB │ map:    27.03 kB
dist/assets/index-C6hpBOR8.js          2,525.23 kB │ gzip: 779.07 kB │ map: 9,352.61 kB

(!) Some chunks are larger than 500 kB after minification. Consider: ...
✓ built in 15.77s
(exit 0)

VERDE
```

- 51 → **61 tests** (+10, todos del archivo nuevo). Ningún test existente
  cambió: los 51 anteriores siguen verdes sin tocar sus aserciones.
- El aviso de chunk >500 kB es el esperado (`docs/verification.md` §1) y no
  cuenta como fallo. El bundle crece 0.31 kB (2 524.92 → 2 525.23 kB), el coste
  del `MutationObserver`.
- No hay `console.log` de debug ni archivos temporales. Los ficheros que
  aparecen modificados en `git status` fuera de los dos míos vienen de las
  features 17-20, ya cerradas y sin commitear; `tsconfig.tsbuildinfo` lo
  reescribe el propio `npm run build`.

**Verificación manual:** no aplica el §6 de `docs/verification.md`. El cambio no
toca marcado, copy ni `sx` de ninguna sección: es lógica de un hook, cubierta por
los tests nuevos. El comportamiento visible del primer render está protegido por
los cuatro tests de no-regresión.

## 6. Fuera de scope (deuda observada, no tocada)

- **Feature 22** (code splitting): el bundle sigue monolítico. No lo toqué.
- **Feature 23** (tokens de color duplicados). No lo toqué.
- La doble invocación de `useReveal()` (`App.tsx` + `sections/Blog.tsx`)
  descrita arriba: es preexistente y no afecta al `acceptance` de esta feature.
- `docs/architecture.md` §4 y §10 siguen describiendo el defecto como deuda
  vigente ("`useReveal` solo observa el DOM inicial"). **Sugerencia para el
  reviewer/líder:** actualizar esas dos líneas al cerrar la feature. No lo hice
  yo porque `docs/architecture.md` no está en la lista `files` de la feature 21 y
  sí en la de la 23.

## 7. Archivos tocados

```
M  src/hooks/useReveal.ts
A  src/hooks/__tests__/useReveal.test.tsx
M  feature_list.json          (21: pending → in_progress)
M  progress/current.md
A  progress/impl_21.md
```
