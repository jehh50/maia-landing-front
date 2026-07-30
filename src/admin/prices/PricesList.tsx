import { Box, Typography } from '@mui/material';

/**
 * Punto de anclaje de la sección «Precios» (andamiaje de la feature 27).
 *
 * El mantenedor real —los cuatro planes y el porcentaje de descuento anual—
 * llega en la feature 30 y se maquetará sobre la interfaz `Plan` que ya usa la
 * landing; el backend todavía no tiene nada de este recurso.
 */
export default function PricesList() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Precios</Typography>
      <Typography variant="body2" color="text.secondary">
        Esta sección está en construcción. Pronto podrás ajustar los planes y el
        descuento del pago anual sin tocar código.
      </Typography>
    </Box>
  );
}
