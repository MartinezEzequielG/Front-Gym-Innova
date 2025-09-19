import React, { useEffect, useState } from 'react';
import {
  Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack,
  Autocomplete, MenuItem, Chip
} from '@mui/material';
import { api } from '../context/AuthContext';

interface Subscription {
  id: string;
  client: { id: string; name: string; email: string; dni?: string };
  plan: { id: string; name: string };
  startDate: string;
  endDate: string;
  status?: string;
}

interface ClientOption {
  id: string;
  name: string;
  email: string;
  dni?: string;
}
interface Plan { id: string; name: string; }

const SubscriptionsPage: React.FC = () => {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    planId: '',
    startDate: '',
    endDate: '',
  });
  const [saving, setSaving] = useState(false);

  // Cargar planes y suscripciones
  const fetchSubs = async () => {
    const res = await api.get<Subscription[]>('/subscriptions');
    setSubs(res.data);
  };
  const fetchPlans = async () => {
    const res = await api.get<Plan[]>('/plans');
    setPlans(res.data);
  };

  useEffect(() => {
    fetchSubs();
    fetchPlans();
  }, []);

  // Autocomplete para clientes
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

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setForm({ clientId: '', planId: '', startDate: '', endDate: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/subscriptions', {
        ...form,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      });
      handleClose();
      fetchSubs();
    } catch {
      alert('Error al crear la suscripción');
    }
    setSaving(false);
  };

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Suscripciones
      </Typography>
      <Button variant="contained" onClick={handleOpen} sx={{ mb: 2 }}>
        Crear suscripción
      </Button>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Cliente</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>DNI</TableCell>
            <TableCell>Plan</TableCell>
            <TableCell>Inicio</TableCell>
            <TableCell>Fin</TableCell>
            <TableCell>Estado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {subs.map(sub => (
            <TableRow key={sub.id}>
              <TableCell>{sub.client?.name || '-'}</TableCell>
              <TableCell>{sub.client?.email || '-'}</TableCell>
              <TableCell>{sub.client?.dni || '-'}</TableCell>
              <TableCell>{sub.plan?.name || '-'}</TableCell>
              <TableCell>{sub.startDate.slice(0, 10)}</TableCell>
              <TableCell>{sub.endDate.slice(0, 10)}</TableCell>
              <TableCell>
                <Chip label={sub.status || 'VIGENTE'} color={sub.status === 'VENCIDA' ? 'error' : 'success'} size="small" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva suscripción</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2} mt={1}>
              <Autocomplete
                options={clientOptions}
                loading={clientLoading}
                getOptionLabel={option => option ? `${option.name} (${option.email})${option.dni ? ' - DNI: ' + option.dni : ''}` : ''}
                onInputChange={handleClientInputChange}
                onChange={(_, value) => setForm(f => ({
                  ...f,
                  clientId: value ? (value as ClientOption).id : ''
                }))}
                renderInput={params => (
                  <TextField {...params} label="Cliente (buscar por nombre, mail o DNI)" required />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
              <TextField
                label="Plan"
                select
                value={form.planId}
                onChange={e => setForm(f => ({ ...f, planId: e.target.value }))}
                required
                fullWidth
              >
                {plans.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Fecha de inicio"
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
              <TextField
                label="Fecha de fin"
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
              <DialogActions>
                <Button onClick={handleClose}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={saving}>
                  Crear suscripción
                </Button>
              </DialogActions>
            </Stack>
          </form>
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default SubscriptionsPage;