import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, TextField,
} from '@mui/material';
import {
  ORDEN_ERROR, PAQUETE_DESCRIPCION_MAX, PAQUETE_NOMBRE_MAX, PAQUETE_ORDEN_MAX,
  PAQUETE_PRECIO_MAX, adminErrorMessage, createAdminPaquete, normalizeApi, parseOrden,
  updateAdminPaquete,
  type AdminComplemento, type AdminPaquete, type PaqueteInput,
} from '../../lib/api';

/** Campos del formulario, que son los que tienen dónde pintar un error. */
type FormField = 'nombre' | 'descripcion' | 'precio' | 'orden' | 'complemento_id';

/**
 * Mapeo **explícito** del `field` de un `422` al input de este formulario
 * (mismo patrón `FIELD_BY_BACKEND` que `ComplementoEditDialog`/`PlanEditDialog`).
 */
const FIELD_BY_BACKEND: Record<string, FormField> = {
  nombre: 'nombre',
  descripcion: 'descripcion',
  precio: 'precio',
  orden: 'orden',
  complemento_id: 'complemento_id',
};

/**
 * A diferencia del complemento, aquí el precio es **obligatorio**: un campo
 * vacío es un error de validación en cliente, nunca un `null` legítimo.
 */
function parsePrecio(raw: string): { value: number | null; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: 'precio requerido' };
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return { value: null, error: 'precio debe ser un número' };
  }
  const n = Number(trimmed);
  if (n < 0 || n > PAQUETE_PRECIO_MAX) {
    return { value: null, error: `precio debe estar entre 0 y ${PAQUETE_PRECIO_MAX}` };
  }
  return { value: n, error: null };
}

interface FormSnapshot {
  nombre: string;
  descripcion: string;
  precio: string;
  orden: string;
  complementoId: string;
}

function snapshotOf(paquete: AdminPaquete | null, defaultComplementoId: string): FormSnapshot {
  return {
    nombre: paquete?.nombre ?? '',
    descripcion: paquete?.descripcion ?? '',
    // `precio` es obligatorio: un paquete siempre trae un número, nunca vacío.
    precio: paquete?.precio != null ? String(paquete.precio) : '',
    orden: String(paquete?.orden ?? 0),
    complementoId: paquete?.complemento_id ?? defaultComplementoId,
  };
}

interface Props {
  /** `null` con `open` = alta; un paquete = edición. */
  paquete: AdminPaquete | null;
  /** Complemento de partida: el que abrió el alta ("Agregar paquete" de esa fila). */
  complementoId: string;
  /** Todos los complementos, para poder reasignar el paquete a otro (`complemento_id`). */
  complementos: AdminComplemento[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Alta y edición de un paquete (`docs/api-contract.md` §4 quinquies).
 *
 * Tres asimetrías respecto a `ComplementoEditDialog`, todas del contrato:
 *
 * - **`precio` es obligatorio.** Dejarlo vacío es un error de cliente, no un
 *   `null` legítimo como en el complemento.
 * - **No hay campo `unidad`.**
 * - **`complemento_id` es obligatorio y reasignable.** El selector
 *   "Complemento" permite mover el paquete a otro add-on: el backend admite
 *   `PATCH { complemento_id }` y responde `422 { field: 'complemento_id' }` si
 *   el destino no existe, no es numérico o desborda.
 *
 * **Un `PATCH` sin cambios no se envía.** `dirty` compara el formulario contra
 * la instantánea tomada al abrir y deshabilita "Guardar cambios" si no hay
 * ninguna diferencia, porque el backend responde `422` a un `PATCH` vacío (o
 * que solo repita lo ya guardado no manda nada distinto, pero evitamos igual
 * la petición inútil).
 */
export default function PaqueteEditDialog({
  paquete, complementoId, complementos, open, onClose, onSaved,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [orden, setOrden] = useState('0');
  const [complementoIdSel, setComplementoIdSel] = useState('');
  const [initial, setInitial] = useState<FormSnapshot | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  // Cada apertura parte del paquete recibido, o del complemento de contexto y
  // los valores por defecto si es un alta.
  useEffect(() => {
    if (!open) return;
    const snap = snapshotOf(paquete, complementoId);
    setNombre(snap.nombre);
    setDescripcion(snap.descripcion);
    setPrecio(snap.precio);
    setOrden(snap.orden);
    setComplementoIdSel(snap.complementoId);
    setInitial(snap);
    setErrors({});
    setStatus(null);
  }, [paquete, complementoId, open]);

  if (!open) return null;

  const clearError = (field: FormField) => {
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  // En edición, un formulario idéntico al original no debe llegar al backend:
  // un PATCH vacío responde 422 (docs/api-contract.md §4 quinquies).
  const dirty = !paquete || !initial || (
    nombre !== initial.nombre
    || descripcion !== initial.descripcion
    || precio !== initial.precio
    || orden !== initial.orden
    || complementoIdSel !== initial.complementoId
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (paquete && !dirty) return;

    const next: Partial<Record<FormField, string>> = {};
    if (!nombre.trim()) next.nombre = 'nombre requerido';
    if (!complementoIdSel) next.complemento_id = 'complemento requerido';

    const { value: precioNum, error: precioError } = parsePrecio(precio);
    if (precioError) next.precio = precioError;

    const ordenNum = parseOrden(orden);
    if (ordenNum === null || ordenNum > PAQUETE_ORDEN_MAX) next.orden = ORDEN_ERROR;

    setErrors(next);
    if (Object.keys(next).length > 0 || ordenNum === null || precioNum === null) return;

    const payload: PaqueteInput = {
      nombre: nombre.trim(),
      complemento_id: complementoIdSel,
      precio: precioNum,
      descripcion: descripcion.trim() || null,
      orden: ordenNum,
    };

    setSaving(true);
    const res = paquete
      ? await normalizeApi(updateAdminPaquete(paquete.id, payload), 'paquete', 'No pudimos guardar los cambios')
      : await normalizeApi(createAdminPaquete(payload), 'paquete', 'No pudimos crear el paquete');
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
      <DialogTitle sx={{ fontWeight: 700 }}>{paquete ? 'Editar paquete' : 'Nuevo paquete'}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Nombre"
              value={nombre}
              onChange={e => { setNombre(e.target.value); clearError('nombre'); }}
              error={!!errors.nombre}
              helperText={errors.nombre}
              inputProps={{ 'aria-label': 'Nombre', autoComplete: 'off', maxLength: PAQUETE_NOMBRE_MAX }}
              disabled={saving}
              autoFocus
            />

            <TextField
              select
              label="Complemento"
              value={complementoIdSel}
              onChange={e => { setComplementoIdSel(e.target.value); clearError('complemento_id'); }}
              error={!!errors.complemento_id}
              helperText={errors.complemento_id ?? 'El add-on al que pertenece este paquete.'}
              inputProps={{ 'aria-label': 'Complemento' }}
              disabled={saving}
            >
              {complementos.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Descripción"
              value={descripcion}
              onChange={e => { setDescripcion(e.target.value); clearError('descripcion'); }}
              error={!!errors.descripcion}
              helperText={errors.descripcion ?? 'Opcional. Déjala vacía para no mostrar ninguna.'}
              inputProps={{ 'aria-label': 'Descripción', maxLength: PAQUETE_DESCRIPCION_MAX }}
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
                helperText={errors.precio ?? 'Obligatorio: a diferencia del complemento, un paquete siempre tiene precio propio.'}
                inputProps={{ 'aria-label': 'Precio', inputMode: 'decimal' }}
                disabled={saving}
                sx={{ flexGrow: 1 }}
              />
              <TextField
                label="Orden"
                value={orden}
                onChange={e => { setOrden(e.target.value); clearError('orden'); }}
                error={!!errors.orden}
                helperText={errors.orden ?? 'Entero desde 0.'}
                inputProps={{ 'aria-label': 'Orden', inputMode: 'numeric' }}
                disabled={saving}
                sx={{ flexGrow: 1 }}
              />
            </Stack>

            {status && <Alert severity={status.kind} role="status">{status.text}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving || (!!paquete && !dirty)}>
            {saving ? 'Guardando…' : paquete ? 'Guardar cambios' : 'Crear paquete'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
