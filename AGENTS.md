# AGENTS.md — Mapa de navegación para agentes de IA (Frontend)

> Este archivo es el **punto de entrada** para cualquier agente que trabaje en este
> repositorio. NO es una biblia de reglas: es un **mapa**. Lee solo lo que
> necesites cuando lo necesites (divulgación progresiva).

---

## 1. Antes de empezar (obligatorio)

1. Ejecuta el bloque de verificación — `npm test && npm run typecheck && npm run build`,
   detalle en `docs/verification.md` — y comprueba que los tres terminan en 0. Si
   fallan, **para** y resuelve el entorno antes de tocar código. Si el entorno ya estaba roto antes de tu sesión, no es tu culpa —
   pero igual debes detenerte y reportarlo en `progress/current.md`, no "arreglarlo"
   como parte de la feature que ibas a hacer.
2. Lee `progress/current.md` para entender en qué estado quedó la última sesión.
3. Lee `docs/context.md` para entender el contexto y las decisiones ya tomadas, y
   luego `docs/architecture.md` para entender qué significa "hacer un buen trabajo"
   en este proyecto. Lee context antes que architecture: el contexto suele explicar
   el porqué de una decisión de arquitectura.
4. Lee `feature_list.json` y elige **una** tarea con estado `pending`. No
   trabajes en más de una a la vez.

## 2. Mapa del repositorio

| Archivo / carpeta            | Qué contiene                                              | Cuándo leerlo |
|------------------------------|-----------------------------------------------------------|---------------|
| `feature_list.json`          | Lista de tareas con estado (pending / in_progress / done) | Siempre, al empezar |
| `progress/current.md`        | Estado de la sesión actual                                | Siempre, al empezar |
| `progress/history.md`        | Bitácora append-only de sesiones anteriores               | Si necesitas contexto histórico |
| `docs/architecture.md`       | Qué significa "hacer un buen trabajo" en este proyecto    | Antes de implementar (después de context.md) |
| `docs/conventions.md`        | Reglas de estilo, nombres, estructura, y convención de Git| Antes de escribir código, y antes de cerrar sesión |
| `docs/verification.md`       | Cómo verificar que tu trabajo funciona (comandos de test) | Antes de declarar una tarea como `done` |
| `docs/context.md`            | Contexto del proyecto y decisiones tomadas                | Antes de implementar (antes de architecture.md) |
| `docs/api-contract.md`       | Contratos/esquemas de los endpoints del backend que consume el frontend | Antes de integrar una pantalla con datos reales |
| `CHECKPOINT.md`              | Criterios objetivos de "estado final correcto"            | Para auto-evaluarte |
| `.claude/agents/`            | Definiciones de subagentes (leader, implementer, reviewer) | Si orquestas trabajo |
| `.agents/skills/`            | Skills de referencia técnica (ver §7)                     | Antes de implementar un módulo |
| `src/`                       | Código de la app: `components/`, `pages/`, `admin/`, `hooks/`, `lib/`, `theme/` | Para implementar frontend |
| `public/`                    | Assets estáticos                                          | Al agregar/editar assets |
| `src/**/__tests__/`          | Tests automáticos, junto al código que prueban            | Para verificar |

> **Stack:** React 18 + Vite 5 + TypeScript 5.6 (`strict`) + **MUI 6 + Emotion**;
> tests con Vitest 2 + Testing Library + jsdom. **No hay Tailwind** en este
> proyecto: los estilos van por `sx` y tokens del tema (ver
> `docs/conventions.md` §3).
>
> La app **ya está construida y en producción** (landing, blog y panel admin).
> `feature_list.json` es un backlog de mejoras sobre código existente, no un
> plan de scaffold.
>
> **No existe carpeta `tests/` en la raíz:** cada test vive en un `__tests__/`
> hermano del código que prueba.
>
> **Código de referencia externo (solo lectura):** en `/var/www/html/bulkapp/`
> hay otra app (BULKSALES, CRM/call center en PHP + jQuery) con su propio
> `ANALISIS.md`. Es un proyecto **distinto**, no una v1 de esta landing; solo es
> relevante si una tarea pide explícitamente migrar un comportamiento de UI.
> Nunca copiar su código tal cual (stack incompatible) ni modificarla.

## 3. Reglas duras (no negociables)

- **Una sola feature a la vez.** No mezcles cambios de varias tareas en la misma sesión.
- **No declares una tarea `done` sin pruebas verdes.** Ejecuta los tests y
  asegúrate de que el bloque pasa al 100%.
- **Documenta lo que haces** en `progress/current.md` mientras trabajas, no al final.
- **Deja el repositorio limpio** antes de cerrar la sesión (ver §5).
- **Si no sabes algo, busca en `docs/`** antes de inventarlo.
- **Nunca leas ni escribas valores de `.env` / `.env.local` ni ningún secreto o
  credencial.** Si tu tarea requiere una variable de entorno nueva, no la inventes:
  documenta el nombre y el propósito en `progress/current.md` y deja que un humano
  la agregue.
- **No inventes contratos de API.** Si un endpoint que necesitas consumir no
  está en `docs/api-contract.md` ni implementado en el backend, documenta la
  necesidad en `progress/current.md` en vez de mockear una forma de datos
  arbitraria que luego hay que deshacer.

## 4. Cómo elegir una tarea

```
1. Abre feature_list.json
2. Filtra por status == "pending"
3. Coge la de menor "id"
4. Cambia su status a "in_progress" y guarda
5. Anota en progress/current.md: feature, hora de inicio, plan breve
```

## 5. Cierre de sesión (lifecycle)

Antes de terminar:

1. Ejecuta los tests — todo verde.
2. Si la tarea está acabada: marca `status: "done"` en `feature_list.json`.
3. Mueve el resumen de `progress/current.md` al final de `progress/history.md`.
4. Vacía `progress/current.md` dejando solo la plantilla.
5. No dejes archivos temporales, ni `console.log()` de debug, ni TODOs sin contexto.
6. Sigue la convención de commits y branches de `docs/conventions.md` §8 — no
   commitees directo a `main`.

## 6. Si te bloqueas

```
1. Relee la sección relevante de docs/ para el problema puntual.
2. Si la herramienta no hace lo que esperas, NO inventes un workaround.
3. Documenta el bloqueo en progress/current.md: qué intentaste, qué esperabas,
   qué obtuviste.
4. Marca la feature bloqueada como status: "blocked" (no "in_progress") en
   feature_list.json, con una referencia al bloqueo documentado.
5. Revisa la siguiente tarea "pending" en feature_list.json:
   a. Si NO depende del mismo bloqueo → tómala y continúa la sesión normalmente.
   b. Si depende del mismo bloqueo → sigue bajando la lista.
   c. Si todas las tareas pending dependen del bloqueo → detén la sesión por
      completo y repórtalo explícitamente como bloqueo global, no como feature
      individual.
```

**Cuándo escalar a un humano** (más allá de bloqueos de herramientas):

- La tarea en `feature_list.json` es ambigua y admite más de una interpretación
  razonable de implementación.
- Resolverla implica una decisión de arquitectura no cubierta en `docs/architecture.md`.
- Requiere un endpoint de backend que no existe todavía ni está documentado en
  `docs/api-contract.md`.
- Requiere una credencial, variable de entorno o acceso que no tienes.

En cualquiera de estos casos, **no improvises una interpretación**: documenta la
ambigüedad en `progress/current.md` con las opciones que consideraste, y trata la
tarea como bloqueada (ver flujo de arriba).

---

## 7. Skills disponibles

Skills de referencia técnica en `.agents/skills/`. Léelas bajo demanda, solo cuando vayas a trabajar en el módulo correspondiente.

- `vercel-react-best-practices/` — patrones de rendimiento de React: re-renders,
  estado derivado, efectos, memoización, code splitting y carga de recursos. La
  `SKILL.md` es el índice; cada regla concreta vive en `rules/<slug>.md`. Leer
  las reglas relevantes antes de tocar componentes con estado o de trabajar en
  la feature 22 (code splitting).

> En sesiones de Claude Code estas skills están disponibles vía la herramienta
> `Skill` (nombre: `vercel-react-best-practices`); `.claude/skills/` son
> symlinks a `.agents/skills/`, y `skills-lock.json` fija la versión instalada.
>
> Ojo: parte de esa skill asume Next.js / React Server Components. **Aquí no hay
> servidor de render**: es un SPA de Vite. Ignora las reglas `server-*` y aplica
> solo las de cliente, re-render, bundle y JS.

Cada skill puede tener archivos de referencia adicionales en su subcarpeta `references/`.