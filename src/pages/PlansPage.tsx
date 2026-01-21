import React, { useEffect, useState } from 'react';
import {
  Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Box
} from '@mui/material';
import { api } from '../context/AuthContext';
import { BranchSelector } from '../components/BranchSelector';

interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  branchId: string; // NUEVO
  branch?: { id: string; name: string; address: string }; // NUEVO
}

interface Branch {
  id: string;
  name: string;
  address: string;
}

const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    durationDays: '',
    branchId: '', // NUEVO
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const loadBranches = async () => {
    try {
      const res = await api.get<Branch[]>('/branches');
      setBranches(res.data);
      if (res.data.length > 0) {
        setSelectedBranchId(res.data[0].id);
      }
    } catch {
      setBranches([]);
    }
  };

  const loadPlans = async () => {
    setLoading(true);
    try {
      const params = selectedBranchId ? { branchId: selectedBranchId } : {};
      const res = await api.get<Plan[]>('/plans', { params });
      setPlans(res.data);
    } catch {
      setPlans([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadPlans();
    }
  }, [selectedBranchId]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setForm({ name: '', description: '', price: '', durationDays: '', branchId: '' }); 
    setEditingPlan(null);
    setError('');
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? '',
      price: String(plan.price),
      durationDays: String(plan.durationDays),
      branchId: plan.branchId,
    });
    setOpen(true);
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
        branchId: form.branchId,
      };
      if (editingPlan) {
        // Editar plan existente
        const res = await api.patch<Plan>(`/plans/${editingPlan.id}`, payload);
        setPlans(plans.map(p => (p.id === editingPlan.id ? res.data : p)));
      } else {
        // Crear nuevo plan
        const res = await api.post<Plan>('/plans', payload);
        setPlans([res.data, ...plans]);
      }
      handleClose();
    } catch {
      setError('Error al guardar el plan.');
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
      <Box sx={{ mb: 2 }}>
        <BranchSelector
          branches={branches}
          value={selectedBranchId}
          onChange={setSelectedBranchId}
          label="Filtrar por sucursal"
        />
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Sucursal</TableCell> {/* NUEVO */}
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
              <TableCell>{plan.branch?.name || '-'}</TableCell> 
              <TableCell>{plan.description || '-'}</TableCell>
              <TableCell>${plan.price}</TableCell>
              <TableCell>{plan.durationDays}</TableCell>
              <TableCell>
                <Button color="primary" size="small" onClick={() => handleOpenEdit(plan)}>
                  Editar
                </Button>
                <Button color="error" size="small" onClick={() => handleDelete(plan.id)}>
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{editingPlan ? 'Editar plan' : 'Crear nuevo plan'}</DialogTitle>
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
            <BranchSelector
              branches={branches}
              value={form.branchId}
              onChange={branchId => setForm(f => ({ ...f, branchId }))}
              required
            />
            {error && <Typography color="error">{error}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} variant="contained">
            {saving ? 'Guardando...' : editingPlan ? 'Guardar cambios' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PlansPage;