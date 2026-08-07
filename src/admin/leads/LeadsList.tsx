import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Stack, Typography, TextField, MenuItem, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TablePagination, Paper,
  IconButton, CircularProgress,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { listAdminLeads, normalizeApi, type AdminLead, type LeadType } from '../../lib/api';
import LeadDetailDialog from './LeadDetailDialog';
import { tokens } from '../../theme/tokens';

const TIPOS: { value: '' | LeadType; label: string }[] = [
  { value: '',         label: 'Todos los tipos' },
  { value: 'demo',     label: 'Demo' },
  { value: 'contacto', label: 'Contacto' },
  { value: 'email',    label: 'Email' },
];

export default function LeadsList() {
  const [rows, setRows]         = useState<AdminLead[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [page, setPage]         = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [q, setQ]               = useState('');
  const [tipo, setTipo]         = useState<'' | LeadType>('');
  const [paisIso, setPaisIso]   = useState('');
  const [selected, setSelected] = useState<AdminLead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await normalizeApi(
      listAdminLeads({
        q: q.trim() || undefined,
        tipo: tipo || undefined,
        pais_iso: paisIso || undefined,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      }),
      'rows',
      'No pudimos cargar los leads',
    );
    if (res.ok) {
      setRows(res.data.rows);
      setTotal(res.data.total);
    } else {
      setError(res.error);
      setRows([]);
      setTotal(0);
    }
    setLoading(false);
  }, [q, tipo, paisIso, page, rowsPerPage]);

  // Debounce de búsqueda
  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

  // Países distintos del set actual para el filtro
  const paises = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.pais_iso) set.add(r.pais_iso); });
    return Array.from(set).sort();
  }, [rows]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Leads</Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Buscar (nombre, email, empresa)"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(0); }}
          sx={{ flexGrow: 1 }}
          inputProps={{ 'aria-label': 'Buscar leads' }}
        />
        <TextField
          select size="small" label="Tipo" value={tipo}
          onChange={e => { setTipo(e.target.value as '' | LeadType); setPage(0); }}
          sx={{ minWidth: 180 }}
        >
          {TIPOS.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </TextField>
        <TextField
          select size="small" label="País" value={paisIso}
          onChange={e => { setPaisIso(e.target.value); setPage(0); }}
          sx={{ minWidth: 140 }}
          disabled={paises.length === 0}
        >
          <MenuItem value="">Todos</MenuItem>
          {paises.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Box sx={{ color: 'error.main', mb: 2, fontSize: 14 }}>{error}</Box>}

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'surface.soft' }}>
              <TableCell>Fecha</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Industria</TableCell>
              <TableCell>País</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Ver</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={20} /></TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin leads.</TableCell></TableRow>
            )}
            {!loading && rows.map(r => (
              <TableRow
                key={r.id}
                hover
                selected={selected?.id === r.id}
                onClick={() => setSelected(r)}
                sx={{ cursor: 'pointer', '&.Mui-selected': { paddingBottom: '6px' } }}
                data-testid={`lead-row-${r.id}`}
              >
                <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: 13 }}>
                  {new Date(r.created_at).toLocaleDateString('es-MX')}
                </TableCell>
                <TableCell>{r.nombre || <em style={{ color: tokens.text.disabled }}>—</em>}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.empresa || '—'}</TableCell>
                <TableCell>{r.industria || '—'}</TableCell>
                <TableCell>{r.pais_iso || '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label={r.tipo} color={r.tipo === 'demo' ? 'primary' : 'default'} variant={r.tipo === 'demo' ? 'filled' : 'outlined'} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" aria-label={`Ver lead ${r.id}`}><VisibilityIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Por página"
        />
      </Paper>

      <LeadDetailDialog open={!!selected} lead={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
