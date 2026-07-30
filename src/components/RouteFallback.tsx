import { Box, CircularProgress } from '@mui/material';

interface Props {
  /**
   * Alto reservado por el placeholder. Por defecto ocupa el viewport completo
   * (rutas de primer nivel, que renderizan su propia página entera); las rutas
   * anidadas del admin pasan un alto menor porque viven dentro del layout.
   */
  minHeight?: number | string;
}

/**
 * Fallback de `<Suspense>` para las rutas cargadas con `React.lazy`.
 *
 * Reserva alto para que el contenido real entre sin desplazar el layout, y usa
 * los tokens del tema (`surface.soft`, `primary.main`) para que la transición
 * no muestre un rectángulo blanco ajeno a la paleta.
 */
export default function RouteFallback({ minHeight = '100vh' }: Props) {
  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      sx={{
        minHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'surface.soft',
      }}
    >
      <CircularProgress sx={{ color: 'primary.main' }} />
    </Box>
  );
}
