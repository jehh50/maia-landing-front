# Review — feature 26: Limpiar residuos preexistentes de `Pricing.tsx`

**Veredicto: APROBADO** (APPROVED)

Revisor: agente `reviewer` · 2026-07-28 · Archivos revisados:
`src/components/sections/Pricing.tsx` (modificado),
`src/components/sections/__tests__/Pricing.test.tsx` (nuevo).

---

## 1. Verificación ejecutada por mí (no heredada del informe)

| Comando | Resultado |
|---|---|
| `npm test` | **exit 0** — 15 archivos / 85 tests, todos pasan |
| `npm run typecheck` | **exit 0** |
| `npm run build` | **exit 0** — `Some chunks are larger than 500 kB` (esperado, `CHECKPOINT.md` C3) |
| `grep -rnE '#[0-9a-fA-F]{3,8}' src/` | solo `src/theme/tokens.ts` (29), `src/theme/__tests__/tokens.test.tsx` (30) y los falsos positivos `'#features'` de `Navbar.tsx:8` y `Footer.tsx:6` |
| `git status --porcelain -- package.json vite.config.ts tsconfig.json vercel.json .gitignore index.html` | **vacío** |

Además ejecuté dos comprobaciones propias, descritas en §3 y §4, para no dar por
buena la palabra del implementer en los dos puntos que él mismo señala como
discutibles.

---

## 2. Acceptance criteria, uno a uno

### A1 — «El bloque JSX comentado desaparece y con él el último `#fff` hardcodeado» — **CUMPLE**

`src/components/sections/Pricing.tsx` pasa de 149 a 118 líneas: el `.map()` de
planes cierra ahora en la línea 105 (`</Box>`) justo tras la `<Box component="ul">`
de features, sin bloque comentado intermedio. `grep -n 'Hablar con ventas\|/\*'
src/components/sections/Pricing.tsx` no devuelve nada.

El grep de hex del acceptance 4 (abajo) confirma que no queda ningún `#fff` en el
archivo. El `color: '#fff'` del badge ya se había convertido en `common.white`
antes de esta feature; lo que se va aquí es el `color: '#fff'` que vivía **dentro**
del comentario, que es la excepción 1 de `progress/impl_23.md` §2.5.

### A2 — «La declaración `background: 'primary.main'` inválida desaparece» — **CUMPLE**

`Pricing.tsx:68-72`: el `sx` del badge queda
`px: 1.5, py: 0.5, borderRadius: 100,` / `bgcolor: 'primary.main', color: 'common.white', …`.
La clave `background` ya no está y **no** se sustituyó por nada (correcto: habría
sido una declaración redundante).

Verifiqué el diagnóstico en el CSS emitido, no solo en la fuente de MUI (ver §3).

### A3 — «El render no cambia: el `bgcolor` contiguo ya aportaba el color» — **CUMPLE, comprobado por mí**

Ver §3: con el código anterior, Emotion emitía para el badge
`background:primary.main; background-color:#E8440A;` y el color computado era
`rgb(232, 68, 10)`; con el código nuevo el computado es idéntico. El bloque
comentado, por definición, no renderizaba nada. Las capturas antes/después del
implementer (`bbox=None` en la sección `Pricing` a 1440 px y en la página entera a
360 px) son consistentes con esto y su salvedad sobre el carrusel del Hero está
correctamente aislada como no-determinismo previo.

### A4 — «`grep -rnE '#[0-9a-fA-F]{3,8}' src/` solo devuelve las excepciones justificadas» — **CUMPLE**

Ejecutado por mí (tabla de §1). Los 59 aciertos restantes están en la fuente de
verdad (`tokens.ts`) y en el test que la congela; los otros dos son anclas de
scroll (`'#features'`), no colores. Nada nuevo ni fuera de la lista de
`progress/impl_23.md`.

---

## 3. Punto 2 del encargo — borrar el bloque comentado en vez de parar: **decisión correcta**

Rehice la arqueología yo mismo, sin fiarme del informe:

- `git rev-parse eda76c4^` → **`587e9a3`**: son padre e hijo, así que `eda76c4` es
  efectivamente el commit que comentó el bloque.
- `git show 587e9a3:src/components/sections/Pricing.tsx` (última versión **activa**)
  contiene `href={\`https://app.maiabuilder.ai/login?plan=${encodeURIComponent(p.name.toLowerCase())}\`}`
  y el copy `Elegir plan →`.
- `git show eda76c4:src/components/sections/Pricing.tsx` (versión **comentada**)
  contiene, dentro del `{/* … */}`, `onClick={onOpenContact}` y el copy
  `Hablar con ventas →`. **El deep link ya no está ahí.**

Conclusión: la afirmación clave del implementer es **cierta y verificada**.
Restaurar el comentario tal cual no devolvería el alta self-service; solo
duplicaría un CTA hacia el mismo `onOpenContact` que ya sirve el enlace
"Contactanos" del pie de la sección (`Pricing.tsx:109-114`), puesto en su sitio por
ese mismo commit.

Con eso, borrar es la lectura correcta de `docs/conventions.md` §7 ("código
comentado por si acaso"; la única excepción tolerada es `App.tsx`), y además es
literalmente lo que pedía el `acceptance` 1 de la feature: parar a preguntar
habría sido no ejecutar el encargo. El bloque sigue íntegro en `eda76c4` para
quien lo quiera. **No hay motivo de rechazo aquí.**

La observación de producto que levanta (§2 final de `impl_26.md`: hoy ninguna
tarjeta de plan tiene botón) está bien planteada y bien **no** arreglada: eso sí
habría sido C10. Queda para el líder darla de alta como feature nueva.

## 4. Punto 3 del encargo — la eliminación de `background: 'primary.main'`

Reconstruí en un directorio temporal (`src/components/sections/__reviewer_tmp/`,
**borrado al terminar**; `git status` de `src/components/sections/` vuelve a
mostrar solo `Pricing.tsx` y `__tests__/`) una copia del componente con la clave
`background: 'primary.main'` reintroducida, y corrí contra ella los 5 tests nuevos.

El CSS emitido por Emotion para el badge con el código **viejo** fue:

```
.css-ip1ggx{ … border-radius:1200px;
             background:primary.main;   ← declaración inválida, descartada
             background-color:#E8440A;  ← el bgcolor hermano, este sí pinta
             color:#fff; font-size:11px; font-weight:700; }
```

y `getComputedStyle(badge).backgroundColor` dio `rgb(232, 68, 10)` **tanto con el
código viejo como con el nuevo**. Es exactamente lo que afirma el informe: el color
lo aportaba y lo sigue aportando el `bgcolor`, y no se perdió nada. El único
`background:` que queda en el archivo (línea 43, `linear-gradient(… var(--orange-xxl) …)`)
es un string CSS crudo, caso 2 de `docs/conventions.md` §3: legítimo.

## 5. Punto 4 del encargo — el `.map()` de planes

Íntegro. `plans` (líneas 11-37) no se tocó; el `.map()` (60-106) abre y cierra
correctamente y el archivo compila (`typecheck` y `build` en 0, que con
`noUnusedLocals` no es trivial). El test 3 monta la sección y encuentra los cuatro
`heading` (`Starter`, `Team`, `Growth`, `Enterprise`). El pie de sección y el
enlace "Contactanos" siguen en pie y disparan `onOpenContact`.

## 6. Punto 5 del encargo — ¿tests honestos o tests-decorado? **Dictamen**

Corridos contra la versión reconstruida **anterior** al cambio:

| Test | ¿Falla con el código viejo? | Dictamen |
|---|---|---|
| 1 — badge con el naranja de marca | No (pasa en ambos) | **Honesto y necesario.** Es la aserción del acceptance 3 ("el render no cambia"): un test de invariancia **debe** pasar antes y después. Si fallara, el cambio habría roto algo. Correctamente descrito en `impl_26.md` §6. |
| 2 — ningún path de paleta sin resolver | **Sí**: `expected '.css-a0nkt9{…}' not to match /primary\.main/` | **Honesto.** Reproduje el fallo yo mismo. Es el guardián real de N4 y de cualquier reincidencia. |
| 3 — las cuatro tarjetas siguen en pie | No | **Honesto.** Es un test de no-regresión del borrado de 28 líneas dentro de un `.map()`; barato y pertinente. |
| 4 — no hay CTA por tarjeta | No | Válido, pero **no discrimina** el cambio (el JSX comentado tampoco renderizaba, así que ya pasaba antes). Ver nota N1. |
| 5 — switch anual | No | **No es scope creep sancionable**, ver nota N3. |

Ninguno es test-decorado: los cinco montan el componente real con el tema real y
afirman sobre el DOM. El único con etiqueta algo generosa es el 4.

## 7. Scope

Comprobé por mtime qué se tocó dentro de la ventana de la sesión 26 (inicio 11:08
según `progress/current.md`): **solo** `src/components/sections/Pricing.tsx`
(11:18) y el test nuevo. `Pain.tsx` (10:45), `Solution.tsx` (10:48) y
`theme/__tests__/brandAlpha.test.tsx` son de la feature 25, ya revisada. Nada de
infraestructura, ningún `.env*` (no existe ninguno en el repo), ningún fichero
temporal ni captura dentro del repo (los PNG del arnés viven en el scratchpad).
Se dejaron sin tocar, correctamente, `var(--black)` de `Addons.tsx`, el contraste
del `CTAFinal` y el desborde del admin a 360 px.

---

## Checkpoints

- **C1** [x] — `npm test` exit 0, 15 archivos / 85 tests. Ningún test previo roto
  (baseline vigente 14/80 de la feature 25; +1 archivo, +5 tests).
- **C2** [x] — A2 y A3 tienen test propio y discriminante (tests 2 y 1). A1 y A4 se
  verifican por grep reproducible, y `docs/verification.md` §5 exime
  explícitamente de test a las «secciones presentacionales de la landing (copy,
  layout, `sx`)» y a los «cambios solo de estilos/tokens», que es exactamente lo
  que es esta feature. Aun así aportó 5 tests.
- **C3** [x] — `typecheck` exit 0, `build` exit 0 con el aviso esperado de chunk.
- **C4** [x] — `Pricing.test.tsx` está en un `__tests__/` hermano y se llama
  `<Sujeto>.test.tsx` (§1); sin `any` (`Partial<Parameters<typeof Pricing>[0]>` es
  tipo **derivado**, el patrón que pide §2); sin variables sin usar (lo garantiza
  `noUnusedLocals` en verde); cero hex hardcodeados y cero `className` de utilidad
  (§3). `common.white` y `background.paper` son tokens del tema, caso 1 de §3.
- **C5** [x] — Ni un `fetch` nuevo (ninguno en `Pricing.tsx` ni en su test), sin
  state manager ni librería de fetching nueva. `isAnnual` sigue elevado a `App.tsx`
  vía props, como manda `docs/conventions.md` §5.
- **C6** [x] — No se consume ningún endpoint; `docs/api-contract.md` no aplica.
- **C7** [x] — `feature_list.json` mantiene la 26 en `in_progress` (correcto: el
  implementer no debe marcarla `done`), y `progress/current.md` documenta plan,
  bitácora, verificación y ausencia de bloqueos.
- **C8** [x] — No hay ningún `.env*` en el repo y nada en el diff los referencia.
  Sin variables de entorno nuevas.
- **C9** [x] — Sin `console.log`, sin código comentado (justo lo contrario: se
  elimina el que había), sin `TODO`, sin `.orig`/`.bak`. El `tsconfig.tsbuildinfo`
  modificado que aparece en `git status` es deuda **preexistente** ya documentada
  en `progress/current.md` (trackeado pese a estar en `.gitignore`); lo toca
  cualquier `npm run build`, incluido el mío, y no es atribuible a esta feature.
- **C10** [x] — Un solo cambio coherente, verificado por mtime (§7). Deuda ajena
  intacta y correctamente levantada en vez de arreglada.
- **C11** [x] — `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`,
  `.gitignore` e `index.html` sin modificar (`git status --porcelain` vacío para
  esos paths).

**Ninguno en `[ ]`. Sin fallos que corregir.**

---

## Notas no bloqueantes (no exigen cambios para cerrar la 26)

- **N1 — `src/components/sections/__tests__/Pricing.test.tsx:54-61` (test 4).** Lo
  verifiqué: pasa igual con el código anterior, porque el JSX comentado tampoco
  llegaba al DOM. Es un test válido de estado, pero **no** es evidencia de que el
  bloque comentado se haya ido; esa evidencia es el grep de A4 y la lectura del
  archivo. Nada que cambiar, solo que no se le atribuya un poder que no tiene.
- **N2 — `docs/architecture.md` §8 queda desactualizado por esta feature.** Dice
  «13 archivos de test, 75 tests», lista los 13 archivos sin
  `components/sections/__tests__/Pricing.test.tsx`, y afirma «sin tests de las
  secciones de la landing». Con la 26 son **15 archivos / 85 tests** y sí existe un
  test de sección. Se suma a lo que ya levantó el implementer sobre
  `docs/verification.md` §1 (misma cifra vieja). **Ambos son docs: corresponde al
  líder**, no al implementer, y no bloquean el cierre.
- **N3 — test 5 (`Pricing.test.tsx:63-71`), sobre el scope.** Cubre lógica
  preexistente del componente, no del acceptance. Lo admito: no modifica una sola
  línea de producción, vive en el archivo de la propia feature, es determinista y
  no invade otra feature del backlog — no es la «deuda documentada en
  architecture §10» que C10 prohíbe arreglar de paso. Si el líder prefiere una
  regla más estricta, dígase en `docs/conventions.md`, pero rechazar la feature por
  esto sería aplicar retroactivamente una norma que hoy no está escrita.
- **N4 — Para el líder, no para esta feature.** Queda por escrito que la sección de
  precios no tiene CTA por tarjeta: el único es el enlace de texto "Contactanos"
  (`Pricing.tsx:109-114`). Lo apagó `eda76c4` junto con el deep link
  `app.maiabuilder.ai/login?plan=…`. **Candidata a feature nueva** (diseño, copy y
  destino), no restauración mecánica del comentario.
- **N5 — Higiene del repo, ajena a la 26.** Todo el trabajo de las features 17-26
  sigue sin commitear sobre `main`, lo que hace imposible aislar un diff por
  feature con `git diff` (tuve que recurrir a mtimes). No es responsabilidad del
  implementer —`docs/conventions.md` §8 le prohíbe commitear sin que lo pida el
  humano—, pero conviene resolverlo antes de que el árbol crezca más.
