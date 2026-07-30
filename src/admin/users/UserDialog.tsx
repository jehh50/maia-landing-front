import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, TextField,
} from '@mui/material';
import { EMAIL_RE } from '../../lib/api';
import {
  createMockUser, updateMockUser,
  type MockUser, type MockUserField, type MockUserInput,
} from './mockUsers';

interface Props {
  open: boolean;
  /** `null` = alta; una fila = edición. */
  user: MockUser | null;
  onClose: () => void;
  onSaved: () => void;
}

const ROLES: { value: MockUser['role']; label: string; hint: string }[] = [
  { value: 'admin',  label: 'Administrador', hint: 'Acceso completo al panel: leads, blog y usuarios.' },
  { value: 'editor', label: 'Editor',        hint: 'Solo accede a la sección de Blog.' },
];

const EMPTY: MockUserInput = { email: '', name: '', role: 'editor', password: '' };

const MAX_NAME = 120;

export default function UserDialog({ open, user, onClose, onSaved }: Props) {
  const isNew = user === null;
  const [form, setForm]       = useState<MockUserInput>(EMPTY);
  const [errors, setErrors]   = useState<Partial<Record<MockUserField, string>>>({});
  const [saving, setSaving]   = useState(false);
  const [status, setStatus]   = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  // Cada apertura del diálogo parte de cero: alta en blanco, edición con la fila.
  useEffect(() => {
    if (!open) return;
    setForm(user ? { email: user.email, name: user.name, role: user.role, password: '' } : EMPTY);
    setErrors({});
    setStatus(null);
  }, [open, user]);

  const clearError = (field: MockUserField) => {
    setErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const validate = (): boolean => {
    const next: Partial<Record<MockUserField, string>> = {};
    const email = form.email.trim();
    if (!email)                     next.email = 'Email requerido';
    else if (!EMAIL_RE.test(email)) next.email = 'Email inválido';
    if (form.name.trim().length > MAX_NAME) next.name = `Máximo ${MAX_NAME} caracteres`;
    if (isNew && !form.password)    next.password = 'Contraseña requerida';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!validate()) return;
    setSaving(true);
    const payload: MockUserInput = {
      email: form.email.trim().toLowerCase(),
      name: form.name.trim(),
      role: form.role,
      password: form.password || undefined,
    };
    const res = user
      ? await updateMockUser(user.id, payload)
      : await createMockUser(payload);
    setSaving(false);
    if (res.ok) {
      onSaved();
      return;
    }
    const { error, field } = res;
    if (field) setErrors(prev => ({ ...prev, [field]: error }));
    else       setStatus({ kind: 'error', text: error });
  };

  const roleHint = ROLES.find(r => r.value === form.role)?.hint ?? '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{isNew ? 'Nuevo usuario' : 'Editar usuario'}</DialogTitle>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={e => { setForm(p => ({ ...p, email: e.target.value })); clearError('email'); }}
              error={!!errors.email}
              helperText={errors.email}
              inputProps={{ 'aria-label': 'Email', autoComplete: 'off' }}
              disabled={saving}
              autoFocus
            />
            <TextField
              label="Nombre"
              value={form.name}
              onChange={e => { setForm(p => ({ ...p, name: e.target.value })); clearError('name'); }}
              error={!!errors.name}
              helperText={errors.name ?? 'Opcional. Es el nombre que se muestra en el panel.'}
              inputProps={{ 'aria-label': 'Nombre', autoComplete: 'off' }}
              disabled={saving}
            />
            <TextField
              select
              label="Rol"
              value={form.role}
              onChange={e => { setForm(p => ({ ...p, role: e.target.value as MockUser['role'] })); clearError('role'); }}
              error={!!errors.role}
              helperText={errors.role ?? roleHint}
              inputProps={{ 'aria-label': 'Rol' }}
              disabled={saving}
            >
              {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>
            <TextField
              label="Contraseña"
              type="password"
              value={form.password ?? ''}
              onChange={e => { setForm(p => ({ ...p, password: e.target.value })); clearError('password'); }}
              error={!!errors.password}
              helperText={
                errors.password ?? (isNew
                  ? 'Se le pedirá al iniciar sesión en el panel.'
                  : 'Déjala vacía para conservar la actual.')
              }
              inputProps={{ 'aria-label': 'Contraseña', autoComplete: 'new-password' }}
              disabled={saving}
            />
            {status && <Alert severity={status.kind} role="status">{status.text}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Guardando…' : isNew ? 'Crear usuario' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
