import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  Fade,
  Grow,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../context/AuthContext';
import { BranchSelector } from '../components/BranchSelector';
import { useNavigate } from 'react-router-dom';

interface ClientSubscriptionInfo {
  id?: string;
  endDate?: string | Date;
  planName?: string;
  branchName?: string;
}

interface Client {
  id?: string;
  name?: string;
  subscriptionStatus?: 'VIGENTE' | 'PENDIENTE_PAGO' | 'VENCIDA' | string;
  dni?: string;
  email?: string;
  subscription?: ClientSubscriptionInfo;
}

interface Branch {
  id: string;
  name: string;
  address: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

type HistoryItem = {
  at: string;
  dni: string;
  name?: string;
  status?: string;
  branchName?: string;
  planName?: string;
};

type ReceptionCheckinResponse = {
  client: Client;
};

// -------------------- helpers --------------------

function formatDateAR(value?: string | Date) {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function daysRemaining(endDate?: string | Date) {
  if (!endDate) return null;
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffMs = startOfEnd.getTime() - startOfToday.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays < 0 ? 0 : diffDays;
}

function remainingLabel(days: number | null) {
  if (days == null) return null;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} días`;
}

function statusMeta(status?: string) {
  switch (status) {
    case 'VIGENTE':
      return { color: '#4caf50', label: 'Acceso permitido', icon: <CheckCircleIcon sx={{ fontSize: 120 }} /> };
    case 'PENDIENTE_PAGO':
      return { color: '#ff9800', label: 'Pago pendiente', icon: <WarningAmberIcon sx={{ fontSize: 120 }} /> };
    case 'VENCIDA':
      return { color: '#f44336', label: 'Suscripción vencida', icon: <CancelIcon sx={{ fontSize: 120 }} /> };
    default:
      return { color: '#f44336', label: 'Sin suscripción activa', icon: <CancelIcon sx={{ fontSize: 120 }} /> };
  }
}

function initials(name?: string) {
  if (!name) return 'CL';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'C';
  const second = parts[1]?.[0] ?? 'L';
  return `${first}${second}`.toUpperCase();
}

function getViewMode(): 'kiosk' | 'admin' | 'auto' {
  const v = (import.meta as any).env?.VITE_RECEPTION_VIEW?.toLowerCase?.();
  if (v === 'kiosk' || v === 'admin' || v === 'auto') return v;
  return 'auto';
}

// -------------------- component --------------------

const ReceptionPage: React.FC = () => {
  const navigate = useNavigate();

  const [dni, setDni] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [connectionError, setConnectionError] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  const AUTO_SUBMIT_LEN = 8;
  const AUTO_RESET_MS = 5000;

  const viewMode = getViewMode();
  const canSeeAdminPanel = useMemo(() => {
    if (viewMode === 'admin') return true;
    if (viewMode === 'kiosk') return false;
    return false;
  }, [viewMode]);

  const isKiosk = !canSeeAdminPanel;

  const resetForm = (focus = true) => {
    setDni('');
    setClient(null);
    setError('');
    setStatus('idle');
    setModalOpen(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (focus) setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (status === 'success' || status === 'error') {
      setModalOpen(true);
      timeoutRef.current = setTimeout(() => resetForm(true), AUTO_RESET_MS);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await api.get<Branch[]>('/branches');
        setBranches(res.data);

        if (res.data.length > 0) {
          const lastBranch = localStorage.getItem('lastSelectedBranch');
          const initial = lastBranch && res.data.some((b) => b.id === lastBranch) ? lastBranch : res.data[0].id;
          setSelectedBranchId(initial);
        }

        setConnectionError(false);
      } catch {
        setBranches([]);
        setConnectionError(true);
      }
    };
    loadBranches();
  }, []);

  const meta = statusMeta(client?.subscriptionStatus);
  const remainingDays = useMemo(() => daysRemaining(client?.subscription?.endDate), [client?.subscription?.endDate]);
  const remainingText = useMemo(() => remainingLabel(remainingDays), [remainingDays]);

  const urgencyBar = useMemo(() => {
    if (client?.subscriptionStatus !== 'VIGENTE') return null;
    if (remainingDays == null) return null;

    const value = Math.max(0, Math.min(100, (remainingDays / 30) * 100));
    const barColor = remainingDays <= 3 ? '#f44336' : remainingDays <= 7 ? '#ff9800' : '#4caf50';
    return { value, barColor };
  }, [client?.subscriptionStatus, remainingDays]);

  const addToHistory = (payload: Client, usedDni: string) => {
    const item: HistoryItem = {
      at: new Date().toISOString(),
      dni: usedDni,
      name: payload.name,
      status: payload.subscriptionStatus,
      branchName: payload.subscription?.branchName,
      planName: payload.subscription?.planName,
    };
    setHistory((prev) => [item, ...prev].slice(0, 12));
  };

  // Reemplazar handleCheck por una función que recibe el DNI explícito
  const doCheck = async (dniToCheck: string) => {
    const cleanDni = String(dniToCheck ?? '').trim();

    if (!selectedBranchId) {
      setError('Selecciona una sucursal');
      setStatus('error');
      return;
    }
    if (!cleanDni) return;

    // Guard sincrónico (evita doble submit en el mismo tick)
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setStatus('loading');
    setError('');
    setClient(null);

    try {
      const res = await api.post<ReceptionCheckinResponse>('/attendance/quick-checkin', {
        dni: cleanDni,
        branchId: selectedBranchId,
      });

      const payload: Client = res.data.client;
      setClient(payload);
      setStatus('success');

      localStorage.setItem('lastSelectedBranch', selectedBranchId);
      if (canSeeAdminPanel) addToHistory(payload, cleanDni);
    } catch (err: any) {
      const httpStatus = err?.response?.status;
      const backendMsg = err?.response?.data?.message;

      if (httpStatus === 404) setError('No se encontró un cliente con ese DNI.');
      else if (httpStatus === 403) setError(backendMsg || 'Acceso denegado para esta sucursal.');
      else if (httpStatus === 401) setError('Sesión vencida o no autenticado. Inicia sesión nuevamente.');
      else setError(backendMsg || 'Error al conectar con el servidor.');

      setStatus('error');
    } finally {
      inFlightRef.current = false;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Mantener handler del form, pero que use el state actual (submit manual)
  const handleCheck = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await doCheck(dni);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setDni(value);

    if ((status === 'success' || status === 'error') && value.length > 0) {
      setClient(null);
      setError('');
      setStatus('idle');
      setModalOpen(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    // Auto-submit con el value real (no el state)
    if (value.length === AUTO_SUBMIT_LEN) {
      setTimeout(() => doCheck(value), 0);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Usar el valor real del input, no el state
      const current = (e.currentTarget as HTMLInputElement).value.replace(/\D/g, '');
      if (current.length > 0) doCheck(current);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      resetForm(true);
    }
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    localStorage.setItem('lastSelectedBranch', branchId);
    resetForm(true);
  };

  const handleCloseModal = () => {
    resetForm(true);
  };

  return (
    <Box
      sx={{
        // Fallback universal
        minHeight: '100vh',
        height: '100vh',

        // ✅ Si el navegador soporta dvh, lo usamos (evita bugs en multi-monitor/zoom)
        '@supports (height: 100dvh)': {
          minHeight: '100dvh',
          height: '100dvh',
        },

        width: '100vw',
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Montserrat", sans-serif',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(255,214,0,0.08), transparent 40%),
            radial-gradient(circle at 80% 80%, rgba(76,175,80,0.06), transparent 40%)
          `,
          pointerEvents: 'none',
        },
      }}
    >
      {/* Top controls (admin only) */}
      {!isKiosk && (
        <Box sx={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: 1, zIndex: 10 }}>
          <IconButton
            onClick={() => navigate('/dashboard')}
            sx={{
              bgcolor: 'rgba(255,255,255,0.08)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.12)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
            }}
          >
            <HomeIcon />
          </IconButton>
          <IconButton
            onClick={() => resetForm(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.08)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.12)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      )}

      {/* History panel (admin only, sidebar right) */}
      {!isKiosk && (
        <Paper
          elevation={12}
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            bottom: 20,
            width: 320,
            p: 2.5,
            borderRadius: 3,
            bgcolor: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(12px)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon sx={{ color: 'rgba(255,255,255,0.75)' }} />
              <Typography sx={{ color: '#fff', fontWeight: 950 }}>Últimos ingresos</Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setShowHistory((s) => !s)}
              sx={{
                borderColor: 'rgba(255,255,255,0.25)',
                color: '#fff',
                '&:hover': { borderColor: 'rgba(255,255,255,0.45)' },
              }}
            >
              {showHistory ? 'Ocultar' : 'Mostrar'}
            </Button>
          </Box>

          <Fade in={showHistory} timeout={180}>
            <Box
              sx={{
                display: showHistory ? 'block' : 'none',
                flex: 1,
                overflowY: 'auto',
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: 'rgba(255,214,0,0.5)',
                  borderRadius: 3,
                },
              }}
            >
              {history.length === 0 ? (
                <Typography sx={{ color: 'rgba(255,255,255,0.65)' }} variant="body2">
                  Sin registros aún.
                </Typography>
              ) : (
                <Stack spacing={1.2}>
                  {history.map((h, idx) => {
                    const m = statusMeta(h.status);
                    return (
                      <Paper
                        key={`${h.at}-${idx}`}
                        elevation={0}
                        sx={{
                          p: 1.2,
                          borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ color: '#fff', fontWeight: 950, fontSize: 14 }} noWrap>
                              {h.name || `DNI ${h.dni}`}
                            </Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.60)', fontSize: 12 }} noWrap>
                              {new Date(h.at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} • {h.branchName || '—'} • {h.planName || '—'}
                            </Typography>
                          </Box>
                          <Chip size="small" label={m.label} sx={{ bgcolor: `${m.color}cc`, color: '#fff', fontWeight: 950, fontSize: 10 }} />
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Fade>
        </Paper>
      )}

      {/* Main content - centered */}
      <Grow in timeout={600}>
        <Box sx={{ width: '100%', maxWidth: 600, px: 3, zIndex: 5 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              sx={{
                fontWeight: 950,
                letterSpacing: 8,
                background: 'linear-gradient(90deg, #FFD600, #FFC300, #FFD600)',
                backgroundSize: '200% 100%',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'gradient 3s ease infinite',
                fontSize: { xs: 48, md: 72 },
                '@keyframes gradient': {
                  '0%, 100%': { backgroundPosition: '0% 50%' },
                  '50%': { backgroundPosition: '100% 50%' },
                },
              }}
            >
              ACERO GYM
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: 3, mt: 1, fontSize: 18 }}>
              {isKiosk ? 'Control de acceso' : 'Recepción (Admin)'}
            </Typography>
          </Box>

          {connectionError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Error de conexión. Verifica tu red o el backend.
            </Alert>
          )}

          {/* Form card */}
          <Paper
            elevation={24}
            sx={{
              p: 4,
              borderRadius: 4,
              bgcolor: 'rgba(0,0,0,0.80)',
              border: '1px solid rgba(255,214,0,0.20)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <form onSubmit={handleCheck}>
              <Stack spacing={3}>
                <TextField
                  label="DNI"
                  placeholder="Ej. 12345678"
                  value={dni}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  inputRef={inputRef}
                  onKeyDown={handleInputKeyDown}
                  autoFocus
                  disabled={status === 'loading'}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.05)',
                      borderRadius: 2,
                      '& fieldset': { borderColor: 'rgba(255,214,0,0.50)' },
                      '&:hover fieldset': { borderColor: '#FFD600' },
                      '&.Mui-focused fieldset': { borderColor: '#FFD600', borderWidth: 2 },
                      transition: 'all 0.3s ease',
                    },
                    '& .MuiInputLabel-root': { color: '#FFD600', fontWeight: 800 },
                  }}
                  inputProps={{
                    maxLength: 12,
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    style: {
                      fontSize: 48,
                      textAlign: 'center',
                      letterSpacing: 6,
                      color: '#fff',
                      fontWeight: 950,
                    },
                  }}
                />

                <BranchSelector branches={branches} value={selectedBranchId} onChange={handleBranchChange} required label="Sucursal" disabled={status === 'loading'} />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={status === 'loading' || !dni || !selectedBranchId}
                  sx={{
                    fontWeight: 950,
                    py: 2,
                    fontSize: 24,
                    bgcolor: '#FFD600',
                    color: '#111',
                    borderRadius: 2,
                    boxShadow: '0 12px 28px rgba(255,214,0,0.25)',
                    '&:hover': { bgcolor: '#FFC300', transform: 'translateY(-2px)' },
                    '&:disabled': { bgcolor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' },
                  }}
                >
                  {status === 'loading' ? <CircularProgress size={32} color="inherit" /> : 'VERIFICAR ACCESO'}
                </Button>

                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', fontSize: 13 }}>
                  Presiona ENTER para verificar • ESC para limpiar
                </Typography>
              </Stack>
            </form>
          </Paper>
        </Box>
      </Grow>

      {/* Result modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0,0,0,0.95)',
            backgroundImage: 'none',
            border: `3px solid ${status === 'error' ? '#f44336' : meta.color}`,
            borderRadius: 4,
            boxShadow: `0 0 60px ${status === 'error' ? '#f44336' : meta.color}88`,
          },
        }}
      >
        <IconButton
          onClick={handleCloseModal}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: '#fff',
            bgcolor: 'rgba(255,255,255,0.10)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.20)' },
          }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent sx={{ p: 5 }}>
          {/* Error state */}
          {status === 'error' && (
            <Fade in timeout={300}>
              <Box sx={{ textAlign: 'center' }}>
                <CancelIcon sx={{ fontSize: 140, color: '#f44336', mb: 2 }} />
                <Typography sx={{ color: '#fff', fontWeight: 950, fontSize: 42, mb: 2 }}>ACCESO DENEGADO</Typography>
                <Alert severity="error" sx={{ bgcolor: 'rgba(244,67,54,0.20)', color: '#fff', border: '1px solid rgba(244,67,54,0.40)', fontSize: 18 }}>
                  {error}
                </Alert>
              </Box>
            </Fade>
          )}

          {/* Success state */}
          {status === 'success' && client && (
            <Fade in timeout={300}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                  <Box sx={{ color: meta.color }}>{meta.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: '#fff', fontWeight: 950, fontSize: 42, lineHeight: 1 }}>
                      {client.subscriptionStatus === 'VIGENTE' ? 'ACCESO PERMITIDO' : 'ACCESO DENEGADO'}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 900, fontSize: 24, mt: 1 }}>
                      {isKiosk ? `Cliente ${initials(client.name)}` : client.name || 'Cliente'}
                    </Typography>
                    <Chip label={meta.label} sx={{ bgcolor: meta.color, color: '#fff', fontWeight: 950, mt: 2, fontSize: 16, px: 2, py: 1 }} />
                  </Box>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', my: 3 }} />

                <Stack spacing={2}>
                  {!!client.dni && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 900, fontSize: 16 }}>DNI</Typography>
                      <Typography sx={{ color: '#fff', fontWeight: 950, fontSize: 18 }}>
                        {client.dni}
                      </Typography>
                    </Box>
                  )}

                  {!!client.name && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 900, fontSize: 16 }}>Nombre</Typography>
                      <Typography sx={{ color: '#fff', fontWeight: 950, fontSize: 18 }}>
                        {client.name}
                      </Typography>
                    </Box>
                  )}

                  {!isKiosk && !!client.email && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 900, fontSize: 16 }}>Email</Typography>
                      <Typography sx={{ color: '#fff', fontWeight: 950, fontSize: 18 }}>{client.email}</Typography>
                    </Box>
                  )}

                  {!isKiosk && !!client.subscription?.branchName && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 900, fontSize: 16 }}>Sucursal</Typography>
                      <Typography sx={{ color: '#fff', fontWeight: 950, fontSize: 18 }}>{client.subscription.branchName}</Typography>
                    </Box>
                  )}

                  {!isKiosk && !!client.subscription?.planName && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 900, fontSize: 16 }}>Plan</Typography>
                      <Typography sx={{ color: '#FFD600', fontWeight: 950, fontSize: 18 }}>{client.subscription.planName}</Typography>
                    </Box>
                  )}

                  {!!client.subscription?.endDate && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 900, fontSize: 16 }}>Vencimiento</Typography>
                      <Typography sx={{ color: '#fff', fontWeight: 950, fontSize: 18 }}>{formatDateAR(client.subscription.endDate)}</Typography>
                    </Box>
                  )}

                  {client.subscriptionStatus === 'VIGENTE' && remainingDays != null && (
                    <>
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)', my: 2 }} />
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 900, fontSize: 14 }}>Días restantes</Typography>
                          <Typography sx={{ color: '#fff', fontWeight: 950, fontSize: 36 }}>
                            {remainingDays} día{remainingDays === 1 ? '' : 's'}
                          </Typography>
                        </Box>
                        {remainingText && (
                          <Typography sx={{ color: remainingDays <= 7 ? '#ff9800' : '#9ccc65', fontWeight: 900, fontSize: 14, textAlign: 'right' }}>
                            {remainingText}
                          </Typography>
                        )}
                        {urgencyBar && (
                          <LinearProgress
                            variant="determinate"
                            value={urgencyBar.value}
                            sx={{
                              mt: 2,
                              height: 14,
                              borderRadius: 99,
                              bgcolor: 'rgba(255,255,255,0.08)',
                              '& .MuiLinearProgress-bar': { bgcolor: urgencyBar.barColor },
                            }}
                          />
                        )}
                      </Box>
                    </>
                  )}
                </Stack>

                {client.subscriptionStatus !== 'VIGENTE' && (
                  <Alert severity="warning" sx={{ mt: 3, bgcolor: 'rgba(255,152,0,0.20)', border: '1px solid rgba(255,152,0,0.40)' }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 16 }}>
                      Estado: <b>{client.subscriptionStatus}</b>
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Regularizar en administración.
                    </Typography>
                  </Alert>
                )}
              </Box>
            </Fade>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ReceptionPage;

