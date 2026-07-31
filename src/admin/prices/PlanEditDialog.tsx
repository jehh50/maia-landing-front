import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Stack, Switch, TextField, Typography,
} from '@mui/material';
import {
  ORDEN_ERROR, PLAN_NOMBRE_MAX, PLAN_TRIAL_MAX,
  adminErrorMessage, createAdminPlan, derivarPrecios, formatMoneda, normalizeApi,
  parseOrden, updateAdminPlan,
  type AdminPlan, type PlanInput,
} from '../../lib/api';

/** Campos del formulario, que son los que tienen dónde pintar un error. */
type FormField =
  | 'nombre' | 'precio_mensual' | 'descuento_pct'
  | 'vinetas' | 'vinetas_tachadas' | 'trial_texto' | 'orden';

/**
 * Mapeo **explícito** del `field` de un `422` al input de este formulario, con
 * la tabla que estrenó la feature 33 en vez del whitelist de la 32.
 *
 * Son los seis campos que el backend puede rechazar **y** que tienen un input
 * con `helperText` donde enseñar el mensaje. Faltan a propósito:
 *
 * - **`trial_texto`**: el backend lo trunca a `TRIAL_MAX`, no lo rechaza, así
 *   que nunca llega como `field` (igual que `alt` en imágenes).
 * - **`destacado` y `es_custom`**: son `Switch`, no tienen `helperText`. Un cast
 *   crudo (`res.field as FormField`) escribiría el error en un slot que nadie
 *   renderiza y el usuario no vería **nada**; con la tabla caen al aviso global.
 *
 * Lo mismo vale para cualquier nombre que el backend añada o renombre: la tabla
 * es el sitio donde se ve que falta una entrada.
 */
const FIELD_BY_BACKEND: Record<string, FormField> = {
  nombre:           'nombre',
  precio_mensual:   'precio_mensual',
  descuento_pct:    'descuento_pct',
  vinetas:          'vinetas',
  vinetas_tachadas: 'vinetas_tachadas',
  orden:            'orden',
};

/** `''` o texto no numérico → `null`. Acepta decimales: la columna es `NUMERIC(10,2)`. */
function parseImporte(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** Una viñeta por línea; se descartan los espacios y las líneas vacías. */
function parseVinetas(raw: string): string[] {
  return raw.split('\n').map(v => v.trim()).filter(Boolean);
}

function vinetasATexto(vinetas: string[]): string {
  return vinetas.join('\n');
}

interface Props {
  /** `null` con `open` = alta; un plan = edición. */
  plan: AdminPlan | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Alta y edición de un plan de precios (`docs/api-contract.md` §4 quater).
 *
 * Tres reglas del modelo que este formulario respeta:
 *
 * - **`precio_anual` y `ahorro_anual` no aparecen como campos** y **no viajan en
 *   el `POST` ni en el `PATCH`**: el backend los deriva de `precio_mensual` y
 *   `descuento_pct`. `PlanInput` los omite, así que enviarlos ni compilaría.
 *   Aquí solo se muestran, recalculados en vivo con la misma aritmética.
 * - **Un plan a convenir omite las dos cifras**, no las manda en `null`: el
 *   backend valida con `parseDecimal`, que rechaza `null` con un `422`.
 * - El descuento es **por plan**: cada uno tiene el suyo, no hay un porcentaje
 *   global de la sección.
 */
export default function PlanEditDialog({ plan, open, onClose, onSaved }: Props) {
  const [nombre, setNombre]       = useState('');
  const [precio, setPrecio]       = useState('');
  const [descuento, setDescuento] = useState('');
  const [trial, setTrial]         = useState('');
  const [orden, setOrden]         = useState('0');
  const [destacado, setDestacado] = useState(false);
  const [esCustom, setEsCustom]   = useState(false);
  const [vinetas, setVinetas]     = useState('');
  const [tachadas, setTachadas]   = useState('');
  const [errors, setErrors]       = useState<Partial<Record<FormField, string>>>({});
  const [saving, setSaving]       = useState(false);
  const [status, setStatus]       = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  // Cada apertura parte de la fila recibida, o de los valores por defecto del
  // backend si es un alta.
  useEffect(() => {
    if (!open) return;
    // Un plan a convenir no muestra cifras: sus campos arrancan vacíos, no en «0».
    // El backend devuelve `precio_mensual: 0` en esos planes, y transcribirlo
    // aquí sería reintroducir el «$0» que `es_custom` existe para evitar.
    setNombre(plan?.nombre ?? '');
    setPrecio(plan && !plan.es_custom ? String(plan.precio_mensual) : '');
    setDescuento(plan && !plan.es_custom ? String(plan.descuento_pct) : '0');
    setTrial(plan?.trial_texto ?? '');
    setOrden(String(plan?.orden ?? 0));
    setDestacado(plan?.destacado ?? false);
    setEsCustom(plan?.es_custom ?? false);
    setVinetas(vinetasATexto(plan?.vinetas ?? []));
    setTachadas(vinetasATexto(plan?.vinetas_tachadas ?? []));
    setErrors({});
    setStatus(null);
  }, [plan, open]);

  if (!open) return null;

  const clearError = (field: FormField) => {
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const precioNum = parseImporte(precio);
  const descuentoNum = parseImporte(descuento);

  // Vista previa de los dos derivados, con la aritmética exacta del backend.
  const calculado = !esCustom && precioNum !== null && descuentoNum !== null && descuentoNum <= 100
    ? derivarPrecios({ precio_mensual: precioNum, descuento_pct: descuentoNum, es_custom: esCustom })
    : null;
  // `derivarPrecios` devuelve `null` en los dos campos si el plan es a convenir:
  // sin ambos números no se pinta ninguna cifra, nunca un cero de relleno.
  const derivado = calculado && calculado.precio_anual !== null && calculado.ahorro_anual !== null
    ? { precioAnual: calculado.precio_anual, ahorroAnual: calculado.ahorro_anual }
    : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const next: Partial<Record<FormField, string>> = {};
    if (!nombre.trim()) next.nombre = 'nombre requerido';
    if (!esCustom) {
      if (precioNum === null) next.precio_mensual = 'precio_mensual debe ser un número';
      if (descuentoNum === null || descuentoNum > 100) next.descuento_pct = 'descuento_pct debe ser un número entre 0 y 100';
    }
    const ordenNum = parseOrden(orden);
    if (ordenNum === null) next.orden = ORDEN_ERROR;
    setErrors(next);
    if (Object.keys(next).length > 0 || ordenNum === null) return;

    // Las dos cifras se OMITEN en un plan a convenir. Mandarlas en `null` es un
    // 422 seguro (`parseDecimal(null)` → `null`); omitirlas deja que el POST
    // aplique el default del backend y que el PATCH conserve lo guardado.
    const cifras = !esCustom && precioNum !== null && descuentoNum !== null
      ? { precio_mensual: precioNum, descuento_pct: descuentoNum }
      : {};

    const payload: PlanInput = {
      nombre: nombre.trim(),
      ...cifras,
      vinetas: parseVinetas(vinetas),
      vinetas_tachadas: parseVinetas(tachadas),
      destacado,
      trial_texto: trial.trim() || null,
      es_custom: esCustom,
      orden: ordenNum,
    };

    setSaving(true);
    const res = plan
      ? await normalizeApi(updateAdminPlan(plan.id, payload), 'plan', 'No pudimos guardar los cambios')
      : await normalizeApi(createAdminPlan(payload), 'plan', 'No pudimos crear el plan');
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
      <DialogTitle sx={{ fontWeight: 700 }}>{plan ? 'Editar plan' : 'Nuevo plan'}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Nombre"
              value={nombre}
              onChange={e => { setNombre(e.target.value); clearError('nombre'); }}
              error={!!errors.nombre}
              helperText={errors.nombre}
              inputProps={{ 'aria-label': 'Nombre', autoComplete: 'off', maxLength: PLAN_NOMBRE_MAX }}
              disabled={saving}
              autoFocus
            />

            <FormControlLabel
              control={
                <Switch
                  checked={esCustom}
                  onChange={e => { setEsCustom(e.target.checked); setErrors({}); }}
                  inputProps={{ 'aria-label': 'Plan a convenir' }}
                  disabled={saving}
                />
              }
              label="Plan a convenir (Custom)"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: -1 }}>
              Un plan a convenir no publica ninguna cifra: la landing muestra «Custom» en
              lugar del precio y no se calcula ningún ahorro.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Precio mensual"
                value={precio}
                onChange={e => { setPrecio(e.target.value); clearError('precio_mensual'); }}
                error={!!errors.precio_mensual}
                helperText={errors.precio_mensual ?? 'En dólares, sin símbolo.'}
                inputProps={{ 'aria-label': 'Precio mensual', inputMode: 'decimal' }}
                disabled={saving || esCustom}
                sx={{ flexGrow: 1 }}
              />
              <TextField
                label="Descuento anual (%)"
                value={descuento}
                onChange={e => { setDescuento(e.target.value); clearError('descuento_pct'); }}
                error={!!errors.descuento_pct}
                helperText={errors.descuento_pct ?? 'De 0 a 100. Es propio de este plan.'}
                inputProps={{ 'aria-label': 'Descuento anual', inputMode: 'decimal' }}
                disabled={saving || esCustom}
                sx={{ flexGrow: 1 }}
              />
            </Stack>

            <Box
              data-testid="derivados"
              sx={{ bgcolor: 'surface.soft', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Calculado automáticamente</Typography>
              {esCustom ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Sin cifras: este plan es a convenir.
                </Typography>
              ) : derivado ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Precio anual:{' '}
                    <Box component="span" data-testid="derivado-precio-anual" sx={{ color: 'text.primary', fontWeight: 700 }}>
                      {formatMoneda(derivado.precioAnual)}
                    </Box>{' '}
                    al mes, facturado anualmente.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Ahorro anual:{' '}
                    <Box component="span" data-testid="derivado-ahorro-anual" sx={{ color: 'success.main', fontWeight: 700 }}>
                      {formatMoneda(derivado.ahorroAnual)}
                    </Box>{' '}
                    al año.
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Completa el precio mensual y el descuento para ver el cálculo.
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                El precio anual y el ahorro los deriva el backend del precio mensual y del
                descuento: no se editan, no se guardan y no se envían.
              </Typography>
            </Box>

            <TextField
              label="Viñetas incluidas"
              value={vinetas}
              onChange={e => { setVinetas(e.target.value); clearError('vinetas'); }}
              error={!!errors.vinetas}
              helperText={errors.vinetas ?? 'Una por línea. Se muestran con una palomita en la landing.'}
              inputProps={{ 'aria-label': 'Viñetas incluidas' }}
              disabled={saving}
              multiline
              minRows={4}
            />

            <TextField
              label="Viñetas tachadas"
              value={tachadas}
              onChange={e => { setTachadas(e.target.value); clearError('vinetas_tachadas'); }}
              error={!!errors.vinetas_tachadas}
              helperText={errors.vinetas_tachadas ?? 'Una por línea. Son las que este plan no incluye.'}
              inputProps={{ 'aria-label': 'Viñetas tachadas' }}
              disabled={saving}
              multiline
              minRows={2}
            />

            <TextField
              label="Texto de la prueba gratis"
              value={trial}
              onChange={e => { setTrial(e.target.value); clearError('trial_texto'); }}
              error={!!errors.trial_texto}
              helperText={errors.trial_texto ?? 'Opcional. Déjalo vacío para no mostrar ninguna prueba.'}
              inputProps={{ 'aria-label': 'Texto de la prueba gratis', autoComplete: 'off', maxLength: PLAN_TRIAL_MAX }}
              disabled={saving}
            />

            <TextField
              label="Orden"
              value={orden}
              onChange={e => { setOrden(e.target.value); clearError('orden'); }}
              error={!!errors.orden}
              helperText={errors.orden ?? 'Entero desde 0. Los planes se muestran de menor a mayor.'}
              inputProps={{ 'aria-label': 'Orden', inputMode: 'numeric' }}
              disabled={saving}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={destacado}
                  onChange={e => setDestacado(e.target.checked)}
                  inputProps={{ 'aria-label': 'Plan destacado' }}
                  disabled={saving}
                />
              }
              label="Destacar como «Más popular»"
            />

            {status && <Alert severity={status.kind} role="status">{status.text}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Guardando…' : plan ? 'Guardar cambios' : 'Crear plan'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
