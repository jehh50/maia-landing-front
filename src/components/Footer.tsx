import { Box, Container, Grid, Typography, Link } from '@mui/material';

const cols = [
  {
    title: 'Producto', items: [
      { l: 'Funciones', h: '#features' },
      { l: 'Integraciones', h: '#integrations' },
      { l: 'Precios', h: '#pricing' },
      { l: 'FAQ', h: '#faq' },
    ]
  },
  {
    title: 'Empresa', items: [
      /*{ l: 'Sobre nosotros', h: '#' },*/
      { l: 'Blog', h: '/blog' },
      { l: 'Casos de éxito', h: '#' },
      { l: 'Términos y condiciones', h: '#' },
      { l: 'Política de Privacidad', h: '#' },
    ]
  },
  {
    title: 'Soporte', items: [
      { l: 'maia@maiabuilder.ai', h: 'mailto:maia@maiabuilder.ai' },
      { l: 'Contacto', h: '#cta-final' },
    ]
  },
];

export default function Footer() {
  return (
    <Box component="footer" sx={{ background: 'var(--bg-strong)', borderTop: '1px solid var(--border)', pt: 7, pb: 4 }}>
      <Container>
        <Grid container spacing={5}>
          <Grid item xs={12} md={4}>
            <Box component="a" href="#" sx={{ display: 'inline-block', mb: 2 }}>
              <Box component="img" src="/logo-maia.svg" alt="MaIA" sx={{ height: 28 }} />
            </Box>
            <Typography color="white" sx={{ fontSize: 14, maxWidth: 320 }}>
              Agentes de IA para equipos de Latinoamérica. Sin código, sin fricción, con resultados desde el primer día.
            </Typography>
          </Grid>
          {cols.map(c => (
            <Grid item xs={6} md={2.66} key={c.title}>
              <Typography color="white" variant="overline" fontWeight={700}>{c.title}</Typography>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 1 }}>
                {c.items.map(it => (
                  <li key={it.l}>
                    <Link href={it.h} underline="hover" sx={{ fontSize: 14, color: 'white', display: 'block', mb: 0.5 }}>{it.l}</Link>
                  </li>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ borderTop: '1px solid var(--border)', mt: 5, pt: 3, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="caption" color="white">© 2026 MaIA · Ximple Solutions. Todos los derechos reservados.</Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {[

              { l: <Box component="img" src="/logo-linkedin.svg" alt="MaIA" sx={{ height: 28 }} />, h: 'https://linkedin.com/company/ximple-tech' },
              { l: <Box component="img" src="/logo-instagram.svg" alt="MaIA" sx={{ height: 28 }} />, h: 'https://instagram.com/maia_by_ximple' },
            ].map(s => (
              <Link key={s.h} href={s.h} target="_blank" rel="noopener" underline="none" sx={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'text.secondary',
              }}>{s.l}</Link>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
