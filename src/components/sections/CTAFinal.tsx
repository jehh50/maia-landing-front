import { Box, Container, Typography, Chip, Button } from '@mui/material';

export default function CTAFinal() {
  return (
    <Box component="section" id="cta-final" sx={{ py: { xs: 7, md: 10 } }}>
      <Container>
        <Box className="reveal" sx={{
          textAlign: 'center', borderRadius: 4, p: { xs: 5, md: 8 }, color: '#fff',
          background: 'linear-gradient(135deg, var(--orange) 0%, var(--orange-h) 100%)',
          boxShadow: '0 20px 60px rgba(232,68,10,0.30)',
        }}>
          <Chip label="Sin riesgos" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, mb: 3 }} />
          <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.6rem' }, color: '#fff', mb: 1.5 }}>
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
            sx={{ bgcolor: '#fff', color: 'primary.main', '&:hover': { bgcolor: '#fff' } }}
          >
            Iniciar ahora
          </Button>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mt: 2 }}>
            Al registrarte aceptas nuestros Términos y Privacidad.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
