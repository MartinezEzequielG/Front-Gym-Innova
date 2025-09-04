import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Fade,
  CircularProgress,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

interface LoginResponse {
  ok: boolean;
  idToken?: string;
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Si tu backend soporta login por email/password, ajusta el endpoint y payload
      const res = await api.post<LoginResponse>('/auth/login', { email, password });
      if (res.data.ok) {
        await login(res.data.idToken || '');
        window.location.href = '/dashboard';
      } else {
        setError('Credenciales incorrectas');
      }
    } catch {
      setError('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f5f6fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Montserrat, Oswald, sans-serif',
      }}
    >
      <Fade in timeout={600}>
        <Paper
          elevation={4}
          sx={{
            p: 4,
            borderRadius: 3,
            maxWidth: 360,
            width: '100%',
            bgcolor: '#fff',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              mb: 1,
              letterSpacing: 1,
              color: '#222',
              fontFamily: 'Oswald, Montserrat, sans-serif',
            }}
          >
            Acero Gym
          </Typography>

          <Typography
            variant="subtitle2"
            sx={{
              mb: 4,
              color: '#FFD600',
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
              type="email"
              variant="standard"
              fullWidth
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              sx={{
                mb: 2,
                input: { color: '#222' },
                label: { color: '#555' },
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
                input: { color: '#222' },
                label: { color: '#555' },
              }}
            />

            {error && (
              <Typography color="error" sx={{ mb: 2, fontSize: '0.9rem' }}>
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                bgcolor: '#FFD600',
                color: '#222',
                fontWeight: 700,
                fontSize: '1rem',
                py: 1.2,
                mb: 2,
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': { bgcolor: '#FFC400' },
              }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#222' }} /> : 'Ingresar'}
            </Button>

            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                if (credentialResponse.credential) {
                  await login(credentialResponse.credential);
                  window.location.href = '/dashboard';
                }
              }}
              onError={() => {
                setError('Error al iniciar sesión con Google');
              }}
              width="100%"
            />
          </form>
        </Paper>
      </Fade>
    </Box>
  );
};

export default LoginPage;