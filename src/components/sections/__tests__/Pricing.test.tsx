import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { afterEach, describe, expect, it, vi } from 'vitest';
import theme from '../../../theme/theme';
import Pricing from '../Pricing';

afterEach(() => vi.restoreAllMocks());

function renderPricing(overrides: Partial<Parameters<typeof Pricing>[0]> = {}) {
  const props = {
    isAnnual: false,
    onToggle: vi.fn(),
    onOpenContact: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <Pricing {...props} />
    </ThemeProvider>,
  );
  return props;
}

describe('Pricing', () => {
  it('pinta el badge "Más popular" con el naranja de marca', () => {
    renderPricing();

    // `rgb(232, 68, 10)` es `tokens.brand.orange` = `palette.primary.main`, el
    // color que aporta el `bgcolor` del badge. El valor del token lo congela
    // `src/theme/__tests__/tokens.test.tsx`; aquí solo se comprueba que llega.
    const badge = screen.getByText('Más popular');
    expect(getComputedStyle(badge).backgroundColor).toBe('rgb(232, 68, 10)');
  });

  it('no emite ningún path de paleta sin resolver en el CSS de la sección', () => {
    renderPricing();

    // `sx` solo traduce a la paleta las claves que conoce (`color`, `bgcolor`,
    // `backgroundColor`). Cualquier otra —`background`, por ejemplo— deja pasar
    // el string tal cual y el navegador descarta la declaración.
    const css = document.head.textContent ?? '';
    expect(css).not.toMatch(/primary\.main/);
  });

  it('las cuatro tarjetas de plan siguen en pie tras la limpieza', () => {
    renderPricing();

    for (const plan of ['Starter', 'Team', 'Growth', 'Enterprise']) {
      expect(screen.getByRole('heading', { name: plan })).toBeInTheDocument();
    }
  });

  it('no hay un CTA por tarjeta: el único de la sección es "Contactanos"', async () => {
    const { onOpenContact } = renderPricing();

    expect(screen.queryByText(/hablar con ventas/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Contactanos'));
    expect(onOpenContact).toHaveBeenCalledTimes(1);
  });

  it('el switch anual muestra el precio con descuento y avisa al padre', async () => {
    const { onToggle } = renderPricing({ isAnnual: true });

    expect(screen.getByText('179')).toBeInTheDocument();
    expect(screen.getByText('Ahorras $240/año')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /anual/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
