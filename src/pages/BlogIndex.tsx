import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Button, CircularProgress, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Footer from '../components/Footer';
import { BlogCard } from '../components/sections/Blog';
import { listPublicArticles, normalizeApi, type PublicArticle } from '../lib/api';

export default function BlogIndex() {
  const [rows, setRows] = useState<PublicArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const res = await normalizeApi(listPublicArticles({ limit: 50 }), 'rows');
      if (!alive) return;
      if (res.ok && Array.isArray(res.data.rows)) {
        setRows(res.data.rows);
        setError(null);
      } else {
        setRows([]);
        setError('No se pudieron cargar los artículos. Inténtalo de nuevo más tarde.');
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        component="header"
        sx={{
          py: 2,
          borderBottom: '1px solid var(--border)',
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Container sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box component={RouterLink} to="/" sx={{ display: 'inline-flex', alignItems: 'center' }}>
            <Box component="img" src="/logo-maia.svg" alt="MaIA" sx={{ height: 28 }} />
          </Box>
          <Button
            component={RouterLink}
            to="/"
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
          >
            Volver a la home
          </Button>
        </Container>
      </Box>

      <Box component="section" sx={{ py: { xs: 6, md: 9 }, background: 'var(--bg-soft)' }}>
        <Container>
          <Box sx={{ maxWidth: 720, mx: 'auto', textAlign: 'center' }}>
            <Typography variant="overline" color="primary" fontWeight={600}>Blog</Typography>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', md: '3rem' },
                mt: 1,
                mb: 2,
                fontWeight: 700,
                letterSpacing: '-0.025em',
              }}
            >
              Ideas y guías de MaIA
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: { xs: 16, md: 18 } }}>
              Aprende a sacar más a tus agentes de IA: tutoriales, casos de uso y noticias del producto.
            </Typography>
          </Box>
        </Container>
      </Box>

      <Box component="main" sx={{ py: { xs: 5, md: 8 }, flex: 1 }}>
        <Container>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          )}

          {!loading && error && (
            <Alert severity="error" sx={{ maxWidth: 640, mx: 'auto' }}>{error}</Alert>
          )}

          {!loading && !error && rows.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Aún no hay artículos publicados.</Typography>
              <Typography variant="body2">
                Vuelve pronto: nuestro equipo está trabajando en nuevo contenido.
              </Typography>
            </Box>
          )}

          {!loading && !error && rows.length > 0 && (
            <Grid container spacing={3}>
              {rows.map(a => (
                <Grid item xs={12} sm={6} md={4} key={a.id}>
                  <BlogCard article={a} />
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
