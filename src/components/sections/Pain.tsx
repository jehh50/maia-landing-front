import { Box, Container, Typography, Grid } from '@mui/material';
import GroupRemoveIcon from '@mui/icons-material/GroupRemove';
import SavingsIcon from '@mui/icons-material/Savings';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import SpeakerNotesOffIcon from '@mui/icons-material/SpeakerNotesOff';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { SvgIconComponent } from '@mui/icons-material';

interface Pain {
  Icon: SvgIconComponent;
  t: string; // Title
  p: string; // Pain
  s: string; // Solution
}

function highlightBrand(text: string) {
  return text.split(/(MaIA)/gi).map((part, i) =>
    /^maia$/i.test(part) ? (
      <Box key={i} component="span" sx={{ fontWeight: 800, color: 'var(--orange)' }}>
        {part}
      </Box>
    ) : (
      part
    ),
  );
}

const pains: Pain[] = [
  {
    Icon: GroupRemoveIcon,
    t: 'El talento humano atrapado',
    p: 'Tu equipo pasa horas respondiendo las mismas preguntas básicas, calificando contactos o copiando datos manualmente.',
    s: 'Con MaIA puedes crear agentes con capacidad de razonamiento. No repiten textos como un robot clásico; entienden el contexto y resuelven la consulta de tus clientes de principio a fin.',
  },
  {
    Icon: SavingsIcon,
    t: 'Costos de operación elevados',
    p: 'Contratar y entrenar personal de soporte o ventas es lento y costoso. Además, la rotación constante afecta directamente tu productividad.',
    s: 'Tus asistentes virtuales operan de forma impecable las 24 horas, los 365 días del año, sin cansarse. Crece tu capacidad de respuesta de inmediato a una fracción de lo que costaría ampliar tu nómina.',
  },
  {
    Icon: HourglassTopIcon,
    t: 'Clientes impacientes',
    p: 'Los clientes exigen respuestas inmediatas. Los chats tradicionales con menús de botones rígidos los frustran y los obligan a esperar a que un humano se libere.',
    s: 'Atención inmediata y natural siempre. MaIA entiende textos, mensajes de voz y fotos de tus productos.',
  },
  {
    Icon: SpeakerNotesOffIcon,
    t: 'Tecnología que solo habla, pero no actúa',
    p: 'Un chat que solo responde preguntas frecuentes no soluciona el fondo. Si no puede realizar acciones reales, tu equipo humano sigue atrapado en el trabajo administrativo.',
    s: 'Tus agentes se conectan directamente con tus sistemas diarios. Pueden agendar citas, registrar pedidos o realizar tareas de forma 100% autónoma.',
  },
  {
    Icon: SettingsSuggestIcon,
    t: 'La complejidad de implementar IA',
    p: 'Pensar que para tener Inteligencia Artificial necesitas contratar ingenieros costosos, gastar miles de dólares y esperar meses para ver un resultado.',
    s: 'Creación guiada sin código. MaIA actúa como un especialista que te entrevista en lenguaje sencillo, aprende de tu negocio y construye tu asistente ideal listo para trabajar en minutos.',
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
          <Typography color="text.secondary">Cada problema tiene una solución concreta con MaIA. Descubre cómo.</Typography>
        </Box>
        <Grid container spacing={3} justifyContent="center">
          {pains.map(p => (
            <Grid item xs={12} sm={6} md={4} key={p.t}>
              <Box
                className="reveal"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  borderRadius: 3,
                  background: '#fff',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  boxShadow: '0 2px 16px rgba(232,68,10,0.06)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 20px 44px rgba(232,68,10,0.16)',
                  },
                  '&:hover .pain-icon': {
                    background: 'var(--orange)',
                    color: '#fff',
                  },
                }}
              >
                {/* Problema */}
                <Box sx={{ p: 3, pb: 2.5, minHeight: { xs: 'auto', md: 268 } }}>
                  <Box
                    className="pain-icon"
                    sx={{
                      display: 'inline-flex',
                      p: 1.2,
                      borderRadius: 2,
                      background: 'var(--orange-xl)',
                      color: 'var(--orange)',
                      mb: 2,
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <p.Icon sx={{ fontSize: 26 }} />
                  </Box>
                  <Typography
                    variant="overline"
                    sx={{ display: 'block', color: 'var(--muted)', letterSpacing: 1, lineHeight: 1.4 }}
                  >
                    El problema
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ fontSize: 17, mt: 0.25, mb: 1, minHeight: { xs: 'auto', md: 50 } }}>
                    {p.t}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                    {p.p}
                  </Typography>
                </Box>

                {/* Solución */}
                <Box
                  sx={{
                    mt: 'auto',
                    p: 3,
                    pt: 2.5,
                    background: 'linear-gradient(180deg, rgba(22,163,74,0.06) 0%, rgba(22,163,74,0.10) 100%)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                    <AutoAwesomeIcon sx={{ fontSize: 18, color: 'var(--green)' }} />
                    <Typography
                      variant="overline"
                      sx={{ color: 'var(--green)', fontWeight: 700, letterSpacing: 1, lineHeight: 1 }}
                    >
                      La solución con MaIA
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'var(--text2)', lineHeight: 1.65, minHeight: { xs: 'auto', md: 130 } }}>
                    {highlightBrand(p.s)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
