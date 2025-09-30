import React, { useEffect, useState } from 'react';
import {
  Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Autocomplete, Box
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { api } from '../context/AuthContext';

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
}

const paymentStatus = ['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'];
const paymentProviders = ['mercado_pago', 'manual', 'otro'];
const paymentMethods = ['CASH', 'CARD', 'TRANSFER', 'MP'];

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    clientId: '',
    provider: '',
    method: '',
    amount: '',
    currency: 'ARS',
    status: 'PENDING',
    subscriptionId: '',
    notes: '',
    receiptUrl: '',
  });

  // Autocomplete clients
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientLoading, setClientLoading] = useState(false);

  // Modal para crear cliente
  const [openCreateClient, setOpenCreateClient] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    dni: '',
  });
  const [creatingClient, setCreatingClient] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    status: '',
    from: '',
    to: '',
  });

  // Para el filtro de cliente en la tabla
  const [filterClientOptions, setFilterClientOptions] = useState<ClientOption[]>([]);
  const [filterClientLoading, setFilterClientLoading] = useState(false);

  // Suscripción pendiente
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line
  }, [filters]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.email) params.email = filters.email;
      if (filters.name) params.name = filters.name;
      if (filters.status) params.status = filters.status;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const res = await api.get<Payment[]>('/payments', { params });
      setPayments(res.data);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  // Autocomplete para seleccionar cliente al crear pago
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

  // Cuando selecciono un cliente, busco su suscripción pendiente de pago
  const handleClientChange = async (_: any, value: ClientOption | null) => {
    setForm(f => ({
      ...f,
      clientId: value ? value.id : '',
      subscriptionId: '',
      amount: '',
    }));
    setCurrentSubscription(null);
    setSubscriptionError('');
    if (value && value.id) {
      setSubscriptionLoading(true);
      try {
        // CAMBIO: Usar el nuevo endpoint filtrado por cliente
        const res = await api.get<Subscription[]>(`/subscriptions/by-client/${value.id}`, {
          params: { status: 'PENDIENTE_PAGO' }
        });
        if (res.data.length > 0) {
          const sub = res.data[0];
          setCurrentSubscription(sub);
          setForm(f => ({
            ...f,
            subscriptionId: sub.id,
            amount: sub.plan.price.toString(),
          }));
        } else {
          setCurrentSubscription(null);
          setSubscriptionError('El cliente no tiene una suscripción pendiente de pago.');
        }
      } catch {
        setCurrentSubscription(null);
        setSubscriptionError('Error buscando la suscripción pendiente.');
      }
      setSubscriptionLoading(false);
    }
  };

  // Autocomplete para filtro de cliente
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        type: 'SUBSCRIPTION',
        amount: Number(form.amount) || 0,
        currency: form.currency || undefined,
        status: form.status || undefined,
        method: form.method || undefined,
        notes: form.notes || undefined,
        receiptUrl: form.receiptUrl || undefined,
      };
      if (!form.subscriptionId || form.subscriptionId.trim() === '') {
        delete payload.subscriptionId;
      }
      await api.post('/payments', payload);
      fetchPayments();
      setOpen(false);
      setForm({
        clientId: '',
        provider: '',
        method: '',
        amount: '',
        currency: 'ARS',
        status: 'PENDING',
        subscriptionId: '',
        notes: '',
        receiptUrl: '',
      });
      setCurrentSubscription(null);
      setSubscriptionError('');
      alert('Pago registrado correctamente. El estado de la suscripción se ha actualizado.');
    } catch (err: any) {
      // MEJORA: Manejo específico de errores de validación
      if (err?.response?.status === 400 && err?.response?.data?.message) {
        alert(`Error de validación: ${err.response.data.message}`);
        // Limpiar la suscripción seleccionada si hay error de asociación
        setCurrentSubscription(null);
        setForm(f => ({ ...f, subscriptionId: '', amount: '' }));
      } else {
        alert('Error al crear el pago');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'error';
      case 'REFUNDED': return 'info';
      default: return 'default';
    }
  };

  // Filtros handlers
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Pagos
      </Typography>
      {/* Filtros */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <Autocomplete
              freeSolo
              options={filterClientOptions}
              loading={filterClientLoading}
              getOptionLabel={option => typeof option === 'string' ? option : `${option.name} (${option.email})${option.dni ? ' - DNI: ' + option.dni : ''}`}
              onInputChange={handleFilterClientInputChange}
              onChange={(_, value) => {
                setFilters(f => ({
                  ...f,
                  email: typeof value === 'string'
                    ? value
                    : value?.email || '',
                  name: typeof value === 'string'
                    ? value
                    : value?.name || ''
                }));
              }}
              renderInput={params => (
                <TextField {...params} label="Buscar cliente/email/DNI" size="small" />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label="Estado"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              select
              size="small"
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              {paymentStatus.map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label="Fecha desde"
              name="from"
              type="date"
              value={filters.from}
              onChange={handleFilterChange}
              size="small"
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              label="Fecha hasta"
              name="to"
              type="date"
              value={filters.to}
              onChange={handleFilterChange}
              size="small"
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button variant="outlined" onClick={fetchPayments} sx={{ height: '100%' }}>
              Buscar
            </Button>
          </Grid>
        </Grid>
      </Box>
      <Button variant="contained" sx={{ mb: 2 }} onClick={() => setOpen(true)}>
        Agregar Pago
      </Button>
      {loading ? (
        <Typography variant="body2">Cargando...</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>DNI</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Método</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Monto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Notas</TableCell>
              <TableCell>Comprobante</TableCell>
              <TableCell>Fecha</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map(payment => (
              <TableRow key={payment.id}>
                <TableCell>{payment.client?.name || payment.clientId}</TableCell>
                <TableCell>{payment.client?.email || '-'}</TableCell>
                <TableCell>{payment.client?.dni || '-'}</TableCell>
                <TableCell>{payment.provider}</TableCell>
                <TableCell>{payment.method}</TableCell>
                <TableCell>{payment.type}</TableCell>
                <TableCell>
                  {payment.amount} {payment.currency}
                </TableCell>
                <TableCell>
                  <Chip label={payment.status} color={statusColor(payment.status)} size="small" />
                </TableCell>
                <TableCell>{payment.notes}</TableCell>
                <TableCell>
                  {payment.receiptUrl ? (
                    <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">Ver</a>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {new Date(payment.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal para agregar pago */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Agregar Pago</DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350 }}>
            <Autocomplete
              options={clientOptions}
              loading={clientLoading}
              getOptionLabel={option => option ? `${option.name} (${option.email})${option.dni ? ' - DNI: ' + option.dni : ''}` : ''}
              onInputChange={handleClientInputChange}
              onChange={handleClientChange}
              renderInput={params => (
                <TextField {...params} label="Cliente (buscar por nombre, mail o DNI)" required />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
            {subscriptionLoading && <Typography color="info.main">Buscando suscripción pendiente...</Typography>}
            {currentSubscription && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="success.main">
                  Suscripción pendiente: {currentSubscription.plan.name} (${currentSubscription.plan.price})<br />
                  Vigencia: {currentSubscription.startDate.slice(0,10)} a {currentSubscription.endDate.slice(0,10)}
                </Typography>
              </Box>
            )}
            {subscriptionError && (
              <Typography color="error" sx={{ mb: 1 }}>
                {subscriptionError}
              </Typography>
            )}
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setOpenCreateClient(true)}
              sx={{ mt: 1 }}
            >
              ¿No encuentras el cliente? Crear nuevo
            </Button>
            <TextField
              label="Proveedor"
              name="provider"
              value={form.provider}
              onChange={handleChange}
              select
              required
            >
              {paymentProviders.map(p => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Método de pago"
              name="method"
              value={form.method}
              onChange={handleChange}
              select
              required
            >
              {paymentMethods.map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Monto"
              name="amount"
              type="number"
              value={form.amount}
              onChange={handleChange}
              required
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Moneda"
              name="currency"
              value={form.currency}
              onChange={handleChange}
            />
            <TextField
              label="Estado"
              name="status"
              value={form.status}
              onChange={handleChange}
              select
            >
              {paymentStatus.map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notas"
              name="notes"
              value={form.notes}
              onChange={handleChange}
            />
            <TextField
              label="Comprobante (URL)"
              name="receiptUrl"
              value={form.receiptUrl}
              onChange={handleChange}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={!!subscriptionError || subscriptionLoading}>
              Guardar
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal para crear cliente */}
      <Dialog open={openCreateClient} onClose={() => setOpenCreateClient(false)}>
        <DialogTitle>Crear nuevo cliente</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350 }}>
          <TextField
            label="Nombre"
            value={newClient.name}
            onChange={e => setNewClient(c => ({ ...c, name: e.target.value }))}
            required
          />
          <TextField
            label="Email"
            value={newClient.email}
            onChange={e => setNewClient(c => ({ ...c, email: e.target.value }))}
            required
            type="email"
          />
          <TextField
            label="DNI"
            value={newClient.dni}
            onChange={e => setNewClient(c => ({ ...c, dni: e.target.value }))}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateClient(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={async () => {
              setCreatingClient(true);
              try {
                const res = await api.post<ClientOption>('/clients', newClient);
                setClientOptions(opts => [res.data, ...opts]);
                setForm(f => ({ ...f, clientId: res.data.id }));
                setOpenCreateClient(false);
                setNewClient({ name: '', email: '', dni: '' });
              } catch {
                alert('Error al crear cliente');
              }
              setCreatingClient(false);
            }}
            disabled={creatingClient}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PaymentsPage;