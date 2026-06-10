import { Box, Container, Typography, Switch, FormControlLabel, Chip } from '@mui/material';

interface Plan {
  name: string; monthly: number; annual: number;
  saving: string; features: string[]; dim: string[]; featured?: boolean;
  period: string;
}

const plans: Plan[] = [
  {
    name: 'Starter', monthly: 199, annual: 159, period: '1000 creditos',
    saving: 'Ahorras $480/año',
    features: ['1 agente activo', '1000 creditos/mes', '100 MB knowledge base', 'WhatsApp + Web chat', 'Soporte por email'],
    dim: ['Workflows avanzados'],
  },
  {
    name: 'Team', monthly: 599, annual: 479, period: '2,500 creditos',
    saving: 'Ahorras $1,440/año', featured: true,
    features: ['5 agentes activos', '2,500 creditos/mes', '1 GB knowledge base', 'Todos los canales', '3 workflows avanzados', 'Dashboard de KPIs', 'Centro de monitoreo'],
    dim: [],
  },
  {
    name: 'Growth', monthly: 999, annual: 799, period: '3,500 creditos',
    saving: 'Ahorras $2,400/año',
    features: ['20 agentes activos', '3,500 creditos/mes', '5 GB knowledge base', 'Workflows ilimitados', 'Hand-off a humanos', 'Centro de monitoreo', 'API REST + webhooks'],
    dim: [],
  },
  {
    name: 'Enterprise', monthly: 0, annual: 0, period: 'A medida',
    saving: '',
    features: ['Agentes ilimitados', 'Volumen custom', 'SSO / SAML / RBAC', 'On-prem disponible', 'SLA 99.9%', 'CSM dedicado'],
    dim: [],
  },
];

interface PricingProps { isAnnual: boolean; onToggle: () => void; onOpenContact: () => void }

export default function Pricing({ isAnnual, onToggle, onOpenContact }: PricingProps) {
  return (
    <Box component="section" id="pricing" sx={{ py: { xs: 7, md: 10 }, background: 'linear-gradient(180deg, var(--orange-xxl) 0%, var(--bg-soft) 30%, var(--bg-soft) 70%, var(--orange-xxl) 100%)' }}>
      <Container>
        <Box className="reveal" sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: 4 }}>
          <Typography variant="overline" color="primary" fontWeight={600}>Precios</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1, mb: 2 }}>
            Transparente. Sin sorpresas.
          </Typography>
          <Typography color="text.secondary">Empieza y escala cuando lo necesites. Soporte en español y onboarding guiado.</Typography>
        </Box>

        <Box className="reveal" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 5 }}>
          <Typography color="text.secondary">Mensual</Typography>
          <FormControlLabel control={<Switch checked={isAnnual} onChange={onToggle} />} label="Anual" />
          <Chip size="small" label="Ahorra 20%" color="success" sx={{ bgcolor: 'var(--green-l)', color: 'var(--green)', fontWeight: 600 }} />
        </Box>

        <Box className="reveal" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
          {plans.map(p => (
            <Box key={p.name} sx={{
              position: 'relative', p: 3.5, borderRadius: 3, background: '#fff',
              border: p.featured ? '2px solid var(--orange)' : '1px solid var(--border)',
              boxShadow: p.featured ? '0 12px 40px rgba(232,68,10,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              {p.featured && (
                <Box sx={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  px: 1.5, py: 0.5, borderRadius: 100, background: 'primary.main',
                  bgcolor: 'primary.main', color: '#fff', fontSize: 11, fontWeight: 700,
                }}>Más popular</Box>
              )}
              <Typography variant="h6" fontWeight={700}>{p.name}</Typography>
              {p.monthly > 0 ? (
                <>
                  <Typography sx={{ fontSize: 36, fontWeight: 800, mt: 1 }}>
                    <Box component="sup" sx={{ fontSize: 18 }}>$</Box>
                    {(isAnnual ? p.annual : p.monthly).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{p.period}</Typography>
                  {isAnnual && <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>{p.saving}</Typography>}
                </>
              ) : (
                <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 1, color: 'text.primary' }}>Custom</Typography>
              )}
              <Box sx={{ borderTop: '1px solid var(--border)', my: 2 }} />
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {p.features.map(f => (
                  <Box component="li" key={f} sx={{ fontSize: 14, color: 'text.secondary', mb: 0.75, '&::before': { content: '"✓ "', color: 'var(--green)', fontWeight: 700 } }}>{f}</Box>
                ))}
                {p.dim.map(f => (
                  <Box component="li" key={f} sx={{ fontSize: 14, color: 'var(--muted2)', mb: 0.75, textDecoration: 'line-through' }}>{f}</Box>
                ))}
              </Box>
              {p.name === 'Enterprise' && (
                <Box sx={{ mt: 2 }}>
                  <Box component="button" onClick={onOpenContact} sx={{
                    width: '100%', py: 1.2, border: '1px solid var(--orange)', background: 'transparent',
                    color: 'primary.main', borderRadius: 100, fontWeight: 600, cursor: 'pointer', fontSize: 14,
                  }}>Hablar con ventas →</Box>
                </Box>
              )}
            </Box>
          ))}
        </Box>

        <Typography align="center" sx={{ mt: 5, color: 'text.secondary', fontSize: 14 }}>
          ¿No sabes cuál elegir?{' '}
          <Box component="a" onClick={onOpenContact} sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
            Agenda una demo gratuita de 30 min
          </Box>{' '}y te ayudamos.
        </Typography>
      </Container>
    </Box>
  );
}
