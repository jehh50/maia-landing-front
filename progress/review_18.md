# Review — feature 18: Eliminar el flag muerto `enabled` de AdminLayout

**Veredicto:** APPROVED

## Verificación ejecutada

Bloque completo corrido por el reviewer desde `/var/www/html/maia-landing-front`,
en el orden de `docs/verification.md` §1:

- `npm test`          → `Test Files 9 passed (9)` · `Tests 44 passed (44)` · exit 0
- `npm run typecheck` → `tsc -b --noEmit` · exit 0
- `npm run build`     → `tsc -b && vite build` · exit 0 · `built in 14.05s`
  (`dist/assets/index-Ctxst2tB.js 2,524.56 kB`; aviso `Some chunks are larger than
  500 kB` — esperado, no cuenta como fallo)

Baseline previo a la 18: 8 archivos / 41 tests. Ahora 9 / 44 (+1 archivo, +3 tests).
Ningún test previo roto.

## Alcance real del diff (separado de la feature 17)

Feature 17 (`done`) sigue sin commitear en el árbol y aporta `src/main.tsx`,
`src/AppRoutes.tsx`, `src/pages/NotFound.tsx`, `src/pages/__tests__/NotFound.test.tsx`
y parte de `docs/architecture.md`. **No se computa en esta review.**

Lo atribuible a la feature 18:

```
M src/admin/AdminLayout.tsx
A src/admin/__tests__/AdminLayout.test.tsx
M docs/architecture.md   (§8 contadores + §10 bullet del flag)
M docs/context.md        (§4 mismo bullet)
M docs/verification.md   (§1 y §2 baseline)
M progress/current.md · A progress/impl_18.md · M feature_list.json (status 18)
```

Coincide exactamente con lo declarado en `progress/impl_18.md` §3. Sin archivos
sorpresa en `src/`.

## Equivalencia de render (el punto crítico de esta feature)

Verificado línea a línea sobre `git diff src/admin/AdminLayout.tsx`. La rama viva del
ternario se conserva **idéntica**, sin una sola propiedad alterada:

- Mismos tres items y mismo orden: `Inicio` → `/admin` (`end: true`),
  `Leads` → `/admin/leads` (`end: false`), `Blog` → `/admin/articles` (`end: false`)
  (`src/admin/AdminLayout.tsx:5-9`).
- Mismo componente de enlace: `NavLink` de react-router-dom, con `key={item.to}`,
  `to={item.to}` y `end={item.end}` (`:57-60`).
- Mismo callback `style={({ isActive }) => …}` con los mismos ocho pares
  clave/valor, incluidos `color`/`background`/`fontWeight` condicionados a
  `isActive` (`:61-70`). El marcado activo (`aria-current="page"` que emite
  `NavLink`) no se toca.
- Contenedor intacto: `<Stack component="nav" spacing={0.5} aria-label="Navegación admin">`
  (`:55`).
- La rama eliminada (`<Box aria-disabled="true">` + `<Typography>próximamente</Typography>`)
  era **inalcanzable**: los tres items traían `enabled: true`. Borrarla no quita ningún
  nodo del DOM real ni ningún atributo de accesibilidad que se estuviera emitiendo.

Conclusión: cero cambio visual y cero cambio de accesibilidad. `Box` y `Typography`
siguen importados porque los usan el logo (`:43-52`) y el bloque de usuario (`:81-86`);
`noUnusedLocals` lo confirma vía typecheck en 0.

## `enabled` fuera del componente

`grep -rn "enabled" src/` → **0 coincidencias**. El flag no sobrevive en ningún
archivo de `src/`, ni siquiera en el test nuevo (el implementer lo verificó
pre-cambio con 4 coincidencias, todas en `AdminLayout.tsx`; post-cambio no queda
ninguna). `grep -rni "próximamente|aria-disabled" src/` → solo 3 líneas, todas
dentro del test de guardia `src/admin/__tests__/AdminLayout.test.tsx:51,54,55`.
`AdminLayout` solo se instancia desde `src/AppRoutes.tsx` pasándole `user`.

## Valor de los tests añadidos (41 → 44)

- `AdminLayout.test.tsx:33` *"muestra Inicio, Leads y Blog como enlaces a su ruta"* —
  **valor real.** Fija labels, orden y los tres `href`. Falla si alguien renombra,
  reordena o repunta un item.
- `AdminLayout.test.tsx:43` *"marca como activo solo el ítem de la ruta actual"* —
  **el más valioso.** En `/admin/leads` exige `aria-current="page"` en "Leads" y su
  ausencia en "Inicio". Es lo único que ancla el `end: true` de "Inicio": sin él,
  perder ese flag haría que "Inicio" quedara activo en toda ruta `/admin/*` y nadie
  se enteraría. Cubre literalmente el acceptance 2 ("con el mismo marcado activo").
- `AdminLayout.test.tsx:51` *"no renderiza ningún ítem deshabilitado…"* — **guardia
  tautológica.** Pasaba igual antes del cambio (la rama era inalcanzable), así que no
  discrimina el diff: solo protege contra la reintroducción del placeholder. Es barato
  y no miente sobre lo que cubre, pero no cuenta como cobertura de la eliminación.

No es relleno: 2 de 3 tests cubren comportamiento que hoy no tenía red y que el
acceptance sí exige.

## Checkpoints

- C1  [x] `npm test` exit 0, 9 archivos / 44 tests, ningún test previo roto.
- C2  [x] Acceptance 1 (desaparece `enabled` y su rama `else`) → verificable por
      lectura (`AdminLayout.tsx:5-9`, `:56-74`) + `grep` a 0, anclado además por
      `AdminLayout.test.tsx:51`. Acceptance 2 (Inicio/Leads/Blog con el mismo
      marcado activo) → `AdminLayout.test.tsx:33` y `:43`. Acceptance 3 (bloque en
      verde) → ejecutado arriba. `docs/verification.md` §5 ni siquiera exigía test
      para código muerto sin cambio de comportamiento.
- C3  [x] `npm run typecheck` exit 0 y `npm run build` exit 0.
- C4  [x] Test en `src/admin/__tests__/AdminLayout.test.tsx` (ubicación y nombre
      correctos, §1); sin `any`, sin variables sin usar; `interface Props` local sin
      exportar; `export default function`. Ver nota 1 sobre los hex supervivientes.
- C5  [x] Ningún `fetch` añadido; el componente sigue usando `logout` de
      `src/lib/api.ts` (`AdminLayout.tsx:3,23`). Sin state manager ni librería de
      fetching nuevos. El test importa el tipo `AdminUser` de `lib/api` en vez de
      redeclararlo (`AdminLayout.test.tsx:7`).
- C6  [x] No se consume ningún endpoint nuevo; `docs/api-contract.md` sin cambios
      necesarios.
- C7  [x] `feature_list.json` deja la 18 en `in_progress` (correcto: no se
      autoaprobó). `progress/current.md` documenta plan, bitácora, decisiones y la
      tabla de verificación; `progress/impl_18.md` coincide con el diff real.
- C8  [x] No hay `.env*` en el repo ni referencias a secretos; "Variables de
      entorno necesarias: Ninguna" en `progress/current.md`.
- C9  [x] Sin `console.log`, sin código comentado, sin `TODO`, sin `.orig`/`.bak`
      (`find` a 0). Ver nota 3 sobre `tsconfig.tsbuildinfo` (preexistente).
- C10 [x] `src/` solo toca `AdminLayout.tsx` + su test. No se arregló de paso deuda
      de las features 21, 22 ni 23. Ver nota 2 sobre docs.
- C11 [x] `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` y
      `.gitignore` sin modificar (`git status` lo confirma).

## Notas (no bloquean)

1. **Hex hardcodeados que sobreviven** — `src/admin/AdminLayout.tsx:66-67`
   (`#E8440A`, `#1A1410`, `#FFF0EB`) violan `docs/conventions.md` §3 en abstracto,
   pero: son preexistentes, aparecen como líneas "añadidas" en el diff solo porque
   colapsar el ternario reindentó el bloque, y el contenido es byte a byte el de la
   rama viva anterior. Sustituirlos exigiría `useTheme()` y cambiaría el render, que
   es justo lo que esta feature prohíbe. Además la feature 23 los reclama de forma
   explícita en su acceptance ("Ningún color queda hardcodeado en componentes").
   Tocarlos aquí habría sido un fallo de C10. Decisión del implementer correcta.

2. **Actualizar el baseline de `docs/verification.md` §1 y §2 a 9/44 es housekeeping
   aceptable, no scope creep.** El contador cambia *porque* esta feature añade un
   archivo de test: dejarlo en 8/41 haría que el propio documento de verificación
   mintiera y que la siguiente feature arrancara comparándose contra un baseline
   falso. Mismo razonamiento para `docs/architecture.md` §8 y para el borrado del
   bullet "`AdminLayout` tiene un flag `enabled` muerto" en §10 y `docs/context.md`
   §4: son la descripción literal del código eliminado. Dicho esto, un matiz:
   `docs/verification.md:46` afirma *"Baseline conocido bueno … tras la feature 18"*
   antes de que existiera veredicto. Si esta review hubiera sido
   `CHANGES_REQUESTED`, el documento habría declarado como baseline un estado no
   aprobado. Es una cuestión de orden, no de contenido — el número resulta correcto
   y lo acabo de confirmar ejecutando el bloque. Para la próxima: cambiar el
   contador y dejar la etiqueta "tras la feature N" al cerrar.

3. **`tsconfig.tsbuildinfo` aparece modificado en `git status`** pese a estar en
   `.gitignore:6`: está trackeado desde antes (`git ls-files` lo confirma), así que
   cualquier `npm run build` lo ensucia. No lo causa esta feature — ya lo señaló
   `progress/review_17.md:163`. Es deuda del repo, no de la 18; no cuenta contra C9
   ni C11 aquí.

## Detalle de los fallos

Ninguno. No hay `[ ]` en la lista, y en particular ninguno en C1, C2, C3 ni C8.

La feature puede pasar a `status: "done"` en `feature_list.json` (lo marca el
leader, no el implementer ni el reviewer).
