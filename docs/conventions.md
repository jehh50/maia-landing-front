# Convenciones — estilo, nombres, estructura y Git

> Lee esto **antes de escribir código** y otra vez **antes de cerrar sesión**.
> Son las reglas que el `reviewer` comprueba en el criterio C4 de
> `CHECKPOINT.md`. Todas están derivadas del código que ya existe: ante la duda,
> imita el archivo vecino.

---

## 1. Nombres y ubicación de archivos

| Qué | Convención | Ejemplo |
|-----|-----------|---------|
| Componente React | `PascalCase.tsx`, un componente por archivo, `export default` | `ContactModal.tsx` |
| Sección de la landing | `PascalCase.tsx` en `src/components/sections/` | `Pricing.tsx` |
| Página de ruta | `PascalCase.tsx` en `src/pages/` | `BlogArticle.tsx` |
| Hook | `useAlgo.ts` en `src/hooks/`, export nombrado | `useReveal.ts` |
| Módulo de datos/lógica | `camelCase.ts` en `src/lib/`, exports nombrados | `api.ts`, `industries.ts` |
| Test | `<Sujeto>.test.tsx` en un `__tests__/` hermano del código | `src/admin/__tests__/Login.test.tsx` |
| Tipos | Interfaces/types exportados desde el módulo que los posee (normalmente `lib/api.ts`) | `AdminArticle` |

**No** hay carpeta `tests/` en la raíz: los tests viven junto al código.

Dónde va un componente nuevo:

```
¿Es una sección de la landing one-page?  → src/components/sections/
¿Es una ruta completa?                    → src/pages/  (o src/admin/ si es privada)
¿Se usa desde 2+ sitios?                  → src/components/
¿Es solo de una página?                   → déjalo en el archivo de la página
```

## 2. TypeScript

- `strict` está activo, y también `noUnusedLocals` / `noUnusedParameters`: una
  variable sin usar **rompe el build**, no es un warning.
- **Prohibido `any`.** Si no conoces la forma, usa `unknown` y discrimina.
- **Deriva tipos, no los dupliques.** El patrón del repo es `Pick<>` sobre el
  tipo fuente (`PublicArticle = Pick<AdminArticle, …>`) y `const assertion` +
  `typeof` para catálogos (`src/lib/industries.ts`).
- Props: `interface Props { … }` local al archivo, no exportada salvo que otro
  módulo la necesite.
- Nada de `React.FC`: `export default function Foo({ a, b }: Props) { … }`.

## 3. Estilos

Los valores de color viven **una sola vez**, en `src/theme/tokens.ts`; el tema
MUI y las variables CSS derivan de ahí (ver `docs/architecture.md` §6). La regla
práctica:

1. **Por defecto, tokens del tema MUI vía `sx`**: `color: 'primary.main'`,
   `bgcolor: 'surface.soft'`, `color: 'brand.orange'`,
   `bgcolor: 'background.paper'`, `color: 'common.white'`.
2. **`var(--…)` solo** cuando el valor va dentro de un string CSS crudo:
   gradientes (`background: linear-gradient(…, var(--orange), …)`), bordes
   compuestos, `box-shadow` complejos.
3. **Import directo de `tokens`** cuando el color se necesita como valor JS y no
   hay `sx` de por medio: `style={{}}` nativo, arrays de datos
   (`accent: tokens.accent.violet`) o concatenación (`` `${accent}18` ``).
4. **Color con opacidad dentro de un string CSS crudo** (sombra teñida,
   gradiente translúcido, borde): `alpha()` sobre el token, nunca un `rgba()`
   escrito a mano — `` boxShadow: `0 2px 16px ${alpha(tokens.brand.orange, 0.06)}` ``.
   Una `var(--…)` lleva el color opaco y no se puede teñir. Los `rgba()` de
   blancos, negros y grises translúcidos sí se dejan literales: no duplican
   ningún token.
5. **Nunca hardcodees un hex** en un componente. Si el color no existe como
   token, agrégalo **en `src/theme/tokens.ts`** (y expórtalo como variable CSS
   en `cssVariables` solo si hace falta en strings CSS crudos) y dilo en
   `progress/current.md`. No lo añadas a `globals.css`: ese archivo ya no
   declara colores.

No hay Tailwind en este proyecto: no añadas `className` con clases de utilidad.
Las únicas clases CSS propias son las de `globals.css` (`.reveal`, `.fade-up-1..4`,
`.gradient-text`).

Espaciado y tamaños: usa la escala de MUI (`spacing`, `borderRadius: 12` del
tema), no píxeles sueltos, salvo en valores realmente puntuales.

## 4. Datos y llamadas a la API

- **`src/lib/api.ts` es la única frontera con el backend.** Ningún componente
  llama a `fetch` directo. Si necesitas un endpoint nuevo, añade su helper ahí.
- Los helpers **no lanzan**: devuelven `{ ok, status, data }` y `data` cae a
  `null` si no hay body. El llamador discrimina (`'rows' in data`).
- Todo endpoint nuevo debe quedar documentado en `docs/api-contract.md` **antes**
  de consumirse. Si no existe en el backend, no lo inventes: documenta la
  necesidad en `progress/current.md` y trata la feature como `blocked`.
- Cookies: `apiJson` (privado, `credentials: 'include'`), `publicJson`
  (público, `credentials: 'omit'`), `postLead` (por defecto). Elige el correcto.

## 5. Estado

- Estado local por componente (`useState`). **No** se añade Redux/Zustand ni
  React Query sin una decisión de arquitectura explícita.
- Si dos hermanos comparten estado, se eleva al padre (como `isAnnual` en
  `App.tsx`), no se crea un contexto global.
- Estado de carga: el patrón del repo es una máquina de estados explícita
  (`'loading' | 'ok' | 'error'`), no un booleano `isLoading` suelto.

## 6. Accesibilidad y copy

- Todo control interactivo debe ser alcanzable por rol accesible: los tests
  usan `getByRole('button', { name: … })`, así que un botón sin nombre
  accesible es un test imposible de escribir.
- Imágenes con `alt` descriptivo (vacío `alt=""` solo si es decorativa).
- El copy de la landing va **en español**, hardcodeado como arrays tipados en el
  componente de su sección. Las páginas legales son las únicas bilingües.

## 7. Residuos

Antes de cerrar, no debe quedar:

- `console.log` / `console.debug` de depuración (los `console.error` en manejo
  real de errores sí son válidos).
- Código comentado "por si acaso". Las secciones desactivadas de `App.tsx` son
  la única excepción tolerada y ya están documentadas.
- `TODO` sin contexto: o lleva `// TODO(feature-N): …` o se va.
- Archivos temporales, `.orig`, `.bak`, capturas sueltas.

## 8. Git

### Ramas

Nunca se commitea directo a `main`. Una rama por feature:

```
feat/<id>-<slug-corto>      feat/12-ruta-404
fix/<id>-<slug-corto>       fix/15-scroll-navbar-movil
chore/<slug-corto>          chore/actualizar-arnes
docs/<slug-corto>           docs/api-contract
```

### Commits

Conventional Commits, en imperativo y **en español**:

```
<tipo>(<ámbito opcional>): <qué hace, en imperativo, minúscula, sin punto final>
```

Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`, `perf`.

```
feat(blog): añade paginación al listado público
fix(admin): corrige redirección tras login con destino previo
test(contact): cubre respuesta 422 del backend
docs: documenta el contrato de /api/admin/leads
```

Reglas:

- Un commit = un cambio coherente. No mezcles features.
- El asunto no pasa de ~72 caracteres.
- Si el commit cierra una feature, menciónala en el cuerpo:
  `Cierra feature 12 de feature_list.json`.
- **No commitees `dist/`, `node_modules/`, `.env*` ni `tsconfig.tsbuildinfo`**
  (ya están en `.gitignore`).
- No hagas `git push` ni abras PRs salvo que el humano lo pida explícitamente.

### Qué no se toca sin permiso

`package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json` y `.gitignore`
son infraestructura. Cambiarlos requiere que la feature lo pida de forma
explícita; si no, es un bloqueo que se escala.
