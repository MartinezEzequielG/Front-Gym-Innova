// src/pages/PaymentsPage.tsx
import React, { useEffect, useState } from 'react';
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
  Pagination,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha } from '@mui/material/styles';
import { api } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface Payment {
  id: string;
  clientId: string;
  client?: { id: string; name: string; email: string; dni?: string };
  provider: string;
  method: string;
  type?: string;
  notes?: string;
  receiptUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  amount: number;
  currency?: string;
  createdAt: string;
  subscriptionId?: string;
  branchName?: string | null;
}

interface ClientOption {
  id: string;
  name: string;
  email: string;
  dni?: string;
}

interface Subscription {
  id: string;
  plan: { id: string; name: string; price: number };
  startDate: string;
  endDate: string;
  status?: string;
  branchId?: string;
}

type Plan = { id: string; name: string; price: number; branchId?: string };

type PaymentsPagedResponse = {
  data: Payment[];
  meta: { total: number; page: number; limit: number; pages: number };
};

const paymentStatus = ['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'] as const;
const paymentProviders = ['mercado_pago', 'manual', 'otro'] as const;
const paymentMethods = ['CASH', 'CARD', 'TRANSFER', 'MP'] as const;

function nfMoneyARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );
}
function nfDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

function StatusChip({ status }: { status: Payment['status'] }) {
  const cfg =
    status === 'APPROVED'
      ? { bg: alpha('#10b981', 0.12), fg: '#0f766e' }
      : status === 'PENDING'
        ? { bg: alpha('#f59e0b', 0.14), fg: '#b45309' }
        : status === 'REJECTED'
          ? { bg: alpha('#ef4444', 0.12), fg: '#b91c1c' }
          : { bg: alpha('#3b82f6', 0.12), fg: '#1d4ed8' };

  return (
    <Chip
      size="small"
      label={status}
      sx={{ borderRadius: 999, fontWeight: 900, backgroundColor: cfg.bg, color: cfg.fg }}
    />
  );
}

function PaymentCard({ p }: { p: Payment }) {
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
              {p.client?.name ?? p.clientId}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              {p.client?.email ?? '—'} {p.client?.dni ? `• DNI ${p.client.dni}` : ''}
            </Typography>
          </Box>
          <StatusChip status={p.status} />
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <Box sx={{ borderRadius: 2.5, px: 1.25, py: 0.8, backgroundColor: alpha('#111827', 0.06) }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
              Monto
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              {p.currency?.toUpperCase() === 'ARS' || !p.currency ? nfMoneyARS(p.amount) : `${p.amount} ${p.currency}`}
            </Typography>
          </Box>

          <Box sx={{ borderRadius: 2.5, px: 1.25, py: 0.8, backgroundColor: alpha('#111827', 0.06) }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
              Método / Proveedor
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              {p.method} • {p.provider}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <Chip
            size="small"
            label={p.branchName ? `Sucursal: ${p.branchName}` : 'Sucursal: —'}
            sx={{ borderRadius: 999, fontWeight: 900 }}
          />
          <Chip size="small" label={`Fecha: ${nfDateTime(p.createdAt)}`} sx={{ borderRadius: 999, fontWeight: 900 }} />
        </Stack>

        {p.receiptUrl ? (
          <Button
            size="small"
            variant="outlined"
            href={p.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5, alignSelf: 'flex-start' }}
          >
            Ver comprobante
          </Button>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Sin comprobante
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

export default function PaymentsPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [open, setOpen] = useState(false);

  // ✅ paginación server-side
  const [page, setPage] = useState(1); // 1-based
  const [limit, setLimit] = useState(25);
  const [meta, setMeta] = useState<{ total: number; page: number; limit: number; pages: number }>({
    total: 0,
    page: 1,
    limit: 25,
    pages: 1,
  });

  // ✅ renew flow state
  const [isRenewFlow, setIsRenewFlow] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // form
  const [form, setForm] = useState({
    clientId: '',
    provider: 'manual',
    method: 'CASH',
    amount: '',
    currency: 'ARS',
    status: 'PENDING',
    subscriptionId: '',
    notes: '',
    receiptUrl: '',
  });

  // autocomplete (crear pago)
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientLoading, setClientLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);

  // create client modal
  const [openCreateClient, setOpenCreateClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', dni: '' });
  const [creatingClient, setCreatingClient] = useState(false);

  // filters
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    from: '',
    to: '',
  });

  // autocomplete (filtro)
  const [filterClientOptions, setFilterClientOptions] = useState<ClientOption[]>([]);
  const [filterClientLoading, setFilterClientLoading] = useState(false);

  // subscription pending
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  const loading = status === 'loading';

  const buildParams = () => {
    const params: any = {
      page,
      limit,
    };
    if (filters.q) params.q = filters.q;
    if (filters.status) params.status = filters.status;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    return params;
  };

  const fetchPayments = async (opts?: { keepPage?: boolean }) => {
    setStatus('loading');
    setError('');
    try {
      const params = buildParams();
      if (opts?.keepPage === false) params.page = 1;

      const res = await api.get<PaymentsPagedResponse>('/payments', { params });

      const payload = res.data as any;
      const list: Payment[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.results)
              ? payload.results
              : [];

      const metaFromApi =
        payload?.meta && typeof payload.meta === 'object'
          ? payload.meta
          : {
              total: list.length,
              page: params.page ?? 1,
              limit: params.limit ?? 25,
              pages: 1,
            };

      setPayments(list);
      setMeta({
        total: Number(metaFromApi.total) || 0,
        page: Number(metaFromApi.page) || (params.page ?? 1),
        limit: Number(metaFromApi.limit) || (params.limit ?? 25),
        pages: Math.max(1, Number(metaFromApi.pages) || 1),
      });

      // sincronizar state local (si backend ajusta page)
      const nextPage = Number(metaFromApi.page) || (params.page ?? 1);
      if (nextPage !== page) setPage(nextPage);

      setStatus('success');
    } catch {
      setPayments([]);
      setMeta((m) => ({ ...m, total: 0, pages: 1 }));
      setStatus('error');
      setError('No se pudieron cargar los pagos.');
    }
  };

  // cuando cambia ruta o se vuelve a esta pantalla
  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // refetch en cambios de filtros / paginación
  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.from, filters.to, page, limit]);

  // deep-link renewal
  useEffect(() => {
    const state = location.state as any;
    if (state?.renewedSubscription && state?.preselectedClient) {
      setIsRenewFlow(true);
      setError('');
      setSubscriptionError('');

      const branchId = (state.renewedSubscription as any).branchId || (state?.branchId as string | undefined);
      if (branchId) {
        setPlanLoading(true);
        (async () => {
          try {
            const r = await api.get<Plan[]>(`/plans/by-branch/${branchId}`);
            setPlans(r.data);
          } catch {
            setPlans([]);
          } finally {
            setPlanLoading(false);
          }
        })();
      } else {
        setPlans([]);
      }

      setSelectedPlanId(state.renewedSubscription.plan.id);

      setClientOptions([state.preselectedClient]);
      setSelectedClient(state.preselectedClient);
      setCurrentSubscription(state.renewedSubscription);

      setForm((f) => ({
        ...f,
        clientId: state.preselectedClient.id,
        subscriptionId: state.renewedSubscription.id,
        amount: String(state.renewedSubscription.plan.price),
        provider: 'manual',
        method: 'CASH',
        status: 'APPROVED',
      }));

      setOpen(true);
      navigate('/payments', { replace: true });
    }
  }, [location.state, navigate]);

  // autocomplete create payment
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

  const handleClientChange = async (_: any, value: ClientOption | null) => {
    // si el usuario cambia manualmente el cliente, salimos del renew flow
    setIsRenewFlow(false);
    setPlans([]);
    setSelectedPlanId('');

    setSelectedClient(value);
    setForm((f) => ({ ...f, clientId: value ? value.id : '', subscriptionId: '', amount: '' }));
    setCurrentSubscription(null);
    setSubscriptionError('');

    if (!value?.id) return;

    setSubscriptionLoading(true);
    try {
      const res = await api.get<Subscription[]>(`/subscriptions/by-client/${value.id}`, {
        params: { status: 'PENDIENTE_PAGO' },
      });

      if (res.data.length > 0) {
        const sub = res.data[0];
        setCurrentSubscription(sub);
        setForm((f) => ({ ...f, subscriptionId: sub.id, amount: String(sub.plan.price) }));
      } else {
        setCurrentSubscription(null);
        setSubscriptionError('El cliente no tiene una suscripción pendiente de pago.');
      }
    } catch {
      setCurrentSubscription(null);
      setSubscriptionError('Error buscando la suscripción pendiente.');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // filter autocomplete
  const handleFilterClientInputChange = async (_: any, value: string) => {
    if (!value) {
      setFilterClientOptions([]);
      return;
    }
    setFilterClientLoading(true);
    try {
      const res = await api.get<ClientOption[]>('/clients/search', { params: { q: value } });
      setFilterClientOptions(res.data);
    } catch {
      setFilterClientOptions([]);
    } finally {
      setFilterClientLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      clientId: '',
      provider: 'manual',
      method: 'CASH',
      amount: '',
      currency: 'ARS',
      status: 'PENDING',
      subscriptionId: '',
      notes: '',
      receiptUrl: '',
    });

    setSelectedClient(null);
    setClientSearch('');
    setClientOptions([]);
    setCurrentSubscription(null);
    setSubscriptionError('');

    // reset renew flow
    setIsRenewFlow(false);
    setPlans([]);
    setPlanLoading(false);
    setSelectedPlanId('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        clientId: form.clientId,
        provider: form.provider,
        method: form.method,
        amount: Number(form.amount) || 0,
        currency: form.currency || undefined,
        status: form.status || undefined,
        notes: form.notes || undefined,
        receiptUrl: form.receiptUrl || undefined,
        type: 'SUBSCRIPTION' as const,
        subscriptionId: form.subscriptionId?.trim() ? form.subscriptionId.trim() : undefined,
      };

      await api.post('/payments', payload);

      // refrescar primer page para ver el pago arriba (createdAt desc)
      setPage(1);
      await fetchPayments({ keepPage: false });

      setOpen(false);
      resetForm();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (err?.response?.status === 400 && msg) {
        setError(typeof msg === 'string' ? msg : 'Error de validación');
      } else {
        setError('Error al crear el pago.');
      }
    }
  };

  const onChangeForm = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleChangePlanForRenew = async (planId: string) => {
    if (!currentSubscription?.id) return;
    setSelectedPlanId(planId);
    setError('');

    setSubscriptionLoading(true);
    try {
      // ✅ backend: crea nueva subscription PENDIENTE_PAGO con el plan elegido
      const res = await api.patch<Subscription>(`/subscriptions/${currentSubscription.id}/renew`, { planId });

      const newSub = res.data;
      setCurrentSubscription(newSub);

      setForm((f) => ({
        ...f,
        subscriptionId: newSub.id,
        amount: String(newSub.plan.price),
      }));
    } catch {
      setError('No se pudo renovar con el plan seleccionado.');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const applySearch = async () => {
    // cuando tocás Buscar, reseteo página (mismo criterio que clientes)
    setPage(1);
    await fetchPayments({ keepPage: false });
  };

  const rowsPerPageOptions = [10, 25, 50, 100];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1250, mx: 'auto' }}>
      {/* Header */}
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
              Pagos
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Registro y consulta de pagos (manuales / MP) con filtros.
            </Typography>

            <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip label={`Registros: ${meta.total}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
              <Chip
                label={`Aprobados: ${payments.filter(p => p.status === 'APPROVED').length}`} sx={{ fontWeight: 900, borderRadius: 999, backgroundColor: alpha('#10b981', 0.12), color: '#0f766e' }}
              />
              <Chip
                label={`Pendientes: ${payments.filter(p => p.status === 'PENDING').length}`} sx={{ fontWeight: 900, borderRadius: 999, backgroundColor: alpha('#f59e0b', 0.14), color: '#b45309' }}
              />
              {loading && <CircularProgress size={18} />}
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} alignItems={{ sm: 'center' }}>
            <Button
              variant="contained"
              onClick={() => {
                setOpen(true);
                setError('');
              }}
              disabled={loading}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
            >
              Agregar pago
            </Button>

            <Button
              onClick={() => fetchPayments()}
              disabled={loading}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
            >
              Actualizar
            </Button>
          </Stack>
        </Stack>

        {status === 'error' && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
            {error || 'Error cargando pagos.'}
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
          <Autocomplete
            freeSolo
            options={filterClientOptions}
            loading={filterClientLoading}
            getOptionLabel={(option) =>
              typeof option === 'string'
                ? option
                : `${option.name} (${option.email})${option.dni ? ' - DNI: ' + option.dni : ''}`
            }
            onInputChange={handleFilterClientInputChange}
            onChange={(_, value) => {
              const v = typeof value === 'string' ? value : value ? `${value.name} ${value.email} ${value.dni ?? ''}` : '';
              setFilters((f) => ({ ...f, q: v }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Buscar (cliente/email/DNI)"
                size="small"
                fullWidth
                onChange={(e) => setFilters((f) => ({ ...f, q: (e.target as HTMLInputElement).value }))}
              />
            )}
            sx={{ flex: 1 }}
          />

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
            {paymentStatus.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Desde"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: '100%', md: 180 } }}
          />
          <TextField
            label="Hasta"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: '100%', md: 180 } }}
          />

          <Button
            variant="outlined"
            onClick={applySearch}
            disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900, minWidth: { xs: '100%', md: 140 } }}
          >
            Buscar
          </Button>
        </Stack>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          gap={1.25}
          alignItems={{ md: 'center' }}
          justifyContent="space-between"
          sx={{ mt: 1.75 }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Página <b>{meta.page}</b> de <b>{meta.pages}</b> • Total: <b>{meta.total}</b>
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
            <TextField
              label="Items"
              value={String(limit)}
              onChange={(e) => {
                const v = Number(e.target.value);
                setLimit(Number.isFinite(v) && v > 0 ? v : 25);
                setPage(1);
              }}
              select
              size="small"
              sx={{ minWidth: { xs: '100%', sm: 150 } }}
            >
              {rowsPerPageOptions.map((n) => (
                <MenuItem key={n} value={n}>
                  {n} / pág
                </MenuItem>
              ))}
            </TextField>

            <Button
              variant="outlined"
              onClick={() => {
                setFilters({ q: '', status: '', from: '', to: '' });
                setPage(1);
              }}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
              disabled={loading}
            >
              Limpiar
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error && status !== 'error' && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {/* MOBILE */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Stack spacing={1.5}>
          {!loading && payments.length === 0 && (
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
                No se encontraron pagos con los filtros aplicados.
              </Typography>
            </Paper>
          )}

          {payments.map((p) => (
            <PaymentCard key={p.id} p={p} />
          ))}

          {/* Paginación mobile */}
          {meta.pages > 1 && (
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 4,
                p: 1.5,
                borderColor: 'rgba(0,0,0,0.08)',
                boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
              }}
            >
              <Stack direction="row" justifyContent="center">
                <Pagination
                  count={meta.pages}
                  page={page}
                  onChange={(_, v) => setPage(v)}
                  disabled={loading}
                  shape="rounded"
                />
              </Stack>
            </Paper>
          )}
        </Stack>
      </Box>

      {/* DESKTOP */}
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
        <TableContainer sx={{ maxHeight: 620, overflowX: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>DNI</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Método</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Monto</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Sucursal</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Fecha</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {!loading && payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No se encontraron pagos con los filtros aplicados.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {payments.map((p, idx) => (
                <TableRow
                  key={p.id}
                  hover
                  sx={{
                    '& td': { borderBottomColor: 'rgba(0,0,0,0.06)' },
                    backgroundColor: idx % 2 === 0 ? 'rgba(0,0,0,0.012)' : 'transparent',
                  }}
                >
                  <TableCell sx={{ fontWeight: 900 }}>{p.client?.name ?? p.clientId}</TableCell>
                  <TableCell>{p.client?.dni ?? '—'}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>
                    {p.currency?.toUpperCase() === 'ARS' || !p.currency ? nfMoneyARS(Number(p.amount)) : `${p.amount} ${p.currency}`}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={p.status} />
                  </TableCell>
                  <TableCell>{p.branchName ?? '—'}</TableCell>
                  <TableCell sx={{ minWidth: 170 }}>{nfDateTime(p.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer paginación desktop */}
        <Box
          sx={{
            p: 1.5,
            borderTop: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Mostrando <b>{payments.length}</b> de <b>{meta.total}</b> • Página <b>{meta.page}</b>/{meta.pages}
          </Typography>

          {meta.pages > 1 && (
            <Pagination
              count={meta.pages}
              page={page}
              onChange={(_, v) => setPage(v)}
              disabled={loading}
              shape="rounded"
            />
          )}
        </Box>
      </Paper>

      {/* Modal crear pago */}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Agregar pago</DialogTitle>
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
              disabled={isRenewFlow}
            />

            {subscriptionLoading && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Procesando… (suscripción / planes)
              </Typography>
            )}

            {/* ✅ Selector de plan SOLO en renew flow */}
            {isRenewFlow && (
              <TextField
                label="Plan para renovar"
                value={selectedPlanId}
                onChange={(e) => handleChangePlanForRenew(e.target.value)}
                select
                fullWidth
                disabled={planLoading || subscriptionLoading || plans.length === 0}
                helperText={
                  planLoading
                    ? 'Cargando planes…'
                    : plans.length === 0
                      ? 'No hay planes disponibles para esta sucursal.'
                      : 'Elegí el plan con el que querés renovar.'
                }
              >
                {plans.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} • {nfMoneyARS(p.price)}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {currentSubscription && (
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  p: 2,
                  borderColor: alpha('#10b981', 0.25),
                  background: alpha('#10b981', 0.06),
                }}
              >
                <Typography sx={{ fontWeight: 900 }}>
                  Suscripción pendiente: {currentSubscription.plan.name} • {nfMoneyARS(currentSubscription.plan.price)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Vigencia: {currentSubscription.startDate.slice(0, 10)} a {currentSubscription.endDate.slice(0, 10)}
                </Typography>
              </Paper>
            )}

            {subscriptionError && (
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                {subscriptionError}
              </Alert>
            )}

            <Button
              variant="outlined"
              onClick={() => setOpenCreateClient(true)}
              sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
              disabled={isRenewFlow}
            >
              ¿No encontrás el cliente? Crear nuevo
            </Button>

            <Divider />

            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25}>
              <TextField
                label="Proveedor"
                name="provider"
                value={form.provider}
                onChange={onChangeForm}
                select
                required
                fullWidth
              >
                {paymentProviders.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>

              <TextField label="Método" name="method" value={form.method} onChange={onChangeForm} select required fullWidth>
                {paymentMethods.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25}>
              <TextField
                label="Monto"
                name="amount"
                type="number"
                value={form.amount}
                onChange={onChangeForm}
                required
                fullWidth
                InputProps={{ readOnly: Boolean(currentSubscription) }}
              />
              <TextField label="Moneda" name="currency" value={form.currency} onChange={onChangeForm} fullWidth />
            </Stack>

            <TextField label="Estado" name="status" value={form.status} onChange={onChangeForm} select fullWidth>
              {paymentStatus.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>

            <TextField label="Notas" name="notes" value={form.notes} onChange={onChangeForm} fullWidth />

            <TextField
              label="Comprobante (URL)"
              name="receiptUrl"
              value={form.receiptUrl}
              onChange={onChangeForm}
              fullWidth
            />
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
            <Button
              type="submit"
              variant="contained"
              disabled={!form.clientId || (!form.amount || Number(form.amount) <= 0) || subscriptionLoading}
              sx={{ textTransform: 'none', fontWeight: 900 }}
            >
              Guardar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal crear cliente */}
      <Dialog open={openCreateClient} onClose={() => setOpenCreateClient(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Crear nuevo cliente</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Nombre"
            value={newClient.name}
            onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))}
            required
          />
          <TextField
            label="Email"
            value={newClient.email}
            onChange={(e) => setNewClient((c) => ({ ...c, email: e.target.value }))}
            required
            type="email"
          />
          <TextField
            label="DNI"
            value={newClient.dni}
            onChange={(e) => setNewClient((c) => ({ ...c, dni: e.target.value }))}
            required
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCreateClient(false)} sx={{ textTransform: 'none', fontWeight: 900 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              setCreatingClient(true);
              try {
                const res = await api.post<ClientOption>('/clients', newClient);
                setClientOptions((opts) => [res.data, ...opts]);
                setSelectedClient(res.data);
                setForm((f) => ({ ...f, clientId: res.data.id }));
                setOpenCreateClient(false);
                setNewClient({ name: '', email: '', dni: '' });
              } catch {
                setError('Error al crear cliente.');
              } finally {
                setCreatingClient(false);
              }
            }}
            disabled={creatingClient}
            sx={{ textTransform: 'none', fontWeight: 900 }}
          >
            {creatingClient ? 'Creando…' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
