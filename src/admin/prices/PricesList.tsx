import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Alert, Box, Chip, CircularProgress, IconButton, Paper, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import type { AdminUser } from '../../lib/api';
import { tokens } from '../../theme/tokens';
import PlanEditDialog from './PlanEditDialog';
import { formatMoneda, listMockPlanes, type MockPlan } from './mockPrices';

/** Celda sin dato, con el mismo tratamiento que en `LeadsList`. */
function Guion() {
  return <em style={{ color: tokens.text.disabled }}>—</em>;
}

/**
 * Administración de los planes de precios (feature 30).
 *
 * Maqueta: los datos salen de `./mockPrices`, no del backend. El contrato real
 * ya está commiteado (`docs/api-contract.md` §10.4) pero se maqueta igual por
 * decisión del humano, así que aquí no hay ningún `fetch`.
 *
 * Dos reglas del modelo que esta vista respeta y conviene no perder de vista al
 * cablearla:
 *
 * - **`precio_anual` y `ahorro_anual` son derivados de solo lectura.** Se pintan
 *   calculados a partir de `precio_mensual` y `descuento_pct`, y el formulario
 *   no los ofrece como campos.
 * - **Un plan Custom se reconoce por `es_custom`, nunca por un nulo.** El backend
 *   devuelve `precio_mensual: 0` en esos planes; fiarse del nulo pintaría «$0».
 *
 * El listado real responde `{ rows }` sin paginación y ordenado por `orden ASC`,
 * así que aquí tampoco se pinta `TablePagination`.
 */
export default function PricesList() {
  const sessionUser = useOutletContext<AdminUser>();
  // Las tres rutas de escritura de precios exigen rol `admin`: un editor recibiría un 403.
  const puedeEditar = sessionUser?.role === 'admin';

  const [rows, setRows]       = useState<MockPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [editing, setEditing] = useState<MockPlan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listMockPlanes();
    if (res.ok) {
      setRows(res.data.rows);
    } else {
      setError(res.error);
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onSaved = async () => {
    setEditing(null);
    await load();
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Precios</Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Cada plan tiene su propio descuento anual. El precio anual y el ahorro no se
        editan: los calcula el backend a partir del precio mensual y de ese descuento.
        Los planes a convenir no muestran ninguna cifra.
      </Typography>

      {!puedeEditar && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Tu rol es editor: puedes consultar los planes, pero editarlos está reservado
          al rol administrador.
        </Alert>
      )}

      {error && <Box sx={{ color: 'error.main', mb: 2, fontSize: 14 }}>{error}</Box>}

      <Paper variant="outlined" sx={{ overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'surface.soft' }}>
              <TableCell align="right">Orden</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell align="right">Mensual</TableCell>
              <TableCell align="right">Descuento</TableCell>
              <TableCell align="right">Anual</TableCell>
              <TableCell align="right">Ahorro anual</TableCell>
              <TableCell>Prueba gratis</TableCell>
              <TableCell>Viñetas</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={20} /></TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin planes.</TableCell></TableRow>
            )}
            {!loading && rows.map(p => (
              <TableRow key={p.id} hover data-testid={`plan-row-${p.id}`} sx={{ verticalAlign: 'top' }}>
                <TableCell align="right" sx={{ color: 'text.secondary' }}>{p.orden}</TableCell>

                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{p.nombre}</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                    {p.destacado && <Chip size="small" color="primary" label="Destacado" />}
                    {p.es_custom && <Chip size="small" variant="outlined" label="A convenir" />}
                  </Stack>
                </TableCell>

                {/* Las cuatro celdas de cifras se deciden por `es_custom`, no por el nulo. */}
                <TableCell align="right" data-testid={`plan-${p.id}-mensual`}>
                  {p.es_custom ? <Guion /> : formatMoneda(p.precio_mensual)}
                </TableCell>
                <TableCell align="right" data-testid={`plan-${p.id}-descuento`}>
                  {p.es_custom ? <Guion /> : `${p.descuento_pct}%`}
                </TableCell>
                <TableCell align="right" data-testid={`plan-${p.id}-anual`}>
                  {p.es_custom || p.precio_anual === null ? <Guion /> : formatMoneda(p.precio_anual)}
                </TableCell>
                <TableCell align="right" data-testid={`plan-${p.id}-ahorro`} sx={{ color: 'success.main', fontWeight: 600 }}>
                  {p.es_custom || p.ahorro_anual === null ? <Guion /> : formatMoneda(p.ahorro_anual)}
                </TableCell>

                <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                  {p.trial_texto || <Guion />}
                </TableCell>

                <TableCell data-testid={`plan-${p.id}-vinetas`} sx={{ minWidth: 200 }}>
                  <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                    {p.vinetas.map(v => (
                      <Box component="li" key={v} sx={{ fontSize: 13, color: 'text.secondary' }}>{v}</Box>
                    ))}
                    {p.vinetas_tachadas.map(v => (
                      <Box
                        component="li"
                        key={v}
                        sx={{ fontSize: 13, color: 'text.disabled', textDecoration: 'line-through' }}
                      >
                        {v}
                      </Box>
                    ))}
                  </Box>
                </TableCell>

                <TableCell align="right">
                  {puedeEditar && (
                    <IconButton size="small" onClick={() => setEditing(p)} aria-label={`Editar ${p.nombre}`}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <PlanEditDialog plan={editing} onClose={() => setEditing(null)} onSaved={onSaved} />
    </Box>
  );
}
