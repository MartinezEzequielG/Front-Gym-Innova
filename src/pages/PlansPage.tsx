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
import { alpha } from '@mui/material/styles';
import { api } from '../context/AuthContext';
import { BranchSelector } from '../components/BranchSelector';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  branchId: string;
  branch?: { id: string; name: string; address: string };
}

interface Branch {
  id: string;
  name: string;
  address: string;
}

function nfMoneyARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );
}

function PlanCard({ p }: { p: Plan }) {
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
              {p.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              {p.branch?.name ?? 'Sucursal —'} • {p.durationDays} días
            </Typography>
          </Box>

          <Chip
            size="small"
            label={nfMoneyARS(p.price)}
            sx={{
              borderRadius: 999,
              fontWeight: 900,
              backgroundColor: alpha('#10b981', 0.12),
              color: '#0f766e',
            }}
          />
        </Stack>

        <Box sx={{ borderRadius: 2.5, px: 1.25, py: 1, backgroundColor: alpha('#111827', 0.06) }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
            Descripción
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            {p.description?.trim() ? p.description : '—'}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

const PlansPage: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    durationDays: '',
    branchId: '',
  });

  const loading = status === 'loading';

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) ?? null,
    [branches, selectedBranchId]
  );

  const loadBranches = async () => {
    try {
      const res = await api.get<Branch[]>('/branches');
      setBranches(res.data);
      if (res.data.length > 0) setSelectedBranchId(res.data[0].id);
    } catch {
      setBranches([]);
    }
  };

  const loadPlans = async () => {
    setStatus('loading');
    setError('');
    try {
      const params = selectedBranchId ? { branchId: selectedBranchId } : {};
      const res = await api.get<Plan[]>('/plans', { params });
      setPlans(res.data);
      setStatus('success');
    } catch {
      setPlans([]);
      setStatus('error');
      setError('No se pudieron cargar los planes.');
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId) loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', durationDays: '', branchId: '' });
    setEditingPlan(null);
    setError('');
  };

  const handleOpenCreate = () => {
    resetForm();
    // por defecto, setear branchId al filtro actual (si existe)
    setForm((f) => ({ ...f, branchId: selectedBranchId || '' }));
    setOpen(true);
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

  const handleClose = () => {
    setOpen(false);
    resetForm();
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
        const res = await api.patch<Plan>(`/plans/${editingPlan.id}`, payload);
        setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? res.data : p)));
      } else {
        const res = await api.post<Plan>('/plans', payload);
        setPlans((prev) => [res.data, ...prev]);
      }

      setOpen(false);
      resetForm();
    } catch {
      setError('Error al guardar el plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/plans/${id}`);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Error al eliminar el plan.');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1250, mx: 'auto' }}>
      {/* Header estilo Payments */}
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
              Planes
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Gestión de planes por sucursal (precio, duración y descripción).
            </Typography>

            <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip label={`Registros: ${plans.length}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
              <Chip
                label={`Sucursal: ${selectedBranch?.name ?? '—'}`}
                sx={{ fontWeight: 900, borderRadius: 999 }}
              />
              {loading && <CircularProgress size={18} />}
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} alignItems={{ sm: 'center' }}>
            <Button
              variant="contained"
              onClick={handleOpenCreate}
              disabled={loading}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
            >
              Crear plan
            </Button>

            <Button
              onClick={loadPlans}
              disabled={loading}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
            >
              Actualizar
            </Button>
          </Stack>
        </Stack>

        {status === 'error' && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
            {error || 'Error cargando planes.'}
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
          <Box sx={{ flex: 1 }}>
            <BranchSelector
              branches={branches}
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              label="Filtrar por sucursal"
            />
          </Box>

          <Button
            variant="outlined"
            onClick={loadPlans}
            disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900, minWidth: { xs: '100%', md: 140 } }}
          >
            Buscar
          </Button>
        </Stack>
      </Paper>

      {/* MOBILE: Cards */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Stack spacing={1.5}>
          {!loading && plans.length === 0 && (
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
                No se encontraron planes para la sucursal seleccionada.
              </Typography>
            </Paper>
          )}

          {plans.map((p) => (
            <Stack key={p.id} spacing={1}>
              <PlanCard p={p} />
              <Stack direction="row" gap={1} justifyContent="flex-end">
                <Button
                  size="small"
                  onClick={() => handleOpenEdit(p)}
                  sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleDelete(p.id)}
                  sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                >
                  Eliminar
                </Button>
              </Stack>
            </Stack>
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
        <TableContainer sx={{ maxHeight: 620, overflowX: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['Nombre', 'Sucursal', 'Descripción', 'Precio', 'Duración (días)', 'Acciones'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {!loading && plans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No se encontraron planes para la sucursal seleccionada.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {plans.map((p, idx) => (
                <TableRow
                  key={p.id}
                  hover
                  sx={{
                    '& td': { borderBottomColor: 'rgba(0,0,0,0.06)' },
                    backgroundColor: idx % 2 === 0 ? 'rgba(0,0,0,0.012)' : 'transparent',
                  }}
                >
                  <TableCell sx={{ fontWeight: 900 }}>{p.name}</TableCell>
                  <TableCell>{p.branch?.name ?? '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 420 }}>
                    <Typography variant="body2" noWrap sx={{ color: p.description ? 'text.primary' : 'text.secondary' }}>
                      {p.description?.trim() ? p.description : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>{nfMoneyARS(p.price)}</TableCell>
                  <TableCell>{p.durationDays}</TableCell>
                  <TableCell>
                    <Stack direction="row" gap={1}>
                      <Button
                        size="small"
                        onClick={() => handleOpenEdit(p)}
                        sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDelete(p.id)}
                        sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                      >
                        Eliminar
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal crear/editar */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>{editingPlan ? 'Editar plan' : 'Crear nuevo plan'}</DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: 3 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            fullWidth
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25}>
            <TextField
              label="Precio"
              type="number"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Duración (días)"
              type="number"
              value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
              required
              fullWidth
            />
          </Stack>

          <Divider />

          <BranchSelector
            branches={branches}
            value={form.branchId}
            onChange={(branchId) => setForm((f) => ({ ...f, branchId }))}
            label="Sucursal del plan"
            required
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={saving} sx={{ textTransform: 'none', fontWeight: 900 }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.name || !form.price || !form.durationDays || !form.branchId}
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 900 }}
          >
            {saving ? 'Guardando…' : editingPlan ? 'Guardar cambios' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlansPage;