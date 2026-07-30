import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type { AdminUser } from '../../lib/api';
import { tokens } from '../../theme/tokens';
import UserDialog from './UserDialog';
import { deleteMockUser, listMockUsers, type MockUser } from './mockUsers';

/**
 * Administración de usuarios del panel (feature 28).
 *
 * Maqueta: los datos salen de `./mockUsers`, no del backend. Ver el TODO de ese
 * módulo para el cableado pendiente. El listado real responde `{ rows }` sin
 * paginación, así que aquí tampoco se pinta `TablePagination`.
 */
export default function UsersList() {
  const sessionUser = useOutletContext<AdminUser>();
  const sessionUserId = sessionUser?.id ?? null;

  const [rows, setRows]         = useState<MockUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [q, setQ]               = useState('');
  const [editing, setEditing]   = useState<MockUser | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<MockUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listMockUsers({ q: q.trim() || undefined });
    if (res.ok) {
      setRows(res.data.rows);
    } else {
      setError(res.error);
      setRows([]);
    }
    setLoading(false);
  }, [q]);

  // Debounce de búsqueda, igual que en LeadsList.
  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (u: MockUser) => { setEditing(u); setFormOpen(true); };

  const onSaved = async () => {
    setFormOpen(false);
    setEditing(null);
    await load();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const res = await deleteMockUser(toDelete.id, sessionUserId);
    setDeleting(false);
    setToDelete(null);
    if (res.ok) await load();
    else setError(res.error);
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
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin usuarios.</TableCell></TableRow>
            )}
            {!loading && rows.map(u => {
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
