import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Skeleton, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Footer from '../components/Footer';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { getPublicArticleBySlug, type PublicArticle } from '../lib/api';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return '';
  }
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; article: PublicArticle }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string };

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    if (!slug) {
      setState({ kind: 'not-found' });
      return;
    }
    let alive = true;
    setState({ kind: 'loading' });
    (async () => {
      const { ok, status, data } = await getPublicArticleBySlug(slug);
      if (!alive) return;
      if (ok && data && 'article' in data && data.article) {
        setState({ kind: 'ok', article: data.article });
      } else if (status === 404) {
        setState({ kind: 'not-found' });
      } else {
        setState({ kind: 'error', message: 'No se pudo cargar el artículo.' });
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        component="header"
        sx={{
          py: 2,
          borderBottom: '1px solid var(--border)',
          background: '#fff',
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
            to="/blog"
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
          >
            Volver al blog
          </Button>
        </Container>
      </Box>

      <Box component="main" sx={{ py: { xs: 5, md: 8 }, flex: 1 }}>
        <Container sx={{ maxWidth: '720px !important' }}>
          {state.kind === 'loading' && (
            <Box>
              <Skeleton variant="rounded" height={260} sx={{ mb: 3 }} />
              <Skeleton variant="text" height={60} width="80%" />
              <Skeleton variant="text" height={24} width="40%" sx={{ mb: 3 }} />
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} width="92%" />
            </Box>
          )}

          {state.kind === 'not-found' && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 1.5 }}>
                Artículo no encontrado
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                El artículo que buscas no existe o aún no se ha publicado.
              </Typography>
              <Button
                component={RouterLink}
                to="/blog"
                variant="contained"
                startIcon={<ArrowBackIcon />}
              >
                Volver al blog
              </Button>
            </Box>
          )}

          {state.kind === 'error' && (
            <Alert severity="error">{state.message}</Alert>
          )}

          {state.kind === 'ok' && (
            <Box component="article">
              {state.article.cover_url && (
                <Box
                  component="img"
                  src={state.article.cover_url}
                  alt={state.article.title}
                  sx={{
                    width: '100%',
                    maxHeight: 420,
                    objectFit: 'cover',
                    borderRadius: 3,
                    mb: 4,
                  }}
                />
              )}
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2rem', md: '2.6rem' },
                  fontWeight: 700,
                  letterSpacing: '-0.025em',
                  mb: 1.5,
                }}
              >
                {state.article.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 4 }}>
                {formatDate(state.article.published_at ?? state.article.created_at)}
              </Typography>
              <MarkdownRenderer body={state.article.body_md || ''} />
            </Box>
          )}
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
