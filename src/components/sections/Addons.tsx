import { Box, Container, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { SvgIconComponent } from '@mui/icons-material';

interface Pack { label: string; description: string; price: string; }
interface Addon {
  Icon: SvgIconComponent;
  name: string;
  desc: string;
  accent: string;
  price?: string;
  unit?: string;
  packs?: Pack[];
}

const addons: Addon[] = [
  {
    Icon: BoltIcon,
    name: 'Créditos adicionales',
    desc: 'Amplía tu consumo mensual sin cambiar de plan. Pagas solo por lo que usas.',
    accent: '#b90f0f',
    price: '$0.20',
    unit: '/ crédito',
  },
  {
    Icon: Inventory2Icon,
    name: 'Packs de créditos',
    desc: 'Compra créditos por adelantado y ahorra frente al precio unitario.',
    accent: '#7C3AED',
    packs: [
      { label: 'Pack S', description: '500 créditos', price: '$90' },
      { label: 'Pack M', description: ' 1.000 créditos', price: '$160' },
      { label: 'Pack L', description: ' 2.500 créditos', price: '$350' },
    ],
  },
  {
    Icon: PsychologyIcon,
    name: 'Cerebro Extendido',
    desc: 'Amplía la base de conocimiento de tus agentes con más capacidad de almacenamiento.',
    accent: '#0369A1',
    price: '$60',
    unit: '/ GB adicional',
  },
  {
    Icon: AccountTreeIcon,
    name: 'Workflows adicionales',
    desc: 'Suma automatizaciones avanzadas para que tus agentes ejecuten más procesos.',
    accent: '#16A34A',
    price: '$190',
    unit: '/ mes',
  },
];

export default function Addons() {
  return (
    <Box component="section" id="addons" sx={{ py: { xs: 7, md: 10 }, background: 'var(--bg-soft)' }}>
      <Container>
        <Box className="reveal" sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="primary" fontWeight={600}>Complementos</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1, mb: 2 }}>
            Potencia tu plan cuando lo necesites
          </Typography>
          <Typography color="text.secondary">
            Add-ons opcionales para escalar créditos, conocimiento
          </Typography>
          <Typography color="text.secondary">
            y automatizaciones sin cambiar de plan.
          </Typography>
        </Box>

        <Box
          className="reveal"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 3,
          }}
        >
          {addons.map(a => (
            <Box
              key={a.name}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                p: 3.5,
                borderRadius: 1,
                background: '#fff',
                border: '1px solid var(--border)',
                borderTop: '3px solid transparent',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-top-color 0.25s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.10)',
                  borderTopColor: a.accent,
                },
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignSelf: 'flex-start',
                  p: 1.2,
                  borderRadius: 1,
                  background: `${a.accent}18`,
                  color: a.accent,
                  mb: 2,
                }}
              >
                <a.Icon sx={{ fontSize: 26 }} />
              </Box>

              <Typography variant="h6" fontWeight={700} sx={{ fontSize: 17, mb: 1 }}>
                {a.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, mb: 2.5 }}>
                {a.desc}
              </Typography>

              <Box sx={{ mt: 'auto' }}>
                {a.packs ? (
                  <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                    {a.packs.map((pack, i) => (
                      <Box
                        component="li"
                        key={pack.label}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          py: 1,
                          borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                        }}
                      >
                        <Typography variant="body2" sx={{ color: 'var(--text2)' }}>{pack.label}</Typography>
                        <Typography variant="caption" sx={{ color: 'var(--muted)' }}>{pack.description}</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: 16, color: 'var(--black)', whiteSpace: 'nowrap' }}>
                          {pack.price}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 30, fontWeight: 800, color: 'var(--black)', lineHeight: 1 }}>
                      {a.price}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--muted)', fontWeight: 600 }}>
                      {a.unit}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
