import { Box, Stack, Typography, Button, Divider } from '@mui/material';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout, type AdminUser } from '../lib/api';
import { tokens } from '../theme/tokens';

const NAV_ITEMS = [
  { to: '/admin',           label: 'Inicio',   end: true  },
  { to: '/admin/leads',     label: 'Leads',    end: false },
  { to: '/admin/articles',  label: 'Blog',     end: false },
  { to: '/admin/images',    label: 'Imágenes', end: false },
  { to: '/admin/prices',    label: 'Precios',  end: false },
  { to: '/admin/users',     label: 'Usuarios', end: false },
];

interface Props {
  user: AdminUser;
}

/**
 * Layout privado: sidebar minimal + `<Outlet />` para las páginas anidadas.
 * Todas las secciones de `NAV_ITEMS` están activas y enlazan a su ruta: primero
 * el contenido ("Inicio", "Leads", "Blog", "Imágenes", "Precios") y al final la
 * gestión de accesos ("Usuarios"). Nunca se añaden ítems deshabilitados de tipo
 * "próximamente": la feature 18 los eliminó y hay un test que lo vigila.
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
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '10px 12px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: isActive ? tokens.brand.orange : tokens.text.primary,
                  background: isActive ? tokens.brand.orangeXL : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                })}
              >
                {item.label}
              </NavLink>
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
