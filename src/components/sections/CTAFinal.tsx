import { useEffect, useState } from 'react';
import { Box, Container, Typography, Chip, Button } from '@mui/material';
import { imageRawUrl, listImages, normalizeApi, type AdminImage } from '../../lib/api';

/** Estado de carga explícito, como pide `docs/conventions.md` §5. */
type Estado = 'loading' | 'ok' | 'error';

/** Imagen ya resuelta: la sección no distingue de dónde salió. */
interface Imagen { src: string; alt: string }

/**
 * Respaldo cuando la API no tiene imágenes para la sección `cta_final`
 * (justificación en `progress/impl_36.md`). **No es un respaldo de datos de la
 * API**: es el estado del hueco de la imagen cuando no hay nada que servir.
 */
const CTA_RESPALDO: Imagen = { src: '/maia.png', alt: 'MaIA' };

/**
 * Proporción natural de `/maia.png` (408 × 612). El hueco de la imagen la
 * reserva **siempre**, con o sin datos, para que la respuesta de la API no
 * cambie la altura de la tarjeta: sin ella, montar la imagen tarde empujaría el
 * texto y el CTA. Una imagen de la API con otra proporción se ajusta dentro
 * (`objectFit: 'contain'`) en vez de deformar la tarjeta.
 */
const RATIO_IMAGEN = '408 / 612';

/**
 * CTA final de la landing. Desde la feature 36 su imagen sale del endpoint
 * **público** `GET /api/images?seccion=cta_final` (`docs/api-contract.md` §4 ter)
 * en vez del estático `/maia.png`.
 *
 * - La URL del binario se construye con `imageRawUrl(id)`: el JSON no trae
 *   ningún campo `url`. El `alt` sale del campo `alt` (y `null` ⇒ decorativa).
 * - El listado llega ordenado por el backend (`orden ASC, id ASC`) y **esta
 *   sección tiene un solo hueco de imagen**: se pinta la **primera** fila, sin
 *   reordenar ni elegir por `id`.
 * - **Fallback (acceptance 2):** con `rows: []`, error HTTP o fallo de red no se
 *   pinta ninguna imagen de la API; el hueco cae a `CTA_RESPALDO`. La tarjeta
 *   nunca queda con un marco vacío ni cambia de alto, y mientras carga no hay
 *   ninguna `<img>` (imposible el icono de imagen partida).
 */
export default function CTAFinal() {
  const [estado, setEstado] = useState<Estado>('loading');
  const [imagenes, setImagenes] = useState<AdminImage[]>([]);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      // El mensaje de error no se muestra: el visitante ve el respaldo, no un
      // aviso de API en mitad del cierre de la landing.
      const res = await normalizeApi(listImages({ seccion: 'cta_final' }), 'rows');
      if (!vigente) return;
      setImagenes(res.ok ? res.data.rows : []);
      setEstado(res.ok ? 'ok' : 'error');
    })();
    return () => { vigente = false; };
  }, []);

  const primera = imagenes[0];
  const imagen: Imagen | null =
    estado === 'loading'
      ? null
      : primera
        ? { src: imageRawUrl(primera.id), alt: primera.alt ?? '' }
        : CTA_RESPALDO;

  return (
    <Box component="section" id="cta-final" sx={{ py: { xs: 7, md: 10 } }}>
      <Container>
        <Box className="reveal" sx={{
          borderRadius: 4, p: { xs: 5, md: 8 }, color: 'common.white',
          background: 'linear-gradient(135deg, var(--orange) 0%, var(--orange-h) 100%)',
          boxShadow: '0 20px 60px rgba(255, 255, 255, 0.3)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          gap: { xs: 4, md: 6 },
        }}>
          {/* Texto */}
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
            <Chip label="Sin riesgos" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'common.white', fontWeight: 600, mb: 3 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.6rem' }, color: 'common.white', mb: 1.5 }}>
              Empieza hoy.<br />Tu equipo lo agradecerá.
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.9)', mb: 3 }}>
              Setup en 30 minutos. Tu primer agente activo desde el día uno.
            </Typography>
            <Button
              variant="contained"
              size="large"
              href="https://app.maiabuilder.ai/login"
              target="_blank"
              sx={{ bgcolor: 'common.white', color: 'primary.main', '&:hover': { bgcolor: 'common.white' } }}
            >
              Iniciar ahora
            </Button>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mt: 2 }}>
              Al registrarte aceptas nuestros Términos y Privacidad.
            </Typography>
          </Box>

          {/* Imagen: el hueco reserva su proporción aunque aún no haya imagen. */}
          <Box
            data-testid="cta-imagen"
            sx={{
              flexShrink: 0,
              width: { xs: '80%', sm: 320, md: 340 },
              maxWidth: '100%',
              aspectRatio: RATIO_IMAGEN,
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            {imagen && (
              <Box
                component="img"
                src={imagen.src}
                alt={imagen.alt}
                sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
