import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useOutletContext } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import {
  listAdminArticles, deleteAdminArticle,
  type AdminArticle, type AdminUser,
} from '../../lib/api';

export default function ArticlesList() {
  const user = useOutletContext<AdminUser>();
  const [rows, setRows]       = useState<AdminArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminArticle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await listAdminArticles();
    if (ok && data && 'rows' in data) {
      setRows(data.rows);
      setError(null);
    } else {
      setError(data && 'error' in data && data.error ? data.error : 'Error al cargar artículos');
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { ok, data } = await deleteAdminArticle(toDelete.id);
    setDeleting(false);
    if (ok || (data == null)) {
      setToDelete(null);
      await load();
    } else {
      setError(data && 'error' in data && data.error ? data.error : 'No se pudo borrar');
    }
  };

  const canDelete = user?.role === 'admin';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Blog — Artículos</Typography>
        <Button component={RouterLink} to="/admin/articles/new" variant="contained" startIcon={<AddIcon />}>
          Nuevo artículo
        </Button>
      </Box>

      {error && <Box sx={{ color: 'error.main', mb: 2, fontSize: 14 }}>{error}</Box>}

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'surface.soft' }}>
              <TableCell>Título</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Actualizado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={20} /></TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin artículos.</TableCell></TableRow>
            )}
            {!loading && rows.map(a => (
              <TableRow key={a.id} hover data-testid={`article-row-${a.id}`}>
                <TableCell sx={{ fontWeight: 500 }}>{a.title}</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: 12 }}>{a.slug}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={a.status}
                    color={a.status === 'published' ? 'success' : 'default'}
                    variant={a.status === 'published' ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                  {new Date(a.updated_at).toLocaleDateString('es-MX')}
                </TableCell>
                <TableCell align="right">
                  <IconButton component={RouterLink} to={`/admin/articles/${a.id}`} size="small" aria-label={`Editar ${a.title}`}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {canDelete && (
                    <IconButton size="small" onClick={() => setToDelete(a)} aria-label={`Borrar ${a.title}`} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)}>
        <DialogTitle>¿Borrar artículo?</DialogTitle>
        <DialogContent>
          Esta acción no se puede deshacer. Se eliminará "<b>{toDelete?.title}</b>".
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
