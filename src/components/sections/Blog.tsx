import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Typography, Grid, Button, Link } from '@mui/material';
import { listPublicArticles, type PublicArticle } from '../../lib/api';
import { useReveal } from '../../hooks/useReveal';

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

function excerptFromArticle(a: PublicArticle, max = 140): string {
  const raw = (a.excerpt && a.excerpt.trim()) || a.body_md || '';
  const clean = raw.replace(/[`*_#>~\-!\[\]()]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

export function BlogCard({ article }: { article: PublicArticle }) {
  const date = formatDate(article.published_at ?? article.created_at);
  return (
    <Link
      component={RouterLink}
      to={`/blog/${article.slug}`}
      underline="none"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        background: '#fff',
        border: '1px solid var(--border)',
        transition: 'all 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(0,0,0,0.08)' },
      }}
    >
      <Box
        sx={{
          height: 180,
          backgroundImage: article.cover_url ? `url(${article.cover_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          background: article.cover_url
            ? undefined
            : 'linear-gradient(135deg, var(--orange) 0%, var(--orange-l) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: 64,
        }}
        aria-hidden={!!article.cover_url}
      >
        {!article.cover_url && (article.title?.[0] ?? 'M').toUpperCase()}
      </Box>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {date && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            {date}
          </Typography>
        )}
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ fontSize: 18, mb: 1, color: 'text.primary', lineHeight: 1.3 }}
        >
          {article.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {excerptFromArticle(article)}
        </Typography>
        <Box sx={{ mt: 2, color: 'primary.main', fontWeight: 600, fontSize: 14 }}>
          Leer artículo →
        </Box>
      </Box>
    </Link>
  );
}

export default function Blog() {
  const [rows, setRows] = useState<PublicArticle[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { ok, data } = await listPublicArticles({ limit: 3 });
      if (!alive) return;
      if (ok && data && 'rows' in data && Array.isArray(data.rows)) {
        setRows(data.rows);
      } else {
        setRows([]);
      }
      setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  useReveal();

  // Graceful degradation: no artículos publicados → no renderizamos nada.
  if (!ready || rows.length === 0) return null;

  return (
    <Box component="section" id="blog" sx={{ py: { xs: 7, md: 10 }, background: 'var(--bg-soft)' }}>
      <Container>
        <Box className="reveal" sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="primary" fontWeight={600}>Blog</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1, mb: 2 }}>
            Ideas y guías de MaIA
          </Typography>
          <Typography color="text.secondary">
            Tips, casos de uso y mejores prácticas para sacarle el máximo a tus agentes de IA.
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {rows.map(a => (
            <Grid item xs={12} sm={6} md={4} key={a.id}>
              <Box className="reveal" sx={{ height: '100%' }}>
                <BlogCard article={a} />
              </Box>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ textAlign: 'center', mt: 5 }}>
          <Button
            component={RouterLink}
            to="/blog"
            variant="outlined"
            size="large"
          >
            Ver todos los artículos
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
