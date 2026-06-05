import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { getMe, type AdminUser } from '../lib/api';

type Status = 'loading' | 'auth' | 'guest';

interface Props {
  children: (user: AdminUser) => ReactNode;
}

/**
 * Bloquea cualquier ruta privada de admin: hace `GET /api/auth/me` y, si la
 * respuesta no es 200, redirige a `/admin/login` recordando el destino original.
 */
export default function AdminGuard({ children }: Props) {
  const location = useLocation();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getMe();
      if (cancelled) return;
      if (res.ok && res.data && 'user' in res.data && res.data.user) {
        setUser(res.data.user);
        setStatus('auth');
      } else {
        setStatus('guest');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'guest') {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <>{user ? children(user) : null}</>;
}
