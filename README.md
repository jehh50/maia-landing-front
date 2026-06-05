# MaIA Landing — Client

Frontend Vite + React 18 + TypeScript + Material UI.

## Estructura

```
client/
├── index.html                 # Entry HTML (Vite inyecta el bundle)
├── public/
│   ├── logo-maia.svg
│   └── isotipo-maia.svg
└── src/
    ├── main.tsx               # Bootstrap React + ThemeProvider + CssBaseline
    ├── App.tsx                # Estado global del modal + composición de secciones
    ├── theme/theme.ts         # Tema MUI (orange #E8440A, Inter, brand tokens)
    ├── lib/api.ts             # Cliente del backend (postLead, EMAIL_RE)
    ├── hooks/useReveal.ts     # IntersectionObserver para .reveal
    ├── styles/globals.css     # Variables CSS + animaciones fadeUp/blink/reveal
    ├── components/
    │   ├── Navbar.tsx         # AppBar fija + menú móvil
    │   ├── Footer.tsx
    │   ├── WhatsAppFloat.tsx
    │   ├── ContactModal.tsx   # Dialog MUI con formulario validado
    │   └── sections/
    │       ├── Hero.tsx       # CTAs + counters animados + demo window
    │       ├── Trust.tsx
    │       ├── Pain.tsx
    │       ├── Solution.tsx
    │       ├── Features.tsx
    │       ├── Integrations.tsx
    │       ├── ROI.tsx        # Calculadora con sliders + envío email
    │       ├── Pricing.tsx    # Toggle mensual/anual
    │       ├── Testimonials.tsx
    │       ├── FAQ.tsx        # MUI Accordion
    │       └── CTAFinal.tsx
    └── components/__tests__/  # Vitest + RTL
```

## Desarrollo

```bash
npm install
npm run dev         # Vite en http://localhost:5173, proxy /api → http://localhost:3001
npm test            # vitest + @testing-library/react
npm run build       # tsc -b && vite build → dist/
npm run typecheck   # tsc -b --noEmit
```

El backend Node debe estar arriba en `:3001` para que el modal funcione. Ver `../server/`.

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VITE_API_BASE` | `""` (relativo) | Si quieres apuntar a un backend distinto al proxy de Vite, p.ej. `https://api.maiabuilder.ai`. |

## Tema

El theme MUI extiende `palette` con tokens de marca (`brand.orange`, `brand.green`, etc.). Los componentes usan `sx` con tokens y variables CSS de `globals.css` cuando se necesita color granular. El tipo `Palette` está aumentado en `theme/theme.ts`.

## Notas

- La landing es one-page (`#solution`, `#features`, `#pricing`, `#faq`, `#cta-final`, ...). No hay router.
- El `ContactModal` se monta una sola vez en `App.tsx`; cualquier sección con `onOpenContact` lo dispara.
- El antiguo `index.html` monolítico está conservado en la raíz como `legacy.html` para comparar.
