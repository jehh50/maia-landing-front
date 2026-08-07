import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useReveal } from '../useReveal';

// jsdom no implementa IntersectionObserver. Este stub registra qué se observa y
// permite disparar las entradas a mano para simular la entrada en viewport.
class IOStub {
  static instances: IOStub[] = [];

  /** Todo lo que se observó alguna vez, en orden (para detectar duplicados). */
  everObserved: Element[] = [];
  observing = new Set<Element>();
  unobserved: Element[] = [];
  disconnected = false;

  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    IOStub.instances.push(this);
  }

  observe(el: Element) {
    this.everObserved.push(el);
    this.observing.add(el);
  }

  unobserve(el: Element) {
    this.observing.delete(el);
    this.unobserved.push(el);
  }

  disconnect() {
    this.disconnected = true;
    this.observing.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Simula que los elementos entran en viewport. */
  enterViewport(...targets: Element[]) {
    const entries = targets.map((target) => ({ target, isIntersecting: true }));
    this.callback(
      entries as unknown as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    );
  }
}

/** La única instancia creada por el hook bajo test. */
function io() {
  expect(IOStub.instances).toHaveLength(1);
  return IOStub.instances[0];
}

interface HarnessProps {
  /** Monta contenido `.reveal` adicional después del primer render. */
  diferido?: boolean;
}

function Harness({ diferido = false }: HarnessProps) {
  useReveal();
  return (
    <div>
      <p className="reveal" data-testid="inicial">
        Contenido del primer render
      </p>
      {diferido && (
        <section data-testid="wrapper">
          <p className="reveal" data-testid="anidado">
            Contenido montado después
          </p>
        </section>
      )}
    </div>
  );
}

beforeEach(() => {
  IOStub.instances = [];
  vi.stubGlobal('IntersectionObserver', IOStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useReveal — contenido del primer render', () => {
  it('observa los .reveal presentes al montar', () => {
    render(<Harness />);

    expect(io().everObserved).toEqual([screen.getByTestId('inicial')]);
  });

  it('conserva las opciones del IntersectionObserver', () => {
    render(<Harness />);

    expect(io().options).toEqual({ threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  });

  it('añade .visible y deja de observar al entrar en viewport', () => {
    render(<Harness />);
    const inicial = screen.getByTestId('inicial');

    io().enterViewport(inicial);

    expect(inicial).toHaveClass('visible');
    expect(io().unobserved).toEqual([inicial]);
  });

  it('no revela ni observa un nodo que ya tiene .visible', () => {
    function YaVisible() {
      useReveal();
      return <p className="reveal visible" data-testid="ya-visible" />;
    }
    render(<YaVisible />);

    expect(io().everObserved).toEqual([]);
  });
});

describe('useReveal — contenido montado después del primer render', () => {
  it('observa un .reveal anidado en un nodo insertado tras el montaje', async () => {
    const { rerender } = render(<Harness />);
    expect(io().everObserved).toHaveLength(1);

    rerender(<Harness diferido />);

    const anidado = screen.getByTestId('anidado');
    await waitFor(() => expect(io().everObserved).toContain(anidado));
  });

  it('le añade .visible cuando entra en viewport', async () => {
    const { rerender } = render(<Harness />);
    rerender(<Harness diferido />);

    const anidado = screen.getByTestId('anidado');
    await waitFor(() => expect(io().observing.has(anidado)).toBe(true));

    io().enterViewport(anidado);

    expect(anidado).toHaveClass('visible');
    expect(io().unobserved).toEqual([anidado]);
  });

  it('observa el nodo insertado cuando él mismo es el .reveal', async () => {
    render(<Harness />);

    const suelto = document.createElement('div');
    suelto.className = 'reveal';
    document.body.appendChild(suelto);

    await waitFor(() => expect(io().everObserved).toContain(suelto));

    suelto.remove();
  });

  it('no observa dos veces el mismo nodo aunque haya varias mutaciones', async () => {
    const { rerender } = render(<Harness />);
    rerender(<Harness diferido />);

    const anidado = screen.getByTestId('anidado');
    await waitFor(() => expect(io().everObserved).toContain(anidado));

    // Nueva mutación en el mismo subárbol: no debe re-observar lo ya observado.
    screen.getByTestId('wrapper').appendChild(document.createElement('span'));
    await waitFor(() => expect(io().everObserved.filter((el) => el === anidado)).toHaveLength(1));
  });
});

describe('useReveal — limpieza', () => {
  it('desconecta el IntersectionObserver al desmontar', () => {
    const { unmount } = render(<Harness />);

    unmount();

    expect(io().disconnected).toBe(true);
  });

  it('deja de observar mutaciones al desmontar (sin fugas)', async () => {
    const { unmount } = render(<Harness />);
    unmount();

    const tardio = document.createElement('div');
    tardio.className = 'reveal';
    document.body.appendChild(tardio);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(io().everObserved).not.toContain(tardio);

    tardio.remove();
  });
});
