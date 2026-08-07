# CHECKPOINT — Criterios objetivos de "estado final correcto"

> El `reviewer` recorre esta lista en cada revisión y marca `[x]` / `[ ]` en su
> informe `progress/review_<feature>.md`. Criterios **binarios**: cada uno se
> comprueba ejecutando un comando o leyendo un archivo, sin juicio de valor.
> Un `[ ]` en C1-C3 o C8 es `CHANGES_REQUESTED` automático.

---

## Verificación automática

- **C1** — `npm test` termina con exit 0: el baseline vigente de
  `docs/verification.md` §2 más los tests que aporte la feature, y **ningún test
  previo roto**. Comando exacto en `docs/verification.md` §1.
- **C2** — La feature revisada **aporta sus propios tests** para cada punto de su
  `acceptance` en `feature_list.json`, salvo que la tabla de
  `docs/verification.md` §5 diga explícitamente que ese tipo de cambio no
  requiere test.
- **C3** — `npm run typecheck` y `npm run build` terminan con exit 0. El aviso
  `Some chunks are larger than 500 kB` es esperado y **no** invalida el criterio.

## Verificación por lectura

- **C4** — Los archivos nuevos/modificados respetan `docs/conventions.md`:
  nombres y ubicación (§1), TypeScript sin `any` y sin variables sin usar (§2),
  estilos con tokens del tema y cero hex hardcodeados (§3).
- **C5** — Se respetan las fronteras de `docs/architecture.md`: **ninguna
  llamada a `fetch` fuera de `src/lib/api.ts`**, sin state manager global nuevo,
  sin librería de data fetching nueva, y los tipos se derivan (`Pick<>`) en vez
  de duplicarse.
- **C6** — Todo endpoint consumido está en `docs/api-contract.md`. Si la feature
  añadió uno, el documento se actualizó en el mismo cambio.
- **C7** — `feature_list.json` refleja el estado real de la feature y
  `progress/current.md` documenta lo hecho, la verificación ejecutada y los
  bloqueos si los hubo.
- **C8** — No se leyó ni escribió ningún secreto (`.env`, `.env.local`).
  Variables de entorno nuevas solo **documentadas por nombre y propósito** en
  `progress/current.md`, nunca con su valor.
- **C9** — Sin residuos: nada de `console.log` de depuración, código comentado
  "por si acaso", `TODO` sin referencia a feature, ni archivos temporales
  (`.orig`, `.bak`). `git status` sin basura.
- **C10** — Scope: el cambio toca **una sola** feature. No se arregló de paso
  deuda documentada en `docs/architecture.md` §10 que pertenece a otra feature
  del backlog.
- **C11** — Infraestructura intacta: `package.json`, `vite.config.ts`,
  `tsconfig.json`, `vercel.json` y `.gitignore` sin modificar, salvo que la
  feature lo pidiera de forma explícita.

---

## Plantilla del informe

El reviewer escribe en `progress/review_<feature>.md`:

```markdown
# Review — feature <id>: <nombre>

**Veredicto:** APPROVED | CHANGES_REQUESTED

## Checkpoints
- C1  [x]
- C2  [x]
- C3  [ ]  ← src/pages/NotFound.tsx:14 usa `any` en el handler (C4 también)
- C4  [ ]
- C5  [x]
- C6  [x]
- C7  [x]
- C8  [x]
- C9  [x]
- C10 [x]
- C11 [x]

## Detalle de los fallos
<archivo:línea> — qué viola y qué criterio. Concreto, sin feedback genérico.
```
