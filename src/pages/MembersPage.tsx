// src/pages/MembersPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Alert, Stack
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Member {
  id: number;
  fullName: string;
  dni: string;
  birthDate: string;
  phone: string;
  expirationDate: string;
  branch: string;
}

export const MembersPage: React.FC = () => {
  const { token, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    dni: '',
    birthDate: '',
    phone: '',
    email: '',
    paymentMethod: '',
    monthlyPlan: '',
    branch: '',
    expirationDate: '',
  });

  // Cargar miembros
  const loadMembers = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get<Member[]>('http://localhost:3000/api/v1/members/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Miembros desde el back:', res.data);
      setMembers(res.data);
    } catch (err) {
      setError('Error cargando miembros.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [token]);

  // Estado de suscripción
  const getSubscriptionStatus = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    return expDate >= today ? 'active' : 'expired';
  };

  // Crear miembro
  const handleSubmit = async () => {
    if (!token) {
      setError('Usuario no autenticado.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      console.log("Token frontend:", token);
      console.log("User frontend:", user);
      const res = await axios.post<Member>(
        'http://localhost:3000/api/v1/members',
        {
          ...form,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMembers([res.data, ...members]);
      handleClose();
    } catch (err) {
      console.error(err);
      setError('Error al crear el miembro.');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar miembro
  const handleDelete = async (id: number) => {
    if (!token) return;
    setError('');
    try {
      await axios.delete(`http://localhost:3000/api/v1/members/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(members.filter(m => m.id !== id));
    } catch {
      setError('Error al eliminar miembro.');
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setForm({
      fullName: '',
      dni: '',
      birthDate: '',
      phone: '',
      email: '',
      paymentMethod: '',
      monthlyPlan: '',
      branch: '',
      expirationDate: '',
    });
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Miembros del gimnasio
      </Typography>

      <Button variant="contained" onClick={handleOpen} sx={{ mb: 2 }}>
        Crear miembro
      </Button>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>DNI</TableCell>
            <TableCell>Fecha de cumpleaños</TableCell>
            <TableCell>Teléfono</TableCell>
            <TableCell>Sucursal</TableCell>
            <TableCell>Vencimiento</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map(member => {
            const status = getSubscriptionStatus(member.expirationDate);
            return (
              <TableRow key={member.id}>
                <TableCell>{member.fullName}</TableCell>
                <TableCell>{member.dni}</TableCell>
                <TableCell>{new Date(member.birthDate).toLocaleDateString()}</TableCell>
                <TableCell>{member.phone}</TableCell>
                <TableCell>{member.branch}</TableCell>
                <TableCell>{new Date(member.expirationDate).toLocaleDateString()}</TableCell>
                <TableCell
                  style={{
                    backgroundColor: status === 'active' ? '#d0f0c0' : '#f8d7da',
                    color: status === 'active' ? 'green' : 'red',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}
                >
                  {status === 'active' ? 'Vigente' : 'Vencido'}
                </TableCell>
                <TableCell>
                  <Button color="error" size="small" onClick={() => handleDelete(member.id)}>
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Diálogo crear miembro */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Crear nuevo miembro</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {[
              { name: 'fullName', label: 'Nombre completo' },
              { name: 'dni', label: 'DNI' },
              { name: 'birthDate', label: 'Fecha de nacimiento', type: 'date' },
              { name: 'phone', label: 'Teléfono' },
              { name: 'email', label: 'Email', type: 'email' },
              { name: 'paymentMethod', label: 'Método de pago' },
              { name: 'monthlyPlan', label: 'Plan mensual' },
              { name: 'branch', label: 'Sucursal' },
              { name: 'expirationDate', label: 'Fecha de vencimiento', type: 'date' },
            ].map(field => (
              <TextField
                key={field.name}
                fullWidth
                type={field.type || 'text'}
                label={field.label}
                value={(form as any)[field.name]}
                onChange={e => setForm(f => ({ ...f, [field.name]: e.target.value }))}
                InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
              />
            ))}
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
