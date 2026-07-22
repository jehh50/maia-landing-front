import { Box, Container, Typography, Grid } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { SvgIconComponent } from '@mui/icons-material';

interface Step {
  n: string;
  t: string;
  d: string;
  Icon: SvgIconComponent;
}

const steps: Step[] = [
  {
    n: '01',
    t: 'Diseña tu agente',
    d: 'Define su personalidad, objetivos y límites. Sin código. Sin prompts complicados.',
    Icon: AutoAwesomeIcon,
  },
  {
    n: '02',
    t: 'Conecta tus datos',
    d: 'Sube manuales, FAQs, catálogos. Conecta tus herramientas como CRM, ERP, E-Commerce y más.',
    Icon: CloudUploadIcon,
  },
  {
    n: '03',
    t: 'Lanza y mide',
    d: 'Activa tus canales de preferencia como WhatsApp, WebChat o Slack. KPIs en tiempo real desde un panel unificado.',
    Icon: RocketLaunchIcon,
  },
];

export default function Solution() {
  return (
    <Box component="section" id="solution" sx={{ py: { xs: 7, md: 10 }, background: 'linear-gradient(180deg, var(--bg-soft) 0%, #FFFFFF 30%, #FFFFFF 70%, var(--bg-soft) 100%)' }}>
      <Container>
        <Box className="reveal" sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="primary" fontWeight={600}>Cómo funciona</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1, mb: 2 }}>
            De idea a agente productivo
          </Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1, mb: 2 }}>
            en 3 pasos
          </Typography>
          <Typography color="text.secondary">
            MaIA combina datos privados, modelos de IA y tus integraciones en una sola plataforma.
          </Typography>
        </Box>
        <Grid container spacing={4}>
          {steps.map((s, idx) => (
            <Grid item xs={12} md={4} key={s.n}>
              <Box className="reveal" sx={{
                p: 4,
                height: '100%',
                borderRadius: 3,
                background: '#FFF9F6',
                border: '1px solid var(--border)',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.25s ease',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: 3,
                  opacity: 0,
                  transition: 'opacity 0.25s ease',
                },
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
                  '&::before': { opacity: 1 },
                },
              }}>
                <Box sx={{
                  display: 'inline-flex',
                  position: 'relative',
                  mb: 3,
                }}>
                  <Box sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, var(--orange) 0%, var(--orange-l) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(232,68,10,0.30)',
                  }}>
                    <s.Icon sx={{ fontSize: 30 }} />
                  </Box>
                  <Box sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#fff',
                    border: '2px solid var(--orange)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 800,
                    color: 'var(--orange)',
                    lineHeight: 1,
                  }}>
                    {idx + 1}
                  </Box>
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>{s.t}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{s.d}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
