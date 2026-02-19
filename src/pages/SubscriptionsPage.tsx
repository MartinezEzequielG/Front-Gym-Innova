// src/pages/SubscriptionsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';

type Status = 'idle' | 'loading' | 'success' | 'error';
type SubscriptionStatus = 'VIGENTE' | 'VENCIDA' | 'PENDIENTE_PAGO' | 'CANCELADA' | string;

interface Subscription {
  id: string;
  client: { id: string; name: string; email: string; dni?: string };
  plan: { id: string; name: string; price?: number };
  branchId: string;
  branch?: { id: string; name: string; address: string };
  startDate: string;
  endDate: string;
  status?: SubscriptionStatus;
}

interface ClientOption {
  id: string;
  name: string;
  email: string;
  dni?: string;
}

interface Plan {
  id: string;
  name: string;
  price?: number;
}

interface Branch {
  id: string;
  name: string;
  address: string;
}

const subStatuses = ['VIGENTE', 'VENCIDA', 'PENDIENTE_PAGO', 'CANCELADA'] as const;

function nfDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(d);
}
function isoToYmd(iso: string) {
  return iso?.slice(0, 10) ?? '—';
}

function StatusChip({ status }: { status: SubscriptionStatus }) {
  const s = status || 'PENDIENTE_PAGO';

  const cfg =
    s === 'VIGENTE'
      ? { bg: alpha('#10b981', 0.12), fg: '#0f766e' }
      : s === 'PENDIENTE_PAGO'
        ? { bg: alpha('#f59e0b', 0.14), fg: '#b45309' }
        : s === 'VENCIDA'
          ? { bg: alpha('#ef4444', 0.12), fg: '#b91c1c' }
          : { bg: alpha('#64748b', 0.14), fg: '#334155' };

  return (
    <Chip
      size="small"
      label={s}
      sx={{ borderRadius: 999, fontWeight: 900, backgroundColor: cfg.bg, color: cfg.fg }}
    />
  );
}

function SubscriptionCard({
  sub,
  onRenew,
  renewing,
}: {
  sub: Subscription;
  onRenew: (s: Subscription) => void;
  renewing: boolean;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 4,
        p: 2.25,
        borderColor: 'rgba(0,0,0,0.08)',
        boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.88))',
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900 }} noWrap>
              {sub.client?.name ?? '—'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              {sub.client?.email ?? '—'} {sub.client?.dni ? `• DNI ${sub.client.dni}` : ''}
            </Typography>
          </Box>
          <StatusChip status={sub.status || 'PENDIENTE_PAGO'} />
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <Box sx={{ borderRadius: 2.5, px: 1.25, py: 0.8, backgroundColor: alpha('#111827', 0.06) }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
              Sucursal
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>
              {sub.branch?.name ?? '—'}
            </Typography>
          </Box>

          <Box sx={{ borderRadius: 2.5, px: 1.25, py: 0.8, backgroundColor: alpha('#111827', 0.06) }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
              Plan
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>
              {sub.plan?.name ?? '—'}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <Chip
            size="small"
            label={`Inicio: ${isoToYmd(sub.startDate)}`}
            sx={{ borderRadius: 999, fontWeight: 900 }}
          />
          <Chip
            size="small"
            label={`Fin: ${isoToYmd(sub.endDate)}`}
            sx={{ borderRadius: 999, fontWeight: 900 }}
          />
        </Stack>

        {sub.status === 'VENCIDA' ? (
          <Button
            size="small"
            variant="outlined"
            onClick={() => onRenew(sub)}
            disabled={renewing}
            sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5, alignSelf: 'flex-start' }}
          >
            {renewing ? 'Renovando…' : 'Renovar'}
          </Button>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Acción: —
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

export default function SubscriptionsPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');

  const [subs, setSubs] = useState<Subscription[]>([]);
  const [open, setOpen] = useState(false);

  // form
  const [form, setForm] = useState({
    clientId: '',
    branchId: '',
    planId: '',
    startDate: '',
  });

  // deps
  const [branches, setBranches] = useState<Branch[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  // autocomplete
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientLoading, setClientLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);

  // filters
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    branchId: '',
  });

  const [renewingId, setRenewingId] = useState<string>('');

  const [renewModal, setRenewModal] = useState<{
    open: boolean;
    clientId: string;
    branchId: string;
    currentPlanId: string;
  } | null>(null);

  const [renewPlanId, setRenewPlanId] = useState<string>('');
  const [renewPlans, setRenewPlans] = useState<Plan[]>([]);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewError, setRenewError] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  const loading = status === 'loading';

  const totals = useMemo(() => {
    const t = { count: subs.length, VIGENTE: 0, VENCIDA: 0, PENDIENTE_PAGO: 0, CANCELADA: 0 };
    for (const s of subs) {
      const st = (s.status || 'PENDIENTE_PAGO') as keyof typeof t;
      if (st in t) (t as any)[st] += 1;
    }
    return t;
  }, [subs]);

  const fetchBranches = async () => {
    try {
      const res = await api.get<Branch[]>('/branches');
      setBranches(res.data);
    } catch {
      setBranches([]);
    }
  };

  const fetchSubs = async () => {
    setStatus('loading');
    setError('');
    try {
      // si tu backend acepta filtros server-side, los podés mandar acá.
      // Por ahora, replico tu enfoque: filtros client-side
      const res = await api.get<Subscription[]>('/subscriptions', {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
      });
      setSubs(res.data);
      setStatus('success');
    } catch {
      setSubs([]);
      setStatus('error');
      setError('No se pudieron cargar las suscripciones.');
    }
  };

  useEffect(() => {
    fetchSubs();
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchSubs();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autocomplete create
  const handleClientInputChange = async (_: any, value: string) => {
    setClientSearch(value);
    if (!value) {
      setClientOptions([]);
      return;
    }
    setClientLoading(true);
    try {
      const res = await api.get<ClientOption[]>('/clients/search', { params: { q: value } });
      setClientOptions(res.data);
    } catch {
      setClientOptions([]);
    } finally {
      setClientLoading(false);
    }
  };

  const handleClientChange = (_: any, value: ClientOption | null) => {
    setSelectedClient(value);
    setForm((f) => ({ ...f, clientId: value ? value.id : '' }));
  };

  const fetchPlansByBranch = async (branchId: string) => {
    if (!branchId) {
      setPlans([]);
      return;
    }
    try {
      const res = await api.get<Plan[]>(`/plans/by-branch/${branchId}`);
      setPlans(res.data);
    } catch {
      setPlans([]);
    }
  };

  const resetForm = () => {
    setForm({ clientId: '', branchId: '', planId: '', startDate: '' });
    setSelectedClient(null);
    setClientSearch('');
    setClientOptions([]);
    setPlans([]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (!form.clientId) throw new Error('Seleccioná un cliente.');
      if (!form.branchId) throw new Error('Seleccioná una sucursal.');
      if (!form.planId) throw new Error('Seleccioná un plan.');
      if (!form.startDate) throw new Error('Seleccioná una fecha de inicio.');

      await api.post('/subscriptions', {
        clientId: form.clientId,
        branchId: form.branchId,
        planId: form.planId,
        startDate: new Date(form.startDate).toISOString(),
      });

      await fetchSubs();
      setOpen(false);
      resetForm();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Error al crear la suscripción.';
      setError(Array.isArray(msg) ? msg.join(' - ') : String(msg));
    }
  };

  const handleRenew = async (sub: Subscription) => {
    setRenewModal({
      open: true,
      clientId: sub.client.id,
      branchId: sub.branchId,
      currentPlanId: sub.plan.id,
    });
    setRenewPlanId(sub.plan.id);
    setRenewLoading(true);
    setRenewError('');
    try {
      const res = await api.get<Plan[]>(`/plans/by-branch/${sub.branchId}`);
      setRenewPlans(res.data);
    } catch {
      setRenewPlans([]);
      setRenewError('No se pudieron cargar los planes.');
    } finally {
      setRenewLoading(false);
    }
  };

  const confirmRenew = async () => {
    if (!renewModal || !renewPlanId) return;
    setRenewLoading(true);
    setRenewError('');
    try {
      await api.post('/subscriptions/renew-for-client', {
        clientId: renewModal.clientId,
        branchId: renewModal.branchId,
        planId: renewPlanId,
      });
      setRenewModal(null);
      await fetchSubs();
    } catch (e: any) {
      setRenewError(e?.response?.data?.message || 'Error al renovar suscripción.');
    } finally {
      setRenewLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    return subs.filter((s) => {
      const st = s.status || 'PENDIENTE_PAGO';
      const okStatus = filters.status ? st === filters.status : true;
      const okBranch = filters.branchId ? s.branchId === filters.branchId : true;

      const hay = [
        s.client?.name,
        s.client?.email,
        s.client?.dni,
        s.branch?.name,
        s.plan?.name,
        st,
        isoToYmd(s.startDate),
        isoToYmd(s.endDate),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const okQ = q ? hay.includes(q) : true;
      return okStatus && okBranch && okQ;
    });
  }, [subs, filters]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1250, mx: 'auto' }}>
      {/* Header estilo Caja/Dashboard */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: { xs: 2, md: 2.5 },
          mb: 3,
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
          background:
            'radial-gradient(1200px 200px at 10% 0%, rgba(25,118,210,0.14) 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ md: 'center' }}
          justifyContent="space-between"
          gap={2}
        >
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
              Suscripciones
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Gestión por sede, vigencia, pendientes y renovaciones.
            </Typography>

            <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip label={`Registros: ${totals.count}`} sx={{ fontWeight: 900, borderRadius: 999 }} />

              <Chip
                label={`Vigentes: ${totals.VIGENTE}`}
                sx={{ fontWeight: 900, borderRadius: 999, backgroundColor: alpha('#10b981', 0.12), color: '#0f766e' }}
              />
              <Chip
                label={`Pendientes: ${totals.PENDIENTE_PAGO}`}
                sx={{ fontWeight: 900, borderRadius: 999, backgroundColor: alpha('#f59e0b', 0.14), color: '#b45309' }}
              />
              <Chip
                label={`Vencidas: ${totals.VENCIDA}`}
                sx={{ fontWeight: 900, borderRadius: 999, backgroundColor: alpha('#ef4444', 0.12), color: '#b91c1c' }}
              />
              {loading && <CircularProgress size={18} />}
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} alignItems={{ sm: 'center' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setOpen(true);
                setError('');
              }}
              disabled={loading}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
            >
              Nueva suscripción
            </Button>

            <Button
              startIcon={<RefreshIcon />}
              onClick={fetchSubs}
              disabled={loading}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
            >
              Actualizar
            </Button>
          </Stack>
        </Stack>

        {status === 'error' && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
            {error || 'Error cargando suscripciones.'}
          </Alert>
        )}
      </Paper>

      {/* Filtros */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: 2.25,
          mb: 2.5,
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1.25} alignItems={{ md: 'center' }}>
          <TextField
            label="Buscar (cliente/email/DNI/plan/sucursal)"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            size="small"
            fullWidth
            sx={{ flex: 1 }}
          />

          <TextField
            label="Sucursal"
            value={filters.branchId}
            onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
            select
            size="small"
            sx={{ minWidth: { xs: '100%', md: 240 } }}
          >
            <MenuItem value="">
              <em>Todas</em>
            </MenuItem>
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Estado"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            select
            size="small"
            sx={{ minWidth: { xs: '100%', md: 220 } }}
          >
            <MenuItem value="">
              <em>Todos</em>
            </MenuItem>
            {subStatuses.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="outlined"
            onClick={fetchSubs}
            disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900, minWidth: { xs: '100%', md: 140 } }}
          >
            Buscar
          </Button>
        </Stack>
      </Paper>

      {error && status !== 'error' && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {/* MOBILE: Cards */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Stack spacing={1.5}>
          {!loading && filtered.length === 0 && (
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 4,
                p: 2.25,
                borderColor: 'rgba(0,0,0,0.08)',
                boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No se encontraron suscripciones con los filtros aplicados.
              </Typography>
            </Paper>
          )}

          {filtered.map((s) => (
            <SubscriptionCard
              key={s.id}
              sub={s}
              onRenew={handleRenew}
              renewing={renewingId === s.id}
            />
          ))}
        </Stack>
      </Box>

      {/* DESKTOP: Table */}
      <Paper
        variant="outlined"
        sx={{
          display: { xs: 'none', md: 'block' },
          borderRadius: 4,
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        <TableContainer sx={{ width: '100%' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>DNI</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Sucursal</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Plan</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Inicio</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Fin</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No se encontraron suscripciones con los filtros aplicados.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {filtered.map((s, idx) => (
                <TableRow
                  key={s.id}
                  hover
                  sx={{
                    '& td': { borderBottomColor: 'rgba(0,0,0,0.06)' },
                    backgroundColor: idx % 2 === 0 ? 'rgba(0,0,0,0.012)' : 'transparent',
                  }}
                >
                  <TableCell sx={{ fontWeight: 900 }}>{s.client?.name ?? '—'}</TableCell>
                  <TableCell>{s.client?.email ?? '—'}</TableCell>
                  <TableCell sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                    {s.client?.dni ?? '—'}
                  </TableCell>
                  <TableCell>{s.branch?.name ?? '—'}</TableCell>
                  <TableCell>{s.plan?.name ?? '—'}</TableCell>
                  <TableCell sx={{ minWidth: 170 }}>{nfDate(s.startDate)}</TableCell>
                  <TableCell sx={{ minWidth: 170 }}>{nfDate(s.endDate)}</TableCell>
                  <TableCell>
                    <StatusChip status={s.status || 'PENDIENTE_PAGO'} />
                  </TableCell>
                  <TableCell>
                    {s.status === 'VENCIDA' ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleRenew(s)}
                        disabled={renewingId === s.id}
                        sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                      >
                        {renewingId === s.id ? 'Renovando…' : 'Renovar'}
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal crear suscripción */}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Nueva suscripción</DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 3 }}>
                {error}
              </Alert>
            )}

            <Autocomplete
              options={clientOptions}
              loading={clientLoading}
              value={selectedClient}
              inputValue={clientSearch}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) =>
                option ? `${option.name} (${option.email})${option.dni ? ' - DNI: ' + option.dni : ''}` : ''
              }
              onInputChange={handleClientInputChange}
              onChange={handleClientChange}
              renderInput={(params) => <TextField {...params} label="Cliente (buscar por nombre, mail o DNI)" required />}
            />

            <TextField
              label="Sucursal"
              value={form.branchId}
              onChange={async (e) => {
                const branchId = e.target.value;
                setForm((f) => ({ ...f, branchId, planId: '' }));
                await fetchPlansByBranch(branchId);
              }}
              select
              required
              fullWidth
            >
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Plan"
              value={form.planId}
              onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}
              select
              required
              fullWidth
              disabled={!form.branchId}
              helperText={!form.branchId ? 'Primero seleccioná una sucursal.' : ''}
            >
              {plans.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Fecha de inicio"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />

            <Paper
              variant="outlined"
              sx={{
                borderRadius: 3,
                p: 2,
                borderColor: alpha('#1976d2', 0.25),
                background: alpha('#1976d2', 0.05),
              }}
            >
              <Typography sx={{ fontWeight: 900 }}>Regla de vigencia</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                La fecha de fin se calcula automáticamente en el backend (mismo día del mes siguiente, estilo 12/01 → 12/02).
              </Typography>
            </Paper>

            <Divider />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              sx={{ textTransform: 'none', fontWeight: 900 }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="contained" sx={{ textTransform: 'none', fontWeight: 900 }}>
              Crear
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal renovar suscripción */}
      {renewModal && (
        <Dialog open={renewModal.open} onClose={() => setRenewModal(null)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ fontWeight: 900 }}>Renovar suscripción</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {renewError && <Alert severity="error">{renewError}</Alert>}
            <TextField
              select
              label="Plan"
              value={renewPlanId}
              onChange={e => setRenewPlanId(e.target.value)}
              fullWidth
              disabled={renewLoading}
            >
              {renewPlans.map(plan => (
                <MenuItem key={plan.id} value={plan.id}>
                  {plan.name}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRenewModal(null)} disabled={renewLoading}>Cancelar</Button>
            <Button
              onClick={confirmRenew}
              variant="contained"
              disabled={!renewPlanId || renewLoading}
            >
              Renovar
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
