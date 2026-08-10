import { useEffect, useState } from 'react';
import { Box, Container, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { SvgIconComponent } from '@mui/icons-material';
import { tokens } from '../../theme/tokens';
import { listComplementos, normalizeApi, type AdminComplemento } from '../../lib/api';

/** Estado de carga explícito, como pide `docs/conventions.md` §5. */
type Estado = 'loading' | 'ok' | 'error';

/**
 * Icono + color de acento por POSICIÓN, no por dato del backend: el contrato
 * de `AdminComplemento` (`docs/api-contract.md` §4 quinquies) no trae ningún
 * campo de presentación (`id`, `nombre`, `descripcion`, `precio`, `unidad`,
 * `orden`, `paquetes`). Se mapea sobre el índice de la fila ya ordenada por
 * `orden` y se cicla con `%` si llegan más complementos que entradas.
 * Deliberadamente **no** se mapea por `nombre`: renombrar un add-on desde el
 * panel rompería su icono si se hiciera así.
 */
const ESTILO_POR_POSICION: { Icon: SvgIconComponent; accent: string; testId: string }[] = [
  { Icon: BoltIcon, accent: tokens.accent.red, testId: 'bolt' },
  { Icon: Inventory2Icon, accent: tokens.accent.violet, testId: 'inventory' },
  { Icon: PsychologyIcon, accent: tokens.accent.blue, testId: 'psychology' },
  { Icon: AccountTreeIcon, accent: tokens.brand.green, testId: 'account-tree' },
];

/**
 * Ancho de referencia de una tarjeta, igual criterio que `Pricing.tsx`: solo
 * se usa para que la rejilla no quede desparramada con menos de cuatro
 * complementos.
 */
const ANCHO_TARJETA = 280;

/**
 * Importe con dos decimales SOLO cuando el valor los tiene: `formatMoneda` de
 * `src/lib/api.ts` devuelve `"$0.2"` para `0.2` (trunca el decimal final), lo
 * que sería una regresión visible en la sección más comercial de la landing
 * (hoy muestra "$0.20"). No se toca `formatMoneda` porque también lo consume
 * `ComplementosList.tsx` (feature 37, ya `done`) con un test que fija
 * literalmente `"$0.2 / crédito"` — cambiarlo ahí rompería esa feature
 * aprobada, fuera del scope de esta. Este formateador es local a la sección.
 */
function formatImporte(importe: number): string {
  const decimales = Number.isInteger(importe) ? 0 : 2;
  return `$${importe.toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: 2 })}`;
}

/**
 * Sección de add-ons de la landing, alimentada por el endpoint **público**
 * `GET /api/complementos` (`docs/api-contract.md` §4 quinquies) desde la
 * feature 39. El array `addons` hard-codeado que vivía aquí se eliminó.
 *
 * **`precio: null` no es `precio: 0`.** Un complemento sin precio unitario
 * propio pinta sus paquetes anidados (siempre presentes, `[]` si no hay: se
 * recorren sin guardas); nunca `$0` ni `$null`. `unidad` viaja aparte y
 * también puede ser `null`.
 *
 * **Fallback, heredado de la decisión humana de la feature 35 (`Pricing.tsx`)
 * y verificado por el líder para esta sección:** si la API responde
 * `rows: []`, falla o no contesta, la sección **no se renderiza**. No hay
 * array de respaldo — a diferencia de precios, ocultar `#addons` no deja
 * enlaces sin destino porque ni `Navbar.tsx` ni `Footer.tsx` enlazan ahí.
 *
 * **Por qué no hay esqueleto de carga**, mismo razonamiento que `Pricing.tsx`:
 * un placeholder tendría que desaparecer en los casos de arriba, que es
 * justo el parpadeo que prohíbe el acceptance. La sección solo tiene una
 * transición visible —nada → sección definitiva— y se monta ya con su altura
 * final.
 */
export default function Addons() {
  const [estado, setEstado] = useState<Estado>('loading');
  const [complementos, setComplementos] = useState<AdminComplemento[]>([]);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      const res = await normalizeApi(listComplementos(), 'rows', 'No pudimos cargar los complementos');
      if (!vigente) return;
      if (res.ok) {
        setComplementos(res.data.rows);
        setEstado('ok');
      } else {
        setComplementos([]);
        setEstado('error');
      }
    })();
    return () => { vigente = false; };
  }, []);

  // El fallback entero, en una línea: sin datos confirmados no hay sección.
  if (estado !== 'ok' || complementos.length === 0) return null;

  const columnas = Math.min(complementos.length, 4);

  return (
    <Box component="section" id="addons" sx={{ py: { xs: 7, md: 10 }, background: 'var(--bg-soft)' }}>
      <Container>
        <Box className="reveal" sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="primary" fontWeight={600}>Complementos</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1, mb: 2 }}>
            Potencia tu plan cuando lo necesites
          </Typography>
          <Typography color="text.secondary">
            Add-ons opcionales para escalar créditos, conocimiento
          </Typography>
          <Typography color="text.secondary">
            y automatizaciones sin cambiar de plan.
          </Typography>
        </Box>

        <Box
          className="reveal"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: `repeat(${Math.min(columnas, 2)}, 1fr)`, lg: `repeat(${columnas}, 1fr)` },
            gap: 3,
            mx: 'auto',
            maxWidth: columnas < 4 ? { xs: '100%', lg: columnas * ANCHO_TARJETA } : 'none',
          }}
        >
          {complementos.map((c, i) => {
            const { Icon, accent, testId } = ESTILO_POR_POSICION[i % ESTILO_POR_POSICION.length];

            return (
              <Box
                key={c.id}
                data-testid={`addon-${c.id}`}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  p: 3.5,
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  border: '1px solid var(--border)',
                  borderTop: '3px solid transparent',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-top-color 0.25s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.10)',
                    borderTopColor: accent,
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignSelf: 'flex-start',
                    p: 1.2,
                    borderRadius: 1,
                    background: `${accent}18`,
                    color: accent,
                    mb: 2,
                  }}
                >
                  <Icon data-testid={`addon-${c.id}-icon-${testId}`} sx={{ fontSize: 26 }} />
                </Box>

                <Typography variant="h6" fontWeight={700} sx={{ fontSize: 17, mb: 1 }}>
                  {c.nombre}
                </Typography>
                {c.descripcion && (
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, mb: 2.5 }}>
                    {c.descripcion}
                  </Typography>
                )}

                <Box sx={{ mt: 'auto' }}>
                  {c.precio === null ? (
                    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                      {c.paquetes.map((p, j) => (
                        <Box
                          component="li"
                          key={p.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            py: 1,
                            borderTop: j === 0 ? 'none' : '1px solid var(--border)',
                          }}
                        >
                          <Typography variant="body2" sx={{ color: 'var(--text2)' }}>{p.nombre}</Typography>
                          {p.descripcion && (
                            <Typography variant="caption" sx={{ color: 'var(--muted)' }}>{p.descripcion}</Typography>
                          )}
                          <Typography sx={{ fontWeight: 800, fontSize: 15, color: 'var(--black)', whiteSpace: 'nowrap' }}>
                            {formatImporte(p.precio)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 30, fontWeight: 800, color: 'var(--black)', lineHeight: 1 }}>
                        {formatImporte(c.precio)}
                      </Typography>
                      {c.unidad && (
                        <Typography variant="caption" sx={{ color: 'var(--muted)', fontWeight: 600 }}>
                          {c.unidad}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Container>
    </Box>
  );
}
