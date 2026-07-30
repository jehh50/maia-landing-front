import { Box, Typography } from '@mui/material';

/**
 * Punto de anclaje de la sección «Usuarios» (andamiaje de la feature 27).
 *
 * El listado real —búsqueda, alta, edición y borrado con confirmación— llega en
 * la feature 28 y se alimentará de un mock local: el backend todavía no expone
 * ningún endpoint de usuarios.
 */
export default function UsersList() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Usuarios</Typography>
      <Typography variant="body2" color="text.secondary">
        Esta sección está en construcción. Pronto podrás dar de alta, editar y
        dar de baja a las personas con acceso al panel.
      </Typography>
    </Box>
  );
}
