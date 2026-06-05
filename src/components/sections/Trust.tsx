import { Box, Container, Typography } from '@mui/material';

const companies = [
  { name: 'Led Studio', logo: '/logo-ledstudio.png' },
  { name: 'Instituto IPG', logo: '/logo-ipg.png' },
  { name: 'IACC', logo: '/logo-iacc.png' },
  { name: 'Embonor', logo: '/logo-embonor.png' },
];

export default function Trust() {
  return (
    <Box component="section" id="trust" sx={{ py: { xs: 5, md: 6 }, background: '#fff', borderBottom: '1px solid var(--border)' }}>
      <Container>
        <Typography
          variant="caption"
          align="center"
          display="block"
          color="text.secondary"
          sx={{ letterSpacing: '0.12em', textTransform: 'uppercase', mb: 4, fontSize: 11, fontWeight: 600 }}
        >
          Empresas que ya automatizan con MaIA
        </Typography>
        <Box sx={{
          display: 'flex',
          gap: { xs: 4, md: 7 },
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          {companies.map(c => (
            <Box
              key={c.name}
              component="img"
              src={c.logo}
              alt={c.name}
              title={c.name}
              sx={{
                height: { xs: 50, md: 100 },
                width: 'auto',
                maxWidth: 200,
                objectFit: 'contain',
                filter: 'grayscale(1) opacity(0.5)',
                transition: 'filter 0.3s ease, transform 0.3s ease',
                '&:hover': {
                  filter: 'grayscale(0) opacity(1)',
                  transform: 'scale(1.06)',
                },
              }}
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
