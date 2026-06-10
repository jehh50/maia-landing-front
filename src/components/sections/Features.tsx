import { Box, Container, Typography, Grid } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import HubIcon from '@mui/icons-material/Hub';
import SecurityIcon from '@mui/icons-material/Security';
import InsightsIcon from '@mui/icons-material/Insights';
import GroupsIcon from '@mui/icons-material/Groups';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { SvgIconComponent } from '@mui/icons-material';

interface Feature {
  Icon: SvgIconComponent;
  t: string;
  d: string;
  accent: string;
}

const features: Feature[] = [
  {
    Icon: PsychologyIcon,
    t: 'Memoria persistente',
    d: 'Tus agentes recuerdan a cada cliente, su historia y preferencias en cada interacción.',
    accent: '#E8440A',
  },
  {
    Icon: HubIcon,
    t: 'Integraciones nativas',
    d: '+100 integraciones listas: Salesforce, HubSpot, Slack, Google, Shopify, WooCommerce y más.',
    accent: '#7C3AED',
  },
  {
    Icon: SecurityIcon,
    t: 'Privacidad por defecto',
    d: 'Tus datos nunca entrenan modelos públicos. Cifrado en tránsito y reposo, SOC 2 compliant.',
    accent: '#0369A1',
  },
  {
    Icon: InsightsIcon,
    t: 'Métricas en vivo',
    d: 'Dashboards con KPIs de cada agente, conversación y resultado de negocio en tiempo real.',
    accent: '#16A34A',
  },
  {
    Icon: GroupsIcon,
    t: 'Deriva a humanos',
    d: 'Cuando algo se sale del guion, el agente escala a tu equipo con todo el contexto.',
    accent: '#D97706',
  },
  {
    Icon: SupportAgentIcon,
    t: 'Autoservicio 24/7',
    d: 'Tus agentes resuelven consultas comunes, agendan reuniones y actualizan información sin intervención humana.',
    accent: '#E8440A',
  },
];

export default function Features() {
  return (
    <Box component="section" id="features" sx={{ py: { xs: 7, md: 10 }, background: 'linear-gradient(180deg, var(--orange-xxl) 0%, var(--bg-soft) 30%, var(--bg-soft) 70%, var(--orange-xxl) 100%)' }}>
      <Container>
        <Box className="reveal" sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="primary" fontWeight={600}>Características</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1, mb: 2 }}>
            Todo lo que necesitas. Nada de lo que sobra.
          </Typography>
          <Typography color="text.secondary">Una plataforma pensada para equipos de negocio, no solo para developers.</Typography>
        </Box>
        <Grid container spacing={3}>
          {features.map(f => (
            <Grid item xs={12} sm={6} md={4} key={f.t}>
              <Box className="reveal" sx={{
                p: 3.5,
                height: '100%',
                borderRadius: 3,
                background: '#fff',
                border: '1px solid var(--border)',
                borderTop: '3px solid transparent',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.10)',
                  borderTopColor: f.accent,
                },
              }}>
                <Box sx={{
                  display: 'inline-flex',
                  p: 1.5,
                  borderRadius: 2,
                  background: `${f.accent}18`,
                  color: f.accent,
                  mb: 2,
                  width: 'fit-content',
                }}>
                  <f.Icon sx={{ fontSize: 28 }} />
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: 17, mb: 1 }}>{f.t}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{f.d}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
