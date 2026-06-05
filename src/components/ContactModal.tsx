import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box,
  TextField, Button, Typography, Alert, Stack,
  MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { MuiTelInput } from 'mui-tel-input';
import { postLead, EMAIL_RE, PHONE_RE, type LeadType } from '../lib/api';
import { INDUSTRIES } from '../lib/industries';

export interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  tipo?: LeadType;
}

interface FormState {
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  industria: string;
  mensaje: string;
}

const empty: FormState = {
  nombre: '', empresa: '', email: '', telefono: '', industria: '', mensaje: '',
};

export default function ContactModal({ open, onClose, tipo = 'demo' }: ContactModalProps) {
  const [form, setForm]       = useState<FormState>(empty);
  const [errors, setErrors]   = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus]   = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setForm(empty);
      setErrors({});
      setStatus(null);
      setSubmitting(false);
    }
  }, [open]);

  const copy = useMemo(() => (tipo === 'contacto'
    ? { title: 'Hablemos con ventas', sub: 'Cuéntanos qué necesitas y te contactamos en menos de 24 horas.' }
    : { title: 'Agenda un demo de MaIA', sub: 'Cuéntanos sobre ti y un especialista te contactará en menos de 24 horas.' }
  ), [tipo]);

  const onField = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }));
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: undefined }));
  };

  const onPhone = (value: string) => {
    setForm(prev => ({ ...prev, telefono: value }));
    if (errors.telefono) setErrors(prev => ({ ...prev, telefono: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.nombre.trim()) next.nombre = 'Tu nombre es requerido';
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Email inválido';
    const phoneNormalized = form.telefono.replace(/[\s\-()]/g, '');
    if (!phoneNormalized) {
      next.telefono = 'Tu teléfono es requerido';
    } else if (!PHONE_RE.test(phoneNormalized)) {
      next.telefono = 'Teléfono inválido';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!validate()) {
      setStatus({ kind: 'error', text: 'Revisa los campos resaltados.' });
      return;
    }
    setSubmitting(true);
    const { ok, data } = await postLead({
      nombre:    form.nombre.trim(),
      empresa:   form.empresa.trim(),
      email:     form.email.trim(),
      telefono:  form.telefono.replace(/\s/g, ''),
      industria: form.industria.trim(),
      mensaje:   form.mensaje.trim(),
      tipo,
    });
    setSubmitting(false);
    if (ok) {
      setStatus({ kind: 'success', text: '¡Gracias! Te contactaremos en menos de 24 horas.' });
      setForm(empty);
      setTimeout(onClose, 2200);
    } else {
      const errMsg = data && 'error' in data ? data.error : 'No pudimos enviar tu solicitud. Inténtalo de nuevo.';
      setStatus({ kind: 'error', text: errMsg });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="contact-modal-title"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle id="contact-modal-title" sx={{ pr: 6, pt: 3.5, pb: 0.5 }}>
        <Typography variant="h5" component="div" fontWeight={700} letterSpacing="-0.02em">
          {copy.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {copy.sub}
        </Typography>
        <IconButton
          aria-label="Cerrar"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        <Box component="form" onSubmit={onSubmit} noValidate sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Nombre *"
                inputProps={{ 'aria-label': 'Nombre', autoComplete: 'name' }}
                value={form.nombre}
                onChange={onField('nombre')}
                error={!!errors.nombre}
                helperText={errors.nombre}
                disabled={submitting}
              />
              <TextField
                label="Empresa"
                inputProps={{ 'aria-label': 'Empresa', autoComplete: 'organization' }}
                value={form.empresa}
                onChange={onField('empresa')}
                disabled={submitting}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Email corporativo *"
                type="email"
                inputProps={{ 'aria-label': 'Email', autoComplete: 'email' }}
                value={form.email}
                onChange={onField('email')}
                error={!!errors.email}
                helperText={errors.email}
                disabled={submitting}
              />
              <MuiTelInput
                label="Teléfono *"
                value={form.telefono}
                onChange={onPhone}
                defaultCountry="MX"
                preferredCountries={['MX', 'CO', 'PE', 'CL', 'AR', 'VE', 'US', 'ES']}
                fullWidth
                size="small"
                error={!!errors.telefono}
                helperText={errors.telefono}
                disabled={submitting}
              />
            </Stack>

            <TextField
              select
              label="Tipo de industria"
              inputProps={{ 'aria-label': 'Industria' }}
              value={form.industria}
              onChange={onField('industria')}
              disabled={submitting}
              helperText="Opcional"
            >
              <MenuItem value="">
                <em>— sin especificar —</em>
              </MenuItem>
              {INDUSTRIES.map(i => (
                <MenuItem key={i} value={i}>{i}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Comentarios"
              inputProps={{ 'aria-label': 'Comentarios' }}
              multiline
              minRows={3}
              placeholder="Ej: Automatizar atención de soporte y calificación de leads"
              value={form.mensaje}
              onChange={onField('mensaje')}
              disabled={submitting}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ mt: 1 }}
            >
              {submitting ? 'Enviando…' : status?.kind === 'success' ? '✓ Enviado' : 'Enviar solicitud →'}
            </Button>

            {status && (
              <Alert severity={status.kind} role="status">
                {status.text}
              </Alert>
            )}

            <Typography variant="caption" color="text.secondary" align="center">
              Al enviar aceptas nuestros Términos y Política de Privacidad.
            </Typography>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
