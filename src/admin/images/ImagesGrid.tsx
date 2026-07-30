import { Box, Typography } from '@mui/material';

/**
 * Punto de anclaje de la sección «Imágenes» (andamiaje de la feature 27).
 *
 * La galería real —subida, edición de alt/orden/sección y borrado— llega en la
 * feature 29 y se maquetará con un mock que respeta el contrato del backend,
 * que está cerrado pero aún sin desplegar.
 */
export default function ImagesGrid() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Imágenes</Typography>
      <Typography variant="body2" color="text.secondary">
        Esta sección está en construcción. Pronto podrás administrar las
        imágenes que ilustran la landing.
      </Typography>
    </Box>
  );
}
