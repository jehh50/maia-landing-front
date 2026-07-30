import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, Chip, Stack, Link,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { AdminLead } from '../../lib/api';
import { tokens } from '../../theme/tokens';

interface Props {
  open: boolean;
  lead: AdminLead | null;
  onClose: () => void;
}

const Field = ({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) => (
  <Box>
    <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11, fontWeight: 600 }}>{label}</Typography>
    <Box sx={{ fontSize: 14, color: 'text.primary', mt: 0.25 }}>
      {children ?? value ?? <em style={{ color: tokens.text.disabled }}>—</em>}
    </Box>
  </Box>
);

export default function LeadDetailDialog({ open, lead, onClose }: Props) {
  if (!lead) return null;
  const waLink = lead.telefono ? `https://wa.me/${lead.telefono.replace(/^\+/, '')}` : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pr: 6, pt: 3, pb: 1 }}>
        <Typography variant="h6" component="div" fontWeight={700}>
          {lead.nombre || lead.email}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Chip size="small" label={lead.tipo} color={lead.tipo === 'demo' ? 'primary' : 'default'} />
          {lead.pais_iso && <Chip size="small" label={`${lead.pais} (${lead.pais_iso})`} variant="outlined" />}
        </Stack>
        <IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Field label="Empresa"   value={lead.empresa} />
            <Field label="Industria" value={lead.industria} />
            <Field label="Email">
              <Link href={`mailto:${lead.email}`}>{lead.email}</Link>
            </Field>
            <Field label="Teléfono">
              {waLink
                ? <Link href={waLink} target="_blank" rel="noopener">{lead.telefono}</Link>
                : lead.telefono || <em style={{ color: tokens.text.disabled }}>—</em>}
            </Field>
            <Field label="Fecha" value={new Date(lead.created_at).toLocaleString('es-MX')} />
            <Field label="ID" value={String(lead.id)} />
          </Box>
          <Field label="Comentarios">
            <Box sx={{ whiteSpace: 'pre-wrap', fontSize: 14, mt: 0.5 }}>
              {lead.mensaje || <em style={{ color: tokens.text.disabled }}>(sin comentarios)</em>}
            </Box>
          </Field>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
