import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { api } from '../context/AuthContext';

interface User {
  name: string;
  email: string;
  role: string;
}

export const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // El backend usa cookie, no token manual
    api.get<{ ok: boolean; user: User }>('/auth/me')
      .then(res => {
        if (res.data.ok) setUser(res.data.user);
        else setUser(null);
      })
      .catch(() => setUser(null));
  }, []);

  return (
    <Paper sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 6 }}>
      <Typography variant="h5" gutterBottom>
        Mi Perfil
      </Typography>
      {user ? (
        <Box>
          <Typography variant="body1"><strong>Nombre:</strong> {user.name}</Typography>
          <Typography variant="body1"><strong>Email:</strong> {user.email}</Typography>
          <Typography variant="body1"><strong>Rol:</strong> {user.role}</Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="error">
          No se pudo cargar el perfil.
        </Typography>
      )}
    </Paper>
  );
};

export default SettingsPage;