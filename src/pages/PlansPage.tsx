import React, { useEffect, useState } from 'react';
import {
  Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack
} from '@mui/material';
import { api } from '../context/AuthContext';

interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number; // en días
}

const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    durationDays: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get<Plan[]>('/plans');
      setPlans(res.data);
    } catch {
      setPlans([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setForm({ name: '', description: '', price: '', durationDays: '' });
    setError('');
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        durationDays: Number(form.durationDays),
      };
      const res = await api.post<Plan>('/plans', payload);
      setPlans([res.data, ...plans]);
      handleClose();
    } catch {
      setError('Error al crear el plan.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/plans/${id}`);
      setPlans(plans.filter(p => p.id !== id));
    } catch {
      alert('Error al eliminar el plan');
    }
  };

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Planes
      </Typography>
      <Button variant="contained" onClick={handleOpen} sx={{ mb: 2 }}>
        Crear plan
      </Button>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Descripción</TableCell>
            <TableCell>Precio</TableCell>
            <TableCell>Duración (días)</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {plans.map(plan => (
            <TableRow key={plan.id}>
              <TableCell>{plan.name}</TableCell>
              <TableCell>{plan.description || '-'}</TableCell>
              <TableCell>${plan.price}</TableCell>
              <TableCell>{plan.durationDays}</TableCell>
              <TableCell>
                <Button color="error" size="small" onClick={() => handleDelete(plan.id)}>
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Crear nuevo plan</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Nombre"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Descripción"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Precio"
              type="number"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Duración (días)"
              type="number"
              value={form.durationDays}
              onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
              required
              fullWidth
            />
            {error && <Typography color="error">{error}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} variant="contained">
            {saving ? 'Guardando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PlansPage;