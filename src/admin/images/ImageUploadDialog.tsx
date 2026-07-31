import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  ACCEPTED_IMAGE_MIME_TYPES, IMAGE_ALT_MAX, MAX_IMAGE_SIZE_BYTES, ORDEN_ERROR,
  adminErrorMessage, createAdminImage, formatFileSize, normalizeApi, parseOrden,
  validateImageFile,
  type ApiFailure, type ImageSeccion,
} from '../../lib/api';

interface Props {
  open: boolean;
  /** Catálogo de secciones con su etiqueta: lo posee `ImagesGrid`, que es quien pinta el copy. */
  secciones: readonly { value: ImageSeccion; label: string }[];
  /** Sección preseleccionada: la del filtro activo, o `''` si es «Todas». */
  seccionInicial: ImageSeccion | '';
  onClose: () => void;
  onUploaded: () => void;
}

/** Los cuatro campos del formulario, que son los del `multipart` del contrato. */
type FormField = 'file' | 'seccion' | 'alt' | 'orden';

/**
 * Mapeo **explícito** del nombre que usa el backend en sus `422`
 * (`{ error, field }`, feature 31) al input de este formulario.
 *
 * Es una tabla y no un whitelist a propósito (observación 3 de
 * `progress/review_32.md`): si mañana el backend renombra un campo, la entrada
 * que falta se ve aquí en vez de romperse en silencio. Los tres nombres son los
 * que documenta `docs/api-contract.md` §4 ter; `alt` no aparece porque el
 * backend lo trunca a `IMAGE_ALT_MAX` en vez de rechazarlo. Cualquier otro
 * nombre cae al aviso global en lugar de marcar un input que no existe.
 */
const FIELD_BY_BACKEND: Record<string, FormField> = {
  file:    'file',
  seccion: 'seccion',
  orden:   'orden',
};

const SUBIDA_ERROR = 'No pudimos subir la imagen';

/**
 * Copy propio de los dos códigos que el backend puede devolver **sin cuerpo
 * legible**: multer corta la petición antes del handler, así que un `413` o un
 * `415` pueden llegar sin `{ error }`. Si el backend sí manda su mensaje, se
 * muestra el suyo.
 */
const STATUS_COPY: Record<number, string> = {
  413: `El archivo excede el tamaño máximo permitido (${formatFileSize(MAX_IMAGE_SIZE_BYTES)})`,
  415: `Tipo de archivo no permitido. Formatos aceptados: ${ACCEPTED_IMAGE_MIME_TYPES.join(', ')}`,
};

/** `413` y `415` siempre hablan del archivo: su mensaje se marca en ese campo. */
function esErrorDeArchivo(status: number): boolean {
  return status === 413 || status === 415;
}

function mensajeDeSubida(res: ApiFailure): string {
  const propio = STATUS_COPY[res.status];
  // `res.error === SUBIDA_ERROR` significa que el fallo llegó sin mensaje: ahí,
  // y solo ahí, el copy de `STATUS_COPY` es mejor que el genérico.
  if (propio && res.error === SUBIDA_ERROR) return propio;
  return adminErrorMessage(res);
}

/**
 * Subida de una imagen (maquetada en la feature 29, cableada a
 * `POST /api/admin/images` en la feature 33).
 *
 * El tipo y el tamaño se validan **en cliente antes de nada**: el archivo viaja
 * entero por la red antes de que el backend valide `seccion`, así que un envío
 * condenado cuesta ancho de banda de verdad. La validación no sustituye a la del
 * servidor —los *magic bytes* solo se comprueban allí— y por eso los `413`,
 * `415` y `422` que llegan de vuelta también se muestran.
 */
export default function ImageUploadDialog({ open, secciones, seccionInicial, onClose, onUploaded }: Props) {
  const [file, setFile]       = useState<File | null>(null);
  const [seccion, setSeccion] = useState<ImageSeccion | ''>(seccionInicial);
  const [alt, setAlt]         = useState('');
  const [orden, setOrden]     = useState('0');
  const [errors, setErrors]   = useState<Partial<Record<FormField, string>>>({});
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

  const clearError = (field: FormField) => {
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

    const next: Partial<Record<FormField, string>> = {};
    const problema = validateImageFile(file);
    if (problema) next.file = problema.error;
    if (!seccion) next.seccion = 'seccion requerida';
    if (alt.trim().length > IMAGE_ALT_MAX) next.alt = `Máximo ${IMAGE_ALT_MAX} caracteres`;
    const ordenNum = parseOrden(orden);
    if (ordenNum === null) next.orden = ORDEN_ERROR;
    setErrors(next);

    // La segunda condición no es redundante para TypeScript: estrecha los tipos.
    if (Object.keys(next).length > 0) return;
    if (!file || !seccion || ordenNum === null) return;

    setSaving(true);
    const res = await normalizeApi(
      createAdminImage({ file, seccion, alt: alt.trim() || undefined, orden: ordenNum }),
      'image',
      SUBIDA_ERROR,
    );
    setSaving(false);

    if (res.ok) {
      onUploaded();
      return;
    }
    const texto = mensajeDeSubida(res);
    const field: FormField | null = esErrorDeArchivo(res.status)
      ? 'file'
      : (res.field ? FIELD_BY_BACKEND[res.field] ?? null : null);
    if (field) setErrors(prev => ({ ...prev, [field]: texto }));
    else       setStatus({ kind: 'error', text: texto });
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
                  accept={ACCEPTED_IMAGE_MIME_TYPES.join(',')}
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
                PNG, JPG o WEBP, hasta {formatFileSize(MAX_IMAGE_SIZE_BYTES)}. El SVG no se
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
              onChange={e => { setSeccion(e.target.value as ImageSeccion); clearError('seccion'); }}
              error={!!errors.seccion}
              helperText={errors.seccion ?? 'Dónde se usará la imagen en la landing.'}
              disabled={saving}
            >
              {secciones.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>

            <TextField
              label="Texto alternativo"
              value={alt}
              onChange={e => { setAlt(e.target.value); clearError('alt'); }}
              error={!!errors.alt}
              helperText={errors.alt ?? `Opcional. Describe la imagen para lectores de pantalla (máx. ${IMAGE_ALT_MAX}).`}
              inputProps={{ 'aria-label': 'Texto alternativo', maxLength: IMAGE_ALT_MAX }}
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
