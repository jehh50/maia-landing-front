import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ContactModal from '../components/ContactModal';

export default function NotFound() {
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    document.title = 'Página no encontrada · MaIA';
    window.scrollTo(0, 0);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenContact={() => setContactOpen(true)} />

      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          pt: { xs: 14, md: 18 },
          pb: { xs: 8, md: 12 },
          bgcolor: 'surface.soft',
        }}
      >
        <Container>
          <Box sx={{ maxWidth: 640, mx: 'auto', textAlign: 'center' }}>
            <Typography
              component="p"
              sx={{
                fontSize: { xs: '4.5rem', md: '6rem' },
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: 'primary.main',
              }}
            >
              404
            </Typography>
            <Typography
              variant="h1"
              sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 2, mb: 1.5 }}
            >
              Página no encontrada
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: { xs: 15, md: 17 } }}>
              La dirección que abriste no existe o cambió de sitio. Vuelve al inicio para
              seguir explorando MaIA.
            </Typography>
            <Button
              component={RouterLink}
              to="/"
              variant="contained"
              size="large"
              startIcon={<ArrowBackIcon />}
              sx={{ mt: 4 }}
            >
              Volver al inicio
            </Button>
          </Box>
        </Container>
      </Box>

      <Footer />

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} tipo="demo" />
    </Box>
  );
}
