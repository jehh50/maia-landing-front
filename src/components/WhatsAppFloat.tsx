import { Box } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

export default function WhatsAppFloat() {
  return (
    <Box
      component="a"
      href="https://wa.me/+56965400115"
      target="_blank"
      rel="noopener"
      aria-label="Chat por WhatsApp"
      sx={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 100,
        width: 75, height: 75, borderRadius: '50%',
        bgcolor: '#E8440A', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
        textDecoration: 'none', transition: 'transform 0.2s',
        '&:hover': { transform: 'scale(1.08)' },
      }}
    >
      <WhatsAppIcon sx={{ fontSize: 56 }} />
    </Box>
  );
}
