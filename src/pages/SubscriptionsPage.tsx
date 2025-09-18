import React, { useEffect, useState } from 'react';
import {
  Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';

interface Subscription {
  id: string;
  user: { id: string; name: string; email: string };
  plan: { id: string; name: string };
  startDate: string;
  endDate: string;
  status?: string;
  autoRenew?: boolean;
}

interface User { id: string; name: string; email: string; }
interface Plan { id: string; name: string; }

export const SubscriptionsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [modalCreateOpen, setModalCreateOpen] = useState(false);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Formulario de alta
  const [userId, setUserId] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);

  const fetchSubs = () => {
    api.get<Subscription[]>('/subscriptions')
      .then(res => setSubs(res.data))
      .catch(() => setSubs([]));
  };

  useEffect(() => {
    fetchSubs();
    api.get<User[]>('/users').then(res => setUsers(res.data));
    api.get<Plan[]>('/plans').then(res => setPlans(res.data));
  }, []);

  // Alta
  const handleOpenCreate = () => setModalCreateOpen(true);
  const handleCloseCreate = () => setModalCreateOpen(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/subscriptions', {
        userId,
        planId,
        startDate,
        endDate,
        autoRenew,
      });
      setUserId('');
      setPlanId('');
      setStartDate('');
      setEndDate('');
      setAutoRenew(false);
      handleCloseCreate();
      fetchSubs();
    } catch {}
    setLoading(false);
  };

  // Edición
  const handleEdit = (sub: Subscription) => {
    setEditId(sub.id);
    setEditStart(sub.startDate.slice(0, 10));
    setEditEnd(sub.endDate.slice(0, 10));
    setModalEditOpen(true);
  };
  const handleSave = async () => {
    if (!editId) return;
    setLoading(true);
    try {
      await api.patch(`/subscriptions/${editId}`, {
        startDate: editStart,
        endDate: editEnd,
      });
      setSubs(subs.map(s =>
        s.id === editId ? { ...s, startDate: editStart, endDate: editEnd } : s
      ));
      setEditId(null);
      setModalEditOpen(false);
      fetchSubs();
    } catch {}
    setLoading(false);
  };

  // Delete
  const handleOpenDelete = (id: string) => {
    setDeleteId(id);
    setModalDeleteOpen(true);
  };
  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await api.delete(`/subscriptions/${deleteId}`);
      setSubs(subs.filter(s => s.id !== deleteId));
      setDeleteId(null);
      setModalDeleteOpen(false);
      fetchSubs();
    } catch {}
    setLoading(false);
  };

  // Renovar suscripción
  const handleRenew = async (id: string) => {
    setLoading(true);
    try {
      await api.patch(`/subscriptions/${id}/renew`);
      fetchSubs();
    } catch {
      alert('Error al renovar la suscripción');
    }
    setLoading(false);
  };

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Suscripciones
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        sx={{ mb: 2 }}
        onClick={handleOpenCreate}
      >
        Crear suscripción
      </Button>

      <Dialog open={modalCreateOpen} onClose={handleCloseCreate} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva suscripción</DialogTitle>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Usuario</InputLabel>
              <Select value={userId} onChange={e => setUserId(e.target.value)} required>
                {users.map(u => (
                  <MenuItem key={u.id} value={u.id}>{u.name} ({u.email})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Plan</InputLabel>
              <Select value={planId} onChange={e => setPlanId(e.target.value)} required>
                {plans.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Fecha de inicio"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Fecha de fin"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              margin="normal"
              required
            />
            <FormControlLabel
              control={<Checkbox checked={autoRenew} onChange={e => setAutoRenew(e.target.checked)} />}
              label="Renovación automática"
            />
            <DialogActions>
              <Button onClick={handleCloseCreate}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={loading}>
                Crear suscripción
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Usuario</TableCell>
            <TableCell>Plan</TableCell>
            <TableCell>Inicio</TableCell>
            <TableCell>Fin</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Renovación</TableCell>
            <TableCell align="center">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {subs.map(sub => (
            <TableRow key={sub.id}>
              <TableCell>{sub.user?.name} ({sub.user?.email})</TableCell>
              <TableCell>{sub.plan?.name}</TableCell>
              <TableCell>{sub.startDate.slice(0, 10)}</TableCell>
              <TableCell>{sub.endDate.slice(0, 10)}</TableCell>
              <TableCell>
                <Chip label={sub.status || 'VIGENTE'} color={sub.status === 'VENCIDA' ? 'error' : 'success'} size="small" />
              </TableCell>
              <TableCell>
                <Chip label={sub.autoRenew ? 'Sí' : 'No'} color={sub.autoRenew ? 'primary' : 'default'} size="small" />
              </TableCell>
              <TableCell align="center">
                <IconButton onClick={() => handleEdit(sub)}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleOpenDelete(sub.id)} disabled={loading}>
                  <DeleteIcon color="error" />
                </IconButton>
                <IconButton
                  onClick={() => handleRenew(sub.id)}
                  disabled={loading || sub.status !== 'VENCIDA'}
                  title="Renovar suscripción"
                >
                  <AutorenewIcon color={sub.status === 'VENCIDA' ? 'primary' : 'disabled'} />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Modal para editar fechas */}
      <Dialog open={modalEditOpen} onClose={() => setModalEditOpen(false)}>
        <DialogTitle>Editar Fechas de Suscripción</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
          <TextField
            label="Fecha de inicio"
            type="date"
            value={editStart}
            onChange={e => setEditStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Fecha de fin"
            type="date"
            value={editEnd}
            onChange={e => setEditEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalEditOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para confirmar eliminación */}
      <Dialog open={modalDeleteOpen} onClose={() => setModalDeleteOpen(false)}>
        <DialogTitle>Eliminar suscripción</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro que deseas eliminar esta suscripción?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalDeleteOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={loading}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SubscriptionsPage;