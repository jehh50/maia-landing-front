# Implementación — feature 18: Eliminar el flag muerto `enabled` de AdminLayout

**Estado:** implementada, `in_progress` en `feature_list.json` (a la espera de review).
**Fecha:** 2026-07-27 · **Rama:** `main` (sin commit — el humano no lo pidió).

---

## 1. Baseline (antes de tocar nada)

```
npm test           → Test Files 8 passed (8) · Tests 41 passed (41) · exit 0
npm run typecheck  → exit 0
npm run build      → exit 0 (aviso esperado "Some chunks are larger than 500 kB")
```

Coincide con el baseline documentado en `docs/verification.md` §2 tras la feature 17.

## 2. Qué cambié

### `src/admin/AdminLayout.tsx`

1. **Fuera el campo `enabled`** de los tres items de `NAV_ITEMS`. De paso quitué los
   comentarios `// feature 16` y `// feature 13` que colgaban de esas líneas: eran
   marcadores de "cuándo se activará este item", es decir, documentación del flag muerto.

   ```ts
   const NAV_ITEMS = [
     { to: '/admin',           label: 'Inicio', end: true  },
     { to: '/admin/leads',     label: 'Leads',  end: false },
     { to: '/admin/articles',  label: 'Blog',   end: false },
   ];
   ```

2. **Fuera el ternario `item.enabled ? … : …`** del `.map`. El `.map` devuelve ahora
   directamente el `<NavLink>`, con **el mismo `style` callback, los mismos valores y el
   mismo `key`** que tenía la rama viva. Se eliminó la rama `else` completa: el `<Box>` con
   `aria-disabled="true"` y el `<Typography>` "próximamente".

3. **JSDoc actualizado.** Decía *"Las secciones 'Leads' y 'Blog' se dejan como placeholders
   deshabilitados (se activarán en las features 16 y 13 respectivamente)"* — descripción
   literal del código que acabo de borrar. Ahora dice que las tres secciones están activas.

Neto: −25 líneas, 0 cambios en el marcado renderizado. `Box` y `Typography` siguen
importados porque los usa el resto del layout (logo, datos del usuario); no quedaron
imports huérfanos (lo confirma `noUnusedLocals` en el typecheck).

### `src/admin/__tests__/AdminLayout.test.tsx` (nuevo, 3 tests)

- `muestra Inicio, Leads y Blog como enlaces a su ruta` — los tres labels, en orden, con
  sus `href` (`/admin`, `/admin/leads`, `/admin/articles`).
- `marca como activo solo el ítem de la ruta actual` — en `/admin/leads`, el link "Leads"
  tiene `aria-current="page"` y los otros dos no. Es el marcado activo observable por rol
  accesible que produce `NavLink`.
- `no renderiza ningún ítem deshabilitado de tipo "próximamente"` — ancla la eliminación de
  la rama muerta.

Sigue `docs/verification.md` §4: `ThemeProvider` + `MemoryRouter`, consultas por rol,
`restoreAllMocks()` en `afterEach`, ubicado en `src/admin/__tests__/`. No hay `fetch` en
este componente al montar, así que no hace falta espiarlo; **no** se mockea `src/lib/api.ts`.

### Docs (sincronización, no scope nuevo)

- `docs/architecture.md` §8: 8/41 → 9/44 y añadido el nuevo archivo a la lista.
- `docs/architecture.md` §10 y `docs/context.md` §4: eliminado el bullet
  *"`AdminLayout` tiene un flag `enabled` muerto"* — ya no es cierto.
- `docs/verification.md` §1 y §2: nuevo baseline `9 archivos / 44 tests`, tras feature 18.

## 3. Archivos tocados (lista exacta)

```
M src/admin/AdminLayout.tsx
A src/admin/__tests__/AdminLayout.test.tsx
M docs/architecture.md
M docs/context.md
M docs/verification.md
M progress/current.md
A progress/impl_18.md
M feature_list.json          (solo status 18: pending → in_progress)
```

Infraestructura intacta: `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`
y `.gitignore` sin tocar. No se leyó ni escribió ningún `.env*`.

## 4. Decisiones

**Comprobé que el flag no se usaba fuera del componente.** `grep -rn "enabled" src/` →
4 coincidencias, las 4 en `AdminLayout.tsx` (líneas 6-8 y la condición del `.map`). Ningún
otro archivo lo lee, ningún test lo consultaba, y `AdminLayout` solo se instancia desde
`src/AppRoutes.tsx:33` pasándole `user`. Borrado sin efectos colaterales.

**Ningún test existente cubría la rama muerta.** No existía `AdminLayout.test.tsx` y ningún
test del repo buscaba "próximamente" ni `aria-disabled`. Es decir, no rompí cobertura: la
creé donde no había.

**Añadí test aunque el acceptance no lo exigía.** La tabla de `docs/verification.md` §5 no
pide test para eliminar código muerto sin cambio de comportamiento. Pero el criterio 2 del
acceptance ("sigue mostrando Inicio, Leads y Blog, con el mismo marcado activo") no tenía
ninguna red que lo sostuviera, y el test es barato (3 asserts, sin fetch, 0.5 s). Ahora un
cambio futuro en la nav rompe un test en vez de pasar silencioso.

**Mantuve los hex del `NavLink` (`#E8440A`, `#1A1410`, `#FFF0EB`).** `docs/conventions.md`
§3 los prohíbe, pero (a) son preexistentes, no los introduje; (b) van dentro del callback
`style` de `NavLink`, que es CSS inline, no `sx`, así que sustituirlos exige leer el tema
con `useTheme()`; y (c) es exactamente la deuda de "tokens de color duplicados" que
`feature_list.json` asigna a la **feature 23**. Tocarlos aquí violaría C10 (scope) y el
requisito explícito de que el render no cambie.

**No arreglé nada más de paso.** Features 21 (`useReveal`), 22 (code splitting) y 23
(tokens) quedan intactas.

## 5. Verificación final

```
npm test           → Test Files 9 passed (9) · Tests 44 passed (44) · exit 0
                     (41 previos + 3 nuevos; ningún test previo roto)
npm run typecheck  → tsc -b --noEmit · exit 0
npm run build      → tsc -b && vite build · exit 0 · built in 15.35s
                     dist/assets/index-Ctxst2tB.js  2,524.56 kB │ gzip: 778.83 kB
                     (!) Some chunks are larger than 500 kB  ← esperado, no es fallo
```

Sin `console.log` de debug, sin código comentado, sin `TODO`, sin archivos temporales.

## 6. Para el reviewer

- La feature sigue en `in_progress`. **No la marqué `done`**: espera veredicto.
- Punto que probablemente quieras mirar con lupa: los hex hardcodeados que sobreviven en
  `src/admin/AdminLayout.tsx` (justificación en §4, son de la feature 23).
