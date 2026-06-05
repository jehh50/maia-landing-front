import { Box, Stack, Typography, Button, Divider } from '@mui/material';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout, type AdminUser } from '../lib/api';

const NAV_ITEMS = [
  { to: '/admin',           label: 'Inicio', end: true,  enabled: true },
  { to: '/admin/leads',     label: 'Leads',  end: false, enabled: true },  // feature 16
  { to: '/admin/articles',  label: 'Blog',   end: false, enabled: true },  // feature 13
];

interface Props {
  user: AdminUser;
}

/**
 * Layout privado: sidebar minimal + `<Outlet />` para las páginas anidadas.
 * Las secciones "Leads" y "Blog" se dejan como placeholders deshabilitados
 * (se activarán en las features 16 y 13 respectivamente).
 */
export default function AdminLayout({ user }: Props) {
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'surface.soft' }}>
      <Box
        component="aside"
        sx={{
          width: { xs: 220, md: 260 },
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          p: 2.5,
        }}
      >
        <Stack spacing={3} sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              component="img"
              src="/logo-maia.svg"
              alt="MaIA"
              sx={{ height: 28 }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Admin
            </Typography>
          </Box>

          <Stack component="nav" spacing={0.5} aria-label="Navegación admin">
            {NAV_ITEMS.map(item => (
              item.enabled ? (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  style={({ isActive }) => ({
                    display: 'block',
                    padding: '10px 12px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: isActive ? '#E8440A' : '#1A1410',
                    background: isActive ? '#FFF0EB' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 14,
                  })}
                >
                  {item.label}
                </NavLink>
              ) : (
                <Box
                  key={item.to}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 1.25,
                    color: 'text.disabled',
                    fontSize: 14,
                    fontWeight: 500,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  aria-disabled="true"
                >
                  <span>{item.label}</span>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>próximamente</Typography>
                </Box>
              )
            ))}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.5}>
          <Box>
            <Typography variant="body2" fontWeight={600}>{user.name || user.email}</Typography>
            {user.name && (
              <Typography variant="caption" color="text.secondary">{user.email}</Typography>
            )}
          </Box>
          <Button variant="outlined" size="small" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </Stack>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 3, md: 5 } }}>
        <Outlet context={user} />
      </Box>
    </Box>
  );
}
