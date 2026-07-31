import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Stack, Switch, TextField, Typography,
} from '@mui/material';
import {
  derivarPrecios, formatMoneda, parseImporte, parseOrden, parseVinetas, updateMockPlan, vinetasATexto,
  type MockPlan, type MockPlanField,
} from './mockPrices';

interface Props {
  /** `null` = diálogo cerrado. El padre lo monta siempre. */
  plan: MockPlan | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Edición de un plan de precios.
 *
 * **`precio_anual` y `ahorro_anual` no aparecen como campos**: el backend los
 * deriva de `precio_mensual` y `descuento_pct` (`docs/api-contract.md` §10.4) y
 * no viajan en el `PATCH`. Aquí solo se muestran, recalculados en vivo con la
 * misma aritmética, para que se vea el efecto de lo que se está editando.
 *
 * El descuento es **por plan**: cada uno tiene el suyo, no hay un porcentaje
 * global de la sección.
 */
export default function PlanEditDialog({ plan, onClose, onSaved }: Props) {
  const [nombre, setNombre]       = useState('');
  const [precio, setPrecio]       = useState('');
  const [descuento, setDescuento] = useState('');
  const [trial, setTrial]         = useState('');
  const [orden, setOrden]         = useState('0');
  const [destacado, setDestacado] = useState(false);
  const [esCustom, setEsCustom]   = useState(false);
  const [vinetas, setVinetas]     = useState('');
  const [tachadas, setTachadas]   = useState('');
  const [errors, setErrors]       = useState<Partial<Record<MockPlanField, string>>>({});
  const [saving, setSaving]       = useState(false);
  const [status, setStatus]       = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  // Cada apertura parte de la fila recibida.
  useEffect(() => {
    if (!plan) return;
    setNombre(plan.nombre);
    // Un plan a convenir no guarda cifras: sus campos arrancan vacíos, no en «0».
    setPrecio(plan.es_custom ? '' : String(plan.precio_mensual));
    setDescuento(plan.es_custom ? '' : String(plan.descuento_pct));
    setTrial(plan.trial_texto ?? '');
    setOrden(String(plan.orden));
    setDestacado(plan.destacado);
    setEsCustom(plan.es_custom);
    setVinetas(vinetasATexto(plan.vinetas));
    setTachadas(vinetasATexto(plan.vinetas_tachadas));
    setErrors({});
    setStatus(null);
  }, [plan]);

  if (!plan) return null;

  const clearError = (field: MockPlanField) => {
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

    const next: Partial<Record<MockPlanField, string>> = {};
    if (!nombre.trim()) next.nombre = 'Nombre requerido';
    if (!esCustom) {
      if (precioNum === null) next.precio_mensual = 'El precio mensual debe ser un número mayor o igual que 0';
      if (descuentoNum === null || descuentoNum > 100) next.descuento_pct = 'El descuento debe ser un número entre 0 y 100';
    }
    const ordenNum = parseOrden(orden);
    if (ordenNum === null) next.orden = 'El orden debe ser un entero mayor o igual que 0';
    setErrors(next);
    if (Object.keys(next).length > 0 || ordenNum === null) return;

    setSaving(true);
    const res = await updateMockPlan(plan.id, {
      nombre: nombre.trim(),
      precio_mensual: esCustom ? null : precioNum,
      descuento_pct: esCustom ? null : descuentoNum,
      vinetas: parseVinetas(vinetas),
      vinetas_tachadas: parseVinetas(tachadas),
      destacado,
      trial_texto: trial.trim() || null,
      es_custom: esCustom,
      orden: ordenNum,
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
      <DialogTitle sx={{ fontWeight: 700 }}>Editar plan</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Nombre"
              value={nombre}
              onChange={e => { setNombre(e.target.value); clearError('nombre'); }}
              error={!!errors.nombre}
              helperText={errors.nombre}
              inputProps={{ 'aria-label': 'Nombre', autoComplete: 'off' }}
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
              Un plan a convenir no guarda ninguna cifra: la landing muestra «Custom» en
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
                descuento: no se editan ni se guardan.
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
              inputProps={{ 'aria-label': 'Texto de la prueba gratis', autoComplete: 'off' }}
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
                  onChange={e => { setDestacado(e.target.checked); clearError('destacado'); }}
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
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
