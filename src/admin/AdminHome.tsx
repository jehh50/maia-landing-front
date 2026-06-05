import { Box, Typography, Paper, Stack } from '@mui/material';
import { useOutletContext } from 'react-router-dom';
import type { AdminUser } from '../lib/api';

export default function AdminHome() {
  const user = useOutletContext<AdminUser>();

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
          Panel
        </Typography>
        <Typography variant="h4" component="h1" fontWeight={700} letterSpacing="-0.02em">
          Bienvenido, {user.name || user.email}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Desde aquí podrás gestionar leads y contenido del blog de MaIA.
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant="h6" fontWeight={600}>Próximos pasos</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          La sección de <strong>Leads</strong> y el <strong>mantenedor del blog</strong>
          {' '}llegarán en las próximas iteraciones. Por ahora puedes cerrar sesión desde
          la barra lateral o invitar a otros administradores con
          {' '}<code>node scripts/create-user.js</code>.
        </Typography>
      </Paper>
    </Stack>
  );
}
