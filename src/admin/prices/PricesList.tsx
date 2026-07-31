import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  adminErrorMessage, deleteAdminPlan, formatMoneda, listPlanes, normalizeApi,
  type AdminPlan, type AdminUser,
} from '../../lib/api';
import { tokens } from '../../theme/tokens';
import PlanEditDialog from './PlanEditDialog';

/** Celda sin dato, con el mismo tratamiento que en `LeadsList`. */
function Guion() {
  return <em style={{ color: tokens.text.disabled }}>—</em>;
}

/**
 * Administración de los planes de precios (maquetada en la feature 30, cableada
 * en la feature 34).
 *
 * Tres particularidades del contrato (`docs/api-contract.md` §4 quater), no
 * preferencias de esta pantalla:
 *
 * - **El listado sale del endpoint público** `GET /api/precios`. No hay ninguno
 *   bajo `/api/admin/`: `GET /api/admin/precios` responde **404**, no 401 — la
 *   ruta no existe, no es un problema de sesión. El detalle y las tres
 *   escrituras sí son privadas.
 * - **`precio_anual` y `ahorro_anual` son derivados de solo lectura.** Aquí se
 *   pintan tal como llegan de la API, y el formulario no los ofrece ni los envía.
 * - **Un plan Custom se reconoce por `es_custom`, nunca por un nulo.** El backend
 *   devuelve `precio_mensual: 0` en esos planes; fiarse del nulo pintaría «$0».
 *
 * El listado responde `{ rows }` sin paginación y ordenado por `orden ASC, id
 * ASC`, así que aquí tampoco se pinta `TablePagination`.
 */
export default function PricesList() {
  const sessionUser = useOutletContext<AdminUser>();
  // Las cuatro rutas de /api/admin/precios exigen rol `admin`: un editor recibiría un 403.
  const puedeEditar = sessionUser?.role === 'admin';

  const [rows, setRows]         = useState<AdminPlan[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [editing, setEditing]   = useState<AdminPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<AdminPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await normalizeApi(listPlanes(), 'rows', 'No pudimos cargar los planes');
    if (res.ok) {
      setRows(res.data.rows);
    } else {
      setError(adminErrorMessage(res));
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const cerrarDialogo = () => {
    setEditing(null);
    setCreating(false);
  };

  const onSaved = async () => {
    cerrarDialogo();
    await load();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const res = await normalizeApi(deleteAdminPlan(toDelete.id), 'ok', 'No pudimos eliminar el plan');
    setDeleting(false);
    setToDelete(null);
    if (res.ok) await load();
    else setError(adminErrorMessage(res));
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 1,
        }}
      >
        <Typography variant="h5" fontWeight={700}>Precios</Typography>
        {puedeEditar && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            Nuevo plan
          </Button>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Cada plan tiene su propio descuento anual. El precio anual y el ahorro no se
        editan: los calcula el backend a partir del precio mensual y de ese descuento.
        Los planes a convenir no muestran ninguna cifra.
      </Typography>

      {!puedeEditar && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Tu rol es editor: puedes consultar los planes, pero crearlos, editarlos y
          borrarlos está reservado al rol administrador.
        </Alert>
      )}

      {/* `role="alert"` porque aquí aterrizan errores que el usuario no puede
          prever (un 403, un borrado rechazado): un lector de pantalla debe
          anunciarlos. */}
      {error && <Box role="alert" sx={{ color: 'error.main', mb: 2, fontSize: 14 }}>{error}</Box>}

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
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Sin planes todavía. La landing toma sus precios de aquí, así que hay que
                  crearlos en este panel.
                </TableCell>
              </TableRow>
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

                {/* Las cuatro celdas de cifras se deciden por `es_custom`, no por el nulo:
                    el backend manda `precio_mensual: 0` en un plan a convenir. */}
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
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" onClick={() => setEditing(p)} aria-label={`Editar ${p.nombre}`}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setToDelete(p)} aria-label={`Borrar ${p.nombre}`}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <PlanEditDialog
        plan={editing}
        open={creating || !!editing}
        onClose={cerrarDialogo}
        onSaved={onSaved}
      />

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)}>
        <DialogTitle>¿Borrar plan?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Esta acción no se puede deshacer. Se eliminará «<b>{toDelete?.nombre}</b>».
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            El plan desaparece de la sección de precios de la landing en cuanto se borra,
            y no hay papelera.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={deleting}>Cancelar</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Borrando…' : 'Borrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
