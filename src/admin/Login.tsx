import { useState } from 'react';
import {
  Box, Stack, TextField, Button, Typography, Alert, Paper,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, EMAIL_RE } from '../lib/api';

interface LocationState { from?: { pathname?: string } }

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as LocationState | null)?.from?.pathname || '/admin';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus]     = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const validate = (): boolean => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim())                       next.email    = 'Email requerido';
    else if (!EMAIL_RE.test(email.trim()))   next.email    = 'Email inválido';
    if (!password)                           next.password = 'Contraseña requerida';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!validate()) return;
    setSubmitting(true);
    const { ok, status: code, data } = await login(email.trim(), password);
    setSubmitting(false);
    if (ok) {
      setStatus({ kind: 'success', text: 'Sesión iniciada. Redirigiendo…' });
      navigate(fromPath, { replace: true });
      return;
    }
    const errMsg = data && 'error' in data && data.error
      ? data.error
      : code === 401
        ? 'Credenciales inválidas'
        : 'No pudimos iniciar sesión. Intenta de nuevo.';
    setStatus({ kind: 'error', text: errMsg });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'surface.soft',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" component="h1" fontWeight={700} letterSpacing="-0.02em">
              Acceso administradores
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Inicia sesión para gestionar leads y contenido de MaIA.
            </Typography>
          </Box>

          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
                error={!!errors.email}
                helperText={errors.email}
                inputProps={{ 'aria-label': 'Email', autoComplete: 'username' }}
                disabled={submitting}
                autoFocus
              />
              <TextField
                label="Contraseña"
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
                error={!!errors.password}
                helperText={errors.password}
                inputProps={{ 'aria-label': 'Contraseña', autoComplete: 'current-password' }}
                disabled={submitting}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                sx={{ mt: 0.5 }}
              >
                {submitting ? 'Entrando…' : 'Iniciar sesión'}
              </Button>

              {status && (
                <Alert severity={status.kind} role="status">
                  {status.text}
                </Alert>
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
