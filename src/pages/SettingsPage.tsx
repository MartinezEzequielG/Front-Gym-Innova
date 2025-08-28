import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface User {
  name: string;
  email: string;
  role: string;
}

export const SettingsPage: React.FC = () => {
  const { token } = useAuth();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (token) {
      axios.get<User>('http://localhost:3000/api/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setUser(res.data);
      })
      .catch(() => setUser(null));
    }
  }, [token]);

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