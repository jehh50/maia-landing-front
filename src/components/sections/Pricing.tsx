import { useEffect, useState } from 'react';
import { Box, Container, Typography, Switch, FormControlLabel, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { tokens } from '../../theme/tokens';
import { formatMoneda, listPlanes, normalizeApi, type AdminPlan } from '../../lib/api';

/** Estado de carga explícito, como pide `docs/conventions.md` §5. */
type Estado = 'loading' | 'ok' | 'error';

/**
 * Ancho de referencia de una tarjeta de plan. Solo se usa para que la rejilla no
 * quede desparramada cuando el panel publica menos de cuatro planes: con cuatro
 * o más, las columnas ocupan el contenedor como siempre.
 */
const ANCHO_TARJETA = 320;

interface PricingProps { isAnnual: boolean; onToggle: () => void; onOpenContact: () => void }

/**
 * Sección de precios de la landing, alimentada por el endpoint **público**
 * `GET /api/precios` (`docs/api-contract.md` §4 quater) desde la feature 35. El
 * array `plans` hard-codeado que vivía aquí se eliminó.
 *
 * Tres reglas del contrato que no son preferencias de esta pantalla:
 *
 * - **`precio_anual` es el precio mensual facturando anualmente**, no el total
 *   del año, y junto con `ahorro_anual` lo calcula el backend: aquí se pintan
 *   tal como llegan, nunca se recalculan.
 * - **Un plan a convenir se reconoce por `es_custom`, jamás por un nulo.** El
 *   backend devuelve `precio_mensual: 0` en esos planes; fiarse del nulo pintaría
 *   «$0» y «Ahorras $0/año» en el Enterprise.
 * - El listado llega **ya ordenado** (`orden ASC, id ASC`) y sin paginar: no se
 *   reordena ni se recorta en el cliente.
 *
 * **Fallback, decidido por el humano el 2026-07-31** (acceptance 2 de la feature
 * 35): si la API responde `rows: []`, falla o no contesta, la sección **no se
 * renderiza**. No se conserva ningún plan de respaldo, porque un precio obsoleto
 * mostrado como vigente es peor que no mostrar precios. Consecuencia conocida:
 * con las tablas del backend vacías, hoy la sección no se pinta hasta que se
 * carguen planes desde el panel.
 *
 * **Por qué no hay esqueleto de carga.** Un placeholder con la altura de la
 * sección tendría que desaparecer en los casos de arriba, y eso es exactamente
 * el parpadeo «la sección se pinta y desaparece» que prohíbe el acceptance 3.
 * Aquí solo existe una transición visible —nada → sección definitiva— y la
 * sección se monta ya con su altura final: nada crece ni se encoge dentro de
 * ella después. La petición sale al montar la página, muy por encima del pliegue
 * de precios, así que el reflujo que provoca su llegada queda fuera del viewport.
 * Los `.reveal` que se montan tarde los recoge el `MutationObserver` de
 * `useReveal`, que existe justo para las secciones condicionales.
 */
export default function Pricing({ isAnnual, onToggle, onOpenContact }: PricingProps) {
  const [estado, setEstado] = useState<Estado>('loading');
  const [planes, setPlanes] = useState<AdminPlan[]>([]);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      const res = await normalizeApi(listPlanes(), 'rows', 'No pudimos cargar los planes');
      if (!vigente) return;
      if (res.ok) {
        setPlanes(res.data.rows);
        setEstado('ok');
      } else {
        setPlanes([]);
        setEstado('error');
      }
    })();
    return () => { vigente = false; };
  }, []);

  // El fallback entero, en una línea: sin datos confirmados no hay sección.
  if (estado !== 'ok' || planes.length === 0) return null;

  // El descuento anunciado sale de `descuento_pct`, que es POR PLAN: se anuncia
  // el mayor, y solo se afirma «Ahorra X%» a secas cuando todos los planes con
  // precio comparten ese descuento. Sin descuento, no hay nada que anunciar.
  const descuentos = planes.filter(p => !p.es_custom).map(p => p.descuento_pct);
  const descuentoMax = descuentos.length > 0 ? Math.max(...descuentos) : 0;
  const descuentoUniforme = descuentos.length > 0 && Math.min(...descuentos) === descuentoMax;

  const columnas = Math.min(planes.length, 4);

  return (
    <Box component="section" id="pricing" sx={{ py: { xs: 7, md: 10 }, background: 'linear-gradient(180deg, var(--orange-xxl) 0%, var(--bg-soft) 30%, var(--bg-soft) 70%, var(--orange-xxl) 100%)' }}>
      <Container>
        <Box className="reveal" sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: 4 }}>
          <Typography variant="overline" color="primary" fontWeight={600}>Precios</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1, mb: 2 }}>
            Transparente. Sin sorpresas.
          </Typography>
          <Typography color="text.secondary">Empieza y escala cuando lo necesites. Soporte en español y onboarding guiado.</Typography>
        </Box>

        <Box className="reveal" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 5 }}>
          <Typography color="text.secondary">Mensual</Typography>
          <FormControlLabel control={<Switch checked={isAnnual} onChange={onToggle} />} label="Anual" />
          {descuentoMax > 0 && (
            <Chip
              size="small"
              label={descuentoUniforme ? `Ahorra ${descuentoMax}%` : `Ahorra hasta ${descuentoMax}%`}
              color="success"
              sx={{ bgcolor: 'var(--green-l)', color: 'var(--green)', fontWeight: 600 }}
            />
          )}
        </Box>

        <Box className="reveal" sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: `repeat(${Math.min(columnas, 2)}, 1fr)`, lg: `repeat(${columnas}, 1fr)` },
          gap: 3,
          mx: 'auto',
          maxWidth: columnas < 4 ? { xs: '100%', lg: columnas * ANCHO_TARJETA } : 'none',
        }}>
          {planes.map(p => {
            // Un plan a convenir no tiene cifra que pintar, y el nulo NO es lo que
            // lo decide: `es_custom` sí. El `precio_anual === null` de la derecha
            // solo cubre el caso imposible según contrato (un plan con precio pero
            // sin derivado), y en él se prefiere no inventar ninguna cifra.
            // Es el ÚNICO sitio donde se decide si un plan enseña cifras: dentro
            // de la rama de abajo, `es_custom` ya es `false` por construcción.
            const importe = p.es_custom ? null : (isAnnual ? p.precio_anual : p.precio_mensual);

            return (
              <Box key={p.id} data-testid={`plan-${p.id}`} sx={{
                position: 'relative', p: 3.5, borderRadius: 1, bgcolor: 'background.paper',
                display: 'flex', flexDirection: 'column', height: '100%',
                border: p.destacado ? '2px solid var(--orange)' : '1px solid var(--border)',
                boxShadow: p.destacado ? `0 14px 40px ${alpha(tokens.brand.orange, 0.15)}` : '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                {p.destacado && (
                  <Box sx={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    px: 1.5, py: 0.5, borderRadius: 100,
                    bgcolor: 'primary.main', color: 'common.white', fontSize: 11, fontWeight: 700,
                  }}>Más popular</Box>
                )}
                <Typography variant="h6" fontWeight={700}>{p.nombre}</Typography>
                {importe !== null ? (
                  <>
                    <Typography sx={{ fontSize: 36, fontWeight: 800, mt: 1 }}>
                      {/* El «$» va como `sup` por diseño, así que aquí no cabe
                          `formatMoneda`; el número usa su mismo locale. */}
                      <Box component="sup" sx={{ fontSize: 18 }}>$</Box>
                      {importe.toLocaleString('es-MX')}
                    </Typography>
                    {/* Un plan sin descuento ahorra 0: se calla en vez de
                        presumir de «Ahorras $0/año». */}
                    {isAnnual && p.ahorro_anual !== null && p.ahorro_anual > 0 && (
                      <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                        Ahorras {formatMoneda(p.ahorro_anual)}/año
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 1, color: 'text.primary' }}>Custom</Typography>
                )}
                {p.trial_texto && (
                  <Box sx={{
                    mt: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
                    py: 1, px: 1.5, borderRadius: 0.5, fontWeight: 700, fontSize: 14, letterSpacing: 0.2,
                    color: 'var(--green)', bgcolor: 'var(--green-l)', border: `1px solid ${alpha(tokens.brand.green, 0.25)}`,
                  }}>
                    <CardGiftcardIcon sx={{ fontSize: 18 }} />
                    {p.trial_texto}
                  </Box>
                )}
                <Box sx={{ borderTop: '1px solid var(--border)', my: 2 }} />
                <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                  {p.vinetas.map(v => (
                    <Box component="li" key={v} sx={{ fontSize: 14, color: 'text.secondary', mb: 0.75, '&::before': { content: '"✓ "', color: 'var(--green)', fontWeight: 700 } }}>{v}</Box>
                  ))}
                  {p.vinetas_tachadas.map(v => (
                    <Box component="li" key={v} sx={{ fontSize: 14, color: 'var(--muted2)', mb: 0.75, textDecoration: 'line-through' }}>{v}</Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>

        <Typography align="center" sx={{ mt: 5, color: 'text.secondary', fontSize: 14 }}>
          ¿No sabes cuál elegir?{' '}
          <Box component="a" onClick={onOpenContact} sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
            Contactanos
          </Box>{' '}y te ayudamos.
        </Typography>
      </Container>
    </Box>
  );
}
