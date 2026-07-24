import { Box } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

export default function WhatsAppFloat() {
  return (
    <Box
      component="a"
      href="https://wa.me/+584242526617"
      target="_blank"
      rel="noopener"
      aria-label="Chat por WhatsApp"
      sx={{
        position: 'fixed', bottom: 32, right: 32, zIndex: 100,
        width: 70, height: 70, borderRadius: '50%',
        bgcolor: '#25D366', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px #075E54',
        textDecoration: 'none', transition: 'transform 0.2s',
        '&:hover': { transform: 'scale(1.08)' },
      }}
    >
      <WhatsAppIcon sx={{ fontSize: 56 }} />
    </Box>
  );
}
