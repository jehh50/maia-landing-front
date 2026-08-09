import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  adminErrorMessage, deleteAdminComplemento, deleteAdminPaquete, formatMoneda, listComplementos,
  normalizeApi,
  type AdminComplemento, type AdminPaquete, type AdminUser,
} from '../../lib/api';
import { tokens } from '../../theme/tokens';
import ComplementoEditDialog from './ComplementoEditDialog';
import PaqueteEditDialog from './PaqueteEditDialog';

/** Celda sin dato, con el mismo tratamiento que en `PricesList`. */
function Guion() {
  return <em style={{ color: tokens.text.disabled }}>—</em>;
}

/**
 * Administración de complementos (add-ons) — feature 37.
 *
 * Dos particularidades del contrato (`docs/api-contract.md` §4 quinquies), no
 * preferencias de esta pantalla:
 *
 * - **El listado sale del endpoint público** `GET /api/complementos`. No hay
 *   ninguno bajo `/api/admin/`: el listado público ya devuelve todos, con sus
 *   paquetes anidados. El detalle y las tres escrituras sí son privados.
 * - **`precio: null` no es `precio: 0`.** Significa que el complemento no
 *   publica un precio unitario propio porque sus paquetes lo llevan. La celda
 *   de precio nunca pinta `$0` en ese caso, y los paquetes se listan aparte,
 *   siempre presentes (`[]` si no hay), sin guardas.
 *
 * Los paquetes se editan desde su propia fila, dentro de cada complemento
 * (feature 38): alta, edición y borrado contra `/api/admin/paquetes`, con
 * recarga de `listComplementos()` tras cada escritura para no quedarse
 * desincronizado (no hay listado propio de paquetes al que refrescar solo esa
 * fila). Borrar un paquete no toca a su complemento; borrar un complemento sí
 * arrastra sus paquetes en cascada (feature 37) — dos confirmaciones
 * separadas, cada una con su propio copy.
 */
export default function ComplementosList() {
  const sessionUser = useOutletContext<AdminUser>();
  // Las cuatro rutas de /api/admin/complementos exigen rol `admin`: un editor recibiría un 403.
  const puedeEditar = sessionUser?.role === 'admin';

  const [rows, setRows]         = useState<AdminComplemento[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [editing, setEditing]   = useState<AdminComplemento | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<AdminComplemento | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Paquetes: recurso aparte del complemento (feature 38), sin listado
  // propio. `creatingPaqueteFor` guarda el complemento que abrió el alta
  // (para preseleccionarlo en el formulario); `editingPaquete` es la edición.
  const [editingPaquete, setEditingPaquete] = useState<AdminPaquete | null>(null);
  const [creatingPaqueteFor, setCreatingPaqueteFor] = useState<AdminComplemento | null>(null);
  const [paqueteToDelete, setPaqueteToDelete] = useState<AdminPaquete | null>(null);
  const [deletingPaquete, setDeletingPaquete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await normalizeApi(listComplementos(), 'rows', 'No pudimos cargar los complementos');
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
    const res = await normalizeApi(deleteAdminComplemento(toDelete.id), 'ok', 'No pudimos eliminar el complemento');
    setDeleting(false);
    setToDelete(null);
    if (res.ok) await load();
    else setError(adminErrorMessage(res));
  };

  const cerrarPaqueteDialogo = () => {
    setEditingPaquete(null);
    setCreatingPaqueteFor(null);
  };

  const onSavedPaquete = async () => {
    cerrarPaqueteDialogo();
    await load();
  };

  const confirmDeletePaquete = async () => {
    if (!paqueteToDelete) return;
    setDeletingPaquete(true);
    const res = await normalizeApi(deleteAdminPaquete(paqueteToDelete.id), 'ok', 'No pudimos eliminar el paquete');
    setDeletingPaquete(false);
    setPaqueteToDelete(null);
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
        <Typography variant="h5" fontWeight={700}>Complementos</Typography>
        {puedeEditar && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            Nuevo complemento
          </Button>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
        Los add-ons que se ofrecen junto a los planes. Un complemento puede tener
        precio unitario propio, o dejarlo en blanco para que sean sus paquetes los
        que lo lleven. Cada paquete se edita desde su propia fila.
      </Typography>

      {!puedeEditar && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Tu rol es editor: puedes consultar los complementos, pero crearlos,
          editarlos y borrarlos está reservado al rol administrador.
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
              <TableCell>Complemento</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell>Paquetes</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={20} /></TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Sin complementos todavía. La sección de add-ons de la landing toma
                  sus datos de aquí, así que hay que crearlos en este panel.
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.map(c => (
              <TableRow key={c.id} hover data-testid={`addon-row-${c.id}`} sx={{ verticalAlign: 'top' }}>
                <TableCell align="right" sx={{ color: 'text.secondary' }}>{c.orden}</TableCell>

                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{c.nombre}</Typography>
                  {c.descripcion && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 320 }}>
                      {c.descripcion}
                    </Typography>
                  )}
                </TableCell>

                {/* `precio: null` no es `0`: nunca se pinta $null ni $0. */}
                <TableCell align="right" data-testid={`addon-${c.id}-precio`}>
                  {c.precio !== null
                    ? <>{formatMoneda(c.precio)}{c.unidad && <Box component="span" sx={{ color: 'text.secondary' }}> {c.unidad}</Box>}</>
                    : <Guion />}
                </TableCell>

                {/* Siempre presente, `[]` si no hay: se recorre sin guardas. Editable (feature 38). */}
                <TableCell data-testid={`addon-${c.id}-paquetes`} sx={{ minWidth: 260 }}>
                  {c.paquetes.length === 0 ? (
                    <Guion />
                  ) : (
                    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                      {c.paquetes.map(p => (
                        <Box
                          component="li"
                          key={p.id}
                          sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: 1, fontSize: 13, color: 'text.secondary', py: 0.25,
                          }}
                        >
                          <span>{p.nombre} — {formatMoneda(p.precio)}</span>
                          {puedeEditar && (
                            <Stack direction="row" spacing={0}>
                              <IconButton
                                size="small"
                                onClick={() => setEditingPaquete(p)}
                                aria-label={`Editar paquete ${p.nombre}`}
                              >
                                <EditIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setPaqueteToDelete(p)}
                                aria-label={`Borrar paquete ${p.nombre}`}
                              >
                                <DeleteIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Stack>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}
                  {puedeEditar && (
                    <Button
                      size="small"
                      startIcon={<AddIcon fontSize="small" />}
                      onClick={() => setCreatingPaqueteFor(c)}
                      aria-label={`Agregar paquete a ${c.nombre}`}
                      sx={{ mt: c.paquetes.length > 0 ? 0.5 : 0 }}
                    >
                      Agregar paquete
                    </Button>
                  )}
                </TableCell>

                <TableCell align="right">
                  {puedeEditar && (
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton size="small" onClick={() => setEditing(c)} aria-label={`Editar ${c.nombre}`}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setToDelete(c)} aria-label={`Borrar ${c.nombre}`}>
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

      <ComplementoEditDialog
        complemento={editing}
        open={creating || !!editing}
        onClose={cerrarDialogo}
        onSaved={onSaved}
      />

      <PaqueteEditDialog
        paquete={editingPaquete}
        complementoId={creatingPaqueteFor?.id ?? editingPaquete?.complemento_id ?? ''}
        complementos={rows}
        open={!!creatingPaqueteFor || !!editingPaquete}
        onClose={cerrarPaqueteDialogo}
        onSaved={onSavedPaquete}
      />

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)}>
        <DialogTitle>¿Borrar complemento?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Esta acción no se puede deshacer. Se eliminará «<b>{toDelete?.nombre}</b>».
          </Typography>
          {/* El backend borra los paquetes en cascada sin aviso propio: lo dice esta confirmación. */}
          <Typography variant="body2" color="error" sx={{ mt: 1.5, fontWeight: 600 }}>
            {toDelete && toDelete.paquetes.length > 0
              ? `Se eliminarán también sus ${toDelete.paquetes.length} paquete${toDelete.paquetes.length === 1 ? '' : 's'}, sin vuelta atrás.`
              : 'Este complemento no tiene paquetes asociados.'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            El complemento desaparece de la sección de add-ons de la landing en cuanto
            se borra, y no hay papelera.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={deleting}>Cancelar</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Borrando…' : 'Borrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Borrar un paquete NO toca a su complemento: la cascada es solo al
          revés (feature 37, diálogo de arriba), así que esta confirmación no
          la menciona. */}
      <Dialog open={!!paqueteToDelete} onClose={() => setPaqueteToDelete(null)}>
        <DialogTitle>¿Borrar paquete?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Esta acción no se puede deshacer. Se eliminará «<b>{paqueteToDelete?.nombre}</b>».
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaqueteToDelete(null)} disabled={deletingPaquete}>Cancelar</Button>
          <Button onClick={confirmDeletePaquete} color="error" variant="contained" disabled={deletingPaquete}>
            {deletingPaquete ? 'Borrando…' : 'Borrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
