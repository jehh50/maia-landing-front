import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import type { AdminUser } from '../../lib/api';
import { tokens } from '../../theme/tokens';
import ImageUploadDialog from './ImageUploadDialog';
import {
  ALT_MAX, ORDEN_ERROR, SECCIONES,
  deleteMockImage, formatFileSize, listMockImages, mockPreviewUrl, parseOrden, updateMockImage,
  type MockImage, type MockImageField, type Seccion,
} from './mockImages';

/** Catálogo del filtro; `''` = todas las secciones, como en `LeadsList`. */
const FILTROS: { value: '' | Seccion; label: string }[] = [
  { value: '', label: 'Todas' },
  ...SECCIONES.map(s => ({ value: s.value, label: s.label })),
];

function etiquetaSeccion(seccion: Seccion): string {
  return SECCIONES.find(s => s.value === seccion)?.label ?? seccion;
}

interface EditProps {
  /** `null` = diálogo cerrado. */
  image: MockImage | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Edición de una imagen: **solo `alt`, `orden` y `seccion`**, que es lo único
 * que admite el `PATCH`. El binario, el nombre, el MIME y el tamaño son
 * inmutables, así que aquí no hay «reemplazar imagen».
 */
function ImageEditDialog({ image, onClose, onSaved }: EditProps) {
  const [alt, setAlt]         = useState('');
  const [orden, setOrden]     = useState('0');
  const [seccion, setSeccion] = useState<Seccion>('hero');
  const [errors, setErrors]   = useState<Partial<Record<MockImageField, string>>>({});
  const [saving, setSaving]   = useState(false);
  const [status, setStatus]   = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (!image) return;
    setAlt(image.alt ?? '');
    setOrden(String(image.orden));
    setSeccion(image.seccion);
    setErrors({});
    setStatus(null);
  }, [image]);

  if (!image) return null;

  const clearError = (field: MockImageField) => {
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const next: Partial<Record<MockImageField, string>> = {};
    if (alt.trim().length > ALT_MAX) next.alt = `Máximo ${ALT_MAX} caracteres`;
    const ordenNum = parseOrden(orden);
    if (ordenNum === null) next.orden = ORDEN_ERROR;
    setErrors(next);
    if (Object.keys(next).length > 0 || ordenNum === null) return;

    setSaving(true);
    const res = await updateMockImage(image.id, {
      alt: alt.trim() || null,
      orden: ordenNum,
      seccion,
    });
    setSaving(false);

    if (res.ok) {
      onSaved();
      return;
    }
    const { error, field } = res;
    if (field) setErrors(prev => ({ ...prev, [field]: error }));
    else       setStatus({ kind: 'error', text: error });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Editar imagen</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Box
              sx={{
                bgcolor: 'surface.soft',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                {image.filename}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                El archivo no se puede reemplazar: solo cambian el texto alternativo, el
                orden y la sección. Para usar otra imagen, sube la nueva y borra esta.
              </Typography>
            </Box>

            <TextField
              label="Texto alternativo"
              value={alt}
              onChange={e => { setAlt(e.target.value); clearError('alt'); }}
              error={!!errors.alt}
              helperText={errors.alt ?? `Describe la imagen para lectores de pantalla (máx. ${ALT_MAX}). Déjalo vacío para borrarlo.`}
              inputProps={{ 'aria-label': 'Texto alternativo', maxLength: ALT_MAX }}
              disabled={saving}
              autoFocus
            />

            <TextField
              label="Orden"
              value={orden}
              onChange={e => { setOrden(e.target.value); clearError('orden'); }}
              error={!!errors.orden}
              helperText={errors.orden ?? 'Entero desde 0. Las imágenes se muestran de menor a mayor.'}
              inputProps={{ 'aria-label': 'Orden', inputMode: 'numeric' }}
              disabled={saving}
            />

            <TextField
              select
              label="Sección"
              value={seccion}
              onChange={e => { setSeccion(e.target.value as Seccion); clearError('seccion'); }}
              error={!!errors.seccion}
              helperText={errors.seccion ?? 'Mover la imagen a otra sección de la landing.'}
              disabled={saving}
            >
              {SECCIONES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>

            {status && <Alert severity={status.kind} role="status">{status.text}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

/**
 * Administración de las imágenes de la landing (feature 29).
 *
 * Maqueta: los datos salen de `./mockImages`, no del backend. El contrato real
 * está cerrado (`docs/api-contract.md` §10.2) pero sin commitear ni desplegar,
 * así que aquí no hay ningún `fetch` ni ninguna URL contra el backend; las
 * vistas previas son los estáticos que ya viven en `public/`.
 *
 * El listado real responde `{ rows }` sin paginación y ordenado por
 * `orden ASC, id ASC`, así que aquí tampoco se pinta `TablePagination`.
 */
export default function ImagesGrid() {
  const sessionUser = useOutletContext<AdminUser>();
  // Las tres rutas de escritura exigen rol `admin`: un editor recibiría un 403.
  const puedeEditar = sessionUser?.role === 'admin';

  const [rows, setRows]         = useState<MockImage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filtro, setFiltro]     = useState<'' | Seccion>('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing]   = useState<MockImage | null>(null);
  const [toDelete, setToDelete] = useState<MockImage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listMockImages({ seccion: filtro || undefined });
    if (res.ok) {
      setRows(res.data.rows);
    } else {
      setError(res.error);
      setRows([]);
    }
    setLoading(false);
  }, [filtro]);

  useEffect(() => { void load(); }, [load]);

  const onUploaded = async () => {
    setUploadOpen(false);
    await load();
  };

  const onSaved = async () => {
    setEditing(null);
    await load();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const res = await deleteMockImage(toDelete.id);
    setDeleting(false);
    setToDelete(null);
    if (res.ok) await load();
    else setError(res.error);
  };

  const seccionesVisibles = SECCIONES.filter(s => !filtro || s.value === filtro);

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
        <Typography variant="h5" fontWeight={700}>Imágenes</Typography>
        {puedeEditar && (
          <Button variant="contained" startIcon={<AddPhotoAlternateIcon />} onClick={() => setUploadOpen(true)}>
            Subir imagen
          </Button>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        Cada imagen pertenece a una sección de la landing y se muestra según su orden.
        El archivo de una imagen ya subida no se puede reemplazar: para cambiarla, sube
        la nueva y borra la anterior.
      </Typography>

      {!puedeEditar && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Tu rol es editor: puedes consultar las imágenes, pero subirlas, editarlas y
          borrarlas está reservado al rol administrador.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          select
          size="small"
          label="Filtrar por sección"
          value={filtro}
          onChange={e => setFiltro(e.target.value as '' | Seccion)}
          sx={{ minWidth: 220 }}
        >
          {FILTROS.map(f => <MenuItem key={f.value || 'todas'} value={f.value}>{f.label}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Box sx={{ color: 'error.main', mb: 2, fontSize: 14 }}>{error}</Box>}

      {loading && (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={24} /></Box>
      )}

      {!loading && seccionesVisibles.map(s => {
        const imagenes = rows.filter(i => i.seccion === s.value);
        return (
          <Box component="section" key={s.value} sx={{ mb: 4 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>{s.label}</Typography>
              <Chip size="small" label={imagenes.length} variant="outlined" />
            </Stack>

            {imagenes.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                Sin imágenes en esta sección.
              </Paper>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                  gap: 2,
                }}
              >
                {imagenes.map(img => {
                  const preview = mockPreviewUrl(img);
                  return (
                    <Paper
                      key={img.id}
                      variant="outlined"
                      data-testid={`image-card-${img.id}`}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        transition: 'box-shadow .2s ease',
                        '&:hover': { boxShadow: `0 4px 16px ${alpha(tokens.brand.orange, 0.1)}` },
                      }}
                    >
                      <Box
                        sx={{
                          height: 160,
                          bgcolor: 'surface.soft',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          p: 1,
                        }}
                      >
                        {preview ? (
                          <Box
                            component="img"
                            src={preview}
                            alt={img.alt ?? ''}
                            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <Stack alignItems="center" spacing={0.5} sx={{ color: 'text.disabled' }}>
                            <ImageOutlinedIcon />
                            <Typography variant="caption">Vista previa no disponible</Typography>
                          </Stack>
                        )}
                      </Box>

                      <Box sx={{ p: 2, flexGrow: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ wordBreak: 'break-all' }}>
                          {img.filename}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {img.alt || <em style={{ color: tokens.text.disabled }}>Sin texto alternativo</em>}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                          <Chip size="small" variant="outlined" label={`Orden ${img.orden}`} />
                          <Chip size="small" variant="outlined" label={formatFileSize(img.size_bytes)} />
                          <Chip size="small" variant="outlined" label={etiquetaSeccion(img.seccion)} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                          Subida el {new Date(img.created_at).toLocaleDateString('es-MX')}
                        </Typography>
                      </Box>

                      {puedeEditar && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, px: 1, pb: 1 }}>
                          <IconButton size="small" onClick={() => setEditing(img)} aria-label={`Editar ${img.filename}`}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => setToDelete(img)} aria-label={`Borrar ${img.filename}`}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        );
      })}

      <ImageUploadDialog
        open={uploadOpen}
        seccionInicial={filtro}
        onClose={() => setUploadOpen(false)}
        onUploaded={onUploaded}
      />

      <ImageEditDialog image={editing} onClose={() => setEditing(null)} onSaved={onSaved} />

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)}>
        <DialogTitle>¿Borrar imagen?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Esta acción no se puede deshacer. Se eliminará «<b>{toDelete?.filename}</b>».
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            El archivo se borra del servidor y no hay papelera. Si la sección se queda
            sin imágenes, habrá que subir otra.
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
