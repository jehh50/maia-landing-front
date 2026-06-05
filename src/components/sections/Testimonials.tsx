import { Box, Container, Typography, Grid, Avatar } from '@mui/material';

const items = [
  { q: '“Reducimos un 60% el tiempo de respuesta y duplicamos los tickets cerrados sin contratar más gente.”', a: 'Mariana López', r: 'Head of Customer Support, RetailCo' },
  { q: '“El SDR virtual califica 3× más leads que mi equipo y agenda demos sin que yo mueva un dedo.”',          a: 'Diego Vargas',  r: 'VP Sales, FinTechMX' },
  { q: '“Tomamos 2 semanas en lanzar nuestro primer agente. Hoy tenemos 4 productivos y crecemos.”',              a: 'Carolina Ruiz', r: 'COO, EduStartup' },
];

export default function Testimonials() {
  return (
    <Box component="section" id="testimonials" sx={{ py: { xs: 7, md: 10 }, background: 'linear-gradient(180deg, var(--bg-soft) 0%, #FFFFFF 30%, #FFFFFF 70%, var(--bg-soft) 100%)' }}>
      <Container>
        <Box className="reveal" sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="primary" fontWeight={600}>Casos de éxito</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1 }}>Lo que dicen nuestros clientes</Typography>
        </Box>
        <Grid container spacing={3}>
          {items.map(t => (
            <Grid item xs={12} md={4} key={t.a}>
              <Box className="reveal" sx={{
                p: 4, height: '100%', borderRadius: 3, background: '#fff',
                border: '1px solid var(--border)',
              }}>
                <Typography sx={{ fontSize: 16, color: 'text.primary', mb: 3, lineHeight: 1.6 }}>{t.q}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>{t.a[0]}</Avatar>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{t.a}</Typography>
                    <Typography variant="caption" color="text.secondary">{t.r}</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
