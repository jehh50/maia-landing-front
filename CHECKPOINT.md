# CHECKPOINT — Criterios objetivos de "estado final correcto"

> El reviewer recorre esta lista en cada revisión y marca `[x]` / `[ ]` en su
> informe `progress/review_<feature>.md`. Criterios binarios, sin juicio.

- **C1** — `node init.js` termina con exit 0.
- **C2** — `php artisan test` en verde (si la app está scaffoldeada) y la
  feature revisada aporta sus propios tests Pest.
- **C3** — `npm run build` compila sin errores (si la app está scaffoldeada).
- **C4** — Los archivos nuevos/modificados respetan `docs/conventions.md`
  (naming, ubicación, orden de clases Tailwind).
- **C5** — Se respetan las capas de `docs/architecture.md`: controllers
  delgados, lógica de negocio en Services, vistas sin queries.
- **C6** — `feature_list.json` refleja el estado real de la feature y
  `progress/current.md` documenta lo hecho.
- **C7** — Sin residuos: nada de `dd()`, `dump()`, `console.log` de debug,
  archivos temporales ni TODOs sin contexto.
- **C8** — No se leyó ni escribió ningún secreto (`.env*`); variables nuevas
  solo documentadas en `progress/current.md`.
