# Verificación — cómo comprobar que tu trabajo funciona

> Referencia obligatoria antes de declarar una feature `done`. Los comandos de
> esta página son los únicos que cuentan como "verde": no inventes otros ni
> declares algo verificado "a ojo".

---

## 1. El bloque de verificación

Se ejecuta desde la raíz del repo (`/var/www/html/maia-landing-front`), en este
orden:

```bash
npm test           # vitest run  — 15 archivos, 86 tests
npm run typecheck  # tsc -b --noEmit
npm run build      # tsc -b && vite build → dist/
```

Los tres deben terminar con **exit code 0**. Comprobación rápida en una línea:

```bash
npm test && npm run typecheck && npm run build && echo "VERDE"
```

Notas:

- `npm test` tarda ~40 s. Es normal: MUI + `userEvent` en jsdom son lentos y por
  eso `testTimeout` está en 15000 ms.
- `npm run build` **ya incluye** el typecheck (`tsc -b && vite build`). Se corre
  `typecheck` aparte porque es mucho más rápido y da feedback antes.
- El build emite un aviso `Some chunks are larger than 500 kB`. **Es esperado
  hoy** (bundle monolítico, ver `docs/architecture.md` §10) y **no** cuenta como
  fallo. No lo silencies ni lo "arregles" fuera del scope de tu feature.
- No existe script de lint. No lo agregues como parte de otra feature.

## 2. Estado base (baseline)

Antes de tocar nada, corre el bloque completo. Si algo ya estaba rojo antes de
tu sesión:

1. **Para.** No es tu culpa, pero tampoco tu feature.
2. Anota en `progress/current.md` qué comando falló y su salida.
3. Reporta el bloqueo. No intentes arreglar el entorno dentro de la feature.

Baseline conocido bueno (29 de julio de 2026, tras la feature 27):
`15 archivos / 86 tests` en verde, typecheck 0, build 0.

> Histórico, para que una cifra vieja no se lea como regresión: el backlog 17-23
> cerró en `13 / 75`, la feature **25** lo dejó en `14 / 80` (añadió
> `theme/__tests__/brandAlpha.test.tsx`), la 26 en `15 / 85`
> (`sections/__tests__/Pricing.test.tsx`) y la 27 en `15 / 86` (el test del
> andamiaje se sumó a `AppRoutes.test.tsx`, sin archivo nuevo). La feature 24 fue
> de verificación visual y **no añadió ningún test**; que se le atribuyera el
> salto a `14 / 80` era un error de `progress/current.md`.
> Si actualizas esta sección, actualiza también `docs/architecture.md` §8.

## 3. Ejecutar un subconjunto de tests

Mientras iteras, para no pagar los 40 s completos:

```bash
npx vitest run src/components/__tests__/ContactModal.test.tsx
npx vitest run -t "envía POST /api/contact"      # filtra por nombre de test
npx vitest                                        # modo watch
```

**El bloque completo se corre igual antes de cerrar**, aunque hayas iterado con
un subconjunto.

## 4. Cómo se escriben los tests aquí

Convenciones observadas en los archivos de test existentes — síguelas:

- **Se testea comportamiento por la UI**, con `userEvent`, nunca implementación
  ni estado interno.
- **El backend se simula con `vi.spyOn(globalThis, 'fetch')`** devolviendo
  objetos `Response` reales. Las aserciones inspeccionan `fetch.mock.calls` para
  verificar URL, método y payload.
- **No se mockea `src/lib/api.ts`.** El cliente HTTP entra en el test; eso es
  deliberado y valida el contrato de §5 de `docs/architecture.md`.
- Los componentes se envuelven en `ThemeProvider` (tema de `src/theme/theme.ts`)
  y en `MemoryRouter` cuando hay navegación.
- `restoreAllMocks()` en `afterEach`.
- Ubicación: junto al código, en `__tests__/` (`src/components/__tests__/`,
  `src/pages/__tests__/`, `src/admin/__tests__/`). **No hay carpeta `tests/` en
  la raíz.**

Plantilla mínima:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { afterEach, describe, expect, it, vi } from 'vitest';
import theme from '../../theme/theme';

afterEach(() => vi.restoreAllMocks());

describe('MiComponente', () => {
  it('hace lo que promete', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, id: 1 }), { status: 200 }),
    );
    render(<ThemeProvider theme={theme}><MiComponente /></ThemeProvider>);
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(fetchSpy).toHaveBeenCalledWith('/api/contact', expect.objectContaining({ method: 'POST' }));
  });
});
```

## 5. Qué necesita test y qué no

| Cambio | ¿Test obligatorio? |
|--------|--------------------|
| Lógica en `src/lib/` (validación, construcción de query, parsing) | **Sí** |
| Formularios, flujos de admin, estados de carga/error | **Sí** |
| Nueva llamada a la API desde un componente | **Sí** (aserción sobre `fetch.mock.calls`) |
| Routing nuevo o guardias de acceso | **Sí** |
| Secciones presentacionales de la landing (copy, layout, `sx`) | No — hoy no se testean |
| Cambios solo de estilos/tokens | No, pero el bloque completo debe seguir verde |

## 6. Verificación manual (cuando el cambio es visual)

Los tests no cubren la landing. Si tocas secciones, además del bloque completo:

```bash
npm run dev      # http://localhost:5174, proxy /api → http://localhost:3002
```

Revisa a 360 px y a 1440 px de ancho, y deja constancia en `progress/current.md`
de qué comprobaste. Si el backend no está levantado en `:3002`, las llamadas a
`/api` fallarán: es esperado y no es un fallo de tu feature.

## 7. Antes de declarar `done`

- [ ] `npm test` verde (y los tests nuevos de tu `acceptance` incluidos).
- [ ] `npm run typecheck` en 0.
- [ ] `npm run build` en 0.
- [ ] Sin `console.log` de debug ni archivos temporales (`git status` limpio de
      residuos).
- [ ] `progress/current.md` documenta lo hecho.
- [ ] Un `reviewer` recorrió `CHECKPOINT.md` y dio `APPROVED`.
