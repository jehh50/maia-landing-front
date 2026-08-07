import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Typography, Button, ToggleButton, ToggleButtonGroup } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Footer from '../components/Footer';
import type { LegalDoc, Lang } from './legal/legalDocs';

interface LegalPageProps { doc: LegalDoc; }

const LANG_KEY = 'maia-legal-lang';

const ui: Record<Lang, { legal: string; updated: string; back: string }> = {
  es: { legal: 'Legal', updated: 'Última actualización', back: 'Volver al home' },
  en: { legal: 'Legal', updated: 'Last updated', back: 'Back to home' },
};

function initialLang(): Lang {
  if (typeof window === 'undefined') return 'es';
  const saved = window.localStorage.getItem(LANG_KEY);
  return saved === 'en' ? 'en' : 'es';
}

export default function LegalPage({ doc }: LegalPageProps) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const content = doc[lang];
  const t = ui[lang];

  useEffect(() => {
    document.title = `${content.title} · MaIA`;
    window.scrollTo(0, 0);
  }, [content.title]);

  const changeLang = (_: React.MouseEvent<HTMLElement>, next: Lang | null) => {
    if (!next) return;
    setLang(next);
    window.localStorage.setItem(LANG_KEY, next);
  };

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
        <Container sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box component={RouterLink} to="/" sx={{ display: 'inline-flex', alignItems: 'center' }}>
            <Box component="img" src="/logo-maia.svg" alt="MaIA" sx={{ height: 28 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ToggleButtonGroup
              value={lang}
              exclusive
              onChange={changeLang}
              size="small"
              aria-label="Idioma del documento"
              sx={{
                '& .MuiToggleButton-root': {
                  px: 1.5,
                  py: 0.4,
                  fontWeight: 700,
                  fontSize: 12,
                  border: '1px solid var(--border)',
                  color: 'var(--muted)',
                  '&.Mui-selected': {
                    background: 'var(--orange)',
                    color: 'common.white',
                    '&:hover': { background: 'var(--orange-h)' },
                  },
                },
              }}
            >
              <ToggleButton value="es" aria-label="Español">ES</ToggleButton>
              <ToggleButton value="en" aria-label="English">EN</ToggleButton>
            </ToggleButtonGroup>
            <Button
              component={RouterLink}
              to="/"
              variant="outlined"
              size="small"
              startIcon={<ArrowBackIcon />}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              {t.back}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Encabezado */}
      <Box component="section" sx={{ py: { xs: 6, md: 8 }, background: 'var(--bg-soft)' }}>
        <Container>
          <Box sx={{ maxWidth: 820, mx: 'auto', textAlign: 'center' }}>
            <Typography variant="overline" color="primary" fontWeight={600}>{t.legal}</Typography>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '1.9rem', md: '2.8rem' },
                mt: 1,
                mb: 1.5,
                fontWeight: 700,
                letterSpacing: '-0.025em',
              }}
            >
              {content.title}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: { xs: 15, md: 17 } }}>
              {content.subtitle}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'var(--muted)' }}>
              {t.updated}: {content.updated}
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Contenido */}
      <Box component="main" sx={{ flex: 1, py: { xs: 5, md: 7 }, bgcolor: 'background.paper' }}>
        <Container>
          <Box
            sx={{
              maxWidth: 820,
              mx: 'auto',
              color: 'var(--text2)',
              fontSize: 15.5,
              lineHeight: 1.75,
              '& h2': {
                fontSize: { xs: '1.25rem', md: '1.4rem' },
                fontWeight: 700,
                color: 'var(--text)',
                mt: 5,
                mb: 1.5,
                pb: 1,
                borderBottom: '1px solid var(--border)',
                scrollMarginTop: 80,
              },
              '& h3': {
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--text)',
                mt: 3,
                mb: 1,
              },
              '& p': { my: 1.5 },
              '& ul': { my: 1.5, pl: 3 },
              '& li': { mb: 0.75 },
              '& strong': { color: 'var(--text)', fontWeight: 700 },
              '& a': { color: 'var(--orange)', fontWeight: 600, textDecoration: 'none' },
              '& a:hover': { textDecoration: 'underline' },
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.body}</ReactMarkdown>
          </Box>
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
