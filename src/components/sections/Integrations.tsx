import { Box, Container, Typography } from '@mui/material';

const integrations = [
  'HubSpot', 'VTEX', 'SAP', 'Microsoft Teams',
  'Salesforce', 'Odoo', 'Google Workspace', 'Microsoft 365', 'Stripe', 'Shopify', 'Webhooks', 'WooCommerce'
];

export default function Integrations() {
  return (
    <Box component="section" id="integrations" sx={{ py: { xs: 7, md: 10 }, background: 'linear-gradient(180deg, var(--bg-soft) 0%, #FFFFFF 30%, #FFFFFF 70%, var(--bg-soft) 100%)' }}>
      <Container>
        <Box className="reveal" sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="primary" fontWeight={600}>Herramientas</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1, mb: 2 }}>
            Conecta lo que ya usas
          </Typography>
          <Typography color="text.secondary">+100 herramientas nativas. ¿No ves la tuya?, te ayudamos a conectarla.</Typography>
        </Box>
        <Box className="reveal" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center' }}>
          {integrations.map(i => (
            <Box key={i} sx={{
              px: 2.5, py: 1.5, borderRadius: 100, background: '#fff',
              border: '1px solid var(--border2)', fontSize: 14, fontWeight: 500, '&:hover': { background: 'var(--orange-xl)', color: 'primary.main' }
            }}>{i}</Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
