import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Stack, TextField,
} from '@mui/material';
import {
  COMPLEMENTO_DESCRIPCION_MAX, COMPLEMENTO_NOMBRE_MAX, COMPLEMENTO_ORDEN_MAX,
  COMPLEMENTO_PRECIO_MAX, COMPLEMENTO_UNIDAD_MAX, ORDEN_ERROR,
  adminErrorMessage, createAdminComplemento, normalizeApi, parseOrden, updateAdminComplemento,
  type AdminComplemento, type ComplementoInput,
} from '../../lib/api';

/** Campos del formulario, que son los que tienen dónde pintar un error. */
type FormField = 'nombre' | 'descripcion' | 'precio' | 'unidad' | 'orden';

/**
 * Mapeo **explícito** del `field` de un `422` al input de este formulario
 * (patrón `FIELD_BY_BACKEND` de la feature 34, `PlanEditDialog.tsx`). Los
 * cinco campos escribibles tienen aquí un `TextField` con `helperText` donde
 * pintar el mensaje, así que la tabla es la identidad — se deja explícita de
 * todos modos para que un nombre nuevo del backend no se cuele sin revisión.
 */
const FIELD_BY_BACKEND: Record<string, FormField> = {
  nombre:      'nombre',
  descripcion: 'descripcion',
  precio:      'precio',
  unidad:      'unidad',
  orden:       'orden',
};

/** `''` → `null` (sin precio unitario). Texto no numérico o fuera de rango → error. */
function parsePrecio(raw: string): { value: number | null; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: null };
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return { value: null, error: 'precio debe ser un número' };
  }
  const n = Number(trimmed);
  if (n < 0 || n > COMPLEMENTO_PRECIO_MAX) {
    return { value: null, error: `precio debe estar entre 0 y ${COMPLEMENTO_PRECIO_MAX}` };
  }
  return { value: n, error: null };
}

interface Props {
  /** `null` con `open` = alta; un complemento = edición. */
  complemento: AdminComplemento | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Alta y edición de un complemento (`docs/api-contract.md` §4 quinquies).
 *
 * Dos reglas del modelo que este formulario respeta:
 *
 * - **Un campo vacío manda `null`, nunca `0`.** `precio`, `descripcion` y
 *   `unidad` admiten `null` explícito, que en un `PATCH` **borra** el valor
 *   guardado. Dejar el precio en blanco es la forma correcta de decir «este
 *   complemento no publica precio unitario, lo llevan sus paquetes».
 * - **Los paquetes no se editan aquí.** Se administran desde su propia
 *   pantalla (feature 38, todavía sin implementar), no desde este
 *   formulario.
 */
export default function ComplementoEditDialog({ complemento, open, onClose, onSaved }: Props) {
  const [nombre, setNombre]           = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio]           = useState('');
  const [unidad, setUnidad]           = useState('');
  const [orden, setOrden]             = useState('0');
  const [errors, setErrors]           = useState<Partial<Record<FormField, string>>>({});
  const [saving, setSaving]           = useState(false);
  const [status, setStatus]           = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  // Cada apertura parte del complemento recibido, o de los valores por defecto
  // del backend si es un alta.
  useEffect(() => {
    if (!open) return;
    setNombre(complemento?.nombre ?? '');
    setDescripcion(complemento?.descripcion ?? '');
    // `precio: null` se transcribe como campo vacío, nunca como «0».
    setPrecio(complemento?.precio != null ? String(complemento.precio) : '');
    setUnidad(complemento?.unidad ?? '');
    setOrden(String(complemento?.orden ?? 0));
    setErrors({});
    setStatus(null);
  }, [complemento, open]);

  if (!open) return null;

  const clearError = (field: FormField) => {
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const next: Partial<Record<FormField, string>> = {};
    if (!nombre.trim()) next.nombre = 'nombre requerido';

    const { value: precioNum, error: precioError } = parsePrecio(precio);
    if (precioError) next.precio = precioError;

    const ordenNum = parseOrden(orden);
    if (ordenNum === null || ordenNum > COMPLEMENTO_ORDEN_MAX) next.orden = ORDEN_ERROR;

    setErrors(next);
    if (Object.keys(next).length > 0 || ordenNum === null) return;

    const payload: ComplementoInput = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio: precioNum,
      unidad: unidad.trim() || null,
      orden: ordenNum,
    };

    setSaving(true);
    const res = complemento
      ? await normalizeApi(updateAdminComplemento(complemento.id, payload), 'complemento', 'No pudimos guardar los cambios')
      : await normalizeApi(createAdminComplemento(payload), 'complemento', 'No pudimos crear el complemento');
    setSaving(false);

    if (res.ok) {
      onSaved();
      return;
    }
    const field = res.field ? FIELD_BY_BACKEND[res.field] ?? null : null;
    if (field) setErrors(prev => ({ ...prev, [field]: res.error }));
    else       setStatus({ kind: 'error', text: adminErrorMessage(res) });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{complemento ? 'Editar complemento' : 'Nuevo complemento'}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Nombre"
              value={nombre}
              onChange={e => { setNombre(e.target.value); clearError('nombre'); }}
              error={!!errors.nombre}
              helperText={errors.nombre}
              inputProps={{ 'aria-label': 'Nombre', autoComplete: 'off', maxLength: COMPLEMENTO_NOMBRE_MAX }}
              disabled={saving}
              autoFocus
            />

            <TextField
              label="Descripción"
              value={descripcion}
              onChange={e => { setDescripcion(e.target.value); clearError('descripcion'); }}
              error={!!errors.descripcion}
              helperText={errors.descripcion ?? 'Opcional. Déjala vacía para no mostrar ninguna.'}
              inputProps={{ 'aria-label': 'Descripción', maxLength: COMPLEMENTO_DESCRIPCION_MAX }}
              disabled={saving}
              multiline
              minRows={2}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Precio"
                value={precio}
                onChange={e => { setPrecio(e.target.value); clearError('precio'); }}
                error={!!errors.precio}
                helperText={errors.precio ?? 'Déjalo vacío si el precio lo llevan los paquetes.'}
                inputProps={{ 'aria-label': 'Precio', inputMode: 'decimal' }}
                disabled={saving}
                sx={{ flexGrow: 1 }}
              />
              <TextField
                label="Unidad"
                value={unidad}
                onChange={e => { setUnidad(e.target.value); clearError('unidad'); }}
                error={!!errors.unidad}
                helperText={errors.unidad ?? 'Ej.: «/ crédito». Opcional.'}
                inputProps={{ 'aria-label': 'Unidad', autoComplete: 'off', maxLength: COMPLEMENTO_UNIDAD_MAX }}
                disabled={saving}
                sx={{ flexGrow: 1 }}
              />
            </Stack>

            <TextField
              label="Orden"
              value={orden}
              onChange={e => { setOrden(e.target.value); clearError('orden'); }}
              error={!!errors.orden}
              helperText={errors.orden ?? 'Entero desde 0. Los complementos se muestran de menor a mayor.'}
              inputProps={{ 'aria-label': 'Orden', inputMode: 'numeric' }}
              disabled={saving}
            />

            {complemento && complemento.paquetes.length > 0 && (
              <Alert severity="info">
                Este complemento tiene {complemento.paquetes.length} paquete
                {complemento.paquetes.length === 1 ? '' : 's'} asociado
                {complemento.paquetes.length === 1 ? '' : 's'}. Se editan desde su
                propia pantalla, no aquí.
              </Alert>
            )}

            {status && <Alert severity={status.kind} role="status">{status.text}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Guardando…' : complemento ? 'Guardar cambios' : 'Crear complemento'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
