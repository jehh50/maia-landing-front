import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  ACCEPTED_MIME_TYPES, ALT_MAX, MAX_FILE_SIZE_BYTES, ORDEN_ERROR, SECCIONES,
  createMockImage, formatFileSize, parseOrden, validateImageFile,
  type MockImage, type MockImageField, type Seccion,
} from './mockImages';

interface Props {
  open: boolean;
  /** Sección preseleccionada: la del filtro activo, o `''` si es «Todas». */
  seccionInicial: Seccion | '';
  onClose: () => void;
  onUploaded: (image: MockImage) => void;
}

/**
 * Subida de una imagen (feature 29).
 *
 * Refleja el contrato real del `POST /api/admin/images`: `multipart/form-data`,
 * **un solo archivo** en el campo `file`, más `seccion` (obligatoria), `alt`
 * (opcional, máx 300) y `orden` (opcional, entero >= 0, default 0).
 *
 * El tipo y el tamaño se validan **en cliente antes de nada**: el archivo viaja
 * entero por la red antes de que el backend valide `seccion`, así que un envío
 * condenado cuesta ancho de banda de verdad.
 *
 * Hoy la subida va contra `./mockImages` (ver el TODO de ese módulo).
 */
export default function ImageUploadDialog({ open, seccionInicial, onClose, onUploaded }: Props) {
  const [file, setFile]       = useState<File | null>(null);
  const [seccion, setSeccion] = useState<Seccion | ''>(seccionInicial);
  const [alt, setAlt]         = useState('');
  const [orden, setOrden]     = useState('0');
  const [errors, setErrors]   = useState<Partial<Record<MockImageField, string>>>({});
  const [saving, setSaving]   = useState(false);
  const [status, setStatus]   = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  // Cada apertura parte de cero, con la sección del filtro ya elegida.
  useEffect(() => {
    if (!open) return;
    setFile(null);
    setSeccion(seccionInicial);
    setAlt('');
    setOrden('0');
    setErrors({});
    setStatus(null);
  }, [open, seccionInicial]);

  const clearError = (field: MockImageField) => {
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    setStatus(null);
    if (!picked) {
      setFile(null);
      return;
    }
    const problema = validateImageFile(picked);
    if (problema) {
      setFile(null);
      setErrors(prev => ({ ...prev, file: problema.error }));
      return;
    }
    setFile(picked);
    clearError('file');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const next: Partial<Record<MockImageField, string>> = {};
    const problema = validateImageFile(file);
    if (problema) next.file = problema.error;
    if (!seccion) next.seccion = 'seccion requerida';
    if (alt.trim().length > ALT_MAX) next.alt = `Máximo ${ALT_MAX} caracteres`;
    const ordenNum = parseOrden(orden);
    if (ordenNum === null) next.orden = ORDEN_ERROR;
    setErrors(next);

    // La segunda condición no es redundante para TypeScript: estrecha los tipos.
    if (Object.keys(next).length > 0) return;
    if (!file || !seccion || ordenNum === null) return;

    setSaving(true);
    const res = await createMockImage({
      file,
      seccion,
      alt: alt.trim() || undefined,
      orden: ordenNum,
    });
    setSaving(false);

    if (res.ok) {
      onUploaded(res.data.image);
      return;
    }
    const { error, field } = res;
    if (field) setErrors(prev => ({ ...prev, [field]: error }));
    else       setStatus({ kind: 'error', text: error });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Subir imagen</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Box
              sx={{
                border: '1px dashed',
                borderColor: errors.file ? 'error.main' : 'divider',
                borderRadius: 2,
                bgcolor: 'surface.soft',
                p: 2.5,
                textAlign: 'center',
              }}
            >
              <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} disabled={saving}>
                Elegir archivo
                <Box
                  component="input"
                  type="file"
                  accept={ACCEPTED_MIME_TYPES.join(',')}
                  aria-label="Archivo de imagen"
                  onChange={onPickFile}
                  disabled={saving}
                  sx={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
                />
              </Button>

              <Box sx={{ mt: 1.5 }}>
                {file ? (
                  <Chip
                    size="small"
                    label={`${file.name} · ${formatFileSize(file.size)}`}
                    color="primary"
                    variant="outlined"
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Ningún archivo seleccionado.
                  </Typography>
                )}
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                PNG, JPG o WEBP, hasta {formatFileSize(MAX_FILE_SIZE_BYTES)}. El SVG no se
                admite por seguridad. El servidor comprueba el contenido real del archivo:
                renombrar un .jpg como .png no funciona.
              </Typography>

              {errors.file && (
                <Typography variant="body2" color="error.main" role="alert" sx={{ mt: 1 }}>
                  {errors.file}
                </Typography>
              )}
            </Box>

            <TextField
              select
              label="Sección"
              value={seccion}
              onChange={e => { setSeccion(e.target.value as Seccion); clearError('seccion'); }}
              error={!!errors.seccion}
              helperText={errors.seccion ?? 'Dónde se usará la imagen en la landing.'}
              disabled={saving}
            >
              {SECCIONES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>

            <TextField
              label="Texto alternativo"
              value={alt}
              onChange={e => { setAlt(e.target.value); clearError('alt'); }}
              error={!!errors.alt}
              helperText={errors.alt ?? `Opcional. Describe la imagen para lectores de pantalla (máx. ${ALT_MAX}).`}
              inputProps={{ 'aria-label': 'Texto alternativo', maxLength: ALT_MAX }}
              disabled={saving}
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

            {status && <Alert severity={status.kind} role="status">{status.text}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Subiendo…' : 'Subir'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
