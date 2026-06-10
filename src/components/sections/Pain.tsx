import { Box, Container, Typography, Grid } from '@mui/material';
import GroupRemoveIcon from '@mui/icons-material/GroupRemove';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { SvgIconComponent } from '@mui/icons-material';

interface Pain {
  Icon: SvgIconComponent;
  t: string;
  d: string;
}

const pains: Pain[] = [
  {
    Icon: GroupRemoveIcon,
    t: 'Equipo abrumado',
    d: 'Soporte y ventas saturados con tareas repetitivas que consumen horas valiosas cada día.',
  },
  {
    Icon: TrendingUpIcon,
    t: 'Costos disparados',
    d: 'Contratar y entrenar agentes humanos es caro y lento. La rotación destruye la productividad.',
  },
  {
    Icon: HourglassTopIcon,
    t: 'Clientes esperando',
    d: 'Respuestas tardías fuera de horario laboral cuestan ventas y queman tu reputación.',
  },
  {
    Icon: VisibilityOffIcon,
    t: 'Sin visibilidad',
    d: 'No sabes qué conversaciones están funcionando ni dónde están las oportunidades perdidas.',
  },
];

export default function Pain() {
  return (
    <Box component="section" sx={{ py: { xs: 7, md: 10 }, background: 'linear-gradient(180deg, var(--orange-xxl) 0%, var(--bg-soft) 30%, var(--bg-soft) 70%, var(--orange-xxl) 100%)' }}>
      <Container>
        <Box className="reveal" sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="primary" fontWeight={600}>El desafío</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1, mb: 2 }}>
            Tu equipo está atrapado en tareas repetitivas que la IA podría hacer
          </Typography>
          <Typography color="text.secondary">Si reconoces alguno de estos problemas, estás dejando dinero sobre la mesa.</Typography>
        </Box>
        <Grid container spacing={3}>
          {pains.map(p => (
            <Grid item xs={12} sm={6} md={3} key={p.t}>
              <Box className="reveal" sx={{
                p: 3,
                height: '100%',
                borderRadius: 3,
                background: '#fff',
                borderLeft: '4px solid var(--orange)',
                boxShadow: '0 2px 16px rgba(232,68,10,0.06)',
                transition: 'all 0.25s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 16px 40px rgba(232,68,10,0.12)',
                  background: 'var(--orange-xxl)',
                },
              }}>
                <Box sx={{
                  display: 'inline-flex',
                  p: 1.2,
                  borderRadius: 2,
                  background: 'var(--orange-xl)',
                  color: 'primary.main',
                  mb: 2,
                }}>
                  <p.Icon sx={{ fontSize: 26 }} />
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: 17, mb: 1 }}>{p.t}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{p.d}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
