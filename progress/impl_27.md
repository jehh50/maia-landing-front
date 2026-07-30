# Implementación — feature 27: Andamiaje admin para usuarios, imágenes y precios

**Fecha:** 2026-07-29 · **Estado:** implementada, **pendiente de review** (no la marco `done`)
**Rama:** `main`, sin commits (el humano no los pidió)

---

## 1. Baseline (verificado por mí antes de tocar nada)

| Comando | Resultado |
|---------|-----------|
| `npm test` | exit 0 — **15 archivos / 85 tests** |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, aviso de chunk >500 kB (esperado), entrada 1 586,48 kB |

Verde, coincide con lo que reportó el líder. Procedí.

---

## 2. Qué cambié

### Archivos nuevos (3 componentes de anclaje)

| Archivo | Contenido |
|---------|-----------|
| `src/admin/users/UsersList.tsx` | `<Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Usuarios</Typography>` + copy de «en construcción» |
| `src/admin/images/ImagesGrid.tsx` | ídem con «Imágenes» |
| `src/admin/prices/PricesList.tsx` | ídem con «Precios» |

Los tres son deliberadamente mínimos: `Box` + título + un párrafo
`variant="body2" color="text.secondary"`. **Sin estado, sin mock, sin tabla, sin
`fetch`, sin imports de `src/lib/api.ts`.** Cada uno lleva un JSDoc que dice qué
feature (28, 29 o 30) lo va a reescribir y por qué se maqueta con mock. No usé
`// TODO(...)` porque el JSDoc ya referencia la feature y `conventions.md` §7
prefiere no dejar TODOs sueltos.

El título copia literalmente el patrón de `LeadsList.tsx:71` (`variant="h5"`,
`fontWeight={700}`, `sx={{ mb: 3 }}`), así que `getByRole('heading')` los
encuentra igual que los existentes.

### `src/AppRoutes.tsx`

- Tres `lazy` con **ruta literal** en el `import()` (`'./admin/images/ImagesGrid'`
  etc.). Nada calculado: si el path no es analizable, Rollup no emite chunk.
- Tres `<Route>` dentro del `<Route path="/admin">`, cada una envuelta
  individualmente en `AdminPage` (el `<Suspense>` interno que evita que la
  guardia y el sidebar se desmonten).
- **El comodín `*` sigue siendo la última ruta del `<Routes>`.** Las nuevas van
  antes del cierre del `</Route>` del admin.
- No convertí `App` / `LegalPage` / `NotFound` a `lazy` (decisión de la feature 22).

### `src/admin/AdminLayout.tsx`

`NAV_ITEMS` pasa de 3 a 6 ítems, los tres nuevos con `end: false`:

```
Inicio (end: true) · Leads · Blog · Imágenes · Precios · Usuarios
```

Además actualicé el JSDoc del componente, que decía «Las tres secciones
("Inicio", "Leads" y "Blog") están activas» y con seis ítems habría quedado
falso.

### `src/admin/__tests__/AdminLayout.test.tsx`

El `toEqual(['Inicio','Leads','Blog'])` de la línea 37 rompía, como estaba
previsto. Lo actualicé a la lista exacta de seis y **añadí** las tres
aserciones de `href` que faltaban. **Sigue siendo un `toEqual` sobre la lista
completa y ordenada** — no lo degradé a `toContain`. Los otros dos tests del
archivo (ítem activo, ausencia de ítems «próximamente») pasan sin cambios.

### `src/__tests__/AppRoutes.test.tsx` (+1 test)

Test nuevo en el describe «admin perezoso tras la guardia», siguiendo el patrón
de `:131-142`: monta `/admin` con sesión, captura el nodo de la `<nav>` **una
vez**, y luego navega por clic a Imágenes → Precios → Usuarios. En cada salto
comprueba dos cosas:

1. `findByRole('heading', { name: /imágenes/i })` — el chunk perezoso llegó.
2. `expect(screen.getByRole('navigation', …)).toBe(nav)` — es **el mismo nodo
   del DOM**, es decir el sidebar no se remontó.

Ese `toBe(nav)` es un pelín más estricto que el test vecino (que solo comprueba
que existe *alguna* nav). Lo hice a propósito: es lo que distingue «el sidebar
sigue ahí» de «el sidebar se destruyó y se volvió a crear».

### Documentación

- `docs/verification.md` §1 y §2: conteo 85 → **86** y línea de histórico.
- `docs/architecture.md` §8: conteo 85 → **86**.
  Lo pide explícitamente `explore_admin_patterns.md` §6.3. El listado de
  archivos de §8 no cambia: el test nuevo va en un archivo que ya existía.
- `progress/current.md` documentado **mientras** trabajaba.
- `feature_list.json` id 27 → `in_progress`.

---

## 3. Verificación final

```
npm test && npm run typecheck && npm run build
```

| Comando | Resultado |
|---------|-----------|
| `npm test` | **exit 0 — 15 archivos / 86 tests** (85 → 86, +1) |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, aviso de chunk >500 kB (esperado, no cuenta como fallo) |

**Conteo de tests:** antes 15 / 85 · después 15 / **86**. Ningún archivo de test
nuevo: el caso se sumó a `AppRoutes.test.tsx` (7 → 8 tests) y
`AdminLayout.test.tsx` se queda en 3 (actualizado, no ampliado).

### Chunks nuevos del build (los tres esperados, uno por vista perezosa)

```
dist/assets/ImagesGrid-BOZciv22.js   0.40 kB │ gzip: 0.32 kB
dist/assets/PricesList-CKlk5EiD.js   0.41 kB │ gzip: 0.33 kB
dist/assets/UsersList-CUlatpAJ.js    0.42 kB │ gzip: 0.33 kB
```

Confirma que el `import()` literal es analizable. Módulos transformados
1 738 → 1 741 (+3). Chunk de entrada 1 586,48 → 1 586,87 kB (+0,39 kB: las tres
entradas de `NAV_ITEMS` y la tabla de rutas). `AdminLayout` 5,39 → 5,52 kB.

---

## 4. Decisiones que tomé

1. **«Imágenes» con tilde, no «Imagenes».** `feature_list.json` escribe
   «Imagenes» pero ese archivo está sin acentos **entero** («anade», «comodin»,
   «minimo», «seccion»), así que lo leí como un artefacto de codificación, no
   como una decisión de copy. `docs/conventions.md` §6 manda copy en español y
   el resto del panel usa tildes («Cerrar sesión», «Navegación admin»). Si el
   líder quiere el label sin tilde, es un cambio de una línea en `NAV_ITEMS` +
   una en el `toEqual` + el regex del test de rutas.
2. **Orden del sidebar: `Inicio · Leads · Blog · Imágenes · Precios · Usuarios`.**
   El enunciado dejaba el orden a mi criterio con `Inicio` primero. Agrupé por
   naturaleza: contenido y negocio primero (Leads, Blog, Imágenes, Precios),
   gestión de accesos al final (Usuarios), que es lo que menos se visita y lo
   único que no es contenido. `Inicio` es el único con `end: true`.
3. **Rutas ordenadas alfabéticamente** (`images`, `prices`, `users`) después de
   las de `articles`, y los `lazy` en el mismo orden. Sin efecto funcional
   —React Router 6 casa por especificidad, no por orden de declaración— pero
   hace el diff y las futuras inserciones legibles.
4. **Un solo test con bucle en vez de tres tests.** Las tres rutas comparten
   exactamente el mismo contrato («monta bajo la guardia sin remontar el
   sidebar»), y montar el árbol completo del admin cuesta ~1 s por render. Un
   test que navega por las tres tarda 455 ms en total. Si un caso falla, el
   mensaje identifica la sección por su label.
5. **No añadí las tres rutas hijas al `renderAt` de `AdminLayout.test.tsx`.** Ese
   helper solo declara stubs para las rutas que sus tests visitan, y ninguno
   navega a las nuevas. Añadirlas sería ruido.

---

## 5. Lo que NO toqué (y por qué)

- **`src/lib/api.ts`: intacto.** Ninguna de las tres vistas consume backend.
  Cero `fetch` fuera de la capa de datos (C5).
- **`docs/api-contract.md`: intacto.** No se consume ni se añade ningún endpoint,
  así que no hay nada que documentar (C6 no aplica a esta feature).
- **`src/components/sections/Pricing.tsx`** y el resto de la landing: intactos.
- **Infraestructura** (`package.json`, `vite.config.ts`, `tsconfig.json`,
  `vercel.json`, `.gitignore`, `index.html`): intacta. Cero dependencias nuevas.
- **`AdminGuard.tsx`**: intacto. Las rutas nuevas quedan protegidas por
  anidamiento, no hace falta tocar la guardia.
- **Deuda ajena (C10)**: no migré `ArticlesList.tsx` a `normalizeApi`, no convertí
  `App`/`LegalPage`/`NotFound` a `lazy`, no toqué el doble `useReveal` ni el peso
  del chunk de `three`.
- **`.env*`**: no leídos ni escritos. No hace falta ninguna variable nueva.

---

## 6. Para el líder: dos cosas que roza el scope

### a) El copy de `AdminHome.tsx` sí queda tocado por esto (no lo cambié)

Como pedía el enunciado, lo revisé:

- **`AdminHome.tsx:18`** — «Desde aquí podrás gestionar leads y contenido del
  blog de MaIA.» Con seis secciones queda **incompleto**, pero no es falso: sigue
  siendo verdad que se gestionan leads y blog. **No lo cambié.**
- **`AdminHome.tsx:26-32`** — «La sección de **Leads** y el **mantenedor del
  blog** llegarán en las próximas iteraciones.» Esto **ya era falso antes de mi
  feature**: ambas secciones existen y están en el sidebar desde las features
  19-20. Es deuda de copy **preexistente**, no la introduce el andamiaje, así que
  entra de lleno en C10 y **no la toqué**.

Mi recomendación: abrir una feature pequeña de copy para `AdminHome` cuando las
28-30 estén cerradas, y reescribir el bloque «Próximos pasos» entero de una vez
(ahora mismo también menciona `node scripts/create-user.js`, que es justo lo que
la feature 28 va a reemplazar por UI).

### b) Nota para quien tome las features 28-30

Los tres archivos de anclaje son un `Box` + título + párrafo. **Se reescriben
completos**, no se les añade encima: no hay nada ahí que valga la pena conservar
salvo el `variant="h5" fontWeight={700} sx={{ mb: 3 }}` del título y el nombre
del `export default` (que es lo que `AppRoutes.tsx` importa por ruta literal —
si se renombra el archivo o el default, hay que tocar `AppRoutes.tsx`, que es
justo el archivo compartido que esta feature existía para no tener que tocar
tres veces).

Nada me sorprendió durante la implementación: el manual de patrones
`progress/explore_admin_patterns.md` §3.1, §3.3 y §7 (puntos 16-18, 26-27)
anticipaba con precisión el `toEqual` que iba a romper, la regla del `import()`
literal y el comodín final.
