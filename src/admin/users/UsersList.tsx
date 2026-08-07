import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  adminErrorMessage, deleteAdminUser, listAdminUsers, normalizeApi,
  type AdminUser, type AdminUserRow,
} from '../../lib/api';
import { tokens } from '../../theme/tokens';
import UserDialog from './UserDialog';

/**
 * Administración de usuarios del panel (maquetada en la feature 28, cableada a
 * `/api/admin/users` en la feature 32).
 *
 * Dos cosas que la separan de `LeadsList` y que vienen del contrato
 * (docs/api-contract.md §4 bis), no de una preferencia:
 *
 * - El listado responde `{ rows }` **sin paginación**, así que aquí no se pinta
 *   `TablePagination`.
 * - `GET /api/admin/users` **no acepta ningún parámetro de query**: devuelve
 *   todos los usuarios ordenados por `id ASC`. Por eso la búsqueda filtra en
 *   cliente sobre las filas ya cargadas, en vez de mandar un `?q=` que el
 *   backend ignoraría.
 */
export default function UsersList() {
  const sessionUser = useOutletContext<AdminUser>();
  const sessionUserId = sessionUser?.id ?? null;

  const [rows, setRows]         = useState<AdminUserRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [q, setQ]               = useState('');
  const [editing, setEditing]   = useState<AdminUserRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AdminUserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await normalizeApi(listAdminUsers(), 'rows', 'No pudimos cargar los usuarios');
    if (res.ok) {
      setRows(res.data.rows);
    } else {
      setError(adminErrorMessage(res));
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Filtrado en cliente: el endpoint no admite búsqueda (ver el bloque de arriba).
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(u =>
      u.email.toLowerCase().includes(term) || (u.name || '').toLowerCase().includes(term));
  }, [rows, q]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (u: AdminUserRow) => { setEditing(u); setFormOpen(true); };

  const onSaved = async () => {
    setFormOpen(false);
    setEditing(null);
    await load();
  };

  /**
   * La fila propia ya viene deshabilitada, pero el segundo `409` del backend
   * («No puedes eliminar al último usuario con rol admin») solo se puede
   * conocer por respuesta: se muestra su mensaje tal cual.
   */
  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const res = await normalizeApi(
      deleteAdminUser(toDelete.id), 'ok', 'No pudimos eliminar el usuario');
    setDeleting(false);
    setToDelete(null);
    if (res.ok) await load();
    else setError(adminErrorMessage(res));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>Usuarios</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nuevo usuario
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Un administrador ve todo el panel; el rol editor solo accede a la sección
        de Blog.
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Buscar (email o nombre)"
          value={q}
          onChange={e => setQ(e.target.value)}
          sx={{ flexGrow: 1 }}
          inputProps={{ 'aria-label': 'Buscar usuarios' }}
        />
      </Stack>

      {error && <Box sx={{ color: 'error.main', mb: 2, fontSize: 14 }}>{error}</Box>}

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'surface.soft' }}>
              <TableCell>Email</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Alta</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={20} /></TableCell></TableRow>
            )}
            {!loading && visible.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin usuarios.</TableCell></TableRow>
            )}
            {!loading && visible.map(u => {
              const isSelf = u.id === sessionUserId;
              return (
                <TableRow key={u.id} hover data-testid={`user-row-${u.id}`}>
                  <TableCell sx={{ fontWeight: 500 }}>{u.email}</TableCell>
                  <TableCell>{u.name || <em style={{ color: tokens.text.disabled }}>—</em>}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={u.role}
                      color={u.role === 'admin' ? 'primary' : 'default'}
                      variant={u.role === 'admin' ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: 13 }}>
                    {new Date(u.created_at).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(u)} aria-label={`Editar ${u.email}`}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <Tooltip title={isSelf ? 'No puedes eliminar tu propio usuario' : 'Borrar usuario'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setToDelete(u)}
                          disabled={isSelf}
                          aria-label={`Borrar ${u.email}`}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <UserDialog
        open={formOpen}
        user={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={onSaved}
      />

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)}>
        <DialogTitle>¿Borrar usuario?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Esta acción no se puede deshacer. Se eliminará «<b>{toDelete?.email}</b>».
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Sus artículos no se borran: se quedan sin autor. Si es el último
            usuario con rol admin, el borrado se rechaza para no dejar el panel
            sin administradores.
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
