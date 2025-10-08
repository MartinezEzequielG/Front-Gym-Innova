import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Fade,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { api } from '../context/AuthContext';
import { BranchSelector } from '../components/BranchSelector';

interface Client {
  id?: string;
  name?: string;
  subscriptionStatus?: string;
}

interface Branch {
  id: string;
  name: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const ReceptionPage: React.FC = () => {
  const [dni, setDni] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetForm = () => {
    setDni('');
    setClient(null);
    setError('');
    setStatus('idle');
    if (inputRef.current) inputRef.current.focus();
  };

  useEffect(() => {
    if (status === 'success' || status === 'error') {
      timeoutRef.current = setTimeout(() => resetForm(), 9000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [status]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await api.get('/branches');
        setBranches(res.data);
        if (res.data.length > 0) {
          setSelectedBranchId(res.data[0].id);
        }
      } catch {
        setBranches([]);
      }
    };
    loadBranches();
  }, []);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');
    setClient(null);
    try {
      const res = await api.post('/attendance/quick-checkin', {
        dni,
        branchId: selectedBranchId,
      });
      setClient(res.data.client);
      setStatus('success');
    } catch (err: any) {
      setError(
        err?.response?.status === 404
          ? 'No se encontró un cliente con ese DNI.'
          : err?.response?.data?.message || 'Error al conectar con el servidor.'
      );
      setStatus('error');
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((status === 'success' || status === 'error') && (/[0-9]/.test(e.key) || e.key === 'Backspace')) {
      resetForm();
    }
    if (e.key === 'Enter' && dni.length > 0 && status !== 'loading') {
      handleCheck(e as any);
    }
  };

  const getStatusIcon = (status?: string) => {
    if (status === 'VIGENTE') return <CheckCircleIcon sx={{ color: '#FFD600', fontSize: 60, mb: 1 }} />;
    if (status === 'PENDIENTE_PAGO') return <WarningAmberIcon sx={{ color: '#FFD600', fontSize: 60, mb: 1 }} />;
    if (status === 'VENCIDA') return <CancelIcon sx={{ color: '#FFD600', fontSize: 60, mb: 1 }} />;
    return null;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        backgroundImage: `
          linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.85)),
          url('/images/gym-bg.jpg')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Montserrat", sans-serif',
        overflow: 'hidden',
      }}
    >
      <Typography
        variant="h2"
        sx={{
          fontWeight: 900,
          letterSpacing: 4,
          color: '#FFD600',
          textShadow: '2px 2px 16px #000',
          fontSize: { xs: 32, md: 48 },
          mb: 1,
        }}
      >
        ACERO GYM
      </Typography>
      <Typography
        variant="h6"
        sx={{ color: '#fff', fontWeight: 500, letterSpacing: 2, mb: 4 }}
      >
        by INNOVA
      </Typography>

      <Box sx={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
        <form onSubmit={handleCheck}>
          <TextField
            label="DNI"
            placeholder="Ej. 12345678"
            value={dni}
            onChange={e => setDni(e.target.value)}
            fullWidth
            required
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.08)',
                borderRadius: 2,
                fontSize: 24,
                '& fieldset': { borderColor: '#FFD600' },
                '&:hover fieldset': { borderColor: '#FFD600' },
                '&.Mui-focused fieldset': { borderColor: '#FFD600', borderWidth: 2 },
              },
              '& .MuiInputLabel-root': { color: '#FFD600', fontSize: 20 },
            }}
            inputProps={{
              maxLength: 12,
              inputMode: 'numeric',
              pattern: '[0-9]*',
              style: { fontSize: 24, textAlign: 'center', letterSpacing: 2, color: '#fff' },
            }}
            variant="outlined"
            inputRef={inputRef}
            onKeyDown={handleInputKeyDown}
            autoFocus
          />
          <BranchSelector
            branches={branches}
            value={selectedBranchId}
            onChange={setSelectedBranchId}
            required
            label="Sucursal actual"
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={status === 'loading'}
            sx={{
              fontWeight: 700,
              py: 1.2,
              fontSize: 20,
              bgcolor: '#FFD600',
              color: '#111',
              borderRadius: 2,
              boxShadow: '0 2px 8px #000',
              transition: 'background-color 0.3s',
              '&:hover': { bgcolor: '#FFC300' },
              mb: 1,
            }}
          >
            {status === 'loading' ? <CircularProgress size={24} color="inherit" /> : 'Verificar'}
          </Button>
        </form>
      </Box>

      <Fade in={status === 'error'}>
        <Box
          sx={{
            bgcolor: '#FFD600',
            color: '#111',
            borderRadius: 2,
            px: 3,
            py: 2,
            fontSize: 18,
            fontWeight: 600,
            boxShadow: '0 2px 8px #000',
            display: 'inline-block',
            mt: 3,
          }}
        >
          {error}
        </Box>
      </Fade>

      <Fade in={status === 'success'}>
        <Box
          sx={{
            mt: 4,
            borderRadius: 2,
            textAlign: 'center',
            boxShadow: '0 0 32px #FFD600',
            p: 2,
          }}
        >
          {client && (
            <>
              {getStatusIcon(client.subscriptionStatus)}
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: '#fff',
                  textShadow: '1px 1px 12px #000',
                }}
              >
                {client.subscriptionStatus === 'VIGENTE'
                  ? `¡Bienvenido/a ${client.name || ''}!`
                  : `No puede ingresar`}
              </Typography>
              <Chip
                label={client.subscriptionStatus || 'Sin suscripción'}
                sx={{
                  fontSize: 20,
                  px: 4,
                  py: 2,
                  mb: 2,
                  bgcolor: '#FFD600',
                  color: '#111',
                  boxShadow: '0 2px 8px #FFD600',
                }}
                size="medium"
              />
              {client.subscriptionStatus !== 'VIGENTE' && (
                <Typography variant="body1" sx={{ mt: 2, color: '#fff', fontSize: 18 }}>
                  Su suscripción está <b>{client.subscriptionStatus}</b>.<br />
                  Por favor, regularice su situación en recepción.
                </Typography>
              )}
            </>
          )}
        </Box>
      </Fade>
    </Box>
  );
};

export default ReceptionPage;
