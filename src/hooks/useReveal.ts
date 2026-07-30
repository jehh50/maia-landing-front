import { useEffect } from 'react';

/** Nodos pendientes de revelar: los ya revelados no vuelven a observarse. */
const REVEAL_SELECTOR = '.reveal:not(.visible)';

/**
 * Observa los `.reveal` del documento y les añade `.visible` al entrar en
 * viewport (una sola vez: tras revelar se deja de observar).
 *
 * Además del escaneo inicial, un `MutationObserver` acotado a `document.body`
 * recoge los `.reveal` que se monten después del primer render (listados
 * asíncronos, secciones condicionales), que de otro modo quedarían con la
 * opacidad 0 de `.reveal` para siempre. Solo se inspeccionan los nodos
 * añadidos en cada mutación, nunca se re-escanea el documento entero.
 */
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' },
    );

    // Evita re-observar un nodo que ya pasó por aquí (un mismo elemento puede
    // aparecer en varios records de mutación).
    const observed = new WeakSet<Element>();

    const observe = (el: Element) => {
      if (observed.has(el)) return;
      observed.add(el);
      io.observe(el);
    };

    document.querySelectorAll(REVEAL_SELECTOR).forEach(observe);

    // `querySelectorAll` no incluye la raíz: el nodo añadido puede ser él mismo
    // un `.reveal`.
    const scanAdded = (el: Element) => {
      if (el.matches(REVEAL_SELECTOR)) observe(el);
      el.querySelectorAll(REVEAL_SELECTOR).forEach(observe);
    };

    const mo = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) scanAdded(node as Element);
        });
      }
    });

    // Solo `childList` + `subtree`: sin `attributes` ni `characterData`, que
    // dispararían la callback en cada cambio de estilo o de texto de la landing.
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);
}
