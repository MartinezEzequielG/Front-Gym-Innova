// src/pages/MembersPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Alert, Stack
} from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import { api } from '../context/AuthContext';

interface Client {
  id: string;
  name: string;
  email: string;
  dni: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

const statusOptions = ['activo', 'inactivo'];

const MembersPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    dni: '',
    phone: '',
    birthDate: '',
    address: '',
    status: '',
    notes: '',
  });

  // Cargar clientes
  const loadClients = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<Client[]>('/clients');
      setClients(res.data);
    } catch (err) {
      setError('Error cargando clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Crear cliente
  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      // Validación simple de DNI único en frontend (opcional, el backend debe validar igual)
      if (clients.some(c => c.dni === form.dni)) {
        setError('Ya existe un cliente con ese DNI.');
        setSaving(false);
        return;
      }
      // Convertir birthDate a ISO si existe
      const payload = {
        ...form,
        birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : undefined,
      };
      const res = await api.post<Client>('/clients', payload);
      setClients([res.data, ...clients]);
      handleClose();
    } catch (err: any) {
      if (err?.response?.data?.message?.includes('dni')) {
        setError('Ya existe un cliente con ese DNI.');
      } else {
        setError('Error al crear el cliente.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Eliminar cliente
  const handleDelete = async (id: string) => {
    setError('');
    try {
      await api.delete(`/clients/${id}`);
      setClients(clients.filter(c => c.id !== id));
    } catch {
      setError('Error al eliminar cliente.');
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setForm({
      name: '',
      email: '',
      dni: '',
      phone: '',
      birthDate: '',
      address: '',
      status: '',
      notes: '',
    });
    setError('');
  };

  if (loading) return <CircularProgress />;
  if (error && !open) return <Alert severity="error">{error}</Alert>;

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Clientes del gimnasio
      </Typography>

      <Button variant="contained" onClick={handleOpen} sx={{ mb: 2 }}>
        Crear cliente
      </Button>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>DNI</TableCell>
            <TableCell>Teléfono</TableCell>
            <TableCell>Fecha de nacimiento</TableCell>
            <TableCell>Dirección</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Notas</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clients.map(client => (
            <TableRow key={client.id}>
              <TableCell>{client.name}</TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell>{client.dni}</TableCell>
              <TableCell>{client.phone || '-'}</TableCell>
              <TableCell>{client.birthDate ? new Date(client.birthDate).toLocaleDateString() : '-'}</TableCell>
              <TableCell>{client.address || '-'}</TableCell>
              <TableCell>{client.status || '-'}</TableCell>
              <TableCell>{client.notes || '-'}</TableCell>
              <TableCell>
                <Button color="error" size="small" onClick={() => handleDelete(client.id)}>
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Diálogo crear cliente */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Crear nuevo cliente</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Nombre completo"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="DNI"
              value={form.dni}
              onChange={e => setForm(f => ({ ...f, dni: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Teléfono"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Fecha de nacimiento"
              type="date"
              value={form.birthDate}
              onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Dirección"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Estado"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              fullWidth
              select
              required
            >
              {statusOptions.map(option => (
                <MenuItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notas"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            {error && <Alert severity="error">{error}</Alert>}
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

export default MembersPage;
