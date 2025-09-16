import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
<<<<<<< HEAD
import { Button, CircularProgress, Typography, Box, TextField, Fade } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const { user, loading, loginWithGoogle, login } = useAuth();
  const navigate = useNavigate();
=======
import { api } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

interface LoginResponse {
  ok: boolean;
  idToken?: string;
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
>>>>>>> 6b570926d5a1d3bcd3092ab822c43790d828df92
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    try {
<<<<<<< HEAD
      await login(email, password);
=======
      // Si tu backend soporta login por email/password, ajusta el endpoint y payload
      const res = await api.post<LoginResponse>('/auth/login', { email, password });
      if (res.data.ok) {
        await login(res.data.idToken || '');
        window.location.href = '/dashboard';
      } else {
        setError('Credenciales incorrectas');
      }
>>>>>>> 6b570926d5a1d3bcd3092ab822c43790d828df92
    } catch {
      setError('Credenciales incorrectas');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
      <CircularProgress />
    </Box>
  );

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{ background: '#f4f5f7' }}
    >
      <Fade in timeout={400}>
        <Box
          sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: 3,
            maxWidth: 340,
            width: '100%',
            bgcolor: '#fff',
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1px solid #ececec',
          }}
        >
          <Typography
            variant="h5"
            align="center"
            sx={{
              fontWeight: 700,
              mb: 1,
              letterSpacing: 1,
              color: '#222',
              fontFamily: 'Oswald, Montserrat, sans-serif',
            }}
          >
            Acero Gym
          </Typography>
          <Typography
            variant="body2"
            align="center"
            sx={{
              mb: 3,
              color: '#888',
              fontWeight: 500,
              letterSpacing: 1,
              fontFamily: 'Montserrat, Oswald, sans-serif',
            }}
          >
            Innova System Gym
          </Typography>
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <TextField
              label="Email"
              variant="standard"
              fullWidth
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              sx={{
                mb: 2,
                input: { color: '#222', fontSize: 16 },
                label: { color: '#888' },
              }}
              InputLabelProps={{
                style: { color: '#888' }
              }}
            />
            <TextField
              label="Contraseña"
              type="password"
              variant="standard"
              fullWidth
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              sx={{
                mb: 3,
                input: { color: '#222', fontSize: 16 },
                label: { color: '#888' },
              }}
              InputLabelProps={{
                style: { color: '#888' }
              }}
            />
            {error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                bgcolor: '#222',
                color: '#fff',
                fontWeight: 600,
                fontSize: '1rem',
                py: 1,
                mb: 1,
                borderRadius: 2,
                boxShadow: 'none',
                textTransform: 'none',
                letterSpacing: 1,
                '&:hover': { bgcolor: '#111' },
              }}
              disabled={formLoading}
            >
              {formLoading ? 'Ingresando...' : 'Ingresar'}
            </Button>
<<<<<<< HEAD
            <Button
              fullWidth
              variant="text"
              startIcon={<GoogleIcon />}
              sx={{
                color: '#222',
                fontWeight: 500,
                fontSize: '1rem',
                py: 1,
                textTransform: 'none',
                letterSpacing: 1,
                '&:hover': { color: '#1976d2', bgcolor: 'transparent' },
=======

            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                if (credentialResponse.credential) {
                  await login(credentialResponse.credential);
                  window.location.href = '/dashboard';
                }
>>>>>>> 6b570926d5a1d3bcd3092ab822c43790d828df92
              }}
              onError={() => {
                setError('Error al iniciar sesión con Google');
              }}
              width="100%"
            />
          </form>
        </Box>
      </Fade>
    </Box>
  );
};

export default LoginPage;
