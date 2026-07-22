import { useEffect, useState } from 'react';
import { AppBar, Toolbar, Container, Box, Button, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const navLinks = [
  { href: '#solution', label: 'Cómo funciona' },
  { href: '#features', label: 'Características' },
  { href: '#integrations', label: 'Recursos' },
  { href: '#pricing', label: 'Precios' },
];

export interface NavbarProps {
  onOpenContact: () => void;
}

export default function Navbar({ onOpenContact }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <AppBar
        elevation={0}
        position="fixed"
        sx={{
          background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(14px)',
          color: 'text.primary',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
          transition: 'all 0.2s',
        }}
      >
        <Container disableGutters>
          <Toolbar sx={{ minHeight: 64, display: 'flex', justifyContent: 'space-between' }}>
            <Box component="a" href="#" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <Box component="img" src="/logo-maia.svg" alt="MaIA" sx={{ height: 32 }} />
            </Box>

            {!mobile && (
              <Box component="ul" sx={{ display: 'flex', gap: 3, listStyle: 'none', m: 0, p: 0 }}>
                {navLinks.map(l => (
                  <li key={l.href}>
                    <Box component="a" href={l.href} sx={{
                      color: 'text.secondary', textDecoration: 'none', fontSize: 14, fontWeight: 500,
                      '&:hover': { color: 'primary.main' },
                    }}>{l.label}</Box>
                  </li>
                ))}
              </Box>
            )}

            {!mobile ? (
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button href="https://app.maiabuilder.ai/" variant="contained" size="small">Ingresar</Button>
                <Button onClick={onOpenContact} variant="outlined" size="small">Agenda un demo</Button>
              </Box>
            ) : (
              <IconButton onClick={() => setOpen(true)} aria-label="Menú">
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {mobile && open && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 1300,
          background: '#fff', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 3,
        }}>
          <IconButton onClick={() => setOpen(false)} sx={{ position: 'absolute', top: 16, right: 16 }} aria-label="Cerrar">
            <CloseIcon />
          </IconButton>
          {navLinks.map(l => (
            <Box key={l.href} component="a" href={l.href} onClick={() => setOpen(false)}
              sx={{ fontSize: 20, color: 'text.primary', textDecoration: 'none', fontWeight: 600 }}>
              {l.label}
            </Box>
          ))}
          <Button
            variant="contained"
            size="large"
            onClick={() => { setOpen(false); onOpenContact(); }}
            sx={{ mt: 2 }}
          >
            Agenda un demo →
          </Button>
        </Box>
      )}
    </>
  );
}
