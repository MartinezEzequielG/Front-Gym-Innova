import React, { useEffect, useState } from 'react';
import {
  Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack,
  Autocomplete, MenuItem, Chip, Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';

interface Subscription {
  id: string;
  client: { id: string; name: string; email: string; dni?: string };
  plan: { id: string; name: string };
  branchId: string; 
  branch?: { id: string; name: string; address: string }; 
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
interface Branch {
  id: string;
  name: string;
  address: string;
}

const SubscriptionsPage: React.FC = () => {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    planId: '',
    branchId: '', // NUEVO
    startDate: '',
    endDate: '',
  });
  const location = useLocation();
  const navigate = useNavigate();

  // Cargar suscripciones con headers anti-cache
  const fetchSubs = async () => {
    setLoading(true);
    try {
      const res = await api.get<Subscription[]>('/subscriptions', {
        params: { _t: Date.now() },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      console.log('Datos de suscripciones recibidos:', res.data); // AGREGA ESTO
      setSubs(res.data);
    } catch {
      setSubs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async (branchId: string) => {
    if (!branchId) return;
    try {
      const res = await api.get<Plan[]>(`/plans/by-branch/${branchId}`);
      setPlans(res.data);
    } catch {
      setPlans([]);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get<Branch[]>('/branches');
      setBranches(res.data);
    } catch {
      setBranches([]);
    }
  };

  // Refresca automáticamente cuando cambias de página o cargas por primera vez
  useEffect(() => {
    fetchSubs();
    fetchBranches();
  }, [location.pathname]);

  // También refresca cuando la página se vuelve visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchSubs();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
    setForm({ clientId: '', planId: '', branchId: '', startDate: '', endDate: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      type CreateSubscriptionResponse = {
        id: string;
        planId: string;
      };

      await api.post<CreateSubscriptionResponse>('/subscriptions', {
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

  // CAMBIO: Función de renovar mejorada
  const handleRenew = async (subscription: Subscription) => {
    try {
      // Primero obtener el precio actual del plan
      const planRes = await api.get<Plan>(`/plans/${subscription.plan.id}`);
      const currentPlan = planRes.data;
      
      // Renovar la suscripción
      const res = await api.patch<Subscription>(`/subscriptions/${subscription.id}/renew`);
      const newSubscription = res.data;
      
      newSubscription.plan = currentPlan;
      
      // Refrescar el listado
      fetchSubs();
      
      // Navegar a payments con los datos completos
      navigate('/payments', { 
        state: { 
          renewedSubscription: newSubscription,
          preselectedClient: subscription.client
        } 
      });
      
    } catch (err: any) {
      alert(`Error al renovar suscripción: ${err?.response?.data?.message || 'Error desconocido'}`);
    }
  };

  // Cuando cambia la sucursal en el formulario:
  const handleBranchChange = (branchId: string) => {
    setForm(f => ({ ...f, branchId, planId: '' })); // Limpiar plan seleccionado
    fetchPlans(branchId);
  };

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Suscripciones
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
          sx={{ mr: 1 }}
        >
          Crear suscripción
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchSubs}
          disabled={loading}
        >
          {loading ? 'Refrescando...' : 'Refrescar'}
        </Button>
      </Box>

      {loading ? (
        <Typography variant="body2">Cargando suscripciones...</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>DNI</TableCell>
                <TableCell>Sucursal</TableCell> {/* NUEVO */}
                <TableCell>Plan</TableCell>
                <TableCell>Inicio</TableCell>
                <TableCell>Fin</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subs.map(sub => (
                <TableRow key={sub.id}>
                  <TableCell>{sub.client?.name || '-'}</TableCell>
                  <TableCell>{sub.client?.email || '-'}</TableCell>
                  <TableCell>{sub.client?.dni || '-'}</TableCell>
                  <TableCell>{sub.branch?.name || '-'}</TableCell> {/* NUEVO */}
                  <TableCell>{sub.plan?.name || '-'}</TableCell>
                  <TableCell>{sub.startDate.slice(0, 10)}</TableCell>
                  <TableCell>{sub.endDate.slice(0, 10)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={sub.status || 'PENDIENTE_PAGO'} 
                      color={
                        sub.status === 'VIGENTE' ? 'success' : 
                        sub.status === 'VENCIDA' ? 'error' : 
                        'warning'
                      } 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    {sub.status === 'VENCIDA' && (
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={() => handleRenew(sub)}
                      >
                        Renovar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {subs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No hay suscripciones registradas
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva suscripción</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2} mt={1}>
              <Autocomplete
                options={clientOptions}
                loading={clientLoading}
                getOptionLabel={option => option ? `${option.name} (${option.email})${option.dni ? ' - DNI: ' + option.dni : ''}` : ''}
                inputValue={clientSearch}
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
                label="Sucursal"
                select
                value={form.branchId}
                onChange={e => handleBranchChange(e.target.value)}
                required
                fullWidth
              >
                {branches.map(b => (
                  <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                ))}
              </TextField>
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
                  {saving ? 'Guardando...' : 'Crear suscripción'}
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