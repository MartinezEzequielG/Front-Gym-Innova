import React, { useEffect, useState } from 'react';
import {
  Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem
} from '@mui/material';
import { api } from '../context/AuthContext';

interface Payment {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  provider: string;
  method: string;
  type?: string;
  notes?: string;
  receiptUrl?: string;
  providerPaymentId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  amount: number;
  currency?: string;
  createdAt: string;
  subscriptionId?: string;
}

const paymentStatus = ['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'];
const paymentProviders = ['mercado_pago', 'manual', 'otro'];
const paymentMethods = ['CASH', 'CARD', 'TRANSFER', 'MP'];
const paymentTypes = ['SUBSCRIPTION', 'CLASS', 'ENROLLMENT'];

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    userId: '',
    provider: '',
    method: '',
    type: '',
    amount: '',
    currency: 'ARS',
    status: 'PENDING',
    subscriptionId: '',
    providerPaymentId: '',
    notes: '',
    receiptUrl: '',
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get<Payment[]>('/payments');
      setPayments(res.data);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/payments', {
        ...form,
        amount: Number(form.amount) || 0,
        subscriptionId: form.subscriptionId || undefined,
        providerPaymentId: form.providerPaymentId || undefined,
        currency: form.currency || undefined,
        status: form.status || undefined,
        method: form.method || undefined,
        type: form.type || undefined,
        notes: form.notes || undefined,
        receiptUrl: form.receiptUrl || undefined,
      });
      setOpen(false);
      setForm({
        userId: '',
        provider: '',
        method: '',
        type: '',
        amount: '',
        currency: 'ARS',
        status: 'PENDING',
        subscriptionId: '',
        providerPaymentId: '',
        notes: '',
        receiptUrl: '',
      });
      fetchPayments();
    } catch (err) {
      alert('Error al crear el pago');
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

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Pagos
      </Typography>
      <Button variant="contained" sx={{ mb: 2 }} onClick={() => setOpen(true)}>
        Agregar Pago
      </Button>
      {loading ? (
        <Typography variant="body2">Cargando...</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Usuario</TableCell>
              <TableCell>Email</TableCell>
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
                <TableCell>{payment.user?.name || payment.userId}</TableCell>
                <TableCell>{payment.user?.email || '-'}</TableCell>
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
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
            <TextField
              label="ID de Usuario"
              name="userId"
              value={form.userId}
              onChange={handleChange}
              required
            />
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
              label="Tipo de pago"
              name="type"
              value={form.type}
              onChange={handleChange}
              select
            >
              {paymentTypes.map(t => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Monto"
              name="amount"
              type="number"
              value={form.amount}
              onChange={handleChange}
              required
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
              label="ID de Suscripción"
              name="subscriptionId"
              value={form.subscriptionId}
              onChange={handleChange}
            />
            <TextField
              label="ID de Pago del Proveedor"
              name="providerPaymentId"
              value={form.providerPaymentId}
              onChange={handleChange}
            />
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
            <Button type="submit" variant="contained">Guardar</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
};

export default PaymentsPage;